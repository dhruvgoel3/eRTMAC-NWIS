import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Shield, ArrowLeft, Check, X, Users, RefreshCw } from "lucide-react";
import { api } from "../../services/api";
import { RoleItem } from "../../types";

export const AdminRolesPage: React.FC = () => {
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [allPermissions, setAllPermissions] = useState<{ id: string; name: string; description?: string }[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [rolesData, permsData] = await Promise.all([
        api.getAdminRoles(),
        api.getAdminPermissions(),
      ]);
      setRoles(rolesData);
      setAllPermissions(permsData);
    } catch (err) {
      console.error("[AdminRoles] Failed to load roles & permissions:", err);
    } finally {
      setIsLoading(false);
    }
  };

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
                Security & Authorization Architecture
              </div>
              <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--color-bark)", margin: 0 }}>
                Role & Permission Matrix
              </h1>
            </div>
          </div>

          <button
            onClick={loadData}
            className="btn-secondary"
            style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 16px", fontSize: 12 }}
          >
            <RefreshCw style={{ width: 14, height: 14 }} />
            <span>Sync Catalog</span>
          </button>
        </div>

        {/* 3 Core Roles Overview Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
          {roles.map((r) => (
            <div
              key={r.id}
              className="profile-card"
              style={{ display: "flex", flexDirection: "column", gap: 12 }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 10px", borderRadius: 9999, background: "rgba(16, 67, 54, 0.08)", color: "var(--color-canopy)", fontSize: 11, fontFamily: "var(--font-mono)", fontWeight: 700 }}>
                  <Shield style={{ width: 14, height: 14 }} />
                  <span>{r.name}</span>
                </div>
                <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--color-muted-slate)", display: "flex", alignItems: "center", gap: 4 }}>
                  <Users style={{ width: 13, height: 13 }} />
                  {r.user_count} Users
                </span>
              </div>

              <p style={{ fontSize: 12, color: "var(--color-slate)", lineHeight: 1.5, margin: 0, minHeight: 40 }}>
                {r.description || "Operational role with predefined access bounds."}
              </p>

              <div style={{ paddingTop: 10, borderTop: "1px solid var(--color-sage-mist)", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, fontFamily: "var(--font-mono)" }}>
                <span style={{ color: "var(--color-muted-slate)" }}>Granted Permissions:</span>
                <span style={{ fontWeight: 700, color: "var(--color-canopy)" }}>
                  {r.permissions.length} capabilities
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Full Role-Permission Matrix Table */}
        <div className="profile-card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--color-sage-mist)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--color-bark)", margin: 0 }}>
              Granular Permission Mapping Catalogue
            </h2>
            <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--color-muted-slate)" }}>
              Backend-Enforced Server-Side Authorization
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 12 }}>
              <thead style={{ background: "var(--bg-elevated)", borderBottom: "1px solid var(--color-sage-mist)", fontFamily: "var(--font-mono)", textTransform: "uppercase", fontSize: 11, color: "var(--color-muted-slate)" }}>
                <tr>
                  <th style={{ padding: "12px 18px", width: "35%" }}>Permission Key</th>
                  <th style={{ padding: "12px 18px", width: "35%" }}>Functional Description</th>
                  {roles.map((r) => (
                    <th key={r.id} style={{ padding: "12px 18px", textAlign: "center", fontWeight: 700, color: "var(--color-bark)" }}>
                      {r.name === "DRILLING_ENGINEER"
                        ? "Engineer"
                        : r.name === "DRILLING_SUPERVISOR"
                        ? "Supervisor"
                        : "Knowledge Admin"}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={5} style={{ padding: 36, textAlign: "center", color: "var(--color-muted-slate)" }}>
                      Loading matrix...
                    </td>
                  </tr>
                ) : allPermissions.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: 36, textAlign: "center", color: "var(--color-muted-slate)" }}>
                      No permissions catalogued.
                    </td>
                  </tr>
                ) : (
                  allPermissions.map((perm, idx) => (
                    <tr
                      key={perm.name}
                      style={{
                        borderBottom: "1px solid rgba(175, 196, 191, 0.25)",
                        background: idx % 2 === 0 ? "var(--color-sheet-white)" : "var(--bg-elevated)",
                      }}
                    >
                      <td style={{ padding: "12px 18px", fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--color-bark)" }}>
                        {perm.name}
                      </td>
                      <td style={{ padding: "12px 18px", color: "var(--color-slate)" }}>
                        {perm.description || "—"}
                      </td>
                      {roles.map((r) => {
                        const hasIt = r.permissions.some((p) => p.name === perm.name);
                        return (
                          <td key={r.id} style={{ padding: "12px 18px", textAlign: "center" }}>
                            {hasIt ? (
                              <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, borderRadius: "50%", background: "rgba(13, 122, 78, 0.12)", color: "#0d7a4e" }}>
                                <Check style={{ width: 14, height: 14 }} />
                              </span>
                            ) : (
                              <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, borderRadius: "50%", background: "rgba(185, 28, 66, 0.08)", color: "#b91c42" }}>
                                <X style={{ width: 13, height: 13 }} />
                              </span>
                            )}
                          </td>
                        );
                      })}
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
