import React from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Droplet, Bell, User, Menu, X } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { NAV_BY_ROLE, ROLE_LABELS } from "../lib/constants";

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  if (!user) return null;
  const nav = NAV_BY_ROLE[user.role];

  return (
    <div className="flex h-screen w-full text-slate-800">
      <aside className="hidden md:flex md:w-60 flex-col shrink-0 text-white bg-[#0F2C4C]">
        <Brand />
        <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto">
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                `block px-3 py-2 rounded-md text-sm transition ${isActive ? "bg-white/15" : "hover:bg-white/10"}`
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-white/10 text-xs text-white/60">
          Signed in as {user.name} ({ROLE_LABELS[user.role]})
          <button onClick={() => { logout(); navigate("/login"); }} className="block mt-2 text-white/80 hover:text-white underline">
            Sign out
          </button>
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-64 text-white flex flex-col bg-[#0F2C4C]">
            <div className="flex justify-end p-2"><button onClick={() => setMobileOpen(false)} aria-label="Close menu"><X size={20} /></button></div>
            <Brand />
            <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto">
              {nav.map((n) => (
                <NavLink key={n.to} to={n.to} onClick={() => setMobileOpen(false)} className={({ isActive }) => `block px-3 py-2 rounded-md text-sm ${isActive ? "bg-white/15" : ""}`}>
                  {n.label}
                </NavLink>
              ))}
            </nav>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 bg-[#EEF2F6]">
        <header className="bg-white border-b border-slate-200 px-4 md:px-6 py-2.5 flex items-center gap-3">
          <button className="md:hidden text-slate-500" onClick={() => setMobileOpen(true)} aria-label="Open menu"><Menu size={20} /></button>
          <div className="flex-1" />
          <button className="text-slate-500 p-1.5" aria-label="Notifications"><Bell size={18} /></button>
          <div className="flex items-center gap-1.5 text-sm border border-slate-200 rounded-md pl-2 pr-3 py-1.5">
            <User size={15} className="text-slate-500" />
            <span className="font-medium text-slate-700">{user.name}</span>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function Brand() {
  return (
    <div className="px-4 py-4 border-b border-white/10">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-md flex items-center justify-center bg-[#0E7C86]"><Droplet size={16} /></div>
        <div className="font-bold text-base leading-tight">Suraksha AI</div>
      </div>
      <p className="text-[10.5px] text-white/60 mt-1.5 leading-snug">Track every borewell. Verify every closure. Protect every child.</p>
    </div>
  );
}
