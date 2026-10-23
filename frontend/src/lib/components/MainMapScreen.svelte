<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { DemandHotspot, DemandHotspotCategory, Language, ProductType, TaggedVendor, UserSession } from '../types';
  import { BUSINESS_ARCHETYPES, generateAnchorsAround, generateCompetitorsAround, PRODUCT_LEGEND } from '../data/spots';
  import { getAllDemandHotspots, getDemandHotspotsForViewport, getOpportunityRating, HOTSPOT_CATEGORY_META, HOTSPOT_LEVEL_META } from '../data/hotspots';
  import {
    evaluateLocationViability,
    calculateDistanceM,
    getRecommendedZones,
    evaluateHeatmapProbe,
    type HeatmapSpotProbeResult,
  } from '../gravity';
  import { ViabilityHeatmapLayer } from '../heatmapLayer';
  import { updateVendorStatusOnBackend } from '../api';
  import type { RecommendedZone } from '../types';
  import Logo from './Logo.svelte';
  import HotspotDetailCard from './HotspotDetailCard.svelte';
  import HotspotConfigModal from './HotspotConfigModal.svelte';
  import L from 'leaflet';
  import Icon from '$lib/components/Icon.svelte';
  import { getIconSvg } from '$lib/icons';

  export let session: UserSession;
  export let vendors: TaggedVendor[];
  export let language: Language = 'tl';
  export let isDarkMode: boolean = false;
  export let onToggleDarkMode: (() => void) | undefined = undefined;
  export let onToggleLanguage: (() => void) | undefined = undefined;
  export let onNavigateToLanding: (() => void) | undefined = undefined;
  export let onSwitchRole: () => void;
  export let onResetSession: () => void;
  export let onNavigateToSettings: (() => void) | undefined = undefined;
  export let onNavigateToSearch: (() => void) | undefined = undefined;
  export let onNavigateToVendor: (() => void) | undefined = undefined;

  let mapContainer: HTMLDivElement;
  let map: L.Map | null = null;
  let tileLayer: L.TileLayer | null = null;
  let vendorMarkers: L.Marker[] = [];
  let userMarker: L.Marker | null = null;
  let userCircle: L.Circle | null = null;

  // Demand Hotspots State
  let isHotspotsVisible: boolean = true;
  let demandHotspots: DemandHotspot[] = [];
  let activeHotspotCategory: DemandHotspotCategory | 'all' = 'all';
  let selectedHotspot: DemandHotspot | null = null;
  let hotspotCircles: L.Circle[] = [];
  let hotspotMarkers: L.Marker[] = [];
  let showHotspotConfigModal: boolean = false;
  let sidebarActiveTab: 'vendors' | 'hotspots' = 'vendors';
  let mapCenterLat: number = session.lat;
  let mapCenterLng: number = session.lng;
  let currentViewportBounds: { north: number; south: number; east: number; west: number } | null = null;

  // Selected filter (null = all)
  let activeFilter: ProductType | null = null;
  let selectedVendor: TaggedVendor | null = null;

  // Huff Gravity Model Viability Evaluation for Vendor (pinned to session location so markers stay stationary on map pan)
  $: anchors = generateAnchorsAround(session.lat, session.lng);
  $: competitors = generateCompetitorsAround(session.lat, session.lng);
  let selectedArchetype = BUSINESS_ARCHETYPES.find((a) => a.id === session.product?.toLowerCase()) || BUSINESS_ARCHETYPES[2];
  $: viability = evaluateLocationViability(session.lat, session.lng, selectedArchetype, anchors, competitors);

    let viabilityMarker: L.Marker | null = null;
  let viabilityLine: L.Polyline | null = null;
  let targetedRoute: { lat: number; lng: number; name?: string } | null = null;
  let targetedRouteDistanceM: number = 0;
  let targetedRouteEtaMins: number = 0;
  let targetedRouteLine: L.Polyline | null = null;
  let targetedRouteGlow: L.Polyline | null = null;
  let targetedRouteMarker: L.Marker | null = null;

  // React to external session coordinates update (e.g. searching OSM location)
  let currentSessionLat = session.lat;
  let currentSessionLng = session.lng;
  $: if (map && (session.lat !== currentSessionLat || session.lng !== currentSessionLng)) {
    currentSessionLat = session.lat;
    currentSessionLng = session.lng;
    mapCenterLat = session.lat;
    mapCenterLng = session.lng;
    map.flyTo([session.lat, session.lng], 16, { duration: 0.6 });
    reloadHotspots(true);
    renderMapElements();
  }

  // Recommended viability spot for vendor ("Saan Magandang Pepwesto"):
  // Picks the nearest GOOD score hotspot (opportunityScore >= 80) so both the dashed line
  // and the low-traffic banner always recommend the closest high-traffic spot.
  $: recommendedViabilitySpot = (() => {
    if (session.role !== 'vendor') return null;

    const hotspotPool =
      demandHotspots && demandHotspots.length > 0
        ? demandHotspots
        : getAllDemandHotspots(session.lat, session.lng);

    const goodHotspots = hotspotPool.filter((h) => h.opportunityScore >= 80);
    const candidates = goodHotspots.length > 0 ? goodHotspots : hotspotPool;

    if (candidates.length > 0) {
      let nearestH = candidates[0];
      let minDist = calculateDistanceM(session.lat, session.lng, nearestH.lat, nearestH.lng);
      for (const h of candidates) {
        const d = calculateDistanceM(session.lat, session.lng, h.lat, h.lng);
        if (d < minDist) {
          nearestH = h;
          minDist = d;
        }
      }
      return {
        id: nearestH.id,
        name: language === 'tl' ? (nearestH.nameTl || nearestH.name) : nearestH.name,
        lat: nearestH.lat,
        lng: nearestH.lng,
        distanceM: minDist,
        ratingTl: 'Napakagandang Pwesto!',
        ratingEn: 'GOOD Hotspot!',
        score: nearestH.opportunityScore,
        isNearUser: true,
      };
    }

    if (!anchors || anchors.length === 0) return null;
    let nearest = anchors[0];
    let minD = calculateDistanceM(session.lat, session.lng, nearest.lat, nearest.lng);
    for (const a of anchors) {
      const d = calculateDistanceM(session.lat, session.lng, a.lat, a.lng);
      if (d < minD) {
        nearest = a;
        minD = d;
      }
    }
    return {
      ...nearest,
      distanceM: minD,
      ratingTl: viability.ratingTl,
      ratingEn: viability.ratingEn,
      score: viability.score,
      isNearUser: true,
    };
  })();

  function handleZoomIn() {
    map?.zoomIn();
  }

  function handleZoomOut() {
    map?.zoomOut();
  }

  function formatDistance(meters: number): string {
    if (meters >= 1000) {
      const km = meters / 1000;
      return `${Number(km.toFixed(1))}km`;
    }
    return `${Math.round(meters)}m`;
  }

  // Floating vendor list sidebar state
  let isVendorListOpen: boolean = true;

  // Vendor sidebar / drawer open state
  let isSidebarOpen: boolean = false;
  let vendorStatus: 'live' | 'stopped' | 'sold_out' = 'live';
  let waitingAudienceCount: number = 19;

  // Notification chime alert state
  let alertToast: string | null = null;

  // True Spatial Canvas Heatmap Layer state & toggle
  let isHeatmapActive: boolean = true;
  let heatmapCanvasLayer: ViabilityHeatmapLayer | null = null;
  let sweetSpotMarkers: L.Marker[] = [];
  let heatmapProbeResult: HeatmapSpotProbeResult | null = null;
  let heatmapProbeMarker: L.Marker | null = null;
  let heatmapProductOverride: string | null = null;

  $: activeHeatmapProduct =
    heatmapProductOverride ||
    (session.role === 'vendor' ? (session.product || 'taho') : (activeFilter || 'taho'));

  // Wider-Scope Smart Zone Recommendations (Huff's Gravity Model + Competitor Repulsion)
  $: recommendedZones = getRecommendedZones(
    session.lat,
    session.lng,
    activeHeatmapProduct,
    8500,
    vendors
  );

  // Viewport-aware discovered sweet spots for the wider map when panning/zooming
  $: viewportSweetSpots = getRecommendedZones(
    mapCenterLat || session.lat,
    mapCenterLng || session.lng,
    activeHeatmapProduct,
    4200,
    vendors
  );

  // Vendor Ubos Na & Zone Suggestions UI states
  let showSoldOutConfirmModal: boolean = false;
  let showSoldOutCelebration: boolean = false;
  let showZoneSuggestionsDrawer: boolean = false;

  function toggleHeatmap() {
    isHeatmapActive = !isHeatmapActive;
    if (!isHeatmapActive) {
      heatmapProbeResult = null;
    }
    renderMapElements();
  }

  function handleMapClickForHeatmap(e: L.LeafletMouseEvent) {
    if (!isHeatmapActive) return;
    selectedVendor = null;
    selectedHotspot = null;
    heatmapProbeResult = evaluateHeatmapProbe(
      e.latlng.lat,
      e.latlng.lng,
      activeHeatmapProduct,
      vendors
    );
    renderMapElements();
  }

  async function handleConfirmSoldOut() {
    vendorStatus = 'sold_out';
    showSoldOutConfirmModal = false;
    showSoldOutCelebration = true;
    const vendorId = localStorage.getItem('pwesto_vendor_id') || 'v-current';
    await updateVendorStatusOnBackend(vendorId, 'sold_out');
    renderMapElements();
  }

  async function handleResumeLive() {
    vendorStatus = 'live';
    showSoldOutCelebration = false;
    const vendorId = localStorage.getItem('pwesto_vendor_id') || 'v-current';
    await updateVendorStatusOnBackend(vendorId, 'live');
    renderMapElements();
  }


  onMount(() => {
    if (!mapContainer) return;

    // Full screen Google Maps style Leaflet instance
    map = L.map(mapContainer, {
      center: [session.lat, session.lng],
      zoom: 16,
      zoomControl: false,
    });

    // Zoom controls integrated in custom bottom-right panel

    if (typeof window !== 'undefined') {
      isVendorListOpen = window.innerWidth >= 640;
    }

    applyMapTileTheme();
    map.on('moveend', handleMapMoveEnd);
    map.on('click', handleMapClickForHeatmap);
    reloadHotspots();
    renderMapElements();
  });

  onDestroy(() => {
    if (map) {
      map.off('moveend', handleMapMoveEnd);
      map.off('click', handleMapClickForHeatmap);
      if (heatmapCanvasLayer) map.removeLayer(heatmapCanvasLayer);
      sweetSpotMarkers.forEach((m) => map?.removeLayer(m));
      if (heatmapProbeMarker) map.removeLayer(heatmapProbeMarker);
      if (viabilityMarker) map.removeLayer(viabilityMarker);
      if (viabilityLine) map.removeLayer(viabilityLine);
      if (targetedRouteLine) map.removeLayer(targetedRouteLine);
      if (targetedRouteGlow) map.removeLayer(targetedRouteGlow);
      if (targetedRouteMarker) map.removeLayer(targetedRouteMarker);
      hotspotCircles.forEach((c) => map?.removeLayer(c));
      hotspotMarkers.forEach((m) => map?.removeLayer(m));
      map.remove();
      map = null;
    }
  });

  // Re-theme map when dark mode changes
  $: if (map && isDarkMode !== undefined) {
    applyMapTileTheme();
  }

  function applyMapTileTheme() {
    if (!map) return;
    if (tileLayer) {
      map.removeLayer(tileLayer);
    }

    tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
    }).addTo(map);
  }

  function handleMapMoveEnd() {
    if (!map) return;
    const center = map.getCenter();
    const b = map.getBounds();
    mapCenterLat = Number(center.lat.toFixed(5));
    mapCenterLng = Number(center.lng.toFixed(5));
    currentViewportBounds = {
      north: b.getNorth(),
      south: b.getSouth(),
      east: b.getEast(),
      west: b.getWest(),
    };
    reloadHotspots();
  }

  function reloadHotspots(force: boolean = false) {
    if (!map) {
      demandHotspots = getAllDemandHotspots(session.lat, session.lng);
      return;
    }
    const center = map.getCenter();
    const b = map.getBounds();
    mapCenterLat = Number(center.lat.toFixed(5));
    mapCenterLng = Number(center.lng.toFixed(5));
    currentViewportBounds = {
      north: b.getNorth(),
      south: b.getSouth(),
      east: b.getEast(),
      west: b.getWest(),
    };
    const nextHotspots = getDemandHotspotsForViewport(currentViewportBounds, center.lat, center.lng, map.getZoom());
    const isSame =
      !force &&
      nextHotspots.length === demandHotspots.length &&
      nextHotspots.every(
        (h, i) =>
          h.id === demandHotspots[i]?.id &&
          h.lat === demandHotspots[i]?.lat &&
          h.lng === demandHotspots[i]?.lng &&
          h.opportunityScore === demandHotspots[i]?.opportunityScore
      );
    if (!isSame) {
      demandHotspots = nextHotspots;
    }
  }

    function drawRoutePolyline(coords: [number, number][]) {
    if (!map) return;
    if (targetedRouteGlow) {
      map.removeLayer(targetedRouteGlow);
      targetedRouteGlow = null;
    }
    if (targetedRouteLine) {
      map.removeLayer(targetedRouteLine);
      targetedRouteLine = null;
    }

    // Outer glow / contrast casing (broad high-contrast line)
    targetedRouteGlow = L.polyline(coords, {
      color: isDarkMode ? '#F59E0B' : '#4A2E1B',
      weight: 8,
      opacity: 0.35,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(map);

    // Vibrant main route path with walking dash pattern
    targetedRouteLine = L.polyline(coords, {
      color: '#F59E0B',
      weight: 5,
      opacity: 0.95,
      dashArray: '8, 8',
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(map);
  }

  async function fetchAndDrawWalkingRoute(startLat: number, startLng: number, endLat: number, endLng: number) {
    if (!map) return;

    // 1. Immediately draw direct line so there is zero delay
    drawRoutePolyline([[startLat, startLng], [endLat, endLng]]);

    // 2. Fetch real street-following walking path from OpenStreetMap OSRM
    try {
      const url = `https://router.project-osrm.org/route/v1/walking/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.routes && data.routes[0]?.geometry?.coordinates) {
          const coords: [number, number][] = data.routes[0].geometry.coordinates.map(
            ([lng, lat]: [number, number]) => [lat, lng]
          );
          drawRoutePolyline(coords);
          if (data.routes[0].distance) {
            targetedRouteDistanceM = Math.round(data.routes[0].distance);
            targetedRouteEtaMins = Math.max(1, Math.round(data.routes[0].duration / 60));
          }
        }
      }
    } catch {
      // Fallback direct line remains visible
    }
  }

  function handleTargetLocation(lat: number, lng: number, name?: string) {
    if (targetedRoute && targetedRoute.lat === lat && targetedRoute.lng === lng) {
      handleClearRoute();
      return;
    }

    const dist = calculateDistanceM(session.lat, session.lng, lat, lng);
    const eta = Math.max(1, Math.round(dist / 67));

    targetedRoute = {
      lat,
      lng,
      name: name || (selectedHotspot ? selectedHotspot.name : 'Target Hotspot'),
    };
    targetedRouteDistanceM = dist;
    targetedRouteEtaMins = eta;

    renderMapElements();

    if (map) {
      map.fitBounds(
        [
          [session.lat, session.lng],
          [lat, lng],
        ],
        { padding: [90, 90], maxZoom: 17 }
      );
    }
  }

  function handleClearRoute() {
    targetedRoute = null;
    targetedRouteDistanceM = 0;
    targetedRouteEtaMins = 0;
    if (targetedRouteLine && map) {
      map.removeLayer(targetedRouteLine);
      targetedRouteLine = null;
    }
    if (targetedRouteGlow && map) {
      map.removeLayer(targetedRouteGlow);
      targetedRouteGlow = null;
    }
    if (targetedRouteMarker && map) {
      map.removeLayer(targetedRouteMarker);
      targetedRouteMarker = null;
    }
    renderMapElements();
  }

  $: filteredVendors = activeFilter
    ? vendors.filter((v) => v.productType === activeFilter)
    : vendors;

  $: listHotspots = activeHotspotCategory === 'all'
    ? demandHotspots
    : demandHotspots.filter((h) => h.category === activeHotspotCategory);

  $: if (map && (filteredVendors || session || isDarkMode || isHotspotsVisible || activeHotspotCategory || demandHotspots || selectedHotspot || recommendedViabilitySpot || targetedRoute || isHeatmapActive || activeHeatmapProduct || viewportSweetSpots)) {
    renderMapElements();
  }

  function renderMapElements() {
    if (!map) return;

    // Clear old viability spot markers and distance line
    if (viabilityMarker) {
      map.removeLayer(viabilityMarker);
      viabilityMarker = null;
    }
    if (viabilityLine) {
      map.removeLayer(viabilityLine);
      viabilityLine = null;
    }
    if (targetedRouteLine) {
      map.removeLayer(targetedRouteLine);
      targetedRouteLine = null;
    }
    if (targetedRouteGlow) {
      map.removeLayer(targetedRouteGlow);
      targetedRouteGlow = null;
    }
    if (targetedRouteMarker) {
      map.removeLayer(targetedRouteMarker);
      targetedRouteMarker = null;
    }

    // Clear old sweet spot & probe markers
    sweetSpotMarkers.forEach((m) => map?.removeLayer(m));
    sweetSpotMarkers = [];
    if (heatmapProbeMarker) {
      map.removeLayer(heatmapProbeMarker);
      heatmapProbeMarker = null;
    }

    // 1. Render User's Location Pin (Google Maps Blue Dot / Pin)
    if (userMarker) map.removeLayer(userMarker);
    if (userCircle) map.removeLayer(userCircle);

    const userPinHtml = `
      <div class="relative flex items-center justify-center">
        <span class="absolute w-8 h-8 rounded-full ${isDarkMode ? 'bg-[#F59E0B]/30' : 'bg-[#4A2E1B]/20'} animate-ping"></span>
        <div class="w-7 h-7 rounded-full ${
          isDarkMode ? 'bg-[#F59E0B] text-[#1A120B]' : 'bg-[#4A2E1B] text-white'
        } border-2 border-white shadow-lg flex items-center justify-center text-xs font-black">
          ${session.role === 'vendor' ? getIconSvg('cart', { size: 14, color: isDarkMode ? '#1A120B' : '#FFFFFF' }) : getIconSvg('user', { size: 14, color: isDarkMode ? '#1A120B' : '#FFFFFF' })}
        </div>
      </div>
    `;

    userMarker = L.marker([session.lat, session.lng], {
      icon: L.divIcon({
        html: userPinHtml,
        className: 'user-pin-icon',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      }),
      zIndexOffset: 1000,
    }).addTo(map);

    userCircle = L.circle([session.lat, session.lng], {
      radius: 180,
      color: isDarkMode ? '#F59E0B' : '#4A2E1B',
      fillColor: isDarkMode ? '#F59E0B' : '#4A2E1B',
      fillOpacity: 0.06,
      weight: 1,
      dashArray: '3, 3',
    }).addTo(map);

    // 2. Clear old vendor markers
    vendorMarkers.forEach((m) => map?.removeLayer(m));
    vendorMarkers = [];

    // 3. Render Tagged Streetfood Vendors
    filteredVendors.forEach((vendor) => {
      const isSelected = selectedVendor?.id === vendor.id;
      const isSoldOut = vendor.status === 'sold_out';
      const markerHtml = `
        <div class="relative flex items-center justify-center cursor-pointer transition-transform hover:scale-110 active:scale-95 ${isSoldOut ? 'opacity-60 grayscale' : ''}">
          ${vendor.status === 'live' ? '<span class="absolute w-10 h-10 rounded-full bg-[#D97706]/30 animate-pulse"></span>' : ''}
          ${isSoldOut ? '<span class="absolute -top-2 -right-2 px-1.5 py-0.5 rounded-full bg-red-600 text-white text-[9px] font-black uppercase tracking-tighter shadow-md">UBOS</span>' : ''}
          <div class="w-10 h-10 rounded-2xl ${
            isDarkMode ? 'bg-[#271A10] border-2 border-[#3D2717]' : 'bg-white border-2 border-[#EAE4D9]'
          } ${
            isSelected ? (isDarkMode ? '!border-[#F59E0B] shadow-xl scale-110' : '!border-[#4A2E1B] shadow-xl scale-110') : 'shadow-md'
          } flex items-center justify-center text-xl">
            ${getIconSvg(vendor.icon, { size: 22, color: isDarkMode ? '#FAF7F2' : '#4A2E1B' })}
          </div>
        </div>
      `;

      const m = L.marker([vendor.lat, vendor.lng], {
        icon: L.divIcon({
          html: markerHtml,
          className: 'tagged-vendor-icon',
          iconSize: [40, 40],
          iconAnchor: [20, 20],
        }),
        zIndexOffset: isSelected ? 800 : 500,
      }).addTo(map!);

      m.on('click', () => {
        selectedVendor = vendor;
        selectedHotspot = null;
        map?.flyTo([vendor.lat, vendor.lng], 16, { duration: 0.5 });
      });

      vendorMarkers.push(m);
    });

    // 4. Render Demand Hotspots (Student dismissals, barangay events, basketball games, commuter rush)
    hotspotCircles.forEach((c) => map?.removeLayer(c));
    hotspotCircles = [];
    hotspotMarkers.forEach((m) => map?.removeLayer(m));
    hotspotMarkers = [];

    if (isHotspotsVisible) {
      const hotspotsToRender = activeHotspotCategory === 'all'
        ? demandHotspots
        : demandHotspots.filter((h) => h.category === activeHotspotCategory);

      hotspotsToRender.forEach((hotspot) => {
        const isSelected = selectedHotspot?.id === hotspot.id;
        const lvlMeta = HOTSPOT_LEVEL_META[hotspot.potentialLevel] || HOTSPOT_LEVEL_META.medium;
        const catMeta = HOTSPOT_CATEGORY_META[hotspot.category] || HOTSPOT_CATEGORY_META.barangay;

        // Color-coded hotspot catchment circle (hidden when thermal heatmap canvas is active to avoid duplicate circles)
        if (!isHeatmapActive) {
          const circle = L.circle([hotspot.lat, hotspot.lng], {
            radius: hotspot.radiusM,
            color: lvlMeta.mapStroke,
            fillColor: lvlMeta.mapFill,
            fillOpacity: isSelected ? 0.35 : 0.18,
            weight: isSelected ? 3 : 2,
            dashArray: hotspot.potentialLevel === 'high' ? undefined : '4, 4',
          }).addTo(map!);

          circle.on('click', () => {
            selectedHotspot = hotspot;
            selectedVendor = null;
            map?.flyTo([hotspot.lat, hotspot.lng], 16, { duration: 0.5 });
          });
          hotspotCircles.push(circle);
        }

        // Color-coded hotspot marker badge with Category Icon (& Opportunity Score in Vendor mode only)
        const isVendorMode = session.role === 'vendor';
        const markerHtml = `
          <div class="relative flex items-center justify-center cursor-pointer transition-transform hover:scale-110 active:scale-95 group">
            ${hotspot.potentialLevel === 'high' ? `<span class="absolute w-12 h-12 rounded-full animate-ping opacity-35" style="background-color: ${lvlMeta.mapFill}"></span>` : ''}
            <div class="px-2.5 py-1 rounded-xl shadow-lg flex items-center gap-1.5 border font-black text-xs transition-transform ${isSelected ? 'scale-110 ring-2 ring-white dark:ring-black' : ''}" style="background-color: ${isDarkMode ? '#271A10' : '#FFFFFF'}; border-color: ${lvlMeta.mapStroke}; color: ${isDarkMode ? '#FAF7F2' : '#4A2E1B'};">
              <span class="text-sm">${getIconSvg(catMeta.icon, { size: 14, color: isDarkMode ? '#FAF7F2' : '#4A2E1B' })}</span>
              ${isVendorMode ? `<span class="text-[10px] px-1.5 py-0.5 rounded-full text-white font-extrabold" style="background-color: ${lvlMeta.mapFill}">
                ${hotspot.opportunityScore}
              </span>` : ''}
            </div>
          </div>
        `;

        const m = L.marker([hotspot.lat, hotspot.lng], {
          icon: L.divIcon({
            html: markerHtml,
            className: 'demand-hotspot-marker',
            iconSize: [isVendorMode ? 64 : 36, 32],
            iconAnchor: [isVendorMode ? 32 : 18, 16],
          }),
          zIndexOffset: isSelected ? 900 : (hotspot.potentialLevel === 'high' ? 700 : 600),
        }).addTo(map!);

        m.on('click', () => {
          selectedHotspot = hotspot;
          selectedVendor = null;
          map?.flyTo([hotspot.lat, hotspot.lng], 16, { duration: 0.5 });
        });
        hotspotMarkers.push(m);
      });
    }

    // 5. Render Recommended Viability Spot & Distance Line (For Vendor: "Saan Magandang Pepwesto")
    if (session.role === 'vendor' && recommendedViabilitySpot) {
      // Dashed distance line from vendor pin (or explored area center) to recommended spot
      const originLat = recommendedViabilitySpot.isNearUser ? session.lat : mapCenterLat;
      const originLng = recommendedViabilitySpot.isNearUser ? session.lng : mapCenterLng;
      viabilityLine = L.polyline(
        [
          [originLat, originLng],
          [recommendedViabilitySpot.lat, recommendedViabilitySpot.lng],
        ],
        {
          color: '#D97706',
          weight: 3,
          dashArray: '6, 8',
          opacity: 0.9,
        }
      ).addTo(map!);

      // Distance badge marker on the spot (rating text removed; >=1000m converted to km)
      const viabilitySpotHtml = `
        <div class="relative flex flex-col items-center cursor-pointer select-none group -translate-y-2">
          <div class="px-2.5 py-1 rounded-full ${
            isDarkMode ? 'bg-[#271A10] text-[#F59E0B] border-[#F59E0B]/50' : 'bg-[#4A2E1B] text-[#FAF7F2] border-white'
          } border shadow-lg text-[11px] font-black whitespace-nowrap mb-1 flex items-center gap-1.5 transition-transform group-hover:scale-105">
            ${getIconSvg('star', { size: 12, color: '#D97706' })}
            <span class="text-[#D97706] font-extrabold">~${formatDistance(recommendedViabilitySpot.distanceM)}</span>
          </div>
          <div class="w-10 h-10 rounded-2xl bg-[#D97706] text-white border-2 border-white shadow-xl flex items-center justify-center text-lg font-black transition-transform group-hover:scale-110">
            ${getIconSvg('map-pin', { size: 18, color: '#FFFFFF' })}
          </div>
        </div>
      `;

      viabilityMarker = L.marker([recommendedViabilitySpot.lat, recommendedViabilitySpot.lng], {
        icon: L.divIcon({
          html: viabilitySpotHtml,
          className: 'viability-spot-marker',
          iconSize: [160, 60],
          iconAnchor: [80, 56],
        }),
        zIndexOffset: 850,
      }).addTo(map!);

      viabilityMarker.on('click', () => {
        map?.flyTo([recommendedViabilitySpot.lat, recommendedViabilitySpot.lng], 17, { duration: 0.5 });
      });

      viabilityMarker.bindPopup(`
        <div class="p-1 space-y-1 text-xs">
          <div class="font-black text-[#D97706]">${language === 'tl' ? 'Saan Magandang Pepwesto?' : 'Recommended Stall Spot'}</div>
          <div class="font-bold text-sm">${recommendedViabilitySpot.name}</div>
          <div class="text-gray-600">${language === 'tl' ? 'Layo mula sa iyo' : 'Distance from you'}: <strong>~${formatDistance(recommendedViabilitySpot.distanceM)}</strong></div>
        </div>
      `);
    }

    // 5b. Render World-Pinned Subtle Spatial Huff Gravity Heatmap Layer + Probe Pin
    if (isHeatmapActive) {
      if (!heatmapCanvasLayer) {
        heatmapCanvasLayer = new ViabilityHeatmapLayer({
          centerLat: session.lat,
          centerLng: session.lng,
          productType: activeHeatmapProduct,
          isDarkMode,
          activeVendors: vendors,
          hotspots: listHotspots,
        });
        heatmapCanvasLayer.addTo(map!);
      } else {
        heatmapCanvasLayer.setHeatmapState({
          centerLat: session.lat,
          centerLng: session.lng,
          productType: activeHeatmapProduct,
          isDarkMode,
          activeVendors: vendors,
          hotspots: listHotspots,
        });
      }

      // Render live probe marker if user tapped anywhere on the heatmap
      if (heatmapProbeResult) {
        const probeColor =
          heatmapProbeResult.score >= 80
            ? '#16A34A'
            : heatmapProbeResult.score >= 60
              ? '#22C55E'
              : '#86EFAC';
        const probeHtml = `
          <div class="relative flex flex-col items-center select-none -translate-y-3">
            <div class="px-2.5 py-1 rounded-full bg-[#1A120B] text-white border-2 border-white shadow-2xl text-[11px] font-black whitespace-nowrap mb-1 flex items-center gap-1">
              <span>🎯</span>
              <span>${heatmapProbeResult.score}/100</span>
            </div>
            <div class="w-5 h-5 rounded-full border-2 border-white shadow-lg animate-pulse" style="background-color: ${probeColor}"></div>
          </div>
        `;
        heatmapProbeMarker = L.marker([heatmapProbeResult.lat, heatmapProbeResult.lng], {
          icon: L.divIcon({
            html: probeHtml,
            className: 'heatmap-probe-pin',
            iconSize: [90, 48],
            iconAnchor: [45, 42],
          }),
          zIndexOffset: 940,
        }).addTo(map!);
      }
    } else if (heatmapCanvasLayer) {
      map.removeLayer(heatmapCanvasLayer);
      heatmapCanvasLayer = null;
    }

    // 6. Draw Active Targeted Navigation Route Line & Destination Waypoint Marker
    if (targetedRoute) {
      fetchAndDrawWalkingRoute(session.lat, session.lng, targetedRoute.lat, targetedRoute.lng);

      const distM = targetedRouteDistanceM || calculateDistanceM(session.lat, session.lng, targetedRoute.lat, targetedRoute.lng);
      const etaMins = targetedRouteEtaMins || Math.max(1, Math.round(distM / 67));

      const waypointHtml = `
        <div class="relative flex flex-col items-center select-none -translate-y-4 cursor-pointer">
          <div class="px-3 py-1.5 rounded-full ${
            isDarkMode ? 'bg-[#1A120B] text-white border-2 border-[#F59E0B]' : 'bg-[#4A2E1B] text-white border-2 border-white'
          } shadow-2xl text-xs font-black whitespace-nowrap mb-1 flex items-center gap-1.5 animate-bounce">
            <span>🎯</span>
            <span>${language === 'tl' ? 'Puntiryang Pwesto' : 'Target Spot'}</span>
            <span class="opacity-50">•</span>
            <span class="text-[#F59E0B] font-extrabold">~${formatDistance(distM)} (${etaMins} min)</span>
          </div>
          <div class="relative flex items-center justify-center">
            <span class="absolute w-10 h-10 rounded-full bg-[#F59E0B]/50 animate-ping"></span>
            <div class="w-9 h-9 rounded-full bg-[#F59E0B] text-[#1A120B] border-2 border-white shadow-xl flex items-center justify-center text-base font-black">
              🏁
            </div>
          </div>
        </div>
      `;

      targetedRouteMarker = L.marker([targetedRoute.lat, targetedRoute.lng], {
        icon: L.divIcon({
          html: waypointHtml,
          className: 'targeted-route-waypoint',
          iconSize: [180, 60],
          iconAnchor: [90, 50],
        }),
        zIndexOffset: 1200,
      }).addTo(map);
    }
  }

  function handleRecenterGPS() {
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          session.lat = Number(pos.coords.latitude.toFixed(5));
          session.lng = Number(pos.coords.longitude.toFixed(5));
          if (map) {
            map.flyTo([session.lat, session.lng], 16, { duration: 0.6 });
          }
          renderMapElements();
        },
        (_err) => {
          // IF GPS is off, denied, or timed out, gracefully just pin to the current location
          if (map) {
            map.flyTo([session.lat, session.lng], 16, { duration: 0.6 });
          }
          renderMapElements();
        },
        { timeout: 4000, enableHighAccuracy: true }
      );
    } else {
      // IF GPS is off/unsupported, just pin to the location
      if (map) {
        map.flyTo([session.lat, session.lng], 16, { duration: 0.6 });
      }
      renderMapElements();
    }
  }

  function triggerBuyerAlert(vendor: TaggedVendor) {
    alertToast = language === 'tl'
      ? `🔔 Papunta na si ${vendor.name}! (${vendor.distanceM}m) Ihanda na ang barya at lagayan!`
      : `🔔 ${vendor.name} is approaching! (${vendor.distanceM}m) Prepare your cash!`;

    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime);
      osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.6);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.6);
    } catch (e) {
      // Audio fallback
    }

    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([150, 75, 150]);
    }

    setTimeout(() => {
      alertToast = null;
    }, 4500);
  }
</script>

<div class={`relative w-screen h-screen overflow-hidden font-sans select-none transition-colors duration-300 ${
  isDarkMode ? 'bg-[#1A120B] text-[#FAF7F2]' : 'bg-[#FAF7F2] text-[#4A2E1B]'
}`}>
  <!-- FULL SCREEN GOOGLE MAPS CANVAS -->
  <div bind:this={mapContainer} class="w-full h-full z-10"></div>

  <!-- FULL RECTANGULAR TOPBAR (LOGO PROMINENT ON LEFT, LOCATION IN CENTER, SETTINGS ON RIGHT) -->
  <header class={`absolute top-0 inset-x-0 z-30 w-full backdrop-blur-md shadow-sm transition-colors ${
    isDarkMode ? 'bg-[#1A120B]/95 text-[#FAF7F2]' : 'bg-white/95 text-[#4A2E1B]'
  }`}>
    <div class="relative w-full max-w-7xl mx-auto h-16 sm:h-20 px-4 sm:px-6 flex items-center justify-between gap-3">
      <!-- Leftmost: Logo (Prominent) + Tindahan (if vendor) -->
      <div class="flex items-center gap-2.5 sm:gap-3.5 shrink-0 z-10">
        <button
          type="button"
          on:click={() => (onNavigateToLanding ? onNavigateToLanding() : null)}
          class="cursor-pointer transition-transform active:scale-95 flex items-center shrink-0"
          title={language === 'tl' ? 'Bumalik sa Landing Page' : 'Return to Home'}
        >
          <Logo {isDarkMode} className="h-10 sm:h-12 w-auto object-contain" />
        </button>

        {#if session.role === 'vendor'}
          <button
            type="button"
            on:click={() => (onNavigateToVendor ? onNavigateToVendor() : null)}
            class={`px-2.5 py-1.5 rounded-xl transition flex items-center gap-1 text-xs font-black cursor-pointer shadow-xs active:scale-95 ${
              isDarkMode
                ? 'bg-[#352317] hover:bg-[#4A2E1B] text-[#F59E0B]'
                : 'bg-[#FEF3C7] hover:bg-[#FDE68A] text-[#D97706]'
            }`}
            title={language === 'tl' ? 'Pumunta sa Dashboard ng Tindahan' : 'Vendor Dashboard'}
          >
            <Icon name="cart" size={14} />
            <span class="hidden sm:inline">{language === 'tl' ? 'Tindahan' : 'Stall'}</span>
          </button>

          <!-- 1-Tap Ubos Na Quick Action -->
          {#if vendorStatus === 'live'}
            <button
              type="button"
              on:click={() => (showSoldOutConfirmModal = true)}
              class="px-2.5 py-1.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-600 dark:text-red-400 font-black text-xs flex items-center gap-1 transition cursor-pointer shadow-xs active:scale-95"
              title={language === 'tl' ? 'Pindutin kung Ubos na ang Paninda' : 'Click if Sold Out'}
            >
              <span>🔴</span>
              <span>{language === 'tl' ? 'Ubos Na!' : 'Sold Out!'}</span>
            </button>
          {:else}
            <button
              type="button"
              on:click={handleResumeLive}
              class="px-2.5 py-1.5 rounded-xl bg-green-500/15 hover:bg-green-500/25 text-green-600 dark:text-green-400 font-black text-xs flex items-center gap-1 transition cursor-pointer shadow-xs active:scale-95"
              title={language === 'tl' ? 'Ibalik sa Live' : 'Resume Live'}
            >
              <span>🟢</span>
              <span>{language === 'tl' ? 'Magtinda Ulit' : 'Resume Live'}</span>
            </button>
          {/if}

          <!-- Smart Zone Matchmaker Button -->
          {#if recommendedZones.length > 0}
            <button
              type="button"
              on:click={() => (showZoneSuggestionsDrawer = true)}
              class="px-2.5 py-1.5 rounded-xl bg-[#D97706]/15 hover:bg-[#D97706]/25 text-[#D97706] font-black text-xs flex items-center gap-1 transition cursor-pointer shadow-xs active:scale-95"
              title={language === 'tl' ? 'Tingnan ang 3 Inirerekomendang Pwesto' : 'View Top 3 Recommended Spots'}
            >
              <span>🎯</span>
              <span class="hidden md:inline">{language === 'tl' ? 'Magandang Pwesto' : 'Best Spots'}</span>
            </button>
          {/if}
        {/if}
      </div>

      <!-- Center: Location Selector (Centered on Topbar) -->
      <div class="hidden md:flex absolute inset-x-0 mx-auto max-w-xs sm:max-w-md items-center justify-center pointer-events-none px-4">
        <button
          type="button"
          on:click={() => (onNavigateToSearch ? onNavigateToSearch() : handleRecenterGPS())}
          class={`pointer-events-auto flex items-center justify-center gap-2 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl transition text-center cursor-pointer shadow-xs max-w-full ${
            isDarkMode
              ? 'bg-[#271A10] hover:bg-[#352317] text-[#FAF7F2]'
              : 'bg-[#FAF7F2] hover:bg-[#F3EDE2] text-[#4A2E1B]'
          }`}
          title="Pindutin para magpalit ng lugar"
        >
          <span class="text-xs sm:text-sm font-extrabold truncate text-center">
            {session.locationName}
          </span>
        </button>
      </div>

      <!-- Rightmost: Role Badge & Settings Button -->
      <div class="flex items-center gap-2 shrink-0 z-10">
        <!-- Role Badge -->
        <div
          class={`px-2.5 py-1.5 rounded-xl text-[11px] font-black shrink-0 ${
            session.role === 'vendor'
              ? (isDarkMode ? 'bg-[#452B14] text-[#F59E0B]' : 'bg-[#FEF3C7] text-[#D97706]')
              : (isDarkMode ? 'bg-[#271A10] text-[#D6C7B2]' : 'bg-[#FAF7F2] text-[#796658]')
          }`}
        >
          {#if session.role === 'vendor'}
              <img src="/assets/maninindamode.svg" class="h-full max-h-8 w-auto" alt="Vendor mode" />
            {:else}
              <img src="/assets/mamimilimode.svg" class="h-full max-h-8 w-auto" alt="Buyer mode" />
            {/if}
        </div>

        <!-- Language Toggle (Accessible at all times per spec §3.3) -->
        {#if onToggleLanguage}
          <button
            type="button"
            on:click={onToggleLanguage}
            class={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black transition cursor-pointer shadow-xs active:scale-95 ${
              isDarkMode
                ? 'bg-[#271A10] hover:bg-[#352317] text-[#FAF7F2]'
                : 'bg-[#FAF7F2] hover:bg-[#EAE4D9] text-[#4A2E1B]'
            }`}
            title={language === 'tl' ? 'Switch to English' : 'Lumipat sa Tagalog'}
            aria-label="Toggle Language"
          >
            <span>{language === 'tl' ? 'EN' : 'TL'}</span>
          </button>
        {/if}

        <!-- Dark Mode Toggle (Accessible from Map per spec) -->
        {#if onToggleDarkMode}
          <button
            type="button"
            on:click={onToggleDarkMode}
            class={`w-10 h-10 rounded-xl flex items-center justify-center text-sm transition cursor-pointer shadow-xs active:scale-95 ${
              isDarkMode
                ? 'bg-[#271A10] hover:bg-[#352317] text-[#F59E0B]'
                : 'bg-[#FAF7F2] hover:bg-[#EAE4D9] text-[#4A2E1B]'
            }`}
            title={isDarkMode ? 'Lumipat sa Light Mode' : 'Lumipat sa Dark Mode'}
            aria-label="Toggle Dark Mode"
          >
            <span>{isDarkMode ? '☀️' : '🌙'}</span>
          </button>
        {/if}

        <!-- Settings Button (Hosts Theme, Language, Audio, and Role Switch) -->
        {#if onNavigateToSettings}
          <button
            type="button"
            on:click={onNavigateToSettings}
            class={`w-10 h-10 rounded-xl flex items-center justify-center text-sm transition cursor-pointer shadow-xs active:scale-95 ${
              isDarkMode
                ? 'bg-[#271A10] hover:bg-[#352317] text-[#FAF7F2]'
                : 'bg-[#FAF7F2] hover:bg-[#EAE4D9] text-[#4A2E1B]'
            }`}
            title="Mga Setting"
            aria-label="Settings"
          >
            <Icon name="settings" size={16} />
          </button>
        {/if}
      </div>
    </div>
  </header>


  <!-- ACTIVE ROUTE NAVIGATION BANNER (WHEN VENDOR TARGETS A HOTSPOT) -->
  {#if targetedRoute}
    {@const routeDist = calculateDistanceM(session.lat, session.lng, targetedRoute.lat, targetedRoute.lng)}
    {@const routeEta = Math.max(1, Math.round(routeDist / 67))}
    <div class="absolute top-20 sm:top-24 left-1/2 -translate-x-1/2 z-30 pointer-events-auto animate-fade-in w-full max-w-sm px-4">
      <div class={`p-3 rounded-2xl shadow-2xl border flex items-center justify-between gap-3 ${
        isDarkMode ? 'bg-[#271A10]/95 border-[#F59E0B]/50 text-white' : 'bg-white/95 border-[#EAE4D9] text-[#4A2E1B]'
      }`}>
        <div class="flex items-center gap-2.5 min-w-0">
          <span class="text-xl shrink-0">🎯</span>
          <div class="min-w-0">
            <h4 class="text-xs font-black truncate">{targetedRoute.name || (language === 'tl' ? 'Puntiryang Hotspot' : 'Target Hotspot')}</h4>
            <p class="text-[11px] font-bold text-[#D97706]">
              ~{routeDist}m • ~{routeEta} {language === 'tl' ? 'min lakad' : 'min walk'}
            </p>
          </div>
        </div>
        <button
          type="button"
          on:click={handleClearRoute}
          class="px-3 py-1.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-500 text-xs font-black transition cursor-pointer shrink-0"
          title="Alisin ang Ruta"
        >
          ✕ {language === 'tl' ? 'Alisin' : 'Clear'}
        </button>
      </div>
    </div>
  {/if}

  <!-- OVERLAID MAP CONTROLS: MGA PANINDA OVERLAID DIRECTLY ON MAP (HOTSPOTS BUTTON REMOVED) -->
  {#if !isVendorListOpen}
    <div class="absolute top-20 sm:top-24 left-4 sm:left-6 z-20 flex items-center gap-2 select-none pointer-events-auto animate-fade-in">
      <button
        type="button"
        on:click={() => (isVendorListOpen = true)}
        class={`px-3.5 py-2 rounded-2xl transition flex items-center gap-2 text-xs font-black cursor-pointer shadow-lg backdrop-blur-md active:scale-95 border ${
          isDarkMode
            ? 'bg-[#271A10]/95 hover:bg-[#352317] text-[#FAF7F2] border-white/10'
            : 'bg-white/95 hover:bg-[#FAF7F2] text-[#4A2E1B] border-black/5'
        }`}
        title={language === 'tl' ? 'Ipakita ang Mga Paninda' : 'Show Vendors'}
      >
        <Icon name="clipboard" size={14} />
        <span>{language === 'tl' ? 'Mga Paninda' : 'Vendors'}</span>
        <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-[#D97706] text-white font-black">{filteredVendors.length}</span>
      </button>
    </div>
  {/if}

  <!-- FLOATING DEMAND HOTSPOT FILTER BAR (WITH TEXTLESS HOTSPOTS TOGGLE NEXT TO MAG ULAT) -->
  <div
    class={`absolute bottom-20 left-3 right-auto sm:bottom-auto sm:top-22 sm:left-1/2 sm:-translate-x-1/2 sm:inset-x-auto z-20 flex flex-col sm:flex-row items-stretch sm:items-center justify-start sm:justify-center gap-1 p-1.5 rounded-2xl backdrop-blur-md shadow-lg border overflow-visible sm:overflow-x-auto no-scrollbar sm:max-w-[95vw] w-max max-w-[calc(100vw-1.5rem)] pointer-events-auto transition-colors animate-fade-in ${
      isDarkMode ? 'bg-[#1A120B]/95 border-[#3D2717] text-[#FAF7F2]' : 'bg-white/95 border-[#EAE4D9] text-[#4A2E1B]'
    }`}
  >
      <button
        type="button"
        on:click={() => (activeHotspotCategory = 'all')}
        class={`px-3 py-2 sm:py-1 rounded-xl text-xs font-black transition cursor-pointer whitespace-nowrap text-center min-h-11 sm:min-h-0 ${
          activeHotspotCategory === 'all'
            ? 'bg-[#EF4444] text-white shadow-xs'
            : (isDarkMode ? 'hover:bg-[#271A10]' : 'hover:bg-[#FAF7F2]')
        }`}
      >
        {language === 'tl' ? 'Lahat ng Hotspot' : 'All Hotspots'}
      </button>

      <div class="grid grid-cols-4 w-full gap-1 sm:contents">
        <button
          type="button"
          on:click={() => (activeHotspotCategory = 'school')}
          class={`px-2.5 py-2 sm:py-1 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-1 whitespace-nowrap min-h-11 sm:min-h-0 ${
            activeHotspotCategory === 'school'
              ? 'bg-[#2563EB] text-white shadow-xs'
              : (isDarkMode ? 'hover:bg-[#271A10]' : 'hover:bg-[#FAF7F2]')
          }`}
          aria-label={language === 'tl' ? 'Paaralan' : 'Schools'}
        >
          <Icon name="school" size={14} />
          <span class="hidden sm:inline">{language === 'tl' ? 'Paaralan' : 'Schools'}</span>
        </button>

        <button
          type="button"
          on:click={() => (activeHotspotCategory = 'basketball')}
          class={`px-2.5 py-2 sm:py-1 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-1 whitespace-nowrap min-h-11 sm:min-h-0 ${
            activeHotspotCategory === 'basketball'
              ? 'bg-[#EA580C] text-white shadow-xs'
              : (isDarkMode ? 'hover:bg-[#271A10]' : 'hover:bg-[#FAF7F2]')
          }`}
          aria-label={language === 'tl' ? 'Basketball' : 'Basketball'}
        >
          <Icon name="trophy" size={14} />
          <span class="hidden sm:inline">{language === 'tl' ? 'Basketball' : 'Basketball'}</span>
        </button>

        <button
          type="button"
          on:click={() => (activeHotspotCategory = 'barangay')}
          class={`px-2.5 py-2 sm:py-1 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-1 whitespace-nowrap min-h-11 sm:min-h-0 ${
            activeHotspotCategory === 'barangay'
              ? 'bg-[#059669] text-white shadow-xs'
              : (isDarkMode ? 'hover:bg-[#271A10]' : 'hover:bg-[#FAF7F2]')
          }`}
          aria-label={language === 'tl' ? 'Barangay' : 'Barangay'}
        >
          <Icon name="tent" size={14} />
          <span class="hidden sm:inline">{language === 'tl' ? 'Barangay' : 'Barangay'}</span>
        </button>

        <button
          type="button"
          on:click={() => (activeHotspotCategory = 'commuter')}
          class={`px-2.5 py-2 sm:py-1 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-1 whitespace-nowrap min-h-11 sm:min-h-0 ${
            activeHotspotCategory === 'commuter'
              ? 'bg-[#7C3AED] text-white shadow-xs'
              : (isDarkMode ? 'hover:bg-[#271A10]' : 'hover:bg-[#FAF7F2]')
          }`}
          aria-label={language === 'tl' ? 'Sakayan' : 'Commuters'}
        >
          <Icon name="bus" size={14} />
          <span class="hidden sm:inline">{language === 'tl' ? 'Sakayan' : 'Commuters'}</span>
        </button>
      </div>

      <div class="w-full sm:w-[1px] h-px sm:h-4 bg-black/10 dark:bg-white/10 my-0.5 sm:my-0 sm:mx-0.5"></div>

      <div class="flex w-full sm:contents items-center justify-between gap-1.5">
        <button
          type="button"
          on:click={() => (showHotspotConfigModal = true)}
          class="px-2.5 py-2 sm:py-1 rounded-xl text-xs font-black bg-[#D97706]/15 hover:bg-[#D97706]/25 text-[#D97706] transition cursor-pointer flex items-center justify-center gap-1 whitespace-nowrap active:scale-95 min-h-11 sm:min-h-0 flex-1 sm:flex-none"
          title="Magdagdag ng Event o Skedyul"
        >
          <Icon name="plus" size={14} />
          <span>{language === 'tl' ? 'Mag-ulat' : 'Add'}</span>
        </button>

        <!-- Hotspots Toggle Switch -->
        <button
          type="button"
          role="switch"
          aria-checked={isHotspotsVisible}
          on:click={() => {
            isHotspotsVisible = !isHotspotsVisible;
            if (isHotspotsVisible && demandHotspots.length === 0) {
              reloadHotspots();
            }
          }}
          class={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none shadow-xs active:scale-95 ${
            isHotspotsVisible
              ? 'bg-[#EF4444]'
              : (isDarkMode ? 'bg-[#352317]' : 'bg-[#EAE4D9]')
          }`}
          title={isHotspotsVisible
            ? (language === 'tl' ? 'I-off ang Hotspots' : 'Turn off hotspots')
            : (language === 'tl' ? 'I-on ang Hotspots' : 'Turn on hotspots')}
          aria-label={isHotspotsVisible
            ? (language === 'tl' ? 'I-off ang Hotspots' : 'Turn off hotspots')
            : (language === 'tl' ? 'I-on ang Hotspots' : 'Turn on hotspots')}
        >
          <span
            class={`pointer-events-none inline-flex h-5 w-5 transform items-center justify-center rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
              isHotspotsVisible ? 'translate-x-5 text-[#EF4444]' : 'translate-x-0 text-[#796658]'
            }`}
          >
            <Icon name="flame" size={12} strokeWidth={2.5} />
          </span>
        </button>
      </div>
    </div>

  <!-- TOGGLEABLE MOBILE SIDEBAR / FLOATING DESKTOP PANEL -->
  {#if isVendorListOpen}
    <!-- Mobile Backdrop Overlay -->
    <div
      class="fixed inset-0 bg-black/50 backdrop-blur-xs z-30 sm:hidden animate-fade-in"
      on:click={() => (isVendorListOpen = false)}
      role="button"
      tabindex="0"
      on:keydown={(e) => e.key === 'Escape' && (isVendorListOpen = false)}
      aria-label="Close sidebar"
    ></div>

    <aside
      class={`fixed inset-y-0 left-0 w-80 max-w-[85vw] z-40 rounded-r-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col transition-all duration-300 pointer-events-auto sm:absolute sm:top-24 sm:left-6 sm:bottom-6 sm:w-96 sm:max-w-sm sm:z-20 animate-slide-right sm:animate-none ${
        isDarkMode ? 'bg-[#1A120B]/98 sm:bg-[#1A120B]/95 text-[#FAF7F2]' : 'bg-white/98 sm:bg-white/95 text-[#4A2E1B]'
      }`}
    >
      <!-- Sidebar Top Header -->
      <div class={`p-4 pb-3 flex items-center justify-between border-b ${
        isDarkMode ? 'border-white/10' : 'border-black/5'
      }`}>
        <div>
          <h3 class="text-sm sm:text-base font-black">
            {sidebarActiveTab === 'vendors'
              ? (language === 'tl' ? 'Mga Paninda sa Paligid' : 'Nearby Vendors')
              : (language === 'tl' ? 'Mga Demand Hotspot' : 'Demand Hotspots')}
          </h3>
          <p class={`text-[11px] font-medium mt-0.5 ${isDarkMode ? 'text-[#D6C7B2]' : 'text-[#796658]'}`}>
            {sidebarActiveTab === 'vendors'
              ? (language === 'tl' ? 'Piliin upang puntahan ang vendor' : 'Tap to focus vendor on map')
              : (language === 'tl' ? 'Tukuyin ang mataas na bentahan' : 'Identify high-demand areas')}
          </p>
        </div>

        <!-- Minimize/Close Button -->
        <button
          type="button"
          on:click={() => (isVendorListOpen = false)}
          class={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition cursor-pointer active:scale-95 ${
            isDarkMode ? 'bg-[#271A10] hover:bg-[#352317] text-[#FAF7F2]' : 'bg-[#FAF7F2] hover:bg-[#EAE4D9] text-[#4A2E1B]'
          }`}
          title="Itago ang Listahan"
          aria-label="Minimize list"
        >
          ✕
        </button>
      </div>

      <!-- Dual Tab Switcher: Vendors vs Demand Hotspots -->
      <div class={`p-1.5 mx-3 mt-2 rounded-2xl flex items-center gap-1 border shrink-0 ${
        isDarkMode ? 'bg-[#271A10] border-[#3D2717]' : 'bg-[#FAF7F2] border-[#EAE4D9]'
      }`}>
        <button
          type="button"
          on:click={() => (sidebarActiveTab = 'vendors')}
          class={`flex-1 py-1.5 px-2 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer ${
            sidebarActiveTab === 'vendors'
              ? (isDarkMode ? 'bg-[#F59E0B] text-[#1A120B]' : 'bg-[#4A2E1B] text-white shadow-xs')
              : (isDarkMode ? 'text-[#D6C7B2] hover:bg-[#352317]' : 'text-[#796658] hover:bg-white')
          }`}
        >
          <Icon name="cart" size={14} />
          <span>{language === 'tl' ? 'Paninda' : 'Vendors'}</span>
          <span class="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 font-black">{filteredVendors.length}</span>
        </button>

        <button
          type="button"
          on:click={() => {
            sidebarActiveTab = 'hotspots';
            isHotspotsVisible = true;
          }}
          class={`flex-1 py-1.5 px-2 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer ${
            sidebarActiveTab === 'hotspots'
              ? 'bg-[#EF4444] text-white shadow-xs'
              : (isDarkMode ? 'text-[#D6C7B2] hover:bg-[#352317]' : 'text-[#796658] hover:bg-white')
          }`}
        >
          <Icon name="flame" size={14} />
          <span>{language === 'tl' ? 'Hotspots' : 'Hotspots'}</span>
          <span class="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 font-black">{demandHotspots.length}</span>
        </button>
      </div>

      <!-- TAB 1 CONTENT: VENDORS -->
      {#if sidebarActiveTab === 'vendors'}
        <!-- Clean Product Category Filter Chips Inside Sidebar -->
        <div class={`px-3 py-2.5 overflow-x-auto no-scrollbar flex items-center gap-1.5 shrink-0 border-b ${
          isDarkMode ? 'border-white/10 bg-[#271A10]/50' : 'border-black/5 bg-[#FAF7F2]/50'
        }`}>
          <button
            type="button"
            on:click={() => (activeFilter = null)}
            class={`px-3 py-1 rounded-xl text-xs font-black whitespace-nowrap transition-all cursor-pointer ${
              activeFilter === null
                ? (isDarkMode ? 'bg-[#F59E0B] text-[#1A120B]' : 'bg-[#4A2E1B] text-[#FAF7F2]')
                : (isDarkMode ? 'bg-[#271A10] text-[#FAF7F2] hover:bg-[#352317]' : 'bg-white text-[#4A2E1B] hover:bg-[#FAF7F2]')
            }`}
          >
            {language === 'tl' ? 'Lahat' : 'All'}
          </button>

          {#each PRODUCT_LEGEND as item}
            <button
              type="button"
              on:click={() => (activeFilter = activeFilter === item.type ? null : item.type)}
              class={`px-3 py-1 rounded-xl text-xs font-black whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                activeFilter === item.type
                  ? (isDarkMode ? 'bg-[#F59E0B] text-[#1A120B] scale-102' : 'bg-[#4A2E1B] text-[#FAF7F2] scale-102')
                  : (isDarkMode ? 'bg-[#271A10] text-[#FAF7F2] hover:bg-[#352317]' : 'bg-white text-[#4A2E1B] hover:bg-[#FAF7F2]')
              }`}
            >
              <Icon name={item.icon} size={14} />
              <span>{language === 'tl' ? item.labelTl : item.labelEn}</span>
            </button>
          {/each}
        </div>

        <!-- Scrollable Vendors List with Uploaded Photos -->
        <div class="flex-1 overflow-y-auto seamless-scroll p-3 space-y-2.5">
          {#if filteredVendors.length === 0}
            <div class="p-8 text-center text-xs opacity-60">
              {language === 'tl' ? 'Walang nahanap na paninda sa kategoryang ito.' : 'No vendors found in this category.'}
            </div>
          {:else}
            {#each filteredVendors as vendor}
              <div
                role="button"
                tabindex="0"
                on:click={() => {
                  selectedVendor = vendor;
                  selectedHotspot = null;
                  map?.flyTo([vendor.lat, vendor.lng], 17, { duration: 0.5 });
                  if (typeof window !== 'undefined' && window.innerWidth < 640) {
                    isVendorListOpen = false;
                  }
                }}
                on:keydown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    selectedVendor = vendor;
                    selectedHotspot = null;
                    map?.flyTo([vendor.lat, vendor.lng], 17, { duration: 0.5 });
                  }
                }}
                class={`p-3 rounded-2xl cursor-pointer transition-all flex items-start gap-3 shadow-xs active:scale-98 ${
                  selectedVendor?.id === vendor.id
                    ? (isDarkMode ? 'bg-[#452B14] ring-2 ring-[#F59E0B]' : 'bg-[#FEF3C7] ring-2 ring-[#D97706]')
                    : (isDarkMode ? 'bg-[#271A10] hover:bg-[#352317]' : 'bg-[#FAF7F2] hover:bg-[#F3EDE2]')
                }`}
              >
                <!-- Uploaded Photo with Status Badge -->
                <div class="relative shrink-0">
                  {#if vendor.verifiedPhoto}
                    <img
                      src={vendor.verifiedPhoto}
                      alt={vendor.name}
                      class="w-16 h-16 sm:w-18 sm:h-18 rounded-xl object-cover shadow-xs"
                    />
                  {:else}
                    <div class="w-16 h-16 rounded-xl bg-[#EAE4D9] dark:bg-[#352317] flex items-center justify-center">
                      <Icon name={vendor.icon} size={28} />
                    </div>
                  {/if}

                  <!-- Live Pulse Dot -->
                  {#if vendor.status === 'live'}
                    <span class="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-green-500 ring-2 ring-white dark:ring-black"></span>
                  {/if}
                </div>

                <!-- Vendor Details -->
                <div class="flex-1 min-w-0">
                  <div class="flex items-center justify-between gap-1">
                    <h4 class="font-black text-sm truncate">{vendor.name}</h4>
                    <span class="text-xs font-black text-[#D97706] shrink-0">{vendor.price}</span>
                  </div>

                  <p class={`text-xs font-semibold truncate ${isDarkMode ? 'text-[#D6C7B2]' : 'text-[#796658]'}`}>
                    {language === 'tl' ? vendor.productNameTl : vendor.productName}
                  </p>

                  <div class="flex items-center justify-between mt-2 pt-1.5 border-t border-black/5 dark:border-white/5 text-[11px]">
                    <span class={`font-bold ${isDarkMode ? 'text-[#D6C7B2]' : 'text-[#796658]'}`}>
                      📍 {formatDistance(vendor.distanceM)} • ~{vendor.etaMins}m
                    </span>

                    <span class={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                      vendor.status === 'live'
                        ? 'bg-green-500/15 text-green-500'
                        : vendor.status === 'stopped'
                          ? 'bg-amber-500/15 text-amber-500'
                          : 'bg-red-500/15 text-red-500'
                     }`}>
                      {vendor.status === 'live' ? 'Naglilibot' : vendor.status === 'stopped' ? 'Nakatigil' : 'Ubos Na'}
                    </span>
                  </div>
                </div>
              </div>
            {/each}
          {/if}
        </div>

      <!-- TAB 2 CONTENT: DEMAND HOTSPOTS -->
      {:else}
        <!-- Category Filter & Add Event Button -->
        <div class={`px-3 py-2 overflow-x-auto no-scrollbar flex items-center justify-between gap-1.5 shrink-0 border-b ${
          isDarkMode ? 'border-white/10 bg-[#271A10]/50' : 'border-black/5 bg-[#FAF7F2]/50'
        }`}>
          <div class="flex items-center gap-1 overflow-x-auto no-scrollbar">
            <button
              type="button"
              on:click={() => (activeHotspotCategory = 'all')}
              class={`px-2.5 py-1 rounded-xl text-[11px] font-black whitespace-nowrap transition cursor-pointer ${
                activeHotspotCategory === 'all'
                  ? 'bg-[#EF4444] text-white shadow-xs'
                  : (isDarkMode ? 'bg-[#271A10] text-[#FAF7F2]' : 'bg-white text-[#4A2E1B]')
              }`}
            >
              {language === 'tl' ? 'Lahat' : 'All'}
            </button>
            <button
              type="button"
              on:click={() => (activeHotspotCategory = 'school')}
              class={`px-2 py-1 rounded-xl text-[11px] font-black whitespace-nowrap transition cursor-pointer ${
                activeHotspotCategory === 'school'
                  ? 'bg-[#2563EB] text-white shadow-xs'
                  : (isDarkMode ? 'bg-[#271A10] text-[#FAF7F2]' : 'bg-white text-[#4A2E1B]')
              }`}
            >
              <Icon name="school" size={14} />
            </button>
            <button
              type="button"
              on:click={() => (activeHotspotCategory = 'basketball')}
              class={`px-2 py-1 rounded-xl text-[11px] font-black whitespace-nowrap transition cursor-pointer ${
                activeHotspotCategory === 'basketball'
                  ? 'bg-[#EA580C] text-white shadow-xs'
                  : (isDarkMode ? 'bg-[#271A10] text-[#FAF7F2]' : 'bg-white text-[#4A2E1B]')
              }`}
            >
              <Icon name="trophy" size={14} />
            </button>
            <button
              type="button"
              on:click={() => (activeHotspotCategory = 'barangay')}
              class={`px-2 py-1 rounded-xl text-[11px] font-black whitespace-nowrap transition cursor-pointer ${
                activeHotspotCategory === 'barangay'
                  ? 'bg-[#059669] text-white shadow-xs'
                  : (isDarkMode ? 'bg-[#271A10] text-[#FAF7F2]' : 'bg-white text-[#4A2E1B]')
              }`}
            >
              <Icon name="tent" size={14} />
            </button>
            <button
              type="button"
              on:click={() => (activeHotspotCategory = 'commuter')}
              class={`px-2 py-1 rounded-xl text-[11px] font-black whitespace-nowrap transition cursor-pointer ${
                activeHotspotCategory === 'commuter'
                  ? 'bg-[#7C3AED] text-white shadow-xs'
                  : (isDarkMode ? 'bg-[#271A10] text-[#FAF7F2]' : 'bg-white text-[#4A2E1B]')
              }`}
            >
              <Icon name="bus" size={14} />
            </button>
          </div>

          <button
            type="button"
            on:click={() => (showHotspotConfigModal = true)}
            class="px-2 py-1 rounded-xl text-[11px] font-black bg-[#D97706]/15 hover:bg-[#D97706]/25 text-[#D97706] shrink-0 cursor-pointer active:scale-95"
            title="Magdagdag ng Event"
          >
            <span class="inline-flex items-center"><Icon name="plus" size={12} /><span>{language === 'tl' ? 'Mag-ulat' : 'Add'}</span></span>
          </button>

          <!-- Hotspots Toggle Switch in Sidebar next to Mag Ulat -->
          <button
            type="button"
            role="switch"
            aria-checked={isHotspotsVisible}
            on:click={() => {
              isHotspotsVisible = !isHotspotsVisible;
              if (isHotspotsVisible && demandHotspots.length === 0) {
                reloadHotspots();
              }
            }}
            class={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none shadow-xs active:scale-95 ${
              isHotspotsVisible
                ? 'bg-[#EF4444]'
                : (isDarkMode ? 'bg-[#352317]' : 'bg-[#EAE4D9]')
            }`}
            title={isHotspotsVisible
              ? (language === 'tl' ? 'I-off ang Hotspots' : 'Turn off hotspots')
              : (language === 'tl' ? 'I-on ang Hotspots' : 'Turn on hotspots')}
            aria-label={isHotspotsVisible
              ? (language === 'tl' ? 'I-off ang Hotspots' : 'Turn off hotspots')
              : (language === 'tl' ? 'I-on ang Hotspots' : 'Turn on hotspots')}
          >
            <span
              class={`pointer-events-none inline-flex h-5 w-5 transform items-center justify-center rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                isHotspotsVisible ? 'translate-x-5 text-[#EF4444]' : 'translate-x-0 text-[#796658]'
              }`}
            >
              <Icon name="flame" size={11} strokeWidth={2.5} />
            </span>
          </button>
        </div>

        <!-- Hotspots List -->
        <div class="flex-1 overflow-y-auto seamless-scroll p-3 space-y-2.5">
          {#if listHotspots.length === 0}
            <div class="p-8 text-center text-xs opacity-60">
              {language === 'tl' ? 'Walang nahanap na hotspot sa kategoryang ito.' : 'No hotspots in this category.'}
            </div>
          {:else}
            {#each listHotspots as hotspot}
              {@const ratingMeta = getOpportunityRating(hotspot.opportunityScore)}
              <div
                role="button"
                tabindex="0"
                on:click={() => {
                  selectedHotspot = hotspot;
                  selectedVendor = null;
                  map?.flyTo([hotspot.lat, hotspot.lng], 16, { duration: 0.5 });
                  if (typeof window !== 'undefined' && window.innerWidth < 640) {
                    isVendorListOpen = false;
                  }
                }}
                on:keydown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    selectedHotspot = hotspot;
                    selectedVendor = null;
                    map?.flyTo([hotspot.lat, hotspot.lng], 16, { duration: 0.5 });
                  }
                }}
                class={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center gap-3.5 shadow-2xs active:scale-[0.99] ${
                  selectedHotspot?.id === hotspot.id
                    ? (isDarkMode ? 'bg-[#352317] border-[#F59E0B] ring-1 ring-[#F59E0B]' : 'bg-white border-[#16A34A] ring-1 ring-[#16A34A]')
                    : (isDarkMode ? 'bg-[#271A10] border-[#3D2717] hover:bg-[#352317]' : 'bg-white border-[#EAE4D9] hover:border-[#D6C7B2]')
                }`}
              >
                {#if session.role === 'vendor'}
                  <!-- Left: Prominent Opportunity Rating & Score (Tindero / Vendor Mode Only) -->
                  <div class="w-22 shrink-0 flex flex-col items-start justify-center pr-3 border-r border-[#EAE4D9] dark:border-[#3D2717]">
                    <span class={`text-sm sm:text-base font-black uppercase tracking-tight leading-none ${ratingMeta.textClass}`}>
                      {ratingMeta.rating}
                    </span>
                    <span class={`text-xs font-extrabold mt-1 leading-none ${ratingMeta.textClass}`}>
                      {hotspot.opportunityScore}/100
                    </span>
                  </div>
                {:else}
                  {@const catMeta = HOTSPOT_CATEGORY_META[hotspot.category] || HOTSPOT_CATEGORY_META.barangay}
                  <div class={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                    isDarkMode ? 'bg-[#352317] border-[#3D2717] text-[#F59E0B]' : 'bg-[#FAF7F2] border-[#EAE4D9] text-[#4A2E1B]'
                  }`}>
                    <Icon name={catMeta.icon} size={18} />
                  </div>
                {/if}

                <!-- Right: Hotspot Name & Busy Hours -->
                <div class="flex-1 min-w-0">
                  <h4 class={`font-bold text-xs sm:text-sm leading-snug truncate ${
                    isDarkMode ? 'text-[#FAF7F2]' : 'text-[#1F2937]'
                  }`}>
                    {hotspot.name}
                  </h4>
                  <p class={`text-[11px] sm:text-xs font-medium mt-0.5 truncate ${
                    isDarkMode ? 'text-[#D6C7B2]' : 'text-[#6B7280]'
                  }`}>
                    {hotspot.expectedBusyTime}
                  </p>
                </div>
              </div>
            {/each}
          {/if}
        </div>
      {/if}
    </aside>
  {:else}
    <!-- Floating Toggle Button when Sidebar is Minimized -->
    <button
      type="button"
      on:click={() => (isVendorListOpen = true)}
      class={`absolute top-20 sm:top-24 left-3 sm:left-6 z-20 px-4 py-2.5 rounded-2xl backdrop-blur-md shadow-xl flex items-center gap-2.5 font-black text-xs transition cursor-pointer active:scale-95 ${
        isDarkMode ? 'bg-[#1A120B]/95 text-[#FAF7F2] hover:bg-[#271A10]' : 'bg-white/95 text-[#4A2E1B] hover:bg-[#FAF7F2]'
      }`}
      title="Buksan ang Listahan ng Paninda"
    >
      <span>📋</span>
      <span>{language === 'tl' ? 'Ipakita ang Paninda' : 'Show Vendors'}</span>
      <span class="px-2 py-0.5 rounded-full bg-[#D97706] text-white text-[10px]">
        {filteredVendors.length}
      </span>
    </button>
  {/if}


  <!-- FLOATING ALERT TOAST (CHIME FEEDBACK) -->
  {#if alertToast}
    <div class={`absolute top-28 inset-x-4 sm:inset-x-auto sm:right-6 z-40 max-w-md p-4 rounded-2xl shadow-2xl flex items-center gap-3 border animate-bounce ${
      isDarkMode ? 'bg-[#271A10] text-white border-[#F59E0B]/40' : 'bg-[#4A2E1B] text-white border-white/20'
    }`}>
      <Icon name="bowl" size={24} />
      <p class="text-xs sm:text-sm font-extrabold">{alertToast}</p>
    </div>
  {/if}

  <!-- BUYER BOTTOM CARD (WHEN A VENDOR PIN IS CLICKED) -->
  {#if selectedVendor && !isSidebarOpen}
    <div class={`absolute bottom-4 inset-x-3 sm:inset-x-auto sm:left-6 sm:w-96 z-30 backdrop-blur-md rounded-[32px] border shadow-2xl p-5 space-y-3.5 animate-slide-up ${
      isDarkMode
        ? 'bg-[#271A10]/98 border-[#3D2717] text-[#FAF7F2]'
        : 'bg-white/98 border-[#EAE4D9] text-[#4A2E1B]'
    }`}>
      <!-- Card Header -->
      <div class="flex items-start justify-between gap-2">
        <div class="flex items-center gap-3">
          <div class={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl border ${
            isDarkMode ? 'bg-[#452B14] text-[#F59E0B] border-[#F59E0B]/30' : 'bg-[#FEF3C7] text-[#D97706] border-[#D97706]/30'
          }`}>
            <Icon name={selectedVendor.icon} size={24} />
          </div>
          <div>
            <div class="flex items-center gap-1.5 flex-wrap">
              <h4 class="text-base font-black">{selectedVendor.name}</h4>
              {#if selectedVendor.verifiedPhoto}
                <span class="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-400">
                  ✓ Verified
                </span>
              {/if}
              {#if selectedVendor.acceptsGcash}
                <span class="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#007DFE]/15 text-[#007DFE]">
                  💳 GCash
                </span>
              {/if}
            </div>
            <p class={`text-xs font-bold ${isDarkMode ? 'text-[#D6C7B2]' : 'text-[#796658]'}`}>
              {language === 'tl' ? selectedVendor.productNameTl : selectedVendor.productName}
              {#if selectedVendor.quantity}
                <span class="opacity-75"> • {selectedVendor.quantity} {selectedVendor.quantityUnit || 'pcs'}</span>
              {/if}
            </p>
          </div>
        </div>

        <button
          type="button"
          on:click={() => (selectedVendor = null)}
          class={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
            isDarkMode ? 'bg-[#352317] text-[#D6C7B2] hover:bg-[#4A2E1B]' : 'bg-[#FAF7F2] text-[#796658] hover:bg-[#EAE4D9]'
          }`}
        >
          ✕
        </button>
      </div>

      <!-- Distance & Price Stats (Facebook style simplicity) -->
      <div class="grid grid-cols-2 gap-2 text-center">
        <div class={`p-2.5 rounded-2xl border ${
          isDarkMode ? 'bg-[#352317] border-[#3D2717]' : 'bg-[#FAF7F2] border-[#EAE4D9]'
        }`}>
          <span class={`text-[10px] font-bold uppercase ${isDarkMode ? 'text-[#D6C7B2]' : 'text-[#796658]'}`}>
            Layo & Oras
          </span>
          <p class="text-xs font-black mt-0.5">
            {formatDistance(selectedVendor.distanceM)} • ~{selectedVendor.etaMins} mins
          </p>
        </div>
        <div class={`p-2.5 rounded-2xl border ${
          isDarkMode ? 'bg-[#352317] border-[#3D2717]' : 'bg-[#FAF7F2] border-[#EAE4D9]'
        }`}>
          <span class={`text-[10px] font-bold uppercase ${isDarkMode ? 'text-[#D6C7B2]' : 'text-[#796658]'}`}>
            Presyo
          </span>
          <p class="text-xs font-black text-[#D97706] mt-0.5">
            {selectedVendor.price}
          </p>
        </div>
      </div>

      <!-- Action Button -->
      <button
        type="button"
        on:click={() => triggerBuyerAlert(selectedVendor!)}
        class={`w-full py-3.5 rounded-2xl font-black text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-98 min-h-[48px] ${
          isDarkMode
            ? 'bg-[#F59E0B] text-[#1A120B] hover:bg-[#D97706]'
            : 'bg-[#4A2E1B] text-[#FAF7F2] hover:bg-[#361F11]'
        }`}
      >
        <span>🔔</span>
        <span>{language === 'tl' ? 'Ihanda na ang barya at lagayan!' : 'Notify Me (Prepare Coins & Bowl)'}</span>
      </button>
    </div>
  {/if}

  <!-- DEMAND HOTSPOT BOTTOM CARD (WHEN A HOTSPOT PIN OR CATCHMENT ZONE IS CLICKED) -->
  {#if selectedHotspot && !isSidebarOpen}
    <div class="absolute bottom-4 inset-x-3 sm:inset-x-auto sm:left-6 sm:w-96 z-30 pointer-events-auto">
      <HotspotDetailCard
        hotspot={selectedHotspot}
        {language}
        {isDarkMode}
        {session}
        onClose={() => (selectedHotspot = null)}
        onTargetLocation={handleTargetLocation}
      />
    </div>
  {/if}

  <!-- LOW-TO-ZERO TRAFFIC RED BOTTOM WARNING BAR (VENDOR POV) -->
  {#if session.role === 'vendor' && viability.score < 55 && !selectedVendor && !selectedHotspot && !heatmapProbeResult && (recommendedViabilitySpot || recommendedZones[0])}
    {@const bestSpot = recommendedViabilitySpot || recommendedZones[0]!}
    <div class="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 w-full max-w-2xl px-4 pointer-events-auto animate-fade-in">
      <div class="w-full bg-red-600/95 text-white border border-red-400/50 shadow-2xl rounded-2xl px-4 py-3 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-2.5 text-center sm:text-left">
        <div class="flex items-center gap-2 min-w-0">
          <span class="text-base shrink-0">⚠️</span>
          <p class="text-xs sm:text-sm font-black leading-snug">
            {language === 'tl'
              ? `Mababa ang trapiko, huwag ka rito pls — doon ka sa ${bestSpot.name} (~${formatDistance(bestSpot.distanceM)})`
              : `Low foot traffic, please don't stay here — go to ${bestSpot.name} (~${formatDistance(bestSpot.distanceM)})`}
          </p>
        </div>
        <button
          type="button"
          on:click={() => handleTargetLocation(bestSpot.lat, bestSpot.lng, bestSpot.name)}
          class="px-3 py-1.5 rounded-xl bg-white text-red-700 hover:bg-red-50 text-xs font-black shrink-0 transition cursor-pointer shadow-sm active:scale-95"
        >
          {language === 'tl' ? 'Puntahan →' : 'Go There →'}
        </button>
      </div>
    </div>
  {/if}

  <!-- VENDOR SIDEBAR / BOTTOM DRAWER (FOR MAGTITINDA ONLY) -->
  {#if session.role === 'vendor' && isSidebarOpen}
    <div class={`absolute inset-y-0 left-0 w-full sm:w-96 backdrop-blur-md border-r shadow-2xl z-40 p-5 sm:p-6 flex flex-col justify-between overflow-y-auto seamless-scroll animate-fade-in transition-colors ${
      isDarkMode
        ? 'bg-[#271A10]/98 border-[#3D2717] text-[#FAF7F2]'
        : 'bg-white/98 border-[#EAE4D9] text-[#4A2E1B]'
    }`}>
      <div class="space-y-5">
        <!-- Sidebar Header with Logo -->
        <div class={`flex items-center justify-between pb-3 border-b ${isDarkMode ? 'border-[#3D2717]' : 'border-[#EAE4D9]'}`}>
          <div class="flex items-center gap-2.5">
            <Logo {isDarkMode} className="h-8 w-auto object-contain" />
            <div>
              <div class="flex items-center gap-1.5 flex-wrap">
                <h3 class="text-base font-black">
                  {language === 'tl' ? 'Menu ng Tindero' : 'Vendor Dashboard'}
                </h3>
                {#if session.acceptsGcash !== false}
                  <span class="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#007DFE]/15 text-[#007DFE]">
                    💳 GCash
                  </span>
                {/if}
              </div>
              <p class={`text-xs font-medium ${isDarkMode ? 'text-[#D6C7B2]' : 'text-[#796658]'}`}>
                {session.product || 'Taho'}{session.quantity ? ` (${session.quantity} ${(session.quantityUnit || 'baso').split(' ')[0]})` : ''} • {session.locationName.split(',')[0]}
              </p>
            </div>
          </div>

          <button
            type="button"
            on:click={() => (isSidebarOpen = false)}
            class={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              isDarkMode ? 'bg-[#352317] hover:bg-[#4A2E1B] text-white' : 'bg-[#FAF7F2] hover:bg-[#EAE4D9] text-[#4A2E1B]'
            }`}
          >
            ✕
          </button>
        </div>

        <!-- Live Audience Waiting Metric -->
        <div class={`p-4 rounded-2xl border text-center space-y-1 ${
          isDarkMode ? 'bg-[#452B14] border-[#F59E0B]/30' : 'bg-[#FEF3C7] border-[#D97706]/30'
        }`}>
          <span class={`text-xs font-bold uppercase tracking-wide ${isDarkMode ? 'text-[#F59E0B]' : 'text-[#D97706]'}`}>
            👥 {language === 'tl' ? 'Mga Kapitbahay sa Paligid' : 'Neighbors Nearby'}
          </span>
          <p class="text-3xl font-black">
            {waitingAudienceCount}
          </p>
          <p class={`text-[11px] font-medium ${isDarkMode ? 'text-[#D6C7B2]' : 'text-[#796658]'}`}>
            {language === 'tl' ? 'nag-aabang sa iyong ruta ngayon!' : 'awaiting your cart on this route!'}
          </p>
        </div>

        <!-- Broadcast Status Switcher -->
        <div class="space-y-2">
          <span class={`text-xs font-bold uppercase tracking-wider block ${isDarkMode ? 'text-[#D6C7B2]' : 'text-[#796658]'}`}>
            {language === 'tl' ? 'Katayuan ng Ruta:' : 'Broadcast Status:'}
          </span>
          <div class="grid grid-cols-3 gap-2">
            <button
              type="button"
              on:click={() => (vendorStatus = 'live')}
              class={`p-2.5 rounded-2xl text-xs font-extrabold border transition cursor-pointer ${
                vendorStatus === 'live'
                  ? 'bg-green-600 text-white border-green-600 shadow-xs'
                  : (isDarkMode ? 'bg-[#352317] text-[#FAF7F2] border-[#3D2717]' : 'bg-[#FAF7F2] text-[#4A2E1B] border-[#EAE4D9]')
              }`}
            >
              🟢 {language === 'tl' ? 'Naglilibot' : 'Live'}
            </button>

            <button
              type="button"
              on:click={() => (vendorStatus = 'stopped')}
              class={`p-2.5 rounded-2xl text-xs font-extrabold border transition cursor-pointer ${
                vendorStatus === 'stopped'
                  ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                  : (isDarkMode ? 'bg-[#352317] text-[#FAF7F2] border-[#3D2717]' : 'bg-[#FAF7F2] text-[#4A2E1B] border-[#EAE4D9]')
              }`}
            >
              🟡 {language === 'tl' ? 'Nakatigil' : 'Parked'}
            </button>

            <button
              type="button"
              on:click={() => (vendorStatus = 'sold_out')}
              class={`p-2.5 rounded-2xl text-xs font-extrabold border transition cursor-pointer ${
                vendorStatus === 'sold_out'
                  ? 'bg-red-600 text-white border-red-600 shadow-xs'
                  : (isDarkMode ? 'bg-[#352317] text-[#FAF7F2] border-[#3D2717]' : 'bg-[#FAF7F2] text-[#4A2E1B] border-[#EAE4D9]')
              }`}
            >
              🔴 {language === 'tl' ? 'Ubos Na' : 'Sold Out'}
            </button>
          </div>
        </div>

        <!-- Verified Stall Photo Badge -->
        {#if session.verifiedPhoto}
          <div class={`p-3 rounded-2xl border flex items-center gap-3 ${
            isDarkMode ? 'bg-[#352317] border-[#3D2717]' : 'bg-[#FAF7F2] border-[#EAE4D9]'
          }`}>
            <img src={session.verifiedPhoto} alt="Kaldero" class="w-12 h-12 rounded-xl object-cover" />
            <div class="text-xs">
              <span class="font-bold text-green-500">✓ Verified Kaldero / Stall</span>
              <p class={`text-[11px] ${isDarkMode ? 'text-[#D6C7B2]' : 'text-[#796658]'}`}>
                Ligtas at mapagkakatiwalaan ng bibili
              </p>
            </div>
          </div>
        {/if}

        <!-- Translated, Relevant Viability Calculations & Scores for Vendor -->
        <div class={`p-4 rounded-2xl space-y-3 ${
          isDarkMode ? 'bg-[#1A120B]' : 'bg-[#FAF7F2]'
        }`}>
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-[#D97706] uppercase tracking-wider">
              {language === 'tl' ? 'Saan Pepwesto? (Ganda ng Pwesto)' : 'Stall Viability Score'}
            </span>
            <span class="text-xs font-black px-2.5 py-0.5 rounded-full bg-green-500/10 text-green-500">
              {viability.score}/100 • {viability.ratingTl}
            </span>
          </div>

          <div class="space-y-2 text-xs">
            <div class="flex items-start justify-between gap-2">
              <span class="text-[#796658] dark:text-[#D6C7B2]">{language === 'tl' ? 'Dagsa ng Tao:' : 'Foot Traffic:'}</span>
              <span class="font-bold text-right truncate">{language === 'tl' ? 'Mataas (~' + formatDistance(viability.nearestAnchorDistM) + ' sa sakayan)' : 'High (~' + formatDistance(viability.nearestAnchorDistM) + ' to hub)'}</span>
            </div>
            <div class="flex items-start justify-between gap-2">
              <span class="text-[#796658] dark:text-[#D6C7B2]">{language === 'tl' ? 'Pinakamalapit na Sakayan:' : 'Nearest Transit Stop:'}</span>
              <span class="font-bold text-right truncate">{viability.nearestAnchorName.split('/')[0]}</span>
            </div>
            <div class="flex items-start justify-between gap-2">
              <span class="text-[#796658] dark:text-[#D6C7B2]">{language === 'tl' ? 'Pinakamagandang Oras:' : 'Peak Commuter Window:'}</span>
              <span class="font-bold text-right text-green-500">{viability.peakHoursTl.split('(')[0]}</span>
            </div>
            <div class="flex items-start justify-between gap-2">
              <span class="text-[#796658] dark:text-[#D6C7B2]">{language === 'tl' ? 'Kalabang Tindahan:' : 'Nearby Competition:'}</span>
              <span class="font-bold text-right">{language === 'tl' ? viability.competitorCountWithin150m + ' lang sa 150m (Kakaunti)' : viability.competitorCountWithin150m + ' stall within 150m'}</span>
            </div>
          </div>
        </div>

        <!-- Quick Switch Options -->
        <div class={`space-y-2 pt-2 border-t ${isDarkMode ? 'border-[#3D2717]' : 'border-[#EAE4D9]'}`}>
          {#if onNavigateToVendor}
            <button
              type="button"
              on:click={onNavigateToVendor}
              class={`w-full py-3 px-4 rounded-2xl text-xs font-bold text-left flex items-center justify-between transition cursor-pointer ${
                isDarkMode ? 'bg-[#352317] hover:bg-[#4A2E1B] text-[#F59E0B]' : 'bg-[#FEF3C7] hover:bg-[#FDE68A] text-[#4A2E1B]'
              }`}
            >
              <span>🛒 {language === 'tl' ? 'Buksan ang Buong Dashboard ng Tindero' : 'Open Full Vendor Dashboard'}</span>
              <span>→</span>
            </button>
          {/if}

          {#if onNavigateToSettings}
            <button
              type="button"
              on:click={onNavigateToSettings}
              class={`w-full py-3 px-4 rounded-2xl text-xs font-bold text-left flex items-center justify-between transition cursor-pointer ${
                isDarkMode ? 'bg-[#352317] hover:bg-[#4A2E1B] text-[#FAF7F2]' : 'bg-[#FAF7F2] hover:bg-[#EAE4D9] text-[#4A2E1B]'
              }`}
            >
              <span>⚙️ {language === 'tl' ? 'Pumunta sa Mga Setting' : 'Go to Settings'}</span>
              <span>→</span>
            </button>
          {/if}

          <button
            type="button"
            on:click={onSwitchRole}
            class={`w-full py-3 px-4 rounded-2xl text-xs font-bold text-left flex items-center justify-between transition cursor-pointer ${
              isDarkMode ? 'bg-[#352317] hover:bg-[#4A2E1B] text-[#FAF7F2]' : 'bg-[#FAF7F2] hover:bg-[#EAE4D9] text-[#4A2E1B]'
            }`}
          >
            <span>🥣 {language === 'tl' ? 'Lumipat sa Mamimili (Buyer Mode)' : 'Switch to Buyer Mode'}</span>
            <span>→</span>
          </button>

          <button
            type="button"
            on:click={onResetSession}
            class={`w-full py-3 px-4 rounded-2xl text-xs font-bold text-red-500 text-left flex items-center justify-between transition cursor-pointer ${
              isDarkMode ? 'bg-[#352317] hover:bg-[#4A2E1B]' : 'bg-[#FAF7F2] hover:bg-[#EAE4D9]'
            }`}
          >
            <span>🔄 {language === 'tl' ? 'Bumalik sa Simula' : 'Reset & Start Over'}</span>
            <span>→</span>
          </button>
        </div>
      </div>

      <!-- Close Sidebar Button -->
      <div class={`pt-4 border-t ${isDarkMode ? 'border-[#3D2717]' : 'border-[#EAE4D9]'}`}>
        <button
          type="button"
          on:click={() => (isSidebarOpen = false)}
          class={`w-full py-3.5 rounded-2xl font-bold text-xs shadow-md cursor-pointer ${
            isDarkMode ? 'bg-[#F59E0B] text-[#1A120B] hover:bg-[#D97706]' : 'bg-[#4A2E1B] text-white hover:bg-[#361F11]'
          }`}
        >
          {language === 'tl' ? 'Tingnan ang Mapa' : 'Return to Map'}
        </button>
      </div>
    </div>
  {/if}

  <!-- INTEGRATED MAP NAVIGATION CONTROLS (BOTTOM RIGHT ROUNDED RECTANGLE - NO UNNECESSARY BORDERS) -->
  <div class={`absolute bottom-6 right-4 sm:right-6 z-30 flex flex-col items-center backdrop-blur-md rounded-2xl shadow-xl p-1.5 space-y-1 select-none pointer-events-auto transition-colors ${
    isDarkMode ? 'bg-[#271A10]/95 text-[#FAF7F2]' : 'bg-white/95 text-[#4A2E1B]'
  }`}>
    <!-- Zoom In -->
    <button
      type="button"
      on:click={handleZoomIn}
      class={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black transition cursor-pointer active:scale-95 ${
        isDarkMode ? 'hover:bg-[#352317] text-[#FAF7F2]' : 'hover:bg-[#FAF7F2] text-[#4A2E1B]'
      }`}
      title="Zoom In"
      aria-label="Zoom In"
    >
      +
    </button>

    <!-- Zoom Out -->
    <button
      type="button"
      on:click={handleZoomOut}
      class={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black transition cursor-pointer active:scale-95 ${
        isDarkMode ? 'hover:bg-[#352317] text-[#FAF7F2]' : 'hover:bg-[#FAF7F2] text-[#4A2E1B]'
      }`}
      title="Zoom Out"
      aria-label="Zoom Out"
    >
      −
    </button>

    <div class={`w-6 h-[1px] my-0.5 opacity-20 ${isDarkMode ? 'bg-white' : 'bg-black'}`}></div>

    <!-- Heatmap Toggle (Official Map Logo per User Design) -->
    <button
      type="button"
      on:click={toggleHeatmap}
      class={`w-10 h-10 rounded-xl flex items-center justify-center transition cursor-pointer active:scale-95 ${
        isHeatmapActive
          ? (isDarkMode ? 'bg-[#F59E0B]/20 text-[#F59E0B] ring-2 ring-[#F59E0B]/50' : 'bg-[#FEF3C7] text-[#D97706] ring-2 ring-[#D97706]/50')
          : (isDarkMode ? 'hover:bg-[#352317] text-[#FAF7F2]' : 'hover:bg-[#FAF7F2] text-[#4A2E1B]')
      }`}
      title={language === 'tl' ? (isHeatmapActive ? 'Itago ang Heatmap ng Tao' : 'Ipakita ang Heatmap ng Tao') : (isHeatmapActive ? 'Hide Traffic Heatmap' : 'Show Traffic Heatmap')}
      aria-label="Toggle Traffic Heatmap"
    >
      <Icon name="map" size={18} />
    </button>

    <!-- Center to Location -->
    <button
      type="button"
      on:click={handleRecenterGPS}
      class={`w-10 h-10 rounded-xl flex items-center justify-center text-base transition cursor-pointer active:scale-95 ${
        isDarkMode ? 'text-[#F59E0B] hover:bg-[#352317]' : 'text-[#D97706] hover:bg-[#FAF7F2]'
      }`}
      title={language === 'tl' ? 'I-sentro sa Aking Lokasyon' : 'Center to My Location'}
      aria-label="Center Map"
    >
      <Icon name="location-center" size={18} />
    </button>
  </div>

  <!-- FLOATING HUFF GRAVITY HEATMAP LEGEND & PRODUCT LENS (BOTTOM LEFT) -->
  {#if isHeatmapActive}
    <div class={`absolute bottom-6 left-4 z-20 flex flex-col gap-1.5 p-2.5 rounded-2xl shadow-xl border backdrop-blur-md text-[11px] font-bold pointer-events-auto animate-fade-in max-w-[calc(100vw-5.5rem)] sm:max-w-xs ${
      isDarkMode ? 'bg-[#271A10]/95 border-[#3D2717] text-[#FAF7F2]' : 'bg-white/95 border-[#EAE4D9] text-[#4A2E1B]'
    }`}>
      <div class="flex items-center justify-between gap-2">
        <span class="text-[#D97706] font-black uppercase tracking-wider flex items-center gap-1">
          <Icon name="map" size={13} />
          <span>{language === 'tl' ? 'Huff Viability Heatmap' : 'Huff Viability Heatmap'}</span>
        </span>
        <button
          type="button"
          on:click={() => (showZoneSuggestionsDrawer = true)}
          class="px-2 py-0.5 rounded-lg bg-green-600/15 hover:bg-green-600/25 text-green-700 dark:text-green-400 text-[10px] font-black cursor-pointer transition"
        >
          🎯 {language === 'tl' ? 'Top Zones' : 'Top Zones'}
        </button>
      </div>

      <!-- Continuous Green Viability Gradient Bar -->
      <div class="space-y-1">
        <div class="h-2 w-full rounded-full bg-gradient-to-r from-emerald-500/5 via-emerald-400/55 to-green-700/85 border border-black/10 dark:border-white/15 shadow-inner"></div>
        <div class="flex items-center justify-between text-[9px] font-extrabold opacity-80">
          <span>{language === 'tl' ? '⚪ Mahina' : '⚪ Low'}</span>
          <span>{language === 'tl' ? '🟢 Katamtaman' : '🟢 Moderate'}</span>
          <span class="text-green-600 dark:text-green-400 font-black">{language === 'tl' ? '🟢 Napakaganda' : '🟢 Prime Spot'}</span>
        </div>
      </div>

      <!-- Product-Specific Heatmap Lens Switcher -->
      <div class="flex items-center gap-1 pt-0.5">
        <span class="text-[9px] opacity-70 mr-0.5">{language === 'tl' ? 'Paninda:' : 'Lens:'}</span>
        {#each ['Taho', 'Siomai', 'Balut'] as prodLens}
          <button
            type="button"
            on:click={() => {
              heatmapProductOverride = prodLens.toLowerCase();
              if (heatmapProbeResult) {
                heatmapProbeResult = evaluateHeatmapProbe(
                  heatmapProbeResult.lat,
                  heatmapProbeResult.lng,
                  heatmapProductOverride,
                  vendors
                );
              }
              renderMapElements();
            }}
            class={`px-2 py-0.5 rounded-lg text-[10px] font-black transition cursor-pointer ${
              activeHeatmapProduct.toLowerCase().includes(prodLens.toLowerCase())
                ? 'bg-[#D97706] text-white shadow-xs'
                : (isDarkMode ? 'bg-[#1A120B] text-[#D6C7B2] hover:bg-[#352317]' : 'bg-[#FAF7F2] text-[#796658] hover:bg-[#EAE4D9]')
            }`}
          >
            {prodLens}
          </button>
        {/each}
      </div>

      <p class="text-[9px] opacity-75 leading-tight">
        💡 {language === 'tl' ? 'Pindutin ang kahit anong berdeng bahagi sa mapa para suriin ang pwesto at ruta.' : 'Tap any green zone on the map to analyze viability & route.'}
      </p>
    </div>
  {/if}

  <!-- INTERACTIVE HEATMAP SPOT ANALYZER PROBE CARD (WHEN USER TAPS ANYWHERE ON HEATMAP) -->
  {#if heatmapProbeResult && isHeatmapActive && !selectedVendor && !selectedHotspot}
    {@const walkDist = calculateDistanceM(session.lat, session.lng, heatmapProbeResult.lat, heatmapProbeResult.lng)}
    {@const walkEta = Math.max(1, Math.round(walkDist / 67))}
    <div class="absolute bottom-24 sm:bottom-6 left-1/2 -translate-x-1/2 z-30 w-full max-w-md px-4 pointer-events-auto animate-fade-in">
      <div class={`p-4 rounded-[28px] shadow-2xl border space-y-3 backdrop-blur-md ${
        isDarkMode ? 'bg-[#271A10]/95 border-[#F59E0B]/40 text-[#FAF7F2]' : 'bg-white/95 border-[#EAE4D9] text-[#4A2E1B]'
      }`}>
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0">
            <span class="text-[10px] font-black uppercase tracking-wider text-[#D97706] flex items-center gap-1">
              <span>🎯</span>
              <span>{language === 'tl' ? `Sinuring Pwesto para sa ${activeHeatmapProduct.toUpperCase()}` : `Huff Spot Analysis (${activeHeatmapProduct.toUpperCase()})`}</span>
            </span>
            <h4 class="text-sm sm:text-base font-black truncate mt-0.5">
              {language === 'tl' ? `Malapit sa ${heatmapProbeResult.nearestAnchorName}` : `Near ${heatmapProbeResult.nearestAnchorName}`}
            </h4>
            <p class="text-[11px] font-bold text-[#796658] dark:text-[#D6C7B2]">
              ~{formatDistance(walkDist)} {language === 'tl' ? 'mula sa iyo' : 'from you'} • ~{walkEta} {language === 'tl' ? 'min lakad' : 'min walk'}
            </p>
          </div>

          <div class="flex items-center gap-1.5 shrink-0">
            <div class={`px-2.5 py-1 rounded-xl text-xs font-black border ${
              heatmapProbeResult.score >= 80
                ? 'bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30'
                : heatmapProbeResult.score >= 60
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                  : 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30'
            }`}>
              {heatmapProbeResult.score}/100
            </div>
            <button
              type="button"
              on:click={() => {
                heatmapProbeResult = null;
                renderMapElements();
              }}
              class="w-7 h-7 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center text-xs font-black cursor-pointer"
              aria-label="Close probe"
            >
              ✕
            </button>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-2 text-[11px]">
          <div class={`p-2.5 rounded-xl ${isDarkMode ? 'bg-[#1A120B]' : 'bg-[#FAF7F2]'}`}>
            <span class="text-[9px] uppercase font-bold opacity-70 block">{language === 'tl' ? 'Huff Pull (Sakayan)' : 'Anchor Pull'}</span>
            <span class="font-black text-xs">~{formatDistance(heatmapProbeResult.nearestAnchorDistM)} {language === 'tl' ? 'sa hub' : 'to hub'}</span>
          </div>
          <div class={`p-2.5 rounded-xl ${isDarkMode ? 'bg-[#1A120B]' : 'bg-[#FAF7F2]'}`}>
            <span class="text-[9px] uppercase font-bold opacity-70 block">{language === 'tl' ? 'Kaparehong Paninda (150m)' : 'Same-Product Rivals'}</span>
            <span class={`font-black text-xs ${heatmapProbeResult.sameProductCompetitors150m === 0 ? 'text-green-500' : 'text-amber-500'}`}>
              {heatmapProbeResult.sameProductCompetitors150m === 0
                ? (language === 'tl' ? '✓ 0 Kalaban (Bakante!)' : '✓ 0 Rivals (Open!)')
                : `${heatmapProbeResult.sameProductCompetitors150m} ${language === 'tl' ? 'kalaban sa paligid' : 'nearby rival(s)'}`}
            </span>
          </div>
        </div>

        <p class={`text-[11px] p-2.5 rounded-xl font-semibold leading-snug ${
          isDarkMode ? 'bg-[#1A120B] text-[#D6C7B2]' : 'bg-[#FAF7F2] text-[#4A2E1B]'
        }`}>
          💡 {language === 'tl' ? heatmapProbeResult.adviceTl : heatmapProbeResult.adviceEn}
        </p>

        <button
          type="button"
          on:click={() => {
            if (heatmapProbeResult) {
              handleTargetLocation(
                heatmapProbeResult.lat,
                heatmapProbeResult.lng,
                heatmapProbeResult.nearestAnchorName
              );
              heatmapProbeResult = null;
            }
          }}
          class="w-full py-2.5 px-4 rounded-xl bg-[#D97706] hover:bg-[#B45309] text-white text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 shadow-md active:scale-98"
        >
          <span>🚶‍♂️</span>
          <span>{language === 'tl' ? 'Ituro ang Ruta Papunta sa Pwestong Ito' : 'Guide Walking Route to This Spot'}</span>
          <span>→</span>
        </button>
      </div>
    </div>
  {/if}

  <!-- SMART ZONE MATCHMAKER DRAWER (HUFF'S GRAVITY MODEL) -->
  {#if showZoneSuggestionsDrawer}
    <div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in pointer-events-auto">
      <div class={`w-full max-w-lg max-h-[85vh] rounded-t-[32px] sm:rounded-[32px] border p-5 sm:p-6 space-y-4 shadow-2xl overflow-y-auto ${
        isDarkMode ? 'bg-[#271A10] border-[#3D2717] text-[#FAF7F2]' : 'bg-white border-[#EAE4D9] text-[#4A2E1B]'
      }`}>
        <div class="flex items-center justify-between pb-2 border-b border-black/5 dark:border-white/10">
          <div class="flex items-center gap-2">
            <span class="text-2xl">🎯</span>
            <div>
              <h3 class="text-base sm:text-lg font-black">{language === 'tl' ? 'Mga Bagay na Pwesto Para Sa Iyo' : 'Smart Stall Matchmaker'}</h3>
              <p class="text-[11px] text-[#796658] dark:text-[#D6C7B2] font-semibold">
                {language === 'tl' ? `Batay sa Huff Gravity Model para sa ${session.product || 'paninda'} mo` : `Powered by Huff Gravity Model for your ${session.product || 'items'}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            on:click={() => (showZoneSuggestionsDrawer = false)}
            class="w-8 h-8 rounded-full flex items-center justify-center bg-black/5 dark:bg-white/10 text-xs font-black cursor-pointer hover:bg-black/10 transition"
          >
            ✕
          </button>
        </div>

        <div class="space-y-3">
          {#each recommendedZones as zone, idx}
            <div class={`p-4 rounded-2xl border space-y-2.5 transition-all hover:border-[#D97706]/50 ${
              isDarkMode ? 'bg-[#1A120B] border-[#3D2717]' : 'bg-[#FAF7F2] border-[#EAE4D9]'
            }`}>
              <div class="flex items-start justify-between gap-2">
                <div>
                  <div class="flex items-center gap-1.5">
                    <span class="text-xs font-black px-2 py-0.5 rounded-full bg-[#D97706] text-white">#{idx + 1}</span>
                    <h4 class="text-sm font-black text-[#4A2E1B] dark:text-[#FAF7F2]">{zone.nameTl || zone.name}</h4>
                  </div>
                  <p class="text-xs font-bold text-[#D97706] mt-0.5">
                    ~{formatDistance(zone.distanceM)} • ~{Math.max(1, Math.round(zone.distanceM / 67))} {language === 'tl' ? 'min lakad mula rito' : 'min walk'}
                  </p>
                </div>
                <div class="px-2.5 py-1 rounded-xl bg-green-500/15 border border-green-500/30 text-green-600 dark:text-green-400 text-xs font-black shrink-0 text-center">
                  ⭐ {zone.matchPercentage}% {language === 'tl' ? 'Tugma' : 'Match'}
                </div>
              </div>

              <div class="text-[11px] space-y-1 text-[#796658] dark:text-[#D6C7B2]">
                <div class="flex items-center gap-1.5 font-medium">
                  <span>🕒</span>
                  <span><strong>{language === 'tl' ? 'Benta Window:' : 'Peak Time:'}</strong> {zone.peakHoursTl}</span>
                </div>
                <div class="flex items-center gap-1.5 font-medium">
                  <span>👥</span>
                  <span><strong>{language === 'tl' ? 'Dagsa ng Tao:' : 'Crowd:'}</strong> {zone.estimatedCrowd}</span>
                </div>
                <div class="p-2 rounded-xl bg-black/5 dark:bg-white/5 font-semibold text-[#4A2E1B] dark:text-[#FAF7F2]">
                  💡 {language === 'tl' ? zone.rationaleTl : zone.rationaleEn}
                </div>
              </div>

              <button
                type="button"
                on:click={() => {
                  handleTargetLocation(zone.lat, zone.lng, zone.nameTl);
                  showZoneSuggestionsDrawer = false;
                }}
                class="w-full py-2.5 px-4 rounded-xl bg-[#D97706] hover:bg-[#B45309] text-white text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm active:scale-98"
              >
                <span>🚶‍♂️</span>
                <span>{language === 'tl' ? 'Ituro ang Ruta Papunta Dito' : 'Guide Route to This Spot'}</span>
                <span>→</span>
              </button>
            </div>
          {/each}
        </div>
      </div>
    </div>
  {/if}

  <!-- UBOS NA CONFIRMATION MODAL -->
  {#if showSoldOutConfirmModal}
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in pointer-events-auto">
      <div class={`w-full max-w-sm rounded-[32px] border p-6 text-center space-y-4 shadow-2xl ${
        isDarkMode ? 'bg-[#271A10] border-[#3D2717] text-[#FAF7F2]' : 'bg-white border-[#EAE4D9] text-[#4A2E1B]'
      }`}>
        <div class="w-16 h-16 rounded-full bg-red-500/15 text-red-500 text-3xl mx-auto flex items-center justify-center">
          🔴
        </div>
        <div>
          <h3 class="text-xl font-black">
            {language === 'tl' ? 'Ubos na ba ang Paninda Mo Kuya?' : 'Are you Sold Out?'}
          </h3>
          <p class="text-xs text-[#796658] dark:text-[#D6C7B2] font-medium mt-1">
            {language === 'tl'
              ? 'Makikita ng mga kalapit na mamimili na naubos na ang iyong paninda para hindi na sila mag-abang sa kalsada.'
              : 'Nearby customers will see that your cart is sold out so they will not wait in the street.'}
          </p>
        </div>

        <div class="space-y-2 pt-2">
          <button
            type="button"
            on:click={handleConfirmSoldOut}
            class="w-full py-3.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black text-sm shadow-md transition cursor-pointer active:scale-98"
          >
            ✓ {language === 'tl' ? 'Oo, Ubos na Lahat!' : 'Yes, Completely Sold Out!'}
          </button>
          <button
            type="button"
            on:click={() => (showSoldOutConfirmModal = false)}
            class="w-full py-3 rounded-2xl border border-black/10 dark:border-white/10 text-xs font-bold transition cursor-pointer hover:bg-black/5 dark:hover:bg-white/5"
          >
            {language === 'tl' ? 'Kanselahin (Magtitinda Pa)' : 'Cancel (Keep Selling)'}
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- UBOS NA CELEBRATION SUMMARY MODAL -->
  {#if showSoldOutCelebration}
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in pointer-events-auto">
      <div class={`w-full max-w-sm rounded-[32px] border p-6 text-center space-y-4 shadow-2xl ${
        isDarkMode ? 'bg-[#271A10] border-[#3D2717] text-[#FAF7F2]' : 'bg-white border-[#EAE4D9] text-[#4A2E1B]'
      }`}>
        <div class="w-16 h-16 rounded-full bg-amber-500/15 text-3xl mx-auto flex items-center justify-center animate-bounce">
          🎉
        </div>
        <div>
          <h3 class="text-xl font-black text-[#D97706]">
            {language === 'tl' ? 'Saludo sa Sipag Mo, Kuya!' : 'Congratulations Kuya!'}
          </h3>
          <h4 class="text-base font-extrabold mt-0.5">
            {language === 'tl' ? 'Ubos na ang Iyong Paninda!' : 'All Items Sold Out!'}
          </h4>
          <p class="text-xs text-[#796658] dark:text-[#D6C7B2] font-medium mt-1">
            {language === 'tl'
              ? `Matagumpay mong naibenta ang iyong ${session.product || 'paninda'}. Maraming salamat sa pagpapakain sa komunidad!`
              : `You have successfully sold out your ${session.product || 'items'} today. Thank you for serving the community!`}
          </p>
        </div>

        <div class={`p-3.5 rounded-2xl text-left space-y-1.5 text-xs ${
          isDarkMode ? 'bg-[#1A120B]' : 'bg-[#FAF7F2]'
        }`}>
          <div class="flex justify-between">
            <span class="text-[#796658] dark:text-[#D6C7B2]">{language === 'tl' ? 'Paninda:' : 'Item Sold:'}</span>
            <span class="font-bold">{session.product || 'Taho'}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-[#796658] dark:text-[#D6C7B2]">{language === 'tl' ? 'Mamimiling Naabutan:' : 'Neighbors Reached:'}</span>
            <span class="font-bold text-green-500">~{waitingAudienceCount} mamimili</span>
          </div>
          <div class="flex justify-between">
            <span class="text-[#796658] dark:text-[#D6C7B2]">{language === 'tl' ? 'Lokasyon:' : 'Area:'}</span>
            <span class="font-bold truncate max-w-[160px]">{session.locationName}</span>
          </div>
        </div>

        <div class="space-y-2 pt-2">
          <button
            type="button"
            on:click={() => {
              showSoldOutCelebration = false;
              onSwitchRole();
            }}
            class="w-full py-3.5 rounded-2xl bg-[#4A2E1B] hover:bg-[#352317] text-[#FAF7F2] font-black text-sm shadow-md transition cursor-pointer active:scale-98 flex items-center justify-center gap-1.5"
          >
            <span>🏠</span>
            <span>{language === 'tl' ? 'Magpahinga Na (Tapusin ang Araw)' : 'Rest for the Day'}</span>
          </button>
          <button
            type="button"
            on:click={handleResumeLive}
            class="w-full py-2.5 rounded-2xl text-xs font-bold text-[#D97706] hover:bg-[#FEF3C7] dark:hover:bg-[#352317] transition cursor-pointer"
          >
            🔄 {language === 'tl' ? 'May Karagdagang Paninda (Magtinda Ulit)' : 'More Batches Arrived (Resume)'}
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- CONFIGURATION MODAL (SCHOOL SCHEDULES & COMMUNITY EVENTS) -->
  {#if showHotspotConfigModal}
    <HotspotConfigModal
      {language}
      {isDarkMode}
      {session}
      defaultLat={mapCenterLat}
      defaultLng={mapCenterLng}
      activeHotspots={demandHotspots}
      onClose={() => (showHotspotConfigModal = false)}
      onHotspotsUpdated={() => {
        reloadHotspots(true);
        renderMapElements();
      }}
    />
  {/if}
</div>
