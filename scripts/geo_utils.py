"""
Geospatial coordinate transformation utilities for drilling datasets.
Converts UTM Zone 31N (common in North Sea / FORCE 2020 / Volve) to WGS84 Lat/Lon.
Pure Python - zero external C-library dependencies.
"""
import math
from typing import Tuple


def utm_to_latlon(easting: float, northing: float, zone: int = 31, northern_hemisphere: bool = True) -> Tuple[float, float]:
    """
    Converts UTM coordinates to WGS84 Latitude and Longitude in decimal degrees.
    Accurate to within < 0.5 meters.
    """
    if easting is None or northing is None or math.isnan(easting) or math.isnan(northing):
        return (0.0, 0.0)

    # WGS84 ellipsoid constants
    a = 6378137.0  # semi-major axis
    f = 1 / 298.257223563  # flattening
    b = a * (1 - f)  # semi-minor axis
    e2 = (a ** 2 - b ** 2) / (a ** 2)  # first eccentricity squared
    e_prime_sq = (a ** 2 - b ** 2) / (b ** 2)  # second eccentricity squared
    k0 = 0.9996  # scale factor

    x = easting - 500000.0  # remove false easting
    y = northing if northern_hemisphere else northing - 10000000.0

    # Meridional arc
    M = y / k0
    mu = M / (a * (1 - e2 / 4 - 3 * e2 ** 2 / 64 - 5 * e2 ** 3 / 256))

    # Footprint latitude
    e1 = (1 - math.sqrt(1 - e2)) / (1 + math.sqrt(1 - e2))
    phi1 = mu + (3 * e1 / 2 - 27 * e1 ** 3 / 32) * math.sin(2 * mu) \
              + (21 * e1 ** 2 / 16 - 55 * e1 ** 4 / 32) * math.sin(4 * mu) \
              + (151 * e1 ** 3 / 96) * math.sin(6 * mu) \
              + (1097 * e1 ** 4 / 512) * math.sin(8 * mu)

    sin_phi1 = math.sin(phi1)
    cos_phi1 = math.cos(phi1)
    tan_phi1 = math.tan(phi1)

    N1 = a / math.sqrt(1 - e2 * sin_phi1 ** 2)
    T1 = tan_phi1 ** 2
    C1 = e_prime_sq * cos_phi1 ** 2
    R1 = a * (1 - e2) / ((1 - e2 * sin_phi1 ** 2) ** 1.5)
    D = x / (N1 * k0)

    # Latitude
    lat = phi1 - (N1 * tan_phi1 / R1) * (
        D ** 2 / 2
        - (5 + 3 * T1 + 10 * C1 - 4 * C1 ** 2 - 9 * e_prime_sq) * D ** 4 / 24
        + (61 + 90 * T1 + 298 * C1 + 45 * T1 ** 2 - 252 * e_prime_sq - 3 * C1 ** 2) * D ** 6 / 720
    )
    lat_deg = math.degrees(lat)

    # Longitude
    lon0 = (zone - 1) * 6 - 180 + 3  # Central meridian
    lon = (
        D
        - (1 + 2 * T1 + C1) * D ** 3 / 6
        + (5 - 2 * C1 + 28 * T1 - 3 * C1 ** 2 + 8 * e_prime_sq + 24 * T1 ** 2) * D ** 5 / 120
    ) / cos_phi1
    lon_deg = lon0 + math.degrees(lon)

    return (round(lat_deg, 6), round(lon_deg, 6))
