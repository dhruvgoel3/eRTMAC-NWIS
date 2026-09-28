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
  Bot,
  Share2,
  Gauge,
  Sparkles,
  Info,
  Clock,
  FileText,
  Target,
  ArrowRight,
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
  HIGH: "#f97316",
  MEDIUM: "#c47d0e",
  LOW: "#0d7a4e",
};

export const OverviewTab: React.FC<OverviewTabProps> = ({
  data: propData,
  onSelectWell,
  onNavigateToTab,
  onExplainAlert,
}) => {
  const data = propData || INITIAL_DASHBOARD_DATA;
  const sim = data.simulation;
  const currentDepth = sim?.current_depth ?? data.current_depth ?? 3172.0;
  const riskZones = data.risk_zones || [];
  const topSimilar = data.top_similar_well;

  const [selectedRadiusKm, setSelectedRadiusKm] = useState<number>(20);
  const [selectedNearbyWell, setSelectedNearbyWell] = useState<{
    well_id: string;
    name: string;
    distance_km: number;
    formation: string;
    depth: number;
    similarity: number;
    status: string;
  }>({
    well_id: "OIL-X104",
    name: "Bhogpara South Analogue #104",
    distance_km: 8.3,
    formation: "F3 (Tipam Sandstone)",
    depth: 3850,
    similarity: 91,
    status: "Completed",
  });


  const [selectedHistoricalEvent, setSelectedHistoricalEvent] = useState<{
    event_type: string;
    depth: string;
    formation: string;
    severity: string;
    description: string;
    source: string;
  } | null>({
    event_type: "Stuck Pipe",
    depth: "3,280 m",
    formation: "F3 (Tipam Sandstone)",
    severity: "HIGH",
    description:
      "Severe differential pressure sticking while drilling permeable sand interval. Drillstring was stuck for 16.0 hours before freeing with spotting fluid and 25 bbls LCM pill.",
    source: "WCR-X104-2023",
  });

  // Calculate distance to primary stuck-pipe risk zone (3180m–3290m)
  const riskStartDepth = 3180.0;
  const riskEndDepth = 3290.0;
  const distanceToRisk = maxZero(round1(riskStartDepth - currentDepth));
  const isInsideRisk = currentDepth >= riskStartDepth && currentDepth <= riskEndDepth;
  const isPassedRisk = currentDepth > riskEndDepth;

  function maxZero(num: number) {
    return num > 0 ? num : 0;
  }
  function round1(num: number) {
    return Math.round(num * 10) / 10;
  }

  // Live telemetry parameters from backend simulation state
  const parameters = [
    { label: "Depth", value: `${currentDepth.toFixed(1)}`, unit: "m", highlight: true },
    { label: "ROP", value: (sim?.current_rop ?? 12.4).toFixed(1), unit: "m/h" },
    { label: "WOB", value: (sim?.current_wob ?? 18.2).toFixed(1), unit: "klbs" },
    { label: "RPM", value: Math.round(sim?.current_rpm ?? 110).toString(), unit: "RPM" },
    { label: "Torque", value: Math.round(sim?.current_torque ?? 6200).toString(), unit: "ft-lbs" },
    { label: "Pressure", value: Math.round(sim?.current_pressure ?? 2850).toString(), unit: "psi" },
    { label: "Mud Flow", value: Math.round(sim?.current_mud_flow ?? 550).toString(), unit: "gpm" },
    { label: "Hook Load", value: Math.round(sim?.current_hook_load ?? 142).toString(), unit: "klbs" },
    { label: "Inclination", value: (sim?.current_inclination ?? 14.2).toFixed(1), unit: "°" },
    { label: "Azimuth", value: (sim?.current_azimuth ?? 46.5).toFixed(1), unit: "°" },
  ];

  // Deterministic similarity breakdown per prompt specification
  const deterministicSimilarity = {
    well_id: "OIL-X104",
    overall: 91,
    breakdown: [
      { label: "Formation Match", score: 95, desc: "Matches target reservoir horizon (Tipam Sandstone / F3)" },
      { label: "Depth Proximity", score: 92, desc: "Delta < 130m from offset total depth" },
      { label: "Geospatial Distance", score: 89, desc: "3.42 km Haversine radius offset" },
      { label: "Trajectory Compatibility", score: 88, desc: "Directional S-turn profile alignment" },
      { label: "Drilling Parameters", score: 91, desc: "Mud weight 10.8 ppg & rotary torque envelope match" },
    ],
  };

  // Nearby wells list for radius selection
  const nearbyWellsFiltered = [
    { well_id: "OIL-X104", name: "OIL-X104 (Primary Analogue)", distance_km: 3.4, formation: "F3", depth: 3850, similarity: 91, status: "Completed" },
    { well_id: "OIL-X101", name: "OIL-X101 (Offset North)", distance_km: 7.8, formation: "F3", depth: 3720, similarity: 86, status: "Completed" },
    { well_id: "OIL-X106", name: "OIL-X106 (Offset East)", distance_km: 12.5, formation: "F3", depth: 3400, similarity: 82, status: "Completed" },
    { well_id: "OIL-X102", name: "OIL-X102 (Dikom Field)", distance_km: 18.2, formation: "F3", depth: 3600, similarity: 79, status: "Completed" },
    { well_id: "OIL-X107", name: "OIL-X107 (Moran Field)", distance_km: 34.6, formation: "F4", depth: 4200, similarity: 74, status: "Completed" },
  ].filter((w) => w.distance_km <= selectedRadiusKm);

  // Historical events for selected well
  const historicalEvents = [
    {
      event_type: "Mud Loss",
      depth: "3,120 m",
      formation: "F3 (Tipam Sandstone)",
      severity: "MEDIUM",
      description: "Loss of 45 bbls drilling fluid into micro-fractured sandstone pore space. Cured with medium carbonate LCM pill.",
      source: "DDR-X104-2023",
    },
    {
      event_type: "Stuck Pipe",
      depth: "3,280 m",
      formation: "F3 (Tipam Sandstone)",
      severity: "HIGH",
      description: "Differential pipe sticking across permeable sandstone. 16.0 hours NPT logged before freeing BHA.",
      source: "WCR-X104-2023",
    },
    {
      event_type: "Torque Spike",
      depth: "3,450 m",
      formation: "F3 (Tipam Sandstone)",
      severity: "MEDIUM",
      description: "Rotary torque escalated rapidly past 7,400 ft-lbs due to interbedded hard calcareous stringers.",
      source: "DDR-X104-2023",
    },
  ];

  // Depth telemetry trend data
  const chartData = [
    { depth: (currentDepth - 40).toFixed(0), rop: 14.1, torque: 16.2 },
    { depth: (currentDepth - 30).toFixed(0), rop: 13.8, torque: 17.0 },
    { depth: (currentDepth - 20).toFixed(0), rop: 13.2, torque: 17.5 },
    { depth: (currentDepth - 10).toFixed(0), rop: 12.8, torque: 17.9 },
    { depth: currentDepth.toFixed(0), rop: sim?.current_rop ?? 12.4, torque: (sim?.current_torque ?? 6200) / 350 },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* ── 1. CURRENT WELL OVERVIEW & LIVE PARAMETERS ── */}
      <div className="glass-card" style={{ padding: "18px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: "var(--color-canopy)",
                color: "var(--color-mint-pulse)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Target size={20} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--color-bark)", margin: 0 }}>
                  Active Well: OIL-X123
                </h2>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    padding: "2px 8px",
                    borderRadius: 999,
                    background: "rgba(0, 230, 153, 0.15)",
                    color: "var(--color-canopy)",
                    border: "1px solid rgba(0, 230, 153, 0.4)",
                  }}
                >
                  Status: Drilling
                </span>
              </div>
              <div style={{ fontSize: 12, color: "var(--color-slate)", marginTop: 2 }}>
                Current Depth: <strong style={{ color: "var(--color-bark)" }}>{currentDepth.toFixed(1)} m</strong> &nbsp;·&nbsp; Target Formation: <strong style={{ color: "var(--color-canopy)" }}>F3 (Tipam Sandstone)</strong> &nbsp;·&nbsp; Total Depth: 3,850 m
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              className="btn-secondary"
              onClick={() => onNavigateToTab("current-well")}
              style={{ fontSize: 11, padding: "6px 12px", display: "flex", alignItems: "center", gap: 6 }}
            >
              Full Well Dossier <ArrowRight size={13} />
            </button>
          </div>
        </div>

        {/* 10 Real-time Parameters Strip */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 8 }}>
          {parameters.map((p) => (
            <div
              key={p.label}
              style={{
                padding: "8px 10px",
                borderRadius: 8,
                background: p.highlight ? "rgba(0, 230, 153, 0.08)" : "var(--bg-elevated)",
                border: `1px solid ${p.highlight ? "rgba(0, 230, 153, 0.3)" : "var(--color-sage-mist)"}`,
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--color-muted-slate)", fontWeight: 700, textTransform: "uppercase" }}>
                {p.label}
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: p.highlight ? "var(--color-canopy)" : "var(--color-bark)", marginTop: 2 }}>
                {p.value}
                <span style={{ fontSize: 10, fontWeight: 500, color: "var(--color-slate)", marginLeft: 3 }}>{p.unit}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 2. PROACTIVE ADVISORY ALERT BANNER & "WHY THIS ALERT?" ── */}
      <div
        className="glass-card"
        style={{
          background: isInsideRisk ? "rgba(239, 68, 68, 0.06)" : distanceToRisk <= 50 ? "rgba(245, 158, 11, 0.06)" : "rgba(16, 185, 129, 0.05)",
          borderColor: isInsideRisk ? "rgba(239, 68, 68, 0.3)" : distanceToRisk <= 50 ? "rgba(245, 158, 11, 0.3)" : "rgba(16, 185, 129, 0.25)",
          padding: "16px 20px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: "50%",
                background: isInsideRisk ? "rgba(239, 68, 68, 0.15)" : distanceToRisk <= 50 ? "rgba(245, 158, 11, 0.15)" : "rgba(16, 185, 129, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: isInsideRisk ? "#ef4444" : distanceToRisk <= 50 ? "#d97706" : "#10b981",
                flexShrink: 0,
              }}
            >
              <AlertTriangle size={22} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    padding: "2px 8px",
                    borderRadius: 999,
                    background: isInsideRisk ? "rgba(239, 68, 68, 0.2)" : distanceToRisk <= 50 ? "rgba(245, 158, 11, 0.2)" : "rgba(16, 185, 129, 0.2)",
                    color: isInsideRisk ? "#ef4444" : distanceToRisk <= 50 ? "#d97706" : "#10b981",
                    letterSpacing: "0.04em",
                  }}
                >
                  {isInsideRisk ? "CRITICAL HAZARD ZONE ACTIVE" : distanceToRisk <= 50 ? "⚠ HISTORICAL RISK APPROACHING" : "CLEAR TRAJECTORY"}
                </span>
                <span style={{ fontSize: 11, color: "var(--color-muted-slate)" }}>
                  Current Depth: {currentDepth.toFixed(1)}m · Historical Risk: 3,180m–3,290m
                </span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-bark)" }}>
                {isInsideRisk
                  ? "Currently drilling inside active Historical Stuck Pipe Risk Interval (3,180m–3,290m) in Formation F3."
                  : distanceToRisk <= 50
                  ? `Distance to Historical Risk Zone: ${distanceToRisk.toFixed(1)}m ahead in Formation F3 (Correlated from OIL-X104).`
                  : "No imminent offset hazard within next 300m interval. Formation F3 nominal."}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {onExplainAlert && (
              <button
                className="btn-secondary"
                onClick={() =>
                  onExplainAlert({
                    id: 101,
                    depth: 3180,
                    message: "Historical Stuck Pipe Risk Approaching (3,180m–3,290m)",
                    severity: "HIGH",
                    explanation:
                      "Why am I seeing this alert?\n" +
                      "• Current well is 8m from historical risk zone (3,180m–3,290m)\n" +
                      "• Formation matches historical formation (F3 / Tipam Sandstone)\n" +
                      "• Similar wells experienced this event in this depth window\n" +
                      "• OIL-X104 has a historical stuck-pipe event at 3,280m (16h NPT)\n" +
                      "• Relevant historical evidence is available in document WCR-X104-2023",
                    evidence: [
                      { well_id: "OIL-X104", event: "Stuck Pipe", depth: "3,280m", formation: "F3 (Tipam)", npt_hrs: 16.0, source: "WCR-X104-2023" },
                      { well_id: "OIL-X106", event: "Mud Loss", depth: "3,120m", formation: "F3 (Tipam)", npt_hrs: 8.5, source: "DDR-X106-2022" },
                    ],
                  })
                }
                style={{
                  background: "rgba(0, 230, 153, 0.1)",
                  borderColor: "rgba(0, 230, 153, 0.4)",
                  color: "var(--color-canopy)",
                  fontWeight: 700,
                  fontSize: 11,
                  padding: "7px 12px",
                }}
              >
                Why am I seeing this alert?
              </button>
            )}
            <button
              className="btn-secondary"
              onClick={() => onNavigateToTab("risk-alerts")}
              style={{ fontSize: 11, padding: "7px 12px" }}
            >
              Risk &amp; Alerts Details <ChevronRight size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* ── 3. NEARBY WELL MAP PREVIEW & SIMILAR WELL INTELLIGENCE ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 20 }}>
        {/* Nearby Well Map View & Radius Selector */}
        <div className="glass-card">
          <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div className="card-title">
              <MapPin size={16} color="var(--color-canopy)" />
              Nearby Well Map (Geospatial View)
            </div>
            {/* Radius Controls: 5 km, 10 km, 20 km, 50 km */}
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 10, color: "var(--color-muted-slate)", fontWeight: 700, marginRight: 2 }}>RADIUS:</span>
              {[5, 10, 20, 50].map((rad) => (
                <button
                  key={rad}
                  onClick={() => setSelectedRadiusKm(rad)}
                  style={{
                    padding: "3px 8px",
                    borderRadius: 6,
                    fontSize: 10,
                    fontWeight: 700,
                    border: selectedRadiusKm === rad ? "1px solid var(--color-canopy)" : "1px solid var(--color-sage-mist)",
                    background: selectedRadiusKm === rad ? "var(--color-canopy)" : "#ffffff",
                    color: selectedRadiusKm === rad ? "#ffffff" : "var(--color-bark)",
                    cursor: "pointer",
                  }}
                >
                  {rad} km
                </button>
              ))}
            </div>
          </div>

          <div style={{ padding: "0 0 10px" }}>
            <div style={{ fontSize: 11, color: "var(--color-slate)", marginBottom: 10 }}>
              Found {nearbyWellsFiltered.length} offset wells within {selectedRadiusKm} km radius of active well OIL-X123:
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {nearbyWellsFiltered.map((w) => {
                const isSelected = selectedNearbyWell.well_id === w.well_id;
                return (
                  <div
                    key={w.well_id}
                    onClick={() => setSelectedNearbyWell(w)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 12px",
                      borderRadius: 8,
                      background: isSelected ? "rgba(0, 230, 153, 0.08)" : "var(--bg-elevated)",
                      border: isSelected ? "1px solid rgba(0, 230, 153, 0.4)" : "1px solid var(--color-sage-mist)",
                      cursor: "pointer",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 12, color: "var(--color-bark)" }}>
                        {w.well_id} · {w.name}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--color-muted-slate)" }}>
                        Distance: {w.distance_km} km &nbsp;·&nbsp; Formation: {w.formation} &nbsp;·&nbsp; Depth: {w.depth} m
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 800,
                          padding: "2px 6px",
                          borderRadius: 99,
                          background: "rgba(0, 230, 153, 0.15)",
                          color: "var(--color-canopy)",
                        }}
                      >
                        {w.similarity}% Match
                      </span>
                      <div style={{ fontSize: 10, color: "var(--color-slate)", marginTop: 2 }}>{w.status}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: 12, textAlign: "right" }}>
              <button
                className="btn-secondary"
                onClick={() => onNavigateToTab("nearby-wells")}
                style={{ fontSize: 11, padding: "5px 10px" }}
              >
                Open Full GIS Map <ChevronRight size={13} />
              </button>
            </div>
          </div>
        </div>

        {/* Similar Well Intelligence (Deterministic Breakdown) */}
        <div className="glass-card">
          <div className="card-header">
            <div className="card-title">
              <Compass size={16} color="var(--color-orb-violet)" />
              Similar Well Intelligence · {selectedNearbyWell.well_id}
            </div>
            <span className="badge badge-violet">{selectedNearbyWell.similarity}% DETERMINISTIC</span>
          </div>

          <div style={{ padding: "0 0 10px" }}>
            <div style={{ fontSize: 11, color: "var(--color-slate)", marginBottom: 12 }}>
              Why is {selectedNearbyWell.well_id} relevant to active well OIL-X123? (Non-random, multidimensional calculation)
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {deterministicSimilarity.breakdown.map((item) => (
                <div key={item.label} style={{ padding: "6px 10px", borderRadius: 6, background: "var(--bg-elevated)", border: "1px solid var(--color-sage-mist)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--color-bark)" }}>{item.label}</span>
                    <strong style={{ fontSize: 12, color: "var(--color-canopy)" }}>{item.score}%</strong>
                  </div>
                  <div style={{ height: 4, borderRadius: 2, background: "var(--color-sage-mist)", overflow: "hidden", marginBottom: 4 }}>
                    <div style={{ width: `${item.score}%`, height: "100%", background: "var(--color-canopy)" }} />
                  </div>
                  <div style={{ fontSize: 10, color: "var(--color-muted-slate)" }}>{item.desc}</div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 12, textAlign: "right" }}>
              <button
                className="btn-secondary"
                onClick={() => onNavigateToTab("historical-intelligence")}
                style={{ fontSize: 11, padding: "5px 10px" }}
              >
                Deep Intelligence Analysis <ChevronRight size={13} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── 4. HISTORICAL EVENTS & RISK TIMELINE ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 20 }}>
        {/* Historical Well Intelligence & Events */}
        <div className="glass-card">
          <div className="card-header">
            <div className="card-title">
              <FileText size={16} color="var(--color-canopy)" />
              Historical Well Events · {selectedNearbyWell.well_id}
            </div>
            <span className="badge badge-canopy">WCR-X104-2023</span>
          </div>

          <div style={{ padding: "0 0 10px" }}>
            <div style={{ fontSize: 11, color: "var(--color-slate)", marginBottom: 10 }}>
              Click an event below to inspect geological details, formation, severity, and verified document source:
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
              {historicalEvents.map((ev) => {
                const isSelected = selectedHistoricalEvent?.event_type === ev.event_type;
                return (
                  <div
                    key={ev.depth}
                    onClick={() => setSelectedHistoricalEvent(ev)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 12px",
                      borderRadius: 8,
                      background: isSelected ? "rgba(0, 230, 153, 0.08)" : "var(--bg-elevated)",
                      border: isSelected ? "1px solid rgba(0, 230, 153, 0.4)" : "1px solid var(--color-sage-mist)",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span className={`badge ${SEV_BADGE[ev.severity] || "badge-amber"}`}>{ev.severity}</span>
                      <div>
                        <strong style={{ fontSize: 12, color: "var(--color-bark)" }}>
                          {ev.depth} — {ev.event_type}
                        </strong>
                        <div style={{ fontSize: 10, color: "var(--color-muted-slate)" }}>Formation: {ev.formation}</div>
                      </div>
                    </div>
                    <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--color-canopy)", fontWeight: 700 }}>
                      {ev.source}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Event detail preview panel */}
            {selectedHistoricalEvent && (
              <div style={{ padding: 12, borderRadius: 8, background: "#ffffff", border: "1px solid var(--color-sage-mist)", fontSize: 11 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontWeight: 800, color: "var(--color-bark)" }}>
                    {selectedHistoricalEvent.event_type} Details ({selectedHistoricalEvent.depth})
                  </span>
                  <span style={{ color: "var(--color-muted-slate)" }}>Source: {selectedHistoricalEvent.source}</span>
                </div>
                <div style={{ color: "var(--color-slate)", lineHeight: 1.5 }}>
                  {selectedHistoricalEvent.description}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Historical Risk Timeline against Depth */}
        <div className="glass-card">
          <div className="card-header">
            <div className="card-title">
              <Layers size={16} color="var(--color-canopy)" />
              Historical Risk Timeline (Depth Indexed)
            </div>
            <span className="badge badge-canopy">F3 Horizon</span>
          </div>

          <div style={{ padding: "0 0 10px" }}>
            {/* Visual Depth Axis: 3050m ── 3180m ── 3290m ── 3450m */}
            <div style={{ position: "relative", margin: "16px 0 20px", height: 38, background: "var(--bg-elevated)", borderRadius: 8, border: "1px solid var(--color-sage-mist)", overflow: "hidden" }}>
              {/* Stuck Pipe Risk Zone 3180m–3290m */}
              <div
                style={{
                  position: "absolute",
                  left: "32.5%",
                  width: "27.5%",
                  height: "100%",
                  background: "rgba(239, 68, 68, 0.2)",
                  borderLeft: "2px solid #ef4444",
                  borderRight: "2px solid #ef4444",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 10,
                  fontWeight: 800,
                  color: "#b91c42",
                }}
              >
                Stuck Pipe Risk (3180m–3290m)
              </div>

              {/* Bit needle */}
              <div
                style={{
                  position: "absolute",
                  left: `${Math.min(100, Math.max(0, ((currentDepth - 3050) / 400) * 100))}%`,
                  top: 0,
                  bottom: 0,
                  width: 3,
                  background: "var(--color-canopy)",
                  zIndex: 10,
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: -4,
                    left: -4,
                    width: 11,
                    height: 11,
                    borderRadius: "50%",
                    background: "var(--color-canopy)",
                    border: "2px solid #ffffff",
                  }}
                />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--color-muted-slate)", marginBottom: 14 }}>
              <span>3,050m (Spud Window)</span>
              <strong style={{ color: "#b91c42" }}>3,180m–3,290m (Stuck Pipe Risk)</strong>
              <span>3,450m (F4 Transition)</span>
            </div>

            <div style={{ fontSize: 11, color: "var(--color-slate)", marginBottom: 8 }}>
              Active risk categories monitored across this formation:
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {[
                { name: "Mud Loss", active: false },
                { name: "Stuck Pipe", active: true },
                { name: "Kick", active: false },
                { name: "Overpressure", active: false },
                { name: "Torque Spike", active: true },
                { name: "Formation Instability", active: false },
                { name: "Cementing Issue", active: false },
              ].map((c) => (
                <span
                  key={c.name}
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "3px 8px",
                    borderRadius: 6,
                    background: c.active ? "rgba(239, 68, 68, 0.12)" : "var(--bg-elevated)",
                    color: c.active ? "#b91c42" : "var(--color-slate)",
                    border: `1px solid ${c.active ? "rgba(239, 68, 68, 0.3)" : "var(--color-sage-mist)"}`,
                  }}
                >
                  {c.name} {c.active ? "●" : ""}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── 5. AI ASSISTANT ("ASK NWIS") & DRILLING MEMORY ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 20 }}>
        {/* Quick Ask NWIS Copilot Card */}
        <div className="glass-card">
          <div className="card-header">
            <div className="card-title">
              <Bot size={16} color="var(--color-canopy)" />
              Ask NWIS · Grounded Drilling AI Assistant
            </div>
            <span className="badge badge-canopy">RAG Pipeline</span>
          </div>

          <div style={{ padding: "0 0 10px" }}>
            <div style={{ fontSize: 11, color: "var(--color-slate)", marginBottom: 10 }}>
              Queries synthesize historical WCR/DDR reports with verified citations. Click a prompt below:
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
              {[
                "Why is 3180–3290m historically significant?",
                "What happened in OIL-X104?",
                "Which nearby wells experienced stuck pipe?",
                "What risks were observed in formation F3?",
                "Why am I seeing this alert?",
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => onNavigateToTab("ask-nwis")}
                  style={{
                    padding: "7px 12px",
                    borderRadius: 6,
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--color-sage-mist)",
                    color: "var(--color-bark)",
                    fontSize: 11,
                    fontWeight: 600,
                    textAlign: "left",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span>{q}</span>
                  <ChevronRight size={13} color="var(--color-muted-slate)" />
                </button>
              ))}
            </div>

            <button
              className="btn-primary"
              onClick={() => onNavigateToTab("ask-nwis")}
              style={{ width: "100%", justifyContent: "center", fontSize: 12, padding: "8px 16px" }}
            >
              Open Full Ask NWIS Console <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* Drilling Memory Knowledge Link & Well Comparison */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="glass-card">
            <div className="card-header">
              <div className="card-title">
                <Share2 size={16} color="var(--color-canopy)" />
                Drilling Memory (Institutional Knowledge)
              </div>
            </div>
            <div style={{ fontSize: 11, color: "var(--color-slate)", lineHeight: 1.6, marginBottom: 10 }}>
              Trace semantic relationships across historical wells:
              <div style={{ margin: "8px 0", padding: "8px 10px", background: "var(--bg-elevated)", borderRadius: 6, border: "1px solid var(--color-sage-mist)", fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-bark)" }}>
                Current Well (OIL-X123) → Similar Well (OIL-X104) → Formation (F3) → Historical Event (Stuck Pipe) → Depth (3,280m) → Source (WCR-X104-2023)
              </div>
            </div>
            <button
              className="btn-secondary"
              onClick={() => onNavigateToTab("drilling-memory")}
              style={{ width: "100%", justifyContent: "center", fontSize: 11, padding: "6px 12px" }}
            >
              Explore Knowledge Graph <ArrowRight size={13} />
            </button>
          </div>

          <div className="glass-card">
            <div className="card-header">
              <div className="card-title">
                <Compass size={16} color="var(--color-orb-violet)" />
                Well Comparison Tool
              </div>
            </div>
            <div style={{ fontSize: 11, color: "var(--color-slate)", marginBottom: 10 }}>
              Compare active well OIL-X123 side-by-side with historical analogues across formation, trajectory, parameters, and risk zones.
            </div>
            <button
              className="btn-secondary"
              onClick={() => onNavigateToTab("well-comparison")}
              style={{ width: "100%", justifyContent: "center", fontSize: 11, padding: "6px 12px" }}
            >
              Compare Wells Side-by-Side <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
