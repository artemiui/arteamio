<script lang="ts">
  import type { Language, ViewMode } from '../types';

  export let currentView: ViewMode = 'pwesto';
  export let language: Language = 'tl';
  export let largeText: boolean = false;
  export let onViewChange: (view: ViewMode) => void;
  export let onLanguageToggle: () => void;
  export let onTextScaleToggle: () => void;
</script>

<header class="w-full bg-[#FAF7F2] border-b border-[#EFE9DF] sticky top-0 z-30 px-3 py-2.5 sm:px-6">
  <div class="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
    <!-- Brand & Event Badge -->
    <div class="flex items-center gap-2.5">
      <div class="w-10 h-10 rounded-2xl bg-[#4A2E1B] text-[#FAF7F2] flex items-center justify-center font-black text-xl shadow-sm">
        P
      </div>
      <div>
        <div class="flex items-center gap-2">
          <h1 class="text-xl font-bold tracking-tight text-[#4A2E1B] leading-none">
            PwestoRadar
          </h1>
          <span class="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-[#D97706]/15 text-[#D97706]">
            UST CSSPrint '26
          </span>
        </div>
        <p class="text-xs text-[#796658] mt-0.5">
          {language === 'tl' ? 'Pwesto at Tinda sa Kalye' : 'Hyperlocal Street Commerce'}
        </p>
      </div>
    </div>

    <!-- View Mode Pills -->
    <nav class="flex items-center bg-[#EFE9DF]/70 p-1 rounded-full text-sm font-medium">
      <button
        type="button"
        on:click={() => onViewChange('pwesto')}
        class={`px-4 py-1.5 rounded-full transition-all duration-200 cursor-pointer ${
          currentView === 'pwesto'
            ? 'bg-[#4A2E1B] text-[#FAF7F2] shadow-sm font-semibold'
            : 'text-[#4A2E1B] hover:text-[#361F11]'
        }`}
      >
        {language === 'tl' ? 'Pwesto' : 'Spots'}
      </button>

      <button
        type="button"
        on:click={() => onViewChange('radar')}
        class={`px-4 py-1.5 rounded-full transition-all duration-200 cursor-pointer relative ${
          currentView === 'radar'
            ? 'bg-[#4A2E1B] text-[#FAF7F2] shadow-sm font-semibold'
            : 'text-[#4A2E1B] hover:text-[#361F11]'
        }`}
      >
        <span class="inline-flex items-center gap-1.5">
          <span class="w-2 h-2 rounded-full bg-[#D97706] animate-pulse"></span>
          {language === 'tl' ? 'Radar' : 'Radar'}
        </span>
      </button>

      <button
        type="button"
        on:click={() => onViewChange('tinda')}
        class={`px-4 py-1.5 rounded-full transition-all duration-200 cursor-pointer ${
          currentView === 'tinda'
            ? 'bg-[#4A2E1B] text-[#FAF7F2] shadow-sm font-semibold'
            : 'text-[#4A2E1B] hover:text-[#361F11]'
        }`}
      >
        {language === 'tl' ? 'Tinda' : 'Vendor'}
      </button>
    </nav>

    <!-- Accessibility & Language Toggles -->
    <div class="flex items-center gap-2">
      <!-- Font Size Accessibility -->
      <button
        type="button"
        on:click={onTextScaleToggle}
        aria-label="Toggle Font Size"
        class={`w-8 h-8 rounded-full border border-[#EFE9DF] bg-white flex items-center justify-center font-bold text-xs transition cursor-pointer ${
          largeText ? 'bg-[#4A2E1B] text-white border-[#4A2E1B]' : 'text-[#4A2E1B]'
        }`}
        title={language === 'tl' ? 'Palakihin ang Text' : 'Scale Text Size'}
      >
        Aa
      </button>

      <!-- Language Toggle -->
      <button
        type="button"
        on:click={onLanguageToggle}
        class="px-2.5 py-1 rounded-full border border-[#EFE9DF] bg-white text-xs font-semibold text-[#4A2E1B] hover:bg-[#FAF7F2] transition cursor-pointer"
      >
        {language === 'tl' ? '🇵🇭 Tagalog' : '🌐 English'}
      </button>
    </div>
  </div>
</header>
