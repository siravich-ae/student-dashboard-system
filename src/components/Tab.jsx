export default function Tabs({ tabs, activeKey, onChange }) {
  return (
    <div style={styles.wrap}>
      {tabs.map((t) => {
        const active = t.key === activeKey;
        return (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            style={{ ...styles.tab, ...(active ? styles.active : null) }}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

const styles = {
  wrap: {
    display: "flex",
    gap: 8,
    padding: 8,
    background: "#fff",
    border: "1px solid #eee",
    borderRadius: 14,
  },
  tab: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid transparent",
    background: "transparent",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 13,
    color: "#444",
  },
  active: {
    background: "#111",
    color: "#fff",
  },
};