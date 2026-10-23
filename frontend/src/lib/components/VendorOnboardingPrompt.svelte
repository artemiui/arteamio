<script lang="ts">
  import type { Language, ProductType } from '../types';
  import Icon from './Icon.svelte';

  export let language: Language = 'tl';
  export let onConfirmVendor: (
    product: string,
    productType: ProductType,
    photoUrl?: string,
    customLocation?: { lat: number; lng: number; name: string },
    extraDetails?: { quantity: number; quantityUnit: string; acceptsGcash: boolean }
  ) => void;
  export let onBack: () => void;

  let selectedType: ProductType = 'taho';
  let otherProductName: string = '';
  let productQuantity: number = 50;
  let acceptsGcash: boolean = true;
  let uploadedPhotoPreview: string | null = null;
  let isCameraActive: boolean = false;
  let selectedBaseId: string = 'gps';
  const BASE_PRESETS = [
    { id: 'espana', label: 'España / UST', icon: '🏫', lat: 14.6091, lng: 120.9898, name: 'España / UST & Sampaloc' },
    { id: 'welcome', label: 'Welcome Rotonda', icon: '🔄', lat: 14.6177, lng: 121.0006, name: 'Welcome Rotonda, QC' },
    { id: 'cubao', label: 'Cubao', icon: '🏢', lat: 14.6200, lng: 121.0530, name: 'Cubao (LRT-2 / MRT-3)' },
    { id: 'recto', label: 'Recto', icon: '🚆', lat: 14.6054, lng: 120.9822, name: 'Recto / Doroteo Jose' },
  ];

  const PRODUCT_OPTIONS: {
    id: ProductType;
    label: string;
    icon: string;
    unitTl: string;
    unitEn: string;
    defaultQty: number;
  }[] = [
    { id: 'taho', label: 'Taho', icon: 'bowl', unitTl: 'baso (cups)', unitEn: 'cups', defaultQty: 50 },
    { id: 'siomai', label: 'Siomai', icon: 'siomai', unitTl: 'piraso (pieces)', unitEn: 'pieces', defaultQty: 100 },
    { id: 'balut', label: 'Balut', icon: 'egg', unitTl: 'piraso (pieces)', unitEn: 'pieces', defaultQty: 40 },
    { id: 'other', label: 'Other', icon: 'star', unitTl: 'order / piraso', unitEn: 'servings / pcs', defaultQty: 30 },
  ];

  $: currentProductMeta = PRODUCT_OPTIONS.find((p) => p.id === selectedType) || PRODUCT_OPTIONS[0];
  $: currentUnitLabel = language === 'tl' ? currentProductMeta.unitTl : currentProductMeta.unitEn;

  function handleSelectProduct(item: typeof PRODUCT_OPTIONS[number]) {
    const prevMeta = PRODUCT_OPTIONS.find((p) => p.id === selectedType);
    selectedType = item.id;
    // Update to sensible default quantity when switching product if still on previous default
    if (!prevMeta || productQuantity === prevMeta.defaultQty) {
      productQuantity = item.defaultQty;
    }
  }

  function adjustQuantity(delta: number) {
    productQuantity = Math.max(1, (Number(productQuantity) || 0) + delta);
  }

  /** Compress an image file via canvas to stay under localStorage quota. */
  function compressImage(file: File, maxWidth = 600, quality = 0.7): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Canvas not supported')); return; }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image load failed')); };
      img.src = url;
    });
  }

  async function handlePhotoUpload(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      try {
        uploadedPhotoPreview = await compressImage(input.files[0]);
      } catch {
        // Fallback to raw base64 if compression fails
        const reader = new FileReader();
        reader.onload = (event) => {
          uploadedPhotoPreview = event.target?.result as string;
        };
        reader.readAsDataURL(input.files[0]);
      }
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

    let customLoc: { lat: number; lng: number; name: string } | undefined = undefined;
    if (selectedBaseId !== 'gps') {
      const found = BASE_PRESETS.find((p) => p.id === selectedBaseId);
      if (found) {
        customLoc = { lat: found.lat, lng: found.lng, name: found.name };
      }
    }
    const safeQty = Math.max(1, Math.round(Number(productQuantity) || currentProductMeta.defaultQty));
    onConfirmVendor(finalProductName, selectedType, uploadedPhotoPreview || undefined, customLoc, {
      quantity: safeQty,
      quantityUnit: currentUnitLabel,
      acceptsGcash,
    });
  }
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#4A2E1B]/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
  <div class="bg-white w-full max-w-lg rounded-[36px] border border-[#EAE4D9] shadow-2xl p-6 sm:p-8 space-y-5 text-[#4A2E1B] my-auto">
    <!-- Header -->
    <div class="text-center space-y-1">
      <Icon name="cart" size={32} />
      <h2 class="text-2xl sm:text-3xl font-black text-[#4A2E1B] tracking-tight">
        {language === 'tl' ? 'Ano ang Iyong Binebenta?' : 'What Are You Selling?'}
      </h2>
      <p class="text-xs sm:text-sm text-[#796658] font-medium">
        {language === 'tl'
          ? 'Piliin ang paninda at mag-upload ng litrato ng iyong kaldero o kariton.'
          : 'Choose your product and upload a quick photo of your stall or kaldero.'}
      </p>
    </div>

    <!-- Base / Starting Area Selector -->
    <div class="space-y-2">
      <span class="text-xs font-bold uppercase tracking-wider text-[#796658] block">
        {language === 'tl' ? 'Saan Ka Magmumula / Taga-Saan Ka?' : 'Starting Base / Location:'}
      </span>
      <div class="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
        <button
          type="button"
          on:click={() => (selectedBaseId = 'gps')}
          class={`p-2.5 rounded-2xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition cursor-pointer ${
            selectedBaseId === 'gps'
              ? 'bg-[#4A2E1B] text-[#FAF7F2] border-[#4A2E1B] shadow-xs'
              : 'bg-[#FAF7F2] text-[#4A2E1B] border-[#EAE4D9] hover:bg-white'
          }`}
        >
          <span class="text-base">📍</span>
          <span class="text-[11px] font-bold">GPS</span>
        </button>

        {#each BASE_PRESETS as preset}
          <button
            type="button"
            on:click={() => (selectedBaseId = preset.id)}
            class={`p-2.5 rounded-2xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition cursor-pointer truncate ${
              selectedBaseId === preset.id
                ? 'bg-[#4A2E1B] text-[#FAF7F2] border-[#4A2E1B] shadow-xs'
                : 'bg-[#FAF7F2] text-[#4A2E1B] border-[#EAE4D9] hover:bg-white'
            }`}
          >
            <span class="text-base">{preset.icon}</span>
            <span class="text-[11px] font-bold truncate max-w-full">{preset.label.split('/')[0]}</span>
          </button>
        {/each}
      </div>
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
            on:click={() => handleSelectProduct(item)}
            class={`p-3.5 rounded-2xl border-2 font-bold text-sm sm:text-base flex items-center gap-3 transition-all cursor-pointer min-h-[52px] ${
              selectedType === item.id
                ? 'bg-[#4A2E1B] text-[#FAF7F2] border-[#4A2E1B] shadow-sm'
                : 'bg-[#FAF7F2] text-[#4A2E1B] border-[#EAE4D9] hover:bg-white'
            }`}
          >
            <Icon name={item.icon} size={22} />
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

    <!-- Quantity Input (with automatic unit) & GCash Option (Before Taking a Picture) -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-0.5">
      <!-- Quantity Input with Auto Unit -->
      <div class="space-y-1.5">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold uppercase tracking-wider text-[#796658]">
            {language === 'tl' ? 'Dami ng Paninda:' : 'Quantity to Sell:'}
          </span>
          <span class="text-[11px] font-extrabold text-[#D97706] bg-[#FEF3C7] px-2 py-0.5 rounded-full">
            {currentUnitLabel}
          </span>
        </div>
        <div class="flex items-center gap-1.5 bg-[#FAF7F2] border-2 border-[#EAE4D9] focus-within:border-[#4A2E1B] rounded-2xl p-1.5 min-h-[50px]">
          <button
            type="button"
            on:click={() => adjustQuantity(-5)}
            class="w-9 h-9 rounded-xl bg-white border border-[#EAE4D9] text-[#4A2E1B] font-black text-base hover:bg-[#F3EDE2] transition cursor-pointer shrink-0 active:scale-95"
            aria-label="Decrease quantity"
          >
            −
          </button>
          <div class="flex-1 flex items-center justify-center gap-1.5 min-w-0">
            <input
              type="number"
              min="1"
              max="9999"
              bind:value={productQuantity}
              class="w-16 text-center bg-transparent text-base font-black text-[#4A2E1B] outline-none"
            />
            <span class="text-xs font-bold text-[#796658] truncate">
              {currentUnitLabel.split(' ')[0]}
            </span>
          </div>
          <button
            type="button"
            on:click={() => adjustQuantity(5)}
            class="w-9 h-9 rounded-xl bg-white border border-[#EAE4D9] text-[#4A2E1B] font-black text-base hover:bg-[#F3EDE2] transition cursor-pointer shrink-0 active:scale-95"
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>
      </div>

      <!-- GCash Payment Option -->
      <div class="space-y-1.5">
        <span class="text-xs font-bold uppercase tracking-wider text-[#796658] block">
          {language === 'tl' ? 'Tumatanggap ng GCash?' : 'Accepts GCash?'}
        </span>
        <div class="grid grid-cols-2 gap-2 min-h-[50px]">
          <button
            type="button"
            on:click={() => (acceptsGcash = true)}
            class={`px-3 py-2.5 rounded-2xl border-2 text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer ${
              acceptsGcash
                ? 'bg-[#007DFE] text-white border-[#007DFE] shadow-xs'
                : 'bg-[#FAF7F2] text-[#4A2E1B] border-[#EAE4D9] hover:bg-white'
            }`}
          >
            <span>💳</span>
            <span>{language === 'tl' ? 'Oo (GCash)' : 'Yes (GCash)'}</span>
          </button>
          <button
            type="button"
            on:click={() => (acceptsGcash = false)}
            class={`px-3 py-2.5 rounded-2xl border-2 text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer ${
              !acceptsGcash
                ? 'bg-[#4A2E1B] text-[#FAF7F2] border-[#4A2E1B] shadow-xs'
                : 'bg-[#FAF7F2] text-[#4A2E1B] border-[#EAE4D9] hover:bg-white'
            }`}
          >
            <span>💵</span>
            <span>{language === 'tl' ? 'Cash Lang' : 'Cash Only'}</span>
          </button>
        </div>
      </div>
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
