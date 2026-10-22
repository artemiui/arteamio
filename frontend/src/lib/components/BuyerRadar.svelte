<script lang="ts">
  import type { Language, LiveVendor } from '../types';

  export let vendors: LiveVendor[] = [];
  export let language: Language = 'tl';
  export let onSelectVendor: (vendor: LiveVendor) => void;

  let alertEnabled: boolean = true;
  let alertSuccessMessage: string | null = null;

  function toggleAlert() {
    alertEnabled = !alertEnabled;
    if (alertEnabled) {
      alertSuccessMessage = language === 'tl'
        ? 'Naka-on ang alerto! Tutunog ang cellphone pag nasa 200m na si Kuya.'
        : 'Radar alert active! You will be notified when a vendor is within 200m.';
      
      // Try soft haptic vibration if available on mobile
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([100, 50, 100]);
      }

      setTimeout(() => {
        alertSuccessMessage = null;
      }, 4500);
    }
  }
</script>

<section class="space-y-4">
  <!-- Warm Callout / Action Reminder -->
  <div class="bg-gradient-to-r from-[#FEF3C7] to-[#FAF7F2] p-4 sm:p-5 rounded-3xl border border-[#D97706]/30 shadow-sm flex items-center justify-between gap-3">
    <div class="flex items-center gap-3">
      <span class="text-3xl">🥣</span>
      <div>
        <h3 class="text-base sm:text-lg font-bold text-[#4A2E1B] leading-tight">
          {language === 'tl' ? 'Ihanda na ang barya at lagayan!' : 'Get your coins & containers ready!'}
        </h3>
        <p class="text-xs sm:text-sm text-[#796658] mt-0.5">
          {language === 'tl'
            ? 'May nag-iikot na Kuya Taho at Balot malapit sa lugar mo.'
            : 'Active roving vendors are walking your neighborhood right now.'}
        </p>
      </div>
    </div>

    <button
      type="button"
      on:click={toggleAlert}
      class={`px-3.5 py-2 rounded-full text-xs font-bold transition shrink-0 cursor-pointer ${
        alertEnabled
          ? 'bg-[#4A2E1B] text-[#FAF7F2] shadow-sm'
          : 'bg-white border border-[#EFE9DF] text-[#796658]'
      }`}
    >
      {alertEnabled
        ? (language === 'tl' ? '🔔 Naka-alerto' : '🔔 Alert On')
        : (language === 'tl' ? '🔕 I-alerto Ako' : '🔕 Alert Me')}
    </button>
  </div>

  {#if alertSuccessMessage}
    <div class="p-3 bg-[#4A2E1B] text-[#FAF7F2] rounded-2xl text-xs font-semibold shadow-md flex items-center gap-2">
      <span>✨</span>
      <span>{alertSuccessMessage}</span>
    </div>
  {/if}

  <!-- Approaching Vendors List (Bento style) -->
  <div class="space-y-3">
    <div class="flex items-center justify-between px-1">
      <h4 class="text-xs font-bold text-[#796658] uppercase tracking-wide">
        {language === 'tl' ? 'Mga Nagtitinda sa Paligid Mo' : 'Vendors in Your Catchment'}
      </h4>
      <span class="text-xs font-semibold text-[#D97706]">
        {vendors.length} {language === 'tl' ? 'aktibo' : 'active'}
      </span>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {#each vendors as vendor}
        <button
          type="button"
          on:click={() => onSelectVendor(vendor)}
          class="bg-white p-4 rounded-3xl border border-[#EFE9DF] shadow-sm hover:border-[#D97706] transition text-left cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="w-10 h-10 rounded-2xl bg-[#FAF7F2] border border-[#EFE9DF] flex items-center justify-center text-xl">
                {vendor.icon}
              </span>
              <span class="text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#FEF3C7] text-[#D97706]">
                ~{vendor.etaMins} {language === 'tl' ? 'minuto' : 'mins'}
              </span>
            </div>

            <h5 class="text-base font-bold text-[#4A2E1B]">{vendor.name}</h5>
            <p class="text-xs text-[#796658] font-medium">{language === 'tl' ? vendor.itemTl : vendor.item}</p>
          </div>

          <div class="mt-4 pt-3 border-t border-[#EFE9DF] flex items-center justify-between text-xs">
            <span class="text-[#796658]">
              {language === 'tl' ? 'Layo:' : 'Distance:'} <strong class="text-[#4A2E1B]">{vendor.distanceM}m</strong>
            </span>
            <span class="text-[11px] text-[#D97706] font-semibold flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full bg-[#D97706] animate-ping"></span>
              {language === 'tl' ? 'Lumalakad' : 'Approaching'}
            </span>
          </div>
        </button>
      {/each}
    </div>
  </div>
</section>
