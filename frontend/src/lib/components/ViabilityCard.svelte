<script lang="ts">
  import type { BusinessArchetype, Language, ViabilityResult } from '../types';
  import Icon from './Icon.svelte';

  export let archetypes: BusinessArchetype[] = [];
  export let selectedArchetype: BusinessArchetype;
  export let viability: ViabilityResult;
  export let language: Language = 'tl';
  export let onSelectArchetype: (archetype: BusinessArchetype) => void;

  function getRatingBadge(score: number): { labelTl: string; labelEn: string; bg: string; text: string; border: string } {
    if (score >= 80) {
      return {
        labelTl: 'Napakagandang Pwesto',
        labelEn: 'Prime Hotspot',
        bg: 'bg-[#FEF3C7]',
        text: 'text-[#D97706]',
        border: 'border-[#D97706]/30',
      };
    }
    if (score >= 60) {
      return {
        labelTl: 'Magandang Pwesto',
        labelEn: 'High Foot Traffic',
        bg: 'bg-[#FAF7F2]',
        text: 'text-[#4A2E1B]',
        border: 'border-[#EAE4D9]',
      };
    }
    return {
      labelTl: 'Mababang Trapiko',
      labelEn: 'Low Traffic Area',
      bg: 'bg-white',
      text: 'text-[#796658]',
      border: 'border-[#EAE4D9]',
    };
  }

  $: rating = getRatingBadge(viability.score);
</script>

