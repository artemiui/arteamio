<script lang="ts">
  import type { Language, UserRole } from '../types';
  import Icon from './Icon.svelte';

  export let language: Language = 'tl';
  export let onSelect: (role: UserRole) => void;
  export let onBack: () => void;
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#4A2E1B]/60 backdrop-blur-sm animate-fade-in">
  <div class="bg-white w-full max-w-md rounded-[36px] border border-[#EAE4D9] shadow-2xl p-6 sm:p-8 space-y-6 text-[#4A2E1B]">
    <!-- Title -->
    <div class="text-center space-y-1.5">
      <span class="inline-block text-3xl mb-1">🇵🇭</span>
      <h2 class="text-2xl sm:text-3xl font-black text-[#4A2E1B] tracking-tight">
        {language === 'tl' ? 'Bibili o Magbebenta?' : 'Buying or Selling?'}
      </h2>
      <p class="text-xs sm:text-sm text-[#796658] font-medium">
        {language === 'tl'
          ? 'Piliin ang iyong sadya para maihanda namin ang tamang mapa para sa iyo.'
          : 'Choose your activity so we can load the appropriate map interface.'}
      </p>
    </div>

    <!-- 2 Simple Options -->
    <div class="space-y-3">
      <!-- Bibili -->
      <button
        type="button"
        on:click={() => onSelect('buyer')}
        class="w-full p-5 rounded-3xl border-2 border-[#EAE4D9] hover:border-[#D97706] bg-[#FAF7F2] hover:bg-white transition-all text-left flex items-center gap-4 cursor-pointer active:scale-98 shadow-xs"
      >
        <div class="w-14 h-14 rounded-2xl bg-[#FEF3C7] text-[#D97706] flex items-center justify-center shrink-0">
          <Icon name="bowl" size={28} />
        </div>
        <div>
          <h3 class="text-lg font-black text-[#4A2E1B]">
            {language === 'tl' ? 'Bibili' : 'Buying (Consumer)'}
          </h3>
          <p class="text-xs text-[#796658] font-medium mt-0.5">
            {language === 'tl' ? 'Mag-aabang ng Taho, Siomai, Balut, atbp.' : 'Find street food and roving peddlers nearby.'}
          </p>
        </div>
      </button>

      <!-- Magbebenta -->
      <button
        type="button"
        on:click={() => onSelect('vendor')}
        class="w-full p-5 rounded-3xl border-2 border-[#EAE4D9] hover:border-[#4A2E1B] bg-[#FAF7F2] hover:bg-white transition-all text-left flex items-center gap-4 cursor-pointer active:scale-98 shadow-xs"
      >
        <div class="w-14 h-14 rounded-2xl bg-[#4A2E1B] text-[#FAF7F2] flex items-center justify-center shrink-0">
          <Icon name="cart" size={28} />
        </div>
        <div>
          <h3 class="text-lg font-black text-[#4A2E1B]">
            {language === 'tl' ? 'Magbebenta' : 'Selling (Vendor)'}
          </h3>
          <p class="text-xs text-[#796658] font-medium mt-0.5">
            {language === 'tl' ? 'May paninda ako at gustong i-share ang aking pwesto/ruta.' : 'Broadcast live pushcart location & view foot-traffic.'}
          </p>
        </div>
      </button>
    </div>

    <!-- Back Button -->
    <button
      type="button"
      on:click={onBack}
      class="w-full py-3 rounded-2xl text-xs font-bold text-[#796658] hover:text-[#4A2E1B] transition cursor-pointer"
    >
      ← {language === 'tl' ? 'Bumalik sa simula' : 'Back to start'}
    </button>
  </div>
</div>
