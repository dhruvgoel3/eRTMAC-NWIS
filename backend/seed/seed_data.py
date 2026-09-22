"""
eRTMAC-NWIS Seed Data Generator
================================
Loads from data/synthetic/nwis_canonical_dataset.json (Single Source of Truth)
and seeds Supabase PostgreSQL with:
- 10 formations
- 50 wells (OIL-X123 active, OIL-X104 most similar offset)
- 200+ drilling events
- 1000+ drilling parameter records
- 30+ synthetic reports (documents)
- 20+ risk zones
- Precomputed similarity scores
- Real-time demo alerts
- Initial simulation state
- Document chunks with embeddings for RAG

ALL DATA IS: "Synthetic Demo Data — Not Real OIL Data"
"""
from __future__ import annotations

import hashlib
import json
import os
import sys
from datetime import datetime
from pathlib import Path

# Add backend directory to sys.path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.database import Base, SessionLocal, engine
from app.models import (
    Alert,
    Document,
    DocumentChunk,
    DrillingParameter,
    Formation,
    RiskZone,
    SimilarityScore,
    SimulationState,
    Well,
    WellEvent,
    WellLog,
)

# ─── PATH TO CANONICAL DATASET ────────────────────────────────────────────────
CANONICAL_PATHS = [
    Path(__file__).resolve().parent.parent.parent / "data" / "synthetic" / "nwis_canonical_dataset.json",
    Path("data/synthetic/nwis_canonical_dataset.json"),
    Path("../data/synthetic/nwis_canonical_dataset.json"),
]


def load_canonical_dataset() -> dict:
    for p in CANONICAL_PATHS:
        if p.is_file():
            print(f"[Seed] Loading canonical dataset from: {p}")
            with open(p, "r", encoding="utf-8") as f:
                return json.load(f)

    raise FileNotFoundError(
        f"Could not find nwis_canonical_dataset.json in: {[str(p) for p in CANONICAL_PATHS]}. "
        "Please run 'python3 scripts/generate_synthetic_dataset.py' first."
    )


def parse_dt(dt_str: str | None) -> datetime | None:
    if not dt_str:
        return None
    try:
        return datetime.fromisoformat(dt_str.replace("Z", "+00:00")).replace(tzinfo=None)
    except Exception:
        return None


def create_tables():
    print("[Seed] Creating/verifying database tables...")
    Base.metadata.create_all(bind=engine)
    print("[Seed] Tables verified.")


def clear_tables(db):
    print("[Seed] Clearing existing tables...")
    db.query(SimulationState).delete()
    db.query(Alert).delete()
    db.query(RiskZone).delete()
    db.query(DrillingParameter).delete()
    db.query(DocumentChunk).delete()
    db.query(WellEvent).delete()
    db.query(Document).delete()
    db.query(SimilarityScore).delete()
    db.query(WellLog).delete()
    db.query(Well).delete()
    db.query(Formation).delete()
    db.commit()
    print("[Seed] Cleared existing tables.")


def seed_formations(db, formations_data: list[dict]) -> dict[str, Formation]:
    print(f"[Seed] Seeding {len(formations_data)} formations...")
    form_map = {}
    for f in formations_data:
        formation = Formation(
            name=f["name"],
            depth_min=f["depth_min"],
            depth_max=f["depth_max"],
            lithology=f.get("lithology"),
            age=f.get("age"),
            group=f.get("group"),
            typical_events=f.get("typical_events", []),
            mud_weight_min=f.get("mud_weight_min"),
            mud_weight_max=f.get("mud_weight_max"),
            avg_porosity=f.get("avg_porosity"),
            avg_permeability=f.get("avg_permeability"),
            color_hex=f.get("color_hex", "#888888"),
            description=f.get("description"),
            source_label=f.get("source_label", "Synthetic Demo Data — Not Real OIL Data"),
        )
        db.add(formation)
        form_map[f["name"]] = formation

    db.commit()
    print(f"[Seed] Successfully seeded {len(form_map)} formations.")
    return form_map


