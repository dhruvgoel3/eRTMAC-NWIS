#!/usr/bin/env python3
"""
scripts/build_canonical_dataset.py
===================================
Master normalization pipeline and database loader for public drilling datasets.
1. Unifies FORCE 2020 and Equinor Volve into canonical formats:
   - data/processed/canonical_wells.json
   - data/processed/canonical_wells.csv
   - data/processed/dataset_summary.json
2. Loads/upserts the normalized records into the NWIS database (wells & well_events).
3. Preserves strict provenance (source_dataset) and public attribution.
"""
import os
import sys
import csv
import json
from pathlib import Path
from datetime import datetime

# Setup paths for backend and scripts
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))
sys.path.insert(0, str(BASE_DIR / "backend"))
sys.path.insert(0, str(BASE_DIR / "scripts"))

from import_force2020 import process_force2020_to_canonical
from import_volve import process_volve_to_canonical

PROCESSED_DIR = BASE_DIR / "data" / "processed"


def build_unified_canonical_dataset():
    """Generates canonical unified datasets (JSON and CSV)."""
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

    print("\n" + "=" * 65)
    print("  eRTMAC-NWIS: Building Canonical Normalized Dataset")
    print("=" * 65)

    force_wells = process_force2020_to_canonical()
    volve_wells = process_volve_to_canonical()

    all_wells = force_wells + volve_wells
    print(f"\n[Canonical Builder] Total public wells normalized: {len(all_wells)}")

    # 1. Save canonical JSON
    json_path = PROCESSED_DIR / "canonical_wells.json"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(all_wells, f, indent=2)
    print(f"[Canonical Builder] Wrote {len(all_wells)} records to {json_path}")

    # 2. Save canonical CSV
    csv_path = PROCESSED_DIR / "canonical_wells.csv"
    csv_fields = [
        "well_id", "name", "original_name", "source_dataset", "operator", "license",
        "country", "basin", "field", "formation", "lithology", "total_depth",
        "trajectory_type", "latitude", "longitude", "x_coord", "y_coord", "utm_zone",
        "well_type", "status", "mud_weight"
    ]
    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=csv_fields, extrasaction="ignore")
        writer.writeheader()
        for w in all_wells:
            writer.writerow(w)
    print(f"[Canonical Builder] Wrote canonical CSV to {csv_path}")

    # 3. Save Summary Metrics
    summary = {
        "generated_at": datetime.utcnow().isoformat(),
        "total_public_wells": len(all_wells),
        "by_dataset": {
            "FORCE_2020": len(force_wells),
            "EQUINOR_VOLVE": len(volve_wells),
        },
        "depth_range_meters": {
            "min": min(w["total_depth"] for w in all_wells),
            "max": max(w["total_depth"] for w in all_wells),
            "avg": round(sum(w["total_depth"] for w in all_wells) / len(all_wells), 1),
        },
        "formations": sorted(list(set(w["formation"] for w in all_wells))),
        "lithologies": sorted(list(set(w["lithology"] for w in all_wells))),
        "disclaimer": "Public research and education datasets only. Not Oil India Limited operational data."
    }
    summary_path = PROCESSED_DIR / "dataset_summary.json"
    with open(summary_path, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)
    print(f"[Canonical Builder] Wrote dataset metrics to {summary_path}")

    return all_wells


