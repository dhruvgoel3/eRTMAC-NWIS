"""
eRTMAC Simulation Engine
=========================
Simulates a depth-advancing drilling operation for the demo.
This is a PROTOTYPE SIMULATION — not connected to actual OIL eRTMAC systems.

The simulator:
- Advances depth by ROP/3600 meters per second (at 1x speed)
- Updates drilling parameters realistically as depth increases
- Triggers risk alerts at predefined demo scenario depths
- Supports 1x, 5x, 10x speed multipliers
"""
import asyncio
import math
import random
from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import SimulationState, Well
from app.services.risk_engine import generate_depth_alerts

# ─── Demo scenario trigger depths ────────────────────────────────────────────
DEMO_TRIGGERS = [
    {"depth": 3095, "type": "APPROACHING", "event": "MUD_LOSS"},
    {"depth": 3110, "type": "ENTERED",     "event": "MUD_LOSS"},
    {"depth": 3180, "type": "APPROACHING", "event": "STUCK_PIPE"},
    {"depth": 3210, "type": "ENTERED",     "event": "STUCK_PIPE"},
    {"depth": 3250, "type": "APPROACHING", "event": "TORQUE_SPIKE"},
]

# Track which triggers have fired (in-memory, reset on reset)
_fired_triggers = set()
_simulation_task: Optional[asyncio.Task] = None


def _get_realistic_params(depth: float, base_state: SimulationState) -> dict:
    """
    Generate realistic drilling parameters for a given depth.
    Parameters change smoothly with depth and react to known risk zones.
    """
    # Base values with small random walk
    rop = max(3.0, base_state.current_rop + random.gauss(0, 0.4))
    wob = max(8.0, base_state.current_wob + random.gauss(0, 0.2))
    rpm = max(60.0, base_state.current_rpm + random.gauss(0, 1.5))
    torque = max(10.0, base_state.current_torque + random.gauss(0, 0.3))
    pressure = max(2000.0, base_state.current_pressure + random.gauss(0, 15))
    mud_flow = max(1200.0, base_state.current_mud_flow + random.gauss(0, 10))
    hook_load = max(150.0, base_state.current_hook_load + random.gauss(0, 0.5))
    inclination = max(0.0, base_state.current_inclination + random.gauss(0, 0.05))
    azimuth = (base_state.current_azimuth + random.gauss(0, 0.1)) % 360

    # Simulate parameter changes near risk zones
    if 3100 <= depth <= 3160:
        # Mud loss zone — mud pressure drops, flow rate drops
        pressure -= random.uniform(5, 20)
        mud_flow -= random.uniform(10, 30)
        rop = max(3.0, rop - random.uniform(0.5, 2.0))  # ROP drops due to mud issues

    if 3180 <= depth <= 3300:
        # Stuck pipe zone — torque and drag increase
        torque += random.uniform(1.0, 4.0)
        wob += random.uniform(0.5, 2.0)
        hook_load += random.uniform(2.0, 8.0)
        rpm = max(60.0, rpm - random.uniform(5, 15))

    if 3250 <= depth <= 3320:
        # Torque spike zone
        torque += random.uniform(2.0, 5.0)

    return {
        "current_rop": round(rop, 1),
        "current_wob": round(wob, 1),
        "current_rpm": round(rpm, 0),
        "current_torque": round(torque, 1),
        "current_pressure": round(pressure, 0),
        "current_mud_flow": round(mud_flow, 0),
        "current_hook_load": round(hook_load, 1),
        "current_inclination": round(inclination, 2),
        "current_azimuth": round(azimuth, 1),
    }


