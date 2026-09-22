"""
Geospatial utilities — Haversine distance and nearby well queries.
"""
import math
from typing import List, Tuple


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the great-circle distance between two points on Earth (in km).
    Uses the Haversine formula.
    """
    R = 6371.0  # Earth radius in km
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)

    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    c = 2 * math.asin(math.sqrt(a))
    return R * c


def get_bounding_box(lat: float, lon: float, radius_km: float) -> Tuple[float, float, float, float]:
    """
    Get a lat/lon bounding box for a given center and radius.
    Returns (min_lat, max_lat, min_lon, max_lon).
    Used for a fast pre-filter before Haversine distance calculation.
    """
    # Degrees per km (approximate)
    lat_deg_per_km = 1.0 / 110.574
    lon_deg_per_km = 1.0 / (111.320 * math.cos(math.radians(lat)))

    lat_margin = radius_km * lat_deg_per_km
    lon_margin = radius_km * lon_deg_per_km

    return (
        lat - lat_margin,
        lat + lat_margin,
        lon - lon_margin,
        lon + lon_margin,
    )


def find_nearby_wells(
    center_lat: float,
    center_lon: float,
    radius_km: float,
    wells: List,
) -> List[Tuple]:
    """
    Filter a list of well objects to those within radius_km of the center.
    Returns list of (well, distance_km) tuples, sorted by distance.
    Each well object must have .latitude and .longitude attributes.
    """
    min_lat, max_lat, min_lon, max_lon = get_bounding_box(center_lat, center_lon, radius_km)

    nearby = []
    for well in wells:
        # Bounding box pre-filter
        if not (min_lat <= well.latitude <= max_lat and min_lon <= well.longitude <= max_lon):
            continue
        # Exact haversine distance
        dist = haversine_km(center_lat, center_lon, well.latitude, well.longitude)
        if dist <= radius_km:
            nearby.append((well, round(dist, 2)))

    nearby.sort(key=lambda x: x[1])
    return nearby
