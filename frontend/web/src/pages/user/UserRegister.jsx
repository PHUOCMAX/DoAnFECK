import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Globe2 } from "lucide-react";
import { registerUser } from "../../services/userService";

export default function UserRegister() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirm: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const change = (key, value) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  async function submit(event) {
    event.preventDefault();
    setError("");

    if (form.password !== form.confirm) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }

    setLoading(true);

    try {
      await registerUser(
        form.name.trim(),
        form.email.trim(),
        form.password
      );

      navigate("/login", { replace: true });
    } catch (e) {
      setError(e.message || "Đăng ký thất bại.");
    } finally {
      setLoading(false);
    }
  }

  const fields = [
    ["name", "Họ và tên", "Nguyễn Văn A", "text"],
    ["email", "Email", "you@example.com", "email"],
    ["password", "Mật khẩu", "Tối thiểu 8 ký tự", "password"],
    ["confirm", "Xác nhận mật khẩu", "Nhập lại mật khẩu", "password"],
  ];

  return (
    <main className="min-h-screen bg-[#f5f7fa] px-4 py-8 sm:py-12">
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-lg items-center justify-center">
        <section className="w-full rounded-[28px] bg-white p-7 shadow-sm ring-1 ring-[#e7ecef] sm:p-9">
          
          {/* Header */}
          <div className="mb-7 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#2196f3] text-3xl">
              <Globe2 size={29} className="text-white" />
            </div>

            <h1 className="text-2xl font-extrabold">
              Tạo tài khoản
            </h1>

            <p className="mt-2 text-sm text-[#777]">
              Bắt đầu hành trình khám phá.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 rounded-xl bg-[#fff1f1] px-4 py-3 text-sm font-semibold text-[#d33]">
              {error}
            </div>
          )}

          {/* Register form */}
          <form onSubmit={submit} className="space-y-4">
            {fields.map(([key, label, placeholder, type]) => (
              <label
                key={key}
                className="block text-sm font-extrabold"
              >
                {label}

                <input
                  className="mt-2 w-full rounded-xl border border-[#dfe7ea] bg-[#f5f7fa] px-4 py-3 outline-none focus:border-[#2196f3] focus:ring-2 focus:ring-[#2196f3]/20"
                  type={type}
                  value={form[key]}
                  onChange={(e) => change(key, e.target.value)}
                  placeholder={placeholder}
                  required
                />
              </label>
            ))}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#2196f3] py-3.5 font-extrabold text-white transition hover:bg-[#1976d2] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Đang tạo tài khoản..." : "Đăng ký"}
            </button>
          </form>

          {/* Login link */}
          <p className="mt-6 text-center text-sm text-[#777]">
            Đã có tài khoản?{" "}
            <Link
              to="/login"
              className="font-extrabold text-[#2196f3] hover:text-[#1976d2]"
            >
              Đăng nhập
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}