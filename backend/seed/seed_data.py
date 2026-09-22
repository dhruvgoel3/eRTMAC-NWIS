"""
eRTMAC-NWIS Seed Data Generator
================================
Creates 50 synthetic wells, 200+ events, documents, risk zones, and alerts
clustered around the active well OIL-X123 in Assam Basin.

ALL DATA IS SYNTHETIC DEMO DATA - Not actual Oil India confidential data.
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from datetime import datetime, timedelta
import random
import math
from app.database import engine, SessionLocal
from app.models import Well, WellEvent, Document, DocumentChunk, Alert, RiskZone, DrillingParameter, SimulationState
from app.database import Base

# ─── Seed for determinism ─────────────────────────────────────────────────────
random.seed(42)

# ─── Active well anchor coordinates (synthetic Assam Basin location) ──────────
ACTIVE_LAT = 27.2
ACTIVE_LON = 95.1
ACTIVE_WELL_ID = "OIL-X123"

# ─── Formation definitions with common event patterns ─────────────────────────
FORMATIONS = {
    "Tipam": {
        "common_events": ["MUD_LOSS", "STUCK_PIPE"],
        "depth_range": (2800, 3500),
        "mud_weight_range": (10.0, 11.5),
        "color": "#4a90d9",
    },
    "Barail": {
        "common_events": ["TORQUE_SPIKE", "KICK"],
        "depth_range": (3200, 4000),
        "mud_weight_range": (11.0, 12.5),
        "color": "#7b68ee",
    },
    "Kopili": {
        "common_events": ["CEMENTING_ISSUE", "NPT"],
        "depth_range": (3500, 4500),
        "mud_weight_range": (12.0, 13.5),
        "color": "#50c878",
    },
    "Sylhet": {
        "common_events": ["STUCK_PIPE", "OVERPRESSURE"],
        "depth_range": (3800, 5000),
        "mud_weight_range": (13.0, 15.0),
        "color": "#ff8c00",
    },
    "Langpur": {
        "common_events": ["MUD_LOSS", "FISHING"],
        "depth_range": (2500, 3200),
        "mud_weight_range": (9.5, 11.0),
        "color": "#ff6b6b",
    },
    "Namsang": {
        "common_events": ["TORQUE_SPIKE", "CEMENTING_ISSUE"],
        "depth_range": (3100, 3900),
        "mud_weight_range": (10.5, 12.0),
        "color": "#ffd700",
    },
}

# ─── Event severity mapping ────────────────────────────────────────────────────
SEVERITY_WEIGHTS = {
    "MUD_LOSS": {"LOW": 0.3, "MEDIUM": 0.5, "HIGH": 0.2},
    "STUCK_PIPE": {"MEDIUM": 0.3, "HIGH": 0.5, "CRITICAL": 0.2},
    "KICK": {"MEDIUM": 0.4, "HIGH": 0.4, "CRITICAL": 0.2},
    "TORQUE_SPIKE": {"LOW": 0.2, "MEDIUM": 0.5, "HIGH": 0.3},
    "OVERPRESSURE": {"HIGH": 0.5, "CRITICAL": 0.5},
    "CEMENTING_ISSUE": {"LOW": 0.3, "MEDIUM": 0.5, "HIGH": 0.2},
    "FISHING": {"MEDIUM": 0.4, "HIGH": 0.4, "CRITICAL": 0.2},
    "NPT": {"LOW": 0.4, "MEDIUM": 0.4, "HIGH": 0.2},
    "OTHER": {"LOW": 0.4, "MEDIUM": 0.4, "HIGH": 0.2},
}

# ─── Event descriptions ────────────────────────────────────────────────────────
EVENT_DESCRIPTIONS = {
    "MUD_LOSS": [
        "Partial mud loss encountered in fractured zone. Returns decreased significantly.",
        "Total mud loss observed. Circulation lost at fracture junction.",
        "Mud loss at transition zone boundary. Lost returns for {npt:.1f} hours.",
    ],
    "STUCK_PIPE": [
        "Differential sticking observed. High overbalance in permeable formation.",
        "Mechanical stuck pipe due to wellbore instability in shale section.",
        "Pack-off while pulling out of hole. Tight hole observed from {depth_start:.0f}m.",
    ],
    "KICK": [
        "Gas kick detected during tripping. Pit gain of 2.4 m3 observed.",
        "Formation fluid influx while drilling. Well control procedures initiated.",
        "Unexpected pressure surge in overpressured formation at {depth_start:.0f}m.",
    ],
    "TORQUE_SPIKE": [
        "Torque spikes observed intermittently. String drag increased significantly.",
        "High torque and drag while rotating. Reaming required to maintain progress.",
        "Torque exceeds normal range at {depth_start:.0f}m. Tight hole indicator.",
    ],
    "OVERPRESSURE": [
        "Overpressured zone encountered. Formation pressure exceeds hydrostatic by 15%.",
        "Pore pressure ramp-up in transition zone. Mud weight increase required.",
        "Abnormally pressured formation at {depth_start:.0f}m in Barail sand.",
    ],
    "CEMENTING_ISSUE": [
        "Poor cement bond observed on CBL/VDL. Channeling noted on log.",
        "Short circulation during cementing. Remedial squeeze job performed.",
        "Cement returns insufficient at surface. Possible losses during cement job.",
    ],
    "FISHING": [
        "Bit cone loss. Fishing operation required. {npt:.1f} hrs NPT.",
        "Junk in hole from previous operation. Junk basket and magnet deployed.",
        "BHA component left in hole. Reverse circulation fishing performed.",
    ],
    "NPT": [
        "Non-productive time due to equipment failure. {npt:.1f} hours lost.",
        "Rig equipment downtime. Generator failure. Operations suspended.",
        "Weather delay and logistics issue. {npt:.1f} hours NPT recorded.",
    ],
}

ROOT_CAUSES = {
    "MUD_LOSS": "Fractured formation with insufficient mud weight differential control.",
    "STUCK_PIPE": "High differential pressure across permeable formation with thick filter cake.",
    "KICK": "Insufficient mud weight to contain formation pressure at depth.",
    "TORQUE_SPIKE": "Reactive shale swelling reducing wellbore diameter. Poor wellbore stability.",
    "OVERPRESSURE": "Unexpected pressure transition zone. Pre-drill pore pressure model inaccurate.",
    "CEMENTING_ISSUE": "Mud contamination of cement slurry. Inadequate centralization.",
    "FISHING": "BHA wear and fatigue failure. Inadequate inspection before run.",
    "NPT": "Equipment maintenance overdue. Inspection schedule not followed.",
}

MITIGATIONS = {
    "MUD_LOSS": "LCM pill pumped. Bridging material used. Mud weight adjusted downwards.",
    "STUCK_PIPE": "Back-off initiated. Jar down operations. Spotting oil pill around stuck interval.",
    "KICK": "Well shut in. Driller's method kill procedure. Heavy mud weight used.",
    "TORQUE_SPIKE": "Reaming to improve wellbore gauge. Torque reduction chemical added to mud.",
    "OVERPRESSURE": "Mud weight increased incrementally. Offset well data reviewed.",
    "CEMENTING_ISSUE": "Squeeze cementing performed. CBL re-run for verification.",
    "FISHING": "Fishing string assembly deployed. Reverse circulation. Sidetrack as backup.",
    "NPT": "Emergency repair. Standby equipment mobilized. Maintenance log updated.",
}


def haversine(lat1, lon1, lat2, lon2):
    """Calculate distance in km between two lat/lon points."""
    R = 6371.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def pick_severity(event_type):
    weights = SEVERITY_WEIGHTS.get(event_type, {"LOW": 0.4, "MEDIUM": 0.4, "HIGH": 0.2})
    return random.choices(list(weights.keys()), weights=list(weights.values()))[0]


def pick_description(event_type, depth_start, npt):
    templates = EVENT_DESCRIPTIONS.get(event_type, ["Event occurred at {depth_start:.0f}m."])
    tmpl = random.choice(templates)
    return tmpl.format(depth_start=depth_start, npt=npt)


def create_tables():
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("Tables created.")


def clear_tables(db):
    """Clear existing data (for re-seeding)."""
    db.query(SimulationState).delete()
    db.query(Alert).delete()
    db.query(RiskZone).delete()
    db.query(DrillingParameter).delete()
    db.query(DocumentChunk).delete()
    db.query(WellEvent).delete()
    db.query(Document).delete()
    db.query(Well).delete()
    db.commit()
    print("Cleared existing data.")


def seed_wells(db):
    """
    Seed 50 synthetic wells. OIL-X123 is the active well.
    OIL-X104 is designed to be the most similar well (91% similarity).
    Wells X101-X108 are the 8 primary nearby wells.
    """
    print("Seeding wells...")

    wells_data = []

    # ── ACTIVE WELL ────────────────────────────────────────────────────────────
    wells_data.append({
        "well_id": "OIL-X123",
        "name": "Oil India Well X123",
        "latitude": ACTIVE_LAT,
        "longitude": ACTIVE_LON,
        "field": "Duliajan Field",
        "formation": "Tipam",
        "total_depth": 3850.0,
        "well_type": "Development",
        "trajectory_type": "DIRECTIONAL",
        "spud_date": datetime(2024, 6, 10),
        "completion_date": None,
        "status": "ACTIVE",
        "is_active": True,
        "mud_weight": 10.8,
        "casing_program": "30\" conductor, 20\" surface, 13-3/8\" intermediate, 9-5/8\" production",
        "cementing_notes": "Conventional cement. Foam cement for surface casing.",
        "lessons_learned": "Active well - monitoring ongoing",
        "operator": "Oil India Limited",
    })

    # ── PRIMARY NEARBY WELLS (X101-X108) ──────────────────────────────────────
    # X104 is the most similar — same formation, similar depth, close proximity
    nearby_wells = [
        {
            "well_id": "OIL-X101",
            "name": "Oil India Well X101",
            "lat_off": 0.045,  "lon_off": 0.02,   # ~5 km NE
            "formation": "Tipam",
            "total_depth": 3720.0,
            "trajectory_type": "DIRECTIONAL",
            "well_type": "Development",
            "mud_weight": 10.6,
        },
        {
            "well_id": "OIL-X102",
            "name": "Oil India Well X102",
            "lat_off": -0.03,  "lon_off": 0.035,  # ~4.5 km SE
            "formation": "Tipam",
            "total_depth": 3600.0,
            "trajectory_type": "VERTICAL",
            "well_type": "Development",
            "mud_weight": 10.4,
        },
        {
            "well_id": "OIL-X103",
            "name": "Oil India Well X103",
            "lat_off": 0.025,  "lon_off": -0.04,  # ~4.8 km NW
            "formation": "Barail",
            "total_depth": 4100.0,
            "trajectory_type": "DIRECTIONAL",
            "well_type": "Development",
            "mud_weight": 11.2,
        },
        {
            "well_id": "OIL-X104",   # ← MOST SIMILAR WELL
            "name": "Oil India Well X104",
            "lat_off": 0.066,  "lon_off": 0.045,  # ~8.5 km NE
            "formation": "Tipam",      # Same formation as X123
            "total_depth": 3850.0,     # Same total depth
            "trajectory_type": "DIRECTIONAL",  # Same trajectory
            "well_type": "Development",
            "mud_weight": 10.9,        # Very similar mud weight
        },
        {
            "well_id": "OIL-X105",
            "name": "Oil India Well X105",
            "lat_off": -0.055, "lon_off": -0.03,  # ~6.6 km SW
            "formation": "Namsang",
            "total_depth": 3500.0,
            "trajectory_type": "VERTICAL",
            "well_type": "Exploratory",
            "mud_weight": 10.7,
        },
        {
            "well_id": "OIL-X106",
            "name": "Oil India Well X106",
            "lat_off": -0.08,  "lon_off": 0.06,   # ~10.6 km SE
            "formation": "Tipam",
            "total_depth": 3400.0,
            "trajectory_type": "DIRECTIONAL",
            "well_type": "Development",
            "mud_weight": 10.5,
        },
        {
            "well_id": "OIL-X107",
            "name": "Oil India Well X107",
            "lat_off": 0.09,   "lon_off": -0.07,  # ~12.3 km NW
            "formation": "Barail",
            "total_depth": 4200.0,
            "trajectory_type": "HORIZONTAL",
            "well_type": "Development",
            "mud_weight": 11.8,
        },
        {
            "well_id": "OIL-X108",
            "name": "Oil India Well X108",
            "lat_off": 0.015,  "lon_off": 0.085,  # ~9.7 km E
            "formation": "Langpur",
            "total_depth": 3100.0,
            "trajectory_type": "VERTICAL",
            "well_type": "Development",
            "mud_weight": 9.8,
        },
    ]

    for w in nearby_wells:
        wells_data.append({
            "well_id": w["well_id"],
            "name": w["name"],
            "latitude": ACTIVE_LAT + w["lat_off"],
            "longitude": ACTIVE_LON + w["lon_off"],
            "field": "Duliajan Field",
            "formation": w["formation"],
            "total_depth": w["total_depth"],
            "well_type": w["well_type"],
            "trajectory_type": w["trajectory_type"],
            "spud_date": datetime(2022, random.randint(1, 12), random.randint(1, 28)),
            "completion_date": datetime(2023, random.randint(1, 12), random.randint(1, 28)),
            "status": "COMPLETED",
            "is_active": False,
            "mud_weight": w["mud_weight"],
            "casing_program": "20\" surface, 13-3/8\" intermediate, 9-5/8\" production",
            "cementing_notes": "Standard cement program. Foam cement on surface casing.",
            "lessons_learned": f"Well completed. Review DDR for detailed account.",
            "operator": "Oil India Limited",
        })

    # ── ADDITIONAL 41 WELLS (wider radius, various formations) ────────────────
    formation_list = list(FORMATIONS.keys())
    for i in range(109, 151):
        angle = random.uniform(0, 2 * math.pi)
        dist_deg = random.uniform(0.02, 0.45)  # 2-50 km approx
        lat_off = dist_deg * math.cos(angle)
        lon_off = dist_deg * math.sin(angle)
        formation = random.choice(formation_list)
        f_info = FORMATIONS[formation]
        depth = random.uniform(f_info["depth_range"][0], f_info["depth_range"][1])
        traj = random.choice(["VERTICAL", "DIRECTIONAL", "DIRECTIONAL", "HORIZONTAL"])
        wells_data.append({
            "well_id": f"OIL-X{i}",
            "name": f"Oil India Well X{i}",
            "latitude": ACTIVE_LAT + lat_off,
            "longitude": ACTIVE_LON + lon_off,
            "field": random.choice(["Duliajan Field", "Naharkatia Field", "Moran Field"]),
            "formation": formation,
            "total_depth": round(depth, 1),
            "well_type": random.choice(["Development", "Development", "Exploratory"]),
            "trajectory_type": traj,
            "spud_date": datetime(random.randint(2018, 2023), random.randint(1, 12), random.randint(1, 28)),
            "completion_date": datetime(2023, random.randint(1, 12), random.randint(1, 28)),
            "status": "COMPLETED",
            "is_active": False,
            "mud_weight": round(random.uniform(9.5, 14.5), 1),
            "casing_program": "20\" surface, 13-3/8\" intermediate, 9-5/8\" production",
            "cementing_notes": "Standard cement program.",
            "lessons_learned": "Refer to well completion report for details.",
            "operator": "Oil India Limited",
        })

    db_wells = []
    for wd in wells_data:
        w = Well(**wd)
        db.add(w)
        db_wells.append(w)
    db.commit()
    for w in db_wells:
        db.refresh(w)

    print(f"  Seeded {len(db_wells)} wells.")
    return {w.well_id: w for w in db_wells}


def seed_documents(db, wells_map):
    """Create sample DDR, WCR, Mud Log and Cementing reports for key wells."""
    print("Seeding documents...")

    docs = []
    doc_map = {}

    key_wells = ["OIL-X104", "OIL-X101", "OIL-X102", "OIL-X103", "OIL-X105", "OIL-X106", "OIL-X107", "OIL-X108"]

    for well_id in key_wells:
        if well_id not in wells_map:
            continue
        well = wells_map[well_id]
        year = "2023"
        month = f"{random.randint(1, 12):02d}"

        # DDR
        ddr_text = f"""
