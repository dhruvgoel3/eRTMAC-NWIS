"""
SQLAlchemy model for Geological Formations.
Represents the 10 canonical formations in the Assam-Arakan Basin used by NWIS.

[Synthetic Demo Data — Not Real OIL Data]
"""
from sqlalchemy import Column, Integer, String, Float, Text, JSON
from app.database import Base


class Formation(Base):
    """
    Geological formation definition used by wells and events.
    10 canonical formations from the Assam-Arakan Basin stratigraphy.
    """
    __tablename__ = "formations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False, index=True)

    # Depth range where this formation is typically encountered
    depth_min = Column(Float, nullable=False)   # metres
    depth_max = Column(Float, nullable=False)   # metres

    # Geological description
    lithology = Column(String(200))       # e.g., "Sandstone/Shale alternation"
    age = Column(String(100))             # Geological age / period
    group = Column(String(100))           # Formation group

    # Typical drilling characteristics
    typical_events = Column(JSON)         # List[str] of common event types
    mud_weight_min = Column(Float)        # ppg lower bound
    mud_weight_max = Column(Float)        # ppg upper bound
    avg_porosity = Column(Float)          # %
    avg_permeability = Column(Float)      # mD

    # UI / visualization
    color_hex = Column(String(10), default="#888888")

    # Description for AI context
    description = Column(Text)

    # Provenance
    source_label = Column(
        String(200),
        default="Synthetic Demo Data — Not Real OIL Data",
    )
