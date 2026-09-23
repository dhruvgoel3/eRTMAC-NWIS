"""
Dashboard API Router
Provides aggregated KPIs, active well status, and risk summaries for the Overview tab.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Well, WellEvent, Alert
from app.services.geo import find_nearby_wells
from app.services.similarity import rank_similar_wells
from app.services.risk_engine import get_risk_zones_for_depth, calculate_overall_risk
from app.services.simulator import get_simulation_state
from app.auth.dependencies import require_permission, AuthenticatedUser
from app.schemas.dashboard import DashboardResponse

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/{well_id_str}", response_model=DashboardResponse)
def get_dashboard(
    well_id_str: str,
    user: AuthenticatedUser = Depends(require_permission("dashboard.view")),
    db: Session = Depends(get_db),
):
    """
    Master dashboard endpoint — returns all data needed for Overview page:
    Active well telemetry, simulation status, KPIs, current risk state,
    top similar offset wells, and recent alerts.
    """
    well = db.query(Well).filter(Well.well_id == well_id_str).first()
    if not well:
        raise HTTPException(status_code=404, detail=f"Well '{well_id_str}' not found")

    sim_state = get_simulation_state(db)
    current_depth = sim_state["current_depth"] if sim_state else 3050.0

    # Nearby historical wells (20km radius)
    all_wells = db.query(Well).filter(Well.is_active == False).all()
    nearby = find_nearby_wells(well.latitude, well.longitude, 20.0, all_wells)

    # Similarity ranking
    ranked_similar = rank_similar_wells(well, nearby, top_n=5)

    # Risk zones & overall risk assessment
    risk_zones = get_risk_zones_for_depth(db, well.id, current_depth)
    overall_risk = calculate_overall_risk(risk_zones, current_depth)

    # Recent unacknowledged alerts
    alerts = (
        db.query(Alert)
        .filter(Alert.well_id == well.id, Alert.acknowledged == False)
        .order_by(Alert.created_at.desc())
        .limit(5)
        .all()
    )

    all_events = (
        db.query(WellEvent)
        .filter(WellEvent.well_id.in_([w.id for w, _ in nearby]))
        .all()
    )
    high_risk_zones = [z for z in risk_zones if z.get("severity") in ("HIGH", "CRITICAL")]
    top_similar = ranked_similar[0] if ranked_similar else None

    return {
        "active_well": {
            "well_id": well.well_id,
            "name": well.name,
            "formation": well.formation,
            "total_depth": well.total_depth,
            "trajectory_type": well.trajectory_type,
            "latitude": well.latitude,
            "longitude": well.longitude,
        },
        "simulation": sim_state,
        "current_depth": current_depth,
        "kpis": {
            "nearby_wells_count": len(nearby),
            "historical_events_count": len(all_events),
            "high_risk_zones_count": len(high_risk_zones),
            "top_similarity_score": top_similar["similarity_score"] if top_similar else 0.0,
            "top_similar_well": top_similar["well"].well_id if top_similar else None,
        },
        "current_risk": overall_risk,
        "risk_zones": risk_zones[:6],
        "similar_wells": [
            {
                "well_id": r["well"].well_id,
                "formation": r["well"].formation,
                "distance_km": r["distance_km"],
                "similarity_score": r["similarity_score"],
                "factors": r["factors"],
            }
            for r in ranked_similar[:5]
        ],
        "recent_alerts": [
            {
                "id": a.id,
                "alert_type": a.alert_type,
                "severity": a.severity,
                "depth": a.depth,
                "message": a.message,
                "created_at": a.created_at.isoformat(),
                "acknowledged": a.acknowledged,
            }
            for a in alerts
        ],
    }
