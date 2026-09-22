"""
Offset Well Similarity Engine
==============================
Calculates a transparent, weighted similarity score between the active well
and historical/nearby wells. Every factor is individually scored and explained.

Weights (configurable):
  Formation similarity:      30%
  Depth interval similarity: 25%
  Geographic distance:       20%
  Trajectory similarity:     15%
  Drilling parameter sim.:   10%
"""
import math
from typing import Dict, List, Optional, Any
from app.services.geo import haversine_km

# ─── Configurable Weights ─────────────────────────────────────────────────────
SIMILARITY_WEIGHTS = {
    "formation": 0.30,
    "depth": 0.25,
    "distance": 0.20,
    "trajectory": 0.15,
    "parameters": 0.10,
}

# Maximum distance for similarity scoring (km) — beyond this = 0% distance score
MAX_DISTANCE_KM = 50.0

# Formation similarity matrix:
# 1.0 = same formation, 0.6 = related, 0.2 = different
FORMATION_SIMILARITY = {
    ("Tipam",   "Tipam"):   1.0,
    ("Tipam",   "Namsang"): 0.65,
    ("Tipam",   "Langpur"): 0.55,
    ("Tipam",   "Barail"):  0.30,
    ("Tipam",   "Kopili"):  0.20,
    ("Tipam",   "Sylhet"):  0.15,
    ("Barail",  "Barail"):  1.0,
    ("Barail",  "Kopili"):  0.70,
    ("Barail",  "Sylhet"):  0.60,
    ("Barail",  "Tipam"):   0.30,
    ("Barail",  "Langpur"): 0.25,
    ("Barail",  "Namsang"): 0.25,
    ("Kopili",  "Kopili"):  1.0,
    ("Kopili",  "Sylhet"):  0.65,
    ("Kopili",  "Barail"):  0.70,
    ("Kopili",  "Tipam"):   0.20,
    ("Kopili",  "Langpur"): 0.20,
    ("Kopili",  "Namsang"): 0.20,
    ("Sylhet",  "Sylhet"):  1.0,
    ("Sylhet",  "Kopili"):  0.65,
    ("Sylhet",  "Barail"):  0.60,
    ("Sylhet",  "Tipam"):   0.15,
    ("Sylhet",  "Langpur"): 0.15,
    ("Sylhet",  "Namsang"): 0.15,
    ("Langpur", "Langpur"): 1.0,
    ("Langpur", "Tipam"):   0.55,
    ("Langpur", "Namsang"): 0.70,
    ("Langpur", "Barail"):  0.25,
    ("Langpur", "Kopili"):  0.20,
    ("Langpur", "Sylhet"):  0.15,
    ("Namsang", "Namsang"): 1.0,
    ("Namsang", "Tipam"):   0.65,
    ("Namsang", "Langpur"): 0.70,
    ("Namsang", "Barail"):  0.25,
    ("Namsang", "Kopili"):  0.20,
    ("Namsang", "Sylhet"):  0.15,
}

TRAJECTORY_SIMILARITY = {
    ("DIRECTIONAL", "DIRECTIONAL"): 1.0,
    ("VERTICAL",    "VERTICAL"):    1.0,
    ("HORIZONTAL",  "HORIZONTAL"):  1.0,
    ("DIRECTIONAL", "VERTICAL"):    0.50,
    ("DIRECTIONAL", "HORIZONTAL"):  0.60,
    ("VERTICAL",    "DIRECTIONAL"): 0.50,
    ("VERTICAL",    "HORIZONTAL"):  0.30,
    ("HORIZONTAL",  "DIRECTIONAL"): 0.60,
    ("HORIZONTAL",  "VERTICAL"):    0.30,
}


def get_formation_similarity(f1: Optional[str], f2: Optional[str]) -> float:
    if not f1 or not f2:
        return 0.5  # neutral if unknown
    key = (f1.strip(), f2.strip())
    rev_key = (f2.strip(), f1.strip())
    return FORMATION_SIMILARITY.get(key, FORMATION_SIMILARITY.get(rev_key, 0.2))


def get_trajectory_similarity(t1: Optional[str], t2: Optional[str]) -> float:
    if not t1 or not t2:
        return 0.5
    key = (t1.upper(), t2.upper())
    rev_key = (t2.upper(), t1.upper())
    return TRAJECTORY_SIMILARITY.get(key, TRAJECTORY_SIMILARITY.get(rev_key, 0.3))


