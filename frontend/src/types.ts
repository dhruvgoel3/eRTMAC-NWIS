// TypeScript interfaces for eRTMAC-NWIS

export interface Well {
  id: number;
  well_id: string;
  name: string;
  latitude: number;
  longitude: number;
  field: string;
  formation: string;
  total_depth: number;
  well_type: string;
  trajectory_type: string;
  spud_date?: string;
  completion_date?: string;
  status: string;
  is_active: boolean;
  mud_weight: number;
  casing_program?: string;
  cementing_notes?: string;
  lessons_learned?: string;
  operator: string;
  distance_km?: number;
  event_count?: number;
  total_npt?: number;
  events?: WellEvent[];
}

export interface WellEvent {
  id: number;
  well_id?: string;
  well_name?: string;
  latitude?: number;
  longitude?: number;
  event_type: string;
  depth_start: number;
  depth_end: number;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  npt_hours: number;
  formation: string;
  description: string;
  root_cause: string;
  mitigation: string;
  confidence?: number;
  event_date?: string;
}

export interface RiskZone {
  id: number;
  formation: string;
  depth_start: number;
  depth_end: number;
  event_type?: string;
  risk_type?: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  probability?: number;
  risk_score?: number;
  description?: string;
  explanation?: string;
  recommended_action?: string;
  source_wells?: string[];
  source_well_ids?: number[];
  status?: "CURRENT" | "APPROACHING" | "UPCOMING" | "PASSED";
  distance_ahead?: number;
  distance_to_zone?: number;
}

export interface Alert {
  id: number;
  alert_type: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  depth: number;
  message: string;
  explanation: string;
  evidence?: {
    risk_type?: string;
    formation?: string;
    zone_start?: number;
    zone_end?: number;
    source_wells?: string[];
    recommended_action?: string;
  };
  acknowledged: boolean;
  created_at: string;
}

export interface SimulationState {
  active_well_id: number;
  active_well_name?: string;
  current_depth: number;
  is_running: boolean;
  speed_multiplier: number;
  start_depth: number;
  current_rop: number;
  current_wob: number;
  current_rpm: number;
  current_torque: number;
  current_pressure: number;
  current_mud_flow: number;
  current_hook_load: number;
  current_inclination: number;
  current_azimuth: number;
  updated_at?: string;
  risk_zones?: RiskZone[];
  overall_risk?: {
    level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    active_zone_count: number;
    approaching_count: number;
    highest_severity: string;
    summary: string;
  };
}

export interface SimilarWellResult {
  well_id: string;
  name: string;
  latitude: number;
  longitude: number;
  distance_km: number;
  formation: string;
  total_depth: number;
  trajectory_type: string;
  mud_weight: number;
  similarity_score: number;
  similarity_percent: number;
  score_breakdown: {
    formation_match: number;
    depth_proximity: number;
    trajectory_match: number;
    mud_weight_match: number;
    distance_proximity: number;
  };
  event_count: number;
  total_npt: number;
  events?: WellEvent[];
}

export interface DocumentItem {
  id: number;
  well_id?: string;
  well_name?: string;
  doc_type: string;
  title: string;
  file_name: string;
  summary: string;
  key_findings?: string;
  chunk_count?: number;
  created_at?: string;
}

export interface AICitation {
  source_doc: string;
  well_id: string;
  depth_range: string;
  text_snippet: string;
  relevance_score?: number;
}

export interface AIQueryResponse {
  answer: string;
  provider: string;
  model: string;
  citations: AICitation[];
  query_context?: {
    active_well: string;
    current_depth: number;
    formation: string;
  };
}

export interface DashboardData {
  active_well: {
    well_id: string;
    name: string;
    formation: string;
    total_depth: number;
    trajectory_type: string;
    latitude: number;
    longitude: number;
  };
  simulation: SimulationState;
  current_depth: number;
  kpis: {
    nearby_wells_count: number;
    historical_events_count: number;
    high_risk_zones_count: number;
    top_similarity_score: number;
    top_similar_well: string;
  };
  current_risk: {
    score: number;
    severity: string;
    message: string;
    active_zones: number;
    active_event_types: string[];
  };
  risk_zones: RiskZone[];
  recent_alerts?: Alert[];
  nearby_well_count?: number;
  nearby_wells?: Well[];
  top_similar_well?: SimilarWellResult;
  overall_risk?: {
    level: string;
    active_zone_count: number;
    approaching_count: number;
    highest_severity: string;
    summary: string;
  };
  high_risk_zone_count?: number;
  total_historical_events_nearby?: number;
}

// ─── Authentication & RBAC Types ─────────────────────────────────────────────
export type UserRoleName = "DRILLING_ENGINEER" | "DRILLING_SUPERVISOR" | "KNOWLEDGE_ADMIN";

export interface UserProfile {
  id: string;
  auth_user_id: string;
  employee_id?: string;
  full_name: string;
  email: string;
  department?: string;
  designation?: string;
  phone?: string;
  is_active: boolean;
  roles: UserRoleName[];
  active_role: UserRoleName;
  permissions: string[];
}

export interface AdminUserItem {
  id: string;
  auth_user_id: string;
  employee_id?: string;
  full_name: string;
  email: string;
  department?: string;
  designation?: string;
  phone?: string;
  is_active: boolean;
  roles: string[];
  active_role: string;
  created_at?: string;
  updated_at?: string;
}

export interface RoleItem {
  id: string;
  name: string;
  description?: string;
  user_count: number;
  permissions: {
    name: string;
    description?: string;
  }[];
}

export interface AuditLogItem {
  id: string;
  timestamp: string;
  user_id?: string;
  user_email: string;
  user_name: string;
  action: string;
  resource_type?: string;
  resource_id?: string;
  ip_address?: string;
  metadata?: Record<string, any>;
}

// ─── Drilling Memory Graph Types ──────────────────────────────────────────────
export type MemoryNodeType =
  | "ACTIVE_WELL"
  | "OFFSET_WELL_TOP"
  | "OFFSET_WELL"
  | "FORMATION"
  | "EVENT"
  | "DEPTH_INTERVAL"
  | "DOCUMENT";

export interface MemoryGraphNode {
  id: string;
  type: MemoryNodeType;
  label: string;
  sublabel?: string;
  description?: string;
  // Well-specific
  well_id?: string;
  formation?: string;
  total_depth?: number;
  trajectory_type?: string;
  latitude?: number;
  longitude?: number;
  status?: string;
  similarity_score?: number;
  distance_km?: number;
  score_breakdown?: Record<string, number>;
  // Event-specific
  event_type?: string;
  severity?: string;
  depth_start?: number;
  depth_end?: number;
  npt_hours?: number;
  root_cause?: string;
  mitigation?: string;
  event_date?: string;
  // Document-specific
  document_id?: string;
  document_type?: string;
  title?: string;
  date?: string;
  // Force graph runtime fields
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface MemoryGraphEdge {
  source: string | MemoryGraphNode;
  target: string | MemoryGraphNode;
  type: string;
  label?: string;
  weight?: number;
  depth?: number;
  severity?: string;
}

export interface MemoryGraphData {
  anchor_well: string;
  nodes: MemoryGraphNode[];
  edges: MemoryGraphEdge[];
  stats: {
    total_nodes: number;
    total_edges: number;
    type_counts: Record<string, number>;
    similar_wells_count: number;
  };
}
