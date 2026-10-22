import logging
from datetime import datetime, timezone
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import engine, Base, SessionLocal
from app.models.vendor import Vendor
from app.models.hotspot import DemandHotspot
from app.models.transit import TransitAnchor, CompetitorNode
from app.api.api_v1.api import api_router
from app.api.api_v1.endpoints.ws import router as ws_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("pwesto-api")

# Ensure tables are created immediately
Base.metadata.create_all(bind=engine)

DEFAULT_VENDORS = [
    {
        "name": "Kuya Boy Taho",
        "product_type": "taho",
        "product_name": "Taho",
        "price": "₱30 / baso",
        "lat": 14.6094,
        "lng": 120.9902,
        "status": "live",
    },
    {
        "name": "Ate Marites Fried Siomai",
        "product_type": "siomai",
        "product_name": "Siomai",
        "price": "₱45 / order",
        "lat": 14.6085,
        "lng": 120.9888,
        "status": "live",
    },
    {
        "name": "Kuya Jun Balut at Penoy",
        "product_type": "balut",
        "product_name": "Balut",
        "price": "₱25 / piraso",
        "lat": 14.6102,
        "lng": 120.9915,
        "status": "live",
    },
]

def seed_defaults():
    db = SessionLocal()
    try:
        if db.query(Vendor).count() == 0:
            logger.info("Seeding initial street vendors for demo...")
            for seed in DEFAULT_VENDORS:
                db.add(Vendor(**seed))
            db.commit()
    finally:
        db.close()

seed_defaults()

@asynccontextmanager
async def lifespan(app: FastAPI):
    seed_defaults()
    yield
    logger.info("Shutting down Pwesto backend...")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Hyperlocal spatial intelligence and real-time vendor tracking platform for Philippine micro-retail street vendors.",
    lifespan=lifespan,
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Routers
app.include_router(api_router, prefix=settings.API_V1_STR)
app.include_router(ws_router, prefix="/ws", tags=["WebSockets"])

@app.get("/", tags=["Health"])
def root():
    return {
        "app": "Pwesto API",
        "version": settings.VERSION,
        "status": "healthy",
        "docs_url": "/docs",
    }

@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "ok"}
