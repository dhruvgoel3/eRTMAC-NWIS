import React from "react";
import { X, Bell, AlertTriangle, ShieldCheck, Check } from "lucide-react";
import { Alert } from "../types";

interface AlertsModalProps {
  alerts: Alert[];
  onClose: () => void;
  onAcknowledge: (id: number) => void;
}

export const AlertsModal: React.FC<AlertsModalProps> = ({ alerts, onClose, onAcknowledge }) => {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2100,
        background: "rgba(3, 7, 18, 0.8)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        className="glass-card"
        style={{
          width: "100%",
          maxWidth: 680,
          maxHeight: "85vh",
          overflowY: "auto",
          background: "#0d1424",
          border: "1px solid var(--border-medium)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid var(--border-subtle)",
            paddingBottom: 14,
            marginBottom: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Bell size={20} color="var(--accent-amber)" />
            <h2 style={{ fontSize: 18, fontWeight: 700 }}>Real-Time Drilling Hazard Alerts</h2>
          </div>
          <button
            onClick={onClose}
            style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
          >
            <X size={20} />
          </button>
        </div>

        {alerts.length === 0 ? (
          <div style={{ padding: 30, textAlign: "center", color: "var(--text-muted)" }}>
            No active hazard alerts at this depth.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {alerts.map((a) => (
              <div
                key={a.id}
                style={{
                  background: a.acknowledged ? "rgba(255,255,255,0.02)" : "var(--bg-elevated)",
                  border: "1px solid " + (a.acknowledged ? "var(--border-subtle)" : "rgba(244,63,94,0.3)"),
                  borderRadius: "var(--radius-md)",
                  padding: "12px 16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span
                      className={`badge ${
                        a.severity === "CRITICAL"
                          ? "badge-rose"
                          : a.severity === "HIGH"
                          ? "badge-amber"
                          : "badge-cyan"
                      }`}
                    >
                      {a.severity}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 700 }}>
                      Depth: {a.depth.toFixed(1)}m
                    </span>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      {new Date(a.created_at).toLocaleTimeString()}
                    </span>
                  </div>

                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                    {a.message}
                  </div>

                  {a.explanation && (
                    <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
                      {a.explanation}
                    </div>
                  )}
                </div>

                {!a.acknowledged ? (
                  <button
                    className="btn-primary"
                    onClick={() => onAcknowledge(a.id)}
                    style={{ padding: "6px 12px", fontSize: 12 }}
                  >
                    <Check size={14} />
                    Acknowledge
                  </button>
                ) : (
                  <span style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
                    <ShieldCheck size={14} color="var(--accent-emerald)" />
                    Acknowledged
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
