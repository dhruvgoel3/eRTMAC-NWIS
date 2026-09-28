"""
Simulation API Router
Controls virtual real-time drilling playback, telemetry advancement, speed, and reset.
"""
from fastapi import APIRouter, Depends, HTTPException, Body
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Well, SimulationState
from app.services.risk_engine import get_risk_zones_for_depth, calculate_overall_risk, generate_depth_alerts

from app.services.simulator import (
    start_simulation,
    pause_simulation,
    reset_simulation,
    set_speed,
    get_simulation_state,
)
from app.auth.dependencies import require_permission, require_role, AuthenticatedUser
from app.services.audit_service import log_audit_event
from app.schemas.simulation import SimulationStateResponse, SimulationSpeedPayload

router = APIRouter(prefix="/api/simulation", tags=["simulation"])


@router.get("/state", response_model=SimulationStateResponse)
def sim_state(
    user: AuthenticatedUser = Depends(require_permission("simulation.view")),
    db: Session = Depends(get_db),
):
    """Retrieve current drilling telemetry simulation state and active hazard window."""
    state = get_simulation_state(db)
    if not state:
        raise HTTPException(status_code=404, detail="Simulation state not initialized")

    well = db.query(Well).filter(Well.is_active == True).first()
    risk_zones = []
    overall_risk = {}
    if well:
        risk_zones = get_risk_zones_for_depth(db, well.id, state["current_depth"])
        overall_risk = calculate_overall_risk(risk_zones, state["current_depth"])

    state["risk_zones"] = risk_zones
    state["overall_risk"] = overall_risk
    return state


@router.get("/stream", response_model=SimulationStateResponse)
def sim_stream(
    user: AuthenticatedUser = Depends(require_permission("simulation.view")),
    db: Session = Depends(get_db),
):
    """Real-time drilling telemetry stream for active well."""
    return sim_state(user=user, db=db)


@router.post("/start")
def sim_start(
    user: AuthenticatedUser = Depends(require_role("DRILLING_ENGINEER")),
    db: Session = Depends(get_db),
):
    """Start drilling advancement simulation."""
    ok = start_simulation(db)
    log_audit_event(db=db, action="SIMULATION_STARTED", user_id=user.id, resource_type="SIMULATION")
    return {"status": "started" if ok else "already_at_td"}


@router.post("/pause")
def sim_pause(
    user: AuthenticatedUser = Depends(require_role("DRILLING_ENGINEER")),
    db: Session = Depends(get_db),
):
    """Pause drilling advancement simulation."""
    pause_simulation(db)
    log_audit_event(db=db, action="SIMULATION_PAUSED", user_id=user.id, resource_type="SIMULATION")
    return {"status": "paused"}


@router.post("/reset")
def sim_reset(
    user: AuthenticatedUser = Depends(require_role("DRILLING_ENGINEER")),
    db: Session = Depends(get_db),
):
    """Reset simulation bit depth to initial depth (3050m)."""
    reset_simulation(db)
    log_audit_event(db=db, action="SIMULATION_RESET", user_id=user.id, resource_type="SIMULATION")
    return {"status": "reset", "depth": 3050.0}


@router.post("/speed")
def sim_speed(
    payload: SimulationSpeedPayload,
    user: AuthenticatedUser = Depends(require_role("DRILLING_ENGINEER")),
    db: Session = Depends(get_db),
):
    """Set simulation speed multiplier (e.g. 1x, 5x, 10x)."""
    ok = set_speed(db, payload.speed)
    return {"status": "ok" if ok else "invalid_speed", "speed": payload.speed}


class SetDepthPayload(BaseModel):
    depth: float = Field(..., description="Target bit depth in meters")


@router.post("/set-depth")
def sim_set_depth(
    payload: SetDepthPayload,
    user: AuthenticatedUser = Depends(require_role("DRILLING_ENGINEER")),
    db: Session = Depends(get_db),
):
    """Explicitly set simulation bit depth and evaluate risk zone proximity alerts."""
    state = db.query(SimulationState).filter(SimulationState.id == 1).first()
    if not state:
        raise HTTPException(status_code=404, detail="Simulation state not found")
    prev_depth = state.current_depth
    state.current_depth = payload.depth
    db.commit()
    active_well = db.query(Well).filter(Well.id == state.active_well_id).first()
    if active_well:
        generate_depth_alerts(db, active_well, payload.depth, prev_depth)
    return {"status": "ok", "current_depth": state.current_depth}

