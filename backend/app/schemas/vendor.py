from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel, Field, ConfigDict

class VendorBase(BaseModel):
    name: str = Field(..., description="Vendor name")
    product_type: Literal["taho", "siomai", "balut", "other"] = "taho"
    product_name: str = Field(..., description="Product name")
    price: Optional[str] = "₱30 / baso"
    lat: float = Field(..., description="Latitude")
    lng: float = Field(..., description="Longitude")
    status: Literal["live", "stopped", "sold_out"] = "live"
    verified_photo: Optional[str] = None

class VendorCreate(VendorBase):
    pass

class VendorUpdate(BaseModel):
    name: Optional[str] = None
    product_name: Optional[str] = None
    product_type: Optional[Literal["taho", "siomai", "balut", "other"]] = None
    price: Optional[str] = None
    status: Optional[Literal["live", "stopped", "sold_out"]] = None
    verified_photo: Optional[str] = None

class VendorLocationUpdate(BaseModel):
    lat: float
    lng: float
    status: Optional[Literal["live", "stopped", "sold_out"]] = None

class VendorResponse(VendorBase):
    id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class VendorNearbyQuery(BaseModel):
    lat: float
    lng: float
    radius_m: Optional[int] = 1500
    product_type: Optional[Literal["taho", "siomai", "balut", "other"]] = None
