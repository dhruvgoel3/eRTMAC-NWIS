"""
Datasets & Provenance API Router
Provides public and synthetic dataset provenance, citations, licenses, and inventory stats.
"""
from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models import Well, WellEvent
from app.models.well_log import WellLog

router = APIRouter(prefix="/api/datasets", tags=["datasets"])

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


@router.get("")
def get_datasets(db: Session = Depends(get_db)):
    """
    Returns provenance inventory of all ingested datasets with counts and attribution.
    """
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

    total = db.query(func.count(Well.id)).scalar() or 0

    return {
        "total_wells_in_db": total,
        "datasets": result,
        "note": "All public datasets are used strictly for research and educational purposes.",
    }


@router.get("/{source_code}")
def get_dataset_detail(source_code: str, db: Session = Depends(get_db)):
    """
    Returns detailed provenance and sample wells for a specific source dataset.
    """
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
