import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Bot, Compass, Globe2, Home, LogOut, Map, Menu, PlusCircle, UserRound, X } from "lucide-react";
import { clearUserSession, getStoredUser } from "../../services/userService";
import { LANGUAGES, useLanguage } from "../../i18n";
import WebGeofenceEngine from "./WebGeofenceEngine";

export default function UserLayout({ children }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const user = getStoredUser();
  const { language, setLanguage, t } = useLanguage();
  const links = [
    { to: "/", label: t.home, icon: Home, end: true },
    { to: "/explore", label: t.explore, icon: Compass },
    { to: "/map", label: t.map, icon: Map },
    { to: "/chat", label: t.chat, icon: Bot },
  ];
  const navClass = ({ isActive }) => `flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${isActive ? "bg-[#2196F3] text-white shadow-sm" : "text-slate-600 hover:bg-[#eaf7ff] hover:text-[#2196F3]"}`;
  function logout() { clearUserSession(); navigate("/login", { replace: true }); }
  return (
    <>
      
      <div className="min-h-screen bg-[#f5f7fa] text-[#222] pb-20 md:pb-0">
      <header className="sticky top-0 z-50 border-b border-[#e7ecef] bg-white">
        <div className="mx-auto flex h-[70px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <NavLink to="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#2196F3] text-2xl text-white"><Globe2 size={24} /></div>
            <div><p className="text-sm font-extrabold leading-none">Multilingual</p><p className="mt-1 text-xs font-medium text-slate-500">Tour Guide</p></div>
          </NavLink>
          <nav className="hidden items-center gap-1 md:flex">{links.map((link) => <NavLink key={link.to} to={link.to} end={link.end} className={navClass}><link.icon size={17} />{link.label}</NavLink>)}</nav>
          <div className="hidden items-center gap-2 md:flex">
            <NavLink to="/add-poi" className="inline-flex items-center gap-2 rounded-xl bg-[#2196F3] hover:bg-[#1976D2] px-3 py-2 text-sm font-extrabold text-white "><PlusCircle size={17} />{t.addPoi}</NavLink>
            <div className="flex items-center rounded-xl border border-[#dfe7ea] bg-white p-1"><Globe2 size={16} className="mx-2 text-[#2196F3]" /><select value={language} onChange={(e) => setLanguage(e.target.value)} className="bg-transparent px-1 py-1.5 text-xs font-extrabold outline-none">{LANGUAGES.map((x) => <option key={x.code} value={x.code}>{x.label}</option>)}</select></div>
            <NavLink to="/profile" title={user?.name || t.user} className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-[#eaf7ff]">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#eaf7ff] text-[#2196F3]"><UserRound size={18} /></div>
              <span className="max-w-[140px] truncate text-sm font-extrabold text-slate-700">{user?.name || user?.email || t.user}</span>
            </NavLink>
            <button onClick={logout} className="rounded-xl p-2 text-slate-500 hover:bg-[#fff1f1] hover:text-[#d33]" title={t.logout}><LogOut size={18} /></button>
          </div>
          <button className="rounded-xl p-2 text-slate-700 md:hidden" onClick={() => setOpen((v) => !v)} aria-label="menu">{open ? <X size={23} /> : <Menu size={23} />}</button>
        </div>
        {open && <div className="border-t border-[#e7ecef] bg-white px-4 py-3 md:hidden"><div className="mb-3 flex items-center justify-between rounded-xl bg-[#f5f7fa] p-2"><span className="flex items-center gap-2 px-2 text-sm font-bold"><Globe2 size={17} className="text-[#2196F3]" />Language</span><select value={language} onChange={(e) => setLanguage(e.target.value)} className="rounded-lg bg-white px-2 py-1.5 text-sm font-bold outline-none">{LANGUAGES.map((x) => <option key={x.code} value={x.code}>{x.label}</option>)}</select></div><nav className="space-y-1">{links.map((link) => <NavLink key={link.to} to={link.to} end={link.end} onClick={() => setOpen(false)} className={navClass}><link.icon size={18} />{link.label}</NavLink>)}<NavLink to="/add-poi" onClick={() => setOpen(false)} className={navClass}><PlusCircle size={18} />{t.addPoi}</NavLink><button onClick={logout} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-bold text-[#d33] hover:bg-[#fff1f1]"><LogOut size={18} />{t.logout}</button></nav></div>}
      </header>
      <main>{children}</main>
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#eeeeee] bg-white md:hidden"><div className="mx-auto flex h-[78px] max-w-md items-center justify-around px-2">{links.slice(0, 4).map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end} className={({ isActive }) => `flex w-16 flex-col items-center gap-1 rounded-xl py-2 text-[11px] font-bold ${isActive ? "text-[#2196F3]" : "text-[#777]"}`}><Icon size={21} />{label}</NavLink>)}</div></nav>
      </div>
    </>
  );
}
