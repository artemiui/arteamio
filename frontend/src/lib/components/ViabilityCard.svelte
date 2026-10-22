<script lang="ts">
  import type { BusinessArchetype, Language, ViabilityResult } from '../types';

  export let archetypes: BusinessArchetype[] = [];
  export let selectedArchetype: BusinessArchetype;
  export let viability: ViabilityResult;
  export let language: Language = 'tl';
  export let onSelectArchetype: (archetype: BusinessArchetype) => void;

  function getScoreColor(score: number): { text: string; bg: string; border: string } {
    if (score >= 80) return { text: 'text-[#D97706]', bg: 'bg-[#FEF3C7]', border: 'border-[#D97706]/30' };
    if (score >= 60) return { text: 'text-[#4A2E1B]', bg: 'bg-[#FAF7F2]', border: 'border-[#EFE9DF]' };
    return { text: 'text-[#8C5E3C]', bg: 'bg-white', border: 'border-[#EFE9DF]' };
  }

  $: colors = getScoreColor(viability.score);
</script>

<section class="space-y-4">
  <!-- Archetype Selector Pills -->
  <div class="bg-white p-3 sm:p-4 rounded-3xl border border-[#EFE9DF] shadow-sm">
    <p class="block text-xs font-semibold text-[#796658] mb-2 uppercase tracking-wide">
      {language === 'tl' ? 'Piliin ang Uri ng Tinda' : 'Select Business Concept'}
    </p>
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {#each archetypes as item}
        <button
          type="button"
          on:click={() => onSelectArchetype(item)}
          class={`flex items-center gap-2 px-3 py-2.5 rounded-2xl text-left border text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
            selectedArchetype.id === item.id
              ? 'bg-[#4A2E1B] text-[#FAF7F2] border-[#4A2E1B] shadow-md scale-[1.02]'
              : 'bg-[#FAF7F2] text-[#4A2E1B] border-[#EFE9DF] hover:border-[#D97706]'
          }`}
        >
          <span class="text-lg">{item.icon}</span>
          <span class="truncate">{language === 'tl' ? item.nameTl : item.name}</span>
        </button>
      {/each}
    </div>
  </div>

  <!-- Bento Grid for Viability Metrics -->
  <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
    <!-- Big Score Bento Card -->
    <div class="sm:col-span-1 bg-white p-5 rounded-3xl border border-[#EFE9DF] shadow-sm flex flex-col justify-between">
      <div>
        <span class="text-xs font-bold uppercase tracking-wider text-[#796658]">
          {language === 'tl' ? 'Pwesto Score' : 'Viability Score'}
        </span>
        <div class="flex items-baseline gap-2 mt-2">
          <span class="text-5xl sm:text-6xl font-black text-[#4A2E1B] tracking-tight">
            {viability.score}
          </span>
          <span class="text-sm font-semibold text-[#796658]">/ 100</span>
        </div>
      </div>

      <div class="mt-4">
        <span class={`inline-block px-3 py-1.5 rounded-full text-xs font-bold border ${colors.bg} ${colors.text} ${colors.border}`}>
          {language === 'tl' ? viability.ratingTl : viability.ratingEn}
        </span>
        <p class="text-xs text-[#796658] mt-2">
          {language === 'tl'
            ? 'Batay sa layo ng sakayan at dami ng katabing tinda.'
            : 'Based on transit anchor decay and competitor presence.'}
        </p>
      </div>
    </div>

    <!-- Transit & Foot Traffic Diagnostics -->
    <div class="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
      <!-- Transit Anchors Card -->
      <div class="bg-white p-4 rounded-3xl border border-[#EFE9DF] shadow-sm">
        <div class="w-8 h-8 rounded-2xl bg-[#FEF3C7] text-[#D97706] flex items-center justify-center font-bold text-sm mb-2">
          🚐
        </div>
        <h4 class="text-xs font-bold text-[#796658] uppercase">
          {language === 'tl' ? 'Layo sa Sakayan' : 'Nearest Transit'}
        </h4>
        <p class="text-lg font-bold text-[#4A2E1B] mt-1">
          {viability.nearestAnchorDistM}m
        </p>
        <p class="text-xs text-[#796658] truncate">
          {viability.nearestAnchorName}
        </p>
        <div class="mt-3 pt-2 border-t border-[#EFE9DF] text-[11px] text-[#796658]">
          <span class="font-bold text-[#4A2E1B]">{viability.anchorCountWithin300m}</span>
          {language === 'tl' ? ' sakayan sa 300m radius' : ' transit points within 300m'}
        </div>
      </div>

      <!-- Competitor Friction Card -->
      <div class="bg-white p-4 rounded-3xl border border-[#EFE9DF] shadow-sm">
        <div class="w-8 h-8 rounded-2xl bg-[#FAF7F2] text-[#4A2E1B] border border-[#EFE9DF] flex items-center justify-center font-bold text-sm mb-2">
          🥡
        </div>
        <h4 class="text-xs font-bold text-[#796658] uppercase">
          {language === 'tl' ? 'Katabing Kalaban' : 'Competitors'}
        </h4>
        <p class="text-lg font-bold text-[#4A2E1B] mt-1">
          {viability.competitorCountWithin150m}
          <span class="text-xs font-normal text-[#796658]">
            {language === 'tl' ? 'sa 150m' : 'within 150m'}
          </span>
        </p>
        <p class="text-xs text-[#796658]">
          {viability.competitorCountWithin150m === 0
            ? (language === 'tl' ? 'Walang direktang kaagaw' : 'No direct competition')
            : (language === 'tl' ? 'May kaunting kasabay' : 'Moderate direct competition')}
        </p>
        <div class="mt-3 pt-2 border-t border-[#EFE9DF] text-[11px] text-[#796658]">
          {language === 'tl' ? 'Mababang risk sa singilan' : 'Healthy market balance'}
        </div>
      </div>

      <!-- Peak Rush Window Card (Full row on small screens) -->
      <div class="sm:col-span-2 bg-gradient-to-r from-white to-[#FAF7F2] p-4 rounded-3xl border border-[#EFE9DF] shadow-sm flex items-start gap-3">
        <div class="w-9 h-9 rounded-2xl bg-[#4A2E1B] text-[#FAF7F2] flex items-center justify-center font-bold text-base shrink-0 mt-0.5">
          ⏰
        </div>
        <div>
          <h4 class="text-xs font-bold text-[#796658] uppercase">
            {language === 'tl' ? 'Pinakamataong Oras (Peak Hours)' : 'Peak Commuter Rush'}
          </h4>
          <p class="text-sm font-bold text-[#4A2E1B] mt-0.5">
            {language === 'tl' ? viability.peakHoursTl : viability.peakHoursEn}
          </p>
          <p class="text-xs text-[#796658] mt-1">
            {language === 'tl'
              ? 'Dagsa ang mga estudyante at pasahero sa mga panahong ito.'
              : 'Optimal sales volume during peak university & office transit flow.'}
          </p>
        </div>
      </div>
    </div>
  </div>
</section>
