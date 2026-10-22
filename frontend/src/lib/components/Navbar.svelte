<script lang="ts">
  import type { Language, UserLocationProfile, ViewMode } from '../types';

  export let currentView: ViewMode = 'pwesto';
  export let language: Language = 'tl';
  export let largeText: boolean = false;
  export let userProfile: UserLocationProfile | null = null;
  export let onViewChange: (view: ViewMode) => void;
  export let onLanguageToggle: () => void;
  export let onTextScaleToggle: () => void;
  export let onOpenProfileModal: () => void;
</script>

<header class="w-full bg-[#FAF7F2]/90 backdrop-blur-md border-b border-[#EAE4D9] sticky top-0 z-40 px-3 py-3 sm:px-8 transition-colors">
  <div class="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
    <!-- Brand & Role Indicator -->
    <div class="flex items-center gap-3">
      <div class="w-11 h-11 rounded-[16px] bg-[#4A2E1B] text-[#FAF7F2] flex items-center justify-center font-black text-xl shadow-sm tracking-tight select-none">
        P
      </div>
      <div>
        <div class="flex items-center gap-2">
          <span class="text-xl font-extrabold tracking-tight text-[#4A2E1B] leading-none">
            PwestoRadar
          </span>
          {#if userProfile}
            <button
              type="button"
              on:click={onOpenProfileModal}
              class="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#FEF3C7] text-[#D97706] border border-[#D97706]/30 hover:bg-[#FDE68A] transition cursor-pointer"
              title={language === 'tl' ? 'Palitan ang role o lokasyon' : 'Change role or location'}
            >
              <span>{userProfile.role === 'vendor' ? '🛒' : '🥣'}</span>
              <span class="max-w-[120px] truncate">
                {userProfile.role === 'vendor'
                  ? (language === 'tl' ? 'Tindero' : 'Vendor')
                  : (language === 'tl' ? 'Mamimili' : 'Customer')}
                • {userProfile.locationName.split(',')[0]}
              </span>
              <span class="text-[9px]">▾</span>
            </button>
          {/if}
        </div>
        <p class="text-xs text-[#796658] mt-1 font-medium">
          {language === 'tl' ? 'Pwesto at Tinda sa Kalye' : 'Hyperlocal Street Commerce'}
        </p>
      </div>
    </div>

    <!-- Center Navigation Tabs (Bento Pill System) -->
    <nav class="flex items-center bg-[#EAE4D9]/80 p-1.5 rounded-full text-sm font-semibold shadow-inner" aria-label="Views">
      <button
        type="button"
        on:click={() => onViewChange('pwesto')}
        class={`px-4 sm:px-5 py-2 rounded-full transition-all duration-200 cursor-pointer min-h-[44px] flex items-center gap-1.5 ${
          currentView === 'pwesto'
            ? 'bg-[#4A2E1B] text-[#FAF7F2] shadow-sm'
            : 'text-[#4A2E1B] hover:text-[#361F11] hover:bg-white/40'
        }`}
      >
        <span>📍</span>
        <span>{language === 'tl' ? 'Pwesto' : 'Spots'}</span>
      </button>

      <button
        type="button"
        on:click={() => onViewChange('radar')}
        class={`px-4 sm:px-5 py-2 rounded-full transition-all duration-200 cursor-pointer min-h-[44px] flex items-center gap-1.5 relative ${
          currentView === 'radar'
            ? 'bg-[#4A2E1B] text-[#FAF7F2] shadow-sm'
            : 'text-[#4A2E1B] hover:text-[#361F11] hover:bg-white/40'
        }`}
      >
        <span class="w-2 h-2 rounded-full bg-[#D97706] animate-pulse"></span>
        <span>{language === 'tl' ? 'Radar' : 'Radar'}</span>
      </button>

      <button
        type="button"
        on:click={() => onViewChange('tinda')}
        class={`px-4 sm:px-5 py-2 rounded-full transition-all duration-200 cursor-pointer min-h-[44px] flex items-center gap-1.5 ${
          currentView === 'tinda'
            ? 'bg-[#4A2E1B] text-[#FAF7F2] shadow-sm'
            : 'text-[#4A2E1B] hover:text-[#361F11] hover:bg-white/40'
        }`}
      >
        <span>🛒</span>
        <span>{language === 'tl' ? 'Tinda' : 'Vendor'}</span>
      </button>
    </nav>

    <!-- Right Controls: Accessibility & Language -->
    <div class="flex items-center gap-2">
      <!-- Font Scale Toggle for Accessibility -->
      <button
        type="button"
        on:click={onTextScaleToggle}
        aria-label="Toggle text scale"
        class={`min-w-[44px] min-h-[44px] w-11 h-11 rounded-full border border-[#EAE4D9] bg-white flex items-center justify-center font-bold text-sm transition-all cursor-pointer shadow-xs active:scale-95 ${
          largeText ? 'bg-[#4A2E1B] text-[#FAF7F2] border-[#4A2E1B]' : 'text-[#4A2E1B] hover:bg-[#FAF7F2]'
        }`}
        title={language === 'tl' ? 'Palakihin ang font' : 'Increase font size'}
      >
        Aa
      </button>

      <!-- Language Switcher -->
      <button
        type="button"
        on:click={onLanguageToggle}
        class="min-h-[44px] px-3.5 py-2 rounded-full border border-[#EAE4D9] bg-white text-xs font-bold text-[#4A2E1B] hover:bg-[#FAF7F2] transition shadow-xs active:scale-95 cursor-pointer flex items-center gap-1.5"
      >
        <span>{language === 'tl' ? '🇵🇭' : '🌐'}</span>
        <span>{language === 'tl' ? 'Tagalog' : 'English'}</span>
      </button>
    </div>
  </div>
</header>
