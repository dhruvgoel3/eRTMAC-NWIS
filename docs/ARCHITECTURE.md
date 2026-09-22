# eRTMAC-NWIS — System Architecture

## Overview

**eRTMAC-NWIS** (Nearby Wells Intelligence System) is an AI-powered decision-support platform for drilling engineers. It surfaces historical well intelligence — events, geological formations, risk zones, and similar offset wells — to support real-time drilling decisions.

Developed as an **SIH 2024 Prototype** for Problem Statement 121 (Oil India Limited / Ministry of Petroleum).

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Tailwind CSS + Vite |
| Backend | FastAPI (Python 3.11) + SQLAlchemy |
| Database | Supabase PostgreSQL (hosted) |
| Maps | Leaflet.js + OpenStreetMap |
| Charts | Recharts |
| AI | OpenAI GPT-4o-mini (or demo fallback) |
| Storage | Supabase Storage |
| Auth | Supabase Auth (demo: no auth required) |

---

## Component Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND (React + Vite)                       │
│   localhost:5173                                                  │
│                                                                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │ Overview │  │ GIS Map  │  │Similarity│  │ AI Chat  │        │
│  │   Tab    │  │   Tab    │  │   Tab    │  │   Tab    │        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
│       │               │             │              │             │
│       └───────────────┴─────────────┴──────────────┘           │
│                              │                                    │
│                        api.ts (axios)                             │
└─────────────────────────────┬───────────────────────────────────┘
                               │ HTTP/REST
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                   BACKEND (FastAPI + Python)                      │
│   localhost:8000                                                  │
│                                                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ /api/wells  │  │/api/dashboard│  │  /api/ai    │             │
│  │  Router     │  │   Router    │  │   Router    │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│                                                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ GeoService  │  │ RiskEngine  │  │ AIService   │             │
│  │ Haversine   │  │ ZoneCalc    │  │ GPT/Demo    │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│                                                                   │
│  ┌─────────────┐  ┌─────────────┐                               │
│  │ Simulator   │  │ Similarity  │                               │
│  │ RealTime    │  │ Scoring     │                               │
│  └─────────────┘  └─────────────┘                               │
│                          │                                        │
│                     SQLAlchemy ORM                                │
└──────────────────────────┬──────────────────────────────────────┘
                            │ SSL/TLS
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│               SUPABASE POSTGRESQL (Cloud)                        │
│                                                                   │
│  wells         well_events     well_logs     documents           │
│  risk_zones    alerts          drilling_     document_           │
│                                parameters    chunks              │
│  simulation_state                                                 │
└─────────────────────────────────────────────────────────────────┘
                            │
                            │  (Data Ingestion Pipeline)
                            │
┌─────────────────────────────────────────────────────────────────┐
│                DATA INGESTION LAYER (Python scripts)             │
│                                                                   │
│  scripts/import_force2020.py   →  data/raw/force2020/           │
│  scripts/import_volve.py       →  data/raw/volve/               │
│  scripts/build_canonical_dataset.py                              │
│         ↓                                                         │
│  data/processed/canonical_wells.json   (13 public wells)        │
│  data/processed/canonical_wells.csv                              │
│  data/processed/dataset_summary.json                             │
│         ↓                                                         │
│  Supabase DB: wells + well_events + well_logs tables            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow: Current Well → Decision Support

```
1. Active Well (OIL-X123, Assam Basin)
        ↓
2. Geo Search: Haversine radius query (default 20km)
        ↓
3. Nearby Historical Wells found (50+ synthetic, 13 public)
        ↓
4. Similarity Scoring: Formation + Depth + Trajectory + Mud Weight
        ↓
5. Historical Events: MUD_LOSS, STUCK_PIPE, KICK, OVERPRESSURE, etc.
        ↓
6. Risk Zones: Depth-interval risk aggregation across offset wells
        ↓
7. Real-time Alerts: Triggered as simulation depth approaches risk zones
        ↓
8. AI Copilot: Evidence-backed responses citing specific wells & events
        ↓
9. Engineer Decision Support (recommended mud weight, casing, actions)
```

