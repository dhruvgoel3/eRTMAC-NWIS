"""
SQLAlchemy model for Risk Zones and Alerts.
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Boolean, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class RiskZone(Base):
    """
    A depth interval with historical risk, derived from multiple well events.
    """
    __tablename__ = "risk_zones"

    id = Column(Integer, primary_key=True, index=True)
    # The active well this risk zone is computed for
    active_well_id = Column(Integer, ForeignKey("wells.id"), nullable=False, index=True)

    event_type = Column(String(50))
    depth_start = Column(Float)
    depth_end = Column(Float)
    formation = Column(String(100))
    risk_score = Column(Float)        # 0-100
    severity = Column(String(20))     # LOW, MEDIUM, HIGH, CRITICAL
    evidence_count = Column(Integer)  # Number of historical events supporting this zone
    explanation = Column(Text)
    source_well_ids = Column(JSON)    # List of well IDs with events in this zone
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationship
    well = relationship("Well", back_populates="risk_zones", foreign_keys=[active_well_id])


class Alert(Base):
    """
    Real-time style alerts generated as the simulation depth progresses.
    """
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    well_id = Column(Integer, ForeignKey("wells.id"), nullable=False, index=True)

    alert_type = Column(String(50))   # RISK_APPROACHING, RISK_ENTERED, SIMILARITY_HIGH, etc.
    severity = Column(String(20))
    depth = Column(Float)
    message = Column(Text)
    explanation = Column(Text)
    evidence = Column(JSON)           # List of historical evidence items
    acknowledged = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationship
    well = relationship("Well", back_populates="alerts")


class DrillingParameter(Base):
    """
    Drilling parameters at a specific depth/timestamp (historical or simulated).
    """
    __tablename__ = "drilling_parameters"

    id = Column(Integer, primary_key=True, index=True)
    well_id = Column(Integer, ForeignKey("wells.id"), nullable=False, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    depth = Column(Float)
    rop = Column(Float)           # Rate of penetration (m/hr)
    wob = Column(Float)           # Weight on bit (tonnes)
    rpm = Column(Float)           # Rotary speed
    torque = Column(Float)        # kNm
    pressure = Column(Float)      # psi
    mud_flow = Column(Float)      # lpm
    hook_load = Column(Float)     # tonnes
    inclination = Column(Float)   # degrees
    azimuth = Column(Float)       # degrees
    mud_weight = Column(Float)    # ppg

    # Relationship
    well = relationship("Well", back_populates="parameters")


class SimulationState(Base):
    """
    Stores the current state of the eRTMAC simulation.
    Only one row (id=1) is used.
    """
    __tablename__ = "simulation_state"

    id = Column(Integer, primary_key=True, default=1)
    active_well_id = Column(Integer, ForeignKey("wells.id"))
    current_depth = Column(Float, default=3050.0)
    is_running = Column(Boolean, default=False)
    speed_multiplier = Column(Integer, default=1)   # 1x, 5x, 10x
    start_depth = Column(Float, default=3050.0)
    current_rop = Column(Float, default=12.4)
    current_wob = Column(Float, default=14.2)
    current_rpm = Column(Float, default=110.0)
    current_torque = Column(Float, default=18.2)
    current_pressure = Column(Float, default=2850.0)
    current_mud_flow = Column(Float, default=1620.0)
    current_hook_load = Column(Float, default=185.0)
    current_inclination = Column(Float, default=8.5)
    current_azimuth = Column(Float, default=142.0)
    updated_at = Column(DateTime, default=datetime.utcnow)
