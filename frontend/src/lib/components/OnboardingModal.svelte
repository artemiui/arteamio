<script lang="ts">
  import { onMount } from 'svelte';
  import type { Language, UserLocationProfile, UserRole } from '../types';
  import { PHILIPPINE_METRO_HUBS, type MetroHubPreset } from '../data/spots';
  import L from 'leaflet';

  export let language: Language = 'tl';
  export let onComplete: (profile: UserLocationProfile) => void;

  let step: 'role' | 'location' = 'role';
  let selectedRole: UserRole = 'customer';

  // Default coordinate (Araneta City / Cubao, Quezon City as a central PH metro transit hub)
  let currentLat: number = 14.6200;
  let currentLng: number = 121.0530;
  let locationName: string = 'Araneta City / Cubao, QC';
  let isLocatingGPS: boolean = false;
  let gpsError: string | null = null;

  let miniMapContainer: HTMLDivElement;
  let miniMap: L.Map | null = null;
  let miniMarker: L.Marker | null = null;

  function handleSelectRole(role: UserRole) {
    selectedRole = role;
    step = 'location';
  }

  function initMiniMap() {
    if (!miniMapContainer || miniMap) return;

    miniMap = L.map(miniMapContainer, {
      center: [currentLat, currentLng],
      zoom: 15,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
    }).addTo(miniMap);

    const pinIcon = L.divIcon({
      html: `
        <div class="relative flex items-center justify-center">
          <span class="absolute w-8 h-8 rounded-full bg-[#D97706]/30 animate-ping"></span>
          <div class="w-8 h-8 rounded-full bg-[#4A2E1B] text-white border-2 border-white shadow-lg flex items-center justify-center text-sm font-bold">
            📍
          </div>
        </div>
      `,
      className: 'custom-pin',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    miniMarker = L.marker([currentLat, currentLng], {
      icon: pinIcon,
      draggable: true,
    }).addTo(miniMap);

    miniMarker.on('dragend', (e: any) => {
      const pos = e.target.getLatLng();
      currentLat = Number(pos.lat.toFixed(5));
      currentLng = Number(pos.lng.toFixed(5));
      locationName = `${currentLat}, ${currentLng}`;
    });

    miniMap.on('click', (e: L.LeafletMouseEvent) => {
      currentLat = Number(e.latlng.lat.toFixed(5));
      currentLng = Number(e.latlng.lng.toFixed(5));
      if (miniMarker) {
        miniMarker.setLatLng([currentLat, currentLng]);
      }
      locationName = `${currentLat}, ${currentLng}`;
    });
  }

  $: if (step === 'location' && miniMapContainer && !miniMap) {
    setTimeout(() => {
      initMiniMap();
    }, 100);
  }

  function handleUseGPS() {
    if (!navigator.geolocation) {
      gpsError = language === 'tl'
        ? 'Hindi suportado ang GPS sa browser mo. Pumili nalang mula sa mga lungsod sa ibaba.'
        : 'Geolocation is not supported by your browser. Please select a city below.';
      return;
    }

    isLocatingGPS = true;
    gpsError = null;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        isLocatingGPS = false;
        currentLat = Number(position.coords.latitude.toFixed(5));
        currentLng = Number(position.coords.longitude.toFixed(5));
        locationName = language === 'tl' ? 'Aking GPS Lokasyon' : 'My Current GPS Location';

        if (miniMap && miniMarker) {
          miniMap.setView([currentLat, currentLng], 16);
          miniMarker.setLatLng([currentLat, currentLng]);
        }
      },
      (error) => {
        isLocatingGPS = false;
        gpsError = language === 'tl'
          ? 'Hindi nakuha ang GPS. Maaaring pumili mula sa mga kilalang lugar sa ibaba.'
          : 'Could not acquire GPS. You can pick from the preset hubs below.';
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  }

  function selectPresetHub(hub: MetroHubPreset) {
    currentLat = hub.lat;
    currentLng = hub.lng;
    locationName = `${hub.name}, ${hub.region}`;
    gpsError = null;

    if (miniMap && miniMarker) {
      miniMap.setView([currentLat, currentLng], 16);
      miniMarker.setLatLng([currentLat, currentLng]);
    }
  }

  function handleConfirm() {
    const profile: UserLocationProfile = {
      role: selectedRole,
      lat: currentLat,
      lng: currentLng,
      locationName: locationName || `${currentLat}, ${currentLng}`,
      source: isLocatingGPS ? 'gps' : 'manual',
      completedAt: new Date().toISOString(),
    };

    // Save to localStorage for return visits
    if (typeof window !== 'undefined') {
      localStorage.setItem('pwestoradar_profile', JSON.stringify(profile));
    }

    onComplete(profile);
  }
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[#4A2E1B]/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
  <div class="bg-white w-full max-w-xl rounded-[36px] border border-[#EAE4D9] shadow-2xl p-6 sm:p-8 space-y-6 my-auto text-[#4A2E1B]">
    
    <!-- Header with Taho Aesthetic -->
    <div class="text-center space-y-2">
      <div class="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#FEF3C7] text-[#D97706] text-xs font-bold border border-[#D97706]/20">
        <span>🇵🇭</span>
        <span>{language === 'tl' ? 'Maligayang Pagdating sa PwestoRadar' : 'Welcome to PwestoRadar'}</span>
      </div>
      <h2 class="text-2xl sm:text-3xl font-black text-[#4A2E1B] tracking-tight">
        {step === 'role'
          ? (language === 'tl' ? 'Sino ka sa komunidad?' : 'What brings you here?')
          : (language === 'tl' ? 'Saan ka nakabase?' : 'Where are you based?')}
      </h2>
      <p class="text-xs sm:text-sm text-[#796658] font-medium max-w-md mx-auto">
        {step === 'role'
          ? (language === 'tl'
              ? 'Piliin ang iyong gampanin para maiakma ang mga tool at alerto sa iyong kailangan.'
              : 'Choose your role so we can configure the optimal view and alerts for you.')
          : (language === 'tl'
              ? 'I-set ang iyong lugar para ma-tune ang mapa sa iyong barangay o lungsod.'
              : 'Set your location so we can calibrate local transit anchors and nearby street vendors.')}
      </p>
    </div>

    <!-- STEP 1: ROLE SELECTION -->
    {#if step === 'role'}
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <!-- Vendor Card -->
        <button
          type="button"
          on:click={() => handleSelectRole('vendor')}
          class="p-5 rounded-[28px] border-2 border-[#EAE4D9] hover:border-[#4A2E1B] bg-[#FAF7F2] hover:bg-white transition-all text-left group cursor-pointer flex flex-col justify-between min-h-[190px] shadow-xs active:scale-98"
        >
          <div>
            <div class="w-12 h-12 rounded-2xl bg-[#4A2E1B] text-[#FAF7F2] flex items-center justify-center text-2xl shadow-sm mb-3 group-hover:scale-105 transition-transform">
              🛒
            </div>
            <h3 class="text-lg font-black text-[#4A2E1B]">
              {language === 'tl' ? 'Nagtitinda Ako' : "I'm a Vendor"}
            </h3>
            <p class="text-xs text-[#796658] font-medium mt-1 leading-relaxed">
              {language === 'tl'
                ? 'Naghahanap ng magandang pwesto para sa cart o magbo-broadcast ng live ruta sa mga suki.'
                : 'Looking for high-yield stall locations or broadcasting live GPS route to nearby buyers.'}
            </p>
          </div>
          <div class="mt-4 pt-3 border-t border-[#EAE4D9] flex items-center justify-between text-xs font-bold text-[#D97706]">
            <span>{language === 'tl' ? 'Pwesto + Live Broadcast' : 'Viability + Broadcast'}</span>
            <span>→</span>
          </div>
        </button>

        <!-- Customer Card -->
        <button
          type="button"
          on:click={() => handleSelectRole('customer')}
          class="p-5 rounded-[28px] border-2 border-[#EAE4D9] hover:border-[#4A2E1B] bg-[#FAF7F2] hover:bg-white transition-all text-left group cursor-pointer flex flex-col justify-between min-h-[190px] shadow-xs active:scale-98"
        >
          <div>
            <div class="w-12 h-12 rounded-2xl bg-[#D97706] text-white flex items-center justify-center text-2xl shadow-sm mb-3 group-hover:scale-105 transition-transform">
              🥣
            </div>
            <h3 class="text-lg font-black text-[#4A2E1B]">
              {language === 'tl' ? 'Mamimili Ako' : "I'm a Customer"}
            </h3>
            <p class="text-xs text-[#796658] font-medium mt-1 leading-relaxed">
              {language === 'tl'
                ? 'Gusto kong makatanggap ng alerto kapag may dadaan na Taho o Balot para makapaghanda ng barya.'
                : 'Get notified before Kuya Taho or Balot passes by your street so you can ready cash & cups.'}
            </p>
          </div>
          <div class="mt-4 pt-3 border-t border-[#EAE4D9] flex items-center justify-between text-xs font-bold text-[#D97706]">
            <span>{language === 'tl' ? 'Buyer Radar + Proximity' : 'Buyer Radar + Alerts'}</span>
            <span>→</span>
          </div>
        </button>
      </div>

    <!-- STEP 2: LOCATION TUNING (RIDEHAILING STYLE) -->
    {:else}
      <div class="space-y-4">
        <!-- GPS One-Tap Button -->
        <button
          type="button"
          on:click={handleUseGPS}
          disabled={isLocatingGPS}
          class="w-full py-3.5 px-4 rounded-2xl bg-[#FEF3C7] border border-[#D97706]/30 text-[#4A2E1B] hover:bg-[#FDE68A] transition font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer shadow-xs min-h-[48px]"
        >
          <span class="text-lg">{isLocatingGPS ? '⏳' : '🎯'}</span>
          <span>
            {isLocatingGPS
              ? (language === 'tl' ? 'Kinukuha ang iyong GPS coordinates...' : 'Acquiring GPS location...')
              : (language === 'tl' ? 'Gamitin ang Aking Kasalukuyang Lokasyon (GPS)' : 'Use My Current Location (GPS)')}
          </span>
        </button>

        {#if gpsError}
          <p class="text-xs text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-200 text-center font-medium">
            {gpsError}
          </p>
        {/if}

        <!-- Interactive Pin Map -->
        <div class="relative w-full h-[200px] rounded-2xl overflow-hidden border border-[#EAE4D9] shadow-inner bg-[#FAF7F2]">
          <div bind:this={miniMapContainer} class="w-full h-full z-10"></div>
          <div class="absolute bottom-2 left-2 z-20 bg-white/95 px-2.5 py-1 rounded-xl border border-[#EAE4D9] text-[10px] font-bold text-[#4A2E1B] shadow-xs">
            📍 {locationName}
          </div>
        </div>
        <p class="text-[11px] text-[#796658] text-center font-medium">
          {language === 'tl' ? 'I-tap o i-drag ang pin sa mapa para itapat ang pwesto.' : 'Tap or drag pin to adjust your neighborhood.'}
        </p>

        <!-- Quick Major Metro Hubs -->
        <div>
          <span class="text-[11px] font-bold text-[#796658] uppercase tracking-wider block mb-2">
            {language === 'tl' ? 'O pumili mula sa mga kilalang lugar:' : 'Or choose a major hub:'}
          </span>
          <div class="flex flex-wrap gap-1.5">
            {#each PHILIPPINE_METRO_HUBS as hub}
              <button
                type="button"
                on:click={() => selectPresetHub(hub)}
                class={`px-3 py-1.5 rounded-full border text-xs font-semibold transition cursor-pointer flex items-center gap-1 min-h-[36px] ${
                  locationName.includes(hub.name)
                    ? 'bg-[#4A2E1B] text-white border-[#4A2E1B]'
                    : 'bg-white text-[#4A2E1B] border-[#EAE4D9] hover:bg-[#FAF7F2]'
                }`}
              >
                <span>{hub.icon}</span>
                <span>{hub.name}</span>
              </button>
            {/each}
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center gap-2 pt-2">
          <button
            type="button"
            on:click={() => (step = 'role')}
            class="px-4 py-3 rounded-2xl border border-[#EAE4D9] bg-white text-xs font-bold text-[#796658] hover:bg-[#FAF7F2] transition cursor-pointer min-h-[48px]"
          >
            ← {language === 'tl' ? 'Bumalik' : 'Back'}
          </button>

          <button
            type="button"
            on:click={handleConfirm}
            class="flex-1 py-3 px-5 rounded-2xl bg-[#4A2E1B] text-[#FAF7F2] hover:bg-[#361F11] font-black text-sm shadow-md transition cursor-pointer min-h-[48px] flex items-center justify-center gap-2 active:scale-98"
          >
            <span>{language === 'tl' ? 'Kumpirmahin at Simulan' : 'Confirm & Continue'}</span>
            <span>→</span>
          </button>
        </div>
      </div>
    {/if}
  </div>
</div>
