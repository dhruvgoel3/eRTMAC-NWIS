import React, { useState } from "react";
import { Link } from "react-router-dom";
import { User, Shield, ArrowLeft, Mail, Phone, Building2, Briefcase, CheckCircle2, Lock, AlertTriangle } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../services/api";

export const ProfilePage: React.FC = () => {
  const { profile, activeRole, permissions, refreshProfile } = useAuth();

  const [fullName, setFullName] = useState<string>(profile?.full_name || "");
  const [department, setDepartment] = useState<string>(profile?.department || "");
  const [designation, setDesignation] = useState<string>(profile?.designation || "");
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      await api.updateAdminUser(profile.id, {
        full_name: fullName,
        department,
        designation,
      });
      await refreshProfile();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setSaveError(err.response?.data?.error?.message || err.message || "Failed to update profile.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="profile-viewport">
      <div className="profile-container">
        {/* Navigation & Header */}
        <div className="profile-header-bar">
          <Link
            to="/"
            className="profile-back-btn"
            title="Return to Dashboard"
          >
            <ArrowLeft style={{ width: 18, height: 18 }} />
          </Link>
          <div>
            <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-muted-slate)" }}>
              Identity & Access Management
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--color-bark)", margin: 0 }}>
              Operator Profile & Authorized Capabilities
            </h1>
          </div>
        </div>

        {/* Profile Details Grid */}
        <div className="profile-layout-grid">
          {/* Identity Snapshot Card */}
          <div className="profile-card" style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
            <div className="profile-avatar-circle">
              {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : "O"}
            </div>

            <div style={{ marginBottom: 12 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: "var(--color-bark)", margin: "0 0 4px" }}>
                {profile?.full_name || "Operator"}
              </h2>
              <div style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--color-muted-slate)" }}>
                {profile?.email}
              </div>
            </div>

            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 9999, background: "var(--color-canopy)", color: "var(--color-mint-pulse)", fontSize: 11, fontFamily: "var(--font-mono)", fontWeight: 700, marginBottom: 20 }}>
              <Shield style={{ width: 14, height: 14 }} />
              <span>{activeRole || "OPERATOR"}</span>
            </div>

            <div style={{ width: "100%", borderTop: "1px solid var(--color-sage-mist)", paddingTop: 16, display: "flex", flexDirection: "column", gap: 10, fontSize: 12, fontFamily: "var(--font-mono)", textAlign: "left" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--color-muted-slate)" }}>Employee ID:</span>
                <span style={{ fontWeight: 600, color: "var(--color-bark)" }}>{profile?.employee_id || "—"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--color-muted-slate)" }}>Status:</span>
                <span style={{ color: "#0d7a4e", fontWeight: 700 }}>ACTIVE</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--color-muted-slate)" }}>System:</span>
                <span style={{ color: "var(--color-bark)" }}>eRTMAC PROTO</span>
              </div>
            </div>
          </div>

          {/* Edit Safe Fields Form */}
          <div className="profile-card">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, paddingBottom: 10, borderBottom: "1px solid var(--color-sage-mist)" }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--color-bark)", margin: 0 }}>
                Operational Metadata
              </h3>
              <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--color-muted-slate)" }}>
                Self-Service Profile
              </span>
            </div>

            {saveSuccess && (
              <div className="auth-alert-success">
                <CheckCircle2 style={{ width: 16, height: 16 }} />
                <span>Profile updated successfully.</span>
              </div>
            )}

            {saveError && (
              <div className="auth-alert-error">
                <AlertTriangle style={{ width: 16, height: 16 }} />
                <span>{saveError}</span>
              </div>
            )}

            <form onSubmit={handleUpdate} className="auth-form">
              <div className="auth-field">
                <label className="auth-label">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="auth-input"
                  style={{ paddingLeft: 12 }}
                />
              </div>

              <div className="auth-form-row">
                <div className="auth-field">
                  <label className="auth-label">Department</label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="auth-input"
                    style={{ paddingLeft: 12 }}
                  />
                </div>
                <div className="auth-field">
                  <label className="auth-label">Designation</label>
                  <input
                    type="text"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    className="auth-input"
                    style={{ paddingLeft: 12 }}
                  />
                </div>
              </div>

              <div className="auth-field">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label className="auth-label">Assigned Role (Fixed)</label>
                  <span style={{ fontSize: 10.5, fontFamily: "var(--font-mono)", color: "var(--color-muted-slate)", display: "flex", alignItems: "center", gap: 4 }}>
                    <Lock style={{ width: 12, height: 12 }} /> Managed by Administrator
                  </span>
                </div>
                <input
                  type="text"
                  disabled
                  value={activeRole || ""}
                  className="auth-input"
                  style={{ paddingLeft: 12, backgroundColor: "var(--bg-elevated)", color: "var(--color-slate)", cursor: "not-allowed" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="btn-primary"
                  style={{ padding: "8px 20px", fontSize: 13 }}
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Granted Capabilities Catalog */}
        <div className="profile-card">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, paddingBottom: 10, borderBottom: "1px solid var(--color-sage-mist)" }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--color-bark)", margin: 0 }}>
              Authorized Capabilities ({permissions.length} Grants)
            </h3>
            <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--color-muted-slate)" }}>
              Resolved from active role: {activeRole}
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
            {permissions.map((perm) => (
              <div
                key={perm}
                style={{ padding: "8px 12px", borderRadius: 8, background: "var(--bg-elevated)", border: "1px solid var(--color-sage-mist)", fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--color-bark)", display: "flex", alignItems: "center", gap: 8 }}
              >
                <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "var(--color-mint-pulse)", flexShrink: 0 }} />
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{perm}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
