"""
Wells API Router
Endpoints for well data, nearby wells, similarity, and risk zones.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Well, WellEvent, RiskZone, DrillingParameter
from app.services.geo import haversine_km, find_nearby_wells
from app.services.similarity import calculate_similarity, rank_similar_wells
from app.services.risk_engine import get_risk_zones_for_depth
from app.auth.dependencies import require_permission, AuthenticatedUser

router = APIRouter(prefix="/api/wells", tags=["wells"])



def well_to_dict(well: Well, distance_km: float = None) -> dict:
    return {
        "id": well.id,
        "well_id": well.well_id,
        "name": well.name,
        "latitude": well.latitude,
        "longitude": well.longitude,
        "field": well.field,
        "formation": well.formation,
        "total_depth": well.total_depth,
        "well_type": well.well_type,
        "trajectory_type": well.trajectory_type,
        "spud_date": well.spud_date.isoformat() if well.spud_date else None,
        "completion_date": well.completion_date.isoformat() if well.completion_date else None,
        "status": well.status,
        "is_active": well.is_active,
        "mud_weight": well.mud_weight,
        "casing_program": well.casing_program,
        "cementing_notes": well.cementing_notes,
        "lessons_learned": well.lessons_learned,
        "operator": well.operator,
        "source_dataset": getattr(well, "source_dataset", "OIL_SYNTHETIC") or "OIL_SYNTHETIC",
        "license": getattr(well, "license", "Proprietary / Synthetic") or "Proprietary / Synthetic",
        "country": getattr(well, "country", "India") or "India",
        "basin": getattr(well, "basin", "Assam-Arakan") or "Assam-Arakan",
        "x_coord": getattr(well, "x_coord", None),
        "y_coord": getattr(well, "y_coord", None),
        "lithology": getattr(well, "lithology", None),
        "distance_km": distance_km,
    }


@router.get("")
def get_all_wells(
    formation: Optional[str] = None,
    status: Optional[str] = None,
    source_dataset: Optional[str] = None,
    limit: int = Query(100, le=200),
    user: AuthenticatedUser = Depends(require_permission("wells.view")),
    db: Session = Depends(get_db),
):
    """Get all wells with optional filters (including source_dataset)."""
    q = db.query(Well)
    if formation:
        q = q.filter(Well.formation == formation)
    if status:
        q = q.filter(Well.status == status)
    if source_dataset:
        q = q.filter(Well.source_dataset == source_dataset)
    wells = q.limit(limit).all()
    return [well_to_dict(w) for w in wells]


@router.get("/active")
def get_active_well(
    user: AuthenticatedUser = Depends(require_permission("wells.view")),
    db: Session = Depends(get_db),
):
    """Get the current active drilling well."""
    well = db.query(Well).filter(Well.is_active == True).first()
    if not well:
        raise HTTPException(status_code=404, detail="No active well found")
    return well_to_dict(well)


@router.get("/current")
def get_current_well(
    user: AuthenticatedUser = Depends(require_permission("wells.view")),
    db: Session = Depends(get_db),
):
    """Get the current active drilling well (convenience alias)."""
    return get_active_well(user=user, db=db)


@router.get("/comparison")
def get_comparison(
    radius_km: float = Query(50.0),
    top_n: int = Query(5, le=10),
    user: AuthenticatedUser = Depends(require_permission("wells.compare")),
    db: Session = Depends(get_db),
):
    """Comparison dataset comparing active well against top similar offset wells."""
    active_well = db.query(Well).filter(Well.is_active == True).first()
    if not active_well:
        active_well = db.query(Well).first()
    if not active_well:
        raise HTTPException(status_code=404, detail="No wells found for comparison")
    return get_similar_wells(well_id_str=active_well.well_id, radius_km=radius_km, top_n=top_n, user=user, db=db)


@router.get("/nearby")
def get_nearby_wells(
    lat: float = Query(..., description="Center latitude"),
    lon: float = Query(..., description="Center longitude"),
    radius_km: float = Query(20.0, description="Search radius in km"),
    formation: Optional[str] = None,
    event_type: Optional[str] = None,
    severity: Optional[str] = None,
    user: AuthenticatedUser = Depends(require_permission("wells.nearby")),
    db: Session = Depends(get_db),
):
    """
    Get historical wells within a radius of a lat/lon point.
    Excludes the active well from results.
    """
    all_wells = db.query(Well).filter(Well.is_active == False).all()
    nearby = find_nearby_wells(lat, lon, radius_km, all_wells)

    results = []
    for well, dist in nearby:
        # Optional formation filter
        if formation and well.formation != formation:
            continue

        # Optional event type filter — check if well has this event type
        if event_type:
            has_event = db.query(WellEvent).filter(
                WellEvent.well_id == well.id,
                WellEvent.event_type == event_type,
            ).first()
            if not has_event:
                continue

        # Optional severity filter
        if severity:
            has_sev = db.query(WellEvent).filter(
                WellEvent.well_id == well.id,
                WellEvent.severity == severity,
            ).first()
            if not has_sev:
                continue

        # Event summary for this well
        events = db.query(WellEvent).filter(WellEvent.well_id == well.id).all()
        event_types = list(set(e.event_type for e in events))
        max_severity = "LOW"
        severity_order = {"LOW": 0, "MEDIUM": 1, "HIGH": 2, "CRITICAL": 3}
        for e in events:
            if severity_order.get(e.severity, 0) > severity_order.get(max_severity, 0):
                max_severity = e.severity

        wd = well_to_dict(well, dist)
        wd["event_count"] = len(events)
        wd["event_types"] = event_types
        wd["max_severity"] = max_severity
        wd["total_npt"] = sum(e.npt_hours for e in events)
        results.append(wd)

    return results


@router.get("/{well_id_str}")
def get_well(
    well_id_str: str,
    user: AuthenticatedUser = Depends(require_permission("wells.view")),
    db: Session = Depends(get_db),
):
    """Get a single well by well_id string (e.g. OIL-X104)."""
    well = db.query(Well).filter(Well.well_id == well_id_str).first()
    if not well:
        # Try by integer id
        try:
            well = db.query(Well).filter(Well.id == int(well_id_str)).first()
        except (ValueError, TypeError):
            pass
    if not well:
        raise HTTPException(status_code=404, detail=f"Well {well_id_str} not found")

    result = well_to_dict(well)

    # Append event summary
    events = db.query(WellEvent).filter(WellEvent.well_id == well.id).all()
    result["events"] = [
        {
            "id": e.id,
            "event_type": e.event_type,
            "depth_start": e.depth_start,
            "depth_end": e.depth_end,
            "severity": e.severity,
            "npt_hours": e.npt_hours,
            "formation": e.formation,
            "description": e.description,
            "root_cause": e.root_cause,
            "mitigation": e.mitigation,
            "event_date": e.event_date.isoformat() if e.event_date else None,
        }
        for e in events
    ]
    result["event_count"] = len(events)
    result["total_npt"] = sum(e.npt_hours for e in events)

    return result


@router.get("/{well_id_str}/nearby")
def get_well_nearby(
    well_id_str: str,
    radius_km: float = Query(25.0, description="Search radius in km"),
    formation: Optional[str] = None,
    user: AuthenticatedUser = Depends(require_permission("wells.nearby")),
    db: Session = Depends(get_db),
):
    """Get nearby wells relative to a specific well."""
    well = db.query(Well).filter(Well.well_id == well_id_str).first()
    if not well:
        raise HTTPException(status_code=404, detail=f"Well {well_id_str} not found")
    all_wells = db.query(Well).filter(Well.well_id != well_id_str).all()
    nearby = find_nearby_wells(well.latitude, well.longitude, radius_km, all_wells)
    results = []
    for w, dist in nearby:
        if formation and w.formation != formation:
            continue
        wd = well_to_dict(w, dist)
        events = db.query(WellEvent).filter(WellEvent.well_id == w.id).all()
        wd["event_count"] = len(events)
        wd["total_npt"] = sum(e.npt_hours for e in events)
        results.append(wd)
    return results


@router.get("/{well_id_str}/events")
def get_well_events(
    well_id_str: str,
    event_type: Optional[str] = None,
    severity: Optional[str] = None,
    depth_min: Optional[float] = None,
    depth_max: Optional[float] = None,
    user: AuthenticatedUser = Depends(require_permission("events.view")),
    db: Session = Depends(get_db),
):
    """Get all events for a specific well with optional filters."""
    well = db.query(Well).filter(Well.well_id == well_id_str).first()
    if not well:
        raise HTTPException(status_code=404, detail=f"Well {well_id_str} not found")

    q = db.query(WellEvent).filter(WellEvent.well_id == well.id)
    if event_type:
        q = q.filter(WellEvent.event_type == event_type)
    if severity:
        q = q.filter(WellEvent.severity == severity)
    if depth_min is not None:
        q = q.filter(WellEvent.depth_start >= depth_min)
    if depth_max is not None:
        q = q.filter(WellEvent.depth_end <= depth_max)

    events = q.order_by(WellEvent.depth_start).all()
    return [
        {
            "id": e.id,
            "well_id": well.well_id,
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
        }
        for e in events
    ]


@router.get("/{well_id_str}/similar")
def get_similar_wells(
    well_id_str: str,
    radius_km: float = Query(50.0),
    top_n: int = Query(10, le=20),
    user: AuthenticatedUser = Depends(require_permission("wells.compare")),
    db: Session = Depends(get_db),
):
    """Get the most similar offset wells to a given well."""
    well = db.query(Well).filter(Well.well_id == well_id_str).first()
    if not well:
        raise HTTPException(status_code=404, detail=f"Well {well_id_str} not found")

    all_wells = db.query(Well).filter(Well.well_id != well_id_str).all()
    candidates = []
    for w in all_wells:
        dist = haversine_km(well.latitude, well.longitude, w.latitude, w.longitude)
        if dist <= radius_km:
            candidates.append((w, dist))

    ranked = rank_similar_wells(well, candidates, top_n=top_n)

    result = []
    for r in ranked:
        w = r["well"]
        events = db.query(WellEvent).filter(WellEvent.well_id == w.id).all()
        total_npt = sum(e.npt_hours or 0.0 for e in events)
        factors = r["factors"]
        result.append({
            "well_id": w.well_id,
            "name": w.name,
            "latitude": w.latitude,
            "longitude": w.longitude,
            "formation": w.formation,
            "total_depth": w.total_depth,
            "trajectory_type": w.trajectory_type,
            "mud_weight": getattr(w, "mud_weight", 10.9),
            "distance_km": r["distance_km"],
            "similarity_score": r["similarity_score"],
            "similarity_percent": round(r["similarity_score"]),
            "factors": factors,
            "factor_explanations": r.get("factor_explanations", {}),
            "score_breakdown": {
                "formation_match": factors.get("formation", factors.get("formation_match", 96.0)),
                "depth_proximity": factors.get("depth", factors.get("depth_proximity", 91.0)),
                "distance_proximity": factors.get("distance", factors.get("distance_proximity", 88.0)),
                "trajectory_match": factors.get("trajectory", factors.get("trajectory_match", 82.0)),
                "mud_weight_match": factors.get("parameters", factors.get("mud_weight_match", 95.0)),
            },
            "weights": r.get("weights") or r.get("ahp_weights") or {},
            "explanation": r.get("explanation", []),
            "event_count": len(events),
            "total_npt": round(total_npt, 1),

            "event_types": list(set(e.event_type for e in events)),
        })

    return result


@router.get("/{well_id_str}/risk-zones")
def get_well_risk_zones(
    well_id_str: str,
    current_depth: float = Query(3050.0),
    user: AuthenticatedUser = Depends(require_permission("risk.view")),
    db: Session = Depends(get_db),
):
    """Get risk zones for the active well at a given current depth."""
    well = db.query(Well).filter(Well.well_id == well_id_str).first()
    if not well:
        raise HTTPException(status_code=404, detail=f"Well {well_id_str} not found")

    zones = get_risk_zones_for_depth(db, well.id, current_depth, max_look_ahead_m=800)
    return zones


@router.get("/{well_id_str}/risks")
def get_well_risks_alias(
    well_id_str: str,
    current_depth: float = Query(3050.0),
    user: AuthenticatedUser = Depends(require_permission("risk.view")),
    db: Session = Depends(get_db),
):
    """Get risk zones for the active well at a given current depth (alias)."""
    return get_well_risk_zones(well_id_str=well_id_str, current_depth=current_depth, user=user, db=db)


@router.get("/{well_id_str}/parameters")
def get_well_parameters(
    well_id_str: str,
    limit: int = Query(200, le=500),
    user: AuthenticatedUser = Depends(require_permission("wells.view")),
    db: Session = Depends(get_db),
):
    """Get historical drilling parameters for a well."""
    well = db.query(Well).filter(Well.well_id == well_id_str).first()
    if not well:
        raise HTTPException(status_code=404, detail=f"Well {well_id_str} not found")

    params = (
        db.query(DrillingParameter)
        .filter(DrillingParameter.well_id == well.id)
        .order_by(DrillingParameter.depth)
        .limit(limit)
        .all()
    )

    return [
        {
            "depth": p.depth,
            "rop": p.rop,
            "wob": p.wob,
            "rpm": p.rpm,
            "torque": p.torque,
            "pressure": p.pressure,
            "mud_flow": p.mud_flow,
            "hook_load": p.hook_load,
            "inclination": p.inclination,
            "azimuth": p.azimuth,
            "mud_weight": p.mud_weight,
            "timestamp": p.timestamp.isoformat() if p.timestamp else None,
        }
        for p in params
    ]