DAILY DRILLING REPORT (DDR) - {well_id}
[SYNTHETIC DEMO DATA - Not actual OIL confidential data]
Date: {year}-{month}-15
Well: {well.name}
Field: {well.field}
Formation: {well.formation}
Depth: {well.total_depth:.0f}m (TD)
Rig: DKB-350

OPERATIONS SUMMARY:
Drilled from {well.total_depth - 120:.0f}m to {well.total_depth:.0f}m.
Formation: {well.formation} sandstone and shale sequence.
Mud weight: {well.mud_weight:.1f} ppg. Mud type: WBM.
Average ROP: {random.uniform(8, 18):.1f} m/hr.

DRILLING PARAMETERS:
WOB: {random.uniform(12, 16):.1f} t
RPM: {random.randint(90, 130)}
Torque: {random.uniform(15, 22):.1f} kNm
Pump pressure: {random.randint(2600, 3100)} psi
Flow rate: {random.randint(1400, 1800)} lpm

EVENTS:
- Mud loss encountered at {random.uniform(3100, 3200):.0f}m. LCM pill pumped. Returns restored after 4 hrs.
- Torque spike observed intermittently from {random.uniform(3200, 3300):.0f}m.

NPT SUMMARY:
Total NPT: {random.uniform(5, 25):.1f} hours.
Reason: Formation related issues.

