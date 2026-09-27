"""
Historical Risk Engine
=======================
Deterministically evaluates historical well event patterns near the active well
and calculates risk scores and risk zones.
Does NOT use random numbers.

Risk States:
  LOW:      0 - 30
  MEDIUM:  31 - 60
  HIGH:    61 - 80
  CRITICAL: 81 - 100

Mandatory Safety Standard:
  "Never claim certainty about future events."
  All advisories, explanations, and risk notices must emphasize historical correlation,
  elevated susceptibility, and the mandatory requirement for real-time sensor verification.
"""
from typing import List, Dict, Optional, Any
from sqlalchemy.orm import Session
from app.models import WellEvent, RiskZone, Well, Alert
from app.services.similarity import calculate_similarity
from app.services.geo import haversine_km

# ─── Configurable Risk Thresholds ─────────────────────────────────────────────
RISK_THRESHOLDS = {
    "LOW":      (0,  30),
    "MEDIUM":   (31, 60),
    "HIGH":     (61, 80),
    "CRITICAL": (81, 100),
}

DISCLAIMER_TEXT = (
    "Advisory Notice: Historical patterns indicate heightened susceptibility based on offset well data, "
    "but do not guarantee downhole conditions. Real-time telemetry monitoring is required."
)


def score_to_severity(score: float) -> str:
    """Convert a 0-100 risk score to a severity label."""
    if score <= 30:
        return "LOW"
    elif score <= 60:
        return "MEDIUM"
    elif score <= 80:
        return "HIGH"
    else:
        return "CRITICAL"


def format_risk_explanation(
    severity: str,
    event_type: str,
    comparable_wells_count: int,
    historical_events_count: int,
    formation: str,
    depth_start: float,
    depth_end: float,
    distance_radius_km: float,
    offset_well_names: List[str],
    operational_advice: str,
) -> str:
    """
    Constructs the standard structured risk explanation required by NWIS:
    {SEVERITY} HISTORICAL RISK
    Reason:
    • {N} comparable wells
    • {M} historical {event_type} events
    • Same formation
    • Similar depth
    • Nearby geographic location
    """
    clean_event = event_type.replace("_", " ").upper()
    well_list = ", ".join(offset_well_names[:4])

    lines = [
        f"{severity.upper()} HISTORICAL RISK",
        "Reason:",
        f"• {comparable_wells_count} comparable wells ({well_list})",
        f"• {historical_events_count} historical {clean_event.lower()} events",
        f"• Same formation: {formation}",
        f"• Similar depth: {depth_start:.0f}–{depth_end:.0f}m",
        f"• Nearby geographic location: within {distance_radius_km:.1f} km radius",
        "",
        f"Operational Advisory:\n{operational_advice}",
        "",
        f"Non-Certainty Disclaimer:\n{DISCLAIMER_TEXT}",
    ]
    return "\n".join(lines)


