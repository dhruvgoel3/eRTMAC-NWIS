"""
Pydantic schemas for Simulation control and telemetry state.
"""
from typing import Optional, List, Dict, Any, Literal
from pydantic import BaseModel, Field
from app.schemas.risk import RiskZoneResponse, OverallRiskResponse


class SimulationTelemetry(BaseModel):
    current_depth: float
    current_rop: float
    current_wob: float
    current_rpm: float
    current_torque: float
    current_pressure: float
    current_mud_flow: float
    current_standpipe_pressure: Optional[float] = None
    current_flow_rate: Optional[float] = None
    current_mud_weight: Optional[float] = None
    current_hook_load: float
    current_inclination: float
    current_azimuth: float


class SimulationStateResponse(BaseModel):
    id: Optional[int] = None
    well_id: Optional[int] = None
    active_well_id: Optional[int] = None
    active_well_name: Optional[str] = None
    is_running: bool
    speed_multiplier: int
    current_depth: float
    start_depth: Optional[float] = 3050.0
    target_depth: Optional[float] = 3850.0
    step_size_m: Optional[float] = 1.0
    current_rop: float
    current_wob: float
    current_rpm: float
    current_torque: float
    current_pressure: float
    current_mud_flow: float
    current_standpipe_pressure: Optional[float] = None
    current_flow_rate: Optional[float] = None
    current_mud_weight: Optional[float] = None
    current_hook_load: float
    current_inclination: float
    current_azimuth: float
    updated_at: Optional[str] = None
    risk_zones: Optional[List[RiskZoneResponse]] = None
    overall_risk: Optional[OverallRiskResponse] = None


class SimulationSpeedPayload(BaseModel):
    speed: Literal[1, 5, 10] = Field(..., description="Multiplier (1, 5, or 10)")

