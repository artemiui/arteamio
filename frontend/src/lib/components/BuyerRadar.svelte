<script lang="ts">
  import type { Language, LiveVendor } from '../types';
  import Icon from './Icon.svelte';

  export let vendors: LiveVendor[] = [];
  export let language: Language = 'tl';
  export let onSelectVendor: (vendor: LiveVendor) => void;

  let alertEnabled: boolean = true;
  let alertSuccessMessage: string | null = null;
  let simulatedVendorDistance: number = 140;

  function toggleAlert() {
    alertEnabled = !alertEnabled;
    if (alertEnabled) {
      alertSuccessMessage = language === 'tl'
        ? 'Naka-on ang alerto! Tutunog at magba-vibrate ang cellphone kapag nasa 200m na si Kuya.'
        : 'Radar alert active! You will receive proximity alerts when vendors enter your 200m zone.';
      
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([100, 60, 100]);
      }

      setTimeout(() => {
        alertSuccessMessage = null;
      }, 4000);
    }
  }

  function simulateApproach() {
    if (simulatedVendorDistance > 40) {
      simulatedVendorDistance -= 30;
      alertSuccessMessage = language === 'tl'
        ? `🚨 Papalapit na si Kuya Boyet! (${simulatedVendorDistance}m nalang) Ihanda na ang barya!`
        : `🚨 Kuya Boyet is getting closer! (${simulatedVendorDistance}m away) Ready your cash!`;
      
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([200, 100, 200]);
      }
    } else {
      simulatedVendorDistance = 140;
      alertSuccessMessage = language === 'tl' ? 'Naka-reset ang posisyon ni Kuya.' : 'Vendor position reset.';
    }

    setTimeout(() => {
      alertSuccessMessage = null;
    }, 4500);
  }
</script>

<section class="space-y-4">
  <!-- Warm Callout Hero Banner (Inspired by Moonli & Circular Design) -->
  <div class="bg-gradient-to-r from-[#FEF3C7] via-[#FAF7F2] to-white p-5 sm:p-6 rounded-[32px] border border-[#D97706]/25 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
    <div class="flex items-center gap-4">
      <div class="w-14 h-14 rounded-2xl bg-[#D97706] text-white flex items-center justify-center shadow-sm shrink-0">
        <Icon name="bowl" size={28} />
      </div>
      <div>
        <h3 class="text-lg sm:text-xl font-extrabold text-[#4A2E1B] leading-tight">
          {language === 'tl' ? 'Ihanda na ang barya at lagayan!' : 'Get your coins and containers ready!'}
        </h3>
        <p class="text-xs sm:text-sm text-[#796658] mt-1 font-medium">
          {language === 'tl'
            ? 'May naglalakong Kuya Taho at Balot na nag-iikot malapit sa kanto mo.'
            : 'Active roving vendors are currently walking nearby streets.'}
        </p>
      </div>
    </div>

    <!-- Alert Action Controls -->
    <div class="flex items-center gap-2 self-stretch sm:self-auto shrink-0">
      <button
        type="button"
        on:click={simulateApproach}
        class="flex-1 sm:flex-none px-4 py-2.5 rounded-full border border-[#EAE4D9] bg-white text-xs font-bold text-[#4A2E1B] hover:bg-[#FAF7F2] transition shadow-xs cursor-pointer min-h-[44px]"
        title={language === 'tl' ? 'Subukan ang papalapit na alerto' : 'Simulate walking closer'}
      >
        🏃 {language === 'tl' ? 'Gayahin ang Lapit' : 'Simulate Walk'}
      </button>

      <button
        type="button"
        on:click={toggleAlert}
        class={`flex-1 sm:flex-none px-5 py-2.5 rounded-full text-xs font-extrabold transition-all shadow-sm cursor-pointer min-h-[44px] ${
          alertEnabled
            ? 'bg-[#4A2E1B] text-[#FAF7F2]'
            : 'bg-white border border-[#EAE4D9] text-[#796658]'
        }`}
      >
        {alertEnabled
          ? (language === 'tl' ? '🔔 Naka-alerto' : '🔔 Alert On')
          : (language === 'tl' ? '🔕 I-alerto Ako' : '🔕 Alert Me')}
      </button>
    </div>
  </div>

  {#if alertSuccessMessage}
    <div class="p-4 bg-[#4A2E1B] text-[#FAF7F2] rounded-2xl text-xs sm:text-sm font-bold shadow-md flex items-center gap-3 animate-bounce">
      <span class="text-base">✨</span>
      <span>{alertSuccessMessage}</span>
    </div>
  {/if}

  <!-- Active Vendors Bento Grid -->
  <div class="space-y-3">
    <div class="flex items-center justify-between px-1">
      <h4 class="text-xs font-bold text-[#796658] uppercase tracking-wider">
        {language === 'tl' ? 'Mga Naglalako sa Paligid Mo' : 'Active Vendors in Catchment'}
      </h4>
      <span class="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#FEF3C7] text-[#D97706]">
        {vendors.length} {language === 'tl' ? 'nag-iikot ngayon' : 'active right now'}
      </span>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
      {#each vendors as vendor, idx}
        <button
          type="button"
          on:click={() => onSelectVendor(vendor)}
          class="bg-white p-5 rounded-[28px] border border-[#EAE4D9] shadow-xs hover:border-[#D97706] hover:shadow-md transition-all duration-200 text-left cursor-pointer flex flex-col justify-between min-h-[170px]"
        >
          <div>
            <div class="flex items-center justify-between mb-3">
              <span class="w-11 h-11 rounded-2xl bg-[#FAF7F2] border border-[#EAE4D9] flex items-center justify-center text-2xl">
                {vendor.icon}
              </span>
              <span class="text-xs font-extrabold px-3 py-1 rounded-full bg-[#FEF3C7] text-[#D97706] border border-[#D97706]/20">
                ~{vendor.id === 'v-1' ? Math.max(1, Math.round(simulatedVendorDistance / 60)) : vendor.etaMins} {language === 'tl' ? 'min' : 'mins'}
              </span>
            </div>

            <h5 class="text-base font-extrabold text-[#4A2E1B]">{vendor.name}</h5>
            <p class="text-xs text-[#796658] font-semibold mt-0.5">{language === 'tl' ? vendor.itemTl : vendor.item}</p>
          </div>

          <div class="mt-4 pt-3 border-t border-[#EAE4D9] flex items-center justify-between text-xs font-medium">
            <span class="text-[#796658]">
              {language === 'tl' ? 'Layo:' : 'Distance:'} 
              <strong class="text-[#4A2E1B] font-extrabold text-sm">
                {vendor.id === 'v-1' ? simulatedVendorDistance : vendor.distanceM}m
              </strong>
            </span>
            <span class="text-xs text-[#D97706] font-bold flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full bg-[#D97706] animate-pulse"></span>
              {language === 'tl' ? 'Papalapit' : 'Approaching'}
            </span>
          </div>
        </button>
      {/each}
    </div>
  </div>
</section>
