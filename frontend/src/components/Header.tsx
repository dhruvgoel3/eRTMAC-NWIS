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
} from "lucide-react";
import { SimulationState, Alert } from "../types";

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
          <Compass size={22} />
        </div>
        <div>
          <div className="brand-title">
            eRTMAC-NWIS
            <span className="oil-badge">Oil India Limited</span>
          </div>
          <div className="brand-subtitle">
            Nearby Wells Intelligence & Decision Support Platform
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav className="nav-tabs">
        <button
          className={`nav-tab-btn ${activeTab === "overview" ? "active" : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          <Activity size={16} />
          Overview
        </button>
        <button
          className={`nav-tab-btn ${activeTab === "map" ? "active" : ""}`}
          onClick={() => setActiveTab("map")}
        >
          <MapPin size={16} />
          GIS Offset Map
        </button>
        <button
          className={`nav-tab-btn ${activeTab === "similarity" ? "active" : ""}`}
          onClick={() => setActiveTab("similarity")}
        >
          <Layers size={16} />
          Similarity Matrix
        </button>
        <button
          className={`nav-tab-btn ${activeTab === "events" ? "active" : ""}`}
          onClick={() => setActiveTab("events")}
        >
          <FileText size={16} />
          Drilling Events
        </button>
        <button
          className={`nav-tab-btn ${activeTab === "ai" ? "active" : ""}`}
          onClick={() => setActiveTab("ai")}
        >
          <Bot size={16} />
          OIL AI Copilot
        </button>
        <button
          className={`nav-tab-btn ${activeTab === "documents" ? "active" : ""}`}
          onClick={() => setActiveTab("documents")}
        >
          <Sparkles size={16} />
          Documents & DDR
        </button>
      </nav>

      {/* Right Controls: Simulation & Alerts */}
      <div className="header-controls">
        {/* Simulation Pill */}
        <div className="sim-controls-pill">
          <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>
            SIM:
          </span>
          <button
            className={`sim-btn ${isRunning ? "pause" : "play"}`}
            onClick={onTogglePlay}
            title={isRunning ? "Pause Drilling Simulation" : "Start Drilling Simulation"}
          >
            {isRunning ? <Pause size={14} /> : <Play size={14} />}
          </button>
          <button
            className="sim-btn"
            onClick={onReset}
            title="Reset Simulation to 3,050m"
          >
            <RotateCcw size={14} />
          </button>
          <button
            className="speed-badge"
            onClick={() => onChangeSpeed(nextSpeed)}
            title="Click to cycle speed (1x -> 5x -> 10x)"
          >
            {speed}x
          </button>
        </div>

        {/* Alerts Button */}
        <button
          onClick={onOpenAlerts}
          className="btn-secondary"
          style={{ position: "relative", padding: "7px 12px" }}
          title="Active Alerts"
        >
          <Bell size={16} color={unreadAlertsCount > 0 ? "var(--accent-amber)" : "inherit"} />
          {unreadAlertsCount > 0 && (
            <span
              style={{
                position: "absolute",
                top: -5,
                right: -5,
                background: "var(--accent-rose)",
                color: "white",
                fontSize: 10,
                fontWeight: 700,
                width: 18,
                height: 18,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 8px rgba(244, 63, 94, 0.8)",
              }}
            >
              {unreadAlertsCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};
