# CLAUDE.md — PwestoRadar Project Reference & Architecture Guide

> **Project:** PwestoRadar  
> **Event:** UST CSSPrint 2026  
> **Repository:** `arteamio`  
> **Target Audience:** Filipino MSMEs, food cart operators, roving street vendors (*taho*, *balot*, etc.), and neighborhood consumers.

---

## 1. Executive Summary

**PwestoRadar** is a hyperlocal spatial intelligence and real-time vendor discovery platform built for the Philippine informal and micro-retail economy. Over 99% of registered businesses in the Philippines are MSMEs. Street-level entrepreneurs—from stationary pop-up kiosks (siomai carts, iced coffee stands) to roving peddlers (*magtataho*, *balot* vendors)—routinely suffer lost revenue and early stall closures due to location mismatch, lack of foot-traffic data, and missed customer opportunities.

PwestoRadar bridges this gap through a two-sided platform:
1. **For Fixed Pop-Ups & Carts:** A data-driven spatial viability engine utilizing an adapted Huff Gravity Model and open transit geodata to identify profitable vending locations.
2. **For Mobile & Roving Peddlers:** A real-time GPS broadcasting and proximity alert system that lets neighborhood buyers anticipate approaching vendors before they walk past.

---

## 2. Core Problem Statements & Value Proposition

### Problem A: The "Mukhang Matao" Guesswork (Fixed Pop-Ups & Food Carts)
* **Context:** Micro-entrepreneurs choose rental spots and pop-up corners based purely on hearsay, anecdotal advice, or visual intuition ("mukhang matao").
* **Impact:** High stall failure rates within 3 to 6 months caused by rent-to-foot-traffic mismatches and cannibalization by adjacent competitors.
* **Barriers:** Enterprise GIS platforms (e.g., Esri, Nielsen) are prohibitively expensive and overly complex for micro-enterprises.

### Problem B: The "Dumaan Na" Missed Sales (Roving Peddlers)
* **Context:** Ambulant vendors (*magtataho*, *balot*, ice cream carts) rely exclusively on acoustic cues (calling out in streets/alleys) while walking at a continuous pace.
* **Impact:** Potential buyers inside homes, offices, or condominiums hear the call too late and cannot prepare money, footwear, or food containers before the vendor has moved down the street.
* **Result:** Reduced daily sales volume for vendors and unnecessary physical fatigue from unproductive walking.

---

## 3. Product Features & User Experience

### 3.1 Single-Page Interactive Map ("Sakay.ph for Pwestos")
* **Map Centric Interface:** Fast, interactive map focused on high-density urban areas (Metro Manila, provincial centers, university belts like UST/España).
* **Business Archetype Selector:** Pre-calibrated presets tailored to common Filipino street concepts:
  * Budget Street Eats (e.g., ₱45 Siomai Rice, ₱35 Pares)
  * Beverage & Dessert Kiosks (e.g., ₱120 Iced Coffee, Fruit Shakes)
  * Morning / Night Ambulant Staples (e.g., ₱30 Taho, ₱25 Balot/Penoy)
* **Point-and-Click Viability:** Clicking any street corner or intersection generates an instant **Pwesto Viability Index (0–100)**.

### 3.2 Real-Time Vendor Broadcasting & Proximity Radar
* **Vendor Mode (Lightweight Mobile UI):** One-tap toggle for mobile vendors to start their daily route and broadcast their live coordinates.
* **Buyer Radar & Advance Pings:** Neighborhood buyers set alerts for specific vendor types (e.g., "Notify me when a taho vendor is within a 200m radius") with estimated arrival time windows.

### 3.3 Commuter & Rush-Hour Window Diagnostics
* Highlights peak transit interchange windows (e.g., 6:30 AM – 9:00 AM morning office rush, 5:00 PM – 8:00 PM university/commuter dismissal).
* Recommends optimal operating time blocks to maximize hourly sales turnover.

---

## 4. UI/UX Design System, Language & Accessibility

The interface is inspired by clean, functionalist bento/card architectures (e.g., Moonli and minimalist modular systems) designed specifically for outdoor mobile usage under Philippine sunlight.

### 4.1 Aesthetic & Visual Philosophy
* **Extreme Simplicity & Bento Layout:** Content is grouped into distinct, modular cards with generous whitespace, eliminating visual clutter so users can parse information in under 2 seconds.
* **Rounded Shapes:** Generous, soft rounded corners (`rounded-2xl`, `rounded-3xl`, and pill buttons `rounded-full`) across all cards, dialogs, badges, and map overlays. Approachable, organic, and friendly.
* **Functionalist Text Only:** Zero fluff, no marketing filler, and no redundant navigation text. Every word serves a direct functional purpose (status, metric, action). No heightened, corporate, or decorative language.

