"""
Pydantic schemas for the Master Dashboard Overview endpoint.
"""
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from app.schemas.well import ActiveWellSummary
from app.schemas.risk import OverallRiskResponse, RiskZoneResponse
from app.schemas.alert import AlertResponse
from app.schemas.simulation import SimulationStateResponse


class DashboardKPIs(BaseModel):
    nearby_wells_count: int
    historical_events_count: int
    high_risk_zones_count: int
    top_similarity_score: float
    top_similar_well: Optional[str] = None


class SimilarWellSummary(BaseModel):
    well_id: str
    formation: Optional[str] = None
    distance_km: float
    similarity_score: float
    factors: Dict[str, float]


class DashboardResponse(BaseModel):
    active_well: ActiveWellSummary
    simulation: Optional[SimulationStateResponse] = None
    current_depth: float
    kpis: DashboardKPIs
    current_risk: OverallRiskResponse
    risk_zones: List[RiskZoneResponse]
    similar_wells: List[SimilarWellSummary]
    recent_alerts: List[Dict[str, Any]]
