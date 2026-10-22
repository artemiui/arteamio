<script lang="ts">
  import { onMount } from 'svelte';
  import type { BusinessArchetype, Language, LiveVendor, ViewMode } from './lib/types';
  import { BUSINESS_ARCHETYPES, INITIAL_LIVE_VENDORS, SAMPLE_COMPETITORS, SAMPLE_TRANSIT_ANCHORS } from './lib/data/spots';
  import { evaluateLocationViability } from './lib/gravity';

  import Navbar from './lib/components/Navbar.svelte';
  import MapView from './lib/components/MapView.svelte';
  import ViabilityCard from './lib/components/ViabilityCard.svelte';
  import BuyerRadar from './lib/components/BuyerRadar.svelte';
  import VendorBroadcast from './lib/components/VendorBroadcast.svelte';

  // Application State
  let currentView: ViewMode = 'pwesto';
  let language: Language = 'tl';
  let largeText: boolean = false;

  // Selected Coordinates (Default: UST Dapitan / Sampaloc area)
  let selectedLat: number = 14.6105;
  let selectedLng: number = 120.9890;

  let archetypes = BUSINESS_ARCHETYPES;
  let selectedArchetype: BusinessArchetype = BUSINESS_ARCHETYPES[0];
  let liveVendors: LiveVendor[] = INITIAL_LIVE_VENDORS;

  // Evaluate viability reactively
  $: viabilityResult = evaluateLocationViability(
    selectedLat,
    selectedLng,
    selectedArchetype,
    SAMPLE_TRANSIT_ANCHORS,
    SAMPLE_COMPETITORS
  );

  function handleSelectLocation(lat: number, lng: number) {
    selectedLat = Number(lat.toFixed(5));
    selectedLng = Number(lng.toFixed(5));
  }

  function handleSelectVendor(vendor: LiveVendor) {
    selectedLat = vendor.lat;
    selectedLng = vendor.lng;
  }

  // Pre-configured hot spots around UST for quick testing
  const HOT_SPOTS = [
    { name: 'UST Dapitan Gate', lat: 14.6115, lng: 120.9885 },
    { name: 'España Overpass', lat: 14.6072, lng: 120.9895 },
    { name: 'P. Noval Dorms', lat: 14.6075, lng: 120.9855 },
    { name: 'Lacson Terminal', lat: 14.6120, lng: 120.9930 },
  ];
</script>

<main class={`min-h-screen flex flex-col bg-[#FAF7F2] ${largeText ? 'text-lg' : 'text-base'}`}>
  <!-- Navigation Header -->
  <Navbar
    {currentView}
    {language}
    {largeText}
    onViewChange={(view) => (currentView = view)}
    onLanguageToggle={() => (language = language === 'tl' ? 'en' : 'tl')}
    onTextScaleToggle={() => (largeText = !largeText)}
  />

  <!-- Main Container -->
  <div class="flex-1 max-w-6xl w-full mx-auto p-3 sm:p-6 space-y-4">
    <!-- Interactive Map Section -->
    <div class="h-[360px] sm:h-[420px] w-full">
      <MapView
        centerLat={14.6095}
        centerLng={120.9895}
        {selectedLat}
        {selectedLng}
        transitAnchors={SAMPLE_TRANSIT_ANCHORS}
        {liveVendors}
        activeVendorRadarM={selectedArchetype.idealWalkingRadiusM}
        onSelectLocation={handleSelectLocation}
      />
    </div>

    <!-- Quick Location Shortcuts -->
    <div class="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
      <span class="text-[#796658] font-bold whitespace-nowrap pl-1">
        {language === 'tl' ? 'Subukan ang lugar:' : 'Quick Spots:'}
      </span>
      {#each HOT_SPOTS as spot}
        <button
          type="button"
          on:click={() => handleSelectLocation(spot.lat, spot.lng)}
          class={`px-3 py-1.5 rounded-full border text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
            Math.abs(selectedLat - spot.lat) < 0.0005 && Math.abs(selectedLng - spot.lng) < 0.0005
              ? 'bg-[#4A2E1B] text-[#FAF7F2] border-[#4A2E1B]'
              : 'bg-white text-[#4A2E1B] border-[#EFE9DF] hover:border-[#D97706]'
          }`}
        >
          📍 {spot.name}
        </button>
      {/each}
    </div>

    <!-- View-Specific Controls -->
    {#if currentView === 'pwesto'}
      <ViabilityCard
        {archetypes}
        {selectedArchetype}
        viability={viabilityResult}
        {language}
        onSelectArchetype={(a) => (selectedArchetype = a)}
      />
    {:else if currentView === 'radar'}
      <BuyerRadar
        vendors={liveVendors}
        {language}
        onSelectVendor={handleSelectVendor}
      />
    {:else if currentView === 'tinda'}
      <VendorBroadcast
        {language}
      />
    {/if}
  </div>

  <!-- Footer -->
  <footer class="w-full border-t border-[#EFE9DF] py-4 px-4 text-center text-xs text-[#796658] mt-8 bg-white/50">
    <div class="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
      <p>
        <strong>PwestoRadar</strong> — Developed for <strong>UST CSSPrint 2026</strong>
      </p>
      <p class="text-[11px]">
        {language === 'tl'
          ? 'Simpleng teknolohiya para sa bawat maninindang Pilipino.'
          : 'Accessible spatial technology for Filipino street entrepreneurs.'}
      </p>
    </div>
  </footer>
</main>