def get_depth_similarity(depth1: float, depth2: float) -> float:
    """
    Score how similar two well total depths are.
    Within 5%: 1.0. Decreases linearly to 0 at 50% depth difference.
    """
    if depth1 <= 0 or depth2 <= 0:
        return 0.5
    diff_pct = abs(depth1 - depth2) / max(depth1, depth2)
    if diff_pct <= 0.05:
        return 1.0
    elif diff_pct >= 0.50:
        return 0.0
    else:
        return 1.0 - (diff_pct - 0.05) / 0.45


def get_distance_similarity(dist_km: float) -> float:
    """
    Score based on geographic proximity.
    < 5 km: 1.0. Decreases to 0 at MAX_DISTANCE_KM.
    """
    if dist_km <= 5.0:
        return 1.0
    elif dist_km >= MAX_DISTANCE_KM:
        return 0.0
    else:
        return 1.0 - (dist_km - 5.0) / (MAX_DISTANCE_KM - 5.0)


def get_parameter_similarity(
    active_mud_weight: Optional[float],
    other_mud_weight: Optional[float],
) -> float:
    """
    Simple mud weight similarity as proxy for parameter similarity.
    Within 0.5 ppg: 1.0. Decreases to 0 at 3 ppg difference.
    """
    if active_mud_weight is None or other_mud_weight is None:
        return 0.5
    diff = abs(active_mud_weight - other_mud_weight)
    if diff <= 0.5:
        return 1.0
    elif diff >= 3.0:
        return 0.0
    else:
        return 1.0 - (diff - 0.5) / 2.5


def calculate_similarity(
    active_well,
    other_well,
    dist_km: float,
) -> Dict[str, Any]:
    """
    Calculate a weighted similarity score between the active well and another well.

    Returns a dict with:
      - total_score: 0-100 weighted overall score
      - factors: individual factor scores (0-100 each)
      - explanation: text explaining the score
    """
    formation_sim = get_formation_similarity(active_well.formation, other_well.formation)
    depth_sim = get_depth_similarity(
        active_well.total_depth or 3850,
        other_well.total_depth or 3000
    )
    distance_sim = get_distance_similarity(dist_km)
    trajectory_sim = get_trajectory_similarity(
        active_well.trajectory_type,
        other_well.trajectory_type
    )
    parameter_sim = get_parameter_similarity(
        active_well.mud_weight,
        other_well.mud_weight
    )

    factors_raw = {
        "formation": formation_sim,
        "depth": depth_sim,
        "distance": distance_sim,
        "trajectory": trajectory_sim,
        "parameters": parameter_sim,
    }

    # Weighted sum
    total = sum(factors_raw[k] * SIMILARITY_WEIGHTS[k] for k in SIMILARITY_WEIGHTS)
    total_score = round(total * 100, 1)

    factors_pct = {k: round(v * 100, 1) for k, v in factors_raw.items()}

    # Build explanation
    explanation_parts = []
    for k, pct in factors_pct.items():
        label = {
            "formation": "Formation similarity",
            "depth": "Depth similarity",
            "distance": "Distance similarity",
            "trajectory": "Trajectory similarity",
            "parameters": "Parameter similarity",
        }[k]
        explanation_parts.append(f"{label}: {pct}%")

    if formation_sim == 1.0:
        explanation_parts.append(f"Same formation ({other_well.formation})")
    if trajectory_sim == 1.0:
        explanation_parts.append(f"Same trajectory type ({other_well.trajectory_type})")

    return {
        "total_score": total_score,
        "factors": factors_pct,
        "weights": {k: round(v * 100) for k, v in SIMILARITY_WEIGHTS.items()},
        "explanation": ". ".join(explanation_parts),
        "distance_km": round(dist_km, 2),
    }


def rank_similar_wells(
    active_well,
    candidate_wells: List,  # List of (well, distance_km) tuples
    top_n: int = 10,
) -> List[Dict]:
    """
    Rank a list of candidate wells by similarity score to the active well.
    Returns top_n wells with full similarity breakdown.
    """
    results = []
    for well, dist_km in candidate_wells:
        if well.well_id == active_well.well_id:
            continue
        sim = calculate_similarity(active_well, well, dist_km)
        results.append({
            "well": well,
            "distance_km": dist_km,
            "similarity_score": sim["total_score"],
            "factors": sim["factors"],
            "weights": sim["weights"],
            "explanation": sim["explanation"],
        })

    # Sort by similarity score descending
    results.sort(key=lambda x: x["similarity_score"], reverse=True)
    return results[:top_n]
