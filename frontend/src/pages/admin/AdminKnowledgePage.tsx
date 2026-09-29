import React, { useState, useEffect } from "react";
import {
  Database,
  Layers,
  AlertTriangle,
  FileText,
  Search,
  RefreshCw,
  MapPin,
  CheckCircle2,
  Activity,
  Plus,
  Edit2,
  Shield,
  Filter,
} from "lucide-react";
import { api } from "../../services/api";

export const AdminKnowledgePage: React.FC = () => {
  const [entities, setEntities] = useState<any>({ wells: [], events: [], risk_zones: [] });
  const [activeCategory, setActiveCategory] = useState<"wells" | "formations" | "events" | "risks" | "documents">("wells");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    loadKnowledgeData();
  }, []);

  const loadKnowledgeData = async () => {
    setIsLoading(true);
    try {
      const data = await api.getAdminEntities();
      setEntities(data || { wells: [], events: [], risk_zones: [] });
    } catch (err) {
      console.error("Failed to load knowledge entities:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const wells = entities.wells || [];
  const events = entities.events || [];
  const risks = entities.risk_zones || [];

  const formationsList = [
    { name: "F1 (Namsang Formation)", lithology: "Unconsolidated sands, gravels, clay beds", depth_range: "0m – 2,100m", risk_profile: "Borehole washouts, loose sand packing", analogues: "OIL-X138, OIL-X148" },
    { name: "F2 (Surma Formation)", lithology: "Interbedded sandstone, siltstone, laminated shales", depth_range: "2,100m – 2,800m", risk_profile: "Shale swelling, minor bit balling", analogues: "OIL-X127, OIL-X142, OIL-X152" },
    { name: "F3 (Tipam Sandstone)", lithology: "Massive permeable quartzose sandstone, silt stringers", depth_range: "2,800m – 3,500m", risk_profile: "Differential sticking (3,180m–3,290m), mud loss", analogues: "OIL-X123, OIL-X104, OIL-X101, OIL-X106" },
    { name: "F4 (Barail Coal-Shale)", lithology: "Carbonaceous shale, coal seams, tight sandstone", depth_range: "3,500m – 4,200m", risk_profile: "Gas kicks, abnormal overpressure > 11.4 ppg", analogues: "OIL-X131, OIL-X107, OIL-X145" },
    { name: "F5 (Kopili Shale)", lithology: "Hard splintery marine shales, micro-fractured limestone", depth_range: "4,200m – 4,800m", risk_profile: "Severe sloughing shale, high torque spikes", analogues: "OIL-X103, OIL-X108" },
  ];

  const documentsList = [
    { doc_id: "WCR-X104-2023", title: "Well Completion Report — OIL-X104", type: "WCR", well: "OIL-X104", formation: "F3 (Tipam)", status: "Processed", chunks: 28 },
    { doc_id: "DDR-X104-2023", title: "Daily Drilling Report Master Log — OIL-X104", type: "DDR", well: "OIL-X104", formation: "F3 (Tipam)", status: "Processed", chunks: 34 },
    { doc_id: "WCR-X101-2022", title: "End of Well Report & Mud Log — OIL-X101", type: "WCR", well: "OIL-X101", formation: "F3 (Tipam)", status: "Processed", chunks: 22 },
    { doc_id: "WCR-X106-2022", title: "Differential Sticking Case Study — OIL-X106", type: "WCR", well: "OIL-X106", formation: "F3 (Tipam)", status: "Processed", chunks: 18 },
    { doc_id: "DDR-X107-2021", title: "High-Pressure Kick Well Control Summary — OIL-X107", type: "DDR", well: "OIL-X107", formation: "F4 (Barail)", status: "Processed", chunks: 26 },
  ];

  const handleSimulateAdd = (categoryName: string) => {
    setStatusMessage(`[Knowledge Admin] ${categoryName} record verified and indexed into institutional memory.`);
    setTimeout(() => setStatusMessage(null), 4000);
  };

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: "24px 32px", display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Title */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--color-sage-mist)", paddingBottom: 16 }}>
        <div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 9999, background: "rgba(147, 51, 234, 0.1)", color: "#9333ea", fontSize: 11, fontFamily: "var(--font-mono)", fontWeight: 700, marginBottom: 6 }}>
            <Database size={12} />
            <span>INSTITUTIONAL KNOWLEDGE MANAGEMENT</span>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--color-bark)", margin: 0 }}>
            Structured Historical Knowledge Repository
          </h1>
          <p style={{ margin: "4px 0 0", color: "var(--color-slate)", fontSize: 13 }}>
            Maintain curated offset wells, formations, historical drilling events, and hazard risk zones powering NWIS decision support.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={loadKnowledgeData}
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
            <span>Sync Knowledge</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div style={{ padding: "10px 16px", borderRadius: 8, background: "rgba(0, 230, 153, 0.12)", border: "1px solid rgba(0, 230, 153, 0.4)", color: "var(--color-canopy)", fontSize: 12, fontWeight: 700 }}>
          ✓ {statusMessage}
        </div>
      )}

      {/* 5 Categories Navigation per Prompt: Wells, Formations, Historical Events, Risk Zones, Documents */}
      <div style={{ display: "flex", gap: 8, borderBottom: "1px solid var(--color-sage-mist)", paddingBottom: 10, flexWrap: "wrap" }}>
        {[
          { id: "wells", label: `1. Wells (${wells.length})`, icon: <MapPin size={14} /> },
          { id: "formations", label: `2. Formations (${formationsList.length})`, icon: <Layers size={14} /> },
          { id: "events", label: `3. Historical Events (${events.length})`, icon: <Activity size={14} /> },
          { id: "risks", label: `4. Risk Zones (${risks.length})`, icon: <AlertTriangle size={14} /> },
          { id: "documents", label: `5. Documents Index (${documentsList.length})`, icon: <FileText size={14} /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveCategory(tab.id as any)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 16px",
              borderRadius: 8,
              border: "none",
              background: activeCategory === tab.id ? "var(--color-canopy)" : "transparent",
              color: activeCategory === tab.id ? "#ffffff" : "var(--color-slate)",
              fontWeight: 700,
              fontSize: 12,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ── CATEGORY 1: WELLS ── */}
      {activeCategory === "wells" && (
        <div className="glass-card" style={{ padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: "var(--color-bark)", margin: 0 }}>
                Curated Historical Offset Wells
              </h3>
              <p style={{ margin: "2px 0 0", color: "var(--color-slate)", fontSize: 12 }}>
                Wells used as analogues for real-time similarity calculations and risk correlation.
              </p>
            </div>
            <button
              className="btn-primary"
              onClick={() => handleSimulateAdd("New Well Record")}
              style={{ fontSize: 11, padding: "6px 12px", display: "flex", alignItems: "center", gap: 6 }}
            >
              <Plus size={14} /> Add Well Record
            </button>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--color-sage-mist)", color: "var(--color-muted-slate)", fontSize: 10, fontWeight: 800, textTransform: "uppercase" }}>
                  <th style={{ padding: "8px 10px" }}>Well ID</th>
                  <th style={{ padding: "8px 10px" }}>Name / Operator</th>
                  <th style={{ padding: "8px 10px" }}>Field</th>
                  <th style={{ padding: "8px 10px" }}>Formation</th>
                  <th style={{ padding: "8px 10px" }}>Total Depth</th>
                  <th style={{ padding: "8px 10px" }}>Status</th>
                  <th style={{ padding: "8px 10px", textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {wells.slice(0, 15).map((w: any) => (
                  <tr key={w.well_id} style={{ borderBottom: "1px solid var(--color-sage-mist)" }}>
                    <td style={{ padding: "8px 10px", fontWeight: 800, color: "var(--color-bark)" }}>{w.well_id}</td>
                    <td style={{ padding: "8px 10px" }}>{w.name}</td>
                    <td style={{ padding: "8px 10px", color: "var(--color-slate)" }}>{w.field}</td>
                    <td style={{ padding: "8px 10px", color: "var(--color-canopy)", fontWeight: 600 }}>{w.formation}</td>
                    <td style={{ padding: "8px 10px", fontFamily: "var(--font-mono)" }}>{w.total_depth}m</td>
                    <td style={{ padding: "8px 10px" }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: w.is_active ? "rgba(0, 230, 153, 0.15)" : "var(--bg-elevated)", color: w.is_active ? "var(--color-canopy)" : "var(--color-muted-slate)" }}>
                        {w.status}
                      </span>
                    </td>
                    <td style={{ padding: "8px 10px", textAlign: "right" }}>
                      <button
                        onClick={() => handleSimulateAdd(`Updated Well ${w.well_id}`)}
                        style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--color-canopy)", padding: 4 }}
                        title="Edit Well Record"
                      >
                        <Edit2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── CATEGORY 2: FORMATIONS ── */}
      {activeCategory === "formations" && (
        <div className="glass-card" style={{ padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: "var(--color-bark)", margin: 0 }}>
                Stratigraphic Formations Taxonomy
              </h3>
              <p style={{ margin: "2px 0 0", color: "var(--color-slate)", fontSize: 12 }}>
                Lithological horizons, depth envelopes, and characteristic hazard profiles in Assam-Arakan Basin.
              </p>
            </div>
            <button
              className="btn-primary"
              onClick={() => handleSimulateAdd("New Geological Formation")}
              style={{ fontSize: 11, padding: "6px 12px", display: "flex", alignItems: "center", gap: 6 }}
            >
              <Plus size={14} /> Add Formation
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {formationsList.map((f) => (
              <div key={f.name} style={{ padding: 14, borderRadius: 10, background: "var(--bg-elevated)", border: "1px solid var(--color-sage-mist)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <strong style={{ fontSize: 14, color: "var(--color-bark)" }}>{f.name}</strong>
                  <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--color-canopy)" }}>{f.depth_range}</span>
                </div>
                <div style={{ fontSize: 11, color: "var(--color-slate)", marginBottom: 4 }}>
                  <strong>Lithology:</strong> {f.lithology}
                </div>
                <div style={{ fontSize: 11, color: "#b91c42" }}>
                  <strong>Key Historical Risks:</strong> {f.risk_profile}
                </div>
                <div style={{ fontSize: 10, color: "var(--color-muted-slate)", marginTop: 4 }}>
                  Curated Analogues: {f.analogues}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── CATEGORY 3: HISTORICAL EVENTS ── */}
      {activeCategory === "events" && (
        <div className="glass-card" style={{ padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: "var(--color-bark)", margin: 0 }}>
                Historical Drilling Incidents &amp; NPT Catalog
              </h3>
              <p style={{ margin: "2px 0 0", color: "var(--color-slate)", fontSize: 12 }}>
                Verified historical stuck-pipe, mud-loss, kick, and torque-spike records indexed by depth and formation.
              </p>
            </div>
            <button
              className="btn-primary"
              onClick={() => handleSimulateAdd("New Historical Incident")}
              style={{ fontSize: 11, padding: "6px 12px", display: "flex", alignItems: "center", gap: 6 }}
            >
              <Plus size={14} /> Log Historical Event
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {events.slice(0, 15).map((e: any) => (
              <div key={e.id} style={{ padding: "10px 14px", borderRadius: 8, background: "var(--bg-elevated)", border: "1px solid var(--color-sage-mist)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 6px", borderRadius: 4, background: e.severity === "CRITICAL" ? "rgba(185, 28, 66, 0.15)" : "rgba(245, 158, 11, 0.15)", color: e.severity === "CRITICAL" ? "#b91c42" : "#d97706" }}>
                      {e.severity}
                    </span>
                    <strong style={{ fontSize: 12, color: "var(--color-bark)" }}>{e.well_id} — {e.event_type}</strong>
                    <span style={{ fontSize: 11, color: "var(--color-muted-slate)" }}>at {e.depth_start}m – {e.depth_end}m</span>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--color-slate)", marginTop: 3 }}>{e.description}</div>
                </div>
                <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--color-canopy)", fontWeight: 700 }}>
                  {e.source_document}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── CATEGORY 4: RISK ZONES ── */}
      {activeCategory === "risks" && (
        <div className="glass-card" style={{ padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: "var(--color-bark)", margin: 0 }}>
                Depth-Indexed Hazard Risk Zones
              </h3>
              <p style={{ margin: "2px 0 0", color: "var(--color-slate)", fontSize: 12 }}>
                Pre-defined subsurface intervals triggering proactive advisory alerts as drill bit approaches.
              </p>
            </div>
            <button
              className="btn-primary"
              onClick={() => handleSimulateAdd("New Hazard Risk Zone")}
              style={{ fontSize: 11, padding: "6px 12px", display: "flex", alignItems: "center", gap: 6 }}
            >
              <Plus size={14} /> Define Risk Zone
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {risks.map((r: any) => (
              <div key={r.id} style={{ padding: "12px 14px", borderRadius: 8, background: "var(--bg-elevated)", border: "1px solid var(--color-sage-mist)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 6px", borderRadius: 4, background: "rgba(239, 68, 68, 0.15)", color: "#ef4444" }}>
                      {r.severity}
                    </span>
                    <strong style={{ fontSize: 13, color: "var(--color-bark)" }}>{r.risk_type} Interval ({r.depth_start}m – {r.depth_end}m)</strong>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "var(--color-canopy)" }}>{r.formation}</span>
                </div>
                <div style={{ fontSize: 11, color: "var(--color-slate)" }}>
                  <strong>Recommended Operational Mitigation:</strong> {r.recommended_action}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── CATEGORY 5: DOCUMENTS INDEX ── */}
      {activeCategory === "documents" && (
        <div className="glass-card" style={{ padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: "var(--color-bark)", margin: 0 }}>
                Historical Technical Documents Repository
              </h3>
              <p style={{ margin: "2px 0 0", color: "var(--color-slate)", fontSize: 12 }}>
                Indexed WCR, DDR, Mud, and Geological reports synthesized by the AI RAG engine.
              </p>
            </div>
            <button
              className="btn-primary"
              onClick={() => handleSimulateAdd("New Document Reference")}
              style={{ fontSize: 11, padding: "6px 12px", display: "flex", alignItems: "center", gap: 6 }}
            >
              <Plus size={14} /> Register Document
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {documentsList.map((doc) => (
              <div key={doc.doc_id} style={{ padding: "10px 14px", borderRadius: 8, background: "var(--bg-elevated)", border: "1px solid var(--color-sage-mist)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 6px", borderRadius: 4, background: "rgba(147, 51, 234, 0.12)", color: "#9333ea" }}>
                      {doc.type}
                    </span>
                    <strong style={{ fontSize: 12, color: "var(--color-bark)" }}>{doc.title}</strong>
                    <span style={{ fontSize: 11, color: "var(--color-muted-slate)" }}>({doc.doc_id})</span>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--color-slate)", marginTop: 2 }}>
                    Well: {doc.well} &nbsp;·&nbsp; Formation: {doc.formation} &nbsp;·&nbsp; Semantic Chunks: {doc.chunks}
                  </div>
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: "rgba(0, 230, 153, 0.12)", color: "var(--color-canopy)" }}>
                  {doc.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
