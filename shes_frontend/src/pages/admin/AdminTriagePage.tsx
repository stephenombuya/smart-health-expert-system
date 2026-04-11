/**
 * Admin Triage Sessions Page
 * Place at: shes_frontend/src/pages/admin/AdminTriagePage.tsx
 */

import { useState } from "react";
import { useAdminTriage } from "@/hooks/useAdmin";
import type { AdminTriageSession } from "@/api/admin";

const URGENCY_STYLES: Record<string, string> = {
  emergency:    "bg-red-950/50 text-red-300 border-red-800",
  doctor_visit: "bg-orange-950/50 text-orange-300 border-orange-800",
  self_care:    "bg-green-950/50 text-green-300 border-green-800",
  undetermined: "bg-gray-800 text-gray-400 border-gray-700",
};

const URGENCY_ICONS: Record<string, string> = {
  emergency:    "🚨",
  doctor_visit: "🩺",
  self_care:    "🏡",
  undetermined: "❓",
};

function UrgencyBadge({ level }: { level: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium ${
        URGENCY_STYLES[level] ?? URGENCY_STYLES.undetermined
      }`}
    >
      {URGENCY_ICONS[level]} {level.replace("_", " ")}
    </span>
  );
}

function SessionRow({ s }: { s: AdminTriageSession }) {
  return (
    <tr className="hover:bg-gray-800/50 transition-colors">
      <td className="px-4 py-3">
        <p className="text-white font-medium text-sm">{s.patient_name}</p>
        <p className="text-gray-500 text-xs">{s.patient_email}</p>
      </td>
      <td className="px-4 py-3">
        <UrgencyBadge level={s.urgency_level} />
      </td>
      <td className="px-4 py-3 text-sm text-gray-400">
        {s.conditions_count} condition{s.conditions_count !== 1 ? "s" : ""}
        {s.red_flags_count > 0 && (
          <span className="ml-2 text-red-400 text-xs font-semibold">
            ⚑ {s.red_flags_count} flag{s.red_flags_count !== 1 ? "s" : ""}
          </span>
        )}
      </td>
      <td className="px-4 py-3">
        <span
          className={`text-xs px-2 py-0.5 rounded-full border ${
            s.completed
              ? "bg-green-950/40 text-green-400 border-green-800"
              : "bg-yellow-950/40 text-yellow-400 border-yellow-800"
          }`}
        >
          {s.completed ? "Complete" : "Pending"}
        </span>
      </td>
      <td className="px-4 py-3 text-xs text-gray-500">
        {new Date(s.created_at).toLocaleString()}
      </td>
    </tr>
  );
}

export default function AdminTriagePage() {
  const [urgency, setUrgency] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useAdminTriage({
    urgency: urgency || undefined,
    search:  search  || undefined,
    page,
  });

  const sessions: AdminTriageSession[] = (data?.results as any)?.data ?? [];
  const totalCount = data?.count ?? 0;
  const totalPages = Math.ceil(totalCount / 20);

  // Summary counts (from current page — full stats are in Analytics page)
  const emergencyCount = sessions.filter((s) => s.urgency_level === "emergency").length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Triage Sessions</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          {totalCount} total sessions across all patients
          {emergencyCount > 0 && (
            <span className="ml-3 text-red-400 font-semibold">
              🚨 {emergencyCount} emergency on this page
            </span>
          )}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search by patient name or email…"
          className="admin-input flex-1 min-w-48"
        />
        <select
          value={urgency}
          onChange={(e) => { setUrgency(e.target.value); setPage(1); }}
          className="admin-input w-44"
        >
          <option value="">All urgencies</option>
          <option value="emergency">🚨 Emergency</option>
          <option value="doctor_visit">🩺 Doctor Visit</option>
          <option value="self_care">🏡 Self-Care</option>
          <option value="undetermined">❓ Undetermined</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center items-center h-48">
            <div className="w-7 h-7 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-xs text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3 text-left">Patient</th>
                <th className="px-4 py-3 text-left">Urgency</th>
                <th className="px-4 py-3 text-left">Results</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {sessions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-gray-500">
                    No triage sessions found.
                  </td>
                </tr>
              ) : (
                sessions.map((s) => <SessionRow key={s.id} s={s} />)
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                p === page
                  ? "bg-teal-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}