def seed_wells(db, wells_data: list[dict]) -> dict[str, Well]:
    print(f"[Seed] Seeding {len(wells_data)} wells...")
    for w in wells_data:
        well = Well(
            well_id=w["well_id"],
            name=w["name"],
            latitude=w["latitude"],
            longitude=w["longitude"],
            field=w.get("field"),
            formation=w.get("formation"),
            total_depth=w.get("total_depth"),
            well_type=w.get("well_type", "Development"),
            trajectory_type=w.get("trajectory_type", "DIRECTIONAL"),
            spud_date=parse_dt(w.get("spud_date")),
            completion_date=parse_dt(w.get("completion_date")),
            status=w.get("status", "COMPLETED"),
            is_active=w.get("is_active", False),
            mud_weight=w.get("mud_weight"),
            casing_program=w.get("casing_program"),
            cementing_notes=w.get("cementing_notes"),
            lessons_learned=w.get("lessons_learned"),
            operator=w.get("operator", "Oil India Limited"),
            source_dataset=w.get("source_dataset", "OIL_SYNTHETIC"),
            license=w.get("license", "Proprietary / Synthetic"),
            country=w.get("country", "India"),
            basin=w.get("basin", "Assam-Arakan"),
        )
        db.add(well)

    db.commit()
    wells_map = {w.well_id: w for w in db.query(Well).all()}
    print(f"[Seed] Successfully seeded {len(wells_map)} wells.")
    return wells_map


def seed_similarity_scores(db, similarity_data: list[dict], wells_map: dict[str, Well]):
    print(f"[Seed] Seeding {len(similarity_data)} precomputed similarity scores...")
    count = 0
    for s in similarity_data:
        ref_well = wells_map.get(s["reference_well_id"])
        off_well = wells_map.get(s["offset_well_id"])
        if not ref_well or not off_well:
            continue

        score = SimilarityScore(
            reference_well_id=ref_well.id,
            offset_well_id=off_well.id,
            overall_score=s["overall_score"],
            formation_score=s.get("formation_score", 0.0),
            depth_score=s.get("depth_score", 0.0),
            trajectory_score=s.get("trajectory_score", 0.0),
            distance_score=s.get("distance_score", 0.0),
            mud_weight_score=s.get("mud_weight_score", 0.0),
            event_pattern_score=s.get("event_pattern_score", 0.0),
            rank=s.get("rank", 0),
            explanation=s.get("explanation", []),
        )
        db.add(score)
        count += 1

    db.commit()
    print(f"[Seed] Successfully seeded {count} similarity scores.")


def seed_documents(db, docs_data: list[dict], wells_map: dict[str, Well]) -> dict[str, Document]:
    print(f"[Seed] Seeding {len(docs_data)} documents...")
    for d in docs_data:
        well = wells_map.get(d["well_id"])
        doc = Document(
            document_id=d["document_id"],
            document_type=d["document_type"],
            well_id=well.id if well else None,
            title=d["title"],
            date=parse_dt(d.get("date")),
            text_content=d["text_content"],
            depth_start=d.get("depth_start"),
            depth_end=d.get("depth_end"),
            formation=d.get("formation"),
            metadata_=d.get("metadata", {}),
        )
        db.add(doc)

    db.commit()
    doc_map = {d.document_id: d for d in db.query(Document).all()}
    print(f"[Seed] Successfully seeded {len(doc_map)} documents.")
    return doc_map


def seed_events(db, events_data: list[dict], wells_map: dict[str, Well], doc_map: dict[str, Document]):
    print(f"[Seed] Seeding {len(events_data)} events...")
    count = 0
    for e in events_data:
        well = wells_map.get(e["well_id"])
        if not well:
            continue

        doc_ref = e.get("doc_ref")
        doc = doc_map.get(doc_ref) if doc_ref else None

        ev = WellEvent(
            well_id=well.id,
            event_type=e["event_type"],
            depth_start=e["depth_start"],
            depth_end=e.get("depth_end"),
            formation=e.get("formation"),
            severity=e.get("severity", "MEDIUM"),
            description=e.get("description"),
            root_cause=e.get("root_cause"),
            mitigation=e.get("mitigation"),
            npt_hours=e.get("npt_hours", 0.0),
            confidence=e.get("confidence", 0.9),
            event_date=parse_dt(e.get("event_date")),
            document_id=doc.id if doc else None,
            source_dataset="OIL_SYNTHETIC",
        )
        db.add(ev)
        count += 1

    db.commit()
    print(f"[Seed] Successfully seeded {count} events.")


