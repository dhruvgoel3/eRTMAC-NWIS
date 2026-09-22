import React from "react";
import { X, Calendar, Compass, ShieldAlert, Layers, Clock, Award } from "lucide-react";
import { Well } from "../types";

interface WellDossierModalProps {
  well: Well | null;
  onClose: () => void;
  onAskAIAboutWell?: (wellId: string) => void;
}

export const WellDossierModal: React.FC<WellDossierModalProps> = ({
  well,
  onClose,
  onAskAIAboutWell,
}) => {
  if (!well) return null;

  const events = well.events || [];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2000,
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
          maxWidth: 820,
          maxHeight: "90vh",
          overflowY: "auto",
          background: "#0d1424",
          border: "1px solid var(--border-medium)",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.7)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid var(--border-subtle)",
            paddingBottom: 16,
            marginBottom: 20,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: "var(--radius-md)",
                background: well.is_active
                  ? "radial-gradient(circle, #00d2ff, #0369a1)"
                  : "linear-gradient(135deg, #334155, #1e293b)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontWeight: 700,
              }}
            >
              {well.well_id.slice(-4)}
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <h2 style={{ fontSize: 20, fontWeight: 700 }}>{well.name}</h2>
                <span className="badge badge-cyan">{well.well_id}</span>
                {well.is_active && <span className="badge badge-emerald">ACTIVE RIG</span>}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
                {well.field} • {well.operator} • Lat: {well.latitude.toFixed(4)}°, Lon:{" "}
                {well.longitude.toFixed(4)}°
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-muted)",
              cursor: "pointer",
              padding: 4,
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Quick Specs Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 12,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              background: "var(--bg-elevated)",
              padding: "12px 14px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>TARGET FORMATION</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--accent-cyan)", marginTop: 4 }}>
              {well.formation}
            </div>
          </div>

          <div
            style={{
              background: "var(--bg-elevated)",
              padding: "12px 14px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>TOTAL DEPTH</div>
            <div style={{ fontSize: 15, fontWeight: 700, marginTop: 4 }}>
              {well.total_depth.toLocaleString()} m
            </div>
          </div>

          <div
            style={{
              background: "var(--bg-elevated)",
              padding: "12px 14px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>TRAJECTORY</div>
            <div style={{ fontSize: 15, fontWeight: 700, marginTop: 4 }}>
              {well.trajectory_type}
            </div>
          </div>

          <div
            style={{
              background: "var(--bg-elevated)",
              padding: "12px 14px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>DESIGN MUD WT</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#f59e0b", marginTop: 4 }}>
              {well.mud_weight} ppg
            </div>
          </div>
        </div>

        {/* Casing & Cementing Program */}
        <div
          style={{
            background: "rgba(11, 17, 32, 0.6)",
            padding: 16,
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border-subtle)",
            marginBottom: 20,
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8 }}>
            DRILLING ARCHITECTURE & CASING PROGRAM
          </div>
          <p style={{ fontSize: 13, color: "var(--text-primary)", marginBottom: 6 }}>
            {well.casing_program || "Standard casing string: 20\" conductor, 13-3/8\" surface, 9-5/8\" intermediate."}
          </p>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
            Cementing Notes: {well.cementing_notes || "Standard API Class G cement with fluid loss additives."}
          </div>
        </div>

        {/* Historical Events Encountered */}
        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
              <ShieldAlert size={16} color="var(--accent-amber)" />
              Recorded Drilling Incidents & NPT Events ({events.length})
            </div>
            {well.total_npt !== undefined && (
              <span style={{ fontSize: 12, color: "var(--accent-rose)", fontWeight: 600 }}>
                Total NPT: {well.total_npt.toFixed(1)} hrs
              </span>
            )}
          </div>

          {events.length === 0 ? (
            <div
              style={{
                padding: 16,
                textAlign: "center",
                color: "var(--text-muted)",
                background: "rgba(255,255,255,0.02)",
                borderRadius: "var(--radius-md)",
              }}
            >
              No major NPT incidents recorded on this well.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {events.map((ev) => (
                <div
                  key={ev.id}
                  style={{
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius-md)",
                    padding: 12,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 6,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span
                        className={`badge ${
                          ev.severity === "CRITICAL"
                            ? "badge-rose"
                            : ev.severity === "HIGH"
                            ? "badge-amber"
                            : "badge-cyan"
                        }`}
                      >
                        {ev.event_type}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>
                        {ev.depth_start}m – {ev.depth_end}m
                      </span>
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                        ({ev.formation})
                      </span>
                    </div>
                    <span style={{ fontSize: 12, color: "var(--accent-rose)", fontWeight: 600 }}>
                      +{ev.npt_hours}h NPT
                    </span>
                  </div>

                  <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>
                    {ev.description}
                  </p>

                  <div
                    style={{
                      fontSize: 11,
                      background: "rgba(0,0,0,0.25)",
                      padding: "6px 10px",
                      borderRadius: 4,
                      color: "var(--text-muted)",
                    }}
                  >
                    <strong style={{ color: "var(--accent-emerald)" }}>Mitigation Applied: </strong>
                    {ev.mitigation}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 12,
            borderTop: "1px solid var(--border-subtle)",
            paddingTop: 16,
          }}
        >
          {onAskAIAboutWell && (
            <button
              className="btn-primary"
              onClick={() => {
                onClose();
                onAskAIAboutWell(well.well_id);
              }}
            >
              Ask AI Copilot About {well.well_id}
            </button>
          )}
          <button className="btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
