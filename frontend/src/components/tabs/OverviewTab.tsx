import React, { useState } from "react";
import {
  AlertTriangle,
  Compass,
  Layers,
  ChevronRight,
  MapPin,
  Bot,
  Share2,
  Sparkles,
  FileText,
  Target,
  ArrowRight,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Flame,
} from "lucide-react";
import { DashboardData, Well, SimilarWellResult } from "../../types";
import { INITIAL_DASHBOARD_DATA } from "../../constants/initialData";

interface OverviewTabProps {
  data: DashboardData | null;
  onSelectWell: (well: Well | SimilarWellResult) => void;
  onNavigateToTab: (tab: string) => void;
  onExplainAlert?: (alert?: any) => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  data: propData,
  onSelectWell,
  onNavigateToTab,
  onExplainAlert,
}) => {
  const data = propData || INITIAL_DASHBOARD_DATA;
  const sim = data.simulation;
  const currentDepth = sim?.current_depth ?? data.current_depth ?? 3172.0;

  const [selectedRadiusKm, setSelectedRadiusKm] = useState<number>(20);
  const [showSimilarityDetails, setShowSimilarityDetails] = useState<boolean>(false);

  // Proximity to stuck-pipe danger zone (3180m–3290m)
  const riskStartDepth = 3180.0;
  const riskEndDepth = 3290.0;
  const distanceToRisk = Math.max(0, Math.round((riskStartDepth - currentDepth) * 10) / 10);
  const isInsideRisk = currentDepth >= riskStartDepth && currentDepth <= riskEndDepth;
  const isPassedRisk = currentDepth > riskEndDepth;

  // Nearby wells list for radius selection
  const nearbyWellsFiltered = [
    { well_id: "OIL-X104", name: "Bhogpara South #104", distance_km: 3.4, formation: "F3", depth: 3850, similarity: 91, status: "Completed", operator: "OIL", events: [{ event_type: "Stuck Pipe", depth: 3280, severity: "HIGH", description: "Differential pipe sticking across permeable sandstone. 16.0h NPT." }] },
    { well_id: "OIL-X101", name: "Offset North #101", distance_km: 7.8, formation: "F3", depth: 3720, similarity: 86, status: "Completed", operator: "OIL", events: [{ event_type: "Mud Loss", depth: 3095, severity: "MEDIUM", description: "Seepage loss escalated to 30 bbl/hr." }] },
    { well_id: "OIL-X106", name: "Offset East #106", distance_km: 12.5, formation: "F3", depth: 3400, similarity: 82, status: "Completed", operator: "OIL", events: [{ event_type: "Tight Hole", depth: 3260, severity: "MEDIUM", description: "Ledge sticking on tripping out." }] },
    { well_id: "OIL-X102", name: "Dikom Field #102", distance_km: 18.2, formation: "F3", depth: 3600, similarity: 79, status: "Completed", operator: "OIL", events: [] },
    { well_id: "OIL-X107", name: "Moran Field #107", distance_km: 34.6, formation: "F4", depth: 4200, similarity: 74, status: "Completed", operator: "OIL", events: [] },
  ].filter((w) => w.distance_km <= selectedRadiusKm);

  // Deterministic similarity factors (collapsed by default for progressive disclosure)
  const deterministicFactors = [
    { label: "Formation Stratigraphy", score: 95, desc: "Matches target reservoir horizon (Tipam Sandstone / F3)" },
    { label: "Depth Proximity", score: 92, desc: "Delta < 130m from offset total depth" },
    { label: "Geospatial Proximity", score: 89, desc: "3.42 km Haversine radius offset" },
    { label: "Trajectory Compatibility", score: 88, desc: "Directional S-turn profile alignment" },
    { label: "Drilling Parameters Envelope", score: 91, desc: "Mud weight 10.8 ppg & rotary torque envelope match" },
  ];

  const handleOpenAlertEvidence = () => {
    if (onExplainAlert) {
      onExplainAlert({
        id: 101,
        depth: 3180,
        message: "Historical Stuck Pipe Risk Approaching (3,180m–3,290m)",
        severity: "HIGH",
        explanation: "Current well is approaching historical hazard boundary in Formation F3. Correlated from OIL-X104 offset.",
      });
    }
  };

  const handleOpenWellDossier = (wellObj: any) => {
    onSelectWell({
      id: 104,
      well_id: wellObj.well_id,
      name: wellObj.name,
      field: "Bhogpara Field",
      formation: wellObj.formation === "F3" ? "F3 (Tipam Sandstone)" : wellObj.formation,
      current_depth: wellObj.depth,
      total_depth: wellObj.depth,
      latitude: 27.4728,
      longitude: 94.912,
      status: "COMPLETED",
      is_active: false,
      well_type: "Directional / Development",
      operator: "Oil India Limited (OIL)",
      spud_date: "2023-04-12",
      events: wellObj.events || [],
    } as any);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 1400, margin: "0 auto" }}>
      {/* ── 1. PROACTIVE HAZARD HORIZON & SITUATIONAL AWARENESS ── */}
      <div
        className="glass-card"
        style={{
          padding: "20px 24px",
          background: isInsideRisk
            ? "rgba(239, 68, 68, 0.05)"
            : distanceToRisk <= 50
            ? "rgba(245, 158, 11, 0.05)"
            : "var(--color-sheet-white)",
          borderColor: isInsideRisk
            ? "rgba(239, 68, 68, 0.3)"
            : distanceToRisk <= 50
            ? "rgba(245, 158, 11, 0.3)"
            : "var(--color-sage-mist)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: isInsideRisk ? "rgba(239, 68, 68, 0.15)" : "var(--color-canopy)",
                color: isInsideRisk ? "#ef4444" : "var(--color-mint-pulse)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Target size={20} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <h2 style={{ fontSize: 17, fontWeight: 800, color: "var(--color-bark)", margin: 0 }}>
                  Active Rig: OIL-X123
                </h2>
                <span className="badge badge-mint" style={{ fontSize: 9 }}>STATUS: DRILLING</span>
                <span className="badge badge-canopy" style={{ fontSize: 9 }}>FORMATION: F3 (TIPAM)</span>
              </div>
              <div style={{ fontSize: 12, color: "var(--color-slate)", marginTop: 2 }}>
                Current Bit Depth: <strong style={{ color: "var(--color-bark)" }}>{currentDepth.toFixed(1)}m</strong> · Target Section TD: <strong>3,850m</strong>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              onClick={handleOpenAlertEvidence}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                borderRadius: 8,
                background: "rgba(239, 68, 68, 0.12)",
                border: "1px solid rgba(239, 68, 68, 0.35)",
                color: "#b91c42",
                fontSize: 11,
                fontWeight: 800,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <Sparkles size={13} color="#ef4444" />
              Why Am I Seeing This Alert?
            </button>

            <button
              className="btn-secondary"
              onClick={() => handleOpenWellDossier({ well_id: "OIL-X123", name: "Bhogpara Well #123", formation: "F3", depth: 3850 })}
              style={{ fontSize: 11, padding: "7px 12px" }}
            >
              Active Well Dossier <ArrowRight size={13} />
            </button>
          </div>
        </div>

        {/* Visual Depth Axis: 3,050m ── 3,180m ── 3,290m ── 3,450m */}
        <div style={{ position: "relative", margin: "14px 4px 6px" }}>
          <div style={{ height: 10, background: "var(--bg-elevated)", borderRadius: 5, border: "1px solid var(--color-sage-mist)", width: "100%", position: "relative", overflow: "hidden" }}>
            {/* Risk Zone (3180m - 3290m) */}
            <div
              style={{
                position: "absolute",
                left: "32.5%",
                width: "27.5%",
                height: "100%",
                background: "rgba(239, 68, 68, 0.3)",
                borderLeft: "2px solid #ef4444",
                borderRight: "2px solid #ef4444",
              }}
            />
          </div>

          {/* Current Bit Marker */}
          {(() => {
            const pct = Math.max(0, Math.min(100, ((currentDepth - 3050) / 400) * 100));
            return (
              <div
                style={{
                  position: "absolute",
                  top: -24,
                  left: `${pct}%`,
                  transform: "translateX(-50%)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  zIndex: 10,
                }}
              >
                <div
                  style={{
                    background: "var(--color-canopy)",
                    color: "var(--color-mint-pulse)",
                    padding: "2px 8px",
                    borderRadius: 4,
                    fontSize: 10,
                    fontWeight: 800,
                    fontFamily: "var(--font-mono)",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
                    whiteSpace: "nowrap",
                  }}
                >
                  ▼ BIT: {currentDepth.toFixed(1)}m
                </div>
              </div>
            );
          })()}

          {/* Axis Scale Labels */}
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--color-muted-slate)", marginTop: 8 }}>
            <span>3,050m (Section Spud)</span>
            <span style={{ color: "#b91c42", fontWeight: 700 }}>
              ⚠ Stuck Pipe Danger Window: 3,180m – 3,290m ({distanceToRisk > 0 ? `${distanceToRisk.toFixed(1)}m ahead` : "INSIDE ZONE"})
            </span>
            <span>3,450m (F4 Transition)</span>
          </div>
        </div>
      </div>

      {/* ── 2. OFFSET INTELLIGENCE & PROXIMITY RADAR (2-COLUMN GRID) ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 18 }}>
        {/* Left Card: Primary Analogue Intelligence */}
        <div className="glass-card">
          <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div className="card-title">
              <Compass size={16} color="var(--color-orb-violet)" />
              Primary Offset Analogue · OIL-X104
            </div>
            <span className="badge badge-violet" style={{ fontSize: 10 }}>91% DETERMINISTIC MATCH</span>
          </div>

          <div style={{ padding: "0 0 10px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, fontSize: 12 }}>
              <span style={{ color: "var(--color-slate)" }}>
                Distance: <strong>3.4 km</strong> · Formation: <strong>F3 Tipam</strong> · TD: <strong>3,850m</strong>
              </span>
              <button
                onClick={() => handleOpenWellDossier({ well_id: "OIL-X104", name: "Bhogpara South Analogue #104", formation: "F3", depth: 3850 })}
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "var(--color-canopy)",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                Inspect Dossier <ArrowRight size={12} />
              </button>
            </div>

            {/* Critical Incident Warning from this Offset */}
            <div style={{ padding: 12, background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.25)", borderRadius: 8, marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: "#b91c42" }}>Historical Differential Stuck Pipe</span>
                <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--color-slate)" }}>3,280m · 16h NPT</span>
              </div>
              <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--color-slate)", lineHeight: 1.4 }}>
                Drillstring stuck across permeable sand interval. Cured via spotting lubricant fluid and jarring. Verified document: <strong>WCR-X104-2023</strong>.
              </p>
            </div>

            {/* Collapsible Deterministic Breakdown Toggle */}
            <div style={{ borderTop: "1px solid var(--color-sage-mist)", paddingTop: 10 }}>
              <button
                onClick={() => setShowSimilarityDetails(!showSimilarityDetails)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                  background: "transparent",
                  border: "none",
                  padding: "4px 0",
                  cursor: "pointer",
                  fontSize: 11,
                  fontWeight: 700,
                  color: "var(--color-slate)",
                }}
              >
                <span>Deterministic Calculation Breakdown (5 Factors)</span>
                {showSimilarityDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {showSimilarityDetails && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                  {deterministicFactors.map((item) => (
                    <div key={item.label} style={{ padding: "6px 10px", borderRadius: 6, background: "var(--bg-elevated)", border: "1px solid var(--color-sage-mist)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 700 }}>
                        <span style={{ color: "var(--color-bark)" }}>{item.label}</span>
                        <span style={{ color: "var(--color-canopy)" }}>{item.score}%</span>
                      </div>
                      <div style={{ fontSize: 10, color: "var(--color-muted-slate)", marginTop: 2 }}>{item.desc}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Card: Offset Proximity Radar */}
        <div className="glass-card">
          <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div className="card-title">
              <MapPin size={16} color="var(--color-canopy)" />
              Nearby Offset Wells Radar
            </div>
            {/* Radius Filter Pills */}
            <div style={{ display: "flex", gap: 4 }}>
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
                    background: selectedRadiusKm === rad ? "var(--color-canopy)" : "var(--color-sheet-white)",
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
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
              {nearbyWellsFiltered.map((w) => (
                <div
                  key={w.well_id}
                  onClick={() => handleOpenWellDossier(w)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 12px",
                    borderRadius: 8,
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--color-sage-mist)",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 12, color: "var(--color-bark)" }}>
                      {w.well_id} · {w.name}
                    </div>
                    <div style={{ fontSize: 10, color: "var(--color-muted-slate)" }}>
                      Distance: {w.distance_km} km · Depth: {w.depth}m
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span className="badge badge-mint" style={{ fontSize: 9 }}>
                      {w.similarity}% Match
                    </span>
                    <div style={{ fontSize: 9, color: "var(--color-slate)", marginTop: 2 }}>Click to inspect</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ textAlign: "right" }}>
              <button
                className="btn-secondary"
                onClick={() => onNavigateToTab("map")}
                style={{ fontSize: 11, padding: "5px 12px" }}
              >
                Open Full Geospatial GIS Map <ChevronRight size={13} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. COGNITIVE DECISION SUPPORT & INSTITUTIONAL MEMORY (2-COLUMN GRID) ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 18 }}>
        {/* Ask NWIS Copilot Console Launcher */}
        <div className="glass-card">
          <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div className="card-title">
              <Bot size={16} color="var(--color-canopy)" />
              Ask NWIS · Grounded Drilling AI Assistant
            </div>
            <span className="badge badge-canopy" style={{ fontSize: 9 }}>GRAPH-RAG PIPELINE</span>
          </div>

          <div style={{ padding: "0 0 10px" }}>
            <div style={{ fontSize: 11, color: "var(--color-slate)", marginBottom: 10 }}>
              Queries cross-reference historical DDR/WCR reports with strict citation verification:
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
              {[
                "Why is 3180m–3290m historically significant in OIL-X104?",
                "What successful mud treatments freed stuck pipe in formation F3?",
                "What torque spike warning precursors were logged in offset wells?",
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => onNavigateToTab("ai")}
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
              onClick={() => onNavigateToTab("ai")}
              style={{ width: "100%", justifyContent: "center", fontSize: 11, padding: "8px 16px" }}
            >
              Open Full Ask NWIS AI Console <ArrowRight size={13} />
            </button>
          </div>
        </div>

        {/* Drilling Memory & Well Comparison Tool */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="glass-card">
            <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div className="card-title">
                <Share2 size={16} color="var(--color-canopy)" />
                Institutional Drilling Memory Lineage
              </div>
              <span className="badge badge-canopy" style={{ fontSize: 9 }}>KNOWLEDGE GRAPH</span>
            </div>
            <div style={{ padding: "0 0 10px" }}>
              <div style={{ fontSize: 11, color: "var(--color-slate)", lineHeight: 1.5, marginBottom: 8 }}>
                Semantic knowledge graph trace connecting active well to offset evidence:
              </div>
              <div style={{ padding: "8px 10px", background: "var(--bg-elevated)", borderRadius: 6, border: "1px solid var(--color-sage-mist)", fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-bark)", marginBottom: 10 }}>
                OIL-X123 → OIL-X104 → Formation F3 → Stuck Pipe (3,280m) → WCR-X104-2023
              </div>
              <button
                className="btn-secondary"
                onClick={() => onNavigateToTab("memory")}
                style={{ width: "100%", justifyContent: "center", fontSize: 11, padding: "6px 12px" }}
              >
                Launch Drilling Memory Studio <ArrowRight size={13} />
              </button>
            </div>
          </div>

          <div className="glass-card" style={{ padding: "14px 18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <strong style={{ fontSize: 12, color: "var(--color-bark)" }}>Comparative Offset Analysis</strong>
                <div style={{ fontSize: 11, color: "var(--color-slate)", marginTop: 2 }}>Compare wellbore geometry, mud weight and lithology side-by-side.</div>
              </div>
              <button
                className="btn-secondary"
                onClick={() => onNavigateToTab("comparison")}
                style={{ fontSize: 11, padding: "6px 12px", whiteSpace: "nowrap" }}
              >
                Compare Wells <ArrowRight size={12} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