def seed_drilling_parameters(db, params_data: list[dict], wells_map: dict[str, Well]):
    print(f"[Seed] Seeding {len(params_data)} drilling parameters...")
    batch = []
    for p in params_data:
        well = wells_map.get(p["well_id"])
        if not well:
            continue

        param = DrillingParameter(
            well_id=well.id,
            timestamp=parse_dt(p.get("timestamp")),
            depth=p["depth"],
            rop=p.get("rop"),
            wob=p.get("wob"),
            rpm=p.get("rpm"),
            torque=p.get("torque"),
            pressure=p.get("pressure"),
            mud_flow=p.get("mud_flow"),
            hook_load=p.get("hook_load"),
            inclination=p.get("inclination"),
            azimuth=p.get("azimuth"),
            mud_weight=p.get("mud_weight"),
        )
        batch.append(param)
        if len(batch) >= 500:
            db.bulk_save_objects(batch)
            db.commit()
            batch = []

    if batch:
        db.bulk_save_objects(batch)
        db.commit()

    total = db.query(DrillingParameter).count()
    print(f"[Seed] Successfully seeded {total} drilling parameters.")


def seed_risk_zones(db, rz_data: list[dict], wells_map: dict[str, Well]):
    print(f"[Seed] Seeding {len(rz_data)} risk zones...")
    count = 0
    for r in rz_data:
        active_well = wells_map.get(r["active_well_id"])
        if not active_well:
            continue

        src_refs = r.get("source_well_ids_ref", [])
        src_ids = [wells_map[w].id for w in src_refs if w in wells_map]

        rz = RiskZone(
            active_well_id=active_well.id,
            event_type=r["event_type"],
            depth_start=r["depth_start"],
            depth_end=r["depth_end"],
            formation=r.get("formation"),
            risk_score=r.get("risk_score", 50.0),
            severity=r.get("severity", "MEDIUM"),
            evidence_count=r.get("evidence_count", len(src_ids)),
            explanation=r.get("explanation"),
            source_well_ids=src_ids,
        )
        db.add(rz)
        count += 1

    db.commit()
    print(f"[Seed] Successfully seeded {count} risk zones.")


def seed_alerts(db, wells_map: dict[str, Well]):
    print("[Seed] Seeding initial alerts for active well...")
    active_well = wells_map.get("OIL-X123")
    if not active_well:
        return

    alerts_data = [
        {
            "alert_type": "RISK_APPROACHING",
            "severity": "HIGH",
            "depth": 3050.0,
            "message": "APPROACHING MUD LOSS RISK ZONE (3090-3155m in Tipam). Standby LCM pill.",
            "explanation": (
                "4 offset wells experienced mud loss in this exact depth interval. "
                "OIL-X104 (91% similar) lost returns at 3120m (8.5 hrs NPT). "
                "X101 (3095m) and X106 (3090m) also experienced losses."
            ),
            "evidence": [
                {"well_id": "OIL-X104", "event": "MUD_LOSS", "depth": 3120, "severity": "MEDIUM", "npt_hrs": 8.5},
                {"well_id": "OIL-X101", "event": "MUD_LOSS", "depth": 3095, "severity": "MEDIUM", "npt_hrs": 6.5},
                {"well_id": "OIL-X106", "event": "MUD_LOSS", "depth": 3090, "severity": "MEDIUM", "npt_hrs": 7.0},
                {"well_id": "OIL-X102", "event": "MUD_LOSS", "depth": 3130, "severity": "LOW", "npt_hrs": 4.0},
            ],
        },
        {
            "alert_type": "RISK_APPROACHING",
            "severity": "CRITICAL",
            "depth": 3050.0,
            "message": "CRITICAL STUCK PIPE HAZARD at 3180-3310m. Review overbalance protocol.",
            "explanation": (
                "OIL-X104 suffered differential sticking at 3280m requiring 16 hrs NPT and spotting pills. "
                "OIL-X106 experienced 24 hrs NPT sticking at 3260m. Overbalance exceeds 400 psi in permeable Tipam."
            ),
            "evidence": [
                {"well_id": "OIL-X104", "event": "STUCK_PIPE", "depth": 3280, "severity": "HIGH", "npt_hrs": 16.0},
                {"well_id": "OIL-X106", "event": "STUCK_PIPE", "depth": 3260, "severity": "CRITICAL", "npt_hrs": 24.0},
                {"well_id": "OIL-X101", "event": "STUCK_PIPE", "depth": 3210, "severity": "HIGH", "npt_hrs": 18.0},
            ],
        },
    ]

    for a in alerts_data:
        alert = Alert(
            well_id=active_well.id,
            alert_type=a["alert_type"],
            severity=a["severity"],
            depth=a["depth"],
            message=a["message"],
            explanation=a["explanation"],
            evidence=a["evidence"],
            acknowledged=False,
        )
        db.add(alert)

    db.commit()
    print(f"[Seed] Seeded {len(alerts_data)} initial alerts.")


