<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { Language, ProductType, TaggedVendor, UserSession } from '../types';
  import { PRODUCT_LEGEND } from '../data/spots';
  import Logo from './Logo.svelte';
  import L from 'leaflet';

  export let session: UserSession;
  export let vendors: TaggedVendor[];
  export let language: Language = 'tl';
  export let isDarkMode: boolean = false;
  export let onToggleDarkMode: () => void;
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

  // Selected filter (null = all)
  let activeFilter: ProductType | null = null;
  let selectedVendor: TaggedVendor | null = null;

  // Vendor sidebar / drawer open state
  let isSidebarOpen: boolean = session.role === 'vendor';
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

    // Zoom controls placed at bottom right
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    applyMapTileTheme();
    renderMapElements();
  });

  onDestroy(() => {
    if (map) {
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

    const tileUrl = isDarkMode
      ? 'https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

    tileLayer = L.tileLayer(tileUrl, {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);
  }

  $: filteredVendors = activeFilter
    ? vendors.filter((v) => v.productType === activeFilter)
    : vendors;

  $: if (map && (filteredVendors || session || isDarkMode)) {
    renderMapElements();
  }

  function renderMapElements() {
    if (!map) return;

    // 1. Render User's Location Pin (Google Maps Blue Dot / Pin)
    if (userMarker) map.removeLayer(userMarker);
    if (userCircle) map.removeLayer(userCircle);

    const userPinHtml = `
      <div class="relative flex items-center justify-center">
        <span class="absolute w-8 h-8 rounded-full ${isDarkMode ? 'bg-[#F59E0B]/30' : 'bg-[#4A2E1B]/20'} animate-ping"></span>
        <div class="w-7 h-7 rounded-full ${
          isDarkMode ? 'bg-[#F59E0B] text-[#1A120B]' : 'bg-[#4A2E1B] text-white'
        } border-2 border-white shadow-lg flex items-center justify-center text-xs font-black">
          ${session.role === 'vendor' ? '🛒' : '👤'}
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
            ${vendor.icon}
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
        map?.flyTo([vendor.lat, vendor.lng], 16, { duration: 0.5 });
      });

      vendorMarkers.push(m);
    });
  }

  function handleRecenterGPS() {
    if (map) {
      map.flyTo([session.lat, session.lng], 16, { duration: 0.6 });
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

  <!-- FLOATING TOP BAR (GOOGLE MAPS STYLE) -->
  <div class="absolute top-3 inset-x-3 sm:inset-x-6 z-30 pointer-events-none flex flex-col items-center gap-2">
    <!-- Top Search & Menu Pill -->
    <div class={`w-full max-w-xl backdrop-blur-md rounded-full border shadow-lg px-3 py-2 flex items-center justify-between gap-2 pointer-events-auto transition-colors ${
      isDarkMode
        ? 'bg-[#271A10]/95 border-[#3D2717] text-[#FAF7F2]'
        : 'bg-white/95 border-[#EAE4D9] text-[#4A2E1B]'
    }`}>
      <!-- Menu / Sidebar Toggle -->
      <button
        type="button"
        on:click={() => (isSidebarOpen = !isSidebarOpen)}
        class={`w-9 h-9 rounded-full transition flex items-center justify-center text-sm font-bold cursor-pointer shrink-0 ${
          isDarkMode ? 'bg-[#352317] hover:bg-[#4A2E1B] text-[#F59E0B]' : 'bg-[#FAF7F2] hover:bg-[#EAE4D9] text-[#4A2E1B]'
        }`}
        title="Toggle Menu / Options"
      >
        ☰
      </button>

      <!-- Logo Display in Search Bar -->
      <div class="hidden sm:block shrink-0">
        <Logo {isDarkMode} className="h-6 w-auto object-contain" />
      </div>

      <!-- Location Label / Search -->
      <button
        type="button"
        on:click={() => (onNavigateToSearch ? onNavigateToSearch() : handleRecenterGPS())}
        class="flex-1 flex items-center gap-2 text-left truncate cursor-pointer px-2"
        title="Pindutin para magpalit ng lugar"
      >
        <span class="text-base text-[#D97706]">📍</span>
        <div class="truncate">
          <p class="text-xs sm:text-sm font-extrabold truncate leading-tight">
            {session.locationName}
          </p>
          <p class={`text-[10px] font-semibold leading-tight ${isDarkMode ? 'text-[#D6C7B2]' : 'text-[#796658]'}`}>
            {session.role === 'vendor' ? (language === 'tl' ? 'Pwesto Mo' : 'Your Stall') : (language === 'tl' ? 'Lugar Mo (GPS)' : 'Your Spot')}
          </p>
        </div>
      </button>

      <!-- Recenter GPS Target Icon -->
      <button
        type="button"
        on:click={handleRecenterGPS}
        class="w-9 h-9 rounded-full bg-[#FEF3C7] text-[#D97706] hover:bg-[#FDE68A] transition flex items-center justify-center text-base cursor-pointer shrink-0"
        title="Center on me"
      >
        🎯
      </button>

      <!-- Settings Page Link Button -->
      {#if onNavigateToSettings}
        <button
          type="button"
          on:click={onNavigateToSettings}
          class={`w-9 h-9 rounded-full border flex items-center justify-center text-sm transition cursor-pointer shrink-0 ${
            isDarkMode
              ? 'bg-[#352317] border-[#3D2717] text-[#FAF7F2] hover:bg-[#4A2E1B]'
              : 'bg-[#FAF7F2] border-[#EAE4D9] text-[#4A2E1B] hover:bg-white'
          }`}
          title="Mga Setting"
        >
          ⚙️
        </button>
      {/if}

      <!-- Dark Mode Toggle Button -->
      <button
        type="button"
        on:click={onToggleDarkMode}
        class={`w-9 h-9 rounded-full border flex items-center justify-center text-sm transition cursor-pointer shrink-0 ${
          isDarkMode
            ? 'bg-[#352317] border-[#3D2717] text-[#F59E0B]'
            : 'bg-[#FAF7F2] border-[#EAE4D9] text-[#4A2E1B]'
        }`}
        title={isDarkMode ? 'Light Mode' : 'Dark Mode'}
        aria-label="Toggle Dark Mode"
      >
        <span>{isDarkMode ? '☀️' : '🌙'}</span>
      </button>

      <!-- Switch Role Pill -->
      <button
        type="button"
        on:click={onSwitchRole}
        class={`px-3 py-1.5 rounded-full border text-[11px] font-bold transition cursor-pointer shrink-0 ${
          isDarkMode
            ? 'bg-[#352317] border-[#3D2717] text-[#FAF7F2] hover:bg-[#4A2E1B]'
            : 'bg-[#FAF7F2] border-[#EAE4D9] text-[#4A2E1B] hover:bg-white'
        }`}
      >
        {session.role === 'vendor' ? '🛒 Tindero' : '🥣 Bibili'} ▾
      </button>
    </div>

    <!-- UNIVERSAL PRODUCT LEGEND BAR (HORIZONTAL FILTER PILLS) -->
    <div class="flex items-center gap-1.5 overflow-x-auto max-w-full px-2 py-1 pointer-events-auto">
      <button
        type="button"
        on:click={() => (activeFilter = null)}
        class={`px-3.5 py-1.5 rounded-full text-xs font-extrabold whitespace-nowrap shadow-sm transition-all cursor-pointer ${
          activeFilter === null
            ? (isDarkMode ? 'bg-[#F59E0B] text-[#1A120B]' : 'bg-[#4A2E1B] text-[#FAF7F2]')
            : (isDarkMode ? 'bg-[#271A10] text-[#FAF7F2] border border-[#3D2717]' : 'bg-white text-[#4A2E1B] border border-[#EAE4D9]')
        }`}
      >
        {language === 'tl' ? 'Lahat' : 'All'} ({vendors.length})
      </button>

      {#each PRODUCT_LEGEND as item}
        <button
          type="button"
          on:click={() => (activeFilter = activeFilter === item.type ? null : item.type)}
          class={`px-3.5 py-1.5 rounded-full text-xs font-extrabold whitespace-nowrap shadow-sm transition-all cursor-pointer flex items-center gap-1.5 ${
            activeFilter === item.type
              ? (isDarkMode ? 'bg-[#F59E0B] text-[#1A120B] scale-105' : 'bg-[#4A2E1B] text-[#FAF7F2] scale-105')
              : (isDarkMode ? 'bg-[#271A10] text-[#FAF7F2] border border-[#3D2717] hover:bg-[#352317]' : 'bg-white text-[#4A2E1B] border border-[#EAE4D9] hover:bg-[#FAF7F2]')
          }`}
        >
          <span>{item.icon}</span>
          <span>{language === 'tl' ? item.labelTl : item.labelEn}</span>
        </button>
      {/each}
    </div>
  </div>

  <!-- FLOATING ALERT TOAST (CHIME FEEDBACK) -->
  {#if alertToast}
    <div class={`absolute top-28 inset-x-4 sm:inset-x-auto sm:right-6 z-40 max-w-md p-4 rounded-2xl shadow-2xl flex items-center gap-3 border animate-bounce ${
      isDarkMode ? 'bg-[#271A10] text-white border-[#F59E0B]/40' : 'bg-[#4A2E1B] text-white border-white/20'
    }`}>
      <span class="text-2xl">🥣</span>
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
            {selectedVendor.icon}
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

  <!-- VENDOR SIDEBAR / BOTTOM DRAWER (FOR MAGTITINDA) -->
  {#if isSidebarOpen}
    <div class={`absolute inset-y-0 left-0 w-full sm:w-96 backdrop-blur-md border-r shadow-2xl z-40 p-5 sm:p-6 flex flex-col justify-between overflow-y-auto animate-fade-in transition-colors ${
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

        <!-- Dark Mode Toggle Row inside Sidebar -->
        <div class={`p-3 rounded-2xl border flex items-center justify-between ${
          isDarkMode ? 'bg-[#352317] border-[#3D2717]' : 'bg-[#FAF7F2] border-[#EAE4D9]'
        }`}>
          <div class="flex items-center gap-2">
            <span>{isDarkMode ? '🌙' : '☀️'}</span>
            <span class="text-xs font-bold">{isDarkMode ? 'Dark Mode Naka-on' : 'Light Mode'}</span>
          </div>
          <button
            type="button"
            on:click={onToggleDarkMode}
            class={`px-3 py-1 rounded-full text-xs font-bold border cursor-pointer ${
              isDarkMode ? 'bg-[#F59E0B] text-[#1A120B] border-[#F59E0B]' : 'bg-white text-[#4A2E1B] border-[#EAE4D9]'
            }`}
          >
            {isDarkMode ? 'Light' : 'Dark'}
          </button>
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
</div>
