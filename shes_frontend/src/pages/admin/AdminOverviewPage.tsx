/**
 * Admin Overview Dashboard
 */

import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { useAdminOverview } from "@/hooks/useAdmin";

const URGENCY_COLORS: Record<string, string> = {
  emergency:    "#ef4444",
  doctor_visit: "#f97316",
  self_care:    "#22c55e",
  undetermined: "#6b7280",
};

const ROLE_COLORS: Record<string, string> = {
  patient: "#14b8a6",
  doctor:  "#6366f1",
  admin:   "#f59e0b",
};

function KpiCard({
  label, value, sub, accent = false,
}: {
  label: string; value: string | number; sub?: string; accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl p-5 border ${
        accent
          ? "bg-teal-900/30 border-teal-700"
          : "bg-gray-900 border-gray-800"
      }`}
    >
      <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">{label}</p>
      <p className={`text-3xl font-bold ${accent ? "text-teal-300" : "text-white"}`}>
        {value ?? "—"}
      </p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

export default function AdminOverviewPage() {
  const { data, isLoading, error } = useAdminOverview();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-red-950/40 border border-red-800 rounded-xl p-6 text-red-400">
        Failed to load dashboard data. Check backend connectivity.
      </div>
    );
  }

  const { kpis, user_trend, urgency_dist, role_dist } = data;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Platform Overview</h2>
        <p className="text-sm text-gray-500">Live metrics across all SHES modules</p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Users"      value={kpis.total_users}    sub={`+${kpis.new_this_week} this week`} accent />
        <KpiCard label="Active (30d)"     value={kpis.active_users}   />
        <KpiCard label="Triage Sessions"  value={kpis.triage_total}   sub={`${kpis.triage_week} this week`} />
        <KpiCard label="Emergencies"      value={kpis.emergencies}    sub="all time" />
        <KpiCard label="Doctor Visits"    value={kpis.doctor_visits}  />
        <KpiCard label="Avg Mood (14d)"   value={kpis.avg_mood_14d ?? "N/A"} sub="out of 10" />
        <KpiCard label="New This Week"    value={kpis.new_this_week}  />
        <KpiCard label="Triage This Week" value={kpis.triage_week}    />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User registrations trend */}
        <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">New User Registrations (14 days)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={user_trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 11 }} />
              <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 8 }}
                labelStyle={{ color: "#9ca3af" }}
                itemStyle={{ color: "#14b8a6" }}
              />
              <Line
                type="monotone" dataKey="count" stroke="#14b8a6"
                strokeWidth={2} dot={{ fill: "#14b8a6", r: 3 }}
                name="New Users"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Urgency distribution pie */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Triage Urgency Distribution</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={urgency_dist}
                dataKey="count"
                nameKey="urgency_level"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={({ urgency_level, percent }) =>
                  `${urgency_level?.replace("_", " ")} ${(percent * 100).toFixed(0)}%`
                }
                labelLine={false}
              >
                {urgency_dist.map((entry) => (
                  <Cell
                    key={entry.urgency_level}
                    fill={URGENCY_COLORS[entry.urgency_level] ?? "#6b7280"}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 8 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Role distribution bar */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Users by Role</h3>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={role_dist} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis type="number" tick={{ fill: "#6b7280", fontSize: 11 }} allowDecimals={false} />
            <YAxis dataKey="role" type="category" tick={{ fill: "#9ca3af", fontSize: 12 }} width={60} />
            <Tooltip
              contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 8 }}
              labelStyle={{ color: "#9ca3af" }}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
              {role_dist.map((entry) => (
                <Cell key={entry.role} fill={ROLE_COLORS[entry.role] ?? "#6b7280"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}