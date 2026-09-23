"""
Pydantic schemas for the NWIS Drilling Memory Graph.
"""
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class MemoryGraphNodeModel(BaseModel):
    id: str
    type: str = Field(..., description="ACTIVE_WELL | TOP_OFFSET_WELL | OFFSET_WELL | FORMATION | HISTORICAL_EVENT | DOCUMENT | DEPTH_INTERVAL")
    label: str
    sublabel: Optional[str] = None
    description: Optional[str] = None
    well_id: Optional[str] = None
    formation: Optional[str] = None
    total_depth: Optional[float] = None
    trajectory_type: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    status: Optional[str] = None
    similarity_score: Optional[float] = None
    distance_km: Optional[float] = None
    score_breakdown: Optional[Dict[str, float]] = None
    event_type: Optional[str] = None
    severity: Optional[str] = None
    depth_start: Optional[float] = None
    depth_end: Optional[float] = None
    npt_hours: Optional[float] = None
    root_cause: Optional[str] = None
    mitigation: Optional[str] = None
    event_date: Optional[str] = None
    document_id: Optional[str] = None
    document_type: Optional[str] = None
    title: Optional[str] = None
    date: Optional[str] = None


class MemoryGraphEdgeModel(BaseModel):
    source: str
    target: str
    label: str
    relationship: str
    weight: Optional[float] = 1.0


class MemoryGraphStats(BaseModel):
    total_nodes: int
    total_edges: int
    wells_count: int
    events_count: int
    formations_count: int
    documents_count: int


class MemoryGraphResponse(BaseModel):
    anchor_well_id: str
    nodes: List[MemoryGraphNodeModel]
    edges: List[MemoryGraphEdgeModel]
    stats: MemoryGraphStats
