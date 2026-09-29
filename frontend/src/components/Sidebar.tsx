import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Activity,
  Target,
  MapPin,
  Layers,
  AlertTriangle,
  Bot,
  Compass,
  Share2,
  Users,
  FileText,
  Database,
  FileCheck,
  BarChart2,
  Bell,
  Shield,
  ChevronLeft,
  ChevronRight,
  Flame,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: React.ReactNode;
  badge?: string;
}

const ENGINEER_SIDEBAR_ITEMS: NavItem[] = [
  { id: "dashboard", label: "Dashboard", path: "/dashboard", icon: <Activity size={17} /> },
  { id: "current-well", label: "Current Well", path: "/current-well", icon: <Target size={17} /> },
  { id: "nearby-wells", label: "Nearby Wells", path: "/nearby-wells", icon: <MapPin size={17} /> },
  { id: "historical-intelligence", label: "Historical Intelligence", path: "/historical-intelligence", icon: <Layers size={17} /> },
  { id: "risk-alerts", label: "Risk & Alerts", path: "/risk-alerts", icon: <AlertTriangle size={17} /> },
  { id: "ask-nwis", label: "Ask NWIS", path: "/ask-nwis", icon: <Bot size={17} /> },
  { id: "well-comparison", label: "Well Comparison", path: "/well-comparison", icon: <Compass size={17} /> },
  { id: "drilling-memory", label: "Drilling Memory", path: "/drilling-memory", icon: <Share2 size={17} /> },
];

const SUPERVISOR_SIDEBAR_ITEMS: NavItem[] = [
  { id: "dashboard", label: "Dashboard", path: "/operations", icon: <Activity size={17} /> },
  { id: "active-wells", label: "Active Wells", path: "/active-wells", icon: <Target size={17} />, badge: "12" },
  { id: "risk-overview", label: "Risk Overview", path: "/risk-overview", icon: <Flame size={17} />, badge: "4 Risks" },
  { id: "alerts", label: "Alerts", path: "/alerts", icon: <Bell size={17} />, badge: "5 Open" },
  { id: "analytics", label: "Analytics", path: "/analytics", icon: <BarChart2 size={17} /> },
];

const ADMIN_SIDEBAR_ITEMS: NavItem[] = [
  { id: "dashboard", label: "Dashboard", path: "/admin", icon: <Activity size={17} /> },
  { id: "users", label: "Users", path: "/admin/users", icon: <Users size={17} /> },
  { id: "documents", label: "Documents", path: "/admin/documents", icon: <FileText size={17} /> },
  { id: "knowledge", label: "Knowledge", path: "/admin/knowledge", icon: <Database size={17} /> },
  { id: "audit-logs", label: "Audit Logs", path: "/admin/audit-logs", icon: <FileCheck size={17} /> },
];

