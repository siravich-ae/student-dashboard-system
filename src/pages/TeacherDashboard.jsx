import { useEffect, useMemo, useState } from "react";
import {
  clearToken,
  getStudents,
  getStudentById,
  createStudent,
  updateStudentChoices,
  updateStudentProfile,
  createOverviewItem,
  updateOverviewItem,
  deleteOverviewItem,
  uploadStudentPhoto,
  createAchievement,
  updateAchievement,
  deleteAchievement,
  createGrade,
  updateGrade,
  deleteGrade,
  updateStudentExtraNote,
  resetStudentPassword,
  deleteStudent,
  changeMyTeacherPassword,
} from "../services/api";
import { useNavigate } from "react-router-dom";
import { getFileUrl } from "../services/api";

const TABS = [
  { key: "profile", label: "โปรไฟล์" },
  { key: "overview", label: "ภาพรวม" },
  { key: "achievementDetail", label: "รายละเอียดผลงาน" },
  { key: "grades", label: "ผลการเรียน" },
  { key: "other", label: "อื่นๆ" },
];

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

function getPrimaryButtonStyle(theme) {
  return {
    ...styles.primaryBtn,
    background: theme.tabInactive,
    border: `1px solid ${theme.border}`,
    color: "#2f2328",
  };
}

function getOutlineButtonStyle(theme) {
  return {
    ...styles.outlineBtn,
    background: theme.soft,
    border: `1px solid ${theme.border}`,
    color: "#2f2328",
  };
}

export default function TeacherDashboard() {

  const navigate = useNavigate();

  const [students, setStudents] = useState([]);
  const [q, setQ] = useState("");
  const [listError, setListError] = useState("");
  const [listLoading, setListLoading] = useState(false);

  const [selectedId, setSelectedId] = useState(null);
  const [student, setStudent] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [activeTab, setActiveTab] = useState("profile");
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [isTablet, setIsTablet] = useState(window.innerWidth <= 1024);
  const [isSmallTablet, setIsSmallTablet] = useState(window.innerWidth <= 820);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [isTeacherPasswordOpen, setIsTeacherPasswordOpen] = useState(false);
  const [teacherPasswordLoading, setTeacherPasswordLoading] = useState(false);
  const [teacherPasswordError, setTeacherPasswordError] = useState("");
  const [teacherPasswordForm, setTeacherPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showTeacherPassword, setShowTeacherPassword] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });

  // modal: add student
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");
  const [form, setForm] = useState({
    studentCode: "",
    firstName: "",
    lastName: "",
    password: "",
  });

  const [tcasForm, setTcasForm] = useState([
  { rank: 1, universityName: "", facultyName: "", programName: "" },
  { rank: 2, universityName: "", facultyName: "", programName: "" },
  { rank: 3, universityName: "", facultyName: "", programName: "" },
]);
  const [tcasSaving, setTcasSaving] = useState(false);
  const [tcasError, setTcasError] = useState("");
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");
  const [profileForm, setProfileForm] = useState({
  nickname: "",
  gradeLevel: "",
  classRoom: "",
  schoolName: "",
  birthDate: "",
  strengths: "",
  address: "",
  phone: "",
  parentPhone: "",
  themeColor: "#f8ddea",
});

  useEffect(() => {
  function handleResize() {
    setIsTablet(window.innerWidth <= 1024);
    setIsSmallTablet(window.innerWidth <= 820);
  }

  window.addEventListener("resize", handleResize);
  return () => window.removeEventListener("resize", handleResize);
}, []);

  function openAdd() {
    setAddError("");
    setForm({ studentCode: "", firstName: "", lastName: "", password: "" });
    setIsAddOpen(true);
  }

  function closeAdd() {
    if (addLoading) return;
    setIsAddOpen(false);
  }

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function openEditProfile() {
  if (!student) return;

  setEditError("");
  setProfileForm({
    nickname: student.nickname || "",
    gradeLevel: student.gradeLevel || "",
    classRoom: student.classRoom || "",
    schoolName: student.schoolName || "",
    birthDate: student.birthDate
      ? new Date(student.birthDate).toISOString().slice(0, 10)
      : "",
    strengths: student.strengths || "",
    address: student.address || "",
    themeColor: student.themeColor || "#f8ddea",
  });
  setIsEditOpen(true);
}

function openResetPassword() {
  if (!student) return;
  setResetError("");
  setResetPassword("");
  setIsResetOpen(true);
}

function closeResetPassword() {
  if (resetLoading) return;
  setIsResetOpen(false);
}

async function handleResetPassword(e) {
  e.preventDefault();
  if (!student?.id) return;

  setResetError("");

  if (!resetPassword.trim() || resetPassword.trim().length < 4) {
    setResetError("รหัสผ่านใหม่ต้องมีอย่างน้อย 4 ตัวอักษร");
    return;
  }

  try {
    setResetLoading(true);
    await resetStudentPassword(student.id, resetPassword.trim());
    setIsResetOpen(false);
    alert("รีเซ็ตรหัสผ่านสำเร็จ");
  } catch (err) {
    setResetError(err.message || "Reset password failed");
  } finally {
    setResetLoading(false);
  }
}

function toggleTeacherPasswordField(key) {
  setShowTeacherPassword((prev) => ({
    ...prev,
    [key]: !prev[key],
  }));
}

