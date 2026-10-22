from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.vendor import Vendor
from app.schemas.vendor import (
    VendorCreate,
    VendorUpdate,
    VendorLocationUpdate,
    VendorResponse,
)
from app.services.spatial import haversine_distance_m, calculate_eta_mins
from app.services.broadcaster import manager

router = APIRouter()

def utc_now():
    return datetime.now(timezone.utc)

@router.get("", response_model=List[VendorResponse])
def get_vendors(
    lat: Optional[float] = Query(None, description="User latitude for distance calculation"),
    lng: Optional[float] = Query(None, description="User longitude for distance calculation"),
    radius_m: Optional[int] = Query(3000, description="Max radius in meters"),
    product_type: Optional[str] = Query(None, description="Filter by product: taho, siomai, balut, other"),
    status: Optional[str] = Query(None, description="Filter by status: live, stopped, sold_out"),
    db: Session = Depends(get_db),
):
    """Retrieve all street vendors with optional spatial filtering and ETA estimation."""
    query = db.query(Vendor)

    if product_type:
        query = query.filter(Vendor.product_type == product_type.lower())
    if status:
        query = query.filter(Vendor.status == status.lower())

    vendors = query.all()

    if lat is not None and lng is not None:
        filtered = []
        for v in vendors:
            dist = haversine_distance_m(lat, lng, v.lat, v.lng)
            if dist <= radius_m:
                filtered.append(v)
        return filtered

    return vendors

@router.post("", response_model=VendorResponse, status_code=201)
async def create_vendor(
    vendor_in: VendorCreate,
    db: Session = Depends(get_db),
):
    """Register a new street vendor stall/cart with GPS and photo verification."""
    vendor = Vendor(
        name=vendor_in.name,
        product_type=vendor_in.product_type,
        product_name=vendor_in.product_name,
        price=vendor_in.price,
        lat=vendor_in.lat,
        lng=vendor_in.lng,
        status=vendor_in.status,
        verified_photo=vendor_in.verified_photo,
    )
    db.add(vendor)
    db.commit()
    db.refresh(vendor)

    # Broadcast new vendor to live radar
    await manager.broadcast_vendor_update({
        "id": vendor.id,
        "name": vendor.name,
        "product_type": vendor.product_type,
        "product_name": vendor.product_name,
        "lat": vendor.lat,
        "lng": vendor.lng,
        "status": vendor.status,
        "action": "CREATED"
    })

    return vendor

@router.get("/{vendor_id}", response_model=VendorResponse)
def get_vendor_by_id(
    vendor_id: str,
    db: Session = Depends(get_db),
):
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    return vendor

@router.patch("/{vendor_id}/location", response_model=VendorResponse)
async def update_vendor_location(
    vendor_id: str,
    loc_in: VendorLocationUpdate,
    db: Session = Depends(get_db),
):
    """Live GPS streaming endpoint for moving street vendors (e.g. Kuya Taho / Balut)."""
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    vendor.lat = loc_in.lat
    vendor.lng = loc_in.lng
    if loc_in.status:
        vendor.status = loc_in.status
    vendor.updated_at = utc_now()

    db.commit()
    db.refresh(vendor)

    # Broadcast live coordinate to all connected buyers/radar
    await manager.broadcast_vendor_update({
        "id": vendor.id,
        "name": vendor.name,
        "product_type": vendor.product_type,
        "product_name": vendor.product_name,
        "lat": vendor.lat,
        "lng": vendor.lng,
        "status": vendor.status,
        "action": "LOCATION_UPDATE"
    })

    return vendor

@router.patch("/{vendor_id}/status", response_model=VendorResponse)
async def update_vendor_status(
    vendor_id: str,
    status: str = Query(..., pattern="^(live|stopped|sold_out)$"),
    db: Session = Depends(get_db),
):
    """Toggle vendor status: 'live' (Naglilibot), 'stopped' (Nakatigil), or 'sold_out' (Ubos na)."""
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    vendor.status = status
    vendor.updated_at = utc_now()
    db.commit()
    db.refresh(vendor)

    await manager.broadcast_vendor_update({
        "id": vendor.id,
        "status": vendor.status,
        "action": "STATUS_UPDATE"
    })

    return vendor
