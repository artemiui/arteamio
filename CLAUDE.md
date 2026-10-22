# CLAUDE.md — Pwesto Project Reference & Architecture Guide

> **Project:** Pwesto  
> **Repository:** `arteamio`  
> **Target Audience:** Filipino MSMEs, food cart operators, roving street vendors (*taho*, *balot*, *siomai*, etc.), and neighborhood consumers.

---

## 1. Executive Summary

**Pwesto** is a hyperlocal spatial intelligence and real-time vendor discovery platform built for the Philippine informal and micro-retail street economy. Over 99% of registered businesses in the Philippines are MSMEs. Street-level entrepreneurs—from stationary pop-up kiosks to roving peddlers (*magtataho*, *balot*, *siomai* vendors)—routinely suffer lost revenue and early stall closures due to location mismatch, lack of foot-traffic data, and missed customer opportunities.

Pwesto bridges this gap through a consumer & vendor map experience inspired by **Sakay.ph**, **Angkas**, and **Google Maps**:
1. **Simple Sakay.ph / Angkas Style Landing:** Welcoming entry page with a primary **"Magsimula"** CTA prompting users: **"Bibili"** or **"Magbebenta?"**.
2. **For Consumers ("Bibili"):** Immediate search bar defaulted to their current GPS location leading to a Google Maps style interface displaying tagged street foods (Taho, Siomai, Balut, etc.) with real-time ETA alerts (*"Ihanda ang barya at lagayan"*).
3. **For Vendors ("Magbebenta"):** Quick product selection (*Taho, Siomai, Balut, Other*), simple photo verification of stall/kaldero, and a dedicated sidebar/drawer with live broadcast and stock toggles.

---

## 2. Core User Journeys & Flow

```
[ Landing Page: Sakay.ph / Angkas Style ]
                    |
            [ "Magsimula" ]
                    |
      +-------------+-------------+
      |                           |
[ "Bibili" ]              [ "Magbebenta" ]
      |                           |
[ GPS Search Bar ]        [ Product: Taho, Siomai, Balut, Iba pa ]
(Default: Current GPS)            |
      |                   [ Photo Verification: Kaldero / Stall ]
      |                           |
      +-------------+-------------+
                    |
      [ Full Google Maps Screen ]
        - All tagged streetfood pins (Legend: 🥣, 🥡, 🥚, ⭐)
        - Buyer mode: Proximity alerts & vendor arrival ETAs
        - Vendor mode: Sidebar drawer with live broadcasting & stock toggle
```

### 2.1 The "Bibili" (Consumer) Flow
1. **Entry Prompt:** User selects **"Bibili"**.
2. **Location Search:** Prompted with a clean search bar, pre-filled by default with **"Kasalukuyang Lokasyon (GPS)"**. Users can confirm or tap anywhere to change location.
3. **Main Map Interface:** Opens directly to a full-screen Google Maps style view showing active vendors tagged by product.
4. **Vendor Pin Tap:** Tapping a pin displays a warm bottom card with vendor name, live distance (e.g. *140m layo • ~2 minuto*), and the prompt: *"Ihanda na ang barya at lagayan!"*.

### 2.2 The "Magbebenta" (Vendor) Flow
1. **Entry Prompt:** User selects **"Magbebenta"**.
2. **Product Selection ("Binebenta"):**
   - 🥣 **Taho**
   - 🥡 **Siomai**
   - 🥚 **Balut**
   - ⭐ **Other: [Custom Input]**
3. **Photo Verification:** Quick step to upload or take a photo of the cart, kaldero, or stall (*"Kunan ng litrato ang iyong kaldero o pwesto"*), building trust for buyers.
4. **Vendor Sidebar / Slide-Over Drawer:**
   - Status toggle: **Naglilibot (Live GPS)** vs **Nakatigil** vs **Ubos na**.
   - Live waiting audience counter (e.g. *18 na kapitbahay ang nag-aabang*).
   - Change product or edit stall details.

---

## 3. UI/UX Design System: Extreme Simplicity & Pure Mobile

The UI is inspired by **Facebook's intuitive simplicity** and **Google Maps' full-bleed utility**, tailored for everyday Filipinos using smartphones outdoors.

