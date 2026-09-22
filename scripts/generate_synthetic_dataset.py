#!/usr/bin/env python3
"""
scripts/generate_synthetic_dataset.py
======================================
Generates the canonical NWIS synthetic dataset.
Output: data/synthetic/nwis_canonical_dataset.json

ALL OUTPUT IS:
"Synthetic Demo Data — Not Real OIL Data"

Design:
  - Deterministic (seed=42) — same run always produces same output
  - Coherent story-driven data (not random noise)
  - Single source of truth for seed_data.py, SQL seeds, and AI context
  - 50 wells, 200+ events, 1000+ params, 30+ docs, 20+ risk zones, 10 formations
"""
from __future__ import annotations

import json
import math
import random
from datetime import datetime, timedelta
from pathlib import Path

random.seed(42)

SYNTHETIC_LABEL = "Synthetic Demo Data — Not Real OIL Data"
BASE_LAT = 27.2     # Duliajan Field, Assam
BASE_LON = 95.1
OUTPUT_DIR = Path(__file__).resolve().parent.parent / "data" / "synthetic"
OUTPUT_FILE = OUTPUT_DIR / "nwis_canonical_dataset.json"

# ─── FORMATIONS ───────────────────────────────────────────────────────────────
FORMATIONS = [
    {
        "name": "Tipam",
        "depth_min": 2200, "depth_max": 3600,
        "lithology": "Sandstone with shale interbeds",
        "age": "Miocene",
        "group": "Upper Assam Group",
        "typical_events": ["MUD_LOSS", "STUCK_PIPE", "TORQUE_SPIKE"],
        "mud_weight_min": 10.0, "mud_weight_max": 11.8,
        "avg_porosity": 22.0, "avg_permeability": 110.0,
        "color_hex": "#4a90d9",
        "description": (
            "Tipam formation is the primary reservoir target in the Duliajan Field. "
            "It comprises alternating sandstone and shale layers with moderate porosity "
            "and permeability. The fractured zones within Tipam are prone to mud losses. "
            "High overbalance in the permeable sandstone intervals leads to differential "
            "sticking. Reactive shale interbeds cause torque spikes."
        ),
    },
    {
        "name": "Barail",
        "depth_min": 3200, "depth_max": 4500,
        "lithology": "Coarse sandstone with limestone lenses",
        "age": "Oligocene",
        "group": "Barail Group",
        "typical_events": ["KICK", "OVERPRESSURE", "TORQUE_SPIKE"],
        "mud_weight_min": 11.0, "mud_weight_max": 13.0,
        "avg_porosity": 17.0, "avg_permeability": 75.0,
        "color_hex": "#7b68ee",
        "description": (
            "Barail formation is an overpressured sandstone reservoir with significant "
            "gas accumulations. The transition from Tipam to Barail is marked by a pore "
            "pressure ramp, requiring careful mud weight management to prevent kicks. "
            "Formation pressure can exceed hydrostatic by 15-25% without warning."
        ),
    },
    {
        "name": "Kopili",
        "depth_min": 3500, "depth_max": 4800,
        "lithology": "Shale with limestone interbeds",
        "age": "Eocene",
        "group": "Assam Shelf Group",
        "typical_events": ["CEMENTING_ISSUE", "NPT", "STUCK_PIPE"],
        "mud_weight_min": 12.0, "mud_weight_max": 13.8,
        "avg_porosity": 10.0, "avg_permeability": 20.0,
        "color_hex": "#50c878",
        "description": (
            "Kopili shale is a thick, regionally extensive seal formation. "
            "It is characterized by very low permeability and high in-situ stresses "
            "that make cementing problematic due to formation ballooning. "
            "NPT events are common from equipment failures in this interval."
        ),
    },
    {
        "name": "Sylhet",
        "depth_min": 3800, "depth_max": 5200,
        "lithology": "Limestone with dolomite",
        "age": "Eocene",
        "group": "Assam Shelf Group",
        "typical_events": ["STUCK_PIPE", "OVERPRESSURE", "FISHING"],
        "mud_weight_min": 13.0, "mud_weight_max": 15.5,
        "avg_porosity": 8.0, "avg_permeability": 35.0,
        "color_hex": "#ff8c00",
        "description": (
            "Sylhet limestone is a carbonate reservoir with naturally fractured zones. "
            "Abnormal pore pressure gradients are common due to isolated pressure "
            "compartments within the carbonate matrix. BHA failures in the hard "
            "carbonate lead to fishing operations."
        ),
    },
    {
        "name": "Langpur",
        "depth_min": 2500, "depth_max": 3300,
        "lithology": "Sandstone with thin shale breaks",
        "age": "Miocene",
        "group": "Upper Assam Group",
        "typical_events": ["MUD_LOSS", "FISHING", "NPT"],
        "mud_weight_min": 9.5, "mud_weight_max": 11.2,
        "avg_porosity": 25.0, "avg_permeability": 150.0,
        "color_hex": "#ff6b6b",
        "description": (
            "Langpur sandstone is a shallow, high-porosity formation with very good "
            "reservoir quality. The unconsolidated nature of shallow Langpur sands "
            "causes wellbore instability and mud losses at the transition to deeper "
            "formations. Junk losses and fishing operations are also recorded."
        ),
    },
    {
        "name": "Namsang",
        "depth_min": 3000, "depth_max": 3900,
        "lithology": "Alternating sandstone-shale (turbidite)",
        "age": "Miocene",
        "group": "Upper Assam Group",
        "typical_events": ["TORQUE_SPIKE", "CEMENTING_ISSUE", "MUD_LOSS"],
        "mud_weight_min": 10.5, "mud_weight_max": 12.2,
        "avg_porosity": 18.0, "avg_permeability": 65.0,
        "color_hex": "#ffd700",
        "description": (
            "Namsang formation is a turbidite sequence with rapidly alternating "
            "sandstone and shale layers. The high degree of heterogeneity causes "
            "reactive shale swelling, leading to torque spikes and tight-hole conditions. "
            "Cement channeling is common due to poor standoff in deviated wells."
        ),
    },
    {
        "name": "Girujan",
        "depth_min": 1500, "depth_max": 2300,
        "lithology": "Sandstone with clay",
        "age": "Pliocene",
        "group": "Upper Assam Group",
        "typical_events": ["NPT", "CEMENTING_ISSUE"],
        "mud_weight_min": 8.8, "mud_weight_max": 10.0,
        "avg_porosity": 30.0, "avg_permeability": 220.0,
        "color_hex": "#87ceeb",
        "description": (
            "Girujan formation is a shallow, unconsolidated sandstone at relatively "
            "low depth. It requires minimal mud weight but can have lost circulation "
            "due to its high permeability. Cementation of surface casing through "
            "Girujan needs careful monitoring."
        ),
    },
    {
        "name": "Bokabil",
        "depth_min": 2200, "depth_max": 3200,
        "lithology": "Sandstone-shale alternation with coal seams",
        "age": "Miocene",
        "group": "Upper Assam Group",
        "typical_events": ["MUD_LOSS", "TORQUE_SPIKE", "NPT"],
        "mud_weight_min": 9.8, "mud_weight_max": 11.5,
        "avg_porosity": 20.0, "avg_permeability": 88.0,
        "color_hex": "#d2691e",
        "description": (
            "Bokabil formation contains alternating sandstone-shale sequences with "
            "occasional coal seams. The coal seams can cause tool-related NPT and "
            "mud losses when intersected at high angles. Tight hole conditions "
            "frequently observed in the shale-dominant intervals."
        ),
    },
    {
        "name": "Bhuban",
        "depth_min": 3500, "depth_max": 5000,
        "lithology": "Thick sandstone with shale cap",
        "age": "Miocene",
        "group": "Middle Assam Group",
        "typical_events": ["STUCK_PIPE", "KICK", "OVERPRESSURE"],
        "mud_weight_min": 12.5, "mud_weight_max": 14.5,
        "avg_porosity": 15.0, "avg_permeability": 55.0,
        "color_hex": "#9370db",
        "description": (
            "Bhuban formation is a deep, thick sandstone reservoir with significant "
            "overpressure potential. It is a key exploration target in the sub-thrust "
            "belt of the Assam-Arakan Basin. Well control events and stuck pipe "
            "incidents are frequent due to pressure uncertainties."
        ),
    },
    {
        "name": "Surma",
        "depth_min": 4000, "depth_max": 5500,
        "lithology": "Limestone-shale alternation",
        "age": "Miocene",
        "group": "Deep Assam Group",
        "typical_events": ["OVERPRESSURE", "FISHING", "CEMENTING_ISSUE"],
        "mud_weight_min": 14.0, "mud_weight_max": 16.0,
        "avg_porosity": 7.0, "avg_permeability": 15.0,
        "color_hex": "#c0c0c0",
        "description": (
            "Surma formation represents the deepest commercial target in the Assam "
            "Basin. It is characterized by tight limestone-shale alternations with "
            "very high formation pressures. Cementing is extremely challenging due "
            "to narrow safe mud weight windows."
        ),
    },
]

# ─── EVENT TEMPLATES ──────────────────────────────────────────────────────────
ROOT_CAUSES = {
    "MUD_LOSS":        "Fractured formation with insufficient mud weight differential control. Natural fracture network intersected at depth.",
    "STUCK_PIPE":      "High differential pressure across permeable formation with thick filter cake. Overbalance exceeded safe threshold.",
    "KICK":            "Insufficient mud weight to contain formation pressure at depth. Pore pressure ramp-up not anticipated from offset well data.",
    "TORQUE_SPIKE":    "Reactive shale swelling reducing wellbore diameter. Poor wellbore stability in inter-bedded shale-sandstone sequence.",
    "OVERPRESSURE":    "Unexpected pressure transition zone. Pre-drill pore pressure model inaccurate due to limited seismic resolution.",
    "CEMENTING_ISSUE": "Mud contamination of cement slurry due to poor hole conditioning. Inadequate pipe centralization leading to channeling.",
    "FISHING":         "BHA wear and fatigue failure at threaded connection. Inadequate inspection interval before run.",
    "NPT":             "Equipment maintenance overdue. Inspection schedule not followed. Unplanned downtime from mechanical failure.",
}

MITIGATIONS = {
    "MUD_LOSS":        "LCM pill pumped. Bridging material used. Mud weight adjusted downwards by 0.3 ppg. Drill-in fluid prepared as contingency.",
    "STUCK_PIPE":      "Back-off initiated. Jar down operations activated. Spotting oil pill around stuck interval. 500L oil-base pill spotted.",
    "KICK":            "Well shut in. Driller's method kill procedure initiated. Mud weight increased by 0.8 ppg. BOP tested post-kill.",
    "TORQUE_SPIKE":    "Reaming to improve wellbore gauge. Torque-reduction chemical (lubricant) added to mud system. Sliding mode reduced.",
    "OVERPRESSURE":    "Mud weight increased incrementally (0.2 ppg steps). Offset well data reviewed. Pore pressure model updated.",
    "CEMENTING_ISSUE": "Squeeze cementing performed. CBL/VDL log re-run for verification. Centralizer count increased for future runs.",
    "FISHING":         "Fishing string assembly deployed. Overshot run. Reverse circulation fishing. Sidetrack planned as backup if unsuccessful.",
    "NPT":             "Emergency repair completed. Standby equipment mobilized from Duliajan base. Maintenance log updated. Preventive schedule revised.",
}

