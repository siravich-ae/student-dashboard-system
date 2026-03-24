import Tabs from "./Tab";

export default function StudentDetail({ student, activeTab, setActiveTab }) {
  const tabs = [
    { key: "profile", label: "โปรไฟล์" },
    { key: "grades", label: "ผลการเรียน" },
    { key: "activities", label: "กิจกรรม" },
    { key: "admission", label: "แผนเข้ามหา'ลัย" },
    { key: "notes", label: "โน้ตครู" },
  ];

  if (!student) {
    return (
      <section style={styles.main}>
        <div style={styles.card}>
          <h2 style={{ margin: 0 }}>ยังไม่ได้เลือกนักเรียน</h2>
          <p style={{ marginTop: 8, color: "#666" }}>
            คลิกชื่อนักเรียนทางซ้ายเพื่อดูข้อมูลตรงกลาง
          </p>
        </div>
      </section>
    );
  }

  return (
    <section style={styles.main}>
      <div style={styles.headerCard}>
        <div style={styles.headerLeft}>
          <img src={student.photoUrl} alt={student.fullName} style={styles.photo} />
          <div>
            <div style={styles.name}>{student.fullName}</div>
            <div style={styles.meta}>
              ชื่อเล่น: <b>{student.nickname}</b> • {student.grade}
            </div>
          </div>
        </div>

        <div style={styles.headerActions}>
          <button style={styles.ghostBtn}>แก้ไข</button>
          <button style={styles.dangerBtn}>ลบ</button>
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        <Tabs tabs={tabs} activeKey={activeTab} onChange={setActiveTab} />
      </div>

      <div style={{ marginTop: 14 }}>
        {activeTab === "profile" ? (
          <ProfileTab student={student} />
        ) : (
          <EmptyTab label={tabs.find((t) => t.key === activeTab)?.label} />
        )}
      </div>
    </section>
  );
}

function ProfileTab({ student }) {
  return (
    <div style={styles.card}>
      <h3 style={styles.sectionTitle}>ข้อมูลพื้นฐาน</h3>

      <div style={styles.grid}>
        <div style={styles.infoBox}>
          <div style={styles.label}>ชื่อ-นามสกุล</div>
          <div style={styles.value}>{student.fullName}</div>
        </div>

        <div style={styles.infoBox}>
          <div style={styles.label}>ชื่อเล่น</div>
          <div style={styles.value}>{student.nickname}</div>
        </div>

        <div style={styles.infoBox}>
          <div style={styles.label}>ชั้น/ห้อง</div>
          <div style={styles.value}>{student.grade}</div>
        </div>
      </div>

      <div style={{ marginTop: 18 }}>
        <h3 style={styles.sectionTitle}>มหาลัยที่อยากเข้า (Top 3)</h3>

        <div style={styles.rankList}>
          {student.topUniversities.map((u) => (
            <div key={u.rank} style={styles.rankItem}>
              <div style={styles.rankBadge}>{u.rank}</div>
              <div style={{ fontWeight: 700 }}>{u.name}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function EmptyTab({ label }) {
  return (
    <div style={styles.card}>
      <h3 style={{ margin: 0 }}>{label}</h3>
      <p style={{ marginTop: 8, color: "#666" }}>
        (เว้นไว้ก่อน เดี๋ยวค่อยทำแท็บนี้ต่อ)
      </p>
    </div>
  );
}

const styles = {
  main: {
    height: "100vh",
    overflow: "auto",
    padding: 18,
  },
  headerCard: {
    background: "#fff",
    border: "1px solid #eee",
    borderRadius: 16,
    padding: 14,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  headerLeft: { display: "flex", alignItems: "center", gap: 12 },
  photo: { width: 56, height: 56, borderRadius: 16, objectFit: "cover" },
  name: { fontSize: 18, fontWeight: 900 },
  meta: { marginTop: 4, fontSize: 13, color: "#666" },
  headerActions: { display: "flex", gap: 8 },
  ghostBtn: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #ddd",
    background: "#fff",
    cursor: "pointer",
    fontWeight: 800,
  },
  dangerBtn: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #ffd1d1",
    background: "#fff5f5",
    cursor: "pointer",
    fontWeight: 900,
  },
  card: {
    background: "#fff",
    border: "1px solid #eee",
    borderRadius: 16,
    padding: 16,
  },
  sectionTitle: { margin: 0, fontSize: 14, fontWeight: 900 },
  grid: {
    marginTop: 12,
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 10,
  },
  infoBox: {
    border: "1px solid #f0f0f5",
    background: "#fafafe",
    borderRadius: 14,
    padding: 12,
  },
  label: { fontSize: 12, color: "#666", fontWeight: 700 },
  value: { marginTop: 6, fontWeight: 900 },
  rankList: { marginTop: 12, display: "flex", flexDirection: "column", gap: 10 },
  rankItem: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    border: "1px solid #f0f0f5",
    borderRadius: 14,
    padding: 12,
    background: "#fff",
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 10,
    display: "grid",
    placeItems: "center",
    fontWeight: 900,
    background: "#111",
    color: "#fff",
  },
};