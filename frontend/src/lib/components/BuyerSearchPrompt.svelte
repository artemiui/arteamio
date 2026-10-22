<script lang="ts">
  import { onMount } from 'svelte';
  import type { Language } from '../types';
  import { searchOSM, type OSMSearchResult } from '../services/osmGeocoding';

  export let language: Language = 'tl';
  export let onConfirmLocation: (locationName: string, lat: number, lng: number) => void;
  export let onBack: () => void;

  let searchQuery: string = 'Kasalukuyang Lokasyon (GPS)';
  let detectedLat: number = 14.6200; // Default to central Metro Manila (Cubao)
  let detectedLng: number = 121.0530;
  let isDetectingGPS: boolean = false;
  let gpsStatus: 'active' | 'denied' | 'idle' = 'idle';

  // OSM Search
  let osmResults: OSMSearchResult[] = [];
  let isSearchingOSM: boolean = false;
  let searchDebounceTimer: any = null;

  onMount(() => {
    // Attempt automatic GPS on entry
    requestGPS();
  });

  function handleInput(e: Event) {
    const val = (e.target as HTMLInputElement).value;
    searchQuery = val;

    clearTimeout(searchDebounceTimer);
    if (!val || val.trim().length < 2) {
      osmResults = [];
      isSearchingOSM = false;
      return;
    }

    isSearchingOSM = true;
    searchDebounceTimer = setTimeout(async () => {
      osmResults = await searchOSM(val);
      isSearchingOSM = false;
    }, 280);
  }

  function selectOSM(res: OSMSearchResult) {
    detectedLat = res.lat;
    detectedLng = res.lng;
    searchQuery = res.subtitle ? `${res.name}, ${res.subtitle}` : res.name;
    osmResults = [];
    handleSubmit();
  }

  async function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (osmResults.length > 0) {
        selectOSM(osmResults[0]);
      } else if (searchQuery.trim().length >= 2) {
        isSearchingOSM = true;
        const res = await searchOSM(searchQuery);
        isSearchingOSM = false;
        if (res.length > 0) {
          selectOSM(res[0]);
        } else {
          handleSubmit();
        }
      }
    }
  }

  function requestGPS() {
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      isDetectingGPS = true;
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          isDetectingGPS = false;
          gpsStatus = 'active';
          detectedLat = Number(pos.coords.latitude.toFixed(5));
          detectedLng = Number(pos.coords.longitude.toFixed(5));
          searchQuery = language === 'tl' ? 'Aking Kasalukuyang Lokasyon (GPS)' : 'My Current Location (GPS)';
          osmResults = [];
        },
        () => {
          isDetectingGPS = false;
          gpsStatus = 'denied';
        },
        { timeout: 7000 }
      );
    }
  }

  const POPULAR_LOCATIONS = [
    { name: 'Araneta / Cubao', lat: 14.6200, lng: 121.0530 },
    { name: 'España / Sampaloc', lat: 14.6091, lng: 120.9898 },
    { name: 'Ayala, Makati', lat: 14.5547, lng: 121.0244 },
    { name: 'BGC, Taguig', lat: 14.5490, lng: 121.0495 },
    { name: 'Taft Ave, Manila', lat: 14.5700, lng: 120.9920 },
    { name: 'Cebu IT Park', lat: 10.3283, lng: 123.9061 },
    { name: 'Roxas, Davao', lat: 7.0673, lng: 125.6083 },
  ];

  function selectShortcut(spot: { name: string; lat: number; lng: number }) {
    searchQuery = spot.name;
    detectedLat = spot.lat;
    detectedLng = spot.lng;
    osmResults = [];
  }

  function handleSubmit() {
    onConfirmLocation(searchQuery, detectedLat, detectedLng);
  }
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#4A2E1B]/60 backdrop-blur-sm animate-fade-in">
  <div class="bg-white w-full max-w-lg rounded-[36px] border border-[#EAE4D9] shadow-2xl p-6 sm:p-8 space-y-6 text-[#4A2E1B] max-h-[92vh] overflow-y-auto">
    <!-- Header -->
    <div class="text-center space-y-1">
      <span class="text-3xl">🥣</span>
      <h2 class="text-2xl sm:text-3xl font-black text-[#4A2E1B] tracking-tight">
        {language === 'tl' ? 'Saan Ka Bibili?' : 'Where are you buying?'}
      </h2>
      <p class="text-xs sm:text-sm text-[#796658] font-medium">
        {language === 'tl'
          ? 'Maghanap ng lugar gamit ang OpenStreetMap (hal. UP Diliman) o gamitin ang GPS.'
          : 'Search any location via OpenStreetMap (e.g. UP Diliman) or use GPS.'}
      </p>
    </div>

    <!-- Ride-hailing / Google Maps Style Search Input -->
    <div class="space-y-3">
      <div class="relative">
        <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-xl">
          🔍
        </div>
        <input
          type="text"
          value={searchQuery}
          on:input={handleInput}
          on:keydown={handleKeyDown}
          placeholder={language === 'tl' ? 'I-type ang kalye o lugar (hal. UP Diliman)...' : 'Type place (e.g. UP Diliman)...'}
          class="w-full pl-12 pr-12 py-4 rounded-2xl bg-[#FAF7F2] border-2 border-[#EAE4D9] focus:border-[#4A2E1B] text-sm sm:text-base font-bold text-[#4A2E1B] outline-none shadow-inner"
        />
        <!-- GPS Re-detect Button inside input -->
        <button
          type="button"
          on:click={requestGPS}
          title={language === 'tl' ? 'Gamitin ang GPS' : 'Use GPS'}
          class="absolute inset-y-0 right-0 pr-4 flex items-center text-lg text-[#D97706] hover:scale-110 transition cursor-pointer"
        >
          {isDetectingGPS ? '⏳' : isSearchingOSM ? '🔄' : '🎯'}
        </button>
      </div>

      <!-- Real-time OSM Results Dropdown -->
      {#if isSearchingOSM}
        <div class="p-2 text-center text-xs font-bold text-[#D97706] flex items-center justify-center gap-2">
          <span class="animate-spin">🔄</span>
          <span>Naghahanap sa OpenStreetMap...</span>
        </div>
      {:else if osmResults.length > 0}
        <div class="rounded-2xl border border-[#EAE4D9] bg-[#FAF7F2] p-2 space-y-1 shadow-sm max-h-48 overflow-y-auto">
          <div class="px-2 pt-1 text-[10px] font-black uppercase text-[#D97706]">
            OpenStreetMap:
          </div>
          {#each osmResults as res}
            <button
              type="button"
              on:click={() => selectOSM(res)}
              class="w-full p-2 rounded-xl text-left hover:bg-white flex items-start gap-2 transition cursor-pointer"
            >
              <span class="text-sm mt-0.5">📍</span>
              <div class="truncate flex-1">
                <p class="text-xs font-black truncate">{res.name}</p>
                <p class="text-[10px] text-[#796658] truncate">{res.subtitle}</p>
              </div>
              <span class="text-[10px] font-bold text-[#D97706] self-center">Piliin →</span>
            </button>
          {/each}
        </div>
      {/if}

      {#if gpsStatus === 'active'}
        <div class="text-[11px] text-[#D97706] font-bold flex items-center gap-1.5 px-2">
          <span class="w-2 h-2 rounded-full bg-[#D97706] animate-pulse"></span>
          <span>{language === 'tl' ? 'Aktibo ang GPS ng iyong cellphone' : 'GPS location acquired'}</span>
        </div>
      {:else if gpsStatus === 'denied'}
        <div class="text-[11px] text-[#796658] font-medium px-2">
          {language === 'tl'
            ? 'Naka-off ang GPS. Maaari kang mag-type o pumili sa mga lugar sa ibaba.'
            : 'GPS off. You can type or pick from the popular areas below.'}
        </div>
      {/if}
    </div>

    <!-- Quick Location Chips -->
    <div>
      <span class="text-[11px] font-bold uppercase tracking-wider text-[#796658] block mb-2">
        {language === 'tl' ? 'Mabilisang Piliin:' : 'Quick Shortcuts:'}
      </span>
      <div class="flex flex-wrap gap-1.5">
        {#each POPULAR_LOCATIONS as spot}
          <button
            type="button"
            on:click={() => selectShortcut(spot)}
            class={`px-3 py-1.5 rounded-full border text-xs font-semibold transition cursor-pointer ${
              searchQuery === spot.name
                ? 'bg-[#4A2E1B] text-white border-[#4A2E1B]'
                : 'bg-[#FAF7F2] text-[#4A2E1B] border-[#EAE4D9] hover:bg-[#F3EDE2]'
            }`}
          >
            {spot.name}
          </button>
        {/each}
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="flex items-center gap-3 pt-2">
      <button
        type="button"
        on:click={onBack}
        class="flex-1 py-4 rounded-2xl border border-[#EAE4D9] text-[#796658] font-bold text-sm hover:bg-[#FAF7F2] transition cursor-pointer text-center"
      >
        {language === 'tl' ? 'Bumalik' : 'Back'}
      </button>

      <button
        type="button"
        on:click={handleSubmit}
        class="flex-2 py-4 rounded-2xl bg-[#4A2E1B] text-white font-extrabold text-sm shadow-md hover:bg-[#361F11] transition flex items-center justify-center gap-2 cursor-pointer"
      >
        <span>{language === 'tl' ? 'Pumunta sa Mapa' : 'View on Map'}</span>
        <span>→</span>
      </button>
    </div>
  </div>
</div>
