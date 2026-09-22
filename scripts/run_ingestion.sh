#!/usr/bin/env bash
# =============================================================================
# scripts/run_ingestion.sh
# =============================================================================
# One-shot reproducible ingestion pipeline for eRTMAC-NWIS.
#
# Usage:
#   bash scripts/run_ingestion.sh           # Full pipeline (files + DB)
#   bash scripts/run_ingestion.sh --skip-db # Files only (no DB connection)
#
# What this does:
#   1. Activates the backend virtual environment
#   2. Sets PYTHONPATH so backend imports resolve correctly
#   3. Generates raw CSV subsets from FORCE 2020 and Equinor Volve public datasets
#   4. Normalizes into canonical JSON/CSV in data/processed/
#   5. Upserts wells, events, and well_logs into Supabase (unless --skip-db)
#
# Prerequisites:
#   - backend/venv/ must exist: cd backend && python3 -m venv venv && pip install -r requirements.txt
#   - backend/.env must have DATABASE_URL set (for DB ingest)
# =============================================================================

set -euo pipefail

# Resolve script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo ""
echo "================================================================="
echo "  eRTMAC-NWIS: Data Ingestion Pipeline"
echo "  Project root: $PROJECT_ROOT"
echo "================================================================="
echo ""

# ── Locate and activate the Python virtual environment ────────────────────────
VENV_PATH="$PROJECT_ROOT/backend/venv"

if [ ! -d "$VENV_PATH" ]; then
    echo "[ERROR] Virtual environment not found at: $VENV_PATH"
    echo ""
    echo "Please create it first:"
    echo "  cd $PROJECT_ROOT/backend"
    echo "  python3 -m venv venv"
    echo "  source venv/bin/activate"
    echo "  pip install -r requirements.txt"
    exit 1
fi

echo "[Setup] Activating virtual environment: $VENV_PATH"
# shellcheck source=/dev/null
source "$VENV_PATH/bin/activate"

# ── Set PYTHONPATH so backend + scripts imports resolve ───────────────────────
export PYTHONPATH="$PROJECT_ROOT/backend:$PROJECT_ROOT/scripts:${PYTHONPATH:-}"
echo "[Setup] PYTHONPATH=$PYTHONPATH"
echo ""

# ── Ensure data directories exist ─────────────────────────────────────────────
mkdir -p "$PROJECT_ROOT/data/raw/force2020"
mkdir -p "$PROJECT_ROOT/data/raw/volve"
mkdir -p "$PROJECT_ROOT/data/processed"

# ── Run the master ingestion pipeline ─────────────────────────────────────────
echo "[Pipeline] Running: build_canonical_dataset.py $*"
echo ""

cd "$PROJECT_ROOT"
python scripts/build_canonical_dataset.py "$@"

echo ""
echo "================================================================="
echo "  Output files:"
echo "    data/raw/force2020/force2020_subset.csv"
echo "    data/raw/volve/volve_deviation_surveys.csv"
echo "    data/processed/canonical_wells.json"
echo "    data/processed/canonical_wells.csv"
echo "    data/processed/dataset_summary.json"
echo "================================================================="
echo ""
