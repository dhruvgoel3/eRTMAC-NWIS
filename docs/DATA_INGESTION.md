# eRTMAC-NWIS — Data Ingestion Guide

## Overview

The data ingestion pipeline normalizes public drilling datasets into the NWIS canonical format
and loads them into Supabase PostgreSQL. All records preserve their original source attribution.

---

## Public Datasets

### 1. FORCE 2020 ML Benchmark

| Field | Value |
|-------|-------|
| **Source** | Zenodo Record 4351156 |
| **URL** | https://zenodo.org/records/4351156 |
| **GitHub** | https://github.com/bolgebrygg/Force-2020-Machine-Learning-competition |
| **License** | Norwegian License for Open Government Data (NLOD) 2.0 / CC-BY-4.0 |
| **Region** | Norwegian North Sea |
| **Wells used** | 6 representative benchmark wells |
| **Data** | Well logs: GR, RHOB, NPHI, RDEP, PEF, DTC; Formation; Lithofacies |

**Prototype uses a reproducible subset**: if `data/raw/force2020/train.csv` is not present,
the pipeline generates a synthetic-but-structurally-valid subset matching the FORCE 2020 schema.

To use the real FORCE 2020 dataset:
1. Download `train.csv` from https://zenodo.org/records/4351156
2. Place it at `data/raw/force2020/train.csv`
3. Re-run the ingestion pipeline

---

### 2. Equinor Volve Field

| Field | Value |
|-------|-------|
| **Source** | Equinor Open Data |
| **URL** | https://www.equinor.com/energy/volve-data-sharing |
| **License** | Equinor Open Data Licence / CC-BY-4.0 |
| **Region** | Norwegian North Sea, Block 15/9 |
| **Wells used** | 7 production and appraisal wellbores |
| **Data** | Deviation surveys: MD, TVD, Inclination, Azimuth, Formation |

**Prototype uses a reproducible subset**: if `data/raw/volve/volve_deviation_surveys.csv`
is not present, the pipeline generates trajectory surveys matching the Volve wellbore geometry.

To use real Volve data, download the deviation survey files from Equinor's portal and place them
in `data/raw/volve/`.

---

### 3. OIL Synthetic (Demo)

50 synthetic wells clustered around coordinates 27.2°N, 95.1°E (Assam Basin region).
These are deterministically generated from `backend/seed/seed_data.py` using a fixed random seed.
They represent realistic Assam-Arakan Basin formations: Tipam, Barail, Kopili, Sylhet, etc.

> **Disclaimer:** Synthetic data does not represent actual Oil India Limited operational data.

---

## Running the Ingestion Pipeline

### Prerequisites

```bash
# 1. Ensure Python 3.10+ is installed
python3 --version

# 2. Backend venv must exist
cd /path/to/eRTMAC-NWIS/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 3. backend/.env must have DATABASE_URL set
cat backend/.env
```

### Option A: One-shot shell script (recommended)

```bash
cd /path/to/eRTMAC-NWIS
bash scripts/run_ingestion.sh
```

This script:
1. Activates the backend virtual environment
2. Sets PYTHONPATH so imports resolve correctly
3. Generates raw CSV subsets (if not already present)
4. Normalizes into canonical JSON/CSV
5. Upserts wells and well_logs into Supabase

### Option B: Manual step-by-step

```bash
cd /path/to/eRTMAC-NWIS
source backend/venv/bin/activate
export PYTHONPATH="$PWD/backend:$PWD/scripts"

# Step 1: Generate/process FORCE 2020 subset
python scripts/import_force2020.py

# Step 2: Generate/process Equinor Volve subset
python scripts/import_volve.py

# Step 3: Build unified canonical dataset and load DB
python scripts/build_canonical_dataset.py
```

### Option C: File-only mode (no DB)

```bash
python scripts/build_canonical_dataset.py --skip-db
```

Produces only `data/processed/` files without touching the database.

---

## Output Files

| File | Description |
|------|-------------|
| `data/raw/force2020/force2020_subset.csv` | Raw FORCE 2020 log data (semicolon-delimited) |
| `data/raw/volve/volve_deviation_surveys.csv` | Volve deviation surveys |
| `data/processed/force2020_canonical.json` | FORCE 2020 normalized wells |
| `data/processed/volve_canonical.json` | Volve normalized wells |
| `data/processed/canonical_wells.json` | All 13 public wells unified |
| `data/processed/canonical_wells.csv` | CSV version for spreadsheet tools |
| `data/processed/dataset_summary.json` | Counts, depth ranges, formations |

---

## Database Tables Populated

| Table | Records | Source |
|-------|---------|--------|
| `wells` | 63 | 50 synthetic + 6 FORCE + 7 Volve |
| `well_events` | 200+ | Seed + 1 per imported public well |
| `well_logs` | ~1,680 | FORCE 2020 depth-series log records |
| `risk_zones` | Auto-computed | Derived from events during simulation |
| `alerts` | Auto-generated | Real-time as simulation progresses |

---

## Canonical Well Schema

Every normalized well in the NWIS system has these mandatory fields:

```json
{
  "well_id": "FORCE-15/9-13",
  "name": "FORCE 15/9-13",
  "original_name": "15/9-13",
  "source_dataset": "FORCE_2020",
  "operator": "FORCE 2020 Benchmark Consortium (NPD)",
  "license": "Norwegian License for Open Government Data (NLOD) 2.0 / CC-BY-4.0",
  "country": "Norway",
  "basin": "Norwegian North Sea",
  "field": "Sleipner East Area",
  "formation": "Hugin Fm.",
  "lithology": "Sandstone",
  "total_depth": 3250.0,
  "trajectory_type": "DIRECTIONAL",
  "latitude": 58.446168,
  "longitude": 1.890022,
  "x_coord": 435210.0,
  "y_coord": 6478920.0,
  "utm_zone": "31N",
  "well_type": "Exploration / Benchmark",
  "status": "COMPLETED",
  "mud_weight": 11.2
}
```

---

## Coordinate System

North Sea wells use **UTM Zone 31N** (EPSG:32631). The `geo_utils.py` script converts
these to WGS84 decimal degrees using a pure-Python implementation accurate to <0.5 meters.

Assam Basin synthetic wells are stored directly in WGS84.

---

## Reproducibility

The ingestion pipeline is fully reproducible:

1. Raw subset CSVs are generated deterministically if not already present
2. Seed script uses `random.seed(42)` for deterministic synthetic data
3. All UTM→WGS84 conversions use the same WGS84 ellipsoid constants
4. Upsert logic (not insert) prevents duplicate records on re-runs

```bash
# Running twice produces identical results:
bash scripts/run_ingestion.sh
bash scripts/run_ingestion.sh  # No duplicates
```
