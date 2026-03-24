export default function Sidebar({
  students,
  selectedId,
  onSelect,
  search,
  setSearch,
}) {
  const filtered = students.filter((s) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      s.fullName.toLowerCase().includes(q) ||
      s.nickname.toLowerCase().includes(q) ||
      s.grade.toLowerCase().includes(q)
    );
  });

  return (
    <aside style={styles.sidebar}>
      <div style={styles.sidebarHeader}>
        <h2 style={styles.title}>นักเรียน</h2>
        <div style={styles.subtitle}>ทั้งหมด {students.length} คน</div>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ค้นหา ชื่อ/ชื่อเล่น/ห้อง..."
          style={styles.search}
        />
      </div>

      <div style={styles.list}>
        {filtered.map((s) => {
          const active = s.id === selectedId;
          return (
            <button
              key={s.id}
              onClick={() => onSelect(s.id)}
              style={{
                ...styles.item,
                ...(active ? styles.itemActive : null),
              }}
            >
              <img src={s.photoUrl} alt={s.fullName} style={styles.avatar} />
              <div style={styles.itemText}>
                <div style={styles.itemName}>
                  {s.fullName} <span style={styles.nick}>({s.nickname})</span>
                </div>
                <div style={styles.itemMeta}>{s.grade}</div>
              </div>
            </button>
          );
        })}

        {filtered.length === 0 && (
          <div style={styles.empty}>ไม่พบนักเรียนที่ค้นหา</div>
        )}
      </div>
    </aside>
  );
}

const styles = {
  sidebar: {
    width: 320,
    background: "#fff",
    borderRight: "1px solid #e9e9ef",
    height: "100vh",
    display: "flex",
    flexDirection: "column",
  },
  sidebarHeader: { padding: 16, borderBottom: "1px solid #eee" },
  title: { margin: 0, fontSize: 20 },
  subtitle: { marginTop: 4, fontSize: 12, color: "#666" },
  search: {
    marginTop: 12,
    width: "100%",
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #ddd",
    outline: "none",
  },
  list: { padding: 10, overflow: "auto" },
  item: {
    width: "100%",
    display: "flex",
    gap: 12,
    alignItems: "center",
    padding: 10,
    borderRadius: 12,
    border: "1px solid transparent",
    background: "transparent",
    cursor: "pointer",
    textAlign: "left",
  },
  itemActive: {
    background: "#f3f4ff",
    border: "1px solid #d9dbff",
  },
  avatar: { width: 44, height: 44, borderRadius: 12, objectFit: "cover" },
  itemText: { display: "flex", flexDirection: "column" },
  itemName: { fontWeight: 700, fontSize: 14 },
  nick: { fontWeight: 500, color: "#555" },
  itemMeta: { marginTop: 2, fontSize: 12, color: "#666" },
  empty: { padding: 12, color: "#666", fontSize: 13 },
};