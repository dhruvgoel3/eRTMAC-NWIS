import axios from "axios";
import { supabase } from "../lib/supabase";
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
  UserProfile,
  AdminUserItem,
  RoleItem,
  AuditLogItem,
} from "../types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

// Attach Supabase JWT Bearer token to all outgoing backend API requests
client.interceptors.request.use(async (config) => {
  try {
    const { data } = await supabase.auth.getSession();
    if (data?.session?.access_token) {
      config.headers.Authorization = `Bearer ${data.session.access_token}`;
    }
  } catch (err) {
    console.warn("[API Auth] Failed to retrieve session token:", err);
  }
  return config;
});

// Global 401 / 403 Response Interceptor
client.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Attempt token refresh
      try {
        const { data, error: refreshError } = await supabase.auth.refreshSession();
        if (data?.session?.access_token && error.config) {
          error.config.headers.Authorization = `Bearer ${data.session.access_token}`;
          return client.request(error.config);
        }
      } catch (e) {
        // Refresh failed
      }
      // Redirect to login if on protected page
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);


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

  // Auth Context
  registerUser: async (payload: {
    email: string;
    password?: string;
    full_name: string;
    employee_id?: string;
    department?: string;
    designation?: string;
    role?: string;
    auth_user_id?: string;
  }): Promise<any> => {
    const res = await client.post("/api/auth/register", payload);
    return res.data;
  },

  getMe: async (): Promise<UserProfile> => {
    const res = await client.get("/api/auth/me");
    return res.data.data;
  },


  getPermissions: async (): Promise<{ user_permissions: string[]; all_permissions: any[] }> => {
    const res = await client.get("/api/auth/permissions");
    return res.data.data;
  },

  recordAudit: async (action: string, metadata?: Record<string, any>): Promise<void> => {
    try {
      await client.post("/api/auth/audit", { action, metadata });
    } catch (e) {
      // Non-blocking
    }
  },

  // Admin Management
  getAdminUsers: async (): Promise<AdminUserItem[]> => {
    const res = await client.get("/api/admin/users");
    return res.data.data;
  },

  createAdminUser: async (payload: {
    email: string;
    password: string;
    full_name: string;
    employee_id?: string;
    department?: string;
    designation?: string;
    role: string;
  }): Promise<any> => {
    const res = await client.post("/api/admin/users", payload);
    return res.data.data;
  },

  updateAdminUser: async (
    userId: string,
    payload: {
      is_active?: boolean;
      role?: string;
      department?: string;
      designation?: string;
      full_name?: string;
    }
  ): Promise<any> => {
    const res = await client.patch(`/api/admin/users/${userId}`, payload);
    return res.data.data;
  },

  disableAdminUser: async (userId: string): Promise<any> => {
    return api.updateAdminUser(userId, { is_active: false });
  },

  enableAdminUser: async (userId: string): Promise<any> => {
    return api.updateAdminUser(userId, { is_active: true });
  },

  assignUserRole: async (userId: string, role: string): Promise<any> => {
    return api.updateAdminUser(userId, { role });
  },

  getAdminRoles: async (): Promise<RoleItem[]> => {
    const res = await client.get("/api/admin/roles");
    return res.data.data;
  },

  getAdminPermissions: async (): Promise<any[]> => {
    const res = await client.get("/api/auth/permissions");
    return res.data.data?.all_permissions || [];
  },

  getAuditLogs: async (limit: number = 50, action?: string): Promise<AuditLogItem[]> => {
    const res = await client.get("/api/admin/audit-logs", {
      params: { limit, action },
    });
    return res.data.data;
  },

  // Drilling Memory Graph
  getMemoryGraph: async (
    wellId: string = "OIL-X123",
    radiusKm: number = 50,
    topN: number = 8
  ): Promise<import("../types").MemoryGraphData> => {
    const res = await client.get(`/api/memory-graph/${wellId}`, {
      params: { radius_km: radiusKm, top_n: topN },
    });
    return res.data;
  },
};