<section class="space-y-4">
  <!-- Archetype Selector Bento Strip -->
  <div class="bg-white p-4 sm:p-5 rounded-[28px] border border-[#EAE4D9] shadow-xs">
    <div class="flex items-center justify-between mb-3 px-1">
      <span class="text-xs font-bold text-[#796658] uppercase tracking-wider">
        {language === 'tl' ? 'Piliin ang Uri ng Tinda' : 'Select Business Archetype'}
      </span>
      <span class="text-xs font-semibold text-[#D97706]">
        {language === 'tl' ? 'Nag-aakma ang modelo sa produkto' : 'Model auto-calibrates'}
      </span>
    </div>

    <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
      {#each archetypes as item}
        <button
          type="button"
          on:click={() => onSelectArchetype(item)}
          class={`flex flex-col justify-between p-3.5 rounded-2xl border text-left transition-all duration-200 cursor-pointer min-h-[72px] ${
            selectedArchetype.id === item.id
              ? 'bg-[#4A2E1B] text-[#FAF7F2] border-[#4A2E1B] shadow-md scale-[1.02]'
              : 'bg-[#FAF7F2] text-[#4A2E1B] border-[#EAE4D9] hover:border-[#D97706] hover:bg-white'
          }`}
        >
          <div class="flex items-center justify-between w-full">
            <Icon name={item.icon} size={22} />
            <span class={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              selectedArchetype.id === item.id ? 'bg-white/20 text-white' : 'bg-[#EAE4D9]/60 text-[#796658]'
            }`}>
              ₱{item.typicalPrice}
            </span>
          </div>
          <span class="font-bold text-xs sm:text-sm mt-2 leading-tight">
            {language === 'tl' ? item.nameTl : item.name}
          </span>
        </button>
      {/each}
    </div>
  </div>

  <!-- Bento Grid of Metrics (Inspired by Reference Slides & Moonli) -->
  <div class="grid grid-cols-1 md:grid-cols-3 gap-3.5">
    <!-- Card 1: Giant Score Bento (Dark Arnibal or High Contrast) -->
    <div class="bg-[#4A2E1B] text-[#FAF7F2] p-6 rounded-[28px] shadow-sm flex flex-col justify-between min-h-[220px]">
      <div>
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold uppercase tracking-wider text-[#FAF7F2]/70">
            {language === 'tl' ? 'Pwesto Viability Index' : 'Viability Index'}
          </span>
          <span class="text-base">↗</span>
        </div>

        <div class="flex items-baseline gap-2 mt-3">
          <span class="text-6xl font-black tracking-tight leading-none text-white">
            {viability.score}
          </span>
          <span class="text-base font-semibold text-[#FAF7F2]/60">/ 100</span>
        </div>
      </div>

      <div class="mt-4 pt-4 border-t border-white/10">
        <span class={`inline-block px-3 py-1 rounded-full text-xs font-extrabold ${rating.bg} ${rating.text}`}>
          {language === 'tl' ? rating.labelTl : rating.labelEn}
        </span>
        <p class="text-xs text-[#FAF7F2]/80 mt-2 font-medium leading-relaxed">
          {language === 'tl'
            ? 'Kinalkula gamit ang gravity model batay sa lapit ng sakayan at density ng tao.'
            : 'Derived from spatial gravity decay and foot-traffic catchment density.'}
        </p>
      </div>
    </div>

    <!-- Card 2: Transit Anchors Catchment -->
    <div class="bg-white p-6 rounded-[28px] border border-[#EAE4D9] shadow-xs flex flex-col justify-between min-h-[220px]">
      <div>
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-[#796658] uppercase tracking-wider">
            {language === 'tl' ? 'Sakayan at Tawiran' : 'Transit Anchors'}
          </span>
          <span class="w-8 h-8 rounded-full bg-[#FAF7F2] border border-[#EAE4D9] flex items-center justify-center">
            <Icon name="van" size={16} />
          </span>
        </div>

        <div class="mt-3">
          <span class="text-4xl font-black text-[#4A2E1B] tracking-tight">
            {viability.nearestAnchorDistM}m
          </span>
          <p class="text-xs font-bold text-[#D97706] mt-0.5">
            {language === 'tl' ? 'Pinakamalapit na sakayan' : 'Nearest loading bay'}
          </p>
          <p class="text-xs text-[#796658] font-medium mt-1 truncate">
            {viability.nearestAnchorName}
          </p>
        </div>
      </div>

      <div class="mt-4 pt-3 border-t border-[#EAE4D9] text-xs text-[#796658] flex items-center justify-between font-medium">
        <span>{language === 'tl' ? 'Kabuuang sakayan sa 300m:' : 'Transit points within 300m:'}</span>
        <span class="font-extrabold text-[#4A2E1B] text-sm">{viability.anchorCountWithin300m}</span>
      </div>
    </div>

    <!-- Card 3: Competitor Density Friction -->
    <div class="bg-white p-6 rounded-[28px] border border-[#EAE4D9] shadow-xs flex flex-col justify-between min-h-[220px]">
      <div>
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-[#796658] uppercase tracking-wider">
            {language === 'tl' ? 'Katabing Tindahan' : 'Competitor Nodes'}
          </span>
          <span class="w-8 h-8 rounded-full bg-[#FAF7F2] border border-[#EAE4D9] flex items-center justify-center">
            <Icon name="store" size={16} />
          </span>
        </div>

        <div class="mt-3">
          <span class="text-4xl font-black text-[#4A2E1B] tracking-tight">
            {viability.competitorCountWithin150m}
          </span>
          <p class="text-xs font-bold text-[#4A2E1B] mt-0.5">
            {language === 'tl' ? 'Kakumpitensya sa 150m' : 'Direct competitors within 150m'}
          </p>
          <p class="text-xs text-[#796658] font-medium mt-1">
            {viability.competitorCountWithin150m === 0
              ? (language === 'tl' ? 'Solo mo ang pwesto, walang direktang kaagaw' : 'Zero friction, prime open territory')
              : (language === 'tl' ? 'May kaunting kasabay ngunit mataas ang tao' : 'Manageable density for high traffic')}
          </p>
        </div>
      </div>

      <div class="mt-4 pt-3 border-t border-[#EAE4D9] text-xs text-[#796658] flex items-center justify-between font-medium">
        <span>{language === 'tl' ? 'Presyong karaniwan:' : 'Price bracket:'}</span>
        <span class="font-extrabold text-[#D97706] text-sm">₱{selectedArchetype.typicalPrice}</span>
      </div>
    </div>
  </div>

  <!-- Commuter Rush Window Diagnostics Card -->
  <div class="bg-gradient-to-r from-[#FEF3C7]/60 via-white to-[#FAF7F2] p-5 sm:p-6 rounded-[28px] border border-[#EAE4D9] shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
    <div class="flex items-start gap-4">
      <div class="w-12 h-12 rounded-2xl bg-[#D97706] text-white flex items-center justify-center text-xl shrink-0 shadow-xs">
        ⏰
      </div>
      <div>
        <span class="text-xs font-bold uppercase tracking-wider text-[#796658]">
          {language === 'tl' ? 'Pinakamataong Oras ng mga Estudyante at Pasahero' : 'Commuter Rush Windows'}
        </span>
        <h4 class="text-base sm:text-lg font-extrabold text-[#4A2E1B] mt-0.5">
          {language === 'tl' ? viability.peakHoursTl : viability.peakHoursEn}
        </h4>
        <p class="text-xs text-[#796658] font-medium mt-1">
          {language === 'tl'
            ? 'Pinakamabisang magtinda sa mga oras na ito para sa mabilisang benta at turnover.'
            : 'Highest sales turnover occurs during these transit dispersal intervals.'}
        </p>
      </div>
    </div>

    <div class="shrink-0 self-end sm:self-center">
      <span class="px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#4A2E1B] text-[#FAF7F2]">
        {language === 'tl' ? 'Peak Window' : 'Peak Window'}
      </span>
    </div>
  </div>
</section>
