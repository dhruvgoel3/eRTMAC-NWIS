"""
Models package - imports all SQLAlchemy models so they are
registered with Base.metadata before create_all() is called.
"""
from app.models.well import Well
from app.models.event import WellEvent
from app.models.document import Document, DocumentChunk
from app.models.alert import Alert, RiskZone, DrillingParameter, SimulationState

__all__ = [
    "Well",
    "WellEvent",
    "Document",
    "DocumentChunk",
    "Alert",
    "RiskZone",
    "DrillingParameter",
    "SimulationState",
]
