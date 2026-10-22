# Pwesto Backend API

Hyperlocal spatial intelligence and real-time vendor tracking platform built for the Philippine informal micro-retail economy.

> Backs **Pwesto (UST CSSPrint 2026)**

---

## Tech Stack
* **Framework:** Python 3.11+ / FastAPI
* **Spatial Calculation:** Huff Gravity Model implementation ($\beta = 1.7$ distance-decay, anchor weights, competitor density)
* **Real-time Live GPS:** WebSockets + Redis Pub/Sub broadcast channel
* **Database:** PostgreSQL + PostGIS (Production) / SQLite (Zero-config local development)
* **Testing:** Pytest + HTTPX

---

## Quickstart

### 1. Local Development
```bash
cd backend
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
python run.py
```
API server runs at `http://localhost:8000`.  
Interactive Swagger documentation is available at `http://localhost:8000/docs`.

### 2. Run Tests
```bash
cd backend
python -m pytest
```

### 3. Docker Compose (Full Stack with PostgreSQL/PostGIS + Redis)
```bash
docker-compose up --build
```

---

## API Endpoints

### 1. Street Vendors (`/api/v1/vendors`)
* `GET /api/v1/vendors?lat=...&lng=...&radius_m=1500&product_type=taho` - List vendors with spatial filtering and ETA calculation.
* `POST /api/v1/vendors` - Register new street vendor stall/cart with photo verification and initial GPS.
* `GET /api/v1/vendors/{vendor_id}` - Retrieve vendor details.
* `PATCH /api/v1/vendors/{vendor_id}/location` - Stream live GPS update (instantly broadcasted via WebSockets to buyer radars).
* `PATCH /api/v1/vendors/{vendor_id}/status?status=live|stopped|sold_out` - Toggle vendor broadcasting and stock status.

### 2. Huff Gravity Viability Evaluation (`/api/v1/viability`)
* `POST /api/v1/viability/evaluate`
  ```json
  {
    "lat": 14.6091,
    "lng": 120.9898,
    "product_type": "taho"
  }
  ```
  Returns:
  * Score (0–100)
  * Dual-language rating (`rating_tl` / `rating_en`)
  * Nearest transit anchor (jeepney stop, tricycle terminal, commuter footbridge)
  * Foot-traffic and competitor count breakdown

### 3. Hyperlocal Demand Hotspots (`/api/v1/hotspots`)
* `GET /api/v1/hotspots?lat=...&lng=...&category=school|commuter|basketball|barangay` - Retrieve hotspots with expected busy windows.
* `POST /api/v1/hotspots` - Community-driven event and school dismissal reporting.

### 4. Real-time WebSockets (`/ws`)
* `WS /ws/radar` - Connect to receive real-time JSON events whenever any nearby vendor moves.
* `WS /ws/vendors/{vendor_id}` - Subscribe to a specific vendor's live pushcart route.
