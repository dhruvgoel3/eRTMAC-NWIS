"""
Pydantic schemas for Risk Engine and Risk Zones.
"""
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class RiskZoneResponse(BaseModel):
    id: Optional[int] = None
    zone_name: Optional[str] = None
    risk_type: Optional[str] = None
    event_type: Optional[str] = None
    depth_start: float
    depth_end: float
    formation: Optional[str] = None
    severity: str = Field(..., description="LOW | MEDIUM | HIGH | CRITICAL")
    risk_score: Optional[float] = None
    evidence_count: Optional[int] = None
    description: Optional[str] = None
    mitigation_recommendation: Optional[str] = None
    recommended_action: Optional[str] = None
    historical_event_count: int = 0
    confidence_score: float = 0.85
    explanation: Optional[str] = None
    source_well_ids: Optional[List[int]] = None
    source_wells: Optional[List[str]] = None
    status: Optional[str] = Field("INACTIVE", description="ACTIVE | APPROACHING | ENTERED | PAST | INACTIVE")
    distance_ahead: Optional[float] = None
    distance_to_bit: Optional[float] = None
    proximity_score: Optional[float] = None
    is_active: bool = False
    is_approaching: bool = False
    disclaimer: Optional[str] = None


class OverallRiskResponse(BaseModel):
    score: Optional[float] = None
    severity: Optional[str] = "LOW"
    message: Optional[str] = "Normal drilling operations"
    active_zones: Optional[Any] = 0
    active_event_types: Optional[List[str]] = None
    level: Optional[str] = None
    highest_severity: Optional[str] = "LOW"
    active_zone_count: Optional[int] = 0
    approaching_count: Optional[int] = 0
    approaching_zones: Optional[List[RiskZoneResponse]] = None
    summary: Optional[str] = None
    disclaimer: Optional[str] = None

