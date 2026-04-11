/**
 * Admin Layout — Sidebar + Content Shell
 * ──────────────────────────────────────────────────────────────
 * This component provides the overall layout for the admin section,
 * including a collapsible sidebar with navigation links and a main
 * content area where different admin pages will be rendered via React Router's Outlet.
 */

import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext"; 
import { Heart } from "lucide-react";

const navItems = [
  { to: "/admin",            label: "Overview",     icon: "📊", end: true },
  { to: "/admin/users",      label: "Users",        icon: "👥" },
  { to: "/admin/triage",     label: "Triage",       icon: "🩺" },
  { to: "/admin/medications",label: "Medications",  icon: "💊" },
  { to: "/admin/stats",      label: "Analytics",    icon: "📈" },
  { to: "/admin/audit",      label: "Audit Log",    icon: "🔍" },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100 font-sans overflow-hidden">
      {/* ── Sidebar ────────────────────────────────────────────── */}
      <aside
        className={`flex flex-col flex-shrink-0 transition-all duration-300 ${
          sidebarOpen ? "w-60" : "w-16"
        } bg-gray-900 border-r border-gray-800`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-gray-800">
          <span className="text-2xl">
            <div className="w-8 h-8 rounded-xl bg-primary-800 flex items-center justify-center shadow-md">
              <Heart className="w-4 h-4 text-white" />
            </div>
          </span>
          {sidebarOpen && (
            <div className="leading-tight">
              <p className="text-sm font-bold text-white tracking-wide">SHES Admin</p>
              <p className="text-xs text-teal-400">Control Panel</p>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="ml-auto text-gray-500 hover:text-white transition-colors text-lg"
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? "◂" : "▸"}
          </button>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${
                  isActive
                    ? "bg-teal-600 text-white font-semibold shadow"
                    : "text-gray-400 hover:bg-gray-800 hover:text-white"
                }`
              }
            >
              <span className="text-base flex-shrink-0">{item.icon}</span>
              {sidebarOpen && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        <div className="px-3 py-4 border-t border-gray-800 space-y-2">
          {sidebarOpen && (
            <div className="px-3 py-2 rounded-lg bg-gray-800">
              <p className="text-xs font-semibold text-white truncate">
                {user?.first_name} {user?.last_name}
              </p>
              <p className="text-xs text-teal-400 truncate">{user?.email}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-red-900/40 hover:text-red-400 transition-all"
          >
            <span className="flex-shrink-0">🚪</span>
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* ── Main Content ───────────────────────────────────────── */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-gray-900 flex-shrink-0">
          <h1 className="text-lg font-semibold text-white tracking-tight">
            Smart Health Expert System — Admin
          </h1>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 bg-teal-900/50 text-teal-300 text-xs font-medium px-3 py-1 rounded-full border border-teal-700">
              <span className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-pulse" />
              Admin
            </span>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto bg-gray-950 p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}