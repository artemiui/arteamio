<script lang="ts">
  import { onMount } from 'svelte';
  import type { Language, ProductType } from '../types';
  import { searchOSM, type OSMSearchResult } from '../services/osmGeocoding';
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

  // Location state (own GPS or OpenStreetMap search, matching BuyerSearchPrompt)
  let searchQuery: string = 'Kasalukuyang Lokasyon (GPS)';
  let detectedLat: number = 14.6091;
  let detectedLng: number = 120.9898;
  let isDetectingGPS: boolean = false;
  let gpsStatus: 'active' | 'denied' | 'idle' = 'idle';
  let hasCustomLocation: boolean = false;

  // OpenStreetMap live geocoding state
  let osmResults: OSMSearchResult[] = [];
  let isSearchingOSM: boolean = false;
  let searchDebounceTimer: any = null;

  const POPULAR_LOCATIONS = [
    { name: 'Welcome Rotonda', lat: 14.6177, lng: 121.0006 },
    { name: 'PHILCOA, QC', lat: 14.6518, lng: 121.0493 },
    { name: 'Quezon Ave (MRT-3)', lat: 14.6425, lng: 121.0387 },
    { name: 'Cubao (LRT-2 / MRT-3)', lat: 14.6200, lng: 121.0530 },
    { name: 'Monumento (LRT-1)', lat: 14.6548, lng: 120.9839 },
    { name: 'LRT-1 D. Jose / Recto', lat: 14.6054, lng: 120.9822 },
    { name: 'LRT-1 Baclaran / Taft', lat: 14.5343, lng: 120.9983 },
    { name: 'España / UST', lat: 14.6091, lng: 120.9898 },
  ];

  onMount(() => {
    requestGPS();
  });

  function requestGPS() {
    if (!navigator.geolocation) {
      gpsStatus = 'denied';
      return;
    }

    isDetectingGPS = true;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        detectedLat = pos.coords.latitude;
        detectedLng = pos.coords.longitude;
        gpsStatus = 'active';
        hasCustomLocation = false;
        isDetectingGPS = false;
        searchQuery = language === 'tl' ? 'Kasalukuyang Lokasyon (GPS)' : 'Current Location (GPS)';
        osmResults = [];
      },
      () => {
        gpsStatus = 'denied';
        isDetectingGPS = false;
      },
      { enableHighAccuracy: true, timeout: 6000 }
    );
  }

  function handleLocationInput(e: Event) {
    const val = (e.target as HTMLInputElement).value;
    searchQuery = val;
    hasCustomLocation = false;

    if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
    if (
      val.trim().length < 2 ||
      val === 'Kasalukuyang Lokasyon (GPS)' ||
      val === 'Current Location (GPS)'
    ) {
      osmResults = [];
      isSearchingOSM = false;
      return;
    }

    isSearchingOSM = true;
    searchDebounceTimer = setTimeout(async () => {
      osmResults = await searchOSM(val);
      isSearchingOSM = false;
    }, 280);
  }

  function selectOSM(res: OSMSearchResult) {
    detectedLat = res.lat;
    detectedLng = res.lng;
    searchQuery = res.subtitle ? `${res.name}, ${res.subtitle}` : res.name;
    hasCustomLocation = true;
    osmResults = [];
  }

  function selectShortcut(loc: { name: string; lat: number; lng: number }) {
    detectedLat = loc.lat;
    detectedLng = loc.lng;
    searchQuery = loc.name;
    hasCustomLocation = true;
    osmResults = [];
  }

  async function handleLocationEnter() {
    if (osmResults.length > 0) {
      selectOSM(osmResults[0]);
      return;
    }
    const trimmed = searchQuery.trim();
    if (
      trimmed.length >= 2 &&
      trimmed !== 'Kasalukuyang Lokasyon (GPS)' &&
      trimmed !== 'Current Location (GPS)'
    ) {
      isSearchingOSM = true;
      const fresh = await searchOSM(trimmed);
      isSearchingOSM = false;
      if (fresh.length > 0) {
        selectOSM(fresh[0]);
      }
    }
  }

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

  async function handleSubmit() {
    let finalProductName = 'Taho';
    if (selectedType === 'siomai') finalProductName = 'Siomai';
    if (selectedType === 'balut') finalProductName = 'Balut';
    if (selectedType === 'other') finalProductName = otherProductName.trim() || 'Paninda';

    // Resolve typed location query if the vendor did not click a dropdown item yet
    const trimmedLoc = searchQuery.trim();
    const isGpsLabel =
      !trimmedLoc ||
      trimmedLoc === 'Kasalukuyang Lokasyon (GPS)' ||
      trimmedLoc === 'Current Location (GPS)';

    if (!isGpsLabel && !hasCustomLocation) {
      if (osmResults.length > 0) {
        selectOSM(osmResults[0]);
      } else {
        const fresh = await searchOSM(trimmedLoc);
        if (fresh.length > 0) {
          selectOSM(fresh[0]);
        } else {
          hasCustomLocation = true;
        }
      }
    }

    let customLoc: { lat: number; lng: number; name: string } | undefined = undefined;
    if (hasCustomLocation || gpsStatus === 'active') {
      customLoc = {
        lat: detectedLat,
        lng: detectedLng,
        name: searchQuery.trim() || 'Kasalukuyang Lokasyon (GPS)',
      };
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
          ? 'Piliin ang lokasyon, paninda, at mag-upload ng litrato ng iyong kaldero o kariton.'
          : 'Choose your location, product, and upload a quick photo of your stall or kaldero.'}
      </p>
    </div>

    <!-- Starting Location: Own GPS or Search (same as Buyer) -->
    <div class="space-y-2">
      <div class="flex items-center justify-between">
        <span class="text-xs font-bold uppercase tracking-wider text-[#796658]">
          {language === 'tl' ? 'Saan Ka Magmumula / Lokasyon:' : 'Starting Base / Location:'}
        </span>

        {#if isDetectingGPS}
          <span class="text-[11px] font-bold text-[#D97706] animate-pulse">
            📡 {language === 'tl' ? 'Kinukuha ang GPS...' : 'Detecting GPS...'}
          </span>
        {:else if gpsStatus === 'active' && !hasCustomLocation}
          <span class="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
            ✓ GPS Active
          </span>
        {/if}
      </div>

      <div class="relative flex items-center gap-2">
        <div class="relative flex-1">
          <span class="absolute left-4 top-1/2 -translate-y-1/2 text-[#796658]">
            <Icon name="pin" size={18} />
          </span>
          <input
            type="text"
            value={searchQuery}
            on:input={handleLocationInput}
            on:focus={() => {
              if (
                searchQuery === 'Kasalukuyang Lokasyon (GPS)' ||
                searchQuery === 'Current Location (GPS)'
              ) {
                searchQuery = '';
              }
            }}
            on:keydown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleLocationEnter();
              }
            }}
            placeholder={language === 'tl' ? 'I-search ang kalye, MRT/LRT, o lugar...' : 'Search any street, landmark, or city...'}
            class="w-full pl-11 pr-4 py-3 rounded-2xl bg-[#FAF7F2] border-2 border-[#EAE4D9] focus:border-[#4A2E1B] focus:bg-white text-sm font-bold text-[#4A2E1B] outline-none transition"
          />

          <!-- Live OpenStreetMap Dropdown Results -->
          {#if isSearchingOSM || osmResults.length > 0}
            <div class="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl border border-[#EAE4D9] shadow-xl z-50 max-h-56 overflow-y-auto divide-y divide-[#FAF7F2]">
              {#if isSearchingOSM}
                <div class="px-4 py-3 text-xs font-bold text-[#796658] flex items-center gap-2">
                  <span class="animate-spin">⏳</span>
                  <span>{language === 'tl' ? 'Hinahanap sa OpenStreetMap...' : 'Searching OpenStreetMap...'}</span>
                </div>
              {:else}
                {#each osmResults as res}
                  <button
                    type="button"
                    on:click={() => selectOSM(res)}
                    class="w-full px-4 py-2.5 text-left hover:bg-[#FAF7F2] transition flex items-start gap-2.5 cursor-pointer"
                  >
                    <span class="text-[#D97706] mt-0.5"><Icon name="pin" size={16} /></span>
                    <div class="min-w-0 flex-1">
                      <p class="text-xs font-bold text-[#4A2E1B] truncate">{res.name}</p>
                      <p class="text-[11px] text-[#796658] truncate">{res.subtitle || res.displayName}</p>
                    </div>
                  </button>
                {/each}
              {/if}
            </div>
          {/if}
        </div>

        <button
          type="button"
          on:click={requestGPS}
          title={language === 'tl' ? 'Gamitin ang kasalukuyang GPS' : 'Use current GPS location'}
          class="p-3 rounded-2xl bg-[#FAF7F2] border-2 border-[#EAE4D9] hover:border-[#4A2E1B] text-[#4A2E1B] font-bold text-xs cursor-pointer transition min-h-[48px] px-3.5 flex items-center gap-1 shrink-0"
        >
          <Icon name="navigation" size={16} />
          <span>GPS</span>
        </button>
      </div>

      <!-- Common Presets (Metro Manila Hotspots) -->
      <div class="pt-0.5">
        <span class="text-[11px] font-bold text-[#796658] block mb-1.5">
          {language === 'tl' ? 'Karaniwang Presets (Metro Manila Hotspots):' : 'Common Presets (Metro Manila Hotspots):'}
        </span>
        <div class="flex flex-wrap gap-1.5">
          {#each POPULAR_LOCATIONS as loc}
            <button
              type="button"
              on:click={() => selectShortcut(loc)}
              class={`px-3 py-1.5 rounded-full border text-xs font-bold transition cursor-pointer ${
                hasCustomLocation && searchQuery === loc.name
                  ? 'bg-[#4A2E1B] text-[#FAF7F2] border-[#4A2E1B]'
                  : 'bg-[#FAF7F2] hover:bg-[#EAE4D9]/60 border-[#EAE4D9] text-[#4A2E1B]'
              }`}
            >
              {loc.name}
            </button>
          {/each}
        </div>
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
