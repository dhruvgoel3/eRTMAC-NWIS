"""
Pydantic schemas for Simulation control and telemetry state.
"""
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from app.schemas.risk import RiskZoneResponse, OverallRiskResponse


class SimulationTelemetry(BaseModel):
    current_depth: float
    current_rop: float
    current_wob: float
    current_rpm: float
    current_torque: float
    current_standpipe_pressure: float
    current_flow_rate: float
    current_mud_weight: float
    current_hook_load: float
    current_inclination: float
    current_azimuth: float


class SimulationStateResponse(BaseModel):
    id: Optional[int] = None
    well_id: Optional[int] = None
    is_running: bool
    speed_multiplier: int
    current_depth: float
    target_depth: float
    step_size_m: float
    current_rop: float
    current_wob: float
    current_rpm: float
    current_torque: float
    current_standpipe_pressure: float
    current_flow_rate: float
    current_mud_weight: float
    current_hook_load: float
    current_inclination: float
    current_azimuth: float
    updated_at: Optional[str] = None
    risk_zones: Optional[List[RiskZoneResponse]] = None
    overall_risk: Optional[OverallRiskResponse] = None


class SimulationSpeedPayload(BaseModel):
    speed: int = Field(..., ge=1, le=100, description="Multiplier (e.g. 1, 5, 10, 20)")
