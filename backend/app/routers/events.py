"""
Events API Router
Provides query access to historical offset well drilling events (Mud Loss, Stuck Pipe, etc.).
"""
from typing import Optional, List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.models import Well, WellEvent
from app.auth.dependencies import require_permission, AuthenticatedUser
from app.schemas.event import WellEventResponse

router = APIRouter(prefix="/api/events", tags=["events"])


@router.get("", response_model=List[WellEventResponse])
def get_all_events(
    event_type: Optional[str] = Query(None, description="MUD_LOSS | STUCK_PIPE | KICK | etc."),
    severity: Optional[str] = Query(None, description="LOW | MEDIUM | HIGH | CRITICAL"),
    formation: Optional[str] = Query(None, description="Formation name"),
    depth_min: Optional[float] = Query(None, description="Min depth (m)"),
    depth_max: Optional[float] = Query(None, description="Max depth (m)"),
    limit: int = Query(100, le=300),
    user: AuthenticatedUser = Depends(require_permission("events.view")),
    db: Session = Depends(get_db),
):
    """Retrieve historical drilling events with multi-criteria filtering."""
    q = db.query(WellEvent).options(joinedload(WellEvent.well))
    if event_type:
        q = q.filter(WellEvent.event_type == event_type)
    if severity:
        q = q.filter(WellEvent.severity == severity)
    if formation:
        q = q.filter(WellEvent.formation == formation)
    if depth_min is not None:
        q = q.filter(WellEvent.depth_start >= depth_min)
    if depth_max is not None:
        q = q.filter(WellEvent.depth_end <= depth_max)

    events = q.order_by(WellEvent.depth_start).limit(limit).all()

    result = []
    for e in events:
        well = e.well
        result.append({
            "id": e.id,
            "well_id": well.well_id if well else None,
            "well_name": well.name if well else None,
            "latitude": well.latitude if well else None,
            "longitude": well.longitude if well else None,
            "event_type": e.event_type,
            "depth_start": e.depth_start,
            "depth_end": e.depth_end,
            "severity": e.severity,
            "npt_hours": e.npt_hours,
            "formation": e.formation,
            "description": e.description,
            "root_cause": e.root_cause,
            "mitigation": e.mitigation,
            "confidence": e.confidence,
            "event_date": e.event_date.isoformat() if e.event_date else None,
        })
    return result