# ─── Core Historical Risk Zones Definition ────────────────────────────────────
HISTORICAL_RISK_ZONES_BLUEPRINT = [
    {
        "event_type": "MUD_LOSS",
        "depth_start": 3100.0,
        "depth_end": 3150.0,
        "formation": "Tipam",
        "severity": "HIGH",
        "risk_score": 76.0,
        "comparable_wells_count": 4,
        "historical_events_count": 4,
        "distance_radius_km": 8.6,
        "offset_well_names": ["OIL-X104", "OIL-X101", "OIL-X102", "OIL-X106"],
        "operational_advice": (
            "Pre-stage 50 bbl high-viscosity LCM pill (mica + nutplug) prior to 3,100m. "
            "Track active pit volumes at 10-second intervals. Throttle mud pump rate by 15% immediately "
            "upon observing dynamic flow differential."
        ),
    },
    {
        "event_type": "STUCK_PIPE",
        "depth_start": 3180.0,
        "depth_end": 3290.0,
        "formation": "Tipam",
        "severity": "CRITICAL",
        "risk_score": 88.0,
        "comparable_wells_count": 4,
        "historical_events_count": 3,
        "distance_radius_km": 10.0,
        "offset_well_names": ["OIL-X104", "OIL-X101", "OIL-X106", "OIL-X107"],
        "operational_advice": (
            "Spot 300L pipe-freeing lubricant pill prior to entering 3,180m. "
            "Maintain continuous drillstring rotation (>40 rpm) during all survey pauses. "
            "Limit differential pressure overbalance to <350 psi across permeable Tipam sands."
        ),
    },
    {
        "event_type": "TORQUE_SPIKE",
        "depth_start": 3250.0,
        "depth_end": 3300.0,
        "formation": "Tipam",
        "severity": "HIGH",
        "risk_score": 72.0,
        "comparable_wells_count": 3,
        "historical_events_count": 3,
        "distance_radius_km": 12.0,
        "offset_well_names": ["OIL-X104", "OIL-X101", "OIL-X105"],
        "operational_advice": (
            "Add 2% liquid lubricant to active mud system to reduce mechanical friction. "
            "If surface torque fluctuations exceed ±3.0 kft-lb, initiate reaming cycle "
            "with reduced WOB (<10 klbs) and increased rotary RPM (120 rpm)."
        ),
    },
    {
        "event_type": "STUCK_PIPE",
        "depth_start": 2200.0,
        "depth_end": 2400.0,
        "formation": "Girujan",
        "severity": "LOW",
        "risk_score": 25.0,
        "comparable_wells_count": 2,
        "historical_events_count": 1,
        "distance_radius_km": 15.0,
        "offset_well_names": ["OIL-X102", "OIL-X108"],
        "operational_advice": (
            "Monitor drag while pulling out of intermediate casing shoe. Low probability clay swelling hazard."
        ),
    },
    {
        "event_type": "NPT",
        "depth_start": 2800.0,
        "depth_end": 3000.0,
        "formation": "Langpur",
        "severity": "LOW",
        "risk_score": 28.0,
        "comparable_wells_count": 3,
        "historical_events_count": 3,
        "distance_radius_km": 14.0,
        "offset_well_names": ["OIL-X104", "OIL-X108", "OIL-X101"],
        "operational_advice": (
            "Schedule rig equipment servicing, shale shaker screen changes, and BHA inspections before crossing 2,800m."
        ),
    },
    {
        "event_type": "MUD_LOSS",
        "depth_start": 2920.0,
        "depth_end": 3000.0,
        "formation": "Langpur",
        "severity": "LOW",
        "risk_score": 30.0,
        "comparable_wells_count": 2,
        "historical_events_count": 2,
        "distance_radius_km": 12.0,
        "offset_well_names": ["OIL-X108", "OIL-X105"],
        "operational_advice": (
            "Ensure medium LCM inventory is on standby. Low severity seepage losses historically observed at boundary sand."
        ),
    },
    {
        "event_type": "OVERPRESSURE",
        "depth_start": 3600.0,
        "depth_end": 3700.0,
        "formation": "Tipam",
        "severity": "MEDIUM",
        "risk_score": 52.0,
        "comparable_wells_count": 2,
        "historical_events_count": 2,
        "distance_radius_km": 16.0,
        "offset_well_names": ["OIL-X103", "OIL-X107"],
        "operational_advice": (
            "Monitor D-exponent trend for pore pressure ramping. Prepare to weight up mud from 10.8 to 11.2 ppg if baseline deviates."
        ),
    },
    {
        "event_type": "CEMENTING_ISSUE",
        "depth_start": 3700.0,
        "depth_end": 3800.0,
        "formation": "Tipam",
        "severity": "MEDIUM",
        "risk_score": 45.0,
        "comparable_wells_count": 2,
        "historical_events_count": 2,
        "distance_radius_km": 10.0,
        "offset_well_names": ["OIL-X104", "OIL-X102"],
        "operational_advice": (
            "Increase spacer volume by 20% and install rigid centralizers every two joints across permeable zone for production casing."
        ),
    },
    {
        "event_type": "KICK",
        "depth_start": 3750.0,
        "depth_end": 3850.0,
        "formation": "Barail",
        "severity": "HIGH",
        "risk_score": 75.0,
        "comparable_wells_count": 3,
        "historical_events_count": 3,
        "distance_radius_km": 18.0,
        "offset_well_names": ["OIL-X103", "OIL-X107", "OIL-X105"],
        "operational_advice": (
            "Perform flow check at 3,750m. Function test annular BOP and choke manifold. Maintain mud weight >= 11.5 ppg."
        ),
    },
]


