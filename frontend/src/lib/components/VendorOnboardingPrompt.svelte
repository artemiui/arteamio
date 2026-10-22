<script lang="ts">
  import type { Language, ProductType } from '../types';

  export let language: Language = 'tl';
  export let onConfirmVendor: (product: string, productType: ProductType, photoUrl?: string) => void;
  export let onBack: () => void;

  let selectedType: ProductType = 'taho';
  let otherProductName: string = '';
  let uploadedPhotoPreview: string | null = null;
  let isCameraActive: boolean = false;

  const PRODUCT_OPTIONS: { id: ProductType; label: string; icon: string }[] = [
    { id: 'taho', label: 'Taho', icon: '🥣' },
    { id: 'siomai', label: 'Siomai', icon: '🥡' },
    { id: 'balut', label: 'Balut', icon: '🥚' },
    { id: 'other', label: 'Other', icon: '⭐' },
  ];

  function handlePhotoUpload(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        uploadedPhotoPreview = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  function simulateTakePhoto() {
    // Quick camera capture simulation for desktop/testing
    uploadedPhotoPreview = 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?auto=format&fit=crop&w=400&q=80';
  }

  function handleSubmit() {
    let finalProductName = 'Taho';
    if (selectedType === 'siomai') finalProductName = 'Siomai';
    if (selectedType === 'balut') finalProductName = 'Balut';
    if (selectedType === 'other') finalProductName = otherProductName.trim() || 'Paninda';

    onConfirmVendor(finalProductName, selectedType, uploadedPhotoPreview || undefined);
  }
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#4A2E1B]/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
  <div class="bg-white w-full max-w-lg rounded-[36px] border border-[#EAE4D9] shadow-2xl p-6 sm:p-8 space-y-6 text-[#4A2E1B] my-auto">
    <!-- Header -->
    <div class="text-center space-y-1">
      <span class="text-3xl">🛒</span>
      <h2 class="text-2xl sm:text-3xl font-black text-[#4A2E1B] tracking-tight">
        {language === 'tl' ? 'Ano ang Iyong Binebenta?' : 'What Are You Selling?'}
      </h2>
      <p class="text-xs sm:text-sm text-[#796658] font-medium">
        {language === 'tl'
          ? 'Piliin ang paninda at mag-upload ng litrato ng iyong kaldero o kariton.'
          : 'Choose your product and upload a quick photo of your stall or kaldero.'}
      </p>
    </div>

    <!-- Product Options ("Binebenta") -->
    <div class="space-y-2">
      <span class="text-xs font-bold uppercase tracking-wider text-[#796658] block">
        {language === 'tl' ? 'Binebenta:' : 'Product:'}
      </span>
      <div class="grid grid-cols-2 gap-2.5">
        {#each PRODUCT_OPTIONS as item}
          <button
            type="button"
            on:click={() => (selectedType = item.id)}
            class={`p-3.5 rounded-2xl border-2 font-bold text-sm sm:text-base flex items-center gap-3 transition-all cursor-pointer min-h-[52px] ${
              selectedType === item.id
                ? 'bg-[#4A2E1B] text-[#FAF7F2] border-[#4A2E1B] shadow-sm'
                : 'bg-[#FAF7F2] text-[#4A2E1B] border-[#EAE4D9] hover:bg-white'
            }`}
          >
            <span class="text-2xl">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        {/each}
      </div>

      {#if selectedType === 'other'}
        <div class="pt-2">
          <input
            type="text"
            bind:value={otherProductName}
            placeholder={language === 'tl' ? 'Ilagay ang paninda (hal. Kape, Banana Cue, Pares)...' : 'Type custom product (e.g. Coffee, Turon)...'}
            class="w-full px-4 py-3 rounded-2xl bg-[#FAF7F2] border-2 border-[#EAE4D9] focus:border-[#4A2E1B] text-sm font-bold text-[#4A2E1B] outline-none"
          />
        </div>
      {/if}
    </div>

    <!-- Photo Verification (Kaldero / Stall) -->
    <div class="space-y-2 pt-1">
      <span class="text-xs font-bold uppercase tracking-wider text-[#796658] block">
        {language === 'tl' ? 'Litrato ng Kaldero o Pwesto (Verification):' : 'Photo of Stall / Kaldero:'}
      </span>

      <div class="p-4 rounded-2xl bg-[#FAF7F2] border-2 border-dashed border-[#EAE4D9] flex flex-col items-center justify-center text-center gap-3">
        {#if uploadedPhotoPreview}
          <div class="relative w-full max-h-36 overflow-hidden rounded-xl border border-[#EAE4D9]">
            <img src={uploadedPhotoPreview} alt="Verified stall" class="w-full h-36 object-cover" />
            <button
              type="button"
              on:click={() => (uploadedPhotoPreview = null)}
              class="absolute top-2 right-2 px-2.5 py-1 rounded-full bg-black/70 text-white text-[11px] font-bold"
            >
              Palitan ✕
            </button>
          </div>
          <span class="text-xs text-[#D97706] font-bold">
            ✓ {language === 'tl' ? 'May Litrato na ang Kaldero / Pwesto' : 'Stall photo attached'}
          </span>
        {:else}
          <div class="w-12 h-12 rounded-2xl bg-white border border-[#EAE4D9] flex items-center justify-center text-2xl shadow-xs">
            📸
          </div>
          <p class="text-xs text-[#796658] font-medium max-w-xs">
            {language === 'tl'
              ? 'Kunan ng litrato ang iyong kaldero, kariton, o pwesto para magtiwala ang mga mamimili.'
              : 'Take a photo of your cart, kaldero, or stand so nearby buyers can trust your live pin.'}
          </p>

          <div class="flex items-center gap-2">
            <!-- Native file / camera input -->
            <label class="px-4 py-2.5 rounded-full bg-white border border-[#EAE4D9] text-xs font-bold text-[#4A2E1B] hover:bg-[#FAF7F2] cursor-pointer shadow-xs min-h-[44px] flex items-center gap-1.5">
              <span>📷</span>
              <span>{language === 'tl' ? 'Kumuha ng Litrato' : 'Take / Upload Photo'}</span>
              <input type="file" accept="image/*" capture="environment" on:change={handlePhotoUpload} class="hidden" />
            </label>

            <!-- Quick sample photo for testing without camera -->
            <button
              type="button"
              on:click={simulateTakePhoto}
              class="px-3 py-2.5 rounded-full bg-[#FEF3C7] text-xs font-bold text-[#D97706] hover:bg-[#FDE68A] cursor-pointer min-h-[44px]"
            >
              ⚡ Sample
            </button>
          </div>
        {/if}
      </div>
    </div>

    <!-- Actions -->
    <div class="flex items-center gap-2 pt-2">
      <button
        type="button"
        on:click={onBack}
        class="px-5 py-3.5 rounded-2xl border border-[#EAE4D9] bg-white text-xs font-bold text-[#796658] hover:bg-[#FAF7F2] transition cursor-pointer min-h-[48px]"
      >
        ← {language === 'tl' ? 'Bumalik' : 'Back'}
      </button>

      <button
        type="button"
        on:click={handleSubmit}
        class="flex-1 py-3.5 px-6 rounded-2xl bg-[#4A2E1B] text-[#FAF7F2] hover:bg-[#361F11] font-black text-sm sm:text-base shadow-md transition cursor-pointer min-h-[48px] flex items-center justify-center gap-2 active:scale-98"
      >
        <span>{language === 'tl' ? 'Simulan ang Pagtitinda' : 'Start Selling & View Map'}</span>
        <span>→</span>
      </button>
    </div>
  </div>
</div>
