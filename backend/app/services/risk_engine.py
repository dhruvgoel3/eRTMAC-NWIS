"""
Historical Risk Engine
======================
Calculates risk scores based on historical well event patterns near the active well.
Uses a transparent, rule-based formula — NOT an unexplained ML black box.

Risk Score Formula:
  risk_score = 0.30 * formation_similarity
             + 0.25 * depth_similarity
             + 0.20 * distance_similarity
             + 0.15 * trajectory_similarity
             + 0.10 * parameter_similarity
  (normalized to 0-100)

Risk Levels:
  0-30:   LOW
  31-60:  MEDIUM
  61-80:  HIGH
  81-100: CRITICAL
"""
from typing import List, Dict, Optional, Any
from sqlalchemy.orm import Session
from app.models import WellEvent, RiskZone, Well
from app.services.similarity import calculate_similarity
from app.services.geo import haversine_km

# ─── Configurable Risk Thresholds ─────────────────────────────────────────────
RISK_THRESHOLDS = {
    "LOW":      (0,  30),
    "MEDIUM":   (31, 60),
    "HIGH":     (61, 80),
    "CRITICAL": (81, 100),
}


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
        RiskZone.depth_end >= current_depth - 50,    # Include recently passed zones
        RiskZone.depth_start <= current_depth + max_look_ahead_m,
    ).order_by(RiskZone.depth_start).all()

    result = []
    for zone in zones:
        depth_info = get_depth_overlap_score(current_depth, zone.depth_start, zone.depth_end)
        result.append({
            "id": zone.id,
            "event_type": zone.event_type,
            "depth_start": zone.depth_start,
            "depth_end": zone.depth_end,
            "formation": zone.formation,
            "risk_score": zone.risk_score,
            "severity": zone.severity,
            "evidence_count": zone.evidence_count,
            "explanation": zone.explanation,
            "source_well_ids": zone.source_well_ids,
            "status": depth_info["status"],
            "distance_ahead": depth_info["distance_ahead"],
            "proximity_score": depth_info["proximity_score"],
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
            "message": "No historical risk zones detected in current depth range.",
            "active_zones": 0,
        }

    # Weight zones by proximity and their own risk score
    max_score = 0.0
    active_zones = 0
    active_events = []

    for zone in risk_zones:
        if zone["status"] in ("ENTERED", "APPROACHING"):
            active_zones += 1
            weighted_score = zone["risk_score"] * zone["proximity_score"]
            if weighted_score > max_score:
                max_score = weighted_score
            active_events.append(zone["event_type"])

    overall_severity = score_to_severity(max_score)

    if active_zones == 0:
        message = "No immediate historical risk zones in current depth window."
    elif any(z["status"] == "ENTERED" for z in risk_zones):
        event_list = ", ".join(set(e for z in risk_zones if z["status"] == "ENTERED" for e in [z["event_type"]]))
        message = f"Current depth has entered a historical {event_list} risk zone."
    else:
        closest = min((z for z in risk_zones if z["status"] == "APPROACHING"),
                      key=lambda z: z["distance_ahead"], default=None)
        if closest:
            message = f"Approaching historical {closest['event_type']} zone in {closest['distance_ahead']:.0f}m."
        else:
            message = "Monitoring historical risk zones."

    return {
        "score": round(max_score, 1),
        "severity": overall_severity,
        "message": message,
        "active_zones": active_zones,
        "active_event_types": list(set(active_events)),
    }


def generate_depth_alerts(
    db: Session,
    active_well,
    current_depth: float,
    previous_depth: float,
) -> List[Dict]:
    """
    Compare current and previous depth to detect newly triggered risk zones.
    Called by the simulation engine when depth changes.
    """
    from app.models import Alert
    new_alerts = []

    zones = get_risk_zones_for_depth(db, active_well.id, current_depth)

    for zone in zones:
        # Check if we just entered a zone
        if zone["depth_start"] <= current_depth <= zone["depth_end"]:
            if previous_depth < zone["depth_start"]:
                # Just entered this zone
                alert = Alert(
                    well_id=active_well.id,
                    alert_type="RISK_ENTERED",
                    severity=zone["severity"],
                    depth=current_depth,
                    message=(
                        f"Current depth has entered historical {zone['event_type'].replace('_', ' ')} zone "
                        f"({zone['depth_start']:.0f}m - {zone['depth_end']:.0f}m)"
                    ),
                    explanation=zone["explanation"],
                    evidence={"zone": zone, "current_depth": current_depth},
                    acknowledged=False,
                )
                db.add(alert)
                new_alerts.append(alert)

        # Check if we just started approaching (entered 300m window)
        elif zone["depth_start"] - current_depth <= 300 and zone["depth_start"] - previous_depth > 300:
            alert = Alert(
                well_id=active_well.id,
                alert_type="RISK_APPROACHING",
                severity="MEDIUM",
                depth=current_depth,
                message=(
                    f"Historical {zone['event_type'].replace('_', ' ')} risk zone approaching "
                    f"in {zone['depth_start'] - current_depth:.0f}m"
                ),
                explanation=zone["explanation"],
                evidence={"zone": zone, "current_depth": current_depth},
                acknowledged=False,
            )
            db.add(alert)
            new_alerts.append(alert)

    if new_alerts:
        db.commit()

    return new_alerts