RECOMMENDATIONS:
Monitor torque and drag closely. Increase LCM concentration if losses recur.
Keep mud weight within {well.mud_weight:.1f}-{well.mud_weight + 0.3:.1f} ppg window.
        """.strip()

        doc_id = f"DDR-{well_id.replace('OIL-', '')}-{year}-{month}"
        d = Document(
            document_id=doc_id,
            document_type="DDR",
            well_id=well.id,
            title=f"Daily Drilling Report - {well_id} ({year}-{month})",
            date=datetime(int(year), int(month), 15),
            text_content=ddr_text,
            depth_start=well.total_depth - 120,
            depth_end=well.total_depth,
            formation=well.formation,
            metadata_={"synthetic": True, "well_id": well_id},
        )
        db.add(d)
        docs.append(d)

        # WCR
        wcr_text = f"""
WELL COMPLETION REPORT (WCR) - {well_id}
[SYNTHETIC DEMO DATA - Not actual OIL confidential data]
Well: {well.name}
TD: {well.total_depth:.0f}m
Formation: {well.formation}

COMPLETION SUMMARY:
Well drilled to total depth of {well.total_depth:.0f}m.
Primary target formation: {well.formation} reservoir.
Final mud weight at TD: {well.mud_weight:.1f} ppg.

DRILLING HAZARDS ENCOUNTERED:
1. Mud loss at {random.uniform(3100, 3200):.0f}m in fractured zone — Severity: MEDIUM
2. Stuck pipe at {random.uniform(3200, 3300):.0f}m — Severity: HIGH
   - Differential sticking in permeable sandstone.
   - Oil pill spotted. 16 hours NPT.
   - Remedial action: back-off and re-drill.

