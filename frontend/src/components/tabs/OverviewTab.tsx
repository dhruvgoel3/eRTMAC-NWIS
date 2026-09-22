import React from "react";
import {
  Activity,
  AlertTriangle,
  Compass,
  Layers,
  ShieldCheck,
  TrendingUp,
  ExternalLink,
  ChevronRight,
  Info,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { DashboardData, Well, SimilarWellResult } from "../../types";

interface OverviewTabProps {
  data: DashboardData | null;
  onSelectWell: (well: Well | SimilarWellResult) => void;
  onNavigateToTab: (tab: string) => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  data,
  onSelectWell,
  onNavigateToTab,
}) => {
  if (!data) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>
        Loading live operations dashboard...
      </div>
    );
  }

  const sim = data.simulation;
  const currentDepth = sim.current_depth;
  const riskZones = data.risk_zones || [];
  const topSimilar = data.top_similar_well;

  // Helpers for API field name normalization
  const getRiskLabel = (z: any) =>
    ((z.risk_type || z.event_type || "UNKNOWN") as string).replace(/_/g, " ");
  const getSourceWells = (z: any): string[] =>
    z.source_wells?.length ? z.source_wells : (z.source_well_ids?.map((id: number) => `Well #${id}`) ?? []);
  const getExplanation = (z: any): string =>
    z.recommended_action || z.explanation || "";

  // Next risk zone ahead
  const upcomingZones = riskZones.filter((z) => z.depth_start > currentDepth);
  const nextZone = upcomingZones.length > 0 ? upcomingZones[0] : null;
  const distanceToNext = nextZone ? (nextZone.depth_start - currentDepth).toFixed(1) : null;

  // Active risk zone right now
  const activeZone = riskZones.find(
    (z) => currentDepth >= z.depth_start && currentDepth <= z.depth_end
  );

  // Generate synthetic parameter trace data for the depth chart around current depth
  const chartData = [
    { depth: (currentDepth - 40).toFixed(0), rop: 14.1, torque: 16.2, pressure: 2820 },
    { depth: (currentDepth - 30).toFixed(0), rop: 13.8, torque: 17.0, pressure: 2840 },
    { depth: (currentDepth - 20).toFixed(0), rop: 13.2, torque: 17.5, pressure: 2850 },
    { depth: (currentDepth - 10).toFixed(0), rop: 12.8, torque: 17.9, pressure: 2860 },
    { depth: currentDepth.toFixed(0), rop: sim.current_rop, torque: sim.current_torque, pressure: sim.current_pressure },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Top Banner: Hazard Proximity Alert Horizon */}
      <div
        className="glass-card"
        style={{
          background: activeZone
            ? "linear-gradient(90deg, rgba(244,63,94,0.18) 0%, rgba(13,20,36,0.9) 100%)"
            : nextZone && Number(distanceToNext) < 50
            ? "linear-gradient(90deg, rgba(245,158,11,0.18) 0%, rgba(13,20,36,0.9) 100%)"
            : "linear-gradient(90deg, rgba(16,185,129,0.15) 0%, rgba(13,20,36,0.9) 100%)",
          borderColor: activeZone
            ? "rgba(244,63,94,0.4)"
            : nextZone && Number(distanceToNext) < 50
            ? "rgba(245,158,11,0.4)"
            : "rgba(16,185,129,0.4)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: activeZone
                  ? "rgba(244,63,94,0.25)"
                  : nextZone && Number(distanceToNext) < 50
                  ? "rgba(245,158,11,0.25)"
                  : "rgba(16,185,129,0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: activeZone
                  ? "var(--accent-rose)"
                  : nextZone && Number(distanceToNext) < 50
                  ? "var(--accent-amber)"
                  : "var(--accent-emerald)",
              }}
            >
              <AlertTriangle size={24} />
            </div>

            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span
                  className={`badge ${
                    activeZone
                      ? "badge-rose"
                      : nextZone && Number(distanceToNext) < 50
                      ? "badge-amber"
                      : "badge-emerald"
                  }`}
                >
                  {activeZone ? "CRITICAL HAZARD ZONE ACTIVE" : "NEARBY WELLS HAZARD RADAR"}
                </span>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  Institutional Offset Knowledge from {data.nearby_well_count} Offset Wells
                </span>
              </div>

              <div style={{ fontSize: 15, fontWeight: 700, marginTop: 4 }}>
                {activeZone ? (
                  <>
                    🚨 ACTIVE RISK: Drilling inside {getRiskLabel(activeZone)} window ({activeZone.depth_start}m – {activeZone.depth_end}m) in {activeZone.formation} Formation.
                  </>
                ) : nextZone ? (
                  <>
                    ⚠️ UPCOMING HAZARD: {getRiskLabel(nextZone)} expected at {nextZone.depth_start}m ({distanceToNext}m ahead). Correlated from {getSourceWells(nextZone).join(", ")}.
                  </>
                ) : (
                  <>
                    ✅ Clear trajectory. No historical offset anomalies identified within the next 300m window.
                  </>
                )}
              </div>

              <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
                {(activeZone ? getExplanation(activeZone) : "") ||
                  (nextZone ? getExplanation(nextZone) : "") ||
                  "Maintain standard drilling parameters. Monitor mud weight and ECD."}
              </div>
            </div>
          </div>

          <button
            className="btn-secondary"
            onClick={() => onNavigateToTab("map")}
            style={{ whiteSpace: "nowrap" }}
          >
            Inspect on GIS Map
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Main 2-Column Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 20 }}>
        {/* Left Column: Stratigraphic Depth Horizon & Charts */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Stratigraphic Depth Horizon */}
          <div className="glass-card">
            <div className="card-header">
              <div className="card-title">
                <Layers size={18} color="var(--accent-cyan)" />
                Stratigraphic Horizon & Offset Risk Timeline
              </div>
              <span className="badge badge-cyan">Depth Profile: 2,800m – 3,600m</span>
            </div>

            {/* Depth Visualizer Bar */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div
                style={{
                  position: "relative",
                  height: 38,
                  background: "#080c14",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-medium)",
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {/* Risk zones plotted proportionally between 2800m and 3600m (total span 800m) */}
                {riskZones.map((z) => {
                  const span = 3600 - 2800;
                  const left = Math.max(0, ((z.depth_start - 2800) / span) * 100);
                  const width = Math.min(100 - left, ((z.depth_end - z.depth_start) / span) * 100);
                  const isCurrent = currentDepth >= z.depth_start && currentDepth <= z.depth_end;

                  return (
                    <div
                      key={z.id}
                      title={`${getRiskLabel(z)} (${z.depth_start}-${z.depth_end}m)`}
                      style={{
                        position: "absolute",
                        left: `${left}%`,
                        width: `${width}%`,
                        height: "100%",
                        background:
                          z.severity === "CRITICAL"
                            ? "rgba(244,63,94,0.4)"
                            : z.severity === "HIGH"
                            ? "rgba(245,158,11,0.4)"
                            : "rgba(56,189,248,0.3)",
                        borderLeft: "2px solid " + (z.severity === "CRITICAL" ? "#f43f5e" : "#f59e0b"),
                        borderRight: "2px solid " + (z.severity === "CRITICAL" ? "#f43f5e" : "#f59e0b"),
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 10,
                        fontWeight: 700,
                        color: "white",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        padding: "0 4px",
                      }}
                    >
                      {getRiskLabel(z)}
                    </div>
                  );
                })}

                {/* Current Bit Position Needle */}
                <div
                  style={{
                    position: "absolute",
                    left: `${Math.min(100, Math.max(0, ((currentDepth - 2800) / 800) * 100))}%`,
                    top: 0,
                    bottom: 0,
                    width: 3,
                    background: "var(--accent-cyan)",
                    boxShadow: "0 0 10px #00d2ff",
                    zIndex: 10,
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: -6,
                      left: -5,
                      width: 13,
                      height: 13,
                      borderRadius: "50%",
                      background: "var(--accent-cyan)",
                      boxShadow: "0 0 8px #00d2ff",
                    }}
                  />
                </div>
              </div>

              {/* Legend & Current Depth Callout */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: 12,
                  color: "var(--text-muted)",
                }}
              >
                <span>2,800m</span>
                <span style={{ color: "var(--accent-cyan)", fontWeight: 700 }}>
                  CURRENT BIT DEPTH: {currentDepth.toFixed(1)}m (Tipam)
                </span>
                <span>3,600m</span>
              </div>
            </div>

            {/* List of Correlated Risk Windows */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16 }}>
              {riskZones.map((z) => {
                const isPassed = currentDepth > z.depth_end;
                const isCurrent = currentDepth >= z.depth_start && currentDepth <= z.depth_end;
                const isUpcoming = currentDepth < z.depth_start;

                return (
                  <div
                    key={z.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 14px",
                      borderRadius: "var(--radius-sm)",
                      background: isCurrent
                        ? "rgba(244,63,94,0.15)"
                        : "rgba(255,255,255,0.03)",
                      border: "1px solid " + (isCurrent ? "rgba(244,63,94,0.4)" : "var(--border-subtle)"),
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span
                        className={`badge ${
                          z.severity === "CRITICAL"
                            ? "badge-rose"
                            : z.severity === "HIGH"
                            ? "badge-amber"
                            : "badge-cyan"
                        }`}
                      >
                        {z.severity}
                      </span>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>
                          {z.depth_start}m – {z.depth_end}m: {getRiskLabel(z)}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                          Source Offset Wells: {getSourceWells(z).join(", ")}
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: isCurrent
                            ? "var(--accent-rose)"
                            : isUpcoming
                            ? "var(--accent-amber)"
                            : "var(--text-muted)",
                        }}
                      >
                        {isCurrent ? "● ACTIVE NOW" : isUpcoming ? `▲ In ${(z.depth_start - currentDepth).toFixed(0)}m` : "✓ PASSED"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Telemetry Trend Chart */}
          <div className="glass-card">
            <div className="card-header">
              <div className="card-title">
                <TrendingUp size={18} color="var(--accent-emerald)" />
                Real-Time Parameter Profile vs Depth
              </div>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                ROP (m/h) & SPP (psi/100)
              </span>
            </div>

            <div style={{ height: 210, width: "100%" }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="depth" stroke="var(--text-muted)" fontSize={11} unit="m" />
                  <YAxis stroke="var(--text-muted)" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      background: "#0d1527",
                      border: "1px solid var(--border-medium)",
                      borderRadius: 6,
                    }}
                  />
                  <Line type="monotone" dataKey="rop" stroke="#34d399" strokeWidth={2} name="ROP (m/hr)" />
                  <Line type="monotone" dataKey="torque" stroke="#f59e0b" strokeWidth={2} name="Torque (kft-lb)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right Column: Top Offset Well Match + Mitigations */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Top Correlated Offset Well */}
          {topSimilar && (
            <div className="glass-card">
              <div className="card-header">
                <div className="card-title">
                  <Compass size={18} color="var(--accent-cyan)" />
                  Highest Correlated Offset Well
                </div>
                <span className="badge badge-cyan">
                  {topSimilar.similarity_percent}% MATCH
                </span>
              </div>

              <div
                style={{
                  background: "var(--bg-elevated)",
                  padding: 16,
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 700 }}>{topSimilar.name}</h3>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                      {topSimilar.well_id} • Distance: {topSimilar.distance_km} km • Formation: {topSimilar.formation}
                    </div>
                  </div>
                  <button
                    className="btn-secondary"
                    onClick={() => onSelectWell(topSimilar)}
                    style={{ padding: "6px 12px", fontSize: 12 }}
                  >
                    Dossier
                    <ExternalLink size={12} />
                  </button>
                </div>

                {/* Similarity Breakdown Bars */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
                  <div style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 600 }}>
                    SIMILARITY FACTORS BREAKDOWN:
                  </div>

                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
                      <span>Formation Match (Tipam)</span>
                      <strong style={{ color: "var(--accent-cyan)" }}>
                        {topSimilar.score_breakdown.formation_match}%
                      </strong>
                    </div>
                    <div style={{ height: 4, background: "#1e293b", borderRadius: 2 }}>
                      <div
                        style={{
                          height: "100%",
                          width: `${topSimilar.score_breakdown.formation_match}%`,
                          background: "var(--accent-cyan)",
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
                      <span>Depth Proximity (Total Depth Match)</span>
                      <strong style={{ color: "var(--accent-emerald)" }}>
                        {topSimilar.score_breakdown.depth_proximity}%
                      </strong>
                    </div>
                    <div style={{ height: 4, background: "#1e293b", borderRadius: 2 }}>
                      <div
                        style={{
                          height: "100%",
                          width: `${topSimilar.score_breakdown.depth_proximity}%`,
                          background: "var(--accent-emerald)",
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
                      <span>Mud Weight Compatibility</span>
                      <strong style={{ color: "#f59e0b" }}>
                        {topSimilar.score_breakdown.mud_weight_match}%
                      </strong>
                    </div>
                    <div style={{ height: 4, background: "#1e293b", borderRadius: 2 }}>
                      <div
                        style={{
                          height: "100%",
                          width: `${topSimilar.score_breakdown.mud_weight_match}%`,
                          background: "#f59e0b",
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* NPT Incidents on Top Similar Well */}
                <div
                  style={{
                    marginTop: 14,
                    padding: 10,
                    background: "rgba(244,63,94,0.1)",
                    border: "1px solid rgba(244,63,94,0.2)",
                    borderRadius: "var(--radius-sm)",
                    fontSize: 12,
                  }}
                >
                  <strong style={{ color: "var(--accent-rose)" }}>Historical Warning: </strong>
                  {topSimilar.well_id} encountered severe mud loss at 3,110m (lost 45 bbls/hr) and differential stuck pipe at 3,275m resulting in 24.5 hrs NPT.
                </div>
              </div>
            </div>
          )}

          {/* Institutional Knowledge Quick Playbook */}
          <div className="glass-card">
            <div className="card-header">
              <div className="card-title">
                <ShieldCheck size={18} color="var(--accent-emerald)" />
                Recommended Operating Parameters
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div
                style={{
                  background: "var(--bg-elevated)",
                  padding: 12,
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase" }}>
                  MUD WEIGHT WINDOW
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--accent-cyan)", marginTop: 2 }}>
                  10.4 – 10.8 ppg (Optimum 10.6 ppg)
                </div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>
                  Offset wells drilled below 10.4 ppg experienced borehole instability; above 10.9 ppg triggered mud loss in fractured sand layers.
                </div>
              </div>

              <div
                style={{
                  background: "var(--bg-elevated)",
                  padding: 12,
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase" }}>
                  PREVENTIVE LCM PILL READINESS
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--accent-emerald)", marginTop: 2 }}>
                  25 bbls Mica/Nut Plug Pill on Standby
                </div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>
                  Proven effective on OIL-X104 and OIL-X101 to regain circulation within 2 hours without cementing.
                </div>
              </div>

              <div
                style={{
                  background: "var(--bg-elevated)",
                  padding: 12,
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase" }}>
                  DRILL STRING TORQUE MANAGEMENT
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#f59e0b", marginTop: 2 }}>
                  Limit WOB to 16 klbs through 3,180m–3,240m
                </div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>
                  High dogleg severity observed in offset directional trajectories causing keyseating risk.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
