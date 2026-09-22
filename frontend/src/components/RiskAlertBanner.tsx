import React from "react";
import { AlertTriangle, ShieldCheck, ArrowRight, ExternalLink } from "lucide-react";
import { Alert } from "../types";

interface RiskAlertBannerProps {
  alerts: Alert[];
  onAcknowledge: (id: number) => void;
  onNavigateToOffset: () => void;
}

export const RiskAlertBanner: React.FC<RiskAlertBannerProps> = ({
  alerts,
  onAcknowledge,
  onNavigateToOffset,
}) => {
  const unackAlerts = alerts.filter((a) => !a.acknowledged);

  if (unackAlerts.length === 0) {
    return null;
  }

  // Display most critical alert
  const topAlert = unackAlerts[0];

  return (
    <div className={`alert-banner ${topAlert.severity}`}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background:
              topAlert.severity === "CRITICAL"
                ? "rgba(244, 63, 94, 0.25)"
                : "rgba(245, 158, 11, 0.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color:
              topAlert.severity === "CRITICAL"
                ? "var(--accent-rose)"
                : "var(--accent-amber)",
          }}
        >
          <AlertTriangle size={20} />
        </div>

        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              className={`badge ${
                topAlert.severity === "CRITICAL" ? "badge-rose" : "badge-amber"
              }`}
            >
              {topAlert.severity} HAZARD ALERT
            </span>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
              At Depth: <strong>{topAlert.depth.toFixed(1)}m</strong>
            </span>
          </div>

          <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>
            {topAlert.message}
          </div>

          {topAlert.explanation && (
            <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
              {topAlert.explanation}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button
          className="btn-secondary"
          onClick={onNavigateToOffset}
          style={{ padding: "6px 12px", fontSize: 12 }}
        >
          <ExternalLink size={14} />
          View Offset Correlated Wells
        </button>

        <button
          className="btn-primary"
          onClick={() => onAcknowledge(topAlert.id)}
          style={{ padding: "6px 12px", fontSize: 12 }}
        >
          <ShieldCheck size={14} />
          Acknowledge
        </button>
      </div>
    </div>
  );
};
