<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { Language, UserRole } from '../types';
  import Logo from './Logo.svelte';

  export let language: Language = 'tl';
  export let isDarkMode: boolean = false;
  export let onToggleDarkMode: () => void;
  export let onToggleLanguage: (() => void) | undefined = undefined;
  export let onStart: () => void;
  export let onSelectRoleDirect: (role: UserRole) => void;

  // Dynamic rotating headline phrases
  const dynamicPhrases = ['Saan pepwesto?', 'Saan kaya may taho?'];
  let currentPhraseIndex = 0;
  let isFading = false;
  let phraseTimer: any;

  // State for "How it Works" modal
  let showHowItWorks: boolean = false;

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

<div class={`min-h-screen flex flex-col justify-between transition-colors duration-300 ${
  isDarkMode ? 'bg-[#1A120B] text-[#FAF7F2]' : 'bg-[#FAF7F2] text-[#4A2E1B]'
}`}>
  <!-- Top Header with Logo & Controls -->
  <header class="max-w-5xl w-full mx-auto flex items-center justify-between p-4 sm:p-8 py-4 sm:py-6">
    <div class="flex items-center gap-3">
      <Logo {isDarkMode} className="h-9 sm:h-11 w-auto object-contain cursor-pointer" />
    </div>

    <!-- Right Controls: Language Toggle + Dark Mode Toggle -->
    <div class="flex items-center gap-2">
      {#if onToggleLanguage}
        <button
          type="button"
          on:click={onToggleLanguage}
          class={`min-w-[44px] min-h-[44px] w-11 h-11 rounded-full border flex items-center justify-center text-xs font-black transition-all cursor-pointer shadow-xs active:scale-95 ${
            isDarkMode
              ? 'bg-[#271A10] border-[#3D2717] text-[#FAF7F2] hover:bg-[#352317]'
              : 'bg-white border-[#EAE4D9] text-[#4A2E1B] hover:bg-[#FAF7F2]'
          }`}
          title={language === 'tl' ? 'Switch to English' : 'Lumipat sa Tagalog'}
          aria-label="Toggle Language"
        >
          <span>{language === 'tl' ? 'EN' : 'TL'}</span>
        </button>
      {/if}
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
  <main class="max-w-3xl w-full mx-auto px-4 sm:px-8 py-8 sm:py-16 text-center space-y-8 sm:space-y-10">
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
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-4 text-left max-w-xl mx-auto">
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

    <!-- Scroll Down Feature Highlights Bento Strip -->
    <div class="pt-16 pb-8 border-t border-[#EAE4D9] dark:border-[#3D2717] max-w-4xl mx-auto text-left">
      <div class="text-center mb-8">
        <span class="text-xs font-black uppercase tracking-wider text-[#D97706]">
          {language === 'tl' ? 'Matalinong Teknolohiya sa Kalye' : 'Hyperlocal Street Intelligence'}
        </span>
        <h3 class="text-xl sm:text-2xl font-black mt-1">
          {language === 'tl' ? 'Binuo Para sa Araw-Araw na Pilipino' : 'Built for the Everyday Filipino'}
        </h3>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class={`p-5 rounded-[24px] border ${
          isDarkMode ? 'bg-[#271A10] border-[#3D2717]' : 'bg-white border-[#EAE4D9]'
        }`}>
          <h4 class="font-bold text-sm">
            {language === 'tl' ? 'Live Peddler Radar' : 'Live Peddler Radar'}
          </h4>
          <p class={`text-xs mt-1 leading-relaxed ${isDarkMode ? 'text-[#D6C7B2]' : 'text-[#796658]'}`}>
            {language === 'tl'
              ? 'Alerto at audio chime kapag nasa 200m na si Kuya Taho o Balut bago pa lumagpas sa tapat.'
              : 'Real-time proximity alerts and audio chimes before roving vendors walk past your door.'}
          </p>
        </div>

        <div class={`p-5 rounded-[24px] border ${
          isDarkMode ? 'bg-[#271A10] border-[#3D2717]' : 'bg-white border-[#EAE4D9]'
        }`}>
          <h4 class="font-bold text-sm">
            {language === 'tl' ? 'Huff Gravity Model' : 'Huff Gravity Model'}
          </h4>
          <p class={`text-xs mt-1 leading-relaxed ${isDarkMode ? 'text-[#D6C7B2]' : 'text-[#796658]'}`}>
            {language === 'tl'
              ? 'Pagsusuri sa dagsa ng tao malapit sa sakayan (jeep, tricycle, tawiran) laban sa density ng kalaban.'
              : 'Spatial attraction scoring near transit hubs (jeepney stops, tricycle queues) penalized by competition.'}
          </p>
        </div>

        <div class={`p-5 rounded-[24px] border ${
          isDarkMode ? 'bg-[#271A10] border-[#3D2717]' : 'bg-white border-[#EAE4D9]'
        }`}>
          <h4 class="font-bold text-sm">
            {language === 'tl' ? 'Pure OpenStreetMap' : 'Pure OpenStreetMap'}
          </h4>
          <p class={`text-xs mt-1 leading-relaxed ${isDarkMode ? 'text-[#D6C7B2]' : 'text-[#796658]'}`}>
            {language === 'tl'
              ? 'Mabilis at walang kalat na mapa. Naka-focus sa paninda at malinaw kahit sa matinding sikat ng araw.'
              : 'Clean, establishment-attenuated street map built on official OpenStreetMap for peak clarity.'}
          </p>
        </div>
      </div>
    </div>
  </main>

  <!-- Sleek Dark Footer (Matching User Reference Image) -->
  <footer class="w-full bg-[#0D0D0D] text-white border-t border-[#222222] mt-auto">
    <div class="max-w-6xl w-full mx-auto px-6 py-6 sm:py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
      <!-- Left Column: Project by Artemio Arcega + How it Works + Competition Badge -->
      <div class="space-y-2.5">
        <h3 class="text-lg sm:text-xl font-bold tracking-tight text-white">
          A Project by ArteamIO
        </h3>

        <div class="flex items-center gap-2.5 flex-wrap">
          <!-- "How it Works" Button (Matching user image: Yellow circle ? + dark pill) -->
          <button
            type="button"
            on:click={() => (showHowItWorks = true)}
            class="px-3.5 py-1.5 rounded-lg bg-[#1F1F1F] hover:bg-[#2A2A2A] border border-[#333333] hover:border-[#444444] transition-all flex items-center gap-2 text-xs font-semibold text-white cursor-pointer active:scale-95 shadow-xs"
          >
            <span class="w-4 h-4 rounded-full bg-[#F59E0B] text-black font-black text-[11px] flex items-center justify-center shrink-0">
              ?
            </span>
            <span>How it Works</span>
          </button>

          <!-- Competition Submitted Badge -->
          <div class="px-3 py-1.5 rounded-lg bg-[#1A1A1A] border border-[#2D2D2D] text-xs font-medium text-[#A3A3A3] flex items-center gap-1.5">
            <span>Submitted to <strong class="text-[#FAF7F2] font-semibold">UST CSSPrint 2026</strong></span>
          </div>
        </div>
      </div>

      <!-- Right Column: 4 Rounded-Square Social & Repository Action Buttons -->
      <div class="flex items-center gap-2.5 shrink-0">
        <!-- 1. Globe / Portfolio Website -->
        <a
          href="https://artemiui.github.io"
          target="_blank"
          rel="noopener noreferrer"
          class="w-10 h-10 rounded-xl bg-[#1A1A1A] hover:bg-[#262626] border border-[#2D2D2D] hover:border-[#444444] text-[#CCCCCC] hover:text-white transition-all flex items-center justify-center cursor-pointer active:scale-95 shadow-xs"
          title="Portfolio / Website"
          aria-label="Website"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="2" y1="12" x2="22" y2="12"/>
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
          </svg>
        </a>

        <!-- 2. GitHub Repository Link -->
        <a
          href="https://github.com/artemiui/arteamio"
          target="_blank"
          rel="noopener noreferrer"
          class="w-10 h-10 rounded-xl bg-[#1A1A1A] hover:bg-[#262626] border border-[#2D2D2D] hover:border-[#444444] text-[#CCCCCC] hover:text-white transition-all flex items-center justify-center cursor-pointer active:scale-95 shadow-xs"
          title="GitHub Repository: github.com/artemiui/arteamio"
          aria-label="GitHub Repository"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>
          </svg>
        </a>

        <!-- 3. LinkedIn Profile -->
        <a
          href="https://www.linkedin.com/in/artemio-arcega"
          target="_blank"
          rel="noopener noreferrer"
          class="w-10 h-10 rounded-xl bg-[#1A1A1A] hover:bg-[#262626] border border-[#2D2D2D] hover:border-[#444444] text-[#CCCCCC] hover:text-white transition-all flex items-center justify-center cursor-pointer active:scale-95 shadow-xs"
          title="LinkedIn"
          aria-label="LinkedIn Profile"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
            <rect x="2" y="9" width="4" height="12"/>
            <circle cx="4" cy="4" r="2"/>
          </svg>
        </a>

        <!-- 4. Instagram Profile -->
        <a
          href="https://www.instagram.com/artemioarcega"
          target="_blank"
          rel="noopener noreferrer"
          class="w-10 h-10 rounded-xl bg-[#1A1A1A] hover:bg-[#262626] border border-[#2D2D2D] hover:border-[#444444] text-[#CCCCCC] hover:text-white transition-all flex items-center justify-center cursor-pointer active:scale-95 shadow-xs"
          title="Instagram"
          aria-label="Instagram Profile"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
            <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
          </svg>
        </a>
      </div>
    </div>
  </footer>
</div>

<!-- "HOW IT WORKS & ABOUT" MODAL -->
{#if showHowItWorks}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fade-in"
    role="dialog"
    aria-modal="true"
    aria-labelledby="how-it-works-title"
  >
    <div class="w-full max-w-lg rounded-[32px] border border-[#333333] bg-[#141414] text-[#FAF7F2] p-6 sm:p-7 shadow-2xl space-y-6">
      <!-- Modal Header -->
      <div class="flex items-start justify-between gap-3">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-[#F59E0B] text-black flex items-center justify-center text-lg font-black">
            ?
          </div>
          <div>
            <h3 id="how-it-works-title" class="text-lg font-black text-white">
              How it Works
            </h3>
          </div>
        </div>

        <button
          type="button"
          on:click={() => (showHowItWorks = false)}
          class="w-8 h-8 rounded-full bg-[#222222] hover:bg-[#333333] text-white flex items-center justify-center text-xs font-bold transition cursor-pointer"
        >
          ✕
        </button>
      </div>

      <!-- Content Explanations -->
      <div class="space-y-3.5 text-xs sm:text-sm text-[#D4D4D4] leading-relaxed">
        <div class="p-4 rounded-2xl bg-[#1A1A1A] border border-[#2A2A2A] space-y-1.5">
          <h4 class="font-bold text-white flex items-center gap-2">
            <span>Bibili (Consumer Radar)</span>
          </h4>
          <p class="text-xs text-[#A3A3A3]">
            Track moving street peddlers (Kuya Taho, Siomai, Balut) in real time on a pure, uncluttered OpenStreetMap canvas. Receive audio chimes and arrival countdowns before they pass your home.
          </p>
        </div>

        <div class="p-4 rounded-2xl bg-[#1A1A1A] border border-[#2A2A2A] space-y-1.5">
          <h4 class="font-bold text-white flex items-center gap-2">
            <span>Magtitinda (Huff Gravity Viability Model)</span>
          </h4>
          <p class="text-xs text-[#A3A3A3]">
            Helps street vendors and food carts calculate foot-traffic viability near transit anchors (jeepney stops, tricycle terminals, footbridges) penalized by nearby competitor density.
          </p>
        </div>

        <!-- Competition & Repository Credits -->
        <div class="p-4 rounded-2xl bg-[#1F1914] border border-[#F59E0B]/30 space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-black uppercase text-[#F59E0B]">Competition Submission</span>
            <span class="text-xs font-extrabold text-white">UST CSSPrint 2026</span>
          </div>
          <p class="text-xs text-[#E5D7C7]">
            Developed by <strong>ArteamIO</strong> for Filipino micro-entrepreneurs and neighborhood consumers.
          </p>
          <div class="pt-1 flex items-center justify-between text-xs font-bold">
            <span class="text-[#A3A3A3]">Source Code:</span>
            <a
              href="https://github.com/artemiui/arteamio"
              target="_blank"
              rel="noopener noreferrer"
              class="text-[#F59E0B] hover:underline flex items-center gap-1"
            >
              <span>github.com/artemiui/arteamio</span>
              <span>↗</span>
            </a>
          </div>
        </div>
      </div>

      <!-- Close Action -->
      <button
        type="button"
        on:click={() => (showHowItWorks = false)}
        class="w-full py-3.5 rounded-2xl font-bold text-sm bg-white hover:bg-neutral-200 text-black transition cursor-pointer active:scale-98"
      >
        Got it! (Naintindihan ko)
      </button>
    </div>
  </div>
{/if}