def seed_simulation_state(db, wells_map: dict[str, Well]):
    print("[Seed] Initializing simulation state...")
    active_well = wells_map.get("OIL-X123")
    if not active_well:
        return

    state = SimulationState(
        id=1,
        active_well_id=active_well.id,
        current_depth=3050.0,
        is_running=False,
        speed_multiplier=1,
        start_depth=3050.0,
        current_rop=12.4,
        current_wob=14.2,
        current_rpm=110.0,
        current_torque=18.2,
        current_pressure=2850.0,
        current_mud_flow=1620.0,
        current_hook_load=185.0,
        current_inclination=8.5,
        current_azimuth=142.0,
    )
    db.add(state)
    db.commit()
    print("[Seed] Simulation state initialized at 3050.0m.")


def seed_document_chunks(db, doc_map: dict[str, Document]):
    print("[Seed] Seeding document chunks with embeddings for RAG...")
    chunks = []
    for doc_id_str, doc in doc_map.items():
        if not doc.text_content:
            continue

        paragraphs = [p.strip() for p in doc.text_content.split("\n\n") if len(p.strip()) > 50]
        for i, para in enumerate(paragraphs):
            h = hashlib.md5(para.encode("utf-8")).hexdigest()
            # 64-dim pseudo-embedding
            embedding = [int(h[j % len(h)], 16) / 15.0 for j in range(64)]

            chunk = DocumentChunk(
                document_id=doc.id,
                chunk_index=i,
                chunk_text=para,
                embedding=embedding,
                depth_context=doc.depth_start,
                formation_context=doc.formation,
                event_type_context=None,
            )
            chunks.append(chunk)

    db.bulk_save_objects(chunks)
    db.commit()
    total_chunks = db.query(DocumentChunk).count()
    print(f"[Seed] Successfully seeded {total_chunks} document chunks.")


def main():
    print("=" * 65)
    print("eRTMAC-NWIS: Database Seed Script")
    print("ALL DATA IS: Synthetic Demo Data — Not Real OIL Data")
    print("=" * 65)

    dataset = load_canonical_dataset()
    create_tables()

    db = SessionLocal()
    try:
        clear_tables(db)

        formations_map = seed_formations(db, dataset.get("formations", []))
        wells_map = seed_wells(db, dataset.get("wells", []))
        seed_similarity_scores(db, dataset.get("similarity_scores", []), wells_map)
        doc_map = seed_documents(db, dataset.get("documents", []), wells_map)
        seed_events(db, dataset.get("events", []), wells_map, doc_map)
        seed_drilling_parameters(db, dataset.get("drilling_parameters", []), wells_map)
        seed_risk_zones(db, dataset.get("risk_zones", []), wells_map)
        seed_alerts(db, wells_map)
        seed_simulation_state(db, wells_map)
        seed_document_chunks(db, doc_map)

        print()
        print("=" * 65)
        print("✅ SEED COMPLETED SUCCESSFULLY!")
        print("=" * 65)
        print(f"  Formations:          {db.query(Formation).count()} (target: 10)")
        print(f"  Wells:               {db.query(Well).count()} (target: 50)")
        print(f"  Events:              {db.query(WellEvent).count()} (target: 200+)")
        print(f"  Drilling Parameters: {db.query(DrillingParameter).count()} (target: 1000+)")
        print(f"  Documents:           {db.query(Document).count()} (target: 30+)")
        print(f"  Risk Zones:          {db.query(RiskZone).count()} (target: 20+)")
        print(f"  Similarity Scores:   {db.query(SimilarityScore).count()} (target: 8+)")
        print(f"  Document Chunks:     {db.query(DocumentChunk).count()}")
        print(f"  Alerts:              {db.query(Alert).count()}")
        print("=" * 65)

    finally:
        db.close()


if __name__ == "__main__":
    main()
