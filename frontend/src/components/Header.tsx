import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Activity,
  Play,
  Pause,
  RotateCcw,
  Bell,
  Compass,
  Shield,
  LogOut,
  User,
  Settings,
  ChevronDown,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Users,
  Database,
  FileCheck,
} from "lucide-react";
import { SimulationState } from "../types";
import { useAuth } from "../contexts/AuthContext";

interface HeaderProps {
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
  simulation?: SimulationState | null;
  onTogglePlay?: () => void;
  onReset?: () => void;
  onChangeSpeed?: (speed: number) => void;
  unreadAlertsCount?: number;
  onOpenAlerts?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  simulation,
  onTogglePlay,
  onReset,
  onChangeSpeed,
  unreadAlertsCount = 0,
  onOpenAlerts,
}) => {
  const { profile, activeRole, logout, hasRole, switchRole } = useAuth();
  const [userDropdownOpen, setUserDropdownOpen] = useState<boolean>(false);
  const navigate = useNavigate();
  const location = useLocation();

  const isRunning = simulation?.is_running ?? false;
  const currentDepth = simulation?.current_depth ?? 3172.0;
  const speed = simulation?.speed_multiplier ?? 1;
  const nextSpeed = speed === 1 ? 5 : speed === 5 ? 10 : 1;

  const isKnowledgeAdmin = hasRole("KNOWLEDGE_ADMIN") || activeRole === "KNOWLEDGE_ADMIN";
  const isSupervisor = hasRole("DRILLING_SUPERVISOR") || activeRole === "DRILLING_SUPERVISOR";
  const isEngineer = !isKnowledgeAdmin && !isSupervisor;

  // Stream state computation per prompt:
  // 3172m -> APPROACHING
  // 3180m -> HISTORICAL RISK ENTERED
  // 3290m -> RISK PASSED
  let streamStateBadge = {
    label: "APPROACHING",
    subtext: `${currentDepth.toFixed(1)}m · 8m to Risk Zone (3180m)`,
    color: "#f59e0b",
    bg: "rgba(245, 158, 11, 0.15)",
    border: "rgba(245, 158, 11, 0.4)",
  };

  if (currentDepth >= 3180 && currentDepth <= 3290) {
    streamStateBadge = {
      label: "HISTORICAL RISK ENTERED",
      subtext: `${currentDepth.toFixed(1)}m · Inside Stuck Pipe Zone (3180–3290m)`,
      color: "#ef4444",
      bg: "rgba(239, 68, 68, 0.18)",
      border: "rgba(239, 68, 68, 0.4)",
    };
  } else if (currentDepth > 3290) {
    streamStateBadge = {
      label: "RISK PASSED",
      subtext: `${currentDepth.toFixed(1)}m · Historical Risk Passed`,
      color: "#10b981",
      bg: "rgba(16, 185, 129, 0.15)",
      border: "rgba(16, 185, 129, 0.4)",
    };
  }

  const roleBadgeLabel = isKnowledgeAdmin
    ? "KNOWLEDGE ADMIN"
    : isSupervisor
    ? "DRILLING SUPERVISOR"
    : "DRILLING ENGINEER";

  const handleRoleSwitch = (newRole: string) => {
    switchRole(newRole);
    setUserDropdownOpen(false);
    if (newRole === "KNOWLEDGE_ADMIN") {
      navigate("/admin");
    } else if (newRole === "DRILLING_SUPERVISOR") {
      navigate("/operations");
    } else {
      navigate("/dashboard");
    }
  };

  return (
    <header
      className="header-wrapper"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 24px",
        background: "#ffffff",
        borderBottom: "1px solid var(--color-sage-mist)",
        position: "sticky",
        top: 0,
        zIndex: 40,
        gap: 16,
      }}
    >
      {/* Left: Role Context & Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "4px 10px",
            borderRadius: 9999,
            background: isKnowledgeAdmin
              ? "rgba(147, 51, 234, 0.1)"
              : isSupervisor
              ? "rgba(217, 119, 6, 0.1)"
              : "rgba(0, 230, 153, 0.15)",
            border: isKnowledgeAdmin
              ? "1px solid rgba(147, 51, 234, 0.3)"
              : isSupervisor
              ? "1px solid rgba(217, 119, 6, 0.3)"
              : "1px solid rgba(0, 230, 153, 0.4)",
            color: isKnowledgeAdmin
              ? "#9333ea"
              : isSupervisor
              ? "#d97706"
              : "var(--color-canopy)",
            fontSize: 11,
            fontWeight: 800,
            fontFamily: "var(--font-mono)",
            letterSpacing: "0.06em",
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: isKnowledgeAdmin
                ? "#9333ea"
                : isSupervisor
                ? "#d97706"
                : "var(--color-mint-pulse)",
            }}
          />
          <span>{roleBadgeLabel}</span>
        </div>

        <div style={{ fontSize: 12, color: "var(--color-slate)", display: "flex", alignItems: "center", gap: 6 }}>
          <span>·</span>
          <span>
            {isKnowledgeAdmin
              ? "Institutional Knowledge Base, Users & Document Processing"
              : isSupervisor
              ? "Multi-Well Surveillance, Risk Overview & Alerts"
              : "Active Well OIL-X123 · Depth 3,172m · Formation F3"}
          </span>
          <span>·</span>
          <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 6, background: "rgba(16, 67, 54, 0.08)", color: "var(--color-slate)", border: "1px solid var(--color-sage-mist)", fontWeight: 600 }}>
            Prototype — Synthetic / Anonymized Demonstration Data
          </span>
        </div>
      </div>


      {/* Center: Persona-Specific Status & Simulator Controls */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {/* DRILLING ENGINEER: eRTMAC Prototype Stream Controls */}
        {isEngineer && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "4px 12px",
              borderRadius: 10,
              background: "var(--bg-elevated)",
              border: "1px solid var(--color-sage-mist)",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: "var(--color-bark)", letterSpacing: "0.04em" }}>
                  eRTMAC Prototype Stream
                </span>
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    padding: "1px 6px",
                    borderRadius: 999,
                    background: streamStateBadge.bg,
                    color: streamStateBadge.color,
                    border: `1px solid ${streamStateBadge.border}`,
                  }}
                >
                  {streamStateBadge.label}
                </span>
              </div>
              <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--color-slate)" }}>
                {streamStateBadge.subtext}
              </span>
            </div>

            {/* Play/Pause, Reset, Speed Controls */}
            {onTogglePlay && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, borderLeft: "1px solid var(--color-sage-mist)", paddingLeft: 10 }}>
                <button
                  onClick={onTogglePlay}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "4px 10px",
                    borderRadius: 6,
                    background: isRunning ? "rgba(185, 28, 66, 0.1)" : "rgba(0, 230, 153, 0.2)",
                    border: isRunning ? "1px solid rgba(185, 28, 66, 0.3)" : "1px solid rgba(0, 230, 153, 0.4)",
                    color: isRunning ? "#b91c42" : "var(--color-canopy)",
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                  title={isRunning ? "Pause stream" : "Start stream"}
                >
                  {isRunning ? <Pause size={12} /> : <Play size={12} />}
                  <span>{isRunning ? "PAUSE" : "START"}</span>
                </button>

                {onReset && (
                  <button
                    onClick={onReset}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "4px 8px",
                      borderRadius: 6,
                      background: "#ffffff",
                      border: "1px solid var(--color-sage-mist)",
                      color: "var(--color-slate)",
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                    title="Reset to 3050m"
                  >
                    <RotateCcw size={12} />
                    <span>RESET</span>
                  </button>
                )}

                {onChangeSpeed && (
                  <button
                    onClick={() => onChangeSpeed(nextSpeed)}
                    style={{
                      padding: "4px 8px",
                      borderRadius: 6,
                      background: "var(--color-canopy)",
                      border: "none",
                      color: "#ffffff",
                      fontSize: 10,
                      fontFamily: "var(--font-mono)",
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                    title="Cycle simulation speed"
                  >
                    {speed}x
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* DRILLING SUPERVISOR: Operations Status Pill */}
        {isSupervisor && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              padding: "6px 14px",
              borderRadius: 10,
              background: "rgba(217, 119, 6, 0.08)",
              border: "1px solid rgba(217, 119, 6, 0.25)",
              fontSize: 11,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ color: "var(--color-muted-slate)" }}>Active Wells:</span>
              <strong style={{ color: "var(--color-bark)" }}>12</strong>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ color: "var(--color-muted-slate)" }}>Approaching:</span>
              <strong style={{ color: "#d97706" }}>3</strong>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ color: "var(--color-muted-slate)" }}>Active Risk:</span>
              <strong style={{ color: "#b91c42" }}>1</strong>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ color: "var(--color-muted-slate)" }}>Open Alerts:</span>
              <strong style={{ color: "#b91c42" }}>5</strong>
            </div>
          </div>
        )}

        {/* KNOWLEDGE ADMIN: System Status Pill */}
        {isKnowledgeAdmin && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "6px 14px",
              borderRadius: 10,
              background: "rgba(147, 51, 234, 0.08)",
              border: "1px solid rgba(147, 51, 234, 0.25)",
              fontSize: 11,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Database size={13} color="#9333ea" />
              <span style={{ color: "var(--color-muted-slate)" }}>Repository:</span>
              <strong style={{ color: "#10b981" }}>ONLINE</strong>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <FileCheck size={13} color="#9333ea" />
              <span style={{ color: "var(--color-muted-slate)" }}>Audit Traceability:</span>
              <strong style={{ color: "var(--color-bark)" }}>ACTIVE</strong>
            </div>
          </div>
        )}
      </div>

      {/* Right Controls: Alerts Bell + User Identity & Role Switcher */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {/* Operational Alerts Bell: Shown for Engineer & Supervisor, NEVER for Admin */}
        {!isKnowledgeAdmin && onOpenAlerts && (
          <button
            onClick={onOpenAlerts}
            style={{
              position: "relative",
              padding: "8px 12px",
              borderRadius: 10,
              border: "1px solid var(--color-sage-mist)",
              background: "#ffffff",
              display: "flex",
              alignItems: "center",
              gap: 6,
              cursor: "pointer",
            }}
            title="Operational Alerts"
          >
            <Bell size={15} color={unreadAlertsCount > 0 ? "#b91c42" : "var(--color-slate)"} />
            {unreadAlertsCount > 0 && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: "#b91c42",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {unreadAlertsCount}
              </span>
            )}
          </button>
        )}

        {/* User Menu & Role Switcher Dropdown */}
        <div style={{ position: "relative" }}>
          <button
            id="header-user-menu-btn"
            onClick={() => setUserDropdownOpen(!userDropdownOpen)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 12px 6px 8px",
              borderRadius: 10,
              border: "1px solid var(--color-sage-mist)",
              background: "#ffffff",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: "var(--color-canopy)",
                color: "var(--color-mint-pulse)",
                fontWeight: 800,
                fontSize: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : "O"}
            </div>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-bark)", lineHeight: 1.1 }}>
                {profile?.full_name || "Operator"}
              </div>
              <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--color-slate)", letterSpacing: "0.02em" }}>
                {activeRole || "DRILLING_ENGINEER"}
              </div>
            </div>
            <ChevronDown size={14} color="var(--color-muted-slate)" />
          </button>

          {/* User Menu Dropdown with 1-Click Role Switcher */}
          {userDropdownOpen && (
            <div
              style={{
                position: "absolute",
                right: 0,
                marginTop: 6,
                width: 260,
                background: "#ffffff",
                borderRadius: 12,
                border: "1px solid var(--color-sage-mist)",
                boxShadow: "0 10px 30px rgba(16, 67, 54, 0.15)",
                padding: "8px 0",
                zIndex: 100,
                fontSize: 12,
              }}
            >
              <div style={{ padding: "8px 16px 10px", borderBottom: "1px solid var(--color-sage-mist)" }}>
                <div style={{ fontWeight: 800, color: "var(--color-bark)" }}>{profile?.full_name}</div>
                <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--color-muted-slate)" }}>
                  {profile?.email}
                </div>
              </div>

              {/* Prototype Role Switcher */}
              <div style={{ padding: "8px 16px 4px", fontSize: 10, fontFamily: "var(--font-mono)", textTransform: "uppercase", color: "var(--color-muted-slate)", fontWeight: 700 }}>
                Switch Prototype Experience
              </div>

              <button
                onClick={() => handleRoleSwitch("DRILLING_ENGINEER")}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 16px",
                  background: isEngineer ? "rgba(0, 230, 153, 0.12)" : "transparent",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                  fontSize: 12,
                  fontWeight: isEngineer ? 700 : 500,
                  color: isEngineer ? "var(--color-canopy)" : "var(--color-bark)",
                }}
              >
                <span>Drilling Engineer</span>
                {isEngineer && <CheckCircle2 size={14} color="var(--color-canopy)" />}
              </button>

              <button
                onClick={() => handleRoleSwitch("DRILLING_SUPERVISOR")}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 16px",
                  background: isSupervisor ? "rgba(217, 119, 6, 0.12)" : "transparent",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                  fontSize: 12,
                  fontWeight: isSupervisor ? 700 : 500,
                  color: isSupervisor ? "#d97706" : "var(--color-bark)",
                }}
              >
                <span>Drilling Supervisor</span>
                {isSupervisor && <CheckCircle2 size={14} color="#d97706" />}
              </button>

              <button
                onClick={() => handleRoleSwitch("KNOWLEDGE_ADMIN")}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 16px",
                  background: isKnowledgeAdmin ? "rgba(147, 51, 234, 0.12)" : "transparent",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                  fontSize: 12,
                  fontWeight: isKnowledgeAdmin ? 700 : 500,
                  color: isKnowledgeAdmin ? "#9333ea" : "var(--color-bark)",
                }}
              >
                <span>Knowledge Admin</span>
                {isKnowledgeAdmin && <CheckCircle2 size={14} color="#9333ea" />}
              </button>

              <div style={{ height: 1, background: "var(--color-sage-mist)", margin: "6px 0" }} />

              <button
                id="header-logout-btn"
                type="button"
                onClick={logout}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 16px",
                  color: "#b91c42",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                  fontSize: 12,
                  fontWeight: 600,
                }}
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