async def _simulation_loop():
    """
    Background async loop that advances the simulation depth every second.
    Runs until is_running is set to False.
    """
    global _fired_triggers

    while True:
        db: Session = SessionLocal()
        try:
            state = db.query(SimulationState).filter(SimulationState.id == 1).first()
            if not state or not state.is_running:
                break

            # Advance depth: ROP (m/hr) / 3600 * tick_seconds * speed_multiplier
            tick_seconds = 1.0
            depth_increment = (state.current_rop / 3600.0) * tick_seconds * state.speed_multiplier
            new_depth = round(state.current_depth + depth_increment, 1)
            previous_depth = state.current_depth

            # Stop if well TD reached (default 3850m)
            if new_depth >= 3850.0:
                state.is_running = False
                db.commit()
                break

            # Update parameters
            new_params = _get_realistic_params(new_depth, state)

            state.current_depth = new_depth
            for k, v in new_params.items():
                setattr(state, k, v)
            state.updated_at = datetime.utcnow()

            # Check for new risk alerts
            active_well = db.query(Well).filter(Well.id == state.active_well_id).first()
            if active_well:
                generate_depth_alerts(db, active_well, new_depth, previous_depth)

            db.commit()

        except Exception as e:
            print(f"Simulation error: {e}")
        finally:
            db.close()

        await asyncio.sleep(1.0)


def start_simulation(db: Session) -> bool:
    """Start or resume the simulation."""
    global _simulation_task

    state = db.query(SimulationState).filter(SimulationState.id == 1).first()
    if not state:
        return False

    if state.current_depth >= 3840.0:
        return False  # At TD, need to reset first

    state.is_running = True
    db.commit()

    # Start background task if not already running
    if _simulation_task is None or _simulation_task.done():
        loop = asyncio.get_event_loop()
        _simulation_task = loop.create_task(_simulation_loop())

    return True


def pause_simulation(db: Session) -> bool:
    """Pause the simulation."""
    state = db.query(SimulationState).filter(SimulationState.id == 1).first()
    if not state:
        return False
    state.is_running = False
    db.commit()
    return True


def reset_simulation(db: Session) -> bool:
    """Reset the simulation to the starting state."""
    global _fired_triggers, _simulation_task

    state = db.query(SimulationState).filter(SimulationState.id == 1).first()
    if not state:
        return False

    state.is_running = False
    state.current_depth = state.start_depth
    state.current_rop = 12.4
    state.current_wob = 14.2
    state.current_rpm = 110.0
    state.current_torque = 18.2
    state.current_pressure = 2850.0
    state.current_mud_flow = 1620.0
    state.current_hook_load = 185.0
    state.current_inclination = 8.5
    state.current_azimuth = 142.0
    state.updated_at = datetime.utcnow()

    _fired_triggers = set()
    db.commit()
    return True


def set_speed(db: Session, speed: int) -> bool:
    """Set simulation speed multiplier (1, 5, or 10)."""
    if speed not in (1, 5, 10):
        return False
    state = db.query(SimulationState).filter(SimulationState.id == 1).first()
    if not state:
        return False
    state.speed_multiplier = speed
    db.commit()
    return True


def get_simulation_state(db: Session) -> Optional[dict]:
    """Get the current simulation state as a dict."""
    state = db.query(SimulationState).filter(SimulationState.id == 1).first()
    if not state:
        return None

    active_well = db.query(Well).filter(Well.id == state.active_well_id).first()

    return {
        "active_well_id": state.active_well_id,
        "active_well_name": active_well.well_id if active_well else None,
        "current_depth": state.current_depth,
        "is_running": state.is_running,
        "speed_multiplier": state.speed_multiplier,
        "start_depth": state.start_depth,
        "current_rop": state.current_rop,
        "current_wob": state.current_wob,
        "current_rpm": state.current_rpm,
        "current_torque": state.current_torque,
        "current_pressure": state.current_pressure,
        "current_mud_flow": state.current_mud_flow,
        "current_hook_load": state.current_hook_load,
        "current_inclination": state.current_inclination,
        "current_azimuth": state.current_azimuth,
        "updated_at": state.updated_at.isoformat() if state.updated_at else None,
    }
