import React, { useState, useEffect } from "react";
import {
  Compass,
  Layers,
  Activity,
  Gauge,
  Calendar,
  MapPin,
  FileText,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  TrendingDown,
  ArrowRight,
} from "lucide-react";
import { api } from "../services/api";
import { Well, SimulationState } from "../types";

interface CurrentWellPageProps {
  simulation?: SimulationState;
  onAskAI?: (wellId: string) => void;
}

export const CurrentWellPage: React.FC<CurrentWellPageProps> = ({ simulation, onAskAI }) => {
  const [well, setWell] = useState<Well | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    loadActiveWell();
  }, []);

  const loadActiveWell = async () => {
    setIsLoading(true);
    try {
      const active = await api.getActiveWell();
      setWell(active);
    } catch (err) {
      console.error("Failed to load active well:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const currentDepth = simulation?.current_depth || 3050.0;
  const totalDepth = well?.total_depth || 3650.0;
  const progressPct = Math.min(100, Math.round((currentDepth / totalDepth) * 100));

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: "24px 32px", display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Title */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--color-sage-mist)", paddingBottom: 16 }}>
        <div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 9999, background: "rgba(0, 230, 153, 0.15)", color: "var(--color-canopy)", fontSize: 11, fontFamily: "var(--font-mono)", fontWeight: 700, marginBottom: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--color-mint-pulse)" }} />
            <span>PRIMARY DRILLING TARGET</span>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--color-bark)", margin: 0 }}>
            Current Well Dossier &amp; Active Telemetry · {well?.well_id || "OIL-X123"}
          </h1>
          <p style={{ margin: "4px 0 0", color: "var(--color-slate)", fontSize: 13 }}>
            {well?.name || "Bhogpara Well #123"} · {well?.field || "Bhogpara Field"} · Formation: {well?.formation || "Tipam Sandstone"}
          </p>
        </div>

        <button
          onClick={loadActiveWell}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 16px",
            borderRadius: 10,
            border: "1px solid var(--color-sage-mist)",
            background: "var(--bg-elevated)",
            color: "var(--color-bark)",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
          <span>Sync Dossier</span>
        </button>
      </div>

      {/* Depth Advancement Progress */}
      <div style={{ background: "var(--color-sheet-white)", border: "1px solid var(--color-sage-mist)", borderRadius: 14, padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--color-bark)" }}>Drilling Progress to Total Depth</span>
          <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--color-canopy)" }}>
            {currentDepth.toFixed(1)}m / {totalDepth.toFixed(0)}m ({progressPct}%)
          </span>
        </div>
        <div style={{ height: 10, borderRadius: 999, background: "var(--bg-elevated)", overflow: "hidden", border: "1px solid var(--color-sage-mist)" }}>
          <div style={{ width: `${progressPct}%`, height: "100%", background: "var(--color-canopy)", transition: "width 0.4s ease" }} />
        </div>
      </div>

      {/* Section Progress & Geological Horizon Bar */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
        <div style={{ background: "var(--color-sheet-white)", border: "1px solid var(--color-sage-mist)", borderRadius: 12, padding: "14px 18px" }}>
          <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--color-muted-slate)", fontWeight: 700, textTransform: "uppercase" }}>Current Section</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "var(--color-bark)", marginTop: 4 }}>
            12-1/4" Hole Section
          </div>
          <div style={{ fontSize: 11, color: "var(--color-slate)", marginTop: 2 }}>2,100m – 3,180m (Tipam Intermediate)</div>
        </div>

        <div style={{ background: "var(--color-sheet-white)", border: "1px solid var(--color-sage-mist)", borderRadius: 12, padding: "14px 18px" }}>
          <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--color-muted-slate)", fontWeight: 700, textTransform: "uppercase" }}>Active Drillstring BHA</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "var(--color-bark)", marginTop: 4 }}>
            Steerable Motor BHA
          </div>
          <div style={{ fontSize: 11, color: "var(--color-slate)", marginTop: 2 }}>1.5° AKO Bend · PDC Matrix 5-Blade</div>
        </div>

        <div style={{ background: "var(--color-sheet-white)", border: "1px solid var(--color-sage-mist)", borderRadius: 12, padding: "14px 18px" }}>
          <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--color-muted-slate)", fontWeight: 700, textTransform: "uppercase" }}>Drilling Fluid System</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "var(--color-canopy)", marginTop: 4 }}>
            10.8 ppg KCl-Polymer
          </div>
          <div style={{ fontSize: 11, color: "var(--color-slate)", marginTop: 2 }}>ECD: 11.2 ppg · PV: 22 · YP: 18</div>
        </div>

        <div style={{ background: "var(--color-sheet-white)", border: "1px solid var(--color-sage-mist)", borderRadius: 12, padding: "14px 18px" }}>
          <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--color-muted-slate)", fontWeight: 700, textTransform: "uppercase" }}>Next Casing Point</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#b91c42", marginTop: 4 }}>
            9-5/8" Casing @ 3,180m
          </div>
          <div style={{ fontSize: 11, color: "var(--color-slate)", marginTop: 2 }}>8.0m remaining to section TD</div>
        </div>
      </div>

      {/* Well Technical Profile */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 20 }}>
        <div style={{ background: "var(--color-sheet-white)", border: "1px solid var(--color-sage-mist)", borderRadius: 14, padding: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: "var(--color-bark)", margin: "0 0 14px" }}>
            Technical Well Architecture
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--color-sage-mist)" }}>
              <span style={{ color: "var(--color-slate)" }}>Operator</span>
              <strong style={{ color: "var(--color-bark)" }}>{well?.operator || "Oil India Limited (OIL)"}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--color-sage-mist)" }}>
              <span style={{ color: "var(--color-slate)" }}>Trajectory Type</span>
              <strong style={{ color: "var(--color-bark)" }}>{well?.trajectory_type || "Directional (J-Profile)"}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--color-sage-mist)" }}>
              <span style={{ color: "var(--color-slate)" }}>Surface Coordinates</span>
              <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>{well?.latitude?.toFixed(4) || "27.3521"}° N, {well?.longitude?.toFixed(4) || "95.2847"}° E</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--color-sage-mist)" }}>
              <span style={{ color: "var(--color-slate)" }}>Current Mud Weight</span>
              <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--color-canopy)" }}>{well?.mud_weight || 10.8} ppg (Oil-Base Mud)</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0" }}>
              <span style={{ color: "var(--color-slate)" }}>Target Formation</span>
              <strong style={{ color: "var(--color-bark)" }}>{well?.formation || "Tipam Sandstone (Reservoir)"}</strong>
            </div>
          </div>
        </div>

        <div style={{ background: "var(--color-sheet-white)", border: "1px solid var(--color-sage-mist)", borderRadius: 14, padding: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: "var(--color-bark)", margin: "0 0 14px" }}>
            Casing Program &amp; Geological Notes
          </h3>
          <div style={{ fontSize: 12, lineHeight: 1.7, color: "var(--color-bark)", background: "var(--bg-elevated)", padding: 14, borderRadius: 10, border: "1px solid var(--color-sage-mist)", marginBottom: 12 }}>
            {well?.casing_program || "30\" Conductor @ 60m | 20\" Surface @ 650m | 13-3/8\" Intermediate @ 2,100m | 9-5/8\" Production Casing @ 3,180m."}
          </div>
          <div style={{ fontSize: 12, lineHeight: 1.7, color: "var(--color-slate)" }}>
            <strong>Lessons Learned from Offset Wells:</strong> {well?.lessons_learned || "Approaching Tipam Sandstone interval at 3,180m requires strict monitoring of torque spikes and mud losses. Pre-stage 500L LCM pills on rig floor."}
          </div>
        </div>
      </div>
    </div>
  );
};
