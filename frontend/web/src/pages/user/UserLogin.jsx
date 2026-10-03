import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Globe2, LockKeyhole, Mail } from "lucide-react";
import { loginUser, saveUserSession } from "../../services/userService";

export default function UserLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault(); setError(""); setLoading(true);
    try {
      const data = await loginUser(email.trim(), password);
      saveUserSession(data.token, data.user);
      navigate(location.state?.from || "/", { replace: true });
    } catch (e) { setError(e.message || "Đăng nhập thất bại."); }
    finally { setLoading(false); }
  }

  return (
    <main className="min-h-screen bg-[#f5f7fa] px-4 py-8 sm:py-12">
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-md items-center justify-center">
        <section className="w-full rounded-[28px] bg-white p-7 shadow-sm ring-1 ring-[#e7ecef] sm:p-9">
          <div className="mb-7 text-center"><div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#66b9ee] text-3xl">🌏</div><h1 className="text-2xl font-extrabold">Đăng nhập</h1><p className="mt-2 text-sm text-[#777]">Đăng nhập để bắt đầu hành trình.</p></div>
          {error && <div className="mb-5 rounded-xl bg-[#fff1f1] px-4 py-3 text-sm font-semibold text-[#d33]">{error}</div>}
          <form onSubmit={submit} className="space-y-4">
            <label className="block text-sm font-extrabold">Email<div className="mt-2 flex items-center gap-2 rounded-xl border border-[#dfe7ea] px-3 focus-within:border-[#2196f3]"><Mail size={17} className="text-[#999]" /><input className="w-full py-3 outline-none" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required /></div></label>
            <label className="block text-sm font-extrabold">Mật khẩu<div className="mt-2 flex items-center gap-2 rounded-xl border border-[#dfe7ea] px-3 focus-within:border-[#2196f3]"><LockKeyhole size={17} className="text-[#999]" /><input className="w-full py-3 outline-none" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required /></div></label>
            <button disabled={loading} className="w-full rounded-xl bg-[#2196f3] py-3.5 font-extrabold text-white hover:bg-[#1a7dd8] disabled:opacity-60">{loading ? "Đang đăng nhập..." : "Đăng nhập"}</button>
          </form>
          <p className="mt-6 text-center text-sm text-[#777]">Chưa có tài khoản? <Link className="font-extrabold text-[#2196f3]" to="/register">Đăng ký</Link></p>
          <p className="mt-3 text-center text-xs text-[#aaa]"><Link to="/admin/login" className="hover:text-[#2196f3]">Admin Portal</Link></p>
        </section>
      </div>
    </main>
  );
}
