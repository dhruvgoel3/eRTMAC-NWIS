"""
Pydantic schemas for AI Assistant ("Ask NWIS") and Knowledge Retrieval.
"""
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class AIQueryRequest(BaseModel):
    question: str = Field(..., min_length=2, description="Drilling question or query for the AI")
    current_depth: Optional[float] = None
    formation: Optional[str] = None
    well_id: Optional[str] = "OIL-X123"


class AIDocQueryRequest(BaseModel):
    question: str = Field(..., min_length=2, description="Query regarding document content")
    doc_id: Optional[int] = None
    well_id: Optional[str] = None



class AICitationModel(BaseModel):
    document_id: str
    title: str
    document_type: str
    well_id: Optional[str] = None
    depth_interval: Optional[str] = None
    relevance_score: Optional[float] = 0.90
    snippet: Optional[str] = None


class AIQueryResponse(BaseModel):
    summary: str = Field(..., description="Direct synthesized summary answering the query")
    historical_evidence: List[Dict[str, Any]] = Field(default_factory=list, description="Structured historical evidence citations")
    similar_wells: List[str] = Field(default_factory=list, description="Relevant similar offset wells")
    risk_interpretation: str = Field(default="", description="Operational risk interpretation")
    sources: List[str] = Field(default_factory=list, description="Ground truth document IDs (e.g. DDR-X104, WCR-X109)")
    answer: str = Field(..., description="Full pre-formatted text answer with all 5 sections")
    query: Optional[str] = None
    citations: List[AICitationModel] = Field(default_factory=list)
    confidence: float = 0.92
    source_wells: List[str] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)
    disclaimer: str = (
        "Advisory Notice: Historical patterns indicate heightened susceptibility based on offset well data, "
        "but do not guarantee downhole conditions. Real-time telemetry monitoring is required."
    )
    provider: Optional[str] = "Ask NWIS"


class AIHealthResponse(BaseModel):
    status: str
    provider: str
    model: str
