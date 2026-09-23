# eRTMAC-NWIS: Nearby Wells Intelligence System

### AI-Powered Offset Well Knowledge & Real-Time Decision Support Platform for Drilling Operations
**Smart India Hackathon (SIH) Prototype | Developed for Oil India Limited (Assam Basin Operations)**

> **One-Line Description:**  
> **NWIS connects the current drilling operation with historical knowledge from nearby and similar wells, identifies historically significant risk intervals, and uses AI to provide evidence-backed intelligence to drilling teams.**

---

## 👥 Who Uses NWIS? (3 Operational Personas)

```
                         NWIS
                          │
             ┌────────────┼────────────┐
             │            │            │
             ▼            ▼            ▼
       DRILLING       DRILLING     KNOWLEDGE
       ENGINEER      SUPERVISOR    ADMINISTRATOR
      (Primary ⭐)   (Oversight)   (Data & System)
```

1. **Drilling Engineer (Primary User ⭐):**  
   *"I am drilling this well right now. What happened in nearby wells, and what should I be aware of as I continue?"*  
   Uses: Live dashboard, GIS map, offset well dossier, similarity matrix, historical risk timeline, proactive alerts, "Why am I seeing this alert?" evidence, "Ask NWIS" AI assistant, and Drilling Memory Graph.

2. **Drilling Supervisor (Operational Oversight):**  
   *"What is happening across our drilling operations, and which risks require attention?"*  
   Uses: Multi-well oversight, risk monitoring, alert acknowledgements & escalations, well comparisons, operational analytics, and team audit logs.

3. **Knowledge Administrator (Data & System Management):**  
   *"Is the historical drilling knowledge available, structured, and accessible to the operational team?"*  
   Uses: Operator account management, RBAC role assignment, document ingestion (WCR/DDR/Mud Logs), vector chunking triggers, and audit logging.

---

## 🚀 Executive Summary

During active drilling operations in the Upper Assam Basin, unexpected downhole hazards—including **severe circulation loss (mud loss)**, **differential/mechanical stuck pipe**, **formation kicks**, and **destructive torque spikes**—cost millions of dollars in Non-Productive Time (NPT) and compromise wellbore integrity.

While Oil India Limited monitors real-time surface telemetry via **eRTMAC**, drilling engineers often lack immediate, structured access to decades of offset well history trapped in unstructured Daily Drilling Reports (DDR), Well Completion Reports (WCR), and mud logs.

**eRTMAC-NWIS transforms isolated historical drilling records into an active intelligence and decision-support network:**
1. **Real-Time Predictive Hazard Radar:** Proactively forecasts downhole risks 50m–300m ahead of the active bit based on offset well failures in matching stratigraphy.
2. **Deterministic Offset Well Similarity Engine:** Multi-factor scoring (Formation 30%, Depth 25%, Distance 20%, Trajectory 15%, Parameters 10%) identifying true analogue wells with mathematical precision (e.g. `OIL-X104`: 91% similarity).
3. **Historical Risk Engine & Standard Blueprints:** Classifies intervals into `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` risk zones with structured causal reasons and mandatory non-certainty operational disclaimers.
4. **"Ask NWIS" AI Assistant (Domain RAG):** Vector-indexed knowledge retrieval answering engineering questions with 5 mandatory evidence sections (Summary, Historical Evidence, Similar Wells, Risk Interpretation, Sources) and zero hallucination.
5. **NWIS Drilling Memory Graph:** Interactive knowledge graph visualizing deep multi-hop relationships: `Current Well → Similar Wells → Formation → Historical Events → Documents → Mitigations`.
6. **"Why Am I Seeing This Alert?" Instant Evidence:** Deep-dive modal correlating active alerts to historical incident logs, analogue wells, and source documents.
7. **Enterprise Role-Based Access Control (RBAC):** Realistic security layer with JWT tokens, permission matrices, audit logs, and 3 standard personas (`Drilling Engineer`, `Drilling Supervisor`, `Knowledge Admin`).
8. **Real-Time Drilling Telemetry Simulator:** Interactive playback engine with 1×, 5×, 10× speeds demonstrating dynamic risk alerts as the drill bit advances.

