import math
from typing import List, Dict, Any, Optional
from app.services.spatial import haversine_distance_m

# Model Constants per CLAUDE.md §4.1
BETA = 1.7              # Distance-decay exponent penalizing walking beyond 3 mins (~200m)
MIN_DIST_M = 30         # Avoid division by zero at 0m
DIST_UNIT_M = 50        # Distance measured in 50m intervals
OUTSIDE_OPTION_M = 150  # Baseline "walk past / buy nothing" option
SATURATION_K = 0.6      # Exponential saturation coefficient
MIN_SCORE = 15          # Baseline UI floor

ARCHETYPES: Dict[str, Dict[str, Any]] = {
    "taho": {
        "name": "₱30 Taho Peddler",
        "name_tl": "₱30 Kuya Taho",
        "transit_weight": 1.0,
        "competitor_penalty": 0.9,
        "peak_hours_en": "5:30 AM – 9:00 AM",
        "peak_hours_tl": "5:30 AM – 9:00 AM (Pang-umaga)",
    },
    "siomai": {
        "name": "₱45 Siomai Rice Cart",
        "name_tl": "₱45 Siomai Rice Cart",
        "transit_weight": 1.4,
        "competitor_penalty": 1.2,
        "peak_hours_en": "11:30 AM – 1:30 PM & 5:00 PM – 8:00 PM",
        "peak_hours_tl": "11:30 AM – 1:30 PM & 5:00 PM – 8:00 PM (Tanghalian at Uwian)",
    },
    "balut": {
        "name": "₱25 Balut at Penoy Peddler",
        "name_tl": "₱25 Balut at Penoy",
        "transit_weight": 1.2,
        "competitor_penalty": 0.8,
        "peak_hours_en": "6:00 PM – 11:30 PM",
        "peak_hours_tl": "6:00 PM – 11:30 PM (Panggabi)",
    },
    "coffee": {
        "name": "₱120 Iced Coffee Stand",
        "name_tl": "₱120 Iced Coffee Stand",
        "transit_weight": 1.1,
        "competitor_penalty": 1.5,
        "peak_hours_en": "7:30 AM – 10:00 AM & 1:00 PM – 4:00 PM",
        "peak_hours_tl": "7:30 AM – 10:00 AM & 1:00 PM – 4:00 PM (Pang-gising at Meryenda)",
    },
}

def generate_local_anchors(lat: float, lng: float) -> List[Dict[str, Any]]:
    """Synthesize representative Philippine transit anchors around a coordinate."""
    offsets = [
        {"name": "Jeepney Waiting Shed / Sakayan", "type": "jeepney", "d_lat": 0.0010, "d_lng": 0.0008, "weight": 1.00},
        {"name": "Tricycle TODA Terminal", "type": "tricycle", "d_lat": -0.0009, "d_lng": 0.0011, "weight": 0.85},
        {"name": "Commuter Footbridge / Tawiran", "type": "footbridge", "d_lat": 0.0014, "d_lng": -0.0007, "weight": 0.95},
        {"name": "Barangay Hall & Plaza Junction", "type": "barangay", "d_lat": -0.0012, "d_lng": -0.0010, "weight": 0.75},
    ]
    return [
        {
            "id": f"anchor-{i}",
            "name": o["name"],
            "type": o["type"],
            "lat": lat + o["d_lat"],
            "lng": lng + o["d_lng"],
            "weight": o["weight"],
        }
        for i, o in enumerate(offsets)
    ]

def generate_local_competitors(lat: float, lng: float) -> List[Dict[str, Any]]:
    """Synthesize nearby competitor street food nodes around a coordinate."""
    offsets = [
        {"name": "Rolling Kariton Competitor A", "d_lat": 0.0008, "d_lng": 0.0005},
        {"name": "Corner Food Stall Competitor B", "d_lat": -0.0006, "d_lng": 0.0009},
        {"name": "Stationary Pop-up Competitor C", "d_lat": 0.0012, "d_lng": -0.0004},
    ]
    return [
        {
            "id": f"comp-{i}",
            "name": o["name"],
            "lat": lat + o["d_lat"],
            "lng": lng + o["d_lng"],
        }
        for i, o in enumerate(offsets)
    ]