def get_depth_overlap_score(
    current_depth: float,
    zone_start: float,
    zone_end: float,
    lookahead_m: float = 300.0,
) -> Dict[str, Any]:
    """
    Determine the relationship between current depth and a risk zone.
    Returns:
      status: FAR | APPROACHING | ENTERED | PAST
      proximity_score: 0-1 (how close/relevant the zone is)
      distance_ahead: meters until zone start (negative if inside or past)
    """
    distance_ahead = zone_start - current_depth

    if current_depth > zone_end:
        return {"status": "PAST", "proximity_score": 0.0, "distance_ahead": distance_ahead}
    elif current_depth >= zone_start:
        return {"status": "ENTERED", "proximity_score": 1.0, "distance_ahead": 0.0}
    elif distance_ahead <= lookahead_m:
        # Approaching: score scales from 0.3 at lookahead to 1.0 at zone entry
        proximity = 0.3 + 0.7 * (1.0 - distance_ahead / lookahead_m)
        return {"status": "APPROACHING", "proximity_score": proximity, "distance_ahead": distance_ahead}
    else:
        return {"status": "FAR", "proximity_score": 0.0, "distance_ahead": distance_ahead}


def get_risk_zones_for_depth(
    db: Session,
    active_well_id: int,
    current_depth: float,
    max_look_ahead_m: float = 600.0,
) -> List[Dict]:
    """
    Get all risk zones relevant to the current depth for the active well.
    Includes zones the drill has entered, is approaching, or is about to enter.
    """
    zones = db.query(RiskZone).filter(
        RiskZone.active_well_id == active_well_id,
        RiskZone.depth_end >= current_depth - 50,
        RiskZone.depth_start <= current_depth + max_look_ahead_m,
    ).order_by(RiskZone.depth_start).all()

    result = []
    for zone in zones:
        depth_info = get_depth_overlap_score(current_depth, zone.depth_start, zone.depth_end)
        status = depth_info["status"]
        result.append({
            "id": zone.id,
            "zone_name": f"{zone.event_type} ({zone.depth_start:.0f}-{zone.depth_end:.0f}m)",
            "risk_type": zone.event_type,
            "event_type": zone.event_type,
            "depth_start": zone.depth_start,
            "depth_end": zone.depth_end,
            "formation": zone.formation,
            "risk_score": zone.risk_score,
            "severity": zone.severity,
            "evidence_count": zone.evidence_count,
            "explanation": zone.explanation,
            "recommended_action": zone.explanation,
            "source_well_ids": zone.source_well_ids,
            "status": status,
            "distance_ahead": depth_info["distance_ahead"],
            "proximity_score": depth_info["proximity_score"],
            "is_active": (status == "ENTERED"),
            "is_approaching": (status == "APPROACHING"),
        })

    return result


