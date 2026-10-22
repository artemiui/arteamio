from typing import Optional
from pydantic import BaseModel, Field

class ViabilityRequest(BaseModel):
    lat: float = Field(..., description="Stall candidate latitude")
    lng: float = Field(..., description="Stall candidate longitude")
    product_type: str = Field("taho", description="Product type (taho, siomai, balut, coffee)")
    transit_weight: Optional[float] = 1.0
    competitor_penalty: Optional[float] = 1.0

class ViabilityResponse(BaseModel):
    score: int = Field(..., ge=0, le=100)
    rating_tl: str
    rating_en: str
    nearest_anchor_name: str
    nearest_anchor_dist_m: int
    anchor_count_within_300m: int
    competitor_count_within_150m: int
    peak_hours_tl: str
    peak_hours_en: str
