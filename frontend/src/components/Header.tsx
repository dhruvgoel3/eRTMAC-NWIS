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
  { id: "ai",         icon: <Bot size={15} />,        label: "OIL AI Copilot" },
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
            <span className="text-[10px] font-mono tracking-wider px-2 py-0.5 rounded-full bg-[#104336]/10 text-[#104336] font-bold">
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
        <div className="relative">
          <button
            onClick={() => setUserDropdownOpen(!userDropdownOpen)}
            className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl border border-[#104336]/15 hover:border-[#104336] bg-white transition-all text-left shadow-sm"
          >
            <div className="w-7 h-7 rounded-lg bg-[#104336] text-[#0fff87] font-bold text-xs flex items-center justify-center">
              {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : "O"}
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-xs font-bold text-[#104336] leading-tight">
                {profile?.full_name || "Operator"}
              </div>
              <div className="text-[10px] font-mono tracking-wider font-semibold text-[#104336]/70 leading-none">
                {activeRole || "DRILLING_ENGINEER"}
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-[#104336]/50" />
          </button>

          {/* User Menu Dropdown */}
          {userDropdownOpen && (
            <div
              className="absolute right-0 mt-2 w-56 bg-white rounded-2xl border border-[#104336]/10 shadow-lg py-2 z-50 text-xs"
              onClick={() => setUserDropdownOpen(false)}
            >
              <div className="px-4 py-2 border-b border-[#104336]/10">
                <div className="font-bold text-[#104336]">{profile?.full_name}</div>
                <div className="text-[11px] font-mono text-[#104336]/60 truncate">
                  {profile?.email}
                </div>
                <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#104336]/10 text-[10px] font-mono font-bold text-[#104336]">
                  <Shield className="w-3 h-3 text-[#0fff87]" />
                  {activeRole}
                </div>
              </div>

              <Link
                to="/profile"
                className="flex items-center gap-2.5 px-4 py-2 text-[#104336] hover:bg-[#f3f1ec] transition-colors"
              >
                <User className="w-3.5 h-3.5" />
                <span>My Profile & Capabilities</span>
              </Link>

              {canViewAdmin && (
                <>
                  <div className="my-1 border-t border-[#104336]/5" />
                  <div className="px-4 py-1 text-[10px] font-mono uppercase text-[#104336]/50 tracking-wider">
                    Administration
                  </div>
                  <Link
                    to="/admin/users"
                    className="flex items-center gap-2.5 px-4 py-2 text-[#104336] hover:bg-[#f3f1ec] transition-colors"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>User Management</span>
                  </Link>
                  <Link
                    to="/admin/roles"
                    className="flex items-center gap-2.5 px-4 py-2 text-[#104336] hover:bg-[#f3f1ec] transition-colors"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Role & Permissions Matrix</span>
                  </Link>
                  <Link
                    to="/admin/audit-logs"
                    className="flex items-center gap-2.5 px-4 py-2 text-[#104336] hover:bg-[#f3f1ec] transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Audit Logs</span>
                  </Link>
                </>
              )}

              <div className="my-1 border-t border-[#104336]/10" />

              <button
                type="button"
                onClick={logout}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-rose-700 hover:bg-rose-50 transition-colors text-left"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