---

## Directory Structure

```
eRTMAC-NWIS/
├── frontend/               # React + TypeScript + Tailwind UI
│   └── src/
│       ├── components/     # Header, tabs, modals
│       ├── services/       # api.ts (all backend calls)
│       └── types.ts        # TypeScript interfaces
│
├── backend/                # FastAPI Python backend
│   ├── app/
│   │   ├── main.py         # App entrypoint, CORS, routers
│   │   ├── database.py     # Supabase PostgreSQL connection
│   │   ├── models/         # SQLAlchemy ORM models
│   │   ├── routers/        # API endpoint handlers
│   │   └── services/       # Business logic (geo, risk, AI, similarity)
│   ├── seed/               # Demo data generator (50 synthetic wells)
│   └── requirements.txt
│
├── data/
│   ├── raw/
│   │   ├── force2020/      # FORCE 2020 subset CSV (187KB)
│   │   └── volve/          # Equinor Volve deviation surveys (78KB)
│   └── processed/
│       ├── canonical_wells.json   # 13 normalized public wells
│       ├── canonical_wells.csv
│       └── dataset_summary.json  # Provenance + disclaimer
│
├── scripts/
│   ├── import_force2020.py        # FORCE 2020 ingestion
│   ├── import_volve.py            # Equinor Volve ingestion
│   ├── build_canonical_dataset.py # Master pipeline
│   ├── geo_utils.py               # UTM → WGS84 converter
│   └── run_ingestion.sh           # One-shot runner
│
├── docs/
│   ├── ARCHITECTURE.md     # This file
│   ├── DATA_INGESTION.md   # How to run ingestion
│   └── DATA_DICTIONARY.md  # Field definitions
│
├── .env.example            # Environment template
└── docker-compose.yml      # Container orchestration
```

---

## Key Design Decisions

1. **No microservices** — single FastAPI application handles all concerns
2. **No Kafka** — real-time simulation uses in-DB state polling (1.5s interval)
3. **No Kubernetes** — runs locally with `uvicorn` and `vite dev`
4. **Supabase-only database** — no SQLite fallback; Supabase is the sole DB
5. **AI fallback** — `DemoAIProvider` works without `OPENAI_API_KEY`
6. **Data provenance** — every record tagged with `source_dataset` and `license`

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | System status |
| GET | `/health` | Health check |
| GET | `/api/wells` | All wells (filterable) |
| GET | `/api/wells/active` | Current drilling well |
| GET | `/api/wells/nearby` | Wells within radius |
| GET | `/api/wells/{id}` | Single well dossier |
| GET | `/api/wells/{id}/similar` | Similarity-ranked offset wells |
| GET | `/api/wells/{id}/events` | Historical events |
| GET | `/api/wells/{id}/risk-zones` | Computed risk zones |
| GET | `/api/wells/{id}/parameters` | Drilling parameters |
| GET | `/api/dashboard/{id}` | Master dashboard data |
| GET | `/api/alerts/{well_id}` | Active alerts |
| POST | `/api/ai/chat` | AI copilot query |
| GET | `/api/simulation/state` | Simulation state |
| POST | `/api/simulation/start` | Start simulation |
| POST | `/api/simulation/pause` | Pause simulation |
| POST | `/api/simulation/reset` | Reset simulation |
| GET | `/api/datasets` | Dataset provenance inventory |
| GET | `/api/datasets/{source}` | Per-dataset detail |

---

## Public Datasets Used

| Dataset | Source | License | Wells |
|---------|--------|---------|-------|
| FORCE 2020 ML Benchmark | Zenodo 4351156 / NPD | NLOD 2.0 / CC-BY-4.0 | 6 |
| Equinor Volve | equinor.com/energy/volve-data-sharing | Equinor Open / CC-BY-4.0 | 7 |
| OIL Synthetic | Generated (demo) | Proprietary / Synthetic | 50 |

> **Disclaimer:** Public datasets are used strictly for research and educational purposes.
> They do not represent Oil India Limited confidential operational data.
