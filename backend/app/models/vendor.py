import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, DateTime, Text
from app.database import Base

def utc_now():
    return datetime.now(timezone.utc)

class Vendor(Base):
    __tablename__ = "vendors"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), nullable=False)
    product_type = Column(String(30), nullable=False, default="taho")  # taho, siomai, balut, other
    product_name = Column(String(100), nullable=False, default="Taho")
    price = Column(String(50), nullable=True, default="₱30 / baso")
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    status = Column(String(20), nullable=False, default="live")  # live, stopped, sold_out
    verified_photo = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)
