import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import Base, engine
from app.services.spatial import haversine_distance_m, calculate_eta_mins
from app.services.gravity import evaluate_huff_viability

# Ensure tables are ready before running tests
Base.metadata.create_all(bind=engine)

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

def test_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["app"] == "Pwesto API"

def test_get_vendors():
    response = client.get("/api/v1/vendors")
    assert response.status_code == 200
    vendors = response.json()
    assert isinstance(vendors, list)
    assert len(vendors) >= 1

def test_create_vendor_and_update_location():
    # 1. Create a new vendor
    new_vendor = {
        "name": "Test Kuya Balut",
        "product_type": "balut",
        "product_name": "Balut",
        "price": "₱25 / piraso",
        "lat": 14.6091,
        "lng": 120.9898,
        "status": "live",
    }
    create_res = client.post("/api/v1/vendors", json=new_vendor)
    assert create_res.status_code == 201
    created = create_res.json()
    assert created["name"] == "Test Kuya Balut"
    vendor_id = created["id"]

    # 2. Update GPS location
    loc_update = {
        "lat": 14.6105,
        "lng": 120.9912,
        "status": "live",
    }
    loc_res = client.patch(f"/api/v1/vendors/{vendor_id}/location", json=loc_update)
    assert loc_res.status_code == 200
    updated = loc_res.json()
    assert updated["lat"] == 14.6105
    assert updated["lng"] == 120.9912

    # 3. Update status to 'sold_out'
    status_res = client.patch(f"/api/v1/vendors/{vendor_id}/status?status=sold_out")
    assert status_res.status_code == 200
    assert status_res.json()["status"] == "sold_out"

def test_evaluate_viability_endpoint():
    payload = {
        "lat": 14.6091,
        "lng": 120.9898,
        "product_type": "taho",
    }
    res = client.post("/api/v1/viability/evaluate", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert 15 <= data["score"] <= 100
    assert "rating_tl" in data
    assert "rating_en" in data
    assert "nearest_anchor_name" in data

def test_demand_hotspots():
    res = client.get("/api/v1/hotspots")
    assert res.status_code == 200
    hotspots = res.json()
    assert isinstance(hotspots, list)
    assert len(hotspots) >= 1

    # Filter by category
    res_cat = client.get("/api/v1/hotspots?category=school")
    assert res_cat.status_code == 200
    for h in res_cat.json():
        assert h["category"] == "school"

def test_spatial_calculations():
    # Manila to QC (~8-10 km)
    dist = haversine_distance_m(14.6091, 120.9898, 14.6200, 121.0530)
    assert 6000 <= dist <= 10000

    # Short distance ETA (~200m should be ~3 mins)
    eta = calculate_eta_mins(200)
    assert eta == 3

def test_gravity_model_computation():
    res = evaluate_huff_viability(14.6091, 120.9898, "taho")
    assert 15 <= res["score"] <= 100
    assert len(res["rating_tl"]) > 0
    assert len(res["rating_en"]) > 0
