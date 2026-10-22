from fastapi import APIRouter
from app.api.api_v1.endpoints import vendors, viability, hotspots

api_router = APIRouter()

api_router.include_router(vendors.router, prefix="/vendors", tags=["Vendors"])
api_router.include_router(viability.router, prefix="/viability", tags=["Viability"])
api_router.include_router(hotspots.router, prefix="/hotspots", tags=["Demand Hotspots"])
