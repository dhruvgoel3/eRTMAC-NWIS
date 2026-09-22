import React from "react";
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
  Zap,
} from "lucide-react";
import { SimulationState } from "../types";

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
  const isRunning = simulation?.is_running ?? false;
  const speed = simulation?.speed_multiplier ?? 1;
  const nextSpeed = speed === 1 ? 5 : speed === 5 ? 10 : 1;

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
      </div>
    </header>
  );
};