async function handleDeleteStudent() {
  if (!student?.id) return;

  const ok = window.confirm(
    `ต้องการลบบัญชีของ ${student.firstName} ${student.lastName} ใช่ไหม?\n\nข้อมูลทั้งหมดของนักเรียนคนนี้จะถูกลบถาวร`
  );

  if (!ok) return;

  try {
    await deleteStudent(student.id);

    alert("ลบบัญชีนักเรียนสำเร็จ");

    setStudent(null);
    setSelectedId(null);

    await loadStudents();
  } catch (err) {
    alert(err.message || "Delete failed");
  }
}
function openTeacherPasswordModal() {
  setTeacherPasswordError("");
  setTeacherPasswordForm({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  setIsTeacherPasswordOpen(true);
}

function closeTeacherPasswordModal() {
  if (teacherPasswordLoading) return;
  setIsTeacherPasswordOpen(false);
}

function setTeacherPasswordField(key, value) {
  setTeacherPasswordForm((prev) => ({ ...prev, [key]: value }));
}

async function handleTeacherChangePassword(e) {
  e.preventDefault();
  setTeacherPasswordError("");

  if (
    !teacherPasswordForm.currentPassword.trim() ||
    !teacherPasswordForm.newPassword.trim() ||
    !teacherPasswordForm.confirmPassword.trim()
  ) {
    setTeacherPasswordError("กรอกข้อมูลให้ครบ");
    return;
  }

  if (teacherPasswordForm.newPassword.trim().length < 4) {
    setTeacherPasswordError("รหัสผ่านใหม่ต้องมีอย่างน้อย 4 ตัวอักษร");
    return;
  }

  if (teacherPasswordForm.newPassword !== teacherPasswordForm.confirmPassword) {
    setTeacherPasswordError("ยืนยันรหัสผ่านใหม่ไม่ตรงกัน");
    return;
  }

  try {
    setTeacherPasswordLoading(true);

    await changeMyTeacherPassword({
      currentPassword: teacherPasswordForm.currentPassword,
      newPassword: teacherPasswordForm.newPassword,
      confirmPassword: teacherPasswordForm.confirmPassword,
    });

    setIsTeacherPasswordOpen(false);
    alert("เปลี่ยนรหัสผ่านสำเร็จ");
  } catch (err) {
    setTeacherPasswordError(err.message || "Change password failed");
  } finally {
    setTeacherPasswordLoading(false);
  }
}

function closeEditProfile() {
  if (editLoading) return;
  setIsEditOpen(false);
}

function setProfileField(key, value) {
  setProfileForm((prev) => ({ ...prev, [key]: value }));
}

async function handleSaveProfile(e) {
  e.preventDefault();
  if (!student?.id) return;

  setEditError("");
  setEditLoading(true);

  try {
    await updateStudentProfile(student.id, {
      nickname: profileForm.nickname.trim(),
      gradeLevel: profileForm.gradeLevel.trim(),
      classRoom: profileForm.classRoom.trim(),
      schoolName: profileForm.schoolName.trim(),
      birthDate: profileForm.birthDate || null,
      strengths: profileForm.strengths.trim(),
      address: profileForm.address.trim(),
      phone: profileForm.phone?.trim() || null,          
      parentPhone: profileForm.parentPhone?.trim() || null, 
      themeColor: profileForm.themeColor.trim() || null,
    });

    await loadDetail(student.id);
    setIsEditOpen(false);
  } catch (err) {
    setEditError(err.message || "Save failed");
  } finally {
    setEditLoading(false);
  }
}

  async function loadList(search = "") {
    setListError("");
    setListLoading(true);
    try {
      const res = await getStudents(search);
      setStudents(res.students || []);
    } catch (err) {
      setListError(err.message || "Load list failed");
    } finally {
      setListLoading(false);
    }
  }

  async function loadDetail(id) {
    setSelectedId(id);
    setDetailError("");
    setDetailLoading(true);
    try {
      const res = await getStudentById(id);
      setStudent(res.student);
      const base = [
  { rank: 1, universityName: "", facultyName: "", programName: "" },
  { rank: 2, universityName: "", facultyName: "", programName: "" },
  { rank: 3, universityName: "", facultyName: "", programName: "" },
];

(res.student?.choices || []).forEach((c) => {
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

setTcasForm(base);
    } catch (err) {
      setStudent(null);
      setDetailError(err.message || "Load detail failed");
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleCreateStudent(e) {
    e.preventDefault();
    setAddError("");

    const payload = {
      studentCode: form.studentCode.trim(),
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      password: form.password,
    };

    if (!payload.studentCode || !payload.firstName || !payload.lastName || !payload.password) {
      setAddError("กรอกข้อมูลให้ครบ: รหัสนักเรียน, ชื่อ, นามสกุล, รหัสผ่าน");
      return;
    }

    // กันพลาด: รหัสควรเป็นตัวเลขล้วน (ถ้าอยากอนุญาตตัวอักษร ลบเงื่อนไขนี้ได้)
    if (!/^\d+$/.test(payload.studentCode)) {
      setAddError("รหัสนักเรียนควรเป็นตัวเลขเท่านั้น");
      return;
    }

    setAddLoading(true);
    try {
      const res = await createStudent(payload);
      // refresh list
      await loadList(q);
      // เลือกนักเรียนที่สร้างใหม่
      if (res?.student?.id) {
        await loadDetail(res.student.id);
      }
      setIsAddOpen(false);
    } catch (err) {
      setAddError(err.message || "Create failed");
    } finally {
      setAddLoading(false);
    }
  }

  async function handlePhotoChange(e) {
  const file = e.target.files?.[0];
  if (!file || !student?.id) return;

  setPhotoError("");
  setPhotoUploading(true);

  try {
    await uploadStudentPhoto(student.id, file);
    await loadList(q);
    await loadDetail(student.id);
  } catch (err) {
    setPhotoError(err.message || "Upload failed");
  } finally {
    setPhotoUploading(false);
    e.target.value = "";
  }
}

  async function saveTcas() {
  if (!student?.id) return;

  setTcasError("");
  setTcasSaving(true);
  try {
    const payload = tcasForm.map((r) => ({
      rank: r.rank,
      universityName: r.universityName,
      facultyName: r.facultyName,
      programName: r.programName,
    }));

    await updateStudentChoices(student.id, payload);
    await loadDetail(student.id); // รีโหลดให้ข้อมูลใหม่โชว์ทันที
  } catch (err) {
    setTcasError(err.message || "Save failed");
  } finally {
    setTcasSaving(false);
  }
}

  useEffect(() => {
    loadList("");
  }, []);

  // เลือกนักเรียนคนแรกอัตโนมัติ (ถ้ามี)
  useEffect(() => {
    if (!selectedId && students.length > 0) {
      loadDetail(students[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [students]);

  const selectedTitle = useMemo(() => {
    if (!student) return "";
    return `${student.firstName} ${student.lastName} (รหัส ${student.studentCode})`;
  }, [student]);

  const theme = getStudentTheme(student);

  return (
    <div
  style={{
    ...styles.page,
    gridTemplateColumns: isSmallTablet
      ? "1fr"
      : isTablet
      ? "250px 1fr"
      : "320px 1fr",
  }}
>
      {/* SIDEBAR */}
      <aside
  style={{
    ...styles.sidebar,
    borderRight: isSmallTablet ? "none" : "1px solid #eee",
    borderBottom: isSmallTablet ? "1px solid #eee" : "none",
    maxHeight: isSmallTablet ? "320px" : "100vh",
    padding: "20px 24px"
  }}
>
        <div style={styles.sideTop}>
  <div style={{ fontWeight: 800 }}>รายชื่อนักเรียน</div>

  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
    <button
      style={styles.outlineBtn}
      onClick={openTeacherPasswordModal}
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

        <input
          style={styles.search}
          placeholder="ค้นหา ชื่อ/นามสกุล/รหัส..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") loadList(q);
          }}
        />
        <button style={styles.searchBtn} onClick={() => loadList(q)}>
          {listLoading ? "กำลังค้นหา..." : "ค้นหา"}
        </button>

        {listError && <div style={styles.error}>{listError}</div>}

        <div style={{ marginTop: 12 }}>
          {students.map((s) => {
            const isActive = s.id === selectedId;
            return (
        <button
  key={s.id}
  style={{
    ...styles.item,
    ...(isActive ? styles.itemActive : {}),
  }}
  onClick={() => {
  setActiveTab("profile");
  loadDetail(s.id);
}}
>
  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
    <div style={{ width: 42, height: 42, borderRadius: 12, overflow: "hidden", border: "1px solid #eee", background: "#f5f5f5", display: "grid", placeItems: "center", flexShrink: 0 }}>
      {s?.photoUrl && (
  <img
    src={getFileUrl(s.photoUrl)}
    alt={s.firstName}
    style={{ width: "100%", height: "100%", objectFit: "cover" }}
  />
)}
    </div>

    <div>
      <div style={{ fontWeight: 800, textAlign: "left" }}>
        {s.firstName} {s.lastName}
      </div>
      <div style={{ fontSize: 12, color: "#666", textAlign: "left" }}>
        รหัส {s.studentCode}
      </div>
    </div>
  </div>
        </button>
            );
          })}

          {!listLoading && students.length === 0 && !listError && (
            <div style={{ color: "#666", marginTop: 10 }}>
              ยังไม่มีนักเรียน กด “+ เพิ่มนักเรียน”
            </div>
          )}
        </div>
      </aside>

      {/* MAIN */}
      <main
        style={{
    ...styles.main,
    background: theme.pageBg,
  }}
>
  <div
  style={{
    ...styles.mainHeader,
    flexDirection: isSmallTablet ? "column" : "row",
    alignItems: isSmallTablet ? "stretch" : "center",
    gap: 12,
  }}
>
  <div
    style={{
      background: theme.soft,
      border: `1px solid ${theme.border}`,
      borderRadius: 20,
      padding: "12px 18px",
      flex: 1,
    }}
  >
    <h2 style={{ margin: 0 }}>ข้อมูลนักเรียน</h2>
    <div style={{ marginTop: 6, color: "#666" }}>
      {student ? selectedTitle : "เลือกนักเรียนจากแถบซ้าย"}
    </div>
  </div>

  <button
  style={getPrimaryButtonStyle(theme)}
  onClick={openAdd}
>
  + เพิ่มนักเรียน
</button>
</div>

        {/* Tabs */}
        <div style={styles.tabs}>
  {TABS.map((t) => {
    const active = t.key === activeTab;
    return (
      <button
        key={t.key}
        style={{
          ...styles.tab,
          background: active ? theme.tabActive : theme.tabInactive,
          border: `1px solid ${theme.border}`,
          color: "#2f2328",
          boxShadow: active ? "0 2px 0 rgba(0,0,0,0.04)" : "none",
        }}
        onClick={() => setActiveTab(t.key)}
      >
        {t.label}
      </button>
    );
  })}
</div>

        {/* Content */}
        <div
          style={{
    ...styles.card,
    border: `1px solid ${theme.border}`,
    background: theme.cardBg,
  }}
>
          {detailLoading && <div style={{ color: "#666" }}>กำลังโหลดข้อมูล...</div>}
          {detailError && <div style={styles.error}>{detailError}</div>}

          {!detailLoading && !detailError && activeTab === "profile" && (
            <ProfileTab
              student={student}
              tcasForm={tcasForm}
              setTcasForm={setTcasForm}
              saveTcas={saveTcas}
              tcasSaving={tcasSaving}
              tcasError={tcasError}
              onEditProfile={openEditProfile}
              onResetPassword={openResetPassword}
              onDeleteStudent={handleDeleteStudent}
              onPhotoChange={handlePhotoChange}
              photoUploading={photoUploading}
              photoError={photoError}
          />
          )}

            {!detailLoading && !detailError && activeTab === "overview" && (
  <OverviewTab
    student={student}
    onReload={() => loadDetail(student.id)}
  />
)}

{!detailLoading && !detailError && activeTab === "achievementDetail" && (
  <AchievementDetailTab
    student={student}
    onReload={() => loadDetail(student.id)}
  />
)}

{!detailLoading && !detailError && activeTab === "grades" && (
  <GradesTab
    student={student}
    onReload={() => loadDetail(student.id)}
  />
)}

{!detailLoading && !detailError && activeTab === "other" && (
  <OtherTab
    student={student}
    onReload={() => loadDetail(student.id)}
  />
)}

        </div>
      </main>

      {/* MODAL: ADD STUDENT */}
      {isAddOpen && (
        <div style={styles.modalOverlay} onMouseDown={closeAdd}>
          <div style={styles.modal} onMouseDown={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={{ fontWeight: 900, fontSize: 16 }}>เพิ่มนักเรียน</div>
              <button style={styles.modalClose} onClick={closeAdd} disabled={addLoading}>
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateStudent}>
              <label style={styles.label}>รหัสนักเรียน (ใช้เป็น username)</label>
              <input
                style={styles.input}
                value={form.studentCode}
                onChange={(e) => setField("studentCode", e.target.value)}
                placeholder="เช่น 65001"
              />

              <label style={styles.label}>ชื่อ</label>
              <input
                style={styles.input}
                value={form.firstName}
                onChange={(e) => setField("firstName", e.target.value)}
                placeholder="ชื่อจริง"
              />

              <label style={styles.label}>นามสกุล</label>
              <input
                style={styles.input}
                value={form.lastName}
                onChange={(e) => setField("lastName", e.target.value)}
                placeholder="นามสกุล"
              />

              <label style={styles.label}>รหัสผ่านเริ่มต้น</label>
              <input
                style={styles.input}
                type="password"
                value={form.password}
                onChange={(e) => setField("password", e.target.value)}
                placeholder="รหัสผ่าน"
              />

              {addError && <div style={styles.error}>{addError}</div>}

              <div style={styles.modalActions}>
                <button
                  type="button"
                  style={styles.outlineBtn}
                  onClick={closeAdd}
                  disabled={addLoading}
                >
                  ยกเลิก
                </button>
                <button type="submit" style={styles.primaryBtn} disabled={addLoading}>
                  {addLoading ? "กำลังบันทึก..." : "บันทึก"}
                </button>
              </div>
            </form>

            <div style={{ marginTop: 10, fontSize: 12, color: "#666" }}>
              * หลังสร้างแล้ว นักเรียนจะล็อกอินด้วย “รหัสนักเรียน + รหัสผ่าน”
            </div>
          </div>
        </div>
      )}

            {isEditOpen && (
        <div style={styles.modalOverlay} onMouseDown={closeEditProfile}>
          <div style={styles.modal} onMouseDown={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={{ fontWeight: 900, fontSize: 16 }}>แก้ไขโปรไฟล์นักเรียน</div>
              <button
                style={styles.modalClose}
                onClick={closeEditProfile}
                disabled={editLoading}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProfile}>
              <label style={styles.label}>ชื่อเล่น</label>
              <input
                style={styles.input}
                value={profileForm.nickname}
                onChange={(e) => setProfileField("nickname", e.target.value)}
                placeholder="ชื่อเล่น"
              />

              <label style={styles.label}>ชั้น</label>
              <input
                style={styles.input}
                value={profileForm.gradeLevel}
                onChange={(e) => setProfileField("gradeLevel", e.target.value)}
                placeholder="ชั้น"
              />

              <label style={styles.label}>ห้อง</label>
              <input
                style={styles.input}
                value={profileForm.classRoom}
                onChange={(e) => setProfileField("classRoom", e.target.value)}
                placeholder="ห้อง"
              />

              <label style={styles.label}>โรงเรียน</label>
              <input
                style={styles.input}
                value={profileForm.schoolName}
                onChange={(e) => setProfileField("schoolName", e.target.value)}
                placeholder="โรงเรียน"
              />

              <label style={styles.label}>วันเกิด</label>
              <input
                style={styles.input}
                type="date"
                value={profileForm.birthDate}
                onChange={(e) => setProfileField("birthDate", e.target.value)}
              />

              <label style={styles.label}>จุดแข็ง / ความสนใจ</label>
              <input
                style={styles.input}
                value={profileForm.strengths}
                onChange={(e) => setProfileField("strengths", e.target.value)}
                placeholder="เช่น ชอบชีวะ / เขียนโปรแกรม / วาดรูป"
              />

              <label style={styles.label}>ที่อยู่</label>
              <textarea
                style={{ ...styles.input, minHeight: 90, resize: "vertical" }}
                value={profileForm.address}
                onChange={(e) => setProfileField("address", e.target.value)}
                placeholder="กรอกที่อยู่"
              />

              
  <label style={styles.label}>เบอร์โทรติดต่อ</label>
  <input
    style={styles.input}
    value={profileForm.phone}
    onChange={(e) => setProfileField("phone", e.target.value)}
    placeholder="เช่น 08xxxxxxxx"
  />



  <label style={styles.label}>เบอร์โทรผู้ปกครอง</label>
  <input
    style={styles.input}
    value={profileForm.parentPhone}
    onChange={(e) => setProfileField("parentPhone", e.target.value)}
    placeholder="เช่น 08xxxxxxxx"
  />

                <label style={styles.label}>ธีมสีประจำตัวนักเรียน</label>

                

<div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
  <div
    style={{
      width: 46,
      height: 46,
      borderRadius: 12,
      border: "1px solid #ddd",
      background: profileForm.themeColor || "#f8ddea",
    }}
  />

  <input
    type="color"
    value={profileForm.themeColor || "#f8ddea"}
    onChange={(e) => setProfileField("themeColor", e.target.value)}
    style={{
      width: 56,
      height: 42,
      border: "none",
      background: "transparent",
      cursor: "pointer",
    }}
  />

  <input
    style={{ ...styles.input, width: 160 }}
    value={profileForm.themeColor}
    onChange={(e) => setProfileField("themeColor", e.target.value)}
    placeholder="#F8DDEA"
  />
</div>

<div style={{ marginTop: 10 }}>
  <div style={{ fontSize: 12, color: "#666", marginBottom: 8 }}>สีแนะนำ</div>
  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
    {["#f8ddea", "#dff1ff", "#e4f6dd", "#f7e3ff", "#ffe8d6", "#fff4c9"].map((color) => (
      <button
        key={color}
        type="button"
        onClick={() => setProfileField("themeColor", color)}
        style={{
          width: 34,
          height: 34,
          borderRadius: 999,
          border: profileForm.themeColor === color ? "2px solid #111" : "1px solid #ddd",
          background: color,
          cursor: "pointer",
        }}
        title={color}
      />
    ))}
  </div>
</div>
              {editError && <div style={styles.error}>{editError}</div>}

              <div style={styles.modalActions}>
                <button
                  type="button"
                  style={styles.outlineBtn}
                  onClick={closeEditProfile}
                  disabled={editLoading}
                >
                  ยกเลิก
                </button>
                <button type="submit" style={styles.primaryBtn} disabled={editLoading}>
                  {editLoading ? "กำลังบันทึก..." : "บันทึกโปรไฟล์"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isResetOpen && (
  <div style={styles.modalOverlay} onMouseDown={closeResetPassword}>
    <div style={styles.modal} onMouseDown={(e) => e.stopPropagation()}>
      <div style={styles.modalHeader}>
        <div style={{ fontWeight: 900, fontSize: 16 }}>รีเซ็ตรหัสผ่านนักเรียน</div>
        <button
          style={styles.modalClose}
          onClick={closeResetPassword}
          disabled={resetLoading}
        >
          ✕
        </button>
      </div>

      <form onSubmit={handleResetPassword}>
        <label style={styles.label}>รหัสผ่านใหม่</label>
        <input
          style={styles.input}
          type="password"
          value={resetPassword}
          onChange={(e) => setResetPassword(e.target.value)}
          placeholder="อย่างน้อย 4 ตัวอักษร"
        />

        {resetError && <div style={styles.error}>{resetError}</div>}

        <div style={styles.modalActions}>
          <button
            type="button"
            style={styles.outlineBtn}
            onClick={closeResetPassword}
            disabled={resetLoading}
          >
            ยกเลิก
          </button>

          <button type="submit" style={styles.primaryBtn} disabled={resetLoading}>
            {resetLoading ? "กำลังบันทึก..." : "บันทึกรหัสผ่านใหม่"}
          </button>
        </div>
      </form>
    </div>
  </div>
)}
{isTeacherPasswordOpen && (
  <div style={styles.modalOverlay} onMouseDown={closeTeacherPasswordModal}>
    <div style={styles.modal} onMouseDown={(e) => e.stopPropagation()}>
      <div style={styles.modalHeader}>
        <div style={{ fontWeight: 900, fontSize: 16 }}>เปลี่ยนรหัสผ่านครู</div>
        <button
          style={styles.modalClose}
          onClick={closeTeacherPasswordModal}
          disabled={teacherPasswordLoading}
        >
          ✕
        </button>
      </div>

      <form onSubmit={handleTeacherChangePassword}>
        <label style={styles.label}>รหัสผ่านปัจจุบัน</label>
          <div style={{ position: "relative" }}>
            <input style={{ ...styles.input, paddingRight: 44 }}
                   type={showTeacherPassword.currentPassword ? "text" : "password"}
                   value={teacherPasswordForm.currentPassword}
                   onChange={(e) =>
      setTeacherPasswordField("currentPassword", e.target.value)
    }
    placeholder="กรอกรหัสผ่านปัจจุบัน"
  />
  <button
    type="button"
    onClick={() => toggleTeacherPasswordField("currentPassword")}
    style={styles.eyeBtn}
  >
    {showTeacherPassword.currentPassword ? "🙈" : "👁"}
  </button>
</div>

        <label style={styles.label}>รหัสผ่านใหม่</label>
          <div style={{ position: "relative" }}>
            <input style={{ ...styles.input, paddingRight: 44 }}
                   type={showTeacherPassword.newPassword ? "text" : "password"}
                   value={teacherPasswordForm.newPassword}
                   onChange={(e) =>
      setTeacherPasswordField("newPassword", e.target.value)
    }
    placeholder="อย่างน้อย 4 ตัวอักษร"
  />
  <button
    type="button"
    onClick={() => toggleTeacherPasswordField("newPassword")}
    style={styles.eyeBtn}
  >
    {showTeacherPassword.newPassword ? "🙈" : "👁"}
  </button>
</div>

        <label style={styles.label}>ยืนยันรหัสผ่านใหม่</label>
          <div style={{ position: "relative" }}>
            <input style={{ ...styles.input, paddingRight: 44 }}
                   type={showTeacherPassword.confirmPassword ? "text" : "password"}
                   value={teacherPasswordForm.confirmPassword}
                   onChange={(e) =>
      setTeacherPasswordField("confirmPassword", e.target.value)
    }
    placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
  />
  <button
    type="button"
    onClick={() => toggleTeacherPasswordField("confirmPassword")}
    style={styles.eyeBtn}
  >
    {showTeacherPassword.confirmPassword ? "🙈" : "👁"}
  </button>
</div>

        {teacherPasswordError && (
          <div style={styles.error}>{teacherPasswordError}</div>
        )}

        <div style={styles.modalActions}>
          <button
            type="button"
            style={styles.outlineBtn}
            onClick={closeTeacherPasswordModal}
            disabled={teacherPasswordLoading}
          >
            ยกเลิก
          </button>

          <button
            type="submit"
            style={styles.primaryBtn}
            disabled={teacherPasswordLoading}
          >
            {teacherPasswordLoading ? "กำลังบันทึก..." : "บันทึกรหัสผ่านใหม่"}
          </button>
        </div>
      </form>
    </div>
  </div>
)}
    </div>
  );

  function AchievementDetailTab({ student, onReload }) {
  if (!student) return <div>ยังไม่ได้เลือกนักเรียน</div>;

  const categories = ["วิชาการ", "กีฬา", "ศิลปะ", "จิตอาสา", "อื่น ๆ"];
  const achievements = student.achievements || [];

  return (
    <div>
      {categories.map((category) => (
        <AchievementCategorySection
          key={category}
          category={category}
          studentId={student.id}
          items={achievements.filter((a) => a.category === category)}
          onReload={onReload}
        />
      ))}
    </div>
  );
}

function AchievementCategorySection({ category, studentId, items, onReload }) {
  const [adding, setAdding] = useState(false);
  const [savingId, setSavingId] = useState("");
  const [error, setError] = useState("");
  const [newItem, setNewItem] = useState({
    title: "",
    description: "",
    hasEvidence: false,
    evidenceUrl: "",
    note: "",
  });
  const [editingId, setEditingId] = useState("");
  const [editForm, setEditForm] = useState({
  title: "",
  description: "",
  hasEvidence: false,
  evidenceUrl: "",
  note: "",
});

  function startEdit(item) {
  setError("");
  setEditingId(item.id);
  setEditForm({
    title: item.title || "",
    description: item.description || "",
    hasEvidence: Boolean(item.hasEvidence),
    evidenceUrl: item.evidenceUrl || "",
    note: item.note || "",
  });
}

function cancelEdit() {
  if (savingId) return;
  setEditingId("");
  setEditForm({
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

async function handleSaveEdit(itemId) {
  if (!editForm.title.trim()) {
    setError("กรอกชื่อรายการก่อน");
    return;
  }

  try {
    setSavingId(itemId);
    await updateAchievement(itemId, {
      category,
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
    setSavingId("");
  }
}

  function setNewField(key, value) {
    setNewItem((prev) => ({ ...prev, [key]: value }));
  }

  async function handleAdd() {
    setError("");

    if (!newItem.title.trim()) {
      setError("กรอกชื่อรายการก่อน");
      return;
    }

    try {
      setSavingId("new");
      await createAchievement(studentId, {
        category,
        title: newItem.title.trim(),
        description: newItem.description.trim(),
        hasEvidence: newItem.hasEvidence,
        evidenceUrl: newItem.evidenceUrl.trim(),
        note: newItem.note.trim(),
        sortOrder: items.length + 1,
      });

      setNewItem({
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
      setSavingId("");
    }
  }

  async function handleToggle(item) {
    try {
      setSavingId(item.id);
      await updateAchievement(item.id, {
        hasEvidence: !item.hasEvidence,
      });
      await onReload();
    } catch (err) {
      setError(err.message || "Update failed");
    } finally {
      setSavingId("");
    }
  }

  async function handleDelete(itemId) {
    const ok = window.confirm("ลบผลงานนี้ใช่ไหม?");
    if (!ok) return;

    try {
      setSavingId(itemId);
      await deleteAchievement(itemId);
      await onReload();
    } catch (err) {
      setError(err.message || "Delete failed");
    } finally {
      setSavingId("");
    }
  }

  return (
    <div style={{ marginBottom: 28 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 10,
        }}
      >
        <h3 style={{ margin: 0 }}>{category}</h3>
        <button
          style={styles.outlineBtn}
          onClick={() => setAdding((prev) => !prev)}
        >
          {adding ? "ยกเลิก" : "+ เพิ่มผลงาน"}
        </button>
      </div>

      <div style={styles.overviewTableWrap}>
        <table style={styles.overviewTable}>
          <thead>
            <tr>
              <th style={styles.overviewTh}>ด้าน</th>
              <th style={styles.overviewTh}>รายการ</th>
              <th style={styles.overviewTh}>มีหลักฐาน</th>
              <th style={styles.overviewTh}>เก็บรายละเอียด/ภาพ</th>
              <th style={styles.overviewTh}>ลบ</th>
            </tr>
          </thead>

          <tbody>
            {items.length === 0 && !adding && (
              <tr>
                <td colSpan="5" style={styles.overviewEmpty}>
                  ยังไม่มีรายการในหมวดนี้
                </td>
              </tr>
            )}

            {items.map((item) =>
  editingId === item.id ? (
    <tr key={item.id}>
      <td style={styles.overviewTd}>{category}</td>

      <td style={styles.overviewTd}>
        <input
          style={styles.tableInput}
          value={editForm.title}
          onChange={(e) => setEditField("title", e.target.value)}
          placeholder="ชื่อผลงาน"
        />
        <input
          style={{ ...styles.tableInput, marginTop: 8 }}
          value={editForm.description}
          onChange={(e) => setEditField("description", e.target.value)}
          placeholder="รายละเอียดเพิ่มเติม"
        />
      </td>

      <td style={styles.overviewTdCenter}>
        <input
          type="checkbox"
          checked={editForm.hasEvidence}
          onChange={(e) => setEditField("hasEvidence", e.target.checked)}
        />
      </td>

      <td style={styles.overviewTd}>
        <input
          style={styles.tableInput}
          value={editForm.evidenceUrl}
          onChange={(e) => setEditField("evidenceUrl", e.target.value)}
          placeholder="ลิงก์หลักฐาน"
        />
        <input
          style={{ ...styles.tableInput, marginTop: 8 }}
          value={editForm.note}
          onChange={(e) => setEditField("note", e.target.value)}
          placeholder="หมายเหตุ"
        />
      </td>

      <td style={styles.overviewTdCenter}>
        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          <button
            style={styles.primaryBtn}
            onClick={() => handleSaveEdit(item.id)}
            disabled={savingId === item.id}
          >
            {savingId === item.id ? "..." : "บันทึก"}
          </button>
          <button
            style={styles.outlineBtn}
            onClick={cancelEdit}
            disabled={savingId === item.id}
          >
            ยกเลิก
          </button>
        </div>
      </td>
    </tr>
  ) : (
    <AchievementRow
      key={item.id}
      item={item}
      category={category}
      saving={savingId === item.id}
      onToggle={handleToggle}
      onDelete={handleDelete}
      onEdit={startEdit}
    />
  )
)}

            {adding && (
              <tr>
                <td style={styles.overviewTd}>{category}</td>
                <td style={styles.overviewTd}>
                  <input
                    style={styles.tableInput}
                    value={newItem.title}
                    onChange={(e) => setNewField("title", e.target.value)}
                    placeholder="เช่น ตอบปัญหา ZIM Festival"
                  />
                  <input
                    style={{ ...styles.tableInput, marginTop: 8 }}
                    value={newItem.description}
                    onChange={(e) => setNewField("description", e.target.value)}
                    placeholder="รายละเอียดเพิ่มเติม"
                  />
                </td>
                <td style={styles.overviewTdCenter}>
                  <input
                    type="checkbox"
                    checked={newItem.hasEvidence}
                    onChange={(e) => setNewField("hasEvidence", e.target.checked)}
                  />
                </td>
                <td style={styles.overviewTd}>
                  <input
                    style={styles.tableInput}
                    value={newItem.evidenceUrl}
                    onChange={(e) => setNewField("evidenceUrl", e.target.value)}
                    placeholder="ลิงก์ Drive / หลักฐาน"
                  />
                  <input
                    style={{ ...styles.tableInput, marginTop: 8 }}
                    value={newItem.note}
                    onChange={(e) => setNewField("note", e.target.value)}
                    placeholder="หมายเหตุ"
                  />
                </td>
                <td style={styles.overviewTdCenter}>
                  <button
                    style={styles.primaryBtn}
                    onClick={handleAdd}
                    disabled={savingId === "new"}
                  >
                    {savingId === "new" ? "..." : "บันทึก"}
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {error && <div style={styles.error}>{error}</div>}
    </div>
  );
}

function AchievementRow({ item, category, saving, onToggle, onDelete, onEdit }) {
  return (
    <tr>
      <td style={styles.overviewTd}>{category}</td>
      <td style={styles.overviewTd}>
        <div style={{ fontWeight: 800 }}>{item.title}</div>
        {item.description && (
          <div style={{ marginTop: 6, color: "#666", fontSize: 13 }}>
            {item.description}
          </div>
        )}
      </td>
      <td style={styles.overviewTdCenter}>
        <button
          style={styles.checkBtn}
          onClick={() => onToggle(item)}
          disabled={saving}
        >
          {item.hasEvidence ? "✔" : "○"}
        </button>
      </td>
      <td style={styles.overviewTd}>
        {item.evidenceUrl ? (
          <a
            href={item.evidenceUrl}
            target="_blank"
            rel="noreferrer"
            style={{ color: "#2563eb", fontWeight: 700 }}
          >
            เปิดหลักฐาน
          </a>
        ) : (
          <span style={{ color: "#666" }}>-</span>
        )}

        {item.note && (
          <div style={{ marginTop: 6, color: "#666" }}>{item.note}</div>
        )}
      </td>
      <td style={styles.overviewTdCenter}>
  <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
    <button
      style={styles.outlineBtn}
      onClick={() => onEdit(item)}
      disabled={saving}
    >
      แก้ไข
    </button>

    <button
      style={styles.deleteBtn}
      onClick={() => onDelete(item.id)}
      disabled={saving}
    >
      ลบ
    </button>
  </div>
</td>
    </tr>
  );
}
}

function ProfileTab({
  student,
  tcasForm,
  setTcasForm,
  saveTcas,
  tcasSaving,
  tcasError,
  onEditProfile,
  onResetPassword,
  onDeleteStudent,
  onPhotoChange,
  photoUploading,
  photoError,
}) {
  if (!student) return <div style={{ color: "#666" }}>ยังไม่ได้เลือกนักเรียน</div>;

  const fullName = `${student.firstName} ${student.lastName}`;

  return (
    <div>
      <div style={styles.profileTop}>
        <div style={styles.avatar}>
        {student?.photoUrl && (
  <img
    src={getFileUrl(student.photoUrl)}
    alt={student.firstName}
    style={styles.avatarImg}
  />
)}
    </div>

        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 20, fontWeight: 900 }}>{fullName}</div>
          <div style={{ marginTop: 4, color: "#666" }}>
            รหัสนักเรียน: <b>{student.studentCode}</b>
          </div>
          <div style={{ marginTop: 4, color: "#666" }}>
            ชั้น: <b>{student.gradeLevel || "-"}</b> | ห้อง: <b>{student.classRoom || "-"}</b>
          </div>
          <div style={{ marginTop: 4, color: "#666" }}>
            โรงเรียน: <b>{student.schoolName || "-"}</b>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
  <button style={styles.outlineBtn} onClick={onEditProfile}>
    แก้ไขโปรไฟล์
  </button>

  <button style={styles.outlineBtn} onClick={onResetPassword}>
    รีเซ็ตรหัสผ่าน
  </button>

  <button style={styles.deleteBtn} onClick={onDeleteStudent}>
    ลบบัญชีนักเรียน
  </button>
</div>
      </div>

      <div style={{ marginTop: 10 }}>
    <label style={styles.uploadBtn}>
    {photoUploading ? "กำลังอัปโหลด..." : "อัปโหลดรูปโปรไฟล์"}
    <input
      type="file"
      accept="image/*"
      onChange={onPhotoChange}
      style={{ display: "none" }}
      disabled={photoUploading}
    />
      </label>

      {photoError && <div style={styles.error}>{photoError}</div>}
      </div>

      <div
  style={{
    ...styles.grid,
    gridTemplateColumns: window.innerWidth <= 820 ? "1fr" : "repeat(2, minmax(0, 1fr))",
  }}
>
        <Field label="ชื่อเล่น" value={student.nickname} />
        <Field
          label="วันเกิด"
          value={student.birthDate ? new Date(student.birthDate).toLocaleDateString() : null}
        />
        <Field label="จุดแข็ง" value={student.strengths} />
        <Field label="ที่อยู่" value={student.address} />
        <Field label="เบอร์โทร" value={student.phone} />
        <Field label="เบอร์ผู้ปกครอง" value={student.parentPhone} />
      </div>

      <div style={{ marginTop: 16 }}>
  <Top3ChoicesEditor
    student={student}
    tcasForm={tcasForm}
    setTcasForm={setTcasForm}
    onSave={saveTcas}
    saving={tcasSaving}
    error={tcasError}
  />
</div>
    </div>
  );
}

function Top3ChoicesEditor({ student, tcasForm, setTcasForm, onSave, saving, error }) {
  if (!student) return <div style={{ color: "#666" }}>ยังไม่ได้เลือกนักเรียน</div>;

  function setRow(rank, key, value) {
    setTcasForm((prev) =>
      prev.map((r) => (r.rank === rank ? { ...r, [key]: value } : r))
    );
  }

  async function clearRow(rank) {
  const newChoices = tcasForm.map((r) =>
    r.rank === rank
      ? { ...r, universityName: "", facultyName: "", programName: "" }
      : r
  );

  setTcasForm(newChoices);

  await updateStudentChoices(student.id, newChoices); // 🔥 ยิง API
  await loadDetail(student.id);
}

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 16 }}>คณะที่อยากเข้า / มหาลัยที่อยากเข้า (Top 3)</div>
          <div style={{ marginTop: 4, color: "#666", fontSize: 12 }}>
            แก้ไขได้จากหน้าโปรไฟล์เลย • ถ้าจะลบอันดับไหนให้กด “ลบอันดับนี้” แล้วบันทึก
          </div>
        </div>

        <button style={styles.primaryBtn} onClick={onSave} disabled={saving}>
          {saving ? "กำลังบันทึก..." : "บันทึก Top 3"}
        </button>
      </div>

      <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
        {tcasForm.map((r) => (
          <div
            key={r.rank}
            style={{ border: "1px solid #eee", borderRadius: 14, padding: 12, background: "#fff" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
              <div style={{ fontWeight: 900 }}>อันดับ {r.rank}</div>
              <button style={styles.outlineBtn} onClick={() => clearRow(r.rank)} disabled={saving}>
                ลบอันดับนี้
              </button>
            </div>

            <label style={styles.label}>มหาวิทยาลัย</label>
            <input
              style={styles.input}
              value={r.universityName}
              onChange={(e) => setRow(r.rank, "universityName", e.target.value)}
              placeholder="เช่น จุฬาลงกรณ์มหาวิทยาลัย"
            />

            <label style={styles.label}>คณะ</label>
            <input
              style={styles.input}
              value={r.facultyName}
              onChange={(e) => setRow(r.rank, "facultyName", e.target.value)}
              placeholder="เช่น วิศวกรรมศาสตร์"
            />

            <label style={styles.label}>สาขา</label>
            <input
              style={styles.input}
              value={r.programName}
              onChange={(e) => setRow(r.rank, "programName", e.target.value)}
              placeholder="เช่น วิศวกรรมคอมพิวเตอร์"
            />
          </div>
        ))}
      </div>

      {error && <div style={styles.error}>{error}</div>}
    </div>
  );
}

function TcasTab({ student, tcasForm, setTcasForm, onSave, saving, error }) {
  if (!student) return <div style={{ color: "#666" }}>ยังไม่ได้เลือกนักเรียน</div>;

  function setRow(rank, key, value) {
    setTcasForm((prev) =>
      prev.map((r) => (r.rank === rank ? { ...r, [key]: value } : r))
    );
  }

  function clearRow(rank) {
    setTcasForm((prev) =>
      prev.map((r) =>
        r.rank === rank
          ? { ...r, universityName: "", facultyName: "", programName: "" }
          : r
      )
    );
  }

  return (
    <div>
      <div style={{ fontWeight: 900, fontSize: 16 }}>TCAS / มหาลัยที่อยากเข้า (Top 3)</div>
      <div style={{ marginTop: 6, color: "#666" }}>
        กรอกเฉพาะมหาลัยก็ได้ ช่องอื่นเว้นว่างได้ • ถ้าลบให้เคลียร์ช่องแล้วกดบันทึก
      </div>

      <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
        {tcasForm.map((r) => (
          <div key={r.rank} style={{ border: "1px solid #eee", borderRadius: 14, padding: 12, background: "#fff" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
              <div style={{ fontWeight: 900 }}>อันดับ {r.rank}</div>
              <button style={styles.outlineBtn} onClick={() => clearRow(r.rank)} disabled={saving}>
                ลบอันดับนี้
              </button>
            </div>

            <label style={styles.label}>มหาวิทยาลัย</label>
            <input
              style={styles.input}
              value={r.universityName}
              onChange={(e) => setRow(r.rank, "universityName", e.target.value)}
              placeholder="เช่น จุฬาลงกรณ์มหาวิทยาลัย"
            />

            <label style={styles.label}>คณะ</label>
            <input
              style={styles.input}
              value={r.facultyName}
              onChange={(e) => setRow(r.rank, "facultyName", e.target.value)}
              placeholder="เช่น วิศวกรรมศาสตร์"
            />

            <label style={styles.label}>สาขา</label>
            <input
              style={styles.input}
              value={r.programName}
              onChange={(e) => setRow(r.rank, "programName", e.target.value)}
              placeholder="เช่น วิศวกรรมคอมพิวเตอร์"
            />
          </div>
        ))}
      </div>

      {error && <div style={styles.error}>{error}</div>}

      <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end" }}>
        <button style={styles.primaryBtn} onClick={onSave} disabled={saving}>
          {saving ? "กำลังบันทึก..." : "บันทึก Top 3"}
        </button>
      </div>
    </div>
  );
}


function Field({ label, value }) {
  return (
    <div style={styles.field}>
      <div style={{ fontSize: 12, color: "#666" }}>{label}</div>
      <div style={{ marginTop: 6, fontWeight: 800 }}>{value || "-"}</div>
    </div>
  );
}

function OverviewTab({ student, onReload }) {
  if (!student) return <div>ยังไม่ได้เลือกนักเรียน</div>;

  const items = student.overviewItems || [];

  const groupByRank = (rank) => items.filter((i) => i.choiceRank === rank);

  return (
    <div>
      {[1, 2, 3].map((rank) => (
        <OverviewSection
          key={rank}
          rank={rank}
          studentId={student.id}
          items={groupByRank(rank)}
          onReload={onReload}
        />
      ))}
    </div>
  );
}

function OverviewSection({ rank, studentId, items, onReload }) {
  const [adding, setAdding] = useState(false);
  const [newItem, setNewItem] = useState({
    requirementType: "",
    requirementText: "",
    hasIt: false,
    note: "",
  });
  const [savingId, setSavingId] = useState("");
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState("");
  const [editForm, setEditForm] = useState({
  requirementType: "",
  requirementText: "",
  hasIt: false,
  note: "",
});

  function startEdit(item) {
  setError("");
  setEditingId(item.id);
  setEditForm({
    requirementType: item.requirementType || "",
    requirementText: item.requirementText || "",
    hasIt: Boolean(item.hasIt),
    note: item.note || "",
  });
}

function cancelEdit() {
  if (savingId) return;
  setEditingId("");
  setEditForm({
    requirementType: "",
    requirementText: "",
    hasIt: false,
    note: "",
  });
}

function setEditField(key, value) {
  setEditForm((prev) => ({ ...prev, [key]: value }));
}

async function handleSaveEdit(itemId) {
  if (!editForm.requirementText.trim()) {
    setError("กรอกข้อเรียกร้องก่อน");
    return;
  }

  try {
    setSavingId(itemId);
    await updateOverviewItem(itemId, {
      requirementType: editForm.requirementType.trim(),
      requirementText: editForm.requirementText.trim(),
      hasIt: editForm.hasIt,
      note: editForm.note.trim(),
    });
    setEditingId("");
    await onReload();
  } catch (err) {
    setError(err.message || "Update failed");
  } finally {
    setSavingId("");
  }
}

  function setNewField(key, value) {
    setNewItem((prev) => ({ ...prev, [key]: value }));
  }

  async function handleAdd() {
    setError("");

    if (!newItem.requirementText.trim()) {
      setError("กรอกข้อเรียกร้องก่อน");
      return;
    }

    try {
      setSavingId("new");
      await createOverviewItem(studentId, {
        choiceRank: rank,
        requirementType: newItem.requirementType.trim(),
        requirementText: newItem.requirementText.trim(),
        hasIt: newItem.hasIt,
        note: newItem.note.trim(),
        sortOrder: items.length + 1,
      });

      setNewItem({
        requirementType: "",
        requirementText: "",
        hasIt: false,
        note: "",
      });
      setAdding(false);
      await onReload();
    } catch (err) {
      setError(err.message || "Add failed");
    } finally {
      setSavingId("");
    }
  }

  async function handleToggle(item) {
    try {
      setSavingId(item.id);
      await updateOverviewItem(item.id, {
        hasIt: !item.hasIt,
      });
      await onReload();
    } catch (err) {
      setError(err.message || "Update failed");
    } finally {
      setSavingId("");
    }
  }

  async function handleNoteBlur(item, value) {
    try {
      setSavingId(item.id);
      await updateOverviewItem(item.id, {
        note: value,
      });
      await onReload();
    } catch (err) {
      setError(err.message || "Update note failed");
    } finally {
      setSavingId("");
    }
  }

  async function handleDelete(itemId) {
    const ok = window.confirm("ลบรายการนี้ใช่ไหม?");
    if (!ok) return;

    try {
      setSavingId(itemId);
      await deleteOverviewItem(itemId);
      await onReload();
    } catch (err) {
      setError(err.message || "Delete failed");
    } finally {
      setSavingId("");
    }
  }

  return (
    <div style={{ marginBottom: 28 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 10,
        }}
      >
        <h3 style={{ margin: 0 }}>คณะอันดับ {rank}</h3>
        <button
          style={styles.outlineBtn}
          onClick={() => setAdding((prev) => !prev)}
        >
          {adding ? "ยกเลิก" : "+ เพิ่มรายการ"}
        </button>
      </div>

      <div style={styles.overviewTableWrap}>
        <table style={styles.overviewTable}>
          <thead>
            <tr>
              <th style={styles.overviewTh}>รอบที่มีสิทธิ์ยื่น</th>
              <th style={styles.overviewTh}>ข้อเรียกร้อง</th>
              <th style={styles.overviewTh}>มีแล้ว</th>
              <th style={styles.overviewTh}>หมายเหตุ</th>
              <th style={styles.overviewTh}>จัดการ</th>
            </tr>
          </thead>

          <tbody>
            {items.length === 0 && !adding && (
              <tr>
                <td colSpan="5" style={styles.overviewEmpty}>
                  ยังไม่มีรายการ
                </td>
              </tr>
            )}

            {items.map((item) =>
  editingId === item.id ? (
    <tr key={item.id}>
      <td style={styles.overviewTd}>
        <input
          style={styles.tableInput}
          value={editForm.requirementType}
          onChange={(e) => setEditField("requirementType", e.target.value)}
          placeholder="เช่น TCAS1"
        />
      </td>

      <td style={styles.overviewTd}>
        <input
          style={styles.tableInput}
          value={editForm.requirementText}
          onChange={(e) => setEditField("requirementText", e.target.value)}
          placeholder="เช่น การแข่งขันวิชาการระดับประเทศ"
        />
      </td>

      <td style={styles.overviewTdCenter}>
        <input
          type="checkbox"
          checked={editForm.hasIt}
          onChange={(e) => setEditField("hasIt", e.target.checked)}
        />
      </td>

      <td style={styles.overviewTd}>
        <input
          style={styles.tableInput}
          value={editForm.note}
          onChange={(e) => setEditField("note", e.target.value)}
          placeholder="หมายเหตุ"
        />
      </td>

      <td style={styles.overviewTdCenter}>
        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          <button
            style={styles.primaryBtn}
            onClick={() => handleSaveEdit(item.id)}
            disabled={savingId === item.id}
          >
            {savingId === item.id ? "..." : "บันทึก"}
          </button>

          <button
            style={styles.outlineBtn}
            onClick={cancelEdit}
            disabled={savingId === item.id}
          >
            ยกเลิก
          </button>
        </div>
      </td>
    </tr>
  ) : (
    <OverviewRow
      key={item.id}
      item={item}
      saving={savingId === item.id}
      onToggle={handleToggle}
      onDelete={handleDelete}
      onNoteBlur={handleNoteBlur}
      onEdit={startEdit}
    />
  )
)}

            {adding && (
              <tr>
                <td style={styles.overviewTd}>
                  <input
                    style={styles.tableInput}
                    value={newItem.requirementType}
                    onChange={(e) => setNewField("requirementType", e.target.value)}
                    placeholder="เช่น TCAS1"
                  />
                </td>
                <td style={styles.overviewTd}>
                  <input
                    style={styles.tableInput}
                    value={newItem.requirementText}
                    onChange={(e) => setNewField("requirementText", e.target.value)}
                    placeholder="เช่น การแข่งขันวิชาการระดับประเทศ"
                  />
                </td>
                <td style={styles.overviewTdCenter}>
                  <input
                    type="checkbox"
                    checked={newItem.hasIt}
                    onChange={(e) => setNewField("hasIt", e.target.checked)}
                  />
                </td>
                <td style={styles.overviewTd}>
                  <input
                    style={styles.tableInput}
                    value={newItem.note}
                    onChange={(e) => setNewField("note", e.target.value)}
                    placeholder="เช่น สอวน., TMC"
                  />
                </td>
                <td style={styles.overviewTdCenter}>
                  <button
                    style={styles.primaryBtn}
                    onClick={handleAdd}
                    disabled={savingId === "new"}
                  >
                    {savingId === "new" ? "..." : "บันทึก"}
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {error && <div style={styles.error}>{error}</div>}
    </div>
  );
}

function OverviewRow({ item, saving, onToggle, onDelete, onNoteBlur, onEdit }) {
  const [note, setNote] = useState(item.note || "");

  useEffect(() => {
    setNote(item.note || "");
  }, [item.note]);

  return (
    <tr>
      <td style={styles.overviewTd}>{item.requirementType || "-"}</td>
      <td style={styles.overviewTd}>{item.requirementText}</td>

      <td style={styles.overviewTdCenter}>
        <button
          style={styles.checkBtn}
          onClick={() => onToggle(item)}
          disabled={saving}
          title="สลับสถานะ"
        >
          {item.hasIt ? "✔" : "○"}
        </button>
      </td>

      <td style={styles.overviewTd}>
        <input
          style={styles.tableInput}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={() => onNoteBlur(item, note)}
          placeholder="หมายเหตุ"
        />
      </td>

      <td style={styles.overviewTdCenter}>
        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          <button
            style={styles.outlineBtn}
            onClick={() => onEdit(item)}
            disabled={saving}
          >
            แก้ไข
          </button>

          <button
            style={styles.deleteBtn}
            onClick={() => onDelete(item.id)}
            disabled={saving}
          >
            ลบ
          </button>
        </div>
      </td>
    </tr>
  );
}

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

function GradesTab({ student, onReload }) {
  if (!student) return <div>ยังไม่ได้เลือกนักเรียน</div>;

  const gradeRecords = student.gradeRecords || [];
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const [savingId, setSavingId] = useState("");
  const [error, setError] = useState("");

  const [newItem, setNewItem] = useState({
    academicYear: "",
    term: "",
    subject: "",
    grade: "",
    note: "",
  });

  const [editForm, setEditForm] = useState({
    academicYear: "",
    term: "",
    subject: "",
    grade: "",
    note: "",
  });

  function setNewField(key, value) {
    setNewItem((prev) => ({ ...prev, [key]: value }));
  }

  function setEditField(key, value) {
    setEditForm((prev) => ({ ...prev, [key]: value }));
  }

  function openEdit(item) {
    setError("");
    setEditing(item);
    setEditForm({
      academicYear: item.academicYear || "",
      term: item.term || "",
      subject: item.subject || "",
      grade: item.grade || "",
      note: item.note || "",
    });
  }

  function closeEdit() {
    if (savingId === "edit") return;
    setEditing(null);
  }

  async function handleAdd() {
    setError("");

    if (
      !newItem.academicYear.trim() ||
      !newItem.term.trim() ||
      !newItem.subject.trim() ||
      !newItem.grade.trim()
    ) {
      setError("กรอกปีการศึกษา เทอม วิชา และเกรดให้ครบ");
      return;
    }

    try {
      setSavingId("new");
      await createGrade(student.id, {
        academicYear: newItem.academicYear.trim(),
        term: newItem.term.trim(),
        subject: newItem.subject.trim(),
        grade: newItem.grade.trim(),
        note: newItem.note.trim(),
        sortOrder: gradeRecords.length + 1,
      });

      setNewItem({
        academicYear: "",
        term: "",
        subject: "",
        grade: "",
        note: "",
      });
      setAdding(false);
      await onReload();
    } catch (err) {
      setError(err.message || "Create failed");
    } finally {
      setSavingId("");
    }
  }

  async function handleSaveEdit(e) {
    e.preventDefault();
    if (!editing) return;

    setError("");

    if (
      !editForm.academicYear.trim() ||
      !editForm.term.trim() ||
      !editForm.subject.trim() ||
      !editForm.grade.trim()
    ) {
      setError("กรอกปีการศึกษา เทอม วิชา และเกรดให้ครบ");
      return;
    }

    try {
      setSavingId("edit");
      await updateGrade(editing.id, {
        academicYear: editForm.academicYear.trim(),
        term: editForm.term.trim(),
        subject: editForm.subject.trim(),
        grade: editForm.grade.trim(),
        note: editForm.note.trim(),
      });

      setEditing(null);
      await onReload();
    } catch (err) {
      setError(err.message || "Update failed");
    } finally {
      setSavingId("");
    }
  }

  async function handleDelete(gradeId) {
    const ok = window.confirm("ลบผลการเรียนรายการนี้ใช่ไหม?");
    if (!ok) return;

    try {
      setSavingId(gradeId);
      await deleteGrade(gradeId);
      await onReload();
    } catch (err) {
      setError(err.message || "Delete failed");
    } finally {
      setSavingId("");
    }
  }

  const gpa = calcGpa(gradeRecords);

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 10,
          gap: 12,
        }}
      >
        <div>
          <h3 style={{ margin: 0 }}>ผลการเรียน</h3>
          <div style={{ marginTop: 6, color: "#666" }}>
            GPA รวม: <b>{gpa}</b>
          </div>
        </div>

        <button
          style={styles.outlineBtn}
          onClick={() => setAdding((prev) => !prev)}
        >
          {adding ? "ยกเลิก" : "+ เพิ่มผลการเรียน"}
        </button>
      </div>

      <div style={styles.overviewTableWrap}>
        <table style={styles.overviewTable}>
          <thead>
            <tr>
              <th style={styles.overviewTh}>ปีการศึกษา</th>
              <th style={styles.overviewTh}>เทอม</th>
              <th style={styles.overviewTh}>วิชา</th>
              <th style={styles.overviewTh}>เกรด</th>
              <th style={styles.overviewTh}>หมายเหตุ</th>
              <th style={styles.overviewTh}>แก้ไข</th>
              <th style={styles.overviewTh}>ลบ</th>
            </tr>
          </thead>

          <tbody>
            {gradeRecords.length === 0 && !adding && (
              <tr>
                <td colSpan="7" style={styles.overviewEmpty}>
                  ยังไม่มีข้อมูลผลการเรียน
                </td>
              </tr>
            )}

            {gradeRecords.map((item) => (
              <tr key={item.id}>
                <td style={styles.overviewTd}>{item.academicYear}</td>
                <td style={styles.overviewTd}>{item.term}</td>
                <td style={styles.overviewTd}>{item.subject}</td>
                <td style={styles.overviewTd}>{item.grade}</td>
                <td style={styles.overviewTd}>{item.note || "-"}</td>
                <td style={styles.overviewTdCenter}>
                  <button
                    style={styles.outlineBtn}
                    onClick={() => openEdit(item)}
                  >
                    แก้ไข
                  </button>
                </td>
                <td style={styles.overviewTdCenter}>
                  <button
                    style={styles.deleteBtn}
                    onClick={() => handleDelete(item.id)}
                    disabled={savingId === item.id}
                  >
                    ลบ
                  </button>
                </td>
              </tr>
            ))}

            {adding && (
              <tr>
                <td style={styles.overviewTd}>
                  <input
                    style={styles.tableInput}
                    value={newItem.academicYear}
                    onChange={(e) => setNewField("academicYear", e.target.value)}
                    placeholder="เช่น 2567"
                  />
                </td>
                <td style={styles.overviewTd}>
                  <input
                    style={styles.tableInput}
                    value={newItem.term}
                    onChange={(e) => setNewField("term", e.target.value)}
                    placeholder="เช่น 1"
                  />
                </td>
                <td style={styles.overviewTd}>
                  <input
                    style={styles.tableInput}
                    value={newItem.subject}
                    onChange={(e) => setNewField("subject", e.target.value)}
                    placeholder="เช่น คณิตศาสตร์"
                  />
                </td>
                <td style={styles.overviewTd}>
                  <input
                    style={styles.tableInput}
                    value={newItem.grade}
                    onChange={(e) => setNewField("grade", e.target.value)}
                    placeholder="เช่น A หรือ 4.0"
                  />
                </td>
                <td style={styles.overviewTd}>
                  <input
                    style={styles.tableInput}
                    value={newItem.note}
                    onChange={(e) => setNewField("note", e.target.value)}
                    placeholder="หมายเหตุ"
                  />
                </td>
                <td style={styles.overviewTdCenter} colSpan={2}>
                  <button
                    style={styles.primaryBtn}
                    onClick={handleAdd}
                    disabled={savingId === "new"}
                  >
                    {savingId === "new" ? "..." : "บันทึก"}
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      {editing && (
        <div style={styles.modalOverlay} onMouseDown={closeEdit}>
          <div style={styles.modal} onMouseDown={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={{ fontWeight: 900, fontSize: 16 }}>แก้ไขผลการเรียน</div>
              <button
                style={styles.modalClose}
                onClick={closeEdit}
                disabled={savingId === "edit"}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit}>
              <label style={styles.label}>ปีการศึกษา</label>
              <input
                style={styles.input}
                value={editForm.academicYear}
                onChange={(e) => setEditField("academicYear", e.target.value)}
              />

              <label style={styles.label}>เทอม</label>
              <input
                style={styles.input}
                value={editForm.term}
                onChange={(e) => setEditField("term", e.target.value)}
              />

              <label style={styles.label}>วิชา</label>
              <input
                style={styles.input}
                value={editForm.subject}
                onChange={(e) => setEditField("subject", e.target.value)}
              />

              <label style={styles.label}>เกรด</label>
              <input
                style={styles.input}
                value={editForm.grade}
                onChange={(e) => setEditField("grade", e.target.value)}
              />

              <label style={styles.label}>หมายเหตุ</label>
              <input
                style={styles.input}
                value={editForm.note}
                onChange={(e) => setEditField("note", e.target.value)}
              />

              <div style={styles.modalActions}>
                <button
                  type="button"
                  style={styles.outlineBtn}
                  onClick={closeEdit}
                  disabled={savingId === "edit"}
                >
                  ยกเลิก
                </button>
                <button type="submit" style={styles.primaryBtn} disabled={savingId === "edit"}>
                  {savingId === "edit" ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function OtherTab({ student, onReload }) {
  const [note, setNote] = useState(student?.extraNote || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setNote(student?.extraNote || "");
  }, [student?.extraNote]);

  if (!student) return <div>ยังไม่ได้เลือกนักเรียน</div>;

  async function handleSave() {
    setError("");
    setSaving(true);

    try {
      await updateStudentExtraNote(student.id, note);
      await onReload();
    } catch (err) {
      setError(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div style={{ fontWeight: 900, fontSize: 18 }}>อื่นๆ / หมายเหตุเพิ่มเติม</div>
      <div style={{ marginTop: 6, color: "#666" }}>
        ใช้จดบันทึกเพิ่มเติมเกี่ยวกับนักเรียนได้ตามต้องการ
      </div>

      <textarea
        style={{
          ...styles.input,
          marginTop: 14,
          minHeight: 220,
          resize: "vertical",
        }}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="พิมพ์โน้ตเพิ่มเติม เช่น ข้อสังเกต คำแนะนำ แผนติดตาม ฯลฯ"
      />

      {error && <div style={styles.error}>{error}</div>}

      <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end" }}>
        <button style={styles.primaryBtn} onClick={handleSave} disabled={saving}>
          {saving ? "กำลังบันทึก..." : "บันทึกหมายเหตุ"}
        </button>
      </div>
    </div>
  );
}



const styles = {
 page: {
  display: "grid",
  minHeight: "100vh",
},

main: {
  padding: 18,
  overflow: "auto",
  background: "#fafafa",
},
  sideTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    alignItems: "center",
  },
  logout: {
    border: "1px solid #ddd",
    background: "white",
    borderRadius: 10,
    padding: "6px 10px",
    cursor: "pointer",
  },

  search: {
    width: "100%",
    marginTop: 12,
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #ddd",
  },
  searchBtn: {
    marginTop: 8,
    width: "100%",
    padding: "10px 12px",
    borderRadius: 10,
    border: "none",
    cursor: "pointer",
    fontWeight: 800,
    background: "#111",
    color: "white",
  },

  item: {
    width: "100%",
    textAlign: "left",
    padding: 12,
    border: "1px solid #eee",
    borderRadius: 12,
    marginBottom: 10,
    cursor: "pointer",
    background: "white",
  },
  itemActive: {
    border: "1px solid #111",
    boxShadow: "0 6px 20px rgba(0,0,0,0.08)",
  },

  main: {
  padding: 18,
  overflow: "auto",
  background: "#fafafa",
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
    padding: "10px 12px",
    cursor: "pointer",
    fontWeight: 800,
    background: "white",
  },

  tabs: { marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" },
  tab: {
    border: "1px solid #ddd",
    background: "white",
    borderRadius: 999,
    padding: "8px 12px",
    cursor: "pointer",
    fontWeight: 800,
  },
  tabActive: { border: "1px solid #111" },

  card: {
    marginTop: 12,
    background: "white",
    border: "1px solid #eee",
    borderRadius: 16,
    padding: 16,
    boxShadow: "0 10px 30px rgba(0,0,0,0.04)",
  },

  profileTop: { display: "flex", gap: 14, alignItems: "center" },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 16,
    border: "1px solid #eee",
    display: "grid",
    placeItems: "center",
    background: "#f7f7f7",
  },

  grid: {
    marginTop: 14,
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 10,
  },
  field: {
    border: "1px solid #eee",
    borderRadius: 14,
    padding: 12,
    background: "#fff",
  },

  choiceRow: {
    border: "1px solid #eee",
    borderRadius: 14,
    padding: 12,
    display: "grid",
    gridTemplateColumns: "100px 1fr",
    gap: 10,
    alignItems: "center",
    background: "#fff",
  },

  error: {
    marginTop: 12,
    padding: 10,
    borderRadius: 10,
    background: "#ffe5e5",
    color: "#b00020",
    fontWeight: 700,
  },

  modalOverlay: {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.35)",
  display: "grid",
  placeItems: "center",
  padding: 16,
  overflowY: "auto",
  },
  modal: {
  width: "100%",
  maxWidth: 720,
  background: "white",
  borderRadius: 16,
  padding: 16,
  boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
  maxHeight: "90vh",
  overflowY: "auto",
  },
  mainHeader: {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  marginBottom: 12,
},
  modalClose: {
    border: "1px solid #ddd",
    background: "white",
    borderRadius: 10,
    padding: "6px 10px",
    cursor: "pointer",
  },

  label: { display: "block", marginTop: 12, marginBottom: 6, fontWeight: 800 },
  input: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #ddd",
    outline: "none",
  },

  modalActions: { marginTop: 14, display: "flex", justifyContent: "flex-end", gap: 10 },

    overviewTableWrap: {
    overflowX: "auto",
    border: "1px solid #eee",
    borderRadius: 14,
    background: "#fff",
  },
  overviewTable: {
    width: "100%",
    borderCollapse: "collapse",
  },
  overviewTh: {
    textAlign: "left",
    padding: "12px 14px",
    borderBottom: "1px solid #eee",
    fontWeight: 900,
    background: "#fafafa",
  },
  overviewTd: {
    padding: "12px 14px",
    borderBottom: "1px solid #eee",
    verticalAlign: "middle",
  },
  overviewTdCenter: {
    padding: "12px 14px",
    borderBottom: "1px solid #eee",
    verticalAlign: "middle",
    textAlign: "center",
  },
  overviewEmpty: {
    padding: 16,
    textAlign: "center",
    color: "#666",
  },
  tableInput: {
    width: "100%",
    padding: "8px 10px",
    borderRadius: 8,
    border: "1px solid #ddd",
    outline: "none",
  },
  checkBtn: {
    border: "1px solid #ddd",
    borderRadius: 10,
    padding: "6px 10px",
    background: "#fff",
    cursor: "pointer",
    minWidth: 44,
    fontWeight: 900,
  },
  deleteBtn: {
    border: "1px solid #ffd6d6",
    borderRadius: 10,
    padding: "6px 10px",
    background: "#fff5f5",
    color: "#b00020",
    cursor: "pointer",
    fontWeight: 800,
  },

  avatarImg: {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  borderRadius: 16,
},
uploadBtn: {
  display: "inline-block",
  border: "1px solid #ddd",
  borderRadius: 12,
  padding: "10px 12px",
  cursor: "pointer",
  fontWeight: 800,
  background: "white",
},
deleteBtn: {
  border: "1px solid #e5b6b6",
  background: "#fff5f5",
  color: "#b42318",
  borderRadius: 12,
  padding: "10px 14px",
  fontWeight: 700,
  cursor: "pointer",
},

eyeBtn: {
  position: "absolute",
  right: 10,
  top: "50%",
  transform: "translateY(-50%)",
  border: "none",
  background: "transparent",
  cursor: "pointer",
  fontSize: 16,
  padding: 0,
},
};