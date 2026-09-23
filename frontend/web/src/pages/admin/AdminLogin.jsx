import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { adminLogin } from "../../services/adminService";

function AdminLogin() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const data = await adminLogin(email, password);

      if (!data?.token) {
        throw new Error("Đăng nhập không trả về token.");
      }

      if (data.user?.role !== "admin") {
        throw new Error("Tài khoản này không có quyền quản trị.");
      }

      localStorage.setItem("admin_token", data.token);
      localStorage.setItem(
        "admin_user",
        JSON.stringify(data.user)
      );

      navigate("/admin");
    } catch (error) {
      setError(error.message || "Đăng nhập thất bại.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}>
          TG
        </div>

        <h1 style={styles.title}>
          Admin Login
        </h1>

        <p style={styles.subtitle}>
          Multilingual Tour Guide
        </p>

        <form onSubmit={handleSubmit}>
          <div style={styles.field}>
            <label style={styles.label}>
              Email
            </label>

            <input
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              placeholder="admin@example.com"
              required
              style={styles.input}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>
              Mật khẩu
            </label>

            <input
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              placeholder="Nhập mật khẩu"
              required
              style={styles.input}
            />
          </div>

          {error && (
            <div style={styles.error}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.button,
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading
              ? "Đang đăng nhập..."
              : "Đăng nhập Admin"}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "#f3f4f6",
    padding: 20,
  },

  card: {
    width: "100%",
    maxWidth: 420,
    background: "#ffffff",
    borderRadius: 16,
    padding: 36,
    boxShadow: "0 12px 40px rgba(0, 0, 0, 0.08)",
  },

  logo: {
    width: 52,
    height: 52,
    borderRadius: 12,
    background: "#111827",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: 18,
    marginBottom: 20,
  },

  title: {
    margin: 0,
    fontSize: 28,
    color: "#111827",
  },

  subtitle: {
    marginTop: 8,
    marginBottom: 30,
    color: "#6b7280",
  },

  field: {
    marginBottom: 18,
  },

  label: {
    display: "block",
    marginBottom: 8,
    fontWeight: 600,
    color: "#374151",
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "12px 14px",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    fontSize: 15,
    outline: "none",
  },

  error: {
    marginBottom: 16,
    padding: 12,
    borderRadius: 8,
    background: "#fee2e2",
    color: "#b91c1c",
    fontSize: 14,
  },

  button: {
    width: "100%",
    padding: "13px 16px",
    border: "none",
    borderRadius: 8,
    background: "#111827",
    color: "#ffffff",
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
  },
};

export default AdminLogin;