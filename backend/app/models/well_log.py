"""
SQLAlchemy model for Well Logs (depth-series log measurements).
Each row represents one depth station for a well.

Populates from FORCE 2020 well-log benchmark data.
Source: Zenodo 4351156 / Norwegian Petroleum Directorate
License: NLOD 2.0 / CC-BY-4.0
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class WellLog(Base):
    """
    Depth-series log record for a well.
    One row per depth station (MD interval).
    """
    __tablename__ = "well_logs"

    id = Column(Integer, primary_key=True, index=True)
    well_id = Column(Integer, ForeignKey("wells.id"), nullable=False, index=True)

    # Depth measurements
    depth_md = Column(Float, nullable=False)    # Measured depth (meters)
    depth_tvd = Column(Float, nullable=True)    # True vertical depth (meters)

    # Stratigraphy
    formation = Column(String(100), nullable=True)
    lithology_code = Column(Integer, nullable=True)    # FORCE 2020 lithofacies integer code
    lithology_name = Column(String(100), nullable=True)

    # Petrophysical log curves (from FORCE 2020 benchmark schema)
    gr = Column(Float, nullable=True)       # Gamma Ray (API units)
    rhob = Column(Float, nullable=True)     # Bulk Density (g/cm³)
    nphi = Column(Float, nullable=True)     # Neutron Porosity (fraction)
    rdep = Column(Float, nullable=True)     # Deep Resistivity (ohm·m)
    pef = Column(Float, nullable=True)      # Photoelectric Factor
    dtc = Column(Float, nullable=True)      # Compressional Sonic (µs/ft)

    # Provenance
    source_dataset = Column(String(50), default="FORCE_2020", index=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationship back to well
    well = relationship("Well", back_populates="logs")

    # Composite index for efficient depth-range queries
    __table_args__ = (
        Index("ix_well_logs_well_depth", "well_id", "depth_md"),
    )
