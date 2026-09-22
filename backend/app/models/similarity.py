"""
SQLAlchemy model for precomputed Well-to-Well Similarity Scores.
Stores similarity scores between an active well and offset wells
so lookups are O(1) rather than computed on each request.

[Synthetic Demo Data — Not Real OIL Data]
"""
from sqlalchemy import Column, Integer, Float, ForeignKey, DateTime, JSON, Index
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class SimilarityScore(Base):
    """
    Precomputed similarity between a reference well and an offset well.
    Score is 0.0–1.0 (higher = more similar).

    Component scores allow the AI to explain WHY wells are similar.
    """
    __tablename__ = "similarity_scores"

    id = Column(Integer, primary_key=True, index=True)

    # The well we are computing similarity FOR (usually the active well)
    reference_well_id = Column(
        Integer, ForeignKey("wells.id"), nullable=False, index=True
    )
    # The offset well being compared
    offset_well_id = Column(
        Integer, ForeignKey("wells.id"), nullable=False, index=True
    )

    # Composite score (0–100)
    overall_score = Column(Float, nullable=False)

    # Component scores (0–100 each)
    formation_score = Column(Float, default=0.0)    # Same / similar formation
    depth_score = Column(Float, default=0.0)        # Similar total depth
    trajectory_score = Column(Float, default=0.0)  # Same trajectory type
    distance_score = Column(Float, default=0.0)    # Geographic proximity
    mud_weight_score = Column(Float, default=0.0)  # Similar mud weight regime
    event_pattern_score = Column(Float, default=0.0)  # Overlapping event types

    # Ranked position (1 = most similar)
    rank = Column(Integer, default=0)

    # Explanation text for AI / frontend display
    explanation = Column(JSON)  # {factor: str, score: float, detail: str}[]

    computed_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    reference_well = relationship(
        "Well", foreign_keys=[reference_well_id], backref="similarity_as_reference"
    )
    offset_well = relationship(
        "Well", foreign_keys=[offset_well_id], backref="similarity_as_offset"
    )

    # Unique together: only one score per (reference, offset) pair
    __table_args__ = (
        Index("ix_sim_ref_offset", "reference_well_id", "offset_well_id", unique=True),
    )
