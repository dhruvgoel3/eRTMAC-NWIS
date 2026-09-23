"""
NWIS Drilling Memory Graph API Router
Constructs multi-hop relationship graph between active well, top similar wells,
formations, historical events, depth intervals, and documents.
"""
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Well, WellEvent, Document
from app.services.geo import find_nearby_wells
from app.services.similarity import rank_similar_wells
from app.auth.dependencies import require_permission, AuthenticatedUser

router = APIRouter(prefix="/api/memory-graph", tags=["memory-graph"])


@router.get("/{well_id_str}")
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
        raise HTTPException(status_code=404, detail=f"Well '{well_id_str}' not found")

    nodes: List[Dict[str, Any]] = []
    edges: List[Dict[str, Any]] = []
    seen_node_ids: set = set()

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
        raw_score: float = r["similarity_score"]
        sim_pct = raw_score if raw_score > 1.0 else raw_score * 100.0
        sim_ratio = sim_pct / 100.0
        dist_km: float = r["distance_km"]
        factors: dict = r["factors"]

        offset_node_id = f"well:{offset_well.well_id}"
        is_top = rank_idx == 0

        add_node(offset_node_id, {
            "type": "OFFSET_WELL_TOP" if is_top else "OFFSET_WELL",
            "label": offset_well.well_id,
            "sublabel": f"{sim_pct:.0f}% similar",
            "formation": offset_well.formation,
            "total_depth": offset_well.total_depth,
            "trajectory_type": offset_well.trajectory_type,
            "latitude": offset_well.latitude,
            "longitude": offset_well.longitude,
            "status": offset_well.status,
            "similarity_score": round(sim_ratio, 3),
            "distance_km": round(dist_km, 2),
            "score_breakdown": factors,
            "description": f"{offset_well.name} · {dist_km:.1f}km · {sim_pct:.0f}% similarity",
        })

        add_edge(anchor_node_id, offset_node_id, {
            "type": "SIMILAR_TO",
            "label": f"{sim_pct:.0f}%",
            "weight": sim_ratio,
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

            # 7. Depth interval node (group events into ~200m buckets)
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
