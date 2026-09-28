import React, { useState, useEffect } from "react";
import {
  Layers,
  MapPin,
  TrendingUp,
  AlertTriangle,
  ChevronRight,
  RefreshCw,
  BarChart2,
  Compass,
} from "lucide-react";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { api } from "../../services/api";
import { Well, WellEvent, RiskZone, SimilarWellResult } from "../../types";

const SEV_COLOR: Record<string, string> = {
  CRITICAL: "#b91c42",
  HIGH: "#f97316",
  MEDIUM: "#c47d0e",
  LOW: "#0d7a4e",
};

interface WellComparisonTabProps {
  activeWell?: Well | null;
  similarWells?: SimilarWellResult[];
}

export const WellComparisonTab: React.FC<WellComparisonTabProps> = ({
  activeWell,
  similarWells,
}) => {
  const [offsetWell, setOffsetWell] = useState<Well | null>(null);
  const [activeEvents, setActiveEvents] = useState<WellEvent[]>([]);
  const [offsetEvents, setOffsetEvents] = useState<WellEvent[]>([]);
  const [riskZones, setRiskZones] = useState<RiskZone[]>([]);
  const [topSimilar, setTopSimilar] = useState<SimilarWellResult | null>(
    similarWells?.[0] || null
  );
  const [isLoading, setIsLoading] = useState(true);

  const activeWellId = activeWell?.well_id || "OIL-X123";
  const offsetWellId = topSimilar?.well_id || "OIL-X104";

  useEffect(() => {
    const loadComparison = async () => {
      setIsLoading(true);
      try {
        const [offsetData, activeEvts, offsetEvts, zones] = await Promise.all([
          api.getWell(offsetWellId),
          api.getWellEvents(activeWellId),
          api.getWellEvents(offsetWellId),
          api.getRiskZones(activeWellId),
        ]);
        setOffsetWell(offsetData);
        setActiveEvents(activeEvts || []);
        setOffsetEvents(offsetEvts || []);
        setRiskZones(zones || []);
      } catch (err) {
        console.warn("[WellComparisonTab] Load error:", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadComparison();
  }, [offsetWellId, activeWellId]);

  const sim = topSimilar;
  const formationMatch = sim ? (sim.score_breakdown.formation_match > 1 ? sim.score_breakdown.formation_match : Math.round(sim.score_breakdown.formation_match * 100)) : 95;
  const depthMatch = sim ? (sim.score_breakdown.depth_proximity > 1 ? sim.score_breakdown.depth_proximity : Math.round(sim.score_breakdown.depth_proximity * 100)) : 91;
  const trajMatch = sim ? (sim.score_breakdown.trajectory_match > 1 ? sim.score_breakdown.trajectory_match : Math.round(sim.score_breakdown.trajectory_match * 100)) : 82;
  const mudMatch = sim ? (sim.score_breakdown.mud_weight_match > 1 ? sim.score_breakdown.mud_weight_match : Math.round(sim.score_breakdown.mud_weight_match * 100)) : 88;
  const distMatch = sim ? (sim.score_breakdown.distance_proximity > 1 ? sim.score_breakdown.distance_proximity : Math.round(sim.score_breakdown.distance_proximity * 100)) : 89;

  const radarData = [
    { subject: "Formation", A: formationMatch, B: 100 },
    { subject: "Depth", A: depthMatch, B: 100 },
    { subject: "Distance", A: distMatch, B: 100 },
    { subject: "Trajectory", A: trajMatch, B: 100 },
    { subject: "Parameters", A: mudMatch, B: 100 },
  ];

  const criticalOffsetEvents = offsetEvents.filter(
    (e) => e.severity === "CRITICAL" || e.severity === "HIGH"
  );

  if (isLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, flexDirection: "column", gap: 12 }}>
        <RefreshCw size={28} color="var(--color-canopy)" />
        <p style={{ color: "var(--color-slate)", fontSize: 14 }}>Loading well comparison data...</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* Header */}
      <div className="glass-card" style={{ padding: "20px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Compass size={20} color="var(--color-orb-violet)" />
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--color-bark)", margin: 0 }}>Well Comparison Analysis</h2>
              <p style={{ fontSize: 12, color: "var(--color-muted-slate)", margin: 0 }}>Side-by-side comparison of active well vs highest-similarity offset well</p>
            </div>
          </div>
          <span className="badge badge-violet" style={{ fontSize: 14, padding: "6px 14px" }}>
            {sim?.similarity_percent ?? 91}% MATCH
          </span>
        </div>

        {/* Well header cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 16, alignItems: "center" }}>
          <div style={{ padding: "16px 18px", borderRadius: 10, background: "rgba(16,67,54,0.06)", border: "2px solid rgba(16,67,54,0.25)" }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.07em", color: "var(--color-canopy)", marginBottom: 4 }}>ACTIVE WELL (CURRENT)</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "var(--color-bark)" }}>{activeWellId}</div>
            <div style={{ fontSize: 12, color: "var(--color-muted-slate)", marginTop: 4 }}>{activeWell?.formation || "Tipam Sandstone"} · {activeWell?.total_depth?.toFixed(0) || "3850"}m TD</div>
            <div style={{ fontSize: 11, color: "var(--color-canopy)", marginTop: 4, fontWeight: 600 }}>● DRILLING IN PROGRESS</div>
          </div>

          <div style={{ textAlign: "center", color: "var(--color-muted-slate)" }}>
            <div style={{ fontSize: 24, fontWeight: 700 }}>VS</div>
            <div style={{ fontSize: 11 }}>{sim?.distance_km?.toFixed(1) || "8.3"} km apart</div>
          </div>

          <div style={{ padding: "16px 18px", borderRadius: 10, background: "rgba(108,92,231,0.06)", border: "2px solid rgba(108,92,231,0.2)" }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.07em", color: "var(--color-orb-violet)", marginBottom: 4 }}>OFFSET WELL (HISTORICAL)</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "var(--color-bark)" }}>{offsetWellId}</div>
            <div style={{ fontSize: 12, color: "var(--color-muted-slate)", marginTop: 4 }}>{offsetWell?.formation || sim?.formation || "Tipam Sandstone"} · {(offsetWell?.total_depth || sim?.total_depth || 3720)?.toFixed(0)}m TD</div>
            <div style={{ fontSize: 11, color: "var(--color-muted-slate)", marginTop: 4, fontWeight: 600 }}>✓ COMPLETED</div>
          </div>
        </div>
      </div>

      {/* 2-column: Similarity Radar + Factor Breakdown */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>

        {/* Radar Chart */}
        <div className="glass-card">
          <div className="card-header">
            <div className="card-title"><BarChart2 size={16} color="var(--color-orb-violet)" /> Multi-Parameter Similarity Radar</div>
          </div>
          <div style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="var(--color-sage-mist)" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12, fill: "var(--color-slate)" }} />
                <Radar name={activeWellId} dataKey="A" stroke="var(--color-canopy)" fill="var(--color-canopy)" fillOpacity={0.25} strokeWidth={2} />
                <Tooltip contentStyle={{ background: "var(--color-sheet-white)", border: "1px solid var(--color-sage-mist)", borderRadius: 8, fontSize: 12 }} formatter={(val: any) => [`${val}%`, "Similarity"]} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Factor breakdown bars */}
        <div className="glass-card">
          <div className="card-header">
            <div className="card-title"><Layers size={16} color="var(--color-canopy)" /> Similarity Factor Breakdown</div>
            <span className="badge badge-canopy">Deterministic</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {[
              { label: "Formation Match", weight: "30%", score: formationMatch, color: "var(--color-canopy)", note: "Both in Tipam Sandstone" },
              { label: "Depth Proximity", weight: "25%", score: depthMatch, color: "#0d7a4e", note: "TD within 200m" },
              { label: "Geographic Distance", weight: "20%", score: distMatch, color: "#c47d0e", note: `${sim?.distance_km?.toFixed(1) || "8.3"}km apart` },
              { label: "Trajectory Profile", weight: "15%", score: trajMatch, color: "var(--color-orb-violet)", note: `${activeWell?.trajectory_type || "Directional"} vs ${offsetWell?.trajectory_type || "Directional"}` },
              { label: "Drilling Parameters", weight: "10%", score: mudMatch, color: "var(--color-muted-slate)", note: "Mud weight, ROP comparable" },
            ].map((f) => (
              <div key={f.label}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-bark)" }}>{f.label}</span>
                    <span style={{ fontSize: 10, color: "var(--color-muted-slate)", marginLeft: 6 }}>({f.weight} weight)</span>
                  </div>
                  <strong style={{ color: f.color, fontSize: 14 }}>{f.score}%</strong>
                </div>
                <div style={{ height: 6, background: "var(--color-pale-sage)", borderRadius: 3 }}>
                  <div style={{ height: "100%", width: `${f.score}%`, background: f.color, borderRadius: 3, transition: "width 0.5s ease" }} />
                </div>
                <div style={{ fontSize: 10, color: "var(--color-muted-slate)", marginTop: 2 }}>{f.note}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Parameter Comparison Table */}
      <div className="glass-card">
        <div className="card-header">
          <div className="card-title"><TrendingUp size={16} color="var(--color-canopy)" /> Well Characteristics Comparison</div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid var(--color-sage-mist)" }}>
                <th style={{ textAlign: "left", padding: "8px 12px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--color-muted-slate)" }}>Parameter</th>
                <th style={{ textAlign: "center", padding: "8px 12px", color: "var(--color-canopy)", fontWeight: 700 }}>{activeWellId}</th>
                <th style={{ textAlign: "center", padding: "8px 12px", color: "var(--color-orb-violet)", fontWeight: 700 }}>{offsetWellId}</th>
                <th style={{ textAlign: "center", padding: "8px 12px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--color-muted-slate)" }}>Match</th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: "Formation", active: activeWell?.formation || "Tipam Sandstone", offset: offsetWell?.formation || sim?.formation || "Tipam Sandstone", match: formationMatch },
                { label: "Total Depth (m)", active: activeWell?.total_depth?.toFixed(0) || "3850", offset: (offsetWell?.total_depth || sim?.total_depth || 3720)?.toFixed(0), match: depthMatch },
                { label: "Trajectory", active: activeWell?.trajectory_type || "Directional", offset: offsetWell?.trajectory_type || sim?.trajectory_type || "Directional", match: trajMatch },
                { label: "Mud Weight (ppg)", active: activeWell?.mud_weight?.toFixed(1) || "10.6", offset: (offsetWell?.mud_weight || sim?.mud_weight || 10.5)?.toFixed(1), match: mudMatch },
                { label: "Distance (km)", active: "Reference", offset: `${sim?.distance_km?.toFixed(1) || "8.3"} km`, match: distMatch },
                { label: "Historical Events", active: `${activeEvents.length}`, offset: `${offsetEvents.length}`, match: null },
                { label: "High Risk Events", active: `${activeEvents.filter(e => e.severity === "HIGH" || e.severity === "CRITICAL").length}`, offset: `${criticalOffsetEvents.length}`, match: null },
              ].map((row) => (
                <tr key={row.label} style={{ borderBottom: "1px solid var(--color-sage-mist)" }}>
                  <td style={{ padding: "10px 12px", fontWeight: 600, color: "var(--color-bark)" }}>{row.label}</td>
                  <td style={{ padding: "10px 12px", textAlign: "center", color: "var(--color-canopy)", fontWeight: 600 }}>{row.active}</td>
                  <td style={{ padding: "10px 12px", textAlign: "center", color: "var(--color-orb-violet)", fontWeight: 600 }}>{row.offset}</td>
                  <td style={{ padding: "10px 12px", textAlign: "center" }}>
                    {row.match !== null ? (
                      <span style={{ fontSize: 12, fontWeight: 700, color: row.match >= 85 ? "var(--color-canopy)" : row.match >= 70 ? "#c47d0e" : "#b91c42" }}>
                        {row.match}%
                      </span>
                    ) : (
                      <span style={{ fontSize: 11, color: "var(--color-muted-slate)" }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Historical Events from Offset Well */}
      {offsetEvents.length > 0 && (
        <div className="glass-card">
          <div className="card-header">
            <div className="card-title"><AlertTriangle size={16} color="#f97316" /> Critical Historical Events — {offsetWellId}</div>
            <span className="badge badge-amber">{criticalOffsetEvents.length} High/Critical</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {(criticalOffsetEvents.length > 0 ? criticalOffsetEvents : offsetEvents).slice(0, 6).map((ev) => (
              <div key={ev.id} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 14px", borderRadius: 8, background: "var(--bg-elevated)", border: "1px solid var(--color-sage-mist)", borderLeft: `3px solid ${SEV_COLOR[ev.severity] || "#c47d0e"}` }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span className={`badge ${ev.severity === "CRITICAL" ? "badge-rose" : ev.severity === "HIGH" ? "badge-amber" : "badge-canopy"}`}>{ev.severity}</span>
                    <strong style={{ fontSize: 13, color: "var(--color-bark)" }}>{ev.event_type.replace(/_/g, " ")}</strong>
                    <span style={{ fontSize: 12, color: "var(--color-muted-slate)" }}>at {ev.depth_start}m</span>
                    {ev.formation && <span style={{ fontSize: 11, color: "var(--color-muted-slate)" }}>— {ev.formation}</span>}
                  </div>
                  {ev.description && <div style={{ fontSize: 12, color: "var(--color-slate)", lineHeight: 1.5 }}>{ev.description}</div>}
                  {ev.mitigation && <div style={{ fontSize: 11, color: "var(--color-canopy)", marginTop: 4 }}>Mitigation: {ev.mitigation}</div>}
                </div>
                {ev.npt_hours > 0 && <div style={{ fontSize: 11, fontWeight: 700, color: "#b91c42", flexShrink: 0 }}>NPT: {ev.npt_hours}h</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Risk Zones at current well from offset evidence */}
      {riskZones.length > 0 && (
        <div className="glass-card">
          <div className="card-header">
            <div className="card-title"><MapPin size={16} color="#b91c42" /> Risk Zones — Based on {offsetWellId} Evidence</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {riskZones.map((z) => (
              <div key={z.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 8, background: "var(--bg-elevated)", border: "1px solid var(--color-sage-mist)", borderLeft: `3px solid ${SEV_COLOR[z.severity] || "#c47d0e"}` }}>
                <span className={`badge ${z.severity === "CRITICAL" ? "badge-rose" : z.severity === "HIGH" ? "badge-amber" : "badge-emerald"}`}>{z.severity}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: "var(--color-bark)" }}>
                    {(z.event_type || z.risk_type || "HAZARD").replace(/_/g, " ")} — {z.depth_start}m to {z.depth_end}m
                  </div>
                  <div style={{ fontSize: 11, color: "var(--color-muted-slate)" }}>{z.formation} formation</div>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: SEV_COLOR[z.severity] }}>{z.risk_score?.toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
