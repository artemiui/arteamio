<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { LiveVendor, TransitAnchor } from '../types';
  import L from 'leaflet';

  export let centerLat: number = 14.6091;
  export let centerLng: number = 120.9898;
  export let selectedLat: number = 14.6091;
  export let selectedLng: number = 120.9898;
  export let transitAnchors: TransitAnchor[] = [];
  export let liveVendors: LiveVendor[] = [];
  export let activeVendorRadarM: number = 200;
  export let onSelectLocation: (lat: number, lng: number) => void;

  let mapContainer: HTMLDivElement;
  let map: L.Map | null = null;
  let targetMarker: L.Marker | null = null;
  let targetCircle: L.Circle | null = null;
  let vendorMarkers: L.Marker[] = [];
  let vendorCircles: L.Circle[] = [];
  let anchorMarkers: L.Marker[] = [];

  function createCustomDivIcon(html: string, className: string = '', iconSize: [number, number] = [36, 36]) {
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

    // CartoDB Positron tiles for a clean, warm minimalist style matching the Taho palette
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 19,
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

  // Reactive updates when selected coordinates or data changes
  $: if (map && (selectedLat || selectedLng || transitAnchors || liveVendors)) {
    renderAllMarkers();
  }

  function renderAllMarkers() {
    if (!map) return;

    // 1. Target candidate spot marker
    if (targetMarker) map.removeLayer(targetMarker);
    if (targetCircle) map.removeLayer(targetCircle);

    const targetIconHtml = `
      <div class="relative flex items-center justify-center">
        <span class="absolute w-8 h-8 rounded-full bg-[#D97706]/30 animate-ping"></span>
        <div class="w-8 h-8 rounded-full bg-[#4A2E1B] text-[#FAF7F2] border-2 border-white flex items-center justify-center shadow-lg text-sm font-bold">
          📍
        </div>
      </div>
    `;

    targetMarker = L.marker([selectedLat, selectedLng], {
      icon: createCustomDivIcon(targetIconHtml, '', [32, 32]),
      zIndexOffset: 1000,
    }).addTo(map);

    targetCircle = L.circle([selectedLat, selectedLng], {
      radius: activeVendorRadarM,
      color: '#D97706',
      fillColor: '#D97706',
      fillOpacity: 0.08,
      weight: 1.5,
      dashArray: '4, 4',
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
        <div class="w-7 h-7 rounded-full bg-white text-[#4A2E1B] border border-[#EFE9DF] shadow-sm flex items-center justify-center text-xs" title="${anchor.name}">
          ${iconEmoji}
        </div>
      `;

      const m = L.marker([anchor.lat, anchor.lng], {
        icon: createCustomDivIcon(anchorIconHtml, '', [28, 28]),
      }).addTo(map!);

      m.bindPopup(`
        <div class="p-1">
          <p class="font-bold text-xs text-[#4A2E1B]">${anchor.name}</p>
          <p class="text-[10px] text-[#796658]">Transit Anchor (Weight: ${anchor.weight * 100}%)</p>
        </div>
      `);
      anchorMarkers.push(m);
    });

    // 4. Render Live Roving Vendors
    liveVendors.forEach((vendor) => {
      const vendorIconHtml = `
        <div class="relative flex items-center justify-center">
          <span class="absolute w-10 h-10 rounded-full bg-[#D97706]/20 animate-pulse"></span>
          <div class="w-9 h-9 rounded-2xl bg-[#D97706] text-white border-2 border-white shadow-md flex items-center justify-center text-base cursor-pointer">
            ${vendor.icon}
          </div>
        </div>
      `;

      const m = L.marker([vendor.lat, vendor.lng], {
        icon: createCustomDivIcon(vendorIconHtml, '', [36, 36]),
        zIndexOffset: 500,
      }).addTo(map!);

      m.bindPopup(`
        <div class="p-1.5 text-center">
          <p class="font-bold text-sm text-[#4A2E1B]">${vendor.name}</p>
          <p class="text-xs text-[#D97706] font-semibold">${vendor.itemTl}</p>
          <div class="mt-1 text-[11px] bg-[#FEF3C7] text-[#4A2E1B] px-2 py-0.5 rounded-full inline-block">
            ${vendor.distanceM}m layo (${vendor.etaMins} mins)
          </div>
        </div>
      `);
      vendorMarkers.push(m);

      // Radar range circle around vendor
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

<div class="w-full h-full relative rounded-3xl overflow-hidden border border-[#EFE9DF] shadow-inner">
  <div bind:this={mapContainer} class="w-full h-full min-h-[380px] z-10"></div>
  
  <!-- Map Legend / Helper Overlay -->
  <div class="absolute bottom-3 left-3 z-20 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-2xl border border-[#EFE9DF] text-[11px] text-[#4A2E1B] flex items-center gap-3 shadow-sm">
    <span class="inline-flex items-center gap-1">
      <span class="w-2.5 h-2.5 rounded-full bg-[#4A2E1B]"></span>
      Pwesto
    </span>
    <span class="inline-flex items-center gap-1">
      <span class="w-2.5 h-2.5 rounded-full bg-[#D97706]"></span>
      May Tinda
    </span>
    <span class="inline-flex items-center gap-1">
      <span>🚐</span>
      Sakayan
    </span>
  </div>
</div>
