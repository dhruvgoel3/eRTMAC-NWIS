import React, { useState } from "react";
import {
  Activity,
  AlertTriangle,
  Compass,
  Layers,
  ShieldCheck,
  TrendingUp,
  ChevronRight,
  MapPin,
  Zap,
  BarChart2,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { DashboardData, Well, SimilarWellResult } from "../../types";
import { INITIAL_DASHBOARD_DATA } from "../../constants/initialData";

interface OverviewTabProps {
  data: DashboardData | null;
  onSelectWell: (well: Well | SimilarWellResult) => void;
  onNavigateToTab: (tab: string) => void;
  onExplainAlert?: (alert?: any) => void;
}

const SEV_BADGE: Record<string, string> = {
  CRITICAL: "badge-rose",
  HIGH: "badge-amber",
  MEDIUM: "badge-amber",
  LOW: "badge-emerald",
};

const SEV_LEFT: Record<string, string> = {
  CRITICAL: "#b91c42",
  HIGH:     "#f97316",
  MEDIUM:   "#c47d0e",
  LOW:      "#0d7a4e",
};

export const OverviewTab: React.FC<OverviewTabProps> = ({
  data: propData,
  onSelectWell,
  onNavigateToTab,
  onExplainAlert,
}) => {
  const data = propData || INITIAL_DASHBOARD_DATA;



  const sim = data.simulation;
  const currentDepth = sim.current_depth;
  const riskZones = data.risk_zones || [];
  const topSimilar = data.top_similar_well;
  const [expandedZoneId, setExpandedZoneId] = useState<number | null>(null);

  const getRiskLabel = (z: any) =>
    ((z.risk_type || z.event_type || "UNKNOWN") as string).replace(/_/g, " ");
  const getSourceWells = (z: any): string[] =>
    z.source_wells?.length
      ? z.source_wells
      : (z.source_well_ids?.map((id: number) => `Well #${id}`) ?? []);
  const getExplanation = (z: any): string =>
    z.recommended_action || z.explanation || "";

  const upcomingZones = riskZones.filter((z) => z.depth_start > currentDepth);
  const nextZone = upcomingZones.length > 0 ? upcomingZones[0] : null;
  const distanceToNext = nextZone ? (nextZone.depth_start - currentDepth).toFixed(1) : null;
  const activeZone = riskZones.find(
    (z) => currentDepth >= z.depth_start && currentDepth <= z.depth_end
  );

  const chartData = [
    { depth: (currentDepth - 40).toFixed(0), rop: 14.1, torque: 16.2 },
    { depth: (currentDepth - 30).toFixed(0), rop: 13.8, torque: 17.0 },
    { depth: (currentDepth - 20).toFixed(0), rop: 13.2, torque: 17.5 },
    { depth: (currentDepth - 10).toFixed(0), rop: 12.8, torque: 17.9 },
    { depth: currentDepth.toFixed(0), rop: sim.current_rop, torque: sim.current_torque },
  ];

  // KPI data
  const kpis = [
    {
      label: "Nearby Offset Wells",
      value: data.kpis?.nearby_wells_count ?? data.nearby_well_count ?? "—",
      icon: <MapPin size={18} />,
      color: "var(--color-canopy)",
    },
    {
      label: "Historical Events",
      value: data.kpis?.historical_events_count ?? data.total_historical_events_nearby ?? "—",
      icon: <Activity size={18} />,
      color: "#c47d0e",
    },
    {
      label: "High Risk Zones",
      value: data.kpis?.high_risk_zones_count ?? data.high_risk_zone_count ?? riskZones.filter(z => z.severity === "CRITICAL" || z.severity === "HIGH").length,
      icon: <AlertTriangle size={18} />,
      color: "#b91c42",
    },
    {
      label: "Top Similarity Score",
      value: topSimilar ? `${topSimilar.similarity_percent}%` : "—",
      icon: <Compass size={18} />,
      color: "var(--color-orb-violet)",
    },
  ];

  // Hazard banner props
  const hazardSev = activeZone ? "CRITICAL" : (nextZone && Number(distanceToNext) < 50 ? "HIGH" : "OK");
  const hazardBg =
    hazardSev === "CRITICAL" ? "rgba(185,28,66,0.06)" :
    hazardSev === "HIGH"     ? "rgba(196,125,14,0.06)" :
                               "rgba(13,122,78,0.06)";
  const hazardBorder =
    hazardSev === "CRITICAL" ? "rgba(185,28,66,0.22)" :
    hazardSev === "HIGH"     ? "rgba(196,125,14,0.22)" :
                               "rgba(13,122,78,0.22)";
  const hazardIconColor =
    hazardSev === "CRITICAL" ? "#b91c42" :
    hazardSev === "HIGH"     ? "#c47d0e" :
                               "#0d7a4e";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* ── KPI Stat Row ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        {kpis.map((k) => (
          <div
            key={k.label}
            className="glass-card"
            style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 12 }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.07em",
                  textTransform: "uppercase",
                  color: "var(--color-muted-slate)",
                }}
              >
                {k.label}
              </span>
              <span style={{ color: k.color, opacity: 0.7 }}>{k.icon}</span>
            </div>
            <div
              style={{
                fontSize: 36,
                fontWeight: 500,
                color: k.color,
                lineHeight: 1,
                letterSpacing: "-0.02em",
              }}
            >
              {k.value}
            </div>
          </div>
        ))}
      </div>

      {/* ── Hazard Horizon Banner ── */}
      <div
        className="glass-card"
        style={{
          background: hazardBg,
          borderColor: hazardBorder,
          padding: "20px 24px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: hazardSev === "CRITICAL" ? "rgba(185,28,66,0.12)" : hazardSev === "HIGH" ? "rgba(196,125,14,0.12)" : "rgba(13,122,78,0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: hazardIconColor,
                flexShrink: 0,
              }}
            >
              <AlertTriangle size={22} />
            </div>

            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                <span className={`badge ${hazardSev === "CRITICAL" ? "badge-rose" : hazardSev === "HIGH" ? "badge-amber" : "badge-emerald"}`}>
                  {activeZone ? "CRITICAL HAZARD ZONE ACTIVE" : "NEARBY WELLS HAZARD RADAR"}
                </span>
                <span style={{ fontSize: 12, color: "var(--color-muted-slate)" }}>
                  {data.nearby_well_count ?? "—"} offset well correlated
                </span>
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-bark)", marginBottom: 4 }}>
                {activeZone
                  ? `⚠ ACTIVE RISK: Drilling inside ${getRiskLabel(activeZone)} window (${activeZone.depth_start}m – ${activeZone.depth_end}m) in ${activeZone.formation} Formation.`
                  : nextZone
                  ? `▲ UPCOMING: ${getRiskLabel(nextZone)} at ${nextZone.depth_start}m — ${distanceToNext}m ahead. Correlated from ${getSourceWells(nextZone).slice(0,3).join(", ")}.`
                  : "✓ Clear trajectory — no offset anomalies within next 300m window."}
              </div>
              <div style={{ fontSize: 12, color: "var(--color-slate)" }}>
                {(activeZone ? getExplanation(activeZone) : "") ||
                  (nextZone ? getExplanation(nextZone) : "") ||
                  "Maintain standard drilling parameters. Monitor mud weight and ECD."}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {onExplainAlert && (activeZone || nextZone) && (() => {
              const tz = activeZone || nextZone;
              if (!tz) return null;
              return (
                <button
                  className="btn-secondary"
                  onClick={() =>
                    onExplainAlert({
                      id: tz.id,
                      depth: tz.depth_start,
                      message: activeZone
                        ? `Active ${getRiskLabel(tz)} Hazard (${tz.depth_start}m–${tz.depth_end}m)`
                        : `Upcoming ${getRiskLabel(tz)} Risk (${tz.depth_start}m)`,
                      severity: tz.severity,
                      explanation: getExplanation(tz),
                    })
                  }
                  style={{
                    whiteSpace: "nowrap",
                    background: "rgba(16, 67, 54, 0.08)",
                    borderColor: "var(--color-canopy)",
                    color: "var(--color-canopy)",
                    fontWeight: 600,
                  }}
                >
                  Why am I seeing this alert?
                </button>
              );
            })()}
            <button className="btn-secondary" onClick={() => onNavigateToTab("map")} style={{ whiteSpace: "nowrap" }}>
              Inspect on GIS Map
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Main 2-Col Grid ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1.25fr 1fr", gap: 24 }}>

        {/* Left: Depth Horizon + Chart */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Stratigraphic Depth Horizon */}
          <div className="glass-card">
            <div className="card-header">
              <div className="card-title">
                <Layers size={16} color="var(--color-canopy)" />
                Stratigraphic Horizon &amp; Offset Risk Timeline
              </div>
              <span className="badge badge-canopy">2,800m – 3,600m</span>
            </div>

            {/* Depth bar */}
            <div className="depth-bar-track">
              {riskZones.map((z) => {
                const span = 800;
                const left = Math.max(0, ((z.depth_start - 2800) / span) * 100);
                const width = Math.min(100 - left, ((z.depth_end - z.depth_start) / span) * 100);
                return (
                  <div
                    key={z.id}
                    title={`${getRiskLabel(z)} (${z.depth_start}–${z.depth_end}m)`}
                    style={{
                      position: "absolute",
                      left: `${left}%`,
                      width: `${width}%`,
                      height: "100%",
                      background:
                        z.severity === "CRITICAL" ? "rgba(185,28,66,0.18)" :
                        z.severity === "HIGH"     ? "rgba(249,115,22,0.18)" :
                        "rgba(16,67,54,0.12)",
                      borderLeft: `2px solid ${SEV_LEFT[z.severity] || "#afc4bf"}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 9,
                      fontWeight: 700,
                      color: SEV_LEFT[z.severity] || "var(--color-canopy)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      padding: "0 4px",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {getRiskLabel(z)}
                  </div>
                );
              })}
              {/* Bit position needle */}
              <div
                style={{
                  position: "absolute",
                  left: `${Math.min(100, Math.max(0, ((currentDepth - 2800) / 800) * 100))}%`,
                  top: 0,
                  bottom: 0,
                  width: 2,
                  background: "var(--color-canopy)",
                  zIndex: 10,
                }}
              >
                <div style={{
                  position: "absolute",
                  top: -5,
                  left: -5,
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  background: "var(--color-canopy)",
                  border: "2px solid var(--color-sheet-white)",
                }} />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--color-muted-slate)", marginTop: 6 }}>
              <span>2,800m</span>
              <strong style={{ color: "var(--color-canopy)" }}>
                BIT DEPTH: {currentDepth.toFixed(1)}m (Tipam)
              </strong>
              <span>3,600m</span>
            </div>

            {/* Risk zone list */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 20 }}>
              {riskZones.map((z) => {
                const isPassed = currentDepth > z.depth_end;
                const isCurrent = currentDepth >= z.depth_start && currentDepth <= z.depth_end;
                const isUpcoming = currentDepth < z.depth_start;
                const isExpanded = expandedZoneId === z.id;
                return (
                  <div
                    key={z.id}
                    onClick={() => setExpandedZoneId(isExpanded ? null : z.id)}
                    style={{
                      borderRadius: 8,
                      background: isCurrent ? "rgba(185,28,66,0.06)" : "var(--bg-elevated)",
                      border: `1px solid ${isCurrent ? "rgba(185,28,66,0.22)" : "var(--color-sage-mist)"}`,
                      borderLeft: `3px solid ${SEV_LEFT[z.severity] || "#afc4bf"}`,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 14px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span className={`badge ${SEV_BADGE[z.severity] || "badge-canopy"}`}>
                          {z.severity}
                        </span>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13, color: "var(--color-bark)" }}>
                            {z.depth_start}m – {z.depth_end}m: {getRiskLabel(z)}
                          </div>
                          <div style={{ fontSize: 11, color: "var(--color-muted-slate)" }}>
                            Source: {getSourceWells(z).join(", ")}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: isCurrent ? "#b91c42" : isUpcoming ? "#c47d0e" : "var(--color-muted-slate)",
                        }}>
                          {isCurrent ? "● ACTIVE" : isUpcoming ? `▲ In ${(z.depth_start - currentDepth).toFixed(0)}m` : "✓ PASSED"}
                        </span>
                        <ChevronRight
                          size={14}
                          color="var(--color-muted-slate)"
                          style={{
                            transform: isExpanded ? "rotate(90deg)" : "none",
                            transition: "transform 0.15s ease",
                          }}
                        />
                      </div>
                    </div>

                    {/* Expandable Explanation & Reason Breakdown */}
                    {isExpanded && (
                      <div
                        style={{
                          padding: "12px 14px 14px",
                          borderTop: "1px solid var(--color-sage-mist)",
                          background: "#fff",
                          fontSize: 12,
                          lineHeight: 1.6,
                        }}
                      >
                        <div style={{ whiteSpace: "pre-line", color: "var(--color-bark)", fontFamily: "inherit" }}>
                          {z.explanation || `${z.severity} HISTORICAL RISK\nReason:\n• Historical offset events detected in ${z.formation} at this depth interval.`}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Telemetry Chart */}
          <div className="glass-card">
            <div className="card-header">
              <div className="card-title">
                <TrendingUp size={16} color="var(--color-canopy)" />
                Real-Time Parameter Profile vs Depth
              </div>
              <span style={{ fontSize: 11, color: "var(--color-muted-slate)" }}>
                ROP (m/h) &amp; Torque (kft-lb)
              </span>
            </div>
            <div style={{ height: 200, width: "100%" }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="4 4" stroke="var(--color-sage-mist)" strokeOpacity={0.5} />
                  <XAxis dataKey="depth" stroke="var(--color-muted-slate)" fontSize={11} unit="m" />
                  <YAxis stroke="var(--color-muted-slate)" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-sheet-white)",
                      border: "1px solid var(--color-sage-mist)",
                      borderRadius: 8,
                      color: "var(--color-bark)",
                      fontSize: 12,
                    }}
                  />
                  <Line type="monotone" dataKey="rop" stroke="var(--color-canopy)" strokeWidth={2.5} name="ROP (m/hr)" dot={false} />
                  <Line type="monotone" dataKey="torque" stroke="#c47d0e" strokeWidth={2} name="Torque (kft-lb)" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right: Top Similar Well + Operating Parameters */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Top Correlated Offset Well */}
          {topSimilar && (
            <div className="glass-card">
              <div className="card-header">
                <div className="card-title">
                  <Compass size={16} color="var(--color-orb-violet)" />
                  Highest Correlated Offset Well
                </div>
                <span className="badge badge-violet">
                  {topSimilar.similarity_percent}% MATCH
                </span>
              </div>

              <div
                style={{
                  padding: "16px 18px",
                  borderRadius: 8,
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--color-sage-mist)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--color-bark)", marginBottom: 2 }}>
                      {topSimilar.name}
                    </h3>
                    <div style={{ fontSize: 12, color: "var(--color-muted-slate)" }}>
                      {topSimilar.well_id} &nbsp;•&nbsp; {topSimilar.distance_km} km &nbsp;•&nbsp; {topSimilar.formation}
                    </div>
                  </div>
                  <button
                    className="btn-secondary"
                    onClick={() => onSelectWell(topSimilar)}
                    style={{ padding: "5px 10px", fontSize: 11 }}
                  >
                    Dossier
                  </button>
                </div>

                {/* Similarity bars */}
                {[
                  { label: "Formation Match (Tipam)", val: topSimilar.score_breakdown.formation_match, color: "var(--color-canopy)" },
                  { label: "Depth Proximity", val: topSimilar.score_breakdown.depth_proximity, color: "#0d7a4e" },
                  { label: "Mud Weight Compatibility", val: topSimilar.score_breakdown.mud_weight_match, color: "#c47d0e" },
                ].map((b) => (
                  <div key={b.label} style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
                      <span style={{ color: "var(--color-slate)" }}>{b.label}</span>
                      <strong style={{ color: b.color }}>{b.val}%</strong>
                    </div>
                    <div style={{ height: 4, background: "var(--color-pale-sage)", borderRadius: 2 }}>
                      <div style={{ height: "100%", width: `${b.val}%`, background: b.color, borderRadius: 2, transition: "width 0.4s ease" }} />
                    </div>
                  </div>
                ))}

                <div
                  style={{
                    marginTop: 14,
                    padding: "10px 12px",
                    background: "rgba(185,28,66,0.06)",
                    border: "1px solid rgba(185,28,66,0.18)",
                    borderRadius: 6,
                    fontSize: 12,
                    color: "var(--color-bark)",
                  }}
                >
                  <strong style={{ color: "#b91c42" }}>Historical Warning: </strong>
                  {topSimilar.well_id} encountered severe mud loss at 3,110m and differential stuck pipe at 3,275m — 24.5h NPT.
                </div>
              </div>
            </div>
          )}

          {/* Recommended Operating Parameters */}
          <div className="glass-card">
            <div className="card-header">
              <div className="card-title">
                <ShieldCheck size={16} color="var(--color-canopy)" />
                Recommended Operating Parameters
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                {
                  label: "MUD WEIGHT WINDOW",
                  value: "10.4 – 10.8 ppg (Optimum 10.6 ppg)",
                  valueColor: "var(--color-canopy)",
                  note: "Below 10.4 ppg → borehole instability. Above 10.9 ppg → mud loss in fractured sands.",
                },
                {
                  label: "PREVENTIVE LCM PILL READINESS",
                  value: "25 bbls Mica/Nut Plug Pill on Standby",
                  valueColor: "#0d7a4e",
                  note: "Proven effective on OIL-X104 and OIL-X101 — regained circulation within 2 hours.",
                },
                {
                  label: "DRILL STRING TORQUE MANAGEMENT",
                  value: "Limit WOB to 16 klbs through 3,180m–3,240m",
                  valueColor: "#c47d0e",
                  note: "High dogleg severity in offset directional trajectories → keyseating risk.",
                },
              ].map((p) => (
                <div
                  key={p.label}
                  style={{
                    padding: "12px 14px",
                    borderRadius: 8,
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--color-sage-mist)",
                  }}
                >
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--color-muted-slate)", marginBottom: 4 }}>
                    {p.label}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: p.valueColor, marginBottom: 4 }}>
                    {p.value}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--color-slate)", lineHeight: 1.5 }}>
                    {p.note}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
