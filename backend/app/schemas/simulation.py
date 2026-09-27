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
    active_well_id: Optional[int] = None
    active_well_name: Optional[str] = None
    is_running: bool = False
    speed_multiplier: int = 1
    current_depth: float = 3050.0
    start_depth: Optional[float] = 3050.0
    target_depth: Optional[float] = 3800.0
    step_size_m: Optional[float] = 1.0
    current_rop: float = 12.4
    current_wob: float = 14.2
    current_rpm: float = 110.0
    current_torque: float = 18.2
    current_pressure: Optional[float] = 2850.0
    current_standpipe_pressure: Optional[float] = 2850.0
    current_mud_flow: Optional[float] = 1620.0
    current_flow_rate: Optional[float] = 1620.0
    current_mud_weight: Optional[float] = 10.8
    current_hook_load: float = 185.0
    current_inclination: float = 8.5
    current_azimuth: float = 142.0
    updated_at: Optional[str] = None
    risk_zones: Optional[List[RiskZoneResponse]] = None
    overall_risk: Optional[OverallRiskResponse] = None

    class Config:
        extra = "allow"


class SimulationSpeedPayload(BaseModel):
    speed: int = Field(..., ge=1, le=100, description="Multiplier (e.g. 1, 5, 10, 20)")