interface SidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  unreadAlertsCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed = false,
  onToggleCollapse,
  unreadAlertsCount = 0,
}) => {
  const { activeRole, hasRole } = useAuth();
  const location = useLocation();

  const isKnowledgeAdmin = hasRole("KNOWLEDGE_ADMIN") || activeRole === "KNOWLEDGE_ADMIN";
  const isSupervisor = hasRole("DRILLING_SUPERVISOR") || activeRole === "DRILLING_SUPERVISOR";

  const navItems = isKnowledgeAdmin
    ? ADMIN_SIDEBAR_ITEMS
    : isSupervisor
    ? SUPERVISOR_SIDEBAR_ITEMS
    : ENGINEER_SIDEBAR_ITEMS;

  const roleTitle = isKnowledgeAdmin
    ? "Knowledge Admin"
    : isSupervisor
    ? "Drilling Supervisor"
    : "Drilling Engineer";

  const roleSubtitle = isKnowledgeAdmin
    ? "System & Knowledge Portal"
    : isSupervisor
    ? "Multi-Well Surveillance"
    : "Well Operational Intelligence";

  const roleAccentColor = isKnowledgeAdmin
    ? "#9333ea"
    : isSupervisor
    ? "#d97706"
    : "#00e699";

  const isItemActive = (item: NavItem) => {
    if (location.pathname === item.path) return true;
    if (item.id === "dashboard") {
      if (isKnowledgeAdmin && location.pathname === "/admin") return true;
      if (isSupervisor && (location.pathname === "/operations" || location.pathname === "/supervisor")) return true;
      if (!isKnowledgeAdmin && !isSupervisor && (location.pathname === "/" || location.pathname === "/dashboard")) return true;
    }
    return false;
  };

  return (
    <aside
      className={`app-sidebar ${collapsed ? "app-sidebar--collapsed" : ""}`}
      style={{
        width: collapsed ? 70 : 250,
        minWidth: collapsed ? 70 : 250,
        height: "100vh",
        background: "var(--bg-elevated)",
        borderRight: "1px solid var(--color-sage-mist)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        transition: "width 0.2s ease, min-width 0.2s ease",
        zIndex: 50,
        position: "sticky",
        top: 0,
        userSelect: "none",
      }}
    >
      {/* Brand & Role Header */}
      <div>
        <div
          style={{
            padding: collapsed ? "16px 10px" : "18px 18px",
            borderBottom: "1px solid var(--color-sage-mist)",
            display: "flex",
            alignItems: "center",
            justifyContent: collapsed ? "center" : "space-between",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, overflow: "hidden" }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "var(--color-canopy)",
                color: "var(--color-mint-pulse)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                boxShadow: "0 2px 8px rgba(0, 40, 30, 0.25)",
              }}
            >
              <Compass size={20} />
            </div>
            {!collapsed && (
              <div style={{ overflow: "hidden" }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: "var(--color-bark)", letterSpacing: "-0.01em", lineHeight: 1.1 }}>
                  eRTMAC-NWIS
                </div>
                <div style={{ fontSize: 10, fontWeight: 600, color: "var(--color-muted-slate)", letterSpacing: "0.04em", marginTop: 2 }}>
                  Oil India Limited
                </div>
              </div>
            )}
          </div>

          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: 4,
                color: "var(--color-muted-slate)",
                borderRadius: 6,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
          )}
        </div>

        {/* Role Identity Card */}
        {!collapsed && (
          <div
            style={{
              padding: "12px 14px",
              margin: "12px 12px 8px 12px",
              borderRadius: 10,
              background: "var(--color-sheet-white)",
              border: "1px solid var(--color-sage-mist)",
              borderLeft: `4px solid ${roleAccentColor}`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: roleAccentColor,
                  boxShadow: `0 0 6px ${roleAccentColor}`,
                }}
              />
              <span style={{ fontSize: 11, fontWeight: 800, color: "var(--color-bark)", letterSpacing: "0.04em" }}>
                {roleTitle.toUpperCase()}
              </span>
            </div>
            <div style={{ fontSize: 11, color: "var(--color-slate)", marginTop: 2 }}>
              {roleSubtitle}
            </div>
          </div>
        )}

        {/* Navigation List */}
        <nav style={{ padding: "8px 10px", display: "flex", flexDirection: "column", gap: 4 }}>
          {navItems.map((item) => {
            const active = isItemActive(item);
            return (
              <Link
                key={item.id}
                to={item.path}
                title={collapsed ? item.label : undefined}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: collapsed ? "center" : "space-between",
                  gap: 12,
                  padding: collapsed ? "10px 0" : "9px 12px",
                  borderRadius: 9,
                  textDecoration: "none",
                  fontWeight: active ? 700 : 600,
                  fontSize: 13,
                  color: active ? "var(--color-canopy)" : "var(--color-slate)",
                  background: active ? "rgba(0, 230, 153, 0.12)" : "transparent",
                  border: active ? "1px solid rgba(0, 230, 153, 0.35)" : "1px solid transparent",
                  transition: "all 0.15s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ color: active ? "var(--color-canopy)" : "var(--color-muted-slate)", flexShrink: 0 }}>
                    {item.icon}
                  </span>
                  {!collapsed && <span>{item.label}</span>}
                </div>

                {!collapsed && item.badge && (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "2px 6px",
                      borderRadius: 999,
                      background: "rgba(16, 67, 54, 0.08)",
                      color: "var(--color-canopy)",
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Footer Details */}
      <div style={{ padding: "12px 14px", borderTop: "1px solid var(--color-sage-mist)" }}>
        {!collapsed ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 10, color: "var(--color-muted-slate)" }}>
              <span>ROLE RBAC ISOLATION</span>
              <span style={{ fontWeight: 700, color: "var(--color-canopy)" }}>ACTIVE</span>
            </div>
            <div style={{ fontSize: 10, color: "var(--color-slate)", lineHeight: 1.4 }}>
              Decision Support System v2.6 · SIH AI Prototype
            </div>
          </div>
        ) : (
          <div style={{ textAlign: "center" }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "var(--color-mint-pulse)",
                display: "inline-block",
              }}
              title="RBAC Active"
            />
          </div>
        )}
      </div>
    </aside>
  );
};
