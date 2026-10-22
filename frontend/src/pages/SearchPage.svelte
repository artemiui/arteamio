<script lang="ts">
  import type { Language } from '../lib/types';
  import { PHILIPPINE_METRO_HUBS } from '../lib/data/spots';
  import { searchOSM, type OSMSearchResult } from '../lib/services/osmGeocoding';
  import Logo from '../lib/components/Logo.svelte';
  import Icon from '../lib/components/Icon.svelte';

  export let language: Language = 'tl';
  export let isDarkMode: boolean = false;
  export let onConfirmLocation: (locationName: string, lat: number, lng: number) => void;
  export let onNavigate: (route: string) => void;

  let searchQuery: string = '';
  let selectedLat: number = 14.6200;
  let selectedLng: number = 121.0530;
  let selectedLocationName: string = '';
  let isDetectingGPS: boolean = false;

  // OSM Search State
  let osmResults: OSMSearchResult[] = [];
  let isSearchingOSM: boolean = false;
  let searchDebounceTimer: any = null;

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
      const results = await searchOSM(val);
      osmResults = results;
      isSearchingOSM = false;
    }, 280);
  }

  function handleSelectOSM(res: OSMSearchResult) {
    selectedLat = res.lat;
    selectedLng = res.lng;
    selectedLocationName = res.subtitle ? `${res.name}, ${res.subtitle}` : res.name;
    searchQuery = selectedLocationName;
    osmResults = [];
    handleConfirm();
  }

  async function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (osmResults.length > 0) {
        handleSelectOSM(osmResults[0]);
      } else if (searchQuery.trim().length >= 2) {
        isSearchingOSM = true;
        const results = await searchOSM(searchQuery);
        isSearchingOSM = false;
        if (results.length > 0) {
          handleSelectOSM(results[0]);
        } else {
          handleConfirm();
        }
      }
    }
  }

  function detectGPS() {
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      isDetectingGPS = true;
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          isDetectingGPS = false;
          selectedLat = Number(pos.coords.latitude.toFixed(5));
          selectedLng = Number(pos.coords.longitude.toFixed(5));
          selectedLocationName = language === 'tl' ? 'Aking Kasalukuyang Lokasyon (GPS)' : 'My Current Location (GPS)';
          searchQuery = selectedLocationName;
          osmResults = [];
        },
        () => {
          isDetectingGPS = false;
        },
        { timeout: 7000 }
      );
    }
  }

  function handleSelectHub(hub: { name: string; region: string; lat: number; lng: number }) {
    selectedLocationName = `${hub.name}, ${hub.region}`;
    searchQuery = selectedLocationName;
    selectedLat = hub.lat;
    selectedLng = hub.lng;
    osmResults = [];
  }

  function handleConfirm() {
    const finalName = selectedLocationName || searchQuery.trim() || (language === 'tl' ? 'España / Sampaloc, Manila' : 'España, Manila');
    onConfirmLocation(finalName, selectedLat, selectedLng);
    onNavigate('map');
  }
</script>