### 4.2 Three-Color Palette ("Taho" Colorway)
The UI identity is rooted in the warmth and familiarity of the iconic Filipino street comfort food:
1. **Tofu Cream (Base / Canvas):** `#FAF7F2` (with `#FFFFFF` card surfaces) — Soft, warm off-white that prevents harsh screen glare in bright outdoor environments.
2. **Arnibal Brown (Primary / Text / Strong Actions):** `#4A2E1B` — Deep, rich brown sugar hue providing ultra-high contrast for headings, primary buttons, and critical text (WCAG AAA compliant).
3. **Sago Amber (Accent / Highlights / Status):** `#D97706` (warm amber / golden tapioca) — Used for live vendor GPS markers, high-viability score highlights, proximity alert pings, and active navigation pills.

### 4.3 Language & Tone: Warm, Simple Everyday Tagalog
* **Tone:** Natural, conversational, and respectful everyday Tagalog.
* **Avoid Heightened Language:** Never use archaic, deep Tagalog (e.g., avoid *"salipawpaw"*, *"pook-sapot"*, *"pantablay"*).
* **Avoid Stiff Formalism:** Never use cold, mechanical corporate translations (e.g., avoid *"Mangyaring maghintay habang pino-proseso ang transaksyon"*).
* **Sample UI Copy:**
  * **Header / Tabs:** *"Pwesto"* (Find Spots), *"Radar"* (Live Vendors), *"Tinda"* (Vendor Mode).
  * **Status:** *"Papunta na si Kuya Taho"* (Kuya Taho is on his way), *"Nasa 200m lang siya"* (He's just 200m away).
  * **Actions:** *"Ihanda ang barya at lagayan"* (Prepare your coins and containers), *"Simulan ang ruta"* (Start route), *"Nandito ako ngayon"* (I am here).
  * **Scores:** *"Magandang pwesto (84/100)"* (Good spot), *"Matao tuwing 7:00 AM – 9:00 AM"* (Busy from 7:00 AM – 9:00 AM).

### 4.4 Accessibility & Outdoor Usability
* **Large Touch Targets:** Minimum 48x48px hit areas for buttons and toggles to support one-handed thumb use and walking operation.
* **High Contrast & Scalable Fonts:** Clear, legible sans-serif typography with native font-size scaling support for elderly vendors and visually impaired users.
* **Dual-Mode / Language Toggle:** Quick one-tap switch between **Simple Tagalog** and **Simple English**.
* **Audio & Haptic Cues:** Subtle vibration and chime alerts when a vendor enters the buyer's proximity circle, removing the need to stare constantly at the screen.

---

## 5. Geospatial & Mathematical Foundation

### 5.1 Spatial Point Extraction (OpenStreetMap Overpass API)
The platform extracts points of interest (POIs) dynamically within a defined bounding box:
* **Transit Anchors ($A_j$):**
  * Jeepney and bus stops (`highway=bus_stop`, `amenity=bus_station`)
  * Rail transit entrances (`railway=subway_entrance`, `railway=station`)
  * Tricycle and UV Express terminal queues (`amenity=taxi`, custom transit tags)
  * High-density pedestrian generators (schools, universities, churches, public markets)
* **Competitor Nodes ($C_k$):**
  * Nearby food kiosks, convenience stores, fast food (`amenity=fast_food`, `amenity=cafe`, `shop=convenience`)

### 5.2 Adapted Huff Gravity Model with Distance Decay
The **Pwesto Viability Index** evaluates foot-traffic attraction against spatial impedance and competitive friction:

$$\text{Viability Score} = \sum_{j=1}^{n} \frac{W_j}{d_{ij}^\beta} - \lambda \cdot (\text{Competitor Density}_i)$$

Where:
* $W_j$: Anchor Weight assigned to transit node $j$ (e.g., LRT/MRT exit = 1.0, jeepney stop = 0.7, tricycle terminal = 0.5).
* $d_{ij}$: Walking distance from candidate location $i$ to transit anchor $j$.
* $\beta$: Distance decay parameter ($\beta \approx 1.5 - 2.0$), sharply penalizing walking times beyond a 3-minute threshold (~200–250 meters).
* $\lambda$: Competition penalty factor adjusted by business archetype (higher penalty for saturated budget food carts).
* $\text{Competitor Density}_i$: Weighted count of direct competitors within a 100m catchment.

---

## 6. System Architecture & Tech Stack

```
+-----------------------------------------------------------+
|                   Client Tier (SvelteKit)                 |
|  - Reactive Map Interface (MapLibre GL / Leaflet)          |
|  - Vendor Route Broadcaster & Buyer Proximity Radar       |
|  - PWA: Offline-tolerant, low-data mobile web             |
+-----------------------------+-----------------------------+
                              | HTTPS / WSS
+-----------------------------v-----------------------------+
|                  Backend API (Python FastAPI)             |
|  - Huff Gravity Engine & Geospatial Decay Calculator       |
|  - Overpass API Ingestion & OSM POI Caching               |
|  - Commuter Rush Window Profiler                          |
+---------------------+---------------+---------------------+
                      |               |
                      v               v
+-------------------------+   +-----------------------------+
|   PostgreSQL + PostGIS  |   |        Redis & Pub/Sub      |
|  - Spatial Indexing     |   |  - Ephemeral GPS Streams    |
|  - POIs & Vendor Profiles|  |  - Proximity Geofencing     |
+-------------------------+   +-----------------------------+
```

### 6.1 Frontend: Svelte / SvelteKit
* **Why Svelte:** Minimal runtime overhead, fast DOM updates, compact bundle sizes critical for mobile users on metered Philippine cellular networks.
* **Mapping Library:** MapLibre GL or Leaflet for mobile-responsive vector/raster map layers.
* **PWA & Geolocation:** Utilizes HTML5 Geolocation API, Web Push Notifications, and service workers for background proximity pings.

### 6.2 Backend: Python (FastAPI)
* **FastAPI:** Asynchronous REST endpoints, OpenAPI auto-documentation, high computational speed for mathematical models.
* **Data Processing:** GeoPandas, Shapely, and NumPy for vector math, buffer calculations, and Huff gravity evaluations.

### 6.3 Storage & Real-Time Engine
* **PostgreSQL + PostGIS:** Spatial table storage, `ST_DWithin`, `ST_Distance`, and spatial spatial GiST indexing.
* **Redis:** Fast in-memory cache for Overpass API responses, ephemeral storage of live vendor GPS coordinates, and Pub/Sub channel for WebSocket notification routing.

---

## 7. Planned Project Structure

```
arteamio/
├── README.md                  # Public overview and project summary
├── CLAUDE.md                  # Comprehensive engineering context & architecture guide
├── frontend/                  # SvelteKit client application
│   ├── src/
│   │   ├── lib/
│   │   │   ├── components/    # MapView, VendorCard, ViabilityMeter, RoutePlanner
│   │   │   ├── stores/        # Geolocation, active route, notification state
│   │   │   └── utils/         # GeoJSON formatters, distance metrics
│   │   ├── routes/            # SvelteKit pages (+page.svelte)
│   │   │   ├── /              # Consumer Map & Radar View
│   │   │   ├── /vendor        # Vendor live broadcast console
│   │   │   └── /analytics     # Pwesto Viability Index Explorer
│   │   └── app.html
│   ├── static/                # Icons, map assets, manifest.json
│   ├── svelte.config.js
│   └── package.json
├── backend/                   # Python FastAPI service
│   ├── app/
│   │   ├── api/               # API endpoints (viability, vendors, routes)
│   │   ├── core/              # Config, security, database connectors
│   │   ├── models/            # SQLAlchemy / PostGIS ORM models
│   │   ├── schemas/           # Pydantic validation schemas
│   │   └── services/          # Business logic:
│   │       ├── gravity.py     # Huff Gravity Model & distance decay
│   │       ├── overpass.py    # OSM Overpass API querying & parsing
│   │       └── tracker.py     # Real-time WebSocket & Redis coordination
│   ├── tests/                 # Unit and integration tests
│   ├── requirements.txt
│   └── Dockerfile
└── docker-compose.yml         # Local orchestration (FastAPI, Postgres+PostGIS, Redis)
```

---

## 8. Developer & Workflow Guidelines

### 8.1 Code Standards
* **Python (Backend):** Follow PEP 8, enforce type annotations (`typing`), use `black` and `ruff` for formatting and linting.
* **Svelte/TypeScript (Frontend):** Strict TypeScript mode, modular component hierarchy, scoped styling via Tailwind CSS.
* **Geospatial Coordinates:** Always standardize on EPSG:4326 (WGS 84, `[longitude, latitude]`) for GeoJSON and internal representation.

### 8.2 Performance & Bandwidth Constraints
* Street vendors and neighborhood users frequently operate on 3G/4G prepaid mobile data.
* Minimize payload sizes: compress GeoJSON responses, cache Overpass API POI queries for at least 24 hours, and throttle real-time GPS coordinate pings to 3–5 second intervals.

---

## 9. Hackathon Context & Milestones (UST CSSPrint 2026)

* **Phase 1: Proof of Concept Map (MVP)**
  * Interactive Svelte map with Manila/UST bounding box.
  * Integration with OpenStreetMap Overpass API for nearby transit and food points.
* **Phase 2: Viability Algorithm Implementation**
  * Working Huff Gravity calculation returning 0–100 score for clicked map coordinates.
* **Phase 3: Live Vendor Tracking Demonstration**
  * Vendor broadcast view emitting live coordinates via WebSockets.
  * Buyer client receiving proximity notification when vendor enters simulated 200m radius.