def calculate_overall_risk(
    risk_zones: List[Dict],
    current_depth: float,
) -> Dict[str, Any]:
    """
    Calculate the overall current risk level from all active risk zones.
    """
    if not risk_zones:
        return {
            "score": 5.0,
            "severity": "LOW",
            "level": "LOW",
            "highest_severity": "LOW",
            "message": "No historical risk zones detected in current depth range.",
            "summary": "No historical risk zones detected in current depth range.",
            "active_zones": 0,
            "active_zone_count": 0,
            "approaching_count": 0,
            "disclaimer": DISCLAIMER_TEXT,
        }

    max_score = 0.0
    active_zones = 0
    approaching_count = 0
    active_events = []

    for zone in risk_zones:
        if zone.get("status") in ("ENTERED", "APPROACHING"):
            active_zones += 1
            if zone.get("status") == "APPROACHING":
                approaching_count += 1
            weighted_score = (zone.get("risk_score") or 0.0) * (zone.get("proximity_score") or 0.0)
            if weighted_score > max_score:
                max_score = weighted_score
            if zone.get("event_type"):
                active_events.append(zone["event_type"])

    overall_severity = score_to_severity(max_score)

    if active_zones == 0:
        message = "No immediate historical risk zones in current depth window."
    elif any(z.get("status") == "ENTERED" for z in risk_zones):
        event_list = ", ".join(set(e.replace("_", " ") for z in risk_zones if z.get("status") == "ENTERED" for e in [z.get("event_type", "")] if e))
        message = f"Current depth has entered a historical {event_list} risk zone."
    else:
        closest = min((z for z in risk_zones if z.get("status") == "APPROACHING"),
                      key=lambda z: z.get("distance_ahead", 9999), default=None)
        if closest and closest.get("distance_ahead") is not None:
            message = f"Approaching historical {closest.get('event_type', '').replace('_', ' ')} zone in {closest['distance_ahead']:.0f}m."
        else:
            message = "Monitoring historical risk zones."

    return {
        "score": round(max_score, 1),
        "severity": overall_severity,
        "level": overall_severity,
        "highest_severity": overall_severity,
        "message": message,
        "summary": message,
        "active_zones": active_zones,
        "active_zone_count": active_zones,
        "approaching_count": approaching_count,
        "active_event_types": list(set(active_events)),
        "disclaimer": DISCLAIMER_TEXT,
    }



def generate_depth_alerts(
    db: Session,
    active_well,
    current_depth: float,
    previous_depth: float,
) -> List[Dict]:
    """
    Compare current and previous depth to detect newly triggered risk zones.
    Always includes non-certainty disclaimers.
    """
    new_alerts = []
    zones = get_risk_zones_for_depth(db, active_well.id, current_depth)

    for zone in zones:
        event_name = zone["event_type"].replace("_", " ")
        if zone["depth_start"] <= current_depth <= zone["depth_end"]:
            if previous_depth < zone["depth_start"]:
                alert = Alert(
                    well_id=active_well.id,
                    alert_type="RISK_ENTERED",
                    severity=zone["severity"],
                    depth=current_depth,
                    message=(
                        f"Current depth has entered historical {event_name} zone "
                        f"({zone['depth_start']:.0f}m - {zone['depth_end']:.0f}m in {zone['formation']})"
                    ),
                    explanation=zone["explanation"],
                    evidence={"zone": zone, "current_depth": current_depth, "disclaimer": DISCLAIMER_TEXT},
                    acknowledged=False,
                )
                db.add(alert)
                new_alerts.append(alert)

        elif zone["depth_start"] - current_depth <= 300 and zone["depth_start"] - previous_depth > 300:
            alert = Alert(
                well_id=active_well.id,
                alert_type="RISK_APPROACHING",
                severity=zone["severity"] if zone["severity"] in ("HIGH", "CRITICAL") else "MEDIUM",
                depth=current_depth,
                message=(
                    f"APPROACHING {event_name} RISK ZONE "
                    f"({zone['depth_start']:.0f}-{zone['depth_end']:.0f}m in {zone['formation']}). Standby mitigation."
                ),
                explanation=zone["explanation"],
                evidence={"zone": zone, "current_depth": current_depth, "disclaimer": DISCLAIMER_TEXT},
                acknowledged=False,
            )
            db.add(alert)
            new_alerts.append(alert)

    if new_alerts:
        db.commit()

    return new_alerts
