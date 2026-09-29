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

  const getActionBadgeStyle = (action: string) => {
    switch (action.toUpperCase()) {
      case "LOGIN":
      case "LOGOUT":
        return { background: "rgba(37, 99, 235, 0.1)", color: "#1d4ed8", border: "1px solid rgba(37, 99, 235, 0.25)" };
      case "USER_CREATED":
      case "USER_ENABLED":
        return { background: "rgba(13, 122, 78, 0.1)", color: "#0d7a4e", border: "1px solid rgba(13, 122, 78, 0.25)" };
      case "USER_DISABLED":
        return { background: "rgba(185, 28, 66, 0.1)", color: "#b91c42", border: "1px solid rgba(185, 28, 66, 0.25)" };
      case "ROLE_ASSIGNED":
      case "ROLE_CHANGED":
        return { background: "rgba(124, 58, 237, 0.1)", color: "#6d28d9", border: "1px solid rgba(124, 58, 237, 0.25)" };
      case "AI_QUERY":
        return { background: "rgba(16, 67, 54, 0.1)", color: "var(--color-canopy)", border: "1px solid rgba(16, 67, 54, 0.25)" };
      case "ALERT_ACKNOWLEDGED":
      case "ALERT_ESCALATED":
        return { background: "rgba(217, 119, 6, 0.1)", color: "#b45309", border: "1px solid rgba(217, 119, 6, 0.25)" };
      default:
        return { background: "var(--bg-elevated)", color: "var(--color-bark)", border: "1px solid var(--color-sage-mist)" };
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
    <div className="profile-viewport">
      <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>
        {/* Navigation & Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Link
              to="/"
              className="profile-back-btn"
              title="Return to Dashboard"
            >
              <ArrowLeft style={{ width: 18, height: 18 }} />
            </Link>
            <div>
              <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-muted-slate)" }}>
                Compliance & Traceability
              </div>
              <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--color-bark)", margin: 0 }}>
                System Security & Activity Audit Trail
              </h1>
            </div>
          </div>

          <button
            onClick={loadLogs}
            className="btn-secondary"
            style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 16px", fontSize: 12 }}
          >
            <RefreshCw style={{ width: 14, height: 14 }} />
            <span>Refresh Logs</span>
          </button>
        </div>

        {/* Filters */}
        <div className="profile-card" style={{ padding: "14px 18px", display: "flex", flexDirection: "row", flexWrap: "wrap", gap: 16, alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ position: "relative", minWidth: 260, flex: "1 1 260px" }}>
            <Search style={{ width: 15, height: 15, position: "absolute", left: 12, top: 12, color: "var(--color-muted-slate)" }} />
            <input
              type="text"
              placeholder="Search by action, user, or resource..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="auth-input"
              style={{ fontSize: 12, height: 38 }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--color-muted-slate)", textTransform: "uppercase" }}>Filter:</span>
            {["ALL", "LOGIN", "USER_CREATED", "AI_QUERY", "ALERT_ACKNOWLEDGED"].map((act) => (
              <button
                key={act}
                onClick={() => setActionFilter(act)}
                style={{
                  padding: "5px 12px",
                  borderRadius: 8,
                  fontSize: 11,
                  fontFamily: "var(--font-mono)",
                  fontWeight: 600,
                  cursor: "pointer",
                  border: actionFilter === act ? "1px solid var(--color-canopy)" : "1px solid var(--color-sage-mist)",
                  background: actionFilter === act ? "var(--color-canopy)" : "var(--color-sheet-white)",
                  color: actionFilter === act ? "#ffffff" : "var(--color-slate)",
                  transition: "all 0.15s ease",
                }}
              >
                {act}
              </button>
            ))}
          </div>
        </div>

        {/* Logs Table */}
        <div className="profile-card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 12 }}>
              <thead style={{ background: "var(--bg-elevated)", borderBottom: "1px solid var(--color-sage-mist)", fontFamily: "var(--font-mono)", textTransform: "uppercase", fontSize: 11, color: "var(--color-muted-slate)" }}>
                <tr>
                  <th style={{ padding: "12px 16px" }}>Timestamp</th>
                  <th style={{ padding: "12px 16px" }}>Action</th>
                  <th style={{ padding: "12px 16px" }}>User</th>
                  <th style={{ padding: "12px 16px" }}>Target Resource</th>
                  <th style={{ padding: "12px 16px" }}>Metadata</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={5} style={{ padding: 36, textAlign: "center", color: "var(--color-muted-slate)" }}>
                      Loading audit events...
                    </td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: 36, textAlign: "center", color: "var(--color-muted-slate)" }}>
                      No audit events recorded matching current criteria.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log, idx) => (
                    <tr
                      key={log.id}
                      style={{
                        borderBottom: "1px solid rgba(175, 196, 191, 0.25)",
                        background: idx % 2 === 0 ? "var(--color-sheet-white)" : "var(--bg-elevated)",
                      }}
                    >
                      <td style={{ padding: "10px 16px", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-muted-slate)", whiteSpace: "nowrap" }}>
                        {new Date(log.created_at || log.timestamp).toLocaleString()}
                      </td>
                      <td style={{ padding: "10px 16px" }}>
                        <span
                          style={{
                            ...getActionBadgeStyle(log.action),
                            padding: "3px 8px",
                            borderRadius: 6,
                            fontSize: 10,
                            fontFamily: "var(--font-mono)",
                            fontWeight: 700,
                            display: "inline-block",
                          }}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td style={{ padding: "10px 16px", fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--color-bark)" }}>
                        {log.user_email}
                      </td>
                      <td style={{ padding: "10px 16px", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-slate)" }}>
                        {log.resource_type ? `${log.resource_type}: ${log.resource_id || "—"}` : "—"}
                      </td>
                      <td style={{ padding: "10px 16px", fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-muted-slate)", maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
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
