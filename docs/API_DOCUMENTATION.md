# eRTMAC-NWIS: REST API Specification & Reference

**Base URL:** `http://localhost:8000`  
**Interactive Swagger UI:** `http://localhost:8000/docs`  
**OpenAPI JSON Specification:** `http://localhost:8000/openapi.json`  

All requests to protected endpoints require an `Authorization: Bearer <token>` header containing a valid HS256 JWT issued by `/api/auth/login`.

---

## 1. Authentication & Identity (`/api/auth`)

### `POST /api/auth/login`
Authenticates a user and issues a JSON Web Token.
- **Access:** Public
- **Request Body:**
  ```json
  {
    "email": "engineer@nwis.demo",
    "password": "password123"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "token_type": "bearer",
    "user": {
      "id": "uuid-v4",
      "email": "engineer@nwis.demo",
      "full_name": "Rajesh Bora",
      "role": "DRILLING_ENGINEER",
      "permissions": ["wells.view", "ai.query", "alerts.view", "simulation.control"]
    }
  }
  ```

### `GET /api/auth/me`
Retrieves profile and active permissions for the authenticated session.
- **Access:** Any authenticated user (`Bearer <token>`)

---

## 2. Operations Dashboard & KPIs (`/api/dashboard`)

### `GET /api/dashboard/summary`
Returns operational KPIs, active well telemetry, and high-risk zone counts.
- **Required Permission:** `wells.view`
- **Response (200 OK):**
  ```json
  {
    "active_well_id": "OIL-X123",
    "current_depth": 3050.0,
    "formation": "Tipam",
    "kpis": {
      "nearby_wells_count": 50,
      "historical_events_count": 234,
      "high_risk_zones_count": 21,
      "top_similarity_score": 91.0
    },
    "simulation": {
      "is_running": false,
      "current_depth": 3050.0,
      "current_rop": 14.2,
      "current_torque": 16.5,
      "speed_multiplier": 1
    }
  }
  ```

---

## 3. Offset Well Similarity Engine (`/api/similarity`)

### `GET /api/similarity/offset-scores`
Calculates deterministic multi-factor similarity between active well and offset wells.
- **Parameters:** `reference_well_id` (default: `OIL-X123`), `limit` (default: 10)
- **Response (200 OK):**
  ```json
  [
    {
      "well_id": "OIL-X104",
      "similarity_score": 0.91,
      "similarity_percent": 91.0,
      "rank": 1,
      "factor_breakdown": {
        "formation": 0.96,
        "depth": 0.91,
        "distance": 0.88,
        "trajectory": 0.82,
        "parameters": 0.95
      },
      "distance_km": 3.42,
      "formation": "Tipam",
      "total_depth": 3520.0
    }
  ]
  ```

---

## 4. "Ask NWIS" AI Assistant (`/api/ai`)

### `POST /api/ai/query`
Natural language decision-support query engine returning evidence-backed responses with 5 mandatory sections.
- **Required Permission:** `ai.query`
- **Request Body:**
  ```json
  {
    "question": "Why is the 3180-3290m interval risky?",
    "current_depth": 3050.0,
    "well_id": "OIL-X123",
    "formation": "Tipam"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "summary": "The 3,180m–3,290m depth interval is classified as a CRITICAL historical stuck pipe risk zone (Score: 92/100)...",
    "historical_evidence": [
      { "well_id": "OIL-X104", "event": "Stuck Pipe", "depth": 3280.0, "severity": "HIGH" },
      { "well_id": "OIL-X101", "event": "Stuck Pipe", "depth": 3210.0, "severity": "HIGH" },
      { "well_id": "OIL-X106", "event": "Stuck Pipe", "depth": 3260.0, "severity": "CRITICAL" }
    ],
    "similar_wells": [
      "OIL-X104 (91% similarity, stuck pipe at 3280m)",
      "OIL-X101 (84% similarity, stuck pipe at 3210m)"
    ],
    "risk_interpretation": "HIGH HISTORICAL RISK. Reason: 4 comparable wells, 3 historical stuck-pipe events, same formation...",
    "sources": ["DDR-X104-2023-07", "WCR-X106-2022", "DDR-X101-2022-07"],
    "answer": "SUMMARY\n...\nHISTORICAL EVIDENCE\n...\nSIMILAR WELLS\n...\nRISK INTERPRETATION\n...\nSOURCES\n...",
    "confidence": 0.96,
    "provider": "Ask NWIS (Deterministic Ground Truth)"
  }
  ```

