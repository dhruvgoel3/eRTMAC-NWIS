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
from app.auth.dependencies import require_permission, AuthenticatedUser
from app.services.audit_service import log_audit_event

# ─── Dashboard Router ─────────────────────────────────────────────────────────
dashboard_router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

@dashboard_router.get("/{well_id_str}")
def get_dashboard(
    well_id_str: str,
    user: AuthenticatedUser = Depends(require_permission("dashboard.view")),
    db: Session = Depends(get_db),
):
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
    user: AuthenticatedUser = Depends(require_permission("documents.view")),
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
def get_document(
    doc_id: str,
    user: AuthenticatedUser = Depends(require_permission("documents.view")),
    db: Session = Depends(get_db),
):
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
    user: AuthenticatedUser = Depends(require_permission("alerts.view")),
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
def get_active_alerts(
    well_id_str: Optional[str] = None,
    user: AuthenticatedUser = Depends(require_permission("alerts.view")),
    db: Session = Depends(get_db),
):
    """Convenience endpoint to get unacknowledged alerts."""
    return get_alerts(well_id_str=well_id_str, acknowledged=False, severity=None, user=user, db=db)


@alerts_router.post("/{alert_id}/acknowledge")
def acknowledge_alert(
    alert_id: int,
    user: AuthenticatedUser = Depends(require_permission("alerts.acknowledge")),
    db: Session = Depends(get_db),
):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(404, "Alert not found")
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


# ─── AI Router ────────────────────────────────────────────────────────────────
ai_router = APIRouter(prefix="/api/ai", tags=["ai"])

