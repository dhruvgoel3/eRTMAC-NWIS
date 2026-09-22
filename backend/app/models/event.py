"""
SQLAlchemy model for Well Events (historical drilling incidents).
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class WellEvent(Base):
    __tablename__ = "well_events"

    id = Column(Integer, primary_key=True, index=True)
    well_id = Column(Integer, ForeignKey("wells.id"), nullable=False, index=True)

    # Event classification
    event_type = Column(String(50), nullable=False, index=True)
    # MUD_LOSS, STUCK_PIPE, KICK, TORQUE_SPIKE, OVERPRESSURE,
    # CEMENTING_ISSUE, FISHING, NPT, OTHER

    severity = Column(String(20), nullable=False)  # LOW, MEDIUM, HIGH, CRITICAL

    # Depth interval where event occurred
    depth_start = Column(Float, nullable=False)
    depth_end = Column(Float)
    formation = Column(String(100))

    # Detailed information
    description = Column(Text)
    root_cause = Column(Text)
    mitigation = Column(Text)
    npt_hours = Column(Float, default=0)     # Non-productive time in hours
    confidence = Column(Float, default=0.9)  # 0.0 - 1.0 confidence in this event record

    # Date and source
    event_date = Column(DateTime)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    well = relationship("Well", back_populates="events")
    document = relationship("Document", back_populates="events")
