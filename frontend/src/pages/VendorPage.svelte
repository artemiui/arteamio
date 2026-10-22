<script lang="ts">
  import type { Language, ProductType, UserSession, BusinessArchetype, DemandHotspot } from '../lib/types';
  import Logo from '../lib/components/Logo.svelte';
  import { BUSINESS_ARCHETYPES, generateAnchorsAround, generateCompetitorsAround } from '../lib/data/spots';
  import { getAllDemandHotspots, HOTSPOT_CATEGORY_META, HOTSPOT_LEVEL_META } from '../lib/data/hotspots';
  import { evaluateLocationViability } from '../lib/gravity';
  import HotspotConfigModal from '../lib/components/HotspotConfigModal.svelte';

  export let language: Language = 'tl';
  export let isDarkMode: boolean = false;
  export let session: UserSession;
  export let onUpdateProduct: (product: string) => void;
  export let onNavigate: (route: string) => void;
  export let onRequestSwitchRole: (() => void) | undefined = undefined;

  let vendorStatus: 'live' | 'stopped' | 'sold_out' = 'live';
  let audienceCount: number = 22;
  let activeProduct: string = session.product || 'Taho';
  let uploadedPhoto: string | null = session.verifiedPhoto || null;
  let showConfigModal: boolean = false;
  let hotspots: DemandHotspot[] = getAllDemandHotspots(session.lat, session.lng);

  function reloadHotspots() {
    hotspots = getAllDemandHotspots(session.lat, session.lng);
  }

  // Huff Gravity Model Viability Evaluation
  let anchors = generateAnchorsAround(session.lat, session.lng);
  let competitors = generateCompetitorsAround(session.lat, session.lng);
  let selectedArchetype: BusinessArchetype =
    BUSINESS_ARCHETYPES.find((a) => a.id === session.product?.toLowerCase()) || BUSINESS_ARCHETYPES[2]; // default Taho

  $: viability = evaluateLocationViability(
    session.lat,
    session.lng,
    selectedArchetype,
    anchors,
    competitors
  );

  const PRODUCTS = [
    { name: 'Taho', icon: '🥣' },
    { name: 'Siomai', icon: '🥡' },
    { name: 'Balut', icon: '🥚' },
    { name: 'Kape / Merienda', icon: '⭐' },
  ];

  function setProduct(prod: string) {
    activeProduct = prod;
    onUpdateProduct(prod);
  }

  function handlePhotoUpload(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        uploadedPhoto = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  }
</script>