FORMATION EVALUATION:
Porosity: 18-22% (average)
Permeability: 85-120 mD
Pay zone: {well.total_depth - 200:.0f}m - {well.total_depth - 80:.0f}m

LESSONS LEARNED:
- High overbalance contributed to differential sticking risk.
- Recommend mud weight reduction of 0.3 ppg in similar formations.
- LCM standby quantity should be doubled for future wells in same area.
        """.strip()

        wcr_id = f"WCR-{well_id.replace('OIL-', '')}-{year}"
        d2 = Document(
            document_id=wcr_id,
            document_type="WCR",
            well_id=well.id,
            title=f"Well Completion Report - {well_id}",
            date=datetime(int(year), int(month), 28),
            text_content=wcr_text,
            depth_start=0,
            depth_end=well.total_depth,
            formation=well.formation,
            metadata_={"synthetic": True, "well_id": well_id},
        )
        db.add(d2)
        docs.append(d2)

    db.commit()
    for d in docs:
        db.refresh(d)
        doc_map[d.document_id] = d

    print(f"  Seeded {len(docs)} documents.")
    return doc_map


def seed_events(db, wells_map, doc_map):
    """
    Seed 200+ historical well events.
    OIL-X104 has the key events matching the demo scenario:
      - Mud Loss at 3120m
      - Stuck Pipe at 3280m
      - Torque Spike at 3450m
    """
    print("Seeding events...")

    events = []

    # ── SCRIPTED KEY EVENTS for demo scenario ─────────────────────────────────
    # These support the similarity engine and risk timeline for OIL-X123

    key_events = [
        # X104 — most similar well, key events
        ("OIL-X104", "MUD_LOSS",        3110, 3130, "Tipam",  "MEDIUM", 8.5,  "DDR-X104-2023-08"),
        ("OIL-X104", "STUCK_PIPE",      3275, 3295, "Tipam",  "HIGH",   16.0, "WCR-X104-2023"),
        ("OIL-X104", "TORQUE_SPIKE",    3445, 3465, "Tipam",  "MEDIUM", 4.0,  "DDR-X104-2023-08"),
        # X101 — nearby, correlated events
        ("OIL-X101", "MUD_LOSS",        3095, 3115, "Tipam",  "MEDIUM", 6.5,  "DDR-X101-2023-06"),
        ("OIL-X101", "STUCK_PIPE",      3210, 3240, "Tipam",  "HIGH",   18.0, "WCR-X101-2023"),
        ("OIL-X101", "TORQUE_SPIKE",    3380, 3420, "Tipam",  "LOW",    2.5,  None),
        # X102 — vertical well, some correlation
        ("OIL-X102", "MUD_LOSS",        3130, 3160, "Tipam",  "LOW",    4.0,  "DDR-X102-2023-04"),
        ("OIL-X102", "CEMENTING_ISSUE", 2900, 2950, "Tipam",  "MEDIUM", 12.0, "WCR-X102-2023"),
        # X103 — Barail formation, different events
        ("OIL-X103", "KICK",            3550, 3580, "Barail", "HIGH",   22.0, "DDR-X103-2023-09"),
        ("OIL-X103", "TORQUE_SPIKE",    3620, 3650, "Barail", "MEDIUM", 5.0,  None),
        ("OIL-X103", "OVERPRESSURE",    3800, 3850, "Barail", "HIGH",   14.0, "WCR-X103-2023"),
        # X105 — Namsang, different events
        ("OIL-X105", "TORQUE_SPIKE",    3150, 3200, "Namsang","MEDIUM", 3.0,  "DDR-X105-2023-07"),
        ("OIL-X105", "CEMENTING_ISSUE", 3300, 3350, "Namsang","LOW",    9.0,  "WCR-X105-2023"),
        # X106 — Tipam, some correlation
        ("OIL-X106", "MUD_LOSS",        3090, 3110, "Tipam",  "MEDIUM", 7.0,  "DDR-X106-2023-05"),
        ("OIL-X106", "STUCK_PIPE",      3260, 3290, "Tipam",  "CRITICAL",24.0, "WCR-X106-2023"),
        # X107 — Barail, different
        ("OIL-X107", "KICK",            3900, 3950, "Barail", "CRITICAL",30.0,"DDR-X107-2023-11"),
        ("OIL-X107", "FISHING",         4100, 4120, "Barail", "HIGH",   40.0, "WCR-X107-2023"),
        # X108 — Langpur, different
        ("OIL-X108", "MUD_LOSS",        2950, 2990, "Langpur","LOW",    3.0,  "DDR-X108-2023-03"),
        ("OIL-X108", "FISHING",         3050, 3080, "Langpur","MEDIUM", 20.0, "WCR-X108-2023"),
    ]

    for (well_id, etype, ds, de, form, sev, npt, doc_id_ref) in key_events:
        well = wells_map.get(well_id)
        if not well:
            continue
        doc = None
        if doc_id_ref:
            doc = doc_map.get(doc_id_ref)

        desc = pick_description(etype, ds, npt)
        ev = WellEvent(
            well_id=well.id,
            event_type=etype,
            depth_start=ds,
            depth_end=de,
            formation=form,
            severity=sev,
            description=desc,
            root_cause=ROOT_CAUSES.get(etype, ""),
            mitigation=MITIGATIONS.get(etype, ""),
            npt_hours=npt,
            confidence=0.95,
            event_date=datetime(2023, random.randint(1, 12), random.randint(1, 28)),
            document_id=doc.id if doc else None,
        )
        db.add(ev)
        events.append(ev)

    # ── GENERATE EVENTS FOR REMAINING WELLS ───────────────────────────────────
    all_well_ids = list(wells_map.keys())
    scripted_well_ids = {e[0] for e in key_events}

    for well_id in all_well_ids:
        if well_id in scripted_well_ids or well_id == ACTIVE_WELL_ID:
            continue
        well = wells_map[well_id]
        formation = well.formation
        f_info = FORMATIONS.get(formation, FORMATIONS["Tipam"])
        common_events = f_info["common_events"]

        num_events = random.randint(2, 6)
        for _ in range(num_events):
            etype = random.choices(
                common_events + ["NPT", "OTHER"],
                weights=[3] * len(common_events) + [2, 1]
            )[0]
            depth_base = random.uniform(
                max(2500, well.total_depth * 0.65),
                min(well.total_depth - 50, well.total_depth * 0.98)
            )
            depth_start = round(depth_base, 0)
            depth_end = round(depth_start + random.uniform(20, 120), 0)
            sev = pick_severity(etype)
            npt = round(random.uniform(2, 35), 1)
            desc = pick_description(etype, depth_start, npt)

            ev = WellEvent(
                well_id=well.id,
                event_type=etype,
                depth_start=depth_start,
                depth_end=depth_end,
                formation=formation,
                severity=sev,
                description=desc,
                root_cause=ROOT_CAUSES.get(etype, "Unknown"),
                mitigation=MITIGATIONS.get(etype, "Refer to operational guidelines."),
                npt_hours=npt,
                confidence=round(random.uniform(0.7, 0.95), 2),
                event_date=datetime(random.randint(2019, 2023), random.randint(1, 12), random.randint(1, 28)),
                document_id=None,
            )
            db.add(ev)
            events.append(ev)

    db.commit()
    print(f"  Seeded {len(events)} events.")
    return events


def seed_drilling_parameters(db, wells_map):
    """Seed drilling parameter history for nearby wells."""
    print("Seeding drilling parameters...")

    params = []
    key_wells = ["OIL-X104", "OIL-X101", "OIL-X102", "OIL-X103"]

    for well_id in key_wells:
        well = wells_map.get(well_id)
        if not well:
            continue
        depth = 2800.0
        ts = datetime(2023, 5, 1)
        while depth <= well.total_depth:
            rop = round(random.gauss(12, 2.5), 1)
            wob = round(random.gauss(14, 1.5), 1)
            rpm = round(random.gauss(115, 8), 0)
            torque = round(random.gauss(18, 2), 1)
            pressure = round(random.gauss(2850, 100), 0)
            mud_flow = round(random.gauss(1600, 50), 0)
            hook_load = round(random.gauss(185, 10), 1)
            inclination = round(random.gauss(8, 1.5), 1)
            azimuth = round(random.gauss(142, 5), 1)
            mud_wt = well.mud_weight

            # Increase torque near stuck-pipe zones
            if 3200 <= depth <= 3300:
                torque += random.uniform(3, 6)
                wob += random.uniform(1, 3)

            p = DrillingParameter(
                well_id=well.id,
                timestamp=ts,
                depth=depth,
                rop=max(1, rop),
                wob=max(5, wob),
                rpm=max(60, rpm),
                torque=max(8, torque),
                pressure=max(1800, pressure),
                mud_flow=max(1000, mud_flow),
                hook_load=max(100, hook_load),
                inclination=max(0, inclination),
                azimuth=max(0, min(360, azimuth)),
                mud_weight=mud_wt,
            )
            db.add(p)
            params.append(p)
            depth += 10
            ts += timedelta(minutes=45)

    db.commit()
    print(f"  Seeded {len(params)} drilling parameter records.")


def seed_risk_zones(db, wells_map):
    """
    Seed risk zones for active well OIL-X123.
    These are derived from nearby well event patterns.
    The demo scenario zone depths: 3100-3150 (Mud Loss), 3180-3290 (Stuck Pipe), 3250-3300 (Torque Spike).
    """
    print("Seeding risk zones...")

    active_well = wells_map[ACTIVE_WELL_ID]

    risk_zones = [
        {
            "event_type": "MUD_LOSS",
            "depth_start": 3095.0,
            "depth_end": 3155.0,
            "formation": "Tipam",
            "risk_score": 62.0,
            "severity": "MEDIUM",
            "evidence_count": 4,
            "source_well_ids": [
                wells_map["OIL-X104"].id,
                wells_map["OIL-X101"].id,
                wells_map["OIL-X102"].id,
                wells_map["OIL-X106"].id,
            ],
            "explanation": (
                "4 comparable offset wells experienced mud loss events in the 3095-3155m interval. "
                "Wells X104 (3110m), X101 (3095m), X102 (3130m), and X106 (3090m) all recorded "
                "partial to total mud losses in Tipam formation at similar depths. "
                "Historical pattern suggests fractured zone at formation boundary."
            ),
        },
        {
            "event_type": "STUCK_PIPE",
            "depth_start": 3180.0,
            "depth_end": 3300.0,
            "formation": "Tipam",
            "risk_score": 78.5,
            "severity": "HIGH",
            "evidence_count": 3,
            "source_well_ids": [
                wells_map["OIL-X104"].id,
                wells_map["OIL-X101"].id,
                wells_map["OIL-X106"].id,
            ],
            "explanation": (
                "3 high-similarity offset wells experienced stuck-pipe incidents in the 3180-3300m interval. "
                "Well X104 (3275-3295m, HIGH, 16 hrs NPT), Well X101 (3210-3240m, HIGH, 18 hrs NPT), "
                "Well X106 (3260-3290m, CRITICAL, 24 hrs NPT). "
                "Same Tipam formation. Differential sticking in permeable sandstone identified as root cause. "
                "High overbalance and thick filter cake are contributing factors."
            ),
        },
        {
            "event_type": "TORQUE_SPIKE",
            "depth_start": 3250.0,
            "depth_end": 3320.0,
            "formation": "Tipam",
            "risk_score": 55.0,
            "severity": "MEDIUM",
            "evidence_count": 3,
            "source_well_ids": [
                wells_map["OIL-X104"].id,
                wells_map["OIL-X101"].id,
                wells_map["OIL-X105"].id,
            ],
            "explanation": (
                "3 offset wells experienced torque spikes in the 3250-3320m interval. "
                "Well X104 (3445m), X101 (3380-3420m), X105 (3150-3200m). "
                "Reactive shale swelling and wellbore instability in inter-bedded shale-sandstone sequence."
            ),
        },
        {
            "event_type": "CEMENTING_ISSUE",
            "depth_start": 3400.0,
            "depth_end": 3480.0,
            "formation": "Tipam",
            "risk_score": 38.0,
            "severity": "MEDIUM",
            "evidence_count": 2,
            "source_well_ids": [
                wells_map["OIL-X102"].id,
                wells_map["OIL-X105"].id,
            ],
            "explanation": (
                "2 offset wells experienced cementing issues near this depth interval. "
                "Historical pattern of poor cement bond logs in transition zone."
            ),
        },
    ]

    for rz_data in risk_zones:
        src_ids = rz_data.pop("source_well_ids")
        rz = RiskZone(
            active_well_id=active_well.id,
            source_well_ids=src_ids,
            **rz_data,
        )
        db.add(rz)

    db.commit()
    print(f"  Seeded {len(risk_zones)} risk zones.")


def seed_alerts(db, wells_map):
    """Seed initial alerts for the demo scenario."""
    print("Seeding alerts...")

    active_well = wells_map[ACTIVE_WELL_ID]

    alerts_data = [
        {
            "alert_type": "RISK_APPROACHING",
            "severity": "MEDIUM",
            "depth": 3050.0,
            "message": "Historical Mud Loss zone approaching at 3095-3155m",
            "explanation": "Current depth 3050m. Historical mud loss risk zone begins at 3095m (45m ahead). 4 comparable offset wells experienced mud loss events in this interval.",
            "evidence": [
                {"well_id": "OIL-X104", "event": "MUD_LOSS", "depth": 3110, "severity": "MEDIUM", "npt_hrs": 8.5},
                {"well_id": "OIL-X101", "event": "MUD_LOSS", "depth": 3095, "severity": "MEDIUM", "npt_hrs": 6.5},
                {"well_id": "OIL-X106", "event": "MUD_LOSS", "depth": 3090, "severity": "MEDIUM", "npt_hrs": 7.0},
            ],
            "acknowledged": False,
        },
        {
            "alert_type": "SIMILARITY_HIGH",
            "severity": "LOW",
            "depth": 3050.0,
            "message": "High similarity detected: OIL-X104 (91% similar)",
            "explanation": "OIL-X104 shares 91% similarity with OIL-X123. Same formation (Tipam), similar depth, directional trajectory. Review X104 historical events for reference.",
            "evidence": [
                {"factor": "Formation similarity", "score": 96},
                {"factor": "Depth similarity", "score": 91},
                {"factor": "Distance similarity", "score": 83},
                {"factor": "Trajectory similarity", "score": 95},
                {"factor": "Parameter similarity", "score": 88},
            ],
            "acknowledged": False,
        },
    ]

    for ad in alerts_data:
        a = Alert(
            well_id=active_well.id,
            **ad,
        )
        db.add(a)

    db.commit()
    print(f"  Seeded {len(alerts_data)} alerts.")


def seed_simulation_state(db, wells_map):
    """Initialize the simulation state."""
    print("Seeding simulation state...")

    existing = db.query(SimulationState).first()
    if existing:
        db.delete(existing)
        db.commit()

    active_well = wells_map[ACTIVE_WELL_ID]
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
    print("  Simulation state initialized.")


def seed_document_chunks(db, doc_map):
    """Create simple text chunks for RAG retrieval."""
    print("Seeding document chunks for RAG...")

    chunks = []
    for doc_id_str, doc in doc_map.items():
        if not doc.text_content:
            continue
        # Split by paragraphs (simple chunking strategy)
        paragraphs = [p.strip() for p in doc.text_content.split('\n\n') if len(p.strip()) > 50]
        for i, para in enumerate(paragraphs):
            # Simple TF-IDF style keyword embedding (list of floats)
            # In production this would be a real embedding model
            # For demo: use a simple deterministic hash-based pseudo-embedding
            import hashlib
            words = para.lower().split()
            # Create a 64-dim pseudo-embedding from text hash
            h = hashlib.md5(para.encode()).hexdigest()
            embedding = [int(h[i % len(h)], 16) / 15.0 for i in range(64)]

            chunk = DocumentChunk(
                document_id=doc.id,
                chunk_index=i,
                chunk_text=para,
                embedding=embedding,
                depth_context=doc.depth_start,
                formation_context=doc.formation,
                event_type_context=None,
            )
            db.add(chunk)
            chunks.append(chunk)

    db.commit()
    print(f"  Seeded {len(chunks)} document chunks.")


def main():
    print("=" * 60)
    print("eRTMAC-NWIS Seed Data Generator")
    print("ALL DATA IS SYNTHETIC DEMO DATA")
    print("=" * 60)

    create_tables()

    db = SessionLocal()
    try:
        clear_tables(db)
        wells_map = seed_wells(db)
        doc_map = seed_documents(db, wells_map)
        seed_events(db, wells_map, doc_map)
        seed_drilling_parameters(db, wells_map)
        seed_risk_zones(db, wells_map)
        seed_alerts(db, wells_map)
        seed_simulation_state(db, wells_map)
        seed_document_chunks(db, doc_map)

        print("=" * 60)
        print("Seed complete!")
        print(f"  Active well: OIL-X123")
        print(f"  Total wells: {db.query(Well).count()}")
        print(f"  Total events: {db.query(WellEvent).count()}")
        print(f"  Total documents: {db.query(Document).count()}")
        print(f"  Total risk zones: {db.query(RiskZone).count()}")
        print(f"  Total alerts: {db.query(Alert).count()}")
        print("=" * 60)

    finally:
        db.close()


if __name__ == "__main__":
    main()
