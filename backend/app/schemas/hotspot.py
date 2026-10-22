from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel, Field, ConfigDict

class HotspotBase(BaseModel):
    name: str = Field(..., description="Hotspot landmark or event name")
    category: Literal["school", "barangay", "basketball", "commuter"]
    lat: float
    lng: float
    radius_m: int = 120
    score: int = Field(75, ge=0, le=100)
    expected_hours: str = "11:30 AM – 1:30 PM"
    reason: str = "Student crowd rush during lunch dismissal"
    best_products: str = "Taho, Siomai"

class HotspotCreate(HotspotBase):
    pass

class HotspotResponse(HotspotBase):
    id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
