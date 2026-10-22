from fastapi import APIRouter
from app.schemas.viability import ViabilityRequest, ViabilityResponse
from app.services.gravity import evaluate_huff_viability

router = APIRouter()

@router.post("/evaluate", response_model=ViabilityResponse)
def evaluate_spot_viability(req: ViabilityRequest):
    """
    Evaluate candidate stall location viability using the Huff Gravity Model:
    Score = sum(W_j / d_ij^beta) - lambda * (Competitor Density_i)
    """
    res = evaluate_huff_viability(
        lat=req.lat,
        lng=req.lng,
        product_type=req.product_type,
        custom_transit_weight=req.transit_weight,
        custom_competitor_penalty=req.competitor_penalty,
    )
    return ViabilityResponse(**res)
