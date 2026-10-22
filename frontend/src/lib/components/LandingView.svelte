<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { Language, UserRole } from '../types';
  import Logo from './Logo.svelte';

  export let language: Language = 'tl';
  export let isDarkMode: boolean = false;
  export let onToggleDarkMode: () => void;
  export let onStart: () => void;
  export let onSelectRoleDirect: (role: UserRole) => void;

  // Dynamic rotating headline phrases
  const dynamicPhrases = ['Saan pepwesto?', 'Saan kaya may taho?'];
  let currentPhraseIndex = 0;
  let isFading = false;
  let phraseTimer: any;

  onMount(() => {
    phraseTimer = setInterval(() => {
      isFading = true;
      setTimeout(() => {
        currentPhraseIndex = (currentPhraseIndex + 1) % dynamicPhrases.length;
        isFading = false;
      }, 300);
    }, 2800);
  });

  onDestroy(() => {
    if (phraseTimer) {
      clearInterval(phraseTimer);
    }
  });
</script>

<div class={`min-h-screen flex flex-col justify-between p-4 sm:p-8 transition-colors duration-300 ${
  isDarkMode ? 'bg-[#1A120B] text-[#FAF7F2]' : 'bg-[#FAF7F2] text-[#4A2E1B]'
}`}>
  <!-- Top Header with Logo & Controls -->
  <header class="max-w-5xl w-full mx-auto flex items-center justify-between py-3">
    <div class="flex items-center gap-3">
      <Logo {isDarkMode} className="h-9 sm:h-11 w-auto object-contain cursor-pointer" />
    </div>

    <!-- Right Controls: Dark Mode Toggle -->
    <div class="flex items-center gap-2">
      <button
        type="button"
        on:click={onToggleDarkMode}
        class={`min-w-[44px] min-h-[44px] w-11 h-11 rounded-full border flex items-center justify-center text-base transition-all cursor-pointer shadow-xs active:scale-95 ${
          isDarkMode
            ? 'bg-[#271A10] border-[#3D2717] text-[#F59E0B] hover:bg-[#352317]'
            : 'bg-white border-[#EAE4D9] text-[#4A2E1B] hover:bg-[#FAF7F2]'
        }`}
        title={isDarkMode ? 'Lumipat sa Light Mode' : 'Lumipat sa Dark Mode'}
        aria-label="Toggle Dark Mode"
      >
        <span>{isDarkMode ? '☀️' : '🌙'}</span>
      </button>
    </div>
  </header>

  <!-- Hero Content -->
  <main class="max-w-3xl w-full mx-auto my-auto py-8 sm:py-12 text-center space-y-8">
    <!-- Centered Brand Showcase -->
    <div class="flex justify-center">
      <Logo {isDarkMode} className="h-16 sm:h-24 w-auto object-contain" />
    </div>

    <!-- Dynamic Main Headline -->
    <div class="space-y-3 min-h-[110px] sm:min-h-[140px] flex flex-col justify-center">
      <h1
        class={`text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.1] transition-all duration-300 transform ${
          isFading ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
        } ${isDarkMode ? 'text-white' : 'text-[#4A2E1B]'}`}
      >
        {dynamicPhrases[currentPhraseIndex]}
      </h1>
      <p class={`text-sm sm:text-lg font-medium max-w-xl mx-auto leading-relaxed ${
        isDarkMode ? 'text-[#D6C7B2]' : 'text-[#796658]'
      }`}>
        {language === 'tl'
          ? 'Live GPS tracking para sa mga naglalako ng Taho, Siomai, at Balut. Makikita mo kung nasaan na sila bago pa makalagpas sa tapat ng bahay mo.'
          : 'Live neighborhood radar for roving street peddlers. Track approaching vendors and prepare your cash before they walk past.'}
      </p>
    </div>

    <!-- Big "Magsimula" Action Button -->
    <div class="pt-2">
      <button
        type="button"
        on:click={onStart}
        class={`w-full sm:w-auto px-10 py-5 rounded-full font-black text-lg sm:text-xl shadow-lg hover:shadow-xl transition-all transform active:scale-95 cursor-pointer inline-flex items-center justify-center gap-3 min-h-[56px] ${
          isDarkMode
            ? 'bg-[#F59E0B] text-[#1A120B] hover:bg-[#D97706]'
            : 'bg-[#4A2E1B] text-[#FAF7F2] hover:bg-[#361F11]'
        }`}
      >
        <span>{language === 'tl' ? 'Magsimula' : 'Get Started'}</span>
        <span class="text-xl">→</span>
      </button>
    </div>

    <!-- Direct Choice Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-6 text-left max-w-xl mx-auto">
      <button
        type="button"
        on:click={() => onSelectRoleDirect('buyer')}
        class={`p-5 rounded-3xl border-2 transition-all cursor-pointer group flex items-start gap-4 active:scale-98 shadow-xs ${
          isDarkMode
            ? 'bg-[#271A10] border-[#3D2717] hover:border-[#F59E0B]'
            : 'bg-white border-[#EAE4D9] hover:border-[#D97706]'
        }`}
      >
        <span class={`text-3xl p-2.5 rounded-2xl shrink-0 ${
          isDarkMode ? 'bg-[#452B14] text-[#F59E0B]' : 'bg-[#FEF3C7] text-[#D97706]'
        }`}>🥣</span>
        <div>
          <h2 class={`text-base font-extrabold transition-colors ${
            isDarkMode ? 'text-white group-hover:text-[#F59E0B]' : 'text-[#4A2E1B] group-hover:text-[#D97706]'
          }`}>
            {language === 'tl' ? 'Bibili Ako' : "I'm Buying"}
          </h2>
          <p class={`text-xs font-medium mt-1 leading-snug ${
            isDarkMode ? 'text-[#D6C7B2]' : 'text-[#796658]'
          }`}>
            {language === 'tl'
              ? 'Tingnan sa mapa ang mga Kuya Taho, Siomai, at Balut na malapit sa iyo.'
              : 'Spot active vendors nearby on the map and receive arrival notifications.'}
          </p>
        </div>
      </button>

      <button
        type="button"
        on:click={() => onSelectRoleDirect('vendor')}
        class={`p-5 rounded-3xl border-2 transition-all cursor-pointer group flex items-start gap-4 active:scale-98 shadow-xs ${
          isDarkMode
            ? 'bg-[#271A10] border-[#3D2717] hover:border-white'
            : 'bg-white border-[#EAE4D9] hover:border-[#4A2E1B]'
        }`}
      >
        <span class={`text-3xl p-2.5 rounded-2xl border shrink-0 ${
          isDarkMode ? 'bg-[#352317] border-[#4A2E1B] text-white' : 'bg-[#FAF7F2] border-[#EAE4D9] text-[#4A2E1B]'
        }`}>🛒</span>
        <div>
          <h2 class={`text-base font-extrabold transition-colors ${
            isDarkMode ? 'text-white group-hover:text-[#FAF7F2]' : 'text-[#4A2E1B] group-hover:text-[#361F11]'
          }`}>
            {language === 'tl' ? 'Magbebenta Ako' : "I'm Selling"}
          </h2>
          <p class={`text-xs font-medium mt-1 leading-snug ${
            isDarkMode ? 'text-[#D6C7B2]' : 'text-[#796658]'
          }`}>
            {language === 'tl'
              ? 'I-share ang live na ruta ng iyong kariton at maghanap ng mataong pwesto.'
              : 'Broadcast your live pushcart route and discover high-traffic spots.'}
          </p>
        </div>
      </button>
    </div>
  </main>

  <!-- Clean Footer -->
  <footer class={`max-w-5xl w-full mx-auto text-center py-4 border-t text-xs ${
    isDarkMode ? 'border-[#3D2717] text-[#D6C7B2]' : 'border-[#EAE4D9] text-[#796658]'
  }`}>
    <p class="font-semibold">
      PwestoRadar
    </p>
  </footer>
</div>
