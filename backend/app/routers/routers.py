"""
Dashboard, Documents, Alerts, AI, and Simulation routers.
"""
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Well, WellEvent, Document, DocumentChunk, Alert, RiskZone, SimulationState
from app.services.geo import haversine_km, find_nearby_wells
from app.services.similarity import rank_similar_wells
from app.services.risk_engine import get_risk_zones_for_depth, calculate_overall_risk
from app.services.simulator import start_simulation, pause_simulation, reset_simulation, set_speed, get_simulation_state
from app.services.ai_service import get_ai_provider

# ─── Dashboard Router ─────────────────────────────────────────────────────────
dashboard_router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

@dashboard_router.get("/{well_id_str}")
def get_dashboard(well_id_str: str, db: Session = Depends(get_db)):
    """Master dashboard endpoint — returns all data needed for Overview page."""
    well = db.query(Well).filter(Well.well_id == well_id_str).first()
    if not well:
        raise HTTPException(404, f"Well {well_id_str} not found")

    sim_state = get_simulation_state(db)
    current_depth = sim_state["current_depth"] if sim_state else 3050.0

    # Nearby wells (20km radius)
    all_wells = db.query(Well).filter(Well.is_active == False).all()
    nearby = find_nearby_wells(well.latitude, well.longitude, 20.0, all_wells)

    # Similarity ranking
    ranked_similar = rank_similar_wells(well, nearby, top_n=5)

    # Risk zones
    risk_zones = get_risk_zones_for_depth(db, well.id, current_depth)
    overall_risk = calculate_overall_risk(risk_zones, current_depth)

    # Recent alerts
    alerts = db.query(Alert).filter(Alert.well_id == well.id, Alert.acknowledged == False)\
        .order_by(Alert.created_at.desc()).limit(5).all()

    # Counts
    all_events = db.query(WellEvent).filter(
        WellEvent.well_id.in_([w.id for w, _ in nearby])
    ).all()
    high_risk_zones = [z for z in risk_zones if z["severity"] in ("HIGH", "CRITICAL")]

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
            "top_similarity_score": top_similar["similarity_score"] if top_similar else 0,
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


# ─── Documents Router ─────────────────────────────────────────────────────────
documents_router = APIRouter(prefix="/api/documents", tags=["documents"])

@documents_router.get("")
def get_documents(
    well_id_str: Optional[str] = None,
    doc_type: Optional[str] = None,
    db: Session = Depends(get_db),
):
    q = db.query(Document)
    if well_id_str:
        well = db.query(Well).filter(Well.well_id == well_id_str).first()
        if well:
            q = q.filter(Document.well_id == well.id)
    if doc_type:
        q = q.filter(Document.document_type == doc_type)
    docs = q.order_by(Document.date.desc()).all()

    result = []
    for d in docs:
        well = db.query(Well).filter(Well.id == d.well_id).first()
        result.append({
            "id": d.id,
            "document_id": d.document_id,
            "document_type": d.document_type,
            "well_id": well.well_id if well else None,
            "title": d.title,
            "date": d.date.isoformat() if d.date else None,
            "depth_start": d.depth_start,
            "depth_end": d.depth_end,
            "formation": d.formation,
        })
    return result

@documents_router.get("/{doc_id}")
def get_document(doc_id: str, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.document_id == doc_id).first()
    if not doc:
        try:
            doc = db.query(Document).filter(Document.id == int(doc_id)).first()
        except (ValueError, TypeError):
            pass
    if not doc:
        raise HTTPException(404, f"Document {doc_id} not found")
    well = db.query(Well).filter(Well.id == doc.well_id).first()
    return {
        "id": doc.id,
        "document_id": doc.document_id,
        "document_type": doc.document_type,
        "well_id": well.well_id if well else None,
        "well_name": well.name if well else None,
        "title": doc.title,
        "date": doc.date.isoformat() if doc.date else None,
        "text_content": doc.text_content,
        "depth_start": doc.depth_start,
        "depth_end": doc.depth_end,
        "formation": doc.formation,
        "metadata": doc.metadata_,
    }


