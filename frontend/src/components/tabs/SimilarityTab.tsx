import React, { useState } from "react";
import { Layers, Compass, ShieldAlert, ChevronRight, Award, ExternalLink } from "lucide-react";
import { SimilarWellResult, Well } from "../../types";

interface SimilarityTabProps {
  similarWells: SimilarWellResult[];
  activeWell: Well | null;
  onSelectWell: (well: SimilarWellResult) => void;
}

const WEIGHTS = [
  { label: "Formation",  pct: "35%", sub: "Stratigraphy",     color: "var(--color-canopy)" },
  { label: "Depth",      pct: "20%", sub: "Total Depth",       color: "#0d7a4e" },
  { label: "Trajectory", pct: "20%", sub: "Well Profile",      color: "#c47d0e" },
  { label: "Mud Weight", pct: "15%", sub: "Pore Pressure",     color: "var(--color-orb-violet)" },
  { label: "Spatial",    pct: "10%", sub: "Proximity Radius",  color: "var(--color-muted-slate)" },
];

export const SimilarityTab: React.FC<SimilarityTabProps> = ({
  similarWells,
  activeWell,
  onSelectWell,
}) => {
  const [selectedOffset, setSelectedOffset] = useState<SimilarWellResult | null>(
    similarWells.length > 0 ? similarWells[0] : null
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* Algorithm Header */}
      <div className="glass-card">
        <div className="card-header">
          <div className="card-title">
            <Award size={16} color="var(--color-orb-violet)" />
            Offset Well Multi-Parameter Similarity Engine
          </div>
          <span className="badge badge-canopy">
            Reference: {activeWell?.well_id || "OIL-X123"}
          </span>
        </div>

        <p style={{ fontSize: 13, color: "var(--color-slate)", marginBottom: 20, lineHeight: 1.6 }}>
          NWIS ranks offset wells using a weighted multi-variable vector algorithm: stratigraphic formation equivalence (35%), target depth proximity (20%), trajectory architecture (20%), mud weight design window (15%), and geographic proximity (10%).
        </p>

        {/* Weight bars */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
          {WEIGHTS.map((w) => (
            <div
              key={w.label}
              style={{
                padding: "12px 14px",
                borderRadius: 8,
                background: "var(--bg-elevated)",
                border: "1px solid var(--color-sage-mist)",
                borderTop: `3px solid ${w.color}`,
              }}
            >
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--color-muted-slate)", marginBottom: 4 }}>
                {w.label} ({w.pct})
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: w.color }}>{w.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Split */}
      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 20 }}>

        {/* Ranked List */}
        <div className="glass-card">
          <div className="card-header">
            <div className="card-title">
              <Layers size={16} color="var(--color-canopy)" />
              Ranked Offset Wells ({similarWells.length})
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {similarWells.map((item, idx) => {
              const isSelected = selectedOffset?.well_id === item.well_id;
              return (
                <div
                  key={item.well_id}
                  onClick={() => setSelectedOffset(item)}
                  style={{
                    padding: "12px 14px",
                    borderRadius: 8,
                    border: "1px solid",
                    borderColor: isSelected ? "var(--color-canopy)" : "var(--color-sage-mist)",
                    background: isSelected ? "rgba(16,67,54,0.06)" : "var(--bg-elevated)",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    {/* Rank badge */}
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        background: idx === 0 ? "var(--color-canopy)" : "var(--color-pale-sage)",
                        color: idx === 0 ? "white" : "var(--color-slate)",
                        fontWeight: 700,
                        fontSize: 11,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      #{idx + 1}
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <strong style={{ fontSize: 13, color: isSelected ? "var(--color-canopy)" : "var(--color-bark)" }}>
                          {item.name}
                        </strong>
                        <span style={{ fontSize: 11, color: "var(--color-muted-slate)" }}>
                          ({item.well_id})
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: "var(--color-muted-slate)", marginTop: 2 }}>
                        {item.formation} • {item.distance_km} km • TD {item.total_depth}m
                      </div>
                      {/* Mini similarity bar */}
                      <div style={{ height: 3, width: 120, background: "var(--color-pale-sage)", borderRadius: 2, marginTop: 6 }}>
                        <div style={{ height: "100%", width: `${item.similarity_percent}%`, background: "var(--color-canopy)", borderRadius: 2 }} />
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 18, fontWeight: 600, color: "var(--color-canopy)", letterSpacing: "-0.02em" }}>
                        {item.similarity_percent}%
                      </div>
                      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--color-muted-slate)" }}>
                        Match
                      </div>
                    </div>
                    <ChevronRight size={14} color="var(--color-sage-mist)" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Comparison Panel */}
        <div className="glass-card">
          <div className="card-header">
            <div className="card-title">
              <Compass size={16} color="var(--color-canopy)" />
              Geological &amp; Engineering Comparison
            </div>
            {selectedOffset && (
              <button
                className="btn-primary"
                onClick={() => onSelectWell(selectedOffset)}
                style={{ padding: "5px 10px", fontSize: 11 }}
              >
                <ExternalLink size={12} />
                Full Dossier
              </button>
            )}
          </div>

          {selectedOffset ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Comparison table */}
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--color-sage-mist)" }}>
                    <th style={{ textAlign: "left", padding: "8px 6px", color: "var(--color-muted-slate)", fontSize: 10, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase" }}>Parameter</th>
                    <th style={{ textAlign: "left", padding: "8px 6px", color: "var(--color-canopy)", fontSize: 10, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase" }}>Active ({activeWell?.well_id || "OIL-X123"})</th>
                    <th style={{ textAlign: "left", padding: "8px 6px", color: "var(--color-orb-violet)", fontSize: 10, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase" }}>Offset ({selectedOffset.well_id})</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { param: "Formation",     active: activeWell?.formation || "Tipam",               offset: selectedOffset.formation,       match: selectedOffset.formation === activeWell?.formation },
                    { param: "Total Depth",   active: `${activeWell?.total_depth || 3500}m`,          offset: `${selectedOffset.total_depth}m`, match: false },
                    { param: "Trajectory",    active: activeWell?.trajectory_type || "VERTICAL",      offset: selectedOffset.trajectory_type,  match: false },
                    { param: "Mud Weight",    active: `${activeWell?.mud_weight || 10.6} ppg`,        offset: `${selectedOffset.mud_weight} ppg`, match: false },
                    { param: "Distance",      active: "Reference",                                    offset: `${selectedOffset.distance_km} km`, match: false },
                    { param: "Incidents",     active: "Currently Active",                             offset: `${selectedOffset.event_count} events (${selectedOffset.total_npt}h NPT)`, match: false },
                  ].map((row) => (
                    <tr key={row.param} style={{ borderBottom: "1px solid var(--color-sage-mist)" }}>
                      <td style={{ padding: "10px 6px", color: "var(--color-muted-slate)" }}>{row.param}</td>
                      <td style={{ padding: "10px 6px", fontWeight: 500, color: "var(--color-bark)" }}>{row.active}</td>
                      <td style={{ padding: "10px 6px", fontWeight: 500, color: row.match ? "#0d7a4e" : "var(--color-bark)" }}>
                        {row.match && <span style={{ marginRight: 4 }}>✓</span>}
                        {row.offset}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Risk note */}
              <div
                style={{
                  padding: "12px 14px",
                  borderRadius: 8,
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--color-sage-mist)",
                  borderLeft: "3px solid #b91c42",
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-bark)", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                  <ShieldAlert size={13} color="#c47d0e" />
                  Documented Risks on {selectedOffset.well_id}:
                </div>
                <p style={{ fontSize: 12, color: "var(--color-slate)", lineHeight: 1.6 }}>
                  {selectedOffset.well_id === "OIL-X104"
                    ? "Primary analogue well 6.2 km away. At 3,110m — severe fluid loss into depleted sand body. At 3,275m — differential sticking requiring 16h NPT and pipe-freeing pill."
                    : "Historical logs show stable pore pressures in upper intervals with moderate torque spikes near formation interface. Maintain continuous rotation during trips."}
                </p>
              </div>
            </div>
          ) : (
            <div style={{ padding: 40, textAlign: "center", color: "var(--color-muted-slate)" }}>
              Select an offset well on the left to compare parameters.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
