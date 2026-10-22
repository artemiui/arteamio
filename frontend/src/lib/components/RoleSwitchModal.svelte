<script lang="ts">
  import type { Language, UserRole } from '../types';

  export let currentRole: UserRole;
  export let language: Language = 'tl';
  export let isDarkMode: boolean = false;
  export let onConfirmSwitch: () => void;
  export let onCancel: () => void;

  const targetRole: UserRole = currentRole === 'buyer' ? 'vendor' : 'buyer';
</script>

<div
  class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
  role="dialog"
  aria-modal="true"
  aria-labelledby="modal-title"
>
  <div
    class={`w-full max-w-md rounded-[32px] border p-6 sm:p-7 shadow-2xl space-y-6 transition-colors ${
      isDarkMode
        ? 'bg-[#271A10] border-[#3D2717] text-[#FAF7F2]'
        : 'bg-white border-[#EAE4D9] text-[#4A2E1B]'
    }`}
  >
    <!-- Icon & Badge -->
    <div class="flex items-center gap-3">
      <div
        class={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl border ${
          isDarkMode
            ? 'bg-[#452B14] border-[#F59E0B]/30 text-[#F59E0B]'
            : 'bg-[#FEF3C7] border-[#D97706]/30 text-[#D97706]'
        }`}
      >
        {targetRole === 'vendor' ? '🛒' : '🥣'}
      </div>
      <div>
        <span class={`text-[11px] font-black uppercase tracking-wider ${isDarkMode ? 'text-[#F59E0B]' : 'text-[#D97706]'}`}>
          {language === 'tl' ? 'Kumpirmasyon ng Paglipat' : 'Mode Switch Confirmation'}
        </span>
        <h3 id="modal-title" class="text-lg font-black leading-tight">
          {#if targetRole === 'vendor'}
            {language === 'tl' ? 'Nais mo bang maging Magtitinda?' : 'Switch to Vendor Mode?'}
          {:else}
            {language === 'tl' ? 'Nais mo bang maging Mamimili?' : 'Switch to Buyer Mode?'}
          {/if}
        </h3>
      </div>
    </div>

    <!-- Explanation Box -->
    <div
      class={`p-4 rounded-2xl border text-xs sm:text-sm leading-relaxed ${
        isDarkMode
          ? 'bg-[#1A120B] border-[#3D2717] text-[#D6C7B2]'
          : 'bg-[#FAF7F2] border-[#EAE4D9] text-[#796658]'
      }`}
    >
      {#if targetRole === 'vendor'}
        <p>
          {language === 'tl'
            ? 'Upang maging opisyal na Tindero sa PwestoRadar, kakailanganin mong pumili ng iyong paninda (Taho, Siomai, Balut, atbp.) at mag-upload ng larawan ng iyong kaldero o kariton upang ma-verify ng mga suki.'
            : 'To become a verified Vendor on PwestoRadar, you will need to select your products and submit a photo of your stall or cart for verification.'}
        </p>
      {:else}
        <p>
          {language === 'tl'
            ? 'Lilipat ka sa Mamimili (Buyer) Mode. Pansamantalang ititigil ang iyong live broadcast at mawawala ang iyong pwesto sa mapa para sa mga kapitbahay.'
            : 'You will switch to Buyer Mode. Your active live broadcast will be paused and your vendor pin will be removed from the map.'}
        </p>
      {/if}
    </div>

    <!-- Action Buttons -->
    <div class="space-y-2.5 pt-2">
      <button
        type="button"
        on:click={onConfirmSwitch}
        class={`w-full py-4 rounded-2xl font-black text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-98 min-h-[48px] ${
          targetRole === 'vendor'
            ? isDarkMode
              ? 'bg-[#F59E0B] text-[#1A120B] hover:bg-[#D97706]'
              : 'bg-[#4A2E1B] text-[#FAF7F2] hover:bg-[#361F11]'
            : isDarkMode
              ? 'bg-[#F59E0B] text-[#1A120B] hover:bg-[#D97706]'
              : 'bg-[#4A2E1B] text-[#FAF7F2] hover:bg-[#361F11]'
        }`}
      >
        <span>{targetRole === 'vendor' ? '🛒' : '🥣'}</span>
        <span>
          {#if targetRole === 'vendor'}
            {language === 'tl' ? 'Oo, Magpatuloy sa Magtitinda' : 'Yes, Continue to Vendor Setup'}
          {:else}
            {language === 'tl' ? 'Oo, Lumipat sa Mamimili' : 'Yes, Switch to Buyer Mode'}
          {/if}
        </span>
      </button>

      <button
        type="button"
        on:click={onCancel}
        class={`w-full py-3 rounded-2xl font-bold text-xs transition border cursor-pointer ${
          isDarkMode
            ? 'bg-transparent border-[#3D2717] text-[#D6C7B2] hover:bg-[#352317]'
            : 'bg-transparent border-[#EAE4D9] text-[#796658] hover:bg-[#FAF7F2]'
        }`}
      >
        {language === 'tl' ? 'Huwag Muna (Kanselahin)' : 'Cancel (Stay in Current Mode)'}
      </button>
    </div>
  </div>
</div>