EVENT_DESCRIPTIONS = {
    "MUD_LOSS": [
        "Partial mud loss encountered in fractured zone at {depth:.0f}m. Returns decreased by 60%. LCM pill pumped immediately.",
        "Total mud loss observed at {depth:.0f}m. Circulation lost at fracture junction. Blind drilling not attempted. Bridging material applied.",
        "Mud loss at formation boundary at {depth:.0f}m. Lost returns for {npt:.1f} hours before regaining circulation. 3 LCM pills required.",
        "Partial loss zone at {depth:.0f}m in {formation} fractured interval. Flow rate reduced to 1200 lpm. Partial returns maintained.",
    ],
    "STUCK_PIPE": [
        "Differential sticking observed at {depth:.0f}m. High overbalance in {formation} permeable sandstone. Pipe could not be rotated.",
        "Mechanical stuck pipe due to wellbore instability in shale section at {depth:.0f}m. Back-off required after {npt:.1f} hrs.",
        "Pack-off while pulling out of hole at {depth:.0f}m. Tight hole observed over 30m interval. Pipe freed after oil pill treatment.",
        "Stuck pipe encountered at {depth:.0f}m in {formation}. Differential pressure sticking confirmed. {npt:.1f} hours NPT incurred.",
    ],
    "KICK": [
        "Gas kick detected at {depth:.0f}m during tripping. Pit gain of 2.4 m³ observed over 10 minutes. Well shut-in immediately.",
        "Formation fluid influx at {depth:.0f}m while drilling {formation}. Well control procedures initiated. Mud weight increased.",
        "Unexpected pressure surge in {formation} at {depth:.0f}m. Choke and kill line used for well control. {npt:.1f} hours NPT.",
        "Gas influx while making a connection at {depth:.0f}m. Shut-in drill pipe pressure 320 psi. Kill mud circulated successfully.",
    ],
    "TORQUE_SPIKE": [
        "Torque spikes observed intermittently at {depth:.0f}m. String drag increased by 25%. Reaming required to continue drilling.",
        "High torque and drag while rotating through {formation} shale at {depth:.0f}m. Lubricant pill spotted to reduce friction.",
        "Torque exceeds normal range at {depth:.0f}m — tight hole indicator. Intermittent pack-off observed. WOB reduced to 8t.",
        "Torque spike to {torque:.0f} kNm at {depth:.0f}m in reactive shale. Sliding difficult. RPM reduced and reaming in progress.",
    ],
    "OVERPRESSURE": [
        "Overpressured zone encountered at {depth:.0f}m. Formation pressure exceeds hydrostatic by 18%. Mud weight increased by 0.6 ppg.",
        "Pore pressure ramp-up observed at {depth:.0f}m in {formation} transition zone. D-exponent deviation noted 50m above event.",
        "Abnormally pressured formation at {depth:.0f}m in {formation} sand. Flow check positive. Mud weight increase and shut-in.",
        "Pressure surge at {depth:.0f}m — pit gain of 1.8 m³ observed. Driller's method kill initiated. {npt:.1f} hours NPT.",
    ],
    "CEMENTING_ISSUE": [
        "Poor cement bond observed on CBL/VDL at {depth:.0f}m. Channeling noted on log. Squeeze job required.",
        "Short circulation during cementing operation at {depth:.0f}m. Estimated 20% cement returns at surface. Remedial squeeze planned.",
        "Cement returns insufficient at surface during {formation} casing job. Possible losses during cement displacement.",
        "Free pipe indication on CBL log at {depth:.0f}m. Cement sheath incomplete over 40m interval. Micro-annulus suspected.",
    ],
    "FISHING": [
        "Bit cone loss at {depth:.0f}m. Fishing operation required. Overshot assembly deployed. {npt:.1f} hrs NPT.",
        "Junk in hole from previous operation at {depth:.0f}m. Junk basket and magnet deployed over 3 runs.",
        "BHA component parted at {depth:.0f}m. Reverse circulation fishing performed. Component recovered on run 2.",
        "Twist-off at drill collar connection at {depth:.0f}m. Fishing string with overshot deployed. {npt:.1f} hours NPT.",
    ],
    "NPT": [
        "Non-productive time at {depth:.0f}m due to top-drive failure. {npt:.1f} hours lost. Standby equipment mobilized.",
        "Rig equipment downtime at {depth:.0f}m. Generator failure. Operations suspended. {npt:.1f} hours NPT.",
        "Weather delay and logistics issue caused {npt:.1f} hours NPT at {depth:.0f}m. Cement and chemicals delivery delayed.",
        "Surface equipment maintenance required at {depth:.0f}m. Mud pump liner change and valve inspection. {npt:.1f} hrs.",
    ],
}

SEVERITY_DEFAULTS = {
    "MUD_LOSS":        ["LOW", "MEDIUM", "MEDIUM", "HIGH"],
    "STUCK_PIPE":      ["MEDIUM", "HIGH", "HIGH", "CRITICAL"],
    "KICK":            ["MEDIUM", "HIGH", "HIGH", "CRITICAL"],
    "TORQUE_SPIKE":    ["LOW", "LOW", "MEDIUM", "MEDIUM"],
    "OVERPRESSURE":    ["HIGH", "HIGH", "CRITICAL", "CRITICAL"],
    "CEMENTING_ISSUE": ["LOW", "MEDIUM", "MEDIUM", "HIGH"],
    "FISHING":         ["MEDIUM", "HIGH", "HIGH", "CRITICAL"],
    "NPT":             ["LOW", "LOW", "MEDIUM", "HIGH"],
}

NPT_DEFAULTS = {
    "MUD_LOSS":        [3.0, 6.5, 8.5, 14.0],
    "STUCK_PIPE":      [8.0, 16.0, 18.0, 24.0],
    "KICK":            [4.0, 8.0, 14.0, 22.0],
    "TORQUE_SPIKE":    [1.5, 2.5, 4.0, 6.0],
    "OVERPRESSURE":    [6.0, 10.0, 14.0, 20.0],
    "CEMENTING_ISSUE": [8.0, 10.0, 14.0, 20.0],
    "FISHING":         [12.0, 20.0, 28.0, 40.0],
    "NPT":             [2.0, 4.0, 6.5, 10.0],
}


def pick_event_detail(event_type, depth, formation, npt, torque=20):
    """Pick a deterministic description based on depth modulo."""
    templates = EVENT_DESCRIPTIONS.get(event_type, ["Event at {depth:.0f}m."])
    idx = int(depth) % len(templates)
    return templates[idx].format(depth=depth, formation=formation, npt=npt, torque=torque)


def pick_severity(event_type, depth):
    """Deterministic severity based on depth hash."""
    options = SEVERITY_DEFAULTS.get(event_type, ["LOW", "MEDIUM", "MEDIUM", "HIGH"])
    return options[int(depth) % len(options)]


def pick_npt(event_type, depth):
    """Deterministic NPT hours based on depth hash."""
    options = NPT_DEFAULTS.get(event_type, [2.0, 4.0, 6.0, 8.0])
    return options[int(depth) % len(options)]


def make_date(year, month, day):
    return datetime(year, month, day).isoformat()


# ─── WELL DEFINITIONS ─────────────────────────────────────────────────────────

def build_wells():
    """Build all 50 synthetic wells."""
    wells = []

    # ── OIL-X123: ACTIVE WELL ──────────────────────────────────────────────────
    wells.append({
        "well_id":          "OIL-X123",
        "name":             "Oil India Well X123 (Active)",
        "latitude":         BASE_LAT,
        "longitude":        BASE_LON,
        "field":            "Duliajan Field",
        "formation":        "Tipam",
        "total_depth":      3850.0,
        "well_type":        "Development",
        "trajectory_type":  "DIRECTIONAL",
        "spud_date":        make_date(2024, 6, 10),
        "completion_date":  None,
        "status":           "ACTIVE",
        "is_active":        True,
        "mud_weight":       10.8,
        "casing_program":   '30" conductor@30m | 20" surface@450m | 13-3/8" intermediate@2200m | 9-5/8" production@TD',
        "cementing_notes":  "Foam cement on surface casing. Conventional cement on intermediate. Tail slurry on production casing.",
        "lessons_learned":  "Active well — monitoring ongoing. Review X104 historical events before entering 3095-3600m interval.",
        "operator":         "Oil India Limited",
        "source_dataset":   "OIL_SYNTHETIC",
        "country":          "India",
        "basin":            "Assam-Arakan",
        "synthetic_label":  SYNTHETIC_LABEL,
        "notes":            "Primary demonstration well for NWIS eRTMAC prototype.",
    })

    # ── OIL-X104: MOST SIMILAR OFFSET WELL ────────────────────────────────────
    wells.append({
        "well_id":          "OIL-X104",
        "name":             "Oil India Well X104",
        "latitude":         BASE_LAT + 0.066,   # ~7.3 km NNE
        "longitude":        BASE_LON + 0.045,
        "field":            "Duliajan Field",
        "formation":        "Tipam",             # Same as X123 ← key similarity
        "total_depth":      3850.0,              # Same TD ← key similarity
        "well_type":        "Development",
        "trajectory_type":  "DIRECTIONAL",       # Same ← key similarity
        "spud_date":        make_date(2023, 3, 8),
        "completion_date":  make_date(2023, 11, 20),
        "status":           "COMPLETED",
        "is_active":        False,
        "mud_weight":       10.9,                # Very similar ← key similarity
        "casing_program":   '20" surface@440m | 13-3/8" intermediate@2150m | 9-5/8" production@TD',
        "cementing_notes":  "Foam cement surface. Conventional intermediate. Squeezed at 3280m post-completion.",
        "lessons_learned":  (
            "KEY OFFSET WELL — 91% similar to X123. Mud loss at 3120m (Tipam fracture zone). "
            "Stuck pipe at 3280m (high overbalance, 16 hrs NPT). "
            "Torque spike at 3450m (reactive shale). "
            "Recommend: LCM standby at 3050m. Monitor overbalance below 3200m. "
            "Spot lubricant pill at 3250m as preventive measure."
        ),
        "operator":         "Oil India Limited",
        "source_dataset":   "OIL_SYNTHETIC",
        "country":          "India",
        "basin":            "Assam-Arakan",
        "synthetic_label":  SYNTHETIC_LABEL,
        "notes":            "91% similarity to OIL-X123. Primary reference for risk prediction.",
    })

    # ── OIL-X101 through OIL-X108: PRIMARY NEARBY WELLS ─────────────────────
    nearby = [
        {
            "well_id":         "OIL-X101",
            "lat_off":  0.045, "lon_off":  0.020,   # 5 km NNE
            "formation":       "Tipam",
            "total_depth":     3720.0,
            "trajectory_type": "DIRECTIONAL",
            "mud_weight":      10.6,
            "spud_date":       make_date(2022, 4, 15),
            "completion_date": make_date(2022, 12, 8),
            "lessons_learned": "Mud loss at 3095m. Stuck pipe at 3210-3240m. High torque observed from 3380m onwards. Recommend LCM pills and lubrication from 3050m.",
        },
        {
            "well_id":         "OIL-X102",
            "lat_off": -0.030, "lon_off":  0.035,   # 4.5 km ESE
            "formation":       "Tipam",
            "total_depth":     3600.0,
            "trajectory_type": "VERTICAL",
            "mud_weight":      10.4,
            "spud_date":       make_date(2022, 9, 1),
            "completion_date": make_date(2023, 4, 20),
            "lessons_learned": "Mud loss at 3130m (partial, recovered). Cementing issue at 2900-2950m — channeling on CBL. Vertical trajectory mitigated stuck pipe risk.",
        },
        {
            "well_id":         "OIL-X103",
            "lat_off":  0.025, "lon_off": -0.040,   # 4.8 km WNW
            "formation":       "Barail",
            "total_depth":     4100.0,
            "trajectory_type": "DIRECTIONAL",
            "mud_weight":      11.2,
            "spud_date":       make_date(2022, 1, 20),
            "completion_date": make_date(2023, 2, 10),
            "lessons_learned": "Kick at 3550m (Barail overpressure zone). Overpressure at 3800m required mud weight increase to 12.5 ppg. Well control procedures critical below 3500m.",
        },
        {
            "well_id":         "OIL-X105",
            "lat_off": -0.055, "lon_off": -0.030,   # 6.6 km SSW
            "formation":       "Namsang",
            "total_depth":     3500.0,
            "trajectory_type": "VERTICAL",
            "mud_weight":      10.7,
            "spud_date":       make_date(2021, 6, 10),
            "completion_date": make_date(2022, 2, 28),
            "lessons_learned": "Torque spikes at 3150-3200m in reactive Namsang shale. Cementing issue at 3300m — squeeze required. LCM standby recommended.",
        },
        {
            "well_id":         "OIL-X106",
            "lat_off": -0.080, "lon_off":  0.060,   # 10.6 km ESE
            "formation":       "Tipam",
            "total_depth":     3400.0,
            "trajectory_type": "DIRECTIONAL",
            "mud_weight":      10.5,
            "spud_date":       make_date(2021, 11, 5),
            "completion_date": make_date(2022, 8, 18),
            "lessons_learned": "Mud loss at 3090m (similar depth to X104). CRITICAL stuck pipe at 3260-3290m (24 hrs NPT). X106 is second reference well for stuck pipe risk below 3200m.",
        },
        {
            "well_id":         "OIL-X107",
            "lat_off":  0.090, "lon_off": -0.070,   # 12.3 km NW
            "formation":       "Barail",
            "total_depth":     4200.0,
            "trajectory_type": "HORIZONTAL",
            "mud_weight":      11.8,
            "spud_date":       make_date(2020, 8, 12),
            "completion_date": make_date(2021, 9, 30),
            "lessons_learned": "CRITICAL kick at 3900m (Barail gas sand). Fishing at 4100m after BHA failure. Horizontal section extremely challenging — avoid in Barail without dedicated pore pressure study.",
        },
        {
            "well_id":         "OIL-X108",
            "lat_off":  0.015, "lon_off":  0.085,   # 9.7 km E
            "formation":       "Langpur",
            "total_depth":     3100.0,
            "trajectory_type": "VERTICAL",
            "mud_weight":      9.8,
            "spud_date":       make_date(2022, 7, 3),
            "completion_date": make_date(2023, 1, 12),
            "lessons_learned": "Mud loss at 2950m in Langpur unconsolidated sandstone. Fishing at 3050m (junk in hole from prior operation). Shallow total depth limits risk window.",
        },
    ]

    for w in nearby:
        wells.append({
            "well_id":          w["well_id"],
            "name":             f"Oil India Well {w['well_id'].replace('OIL-', '')}",
            "latitude":         BASE_LAT + w["lat_off"],
            "longitude":        BASE_LON + w["lon_off"],
            "field":            "Duliajan Field",
            "formation":        w["formation"],
            "total_depth":      w["total_depth"],
            "well_type":        "Development",
            "trajectory_type":  w["trajectory_type"],
            "spud_date":        w["spud_date"],
            "completion_date":  w["completion_date"],
            "status":           "COMPLETED",
            "is_active":        False,
            "mud_weight":       w["mud_weight"],
            "casing_program":   '20" surface@440m | 13-3/8" intermediate@2100m | 9-5/8" production@TD',
            "cementing_notes":  "Standard cement program. Foam cement for surface casing section.",
            "lessons_learned":  w["lessons_learned"],
            "operator":         "Oil India Limited",
            "source_dataset":   "OIL_SYNTHETIC",
            "country":          "India",
            "basin":            "Assam-Arakan",
            "synthetic_label":  SYNTHETIC_LABEL,
        })

    # ── ADDITIONAL 40 WELLS (OIL-X109 to X150, excluding X123) ──────────────
    formation_pool = [
        ("Tipam",   2200, 3600, 10.0, 11.8, ["MUD_LOSS","STUCK_PIPE","TORQUE_SPIKE"]),
        ("Barail",  3200, 4500, 11.0, 13.0, ["KICK","OVERPRESSURE","TORQUE_SPIKE"]),
        ("Kopili",  3500, 4800, 12.0, 13.8, ["CEMENTING_ISSUE","NPT","STUCK_PIPE"]),
        ("Sylhet",  3800, 5200, 13.0, 15.5, ["STUCK_PIPE","OVERPRESSURE","FISHING"]),
        ("Langpur", 2500, 3300,  9.5, 11.2, ["MUD_LOSS","FISHING","NPT"]),
        ("Namsang", 3000, 3900, 10.5, 12.2, ["TORQUE_SPIKE","CEMENTING_ISSUE","MUD_LOSS"]),
        ("Girujan", 1500, 2300,  8.8, 10.0, ["NPT","CEMENTING_ISSUE"]),
        ("Bokabil", 2200, 3200,  9.8, 11.5, ["MUD_LOSS","TORQUE_SPIKE","NPT"]),
        ("Bhuban",  3500, 5000, 12.5, 14.5, ["STUCK_PIPE","KICK","OVERPRESSURE"]),
        ("Surma",   4000, 5500, 14.0, 16.0, ["OVERPRESSURE","FISHING","CEMENTING_ISSUE"]),
    ]

    fields = ["Duliajan Field", "Naharkatia Field", "Moran Field", "Jorhat Field", "Makum Field"]
    rng = random.Random(42)

    well_nums = [i for i in range(109, 151) if i != 123]
    for i, well_num in enumerate(well_nums):
        angle = (i * 37 + 13) % 360  # deterministic angle
        dist_deg = 0.05 + (i % 10) * 0.04  # 0.05-0.45 degrees (~5-50 km)
        lat_off = dist_deg * math.cos(math.radians(angle))
        lon_off = dist_deg * math.sin(math.radians(angle))
        f_data = formation_pool[i % len(formation_pool)]
        f_name, f_dmin, f_dmax, mw_min, mw_max, _ = f_data
        depth = f_dmin + (i % 5) * (f_dmax - f_dmin) / 5
        mw = mw_min + (i % 4) * (mw_max - mw_min) / 4

        traj_options = ["VERTICAL", "DIRECTIONAL", "DIRECTIONAL", "HORIZONTAL"]
        traj = traj_options[i % 4]
        year = 2018 + (i % 6)
        month = 1 + (i % 12)
        field = fields[i % len(fields)]
        c_year = year + 1
        c_month = (month + 3 - 1) % 12 + 1

        wells.append({
            "well_id":          f"OIL-X{well_num}",
            "name":             f"Oil India Well X{well_num}",
            "latitude":         round(BASE_LAT + lat_off, 6),
            "longitude":        round(BASE_LON + lon_off, 6),
            "field":            field,
            "formation":        f_name,
            "total_depth":      round(depth, 1),
            "well_type":        "Exploratory" if i % 5 == 0 else "Development",
            "trajectory_type":  traj,
            "spud_date":        make_date(year, month, 1 + i % 28),
            "completion_date":  make_date(c_year, c_month, 1 + i % 25),
            "status":           "COMPLETED",
            "is_active":        False,
            "mud_weight":       round(mw, 1),
            "casing_program":   '20" surface@440m | 13-3/8" intermediate@2100m | 9-5/8" production@TD',
            "cementing_notes":  "Standard cement program.",
            "lessons_learned":  f"Completed well. Refer to WCR-X{well_num}-{c_year} for details.",
            "operator":         "Oil India Limited",
            "source_dataset":   "OIL_SYNTHETIC",
            "country":          "India",
            "basin":            "Assam-Arakan",
            "synthetic_label":  SYNTHETIC_LABEL,
        })

    return wells


