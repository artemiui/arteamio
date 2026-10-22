<script lang="ts">
  import type { Language } from '../types';

  export let language: Language = 'tl';

  let isBroadcasting: boolean = false;
  let hasStock: boolean = true;
  let selectedProduct: string = 'Taho';
  let audienceCount: number = 24;

  function toggleBroadcasting() {
    isBroadcasting = !isBroadcasting;
    if (isBroadcasting) {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(250);
      }
    }
  }

  function toggleStock() {
    hasStock = !hasStock;
  }
</script>

<section class="space-y-4">
  <!-- Giant One-Touch Broadcast Card -->
  <div class="bg-white p-6 sm:p-8 rounded-[32px] border border-[#EAE4D9] shadow-xs text-center">
    <div class="max-w-md mx-auto space-y-5">
      <!-- Status Badge -->
      <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-wide ${
        isBroadcasting ? 'bg-[#FEF3C7] text-[#D97706] border border-[#D97706]/30' : 'bg-[#FAF7F2] text-[#796658] border border-[#EAE4D9]'
      }">
        <span class={`w-2.5 h-2.5 rounded-full ${isBroadcasting ? 'bg-[#D97706] animate-ping' : 'bg-[#796658]'}`}></span>
        {isBroadcasting
          ? (language === 'tl' ? 'Nagbo-broadcast (Live GPS)' : 'Live GPS Broadcasting Active')
          : (language === 'tl' ? 'Naka-offline ang Pwesto' : 'Broadcast Paused')}
      </div>

      <!-- Main Headline -->
      <div>
        <h3 class="text-2xl sm:text-3xl font-black text-[#4A2E1B] tracking-tight">
          {isBroadcasting
            ? (language === 'tl' ? 'Live ka na sa mga kapitbahay!' : 'Broadcasting your live route!')
            : (language === 'tl' ? 'Handa Ka Na Bang Magtinda?' : 'Ready to Start Your Route?')}
        </h3>
        <p class="text-xs sm:text-sm text-[#796658] mt-1.5 font-medium">
          {language === 'tl'
            ? 'I-tap ang malaking buton sa ibaba para makapaghanda na ang mga bibili bago ka pa makalampas.'
            : 'Tap the button below so nearby residents receive proximity alerts before you pass by.'}
        </p>
      </div>

      <!-- Giant One-Touch Action Button (Huge Touch Target) -->
      <button
        type="button"
        on:click={toggleBroadcasting}
        class={`w-full py-5 rounded-[24px] font-black text-base sm:text-lg shadow-md transition-all duration-200 transform active:scale-95 cursor-pointer min-h-[64px] flex items-center justify-center gap-2 ${
          isBroadcasting
            ? 'bg-[#D97706] text-white hover:bg-[#B45309]'
            : 'bg-[#4A2E1B] text-[#FAF7F2] hover:bg-[#361F11]'
        }`}
      >
        <span>{isBroadcasting ? '⏹' : '▶'}</span>
        <span>
          {isBroadcasting
            ? (language === 'tl' ? 'Itigil ang Pag-broadcast' : 'Stop Broadcasting')
            : (language === 'tl' ? 'Simulan ang Ruta (I-share ang Lokasyon)' : 'Start Route (Share Live GPS)')}
        </span>
      </button>

      <!-- Live Waiting Buyers Pill -->
      {#if isBroadcasting}
        <div class="p-3.5 bg-[#FAF7F2] border border-[#EAE4D9] rounded-2xl text-xs sm:text-sm text-[#4A2E1B] font-bold flex items-center justify-center gap-2 animate-pulse">
          <span class="text-base">👥</span>
          <span>
            <strong>{audienceCount}</strong> {language === 'tl' ? 'na kapitbahay sa paligid ang naghihintay sa ruta mo!' : 'neighbors currently waiting along your path!'}
          </span>
        </div>
      {/if}
    </div>
  </div>

  <!-- Bento Controls: Stock & Product Selection -->
  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
    <!-- Stock Toggle Card -->
    <div class="bg-white p-5 rounded-[28px] border border-[#EAE4D9] shadow-xs flex items-center justify-between">
      <div>
        <span class="text-xs font-bold text-[#796658] uppercase tracking-wider">
          {language === 'tl' ? 'Imbentaryo ng Tinda' : 'Stock Availability'}
        </span>
        <p class="text-lg font-black text-[#4A2E1B] mt-1">
          {hasStock
            ? (language === 'tl' ? '✅ May Tinda Pa' : '✅ In Stock')
            : (language === 'tl' ? '❌ Ubos Na' : '❌ Sold Out')}
        </p>
      </div>

      <button
        type="button"
        on:click={toggleStock}
        class="min-h-[44px] px-5 py-2.5 rounded-full border border-[#EAE4D9] bg-[#FAF7F2] text-xs font-extrabold text-[#4A2E1B] hover:bg-white transition cursor-pointer active:scale-95"
      >
        {language === 'tl' ? 'Palitan' : 'Change'}
      </button>
    </div>

    <!-- Product Preset Selector -->
    <div class="bg-white p-5 rounded-[28px] border border-[#EAE4D9] shadow-xs">
      <span class="text-xs font-bold text-[#796658] uppercase tracking-wider block mb-2.5">
        {language === 'tl' ? 'Produktong Dala' : 'Product Type'}
      </span>
      <div class="flex items-center gap-2 flex-wrap">
        {#each ['Taho', 'Balot', 'Siomai', 'Kape'] as prod}
          <button
            type="button"
            on:click={() => (selectedProduct = prod)}
            class={`min-h-[40px] px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
              selectedProduct === prod
                ? 'bg-[#4A2E1B] text-[#FAF7F2] shadow-xs'
                : 'bg-[#FAF7F2] text-[#4A2E1B] border border-[#EAE4D9] hover:bg-white'
            }`}
          >
            {prod}
          </button>
        {/each}
      </div>
    </div>
  </div>
</section>
