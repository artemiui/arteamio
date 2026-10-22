<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { Language, LiveVendor, TransitAnchor } from '../types';
  import L from 'leaflet';

  export let centerLat: number = 14.6091;
  export let centerLng: number = 120.9898;
  export let selectedLat: number = 14.6091;
  export let selectedLng: number = 120.9898;
  export let transitAnchors: TransitAnchor[] = [];
  export let liveVendors: LiveVendor[] = [];
  export let activeVendorRadarM: number = 200;
  export let language: Language = 'tl';
  export let onSelectLocation: (lat: number, lng: number) => void;

  let mapContainer: HTMLDivElement;
  let map: L.Map | null = null;
  let targetMarker: L.Marker | null = null;
  let targetCircle: L.Circle | null = null;
  let vendorMarkers: L.Marker[] = [];
  let vendorCircles: L.Circle[] = [];
  let anchorMarkers: L.Marker[] = [];

  function createCustomDivIcon(html: string, className: string = '', iconSize: [number, number] = [40, 40]) {
    return L.divIcon({
      html,
      className: `custom-map-icon ${className}`,
      iconSize,
      iconAnchor: [iconSize[0] / 2, iconSize[1] / 2],
      popupAnchor: [0, -iconSize[1] / 2],
    });
  }

  onMount(() => {
    if (!mapContainer) return;

    // Initialize Leaflet map
    map = L.map(mapContainer, {
      center: [centerLat, centerLng],
      zoom: 16,
      zoomControl: false,
    });

    // Add zoom control at bottom-right
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Standard OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
    }).addTo(map);

    // Map click handler
    map.on('click', (e: L.LeafletMouseEvent) => {
      onSelectLocation(e.latlng.lat, e.latlng.lng);
    });

    renderAllMarkers();
  });

  onDestroy(() => {
    if (map) {
      map.remove();
      map = null;
    }
  });

  // Reactive updates when coordinates or vendors change
  $: if (map && (selectedLat || selectedLng || transitAnchors || liveVendors || activeVendorRadarM)) {
    renderAllMarkers();
  }

  export function panTo(lat: number, lng: number, zoomLevel: number = 16) {
    if (map) {
      map.flyTo([lat, lng], zoomLevel, { duration: 0.8 });
    }
  }

  function renderAllMarkers() {
    if (!map) return;

    // 1. Target candidate spot marker
    if (targetMarker) map.removeLayer(targetMarker);
    if (targetCircle) map.removeLayer(targetCircle);

    const targetIconHtml = `
      <div class="relative flex items-center justify-center">
        <span class="absolute w-12 h-12 rounded-full bg-[#D97706]/25 animate-ping"></span>
        <div class="w-10 h-10 rounded-2xl bg-[#4A2E1B] text-[#FAF7F2] border-2 border-white flex items-center justify-center shadow-xl text-base font-black">
          📍
        </div>
      </div>
    `;

    targetMarker = L.marker([selectedLat, selectedLng], {
      icon: createCustomDivIcon(targetIconHtml, '', [44, 44]),
      zIndexOffset: 1000,
    }).addTo(map);

    targetCircle = L.circle([selectedLat, selectedLng], {
      radius: activeVendorRadarM,
      color: '#D97706',
      fillColor: '#D97706',
      fillOpacity: 0.07,
      weight: 1.5,
      dashArray: '5, 5',
    }).addTo(map);

    // 2. Clear old transit & vendor markers
    anchorMarkers.forEach((m) => map?.removeLayer(m));
    anchorMarkers = [];

    vendorMarkers.forEach((m) => map?.removeLayer(m));
    vendorMarkers = [];

    vendorCircles.forEach((c) => map?.removeLayer(c));
    vendorCircles = [];

    // 3. Render Transit Anchors
    transitAnchors.forEach((anchor) => {
      let iconEmoji = '🛺';
      if (anchor.type === 'jeepney') iconEmoji = '🚐';
      if (anchor.type === 'train') iconEmoji = '🚆';
      if (anchor.type === 'school') iconEmoji = '🏫';

      const anchorIconHtml = `
        <div class="w-8 h-8 rounded-full bg-white text-[#4A2E1B] border-2 border-[#EAE4D9] shadow-sm flex items-center justify-center text-xs font-bold transition hover:scale-110" title="${anchor.name}">
          ${iconEmoji}
        </div>
      `;

      const m = L.marker([anchor.lat, anchor.lng], {
        icon: createCustomDivIcon(anchorIconHtml, '', [32, 32]),
      }).addTo(map!);

      m.bindPopup(`
        <div class="p-2">
          <p class="font-bold text-xs text-[#4A2E1B]">${anchor.name}</p>
          <p class="text-[11px] text-[#796658] mt-0.5">${language === 'tl' ? 'Punto ng Sakayan' : 'Transit Anchor'}</p>
        </div>
      `);
      anchorMarkers.push(m);
    });

    // 4. Render Live Roving Vendors
    liveVendors.forEach((vendor) => {
      const vendorIconHtml = `
        <div class="relative flex items-center justify-center cursor-pointer">
          <span class="absolute w-12 h-12 rounded-full bg-[#D97706]/20 animate-pulse"></span>
          <div class="w-10 h-10 rounded-2xl bg-[#D97706] text-white border-2 border-white shadow-lg flex items-center justify-center text-lg">
            ${vendor.icon}
          </div>
        </div>
      `;

      const m = L.marker([vendor.lat, vendor.lng], {
        icon: createCustomDivIcon(vendorIconHtml, '', [40, 40]),
        zIndexOffset: 600,
      }).addTo(map!);

      m.bindPopup(`
        <div class="p-2 text-center">
          <p class="font-extrabold text-sm text-[#4A2E1B]">${vendor.name}</p>
          <p class="text-xs text-[#D97706] font-bold mt-0.5">${language === 'tl' ? vendor.itemTl : vendor.item}</p>
          <div class="mt-2 text-xs bg-[#FEF3C7] text-[#4A2E1B] font-semibold px-2.5 py-1 rounded-full inline-block">
            ${vendor.distanceM}m • ~${vendor.etaMins} ${language === 'tl' ? 'minuto' : 'mins'}
          </div>
        </div>
      `);
      vendorMarkers.push(m);

      const vCircle = L.circle([vendor.lat, vendor.lng], {
        radius: 120,
        color: '#D97706',
        fillColor: '#D97706',
        fillOpacity: 0.12,
        weight: 1,
      }).addTo(map!);
      vendorCircles.push(vCircle);
    });
  }