# ─── EVENTS ───────────────────────────────────────────────────────────────────

# Key scripted events — these tell the coherent story
SCRIPTED_EVENTS = [
    # ── OIL-X104 (most similar well) ──────────────────────────────────────────
    {"well_id": "OIL-X104", "event_type": "MUD_LOSS",        "depth_start": 3120, "depth_end": 3138,
     "formation": "Tipam",  "severity": "MEDIUM", "npt_hours": 8.5,  "confidence": 0.97,
     "event_date": make_date(2023, 8, 15), "doc_ref": "DDR-X104-2023-08",
     "description": "Partial mud loss at 3120m in Tipam fractured zone. Returns dropped 60% over 40 minutes. 3 LCM pills pumped (50kg each). Returns restored after 8.5 hours.",
     "root_cause": "Fractured Tipam sandstone at 3120m — same fractured horizon observed in X101, X102, X106. Formation pressure window narrow (0.8 ppg).",
     "mitigation": "LCM pill (coarse nut plug + CaCO3) pumped. Mud weight reduced from 10.9 to 10.6 ppg. Blind drilling avoided."},
    {"well_id": "OIL-X104", "event_type": "STUCK_PIPE",      "depth_start": 3280, "depth_end": 3298,
     "formation": "Tipam",  "severity": "HIGH",   "npt_hours": 16.0, "confidence": 0.98,
     "event_date": make_date(2023, 9, 3), "doc_ref": "WCR-X104-2023",
     "description": "Differential sticking at 3280-3298m in Tipam permeable sandstone. Overbalance at 450 psi exceeded safe limit. Pipe rotation lost. Jar down operations initiated after 2 hours.",
     "root_cause": "High differential pressure across high-permeability Tipam sandstone at 3280m. Mud cake thickness 12mm. Overbalance 450 psi (recommended max: 300 psi).",
     "mitigation": "500L diesel-base spotting pill placed around stuck interval over 3 hours. Jar down + rotation freed pipe after 16 hours NPT. Mud weight reduced 0.2 ppg post-incident."},
    {"well_id": "OIL-X104", "event_type": "TORQUE_SPIKE",    "depth_start": 3450, "depth_end": 3470,
     "formation": "Tipam",  "severity": "MEDIUM", "npt_hours": 4.0,  "confidence": 0.96,
     "event_date": make_date(2023, 9, 12), "doc_ref": "DDR-X104-2023-09",
     "description": "Torque spikes to 24 kNm observed at 3450m in inter-bedded Tipam shale-sand sequence. Normal torque 18 kNm. Reaming required for 4 hours before drilling resumed.",
     "root_cause": "Reactive shale swelling in Tipam inter-beds. Wellbore diameter reduced below gauge. Borehole ellipticity due to anisotropic stress regime.",
     "mitigation": "Torque-reduction lubricant added to mud system (10 L/m³). Reaming with reduced WOB. RPM increased from 100 to 125 rpm to break out tight spots."},
    {"well_id": "OIL-X104", "event_type": "NPT",             "depth_start": 2950, "depth_end": 2950,
     "formation": "Langpur", "severity": "LOW",   "npt_hours": 3.5,  "confidence": 0.90,
     "event_date": make_date(2023, 7, 22), "doc_ref": "DDR-X104-2023-07",
     "description": "Mud pump liner failure at 2950m. Operations suspended for 3.5 hours. Liner replaced and pressure tested before resuming.",
     "root_cause": "Pump liner wear exceeded replacement threshold. Maintenance interval not adjusted for high-solids mud.",
     "mitigation": "Emergency liner replacement from rig spares. Hydraulics re-checked. Pump inspection schedule revised to 200-hour intervals."},
    {"well_id": "OIL-X104", "event_type": "CEMENTING_ISSUE", "depth_start": 3720, "depth_end": 3760,
     "formation": "Tipam",  "severity": "MEDIUM", "npt_hours": 12.0, "confidence": 0.88,
     "event_date": make_date(2023, 10, 5), "doc_ref": "WCR-X104-2023",
     "description": "CBL/VDL log showed channeling on production casing cement at 3720-3760m. Free pipe indication over 40m. Squeeze job performed.",
     "root_cause": "Mud contamination of lead cement slurry. Inadequate hole conditioning — 4 circulations recommended, only 2 done.",
     "mitigation": "Selective squeeze cementing at 3725m and 3750m perforations. CBL re-run confirmed improved bond. Well put on production."},

    # ── OIL-X101 (nearby, correlated events) ──────────────────────────────────
    {"well_id": "OIL-X101", "event_type": "MUD_LOSS",        "depth_start": 3095, "depth_end": 3115,
     "formation": "Tipam",  "severity": "MEDIUM", "npt_hours": 6.5,  "confidence": 0.95,
     "event_date": make_date(2022, 10, 8), "doc_ref": "DDR-X101-2022-10",
     "description": "Partial mud loss at 3095m. Same fractured Tipam horizon as X104 (drilled 10 months later). Returns reduced by 50%. LCM treatment successful.",
     "root_cause": "Same fractured Tipam zone intersected at 3095m. Regional fracture network confirmed by two wells (X101 + X104).",
     "mitigation": "LCM pill pumped. Mud weight reduced. Circulation restored after 6.5 hours."},
    {"well_id": "OIL-X101", "event_type": "STUCK_PIPE",      "depth_start": 3210, "depth_end": 3240,
     "formation": "Tipam",  "severity": "HIGH",   "npt_hours": 18.0, "confidence": 0.95,
     "event_date": make_date(2022, 11, 2), "doc_ref": "WCR-X101-2022",
     "description": "Severe differential sticking at 3210m in Tipam sandstone. 18 hours NPT. Spotting oil pill placed after 4 hours. Pipe freed after jar down combined with chemical treatment.",
     "root_cause": "High overbalance (480 psi) in high-permeability Tipam sandstone. Differential sticking pattern consistent with X104.",
     "mitigation": "Oil pill spotted. Jar operations (down). Pressure surge. Pipe freed after 18 hrs. Mud weight protocol revised."},
    {"well_id": "OIL-X101", "event_type": "TORQUE_SPIKE",    "depth_start": 3380, "depth_end": 3420,
     "formation": "Tipam",  "severity": "LOW",    "npt_hours": 2.5,  "confidence": 0.88,
     "event_date": make_date(2022, 11, 15), "doc_ref": None,
     "description": "Intermittent torque spikes from 3380m onwards in reactive Tipam shale inter-beds. Managed with reaming and lubricant addition.",
     "root_cause": "Reactive shale swelling. Consistent with X104 torque events at similar depth.",
     "mitigation": "Lubricant concentration increased. Reaming on trips. Acceptable drilling progress maintained."},
    {"well_id": "OIL-X101", "event_type": "NPT",             "depth_start": 3500, "depth_end": 3500,
     "formation": "Tipam",  "severity": "LOW",    "npt_hours": 4.0,  "confidence": 0.85,
     "event_date": make_date(2022, 12, 1), "doc_ref": None,
     "description": "Top-drive gearbox failure at 3500m. Operations suspended 4 hours. Standby top-drive engaged.",
     "root_cause": "Equipment fatigue. Inspection interval exceeded.",
     "mitigation": "Gearbox replaced. Preventive maintenance schedule updated."},

    # ── OIL-X102 (vertical well, correlated) ──────────────────────────────────
    {"well_id": "OIL-X102", "event_type": "MUD_LOSS",        "depth_start": 3130, "depth_end": 3160,
     "formation": "Tipam",  "severity": "LOW",    "npt_hours": 4.0,  "confidence": 0.90,
     "event_date": make_date(2022, 11, 10), "doc_ref": "DDR-X102-2022-11",
     "description": "Partial mud loss at 3130m. Vertical trajectory meant lower overbalance — losses moderate and recovered with one LCM treatment.",
     "root_cause": "Same Tipam fractured zone at 3130m. Vertical well reduces differential pressure compared to deviated wells.",
     "mitigation": "Single LCM pill restored circulation within 4 hours."},
    {"well_id": "OIL-X102", "event_type": "CEMENTING_ISSUE", "depth_start": 2900, "depth_end": 2950,
     "formation": "Tipam",  "severity": "MEDIUM", "npt_hours": 12.0, "confidence": 0.88,
     "event_date": make_date(2023, 3, 5), "doc_ref": "WCR-X102-2023",
     "description": "Poor cement bond log at 2900-2950m on intermediate casing. Channeling over 50m interval. Remedial squeeze performed.",
     "root_cause": "Mud contamination of cement during displacement. Spacer volume insufficient.",
     "mitigation": "Squeeze cementing at 2910m and 2940m. CBL improved post-squeeze."},
    {"well_id": "OIL-X102", "event_type": "NPT",             "depth_start": 3300, "depth_end": 3300,
     "formation": "Tipam",  "severity": "LOW",    "npt_hours": 3.0,  "confidence": 0.85,
     "event_date": make_date(2023, 2, 14), "doc_ref": None,
     "description": "Rig down due to mud pit maintenance at 3300m. 3 hours NPT.",
     "root_cause": "Scheduled maintenance delayed. Pit agitator failure.",
     "mitigation": "Agitator replaced. Pit maintenance rescheduled."},

    # ── OIL-X103 (Barail — different, deeper events) ──────────────────────────
    {"well_id": "OIL-X103", "event_type": "KICK",            "depth_start": 3550, "depth_end": 3580,
     "formation": "Barail",  "severity": "HIGH",   "npt_hours": 22.0, "confidence": 0.96,
     "event_date": make_date(2022, 10, 25), "doc_ref": "DDR-X103-2022-10",
     "description": "Gas kick at 3550m entering Barail sandstone. Pit gain 2.4 m³ over 12 minutes. Well shut-in. SIDPP 350 psi. Driller's method kill — circulated kill mud at 12.2 ppg.",
     "root_cause": "Pore pressure ramp-up in Barail not anticipated. Pre-drill model underestimated pressure by 1.2 ppg.",
     "mitigation": "Driller's method kill. Mud weight raised from 11.2 to 12.2 ppg. Choke managed. Kill complete after 22 hours."},
    {"well_id": "OIL-X103", "event_type": "TORQUE_SPIKE",    "depth_start": 3620, "depth_end": 3650,
     "formation": "Barail",  "severity": "MEDIUM", "npt_hours": 5.0,  "confidence": 0.90,
     "event_date": make_date(2022, 11, 8), "doc_ref": None,
     "description": "Torque spikes to 22 kNm in Barail shale interval at 3620m. Formation anisotropy causing string vibration.",
     "root_cause": "Barail formation anisotropy — high tectonic stress. Borehole deviation 18° increasing contact forces.",
     "mitigation": "Reduced drilling parameters. Reaming on connections. Progress continued after 5 hrs adjustment."},
    {"well_id": "OIL-X103", "event_type": "OVERPRESSURE",    "depth_start": 3800, "depth_end": 3850,
     "formation": "Barail",  "severity": "HIGH",   "npt_hours": 14.0, "confidence": 0.95,
     "event_date": make_date(2022, 12, 2), "doc_ref": "WCR-X103-2022",
     "description": "Overpressure zone at 3800m in deep Barail sandstone. Formation pressure gradient 0.78 psi/ft. Mud weight increase from 12.2 to 13.0 ppg required.",
     "root_cause": "Overpressure compartment in deep Barail — pressure seal above prevents pressure equilibration.",
     "mitigation": "Incremental mud weight increases (0.2 ppg steps). 14 hours NPT for kill mud mixing and conditioning."},
    {"well_id": "OIL-X103", "event_type": "NPT",             "depth_start": 3950, "depth_end": 3950,
     "formation": "Barail",  "severity": "MEDIUM", "npt_hours": 8.0,  "confidence": 0.88,
     "event_date": make_date(2023, 1, 10), "doc_ref": None,
     "description": "MWD tool failure at 3950m. Survey data lost over 200m interval. Back-reaming required for tool replacement.",
     "root_cause": "MWD shock and vibration damage. High torque/vibration environment in deep Barail.",
     "mitigation": "Tool retrieved and replaced. Survey re-run. Vibration dampening subs added to BHA."},

    # ── OIL-X105 (Namsang, correlated torque/cementing) ──────────────────────
    {"well_id": "OIL-X105", "event_type": "TORQUE_SPIKE",    "depth_start": 3150, "depth_end": 3200,
     "formation": "Namsang", "severity": "MEDIUM", "npt_hours": 3.0,  "confidence": 0.90,
     "event_date": make_date(2021, 11, 18), "doc_ref": "DDR-X105-2021-11",
     "description": "Torque spikes 3150-3200m in reactive Namsang shale. Turbidite sequence causing intermittent tight hole.",
     "root_cause": "Reactive Namsang shale swelling. Similar mechanism to Tipam inter-beds in X104.",
     "mitigation": "Lubricant pill. Reaming. Drilling continued with reduced parameters."},
    {"well_id": "OIL-X105", "event_type": "CEMENTING_ISSUE", "depth_start": 3300, "depth_end": 3350,
     "formation": "Namsang", "severity": "LOW",    "npt_hours": 9.0,  "confidence": 0.85,
     "event_date": make_date(2022, 1, 20), "doc_ref": "WCR-X105-2022",
     "description": "Minor cement channeling on production casing at 3300-3350m in Namsang formation. CBL showed intermittent bond.",
     "root_cause": "Poor centralization in deviated Namsang interval. Side-loading reduced cement coverage.",
     "mitigation": "Micro-annulus cement. Acceptable for production operations. No squeeze required."},
    {"well_id": "OIL-X105", "event_type": "MUD_LOSS",        "depth_start": 3080, "depth_end": 3100,
     "formation": "Namsang", "severity": "LOW",    "npt_hours": 2.5,  "confidence": 0.85,
     "event_date": make_date(2021, 10, 30), "doc_ref": None,
     "description": "Minor mud loss at 3080m at Langpur-Namsang transition. Controlled with LCM addition.",
     "root_cause": "Formation boundary — unconsolidated Langpur sand below Namsang.",
     "mitigation": "LCM pill — bridging material. Recovered in 2.5 hours."},

    # ── OIL-X106 (Tipam — CRITICAL stuck pipe corroboration) ─────────────────
    {"well_id": "OIL-X106", "event_type": "MUD_LOSS",        "depth_start": 3090, "depth_end": 3110,
     "formation": "Tipam",  "severity": "MEDIUM", "npt_hours": 7.0,  "confidence": 0.95,
     "event_date": make_date(2021, 12, 10), "doc_ref": "DDR-X106-2021-12",
     "description": "Mud loss at 3090m — confirms the Tipam fractured zone is regional (X101: 3095m, X104: 3120m, X106: 3090m). Triangulated fracture system at depth ~3090-3130m.",
     "root_cause": "Regional Tipam fracture network. 3 wells confirm this is a consistent risk horizon.",
     "mitigation": "LCM treatment. Mud weight reduced. Returns restored."},
    {"well_id": "OIL-X106", "event_type": "STUCK_PIPE",      "depth_start": 3260, "depth_end": 3290,
     "formation": "Tipam",  "severity": "CRITICAL", "npt_hours": 24.0, "confidence": 0.97,
     "event_date": make_date(2022, 1, 15), "doc_ref": "WCR-X106-2022",
     "description": "CRITICAL stuck pipe at 3260-3290m. Worst case in this field area — 24 hrs NPT. Overbalance 520 psi. Near-vertical differential sticking. Emergency oil pill.",
     "root_cause": "Highest overbalance of any X106 section. Drill string against formation wall. Maximum sticking force.",
     "mitigation": "Large volume oil pill (800L). Jar down with maximum jar load. String freed after 24 hrs. Near-sidetrack decision reached."},
    {"well_id": "OIL-X106", "event_type": "NPT",             "depth_start": 3180, "depth_end": 3180,
     "formation": "Tipam",  "severity": "LOW",    "npt_hours": 3.5,  "confidence": 0.88,
     "event_date": make_date(2021, 12, 20), "doc_ref": None,
     "description": "Generator failure at 3180m. Standby generator brought online. 3.5 hours NPT.",
     "root_cause": "Generator overload due to parallel high-consumption equipment.",
     "mitigation": "Load management improved. Standby generator always on hot standby."},

    # ── OIL-X107 (Barail CRITICAL, horizontal) ──────────────────────────────
    {"well_id": "OIL-X107", "event_type": "KICK",            "depth_start": 3900, "depth_end": 3950,
     "formation": "Barail",  "severity": "CRITICAL", "npt_hours": 30.0, "confidence": 0.97,
     "event_date": make_date(2021, 2, 18), "doc_ref": "DDR-X107-2021-02",
     "description": "CRITICAL gas kick in Barail horizontal section at 3900m. Pit gain 4.2 m³. Formation pressure significantly underestimated in horizontal. Well control emergency. 30 hours NPT.",
     "root_cause": "Horizontal wellbore ECD effects masked true bottomhole pressure. Pore pressure model not calibrated for horizontal wellbore in Barail.",
     "mitigation": "Emergency well control. Driller's method kill. Kill mud density 13.5 ppg. Additional mud weight added beyond pre-drill model."},
    {"well_id": "OIL-X107", "event_type": "FISHING",         "depth_start": 4100, "depth_end": 4120,
     "formation": "Barail",  "severity": "HIGH",   "npt_hours": 40.0, "confidence": 0.95,
     "event_date": make_date(2021, 3, 15), "doc_ref": "WCR-X107-2021",
     "description": "BHA failure in Barail horizontal section at 4100m. Drill collar parted at tool joint. Fishing operations required 40 hours. Overshot deployed × 3 attempts.",
     "root_cause": "Fatigue failure of drill collar connection. High-vibration environment in Barail horizontal with stick-slip.",
     "mitigation": "Overshot successfully engaged on run 3. Component retrieved. Premium connections specified for future horizontal runs."},
    {"well_id": "OIL-X107", "event_type": "OVERPRESSURE",    "depth_start": 4150, "depth_end": 4200,
     "formation": "Barail",  "severity": "HIGH",   "npt_hours": 12.0, "confidence": 0.90,
     "event_date": make_date(2021, 4, 2), "doc_ref": None,
     "description": "Secondary overpressure zone at 4150m in Barail horizontal extension. Mud weight required further increase.",
     "root_cause": "Second pressure compartment encountered in deep Barail horizontal.",
     "mitigation": "Mud weight increased to 13.8 ppg. Drilling continued."},

    # ── OIL-X108 (Langpur shallow events) ────────────────────────────────────
    {"well_id": "OIL-X108", "event_type": "MUD_LOSS",        "depth_start": 2950, "depth_end": 2990,
     "formation": "Langpur", "severity": "LOW",    "npt_hours": 3.0,  "confidence": 0.90,
     "event_date": make_date(2022, 8, 5), "doc_ref": "DDR-X108-2022-08",
     "description": "Mud loss at 2950m in unconsolidated Langpur sandstone. Shallow losses — easily controlled with LCM and mud weight reduction.",
     "root_cause": "Unconsolidated Langpur sand with high permeability and natural fractures.",
     "mitigation": "LCM pill. Mud weight reduced 0.3 ppg. Losses stopped."},
    {"well_id": "OIL-X108", "event_type": "FISHING",         "depth_start": 3050, "depth_end": 3080,
     "formation": "Langpur", "severity": "MEDIUM", "npt_hours": 20.0, "confidence": 0.90,
     "event_date": make_date(2022, 9, 18), "doc_ref": "WCR-X108-2022",
     "description": "Junk in hole at 3050m from prior operation debris (previous well). Junk basket deployed. 20 hours NPT. Magnet recovered metal fragments.",
     "root_cause": "Metal debris from previous workover operation not fully cleaned. Inadequate wellbore survey before drilling.",
     "mitigation": "Junk basket + magnet assembly. 3 clean-out runs required. Debris fully recovered."},
    {"well_id": "OIL-X108", "event_type": "NPT",             "depth_start": 2800, "depth_end": 2800,
     "formation": "Girujan",  "severity": "LOW",   "npt_hours": 2.5,  "confidence": 0.85,
     "event_date": make_date(2022, 7, 20), "doc_ref": None,
     "description": "Shaker screen replacement at 2800m. Routine maintenance took 2.5 hours at shift change.",
     "root_cause": "Shaker screens worn — expected at this depth interval.",
     "mitigation": "Screens replaced. No further action required."},
]


