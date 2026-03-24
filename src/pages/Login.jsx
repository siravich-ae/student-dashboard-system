import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login, setToken } from "../services/api";

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await login(username.trim(), password);
      setToken(res.token);

      // ตอนนี้เราทำฝั่งครูก่อน
      if (res.user?.role === "TEACHER") {
      navigate("/teacher", { replace: true });
      } else if (res.user?.role === "STUDENT") {
      navigate("/student", { replace: true });
      } else {
      navigate("/", { replace: true });
    }
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h2 style={{ margin: 0 }}>เข้าสู่ระบบ</h2>
        <form onSubmit={handleSubmit} style={{ marginTop: 16 }}>
          <label style={styles.label}>Username</label>
          <input
            style={styles.input}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="เช่น teacher หรือ รหัสนักเรียน"
          />

          <label style={styles.label}>Password</label>
          <input
            style={styles.input}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="รหัสผ่าน"
          />

          {error && <div style={styles.error}>{error}</div>}

          <button style={styles.button} disabled={loading}>
            {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    background: "#f5f5f5",
    padding: 16,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    background: "white",
    borderRadius: 16,
    padding: 20,
    boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
  },
  label: {
    display: "block",
    marginTop: 12,
    marginBottom: 6,
    fontWeight: 600,
  },
  input: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #ddd",
    outline: "none",
  },
  button: {
    marginTop: 16,
    width: "100%",
    padding: "10px 12px",
    borderRadius: 10,
    border: "none",
    cursor: "pointer",
    fontWeight: 700,
    background: "#111",
    color: "white",
  },
  error: {
    marginTop: 12,
    padding: 10,
    borderRadius: 10,
    background: "#ffe5e5",
    color: "#b00020",
    fontWeight: 600,
  },
};