def attraction(distance_m: float, strength: float = 1.0) -> float:
    """Huff spatial attraction = strength / (d / 50m)^beta."""
    d = max(float(distance_m), float(MIN_DIST_M)) / float(DIST_UNIT_M)
    return strength / (d ** BETA)

def evaluate_huff_viability(
    lat: float,
    lng: float,
    product_type: str = "taho",
    custom_transit_weight: Optional[float] = None,
    custom_competitor_penalty: Optional[float] = None,
    anchors: Optional[List[Dict[str, Any]]] = None,
    competitors: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """
    Evaluate foot-traffic attraction from transit anchors using Huff Gravity Model:
    Viability Score = sum(W_j / d_ij^beta) - lambda * (Competitor Density_i)
    """
    key = product_type.lower() if product_type.lower() in ARCHETYPES else "taho"
    archetype = ARCHETYPES[key]

    transit_weight = custom_transit_weight or archetype["transit_weight"]
    competitor_penalty = custom_competitor_penalty or archetype["competitor_penalty"]

    if anchors is None:
        anchors = generate_local_anchors(lat, lng)
    if competitors is None:
        competitors = generate_local_competitors(lat, lng)

    nearest_anchor_name = "Pangunahing Sakayan"
    min_anchor_dist = float("inf")
    anchors_within_300m = 0

    rival_strength = max(competitor_penalty, 0.5)
    outside = attraction(OUTSIDE_OPTION_M)
    expected_demand = 0.0

    for anchor in anchors:
        dist_m = haversine_distance_m(lat, lng, anchor["lat"], anchor["lng"])
        if dist_m < min_anchor_dist:
            min_anchor_dist = dist_m
            nearest_anchor_name = anchor["name"]

        if dist_m <= 300:
            anchors_within_300m += 1

        mine = attraction(dist_m)

        rivals = 0.0
        for comp in competitors:
            comp_to_anchor_m = haversine_distance_m(comp["lat"], comp["lng"], anchor["lat"], anchor["lng"])
            rivals += attraction(comp_to_anchor_m, rival_strength)

        share = mine / (mine + rivals + outside)
        expected_demand += anchor["weight"] * transit_weight * share

    competitors_within_150m = sum(
        1 for comp in competitors
        if haversine_distance_m(lat, lng, comp["lat"], comp["lng"]) <= 150
    )

    raw_score = 100.0 * (1.0 - math.exp(-expected_demand / SATURATION_K))
    clamped_score = min(100, max(MIN_SCORE, int(round(raw_score))))

    if clamped_score >= 80:
        rating_tl = "Napakagandang Pwesto!"
        rating_en = "Prime Hotspot!"
    elif clamped_score >= 60:
        rating_tl = "Magandang Pwesto"
        rating_en = "High Foot Traffic"
    elif clamped_score >= 40:
        rating_tl = "Katamtaman ang Tao"
        rating_en = "Moderate Viability"
    else:
        rating_tl = "Mababang Trapiko"
        rating_en = "Low Foot Traffic"

    return {
        "score": clamped_score,
        "rating_tl": rating_tl,
        "rating_en": rating_en,
        "nearest_anchor_name": nearest_anchor_name,
        "nearest_anchor_dist_m": min_anchor_dist if min_anchor_dist != float("inf") else 100,
        "anchor_count_within_300m": anchors_within_300m,
        "competitor_count_within_150m": competitors_within_150m,
        "peak_hours_tl": archetype["peak_hours_tl"],
        "peak_hours_en": archetype["peak_hours_en"],
    }