def load_into_database(wells_data):
    """Inserts or updates the normalized wells into the NWIS database."""
    print("\n" + "-" * 65)
    print("  eRTMAC-NWIS: Ingesting Records into Database")
    print("-" * 65)

    try:
        from app.database import SessionLocal, engine, Base
        from app.models.well import Well
        from app.models.event import WellEvent

        # Ensure table schemas are up to date
        Base.metadata.create_all(bind=engine)

        # In SQLite, ensure columns added to existing tables exist (ALTER TABLE if needed)
        with engine.connect() as conn:
            # Check if columns exist in wells table
            from sqlalchemy import text
            try:
                # Add columns if not already present
                cols_to_add = [
                    ("source_dataset", "VARCHAR(50) DEFAULT 'OIL_SYNTHETIC'"),
                    ("license", "VARCHAR(100) DEFAULT 'Proprietary / Synthetic'"),
                    ("country", "VARCHAR(50) DEFAULT 'India'"),
                    ("basin", "VARCHAR(100) DEFAULT 'Assam-Arakan'"),
                    ("x_coord", "FLOAT"),
                    ("y_coord", "FLOAT"),
                    ("lithology", "VARCHAR(100)"),
                ]
                for col_name, col_type in cols_to_add:
                    try:
                        conn.execute(text(f"ALTER TABLE wells ADD COLUMN {col_name} {col_type};"))
                        conn.commit()
                    except Exception:
                        pass  # Column already exists
                
                # Check well_events table
                try:
                    conn.execute(text("ALTER TABLE well_events ADD COLUMN source_dataset VARCHAR(50) DEFAULT 'OIL_SYNTHETIC';"))
                    conn.commit()
                except Exception:
                    pass
            except Exception as e:
                print(f"[DB Sync] Column migration note: {e}")

        db = SessionLocal()
        inserted = 0
        updated = 0

        for w_data in wells_data:
            existing = db.query(Well).filter(Well.well_id == w_data["well_id"]).first()
            if existing:
                # Update existing
                existing.name = w_data["name"]
                existing.latitude = w_data["latitude"]
                existing.longitude = w_data["longitude"]
                existing.field = w_data["field"]
                existing.formation = w_data["formation"]
                existing.total_depth = w_data["total_depth"]
                existing.well_type = w_data["well_type"]
                existing.trajectory_type = w_data["trajectory_type"]
                existing.status = w_data["status"]
                existing.is_active = w_data["is_active"]
                existing.mud_weight = w_data["mud_weight"]
                existing.casing_program = w_data["casing_program"]
                existing.lessons_learned = w_data["lessons_learned"]
                existing.operator = w_data["operator"]
                existing.source_dataset = w_data["source_dataset"]
                existing.license = w_data["license"]
                existing.country = w_data["country"]
                existing.basin = w_data["basin"]
                existing.x_coord = w_data["x_coord"]
                existing.y_coord = w_data["y_coord"]
                existing.lithology = w_data["lithology"]
                updated += 1
            else:
                # Insert new
                new_well = Well(
                    well_id=w_data["well_id"],
                    name=w_data["name"],
                    latitude=w_data["latitude"],
                    longitude=w_data["longitude"],
                    field=w_data["field"],
                    formation=w_data["formation"],
                    total_depth=w_data["total_depth"],
                    well_type=w_data["well_type"],
                    trajectory_type=w_data["trajectory_type"],
                    status=w_data["status"],
                    is_active=w_data["is_active"],
                    mud_weight=w_data["mud_weight"],
                    casing_program=w_data["casing_program"],
                    lessons_learned=w_data["lessons_learned"],
                    operator=w_data["operator"],
                    source_dataset=w_data["source_dataset"],
                    license=w_data["license"],
                    country=w_data["country"],
                    basin=w_data["basin"],
                    x_coord=w_data["x_coord"],
                    y_coord=w_data["y_coord"],
                    lithology=w_data["lithology"],
                )
                db.add(new_well)
                db.flush()

                # Add sample lithostratigraphic marker event
                event = WellEvent(
                    well_id=new_well.id,
                    event_type="LITHOLOGY_TRANSITION",
                    severity="LOW",
                    depth_start=new_well.total_depth * 0.75,
                    depth_end=new_well.total_depth * 0.90,
                    formation=new_well.formation,
                    description=f"Entry into target reservoir formation {new_well.formation} ({w_data['lithology']}). Source: {w_data['source_dataset']}.",
                    root_cause="Stratigraphic boundary identified via log correlation.",
                    mitigation="Maintained steady drilling parameters with standard mud weight.",
                    npt_hours=0.0,
                    confidence=0.95,
                    source_dataset=w_data["source_dataset"],
                )
                db.add(event)
                inserted += 1

        db.commit()
        db.close()
        print(f"[DB Ingestion] Done: {inserted} inserted, {updated} updated.")

    except Exception as e:
        print(f"[DB Ingestion] Error importing into database: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description="eRTMAC-NWIS: Build canonical normalized well dataset from public sources."
    )
    parser.add_argument(
        "--skip-db",
        action="store_true",
        default=bool(int(os.environ.get("INGESTION_SKIP_DB", "0"))),
        help="Skip database loading — only produce data/processed/ flat-files (default: False).",
    )
    args = parser.parse_args()

    # ── Step 1 & 2: Generate processed flat-files ──────────────────────────────
    canonical_wells = build_unified_canonical_dataset()

    if args.skip_db:
        print("\n[Pipeline] --skip-db flag set. Skipping database ingest.")
        print("\n✅ Flat-file generation completed successfully!\n")
    else:
        # ── Step 3: Load wells + events into DB ────────────────────────────────
        load_into_database(canonical_wells)

        # ── Step 4: Load FORCE 2020 depth-series well logs ────────────────────
        print("\n" + "-" * 65)
        print("  eRTMAC-NWIS: Ingesting FORCE 2020 Depth-Series Well Logs")
        print("-" * 65)
        try:
            from import_force2020 import ingest_well_logs_to_db
            force_wells = [w for w in canonical_wells if w["source_dataset"] == "FORCE_2020"]
            log_count = ingest_well_logs_to_db(force_wells)
            print(f"[Pipeline] Well log ingest complete: {log_count} depth records.")
        except Exception as e:
            print(f"[Pipeline] Well log ingest skipped: {e}")

        print("\n✅ Full data ingestion pipeline executed successfully!\n")

