import { useEffect, useState } from "react";
import {
  clearToken,
  getMyStudent,
  updateMyStudentProfile,
  updateMyStudentChoices,
  changeMyStudentPassword,
  updateMyAchievement,
  createMyAchievement,
  deleteMyAchievement,
} from "../services/api";
import { useNavigate } from "react-router-dom";

function gradeToPoint(grade) {
  const map = {
    "A": 4,
    "B+": 3.5,
    "B": 3,
    "C+": 2.5,
    "C": 2,
    "D+": 1.5,
    "D": 1,
    "F": 0,
    "4": 4,
    "3.5": 3.5,
    "3": 3,
    "2.5": 2.5,
    "2": 2,
    "1.5": 1.5,
    "1": 1,
    "0": 0,
  };

  return map[String(grade).trim().toUpperCase()] ?? null;
}

function calcGpa(records) {
  const points = records
    .map((r) => gradeToPoint(r.grade))
    .filter((v) => v !== null);

  if (!points.length) return "-";

  const avg = points.reduce((a, b) => a + b, 0) / points.length;
  return avg.toFixed(2);
}

function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  const full =
    clean.length === 3
      ? clean.split("").map((c) => c + c).join("")
      : clean;

  const num = parseInt(full, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function rgbToHex(r, g, b) {
  return (
    "#" +
    [r, g, b]
      .map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0"))
      .join("")
  );
}

function adjustColor(hex, amount = 0) {
  try {
    const { r, g, b } = hexToRgb(hex);
    return rgbToHex(r + amount, g + amount, b + amount);
  } catch {
    return hex;
  }
}

function getStudentTheme(student) {
  const base = student?.themeColor || "#f8ddea";

  return {
    base,
    pageBg: adjustColor(base, 18),
    cardBg: "#ffffff",
    tabActive: adjustColor(base, 8),
    tabInactive: adjustColor(base, -18),
    border: adjustColor(base, -55),
    soft: adjustColor(base, 28),
  };
}

export default function StudentDashboard() {
  const navigate = useNavigate();

  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const theme = getStudentTheme(student);

  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [changePasswordLoading, setChangePasswordLoading] = useState(false);
  const [changePasswordError, setChangePasswordError] = useState("");
  const [passwordForm, setPasswordForm] = useState({
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
});

  const [profileForm, setProfileForm] = useState({
    nickname: "",
    birthDate: "",
    strengths: "",
    address: "",
  });

  const [choicesForm, setChoicesForm] = useState([
    { rank: 1, universityName: "", facultyName: "", programName: "" },
    { rank: 2, universityName: "", facultyName: "", programName: "" },
    { rank: 3, universityName: "", facultyName: "", programName: "" },
  ]);

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingChoices, setSavingChoices] = useState(false);
  const gpa = calcGpa(student?.gradeRecords || []);
  const [isTablet, setIsTablet] = useState(window.innerWidth <= 900);
  const [activeTab, setActiveTab] = useState("profile");

  const STUDENT_TABS = [
  { key: "profile", label: "โปรไฟล์" },
  { key: "overview", label: "ภาพรวม" },
  { key: "achievementDetail", label: "รายละเอียดผลงาน" },
  { key: "grades", label: "ผลการเรียน" },
];

useEffect(() => {
  function handleResize() {
    setIsTablet(window.innerWidth <= 900);
  }

  window.addEventListener("resize", handleResize);
  return () => window.removeEventListener("resize", handleResize);
}, []);


  async function loadMe() {
    setError("");
    setLoading(true);
    try {
      const res = await getMyStudent();
      const s = res.student;
      setStudent(s);

      setProfileForm({
        nickname: s.nickname || "",
        birthDate: s.birthDate ? new Date(s.birthDate).toISOString().slice(0, 10) : "",
        strengths: s.strengths || "",
        address: s.address || "",
      });

      const base = [
        { rank: 1, universityName: "", facultyName: "", programName: "" },
        { rank: 2, universityName: "", facultyName: "", programName: "" },
        { rank: 3, universityName: "", facultyName: "", programName: "" },
      ];

      (s.choices || []).forEach((c) => {
        const idx = base.findIndex((x) => x.rank === c.rank);
        if (idx !== -1) {
          base[idx] = {
            rank: c.rank,
            universityName: c.universityName || "",
            facultyName: c.facultyName || "",
            programName: c.programName || "",
          };
        }
      });

      setChoicesForm(base);
    } catch (err) {
      setError(err.message || "Load failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMe();
  }, []);

  function setProfileField(key, value) {
    setProfileForm((prev) => ({ ...prev, [key]: value }));
  }

  function setChoiceField(rank, key, value) {
    setChoicesForm((prev) =>
      prev.map((r) => (r.rank === rank ? { ...r, [key]: value } : r))
    );
  }

  async function clearChoice(rank) {
  const newChoices = choicesForm.map((r) =>
    r.rank === rank
      ? { ...r, universityName: "", facultyName: "", programName: "" }
      : r
  );

  setChoicesForm(newChoices);

  await updateMyStudentChoices(newChoices); // 🔥 ยิง API ทันที
  await loadMe(); // reload
}

  async function handleSaveProfile(e) {
    e.preventDefault();
    setSavingProfile(true);
    setError("");

    try {
      await updateMyStudentProfile({
        nickname: profileForm.nickname.trim(),
        birthDate: profileForm.birthDate || null,
        strengths: profileForm.strengths.trim(),
        address: profileForm.address.trim(),
      });
      await loadMe();
    } catch (err) {
      setError(err.message || "Save profile failed");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleSaveChoices() {
    setSavingChoices(true);
    setError("");

    try {
      await updateMyStudentChoices(choicesForm);
      await loadMe();
    } catch (err) {
      setError(err.message || "Save choices failed");
    } finally {
      setSavingChoices(false);
    }
  }

  if (loading) {
    return <div style={styles.pageCenter}>กำลังโหลดข้อมูล...</div>;
  }

  if (error && !student) {
    return <div style={styles.pageCenter}>{error}</div>;
  }

  return (
    <div
  style={{
    ...styles.page,
    paddingBottom: 8,
    background: theme.pageBg,
    padding: "20px 24px",
  }}
>
  <div style={styles.header}>
    <div>
      <div style={{ fontSize: 24, fontWeight: 900 }}>ข้อมูลของฉัน</div>
      <div style={{ marginTop: 6, color: "#666" }}>
        {student.firstName} {student.lastName} (รหัส {student.studentCode})
      </div>
    </div>

    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
  <button
    style={styles.outlineBtn}
    onClick={openChangePassword}
  >
    เปลี่ยนรหัสผ่าน
  </button>

  <button
    style={styles.logout}
    onClick={() => {
      clearToken();
      navigate("/", { replace: true });
    }}
  >
    ออกจากระบบ
  </button>
</div>
  </div>

  {error && <div style={styles.error}>{error}</div>}

  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
    {STUDENT_TABS.map((tab) => {
      const active = tab.key === activeTab;
      return (
        <button
          key={tab.key}
          onClick={() => setActiveTab(tab.key)}
          style={{
            ...styles.outlineBtn,
            background: active ? theme.tabActive : theme.tabInactive,
            border: `1px solid ${theme.border}`,
          }}
        >
          {tab.label}
        </button>
      );
    })}
  </div>

  <div style={{ marginTop: 16 }}>
    {activeTab === "profile" && (
      <>
        <div
          style={{
            ...styles.card,
            border: `1px solid ${theme.border}`,
          }}
        >
          <div style={{ fontWeight: 900, fontSize: 18 }}>ข้อมูลพื้นฐาน</div>

          <div
            style={{
              ...styles.infoGrid,
              gridTemplateColumns: isTablet
                ? "repeat(2, minmax(0, 1fr))"
                : "repeat(3, minmax(0, 1fr))",
            }}
          >
            <InfoBox label="ชื่อจริง" value={student.firstName} />
            <InfoBox label="นามสกุล" value={student.lastName} />
            <InfoBox label="รหัสนักเรียน" value={student.studentCode} />
            <InfoBox
              label="ชั้น / ห้อง"
              value={`${student.gradeLevel || "-"} / ${student.classRoom || "-"}`}
            />
            <InfoBox label="โรงเรียน" value={student.schoolName || "-"} />
            <InfoBox label="เบอร์โทรติดต่อ" value={student.phone || "-"} />
            <InfoBox label="เบอร์โทรผู้ปกครอง" value={student.parentPhone || "-"} />
          </div>

          <form onSubmit={handleSaveProfile} style={{ marginTop: 16 }}>
            <div
              style={{
                ...styles.formGrid,
                gridTemplateColumns: isTablet ? "1fr" : "repeat(2, minmax(0, 1fr))",
              }}
            >
              <div>
                <label style={styles.label}>ชื่อเล่น</label>
                <input
                  style={styles.input}
                  value={profileForm.nickname}
                  onChange={(e) => setProfileField("nickname", e.target.value)}
                />
              </div>

              <div>
                <label style={styles.label}>วันเกิด</label>
                <input
                  style={styles.input}
                  type="date"
                  value={profileForm.birthDate}
                  onChange={(e) => setProfileField("birthDate", e.target.value)}
                />
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <label style={styles.label}>จุดแข็ง / ความสนใจ</label>
                <input
                  style={styles.input}
                  value={profileForm.strengths}
                  onChange={(e) => setProfileField("strengths", e.target.value)}
                  placeholder="เช่น ชอบเขียนโปรแกรม / วิชาชีวะ / วาดรูป"
                />
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <label style={styles.label}>ที่อยู่</label>
                <textarea
                  style={{ ...styles.input, minHeight: 90, resize: "vertical" }}
                  value={profileForm.address}
                  onChange={(e) => setProfileField("address", e.target.value)}
                />
              </div>
            </div>

            <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end" }}>
              <button style={styles.primaryBtn} type="submit" disabled={savingProfile}>
                {savingProfile ? "กำลังบันทึก..." : "บันทึกโปรไฟล์"}
              </button>
            </div>
          </form>
        </div>

        <div style={styles.card}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 10,
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontWeight: 900, fontSize: 18 }}>
                มหาลัย / คณะที่อยากเข้า (Top 3)
              </div>
              <div style={{ marginTop: 4, color: "#666" }}>
                นักเรียนแก้ไข Top 3 ของตัวเองได้
              </div>
            </div>

            <button
              style={styles.primaryBtn}
              onClick={handleSaveChoices}
              disabled={savingChoices}
            >
              {savingChoices ? "กำลังบันทึก..." : "บันทึก Top 3"}
            </button>
          </div>

          <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
            {choicesForm.map((r) => (
              <div key={r.rank} style={styles.choiceCard}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div style={{ fontWeight: 900 }}>อันดับ {r.rank}</div>
                  <button
                    type="button"
                    style={styles.outlineBtn}
                    onClick={() => clearChoice(r.rank)}
                  >
                    ลบอันดับนี้
                  </button>
                </div>

                <label style={styles.label}>มหาวิทยาลัย</label>
                <input
                  style={styles.input}
                  value={r.universityName}
                  onChange={(e) =>
                    setChoiceField(r.rank, "universityName", e.target.value)
                  }
                />

                <label style={styles.label}>คณะ</label>
                <input
                  style={styles.input}
                  value={r.facultyName}
                  onChange={(e) =>
                    setChoiceField(r.rank, "facultyName", e.target.value)
                  }
                />

                <label style={styles.label}>สาขา</label>
                <input
                  style={styles.input}
                  value={r.programName}
                  onChange={(e) =>
                    setChoiceField(r.rank, "programName", e.target.value)
                  }
                />
              </div>
            ))}
          </div>
        </div>
      </>
    )}

    {activeTab === "overview" && <StudentOverviewTab student={student} />}

    {activeTab === "achievementDetail" && (
      <StudentAchievementTab student={student} onReload={loadMe} />
    )}

    {activeTab === "grades" && (
      <StudentGradesTab student={student} gpa={gpa} />
    )}
  </div>
  {isChangePasswordOpen && (
  <div style={styles.modalOverlay} onMouseDown={closeChangePassword}>
    <div style={styles.modal} onMouseDown={(e) => e.stopPropagation()}>
      <div style={styles.modalHeader}>
        <div style={{ fontWeight: 900, fontSize: 16 }}>เปลี่ยนรหัสผ่าน</div>
        <button
          style={styles.modalClose}
          onClick={closeChangePassword}
          disabled={changePasswordLoading}
        >
          ✕
        </button>
      </div>

      <form onSubmit={handleChangePassword}>
        <label style={styles.label}>รหัสผ่านปัจจุบัน</label>
        <input
          style={styles.input}
          type="password"
          value={passwordForm.currentPassword}
          onChange={(e) => setPasswordField("currentPassword", e.target.value)}
          placeholder="กรอกรหัสผ่านปัจจุบัน"
        />

        <label style={styles.label}>รหัสผ่านใหม่</label>
        <input
          style={styles.input}
          type="password"
          value={passwordForm.newPassword}
          onChange={(e) => setPasswordField("newPassword", e.target.value)}
          placeholder="อย่างน้อย 4 ตัวอักษร"
        />

        <label style={styles.label}>ยืนยันรหัสผ่านใหม่</label>
        <input
          style={styles.input}
          type="password"
          value={passwordForm.confirmPassword}
          onChange={(e) => setPasswordField("confirmPassword", e.target.value)}
          placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
        />

        {changePasswordError && (
          <div style={styles.error}>{changePasswordError}</div>
        )}

        <div style={styles.modalActions}>
          <button
            type="button"
            style={styles.outlineBtn}
            onClick={closeChangePassword}
            disabled={changePasswordLoading}
          >
            ยกเลิก
          </button>

          <button
            type="submit"
            style={styles.primaryBtn}
            disabled={changePasswordLoading}
          >
            {changePasswordLoading ? "กำลังบันทึก..." : "บันทึกรหัสผ่านใหม่"}
          </button>
        </div>
      </form>
    </div>
  </div>
)}
</div>
  );

function InfoBox({ label, value }) {
  return (
    <div style={styles.infoBox}>
      <div style={{ fontSize: 12, color: "#666" }}>{label}</div>
      <div style={{ marginTop: 6, fontWeight: 800 }}>{value || "-"}</div>
    </div>
  );
}

function StudentOverviewTab({ student }) {
  if (!student) return null;

  const items = student.overviewItems || [];

  return (
    <div style={styles.card}>
      <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 12 }}>ภาพรวม</div>

      {[1, 2, 3].map((rank) => {
        const rankItems = items.filter((i) => i.choiceRank === rank);

        return (
          <div key={rank} style={{ marginBottom: 20 }}>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>คณะอันดับ {rank}</div>

            <div style={{ overflowX: "auto" }}>
              <table style={styles.gradeTable}>
                <thead>
                  <tr>
                    <th style={styles.gradeTh}>ประเภท</th>
                    <th style={styles.gradeTh}>ข้อเรียกร้อง</th>
                    <th style={styles.gradeTh}>มีแล้ว</th>
                    <th style={styles.gradeTh}>หมายเหตุ</th>
                  </tr>
                </thead>
                <tbody>
                  {rankItems.length === 0 ? (
                    <tr>
                      <td colSpan="4" style={styles.gradeEmpty}>ยังไม่มีข้อมูล</td>
                    </tr>
                  ) : (
                    rankItems.map((item) => (
                      <tr key={item.id}>
                        <td style={styles.gradeTd}>{item.requirementType || "-"}</td>
                        <td style={styles.gradeTd}>{item.requirementText}</td>
                        <td style={styles.gradeTd}>{item.hasIt ? "✔" : "○"}</td>
                        <td style={styles.gradeTd}>{item.note || "-"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StudentAchievementTab({ student, onReload }) {
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    category: "วิชาการ",
    title: "",
    description: "",
    hasEvidence: false,
    evidenceUrl: "",
    note: "",
  });
  const [editingId, setEditingId] = useState("");
  const [editForm, setEditForm] = useState({
  category: "วิชาการ",
  title: "",
  description: "",
  hasEvidence: false,
  evidenceUrl: "",
  note: "",
});

  if (!student) return null;

  const achievements = student.achievements || [];
  const categories = ["วิชาการ", "กีฬา", "ศิลปะ", "จิตอาสา", "อื่น ๆ"];

  function setField(key, value) {
  setForm((prev) => ({ ...prev, [key]: value }));
}

  async function handleAdd() {
    setError("");

    if (!form.title.trim()) {
      setError("กรอกชื่อผลงานก่อน");
      return;
    }

    try {
      setSaving(true);
      await createMyAchievement({
        category: form.category,
        title: form.title.trim(),
        description: form.description.trim(),
        hasEvidence: form.hasEvidence,
        evidenceUrl: form.evidenceUrl.trim(),
        note: form.note.trim(),
        sortOrder: achievements.length + 1,
      });

      setForm({
        category: "วิชาการ",
        title: "",
        description: "",
        hasEvidence: false,
        evidenceUrl: "",
        note: "",
      });
      setAdding(false);
      await onReload();
    } catch (err) {
      setError(err.message || "Create failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    const ok = window.confirm("ลบรายการนี้ใช่ไหม?");
    if (!ok) return;

    try {
      setSaving(true);
      await deleteMyAchievement(id);
      await onReload();
    } catch (err) {
      setError(err.message || "Delete failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={styles.card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 18 }}>รายละเอียดผลงาน</div>
          <div style={{ marginTop: 4, color: "#666" }}>นักเรียนสามารถเพิ่มผลงานของตัวเองได้</div>
        </div>

        <button style={styles.primaryBtn} onClick={() => setAdding((v) => !v)}>
          {adding ? "ยกเลิก" : "+ เพิ่มผลงาน"}
        </button>
      </div>

      {adding && (
        <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
          <select
            style={styles.input}
            value={form.category}
            onChange={(e) => setField("category", e.target.value)}
          >
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <input
            style={styles.input}
            value={form.title}
            onChange={(e) => setField("title", e.target.value)}
            placeholder="ชื่อผลงาน"
          />

          <textarea
            style={{ ...styles.input, minHeight: 90, resize: "vertical" }}
            value={form.description}
            onChange={(e) => setField("description", e.target.value)}
            placeholder="รายละเอียดเพิ่มเติม"
          />

          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              checked={form.hasEvidence}
              onChange={(e) => setField("hasEvidence", e.target.checked)}
            />
            มีหลักฐานแล้ว
          </label>

          <input
            style={styles.input}
            value={form.evidenceUrl}
            onChange={(e) => setField("evidenceUrl", e.target.value)}
            placeholder="ลิงก์หลักฐาน / Drive"
          />

          <input
            style={styles.input}
            value={form.note}
            onChange={(e) => setField("note", e.target.value)}
            placeholder="หมายเหตุ"
          />

          {error && <div style={styles.error}>{error}</div>}

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button style={styles.primaryBtn} onClick={handleAdd} disabled={saving}>
              {saving ? "กำลังบันทึก..." : "บันทึกผลงาน"}
            </button>
          </div>
        </div>
      )}

      <div style={{ marginTop: 16, overflowX: "auto" }}>
        <table style={styles.gradeTable}>
          <thead>
            <tr>
              <th style={styles.gradeTh}>ด้าน</th>
              <th style={styles.gradeTh}>รายการ</th>
              <th style={styles.gradeTh}>หลักฐาน</th>
              <th style={styles.gradeTh}>หมายเหตุ</th>
              <th style={styles.gradeTh}>ลบ</th>
            </tr>
          </thead>
          <tbody>
            {achievements.length === 0 ? (
  <tr>
    <td colSpan="5" style={styles.gradeEmpty}>
      ยังไม่มีผลงาน
    </td>
  </tr>
) : (
  achievements.map((item) =>
    editingId === item.id ? (
      <tr key={item.id}>
        <td style={styles.gradeTd}>
          <select
            style={styles.input}
            value={editForm.category}
            onChange={(e) => setEditField("category", e.target.value)}
          >
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </td>

        <td style={styles.gradeTd}>
          <input
            style={styles.input}
            value={editForm.title}
            onChange={(e) => setEditField("title", e.target.value)}
            placeholder="ชื่อผลงาน"
          />
          <textarea
            style={{ ...styles.input, marginTop: 8, minHeight: 70 }}
            value={editForm.description}
            onChange={(e) => setEditField("description", e.target.value)}
            placeholder="รายละเอียดเพิ่มเติม"
          />
        </td>

        <td style={styles.gradeTd}>
          <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={editForm.hasEvidence}
              onChange={(e) => setEditField("hasEvidence", e.target.checked)}
            />
            มีหลักฐาน
          </label>

          <input
            style={{ ...styles.input, marginTop: 8 }}
            value={editForm.evidenceUrl}
            onChange={(e) => setEditField("evidenceUrl", e.target.value)}
            placeholder="ลิงก์หลักฐาน"
          />
        </td>

        <td style={styles.gradeTd}>
          <input
            style={styles.input}
            value={editForm.note}
            onChange={(e) => setEditField("note", e.target.value)}
            placeholder="หมายเหตุ"
          />
        </td>

        <td style={styles.gradeTd}>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              style={styles.primaryBtn}
              onClick={() => handleEditSave(item.id)}
              disabled={saving}
            >
              {saving ? "..." : "บันทึก"}
            </button>

            <button
              style={styles.outlineBtn}
              onClick={cancelEdit}
              disabled={saving}
            >
              ยกเลิก
            </button>
          </div>
        </td>
      </tr>
    ) : (
      <tr key={item.id}>
        <td style={styles.gradeTd}>{item.category}</td>

        <td style={styles.gradeTd}>
          <div style={{ fontWeight: 700 }}>{item.title}</div>
          {item.description && (
            <div style={{ marginTop: 4, color: "#666", fontSize: 13 }}>
              {item.description}
            </div>
          )}
        </td>

        <td style={styles.gradeTd}>
          {item.evidenceUrl ? (
            <a href={item.evidenceUrl} target="_blank" rel="noreferrer">
              เปิดลิงก์
            </a>
          ) : item.hasEvidence ? "มีแล้ว" : "-"}
        </td>

        <td style={styles.gradeTd}>{item.note || "-"}</td>

        <td style={styles.gradeTd}>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              style={styles.outlineBtn}
              onClick={() => startEdit(item)}
            >
              แก้ไข
            </button>

            <button
              style={styles.deleteBtn}
              onClick={() => handleDelete(item.id)}
            >
              ลบ
            </button>
          </div>
        </td>
      </tr>
    )
  )
)}
          </tbody>
        </table>
      </div>
    </div>
  );

  function startEdit(item) {
  setError("");
  setEditingId(item.id);
  setEditForm({
    category: item.category || "วิชาการ",
    title: item.title || "",
    description: item.description || "",
    hasEvidence: Boolean(item.hasEvidence),
    evidenceUrl: item.evidenceUrl || "",
    note: item.note || "",
  });
}

function cancelEdit() {
  if (saving) return;
  setEditingId("");
  setEditForm({
    category: "วิชาการ",
    title: "",
    description: "",
    hasEvidence: false,
    evidenceUrl: "",
    note: "",
  });
}

function setEditField(key, value) {
  setEditForm((prev) => ({ ...prev, [key]: value }));
}

async function handleEditSave(id) {
  setError("");

  if (!editForm.title.trim()) {
    setError("กรอกชื่อผลงานก่อน");
    return;
  }

  try {
    setSaving(true);
    await updateMyAchievement(id, {
      category: editForm.category,
      title: editForm.title.trim(),
      description: editForm.description.trim(),
      hasEvidence: editForm.hasEvidence,
      evidenceUrl: editForm.evidenceUrl.trim(),
      note: editForm.note.trim(),
    });

    setEditingId("");
    await onReload();
  } catch (err) {
    setError(err.message || "Update failed");
  } finally {
    setSaving(false);
  }
}
}

function StudentGradesTab({ student, gpa }) {
  return (
    <div style={styles.card}>
      <div style={{ fontWeight: 900, fontSize: 18 }}>ผลการเรียนของฉัน</div>
      <div style={{ marginTop: 4, color: "#666" }}>
        GPA รวม: <b>{gpa}</b>
      </div>

      <div style={{ marginTop: 14, overflowX: "auto" }}>
        <table style={styles.gradeTable}>
          <thead>
            <tr>
              <th style={styles.gradeTh}>ปีการศึกษา</th>
              <th style={styles.gradeTh}>เทอม</th>
              <th style={styles.gradeTh}>วิชา</th>
              <th style={styles.gradeTh}>เกรด</th>
              <th style={styles.gradeTh}>หมายเหตุ</th>
            </tr>
          </thead>
          <tbody>
            {(student?.gradeRecords || []).length === 0 ? (
              <tr>
                <td colSpan="5" style={styles.gradeEmpty}>ยังไม่มีข้อมูลผลการเรียน</td>
              </tr>
            ) : (
              (student?.gradeRecords || []).map((item) => (
                <tr key={item.id}>
                  <td style={styles.gradeTd}>{item.academicYear}</td>
                  <td style={styles.gradeTd}>{item.term}</td>
                  <td style={styles.gradeTd}>{item.subject}</td>
                  <td style={styles.gradeTd}>{item.grade}</td>
                  <td style={styles.gradeTd}>{item.note || "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function openChangePassword() {
  setChangePasswordError("");
  setPasswordForm({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  setIsChangePasswordOpen(true);
}

function closeChangePassword() {
  if (changePasswordLoading) return;
  setIsChangePasswordOpen(false);
}

function setPasswordField(key, value) {
  setPasswordForm((prev) => ({ ...prev, [key]: value }));
}

async function handleChangePassword(e) {
  e.preventDefault();

  setChangePasswordError("");

  if (
    !passwordForm.currentPassword.trim() ||
    !passwordForm.newPassword.trim() ||
    !passwordForm.confirmPassword.trim()
  ) {
    setChangePasswordError("กรอกข้อมูลให้ครบ");
    return;
  }

  if (passwordForm.newPassword.trim().length < 4) {
    setChangePasswordError("รหัสผ่านใหม่ต้องมีอย่างน้อย 4 ตัวอักษร");
    return;
  }

  if (passwordForm.newPassword !== passwordForm.confirmPassword) {
    setChangePasswordError("ยืนยันรหัสผ่านใหม่ไม่ตรงกัน");
    return;
  }

  try {
    setChangePasswordLoading(true);

    await changeMyStudentPassword({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
      confirmPassword: passwordForm.confirmPassword,
    });

    setIsChangePasswordOpen(false);
    alert("เปลี่ยนรหัสผ่านสำเร็จ");
  } catch (err) {
    setChangePasswordError(err.message || "Change password failed");
  } finally {
    setChangePasswordLoading(false);
  }
}
};

const styles = {
  mainHeader: {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
},
  pageCenter: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    fontWeight: 700,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  logout: {
    border: "1px solid #ddd",
    background: "#fff",
    borderRadius: 10,
    padding: "10px 12px",
    cursor: "pointer",
    fontWeight: 700,
  },
  card: {
  marginTop: 14,
  background: "#fff",
  border: "1px solid #eee",
  borderRadius: 16,
  padding: 16,
  boxShadow: "0 10px 30px rgba(0,0,0,0.04)",
  overflow: "hidden",
},
  infoGrid: {
    marginTop: 12,
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 10,
  },
  infoBox: {
    border: "1px solid #eee",
    borderRadius: 12,
    padding: 12,
    background: "#fff",
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 12,
  },
  choiceCard: {
    border: "1px solid #eee",
    borderRadius: 14,
    padding: 12,
    background: "#fff",
  },
  label: {
    display: "block",
    marginTop: 10,
    marginBottom: 6,
    fontWeight: 800,
  },
  input: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #ddd",
    outline: "none",
  },
  primaryBtn: {
    border: "none",
    borderRadius: 12,
    padding: "10px 12px",
    cursor: "pointer",
    fontWeight: 900,
    background: "#111",
    color: "white",
  },
  outlineBtn: {
    border: "1px solid #ddd",
    borderRadius: 12,
    padding: "8px 10px",
    cursor: "pointer",
    fontWeight: 800,
    background: "white",
  },
  error: {
    marginTop: 12,
    padding: 10,
    borderRadius: 10,
    background: "#ffe5e5",
    color: "#b00020",
    fontWeight: 700,
  },

  gradeTable: {
  width: "100%",
  borderCollapse: "collapse",
},

gradeTh: {
  textAlign: "left",
  padding: "12px 14px",
  borderBottom: "1px solid #eee",
  fontWeight: 900,
  background: "#fafafa",
},

gradeTd: {
  padding: "12px 14px",
  borderBottom: "1px solid #eee",
},

gradeEmpty: {
  padding: 16,
  textAlign: "center",
  color: "#666",
},

modalOverlay: {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.35)",
  display: "grid",
  placeItems: "center",
  padding: 16,
  overflowY: "auto",
  zIndex: 1000,
},

modal: {
  width: "100%",
  maxWidth: 520,
  background: "#fff",
  borderRadius: 16,
  padding: 16,
  boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
  maxHeight: "90vh",
  overflowY: "auto",
},

modalHeader: {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  marginBottom: 12,
},

modalClose: {
  border: "1px solid #ddd",
  background: "#fff",
  borderRadius: 10,
  width: 36,
  height: 36,
  cursor: "pointer",
},

modalActions: {
  display: "flex",
  justifyContent: "flex-end",
  gap: 8,
  marginTop: 14,
},

};

