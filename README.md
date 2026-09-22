# eRTMAC-NWIS: Nearby Wells Intelligence System

### An AI-Powered Offset Well Knowledge and Decision Support Platform for Drilling Operations
**Smart India Hackathon (SIH) Prototype | Developed for Oil India Limited (OIL)**

---

## 🚀 Executive Summary

During active drilling operations, unexpected downhole hazards—such as **circulation loss (mud loss)**, **differential/mechanical stuck pipe**, **well kicks**, and **severe torque spikes**—cost millions of dollars in Non-Productive Time (NPT) and jeopardize crew safety. 

While Oil India Limited monitors real-time surface parameters via **eRTMAC**, drilling engineers often lack immediate, contextual access to the decades of institutional knowledge buried across hundreds of nearby historical offset wells, End of Well Reports (EOWR), and Daily Drilling Reports (DDR).

**eRTMAC-NWIS bridges this critical gap** by delivering:
1. **Real-time Hazard Proximity Radar:** Continuously forecasts upcoming risks 50m–300m ahead of the active drill bit based on offset well events in matching stratigraphy.
2. **GIS Offset Well Explorer:** Interactive spatial map of the Upper Assam Basin with customizable search radii (5–50 km) and severity heatmaps.
3. **Multi-Parameter Geological Similarity Engine:** Weighted algorithmic matching (Formation 35%, Total Depth 20%, Trajectory 20%, Mud Weight Window 15%, Distance 10%) identifying true analogue wells.
4. **Institutional Incident & NPT Knowledge Base:** Filterable repository of 178+ historical drilling events complete with root causes, applied mitigations, and lessons learned.
5. **OIL AI Copilot (Domain RAG):** Natural-language assistant with evidence citation cards linking directly to offset completion reports and DDR logs.
6. **Live Drilling Simulator:** Controllable simulation engine with 1x, 5x, and 10x speeds demonstrating real-time risk alerts and parameter telemetry shifts.

---

## 🛠️ Technology Stack

| Layer | Technologies Used |
|---|---|
| **Backend API** | FastAPI, Python 3.9+, SQLAlchemy 2.0, Pydantic v2, Uvicorn |
| **Database** | PostgreSQL / SQLite (zero-config local dev fallback) |
| **Frontend UI** | React 19, TypeScript, Vite, Vanilla CSS (Industrial Command Center theme) |
| **Mapping & GIS** | Leaflet, React-Leaflet, CartoDB Dark Matter tiles |
| **Visualization** | Recharts (Telemetry trendlines, Stratigraphic risk horizon) |
| **AI & RAG** | Hybrid Provider (OpenAI GPT-4o-mini with domain fallback engine) |
| **Icons & Design** | Lucide React, Google Fonts (Outfit, Inter, JetBrains Mono) |
| **DevOps** | Docker, Docker Compose, Multi-stage Nginx builds |

---

## ⚡ Quickstart Guide

### Prerequisites
- Python 3.9+ installed
- Node.js 18+ and npm installed
- (Optional) Docker and Docker Compose

---

### Option A: Local Development (Instant Run)

#### 1. Backend Setup
```bash
cd backend

# Create virtual environment and activate
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run seed generator (50 synthetic wells, 178 events, 16 documents, 88 chunks)
python seed/seed_data.py

# Start FastAPI server
uvicorn app.main:app --reload --port 8000
```
Backend API will be live at: **`http://localhost:8000`**  
Interactive Swagger Docs: **`http://localhost:8000/docs`**

#### 2. Frontend Setup
In a separate terminal window:
```bash
cd frontend

# Install packages
npm install

# Start Vite dev server
npm run dev
```
Frontend Command Center will be live at: **`http://localhost:5173`**

---

### Option B: Run with Docker Compose
```bash
# From repository root
docker-compose up --build
```
- Frontend Dashboard: `http://localhost:3000`
- Backend API: `http://localhost:8000`
- Database: `localhost:5432`

---

## 🎯 Key Application Views

### 1. Operations Overview Cockpit
- Live telemetry bar displaying Measured Depth (MD), ROP, WOB, RPM, Torque, SPP Pressure, and Flow Rate.
- **Stratigraphic Risk Horizon:** Visual depth bar highlighting upcoming hazard windows (e.g., Mud Loss at 3,110m, Stuck Pipe at 3,275m).
- Real-time parameter charts graphing ROP and surface torque against depth.
- Top analogue well match card with similarity factor breakdown.

### 2. GIS Offset Well Explorer
- Interactive leaflet map centered on the Assam Basin oil fields.
- Active rig `OIL-X123` with live pulsing beacon.
- Offset wells with color-coded severity markers (Safe, Moderate, Critical).
- Adjustable offset radius filter (5 km to 50 km) and formation layer selectors.
- Interactive Well Dossier drawer with full casing and cementing specifications.

### 3. Similarity Matrix
- Vector distance and parameter similarity ranking.
- Side-by-side engineering comparison table (Mud weight, casing, trajectory, NPT).
- Direct access to historical incident summaries for analogue wells.

### 4. Drilling Events Knowledge Base
- Searchable catalog of 178+ downhole incidents.
- Quick filter chips for event types, formations, and severity levels.
- Field-tested mitigations and root causes documented by OIL engineers.

### 5. OIL AI Copilot
- Conversational RAG assistant with real-time drilling context injection.
- Ground truth evidence cards displaying document citations, well names, and depth intervals.
- Suggested prompt shortcuts for rapid hazard assessment.

### 6. Institutional Documents & DDRs
- Searchable catalog of Well Completion Reports (WCR) and Daily Drilling Reports (DDR).
- Extracted key findings and executive engineering summaries.

---

## 🎬 Live Simulation Demo Walkthrough

1. **Observe Initial State:** The active well **OIL-X123** starts at depth **3,050.0m** in Tipam Sandstone.
2. **Start Simulation:** Click the **▶ Play** button in the top navigation bar. Adjust speed to **5x** or **10x**.
3. **Approaching Mud Loss Zone (3,095m):** As depth crosses 3,095m, the system automatically triggers an **Approaching Hazard Alert**.
4. **Entered Risk Zone (3,110m):** Standpipe pressure drops, flow rate dips, and a **Critical Hazard Banner** flashes with immediate recommended action: *"Mix and spot 25 bbls Mica/Nut Plug LCM pill"*.
5. **Inspect Offset Correlated Well:** Click *"View Offset Correlated Wells"* to jump straight to the GIS Map and inspect **OIL-X104** (the 91% match analogue well that suffered the exact same loss event).
6. **Consult AI Copilot:** Switch to the AI tab and ask: *"What mitigation was applied on OIL-X104 when mud loss occurred at 3110m?"* to see instant synthesized guidance with source citations!

---

## 📜 Disclaimer
*All well names, coordinates, and drilling telemetry in this prototype are synthetic demo data generated for the Smart India Hackathon and do not contain proprietary or confidential Oil India Limited operational records.*
