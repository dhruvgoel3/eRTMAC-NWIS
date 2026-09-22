import React, { useState } from "react";
import { Layers, Compass, ArrowRight, ShieldAlert, CheckCircle2, ChevronRight, Award } from "lucide-react";
import { SimilarWellResult, Well } from "../../types";

interface SimilarityTabProps {
  similarWells: SimilarWellResult[];
  activeWell: Well | null;
  onSelectWell: (well: SimilarWellResult) => void;
}

export const SimilarityTab: React.FC<SimilarityTabProps> = ({
  similarWells,
  activeWell,
  onSelectWell,
}) => {
  const [selectedOffset, setSelectedOffset] = useState<SimilarWellResult | null>(
    similarWells.length > 0 ? similarWells[0] : null
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Algorithm Methodology Header */}
      <div className="glass-card">
        <div className="card-header">
          <div className="card-title">
            <Award size={18} color="var(--accent-cyan)" />
            Offset Well Multi-Parameter Similarity Engine
          </div>
          <span className="badge badge-cyan">
            Active Well Reference: {activeWell?.well_id || "OIL-X123"}
          </span>
        </div>

        <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16 }}>
          The NWIS Similarity Engine analyzes offset wells in the Assam Basin using a weighted multi-variable vector matching algorithm. Wells are ranked by stratigraphic formation equivalence (35%), target depth proximity (20%), trajectory architecture (20%), mud weight design window (15%), and geographic proximity (10%).
        </p>

        {/* Weights Bar */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
          <div style={{ background: "rgba(0, 210, 255, 0.1)", padding: "8px 12px", borderRadius: "var(--radius-sm)", border: "1px solid rgba(0, 210, 255, 0.25)" }}>
            <div style={{ fontSize: 10, color: "var(--text-muted)" }}>FORMATION (35%)</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--accent-cyan)" }}>Stratigraphy</div>
          </div>
          <div style={{ background: "rgba(16, 185, 129, 0.1)", padding: "8px 12px", borderRadius: "var(--radius-sm)", border: "1px solid rgba(16, 185, 129, 0.25)" }}>
            <div style={{ fontSize: 10, color: "var(--text-muted)" }}>DEPTH (20%)</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--accent-emerald)" }}>Total Depth</div>
          </div>
          <div style={{ background: "rgba(245, 158, 11, 0.1)", padding: "8px 12px", borderRadius: "var(--radius-sm)", border: "1px solid rgba(245, 158, 11, 0.25)" }}>
            <div style={{ fontSize: 10, color: "var(--text-muted)" }}>TRAJECTORY (20%)</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--accent-amber)" }}>Well Profile</div>
          </div>
          <div style={{ background: "rgba(168, 85, 247, 0.1)", padding: "8px 12px", borderRadius: "var(--radius-sm)", border: "1px solid rgba(168, 85, 247, 0.25)" }}>
            <div style={{ fontSize: 10, color: "var(--text-muted)" }}>MUD WEIGHT (15%)</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--accent-purple)" }}>Pore Pressure</div>
          </div>
          <div style={{ background: "rgba(255, 255, 255, 0.05)", padding: "8px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)" }}>
            <div style={{ fontSize: 10, color: "var(--text-muted)" }}>SPATIAL (10%)</div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Proximity Radius</div>
          </div>
        </div>
      </div>

      {/* Main Split View: Ranked Table & Side-by-Side Comparison */}
      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 20 }}>
        {/* Left: Ranked Similar Wells Table */}
        <div className="glass-card">
          <div className="card-header">
            <div className="card-title">
              <Layers size={16} color="var(--accent-cyan)" />
              Top Ranked Offset Wells ({similarWells.length})
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {similarWells.map((item, idx) => {
              const isSelected = selectedOffset?.well_id === item.well_id;

              return (
                <div
                  key={item.well_id}
                  onClick={() => setSelectedOffset(item)}
                  style={{
                    background: isSelected ? "rgba(0, 210, 255, 0.12)" : "var(--bg-elevated)",
                    border: "1px solid " + (isSelected ? "var(--accent-cyan)" : "var(--border-subtle)"),
                    borderRadius: "var(--radius-md)",
                    padding: "12px 14px",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        background: idx === 0 ? "var(--accent-cyan)" : "rgba(255,255,255,0.08)",
                        color: idx === 0 ? "#080c14" : "var(--text-secondary)",
                        fontWeight: 700,
                        fontSize: 12,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      #{idx + 1}
                    </div>

                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <strong style={{ fontSize: 14, color: isSelected ? "var(--accent-cyan)" : "inherit" }}>
                          {item.name}
                        </strong>
                        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>({item.well_id})</span>
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
                        {item.formation} • {item.distance_km} km away • TD {item.total_depth}m • {item.trajectory_type}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: "var(--accent-cyan)" }}>
                        {item.similarity_percent}%
                      </div>
                      <div style={{ fontSize: 10, color: "var(--text-muted)" }}>MATCH SCORE</div>
                    </div>
                    <ChevronRight size={16} color="var(--text-muted)" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Side-by-Side Detailed Comparison Matrix */}
        <div className="glass-card">
          <div className="card-header">
            <div className="card-title">
              <Compass size={16} color="var(--accent-emerald)" />
              Direct Geological & Engineering Comparison
            </div>
            {selectedOffset && (
              <button
                className="btn-secondary"
                onClick={() => onSelectWell(selectedOffset)}
                style={{ padding: "4px 10px", fontSize: 11 }}
              >
                Open Full Dossier
              </button>
            )}
          </div>

          {selectedOffset ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-medium)" }}>
                    <th style={{ textAlign: "left", padding: "8px 6px", color: "var(--text-muted)" }}>
                      PARAMETER
                    </th>
                    <th style={{ textAlign: "left", padding: "8px 6px", color: "var(--accent-cyan)" }}>
                      ACTIVE ({activeWell?.well_id || "OIL-X123"})
                    </th>
                    <th style={{ textAlign: "left", padding: "8px 6px", color: "var(--accent-emerald)" }}>
                      OFFSET ({selectedOffset.well_id})
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                    <td style={{ padding: "10px 6px", color: "var(--text-muted)" }}>Formation</td>
                    <td style={{ padding: "10px 6px", fontWeight: 600 }}>{activeWell?.formation || "Tipam"}</td>
                    <td style={{ padding: "10px 6px", fontWeight: 600, color: selectedOffset.formation === activeWell?.formation ? "var(--accent-emerald)" : "inherit" }}>
                      {selectedOffset.formation}
                    </td>
                  </tr>

                  <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                    <td style={{ padding: "10px 6px", color: "var(--text-muted)" }}>Total Depth (TD)</td>
                    <td style={{ padding: "10px 6px", fontWeight: 600 }}>{activeWell?.total_depth || 3500}m</td>
                    <td style={{ padding: "10px 6px", fontWeight: 600 }}>{selectedOffset.total_depth}m</td>
                  </tr>

                  <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                    <td style={{ padding: "10px 6px", color: "var(--text-muted)" }}>Trajectory</td>
                    <td style={{ padding: "10px 6px", fontWeight: 600 }}>{activeWell?.trajectory_type || "VERTICAL"}</td>
                    <td style={{ padding: "10px 6px", fontWeight: 600 }}>{selectedOffset.trajectory_type}</td>
                  </tr>

                  <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                    <td style={{ padding: "10px 6px", color: "var(--text-muted)" }}>Mud Weight</td>
                    <td style={{ padding: "10px 6px", fontWeight: 600 }}>{activeWell?.mud_weight || 10.6} ppg</td>
                    <td style={{ padding: "10px 6px", fontWeight: 600 }}>{selectedOffset.mud_weight} ppg</td>
                  </tr>

                  <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                    <td style={{ padding: "10px 6px", color: "var(--text-muted)" }}>Distance</td>
                    <td style={{ padding: "10px 6px" }}>Reference Anchor</td>
                    <td style={{ padding: "10px 6px", fontWeight: 600, color: "var(--accent-cyan)" }}>
                      {selectedOffset.distance_km} km
                    </td>
                  </tr>

                  <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                    <td style={{ padding: "10px 6px", color: "var(--text-muted)" }}>Historical Incidents</td>
                    <td style={{ padding: "10px 6px" }}>Currently Active</td>
                    <td style={{ padding: "10px 6px", fontWeight: 600, color: selectedOffset.event_count > 0 ? "var(--accent-rose)" : "var(--accent-emerald)" }}>
                      {selectedOffset.event_count} Events ({selectedOffset.total_npt}h NPT)
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Historical Incidents Summary */}
              <div
                style={{
                  background: "var(--bg-elevated)",
                  padding: 14,
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                  <ShieldAlert size={14} color="var(--accent-amber)" />
                  Documented Risks on {selectedOffset.well_id} to Watch For:
                </div>

                {selectedOffset.well_id === "OIL-X104" ? (
                  <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                    <strong>OIL-X104</strong> is the primary analogue well drilled 6.2 km away. At 3,110m, drillers experienced severe fluid loss into a depleted sand body. Drilling continued with LCM pills until 3,275m where differential sticking occurred requiring jarring and spotting a pipe-freeing pill (16h NPT).
                  </p>
                ) : (
                  <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                    Historical logs indicate stable pore pressures in the upper intervals with moderate torque spikes observed near target formation interface. Recommended to maintain continuous rotation during trips.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div style={{ padding: 30, textAlign: "center", color: "var(--text-muted)" }}>
              Select an offset well on the left to inspect comparative parameters.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
