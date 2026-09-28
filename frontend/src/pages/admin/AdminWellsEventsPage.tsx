import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
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
  ArrowRight,
} from "lucide-react";
import { api } from "../../services/api";

export const AdminWellsEventsPage: React.FC = () => {
  const [entities, setEntities] = useState<any>({ wells: [], events: [], risk_zones: [] });
  const [activeSubtab, setActiveSubtab] = useState<"wells" | "events" | "risks">("wells");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");

  useEffect(() => {
    loadEntities();
  }, []);

  const loadEntities = async () => {
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

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: "24px 32px", display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Title */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--color-sage-mist)", paddingBottom: 16 }}>
        <div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 9999, background: "rgba(217, 119, 6, 0.08)", color: "#b45309", fontSize: 11, fontFamily: "var(--font-mono)", fontWeight: 700, marginBottom: 6 }}>
            <Database size={12} />
            <span>KNOWLEDGE REPOSITORY TAXONOMY</span>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--color-bark)", margin: 0 }}>
            Wells, Formations &amp; Events Knowledge Base
          </h1>
          <p style={{ margin: "4px 0 0", color: "var(--color-slate)", fontSize: 13 }}>
            Inspect curated offset wells, historical stuck-pipe/mud-loss incidents, and depth-indexed hazard intervals.
          </p>
        </div>

        <button
          onClick={loadEntities}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 16px",
            borderRadius: 10,
            border: "1px solid var(--color-sage-mist)",
            background: "#ffffff",
            color: "var(--color-bark)",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
          <span>Refresh Records</span>
        </button>
      </div>

      {/* Subtab Navigation */}
      <div style={{ display: "flex", gap: 8, borderBottom: "1px solid var(--color-sage-mist)", paddingBottom: 8 }}>
        <button
          onClick={() => setActiveSubtab("wells")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 16px",
            borderRadius: 8,
            border: "none",
            background: activeSubtab === "wells" ? "var(--color-canopy)" : "transparent",
            color: activeSubtab === "wells" ? "#ffffff" : "var(--color-slate)",
            fontWeight: 700,
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          <MapPin size={14} />
          <span>Well Records ({wells.length})</span>
        </button>
        <button
          onClick={() => setActiveSubtab("events")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 16px",
            borderRadius: 8,
            border: "none",
            background: activeSubtab === "events" ? "var(--color-canopy)" : "transparent",
            color: activeSubtab === "events" ? "#ffffff" : "var(--color-slate)",
            fontWeight: 700,
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          <Activity size={14} />
          <span>Historical Events ({events.length})</span>
        </button>
        <button
          onClick={() => setActiveSubtab("risks")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 16px",
            borderRadius: 8,
            border: "none",
            background: activeSubtab === "risks" ? "var(--color-canopy)" : "transparent",
            color: activeSubtab === "risks" ? "#ffffff" : "var(--color-slate)",
            fontWeight: 700,
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          <AlertTriangle size={14} />
          <span>Geological Risk Zones ({risks.length})</span>
        </button>
      </div>

      {/* Content for Active Subtab */}
      {activeSubtab === "wells" && (
        <div style={{ background: "#ffffff", border: "1px solid var(--color-sage-mist)", borderRadius: 14, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
            <thead>
              <tr style={{ background: "var(--bg-elevated)", borderBottom: "1px solid var(--color-sage-mist)", color: "var(--color-slate)", fontSize: 11, fontFamily: "var(--font-mono)", textTransform: "uppercase" }}>
                <th style={{ padding: "12px 18px" }}>Well ID</th>
                <th style={{ padding: "12px 18px" }}>Name</th>
                <th style={{ padding: "12px 18px" }}>Field</th>
                <th style={{ padding: "12px 18px" }}>Formation</th>
                <th style={{ padding: "12px 18px" }}>Total Depth</th>
                <th style={{ padding: "12px 18px" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {wells.map((w: any) => (
                <tr key={w.id} style={{ borderBottom: "1px solid var(--color-sage-mist)" }}>
                  <td style={{ padding: "14px 18px", fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--color-canopy)" }}>{w.well_id}</td>
                  <td style={{ padding: "14px 18px", fontWeight: 600 }}>{w.name}</td>
                  <td style={{ padding: "14px 18px", color: "var(--color-slate)" }}>{w.field || "Assam Basin"}</td>
                  <td style={{ padding: "14px 18px" }}>{w.formation}</td>
                  <td style={{ padding: "14px 18px", fontFamily: "var(--font-mono)" }}>{w.total_depth}m</td>
                  <td style={{ padding: "14px 18px" }}>
                    <span style={{ padding: "2px 8px", borderRadius: 9999, fontSize: 10, fontFamily: "var(--font-mono)", fontWeight: 700, background: w.is_active ? "rgba(13, 122, 78, 0.1)" : "rgba(0,0,0,0.06)", color: w.is_active ? "#0d7a4e" : "var(--color-slate)" }}>
                      {w.is_active ? "ACTIVE DRILLING" : w.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeSubtab === "events" && (
        <div style={{ background: "#ffffff", border: "1px solid var(--color-sage-mist)", borderRadius: 14, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
            <thead>
              <tr style={{ background: "var(--bg-elevated)", borderBottom: "1px solid var(--color-sage-mist)", color: "var(--color-slate)", fontSize: 11, fontFamily: "var(--font-mono)", textTransform: "uppercase" }}>
                <th style={{ padding: "12px 18px" }}>Event Type</th>
                <th style={{ padding: "12px 18px" }}>Offset Well</th>
                <th style={{ padding: "12px 18px" }}>Depth Interval</th>
                <th style={{ padding: "12px 18px" }}>Formation</th>
                <th style={{ padding: "12px 18px" }}>Severity</th>
                <th style={{ padding: "12px 18px" }}>Description</th>
                <th style={{ padding: "12px 18px" }}>Source Document</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e: any) => (
                <tr key={e.id} style={{ borderBottom: "1px solid var(--color-sage-mist)" }}>
                  <td style={{ padding: "14px 18px", fontWeight: 700, color: "var(--color-bark)" }}>{e.event_type.replace(/_/g, " ")}</td>
                  <td style={{ padding: "14px 18px", fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--color-canopy)" }}>{e.well_id}</td>
                  <td style={{ padding: "14px 18px", fontFamily: "var(--font-mono)" }}>{e.depth_start}m – {e.depth_end}m</td>
                  <td style={{ padding: "14px 18px" }}>{e.formation}</td>
                  <td style={{ padding: "14px 18px" }}>
                    <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 700, background: e.severity === "CRITICAL" ? "rgba(185, 28, 66, 0.1)" : "rgba(249, 115, 22, 0.1)", color: e.severity === "CRITICAL" ? "#b91c42" : "#ea580c" }}>
                      {e.severity}
                    </span>
                  </td>
                  <td style={{ padding: "14px 18px", color: "var(--color-slate)", maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.description}</td>
                  <td style={{ padding: "14px 18px", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-canopy)" }}>{e.source_document}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeSubtab === "risks" && (
        <div style={{ background: "#ffffff", border: "1px solid var(--color-sage-mist)", borderRadius: 14, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
            <thead>
              <tr style={{ background: "var(--bg-elevated)", borderBottom: "1px solid var(--color-sage-mist)", color: "var(--color-slate)", fontSize: 11, fontFamily: "var(--font-mono)", textTransform: "uppercase" }}>
                <th style={{ padding: "12px 18px" }}>Risk Type</th>
                <th style={{ padding: "12px 18px" }}>Formation</th>
                <th style={{ padding: "12px 18px" }}>Depth Range</th>
                <th style={{ padding: "12px 18px" }}>Severity</th>
                <th style={{ padding: "12px 18px" }}>Recommended Action</th>
              </tr>
            </thead>
            <tbody>
              {risks.map((r: any) => (
                <tr key={r.id} style={{ borderBottom: "1px solid var(--color-sage-mist)" }}>
                  <td style={{ padding: "14px 18px", fontWeight: 700, color: "var(--color-bark)" }}>{r.risk_type || "Geological Hazard"}</td>
                  <td style={{ padding: "14px 18px" }}>{r.formation}</td>
                  <td style={{ padding: "14px 18px", fontFamily: "var(--font-mono)" }}>{r.depth_start}m – {r.depth_end}m</td>
                  <td style={{ padding: "14px 18px" }}>
                    <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 700, background: r.severity === "CRITICAL" ? "rgba(185, 28, 66, 0.1)" : "rgba(249, 115, 22, 0.1)", color: r.severity === "CRITICAL" ? "#b91c42" : "#ea580c" }}>
                      {r.severity}
                    </span>
                  </td>
                  <td style={{ padding: "14px 18px", color: "var(--color-slate)" }}>{r.recommended_action || "Maintain active mud conditioning and limit static drillstring time."}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