@ai_router.post("/query")
def ai_query(
    payload: dict = Body(...),
    user: AuthenticatedUser = Depends(require_permission("ai.query")),
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

    # Record AI query in audit log
    log_audit_event(
        db=db,
        action="AI_QUERY",
        user_id=user.id,
        resource_type="AI_AGENT",
        resource_id=user.email,
        metadata={
            "query": question[:200],
            "citations_count": len(response.get("citations", [])),
        },
    )
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
def sim_state(
    user: AuthenticatedUser = Depends(require_permission("simulation.view")),
    db: Session = Depends(get_db),
):
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
def sim_start(
    user: AuthenticatedUser = Depends(require_permission("simulation.control")),
    db: Session = Depends(get_db),
):
    ok = start_simulation(db)
    log_audit_event(db=db, action="SIMULATION_STARTED", user_id=user.id, resource_type="SIMULATION")
    return {"status": "started" if ok else "already_at_td"}

@simulation_router.post("/pause")
def sim_pause(
    user: AuthenticatedUser = Depends(require_permission("simulation.control")),
    db: Session = Depends(get_db),
):
    pause_simulation(db)
    log_audit_event(db=db, action="SIMULATION_PAUSED", user_id=user.id, resource_type="SIMULATION")
    return {"status": "paused"}

@simulation_router.post("/reset")
def sim_reset(
    user: AuthenticatedUser = Depends(require_permission("simulation.control")),
    db: Session = Depends(get_db),
):
    reset_simulation(db)
    log_audit_event(db=db, action="SIMULATION_RESET", user_id=user.id, resource_type="SIMULATION")
    return {"status": "reset", "depth": 3050.0}

@simulation_router.post("/speed")
def sim_speed(
    payload: dict = Body(...),
    user: AuthenticatedUser = Depends(require_permission("simulation.control")),
    db: Session = Depends(get_db),
):
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
    user: AuthenticatedUser = Depends(require_permission("events.view")),
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


# ─── Memory Graph Router ──────────────────────────────────────────────────────
memory_graph_router = APIRouter(prefix="/api/memory-graph", tags=["memory-graph"])


@memory_graph_router.get("/{well_id_str}")
def get_memory_graph(
    well_id_str: str,
    radius_km: float = Query(50.0, description="Search radius km"),
    top_n: int = Query(8, description="Max similar wells to include"),
    user: AuthenticatedUser = Depends(require_permission("dashboard.view")),
    db: Session = Depends(get_db),
):
    """
    Build the NWIS Drilling Memory Graph for a given active well.
    Returns nodes (wells, formations, events, documents, depth intervals)
    and edges (relationships) for the interactive knowledge network visualization.
    """
    # 1. Fetch the anchor well
    anchor = db.query(Well).filter(Well.well_id == well_id_str).first()
    if not anchor:
        raise HTTPException(404, f"Well {well_id_str} not found")

    nodes: list[dict] = []
    edges: list[dict] = []
    seen_node_ids: set[str] = set()

    def add_node(node_id: str, node: dict):
        if node_id not in seen_node_ids:
            nodes.append({"id": node_id, **node})
            seen_node_ids.add(node_id)

    def add_edge(src: str, tgt: str, edge: dict):
        edges.append({"source": src, "target": tgt, **edge})

    # 2. Active well node
    anchor_node_id = f"well:{anchor.well_id}"
    add_node(anchor_node_id, {
        "type": "ACTIVE_WELL",
        "label": anchor.well_id,
        "sublabel": "Active Well",
        "formation": anchor.formation,
        "total_depth": anchor.total_depth,
        "trajectory_type": anchor.trajectory_type,
        "latitude": anchor.latitude,
        "longitude": anchor.longitude,
        "status": "ACTIVE",
        "description": f"{anchor.name} — {anchor.formation} @ {anchor.total_depth}m TD",
    })

    # 3. Active well formation node
    if anchor.formation:
        form_id = f"formation:{anchor.formation}"
        add_node(form_id, {
            "type": "FORMATION",
            "label": anchor.formation,
            "sublabel": "Formation",
            "description": f"Formation encountered in {anchor.well_id}",
        })
        add_edge(anchor_node_id, form_id, {"type": "DRILLS_IN", "label": "drills in"})

    # 4. Find similar offset wells
    all_historicals = db.query(Well).filter(Well.is_active == False).all()
    nearby = find_nearby_wells(anchor.latitude, anchor.longitude, radius_km, all_historicals)
    ranked = rank_similar_wells(anchor, nearby, top_n=top_n)

    for rank_idx, r in enumerate(ranked):
        offset_well: Well = r["well"]
        sim_score: float = r["similarity_score"]
        dist_km: float = r["distance_km"]
        factors: dict = r["factors"]

        offset_node_id = f"well:{offset_well.well_id}"
        is_top = rank_idx == 0

        add_node(offset_node_id, {
            "type": "OFFSET_WELL_TOP" if is_top else "OFFSET_WELL",
            "label": offset_well.well_id,
            "sublabel": f"{sim_score:.0%} similar",
            "formation": offset_well.formation,
            "total_depth": offset_well.total_depth,
            "trajectory_type": offset_well.trajectory_type,
            "latitude": offset_well.latitude,
            "longitude": offset_well.longitude,
            "status": offset_well.status,
            "similarity_score": round(sim_score, 3),
            "distance_km": round(dist_km, 2),
            "score_breakdown": factors,
            "description": f"{offset_well.name} · {dist_km:.1f}km · {sim_score:.0%} similarity",
        })

        add_edge(anchor_node_id, offset_node_id, {
            "type": "SIMILAR_TO",
            "label": f"{sim_score:.0%}",
            "weight": sim_score,
        })

        # 5. Formation node for offset well (if different)
        if offset_well.formation and offset_well.formation != anchor.formation:
            form_id = f"formation:{offset_well.formation}"
            add_node(form_id, {
                "type": "FORMATION",
                "label": offset_well.formation,
                "sublabel": "Formation",
                "description": f"Formation encountered across multiple offset wells",
            })
            add_edge(offset_node_id, form_id, {"type": "DRILLS_IN", "label": "drills in"})

        # 6. Events for this offset well
        events = db.query(WellEvent).filter(WellEvent.well_id == offset_well.id).all()
        for evt in events:
            evt_node_id = f"event:{evt.id}"
            severity_label = evt.severity or "MEDIUM"
            add_node(evt_node_id, {
                "type": "EVENT",
                "label": evt.event_type.replace("_", " "),
                "sublabel": f"{evt.depth_start}m · {severity_label}",
                "event_type": evt.event_type,
                "severity": severity_label,
                "depth_start": evt.depth_start,
                "depth_end": evt.depth_end,
                "formation": evt.formation,
                "npt_hours": evt.npt_hours,
                "description": evt.description,
                "root_cause": evt.root_cause,
                "mitigation": evt.mitigation,
                "event_date": evt.event_date.isoformat() if evt.event_date else None,
                "well_id": offset_well.well_id,
            })
            add_edge(offset_node_id, evt_node_id, {
                "type": "HAD_EVENT",
                "label": f"@{evt.depth_start}m",
                "depth": evt.depth_start,
                "severity": severity_label,
            })

            # 7. Depth interval node (group events into ~100m buckets)
            depth_bucket = (int(evt.depth_start) // 200) * 200
            depth_node_id = f"depth:{depth_bucket}"
            if depth_node_id not in seen_node_ids:
                add_node(depth_node_id, {
                    "type": "DEPTH_INTERVAL",
                    "label": f"{depth_bucket}–{depth_bucket+200}m",
                    "sublabel": "Depth Interval",
                    "depth_start": depth_bucket,
                    "depth_end": depth_bucket + 200,
                    "description": f"Drilling depth zone {depth_bucket}–{depth_bucket+200}m",
                })
            add_edge(evt_node_id, depth_node_id, {"type": "OCCURS_AT", "label": "at depth"})

        # 8. Documents for this offset well
        docs = db.query(Document).filter(Document.well_id == offset_well.id).all()
        for doc in docs:
            doc_node_id = f"doc:{doc.document_id}"
            add_node(doc_node_id, {
                "type": "DOCUMENT",
                "label": doc.document_type or "DDR",
                "sublabel": doc.title[:35] + "…" if len(doc.title) > 35 else doc.title,
                "document_id": doc.document_id,
                "document_type": doc.document_type,
                "title": doc.title,
                "date": doc.date.isoformat() if doc.date else None,
                "depth_start": doc.depth_start,
                "depth_end": doc.depth_end,
                "formation": doc.formation,
                "description": f"{doc.document_type} · {doc.date.strftime('%Y-%m-%d') if doc.date else 'N/A'} · {doc.formation or ''}",
            })
            add_edge(offset_node_id, doc_node_id, {"type": "HAS_DOCUMENT", "label": "documented"})

    # 9. Summary counts for UI
    type_counts = {}
    for n in nodes:
        t = n.get("type", "UNKNOWN")
        type_counts[t] = type_counts.get(t, 0) + 1

    return {
        "anchor_well": well_id_str,
        "nodes": nodes,
        "edges": edges,
        "stats": {
            "total_nodes": len(nodes),
            "total_edges": len(edges),
            "type_counts": type_counts,
            "similar_wells_count": len(ranked),
        },
    }


# ─── Datasets / Provenance Router ─────────────────────────────────────────────
datasets_router = APIRouter(prefix="/api/datasets", tags=["datasets"])

# Known public datasets with full attribution
DATASET_REGISTRY = {
    "OIL_SYNTHETIC": {
        "code": "OIL_SYNTHETIC",
        "name": "OIL Synthetic Demo Wells (Assam Basin)",
        "description": (
            "Deterministically-generated synthetic wells clustered around 27.2N, 95.1E "
            "representing realistic Assam-Arakan Basin formations (Tipam, Barail, Kopili, Sylhet, Langpur, Namsang). "
            "Used as the primary demo dataset for NWIS. NOT actual Oil India Limited data."
        ),
        "operator": "eRTMAC-NWIS Prototype Team",
        "license": "Proprietary / Synthetic Demo",
        "country": "India (Simulated)",
        "basin": "Assam-Arakan (Simulated)",
        "source_url": None,
        "disclaimer": "All synthetic data is for demonstration purposes only.",
    },
    "FORCE_2020": {
        "code": "FORCE_2020",
        "name": "FORCE 2020 Machine Learning Well-Log Benchmark",
        "description": (
            "Public well-log benchmark dataset from the Norwegian Petroleum Directorate (NPD) "
            "released for the FORCE 2020 Machine Learning competition. "
            "Contains GR, RHOB, NPHI, RDEP, PEF, DTC logs and lithofacies labels for North Sea wells."
        ),
        "operator": "Norwegian Petroleum Directorate (NPD) / FORCE 2020 Consortium",
        "license": "Norwegian License for Open Government Data (NLOD) 2.0 / CC-BY-4.0",
        "country": "Norway",
        "basin": "Norwegian North Sea",
        "source_url": "https://zenodo.org/records/4351156",
        "github_url": "https://github.com/bolgebrygg/Force-2020-Machine-Learning-competition",
        "disclaimer": "Public research/education dataset. Not Oil India Limited operational data.",
    },
    "EQUINOR_VOLVE": {
        "code": "EQUINOR_VOLVE",
        "name": "Equinor Volve Field Open Dataset",
        "description": (
            "Full-field open dataset released by Equinor for the decommissioned Volve oil field "
            "(Block 15/9, Norwegian North Sea). Includes deviation surveys, well logs, production data, "
            "and seismic for 7 wellbores. Used here for trajectory and formation data only."
        ),
        "operator": "Equinor ASA",
        "license": "Equinor Open Data Licence / CC-BY-4.0",
        "country": "Norway",
        "basin": "Norwegian North Sea (Block 15/9)",
        "source_url": "https://www.equinor.com/energy/volve-data-sharing",
        "disclaimer": "Public research/education dataset. Not Oil India Limited operational data.",
    },
}


@datasets_router.get("")
def get_datasets(db: Session = Depends(get_db)):
    """
    Returns provenance inventory of all ingested datasets with counts and attribution.
    """
    from app.models import Well, WellEvent
    from app.models.well_log import WellLog
    from sqlalchemy import func

    result = []

    for source_code, meta in DATASET_REGISTRY.items():
        well_count = db.query(func.count(Well.id)).filter(
            Well.source_dataset == source_code
        ).scalar() or 0

        event_count = db.query(func.count(WellEvent.id)).filter(
            WellEvent.source_dataset == source_code
        ).scalar() or 0

        log_count = 0
        try:
            log_count = db.query(func.count(WellLog.id)).filter(
                WellLog.source_dataset == source_code
            ).scalar() or 0
        except Exception:
            pass

        depth_stats = db.query(
            func.min(Well.total_depth),
            func.max(Well.total_depth),
            func.avg(Well.total_depth),
        ).filter(Well.source_dataset == source_code).first()

        formations = [
            row[0] for row in db.query(Well.formation).filter(
                Well.source_dataset == source_code,
                Well.formation.isnot(None),
            ).distinct().all()
            if row[0]
        ]

        result.append({
            **meta,
            "stats": {
                "wells": well_count,
                "events": event_count,
                "well_log_depth_records": log_count,
                "depth_min_m": round(depth_stats[0], 1) if depth_stats[0] else None,
                "depth_max_m": round(depth_stats[1], 1) if depth_stats[1] else None,
                "depth_avg_m": round(float(depth_stats[2]), 1) if depth_stats[2] else None,
                "formations": sorted(formations),
            },
        })

    from sqlalchemy import func as f2
    total = db.query(f2.count(Well.id)).scalar() or 0

    return {
        "total_wells_in_db": total,
        "datasets": result,
        "note": "All public datasets are used strictly for research and educational purposes.",
    }


@datasets_router.get("/{source_code}")
def get_dataset_detail(source_code: str, db: Session = Depends(get_db)):
    """
    Returns detailed provenance and sample wells for a specific source dataset.
    """
    from app.models import Well

    source_code_upper = source_code.upper()
    if source_code_upper not in DATASET_REGISTRY:
        raise HTTPException(
            status_code=404,
            detail=f"Dataset '{source_code}' not found. Valid codes: {list(DATASET_REGISTRY.keys())}",
        )

    meta = DATASET_REGISTRY[source_code_upper]
    wells = db.query(Well).filter(Well.source_dataset == source_code_upper).all()

    sample_wells = [
        {
            "well_id": w.well_id,
            "name": w.name,
            "field": w.field,
            "formation": w.formation,
            "total_depth": w.total_depth,
            "trajectory_type": w.trajectory_type,
            "latitude": w.latitude,
            "longitude": w.longitude,
            "lithology": getattr(w, "lithology", None),
            "basin": getattr(w, "basin", None),
        }
        for w in wells
    ]

    return {**meta, "wells": sample_wells, "well_count": len(wells)}
