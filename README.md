<img width="1280" height="640" alt="pwesto" src="https://github.com/user-attachments/assets/c72fdcca-9a78-4b67-ac48-77cf5bf9a4ab" />

# Pwesto

Hyperlocal spatial intelligence and real-time vendor tracking platform for street food vendors, pop-up carts, and neighborhood buyers.

> Developed for **UST CSSPrint 2026**

## Overview

* **Smart Spot Finder:** Helps food carts and pop-up stalls find high-earning locations by scoring foot traffic near transit hubs (jeepney stops, LRT/MRT stations, tricycle terminals) and factoring in nearby competitors.
* **Live Vendor Tracking:** Lets roving street vendors (like *taho* and *balot* sellers) broadcast their live location, giving nearby customers advance notice so they never miss a passing vendor.
* **Peak-Hour Route Guidance:** Pinpoints commuter rush windows and high-traffic walking paths to help vendors plan better routes and maximize daily sales.

## Tech Stack

Built with a mobile-first **Svelte / SvelteKit** frontend using **MapLibre GL / Leaflet** and **OpenStreetMap** for interactive transit and competitor mapping. The system is backed by **Python (FastAPI)** for spatial foot-traffic scoring algorithms, **PostgreSQL + PostGIS** for geospatial data queries, and **WebSockets with Redis** for real-time vendor GPS streaming and proximity alerts.
