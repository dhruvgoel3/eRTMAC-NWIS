import React from "react";
import { Link } from "react-router-dom";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

export const AccessDeniedPage: React.FC = () => {
  const { profile, activeRole } = useAuth();

  return (
    <div className="access-denied-viewport">
      <div className="access-denied-card">
        <div className="access-denied-icon-wrap">
          <ShieldAlert style={{ width: 32, height: 32 }} />
        </div>

        <div className="access-denied-badge">
          HTTP 403 · Access Denied
        </div>

        <h1 className="access-denied-title">
          Restricted Resource
        </h1>

        <p className="access-denied-desc">
          You do not have permission to access this resource under your current role assignment
          {activeRole ? (
            <span style={{ fontWeight: 700, color: "var(--color-canopy)" }}> ({activeRole})</span>
          ) : null}
          . Please contact the Knowledge Administrator if you require elevated privileges.
        </p>

        {profile && (
          <div className="access-denied-info-box">
            <div className="access-denied-info-row">
              <span className="access-denied-info-label">Account:</span>
              <span className="access-denied-info-val">{profile.email}</span>
            </div>
            <div className="access-denied-info-row">
              <span className="access-denied-info-label">Active Role:</span>
              <span className="access-denied-info-val" style={{ color: "var(--color-canopy)" }}>
                {profile.active_role}
              </span>
            </div>
            <div className="access-denied-info-row">
              <span className="access-denied-info-label">Status:</span>
              <span style={{ color: "#0d7a4e", fontWeight: 700 }}>ACTIVE</span>
            </div>
          </div>
        )}

        <Link
          to="/"
          className="auth-btn-submit"
          style={{ textDecoration: "none" }}
        >
          <ArrowLeft style={{ width: 16, height: 16 }} />
          <span>Return to Dashboard</span>
        </Link>
      </div>

      <div style={{ textAlign: "center", fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--color-muted-slate)" }}>
        eRTMAC-NWIS · Oil India Limited · Operational Decision Support · SIH PS-121
      </div>
    </div>
  );
};
