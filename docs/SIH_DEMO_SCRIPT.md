# eRTMAC-NWIS: Official SIH Live Demonstration Script

**Platform:** eRTMAC-NWIS (Nearby Wells Intelligence System)  
**Target Jury:** Smart India Hackathon (SIH) Evaluators & Oil India Limited Domain Experts  
**Estimated Demo Time:** 5 – 7 minutes  

---

## 📋 The 15-Step Master Presentation Story

### Step 1: Open the NWIS Dashboard
- **Action:** Open `http://localhost:5173/` in Google Chrome. If on the login screen, click the **1-Click Quick Demo Sign-In** button for **"Drilling Engineer"** (`engineer@nwis.demo`).
- **Talking Point:**
  > *"Respected evaluators, welcome to eRTMAC-NWIS. This is our industrial command center designed specifically for Oil India Limited operations in the Assam Basin. Notice immediately the industrial telemetry design system—Arcadia palette, high-contrast indicators, precision gauges, and persistent demo security badges."*

---

### Step 2 & 3: Active Wellbore & Initial Bit Depth
- **Action:** Point out the top telemetry bar and the Operations Cockpit.
- **Talking Point:**
  > *"The system is currently connected to active wellbore **OIL-X123**, positioned at **3,050.0m measured depth** within the **Tipam Sandstone** formation. Notice our real-time surface parameters: ROP at 14.2 m/hr, WOB at 15.0 tons, and SPP at 2,850 psi."*

---

### Step 4: GIS Offset Well Map
- **Action:** Click the **"GIS Offset Map"** tab in the top navigation.
- **Talking Point:**
  > *"Here on the GIS Offset Map, NWIS plots the geographic coordinate grid of the Upper Assam Basin. Centered around active well OIL-X123, we observe all offset wells within our 20 km search radius. Each well displays color-coded historical risk severity halos: green for low, yellow for medium, orange for high, and crimson for critical."*

---

### Step 5: System Identifies Top Similar Offset Well
- **Action:** Click the **"Similarity Matrix"** tab.
- **Talking Point:**
  > *"Instead of arbitrary guesswork, our deterministic Offset Well Similarity Engine calculates mathematical correlation across 5 key dimensions: Formation (30%), Depth (25%), Haversine Distance (20%), Trajectory (15%), and Mud Weight (10%). The system immediately highlights **OIL-X104** as the primary analogue well with a **91% similarity score**."*

---

### Step 6: Open OIL-X104 Dossier & Historical Incidents
- **Action:** Click on the **OIL-X104** card to open the **Full Well Dossier Modal**.
- **Talking Point:**
  > *"When we inspect OIL-X104's historical records, we see exactly why it is critical for current operations:
  > • At **3,120m**: Severe **Mud Loss** in Tipam sandstone (cured with CaCO3 LCM pill).
  > • At **3,280m**: Critical **Stuck Pipe** incident (16 hours NPT, freed with a 500L diesel spotting pill).
  > • At **3,450m**: Severe **Torque Spike** (mitigated with torque lubricants).
  > All of these happened in the exact same stratigraphy that active well OIL-X123 is about to penetrate."*

---

### Step 7 & 8: Return to Active Well & Inspect Stratigraphic Risk Timeline
- **Action:** Close the modal and return to the **"Overview"** tab. Scroll to the **Stratigraphic Horizon & Offset Risk Timeline**.
- **Talking Point:**
  > *"Returning to our active well cockpit, the Stratigraphic Risk Timeline visualizes the danger zones ahead of our drill bit:
  > • **3,100m – 3,150m**: High Mud Loss Risk
  > • **3,180m – 3,290m**: Critical Stuck Pipe Hazard Window
  > • **3,250m – 3,300m**: High Torque Drag Fluctuation
  > Every risk interval includes structured reasons and an engineering advisory."*

---

### Step 9 & 10: Start the eRTMAC Simulation
- **Action:** In the top header control pill, click the **Play** button (`▶`) and set the speed to **5×**.
- **Talking Point:**
  > *"Now let us engage the live eRTMAC drilling simulation. Watch the live telemetry bar as measured depth increases smoothly from 3,050m toward 3,100m and beyond."*

---

### Step 11: Real-Time Hazard Alert Triggering
- **Action:** As depth reaches the 3,100m or 3,180m intervals, observe the top **Hazard Alert Banner** turn amber/red and the pulsing bell notification badge increment.
- **Talking Point:**
  > *"As our drill bit enters the 3,180m horizon, NWIS automatically sounds an alarm: **CRITICAL HAZARD ALERT: Approaching 3,180m Stuck Pipe interval in Tipam formation**. This gives the rig crew 30 to 60 minutes of advance warning before the drillstring gets stuck."*

---

### Step 12: Click "Why Am I Seeing This Alert?" (Instant Ground Truth)
- **Action:** Click the button labeled **"Why am I seeing this alert?"** on the alert banner.
- **Talking Point:**
  > *"When the driller asks 'Why am I seeing this alert?', NWIS does not give a black-box opinion. It opens our **Deep-Dive Evidence Dossier**, laying out:
  > 1. **Historical Evidence:** Citing OIL-X104 (stuck at 3,280m), OIL-X101 (stuck at 3,210m), and OIL-X106 (stuck at 3,260m).
  > 2. **Similar Wells:** 91%, 84%, and 71% analogues.
  > 3. **Formation:** Tipam Sandstone with overbalance pressure >400 psi.
  > 4. **Institutional Source Documents:** Daily Drilling Reports DDR-X104 and Completion Report WCR-X106."*

---

### Step 13: Consult "Ask NWIS" AI Decision Support Assistant
- **Action:** Click the **"Ask NWIS"** tab. Click the recommended query button: **"Why is the 3180-3290m interval risky?"**.
- **Talking Point:**
  > *"Now we consult **Ask NWIS**, our specialized domain RAG assistant. Notice its strict anti-hallucination guardrail: it will NEVER invent a well ID, depth, or document. Within seconds, it formats the answer into the 5 mandatory sections:
  > • **Summary:** Direct engineering answer.
  > • **Historical Evidence:** Citing exact well records.
  > • **Similar Wells:** Analogue correlations.
  > • **Risk Interpretation:** Differential sticking physics and advisory notices.
  > • **Sources:** Citing official DDR and WCR report numbers."*

---

### Step 14: NWIS Drilling Memory Graph
- **Action:** Click the **"Memory Graph"** tab.
- **Talking Point:**
  > *"To ensure institutional knowledge is never lost again, we created the **NWIS Drilling Memory Graph**. It converts isolated PDF reports into a living knowledge network:
  > **Active Well (OIL-X123)** connects to **Similar Wells (OIL-X104)**, which connects to the **Formation (Tipam)**, which branches into **Historical Events (Mud Loss @ 3,120m, Stuck Pipe @ 3,280m)**, and links directly to **Source Documents (DDR-X104)**.
  > Engineers can click any node to expand connected operational evidence."*

---

### Step 15: Industrial Control Room Polish & Enterprise Standards
- **Action:** Point out the top header **"DEMO MODE"** LED badge and **"⚠️ Synthetic Demo Data — Not Real OIL Data"** notice.
- **Talking Point:**
  > *"Every aspect of this platform has been built to commercial enterprise standards: full JWT Role-Based Access Control, audit logging, zero-downtime offline fallbacks, and strict adherence to oilfield terminology. eRTMAC-NWIS is ready to safeguard Oil India Limited drilling operations and eliminate millions in NPT."*