def build_additional_events(wells_data):
    """Generate coherent additional events for wells not in the scripted list."""
    scripted_well_ids = {e["well_id"] for e in SCRIPTED_EVENTS}
    additional = []
    rng = random.Random(42)

    # Formation-to-event mapping (coherent — not random)
    formation_events = {
        "Tipam":   [("MUD_LOSS", 60, 40), ("STUCK_PIPE", 80, 30), ("TORQUE_SPIKE", 50, 20), ("NPT", 30, 10)],
        "Barail":  [("KICK", 80, 30), ("OVERPRESSURE", 70, 25), ("TORQUE_SPIKE", 50, 20), ("NPT", 30, 15)],
        "Kopili":  [("CEMENTING_ISSUE", 50, 20), ("NPT", 40, 15), ("STUCK_PIPE", 60, 25)],
        "Sylhet":  [("STUCK_PIPE", 70, 25), ("OVERPRESSURE", 65, 20), ("FISHING", 80, 35)],
        "Langpur": [("MUD_LOSS", 45, 15), ("FISHING", 70, 20), ("NPT", 30, 8)],
        "Namsang": [("TORQUE_SPIKE", 45, 15), ("CEMENTING_ISSUE", 40, 12), ("MUD_LOSS", 40, 10)],
        "Girujan": [("NPT", 30, 8), ("CEMENTING_ISSUE", 35, 10)],
        "Bokabil": [("MUD_LOSS", 45, 12), ("TORQUE_SPIKE", 40, 10), ("NPT", 35, 8)],
        "Bhuban":  [("STUCK_PIPE", 65, 20), ("KICK", 70, 25), ("OVERPRESSURE", 75, 30)],
        "Surma":   [("OVERPRESSURE", 80, 30), ("FISHING", 85, 35), ("CEMENTING_ISSUE", 60, 20)],
    }

    # Well-based deterministic event generation
    for w in wells_data:
        wid = w["well_id"]
        if wid in scripted_well_ids or wid == "OIL-X123":
            continue

        formation = w.get("formation", "Tipam")
        td = w.get("total_depth", 3500)
        events_for_form = formation_events.get(formation, [("NPT", 30, 10), ("MUD_LOSS", 45, 12)])

        # Deterministic number of events based on well number
        well_num = int(wid.replace("OIL-X", ""))
        num_events = 4 + (well_num % 3)  # 4–6 events per well -> 200+ events total

        year = 2018 + (well_num % 6)
        month_start = 1 + (well_num % 12)

        for j in range(num_events):
            etype, risk_score, npt_base = events_for_form[j % len(events_for_form)]
            depth_frac = 0.50 + j * 0.07  # start at 50% of TD, step up
            depth_start = round(max(1800, min(td * depth_frac, td - 100)), 0)
            depth_end = round(depth_start + 20 + (j * 15), 0)
            npt = round(npt_base * (1 + (well_num % 3) * 0.2), 1)
            severity = pick_severity(etype, depth_start)
            desc = pick_event_detail(etype, depth_start, formation, npt)
            ev_month = (month_start + j) % 12 + 1
            ev_day = 1 + (well_num * j + 7) % 27

            additional.append({
                "well_id":     wid,
                "event_type":  etype,
                "depth_start": depth_start,
                "depth_end":   depth_end,
                "formation":   formation,
                "severity":    severity,
                "npt_hours":   npt,
                "confidence":  round(0.75 + (well_num % 5) * 0.04, 2),
                "event_date":  make_date(year, ev_month, ev_day),
                "doc_ref":     None,
                "description": desc,
                "root_cause":  ROOT_CAUSES.get(etype, "Cause not documented."),
                "mitigation":  MITIGATIONS.get(etype, "Standard operational response."),
            })

    return additional


