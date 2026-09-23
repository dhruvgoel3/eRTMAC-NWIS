import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { LoginPage } from "./pages/LoginPage";
import { AccessDeniedPage } from "./pages/AccessDeniedPage";
import { ProfilePage } from "./pages/ProfilePage";
import { AdminUsersPage } from "./pages/admin/AdminUsersPage";
import { AdminRolesPage } from "./pages/admin/AdminRolesPage";
import { AdminAuditLogsPage } from "./pages/admin/AdminAuditLogsPage";
import { ErrorBoundary } from "./components/common/ErrorBoundary";

import { Header } from "./components/Header";
import { LiveTelemetryBar } from "./components/LiveTelemetryBar";
import { RiskAlertBanner } from "./components/RiskAlertBanner";
import { OverviewTab } from "./components/tabs/OverviewTab";
import { GISMapTab } from "./components/tabs/GISMapTab";
import { SimilarityTab } from "./components/tabs/SimilarityTab";
import { EventsKnowledgeTab } from "./components/tabs/EventsKnowledgeTab";
import { AICopilotTab } from "./components/tabs/AICopilotTab";
import { DocumentsTab } from "./components/tabs/DocumentsTab";
import { MemoryGraphTab } from "./components/tabs/MemoryGraphTab";
import { WellDossierModal } from "./components/WellDossierModal";
import { AlertsModal } from "./components/AlertsModal";
import { AlertEvidenceModal } from "./components/AlertEvidenceModal";
import {
  DashboardData,
  Well,
  SimilarWellResult,
  SimulationState,
  Alert,
} from "./types";
import { api } from "./services/api";

