"""
SQLAlchemy model for Wells.
Each well represents a historical or active drilling location.
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, Enum, Boolean, Text
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.database import Base


class WellStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"
    SUSPENDED = "SUSPENDED"
    ABANDONED = "ABANDONED"


class TrajectoryType(str, enum.Enum):
    VERTICAL = "VERTICAL"
    DIRECTIONAL = "DIRECTIONAL"
    HORIZONTAL = "HORIZONTAL"


class Well(Base):
    __tablename__ = "wells"

    id = Column(Integer, primary_key=True, index=True)
    well_id = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    field = Column(String(100))
    formation = Column(String(100))
    total_depth = Column(Float)           # meters
    well_type = Column(String(50))        # Exploratory, Development, etc.
    trajectory_type = Column(String(50))  # VERTICAL, DIRECTIONAL, HORIZONTAL
    spud_date = Column(DateTime)
    completion_date = Column(DateTime)
    status = Column(String(50), default="COMPLETED")
    is_active = Column(Boolean, default=False)  # True for the current drilling well
    mud_weight = Column(Float)            # ppg
    casing_program = Column(Text)
    cementing_notes = Column(Text)
    lessons_learned = Column(Text)
    operator = Column(String(100), default="Oil India Limited")
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    events = relationship("WellEvent", back_populates="well")
    parameters = relationship("DrillingParameter", back_populates="well")
    documents = relationship("Document", back_populates="well")
    risk_zones = relationship("RiskZone", back_populates="well")
    alerts = relationship("Alert", back_populates="well")