# ─── DRILLING PARAMETERS ──────────────────────────────────────────────────────

def build_drilling_params(wells_data):
    """Build 1000+ drilling parameter records for key wells."""
    params = []
    key_wells = ["OIL-X123", "OIL-X104", "OIL-X101", "OIL-X102", "OIL-X103",
                 "OIL-X105", "OIL-X106", "OIL-X107", "OIL-X108"]

    # Well-specific baselines (deterministic, matches formation story)
    well_baselines = {
        "OIL-X123": {"rop": 12.0, "wob": 14.0, "rpm": 110, "torque": 18.2, "pressure": 2850, "flow": 1620, "hook": 185, "incl": 8.5, "az": 142},
        "OIL-X104": {"rop": 12.0, "wob": 14.5, "rpm": 110, "torque": 18.5, "pressure": 2860, "flow": 1620, "hook": 185, "incl": 8.5, "az": 142},
        "OIL-X101": {"rop": 11.5, "wob": 13.8, "rpm": 108, "torque": 17.8, "pressure": 2820, "flow": 1580, "hook": 180, "incl": 7.2, "az": 138},
        "OIL-X102": {"rop": 13.5, "wob": 12.5, "rpm": 115, "torque": 16.5, "pressure": 2750, "flow": 1550, "hook": 175, "incl": 0.5, "az": 0},  # vertical
        "OIL-X103": {"rop": 10.5, "wob": 15.0, "rpm": 105, "torque": 20.0, "pressure": 2950, "flow": 1680, "hook": 192, "incl": 12.0, "az": 155},
        "OIL-X105": {"rop": 11.0, "wob": 13.5, "rpm": 112, "torque": 17.5, "pressure": 2800, "flow": 1600, "hook": 178, "incl": 1.0, "az": 0},  # mostly vertical
        "OIL-X106": {"rop": 12.5, "wob": 14.0, "rpm": 110, "torque": 18.0, "pressure": 2830, "flow": 1610, "hook": 182, "incl": 10.0, "az": 148},
        "OIL-X107": {"rop": 8.5, "wob": 16.0,  "rpm": 100, "torque": 22.0, "pressure": 3100, "flow": 1720, "hook": 200, "incl": 85.0, "az": 160},  # horizontal
        "OIL-X108": {"rop": 14.0, "wob": 12.0, "rpm": 118, "torque": 16.0, "pressure": 2700, "flow": 1540, "hook": 170, "incl": 0.5, "az": 0},  # vertical
    }

    rng = random.Random(42)
    for well_id in key_wells:
        well = next((w for w in wells_data if w["well_id"] == well_id), None)
        if not well:
            continue
        td = well["total_depth"]
        b = well_baselines[well_id]
        depth = 2400.0
        ts = datetime(2023, 5, 1)
        step = 10.0

        while depth <= td:
            # Torque increases near stuck pipe zones (3200-3300m)
            torque = b["torque"]
            wob = b["wob"]
            rop = b["rop"]
            if 3200 <= depth <= 3300:
                torque += (depth - 3200) / 30  # gradual increase
                wob += 1.5
                rop *= 0.8

            # Pressure increases in overpressured zones (Barail/Bhuban)
            pressure = b["pressure"]
            if depth > 3500 and well["formation"] in ("Barail", "Bhuban", "Sylhet", "Surma"):
                pressure += (depth - 3500) * 0.4

            # Inclination increases in directional wells
            incl = b["incl"]
            if well["trajectory_type"] == "DIRECTIONAL" and depth > 2000:
                incl = min(incl + (depth - 2000) * 0.002, 30.0)
            elif well["trajectory_type"] == "HORIZONTAL" and depth > 3000:
                incl = min(85 + (depth - 3000) * 0.001, 90.0)

            # Small deterministic jitter (not random — depth-based)
            jitter = math.sin(depth * 0.1) * 0.05
            params.append({
                "well_id":     well_id,
                "timestamp":   ts.isoformat(),
                "depth":       round(depth, 1),
                "rop":         round(max(1.0, rop * (1 + jitter * 0.15)), 1),
                "wob":         round(max(5.0, wob * (1 + jitter * 0.08)), 1),
                "rpm":         round(max(60, b["rpm"] * (1 + jitter * 0.05))),
                "torque":      round(max(8.0, torque * (1 + jitter * 0.1)), 1),
                "pressure":    round(max(1800, pressure * (1 + jitter * 0.03))),
                "mud_flow":    round(max(1000, b["flow"] * (1 + jitter * 0.02))),
                "hook_load":   round(max(100, b["hook"] * (1 + jitter * 0.05)), 1),
                "inclination": round(max(0.0, min(90.0, incl)), 1),
                "azimuth":     round(max(0.0, min(360.0, b["az"] + jitter * 5)), 1),
                "mud_weight":  well["mud_weight"],
            })
            depth += step
            ts += timedelta(minutes=45)

    return params


# ─── DOCUMENTS ────────────────────────────────────────────────────────────────

def build_documents(wells_data):
    """Build 30+ realistic synthetic documents."""
    docs = []

    # Key wells and their formation context
    doc_wells = {
        "OIL-X104": {"formation": "Tipam",   "td": 3850, "mw": 10.9, "year": 2023},
        "OIL-X101": {"formation": "Tipam",   "td": 3720, "mw": 10.6, "year": 2022},
        "OIL-X102": {"formation": "Tipam",   "td": 3600, "mw": 10.4, "year": 2023},
        "OIL-X103": {"formation": "Barail",  "td": 4100, "mw": 11.2, "year": 2022},
        "OIL-X105": {"formation": "Namsang", "td": 3500, "mw": 10.7, "year": 2022},
        "OIL-X106": {"formation": "Tipam",   "td": 3400, "mw": 10.5, "year": 2022},
        "OIL-X107": {"formation": "Barail",  "td": 4200, "mw": 11.8, "year": 2021},
        "OIL-X108": {"formation": "Langpur", "td": 3100, "mw": 9.8,  "year": 2022},
    }

    for well_id, ctx in doc_wells.items():
        short = well_id.replace("OIL-", "")
        f = ctx["formation"]
        td = ctx["td"]
        mw = ctx["mw"]
        yr = ctx["year"]

        # ── DDR (July) ──
        m1 = 7
        docs.append({
            "document_id":   f"DDR-{short}-{yr}-07",
            "document_type": "DDR",
            "well_id":       well_id,
            "title":         f"Daily Drilling Report — {well_id} ({yr}-07)",
            "date":          make_date(yr, m1, 15),
            "depth_start":   td - 300,
            "depth_end":     td - 180,
            "formation":     f,
            "text_content":  _ddr_text(well_id, f, td, mw, yr, m1, phase="mid"),
        })

        # ── DDR (August) ──
        m2 = 8
        docs.append({
            "document_id":   f"DDR-{short}-{yr}-08",
            "document_type": "DDR",
            "well_id":       well_id,
            "title":         f"Daily Drilling Report — {well_id} ({yr}-08)",
            "date":          make_date(yr, m2, 15),
            "depth_start":   td - 180,
            "depth_end":     td - 60,
            "formation":     f,
            "text_content":  _ddr_text(well_id, f, td, mw, yr, m2, phase="lower"),
        })

        # ── DDR (September) ──
        m3 = 9
        docs.append({
            "document_id":   f"DDR-{short}-{yr}-09",
            "document_type": "DDR",
            "well_id":       well_id,
            "title":         f"Daily Drilling Report — {well_id} ({yr}-09)",
            "date":          make_date(yr, m3, 15),
            "depth_start":   td - 60,
            "depth_end":     td,
            "formation":     f,
            "text_content":  _ddr_text(well_id, f, td, mw, yr, m3, phase="TD"),
        })

        # ── WCR ──
        docs.append({
            "document_id":   f"WCR-{short}-{yr}",
            "document_type": "WCR",
            "well_id":       well_id,
            "title":         f"Well Completion Report — {well_id}",
            "date":          make_date(yr, 11, 20),
            "depth_start":   0,
            "depth_end":     td,
            "formation":     f,
            "text_content":  _wcr_text(well_id, f, td, mw, yr),
        })

    # ── Mud Logs for X104 and X101 (two highest-similarity wells) ──
    for wid, yr, f, td in [("OIL-X104", 2023, "Tipam", 3850), ("OIL-X101", 2022, "Tipam", 3720)]:
        short = wid.replace("OIL-", "")
        docs.append({
            "document_id":   f"MUDLOG-{short}-{yr}",
            "document_type": "MUD_LOG",
            "well_id":       wid,
            "title":         f"Mud Log Report — {wid} ({yr})",
            "date":          make_date(yr, 10, 1),
            "depth_start":   2800,
            "depth_end":     td,
            "formation":     f,
            "text_content":  _mudlog_text(wid, f, td, yr),
        })

    # ── Cementing Reports for X104 and X102 (both had cementing issues) ──
    for wid, yr, f, td, depth_c in [
        ("OIL-X104", 2023, "Tipam",  3850, 3720),
        ("OIL-X102", 2023, "Tipam",  3600, 2900),
    ]:
        short = wid.replace("OIL-", "")
        docs.append({
            "document_id":   f"CEM-{short}-{yr}",
            "document_type": "CEMENTING",
            "well_id":       wid,
            "title":         f"Cementing Report — {wid} ({yr})",
            "date":          make_date(yr, 10, 15),
            "depth_start":   depth_c - 50,
            "depth_end":     depth_c + 50,
            "formation":     f,
            "text_content":  _cementing_text(wid, f, depth_c, yr),
        })

    # ── Post-incident Reports for X106 and X107 (critical events) ──
    docs.append({
        "document_id":   "PIR-X106-2022-STUCKPIPE",
        "document_type": "OTHER",
        "well_id":       "OIL-X106",
        "title":         "Post-Incident Report — Stuck Pipe at 3260-3290m — OIL-X106",
        "date":          make_date(2022, 2, 1),
        "depth_start":   3260,
        "depth_end":     3290,
        "formation":     "Tipam",
        "text_content":  _incident_report("OIL-X106", "STUCK_PIPE", 3260, 3290, "CRITICAL", 24.0, "Tipam", 2022),
    })
    docs.append({
        "document_id":   "PIR-X107-2021-KICK",
        "document_type": "OTHER",
        "well_id":       "OIL-X107",
        "title":         "Post-Incident Report — Critical Kick at 3900m — OIL-X107",
        "date":          make_date(2021, 3, 1),
        "depth_start":   3900,
        "depth_end":     3950,
        "formation":     "Barail",
        "text_content":  _incident_report("OIL-X107", "KICK", 3900, 3950, "CRITICAL", 30.0, "Barail", 2021),
    })

    return docs


