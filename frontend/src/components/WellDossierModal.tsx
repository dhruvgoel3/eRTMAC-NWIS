import React from "react";
import { X, Layers, ShieldAlert, Clock } from "lucide-react";
import { Well } from "../types";

interface WellDossierModalProps {
  well: Well | null;
  onClose: () => void;
  onAskAIAboutWell?: (wellId: string) => void;
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
          maxWidth: 860,
          maxHeight: "90vh",
          overflowY: "auto",
          background: "var(--color-sheet-white)",
          border: "1px solid var(--color-sage-mist)",
          borderRadius: 16,
          padding: 32,
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
            paddingBottom: 20,
            marginBottom: 24,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 10,
                background: well.is_active ? "var(--color-canopy)" : "var(--bg-elevated)",
                border: "1px solid var(--color-sage-mist)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: well.is_active ? "var(--color-mint-pulse)" : "var(--color-canopy)",
                fontWeight: 700,
                fontSize: 13,
                letterSpacing: "-0.01em",
                fontFamily: "var(--font-mono)",
              }}
            >
              {well.well_id.slice(-4)}
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                <h2 style={{ fontSize: 20, fontWeight: 500, color: "var(--color-ink)", letterSpacing: "-0.02em" }}>
                  {well.name}
                </h2>
                <span className="badge badge-canopy">{well.well_id}</span>
                {well.is_active && <span className="badge badge-mint">ACTIVE RIG</span>}
              </div>
              <div style={{ fontSize: 12, color: "var(--color-muted-slate)" }}>
                {well.field} &nbsp;·&nbsp; {well.operator} &nbsp;·&nbsp; {well.latitude.toFixed(4)}°N, {well.longitude.toFixed(4)}°E
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--color-sage-mist)",
              color: "var(--color-slate)",
              cursor: "pointer",
              padding: 8,
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-canopy)"; e.currentTarget.style.color = "white"; e.currentTarget.style.borderColor = "var(--color-canopy)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "var(--bg-elevated)"; e.currentTarget.style.color = "var(--color-slate)"; e.currentTarget.style.borderColor = "var(--color-sage-mist)"; }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Spec Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
          {[
            { label: "TARGET FORMATION", value: well.formation,          color: "var(--color-canopy)" },
            { label: "TOTAL DEPTH",      value: `${well.total_depth.toLocaleString()}m`, color: "var(--color-bark)" },
            { label: "TRAJECTORY",       value: well.trajectory_type,    color: "var(--color-bark)" },
            { label: "DESIGN MUD WT",    value: `${well.mud_weight} ppg`,color: "#c47d0e" },
          ].map((s) => (
            <div
              key={s.label}
              style={{
                padding: "14px 16px",
                borderRadius: 10,
                background: "var(--bg-elevated)",
                border: "1px solid var(--color-sage-mist)",
              }}
            >
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--color-muted-slate)", marginBottom: 6 }}>
                {s.label}
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, color: s.color }}>
                {s.value}
              </div>
            </div>
          ))}
        </div>

        {/* Casing & Cementing */}
        <div
          style={{
            padding: "16px 18px",
            borderRadius: 10,
            background: "var(--bg-elevated)",
            border: "1px solid var(--color-sage-mist)",
            marginBottom: 24,
          }}
        >
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--color-muted-slate)", marginBottom: 8 }}>
            Drilling Architecture &amp; Casing Program
          </div>
          <p style={{ fontSize: 13, color: "var(--color-bark)", lineHeight: 1.6, marginBottom: 6 }}>
            {well.casing_program || "Standard casing string: 20\" conductor, 13-3/8\" surface, 9-5/8\" intermediate."}
          </p>
          <div style={{ fontSize: 12, color: "var(--color-muted-slate)" }}>
            Cementing: {well.cementing_notes || "Standard API Class G cement with fluid loss additives."}
          </div>
        </div>

        {/* Events */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-bark)", display: "flex", alignItems: "center", gap: 8 }}>
              <ShieldAlert size={16} color="#c47d0e" />
              Recorded Drilling Incidents &amp; NPT Events ({events.length})
            </div>
            {well.total_npt !== undefined && (
              <span style={{ fontSize: 13, color: "#b91c42", fontWeight: 600 }}>
                Total NPT: {well.total_npt.toFixed(1)}h
              </span>
            )}
          </div>

          {events.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", color: "var(--color-muted-slate)", background: "var(--bg-elevated)", borderRadius: 10, border: "1px solid var(--color-sage-mist)" }}>
              No major NPT incidents recorded on this well.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {events.map((ev) => (
                <div
                  key={ev.id}
                  style={{
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--color-sage-mist)",
                    borderLeft: `3px solid ${SEV_LEFT[ev.severity] || "#afc4bf"}`,
                    borderRadius: 10,
                    padding: "12px 16px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span className={`badge ${SEV_BADGE[ev.severity] || "badge-canopy"}`}>
                        {ev.event_type}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-bark)" }}>
                        {ev.depth_start}m – {ev.depth_end}m
                      </span>
                      <span style={{ fontSize: 11, color: "var(--color-muted-slate)" }}>({ev.formation})</span>
                    </div>
                    <span style={{ fontSize: 12, color: "#b91c42", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                      <Clock size={12} />
                      +{ev.npt_hours}h NPT
                    </span>
                  </div>
                  <p style={{ fontSize: 12, color: "var(--color-slate)", marginBottom: 8, lineHeight: 1.5 }}>
                    {ev.description}
                  </p>
                  <div
                    style={{
                      fontSize: 11,
                      background: "rgba(13,122,78,0.06)",
                      padding: "6px 10px",
                      borderRadius: 6,
                      border: "1px solid rgba(13,122,78,0.15)",
                      color: "var(--color-slate)",
                    }}
                  >
                    <strong style={{ color: "#0d7a4e" }}>Mitigation Applied: </strong>
                    {ev.mitigation}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Lessons */}
        {well.lessons_learned && (
          <div
            style={{
              padding: "14px 16px",
              borderRadius: 10,
              background: "rgba(16,67,54,0.04)",
              border: "1px solid rgba(16,67,54,0.14)",
              borderLeft: "3px solid var(--color-canopy)",
              marginBottom: 24,
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--color-canopy)", marginBottom: 8 }}>
              Lessons Learned
            </div>
            <p style={{ fontSize: 13, color: "var(--color-slate)", lineHeight: 1.6 }}>
              {well.lessons_learned}
            </p>
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 10,
            borderTop: "1px solid var(--color-sage-mist)",
            paddingTop: 16,
          }}
        >
          {onAskAIAboutWell && (
            <button
              className="btn-primary"
              onClick={() => { onClose(); onAskAIAboutWell(well.well_id); }}
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
