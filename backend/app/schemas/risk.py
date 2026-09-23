"""
Pydantic schemas for Risk Engine and Risk Zones.
"""
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class RiskZoneResponse(BaseModel):
    id: Optional[int] = None
    zone_name: str
    risk_type: str
    depth_start: float
    depth_end: float
    formation: Optional[str] = None
    severity: str = Field(..., description="LOW | MEDIUM | HIGH | CRITICAL")
    description: Optional[str] = None
    mitigation_recommendation: Optional[str] = None
    historical_event_count: int = 0
    confidence_score: float = 0.85
    explanation: Optional[str] = None
    status: Optional[str] = Field("INACTIVE", description="ACTIVE | APPROACHING | PASSED | INACTIVE")
    distance_to_bit: Optional[float] = None
    is_active: bool = False
    is_approaching: bool = False
    disclaimer: Optional[str] = None


class OverallRiskResponse(BaseModel):
    level: str = Field("LOW", description="LOW | MEDIUM | HIGH | CRITICAL")
    highest_severity: str = "LOW"
    active_zone_count: int = 0
    approaching_count: int = 0
    active_zones: List[RiskZoneResponse] = []
    approaching_zones: List[RiskZoneResponse] = []
    summary: str = "Normal drilling operations"
    disclaimer: Optional[str] = None
