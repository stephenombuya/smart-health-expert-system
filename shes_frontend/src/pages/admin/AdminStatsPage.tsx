/**
 * Admin Analytics / Stats Page
 * Displays aggregate health data trends across all patients, including:
 * - Total counts of readings, entries, and interactions
 * - Average mood trends over the past 30 days
 */

import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { useAdminStats } from "@/hooks/useAdmin";

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

const CONTEXT_COLORS: Record<string, string> = {
  fasting:   "#14b8a6",
  post_meal: "#6366f1",
  random:    "#f59e0b",
  bedtime:   "#ec4899",
};

export default function AdminStatsPage() {
  const { data, isLoading, error } = useAdminStats();

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
        Failed to load analytics data.
      </div>
    );
  }

  const {
    totals,
    mood_trend_30d,
    top_prescribed_drugs,
    glucose_by_context,
    lab_trend_14d,
    bp_averages,
  } = data;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-white">Platform Analytics</h2>
        <p className="text-sm text-gray-500 mt-0.5">Aggregate health data across all patients</p>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard label="Glucose Readings"   value={totals.glucose_readings} />
        <StatCard label="BP Readings"        value={totals.bp_readings} />
        <StatCard label="Mood Entries"       value={totals.mood_entries} />
        <StatCard label="Lab Results"        value={totals.lab_results} />
        <StatCard label="Drug Interactions"  value={totals.drug_interactions} />
        <StatCard label="Coping Strategies"  value={totals.coping_strategies} />
      </div>

      {/* BP Summary */}
      {bp_averages && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex flex-col items-center">
            <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Avg Systolic BP</p>
            <p className="text-4xl font-bold text-orange-400">
              {bp_averages.avg_sys ? Math.round(bp_averages.avg_sys) : "—"}
            </p>
            <p className="text-gray-500 text-sm">mmHg</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex flex-col items-center">
            <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Avg Diastolic BP</p>
            <p className="text-4xl font-bold text-indigo-400">
              {bp_averages.avg_dia ? Math.round(bp_averages.avg_dia) : "—"}
            </p>
            <p className="text-gray-500 text-sm">mmHg</p>
          </div>
        </div>
      )}

      {/* Mood Trend */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Avg Daily Mood Score — 30 Days</h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={mood_trend_30d}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis
              dataKey="date"
              tick={{ fill: "#6b7280", fontSize: 10 }}
              interval={4}
            />
            <YAxis domain={[0, 10]} tick={{ fill: "#6b7280", fontSize: 11 }} />
            <Tooltip
              contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 8 }}
              labelStyle={{ color: "#9ca3af" }}
              itemStyle={{ color: "#ec4899" }}
            />
            <Line
              type="monotone" dataKey="avg" stroke="#ec4899"
              strokeWidth={2} dot={false} name="Avg Mood"
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top prescribed drugs */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Top 10 Prescribed Medications</h3>
          {top_prescribed_drugs.length === 0 ? (
            <p className="text-gray-500 text-sm">No prescription data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={top_prescribed_drugs} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis type="number" tick={{ fill: "#6b7280", fontSize: 11 }} allowDecimals={false} />
                <YAxis
                  dataKey="medication__name"
                  type="category"
                  tick={{ fill: "#9ca3af", fontSize: 11 }}
                  width={110}
                />
                <Tooltip
                  contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 8 }}
                />
                <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} name="Patients" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Glucose by context */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Average Glucose by Reading Context</h3>
          {glucose_by_context.length === 0 ? (
            <p className="text-gray-500 text-sm">No glucose data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={glucose_by_context}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="context" tick={{ fill: "#9ca3af", fontSize: 11 }} />
                <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 8 }}
                />
                <Bar dataKey="avg" name="Avg mg/dL" radius={[4, 4, 0, 0]}>
                  {glucose_by_context.map((entry: any) => (
                    <Cell key={entry.context} fill={CONTEXT_COLORS[entry.context] ?? "#14b8a6"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Lab submissions trend */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Lab Result Submissions (14 Days)</h3>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={lab_trend_14d}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 10 }} />
            <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} allowDecimals={false} />
            <Tooltip
              contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 8 }}
            />
            <Bar dataKey="count" fill="#14b8a6" radius={[4, 4, 0, 0]} name="Submissions" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}