import React from "react";
import { AlertTriangle, ShieldCheck, ArrowRight } from "lucide-react";
import { Alert } from "../types";

interface RiskAlertBannerProps {
  alerts: Alert[];
  onAcknowledge: (id: number) => void;
  onNavigateToOffset: () => void;
  onExplainAlert?: (alert: Alert) => void;
}

const SEVERITY_BG: Record<string, string> = {
  CRITICAL: "rgba(185,28,66,0.07)",
  HIGH:     "rgba(196,125,14,0.07)",
  MEDIUM:   "rgba(196,125,14,0.05)",
  LOW:      "rgba(13,122,78,0.05)",
};

const SEVERITY_BORDER: Record<string, string> = {
  CRITICAL: "rgba(185,28,66,0.25)",
  HIGH:     "rgba(196,125,14,0.25)",
  MEDIUM:   "rgba(196,125,14,0.20)",
  LOW:      "rgba(13,122,78,0.20)",
};

const SEVERITY_COLOR: Record<string, string> = {
  CRITICAL: "#b91c42",
  HIGH:     "#c47d0e",
  MEDIUM:   "#c47d0e",
  LOW:      "#0d7a4e",
};

const SEVERITY_ICON_BG: Record<string, string> = {
  CRITICAL: "rgba(185,28,66,0.12)",
  HIGH:     "rgba(196,125,14,0.12)",
  MEDIUM:   "rgba(196,125,14,0.10)",
  LOW:      "rgba(13,122,78,0.10)",
};

export const RiskAlertBanner: React.FC<RiskAlertBannerProps> = ({
  alerts,
  onAcknowledge,
  onNavigateToOffset,
  onExplainAlert,
}) => {
  const unackAlerts = alerts.filter((a) => !a.acknowledged);
  if (unackAlerts.length === 0) return null;

  const topAlert = unackAlerts[0];
  const sev = topAlert.severity;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 32px",
        gap: 20,
        background: SEVERITY_BG[sev] || "rgba(196,125,14,0.05)",
        borderBottom: `1px solid ${SEVERITY_BORDER[sev] || "rgba(196,125,14,0.2)"}`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: SEVERITY_ICON_BG[sev],
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: SEVERITY_COLOR[sev],
            flexShrink: 0,
          }}
        >
          <AlertTriangle size={18} />
        </div>

        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
            <span
              className={`badge badge-${sev === "CRITICAL" ? "rose" : sev === "HIGH" ? "amber" : "emerald"}`}
            >
              {sev} HAZARD ALERT
            </span>
            <span style={{ fontSize: 12, color: "var(--color-muted-slate)" }}>
              At depth: <strong style={{ color: "var(--color-bark)" }}>{topAlert.depth.toFixed(1)}m</strong>
            </span>
            {unackAlerts.length > 1 && (
              <span style={{ fontSize: 11, color: "var(--color-muted-slate)" }}>
                +{unackAlerts.length - 1} more
              </span>
            )}
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-bark)" }}>
            {topAlert.message}
          </div>
          {topAlert.explanation && (
            <div style={{ fontSize: 12, color: "var(--color-slate)", marginTop: 1 }}>
              {topAlert.explanation}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        {onExplainAlert && (
          <button
            className="btn-secondary"
            onClick={() => onExplainAlert(topAlert)}
            style={{
              padding: "6px 12px",
              fontSize: 12,
              gap: 5,
              background: "rgba(16,67,54,0.08)",
              borderColor: "var(--color-canopy)",
              color: "var(--color-canopy)",
              fontWeight: 600,
            }}
          >
            Why am I seeing this alert?
          </button>
        )}
        <button
          className="btn-secondary"
          onClick={onNavigateToOffset}
          style={{ padding: "6px 12px", fontSize: 12 }}
        >
          View Offset Wells
          <ArrowRight size={13} />
        </button>
        <button
          className="btn-primary"
          onClick={() => onAcknowledge(topAlert.id)}
          style={{ padding: "6px 12px", fontSize: 12 }}
        >
          <ShieldCheck size={13} />
          Acknowledge
        </button>
      </div>
    </div>
  );
};
