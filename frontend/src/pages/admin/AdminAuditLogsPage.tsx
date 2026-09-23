import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { FileText, ArrowLeft, RefreshCw, Filter, Search, Terminal } from "lucide-react";
import { api } from "../../services/api";
import { AuditLogItem } from "../../types";

export const AdminAuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [actionFilter, setActionFilter] = useState<string>("ALL");
  const [search, setSearch] = useState<string>("");

  useEffect(() => {
    loadLogs();
  }, [actionFilter]);

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const data = await api.getAuditLogs(100, actionFilter === "ALL" ? undefined : actionFilter);
      setLogs(data);
    } catch (err) {
      console.error("Failed to load audit logs:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const getActionBadgeColor = (action: string) => {
    switch (action.toUpperCase()) {
      case "LOGIN":
      case "LOGOUT":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "USER_CREATED":
      case "USER_ENABLED":
        return "bg-emerald-50 text-emerald-800 border-emerald-200";
      case "USER_DISABLED":
        return "bg-rose-50 text-rose-800 border-rose-200";
      case "ROLE_ASSIGNED":
      case "ROLE_CHANGED":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "AI_QUERY":
        return "bg-[#104336]/10 text-[#104336] border-[#104336]/20";
      case "ALERT_ACKNOWLEDGED":
      case "ALERT_ESCALATED":
        return "bg-amber-50 text-amber-800 border-amber-200";
      default:
        return "bg-[#f3f1ec] text-[#104336] border-[#104336]/10";
    }
  };

  const filteredLogs = logs.filter((log) => {
    return (
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.user_email.toLowerCase().includes(search.toLowerCase()) ||
      (log.resource_id && log.resource_id.toLowerCase().includes(search.toLowerCase()))
    );
  });

  return (
    <div className="min-h-screen bg-[#f3f1ec] text-[#104336] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="p-2 rounded-xl bg-white border border-[#104336]/10 text-[#104336] hover:bg-[#104336]/5 transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="text-[11px] font-mono tracking-wider uppercase text-[#104336]/60">
                Compliance & Traceability
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-[#104336]">
                System Security & Activity Audit Trail
              </h1>
            </div>
          </div>

          <button
            onClick={loadLogs}
            className="px-3.5 py-2 rounded-xl bg-white border border-[#104336]/15 hover:border-[#104336] text-xs font-mono flex items-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh Logs
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-[#104336]/10 p-4 flex flex-col sm:flex-row gap-3 items-center justify-between shadow-sm">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-[#104336]/40" />
            <input
              type="text"
              placeholder="Search by action, user, or resource..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#f3f1ec]/50 border border-[#104336]/15 rounded-xl text-xs text-[#104336] focus:outline-none focus:border-[#104336]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
            {[
              "ALL",
              "LOGIN",
              "USER_CREATED",
              "ROLE_ASSIGNED",
              "AI_QUERY",
              "ALERT_ACKNOWLEDGED",
            ].map((act) => (
              <button
                key={act}
                onClick={() => setActionFilter(act)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                  actionFilter === act
                    ? "bg-[#104336] text-white"
                    : "bg-[#f3f1ec]/60 text-[#104336]/70 hover:bg-[#104336]/10"
                }`}
              >
                {act === "ALL" ? "All Actions" : act}
              </button>
            ))}
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="bg-white rounded-2xl border border-[#104336]/10 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f3f1ec]/80 border-b border-[#104336]/10 font-mono text-[#104336]/70 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">User / Actor</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Resource</th>
                  <th className="py-3 px-4">IP Address</th>
                  <th className="py-3 px-4">Details / Metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#104336]/5">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-[#104336]/60">
                      Loading audit events...
                    </td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-[#104336]/60">
                      No audit log records found.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-[#f3f1ec]/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-[#104336]/70 whitespace-nowrap">
                        {log.timestamp
                          ? new Date(log.timestamp).toLocaleString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })
                          : "—"}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-[#104336]">{log.user_name}</div>
                        <div className="font-mono text-[11px] text-[#104336]/60">
                          {log.user_email}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider border ${getActionBadgeColor(
                            log.action
                          )}`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[#104336]">
                        {log.resource_type ? (
                          <span className="text-[#104336]/60">{log.resource_type}: </span>
                        ) : null}
                        <span className="font-semibold">{log.resource_id || "—"}</span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-[#104336]/70">
                        {log.ip_address || "127.0.0.1"}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-[#104336]/70 max-w-xs truncate">
                        {log.metadata ? JSON.stringify(log.metadata) : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
