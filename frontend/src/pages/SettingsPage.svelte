<script lang="ts">
  import type { DemandHotspot, Language, UserSession } from '../lib/types';
  import { getAllDemandHotspots } from '../lib/data/hotspots';
  import Logo from '../lib/components/Logo.svelte';
  import HotspotConfigModal from '../lib/components/HotspotConfigModal.svelte';

  export let language: Language = 'tl';
  export let isDarkMode: boolean = false;
  export let largeText: boolean = false;
  export let session: UserSession | null = null;
  export let onToggleDarkMode: () => void;
  export let onToggleLanguage: () => void;
  export let onToggleTextScale: () => void;
  export let onSwitchRole: () => void;
  export let onResetSession: () => void;
  export let onNavigate: (route: string) => void;

  let testChimePlayed: boolean = false;
  let showHotspotConfigModal: boolean = false;
  let hotspots: DemandHotspot[] = getAllDemandHotspots(session?.lat || 14.6091, session?.lng || 120.9898);

  function reloadHotspots() {
    hotspots = getAllDemandHotspots(session?.lat || 14.6091, session?.lng || 120.9898);
  }

  function playTestChime() {
    testChimePlayed = true;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.6);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.6);
    } catch (e) {
      // Audio fallback
    }

    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([150, 80, 150]);
    }

    setTimeout(() => {
      testChimePlayed = false;
    }, 2000);
  }
</script>