# ─── Alerts Router ────────────────────────────────────────────────────────────
alerts_router = APIRouter(prefix="/api/alerts", tags=["alerts"])

@alerts_router.get("")
def get_alerts(
    well_id_str: Optional[str] = None,
    acknowledged: Optional[bool] = None,
    severity: Optional[str] = None,
    db: Session = Depends(get_db),
):
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


@alerts_router.get("/active")
def get_active_alerts(well_id_str: Optional[str] = None, db: Session = Depends(get_db)):
    """Convenience endpoint to get unacknowledged alerts."""
    return get_alerts(well_id_str=well_id_str, acknowledged=False, severity=None, db=db)


@alerts_router.post("/{alert_id}/acknowledge")
def acknowledge_alert(alert_id: int, db: Session = Depends(get_db)):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(404, "Alert not found")
    alert.acknowledged = True
    db.commit()
    return {"status": "acknowledged", "id": alert_id}


# ─── AI Router ────────────────────────────────────────────────────────────────
ai_router = APIRouter(prefix="/api/ai", tags=["ai"])

@ai_router.post("/query")
def ai_query(
    payload: dict = Body(...),
    db: Session = Depends(get_db),
):
    """
    Ask NWIS an AI question. Returns structured evidence-backed response.
    Works without OpenAI API key (uses DemoAIProvider).
    """
    question = payload.get("question", "").strip()
    if not question:
        raise HTTPException(400, "question is required")

    provider = get_ai_provider(db)
    response = provider.query(question)
    return response

@ai_router.get("/health")
def ai_health():
    import os
    has_key = bool(os.getenv("OPENAI_API_KEY", "").strip())
    return {
        "status": "online",
        "provider": "OpenAI" if has_key else "Demo (no API key)",
        "model": os.getenv("AI_MODEL", "gpt-4o-mini") if has_key else "NWIS-Demo",
    }


# ─── Simulation Router ────────────────────────────────────────────────────────
simulation_router = APIRouter(prefix="/api/simulation", tags=["simulation"])

@simulation_router.get("/state")
def sim_state(db: Session = Depends(get_db)):
    state = get_simulation_state(db)
    if not state:
        raise HTTPException(404, "Simulation not initialized")

    # Attach risk zones for current depth
    well = db.query(Well).filter(Well.is_active == True).first()
    risk_zones = []
    overall_risk = {}
    if well:
        risk_zones = get_risk_zones_for_depth(db, well.id, state["current_depth"])
        overall_risk = calculate_overall_risk(risk_zones, state["current_depth"])

    state["risk_zones"] = risk_zones
    state["overall_risk"] = overall_risk
    return state

@simulation_router.post("/start")
def sim_start(db: Session = Depends(get_db)):
    ok = start_simulation(db)
    return {"status": "started" if ok else "already_at_td"}

@simulation_router.post("/pause")
def sim_pause(db: Session = Depends(get_db)):
    pause_simulation(db)
    return {"status": "paused"}

@simulation_router.post("/reset")
def sim_reset(db: Session = Depends(get_db)):
    reset_simulation(db)
    return {"status": "reset", "depth": 3050.0}

@simulation_router.post("/speed")
def sim_speed(payload: dict = Body(...), db: Session = Depends(get_db)):
    speed = payload.get("speed", 1)
    ok = set_speed(db, int(speed))
    return {"status": "ok" if ok else "invalid_speed", "speed": speed}


# ─── Events Router ────────────────────────────────────────────────────────────
events_router = APIRouter(prefix="/api/events", tags=["events"])

@events_router.get("")
def get_all_events(
    event_type: Optional[str] = None,
    severity: Optional[str] = None,
    formation: Optional[str] = None,
    depth_min: Optional[float] = None,
    depth_max: Optional[float] = None,
    limit: int = Query(100, le=300),
    db: Session = Depends(get_db),
):
    """Get historical events across all wells with filters."""
    q = db.query(WellEvent)
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
        well = db.query(Well).filter(Well.id == e.well_id).first()
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
