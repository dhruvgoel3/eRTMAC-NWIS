import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { LoginPage } from "./pages/LoginPage";
import { AccessDeniedPage } from "./pages/AccessDeniedPage";
import { ProfilePage } from "./pages/ProfilePage";

// Admin Pages
import { AdminUsersPage } from "./pages/admin/AdminUsersPage";
import { AdminRolesPage } from "./pages/admin/AdminRolesPage";
import { AdminAuditLogsPage } from "./pages/admin/AdminAuditLogsPage";
import { AdminDashboardPage } from "./pages/admin/AdminDashboardPage";
import { AdminDocumentsPage } from "./pages/admin/AdminDocumentsPage";
import { AdminKnowledgePage } from "./pages/admin/AdminKnowledgePage";
import { AdminWellsEventsPage } from "./pages/admin/AdminWellsEventsPage";
import { AdminProcessingPage } from "./pages/admin/AdminProcessingPage";

// Supervisor & Engineer Pages
import { SupervisorDashboard } from "./pages/SupervisorDashboard";
import { CurrentWellPage } from "./pages/CurrentWellPage";
import { ErrorBoundary } from "./components/common/ErrorBoundary";

// Shared Layout Components
import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";
import { LiveTelemetryBar } from "./components/LiveTelemetryBar";
import { RiskAlertBanner } from "./components/RiskAlertBanner";

// Engineer Tab Components
import { OverviewTab } from "./components/tabs/OverviewTab";
import { GISMapTab } from "./components/tabs/GISMapTab";
import { SimilarityTab } from "./components/tabs/SimilarityTab";
import { EventsKnowledgeTab } from "./components/tabs/EventsKnowledgeTab";
import { AICopilotTab } from "./components/tabs/AICopilotTab";
import { MemoryGraphTab } from "./components/tabs/MemoryGraphTab";
import { WellComparisonTab } from "./components/tabs/WellComparisonTab";

// Modals & Slide-Over Drawers
import { WellDossierDrawer } from "./components/WellDossierDrawer";
import { AlertsModal } from "./components/AlertsModal";
import { AlertEvidenceDrawer } from "./components/AlertEvidenceDrawer";

// Types & Services
import {
  DashboardData,
  Well,
  SimilarWellResult,
  SimulationState,
  Alert,
} from "./types";
import { api } from "./services/api";
import {
  INITIAL_DASHBOARD_DATA,
  INITIAL_SIMULATION_STATE,
  INITIAL_WELLS,
} from "./constants/initialData";
import {
  AlertTriangle,
  Layers,
  Sparkles,
  Target,
  Clock,
  CheckCircle2,
  Compass,
  ArrowRight,
  ShieldCheck,
  Flame,
} from "lucide-react";

// ============================================================================
// 1. ROLE DASHBOARD DISPATCHER
// ============================================================================
function RoleDashboardDispatcher() {
  const { activeRole, hasRole } = useAuth();
  if (hasRole("KNOWLEDGE_ADMIN") || activeRole === "KNOWLEDGE_ADMIN") {
    return <Navigate to="/admin" replace />;
  }
  if (hasRole("DRILLING_SUPERVISOR") || activeRole === "DRILLING_SUPERVISOR") {
    return <Navigate to="/operations" replace />;
  }
  return <Navigate to="/dashboard" replace />;
}

// ============================================================================
// 2. DRILLING ENGINEER SHELL & VIEWS
// ============================================================================
interface EngineerShellProps {
  view:
    | "dashboard"
    | "current-well"
    | "nearby-wells"
    | "historical-intelligence"
    | "risk-alerts"
    | "ask-nwis"
    | "well-comparison"
    | "drilling-memory";
}

