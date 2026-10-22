<script lang="ts">
  import type { Language } from '../lib/types';
  import { PHILIPPINE_METRO_HUBS } from '../lib/data/spots';
  import Logo from '../lib/components/Logo.svelte';

  export let language: Language = 'tl';
  export let isDarkMode: boolean = false;
  export let onConfirmLocation: (locationName: string, lat: number, lng: number) => void;
  export let onNavigate: (route: string) => void;

  let searchQuery: string = 'Kasalukuyang Lokasyon (GPS)';
  let selectedLat: number = 14.6200;
  let selectedLng: number = 121.0530;
  let isDetectingGPS: boolean = false;

  function detectGPS() {
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      isDetectingGPS = true;
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          isDetectingGPS = false;
          selectedLat = Number(pos.coords.latitude.toFixed(5));
          selectedLng = Number(pos.coords.longitude.toFixed(5));
          searchQuery = language === 'tl' ? 'Aking Kasalukuyang Lokasyon (GPS)' : 'My Current Location (GPS)';
        },
        () => {
          isDetectingGPS = false;
        },
        { timeout: 7000 }
      );
    }
  }

  function handleSelectHub(hub: { name: string; region: string; lat: number; lng: number }) {
    searchQuery = `${hub.name}, ${hub.region}`;
    selectedLat = hub.lat;
    selectedLng = hub.lng;
  }

  function handleConfirm() {
    onConfirmLocation(searchQuery, selectedLat, selectedLng);
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
        {language === 'tl' ? 'Maghanap' : 'Search'}
      </span>
    </header>

    <div>
      <h1 class="text-2xl sm:text-3xl font-black tracking-tight">
        {language === 'tl' ? 'Pumili ng Lokasyon' : 'Select Location'}
      </h1>
      <p class={`text-xs sm:text-sm mt-1 font-medium ${isDarkMode ? 'text-[#D6C7B2]' : 'text-[#796658]'}`}>
        {language === 'tl'
          ? 'I-set ang iyong kanto o lungsod para makita ang mga naglalako sa paligid mo.'
          : 'Set your neighborhood to view active street vendors in the vicinity.'}
      </p>
    </div>

    <!-- Search Input Card -->
    <div class={`p-5 rounded-[28px] border space-y-3 ${
      isDarkMode ? 'bg-[#271A10] border-[#3D2717]' : 'bg-white border-[#EAE4D9]'
    }`}>
      <div class="relative">
        <span class="absolute inset-y-0 left-0 pl-4 flex items-center text-lg pointer-events-none">
          🔍
        </span>
        <input
          type="text"
          bind:value={searchQuery}
          placeholder="I-type ang kalye o lugar..."
          class={`w-full pl-12 pr-12 py-4 rounded-2xl border-2 text-sm sm:text-base font-bold outline-none ${
            isDarkMode
              ? 'bg-[#1A120B] border-[#3D2717] text-white focus:border-[#F59E0B]'
              : 'bg-[#FAF7F2] border-[#EAE4D9] text-[#4A2E1B] focus:border-[#4A2E1B]'
          }`}
        />
        <button
          type="button"
          on:click={detectGPS}
          class="absolute inset-y-0 right-0 pr-4 flex items-center text-lg text-[#D97706] cursor-pointer"
          title="Auto-detect GPS"
        >
          {isDetectingGPS ? '⏳' : '🎯'}
        </button>
      </div>

      <button
        type="button"
        on:click={detectGPS}
        class={`w-full py-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer ${
          isDarkMode
            ? 'bg-[#352317] border-[#3D2717] text-[#F59E0B]'
            : 'bg-[#FEF3C7] border-[#D97706]/30 text-[#4A2E1B]'
        }`}
      >
        <span>🎯</span>
        <span>{language === 'tl' ? 'Gamitin ang Aking Kasalukuyang GPS' : 'Use Current GPS'}</span>
      </button>
    </div>

    <!-- Major Hubs List -->
    <div class={`p-5 rounded-[28px] border space-y-3 ${
      isDarkMode ? 'bg-[#271A10] border-[#3D2717]' : 'bg-white border-[#EAE4D9]'
    }`}>
      <h2 class="text-xs font-bold uppercase tracking-wider text-[#796658]">
        {language === 'tl' ? 'Mga Kilalang Hub sa Pilipinas:' : 'Major Philippine Hubs:'}
      </h2>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {#each PHILIPPINE_METRO_HUBS as hub}
          <button
            type="button"
            on:click={() => handleSelectHub(hub)}
            class={`p-3 rounded-2xl border text-left flex items-center gap-3 transition cursor-pointer ${
              searchQuery.includes(hub.name)
                ? (isDarkMode ? 'bg-[#F59E0B] text-[#1A120B] border-[#F59E0B]' : 'bg-[#4A2E1B] text-white border-[#4A2E1B]')
                : (isDarkMode ? 'bg-[#352317] text-white border-[#3D2717]' : 'bg-[#FAF7F2] text-[#4A2E1B] border-[#EAE4D9]')
            }`}
          >
            <span class="text-xl">{hub.icon}</span>
            <div class="truncate">
              <p class="text-xs font-extrabold truncate">{hub.name}</p>
              <p class="text-[10px] opacity-75">{hub.region}</p>
            </div>
          </button>
        {/each}
      </div>
    </div>

    <!-- Confirm Button -->
    <button
      type="button"
      on:click={handleConfirm}
      class={`w-full py-4 rounded-2xl font-black text-sm sm:text-base shadow-md transition flex items-center justify-center gap-2 cursor-pointer min-h-[52px] ${
        isDarkMode
          ? 'bg-[#F59E0B] text-[#1A120B] hover:bg-[#D97706]'
          : 'bg-[#4A2E1B] text-white hover:bg-[#361F11]'
      }`}
    >
      <span>{language === 'tl' ? 'Itakda ang Lokasyon at Pumunta sa Mapa' : 'Set Location & View Map'}</span>
      <span>→</span>
    </button>
  </div>
</div>
