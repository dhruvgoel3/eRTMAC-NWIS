import React, { useState, useEffect } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  ArrowUpCircle,
  MapPin,
  BarChart2,
  ShieldAlert,
  RefreshCw,
  Flame,
  Target,
  Clock,
  Layers,
  FileText,
  X,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { api } from "../services/api";
import { useAuth } from "../contexts/AuthContext";

const SEV_COLOR: Record<string, string> = {
  CRITICAL: "#b91c42",
  HIGH: "#f97316",
  MEDIUM: "#c47d0e",
  LOW: "#0d7a4e",
};

const RISK_BADGE: Record<string, { bg: string; color: string; border: string }> = {
  NORMAL: { bg: "rgba(16, 185, 129, 0.12)", color: "#10b981", border: "rgba(16, 185, 129, 0.3)" },
  APPROACHING: { bg: "rgba(245, 158, 11, 0.12)", color: "#d97706", border: "rgba(245, 158, 11, 0.3)" },
  ACTIVE: { bg: "rgba(239, 68, 68, 0.12)", color: "#ef4444", border: "rgba(239, 68, 68, 0.3)" },
  PASSED: { bg: "rgba(100, 116, 139, 0.12)", color: "#64748b", border: "rgba(100, 116, 139, 0.3)" },
};

interface SupervisorDashboardProps {
  initialView?: "overview" | "wells" | "risks" | "alerts" | "analytics";
}