<div class={`min-h-screen p-4 sm:p-8 flex flex-col justify-between transition-colors duration-300 ${
  isDarkMode ? 'bg-[#1A120B] text-[#FAF7F2]' : 'bg-[#FAF7F2] text-[#4A2E1B]'
}`}>
  <div class="max-w-2xl w-full mx-auto space-y-6">
    <!-- Top Navigation Header -->
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
        <span>←</span>
        <span>{language === 'tl' ? 'Bumalik sa Mapa' : 'Back to Map'}</span>
      </button>

      <button
        type="button"
        on:click={() => onNavigate('landing')}
        class="cursor-pointer transition-transform active:scale-95 flex items-center"
        title="Bumalik sa Simula"
      >
        <Logo {isDarkMode} className="h-7 w-auto object-contain" />
      </button>

      <span class="text-xs font-bold text-[#D97706]">
        ⚙️ {language === 'tl' ? 'Mga Setting' : 'Settings'}
      </span>
    </header>

    <!-- Page Title -->
    <div>
      <h1 class="text-2xl sm:text-3xl font-black tracking-tight">
        {language === 'tl' ? 'Mga Setting ng App' : 'App Settings'}
      </h1>
      <p class={`text-xs sm:text-sm mt-1 font-medium ${isDarkMode ? 'text-[#D6C7B2]' : 'text-[#796658]'}`}>
        {language === 'tl'
          ? 'I-customize ang hitsura, wika, tunog, at lokasyon ng iyong Pwesto.'
          : 'Customize appearance, language, audio alerts, and location for Pwesto.'}
      </p>
    </div>

    <!-- Settings Groups (Facebook / iOS style simplicity) -->
    <div class="space-y-4">
      <!-- 1. HITSURA (APPEARANCE & THEME) -->
      <section class={`p-5 rounded-[28px] border space-y-4 ${
        isDarkMode ? 'bg-[#271A10] border-[#3D2717]' : 'bg-white border-[#EAE4D9]'
      }`}>
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-sm font-extrabold">{language === 'tl' ? 'Hitsura at Tema' : 'Appearance'}</h2>
            <p class={`text-xs font-medium mt-0.5 ${isDarkMode ? 'text-[#D6C7B2]' : 'text-[#796658]'}`}>
              {isDarkMode ? 'Naka-on ang Dark Mode' : 'Naka-on ang Light Mode (Taho)'}
            </p>
          </div>

          <button
            type="button"
            on:click={onToggleDarkMode}
            class={`px-4 py-2 rounded-full border text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xs ${
              isDarkMode
                ? 'bg-[#F59E0B] text-[#1A120B] border-[#F59E0B]'
                : 'bg-[#FAF7F2] text-[#4A2E1B] border-[#EAE4D9]'
            }`}
          >
            <span>{isDarkMode ? '☀️' : '🌙'}</span>
            <span>{isDarkMode ? 'Light' : 'Dark'}</span>
          </button>
        </div>
      </section>

      <!-- 2. WIKA AT ACCESSIBILITY -->
      <section class={`p-5 rounded-[28px] border space-y-4 ${
        isDarkMode ? 'bg-[#271A10] border-[#3D2717]' : 'bg-white border-[#EAE4D9]'
      }`}>
        <!-- Language Switcher Row -->
        <div class="flex items-center justify-between pb-3 border-b border-[#EAE4D9] dark:border-[#3D2717]">
          <div>
            <h2 class="text-sm font-extrabold">{language === 'tl' ? 'Wika ng App' : 'Language'}</h2>
            <p class={`text-xs font-medium mt-0.5 ${isDarkMode ? 'text-[#D6C7B2]' : 'text-[#796658]'}`}>
              {language === 'tl' ? 'Simpleng Tagalog' : 'Simple English'}
            </p>
          </div>

          <button
            type="button"
            on:click={onToggleLanguage}
            class={`px-4 py-2 rounded-full border text-xs font-bold cursor-pointer shadow-xs ${
              isDarkMode ? 'bg-[#352317] border-[#3D2717] text-white' : 'bg-[#FAF7F2] border-[#EAE4D9] text-[#4A2E1B]'
            }`}
          >
            {language === 'tl' ? '🇵🇭 Tagalog' : '🌐 English'}
          </button>
        </div>

        <!-- Text Scale Row -->
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-sm font-extrabold">{language === 'tl' ? 'Laki ng Titik (Text Size)' : 'Text Scaling'}</h2>
            <p class={`text-xs font-medium mt-0.5 ${isDarkMode ? 'text-[#D6C7B2]' : 'text-[#796658]'}`}>
              {largeText ? (language === 'tl' ? 'Malaki (Accessible)' : 'Large font') : (language === 'tl' ? 'Normal' : 'Standard')}
            </p>
          </div>

          <button
            type="button"
            on:click={onToggleTextScale}
            class={`px-4 py-2 rounded-full border text-xs font-bold cursor-pointer shadow-xs ${
              largeText
                ? (isDarkMode ? 'bg-[#F59E0B] text-[#1A120B] border-[#F59E0B]' : 'bg-[#4A2E1B] text-white border-[#4A2E1B]')
                : (isDarkMode ? 'bg-[#352317] border-[#3D2717] text-white' : 'bg-[#FAF7F2] border-[#EAE4D9] text-[#4A2E1B]')
            }`}
          >
            Aa ({largeText ? 'Malaki' : 'Normal'})
          </button>
        </div>
      </section>

      <!-- 3. ROLE & GAMPANIN -->
      <section class={`p-5 rounded-[28px] border space-y-3 ${
        isDarkMode ? 'bg-[#271A10] border-[#3D2717]' : 'bg-white border-[#EAE4D9]'
      }`}>
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-sm font-extrabold">{language === 'tl' ? 'Iyong Gampanin' : 'Current Role'}</h2>
            <p class={`text-xs font-medium mt-0.5 ${isDarkMode ? 'text-[#D6C7B2]' : 'text-[#796658]'}`}>
              {session?.role === 'vendor'
                ? (language === 'tl' ? '🛒 Nagtitinda (Vendor Mode)' : '🛒 Vendor')
                : (language === 'tl' ? '🥣 Mamimili (Consumer Mode)' : '🥣 Buyer')}
            </p>
          </div>

          <button
            type="button"
            on:click={onSwitchRole}
            class={`px-4 py-2 rounded-full border text-xs font-bold cursor-pointer shadow-xs ${
              isDarkMode ? 'bg-[#352317] border-[#3D2717] text-white' : 'bg-[#FAF7F2] border-[#EAE4D9] text-[#4A2E1B]'
            }`}
          >
            {language === 'tl' ? 'Palitan ang Role' : 'Switch Role'}
          </button>
        </div>
      </section>

      <!-- 4. TUNOG AT HAPTICS -->
      <section class={`p-5 rounded-[28px] border space-y-3 ${
        isDarkMode ? 'bg-[#271A10] border-[#3D2717]' : 'bg-white border-[#EAE4D9]'
      }`}>
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-sm font-extrabold">{language === 'tl' ? 'Alerto at Tunog ng Kuya Taho' : 'Proximity Chime & Vibrate'}</h2>
            <p class={`text-xs font-medium mt-0.5 ${isDarkMode ? 'text-[#D6C7B2]' : 'text-[#796658]'}`}>
              {language === 'tl' ? 'Subukan ang tunog kapag nasa 200m na ang vendor' : 'Test arrival sound & vibration alert'}
            </p>
          </div>

          <button
            type="button"
            on:click={playTestChime}
            class={`px-4 py-2 rounded-full border text-xs font-bold cursor-pointer shadow-xs ${
              testChimePlayed
                ? 'bg-green-600 text-white border-green-600'
                : (isDarkMode ? 'bg-[#352317] border-[#3D2717] text-white' : 'bg-[#FAF7F2] border-[#EAE4D9] text-[#4A2E1B]')
            }`}
          >
            {testChimePlayed ? '🔊 Tumutunog!' : '🔔 I-test ang Tunog'}
          </button>
        </div>
      </section>

      <!-- 5. ISKEDYUL AT DEMAND HOTSPOTS CONFIGURATION -->
      <section class={`p-5 rounded-[28px] border space-y-3 ${
        isDarkMode ? 'bg-[#271A10] border-[#3D2717]' : 'bg-white border-[#EAE4D9]'
      }`}>
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-sm font-extrabold flex items-center gap-1.5">
              <span>🔥</span>
              <span>{language === 'tl' ? 'Iskedyul ng Paaralan at Events' : 'School Schedules & Events'}</span>
            </h2>
            <p class={`text-xs font-medium mt-0.5 ${isDarkMode ? 'text-[#D6C7B2]' : 'text-[#796658]'}`}>
              {language === 'tl'
                ? `I-configure ang mga oras ng uwian, liga sa basketball, at barangay events (${hotspots.length} aktibo).`
                : `Configure school dismissal times, basketball tournaments, and barangay events (${hotspots.length} active).`}
            </p>
          </div>

          <button
            type="button"
            on:click={() => (showHotspotConfigModal = true)}
            class={`px-4 py-2 rounded-full border text-xs font-bold cursor-pointer shadow-xs ${
              isDarkMode ? 'bg-[#352317] border-[#3D2717] text-white hover:bg-[#4A2E1B]' : 'bg-[#FAF7F2] border-[#EAE4D9] text-[#4A2E1B] hover:bg-white'
            }`}
          >
            ⚙️ {language === 'tl' ? 'Pamahalaan' : 'Configure'}
          </button>
        </div>
      </section>

      <!-- 6. TUNGKOL SA APP AT EVENT -->
      <section class={`p-5 rounded-[28px] border space-y-2 ${
        isDarkMode ? 'bg-[#271A10] border-[#3D2717]' : 'bg-white border-[#EAE4D9]'
      }`}>
        <h2 class="text-sm font-extrabold">{language === 'tl' ? 'Tungkol sa Pwesto' : 'About Pwesto'}</h2>
        <p class={`text-xs font-medium leading-relaxed ${isDarkMode ? 'text-[#D6C7B2]' : 'text-[#796658]'}`}>
          Ang layunin ng proyektong ito ay bigyan ng abot-kamay na spatial intelligence at real-time radar ang mga maninindang Pilipino at kanilang mga suki saan mang panig ng bansa.
        </p>
        <div class="pt-2 flex items-center gap-3 text-[11px] text-[#D97706] font-bold">
          <span>Bersyon 1.0.0</span>
        </div>
      </section>

      <!-- 7. RESET DATA -->
      <div class="pt-2 text-center">
        <button
          type="button"
          on:click={onResetSession}
          class="px-5 py-3 rounded-full text-xs font-bold text-red-500 hover:bg-red-500/10 border border-red-500/20 transition cursor-pointer"
        >
          🗑️ {language === 'tl' ? 'I-reset ang App at Bumalik sa Simula' : 'Reset Session & Clear Storage'}
        </button>
      </div>
    </div>
  </div>

  {#if showHotspotConfigModal}
    <HotspotConfigModal
      {language}
      {isDarkMode}
      {session}
      activeHotspots={hotspots}
      onClose={() => (showHotspotConfigModal = false)}
      onHotspotsUpdated={reloadHotspots}
    />
  {/if}
</div>