<div class={`min-h-screen p-4 sm:p-8 flex flex-col justify-between transition-colors duration-300 ${
  isDarkMode ? 'bg-[#1A120B] text-[#FAF7F2]' : 'bg-[#FAF7F2] text-[#4A2E1B]'
}`}>
  <div class="max-w-xl w-full mx-auto space-y-6">
    <!-- Header -->
    <header class="flex items-center justify-between pb-4 border-b border-[#EAE4D9] dark:border-[#3D2717]">
      <button
        type="button"
        on:click={() => onNavigate('map')}
        class={`px-4 py-2 rounded-full border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
          isDarkMode ? 'bg-[#271A10] border-[#3D2717] text-white' : 'bg-white border-[#EAE4D9] text-[#4A2E1B]'
        }`}
      >
        <span>←</span>
        <span>{language === 'tl' ? 'Bumalik sa Mapa' : 'Back'}</span>
      </button>

      <button
        type="button"
        on:click={() => onNavigate('landing')}
        class="cursor-pointer transition-transform active:scale-95 flex items-center"
        title="Bumalik sa Simula"
      >
        <Logo {isDarkMode} className="h-7 w-auto object-contain" />
      </button>

      <span class="text-xs font-bold text-[#D97706]">
        {language === 'tl' ? 'OpenStreetMap' : 'OpenStreetMap'}
      </span>
    </header>

    <div>
      <h1 class="text-2xl sm:text-3xl font-black tracking-tight">
        {language === 'tl' ? 'Pumili ng Lokasyon' : 'Select Location'}
      </h1>
      <p class={`text-xs sm:text-sm mt-1 font-medium ${isDarkMode ? 'text-[#D6C7B2]' : 'text-[#796658]'}`}>
        {language === 'tl'
          ? 'Maghanap ng kahit anong lugar sa Pilipinas gamit ang OpenStreetMap, o pumili sa mga karaniwang sakayan sa ibaba.'
          : 'Search any place in the Philippines via OpenStreetMap, or pick from the common commuter presets below.'}
      </p>
    </div>

    <!-- Search Input Card -->
    <div class={`p-5 rounded-[28px] border space-y-3 ${
      isDarkMode ? 'bg-[#271A10] border-[#3D2717]' : 'bg-white border-[#EAE4D9]'
    }`}>
      <div class="relative flex items-center">
        <span class={`absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none ${
          isDarkMode ? 'text-[#D6C7B2]' : 'text-[#796658]'
        }`}>
          <Icon name="search" size={20} />
        </span>
        <input
          type="text"
          value={searchQuery}
          on:input={handleInput}
          on:keydown={handleKeyDown}
          placeholder={language === 'tl' ? 'I-type ang lugar (hal. UP Diliman)...' : 'Search place (e.g. UP Diliman)...'}
          class={`w-full pl-12 pr-10 py-4 rounded-2xl border-2 text-sm sm:text-base font-bold outline-none transition-colors ${
            isDarkMode
              ? 'bg-[#1A120B] border-[#3D2717] text-white focus:border-[#F59E0B]'
              : 'bg-[#FAF7F2] border-[#EAE4D9] text-[#4A2E1B] focus:border-[#4A2E1B]'
          }`}
        />
        {#if isSearchingOSM}
          <span class="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-[#D97706] animate-spin">
            <Icon name="refresh" size={18} />
          </span>
        {/if}
      </div>

      <!-- Real-time OSM Results Dropdown List -->
      {#if isSearchingOSM}
        <div class="p-3 text-center text-xs font-bold text-[#D97706] flex items-center justify-center gap-2">
          <span class="animate-spin"><Icon name="refresh" size={14} /></span>
          <span>{language === 'tl' ? 'Naghahanap sa OpenStreetMap...' : 'Searching OpenStreetMap...'}</span>
        </div>
      {:else if osmResults.length > 0}
        <div class={`rounded-2xl border p-2 space-y-1.5 shadow-sm max-h-60 overflow-y-auto ${
          isDarkMode ? 'bg-[#1A120B] border-[#3D2717]' : 'bg-[#FAF7F2] border-[#EAE4D9]'
        }`}>
          <div class="px-2 pt-1 text-[10px] font-black uppercase text-[#D97706] tracking-wider">
            {language === 'tl' ? 'Mga Resulta mula sa OpenStreetMap:' : 'Results from OpenStreetMap:'}
          </div>
          {#each osmResults as res}
            <button
              type="button"
              on:click={() => handleSelectOSM(res)}
              class={`w-full p-2.5 rounded-xl text-left flex items-start gap-2.5 transition cursor-pointer active:scale-98 ${
                isDarkMode ? 'hover:bg-[#271A10] text-[#FAF7F2]' : 'hover:bg-white text-[#4A2E1B]'
              }`}
            >
              <span class="mt-0.5"><Icon name="map-pin" size={16} /></span>
              <div class="truncate flex-1">
                <p class="text-xs font-black truncate">{res.name}</p>
                <p class={`text-[11px] truncate ${isDarkMode ? 'text-[#D6C7B2]' : 'text-[#796658]'}`}>{res.subtitle}</p>
              </div>
              <span class="text-[11px] font-bold text-[#D97706] self-center shrink-0">
                {language === 'tl' ? 'Piliin →' : 'Select →'}
              </span>
            </button>
          {/each}
        </div>
      {/if}

      <!-- Under search: Finalize button with a small rounded square button next to it for current location -->
      <div class="flex items-center gap-2.5 pt-1">
        <button
          type="button"
          on:click={handleConfirm}
          class={`flex-1 py-3.5 px-4 rounded-2xl font-black text-sm sm:text-base shadow-md transition flex items-center justify-center gap-2 cursor-pointer min-h-[50px] active:scale-98 ${
            isDarkMode
              ? 'bg-[#F59E0B] text-[#1A120B] hover:bg-[#D97706]'
              : 'bg-[#4A2E1B] text-white hover:bg-[#361F11]'
          }`}
        >
          <span>{language === 'tl' ? 'Itakda ang Lokasyon at Pumunta sa Mapa' : 'Set Location & View Map'}</span>
          <span>→</span>
        </button>

        <button
          type="button"
          on:click={detectGPS}
          disabled={isDetectingGPS}
          class={`w-[50px] h-[50px] rounded-2xl border-2 flex items-center justify-center shrink-0 transition shadow-sm cursor-pointer active:scale-95 ${
            isDetectingGPS ? 'animate-pulse' : ''
          } ${
            isDarkMode
              ? 'bg-[#352317] border-[#3D2717] text-[#F59E0B] hover:bg-[#452B14]'
              : 'bg-[#FEF3C7] border-[#D97706]/40 text-[#4A2E1B] hover:bg-[#FDE68A]'
          }`}
          title={language === 'tl' ? 'Gamitin ang Aking Kasalukuyang GPS' : 'Use Current Location'}
          aria-label={language === 'tl' ? 'Kasalukuyang Lokasyon' : 'Current Location'}
        >
          <Icon name="location-center" size={22} />
        </button>
      </div>
    </div>

    <!-- Common Commuter Presets List (without icons) -->
    <div class={`p-5 rounded-[28px] border space-y-3 ${
      isDarkMode ? 'bg-[#271A10] border-[#3D2717]' : 'bg-white border-[#EAE4D9]'
    }`}>
      <h2 class="text-xs font-bold uppercase tracking-wider text-[#796658]">
        {language === 'tl' ? 'Mga Karaniwang Sakayan at Hub (Presets):' : 'Common Commuter Hubs (Presets):'}
      </h2>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {#each PHILIPPINE_METRO_HUBS as hub}
          <button
            type="button"
            on:click={() => handleSelectHub(hub)}
            class={`p-3.5 rounded-2xl border text-left flex flex-col justify-center transition cursor-pointer ${
              searchQuery.includes(hub.name)
                ? (isDarkMode ? 'bg-[#F59E0B] text-[#1A120B] border-[#F59E0B]' : 'bg-[#4A2E1B] text-white border-[#4A2E1B]')
                : (isDarkMode ? 'bg-[#352317] text-white border-[#3D2717]' : 'bg-[#FAF7F2] text-[#4A2E1B] border-[#EAE4D9]')
            }`}
          >
            <p class="text-xs font-extrabold truncate">{hub.name}</p>
            <p class="text-[10px] opacity-75">{hub.region}</p>
          </button>
        {/each}
      </div>
    </div>
  </div>
</div>