export const SupervisorDashboard: React.FC<SupervisorDashboardProps> = ({ initialView = "overview" }) => {
  const { profile } = useAuth();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [activeSubtab, setActiveSubtab] = useState<string>(initialView);

  // Modals
  const [selectedAlertForDetails, setSelectedAlertForDetails] = useState<any | null>(null);
  const [selectedWellForDrilldown, setSelectedWellForDrilldown] = useState<any | null>(null);
  const [acknowledgedAlertIds, setAcknowledgedAlertIds] = useState<Set<number>>(new Set());
  const [escalatedAlertIds, setEscalatedAlertIds] = useState<Set<number>>(new Set());
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  useEffect(() => {
    setActiveSubtab(initialView);
  }, [initialView]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await api.getSupervisorDashboard();
      if (res) setData(res);
      setLastRefresh(new Date());
    } catch (err) {
      console.warn("[SupervisorDashboard] Failed to load supervisor dashboard data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleAcknowledge = async (alertId: number) => {
    try {
      await api.acknowledgeAlert(alertId);
      setAcknowledgedAlertIds((prev) => new Set([...prev, alertId]));
      setActionNotice(`Alert #${alertId} acknowledged successfully by ${profile?.email || "Supervisor"}.`);
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err) {
      console.error("Failed to acknowledge alert:", err);
    }
  };

  const handleEscalate = async (alertId: number) => {
    try {
      await api.escalateAlert(alertId);
      setEscalatedAlertIds((prev) => new Set([...prev, alertId]));
      setActionNotice(`Alert #${alertId} escalated to Field Superintendent & Rig Operations Manager.`);
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err) {
      console.error("Failed to escalate alert:", err);
    }
  };

  const kpis = data?.kpis || {
    active_wells_count: 12,
    wells_drilling_count: 12,
    approaching_risk_count: 3,
    active_risk_count: 1,
    open_alerts_count: 5,
    critical_alerts_count: 1,
  };

  const activeWells = data?.active_wells || [];
  const riskOverview = data?.risk_overview || { NORMAL: [], APPROACHING: [], ACTIVE: [], PASSED: [] };
  const alertsList = (data?.alerts || []).filter((a: any) => !acknowledgedAlertIds.has(a.id));

  const eventDistributionData = data?.analytics?.event_distribution
    ? Object.entries(data.analytics.event_distribution).map(([name, count]) => ({ name, count }))
    : [
        { name: "Mud Loss", count: 18 },
        { name: "Stuck Pipe", count: 12 },
        { name: "Torque Spike", count: 9 },
        { name: "Kick", count: 6 },
        { name: "Overpressure", count: 4 },
        { name: "Instability", count: 8 },
        { name: "Cementing", count: 5 },
      ];

  const riskStatusPie = [
    { name: "NORMAL", value: (riskOverview.NORMAL || []).length || 5, color: "#10b981" },
    { name: "APPROACHING", value: (riskOverview.APPROACHING || []).length || 3, color: "#d97706" },
    { name: "ACTIVE", value: (riskOverview.ACTIVE || []).length || 1, color: "#ef4444" },
    { name: "PASSED", value: (riskOverview.PASSED || []).length || 3, color: "#64748b" },
  ];

  if (isLoading && !data) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 400, flexDirection: "column", gap: 16 }}>
        <RefreshCw size={32} className="animate-spin" color="var(--color-canopy)" />
        <p style={{ color: "var(--color-slate)", fontSize: 13 }}>Loading Multi-Well Operations Oversight...</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* ── Sub-navigation filter pills ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, borderBottom: "1px solid var(--color-sage-mist)", paddingBottom: 14 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--color-bark)", margin: 0 }}>
            Supervisor Operational Surveillance
          </h1>
          <p style={{ margin: "4px 0 0", color: "var(--color-slate)", fontSize: 12 }}>
            Multi-well fleet monitoring, approaching offset risks, alert management &amp; escalation oversight.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {[
            { id: "overview", label: "Dashboard Overview" },
            { id: "wells", label: `Active Wells (${activeWells.length})` },
            { id: "risks", label: "Risk Overview" },
            { id: "alerts", label: `Alert Center (${alertsList.length})` },
            { id: "analytics", label: "Operational Analytics" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSubtab(tab.id as any)}
              style={{
                padding: "6px 12px",
                borderRadius: 8,
                fontSize: 11,
                fontWeight: 700,
                border: activeSubtab === tab.id ? "1px solid var(--color-canopy)" : "1px solid var(--color-sage-mist)",
                background: activeSubtab === tab.id ? "var(--color-canopy)" : "#ffffff",
                color: activeSubtab === tab.id ? "#ffffff" : "var(--color-bark)",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {tab.label}
            </button>
          ))}

          <button
            onClick={loadData}
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              border: "1px solid var(--color-sage-mist)",
              background: "#ffffff",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: 11,
            }}
            title="Refresh operations"
          >
            <RefreshCw size={12} className={isLoading ? "animate-spin" : ""} />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* Action Notification Alert */}
      {actionNotice && (
        <div style={{ padding: "10px 16px", borderRadius: 8, background: "rgba(0, 230, 153, 0.12)", border: "1px solid rgba(0, 230, 153, 0.4)", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12, color: "var(--color-canopy)", fontWeight: 700 }}>
          <span>✓ {actionNotice}</span>
          <button onClick={() => setActionNotice(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-canopy)" }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── 1. OPERATIONS OVERVIEW (6 Primary KPIs per prompt) ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12 }}>
        {[
          { label: "Active Wells", val: kpis.active_wells_count, color: "var(--color-canopy)", icon: <Target size={16} /> },
          { label: "Wells Drilling", val: kpis.wells_drilling_count, color: "var(--color-canopy)", icon: <Activity size={16} /> },
          { label: "Approaching Risk", val: kpis.approaching_risk_count, color: "#d97706", icon: <Flame size={16} /> },
          { label: "Active Risks", val: kpis.active_risk_count, color: "#ef4444", icon: <AlertTriangle size={16} /> },
          { label: "Open Alerts", val: alertsList.length, color: "#b91c42", icon: <ShieldAlert size={16} /> },
          { label: "Critical Alerts", val: kpis.critical_alerts_count, color: "#b91c42", icon: <ShieldAlert size={16} /> },
        ].map((k) => (
          <div key={k.label} className="glass-card" style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--color-muted-slate)" }}>
                {k.label}
              </span>
              <span style={{ color: k.color, opacity: 0.8 }}>{k.icon}</span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: k.color, lineHeight: 1 }}>{k.val}</div>
          </div>
        ))}
      </div>

      {/* ── 2. ACTIVE WELLS OVERVIEW TABLE ── */}
      {(activeSubtab === "overview" || activeSubtab === "wells") && (
        <div className="glass-card">
          <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div className="card-title">
              <Target size={16} color="var(--color-canopy)" />
              Active Wells Fleet Status (12 Active Operations)
            </div>
            <span style={{ fontSize: 11, color: "var(--color-slate)" }}>
              Click any well row for operational drill-down
            </span>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--color-sage-mist)", color: "var(--color-muted-slate)", fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  <th style={{ padding: "10px 12px" }}>Well</th>
                  <th style={{ padding: "10px 12px" }}>Current Depth</th>
                  <th style={{ padding: "10px 12px" }}>Formation</th>
                  <th style={{ padding: "10px 12px" }}>Status</th>
                  <th style={{ padding: "10px 12px" }}>Operational Risk Status</th>
                  <th style={{ padding: "10px 12px" }}>Summary / Distance Ahead</th>
                  <th style={{ padding: "10px 12px", textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {activeWells.map((w: any) => {
                  const badge = RISK_BADGE[w.risk_status] || RISK_BADGE.NORMAL;
                  return (
                    <tr
                      key={w.well_id}
                      onClick={() => setSelectedWellForDrilldown(w)}
                      style={{
                        borderBottom: "1px solid var(--color-sage-mist)",
                        cursor: "pointer",
                        transition: "background 0.15s ease",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(16, 67, 54, 0.03)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <td style={{ padding: "10px 12px" }}>
                        <div style={{ fontWeight: 800, color: "var(--color-bark)" }}>{w.well_id}</div>
                        <div style={{ fontSize: 10, color: "var(--color-muted-slate)" }}>{w.name}</div>
                      </td>
                      <td style={{ padding: "10px 12px", fontFamily: "var(--font-mono)", fontWeight: 700 }}>
                        {w.current_depth} m
                      </td>
                      <td style={{ padding: "10px 12px", color: "var(--color-bark)" }}>
                        {w.formation}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: "rgba(0, 230, 153, 0.12)", color: "var(--color-canopy)" }}>
                          {w.status}
                        </span>
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 800,
                            padding: "3px 8px",
                            borderRadius: 6,
                            background: badge.bg,
                            color: badge.color,
                            border: `1px solid ${badge.border}`,
                          }}
                        >
                          {w.risk_status}
                        </span>
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: 11, color: "var(--color-slate)" }}>
                        {w.risk_summary}
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "right" }}>
                        <button
                          className="btn-secondary"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedWellForDrilldown(w);
                          }}
                          style={{ fontSize: 10, padding: "4px 8px" }}
                        >
                          Drill-Down
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── 3. RISK OVERVIEW (NORMAL, APPROACHING, ACTIVE, PASSED) ── */}
      {(activeSubtab === "overview" || activeSubtab === "risks") && (
        <div className="glass-card">
          <div className="card-header">
            <div className="card-title">
              <Flame size={16} color="#d97706" />
              Risk Overview — Fleet Categorization &amp; Anomaly Distribution
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
            {[
              { key: "APPROACHING", label: "APPROACHING RISK", desc: "Offset risk within 50m ahead", color: "#d97706", badge: RISK_BADGE.APPROACHING },
              { key: "ACTIVE", label: "ACTIVE RISK", desc: "Currently drilling inside risk window", color: "#ef4444", badge: RISK_BADGE.ACTIVE },
              { key: "NORMAL", label: "NORMAL WELLS", desc: "Nominal drilling, no offset hazards", color: "#10b981", badge: RISK_BADGE.NORMAL },
              { key: "PASSED", label: "PASSED RISK", desc: "Successfully navigated hazard zone", color: "#64748b", badge: RISK_BADGE.PASSED },
            ].map((cat) => {
              const wellsInCat = riskOverview[cat.key] || [];
              return (
                <div
                  key={cat.key}
                  style={{
                    borderRadius: 10,
                    padding: 14,
                    background: cat.badge.bg,
                    border: `1px solid ${cat.badge.border}`,
                    borderTop: `4px solid ${cat.color}`,
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: cat.color, letterSpacing: "0.04em" }}>
                      {cat.label}
                    </span>
                    <strong style={{ fontSize: 16, color: cat.color }}>{wellsInCat.length}</strong>
                  </div>
                  <div style={{ fontSize: 10, color: "var(--color-slate)" }}>{cat.desc}</div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
                    {wellsInCat.map((w: any) => (
                      <div
                        key={w.well_id}
                        onClick={() => setSelectedWellForDrilldown(w)}
                        style={{
                          padding: "6px 8px",
                          borderRadius: 6,
                          background: "#ffffff",
                          border: "1px solid var(--color-sage-mist)",
                          cursor: "pointer",
                          fontSize: 11,
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <strong style={{ color: "var(--color-bark)" }}>{w.well_id}</strong>
                          <span style={{ fontFamily: "var(--font-mono)", color: "var(--color-muted-slate)" }}>{w.current_depth}m</span>
                        </div>
                        <div style={{ fontSize: 10, color: "var(--color-slate)", marginTop: 2 }}>{w.formation}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 4. ALERT CENTER (ACKNOWLEDGE, ESCALATE, VIEW DETAILS) ── */}
      {(activeSubtab === "overview" || activeSubtab === "alerts") && (
        <div className="glass-card">
          <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div className="card-title">
              <AlertTriangle size={16} color="#b91c42" />
              Alert Center (Cross-Well Operational Advisories)
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#b91c42" }}>
              {alertsList.length} Unacknowledged Alerts
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {alertsList.map((alert: any) => {
              const isEscalated = escalatedAlertIds.has(alert.id) || alert.escalated;
              return (
                <div
                  key={alert.id}
                  style={{
                    padding: "12px 16px",
                    borderRadius: 8,
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--color-sage-mist)",
                    borderLeft: `4px solid ${SEV_COLOR[alert.severity] || "#f97316"}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: 12,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 800,
                        padding: "3px 8px",
                        borderRadius: 6,
                        background: alert.severity === "CRITICAL" ? "rgba(185, 28, 66, 0.15)" : "rgba(249, 115, 22, 0.15)",
                        color: alert.severity === "CRITICAL" ? "#b91c42" : "#f97316",
                      }}
                    >
                      {alert.severity}
                    </span>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <strong style={{ fontSize: 13, color: "var(--color-bark)" }}>{alert.well_id}</strong>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-bark)" }}>
                          — {alert.title}
                        </span>
                        {isEscalated && (
                          <span style={{ fontSize: 9, fontWeight: 800, padding: "2px 6px", borderRadius: 99, background: "rgba(147, 51, 234, 0.15)", color: "#9333ea" }}>
                            ESCALATED
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--color-muted-slate)", marginTop: 2 }}>
                        Distance to Risk: {alert.distance_ahead_m} m &nbsp;·&nbsp; Formation: {alert.affected_formation} &nbsp;·&nbsp; Depth: {alert.depth} m
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button
                      className="btn-secondary"
                      onClick={() => setSelectedAlertForDetails(alert)}
                      style={{ fontSize: 11, padding: "5px 10px" }}
                    >
                      View Details
                    </button>

                    {!isEscalated && (
                      <button
                        onClick={() => handleEscalate(alert.id)}
                        style={{
                          fontSize: 11,
                          padding: "5px 10px",
                          borderRadius: 6,
                          border: "1px solid #9333ea",
                          background: "rgba(147, 51, 234, 0.1)",
                          color: "#9333ea",
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <ArrowUpCircle size={12} /> Escalate
                      </button>
                    )}

                    <button
                      onClick={() => handleAcknowledge(alert.id)}
                      style={{
                        fontSize: 11,
                        padding: "5px 10px",
                        borderRadius: 6,
                        border: "1px solid var(--color-canopy)",
                        background: "rgba(0, 230, 153, 0.15)",
                        color: "var(--color-canopy)",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <CheckCircle size={12} /> Acknowledge
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 5. OPERATIONAL ANALYTICS ── */}
      {(activeSubtab === "overview" || activeSubtab === "analytics") && (
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 20 }}>
          <div className="glass-card">
            <div className="card-header">
              <div className="card-title">
                <BarChart2 size={16} color="var(--color-canopy)" />
                Historical Event Categories Across Active Basins
              </div>
            </div>
            <div style={{ height: 210 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={eventDistributionData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-sage-mist)" opacity={0.5} />
                  <XAxis dataKey="name" stroke="var(--color-muted-slate)" fontSize={10} tick={{ angle: -20 }} />
                  <YAxis stroke="var(--color-muted-slate)" fontSize={10} />
                  <Tooltip contentStyle={{ background: "#ffffff", border: "1px solid var(--color-sage-mist)", borderRadius: 8, fontSize: 11 }} />
                  <Bar dataKey="count" fill="var(--color-canopy)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass-card">
            <div className="card-header">
              <div className="card-title">
                <ShieldAlert size={16} color="#d97706" />
                Fleet Risk Status Distribution (12 Active Wells)
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-around", height: 210 }}>
              <div style={{ width: 140, height: 140 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={riskStatusPie} cx="50%" cy="50%" innerRadius={35} outerRadius={60} dataKey="value" paddingAngle={3}>
                      {riskStatusPie.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 11 }}>
                {riskStatusPie.map((item) => (
                  <div key={item.name} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: item.color }} />
                    <span style={{ color: "var(--color-slate)", width: 90 }}>{item.name}:</span>
                    <strong style={{ color: item.color }}>{item.value} wells</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── ALERT DETAILS MODAL ── */}
      {selectedAlertForDetails && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            backdropFilter: "blur(4px)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
          onClick={() => setSelectedAlertForDetails(null)}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: 14,
              border: "1px solid var(--color-sage-mist)",
              boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
              maxWidth: 620,
              width: "100%",
              maxHeight: "85vh",
              overflowY: "auto",
              padding: 24,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--color-sage-mist)", paddingBottom: 12, marginBottom: 16 }}>
              <div>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    padding: "2px 8px",
                    borderRadius: 999,
                    background: "rgba(239, 68, 68, 0.15)",
                    color: "#ef4444",
                  }}
                >
                  {selectedAlertForDetails.severity} ALERT DETAILS
                </span>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--color-bark)", margin: "6px 0 0" }}>
                  {selectedAlertForDetails.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedAlertForDetails(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-muted-slate)" }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, background: "var(--bg-elevated)", padding: 12, borderRadius: 8 }}>
                <div>
                  <span style={{ color: "var(--color-muted-slate)" }}>Well:</span>
                  <strong style={{ marginLeft: 6, color: "var(--color-bark)" }}>{selectedAlertForDetails.well_id}</strong>
                </div>
                <div>
                  <span style={{ color: "var(--color-muted-slate)" }}>Current Depth:</span>
                  <strong style={{ marginLeft: 6, color: "var(--color-bark)" }}>{selectedAlertForDetails.depth} m</strong>
                </div>
                <div>
                  <span style={{ color: "var(--color-muted-slate)" }}>Risk Interval:</span>
                  <strong style={{ marginLeft: 6, color: "#b91c42" }}>{selectedAlertForDetails.risk_interval}</strong>
                </div>
                <div>
                  <span style={{ color: "var(--color-muted-slate)" }}>Affected Formation:</span>
                  <strong style={{ marginLeft: 6, color: "var(--color-canopy)" }}>{selectedAlertForDetails.affected_formation}</strong>
                </div>
              </div>

              <div>
                <strong style={{ color: "var(--color-bark)" }}>Reason for Alert:</strong>
                <p style={{ margin: "4px 0 0", color: "var(--color-slate)", lineHeight: 1.5 }}>
                  {selectedAlertForDetails.reason}
                </p>
              </div>

              <div>
                <strong style={{ color: "var(--color-bark)" }}>Correlated Offset Incidents:</strong>
                <p style={{ margin: "4px 0 0", color: "var(--color-slate)", lineHeight: 1.5 }}>
                  {selectedAlertForDetails.historical_event}
                </p>
              </div>

              <div>
                <strong style={{ color: "var(--color-bark)" }}>Similar Offset Wells:</strong>
                <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                  {(selectedAlertForDetails.similar_wells || []).map((w: string) => (
                    <span key={w} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6, background: "rgba(0, 230, 153, 0.12)", color: "var(--color-canopy)", fontWeight: 700 }}>
                      {w}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <strong style={{ color: "var(--color-bark)" }}>Historical Verified Evidence:</strong>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6 }}>
                  {(selectedAlertForDetails.historical_evidence || []).map((ev: any, i: number) => (
                    <div key={i} style={{ padding: 8, borderRadius: 6, background: "var(--bg-elevated)", border: "1px solid var(--color-sage-mist)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <strong>{ev.well_id} · {ev.event}</strong>
                        <span style={{ fontFamily: "var(--font-mono)", color: "var(--color-canopy)", fontWeight: 700 }}>{ev.source}</span>
                      </div>
                      <div style={{ color: "var(--color-slate)", fontSize: 11, marginTop: 2 }}>
                        Depth: {ev.depth} · NPT: {ev.npt_hours}h · Formation: {ev.formation}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 14, borderTop: "1px solid var(--color-sage-mist)", paddingTop: 14 }}>
                <button
                  onClick={() => {
                    handleEscalate(selectedAlertForDetails.id);
                    setSelectedAlertForDetails(null);
                  }}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 8,
                    background: "rgba(147, 51, 234, 0.1)",
                    border: "1px solid #9333ea",
                    color: "#9333ea",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Escalate Alert
                </button>
                <button
                  onClick={() => {
                    handleAcknowledge(selectedAlertForDetails.id);
                    setSelectedAlertForDetails(null);
                  }}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 8,
                    background: "var(--color-canopy)",
                    border: "none",
                    color: "#ffffff",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Acknowledge Alert
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── WELL DRILL-DOWN MODAL (Operational info only per prompt!) ── */}
      {selectedWellForDrilldown && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            backdropFilter: "blur(4px)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
          onClick={() => setSelectedWellForDrilldown(null)}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: 14,
              border: "1px solid var(--color-sage-mist)",
              boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
              maxWidth: 680,
              width: "100%",
              maxHeight: "85vh",
              overflowY: "auto",
              padding: 24,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--color-sage-mist)", paddingBottom: 12, marginBottom: 16 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--color-bark)", margin: 0 }}>
                    {selectedWellForDrilldown.well_id} · Operational Drill-Down
                  </h3>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      padding: "2px 8px",
                      borderRadius: 999,
                      background: RISK_BADGE[selectedWellForDrilldown.risk_status]?.bg,
                      color: RISK_BADGE[selectedWellForDrilldown.risk_status]?.color,
                    }}
                  >
                    {selectedWellForDrilldown.risk_status}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: "var(--color-slate)", marginTop: 2 }}>
                  {selectedWellForDrilldown.name} · Field: {selectedWellForDrilldown.field}
                </div>
              </div>
              <button
                onClick={() => setSelectedWellForDrilldown(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-muted-slate)" }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14, fontSize: 12 }}>
              {/* Operational Overview Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                <div style={{ padding: 10, borderRadius: 8, background: "var(--bg-elevated)", border: "1px solid var(--color-sage-mist)" }}>
                  <div style={{ fontSize: 10, color: "var(--color-muted-slate)", fontWeight: 700 }}>CURRENT DEPTH</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "var(--color-bark)", marginTop: 2 }}>
                    {selectedWellForDrilldown.current_depth} m
                  </div>
                  <div style={{ fontSize: 10, color: "var(--color-slate)" }}>Target TD: {selectedWellForDrilldown.total_depth} m</div>
                </div>

                <div style={{ padding: 10, borderRadius: 8, background: "var(--bg-elevated)", border: "1px solid var(--color-sage-mist)" }}>
                  <div style={{ fontSize: 10, color: "var(--color-muted-slate)", fontWeight: 700 }}>FORMATION</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "var(--color-canopy)", marginTop: 2 }}>
                    {selectedWellForDrilldown.formation}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--color-slate)" }}>Status: {selectedWellForDrilldown.status}</div>
                </div>

                <div style={{ padding: 10, borderRadius: 8, background: "var(--bg-elevated)", border: "1px solid var(--color-sage-mist)" }}>
                  <div style={{ fontSize: 10, color: "var(--color-muted-slate)", fontWeight: 700 }}>RISK STATUS</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: RISK_BADGE[selectedWellForDrilldown.risk_status]?.color, marginTop: 2 }}>
                    {selectedWellForDrilldown.risk_status}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--color-slate)" }}>{selectedWellForDrilldown.distance_to_risk_m}m ahead</div>
                </div>
              </div>

              {/* Current Parameters */}
              {selectedWellForDrilldown.parameters && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--color-muted-slate)", marginBottom: 6 }}>
                    Live Rig Telemetry &amp; Operating Parameters
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                    <div style={{ padding: 8, borderRadius: 6, background: "var(--bg-elevated)", textAlign: "center" }}>
                      <div style={{ fontSize: 10, color: "var(--color-muted-slate)" }}>ROP</div>
                      <div style={{ fontWeight: 800, fontSize: 14 }}>{selectedWellForDrilldown.parameters.rop} m/h</div>
                    </div>
                    <div style={{ padding: 8, borderRadius: 6, background: "var(--bg-elevated)", textAlign: "center" }}>
                      <div style={{ fontSize: 10, color: "var(--color-muted-slate)" }}>WOB</div>
                      <div style={{ fontWeight: 800, fontSize: 14 }}>{selectedWellForDrilldown.parameters.wob} klbs</div>
                    </div>
                    <div style={{ padding: 8, borderRadius: 6, background: "var(--bg-elevated)", textAlign: "center" }}>
                      <div style={{ fontSize: 10, color: "var(--color-muted-slate)" }}>Torque</div>
                      <div style={{ fontWeight: 800, fontSize: 14 }}>{selectedWellForDrilldown.parameters.torque} ft-lbs</div>
                    </div>
                    <div style={{ padding: 8, borderRadius: 6, background: "var(--bg-elevated)", textAlign: "center" }}>
                      <div style={{ fontSize: 10, color: "var(--color-muted-slate)" }}>Pressure</div>
                      <div style={{ fontWeight: 800, fontSize: 14 }}>{selectedWellForDrilldown.parameters.pressure} psi</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Active Risks & Historical Status */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--color-muted-slate)", marginBottom: 6 }}>
                  Active Risks &amp; Historical Correlation
                </div>
                <div style={{ padding: 12, borderRadius: 8, background: "rgba(217, 119, 6, 0.08)", border: "1px solid rgba(217, 119, 6, 0.25)" }}>
                  <div style={{ fontWeight: 700, color: "var(--color-bark)" }}>{selectedWellForDrilldown.risk_summary}</div>
                  <div style={{ fontSize: 11, color: "var(--color-slate)", marginTop: 4 }}>
                    Operational advisory: Rig crew notified to maintain rotary speed and maintain continuous circulation. Standby LCM pill staged.
                  </div>
                </div>
              </div>

              <div style={{ textAlign: "right", marginTop: 10 }}>
                <button
                  className="btn-secondary"
                  onClick={() => setSelectedWellForDrilldown(null)}
                  style={{ padding: "6px 14px", fontSize: 11 }}
                >
                  Close Drill-Down
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