### 3.1 "Taho" 3-Color Palette & Dark Mode Theming
1. **Tofu Cream (`#FAF7F2` / `#FFFFFF`):** High-readability canvas and card surfaces that prevent screen glare in harsh Philippine sunlight.
2. **Arnibal Brown (`#4A2E1B` / `#361F11`):** Deep warm brown sugar hue for high-contrast typography, primary buttons, and critical text (WCAG AAA compliant).
3. **Sago Amber (`#D97706` / `#FEF3C7`):** Golden tapioca amber for active radar rings, live GPS markers, and proximity alerts.
4. **Dark Mode & Brand Assets:**
   * **Light Mode Logo:** [pwesto_default.svg](file:///C:/Users/Art/Documents/arteamio/public/assets/pwesto_default.svg) (`/assets/pwesto_default.svg`).
   * **Dark Mode Logo:** [pwesto_dark.svg](file:///C:/Users/Art/Documents/arteamio/public/assets/pwesto_dark.svg) (`/assets/pwesto_dark.svg`).
   * One-tap dark mode toggle (☀️ / 🌙) accessible from the landing page, map search bar, and vendor sidebar.
   * Strictly uses official OpenStreetMap tiles (`https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`) with custom CSS filter attenuation (`saturate(28%) contrast(86%) brightness(103%)`) to soften commercial POIs/establishments for maximum street food focus (matching the clean Lyfsaver PH aesthetic) without external third-party proxies. Dark mode utilizes high-contrast night-mode tile filtering.

### 3.2 Visual Legend (No City Dropdown Clutter)
Instead of dividing by city dropdowns, the map displays all nearby vendors universally with an intuitive visual legend bar:
- 🥣 **Taho**
- 🥡 **Siomai**
- 🥚 **Balut**
- ⭐ **Iba pa (Others)**

### 3.3 Functionalist, Everyday Tagalog
* No jargon, no corporate filler, no deep archaic Tagalog.
* Clean, friendly everyday Filipino: *"Bibili"*, *"Magbebenta"*, *"Magsimula"*, *"Ihanda ang barya"*, *"Naglilibot"*, *"Ubos na"*.
* English toggle available at all times.

### 3.4 Pure Mobile Compatibility
* **Full-viewport map:** Map fills 100% of the screen like Google Maps.
* **Floating UI elements:** Search pill at top, floating visual legend, bottom sheet / drawer for vendor and pin details.
* **Thumb-friendly touch targets:** Minimum 48×48px for all touch interactions.

### 3.5 Strict Role Isolation & Deliberate Mode Swapping
* **No Accidental Mode Swapping:** Toggling between **Bibili** and **Magbebenta** is guarded by an explicit confirmation dialog (`RoleSwitchModal.svelte`). Quick one-tap header pills are removed to prevent accidental switches on mobile.
* **Buyer Isolation:** When in Buyer mode, the Vendor Dashboard (`Menu ng Tindero`, broadcast status, stock toggles, live audience metrics) is completely excluded from the UI.
* **Vendor Onboarding Integrity:** Switching from Buyer to Vendor requires completing the full vendor onboarding flow—selecting products (*Taho, Siomai, Balut, Iba pa*) and submitting a stall/kaldero verification photo before broadcast activation.
* **Guarded Routes:** The `/vendor` route strictly checks user role; buyers attempting direct URL navigation are safely routed to the consumer map.

---

## 4. Geospatial & Mathematical Foundation

### 4.1 Spatial Point Extraction & Huff Gravity Model
For vendors analyzing stall viability, the backend calculates foot-traffic attraction from transit anchors:

$$\text{Viability Score} = \sum_{j=1}^{n} \frac{W_j}{d_{ij}^\beta} - \lambda \cdot (\text{Competitor Density}_i)$$

Where:
* $W_j$: Anchor Weight (Jeepney stop = 1.0, tricycle queue = 0.85, commuter footbridge = 0.95).
* $d_{ij}$: Walking distance from candidate location to transit anchor.
* $\beta \approx 1.7$: Distance decay exponent penalizing distances beyond 3 minutes (~200m).
* $\lambda$: Competitor penalty factor.

---

## 5. System Architecture & Tech Stack

* **Frontend:** Svelte 5 + Vite + Tailwind CSS (Mobile-first PWA, ultra-fast bundle).
* **Mapping:** Leaflet with official **OpenStreetMap** tile server (`https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`). Strictly NO third-party Carto tile layers. Adheres 100% to the [OSMF Attribution Guidelines](https://osmfoundation.org/wiki/Licence/Attribution_Guidelines) with clickable links to [OpenStreetMap Copyright](https://www.openstreetmap.org/copyright). Establishment/POI visual noise is attenuated via tailored Leaflet tile-pane CSS filters to deliver the clean, minimalist look inspired by Lyfsaver PH.
* **Storage:** `localStorage` for returning user session persistence (`pwestoradar_session`).
* **Backend Target:** Python (FastAPI) + PostgreSQL / PostGIS + Redis for live GPS coordinate broadcasting.

---

## 6. Development & Verification Checklist

- [x] Sakay.ph / Angkas style landing page with **"Magsimula"** button.
- [x] Initial prompt: **"Bibili"** vs **"Magbebenta?"**.
- [x] **"Bibili"** path: Search defaulted to GPS location with instant map launch.
- [x] **"Magbebenta"** path: Product selection (*Taho, Siomai, Balut, Other*) + photo verification of kaldero/stall.
- [x] Full-bleed Google Maps style main screen with product pins.
- [x] Universal product legend (🥣, 🥡, 🥚, ⭐).
- [x] Vendor slide-over sidebar / bottom drawer (Facebook UI simplicity, strictly isolated to Vendor mode).
- [x] Pure mobile responsiveness and thumb-friendly controls.
- [x] Pure OpenStreetMap infrastructure (`tile.openstreetmap.org`) with zero Carto dependencies.
- [x] OpenStreetMap Foundation attribution compliance with clickable copyright links.
- [x] Simplified establishment attenuation via CSS filters (Lyfsaver PH aesthetic).
- [x] Strict role isolation: Buyer mode never sees vendor dashboard or vendor controls.
- [x] Deliberate mode swapping: Guarded by confirmation modal (`RoleSwitchModal`) requiring onboarding verification when switching to vendor.
- [x] Active Huff Gravity Model viability evaluation in Vendor Console (*"Saan Pepwesto?"*).