def _ddr_text(well_id, formation, td, mw, year, month, phase):
    phases = {"mid": (td-300, td-180), "lower": (td-180, td-60), "TD": (td-60, td)}
    d_start, d_end = phases[phase]
    return f"""DAILY DRILLING REPORT (DDR) — {well_id}
[{SYNTHETIC_LABEL}]
Date: {year}-{month:02d}-15 | Rig: DKB-350 | Field: Duliajan Field
Formation: {formation} | Depth Interval: {d_start:.0f}m — {d_end:.0f}m

OPERATIONS SUMMARY:
Drilled from {d_start:.0f}m to {d_end:.0f}m through {formation} formation.
Mud type: Water-Based Mud (WBM). Mud weight: {mw:.1f} ppg.
Average ROP: {11.5 + 0.5 * (month % 3):.1f} m/hr. Total footage drilled: {d_end - d_start:.0f}m.

DRILLING PARAMETERS:
WOB: {13.5 + 0.5 * (month % 3):.1f} t | RPM: {108 + month % 8} | Torque: {17.5 + 0.3 * (month % 4):.1f} kNm
Pump pressure: {2800 + month * 10} psi | Flow rate: {1580 + month * 5} lpm
Hook load: {180 + month % 5} t | Inclination: {7.5 + 0.2 * month:.1f}° | Azimuth: 140°

FORMATION DESCRIPTION:
{formation} sandstone with inter-bedded shale. Density 2.35-2.45 g/cc.
Shows: Gas shows 0-2% on hydrocarbon detector. Formation water influx: nil.
Cuttings: Fine-grained sandstone (60%), grey shale (40%).

EVENTS AND OBSERVATIONS:
- Mud weight maintained within {mw:.1f}-{mw+0.2:.1f} ppg window.
- Torque {' elevated above 20 kNm at ' + str(int(d_start + (d_end-d_start)*0.6)) + 'm' if phase == 'lower' else 'normal throughout'}.
- {'Partial mud loss at ' + str(int(d_start + 20)) + 'm — LCM pill pumped. Returns restored after 8 hrs.' if phase == 'mid' else 'No significant mud losses.'}
- LCM standby maintained (coarse nut plug + CaCO3).

NPT SUMMARY:
Total NPT this period: {4.5 + month * 0.3:.1f} hours.
Reason: {'Formation-related mud loss event.' if phase == 'mid' else 'Routine maintenance.'}

SAFETY:
No LTI events. HSE meeting conducted at 0700 hrs. All permits in order.

RECOMMENDATIONS:
1. Maintain mud weight ≤ {mw + 0.3:.1f} ppg to avoid inducing losses.
2. Have LCM pill staged and ready in pill tank before entering {d_end:.0f}m zone.
3. Monitor overbalance — keep below 350 psi in permeable {formation} intervals.
4. Increase ream frequency in shale-dominant sections to prevent pack-off.
"""


def _wcr_text(well_id, formation, td, mw, year):
    return f"""WELL COMPLETION REPORT (WCR) — {well_id}
[{SYNTHETIC_LABEL}]
Field: Duliajan Field | Operator: Oil India Limited
Rig: DKB-350 | Total Depth: {td:.0f}m | Primary Formation: {formation}
Final Mud Weight at TD: {mw:.1f} ppg

EXECUTIVE SUMMARY:
Well {well_id} was drilled to a total depth of {td:.0f}m in the {formation} formation,
Duliajan Field, Assam Basin. The well encountered the primary reservoir target
as prognosed with good formation evaluation results.

DRILLING HAZARDS ENCOUNTERED:
1. MUD LOSS at {td*0.81:.0f}m — Severity: MEDIUM
   Cause: Fractured {formation} sandstone. Regional fracture network confirmed by
   adjacent wells X101, X104, X106 at similar depths (3090-3130m interval).
   Action: LCM pill treatment. Returns restored. No wellbore integrity issues.

2. STUCK PIPE at {td*0.85:.0f}m — Severity: HIGH
   Cause: Differential sticking in high-permeability {formation} sandstone.
   Overbalance reached 450 psi. High filtercake thickness contributed.
   Action: Spotting oil pill. Jar operations. Pipe freed after 16 hrs NPT.
   Impact: 16 hours NPT. Cost: ~₹18.5 lakhs equivalent.

3. TORQUE SPIKE at {td*0.895:.0f}m — Severity: MEDIUM
   Cause: Reactive shale swelling in {formation} inter-beds.
   Action: Lubricant addition. Reaming. 4 hrs NPT.

FORMATION EVALUATION:
Reservoir quality (pay zone {td-180:.0f}m — {td-40:.0f}m):
  Porosity:       18-22% (average 20.5%)
  Permeability:   85-130 mD (average 107 mD)
  Water saturation: 28-35%
  Net pay:        {(td-180) - (td-40):.0f}m gross, ~62% NTG

CEMENTING:
- Surface casing cement: Good bond. No remedial action.
- Intermediate cement: Good bond overall. Minor channeling at 2150m — acceptable.
- Production casing: Channeling at {td - 130:.0f}m on CBL. Squeeze job performed.
  Post-squeeze CBL confirmed satisfactory bond.

COMPLETION RECOMMENDATION: Perforate {formation} pay zone {td-160:.0f}m — {td-60:.0f}m.

LESSONS LEARNED:
1. MUD LOSS RISK: Tipam fractured zone at 3090-3130m is now confirmed in 4 wells
   (X101, X102, X104, X106). Recommend proactive LCM pill before entering 3050m.

2. STUCK PIPE RISK: Overbalance > 400 psi in Tipam permeable sandstone (3200-3300m)
   leads to differential sticking. Recommend reducing mud weight by 0.2 ppg at 3150m
   and spotting 300L lubricant pill at 3200m as preventive measure.

3. TORQUE MANAGEMENT: Reactive Tipam shale at 3400-3500m requires lubricant standby
   and increased ream frequency.

4. OVERALL: Review this WCR before drilling any new well in Duliajan targeting Tipam
   below 3000m. Particularly relevant for OIL-X123 (currently drilling).

[{SYNTHETIC_LABEL}]
"""


def _mudlog_text(well_id, formation, td, year):
    return f"""MUD LOG REPORT — {well_id}
[{SYNTHETIC_LABEL}]
Field: Duliajan Field | Year: {year}
Interval: 2800m — {td:.0f}m | Formation: {formation}

LITHOLOGICAL DESCRIPTION (Depth-by-Depth):

2800m - 2950m: LANGPUR TRANSITION
  Lithology: Unconsolidated fine sandstone, traces of shale.
  Hydrocarbon shows: None.
  Mud returns: Full. Minor gas on detectors (0-1.5%).

2950m - 3100m: LANGPUR UPPER
  Lithology: Medium-grained sandstone, brown to light grey.
  Porosity (visual): 20-25% (cuttings estimate).
  Oil shows: Trace fluorescence under UV lamp.
  Mud returns: Full. Gas peaks 2-4%.

3100m - 3200m: TIPAM UPPER (FRACTURED ZONE)
  Lithology: Fine-grained sandstone with calcite-cemented fractures.
  CAUTION: Fractured zone identified at 3120m — LCM pill standby.
  Mud loss event at 3120m. Returns restored after LCM treatment.
  Gas shows: 4-6% on total gas. Ethane trace.

3200m - 3400m: TIPAM MIDDLE (HIGH PERMEABILITY)
  Lithology: Fine to medium sandstone. High porosity 20-24%.
  CAUTION: Differential sticking risk zone — high permeability.
  Stuck pipe event at 3280m (see DDR-{well_id.replace('OIL-','')}-{year}-09).
  Gas shows: 3-5%. Wet gas (C1/C2 ratio 0.8).

3400m - {td:.0f}m: TIPAM LOWER
  Lithology: Alternating sandstone-shale. Reactive shale intervals.
  Torque spike at 3450m from reactive shale swelling.
  Gas shows: 6-8% in reservoir intervals. Fluorescence strong.
  Final formation: {formation} sandstone — good reservoir quality.

SUMMARY:
Three distinct drilling hazard zones identified:
  1. 3095-3155m: Fracture-induced mud loss zone
  2. 3180-3300m: Differential sticking risk (high permeability, high overbalance)
  3. 3400-3500m: Reactive shale torque-spike zone

These zones are consistent with adjacent wells X101, X104, X106 in the Duliajan area.

[{SYNTHETIC_LABEL}]
"""


def _cementing_text(well_id, formation, depth, year):
    return f"""CEMENTING REPORT — {well_id}
[{SYNTHETIC_LABEL}]
Field: Duliajan Field | Date: {year}-10-15
Well: {well_id} | Casing: 9-5/8" Production Casing
Cement Interval: {depth-50:.0f}m — {depth+50:.0f}m | Formation: {formation}

CEMENTING JOB SUMMARY:
Job Type: Primary Cementation + Remedial Squeeze
Cement Class: Class G + 35% silica flour (high-temperature blend)
Additive Package: Retarder (0.3%), Anti-channeling agent (0.8%), Latex
Slurry Density: 15.8 ppg (lead) / 16.4 ppg (tail)

PRIMARY JOB RESULTS:
Returns at surface: Partial (estimated 65% of tail slurry returned).
Probable cause: Cement losses into fractured {formation} at {depth:.0f}m interval.
Bond log (CBL/VDL) showed channeling over {depth-15:.0f}m — {depth+15:.0f}m.

SQUEEZE JOB:
Perforations placed at {depth-10:.0f}m and {depth+5:.0f}m.
Squeeze pressure achieved: 1850 psi (hesitation squeeze technique).
Volume of squeeze cement: 2.5 m³.
Final hesitation squeeze pressure: stable at 1850 psi.

POST-SQUEEZE CBL RESULT:
Bond Quality: SATISFACTORY (>70% bond over critical intervals).
Channeling eliminated at primary perforations. Microannulus detected but
within acceptable limits for production operations.

LESSONS LEARNED:
1. Increase spacer volume from 3m³ to 5m³ for future wells in fractured {formation}.
2. Additional centralizers required in deviated section above {depth:.0f}m.
3. Latex additive concentration to be increased to 1.2% for better flexibility.

[{SYNTHETIC_LABEL}]
"""


