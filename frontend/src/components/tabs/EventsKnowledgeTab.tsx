import React, { useState, useEffect } from "react";
import {
  FileText,
  Search,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  BarChart2,
  Clock,
} from "lucide-react";
import { WellEvent } from "../../types";
import { api } from "../../services/api";

const SEV_LEFT: Record<string, string> = {
  CRITICAL: "#b91c42",
  HIGH:     "#f97316",
  MEDIUM:   "#c47d0e",
  LOW:      "#0d7a4e",
};

const SEV_BADGE: Record<string, string> = {
  CRITICAL: "badge-rose",
  HIGH:     "badge-amber",
  MEDIUM:   "badge-amber",
  LOW:      "badge-emerald",
};

export const EventsKnowledgeTab: React.FC = () => {
  const [events, setEvents] = useState<WellEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEventType, setSelectedEventType] = useState("ALL");
  const [selectedSeverity, setSelectedSeverity] = useState("ALL");
  const [selectedFormation, setSelectedFormation] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => { fetchEvents(); }, [selectedEventType, selectedSeverity, selectedFormation]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const params: any = { limit: 120 };
      if (selectedEventType !== "ALL") params.event_type = selectedEventType;
      if (selectedSeverity !== "ALL") params.severity = selectedSeverity;
      if (selectedFormation !== "ALL") params.formation = selectedFormation;
      const data = await api.getEvents(params);
      setEvents(data);
    } catch (err) {
      console.error("Failed to fetch events", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredEvents = events.filter((e) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (e.well_name && e.well_name.toLowerCase().includes(q)) ||
      (e.well_id && e.well_id.toLowerCase().includes(q)) ||
      e.description.toLowerCase().includes(q) ||
      e.root_cause.toLowerCase().includes(q) ||
      e.mitigation.toLowerCase().includes(q)
    );
  });

  const totalNpt = events.reduce((s, e) => s + (e.npt_hours || 0), 0);
  const criticalCount = events.filter((e) => e.severity === "CRITICAL").length;
  const highCount = events.filter((e) => e.severity === "HIGH").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* Header Stats */}
      <div className="glass-card" style={{ padding: "20px 24px" }}>
        <div className="card-header">
          <div className="card-title">
            <FileText size={16} color="var(--color-canopy)" />
            Historical Drilling Events &amp; NPT Knowledge Repository
          </div>
          <span className="badge badge-canopy">Regional Drilling Memory</span>
        </div>

        <p style={{ fontSize: 13, color: "var(--color-slate)", marginBottom: 20, lineHeight: 1.6 }}>
          Institutional knowledge synthesized from 50+ offset wells in Upper Assam Basin. Review historical downhole events, root causes, and field-tested mitigation strategies applied by Oil India Limited drilling crews.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          {[
            { label: "DOCUMENTED INCIDENTS", value: `${events.length}`, color: "var(--color-canopy)" },
            { label: "TOTAL NPT",            value: `${totalNpt.toFixed(0)}h`, color: "#b91c42" },
            { label: "CRITICAL / HIGH",      value: `${criticalCount + highCount}`, color: "#c47d0e" },
            { label: "MOST VULNERABLE",      value: "Tipam", color: "var(--color-orb-violet)" },
          ].map((s) => (
            <div
              key={s.label}
              style={{
                padding: "14px 16px",
                borderRadius: 8,
                background: "var(--bg-elevated)",
                border: "1px solid var(--color-sage-mist)",
              }}
            >
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--color-muted-slate)", marginBottom: 6 }}>
                {s.label}
              </div>
              <div style={{ fontSize: 24, fontWeight: 500, color: s.color, letterSpacing: "-0.02em" }}>
                {s.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="glass-card" style={{ padding: "14px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
            <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--color-muted-slate)" }} />
            <input
              type="text"
              className="input-control"
              style={{ paddingLeft: 30 }}
              placeholder="Search root cause, mitigation, or well…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <select className="input-control" style={{ width: 200 }} value={selectedEventType} onChange={(e) => setSelectedEventType(e.target.value)}>
            <option value="ALL">All Event Types</option>
            <option value="MUD_LOSS">Mud Loss</option>
            <option value="STUCK_PIPE">Stuck Pipe</option>
            <option value="KICK">Well Control / Kick</option>
            <option value="TORQUE_SPIKE">Torque &amp; Drag Spikes</option>
            <option value="CEMENTING_ISSUE">Cementing Issues</option>
            <option value="FISHING">Fishing Operations</option>
            <option value="OVERPRESSURE">Overpressured Shale</option>
          </select>

          <select className="input-control" style={{ width: 160 }} value={selectedSeverity} onChange={(e) => setSelectedSeverity(e.target.value)}>
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          <select className="input-control" style={{ width: 160 }} value={selectedFormation} onChange={(e) => setSelectedFormation(e.target.value)}>
            <option value="ALL">All Formations</option>
            <option value="Tipam">Tipam</option>
            <option value="Barail">Barail</option>
            <option value="Kopili">Kopili</option>
            <option value="Sylhet">Sylhet</option>
            <option value="Langpur">Langpur</option>
            <option value="Namsang">Namsang</option>
          </select>

          <button className="btn-secondary" onClick={fetchEvents} style={{ padding: "7px 12px", fontSize: 12 }}>
            <RefreshCw size={13} />
            Refresh
          </button>
        </div>
      </div>

      {/* Events List */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {loading ? (
          <div style={{ padding: 60, textAlign: "center", color: "var(--color-muted-slate)" }}>
            <RefreshCw size={24} style={{ marginBottom: 12, opacity: 0.4, animation: "spin 1s linear infinite" }} />
            <div>Loading historical incident knowledge base…</div>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div style={{ padding: 60, textAlign: "center", color: "var(--color-muted-slate)" }}>
            No drilling events matching current filters.
          </div>
        ) : (
          filteredEvents.map((ev) => (
            <div
              key={ev.id}
              className="glass-card"
              style={{
                padding: "18px 20px",
                borderLeft: `3px solid ${SEV_LEFT[ev.severity] || "#afc4bf"}`,
              }}
            >
              {/* Header row */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span className={`badge ${SEV_BADGE[ev.severity] || "badge-canopy"}`}>
                    {ev.event_type.replace(/_/g, " ")}
                  </span>
                  <strong style={{ fontSize: 14, color: "var(--color-bark)" }}>
                    {ev.depth_start}m – {ev.depth_end}m
                  </strong>
                  <span style={{ fontSize: 12, color: "var(--color-muted-slate)" }}>
                    in <strong style={{ color: "var(--color-slate)" }}>{ev.formation} Formation</strong>
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <span style={{ fontSize: 12, color: "var(--color-canopy)", fontWeight: 600 }}>
                    {ev.well_name || ev.well_id || "Offset Rig"}
                  </span>
                  <span style={{ fontSize: 13, color: "#b91c42", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                    <Clock size={12} />
                    +{ev.npt_hours}h NPT
                  </span>
                </div>
              </div>

              <p style={{ fontSize: 13, color: "var(--color-bark)", lineHeight: 1.6, marginBottom: 12 }}>
                {ev.description}
              </p>

              {/* Root cause + mitigation */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                  background: "var(--bg-elevated)",
                  padding: "12px 14px",
                  borderRadius: 8,
                  border: "1px solid var(--color-sage-mist)",
                }}
              >
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "#c47d0e", marginBottom: 5, display: "flex", alignItems: "center", gap: 5 }}>
                    <AlertTriangle size={12} />
                    Root Cause Analysis
                  </div>
                  <div style={{ fontSize: 12, color: "var(--color-slate)", lineHeight: 1.5 }}>
                    {ev.root_cause}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "#0d7a4e", marginBottom: 5, display: "flex", alignItems: "center", gap: 5 }}>
                    <CheckCircle2 size={12} />
                    Field-Proven Mitigation
                  </div>
                  <div style={{ fontSize: 12, color: "var(--color-slate)", lineHeight: 1.5 }}>
                    {ev.mitigation}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
