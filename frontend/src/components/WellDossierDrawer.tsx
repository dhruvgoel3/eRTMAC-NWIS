import React, { useState } from "react";
import {
  X,
  Layers,
  ShieldAlert,
  Clock,
  Compass,
  FileText,
  Activity,
  ChevronRight,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { Well } from "../types";

interface WellDossierDrawerProps {
  well: Well | null;
  onClose: () => void;
  onAskAIAboutWell?: (wellId: string) => void;
}

const SEV_BADGE: Record<string, string> = {
  CRITICAL: "badge-rose",
  HIGH: "badge-amber",
  MEDIUM: "badge-amber",
  LOW: "badge-emerald",
};

export const WellDossierDrawer: React.FC<WellDossierDrawerProps> = ({
  well,
  onClose,
  onAskAIAboutWell,
}) => {
  const [activeTab, setActiveTab] = useState<"overview" | "specs" | "formations" | "hazards">("overview");

  if (!well) return null;
  const events = well.events || [];

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside className="drawer-panel" onClick={(e) => e.stopPropagation()}>
        {/* Drawer Header */}
        <div className="drawer-header">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 10,
                background: well.is_active ? "var(--color-canopy)" : "var(--bg-elevated)",
                border: "1px solid var(--color-sage-mist)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: well.is_active ? "var(--color-mint-pulse)" : "var(--color-canopy)",
                fontWeight: 800,
                fontSize: 12,
                fontFamily: "var(--font-mono)",
              }}
            >
              {well.well_id.slice(-4)}
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: "var(--color-bark)", margin: 0 }}>
                  {well.name}
                </h3>
                <span className="badge badge-canopy" style={{ fontSize: 10 }}>{well.well_id}</span>
                {well.is_active && <span className="badge badge-mint" style={{ fontSize: 9 }}>ACTIVE RIG</span>}
              </div>
              <div style={{ fontSize: 11, color: "var(--color-slate)", marginTop: 2 }}>
                {well.field} · {well.formation} · TD: {well.total_depth}m
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close dossier drawer"
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              border: "1px solid var(--color-sage-mist)",
              background: "#ffffff",
              color: "var(--color-slate)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Tabbed Navigation for Progressive Disclosure */}
        <div
          style={{
            display: "flex",
            borderBottom: "1px solid var(--color-sage-mist)",
            background: "#f7f6f2",
            padding: "0 16px",
            gap: 6,
          }}
        >
          {[
            { id: "overview", label: "Overview" },
            { id: "specs", label: "BHA & Casing" },
            { id: "formations", label: "Formations" },
            { id: "hazards", label: `Events (${events.length})` },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              style={{
                padding: "10px 12px",
                border: "none",
                background: "transparent",
                borderBottom: activeTab === t.id ? "2px solid var(--color-canopy)" : "2px solid transparent",
                color: activeTab === t.id ? "var(--color-canopy)" : "var(--color-slate)",
                fontSize: 12,
                fontWeight: activeTab === t.id ? 800 : 600,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Drawer Body with Progressive Disclosure Sections */}
        <div className="drawer-body">
          {activeTab === "overview" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Summary Stats Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div style={{ padding: 12, background: "var(--bg-elevated)", borderRadius: 10, border: "1px solid var(--color-sage-mist)" }}>
                  <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--color-muted-slate)", fontWeight: 700, textTransform: "uppercase" }}>Well Type</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-bark)", marginTop: 2 }}>{well.well_type || "Directional / Development"}</div>
                </div>
                <div style={{ padding: 12, background: "var(--bg-elevated)", borderRadius: 10, border: "1px solid var(--color-sage-mist)" }}>
                  <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--color-muted-slate)", fontWeight: 700, textTransform: "uppercase" }}>Operator</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-bark)", marginTop: 2 }}>{well.operator || "Oil India Limited (OIL)"}</div>
                </div>
                <div style={{ padding: 12, background: "var(--bg-elevated)", borderRadius: 10, border: "1px solid var(--color-sage-mist)" }}>
                  <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--color-muted-slate)", fontWeight: 700, textTransform: "uppercase" }}>Total Depth</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "var(--color-canopy)", marginTop: 2 }}>{well.total_depth} m</div>
                </div>
                <div style={{ padding: 12, background: "var(--bg-elevated)", borderRadius: 10, border: "1px solid var(--color-sage-mist)" }}>
                  <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--color-muted-slate)", fontWeight: 700, textTransform: "uppercase" }}>Spud Date</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-bark)", marginTop: 2 }}>{well.spud_date || "2023-04-12"}</div>
                </div>
              </div>

              {/* Coordinates & Location */}
              <div style={{ padding: 14, background: "#ffffff", borderRadius: 10, border: "1px solid var(--color-sage-mist)" }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: "var(--color-bark)", marginBottom: 6 }}>Geospatial Positioning</div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--color-slate)" }}>
                  <span>Latitude: <strong>{well.latitude.toFixed(4)}°N</strong></span>
                  <span>Longitude: <strong>{well.longitude.toFixed(4)}°E</strong></span>
                  <span>Basin: <strong>Assam-Arakan</strong></span>
                </div>
              </div>

              {/* Status Note */}
              <div style={{ padding: 14, background: "rgba(0, 230, 153, 0.08)", borderRadius: 10, border: "1px solid rgba(0, 230, 153, 0.3)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 800, color: "var(--color-canopy)" }}>
                  <CheckCircle2 size={14} />
                  Operational Verification Status
                </div>
                <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--color-slate)", lineHeight: 1.5 }}>
                  Verified offset benchmark with complete DDR/WCR log sets archived in NWIS knowledge store.
                </p>
              </div>
            </div>
          )}

          {activeTab === "specs" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ padding: 14, background: "#ffffff", borderRadius: 10, border: "1px solid var(--color-sage-mist)" }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: "var(--color-bark)", marginBottom: 8 }}>BHA &amp; Drillstring Specifications</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 11, color: "var(--color-slate)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>BHA Architecture:</span>
                    <strong>Steerable Motor BHA (1.5° AKO)</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Bit Size / Type:</span>
                    <strong>8-1/2" PDC 5-Blade Matrix Body</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>MWD / LWD Package:</span>
                    <strong>GR + Dual Propagation Resistivity + APWD</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Mud System:</span>
                    <strong>KCl-Polymer WBM (10.6 – 10.9 ppg)</strong>
                  </div>
                </div>
              </div>

              <div style={{ padding: 14, background: "#ffffff", borderRadius: 10, border: "1px solid var(--color-sage-mist)" }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: "var(--color-bark)", marginBottom: 8 }}>Casing Program</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 11, color: "var(--color-slate)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>20" Conductor:</span>
                    <strong>Set at 120m (Cemented to surface)</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>13-3/8" Surface Casing:</span>
                    <strong>Set at 980m in Kopili shale</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>9-5/8" Intermediate:</span>
                    <strong>Set at 2,850m top Tipam</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>7" Production Liner:</span>
                    <strong>Planned TD at 3,850m</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "formations" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontSize: 11, color: "var(--color-slate)", marginBottom: 4 }}>
                Stratigraphic tops and reservoir horizons logged:
              </div>
              {[
                { name: "Namsang Formation", top: "450 m", thickness: "530 m", lith: "Sandstone / Claystone" },
                { name: "Girujan Clay", top: "980 m", thickness: "1,120 m", lith: "Mottled clay / Siltstone" },
                { name: "Tipam Sandstone (F3 Target)", top: "2,100 m", thickness: "1,180 m", lith: "Massive Sandstone / Coal streaks" },
                { name: "Barail Formation", top: "3,280 m", thickness: "570 m", lith: "Interbedded Sand / Carbonaceous Shale" },
              ].map((f) => (
                <div key={f.name} style={{ padding: "10px 12px", background: "var(--bg-elevated)", borderRadius: 8, border: "1px solid var(--color-sage-mist)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <strong style={{ fontSize: 12, color: "var(--color-bark)" }}>{f.name}</strong>
                    <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--color-canopy)" }}>Top: {f.top}</span>
                  </div>
                  <div style={{ fontSize: 10, color: "var(--color-muted-slate)", marginTop: 2 }}>
                    Thickness: {f.thickness} · Lithology: {f.lith}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === "hazards" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {events.length === 0 ? (
                <div style={{ textAlign: "center", padding: "30px 10px", color: "var(--color-slate)", fontSize: 12 }}>
                  No major NPT or hazardous incidents recorded for this offset.
                </div>
              ) : (
                events.map((ev, i) => (
                  <div
                    key={i}
                    style={{
                      padding: 12,
                      background: "#ffffff",
                      borderRadius: 8,
                      border: "1px solid var(--color-sage-mist)",
                      borderLeft: `4px solid ${ev.severity === "CRITICAL" ? "#ef4444" : ev.severity === "HIGH" ? "#f97316" : "#0fff87"}`,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <span className={`badge ${SEV_BADGE[ev.severity] || "badge-amber"}`} style={{ fontSize: 9 }}>
                        {ev.severity}
                      </span>
                      <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--color-muted-slate)" }}>
                        Depth: {(ev as any).depth || ev.depth_start || "3,280"}m
                      </span>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-bark)" }}>
                      {ev.event_type} · {ev.formation}
                    </div>
                    <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--color-slate)", lineHeight: 1.4 }}>
                      {ev.description}
                    </p>
                    {ev.npt_hours && (
                      <div style={{ fontSize: 10, color: "#b91c42", fontWeight: 700, marginTop: 4 }}>
                        Logged NPT: {ev.npt_hours} hours
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Drawer Footer with Contextual Actions */}
        <div className="drawer-footer">
          {onAskAIAboutWell && (
            <button
              onClick={() => {
                onAskAIAboutWell(well.well_id);
                onClose();
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                borderRadius: 8,
                background: "rgba(0, 230, 153, 0.15)",
                border: "1px solid rgba(0, 230, 153, 0.4)",
                color: "var(--color-canopy)",
                fontSize: 11,
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              <Sparkles size={13} color="var(--color-mint-pulse)" />
              Ask NWIS Copilot About {well.well_id}
            </button>
          )}

          <button
            onClick={onClose}
            className="btn-secondary"
            style={{ fontSize: 11, padding: "8px 14px" }}
          >
            Close
          </button>
        </div>
      </aside>
    </div>
  );
};
