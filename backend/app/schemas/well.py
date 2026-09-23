"""
Pydantic schemas for Well models and queries.
"""
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict


class WellBase(BaseModel):
    well_id: str
    name: str
    latitude: float
    longitude: float
    formation: Optional[str] = None
    total_depth: float
    trajectory_type: Optional[str] = "Vertical"
    field: Optional[str] = None
    status: Optional[str] = "COMPLETED"
    is_active: bool = False
    mud_weight: Optional[float] = None
    operator: Optional[str] = "Oil India Limited (OIL)"
    source_dataset: Optional[str] = "OIL_SYNTHETIC"
    license: Optional[str] = "Proprietary / Synthetic"
    country: Optional[str] = "India"
    basin: Optional[str] = "Assam-Arakan"


class WellResponse(WellBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    spud_date: Optional[str] = None
    completion_date: Optional[str] = None
    casing_program: Optional[str] = None
    cementing_notes: Optional[str] = None
    lessons_learned: Optional[str] = None
    x_coord: Optional[float] = None
    y_coord: Optional[float] = None
    lithology: Optional[str] = None
    distance_km: Optional[float] = None


class NearbyWellResponse(WellResponse):
    distance_km: float
    event_count: int = 0
    high_risk_count: int = 0
    similarity_score: Optional[float] = None


class ActiveWellSummary(BaseModel):
    well_id: str
    name: str
    formation: Optional[str] = None
    total_depth: float
    trajectory_type: Optional[str] = None
    latitude: float
    longitude: float
