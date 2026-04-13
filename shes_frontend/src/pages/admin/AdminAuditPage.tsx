/**
 * Admin Audit Log Viewer
    * This component fetches and displays the audit log entries in a structured format.
    * It attempts to parse each log line into fields like timestamp, method, path, and status.
    * The UI includes color-coding for HTTP methods and status codes for quick visual scanning.
    * Adjust the log parsing logic in `parseLogLine()` to match your actual log format.
 */

import { useState } from "react";
import { useAuditLog } from "../../hooks/useAdmin";

const METHOD_COLORS: Record<string, string> = {
  GET:    "text-teal-400",
  POST:   "text-blue-400",
  PATCH:  "text-yellow-400",
  PUT:    "text-orange-400",
  DELETE: "text-red-400",
};

const STATUS_COLOR = (code: number): string => {
  if (code < 300) return "text-green-400";
  if (code < 400) return "text-yellow-400";
  if (code < 500) return "text-orange-400";
  return "text-red-400";
};

/**
 * Attempt to parse a raw log line into structured fields.
 * Your audit middleware likely logs something like:
 * "2025-01-15 09:30:00 | INFO | user@example.com | POST | /api/v1/triage/start/ | 200 | 45ms"
 *
 * Adjust the regex below to match your actual log format.
 */
function parseLogLine(raw: string) {
  // Try to extract common fields with a flexible regex
  const m = raw.match(
    /(\d{4}-\d{2}-\d{2}[\sT]\d{2}:\d{2}:\d{2}(?:\.\d+)?)?.*?(GET|POST|PATCH|PUT|DELETE)\s+([^\s|]+).*?(\d{3})/i
  );
  if (m) {
    return {
      timestamp: m[1] ?? null,
      method:    m[2].toUpperCase(),
      path:      m[3],
      status:    parseInt(m[4], 10),
      raw,
    };
  }
  return { timestamp: null, method: null, path: null, status: null, raw };
}

export default function AdminAuditPage() {
  const [lines, setLines] = useState(100);
  const { data, isLoading, error, refetch, isFetching } = useAuditLog(lines);

  const entries: { raw: string }[] = data?.entries ?? [];
  const parsed = entries.map((e) => parseLogLine(e.raw));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">Audit Log</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Auto-refreshes every 30 seconds · {entries.length} entries shown
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={lines}
            onChange={(e) => setLines(Number(e.target.value))}
            className="admin-input w-32"
          >
            <option value={50}>Last 50</option>
            <option value={100}>Last 100</option>
            <option value={250}>Last 250</option>
            <option value={500}>Last 500</option>
          </select>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="btn-secondary flex items-center gap-2"
          >
            {isFetching ? (
              <span className="w-4 h-4 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              "↻"
            )}
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-950/40 border border-red-800 rounded-xl p-4 text-red-400 text-sm">
          {(error as Error).message}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-7 h-7 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          {parsed.length === 0 ? (
            <div className="text-center py-16 text-gray-500">No audit log entries found.</div>
          ) : (
            <div className="divide-y divide-gray-800">
              {/* Table header */}
              <div className="grid grid-cols-[160px_60px_1fr_60px] gap-4 px-4 py-2 text-xs text-gray-500 uppercase tracking-wider border-b border-gray-800">
                <span>Timestamp</span>
                <span>Method</span>
                <span>Path</span>
                <span>Status</span>
              </div>

              {parsed.map((entry, idx) =>
                entry.method ? (
                  // Structured row
                  <div
                    key={idx}
                    className="grid grid-cols-[160px_60px_1fr_60px] gap-4 px-4 py-2.5 hover:bg-gray-800/50 transition-colors items-center"
                  >
                    <span className="text-gray-500 text-xs font-mono">
                      {entry.timestamp
                        ? new Date(entry.timestamp).toLocaleTimeString()
                        : "—"}
                    </span>
                    <span className={`text-xs font-bold font-mono ${METHOD_COLORS[entry.method] ?? "text-gray-400"}`}>
                      {entry.method}
                    </span>
                    <span className="text-gray-300 text-xs font-mono truncate">{entry.path}</span>
                    <span className={`text-xs font-bold font-mono ${entry.status ? STATUS_COLOR(entry.status) : "text-gray-500"}`}>
                      {entry.status ?? "?"}
                    </span>
                  </div>
                ) : (
                  // Fallback: raw line
                  <div key={idx} className="px-4 py-2 hover:bg-gray-800/50 transition-colors">
                    <p className="text-gray-400 text-xs font-mono break-all">{entry.raw}</p>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-gray-600 text-center">
        Showing the last {lines} lines of <code className="text-gray-500">logs/shes.log</code>.
        Adjust the log format in <code className="text-gray-500">parseLogLine()</code> if needed.
      </p>
    </div>
  );
}