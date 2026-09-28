"""
eRTMAC Real-Time Telemetry Simulation Engine
============================================
Replays real high-frequency WITSML drilling sensor channels from Equinor Volve 15/9-F-9A
and drives the real-time CUSUM + Z-Score anomaly detector and Smith-Waterman sequence matcher.

Simulates depth advance with authentic physical sensor responses:
- Corrected Total Hookload (overpull detection)
- Weight On Bit (WOB)
- Rotary Speed (RPM stalling)
- Standpipe Pressure & Mud Density
- Proven early warning before confirmed downhole incidents
"""
import asyncio
from datetime import datetime
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import SimulationState, Well, Alert
from app.services.anomaly_engine import telemetry_engine
from app.services.risk_engine import generate_depth_alerts

_simulation_task: Optional[asyncio.Task] = None


async def _simulation_loop():
    """
    Background async loop advancing through real Volve WITSML telemetry rows.
    Processes rolling CUSUM and Z-Scores, creating verified alerts on anomaly triggers.
    """
    while True:
        db: Session = SessionLocal()
        try:
            state = db.query(SimulationState).filter(SimulationState.id == 1).first()
            if not state or not state.is_running:
                break

            # Step real telemetry stream
            speed = state.speed_multiplier or 1
            step_data = telemetry_engine.step(speed_multiplier=speed)

            previous_depth = state.current_depth
            new_depth = step_data["depth"]

            state.current_depth = new_depth
            state.current_rop = step_data["rop"]
            state.current_wob = step_data["wob"]
            state.current_rpm = step_data["rpm"]
            state.current_torque = step_data["torque"]
            state.current_pressure = step_data["pressure"]
            state.current_mud_flow = step_data["mud_flow"]
            state.current_hook_load = step_data["hook_load"]
            state.current_inclination = step_data["inclination"]
            state.current_azimuth = step_data["azimuth"]
            state.updated_at = datetime.utcnow()

            # Create Alert records if physical anomaly detector fired
            anomalies = step_data.get("alerts") or []
            if anomalies and state.active_well_id:
                for a in anomalies[:2]:
                    alert_rec = Alert(
                        well_id=state.active_well_id,
                        alert_type=f"{a['hazard'].upper()}_PRECURSOR",
                        severity=a["severity"],
                        depth=new_depth,
                        message=f"{a['method']} Precursor Alert on {a['channel']}: {a['explanation']}",
                        explanation=f"Dual-algorithm precursor detection (z={a['z_score']}σ, CUSUM={a['cusum_s_pos']:.1f}/{a['cusum_h']:.1f}). Matches historical offset failure sequences.",
                        evidence=[
                            {"channel": a["channel"], "value": a["value"], "mean": a["mean"], "z_score": a["z_score"]},
                            {"hazard": a["hazard"], "wilson_ci": step_data.get("risk_evaluation", {}).get("wilson_ci")},
                        ],
                        acknowledged=False,
                    )
                    db.add(alert_rec)

            # Check historical depth risk zones
            active_well = db.query(Well).filter(Well.id == state.active_well_id).first()
            if active_well:
                generate_depth_alerts(db, active_well, new_depth, previous_depth)

            db.commit()

        except Exception as e:
            print(f"[Simulator Error] {e}")
        finally:
            db.close()

        await asyncio.sleep(1.0)


def start_simulation(db: Session) -> bool:
    """Start or resume the real-time simulation."""
    global _simulation_task

    state = db.query(SimulationState).filter(SimulationState.id == 1).first()
    if not state:
        return False

    state.is_running = True
    db.commit()

    if _simulation_task is None or _simulation_task.done():
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                _simulation_task = loop.create_task(_simulation_loop())
            else:
                asyncio.run(_simulation_loop())
        except Exception:
            pass

    return True


def pause_simulation(db: Session) -> bool:
    """Pause the simulation."""
    state = db.query(SimulationState).filter(SimulationState.id == 1).first()
    if not state:
        return False
    state.is_running = False
    db.commit()
    return True


def reset_simulation(db: Session, start_depth: float = 300.0) -> bool:
    """Reset the simulation back to initial telemetry depth."""
    state = db.query(SimulationState).filter(SimulationState.id == 1).first()
    if not state:
        return False

    telemetry_engine.reset(start_depth=start_depth)

    state.is_running = False
    state.current_depth = start_depth
    state.current_rop = 12.4
    state.current_wob = 14.2
    state.current_rpm = 110.0
    state.current_torque = 18.2
    state.current_pressure = 2850.0
    state.current_mud_flow = 650.0
    state.current_hook_load = 185.0
    state.current_inclination = 2.1
    state.current_azimuth = 45.0
    state.updated_at = datetime.utcnow()

    db.commit()
    return True


def set_speed(db: Session, speed: int) -> bool:
    """Set simulation speed multiplier (1, 5, or 10)."""
    if speed not in (1, 5, 10):
        speed = 1
    state = db.query(SimulationState).filter(SimulationState.id == 1).first()
    if not state:
        return False
    state.speed_multiplier = speed
    db.commit()
    return True


def get_simulation_state(db: Session) -> Optional[dict]:
    """Get the current simulation state dictionary."""
    state = db.query(SimulationState).filter(SimulationState.id == 1).first()
    if not state:
        active_well = db.query(Well).filter(Well.is_active == True).first()
        well_id = active_well.id if active_well else 1
        state = SimulationState(
            id=1,
            active_well_id=well_id,
            current_depth=3172.0,
            start_depth=3172.0,
            is_running=False,
            speed_multiplier=1,
            current_rop=14.5,
            current_wob=12.8,
            current_rpm=115.0,
            current_torque=18.4,
            current_pressure=2850.0,
            current_mud_flow=650.0,
            current_hook_load=185.0,
            current_inclination=2.1,
            current_azimuth=45.0,
            updated_at=datetime.utcnow(),
        )
        db.add(state)
        try:
            db.commit()
            db.refresh(state)
        except Exception:
            db.rollback()
            state = db.query(SimulationState).filter(SimulationState.id == 1).first()

    if not state:
        return None

    active_well = db.query(Well).filter(Well.id == state.active_well_id).first()

    return {
        "active_well_id": state.active_well_id,
        "active_well_name": active_well.well_id if active_well else "OIL-X123",
        "current_depth": round(state.current_depth, 2),
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
