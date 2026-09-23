"""
Pydantic schemas for Offset Well Similarity Engine.
"""
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from app.schemas.well import WellResponse


class SimilarityFactors(BaseModel):
    distance: float = Field(..., description="Geographic proximity score (0-100)")
    formation: float = Field(..., description="Lithological/formation match score (0-100)")
    depth: float = Field(..., description="Vertical depth proximity score (0-100)")
    trajectory: float = Field(..., description="Wellbore profile match score (0-100)")
    parameters: float = Field(..., description="Drilling parameters/mud weight match score (0-100)")


class FactorExplanations(BaseModel):
    distance: Optional[str] = None
    formation: Optional[str] = None
    depth: Optional[str] = None
    trajectory: Optional[str] = None
    parameters: Optional[str] = None


class SimilarWellResponse(BaseModel):
    well_id: str
    well: Optional[WellResponse] = None
    formation: Optional[str] = None
    distance_km: float
    similarity_score: float = Field(..., description="Deterministic similarity score (0-100)")
    factors: SimilarityFactors
    factor_explanations: Optional[Dict[str, str]] = None
    event_count: int = 0
    high_risk_event_count: int = 0
