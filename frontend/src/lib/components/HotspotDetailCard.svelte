<script lang="ts">
  import type { DemandHotspot, Language, UserSession } from '../types';
  import { HOTSPOT_CATEGORY_META, HOTSPOT_LEVEL_META } from '../data/hotspots';
  import Icon from './Icon.svelte';

  export let hotspot: DemandHotspot;
  export let language: Language = 'tl';
  export let isDarkMode: boolean = false;
  export let session: UserSession | null = null;
  export let onClose: () => void;
  export let onTargetLocation: ((lat: number, lng: number) => void) | undefined = undefined;

  $: catMeta = HOTSPOT_CATEGORY_META[hotspot.category] || HOTSPOT_CATEGORY_META.barangay;
  $: lvlMeta = HOTSPOT_LEVEL_META[hotspot.potentialLevel] || HOTSPOT_LEVEL_META.medium;
</script>

<div
  class={`backdrop-blur-md rounded-[32px] border shadow-2xl p-5 space-y-4 transition-all duration-300 animate-slide-up ${
    isDarkMode
      ? 'bg-[#271A10]/98 border-[#3D2717] text-[#FAF7F2]'
      : 'bg-white/98 border-[#EAE4D9] text-[#4A2E1B]'
  }`}
>
  <!-- Card Header -->
  <div class="flex items-start justify-between gap-3">
    <div class="flex items-center gap-3 min-w-0">
      <!-- Category Icon with Potential Ring -->
      <div
        class="w-13 h-13 rounded-2xl flex items-center justify-center text-2xl shrink-0 shadow-xs border relative"
        style={`background-color: ${lvlMeta.badgeBg}; border-color: ${lvlMeta.mapStroke};`}
      >
        <Icon name={catMeta.icon} size={22} />
        <span class="absolute -top-1 -right-1"><Icon name={lvlMeta.iconEmoji} size={12} /></span>
      </div>

      <div class="min-w-0">
        <div class="flex items-center gap-2 flex-wrap">
          <span
            class="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full"
            style={`background-color: ${lvlMeta.badgeBg}; color: ${lvlMeta.badgeColor};`}
          >
            <span class="inline-flex items-center gap-1">
              <Icon name={lvlMeta.iconEmoji} size={10} />
              {language === 'tl' ? lvlMeta.labelTl : lvlMeta.labelEn}
            </span>
          </span>
          <span class={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
            isDarkMode ? 'bg-[#352317] text-[#D6C7B2]' : 'bg-[#FAF7F2] text-[#796658]'
          }`}>
            {language === 'tl' ? catMeta.labelTl : catMeta.labelEn}
          </span>
        </div>

        <h3 class="text-base font-black truncate mt-1">
          {language === 'tl' ? hotspot.nameTl : hotspot.name}
        </h3>
      </div>
    </div>

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

  <!-- Key Metrics Bento Grid -->
  <div class="grid grid-cols-2 gap-2 text-xs">
    <!-- Opportunity Score -->
    <div
      class={`p-3 rounded-2xl border ${
        isDarkMode ? 'bg-[#1A120B] border-[#3D2717]' : 'bg-[#FAF7F2] border-[#EAE4D9]'
      }`}
    >
      <div class="flex items-center justify-between">
        <span class={`text-[10px] font-bold uppercase ${isDarkMode ? 'text-[#D6C7B2]' : 'text-[#796658]'}`}>
          {language === 'tl' ? 'Opportunity Score' : 'Opportunity Score'}
        </span>
        <span class="text-xs font-black" style={`color: ${lvlMeta.badgeColor}`}>
          {hotspot.opportunityScore}/100
        </span>
      </div>

      <!-- Score Bar Indicator -->
      <div class="w-full h-2 rounded-full bg-black/10 dark:bg-white/10 mt-2 overflow-hidden">
        <div
          class="h-full rounded-full transition-all duration-500"
          style={`width: ${hotspot.opportunityScore}%; background-color: ${lvlMeta.mapFill};`}
        ></div>
      </div>
    </div>

    <!-- Expected Busy Time -->
    <div
      class={`p-3 rounded-2xl border ${
        isDarkMode ? 'bg-[#1A120B] border-[#3D2717]' : 'bg-[#FAF7F2] border-[#EAE4D9]'
      }`}
    >
      <span class={`text-[10px] font-bold uppercase block ${isDarkMode ? 'text-[#D6C7B2]' : 'text-[#796658]'}`}>
        🕒 {language === 'tl' ? 'Oras ng Dagsa' : 'Expected Busy Time'}
      </span>
      <p class="text-xs font-black mt-1 truncate" title={hotspot.expectedBusyTime}>
        {hotspot.expectedBusyTime}
      </p>
    </div>
  </div>

  <!-- Explanation: Why the area attracts customers -->
  <div
    class={`p-3.5 rounded-2xl border space-y-1.5 ${
      isDarkMode ? 'bg-[#352317]/50 border-[#3D2717]' : 'bg-[#FEF3C7]/40 border-[#FDE68A]'
    }`}
  >
    <div class="flex items-center gap-1.5 text-xs font-black text-[#D97706]">
      <span>💡</span>
      <span>{language === 'tl' ? 'Bakit Malakas ang Bentahan Dito?' : 'Why Customers Gather Here'}</span>
    </div>
    <p class={`text-xs leading-relaxed font-medium ${isDarkMode ? 'text-[#FAF7F2]' : 'text-[#4A2E1B]'}`}>
      {language === 'tl' ? hotspot.explanationTl : hotspot.explanationEn}
    </p>
  </div>

  <!-- Truthful Data Source & Estimated Crowd Footnote -->
  <div class="flex items-center justify-between text-[11px] gap-2 pt-1 border-t border-black/5 dark:border-white/5">
    <div class="flex items-center gap-1 text-[#D97706] font-bold">
      <span>👥</span>
      <span>{hotspot.estimatedCrowd}</span>
    </div>
    <span class={`text-[10px] font-medium truncate ${isDarkMode ? 'text-[#A89885]' : 'text-[#8A7969]'}`}>
      📌 {hotspot.dataSourceLabel}
    </span>
  </div>

  <!-- Action Buttons -->
  <div class="flex items-center gap-2 pt-1">
    {#if onTargetLocation}
      <button
        type="button"
        on:click={() => onTargetLocation && onTargetLocation(hotspot.lat, hotspot.lng)}
        class={`flex-1 py-3 px-4 rounded-xl font-black text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm active:scale-98 ${
          isDarkMode
            ? 'bg-[#F59E0B] text-[#1A120B] hover:bg-[#D97706]'
            : 'bg-[#4A2E1B] text-white hover:bg-[#361F11]'
        }`}
      >
        <span>🎯</span>
        <span>
          {session?.role === 'vendor'
            ? (language === 'tl' ? 'Itutok ang Ruta Dito' : 'Target This Hotspot')
            : (language === 'tl' ? 'I-sentro sa Mapa' : 'Focus on Map')}
        </span>
      </button>
    {/if}
  </div>
</div>
