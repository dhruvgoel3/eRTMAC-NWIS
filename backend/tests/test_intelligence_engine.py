"""
Unit and integration tests for the NWIS Intelligence Engine:
1. Offset Well Similarity Engine
2. Historical Risk Engine
"""
import pytest
from app.services.similarity import (
    SIMILARITY_WEIGHTS,
    calculate_similarity,
    rank_similar_wells,
    get_formation_similarity,
    get_depth_similarity,
    get_distance_similarity,
    get_trajectory_similarity,
    get_parameter_similarity,
)
from app.services.risk_engine import (
    RISK_THRESHOLDS,
    score_to_severity,
    format_risk_explanation,
    HISTORICAL_RISK_ZONES_BLUEPRINT,
    get_risk_zones_for_depth,
    calculate_overall_risk,
    DISCLAIMER_TEXT,
)
from app.database import SessionLocal
from app.models import Well, RiskZone


class MockWell:
    def __init__(self, well_id, formation, total_depth, trajectory_type, mud_weight=10.8):
        self.well_id = well_id
        self.formation = formation
        self.total_depth = total_depth
        self.trajectory_type = trajectory_type
        self.mud_weight = mud_weight
        self.name = f"Well {well_id}"


def test_similarity_weights_sum_to_one():
    """Verify configured factor weights sum to 100% (1.00)."""
    assert SIMILARITY_WEIGHTS["formation"] == 0.30
    assert SIMILARITY_WEIGHTS["depth"] == 0.25
    assert SIMILARITY_WEIGHTS["distance"] == 0.20
    assert SIMILARITY_WEIGHTS["trajectory"] == 0.15
    assert SIMILARITY_WEIGHTS["parameters"] == 0.10
    assert sum(SIMILARITY_WEIGHTS.values()) == pytest.approx(1.00)


def test_oil_x104_deterministic_similarity():
    """
    Verify OIL-X104 shows exact 91% similarity with factor breakdown:
    Formation: 96%
    Depth: 91%
    Distance: 88%
    Trajectory: 82%
    Parameters: 95%
    """
    active_well = MockWell("OIL-X123", "Tipam", 3850.0, "DIRECTIONAL", 10.8)
    offset_well = MockWell("OIL-X104", "Tipam", 3850.0, "DIRECTIONAL", 10.9)
    dist_km = 8.58

    sim = calculate_similarity(active_well, offset_well, dist_km)

    # Deterministic overall score
    assert sim["total_score"] == 91.0
    assert round(sim["total_score"]) == 91

    factors = sim["factors"]
    assert factors["formation"] == 96.0
    assert factors["depth"] == 91.0
    assert factors["distance"] == 88.0
    assert factors["trajectory"] == 82.0
    assert factors["parameters"] == 95.0

    # Weighted check: 0.30*96 + 0.25*91 + 0.20*88 + 0.15*82 + 0.10*95 = 90.95 -> 91%
    calculated = (
        0.30 * factors["formation"]
        + 0.25 * factors["depth"]
        + 0.20 * factors["distance"]
        + 0.15 * factors["trajectory"]
        + 0.10 * factors["parameters"]
    )
    assert calculated == pytest.approx(90.95)

    # Verify explanations exist for every factor
    explanations = sim["factor_explanations"]
    assert "Formation: 96%" in explanations["formation"]
    assert "Depth: 91%" in explanations["depth"]
    assert "Distance: 88%" in explanations["distance"]
    assert "Trajectory: 82%" in explanations["trajectory"]
    assert "Drilling parameters: 95%" in explanations["parameters"]


def test_risk_severity_mapping():
    """Verify deterministic conversion of scores to strictly LOW, MEDIUM, HIGH, CRITICAL."""
    assert score_to_severity(25) == "LOW"
    assert score_to_severity(30) == "LOW"
    assert score_to_severity(31) == "MEDIUM"
    assert score_to_severity(60) == "MEDIUM"
    assert score_to_severity(61) == "HIGH"
    assert score_to_severity(80) == "HIGH"
    assert score_to_severity(81) == "CRITICAL"
    assert score_to_severity(100) == "CRITICAL"


def test_standard_historical_risk_zones():
    """
    Verify historical risk zones include the exact demonstration intervals:
    - 3100-3150m: MUD LOSS
    - 3180-3290m: STUCK PIPE
    - 3250-3300m: TORQUE SPIKE
    """
    db = SessionLocal()
    active_well = db.query(Well).filter(Well.well_id == "OIL-X123").first()
    assert active_well is not None

    zones = db.query(RiskZone).filter(RiskZone.active_well_id == active_well.id).all()
    assert len(zones) >= 9

    zone_map = {(z.event_type, z.depth_start, z.depth_end): z for z in zones}

    # 1. Mud Loss
    mud_loss_zone = zone_map.get(("MUD_LOSS", 3100.0, 3150.0))
    assert mud_loss_zone is not None
    assert mud_loss_zone.severity in ("HIGH", "CRITICAL")
    assert "HIGH HISTORICAL RISK" in mud_loss_zone.explanation or "CRITICAL HISTORICAL RISK" in mud_loss_zone.explanation
    assert "4 comparable wells" in mud_loss_zone.explanation
    assert "same formation" in mud_loss_zone.explanation.lower()
    assert "similar depth" in mud_loss_zone.explanation.lower()
    assert "nearby geographic location" in mud_loss_zone.explanation.lower()
    assert DISCLAIMER_TEXT in mud_loss_zone.explanation

    # 2. Stuck Pipe
    stuck_pipe_zone = zone_map.get(("STUCK_PIPE", 3180.0, 3290.0))
    assert stuck_pipe_zone is not None
    assert stuck_pipe_zone.severity == "CRITICAL"
    assert "CRITICAL HISTORICAL RISK" in stuck_pipe_zone.explanation
    assert "comparable wells" in stuck_pipe_zone.explanation
    assert "historical stuck" in stuck_pipe_zone.explanation.lower()
    assert DISCLAIMER_TEXT in stuck_pipe_zone.explanation

    # 3. Torque Spike
    torque_zone = zone_map.get(("TORQUE_SPIKE", 3250.0, 3300.0))
    assert torque_zone is not None
    assert torque_zone.severity in ("HIGH", "MEDIUM")
    assert "Reason:" in torque_zone.explanation
    assert DISCLAIMER_TEXT in torque_zone.explanation

    db.close()


def test_non_certainty_disclaimer():
    """Verify system adheres to mandatory constraint: 'Never claim certainty about future events'."""
    explanation = format_risk_explanation(
        severity="HIGH",
        event_type="MUD_LOSS",
        comparable_wells_count=4,
        historical_events_count=3,
        formation="Tipam",
        depth_start=3100.0,
        depth_end=3150.0,
        distance_radius_km=8.6,
        offset_well_names=["OIL-X104", "OIL-X101", "OIL-X102", "OIL-X106"],
        operational_advice="Pre-stage LCM pills and throttle flow rate.",
    )

    assert "Non-Certainty Disclaimer:" in explanation
    assert "do not guarantee downhole conditions" in explanation
    assert "Real-time telemetry monitoring is required" in explanation
    # Must not contain certainty claims
    assert "will occur" not in explanation.lower()
    assert "certain to happen" not in explanation.lower()
    assert "guaranteed" not in explanation.lower()
