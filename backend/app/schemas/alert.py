"""
Pydantic schemas for Alerts and Notifications.
"""
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict


class AlertResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    well_id: Optional[str] = None
    alert_type: str
    severity: str = Field(..., description="INFO | WARNING | HIGH | CRITICAL")
    depth: float
    message: str
    explanation: Optional[str] = None
    evidence: Optional[Dict[str, Any]] = None
    acknowledged: bool = False
    created_at: str


class AlertAcknowledgeResponse(BaseModel):
    status: str = "acknowledged"
    id: int


class AlertEscalateResponse(BaseModel):
    status: str = "escalated"
    id: int
    message: str
