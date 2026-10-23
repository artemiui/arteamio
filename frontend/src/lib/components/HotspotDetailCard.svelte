<script lang="ts">
  import type { DemandHotspot, Language, UserSession } from '../types';
  import { getOpportunityRating, HOTSPOT_CATEGORY_META } from '../data/hotspots';
  import Icon from './Icon.svelte';

  export let hotspot: DemandHotspot;
  export let language: Language = 'tl';
  export let isDarkMode: boolean = false;
  export let session: UserSession | null = null;
  export let isTargeted: boolean = false;
  export let onClose: () => void;
  export let onTargetLocation: ((lat: number, lng: number) => void) | undefined = undefined;

  $: ratingMeta = getOpportunityRating(hotspot.opportunityScore);
  $: catMeta = HOTSPOT_CATEGORY_META[hotspot.category] || HOTSPOT_CATEGORY_META.barangay;
  $: isVendor = session?.role === 'vendor';
</script>

<div
  class={`backdrop-blur-md rounded-2xl border shadow-xl p-4 sm:p-5 space-y-3.5 transition-all duration-300 animate-slide-up ${
    isDarkMode
      ? 'bg-[#271A10]/98 border-[#3D2717] text-[#FAF7F2]'
      : 'bg-white border-[#EAE4D9] text-[#1F2937]'
  }`}
>
  <div class="flex items-center justify-between gap-3.5">
    {#if isVendor}
      <!-- Left: Prominent Opportunity Rating & Score (Tindero / Vendor Mode Only) -->
      <div class="w-24 shrink-0 flex flex-col items-start justify-center pr-3 border-r border-[#EAE4D9] dark:border-[#3D2717]">
        <span class={`text-base sm:text-lg font-black uppercase tracking-tight leading-none ${ratingMeta.textClass}`}>
          {ratingMeta.rating}
        </span>
        <span class={`text-xs sm:text-sm font-extrabold mt-1 leading-none ${ratingMeta.textClass}`}>
          {hotspot.opportunityScore}/100
        </span>
      </div>
    {:else}
      <!-- Buyer Mode: Clean Category Icon without selling score -->
      <div class={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${
        isDarkMode ? 'bg-[#352317] border-[#3D2717] text-[#F59E0B]' : 'bg-[#FAF7F2] border-[#EAE4D9] text-[#4A2E1B]'
      }`}>
        <Icon name={catMeta.icon} size={20} />
      </div>
    {/if}

    <!-- Right: Hotspot Name & Busy Hours -->
    <div class="flex-1 min-w-0">
      <h3 class={`text-sm sm:text-base font-bold leading-snug truncate ${
        isDarkMode ? 'text-[#FAF7F2]' : 'text-[#1F2937]'
      }`}>
        {hotspot.name}
      </h3>
      <p class={`text-xs sm:text-sm font-medium mt-0.5 truncate ${
        isDarkMode ? 'text-[#D6C7B2]' : 'text-[#6B7280]'
      }`}>
        {hotspot.expectedBusyTime}
      </p>
    </div>

    <!-- Close Button -->
    <button
      type="button"
      on:click={onClose}
      class={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition cursor-pointer active:scale-95 shrink-0 ${
        isDarkMode
          ? 'bg-[#352317] text-[#D6C7B2] hover:bg-[#4A2E1B]'
          : 'bg-[#FAF7F2] text-[#796658] hover:bg-[#EAE4D9]'
      }`}
      aria-label="Close card"
    >
      ✕
    </button>
  </div>

  <!-- Action Button -->
  {#if onTargetLocation}
    <div class="pt-0.5">
      <button
        type="button"
        on:click={() => onTargetLocation && onTargetLocation(hotspot.lat, hotspot.lng)}
        class={`w-full py-2.5 px-4 rounded-xl font-black text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs active:scale-98 ${
          isTargeted
            ? (isDarkMode ? 'bg-[#F59E0B]/20 text-[#F59E0B] border-2 border-[#F59E0B]' : 'bg-[#D97706]/15 text-[#D97706] border-2 border-[#D97706]')
            : isDarkMode
              ? 'bg-[#F59E0B] text-[#1A120B] hover:bg-[#D97706]'
              : 'bg-[#4A2E1B] text-white hover:bg-[#361F11]'
        }`}
      >
        <span>
          {isTargeted
            ? (language === 'tl' ? '✓ Nakaturo ang Ruta (Pindutin para Alisin)' : '✓ Route Active (Tap to Clear)')
            : isVendor
              ? (language === 'tl' ? 'Ituro ang Ruta Dito' : 'Show Route to Hotspot')
              : (language === 'tl' ? 'I-sentro sa Mapa' : 'Focus on Map')}
        </span>
      </button>
    </div>
  {/if}
</div>