function OperationsDashboard() {
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [allWells, setAllWells] = useState<Well[]>([]);
  const [similarWells, setSimilarWells] = useState<SimilarWellResult[]>([]);
  const [simulation, setSimulation] = useState<SimulationState | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [selectedWellForDossier, setSelectedWellForDossier] = useState<Well | null>(null);
  const [isAlertsModalOpen, setIsAlertsModalOpen] = useState<boolean>(false);
  const [alertForEvidence, setAlertForEvidence] = useState<Alert | null>(null);
  const [radiusKm, setRadiusKm] = useState<number>(20);
  const [selectedFormation, setSelectedFormation] = useState<string>("ALL");

  // Initial load
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const [dash, wells, similar, sim, alertList] = await Promise.all([
        api.getDashboard("OIL-X123"),
        api.getWells({ limit: 100 }),
        api.getSimilarWells("OIL-X123", 50, 10),
        api.getSimulationState(),
        api.getAlerts("OIL-X123", false),
      ]);

      setDashboardData(dash);
      setAllWells(wells);
      setSimilarWells(similar);
      setSimulation(sim);
      setAlerts(alertList);
    } catch (err) {
      console.error("Initial data loading error:", err);
    }
  };

  // Real-time simulation polling (polls every 1.5s when running, or every 5s when paused)
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

        // Update dashboard simulation and current depth
        if (dashboardData && sim) {
          setDashboardData((prev) => (prev ? { ...prev, simulation: sim } : null));
        }
      } catch (err) {
        // Silent fail during poll
      }
    }, intervalTime);

    return () => clearInterval(timer);
  }, [simulation?.is_running, dashboardData]);

  // Handlers for simulation
  const handleTogglePlay = async () => {
    if (!simulation) return;
    try {
      if (simulation.is_running) {
        await api.pauseSimulation();
        setSimulation((prev) => (prev ? { ...prev, is_running: false } : null));
      } else {
        await api.startSimulation();
        setSimulation((prev) => (prev ? { ...prev, is_running: true } : null));
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
      setSimulation((prev) => (prev ? { ...prev, speed_multiplier: newSpeed } : null));
    } catch (err) {
      console.error("Failed to set simulation speed", err);
    }
  };

  const handleAcknowledgeAlert = async (alertId: number) => {
    try {
      await api.acknowledgeAlert(alertId);
      setAlerts((prev) => prev.filter((a) => a.id !== alertId));
    } catch (err) {
      console.error("Failed to acknowledge alert", err);
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
    <div className="app-container">
      {/* Demo Environment Banner */}
      <div className="auth-top-strip">
        <div className="status-badge">
          <span className="pulse-dot" />
          <span style={{ fontWeight: 700, color: "var(--color-mint-pulse)" }}>
            DEMO ENVIRONMENT — SYNTHETIC DATA
          </span>
          <span style={{ opacity: 0.35 }}>|</span>
          <span style={{ opacity: 0.85 }}>
            Oil India Limited · SIH-121 Prototype
          </span>
        </div>
        <div style={{ opacity: 0.75, letterSpacing: "0.06em" }}>
          ROLE-BASED ACCESS CONTROL ACTIVE
        </div>
      </div>

      {/* Header with Navigation & Simulation Pills */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        simulation={simulation}
        onTogglePlay={handleTogglePlay}
        onReset={handleReset}
        onChangeSpeed={handleChangeSpeed}
        unreadAlertsCount={unreadAlertsCount}
        onOpenAlerts={() => setIsAlertsModalOpen(true)}
      />

      {/* Real-time Telemetry Status Bar */}
      <LiveTelemetryBar
        simulation={simulation}
        activeWellName={activeWell?.well_id || "OIL-X123"}
        formation={activeWell?.formation || "Tipam Sandstone"}
      />

      {/* Hazard Warning Alert Banner */}
      <RiskAlertBanner
        alerts={alerts}
        onAcknowledge={handleAcknowledgeAlert}
        onNavigateToOffset={() => setActiveTab("map")}
        onExplainAlert={(a) => setAlertForEvidence(a)}
      />

      {/* Main View Area */}
      <ErrorBoundary fallbackTitle="Unable to display this operational tab view">
        <main
          className={activeTab === "memory" ? "main-content--fullbleed" : "main-content"}
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: activeTab === "memory" ? "hidden" : "auto",
          }}
        >
          {activeTab === "overview" && (
            <OverviewTab
              data={dashboardData}
              onSelectWell={handleSelectWell}
              onNavigateToTab={setActiveTab}
              onExplainAlert={(a) => setAlertForEvidence(a)}
            />
          )}

          {activeTab === "map" && (
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

          {activeTab === "similarity" && (
            <SimilarityTab
              similarWells={similarWells}
              activeWell={activeWell}
              onSelectWell={handleSelectWell}
            />
          )}

          {activeTab === "events" && <EventsKnowledgeTab />}

          {activeTab === "memory" && <MemoryGraphTab />}

          {activeTab === "ai" && (
            <AICopilotTab
              simulation={simulation}
              activeWellId={activeWell?.well_id || "OIL-X123"}
              formation={activeWell?.formation || "Tipam"}
            />
          )}

          {activeTab === "documents" && (
            <DocumentsTab
              onAskAIAboutDoc={(_docTitle) => {
                setActiveTab("ai");
              }}
            />
          )}
        </main>
      </ErrorBoundary>

      {/* Well Dossier Modal */}
      {selectedWellForDossier && (
        <WellDossierModal
          well={selectedWellForDossier}
          onClose={() => setSelectedWellForDossier(null)}
          onAskAIAboutWell={(_wellId) => {
            setSelectedWellForDossier(null);
            setActiveTab("ai");
          }}
        />
      )}

      {/* Active Alerts Modal */}
      {isAlertsModalOpen && (
        <AlertsModal
          alerts={alerts}
          onClose={() => setIsAlertsModalOpen(false)}
          onAcknowledge={handleAcknowledgeAlert}
          onExplainAlert={(a) => {
            setIsAlertsModalOpen(false);
            setAlertForEvidence(a);
          }}
        />
      )}

      {/* Why Am I Seeing This Alert? Evidence Modal */}
      {alertForEvidence && (
        <AlertEvidenceModal
          alert={alertForEvidence}
          currentFormation={activeWell?.formation || "Tipam"}
          onClose={() => setAlertForEvidence(null)}
          onAskNWIS={(_query) => {
            setAlertForEvidence(null);
            setActiveTab("ai");
          }}
        />
      )}
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Authentication Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/403" element={<AccessDeniedPage />} />

          {/* Protected Main Operations Dashboard */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <OperationsDashboard />
              </ProtectedRoute>
            }
          />
          <Route path="/dashboard" element={<Navigate to="/" replace />} />

          {/* Protected Operator Profile */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />

          {/* Protected Admin Routes */}
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute requiredPermission="users.view">
                <AdminUsersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/roles"
            element={
              <ProtectedRoute requiredPermission="roles.view">
                <AdminRolesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/audit-logs"
            element={
              <ProtectedRoute requiredPermission="audit.view">
                <AdminAuditLogsPage />
              </ProtectedRoute>
            }
          />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