---

## 🛠️ Technology Stack

| Layer | Technologies & Standards |
|---|---|
| **Backend Framework** | FastAPI (Modular Domain Routers), Python 3.9+, SQLAlchemy 2.0 (`DeclarativeBase`), Pydantic v2 |
| **Data & Storage** | Supabase PostgreSQL with local SQLite automatic fallback; Universal cross-dialect `GUID` handling |
| **Authentication & RBAC** | JWT (HS256), bcrypt password hashing, Role & Permission matrix, persistent audit logging |
| **Frontend UI** | React 19, TypeScript, Vite, Vanilla CSS (**Arcadia Design System** — industrial control room theme) |
| **GIS & Mapping** | Leaflet, React-Leaflet, OpenStreetMap / CartoDB Dark Matter tiles, custom SVG markers |
| **Graph Visualization** | `react-force-graph-2d` for the NWIS Drilling Memory Graph |
| **Telemetry Charts** | Recharts (ROP, WOB, Torque, SPP depth horizons) |
| **AI & Retrieval (RAG)** | Dual-Engine Provider: `OpenAIProvider` (GPT-4o-mini) + `DemoAIProvider` (Deterministic offline ground truth) |

---

## ⚡ Quickstart Guide

### Prerequisites
- Python 3.9+ installed
- Node.js 18+ and npm installed

---

### Step 1: Backend Setup
```bash
cd backend

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run seed generator (50 synthetic wells, 234 events, 38 documents, 328 embedded chunks)
python seed/seed_data.py
python scripts/seed_auth.py

# Run automated tests (29 / 29 tests verify RBAC, Similarity, Risk, Schemas, and Ask NWIS)
PYTHONPATH=. pytest tests/ -v

# Start FastAPI server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
Backend API will be live at: **`http://localhost:8000`**  
Interactive Swagger Docs: **`http://localhost:8000/docs`**

---

### Step 2: Frontend Setup
In a separate terminal window:
```bash
cd frontend

# Install dependencies
npm install

# Verify production build
npm run build

# Start Vite dev server
npm run dev
```
Frontend Command Center will be live at: **`http://localhost:5173`**

---

## 👥 Default Demo Credentials (1-Click Login Available)

| Role | Email | Password | Access Level |
|---|---|---|---|
| **Drilling Engineer** | `engineer@nwis.demo` | `password123` | Operations Overview, GIS Map, Similarity Matrix, Drilling Events, Memory Graph, Ask NWIS, Simulator |
| **Drilling Supervisor** | `supervisor@nwis.demo` | `password123` | Engineer privileges + Alert escalations, Threshold overrides, Operational reporting |
| **Knowledge Admin** | `admin@nwis.demo` | `password123` | Supervisor privileges + User administration, Role management, Permission matrix, Audit logs |

---

## 🧪 Automated Verification Suite

Run all test suites across the application:
```bash
cd backend
PYTHONPATH=. venv/bin/pytest tests/ -v
```

Verified test coverage:
- `tests/test_ask_nwis.py` (10 tests): Vector search, 7 core operational questions, anti-hallucination guardrail, 5 mandatory response sections.
- `tests/test_auth_rbac.py` (7 tests): Login, JWT tokens, RBAC permissions, audit trail logging, user disablement.
- `tests/test_intelligence_engine.py` (5 tests): Deterministic similarity weights, OIL-X104 91% score, risk severity mapping, non-certainty disclaimers.
- `tests/test_schemas_and_routers.py` (7 tests): Modular domain routers, Pydantic v2 schemas, dataset provenance registries.

**Result: 29 / 29 tests passed.**

---

## ⚠️ Disclaimer
All drilling records, well geometries, telemetry logs, DDRs, and downhole events displayed in this application are **synthetic demonstration data** created specifically for the Smart India Hackathon evaluation.
