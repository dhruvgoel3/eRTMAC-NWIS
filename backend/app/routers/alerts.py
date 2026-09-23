"""
Alerts API Router
Provides real-time hazard warnings, active alerts, and operator acknowledgement actions.
"""
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Well, Alert
from app.auth.dependencies import require_permission, AuthenticatedUser
from app.services.audit_service import log_audit_event
from app.schemas.alert import AlertResponse, AlertAcknowledgeResponse

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


@router.get("", response_model=List[AlertResponse])
def get_alerts(
    well_id_str: Optional[str] = Query(None, description="Filter by well ID"),
    acknowledged: Optional[bool] = Query(None, description="Filter by ack status"),
    severity: Optional[str] = Query(None, description="INFO | WARNING | HIGH | CRITICAL"),
    user: AuthenticatedUser = Depends(require_permission("alerts.view")),
    db: Session = Depends(get_db),
):
    """Get alerts for active operations with filtering options."""
    q = db.query(Alert)
    if well_id_str:
        well = db.query(Well).filter(Well.well_id == well_id_str).first()
        if well:
            q = q.filter(Alert.well_id == well.id)
    if acknowledged is not None:
        q = q.filter(Alert.acknowledged == acknowledged)
    if severity:
        q = q.filter(Alert.severity == severity)

    alerts = q.order_by(Alert.created_at.desc()).limit(50).all()
    return [
        {
            "id": a.id,
            "well_id": well_id_str or "OIL-X123",
            "alert_type": a.alert_type,
            "severity": a.severity,
            "depth": a.depth,
            "message": a.message,
            "explanation": a.explanation,
            "evidence": a.evidence,
            "acknowledged": a.acknowledged,
            "created_at": a.created_at.isoformat(),
        }
        for a in alerts
    ]


@router.get("/active", response_model=List[AlertResponse])
def get_active_alerts(
    well_id_str: Optional[str] = None,
    user: AuthenticatedUser = Depends(require_permission("alerts.view")),
    db: Session = Depends(get_db),
):
    """Convenience endpoint returning all unacknowledged active hazard alerts."""
    return get_alerts(well_id_str=well_id_str, acknowledged=False, severity=None, user=user, db=db)


@router.post("/{alert_id}/acknowledge", response_model=AlertAcknowledgeResponse)
def acknowledge_alert(
    alert_id: int,
    user: AuthenticatedUser = Depends(require_permission("alerts.acknowledge")),
    db: Session = Depends(get_db),
):
    """Acknowledge an alert and record an audit trail event."""
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    alert.acknowledged = True
    db.commit()

    log_audit_event(
        db=db,
        action="ALERT_ACKNOWLEDGED",
        user_id=user.id,
        resource_type="ALERT",
        resource_id=str(alert_id),
        metadata={"severity": alert.severity, "depth": alert.depth},
    )
    return {"status": "acknowledged", "id": alert_id}