function EngineerShell({ view }: EngineerShellProps) {
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardData>(INITIAL_DASHBOARD_DATA);
  const [allWells, setAllWells] = useState<Well[]>(INITIAL_WELLS);
  const [similarWells, setSimilarWells] = useState<SimilarWellResult[]>(
    ((INITIAL_DASHBOARD_DATA as any).similar_wells ||
      (INITIAL_DASHBOARD_DATA.top_similar_well ? [INITIAL_DASHBOARD_DATA.top_similar_well] : [])) as any
  );
  const [simulation, setSimulation] = useState<SimulationState>(INITIAL_SIMULATION_STATE);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [selectedWellForDossier, setSelectedWellForDossier] = useState<Well | null>(null);
  const [isAlertsModalOpen, setIsAlertsModalOpen] = useState<boolean>(false);
  const [alertForEvidence, setAlertForEvidence] = useState<Alert | null>(null);
  const [radiusKm, setRadiusKm] = useState<number>(20);
  const [selectedFormation, setSelectedFormation] = useState<string>("ALL");
  const [intelTab, setIntelTab] = useState<"similarity" | "events">("similarity");

  // Initial load
  useEffect(() => {
    loadEngineerData();
  }, []);

  const loadEngineerData = async () => {
    try {
      const [dash, wells, similar, sim, alertList] = await Promise.all([
        api.getDashboard("OIL-X123"),
        api.getWells({ limit: 100 }),
        api.getSimilarWells("OIL-X123", 50, 10),
        api.getSimulationState(),
        api.getAlerts("OIL-X123", false),
      ]);

      if (dash) setDashboardData(dash);
      if (wells?.length) setAllWells(wells);
      if (similar?.length) setSimilarWells(similar);
      if (sim) setSimulation(sim);
      if (alertList) setAlerts(alertList);
    } catch (err: any) {
      console.warn("[EngineerShell] Initial data fetch notice:", err);
    }
  };

  // Simulation Polling
  useEffect(() => {
    const intervalTime = simulation?.is_running ? 1500 : 5000;
    const timer = setInterval(async () => {
      try {
        const [sim, newAlerts] = await Promise.all([
          api.getSimulationState(),
          api.getAlerts("OIL-X123", false),
        ]);
        setSimulation(sim);
        setAlerts(newAlerts);

        if (dashboardData && sim) {
          setDashboardData((prev) => (prev ? { ...prev, simulation: sim } : INITIAL_DASHBOARD_DATA));
        }
      } catch (err) {
        // silent fail during poll
      }
    }, intervalTime);

    return () => clearInterval(timer);
  }, [simulation?.is_running, dashboardData]);

  // Simulator Play/Pause
  const handleTogglePlay = async () => {
    if (!simulation) return;
    try {
      if (simulation.is_running) {
        await api.pauseSimulation();
        setSimulation((prev) => (prev ? { ...prev, is_running: false } : INITIAL_SIMULATION_STATE));
      } else {
        await api.startSimulation();
        setSimulation((prev) => (prev ? { ...prev, is_running: true } : INITIAL_SIMULATION_STATE));
      }
    } catch (err) {
      console.error("Failed to toggle simulation play/pause", err);
    }
  };

  const handleReset = async () => {
    try {
      await api.resetSimulation();
      const sim = await api.getSimulationState();
      setSimulation(sim);
      const newAlerts = await api.getAlerts("OIL-X123", false);
      setAlerts(newAlerts);
    } catch (err) {
      console.error("Failed to reset simulation", err);
    }
  };

  const handleChangeSpeed = async (newSpeed: number) => {
    try {
      await api.setSimulationSpeed(newSpeed);
      setSimulation((prev) => (prev ? { ...prev, speed_multiplier: newSpeed } : INITIAL_SIMULATION_STATE));
    } catch (err) {
      console.error("Failed to set simulation speed", err);
    }
  };

  const handleSelectWell = async (w: Well | SimilarWellResult) => {
    try {
      const fullWell = await api.getWell(w.well_id);
      setSelectedWellForDossier(fullWell);
    } catch (err) {
      console.error("Failed to fetch full well dossier", err);
    }
  };

  const activeWell = allWells.find((w) => w.is_active) || null;
  const unreadAlertsCount = alerts.filter((a) => !a.acknowledged).length;

  return (
    <div style={{ display: "flex", height: "100vh", width: "100vw", overflow: "hidden", background: "var(--color-cream-paper)" }}>
      {/* Role-Specific Engineer Sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        unreadAlertsCount={unreadAlertsCount}
      />

      {/* Main Content Area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, height: "100vh", overflow: "hidden" }}>
        {/* Unified Operations Header with Stream Controls */}
        <Header
          simulation={simulation}
          onTogglePlay={handleTogglePlay}
          onReset={handleReset}
          onChangeSpeed={handleChangeSpeed}
          unreadAlertsCount={unreadAlertsCount}
          onOpenAlerts={() => setIsAlertsModalOpen(true)}
        />

        {/* Live Rig Telemetry Bar */}
        <LiveTelemetryBar
          simulation={simulation}
          activeWellName={activeWell?.well_id || "OIL-X123"}
          formation={activeWell?.formation || "F3 (Tipam Sandstone)"}
        />

        {/* Proactive Hazard Warning Alert Banner */}
        <RiskAlertBanner
          alerts={alerts}
          onAcknowledge={() => {}}
          onNavigateToOffset={() => navigate("/nearby-wells")}
          onExplainAlert={(a) => setAlertForEvidence(a)}
        />

        {/* Main View Area */}
        <ErrorBoundary fallbackTitle="Unable to display operational intelligence view">
          <main
            className={view === "drilling-memory" ? "main-content--fullbleed" : "main-content"}
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: view === "drilling-memory" ? "hidden" : "auto",
              padding: view === "drilling-memory" ? 0 : "24px 32px",
            }}
          >
            {/* VIEW 1: Dashboard */}
            {view === "dashboard" && (
              <OverviewTab
                data={dashboardData}
                onSelectWell={handleSelectWell}
                onNavigateToTab={(tabKey) => {
                  if (tabKey === "map") navigate("/nearby-wells");
                  else if (tabKey === "similarity" || tabKey === "events") navigate("/historical-intelligence");
                  else if (tabKey === "ai") navigate("/ask-nwis");
                  else if (tabKey === "comparison") navigate("/well-comparison");
                  else if (tabKey === "memory") navigate("/drilling-memory");
                }}
                onExplainAlert={(a) => setAlertForEvidence(a)}
              />
            )}

            {/* VIEW 2: Current Well Deep-Dive */}
            {view === "current-well" && (
              <CurrentWellPage
                simulation={simulation}
                onAskAI={(_wellId) => navigate("/ask-nwis")}
              />
            )}

            {/* VIEW 3: Nearby Well Map */}
            {view === "nearby-wells" && (
              <GISMapTab
                wells={allWells}
                activeWell={activeWell}
                onSelectWell={handleSelectWell}
                radiusKm={radiusKm}
                setRadiusKm={setRadiusKm}
                selectedFormation={selectedFormation}
                setSelectedFormation={setSelectedFormation}
              />
            )}

            {/* VIEW 4: Historical Intelligence (Similar Wells + Historical Events) */}
            {view === "historical-intelligence" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {/* Sub-navigation pill */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--color-sage-mist)", paddingBottom: 12 }}>
                  <div>
                    <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--color-bark)", margin: 0 }}>
                      Historical Well Intelligence &amp; Event Memory
                    </h2>
                    <p style={{ margin: "4px 0 0", color: "var(--color-slate)", fontSize: 13 }}>
                      Correlate current well OIL-X123 against nearby offset wells, event histories, and root cause mitigations.
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: 8, background: "var(--bg-elevated)", padding: "4px 6px", borderRadius: 10, border: "1px solid var(--color-sage-mist)" }}>
                    <button
                      onClick={() => setIntelTab("similarity")}
                      style={{
                        padding: "6px 14px",
                        borderRadius: 7,
                        border: "none",
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: "pointer",
                        background: intelTab === "similarity" ? "var(--color-canopy)" : "transparent",
                        color: intelTab === "similarity" ? "#ffffff" : "var(--color-slate)",
                      }}
                    >
                      Similar Wells Breakdown (Deterministic)
                    </button>
                    <button
                      onClick={() => setIntelTab("events")}
                      style={{
                        padding: "6px 14px",
                        borderRadius: 7,
                        border: "none",
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: "pointer",
                        background: intelTab === "events" ? "var(--color-canopy)" : "transparent",
                        color: intelTab === "events" ? "#ffffff" : "var(--color-slate)",
                      }}
                    >
                      Historical Events Index
                    </button>
                  </div>
                </div>

                {intelTab === "similarity" ? (
                  <SimilarityTab
                    similarWells={similarWells}
                    activeWell={activeWell}
                    onSelectWell={handleSelectWell}
                  />
                ) : (
                  <EventsKnowledgeTab />
                )}
              </div>
            )}

            {/* VIEW 5: Risk Timeline & Proactive Alerts */}
            {view === "risk-alerts" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                <div style={{ borderBottom: "1px solid var(--color-sage-mist)", paddingBottom: 16 }}>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 9999, background: "rgba(245, 158, 11, 0.15)", color: "#d97706", fontSize: 11, fontFamily: "var(--font-mono)", fontWeight: 700, marginBottom: 6 }}>
                    <Flame size={12} />
                    <span>PREDICTIVE HAZARD AVOIDANCE</span>
                  </div>
                  <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--color-bark)", margin: 0 }}>
                    Historical Risk Timeline &amp; Proactive Alert Center
                  </h1>
                  <p style={{ margin: "4px 0 0", color: "var(--color-slate)", fontSize: 13 }}>
                    Continuous cross-referencing of current bit depth ({simulation.current_depth.toFixed(1)}m) against historical risk intervals across offset wells.
                  </p>
                </div>

                {/* Depth Risk Timeline Graphic */}
                <div style={{ background: "var(--color-sheet-white)", border: "1px solid var(--color-sage-mist)", borderRadius: 14, padding: "24px 28px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                    <div style={{ fontWeight: 800, fontSize: 15, color: "var(--color-bark)" }}>
                      Historical Risk Zone Timeline vs. Current Depth
                    </div>
                    <div style={{ fontSize: 12, fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--color-canopy)", background: "rgba(0, 230, 153, 0.12)", padding: "4px 10px", borderRadius: 6 }}>
                      Bit Depth: {simulation.current_depth.toFixed(1)}m
                    </div>
                  </div>

                  {/* Visual Timeline bar */}
                  <div style={{ position: "relative", margin: "40px 10px 30px" }}>
                    <div style={{ height: 6, background: "var(--color-pale-sage)", borderRadius: 3, width: "100%" }} />

                    {/* Stuck Pipe Risk Zone 3180m - 3290m */}
                    <div
                      style={{
                        position: "absolute",
                        top: -6,
                        left: "30%",
                        width: "35%",
                        height: 18,
                        background: "rgba(239, 68, 68, 0.25)",
                        border: "2px solid #ef4444",
                        borderRadius: 6,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <span style={{ fontSize: 10, fontWeight: 800, color: "#b91c42", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                        Stuck Pipe Risk Zone (3,180m – 3,290m) · OIL-X104 Offset
                      </span>
                    </div>

                    {/* Current Bit Marker */}
                    {(() => {
                      const pct = Math.max(0, Math.min(100, ((simulation.current_depth - 3050) / (3450 - 3050)) * 100));
                      return (
                        <div
                          style={{
                            position: "absolute",
                            top: -14,
                            left: `${pct}%`,
                            transform: "translateX(-50%)",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            zIndex: 10,
                          }}
                        >
                          <div style={{ background: "var(--color-canopy)", color: "var(--color-mint-pulse)", padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 800, fontFamily: "var(--font-mono)", whiteSpace: "nowrap", boxShadow: "0 2px 6px rgba(0,0,0,0.2)" }}>
                            ▼ BIT: {simulation.current_depth.toFixed(1)}m
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Timeline markers */}
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--color-muted-slate)", borderTop: "1px dashed var(--color-sage-mist)", paddingTop: 12 }}>
                    <div><strong>3,050m</strong> (Spud Target)</div>
                    <div style={{ color: "#b91c42" }}><strong>3,180m</strong> (Risk Boundary Entry)</div>
                    <div style={{ color: "#b91c42" }}><strong>3,290m</strong> (Risk Boundary Exit)</div>
                    <div><strong>3,450m</strong> (Total Section TD)</div>
                  </div>
                </div>

                {/* Active Alerts List */}
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ fontWeight: 800, fontSize: 15, color: "var(--color-bark)" }}>
                    Proactive Intelligence Alerts ({alerts.length})
                  </div>
                  {alerts.map((alt) => (
                    <div
                      key={alt.id}
                      style={{
                        padding: "18px 20px",
                        background: "var(--color-sheet-white)",
                        border: "1px solid var(--color-sage-mist)",
                        borderLeft: "5px solid #ef4444",
                        borderRadius: 12,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 16,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(239, 68, 68, 0.12)", color: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <AlertTriangle size={20} />
                        </div>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 14, fontWeight: 800, color: "var(--color-bark)" }}>
                              {alt.message}
                            </span>
                            <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 999, background: "rgba(239, 68, 68, 0.15)", color: "#b91c42" }}>
                              {alt.severity}
                            </span>
                          </div>
                          <div style={{ fontSize: 12, color: "var(--color-slate)", marginTop: 4 }}>
                            Bit Depth: <strong>{simulation.current_depth.toFixed(1)}m</strong> · Target Depth: <strong>{alt.depth}m</strong> · Proximity: <strong>{Math.max(0, alt.depth - simulation.current_depth).toFixed(1)}m remaining</strong>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => setAlertForEvidence(alt)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "8px 16px",
                          borderRadius: 8,
                          background: "var(--color-canopy)",
                          color: "#ffffff",
                          border: "none",
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <Sparkles size={14} color="var(--color-mint-pulse)" />
                        Why Am I Seeing This Alert?
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* VIEW 6: Ask NWIS (AI Copilot) */}
            {view === "ask-nwis" && (
              <AICopilotTab
                simulation={simulation}
                activeWellId={activeWell?.well_id || "OIL-X123"}
                formation={activeWell?.formation || "F3 (Tipam)"}
              />
            )}

            {/* VIEW 7: Well Comparison */}
            {view === "well-comparison" && (
              <WellComparisonTab
                activeWell={activeWell}
                similarWells={similarWells}
              />
            )}

            {/* VIEW 8: Drilling Memory Graph */}
            {view === "drilling-memory" && <MemoryGraphTab />}
          </main>
        </ErrorBoundary>

        {/* Responsive Well Dossier Slide-Over Drawer */}
        {selectedWellForDossier && (
          <WellDossierDrawer
            well={selectedWellForDossier}
            onClose={() => setSelectedWellForDossier(null)}
            onAskAIAboutWell={(_wellId) => {
              setSelectedWellForDossier(null);
              navigate("/ask-nwis");
            }}
          />
        )}

        {/* Active Alerts Modal */}
        {isAlertsModalOpen && (
          <AlertsModal
            alerts={alerts}
            onClose={() => setIsAlertsModalOpen(false)}
            onAcknowledge={() => {}}
            onExplainAlert={(a) => {
              setIsAlertsModalOpen(false);
              setAlertForEvidence(a);
            }}
          />
        )}

        {/* Responsive Why Am I Seeing This Alert? Slide-Over Drawer */}
        {alertForEvidence && (
          <AlertEvidenceDrawer
            alert={alertForEvidence}
            currentFormation={activeWell?.formation || "F3 (Tipam)"}
            onClose={() => setAlertForEvidence(null)}
            onAskNWIS={(_query) => {
              setAlertForEvidence(null);
              navigate("/ask-nwis");
            }}
          />
        )}
      </div>
    </div>
  );
}

// ============================================================================
// 3. DRILLING SUPERVISOR SHELL
// ============================================================================
function SupervisorShell({ initialView = "overview" }: { initialView?: "overview" | "wells" | "risks" | "alerts" | "analytics" }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div style={{ display: "flex", height: "100vh", width: "100vw", overflow: "hidden", background: "var(--color-cream-paper)" }}>
      {/* Role-Specific Supervisor Sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Content Area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, height: "100vh", overflow: "hidden" }}>
        {/* Top Status Strip */}
        <div className="auth-top-strip" style={{ opacity: 0.85, fontSize: 11 }}>
          <div className="status-badge">
            <span className="pulse-dot" />
            <span style={{ fontWeight: 600, color: "var(--color-mint-pulse)" }}>
              eRTMAC-NWIS · DRILLING SUPERVISOR SURVEILLANCE &amp; RISK ESCALATION
            </span>
            <span style={{ opacity: 0.35 }}>|</span>
            <span style={{ opacity: 0.85 }}>
              Fleet Status: 12 Active Rigs · 5 Open Alerts · 1 Active Risk
            </span>
          </div>
          <div style={{ opacity: 0.75, letterSpacing: "0.05em", fontSize: 10 }}>
            ROLE: DRILLING_SUPERVISOR · RBAC ISOLATION ACTIVE
          </div>
        </div>

        {/* Header (No simulator playback controls!) */}
        <Header />

        {/* Supervisor Dashboard Content */}
        <main
          className="main-content"
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            padding: "20px 24px",
            maxWidth: "100%",
          }}
        >
          <SupervisorDashboard initialView={initialView} />
        </main>
      </div>
    </div>
  );
}

// ============================================================================
// 4. KNOWLEDGE ADMIN SHELL
// ============================================================================
function AdminShell({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div style={{ display: "flex", height: "100vh", width: "100vw", overflow: "hidden", background: "var(--color-cream-paper)" }}>
      {/* Role-Specific Admin Sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Content Area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, height: "100vh", overflow: "hidden" }}>
        {/* Top Status Strip */}
        <div className="auth-top-strip" style={{ opacity: 0.85, fontSize: 11 }}>
          <div className="status-badge">
            <span className="pulse-dot" />
            <span style={{ fontWeight: 600, color: "var(--color-mint-pulse)" }}>
              eRTMAC-NWIS · KNOWLEDGE ADMINISTRATION &amp; SYSTEM AUDIT
            </span>
            <span style={{ opacity: 0.35 }}>|</span>
            <span style={{ opacity: 0.85 }}>
              Institutional Drilling Knowledge Governance · OIL Enterprise Rig Intelligence
            </span>
          </div>
          <div style={{ opacity: 0.75, letterSpacing: "0.05em", fontSize: 10 }}>
            ROLE: KNOWLEDGE_ADMIN · SYSTEM GOVERNANCE ACTIVE
          </div>
        </div>

        {/* Header (No simulator playback controls!) */}
        <Header />

        {/* Admin Content */}
        <main
          className="main-content"
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            background: "var(--bg-app)",
            maxWidth: "100%",
            padding: "24px 32px",
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}

// ============================================================================
// 5. MAIN ROUTER DEFINITIONS
// ============================================================================
export function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <Routes>
          {/* Public Authentication Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/403" element={<AccessDeniedPage />} />

          {/* Root: Role-based landing dispatcher */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <RoleDashboardDispatcher />
              </ProtectedRoute>
            }
          />

          {/* ============================================================ */}
          {/* ROLE 1: DRILLING ENGINEER ROUTES                             */}
          {/* Strictly protected: DRILLING_ENGINEER ONLY                   */}
          {/* ============================================================ */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={["DRILLING_ENGINEER"]}>
                <EngineerShell view="dashboard" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/current-well"
            element={
              <ProtectedRoute allowedRoles={["DRILLING_ENGINEER"]}>
                <EngineerShell view="current-well" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/nearby-wells"
            element={
              <ProtectedRoute allowedRoles={["DRILLING_ENGINEER"]}>
                <EngineerShell view="nearby-wells" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/historical-intelligence"
            element={
              <ProtectedRoute allowedRoles={["DRILLING_ENGINEER"]}>
                <EngineerShell view="historical-intelligence" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/risk-alerts"
            element={
              <ProtectedRoute allowedRoles={["DRILLING_ENGINEER"]}>
                <EngineerShell view="risk-alerts" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ask-nwis"
            element={
              <ProtectedRoute allowedRoles={["DRILLING_ENGINEER"]}>
                <EngineerShell view="ask-nwis" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/well-comparison"
            element={
              <ProtectedRoute allowedRoles={["DRILLING_ENGINEER"]}>
                <EngineerShell view="well-comparison" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/drilling-memory"
            element={
              <ProtectedRoute allowedRoles={["DRILLING_ENGINEER"]}>
                <EngineerShell view="drilling-memory" />
              </ProtectedRoute>
            }
          />

          {/* Legacy route redirects for Engineer */}
          <Route path="/map" element={<Navigate to="/nearby-wells" replace />} />
          <Route path="/similarity" element={<Navigate to="/historical-intelligence" replace />} />
          <Route path="/events" element={<Navigate to="/historical-intelligence" replace />} />
          <Route path="/ai-assistant" element={<Navigate to="/ask-nwis" replace />} />

          {/* ============================================================ */}
          {/* ROLE 2: DRILLING SUPERVISOR ROUTES                           */}
          {/* Strictly protected: DRILLING_SUPERVISOR ONLY                 */}
          {/* ============================================================ */}
          <Route
            path="/operations"
            element={
              <ProtectedRoute allowedRoles={["DRILLING_SUPERVISOR"]}>
                <SupervisorShell initialView="overview" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/active-wells"
            element={
              <ProtectedRoute allowedRoles={["DRILLING_SUPERVISOR"]}>
                <SupervisorShell initialView="wells" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/risk-overview"
            element={
              <ProtectedRoute allowedRoles={["DRILLING_SUPERVISOR"]}>
                <SupervisorShell initialView="risks" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/alerts"
            element={
              <ProtectedRoute allowedRoles={["DRILLING_SUPERVISOR"]}>
                <SupervisorShell initialView="alerts" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/analytics"
            element={
              <ProtectedRoute allowedRoles={["DRILLING_SUPERVISOR"]}>
                <SupervisorShell initialView="analytics" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/supervisor"
            element={
              <ProtectedRoute allowedRoles={["DRILLING_SUPERVISOR"]}>
                <Navigate to="/operations" replace />
              </ProtectedRoute>
            }
          />

          {/* ============================================================ */}
          {/* ROLE 3: KNOWLEDGE ADMIN ROUTES                               */}
          {/* Strictly protected: KNOWLEDGE_ADMIN ONLY                     */}
          {/* ============================================================ */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={["KNOWLEDGE_ADMIN"]}>
                <AdminShell>
                  <AdminDashboardPage />
                </AdminShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute allowedRoles={["KNOWLEDGE_ADMIN"]}>
                <AdminShell>
                  <AdminUsersPage />
                </AdminShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/documents"
            element={
              <ProtectedRoute allowedRoles={["KNOWLEDGE_ADMIN"]}>
                <AdminShell>
                  <AdminDocumentsPage />
                </AdminShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/knowledge"
            element={
              <ProtectedRoute allowedRoles={["KNOWLEDGE_ADMIN"]}>
                <AdminShell>
                  <AdminKnowledgePage />
                </AdminShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/audit-logs"
            element={
              <ProtectedRoute allowedRoles={["KNOWLEDGE_ADMIN"]}>
                <AdminShell>
                  <AdminAuditLogsPage />
                </AdminShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/wells-events"
            element={
              <ProtectedRoute allowedRoles={["KNOWLEDGE_ADMIN"]}>
                <AdminShell>
                  <AdminWellsEventsPage />
                </AdminShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/processing"
            element={
              <ProtectedRoute allowedRoles={["KNOWLEDGE_ADMIN"]}>
                <AdminShell>
                  <AdminProcessingPage />
                </AdminShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/roles"
            element={
              <ProtectedRoute allowedRoles={["KNOWLEDGE_ADMIN"]}>
                <AdminShell>
                  <AdminRolesPage />
                </AdminShell>
              </ProtectedRoute>
            }
          />

          {/* User Profile View (Any Authenticated Role) */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />

          {/* Catch-all fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  </BrowserRouter>
  );
}

export default App;
