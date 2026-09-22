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
  nearby_well_count: number;
  nearby_wells: Well[];
  top_similar_well?: SimilarWellResult;
  risk_zones: RiskZone[];
  overall_risk: {
    level: string;
    active_zone_count: number;
    approaching_count: number;
    highest_severity: string;
    summary: string;
  };
  recent_alerts: Alert[];
  high_risk_zone_count: number;
  total_historical_events_nearby: number;
}
