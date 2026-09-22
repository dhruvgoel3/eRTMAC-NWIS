import React, { useState, useEffect } from "react";
import {
  FileText,
  Filter,
  Search,
  ShieldAlert,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Compass,
} from "lucide-react";
import { WellEvent } from "../../types";
import { api } from "../../services/api";

export const EventsKnowledgeTab: React.FC = () => {
  const [events, setEvents] = useState<WellEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEventType, setSelectedEventType] = useState("ALL");
  const [selectedSeverity, setSelectedSeverity] = useState("ALL");
  const [selectedFormation, setSelectedFormation] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchEvents();
  }, [selectedEventType, selectedSeverity, selectedFormation]);

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

  // Client search filter
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

  // Calculate stats
  const totalNpt = events.reduce((sum, e) => sum + (e.npt_hours || 0), 0);
  const criticalCount = events.filter((e) => e.severity === "CRITICAL").length;
  const highCount = events.filter((e) => e.severity === "HIGH").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Knowledge Base Overview Banner */}
      <div className="glass-card">
        <div className="card-header">
          <div className="card-title">
            <FileText size={18} color="var(--accent-cyan)" />
            Historical Drilling Events & NPT Knowledge Repository
          </div>
          <span className="badge badge-cyan">Regional Drilling Memory</span>
        </div>

        <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16 }}>
          Institutional knowledge synthesized from over 50 offset wells in Upper Assam Basin. Review historical downhole events, root causes, and field-tested mitigation strategies applied by Oil India Limited drilling crews.
        </p>

        {/* Statistical Metrics Strip */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          <div style={{ background: "var(--bg-elevated)", padding: 12, borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)" }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>DOCUMENTED INCIDENTS</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "var(--accent-cyan)", marginTop: 2 }}>
              {events.length} Events
            </div>
          </div>

          <div style={{ background: "var(--bg-elevated)", padding: 12, borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)" }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>TOTAL NON-PRODUCTIVE TIME</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "var(--accent-rose)", marginTop: 2 }}>
              {totalNpt.toFixed(1)} hrs NPT
            </div>
          </div>

          <div style={{ background: "var(--bg-elevated)", padding: 12, borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)" }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>CRITICAL / HIGH SEVERITY</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "var(--accent-amber)", marginTop: 2 }}>
              {criticalCount + highCount} Incidents
            </div>
          </div>

          <div style={{ background: "var(--bg-elevated)", padding: 12, borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)" }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>MOST VULNERABLE FORMATION</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#38bdf8", marginTop: 2 }}>
              Tipam Sandstone
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="glass-card" style={{ padding: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          {/* Search */}
          <div style={{ flex: 1, minWidth: 220 }}>
            <input
              type="text"
              className="input-control"
              style={{ width: "100%" }}
              placeholder="Search by root cause, mitigation, or well name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Event Type Filter */}
          <div>
            <select
              className="input-control"
              value={selectedEventType}
              onChange={(e) => setSelectedEventType(e.target.value)}
            >
              <option value="ALL">All Event Types</option>
              <option value="MUD_LOSS">Mud Loss (Circulation Loss)</option>
              <option value="STUCK_PIPE">Stuck Pipe (Differential / Mech)</option>
              <option value="KICK">Well Control / Gas Kick</option>
              <option value="TORQUE_SPIKE">Torque & Drag Spikes</option>
              <option value="CEMENTING_ISSUE">Cementing & Casing Issues</option>
              <option value="FISHING">Fishing Operations</option>
              <option value="OVERPRESSURE">Overpressured Shale</option>
            </select>
          </div>

          {/* Severity Filter */}
          <div>
            <select
              className="input-control"
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">Critical Severity</option>
              <option value="HIGH">High Severity</option>
              <option value="MEDIUM">Medium Severity</option>
              <option value="LOW">Low Severity</option>
            </select>
          </div>

          {/* Formation Filter */}
          <div>
            <select
              className="input-control"
              value={selectedFormation}
              onChange={(e) => setSelectedFormation(e.target.value)}
            >
              <option value="ALL">All Formations</option>
              <option value="Tipam">Tipam</option>
              <option value="Barail">Barail</option>
              <option value="Kopili">Kopili</option>
              <option value="Sylhet">Sylhet</option>
              <option value="Langpur">Langpur</option>
              <option value="Namsang">Namsang</option>
            </select>
          </div>
        </div>
      </div>

      {/* Events List */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>
            Loading historical incident knowledge base...
          </div>
        ) : filteredEvents.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>
            No drilling events matching current criteria.
          </div>
        ) : (
          filteredEvents.map((ev) => (
            <div key={ev.id} className="glass-card" style={{ padding: 18 }}>
              {/* Event Header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 10,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span
                    className={`badge ${
                      ev.severity === "CRITICAL"
                        ? "badge-rose"
                        : ev.severity === "HIGH"
                        ? "badge-amber"
                        : "badge-cyan"
                    }`}
                  >
                    {ev.event_type.replace(/_/g, " ")}
                  </span>
                  <strong style={{ fontSize: 15 }}>
                    {ev.depth_start}m – {ev.depth_end}m
                  </strong>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    in <strong>{ev.formation} Formation</strong>
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 12, color: "var(--accent-cyan)", fontWeight: 600 }}>
                    Well: {ev.well_name || ev.well_id || "Offset Rig"}
                  </span>
                  <span style={{ fontSize: 13, color: "var(--accent-rose)", fontWeight: 700 }}>
                    +{ev.npt_hours}h NPT
                  </span>
                </div>
              </div>

              {/* Event Description */}
              <p style={{ fontSize: 13, color: "var(--text-primary)", marginBottom: 12, lineHeight: 1.5 }}>
                {ev.description}
              </p>

              {/* Root Cause & Mitigation 2-Col Box */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                  background: "rgba(11, 17, 32, 0.7)",
                  padding: 12,
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--accent-amber)", marginBottom: 4, display: "flex", alignItems: "center", gap: 4 }}>
                    <AlertTriangle size={13} />
                    ROOT CAUSE ANALYSIS:
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.4 }}>
                    {ev.root_cause}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--accent-emerald)", marginBottom: 4, display: "flex", alignItems: "center", gap: 4 }}>
                    <CheckCircle2 size={13} />
                    FIELD-PROVEN MITIGATION & LESSONS:
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.4 }}>
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
