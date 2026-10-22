<script lang="ts">
  import type { Language } from '../types';

  export let language: Language = 'tl';

  let isBroadcasting: boolean = false;
  let hasStock: boolean = true;
  let selectedProduct: string = 'Taho';
  let audienceCount: number = 18;

  function toggleBroadcasting() {
    isBroadcasting = !isBroadcasting;
    if (isBroadcasting) {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(200);
      }
    }
  }

  function toggleStock() {
    hasStock = !hasStock;
  }
</script>

<section class="space-y-4">
  <!-- Giant One-Touch Broadcast Control -->
  <div class="bg-white p-5 sm:p-6 rounded-3xl border border-[#EFE9DF] shadow-sm text-center">
    <div class="max-w-md mx-auto space-y-4">
      <span class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase ${
        isBroadcasting ? 'bg-[#FEF3C7] text-[#D97706]' : 'bg-[#FAF7F2] text-[#796658]'
      }">
        <span class={`w-2 h-2 rounded-full ${isBroadcasting ? 'bg-[#D97706] animate-ping' : 'bg-[#796658]'}`}></span>
        {isBroadcasting
          ? (language === 'tl' ? 'Nagbo-broadcast (Live ang Lokasyon)' : 'Live GPS Broadcasting Active')
          : (language === 'tl' ? 'Naka-offline ang Ruta' : 'Offline / Paused')}
      </span>

      <div>
        <h3 class="text-xl sm:text-2xl font-black text-[#4A2E1B]">
          {isBroadcasting
            ? (language === 'tl' ? 'Nakikita ka na ng mga kapitbahay!' : 'Neighbors can see your live route!')
            : (language === 'tl' ? 'Simulan ang Iyong Pagtitinda' : 'Ready to Start Your Route?')}
        </h3>
        <p class="text-xs sm:text-sm text-[#796658] mt-1">
          {language === 'tl'
            ? 'I-tap ang buton sa ibaba para malaman ng mga taga-Sampaloc na paparating ka.'
            : 'Tap the button below so nearby residents receive alerts ahead of time.'}
        </p>
      </div>

      <!-- Giant One-Touch Action Button -->
      <button
        type="button"
        on:click={toggleBroadcasting}
        class={`w-full py-5 rounded-3xl font-extrabold text-base sm:text-lg shadow-md transition-all transform active:scale-95 cursor-pointer ${
          isBroadcasting
            ? 'bg-[#D97706] text-white hover:bg-[#B45309]'
            : 'bg-[#4A2E1B] text-[#FAF7F2] hover:bg-[#361F11]'
        }`}
      >
        {isBroadcasting
          ? (language === 'tl' ? '⏹ Itigil ang Pag-broadcast' : '⏹ Stop Broadcasting')
          : (language === 'tl' ? '▶ Simulan ang Ruta (Live GPS)' : '▶ Start My Route (Live GPS)')}
      </button>

      <!-- Live Audience / Buyers Waiting Indicator -->
      {#if isBroadcasting}
        <div class="p-3 bg-[#FAF7F2] border border-[#EFE9DF] rounded-2xl text-xs text-[#4A2E1B] flex items-center justify-center gap-2">
          <span>👥</span>
          <span>
            <strong>{audienceCount}</strong> {language === 'tl' ? 'na kapitbahay ang nag-aabang sa pwesto mo' : 'neighbors nearby awaiting your cart'}
          </span>
        </div>
      {/if}
    </div>
  </div>

  <!-- Vendor Settings & Stock Status (Bento Grid) -->
  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
    <!-- Stock Toggle Card -->
    <div class="bg-white p-4 rounded-3xl border border-[#EFE9DF] shadow-sm flex items-center justify-between">
      <div>
        <h4 class="text-xs font-bold text-[#796658] uppercase">
          {language === 'tl' ? 'Katayuan ng Tinda' : 'Stock Availability'}
        </h4>
        <p class="text-base font-bold text-[#4A2E1B] mt-1">
          {hasStock
            ? (language === 'tl' ? '✅ May Tinda Pa' : '✅ In Stock')
            : (language === 'tl' ? '❌ Ubos Na ang Tinda' : '❌ Sold Out')}
        </p>
      </div>

      <button
        type="button"
        on:click={toggleStock}
        class="px-4 py-2 rounded-full border border-[#EFE9DF] bg-[#FAF7F2] text-xs font-bold text-[#4A2E1B] hover:bg-white transition cursor-pointer"
      >
        {language === 'tl' ? 'Palitan' : 'Toggle'}
      </button>
    </div>

    <!-- Product Preset Selector -->
    <div class="bg-white p-4 rounded-3xl border border-[#EFE9DF] shadow-sm">
      <h4 class="text-xs font-bold text-[#796658] uppercase mb-2">
        {language === 'tl' ? 'Produktong Ibinebenta' : 'Product Type'}
      </h4>
      <div class="flex items-center gap-2 flex-wrap">
        {#each ['Taho', 'Balot', 'Siomai', 'Kape'] as prod}
          <button
            type="button"
            on:click={() => (selectedProduct = prod)}
            class={`px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer ${
              selectedProduct === prod
                ? 'bg-[#4A2E1B] text-[#FAF7F2]'
                : 'bg-[#FAF7F2] text-[#4A2E1B] border border-[#EFE9DF]'
            }`}
          >
            {prod}
          </button>
        {/each}
      </div>
    </div>
  </div>
</section>
