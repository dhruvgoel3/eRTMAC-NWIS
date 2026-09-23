import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  MapPin,
  Layers,
  FileText,
  Bot,
  Play,
  Pause,
  RotateCcw,
  Bell,
  Sparkles,
  Compass,
  Shield,
  LogOut,
  User,
  Settings,
  ShieldCheck,
  ChevronDown,
  Share2,
} from "lucide-react";
import { SimulationState } from "../types";
import { useAuth } from "../contexts/AuthContext";

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  simulation: SimulationState | null;
  onTogglePlay: () => void;
  onReset: () => void;
  onChangeSpeed: (speed: number) => void;
  unreadAlertsCount: number;
  onOpenAlerts: () => void;
}

const NAV_TABS = [
  { id: "overview",   icon: <Activity size={15} />,  label: "Overview" },
  { id: "map",        icon: <MapPin size={15} />,     label: "GIS Offset Map" },
  { id: "similarity", icon: <Layers size={15} />,     label: "Similarity Matrix" },
  { id: "events",     icon: <FileText size={15} />,   label: "Drilling Events" },
  { id: "memory",     icon: <Share2 size={15} />,     label: "Memory Graph" },
  { id: "ai",         icon: <Bot size={15} />,        label: "Ask NWIS" },
  { id: "documents",  icon: <Sparkles size={15} />,   label: "Documents & DDR" },
];

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  simulation,
  onTogglePlay,
  onReset,
  onChangeSpeed,
  unreadAlertsCount,
  onOpenAlerts,
}) => {
  const { profile, activeRole, logout, hasPermission } = useAuth();
  const [userDropdownOpen, setUserDropdownOpen] = useState<boolean>(false);

  const isRunning = simulation?.is_running ?? false;
  const speed = simulation?.speed_multiplier ?? 1;
  const nextSpeed = speed === 1 ? 5 : speed === 5 ? 10 : 1;

  const canViewAdmin = hasPermission("users.view") || hasPermission("audit.view") || hasPermission("system.manage");

  return (
    <header className="header-wrapper">
      {/* Brand */}
      <div className="brand-section">
        <div className="brand-logo-badge">
          <Compass size={20} />
        </div>
        <div>
          <div className="brand-title">
            eRTMAC-NWIS
            <span className="oil-badge">Oil India Limited</span>
            <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", fontWeight: 700, letterSpacing: "0.06em", padding: "2px 8px", borderRadius: 9999, background: "rgba(16, 67, 54, 0.08)", color: "var(--color-canopy)" }}>
              NWIS DEMO
            </span>
          </div>
          <div className="brand-subtitle">
            Nearby Wells Intelligence &amp; Decision Support
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="nav-tabs">
        {NAV_TABS.map((tab) => (
          <button
            key={tab.id}
            className={`nav-tab-btn ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Right Controls */}
      <div className="header-controls">
        {/* Simulation Pill */}
        <div className="sim-controls-pill">
          <span style={{ fontSize: 10, color: "var(--color-muted-slate)", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>
            SIM
          </span>
          <button
            className={`sim-btn ${isRunning ? "pause" : "play"}`}
            onClick={onTogglePlay}
            title={isRunning ? "Pause Simulation" : "Start Simulation"}
          >
            {isRunning ? <Pause size={13} /> : <Play size={13} />}
          </button>
          <button className="sim-btn" onClick={onReset} title="Reset">
            <RotateCcw size={13} />
          </button>
          <button
            className="speed-badge"
            onClick={() => onChangeSpeed(nextSpeed)}
            title="Cycle simulation speed"
          >
            {speed}×
          </button>
        </div>

        {/* Alerts Button */}
        <button
          onClick={onOpenAlerts}
          className="btn-secondary"
          style={{
            position: "relative",
            padding: "7px 12px",
            gap: 6,
          }}
          title="Active Alerts"
        >
          <Bell
            size={15}
            color={unreadAlertsCount > 0 ? "var(--accent-amber)" : "currentColor"}
          />
          {unreadAlertsCount > 0 && (
            <>
              <span style={{ fontSize: 12, fontWeight: 600 }}>
                {unreadAlertsCount}
              </span>
              <span
                style={{
                  position: "absolute",
                  top: -4,
                  right: -4,
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "var(--accent-rose)",
                  border: "2px solid var(--color-sheet-white)",
                }}
              />
            </>
          )}
        </button>

        {/* User Identity & Role Badge */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setUserDropdownOpen(!userDropdownOpen)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "5px 12px 5px 6px",
              borderRadius: 12,
              border: "1px solid var(--color-sage-mist)",
              background: "#ffffff",
              cursor: "pointer",
              textAlign: "left",
              transition: "all 0.15s ease",
            }}
          >
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "var(--color-canopy)", color: "var(--color-mint-pulse)", fontWeight: 700, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : "O"}
            </div>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-bark)", lineHeight: 1.2 }}>
                {profile?.full_name || "Operator"}
              </div>
              <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--color-slate)", letterSpacing: "0.04em" }}>
                {activeRole || "DRILLING_ENGINEER"}
              </div>
            </div>
            <ChevronDown size={14} style={{ color: "var(--color-muted-slate)", marginLeft: 2 }} />
          </button>

          {/* User Menu Dropdown */}
          {userDropdownOpen && (
            <div
              style={{
                position: "absolute",
                right: 0,
                marginTop: 6,
                width: 220,
                background: "#ffffff",
                borderRadius: 14,
                border: "1px solid var(--color-sage-mist)",
                boxShadow: "0 10px 30px rgba(16, 67, 54, 0.12)",
                padding: "8px 0",
                zIndex: 100,
                fontSize: 12,
              }}
              onClick={() => setUserDropdownOpen(false)}
            >
              <div style={{ padding: "8px 16px 10px", borderBottom: "1px solid var(--color-sage-mist)" }}>
                <div style={{ fontWeight: 700, color: "var(--color-bark)" }}>{profile?.full_name}</div>
                <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--color-muted-slate)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {profile?.email}
                </div>
                <div style={{ marginTop: 6, display: "inline-flex", alignItems: "center", gap: 5, padding: "2px 8px", borderRadius: 9999, background: "rgba(16, 67, 54, 0.08)", fontSize: 10, fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--color-canopy)" }}>
                  <Shield size={12} color="var(--color-canopy)" />
                  {activeRole}
                </div>
              </div>

              <Link
                to="/profile"
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 16px", color: "var(--color-bark)", textDecoration: "none", transition: "background 0.15s ease" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-elevated)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <User size={14} />
                <span>My Profile & Capabilities</span>
              </Link>

              {canViewAdmin && (
                <>
                  <div style={{ height: 1, background: "var(--color-sage-mist)", margin: "4px 0" }} />
                  <div style={{ padding: "4px 16px", fontSize: 10, fontFamily: "var(--font-mono)", textTransform: "uppercase", color: "var(--color-muted-slate)", letterSpacing: "0.06em" }}>
                    Administration
                  </div>
                  <Link
                    to="/admin/users"
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 16px", color: "var(--color-bark)", textDecoration: "none" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-elevated)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <Settings size={14} />
                    <span>User Management</span>
                  </Link>
                  <Link
                    to="/admin/roles"
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 16px", color: "var(--color-bark)", textDecoration: "none" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-elevated)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <ShieldCheck size={14} />
                    <span>Role & Permissions Matrix</span>
                  </Link>
                  <Link
                    to="/admin/audit-logs"
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 16px", color: "var(--color-bark)", textDecoration: "none" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-elevated)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <FileText size={14} />
                    <span>Audit Logs</span>
                  </Link>
                </>
              )}

              <div style={{ height: 1, background: "var(--color-sage-mist)", margin: "4px 0" }} />

              <button
                type="button"
                onClick={logout}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "8px 16px", color: "#b91c42", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontSize: 12 }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(185, 28, 66, 0.08)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <LogOut size={14} />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
