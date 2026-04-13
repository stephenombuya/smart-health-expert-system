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
import { Heart, Menu, LayoutDashboard, Users, Stethoscope, Pill, BarChart3, Shield, LogOut, ChevronLeft, ChevronRight } from "lucide-react";
import { Footer } from "@/components/common/Footer";
import { cn } from "@/utils";

const navItems = [
  { to: "/admin",            label: "Overview",     icon: LayoutDashboard, end: true },
  { to: "/admin/users",      label: "Users",        icon: Users },
  { to: "/admin/triage",     label: "Triage",       icon: Stethoscope },
  { to: "/admin/medications",label: "Medications",  icon: Pill },
  { to: "/admin/stats",      label: "Analytics",    icon: BarChart3 },
  { to: "/admin/audit",      label: "Audit Log",    icon: Shield },
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
    <div className="flex h-screen bg-gray-950 text-gray-100 overflow-hidden">
      {/* ── Sidebar ────────────────────────────────────────────── */}
      <aside
        className={cn(
          "flex flex-col flex-shrink-0 transition-all duration-300",
          "bg-gray-900 border-r border-gray-800",
          sidebarOpen ? "w-64" : "w-20"
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-gray-800">
          <div className="w-8 h-8 rounded-xl bg-primary-800 flex items-center justify-center shadow-md flex-shrink-0">
            <Heart className="w-4 h-4 text-white" />
          </div>
          {sidebarOpen && (
            <div className="leading-tight flex-1">
              <p className="text-sm font-bold text-white tracking-wide font-display">SHES Admin</p>
              <p className="text-xs text-primary-400 font-body">Control Panel</p>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="ml-auto p-1 rounded-lg text-gray-500 hover:text-white hover:bg-gray-800 transition-colors"
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 py-4 space-y-1 px-3 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 font-body",
                  isActive
                    ? "bg-primary-600 text-white font-semibold shadow"
                    : "text-gray-400 hover:bg-gray-800 hover:text-white"
                )
              }
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {sidebarOpen && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        <div className="px-3 py-4 border-t border-gray-800 space-y-2">
          {sidebarOpen && (
            <div className="px-3 py-2 rounded-lg bg-gray-800">
              <p className="text-xs font-semibold text-white truncate font-display">
                {user?.first_name} {user?.last_name}
              </p>
              <p className="text-xs text-primary-400 truncate font-body">{user?.email}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-red-900/40 hover:text-red-400 transition-all font-body"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* ── Main Content ───────────────────────────────────────── */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-gray-900 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen((v) => !v)}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors lg:hidden"
              aria-label="Toggle sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-semibold text-white tracking-tight font-display">
              Smart Health Expert System — Admin
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 bg-primary-900/50 text-primary-300 text-xs font-medium px-3 py-1 rounded-full border border-primary-700">
              <span className="w-1.5 h-1.5 bg-primary-400 rounded-full animate-pulse" />
              Admin
            </span>
          </div>
        </header>

        {/* Page content with footer */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            <Outlet />
          </div>
          {/* Footer */}
          <Footer />
        </div>
      </main>
    </div>
  );
}