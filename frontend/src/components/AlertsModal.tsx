import React from "react";
import { X, Bell, ShieldCheck, Check, Clock } from "lucide-react";
import { Alert } from "../types";

interface AlertsModalProps {
  alerts: Alert[];
  onClose: () => void;
  onAcknowledge: (id: number) => void;
  onExplainAlert?: (alert: Alert) => void;
}

const SEV_BADGE: Record<string, string> = {
  CRITICAL: "badge-rose",
  HIGH:     "badge-amber",
  MEDIUM:   "badge-amber",
  LOW:      "badge-emerald",
};

const SEV_LEFT: Record<string, string> = {
  CRITICAL: "#b91c42",
  HIGH:     "#f97316",
  MEDIUM:   "#c47d0e",
  LOW:      "#0d7a4e",
};

export const AlertsModal: React.FC<AlertsModalProps> = ({ alerts, onClose, onAcknowledge, onExplainAlert }) => {
  const unack = alerts.filter((a) => !a.acknowledged);
  const acked = alerts.filter((a) => a.acknowledged);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2100,
        background: "rgba(16,31,30,0.55)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 680,
          maxHeight: "85vh",
          overflowY: "auto",
          background: "var(--color-sheet-white)",
          border: "1px solid var(--color-sage-mist)",
          borderRadius: 16,
          padding: 28,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid var(--color-sage-mist)",
            paddingBottom: 16,
            marginBottom: 20,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Bell size={18} color="#c47d0e" />
            <h2 style={{ fontSize: 18, fontWeight: 500, color: "var(--color-ink)", letterSpacing: "-0.02em" }}>
              Real-Time Drilling Hazard Alerts
            </h2>
            {unack.length > 0 && (
              <span className="badge badge-rose">{unack.length} Active</span>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--color-sage-mist)",
              color: "var(--color-slate)",
              cursor: "pointer",
              padding: 7,
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-canopy)"; e.currentTarget.style.color = "white"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "var(--bg-elevated)"; e.currentTarget.style.color = "var(--color-slate)"; }}
          >
            <X size={16} />
          </button>
        </div>

        {alerts.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--color-muted-slate)" }}>
            <ShieldCheck size={28} style={{ marginBottom: 10, display: "block", margin: "0 auto 10px", opacity: 0.4 }} />
            No active hazard alerts at this depth.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {alerts.map((a) => (
              <div
                key={a.id}
                style={{
                  background: a.acknowledged ? "var(--bg-elevated)" : "var(--color-sheet-white)",
                  border: "1px solid var(--color-sage-mist)",
                  borderLeft: `3px solid ${a.acknowledged ? "var(--color-pale-sage)" : (SEV_LEFT[a.severity] || "#afc4bf")}`,
                  borderRadius: 10,
                  padding: "12px 16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 16,
                  opacity: a.acknowledged ? 0.6 : 1,
                  transition: "opacity 0.2s ease",
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span className={`badge ${SEV_BADGE[a.severity] || "badge-canopy"}`}>
                      {a.severity}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-bark)" }}>
                      {a.depth.toFixed(1)}m
                    </span>
                    <span style={{ fontSize: 11, color: "var(--color-muted-slate)", display: "flex", alignItems: "center", gap: 3 }}>
                      <Clock size={11} />
                      {new Date(a.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-bark)", marginBottom: 2 }}>
                    {a.message}
                  </div>
                  {a.explanation && (
                    <div style={{ fontSize: 12, color: "var(--color-slate)", lineHeight: 1.5 }}>
                      {a.explanation}
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  {onExplainAlert && (
                    <button
                      className="btn-secondary"
                      onClick={() => onExplainAlert(a)}
                      style={{
                        padding: "5px 10px",
                        fontSize: 11,
                        background: "rgba(16,67,54,0.06)",
                        borderColor: "var(--color-canopy)",
                        color: "var(--color-canopy)",
                        fontWeight: 600,
                      }}
                    >
                      Why am I seeing this alert?
                    </button>
                  )}
                  {!a.acknowledged ? (
                    <button
                      className="btn-primary"
                      onClick={() => onAcknowledge(a.id)}
                      style={{ padding: "6px 12px", fontSize: 11, flexShrink: 0 }}
                    >
                      <Check size={13} />
                      Acknowledge
                    </button>
                  ) : (
                    <span style={{ fontSize: 11, color: "#0d7a4e", display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                      <ShieldCheck size={14} />
                      Acknowledged
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