<div class={`min-h-screen p-4 sm:p-8 flex flex-col justify-between transition-colors duration-300 ${
  isDarkMode ? 'bg-[#1A120B] text-[#FAF7F2]' : 'bg-[#FAF7F2] text-[#4A2E1B]'
}`}>
  <div class="max-w-2xl w-full mx-auto space-y-6">
    <!-- Header -->
    <header class="flex items-center justify-between pb-4 border-b border-[#EAE4D9] dark:border-[#3D2717]">
      <button
        type="button"
        on:click={() => onNavigate('map')}
        class={`px-4 py-2 rounded-full border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
          isDarkMode
            ? 'bg-[#271A10] border-[#3D2717] text-[#FAF7F2] hover:bg-[#352317]'
            : 'bg-white border-[#EAE4D9] text-[#4A2E1B] hover:bg-[#FAF7F2]'
        }`}
      >
        <span>🗺️</span>
        <span>{language === 'tl' ? 'Tingnan sa Mapa' : 'View on Map'}</span>
      </button>

      <button
        type="button"
        on:click={() => onNavigate('landing')}
        class="cursor-pointer transition-transform active:scale-95 flex items-center"
        title="Bumalik sa Simula"
      >
        <Logo {isDarkMode} className="h-7 w-auto object-contain" />
      </button>

      <button
        type="button"
        on:click={() => onNavigate('settings')}
        class={`w-9 h-9 rounded-full border flex items-center justify-center text-sm ${
          isDarkMode ? 'bg-[#271A10] border-[#3D2717]' : 'bg-white border-[#EAE4D9]'
        }`}
        title="Settings"
      >
        ⚙️
      </button>
    </header>

    <!-- Page Title -->
    <div>
      <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 text-green-600 text-xs font-bold mb-2">
        <span class="w-2 h-2 rounded-full bg-green-500 animate-ping"></span>
        <span>{language === 'tl' ? 'Aktibo ang Tindahan' : 'Vendor Console Active'}</span>
      </div>
      <h1 class="text-2xl sm:text-3xl font-black tracking-tight">
        {language === 'tl' ? 'Dashboard ng Tindero' : 'Vendor Dashboard'}
      </h1>
      <p class={`text-xs sm:text-sm mt-1 font-medium ${isDarkMode ? 'text-[#D6C7B2]' : 'text-[#796658]'}`}>
        {session.locationName}
      </p>
    </div>

    <!-- MAIN AND FIRST ANALYTIC: "Saan Magandang Pepwesto?" WITH RATING CATEGORY -->
    <div class={`p-6 sm:p-7 rounded-[32px] shadow-md space-y-5 border-2 transition-all ${
      viability.score >= 75
        ? (isDarkMode ? 'bg-[#271A10] border-[#F59E0B]/50' : 'bg-white border-[#D97706]/40 shadow-amber-500/5')
        : (isDarkMode ? 'bg-[#271A10] border-[#3D2717]' : 'bg-white border-[#EAE4D9]')
    }`}>
      <!-- Header with Prominent Category Badge -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-black/5 dark:border-white/10">
        <div>
          <span class="text-xs font-black uppercase tracking-wider text-[#D97706] flex items-center gap-1.5">
            <span>🎯</span>
            <span>{language === 'tl' ? 'Pangunahing Gabay sa Pwesto' : 'Primary Stall Viability Intel'}</span>
          </span>
          <h2 class="text-xl sm:text-2xl font-black mt-1">
            {language === 'tl' ? 'Saan Magandang Pepwesto?' : 'Where Should You Set Up?'}
          </h2>
        </div>

        <!-- Rating Category Badge -->
        <div class="flex items-center gap-2 shrink-0">
          <div class={`px-4 py-2 rounded-2xl text-xs sm:text-sm font-black flex items-center gap-2 shadow-xs ${
            viability.score >= 75
              ? 'bg-green-500/15 text-green-600 dark:text-green-400 border border-green-500/30'
              : viability.score >= 50
                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                : 'bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30'
          }`}>
            <span class="text-base">⭐</span>
            <span>{language === 'tl' ? viability.ratingTl : viability.ratingEn}</span>
            <span class="opacity-40">|</span>
            <span class="font-extrabold">{viability.score}/100</span>
          </div>
        </div>
      </div>

      <!-- Distance and Spot Hero Highlight -->
      <div class={`p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
        isDarkMode ? 'bg-[#1A120B]' : 'bg-[#FAF7F2]'
      }`}>
        <div class="space-y-1">
          <span class="text-[11px] font-bold uppercase text-[#796658] dark:text-[#D6C7B2]">
            {language === 'tl' ? 'Inirerekomendang Pwesto (Pinakamalapit na Sakayan)' : 'Recommended Spot (Nearest Hub)'}
          </span>
          <p class="text-base sm:text-lg font-black text-[#4A2E1B] dark:text-[#FAF7F2]">
            {viability.nearestAnchorName}
          </p>
          <p class="text-xs font-extrabold text-[#D97706] flex items-center gap-1">
            <span>📍</span>
            <span>{language === 'tl' ? `~${viability.nearestAnchorDistM}m layo mula sa kasalukuyang pwesto mo` : `~${viability.nearestAnchorDistM}m away from your current location`}</span>
          </p>
        </div>

        <button
          type="button"
          on:click={() => onNavigate('map')}
          class="px-4 py-2.5 rounded-xl text-xs font-black bg-[#D97706] hover:bg-[#B45309] text-white shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0 active:scale-95"
        >
          <span>🗺️</span>
          <span>{language === 'tl' ? 'Tingnan sa Mapa' : 'View on Map'}</span>
        </button>
      </div>

      <!-- 3 Key Metric Breakdown -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div class={`p-3.5 rounded-2xl ${isDarkMode ? 'bg-[#1A120B]' : 'bg-[#FAF7F2]'}`}>
          <span class="text-[10px] font-bold uppercase text-[#796658] dark:text-[#D6C7B2]">
            {language === 'tl' ? 'Dagsa ng Tao' : 'Foot Traffic'}
          </span>
          <p class="font-black text-sm mt-0.5 text-green-600 dark:text-green-400">
            {language === 'tl' ? 'Mataas (Dagsa sa Sakayan)' : 'High Commuter Traffic'}
          </p>
          <p class="text-[11px] text-[#796658] dark:text-[#D6C7B2] font-medium mt-0.5">
            {language === 'tl' ? 'Maraming sumasakay at naglalakad' : 'Active walking corridor'}
          </p>
        </div>

        <div class={`p-3.5 rounded-2xl ${isDarkMode ? 'bg-[#1A120B]' : 'bg-[#FAF7F2]'}`}>
          <span class="text-[10px] font-bold uppercase text-[#796658] dark:text-[#D6C7B2]">
            {language === 'tl' ? 'Pinakamagandang Oras' : 'Peak Commuter Window'}
          </span>
          <p class="font-black text-sm mt-0.5 truncate text-[#D97706]">
            {language === 'tl' ? viability.peakHoursTl.split('(')[0] : viability.peakHoursEn.split('(')[0]}
          </p>
          <p class="text-[11px] text-[#796658] dark:text-[#D6C7B2] font-medium mt-0.5">
            {language === 'tl' ? 'Tanghalian at Uwian' : 'Peak buying window'}
          </p>
        </div>

        <div class={`p-3.5 rounded-2xl ${isDarkMode ? 'bg-[#1A120B]' : 'bg-[#FAF7F2]'}`}>
          <span class="text-[10px] font-bold uppercase text-[#796658] dark:text-[#D6C7B2]">
            {language === 'tl' ? 'Kalabang Tindahan' : 'Nearby Competition'}
          </span>
          <p class="font-black text-sm mt-0.5">
            {viability.competitorCountWithin150m} {language === 'tl' ? 'stall sa 150m' : 'stall within 150m'}
          </p>
          <p class="text-[11px] text-[#796658] dark:text-[#D6C7B2] font-medium mt-0.5">
            {language === 'tl' ? 'Kakaunti ang kumpetisyon' : 'Low competition density'}
          </p>
        </div>
      </div>
    </div>

    <!-- Live Buyers Waiting Bento Card -->
    <div class={`p-6 rounded-[32px] shadow-sm text-center space-y-2 ${
      isDarkMode ? 'bg-[#452B14] border-[#F59E0B]/30' : 'bg-[#FEF3C7] border-[#D97706]/30'
    }`}>
      <span class="text-xs font-extrabold uppercase tracking-wider text-[#D97706]">
        👥 {language === 'tl' ? 'Mga Nag-aabang sa Ruta Mo' : 'Neighbors Awaiting Your Cart'}
      </span>
      <div class="flex items-center justify-center gap-2">
        <span class="text-5xl font-black">{audienceCount}</span>
        <span class="text-sm font-bold text-[#796658]">{language === 'tl' ? 'mamimili' : 'buyers'}</span>
      </div>
      <p class={`text-xs font-medium max-w-sm mx-auto ${isDarkMode ? 'text-[#D6C7B2]' : 'text-[#796658]'}`}>
        {language === 'tl'
          ? 'Nasa loob ng 300m radius ang mga ito. Makakatanggap sila ng alerto habang papalapit ka.'
          : 'These buyers are within your 300m walking radius and receive alerts as you approach.'}
      </p>
    </div>

    <!-- Broadcast Status Switcher -->
    <div class={`p-5 rounded-[28px] shadow-sm space-y-3 ${
      isDarkMode ? 'bg-[#271A10] border-[#3D2717]' : 'bg-white border-[#EAE4D9]'
    }`}>
      <h2 class="text-xs font-bold uppercase tracking-wider text-[#796658]">
        {language === 'tl' ? 'Katayuan ng Pagtitinda:' : 'Broadcasting Status:'}
      </h2>
      <div class="grid grid-cols-3 gap-2.5">
        <button
          type="button"
          on:click={() => (vendorStatus = 'live')}
          class={`py-3 px-2 rounded-2xl text-xs font-extrabold border transition cursor-pointer text-center ${
            vendorStatus === 'live'
              ? 'bg-green-600 text-white border-green-600 shadow-sm'
              : (isDarkMode ? 'bg-[#352317] text-white border-[#3D2717]' : 'bg-[#FAF7F2] text-[#4A2E1B] border-[#EAE4D9]')
          }`}
        >
          🟢 {language === 'tl' ? 'Naglilibot (Live)' : 'Live'}
        </button>

        <button
          type="button"
          on:click={() => (vendorStatus = 'stopped')}
          class={`py-3 px-2 rounded-2xl text-xs font-extrabold border transition cursor-pointer text-center ${
            vendorStatus === 'stopped'
              ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
              : (isDarkMode ? 'bg-[#352317] text-white border-[#3D2717]' : 'bg-[#FAF7F2] text-[#4A2E1B] border-[#EAE4D9]')
          }`}
        >
          🟡 {language === 'tl' ? 'Nakatigil' : 'Parked'}
        </button>

        <button
          type="button"
          on:click={() => (vendorStatus = 'sold_out')}
          class={`py-3 px-2 rounded-2xl text-xs font-extrabold border transition cursor-pointer text-center ${
            vendorStatus === 'sold_out'
              ? 'bg-red-600 text-white border-red-600 shadow-sm'
              : (isDarkMode ? 'bg-[#352317] text-white border-[#3D2717]' : 'bg-[#FAF7F2] text-[#4A2E1B] border-[#EAE4D9]')
          }`}
        >
          🔴 {language === 'tl' ? 'Ubos Na' : 'Sold Out'}
        </button>
      </div>
    </div>

    <!-- Product Selection ("Binebenta") -->
    <div class={`p-5 rounded-[28px] shadow-sm space-y-3 ${
      isDarkMode ? 'bg-[#271A10] border-[#3D2717]' : 'bg-white border-[#EAE4D9]'
    }`}>
      <h2 class="text-xs font-bold uppercase tracking-wider text-[#796658]">
        {language === 'tl' ? 'Produktong Binebenta:' : 'Product Being Sold:'}
      </h2>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {#each PRODUCTS as p}
          <button
            type="button"
            on:click={() => setProduct(p.name)}
            class={`p-3 rounded-2xl border text-xs font-extrabold flex items-center justify-center gap-2 transition cursor-pointer min-h-[48px] ${
              activeProduct.includes(p.name)
                ? (isDarkMode ? 'bg-[#F59E0B] text-[#1A120B] border-[#F59E0B]' : 'bg-[#4A2E1B] text-white border-[#4A2E1B]')
                : (isDarkMode ? 'bg-[#352317] text-white border-[#3D2717]' : 'bg-[#FAF7F2] text-[#4A2E1B] border-[#EAE4D9]')
            }`}
          >
            <span>{p.icon}</span>
            <span>{p.name}</span>
          </button>
        {/each}
      </div>
    </div>


    <!-- Demand Hotspots Intel Section for Vendors -->
    <div class={`p-5 sm:p-6 rounded-[28px] shadow-sm space-y-4 ${
      isDarkMode ? 'bg-[#271A10]' : 'bg-white'
    }`}>
      <div class="flex items-center justify-between flex-wrap gap-2">
        <div>
          <span class="text-[11px] font-black uppercase tracking-wider text-[#EF4444]">
            🔥 {language === 'tl' ? 'Mataas na Bentahan' : 'High-Demand Selling Areas'}
          </span>
          <h2 class="text-base font-black">
            {language === 'tl' ? 'Mga Potensyal na Pwesto Ngayon' : 'Upcoming High-Demand Hotspots'}
          </h2>
          <p class={`text-[11px] font-medium mt-0.5 ${isDarkMode ? 'text-[#D6C7B2]' : 'text-[#796658]'}`}>
            {language === 'tl'
              ? 'Batay sa uwian ng estudyante, palaro sa court, barangay events, at rush hour.'
              : 'Based on school dismissals, basketball tournaments, civic events, and commuter queues.'}
          </p>
        </div>

        <button
          type="button"
          on:click={() => (showConfigModal = true)}
          class="px-3 py-1.5 rounded-full text-xs font-black bg-[#D97706]/15 text-[#D97706] hover:bg-[#D97706]/25 transition cursor-pointer flex items-center gap-1 active:scale-95"
        >
          <span>➕</span>
          <span>{language === 'tl' ? 'Mag-ulat ng Event' : 'Add Event / Schedule'}</span>
        </button>
      </div>

      <div class="space-y-2.5">
        {#each hotspots.slice(0, 3) as h}
          {@const lvl = HOTSPOT_LEVEL_META[h.potentialLevel]}
          {@const cat = HOTSPOT_CATEGORY_META[h.category]}
          <div class={`p-3.5 rounded-2xl border flex items-start gap-3 transition ${
            isDarkMode ? 'bg-[#1A120B] border-[#3D2717]' : 'bg-[#FAF7F2] border-[#EAE4D9]'
          }`}>
            <div
              class="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 border relative"
              style={`background-color: ${lvl.badgeBg}; border-color: ${lvl.mapStroke};`}
            >
              <span>{cat.icon}</span>
              <span class="absolute -top-1 -right-1 text-[10px]">{lvl.iconEmoji}</span>
            </div>

            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between gap-1">
                <h4 class="font-black text-xs sm:text-sm truncate">{h.name}</h4>
                <span
                  class="text-[10px] font-black px-2 py-0.5 rounded-full text-white shrink-0"
                  style={`background-color: ${lvl.mapFill};`}
                >
                  {h.opportunityScore}/100
                </span>
              </div>

              <p class="text-[11px] font-bold text-[#D97706] mt-0.5">
                🕒 {h.expectedBusyTime}
              </p>

              <p class={`text-[11px] font-medium line-clamp-2 mt-1 leading-snug ${isDarkMode ? 'text-[#D6C7B2]' : 'text-[#5C4D40]'}`}>
                💡 {language === 'tl' ? h.explanationTl : h.explanationEn}
              </p>

              <div class="flex items-center justify-between mt-2 pt-1 border-t border-black/5 dark:border-white/5 text-[10px]">
                <span class="font-bold text-[#D97706]">
                  👥 {h.estimatedCrowd}
                </span>
                <span class="opacity-60 truncate">
                  📌 {h.dataSourceLabel.split('(')[0]}
                </span>
              </div>
            </div>
          </div>
        {/each}
      </div>

      <!-- Quick Action to view on Map -->
      <button
        type="button"
        on:click={() => onNavigate('map')}
        class={`w-full py-2.5 rounded-xl text-xs font-black border transition flex items-center justify-center gap-1.5 cursor-pointer ${
          isDarkMode
            ? 'bg-[#352317] border-[#3D2717] text-[#FAF7F2] hover:bg-[#4A2E1B]'
            : 'bg-white border-[#EAE4D9] text-[#4A2E1B] hover:bg-[#FAF7F2]'
        }`}
      >
        <span>🗺️</span>
        <span>{language === 'tl' ? 'Tingnan ang Lahat ng Hotspots sa Mapa' : 'View All Hotspots on Map'}</span>
        <span>→</span>
      </button>
    </div>

    <!-- Photo Verification Card -->
    <div class={`p-5 rounded-[28px] shadow-sm space-y-3 ${
      isDarkMode ? 'bg-[#271A10] border-[#3D2717]' : 'bg-white border-[#EAE4D9]'
    }`}>
      <h2 class="text-xs font-bold uppercase tracking-wider text-[#796658]">
        {language === 'tl' ? 'Litrato ng Kaldero / Kariton:' : 'Verified Stall Photo:'}
      </h2>

      {#if uploadedPhoto}
        <div class="flex items-center gap-3">
          <img src={uploadedPhoto} alt="Kaldero" class="w-16 h-16 rounded-2xl object-cover border border-[#EAE4D9]" />
          <div>
            <span class="text-xs font-bold text-green-500">✓ Verified ng Komunidad</span>
            <p class={`text-[11px] ${isDarkMode ? 'text-[#D6C7B2]' : 'text-[#796658]'}`}>
              Ito ang nakikita ng mga bibili sa kanilang screen.
            </p>
          </div>
        </div>
      {:else}
        <label class="p-4 rounded-2xl bg-[#FAF7F2] dark:bg-[#352317] border border-dashed border-[#EAE4D9] dark:border-[#3D2717] flex items-center justify-center gap-2 cursor-pointer text-xs font-bold">
          <span>📷</span>
          <span>{language === 'tl' ? 'Kumuha o Mag-upload ng Litrato' : 'Upload Stall Photo'}</span>
          <input type="file" accept="image/*" on:change={handlePhotoUpload} class="hidden" />
        </label>
      {/if}
    </div>

    <!-- Deliberate Role Switch Button (Requires Confirmation) -->
    {#if onRequestSwitchRole}
      <div class="pt-2 text-center">
        <button
          type="button"
          on:click={onRequestSwitchRole}
          class={`px-4 py-2.5 rounded-full border text-xs font-bold transition cursor-pointer ${
            isDarkMode
              ? 'bg-[#271A10] border-[#3D2717] text-[#D6C7B2] hover:bg-[#352317]'
              : 'bg-white border-[#EAE4D9] text-[#796658] hover:bg-[#FAF7F2]'
          }`}
        >
          🔄 {language === 'tl' ? 'Lumipat sa Mamimili (Buyer Mode)' : 'Switch to Buyer Mode'}
        </button>
      </div>
    {/if}

    <!-- Primary Action: Open Map -->
    <button
      type="button"
      on:click={() => onNavigate('map')}
      class={`w-full py-4 rounded-2xl font-black text-sm sm:text-base shadow-md transition flex items-center justify-center gap-2 cursor-pointer min-h-[52px] ${
        isDarkMode
          ? 'bg-[#F59E0B] text-[#1A120B] hover:bg-[#D97706]'
          : 'bg-[#4A2E1B] text-white hover:bg-[#361F11]'
      }`}
    >
      <span>🗺️ {language === 'tl' ? 'Bumalik sa Full-Screen Mapa' : 'Return to Full-Screen Map'}</span>
      <span>→</span>
    </button>
  </div>

  {#if showConfigModal}
    <HotspotConfigModal
      {language}
      {isDarkMode}
      {session}
      activeHotspots={hotspots}
      onClose={() => (showConfigModal = false)}
      onHotspotsUpdated={reloadHotspots}
    />
  {/if}
</div>