</script>

<div class="w-full h-full relative rounded-[32px] overflow-hidden border border-[#EAE4D9] shadow-sm bg-[#FAF7F2]">
  <div bind:this={mapContainer} class="w-full h-full min-h-[400px] z-10"></div>
  
  <!-- Floating Top Helper Banner -->
  <div class="absolute top-4 left-4 z-20 bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-[#EAE4D9] text-xs font-semibold text-[#4A2E1B] flex items-center gap-2 shadow-xs select-none">
    <span class="w-2 h-2 rounded-full bg-[#D97706] animate-ping"></span>
    <span>{language === 'tl' ? 'I-tap ang kanto para sukatin ang pwesto' : 'Tap any corner to score foot-traffic'}</span>
  </div>

  <!-- Floating Map Legend -->
  <div class="absolute bottom-4 left-4 z-20 bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-[#EAE4D9] text-xs font-semibold text-[#4A2E1B] flex items-center gap-3.5 shadow-xs select-none">
    <div class="flex items-center gap-1.5">
      <span class="w-3 h-3 rounded-md bg-[#4A2E1B]"></span>
      <span>{language === 'tl' ? 'Piling Pwesto' : 'Selected Spot'}</span>
    </div>
    <div class="flex items-center gap-1.5">
      <span class="w-3 h-3 rounded-md bg-[#D97706]"></span>
      <span>{language === 'tl' ? 'Naglalako' : 'Vendor'}</span>
    </div>
    <div class="flex items-center gap-1.5">
      <span>🚐</span>
      <span>{language === 'tl' ? 'Sakayan' : 'Transit'}</span>
    </div>
  </div>
</div>
