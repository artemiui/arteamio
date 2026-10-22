import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Integer, DateTime
from app.database import Base

def utc_now():
    return datetime.now(timezone.utc)

class DemandHotspot(Base):
    __tablename__ = "demand_hotspots"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(150), nullable=False)
    category = Column(String(50), nullable=False)  # school, barangay, basketball, commuter
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    radius_m = Column(Integer, default=120)
    score = Column(Integer, default=75)
    expected_hours = Column(String(100), default="11:30 AM – 1:30 PM")
    reason = Column(String(255), default="High commuter density")
    best_products = Column(String(100), default="Taho, Siomai")
    created_at = Column(DateTime, default=utc_now)
