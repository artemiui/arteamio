import math
from typing import Tuple

EARTH_RADIUS_M = 6371000  # meters

def haversine_distance_m(lat1: float, lon1: float, lat2: float, lon2: float) -> int:
    """Calculate the great circle distance between two points on the earth in meters."""
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * (math.sin(delta_lambda / 2.0) ** 2)
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return int(round(EARTH_RADIUS_M * c))

def calculate_eta_mins(distance_m: int, walking_speed_m_per_min: float = 67.0) -> int:
    """Estimate walking arrival ETA in minutes (average 4 km/h ≈ 67 m/min)."""
    if distance_m <= 30:
        return 1
    return max(1, int(round(distance_m / walking_speed_m_per_min)))

def get_bounding_box(lat: float, lng: float, radius_m: float) -> Tuple[float, float, float, float]:
    """Return min_lat, max_lat, min_lng, max_lng bounding box for given radius."""
    lat_delta = radius_m / 111320.0
    lng_delta = radius_m / (111320.0 * math.cos(math.radians(lat)))
    return (lat - lat_delta, lat + lat_delta, lng - lng_delta, lng + lng_delta)
