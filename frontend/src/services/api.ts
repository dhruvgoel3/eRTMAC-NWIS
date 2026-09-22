import axios from "axios";
import {
  Well,
  WellEvent,
  RiskZone,
  Alert,
  SimulationState,
  SimilarWellResult,
  DocumentItem,
  AIQueryResponse,
  DashboardData,
} from "../types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

export const api = {
  // Dashboard
  getDashboard: async (wellId: string = "OIL-X123"): Promise<DashboardData> => {
    const res = await client.get(`/api/dashboard/${wellId}`);
    return res.data;
  },

  // Wells
  getActiveWell: async (): Promise<Well> => {
    const res = await client.get("/api/wells/active");
    return res.data;
  },

  getWells: async (params?: {
    formation?: string;
    status?: string;
    limit?: number;
  }): Promise<Well[]> => {
    const res = await client.get("/api/wells", { params });
    return res.data;
  },

  getWell: async (wellId: string): Promise<Well> => {
    const res = await client.get(`/api/wells/${wellId}`);
    return res.data;
  },

  getNearbyWells: async (
    wellId: string = "OIL-X123",
    radiusKm: number = 20,
    formation?: string
  ): Promise<Well[]> => {
    const res = await client.get(`/api/wells/${wellId}/nearby`, {
      params: { radius_km: radiusKm, formation },
    });
    return res.data;
  },

  getSimilarWells: async (
    wellId: string = "OIL-X123",
    radiusKm: number = 50,
    topN: number = 10
  ): Promise<SimilarWellResult[]> => {
    const res = await client.get(`/api/wells/${wellId}/similar`, {
      params: { radius_km: radiusKm, top_n: topN },
    });
    return res.data;
  },

  getWellEvents: async (wellId: string): Promise<WellEvent[]> => {
    const res = await client.get(`/api/wells/${wellId}/events`);
    return res.data;
  },

  getRiskZones: async (wellId: string, depth?: number): Promise<RiskZone[]> => {
    const res = await client.get(`/api/wells/${wellId}/risk-zones`, {
      params: { depth },
    });
    return res.data;
  },

  // Events knowledge base
  getEvents: async (params?: {
    event_type?: string;
    severity?: string;
    formation?: string;
    depth_min?: number;
    depth_max?: number;
    limit?: number;
  }): Promise<WellEvent[]> => {
    const res = await client.get("/api/events", { params });
    return res.data;
  },

  // Documents
  getDocuments: async (params?: {
    well_id?: string;
    doc_type?: string;
    search?: string;
  }): Promise<DocumentItem[]> => {
    const res = await client.get("/api/documents", { params });
    return res.data;
  },

  getDocument: async (docId: number): Promise<any> => {
    const res = await client.get(`/api/documents/${docId}`);
    return res.data;
  },

  // Alerts
  getAlerts: async (wellId?: string, acknowledged: boolean = false): Promise<Alert[]> => {
    const res = await client.get("/api/alerts", {
      params: { well_id_str: wellId, acknowledged },
    });
    return res.data;
  },

  acknowledgeAlert: async (alertId: number): Promise<void> => {
    await client.post(`/api/alerts/${alertId}/acknowledge`);
  },

  // Simulation
  getSimulationState: async (): Promise<SimulationState> => {
    const res = await client.get("/api/simulation/state");
    return res.data;
  },

  startSimulation: async (): Promise<{ status: string }> => {
    const res = await client.post("/api/simulation/start");
    return res.data;
  },

  pauseSimulation: async (): Promise<{ status: string }> => {
    const res = await client.post("/api/simulation/pause");
    return res.data;
  },

  resetSimulation: async (): Promise<{ status: string; depth: number }> => {
    const res = await client.post("/api/simulation/reset");
    return res.data;
  },

  setSimulationSpeed: async (speed: number): Promise<{ status: string; speed: number }> => {
    const res = await client.post("/api/simulation/speed", { speed });
    return res.data;
  },

  // AI Service
  queryAI: async (
    question: string,
    wellId: string = "OIL-X123",
    currentDepth?: number,
    formation?: string
  ): Promise<AIQueryResponse> => {
    const res = await client.post("/api/ai/query", {
      question,
      well_id: wellId,
      current_depth: currentDepth,
      formation,
    });
    return res.data;
  },

  askDocAI: async (
    question: string,
    docId?: number,
    wellId?: string
  ): Promise<AIQueryResponse> => {
    const res = await client.post("/api/ai/ask-doc", {
      question,
      doc_id: docId,
      well_id: wellId,
    });
    return res.data;
  },
};
