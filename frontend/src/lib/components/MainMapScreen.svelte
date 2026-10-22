<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { DemandHotspot, DemandHotspotCategory, Language, ProductType, TaggedVendor, UserSession } from '../types';
  import { BUSINESS_ARCHETYPES, generateAnchorsAround, generateCompetitorsAround, PRODUCT_LEGEND } from '../data/spots';
  import { getAllDemandHotspots, getDemandHotspotsForViewport, getOpportunityRating, HOTSPOT_CATEGORY_META, HOTSPOT_LEVEL_META } from '../data/hotspots';
  import { evaluateLocationViability, calculateDistanceM } from '../gravity';
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

  // Huff Gravity Model Viability Evaluation for Vendor
  $: anchors = generateAnchorsAround(mapCenterLat, mapCenterLng);
  $: competitors = generateCompetitorsAround(mapCenterLat, mapCenterLng);
  let selectedArchetype = BUSINESS_ARCHETYPES.find((a) => a.id === session.product?.toLowerCase()) || BUSINESS_ARCHETYPES[2];
  $: viability = evaluateLocationViability(mapCenterLat, mapCenterLng, selectedArchetype, anchors, competitors);

  let viabilityMarker: L.Marker | null = null;
  let viabilityLine: L.Polyline | null = null;

  // React to external session coordinates update (e.g. searching OSM location)
  let currentSessionLat = session.lat;
  let currentSessionLng = session.lng;
  $: if (map && (session.lat !== currentSessionLat || session.lng !== currentSessionLng)) {
    currentSessionLat = session.lat;
    currentSessionLng = session.lng;
    mapCenterLat = session.lat;
    mapCenterLng = session.lng;
    map.flyTo([session.lat, session.lng], 16, { duration: 0.6 });
    reloadHotspots();
    renderMapElements();
  }

  // Recommended viability spot for vendor ("Saan Magandang Pepwesto")
  $: recommendedViabilitySpot = (() => {
    if (session.role !== 'vendor' || !anchors || anchors.length === 0) return null;
    const distFromUser = calculateDistanceM(session.lat, session.lng, mapCenterLat, mapCenterLng);
    const refLat = distFromUser < 1500 ? session.lat : mapCenterLat;
    const refLng = distFromUser < 1500 ? session.lng : mapCenterLng;
    let nearest = anchors[0];
    let minD = calculateDistanceM(refLat, refLng, nearest.lat, nearest.lng);
    for (const a of anchors) {
      const d = calculateDistanceM(refLat, refLng, a.lat, a.lng);
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
      isNearUser: distFromUser < 1500,
    };
  })();

  function handleZoomIn() {
    map?.zoomIn();
  }

  function handleZoomOut() {
    map?.zoomOut();
  }

  // Floating vendor list sidebar state
  let isVendorListOpen: boolean = true;

  // Vendor sidebar / drawer open state
  let isSidebarOpen: boolean = false;
  let vendorStatus: 'live' | 'stopped' | 'sold_out' = 'live';
  let waitingAudienceCount: number = 19;

  // Notification chime alert state
  let alertToast: string | null = null;

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
    reloadHotspots();
    renderMapElements();
  });

  onDestroy(() => {
    if (map) {
      map.off('moveend', handleMapMoveEnd);
      if (viabilityMarker) map.removeLayer(viabilityMarker);
      if (viabilityLine) map.removeLayer(viabilityLine);
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

  function reloadHotspots() {
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
    demandHotspots = getDemandHotspotsForViewport(currentViewportBounds, center.lat, center.lng, map.getZoom());
  }

  function handleTargetLocation(lat: number, lng: number) {
    if (map) {
      map.flyTo([lat, lng], 17, { duration: 0.6 });
    }
  }

  $: filteredVendors = activeFilter
    ? vendors.filter((v) => v.productType === activeFilter)
    : vendors;

  $: listHotspots = activeHotspotCategory === 'all'
    ? demandHotspots
    : demandHotspots.filter((h) => h.category === activeHotspotCategory);

  $: if (map && (filteredVendors || session || isDarkMode || isHotspotsVisible || activeHotspotCategory || demandHotspots || selectedHotspot || recommendedViabilitySpot)) {
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
      const markerHtml = `
        <div class="relative flex items-center justify-center cursor-pointer transition-transform hover:scale-110 active:scale-95">
          ${vendor.status === 'live' ? '<span class="absolute w-10 h-10 rounded-full bg-[#D97706]/30 animate-pulse"></span>' : ''}
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

        // Color-coded hotspot catchment circle
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

        // Color-coded hotspot marker badge with Category Icon & Opportunity Score
        const markerHtml = `
          <div class="relative flex items-center justify-center cursor-pointer transition-transform hover:scale-110 active:scale-95 group">
            ${hotspot.potentialLevel === 'high' ? `<span class="absolute w-12 h-12 rounded-full animate-ping opacity-35" style="background-color: ${lvlMeta.mapFill}"></span>` : ''}
            <div class="px-2.5 py-1 rounded-xl shadow-lg flex items-center gap-1.5 border font-black text-xs transition-transform ${isSelected ? 'scale-110 ring-2 ring-white dark:ring-black' : ''}" style="background-color: ${isDarkMode ? '#271A10' : '#FFFFFF'}; border-color: ${lvlMeta.mapStroke}; color: ${isDarkMode ? '#FAF7F2' : '#4A2E1B'};">
              <span class="text-sm">${getIconSvg(catMeta.icon, { size: 14, color: isDarkMode ? '#FAF7F2' : '#4A2E1B' })}</span>
              <span class="text-[10px] px-1.5 py-0.5 rounded-full text-white font-extrabold" style="background-color: ${lvlMeta.mapFill}">
                ${hotspot.opportunityScore}
              </span>
            </div>
          </div>
        `;

        const m = L.marker([hotspot.lat, hotspot.lng], {
          icon: L.divIcon({
            html: markerHtml,
            className: 'demand-hotspot-marker',
            iconSize: [64, 32],
            iconAnchor: [32, 16],
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

      // Distance & category rating badge marker on the spot
      const viabilitySpotHtml = `
        <div class="relative flex flex-col items-center cursor-pointer select-none group -translate-y-2">
          <div class="px-2.5 py-1 rounded-full ${
            isDarkMode ? 'bg-[#271A10] text-[#F59E0B] border-[#F59E0B]/50' : 'bg-[#4A2E1B] text-[#FAF7F2] border-white'
          } border shadow-lg text-[11px] font-black whitespace-nowrap mb-1 flex items-center gap-1.5 transition-transform group-hover:scale-105">
            ${getIconSvg('star', { size: 12, color: '#D97706' })}
            <span>${language === 'tl' ? recommendedViabilitySpot.ratingTl : recommendedViabilitySpot.ratingEn}</span>
            <span class="opacity-50">•</span>
            <span class="text-[#D97706] font-extrabold">~${recommendedViabilitySpot.distanceM}m</span>
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
          <div class="text-gray-600">${language === 'tl' ? 'Kategorya' : 'Rating'}: <strong class="text-green-600">${language === 'tl' ? recommendedViabilitySpot.ratingTl : recommendedViabilitySpot.ratingEn} (${recommendedViabilitySpot.score}/100)</strong></div>
          <div class="text-gray-600">${language === 'tl' ? 'Layo mula sa iyo' : 'Distance from you'}: <strong>~${recommendedViabilitySpot.distanceM} metro</strong></div>
        </div>
      `);
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
            class={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 text-xs font-black cursor-pointer shadow-xs active:scale-95 ${
              isDarkMode
                ? 'bg-[#352317] hover:bg-[#4A2E1B] text-[#F59E0B]'
                : 'bg-[#FEF3C7] hover:bg-[#FDE68A] text-[#D97706]'
            }`}
            title={language === 'tl' ? 'Pumunta sa Dashboard ng Tindahan' : 'Vendor Dashboard'}
          >
            <Icon name="cart" size={14} />
            <span>{language === 'tl' ? 'Tindahan' : 'Stall'}</span>
          </button>
        {/if}
      </div>

      <!-- Center: Location Selector (Centered on Topbar) -->
      <div class="absolute inset-x-0 mx-auto max-w-xs sm:max-w-md flex items-center justify-center pointer-events-none px-4">
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
    class={`absolute bottom-20 left-3 sm:bottom-auto sm:top-22 sm:left-1/2 sm:-translate-x-1/2 sm:inset-x-auto z-20 flex flex-col sm:flex-row items-start sm:items-center justify-start sm:justify-center gap-1.5 p-1.5 rounded-2xl backdrop-blur-md shadow-lg border overflow-y-auto sm:overflow-y-visible overflow-x-hidden sm:overflow-x-auto no-scrollbar max-h-[60vh] sm:max-h-none sm:max-w-[95vw] pointer-events-auto transition-colors animate-fade-in ${
      isDarkMode ? 'bg-[#1A120B]/95 border-[#3D2717] text-[#FAF7F2]' : 'bg-white/95 border-[#EAE4D9] text-[#4A2E1B]'
    }`}
  >
      <button
        type="button"
        on:click={() => (activeHotspotCategory = 'all')}
        class={`px-3 py-1 rounded-xl text-xs font-black transition cursor-pointer whitespace-nowrap ${
          activeHotspotCategory === 'all'
            ? 'bg-[#EF4444] text-white shadow-xs'
            : (isDarkMode ? 'hover:bg-[#271A10]' : 'hover:bg-[#FAF7F2]')
        }`}
      >
        {language === 'tl' ? 'Lahat ng Hotspot' : 'All Hotspots'}
      </button>

      <button
        type="button"
        on:click={() => (activeHotspotCategory = 'school')}
        class={`px-2.5 py-1 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1 whitespace-nowrap ${
          activeHotspotCategory === 'school'
            ? 'bg-[#2563EB] text-white shadow-xs'
            : (isDarkMode ? 'hover:bg-[#271A10]' : 'hover:bg-[#FAF7F2]')
        }`}
      >
        <Icon name="school" size={14} />
        <span class="hidden xs:inline">{language === 'tl' ? 'Paaralan' : 'Schools'}</span>
      </button>

      <button
        type="button"
        on:click={() => (activeHotspotCategory = 'basketball')}
        class={`px-2.5 py-1 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1 whitespace-nowrap ${
          activeHotspotCategory === 'basketball'
            ? 'bg-[#EA580C] text-white shadow-xs'
            : (isDarkMode ? 'hover:bg-[#271A10]' : 'hover:bg-[#FAF7F2]')
        }`}
      >
        <Icon name="trophy" size={14} />
        <span class="hidden xs:inline">{language === 'tl' ? 'Basketball' : 'Basketball'}</span>
      </button>

      <button
        type="button"
        on:click={() => (activeHotspotCategory = 'barangay')}
        class={`px-2.5 py-1 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1 whitespace-nowrap ${
          activeHotspotCategory === 'barangay'
            ? 'bg-[#059669] text-white shadow-xs'
            : (isDarkMode ? 'hover:bg-[#271A10]' : 'hover:bg-[#FAF7F2]')
        }`}
      >
        <Icon name="tent" size={14} />
        <span class="hidden xs:inline">{language === 'tl' ? 'Barangay' : 'Barangay'}</span>
      </button>

      <button
        type="button"
        on:click={() => (activeHotspotCategory = 'commuter')}
        class={`px-2.5 py-1 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1 whitespace-nowrap ${
          activeHotspotCategory === 'commuter'
            ? 'bg-[#7C3AED] text-white shadow-xs'
            : (isDarkMode ? 'hover:bg-[#271A10]' : 'hover:bg-[#FAF7F2]')
        }`}
      >
        <Icon name="bus" size={14} />
        <span class="hidden xs:inline">{language === 'tl' ? 'Sakayan' : 'Commuters'}</span>
      </button>

      <div class="w-full sm:w-[1px] h-[1px] sm:h-4 bg-black/10 dark:bg-white/10 my-0.5 sm:my-0 sm:mx-0.5"></div>

      <button
        type="button"
        on:click={() => (showHotspotConfigModal = true)}
        class="px-2.5 py-1 rounded-xl text-xs font-black bg-[#D97706]/15 hover:bg-[#D97706]/25 text-[#D97706] transition cursor-pointer flex items-center gap-1 whitespace-nowrap active:scale-95"
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
                      📍 {vendor.distanceM}m • ~{vendor.etaMins}m
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
                <!-- Left: Prominent Opportunity Rating & Score -->
                <div class="w-22 shrink-0 flex flex-col items-start justify-center pr-3 border-r border-[#EAE4D9] dark:border-[#3D2717]">
                  <span class={`text-sm sm:text-base font-black uppercase tracking-tight leading-none ${ratingMeta.textClass}`}>
                    {ratingMeta.rating}
                  </span>
                  <span class={`text-xs font-extrabold mt-1 leading-none ${ratingMeta.textClass}`}>
                    {hotspot.opportunityScore}/100
                  </span>
                </div>

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
            <div class="flex items-center gap-1.5">
              <h4 class="text-base font-black">{selectedVendor.name}</h4>
              {#if selectedVendor.verifiedPhoto}
                <span class="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-400">
                  ✓ Verified
                </span>
              {/if}
            </div>
            <p class={`text-xs font-bold ${isDarkMode ? 'text-[#D6C7B2]' : 'text-[#796658]'}`}>
              {language === 'tl' ? selectedVendor.productNameTl : selectedVendor.productName}
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
            {selectedVendor.distanceM}m • ~{selectedVendor.etaMins} mins
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
              <h3 class="text-base font-black">
                {language === 'tl' ? 'Menu ng Tindero' : 'Vendor Dashboard'}
              </h3>
              <p class={`text-xs font-medium ${isDarkMode ? 'text-[#D6C7B2]' : 'text-[#796658]'}`}>
                {session.product || 'Taho'} • {session.locationName.split(',')[0]}
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
              <span class="font-bold text-right truncate">{language === 'tl' ? 'Mataas (~' + viability.nearestAnchorDistM + 'm sa sakayan)' : 'High (~' + viability.nearestAnchorDistM + 'm to hub)'}</span>
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
        reloadHotspots();
        renderMapElements();
      }}
    />
  {/if}
</div>
