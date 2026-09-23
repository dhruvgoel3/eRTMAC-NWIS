"""
Pydantic schemas for Well Historical Events.
"""
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict


class WellEventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    well_id: Optional[str] = None
    well_name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    event_type: str
    depth_start: float
    depth_end: float
    severity: str = Field(..., description="LOW | MEDIUM | HIGH | CRITICAL")
    npt_hours: float = 0.0
    formation: Optional[str] = None
    description: Optional[str] = None
    root_cause: Optional[str] = None
    mitigation: Optional[str] = None
    confidence: Optional[float] = 0.85
    event_date: Optional[str] = None


class EventFilterParams(BaseModel):
    event_type: Optional[str] = None
    severity: Optional[str] = None
    formation: Optional[str] = None
    depth_min: Optional[float] = None
    depth_max: Optional[float] = None
    limit: int = 100