def _incident_report(well_id, event_type, d_start, d_end, severity, npt, formation, year):
    event_names = {
        "STUCK_PIPE": "Stuck Pipe Incident",
        "KICK": "Well Control Incident — Gas Kick",
    }
    return f"""POST-INCIDENT REPORT — {event_names.get(event_type, event_type)} — {well_id}
[{SYNTHETIC_LABEL}]
Date: {year}-02-01 | Severity: {severity} | NPT: {npt:.1f} hours
Well: {well_id} | Depth: {d_start:.0f}m — {d_end:.0f}m | Formation: {formation}

INCIDENT SUMMARY:
A {severity.lower()} {event_type.replace('_',' ').lower()} incident occurred at {d_start:.0f}m
in the {formation} formation during drilling operations. The incident resulted in
{npt:.1f} hours of non-productive time.

ROOT CAUSE ANALYSIS (5-Why):
1. Why did {event_type.replace('_',' ').lower()} occur?
   → High differential pressure / formation pressure exceeded mud hydrostatics.
2. Why was differential pressure high?
   → Mud weight not reduced prior to entering high-permeability / overpressured zone.
3. Why was mud weight not reduced?
   → Offset well data indicating risk zone not reviewed prior to drilling this interval.
4. Why was offset well data not reviewed?
   → No formal well-adjacent data review step in pre-drill planning procedure.
5. Why is there no formal review step?
   → Process gap in drilling program approval workflow.

IMMEDIATE CORRECTIVE ACTIONS:
{ROOT_CAUSES.get(event_type, '')}
{MITIGATIONS.get(event_type, '')}

PREVENTIVE ACTIONS (for future wells):
1. Mandatory review of all offset well WCRs before entering risk depth intervals.
2. Pre-positioned mitigation (LCM pills, oil pill, kill mud) at surface before event depth.
3. Daily overbalance monitoring log with alert threshold at 350 psi.
4. Mud weight reduction protocol: reduce 0.2 ppg at 50m above any stuck-pipe risk zone.

APPLICABILITY TO FUTURE WELLS:
This incident is directly applicable to OIL-X123 (currently drilling).
OIL-X123 will enter the {formation} risk zone at approximately
{d_start - 10:.0f}m — {d_end + 10:.0f}m.
Recommend implementing all preventive actions above before reaching this depth.

[{SYNTHETIC_LABEL}]
"""


# ─── RISK ZONES ──────────────────────────────────────────────────────────────

def build_risk_zones():
    """Build 20+ risk zones for OIL-X123."""
    rz = [
        # ── PRIMARY RISK ZONES (matching key scripted events) ─────────────────
        {
            "active_well_id": "OIL-X123",
            "event_type":     "MUD_LOSS",
            "depth_start":    3090.0,
            "depth_end":      3155.0,
            "formation":      "Tipam",
            "risk_score":     72.0,
            "severity":       "HIGH",
            "evidence_count": 4,
            "source_well_ids_ref": ["OIL-X104", "OIL-X101", "OIL-X102", "OIL-X106"],
            "explanation":    (
                "4 offset wells experienced mud losses in the 3090-3155m interval. "
                "X104 (3120m, MEDIUM, 8.5 hrs NPT), X101 (3095m, MEDIUM, 6.5 hrs NPT), "
                "X102 (3130m, LOW, 4.0 hrs NPT), X106 (3090m, MEDIUM, 7.0 hrs NPT). "
                "Regional Tipam fracture network confirmed at this depth. "
                "Proactive LCM staging recommended before 3050m."
            ),
        },
        {
            "active_well_id": "OIL-X123",
            "event_type":     "STUCK_PIPE",
            "depth_start":    3180.0,
            "depth_end":      3310.0,
            "formation":      "Tipam",
            "risk_score":     85.0,
            "severity":       "CRITICAL",
            "evidence_count": 3,
            "source_well_ids_ref": ["OIL-X104", "OIL-X101", "OIL-X106"],
            "explanation":    (
                "3 high-similarity offset wells experienced stuck-pipe incidents in the 3180-3310m interval. "
                "X104 (3280-3298m, HIGH, 16 hrs NPT), X101 (3210-3240m, HIGH, 18 hrs NPT), "
                "X106 (3260-3290m, CRITICAL, 24 hrs NPT). "
                "Root cause: differential sticking in high-permeability Tipam sandstone. "
                "Overbalance >400 psi is the trigger. Recommend spotting 300L lubricant pill at 3180m "
                "and reducing mud weight by 0.2 ppg before entering this zone."
            ),
        },
        {
            "active_well_id": "OIL-X123",
            "event_type":     "TORQUE_SPIKE",
            "depth_start":    3380.0,
            "depth_end":      3520.0,
            "formation":      "Tipam",
            "risk_score":     58.0,
            "severity":       "MEDIUM",
            "evidence_count": 3,
            "source_well_ids_ref": ["OIL-X104", "OIL-X101", "OIL-X105"],
            "explanation":    (
                "3 offset wells experienced torque spikes in the 3380-3520m depth range. "
                "X104 (3450-3470m, MEDIUM, 4 hrs NPT), X101 (3380-3420m, LOW, 2.5 hrs NPT), "
                "X105 (3150-3200m in Namsang — similar reactive shale mechanism). "
                "Reactive shale swelling in Tipam inter-beds reduces wellbore diameter. "
                "Recommend lubrication pill and increased ream frequency from 3350m."
            ),
        },
        {
            "active_well_id": "OIL-X123",
            "event_type":     "CEMENTING_ISSUE",
            "depth_start":    3700.0,
            "depth_end":      3800.0,
            "formation":      "Tipam",
            "risk_score":     42.0,
            "severity":       "MEDIUM",
            "evidence_count": 2,
            "source_well_ids_ref": ["OIL-X104", "OIL-X102"],
            "explanation":    (
                "2 offset wells experienced cementing issues near production casing depth. "
                "X104 (3720-3760m, channeling, squeeze required), X102 (2900-2950m intermediate casing). "
                "Fractured Tipam at this depth absorbs cement. "
                "Recommend increasing spacer volume and centralizer count for production casing cement job."
            ),
        },

        # ── SECONDARY RISK ZONES ──────────────────────────────────────────────
        {
            "active_well_id": "OIL-X123",
            "event_type":     "NPT",
            "depth_start":    2800.0,
            "depth_end":      3000.0,
            "formation":      "Langpur",
            "risk_score":     30.0,
            "severity":       "LOW",
            "evidence_count": 3,
            "source_well_ids_ref": ["OIL-X104", "OIL-X108", "OIL-X101"],
            "explanation":    (
                "3 wells reported minor NPT events (equipment maintenance, screen changes) "
                "in the 2800-3000m Langpur interval. Low risk — routine maintenance NPT. "
                "No structural hazard. Schedule maintenance activities before entering this interval."
            ),
        },
        {
            "active_well_id": "OIL-X123",
            "event_type":     "MUD_LOSS",
            "depth_start":    2920.0,
            "depth_end":      3000.0,
            "formation":      "Langpur",
            "risk_score":     35.0,
            "severity":       "LOW",
            "evidence_count": 2,
            "source_well_ids_ref": ["OIL-X108", "OIL-X105"],
            "explanation":    (
                "2 wells reported minor mud losses in Langpur shallow sandstone. "
                "X108 (2950m, LOW) and X105 (3080m Langpur-Namsang boundary, LOW). "
                "Unconsolidated Langpur sand prone to minor losses at formation boundaries. "
                "Ensure LCM is pre-positioned before crossing 2900m."
            ),
        },
        {
            "active_well_id": "OIL-X123",
            "event_type":     "OVERPRESSURE",
            "depth_start":    3600.0,
            "depth_end":      3700.0,
            "formation":      "Tipam",
            "risk_score":     45.0,
            "severity":       "MEDIUM",
            "evidence_count": 1,
            "source_well_ids_ref": ["OIL-X103"],
            "explanation":    (
                "At depths below 3600m, Tipam transitions toward Barail overpressure regime. "
                "X103 encountered pore pressure ramp at 3550m in nearby Barail well. "
                "Monitor D-exponent from 3550m onwards. If anomaly detected, pause and assess."
            ),
        },
        {
            "active_well_id": "OIL-X123",
            "event_type":     "KICK",
            "depth_start":    3750.0,
            "depth_end":      3850.0,
            "formation":      "Barail",
            "risk_score":     55.0,
            "severity":       "HIGH",
            "evidence_count": 2,
            "source_well_ids_ref": ["OIL-X103", "OIL-X107"],
            "explanation":    (
                "If OIL-X123 penetrates into Barail formation below 3750m, kick risk is HIGH. "
                "X103 experienced gas kick at 3550m and X107 had critical kick at 3900m. "
                "Barail is overpressured in this area. Ensure mud weight ≥ 12.0 ppg before 3750m. "
                "Well control equipment to be tested at 3700m."
            ),
        },

        # ── ADDITIONAL RISK ZONES (to meet 20+ target) ────────────────────────
        {
            "active_well_id": "OIL-X123",
            "event_type":     "STUCK_PIPE",
            "depth_start":    2200.0,
            "depth_end":      2400.0,
            "formation":      "Girujan",
            "risk_score":     20.0,
            "severity":       "LOW",
            "evidence_count": 1,
            "source_well_ids_ref": ["OIL-X108"],
            "explanation":    "Shallow sticking risk in Girujan clay-rich sandstone. Low probability. Monitor drag while pulling out of intermediate casing shoe.",
        },
        {
            "active_well_id": "OIL-X123",
            "event_type":     "MUD_LOSS",
            "depth_start":    2400.0,
            "depth_end":      2500.0,
            "formation":      "Bokabil",
            "risk_score":     28.0,
            "severity":       "LOW",
            "evidence_count": 2,
            "source_well_ids_ref": ["OIL-X110", "OIL-X112"],
            "explanation":    "Bokabil sandstone at 2400-2500m occasionally has minor partial losses. Low severity. Have LCM on standby.",
        },
        {
            "active_well_id": "OIL-X123",
            "event_type":     "TORQUE_SPIKE",
            "depth_start":    2600.0,
            "depth_end":      2750.0,
            "formation":      "Bokabil",
            "risk_score":     22.0,
            "severity":       "LOW",
            "evidence_count": 2,
            "source_well_ids_ref": ["OIL-X113", "OIL-X114"],
            "explanation":    "Minor torque anomalies in Bokabil coal-bearing interval. Typically self-resolving with reduced WOB.",
        },
        {
            "active_well_id": "OIL-X123",
            "event_type":     "NPT",
            "depth_start":    2500.0,
            "depth_end":      2650.0,
            "formation":      "Bokabil",
            "risk_score":     18.0,
            "severity":       "LOW",
            "evidence_count": 2,
            "source_well_ids_ref": ["OIL-X115", "OIL-X116"],
            "explanation":    "Equipment-related NPT common in this depth range — pump and MWD tool maintenance.",
        },
        {
            "active_well_id": "OIL-X123",
            "event_type":     "CEMENTING_ISSUE",
            "depth_start":    2100.0,
            "depth_end":      2200.0,
            "formation":      "Girujan",
            "risk_score":     25.0,
            "severity":       "LOW",
            "evidence_count": 3,
            "source_well_ids_ref": ["OIL-X109", "OIL-X111", "OIL-X117"],
            "explanation":    "Intermediate casing cement quality in Girujan interval historically variable. Recommend additional centralizers and longer pre-flush.",
        },
        {
            "active_well_id": "OIL-X123",
            "event_type":     "MUD_LOSS",
            "depth_start":    3310.0,
            "depth_end":      3380.0,
            "formation":      "Tipam",
            "risk_score":     48.0,
            "severity":       "MEDIUM",
            "evidence_count": 2,
            "source_well_ids_ref": ["OIL-X101", "OIL-X104"],
            "explanation":    "Secondary fracture zone in upper Tipam at 3310-3380m. Observed in X101 as minor losses while pulling out.",
        },
        {
            "active_well_id": "OIL-X123",
            "event_type":     "STUCK_PIPE",
            "depth_start":    3520.0,
            "depth_end":      3600.0,
            "formation":      "Tipam",
            "risk_score":     40.0,
            "severity":       "MEDIUM",
            "evidence_count": 1,
            "source_well_ids_ref": ["OIL-X104"],
            "explanation":    "Lower Tipam sandstone continues to be a differential sticking risk. Single evidence well (X104) shows similar sand at this depth. Maintain lubricant concentration.",
        },
        {
            "active_well_id": "OIL-X123",
            "event_type":     "FISHING",
            "depth_start":    3050.0,
            "depth_end":      3090.0,
            "formation":      "Langpur",
            "risk_score":     22.0,
            "severity":       "LOW",
            "evidence_count": 1,
            "source_well_ids_ref": ["OIL-X108"],
            "explanation":    "Junk-in-hole risk from historical fishing operations in the area. Low probability for new wells with clean wellbore.",
        },
        {
            "active_well_id": "OIL-X123",
            "event_type":     "OVERPRESSURE",
            "depth_start":    3800.0,
            "depth_end":      3850.0,
            "formation":      "Barail",
            "risk_score":     62.0,
            "severity":       "HIGH",
            "evidence_count": 2,
            "source_well_ids_ref": ["OIL-X103", "OIL-X107"],
            "explanation":    "Deep Barail overpressure at TD. X103 (3800m) and X107 (4150m) both encountered overpressure compartments. Mud weight ≥ 13.0 ppg required.",
        },
        {
            "active_well_id": "OIL-X123",
            "event_type":     "TORQUE_SPIKE",
            "depth_start":    3600.0,
            "depth_end":      3700.0,
            "formation":      "Tipam",
            "risk_score":     35.0,
            "severity":       "MEDIUM",
            "evidence_count": 2,
            "source_well_ids_ref": ["OIL-X103", "OIL-X105"],
            "explanation":    "Torque anomalies in deep Tipam-Barail transition zone. X103 showed torque spikes at 3620m. Inter-bedded reactive shale.",
        },
        {
            "active_well_id": "OIL-X123",
            "event_type":     "NPT",
            "depth_start":    3150.0,
            "depth_end":      3200.0,
            "formation":      "Tipam",
            "risk_score":     32.0,
            "severity":       "LOW",
            "evidence_count": 2,
            "source_well_ids_ref": ["OIL-X104", "OIL-X101"],
            "explanation":    "Minor NPT events (pump maintenance, equipment checks) recorded in X104 and X101 at this depth. Timing risk — plan maintenance before entering this zone.",
        },
        {
            "active_well_id": "OIL-X123",
            "event_type":     "KICK",
            "depth_start":    3550.0,
            "depth_end":      3600.0,
            "formation":      "Barail",
            "risk_score":     52.0,
            "severity":       "HIGH",
            "evidence_count": 1,
            "source_well_ids_ref": ["OIL-X103"],
            "explanation":    "Barail entry at ~3550m is where X103 experienced a gas kick. Monitor gas units and pit volume continuously below 3500m.",
        },
        {
            "active_well_id": "OIL-X123",
            "event_type":     "CEMENTING_ISSUE",
            "depth_start":    3150.0,
            "depth_end":      3200.0,
            "formation":      "Tipam",
            "risk_score":     30.0,
            "severity":       "LOW",
            "evidence_count": 1,
            "source_well_ids_ref": ["OIL-X102"],
            "explanation":    "Cement quality risk in the fractured Tipam interval. X102 had intermediate casing channeling in this region. Use anti-channeling cement additive.",
        },
    ]
    return rz


