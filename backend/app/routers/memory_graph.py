"""
NWIS Drilling Memory Graph API Router
======================================
Constructs multi-hop relationship graph between active well, top similar wells,
formations, historical events, hazards, interventions, outcomes, and documents.
Powered by the 4,037-node eRTMAC NetworkX property graph with SQL entity blending.
"""
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Well, WellEvent, Document
from app.services.knowledge_graph_service import knowledge_graph_service, NODE_COLORS
from app.services.similarity import rank_similar_wells
from app.auth.dependencies import require_permission, AuthenticatedUser

router = APIRouter(prefix="/api", tags=["memory-graph"])


@router.get("/drilling-memory")
@router.get("/memory-graph")
def get_drilling_memory_default(
    radius_km: float = Query(50.0, description="Search radius km"),
    top_n: int = Query(8, description="Max similar wells to include"),
    user: AuthenticatedUser = Depends(require_permission("dashboard.view")),
    db: Session = Depends(get_db),
):
    """Build the NWIS Drilling Memory Graph for the current active well."""
    active_well = db.query(Well).filter(Well.is_active == True).first()
    well_id = active_well.well_id if active_well else "OIL-X123"
    return get_memory_graph(well_id_str=well_id, radius_km=radius_km, top_n=top_n, user=user, db=db)


@router.get("/memory-graph/{well_id_str}")
def get_memory_graph(
    well_id_str: str,
    radius_km: float = Query(50.0, description="Search radius km"),
    top_n: int = Query(8, description="Max similar wells to include"),
    user: AuthenticatedUser = Depends(require_permission("dashboard.view")),
    db: Session = Depends(get_db),
):
    """
    Build the NWIS Drilling Memory Graph for a given active well.
    Combines the deep NetworkX property graph (Interventions, Hazards, Outcomes, ReportSnippets)
    with SQL database entities for interactive knowledge network exploration.
    """
    # 1. Fetch graph from NetworkX knowledge graph service
    kg_data = knowledge_graph_service.get_subgraph_for_well(well_id_str, max_nodes=100)
    
    nodes = kg_data.get("nodes", [])
    edges = kg_data.get("edges", [])
    seen_node_ids = {n["id"] for n in nodes}

    # 2. Blend with SQL database records (ensuring active well and offset wells exist)
    anchor = db.query(Well).filter(Well.well_id == well_id_str).first()
    if not anchor:
        anchor = db.query(Well).filter(Well.is_active == True).first()

    if anchor:
        anchor_nid = f"well:{anchor.well_id}"
        if anchor_nid not in seen_node_ids:
            nodes.insert(0, {
                "id": anchor_nid,
                "type": "ACTIVE_WELL",
                "label": anchor.well_id,
                "sublabel": "Active Drilling Target",
                "color": NODE_COLORS["ACTIVE_WELL"],
                "formation": anchor.formation,
                "total_depth": anchor.total_depth,
                "trajectory_type": anchor.trajectory_type,
                "status": "ACTIVE",
                "description": f"{anchor.name} · {anchor.formation} · {anchor.total_depth}m TD",
                "val": 16,
            })
            seen_node_ids.add(anchor_nid)

        # Connect top similar offset wells from Saaty AHP engine
        ranked_offsets = rank_similar_wells(db, anchor, hazard="stuck_pipe", radius_km=radius_km, top_n=top_n)
        for r_idx, r in enumerate(ranked_offsets[:6]):
            ow_dict = r["well"]
            w_id = getattr(ow_dict, "well_id", None) or (ow_dict.get("well_id") if isinstance(ow_dict, dict) else "")
            w_name = getattr(ow_dict, "name", None) or (ow_dict.get("name") if isinstance(ow_dict, dict) else w_id)
            w_form = getattr(ow_dict, "formation", None) or (ow_dict.get("formation") if isinstance(ow_dict, dict) else "")
            w_td = getattr(ow_dict, "total_depth", None) or (ow_dict.get("total_depth") if isinstance(ow_dict, dict) else None)
            w_traj = getattr(ow_dict, "trajectory_type", None) or (ow_dict.get("trajectory_type") if isinstance(ow_dict, dict) else "")

            ow_nid = f"well:{w_id}"
            sim_score = r["overall_score"]
            is_top = (r_idx == 0)

            if ow_nid not in seen_node_ids:
                nodes.append({
                    "id": ow_nid,
                    "type": "OFFSET_WELL_TOP" if is_top else "OFFSET_WELL",
                    "label": w_id,
                    "sublabel": f"{sim_score:.0f}% AHP match",
                    "color": NODE_COLORS["OFFSET_WELL_TOP"] if is_top else NODE_COLORS["OFFSET_WELL"],
                    "formation": w_form,
                    "total_depth": w_td,
                    "trajectory_type": w_traj,
                    "similarity_score": round(sim_score / 100.0, 3),
                    "distance_km": r.get("distance_km", 3.4),
                    "description": f"{w_name} · {sim_score:.0f}% similarity via Saaty AHP",
                    "val": 12 if is_top else 8,
                })
                seen_node_ids.add(ow_nid)

            edges.append({
                "source": anchor_nid,
                "target": ow_nid,
                "type": "ANALOG_FOR_HAZARD",
                "label": f"{sim_score:.0f}% AHP",
                "weight": sim_score / 100.0,
            })

            # Connect historical events for offset
            ow_db = db.query(Well).filter(Well.well_id == w_id).first()
            if ow_db:
                events = db.query(WellEvent).filter(WellEvent.well_id == ow_db.id).limit(3).all()

                for evt in events:
                    evt_nid = f"event:{evt.id}"
                    if evt_nid not in seen_node_ids:
                        nodes.append({
                            "id": evt_nid,
                            "type": "EVENT",
                            "label": evt.event_type.replace("_", " "),
                            "sublabel": f"{evt.depth_start}m · {evt.severity}",
                            "color": NODE_COLORS["EVENT"],
                            "depth": evt.depth_start,
                            "formation": evt.formation,
                            "severity": evt.severity,
                            "description": evt.description[:200] if evt.description else f"{evt.event_type} at {evt.depth_start}m",
                            "val": 6,
                        })
                        seen_node_ids.add(evt_nid)

                    edges.append({
                        "source": ow_nid,
                        "target": evt_nid,
                        "type": "HAD_EVENT",
                        "label": f"@{evt.depth_start:.0f}m",
                        "weight": 0.8,
                    })

    # Type counts
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
            "engine": "eRTMAC NetworkX 4.0k Graph + Saaty AHP",
        },
    }
