"""
Pydantic schemas for Risk Engine and Risk Zones.
"""
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class RiskZoneResponse(BaseModel):
    id: Optional[int] = None
    zone_name: Optional[str] = None
    event_type: Optional[str] = None
    risk_type: Optional[str] = None
    depth_start: float
    depth_end: float
    formation: Optional[str] = None
    severity: str = Field("LOW", description="LOW | MEDIUM | HIGH | CRITICAL")
    risk_score: Optional[float] = 0.0
    evidence_count: Optional[int] = 0
    source_well_ids: Optional[List[int]] = []
    source_wells: Optional[List[str]] = []
    distance_ahead: Optional[float] = None
    proximity_score: Optional[float] = None
    description: Optional[str] = None
    mitigation_recommendation: Optional[str] = None
    historical_event_count: Optional[int] = 0
    confidence_score: Optional[float] = 0.85
    explanation: Optional[str] = None
    status: Optional[str] = Field("INACTIVE", description="ACTIVE | APPROACHING | PASSED | INACTIVE | ENTERED | FAR")
    distance_to_bit: Optional[float] = None
    is_active: Optional[bool] = False
    is_approaching: Optional[bool] = False
    disclaimer: Optional[str] = None

    class Config:
        extra = "allow"


class OverallRiskResponse(BaseModel):
    level: Optional[str] = "LOW"
    score: Optional[float] = 0.0
    severity: Optional[str] = "LOW"
    highest_severity: Optional[str] = "LOW"
    message: Optional[str] = "Normal drilling operations"
    summary: Optional[str] = "Normal drilling operations"
    active_zones: Optional[Any] = 0
    active_zone_count: Optional[int] = 0
    approaching_count: Optional[int] = 0
    active_event_types: Optional[List[str]] = []
    active_zones_list: Optional[List[Any]] = Field(default=[], alias="active_zones_detail")
    approaching_zones: Optional[List[Any]] = []
    disclaimer: Optional[str] = None

    class Config:
        extra = "allow"