### `GET /api/ai/health`
Checks whether OpenAI or Demo fallback synthesizer is engaged.
- **Response (200 OK):**
  ```json
  {
    "status": "online",
    "provider": "Ask NWIS (Demo Engine — Offline Knowledge Base)",
    "model": "Deterministic-Synthesizer"
  }
  ```

---

## 5. Drilling Memory Graph (`/api/memory-graph`)

### `GET /api/memory-graph`
Builds a connected multi-hop relationship graph between wells, formations, events, and DDR documents.
- **Parameters:** `well_id` (default: `OIL-X123`), `max_depth` (default: 3)
- **Response (200 OK):**
  ```json
  {
    "nodes": [
      { "id": "OIL-X123", "label": "OIL-X123", "type": "ACTIVE_WELL" },
      { "id": "OIL-X104", "label": "OIL-X104 (91%)", "type": "OFFSET_WELL_TOP" },
      { "id": "FORM-Tipam", "label": "Tipam Sandstone", "type": "FORMATION" },
      { "id": "EV-X104-STUCK", "label": "Stuck Pipe @ 3280m", "type": "EVENT" },
      { "id": "DOC-DDR-X104", "label": "DDR-X104-2023-07", "type": "DOCUMENT" }
    ],
    "links": [
      { "source": "OIL-X123", "target": "OIL-X104", "type": "SIMILAR_TO", "weight": 0.91 },
      { "source": "OIL-X104", "target": "FORM-Tipam", "type": "DRILLS_IN" },
      { "source": "OIL-X104", "target": "EV-X104-STUCK", "type": "HAD_EVENT" },
      { "source": "EV-X104-STUCK", "target": "DOC-DDR-X104", "type": "HAS_DOCUMENT" }
    ]
  }
  ```

---

## 6. Real-Time Simulation Engine (`/api/simulation`)

| Endpoint | Method | Description |
|---|:---:|---|
| `/api/simulation/state` | `GET` | Fetches current bit depth, ROP, torque, and running status. |
| `/api/simulation/start` | `POST` | Resumes depth advancement. |
| `/api/simulation/pause` | `POST` | Freezes current bit depth and telemetry. |
| `/api/simulation/reset` | `POST` | Resets bit position back to reference baseline (3,050.0m). |
| `/api/simulation/speed` | `POST` | Updates advancement multiplier (`1`, `5`, or `10`). |

---

## 7. Hazard Alerts (`/api/alerts`)

| Endpoint | Method | Description |
|---|:---:|---|
| `/api/alerts` | `GET` | Retrieves active or acknowledged alerts for an active wellbore. |
| `/api/alerts/acknowledge/{id}` | `POST` | Marks an alert as acknowledged and records an operational audit log. |

---

## 8. Administration & Audit Trail (`/api/admin`)

| Endpoint | Method | Description | Required Role |
|---|:---:|---|:---:|
| `/api/admin/users` | `GET` | Lists registered operators with roles and active status. | `KNOWLEDGE_ADMIN` |
| `/api/admin/users/{id}/disable`| `POST` | Deactivates an operator account. | `KNOWLEDGE_ADMIN` |
| `/api/admin/users/{id}/role` | `POST` | Updates an operator's RBAC role. | `KNOWLEDGE_ADMIN` |
| `/api/admin/roles` | `GET` | Returns role-to-permission mapping hierarchy. | `KNOWLEDGE_ADMIN` |
| `/api/admin/audit-logs` | `GET` | Returns immutable audit trail of operator and AI actions. | `KNOWLEDGE_ADMIN` |