# ─── SIMILARITY SCORES ────────────────────────────────────────────────────────

def build_similarity_scores():
    """Build precomputed similarity scores — OIL-X123 vs all offset wells."""
    scores = [
        {
            "reference_well_id": "OIL-X123",
            "offset_well_id":    "OIL-X104",
            "overall_score":     91.0,
            "formation_score":   96.0,   # Same Tipam
            "depth_score":       99.0,   # Same TD 3850m
            "trajectory_score":  95.0,   # Both DIRECTIONAL
            "distance_score":    83.0,   # 8.5 km
            "mud_weight_score":  97.0,   # 10.9 vs 10.8 ppg
            "event_pattern_score": 88.0, # MUD_LOSS + STUCK_PIPE + TORQUE_SPIKE
            "rank": 1,
            "explanation": [
                {"factor": "Formation", "score": 96, "detail": "Same Tipam formation, same field"},
                {"factor": "Total Depth", "score": 99, "detail": "Identical TD 3850m"},
                {"factor": "Trajectory", "score": 95, "detail": "Both directional wells"},
                {"factor": "Distance", "score": 83, "detail": "8.5 km separation"},
                {"factor": "Mud Weight", "score": 97, "detail": "10.8 vs 10.9 ppg"},
                {"factor": "Event Pattern", "score": 88, "detail": "MUD_LOSS + STUCK_PIPE + TORQUE_SPIKE"},
            ],
        },
        {
            "reference_well_id": "OIL-X123",
            "offset_well_id":    "OIL-X101",
            "overall_score":     78.0,
            "formation_score":   96.0,   # Same Tipam
            "depth_score":       88.0,   # 3720 vs 3850m
            "trajectory_score":  95.0,   # Both DIRECTIONAL
            "distance_score":    88.0,   # 5 km
            "mud_weight_score":  92.0,   # 10.6 vs 10.8 ppg
            "event_pattern_score": 75.0, # Correlated but fewer events
            "rank": 2,
            "explanation": [
                {"factor": "Formation", "score": 96, "detail": "Same Tipam formation"},
                {"factor": "Total Depth", "score": 88, "detail": "130m shallower (3720m)"},
                {"factor": "Trajectory", "score": 95, "detail": "Both directional wells"},
                {"factor": "Distance", "score": 88, "detail": "5 km separation"},
                {"factor": "Mud Weight", "score": 92, "detail": "10.6 vs 10.8 ppg"},
                {"factor": "Event Pattern", "score": 75, "detail": "MUD_LOSS + STUCK_PIPE overlap"},
            ],
        },
        {
            "reference_well_id": "OIL-X123",
            "offset_well_id":    "OIL-X106",
            "overall_score":     74.0,
            "formation_score":   96.0,   # Same Tipam
            "depth_score":       82.0,   # 3400 vs 3850m
            "trajectory_score":  95.0,   # Both DIRECTIONAL
            "distance_score":    72.0,   # 10.6 km
            "mud_weight_score":  90.0,   # 10.5 vs 10.8 ppg
            "event_pattern_score": 82.0, # MUD_LOSS + STUCK_PIPE (CRITICAL)
            "rank": 3,
            "explanation": [
                {"factor": "Formation", "score": 96, "detail": "Same Tipam formation"},
                {"factor": "Total Depth", "score": 82, "detail": "450m shallower (3400m)"},
                {"factor": "Trajectory", "score": 95, "detail": "Both directional wells"},
                {"factor": "Distance", "score": 72, "detail": "10.6 km separation"},
                {"factor": "Mud Weight", "score": 90, "detail": "10.5 vs 10.8 ppg"},
                {"factor": "Event Pattern", "score": 82, "detail": "CRITICAL stuck pipe at 3260m — key reference"},
            ],
        },
        {
            "reference_well_id": "OIL-X123",
            "offset_well_id":    "OIL-X102",
            "overall_score":     65.0,
            "formation_score":   96.0,
            "depth_score":       78.0,   # 3600 vs 3850m
            "trajectory_score":  60.0,   # VERTICAL vs DIRECTIONAL
            "distance_score":    85.0,   # 4.5 km
            "mud_weight_score":  88.0,
            "event_pattern_score": 62.0, # MUD_LOSS + CEMENTING only
            "rank": 4,
            "explanation": [
                {"factor": "Formation", "score": 96, "detail": "Same Tipam formation"},
                {"factor": "Trajectory", "score": 60, "detail": "Vertical vs directional — reduces similarity"},
                {"factor": "Distance", "score": 85, "detail": "4.5 km separation"},
                {"factor": "Event Pattern", "score": 62, "detail": "Mud loss overlap, different trajectory reduces sticking risk correlation"},
            ],
        },
        {
            "reference_well_id": "OIL-X123",
            "offset_well_id":    "OIL-X105",
            "overall_score":     52.0,
            "formation_score":   55.0,   # Namsang vs Tipam
            "depth_score":       82.0,   # 3500 vs 3850m
            "trajectory_score":  60.0,   # VERTICAL vs DIRECTIONAL
            "distance_score":    82.0,   # 6.6 km
            "mud_weight_score":  91.0,
            "event_pattern_score": 55.0, # TORQUE_SPIKE overlap
            "rank": 5,
            "explanation": [
                {"factor": "Formation", "score": 55, "detail": "Namsang vs Tipam — different formation reduces score"},
                {"factor": "Event Pattern", "score": 55, "detail": "Torque spike mechanism similar (reactive shale)"},
            ],
        },
        {
            "reference_well_id": "OIL-X123",
            "offset_well_id":    "OIL-X103",
            "overall_score":     45.0,
            "formation_score":   40.0,   # Barail vs Tipam
            "depth_score":       72.0,
            "trajectory_score":  95.0,
            "distance_score":    85.0,
            "mud_weight_score":  78.0,
            "event_pattern_score": 35.0, # Different event types
            "rank": 6,
            "explanation": [
                {"factor": "Formation", "score": 40, "detail": "Barail vs Tipam — different primary formation"},
                {"factor": "Event Pattern", "score": 35, "detail": "Kick/Overpressure patterns not primary risk for Tipam target"},
            ],
        },
        {
            "reference_well_id": "OIL-X123",
            "offset_well_id":    "OIL-X107",
            "overall_score":     38.0,
            "formation_score":   40.0,
            "depth_score":       68.0,
            "trajectory_score":  25.0,   # HORIZONTAL vs DIRECTIONAL
            "distance_score":    65.0,   # 12.3 km
            "mud_weight_score":  70.0,
            "event_pattern_score": 30.0,
            "rank": 7,
            "explanation": [
                {"factor": "Trajectory", "score": 25, "detail": "Horizontal vs directional — very different risk profile"},
                {"factor": "Formation", "score": 40, "detail": "Barail vs Tipam formation"},
            ],
        },
        {
            "reference_well_id": "OIL-X123",
            "offset_well_id":    "OIL-X108",
            "overall_score":     42.0,
            "formation_score":   35.0,   # Langpur vs Tipam
            "depth_score":       62.0,   # 3100 vs 3850m — significant difference
            "trajectory_score":  60.0,   # VERTICAL vs DIRECTIONAL
            "distance_score":    78.0,   # 9.7 km
            "mud_weight_score":  78.0,
            "event_pattern_score": 38.0,
            "rank": 8,
            "explanation": [
                {"factor": "Formation", "score": 35, "detail": "Langpur vs Tipam — different target"},
                {"factor": "Total Depth", "score": 62, "detail": "750m shallower — limited depth overlap"},
            ],
        },
    ]
    return scores


# ─── MAIN ─────────────────────────────────────────────────────────────────────

def main():
    print("=" * 65)
    print("eRTMAC-NWIS: Synthetic Dataset Generator")
    print(f"Label: {SYNTHETIC_LABEL}")
    print("=" * 65)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    print("[1/7] Building formations...")
    formations = FORMATIONS  # already defined above
    print(f"      {len(formations)} formations defined.")

    print("[2/7] Building wells...")
    wells = build_wells()
    print(f"      {len(wells)} wells built.")

    print("[3/7] Building events...")
    events = list(SCRIPTED_EVENTS) + build_additional_events(wells)
    print(f"      {len(events)} events built ({len(SCRIPTED_EVENTS)} scripted + {len(events) - len(SCRIPTED_EVENTS)} generated).")

    print("[4/7] Building drilling parameters...")
    params = build_drilling_params(wells)
    print(f"      {len(params)} parameter records built.")

    print("[5/7] Building documents...")
    docs = build_documents(wells)
    print(f"      {len(docs)} documents built.")

    print("[6/7] Building risk zones...")
    risk_zones = build_risk_zones()
    print(f"      {len(risk_zones)} risk zones built.")

    print("[7/7] Building similarity scores...")
    similarity = build_similarity_scores()
    print(f"      {len(similarity)} similarity scores built.")

    dataset = {
        "meta": {
            "label":           SYNTHETIC_LABEL,
            "generator":       "scripts/generate_synthetic_dataset.py",
            "seed":            42,
            "base_lat":        BASE_LAT,
            "base_lon":        BASE_LON,
            "field":           "Duliajan Field, Assam, India",
            "active_well":     "OIL-X123",
            "most_similar":    "OIL-X104",
            "counts": {
                "formations":          len(formations),
                "wells":               len(wells),
                "events":              len(events),
                "drilling_parameters": len(params),
                "documents":           len(docs),
                "risk_zones":          len(risk_zones),
                "similarity_scores":   len(similarity),
            },
        },
        "formations":          formations,
        "wells":               wells,
        "events":              events,
        "drilling_parameters": params,
        "documents":           docs,
        "risk_zones":          risk_zones,
        "similarity_scores":   similarity,
    }

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(dataset, f, indent=2, ensure_ascii=False, default=str)

    print()
    print("=" * 65)
    print(f"✅ Dataset written to: {OUTPUT_FILE}")
    print(f"   Formations:          {len(formations)}")
    print(f"   Wells:               {len(wells)}")
    print(f"   Events:              {len(events)}")
    print(f"   Drilling Parameters: {len(params)}")
    print(f"   Documents:           {len(docs)}")
    print(f"   Risk Zones:          {len(risk_zones)}")
    print(f"   Similarity Scores:   {len(similarity)}")
    print("=" * 65)


if __name__ == "__main__":
    main()
