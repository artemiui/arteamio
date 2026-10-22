from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.hotspot import DemandHotspot
from app.schemas.hotspot import HotspotCreate, HotspotResponse
from app.services.spatial import haversine_distance_m

router = APIRouter()

# Default seed hotspots matching CLAUDE.md Philippine student & commuter hubs
DEFAULT_HOTSPOTS = [
    {
        "name": "UST España Gate 2 Student Dismissal Window",
        "category": "school",
        "lat": 14.6098,
        "lng": 120.9895,
        "radius_m": 120,
        "score": 92,
        "expected_hours": "11:30 AM – 1:30 PM & 4:30 PM – 6:30 PM",
        "reason": "Massive student foot-traffic heading to España jeepney stops",
        "best_products": "Taho, Siomai, Iced Coffee",
    },
    {
        "name": "Dapitan Cor. Lacson Commuter Convergence",
        "category": "commuter",
        "lat": 14.6120,
        "lng": 120.9920,
        "radius_m": 150,
        "score": 85,
        "expected_hours": "5:00 PM – 8:30 PM",
        "reason": "Tricycle terminal queue and homebound workers",
        "best_products": "Siomai, Balut",
    },
    {
        "name": "Barangay 398 Covered Court Liga Weekend",
        "category": "basketball",
        "lat": 14.6065,
        "lng": 120.9870,
        "radius_m": 100,
        "score": 78,
        "expected_hours": "3:00 PM – 7:00 PM (Sabado at Linggo)",
        "reason": "Local inter-barangay tournament spectators and players",
        "best_products": "Taho, Merienda, Drinks",
    },
    {
        "name": "Sampaloc Barangay Hall Ayuda & Community Assembly",
        "category": "barangay",
        "lat": 14.6080,
        "lng": 120.9935,
        "radius_m": 110,
        "score": 72,
        "expected_hours": "8:00 AM – 12:00 PM",
        "reason": "Senior citizen assembly and barangay ID issuance day",
        "best_products": "Taho, Kape, Kakanin",
    },
]

@router.get("", response_model=List[HotspotResponse])
def get_demand_hotspots(
    lat: Optional[float] = Query(None, description="Center latitude"),
    lng: Optional[float] = Query(None, description="Center longitude"),
    radius_m: Optional[int] = Query(5000, description="Radius in meters"),
    category: Optional[str] = Query(None, description="school, barangay, basketball, commuter"),
    db: Session = Depends(get_db),
):
    """Retrieve hyperlocal demand hotspots with real-world landmarks and expected busy hours."""
    # Seed default hotspots if table is empty
    if db.query(DemandHotspot).count() == 0:
        for seed in DEFAULT_HOTSPOTS:
            db.add(DemandHotspot(**seed))
        db.commit()

    query = db.query(DemandHotspot)
    if category:
        query = query.filter(DemandHotspot.category == category.lower())

    hotspots = query.all()

    if lat is not None and lng is not None:
        return [
            h for h in hotspots
            if haversine_distance_m(lat, lng, h.lat, h.lng) <= radius_m
        ]

    return hotspots

@router.post("", response_model=HotspotResponse, status_code=201)
def create_demand_hotspot(
    hotspot_in: HotspotCreate,
    db: Session = Depends(get_db),
):
    """Community-driven reporting of school dismissal times, barangay assemblies, or tournaments."""
    hotspot = DemandHotspot(
        name=hotspot_in.name,
        category=hotspot_in.category,
        lat=hotspot_in.lat,
        lng=hotspot_in.lng,
        radius_m=hotspot_in.radius_m,
        score=hotspot_in.score,
        expected_hours=hotspot_in.expected_hours,
        reason=hotspot_in.reason,
        best_products=hotspot_in.best_products,
    )
    db.add(hotspot)
    db.commit()
    db.refresh(hotspot)
    return hotspot
