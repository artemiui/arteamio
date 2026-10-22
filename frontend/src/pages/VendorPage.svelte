<script lang="ts">
  import type { Language, ProductType, UserSession } from '../lib/types';
  import Logo from '../lib/components/Logo.svelte';

  export let language: Language = 'tl';
  export let isDarkMode: boolean = false;
  export let session: UserSession;
  export let onUpdateProduct: (product: string) => void;
  export let onNavigate: (route: string) => void;

  let vendorStatus: 'live' | 'stopped' | 'sold_out' = 'live';
  let audienceCount: number = 22;
  let activeProduct: string = session.product || 'Taho';
  let uploadedPhoto: string | null = session.verifiedPhoto || null;

  const PRODUCTS = [
    { name: 'Taho', icon: '🥣' },
    { name: 'Siomai', icon: '🥡' },
    { name: 'Balut', icon: '🥚' },
    { name: 'Kape / Merienda', icon: '⭐' },
  ];

  function setProduct(prod: string) {
    activeProduct = prod;
    onUpdateProduct(prod);
  }

  function handlePhotoUpload(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        uploadedPhoto = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  }
</script>

<div class={`min-h-screen p-4 sm:p-8 flex flex-col justify-between transition-colors duration-300 ${
  isDarkMode ? 'bg-[#1A120B] text-[#FAF7F2]' : 'bg-[#FAF7F2] text-[#4A2E1B]'
}`}>
  <div class="max-w-2xl w-full mx-auto space-y-6">
    <!-- Header -->
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
        <span>🗺️</span>
        <span>{language === 'tl' ? 'Tingnan sa Mapa' : 'View on Map'}</span>
      </button>

      <Logo {isDarkMode} className="h-7 w-auto object-contain" />

      <button
        type="button"
        on:click={() => onNavigate('settings')}
        class={`w-9 h-9 rounded-full border flex items-center justify-center text-sm ${
          isDarkMode ? 'bg-[#271A10] border-[#3D2717]' : 'bg-white border-[#EAE4D9]'
        }`}
        title="Settings"
      >
        ⚙️
      </button>
    </header>

    <!-- Page Title -->
    <div>
      <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 text-green-600 text-xs font-bold mb-2">
        <span class="w-2 h-2 rounded-full bg-green-500 animate-ping"></span>
        <span>{language === 'tl' ? 'Aktibo ang Tindahan' : 'Vendor Console Active'}</span>
      </div>
      <h1 class="text-2xl sm:text-3xl font-black tracking-tight">
        {language === 'tl' ? 'Dashboard ng Tindero' : 'Vendor Dashboard'}
      </h1>
      <p class={`text-xs sm:text-sm mt-1 font-medium ${isDarkMode ? 'text-[#D6C7B2]' : 'text-[#796658]'}`}>
        {session.locationName}
      </p>
    </div>

    <!-- Live Buyers Waiting Bento Card -->
    <div class={`p-6 rounded-[32px] border text-center space-y-2 ${
      isDarkMode ? 'bg-[#452B14] border-[#F59E0B]/30' : 'bg-[#FEF3C7] border-[#D97706]/30'
    }`}>
      <span class="text-xs font-extrabold uppercase tracking-wider text-[#D97706]">
        👥 {language === 'tl' ? 'Mga Nag-aabang sa Ruta Mo' : 'Neighbors Awaiting Your Cart'}
      </span>
      <div class="flex items-center justify-center gap-2">
        <span class="text-5xl font-black">{audienceCount}</span>
        <span class="text-sm font-bold text-[#796658]">{language === 'tl' ? 'mamimili' : 'buyers'}</span>
      </div>
      <p class={`text-xs font-medium max-w-sm mx-auto ${isDarkMode ? 'text-[#D6C7B2]' : 'text-[#796658]'}`}>
        {language === 'tl'
          ? 'Nasa loob ng 300m radius ang mga ito. Makakatanggap sila ng alerto habang papalapit ka.'
          : 'These buyers are within your 300m walking radius and receive alerts as you approach.'}
      </p>
    </div>

    <!-- Broadcast Status Switcher -->
    <div class={`p-5 rounded-[28px] border space-y-3 ${
      isDarkMode ? 'bg-[#271A10] border-[#3D2717]' : 'bg-white border-[#EAE4D9]'
    }`}>
      <h2 class="text-xs font-bold uppercase tracking-wider text-[#796658]">
        {language === 'tl' ? 'Katayuan ng Pagtitinda:' : 'Broadcasting Status:'}
      </h2>
      <div class="grid grid-cols-3 gap-2.5">
        <button
          type="button"
          on:click={() => (vendorStatus = 'live')}
          class={`py-3 px-2 rounded-2xl text-xs font-extrabold border transition cursor-pointer text-center ${
            vendorStatus === 'live'
              ? 'bg-green-600 text-white border-green-600 shadow-sm'
              : (isDarkMode ? 'bg-[#352317] text-white border-[#3D2717]' : 'bg-[#FAF7F2] text-[#4A2E1B] border-[#EAE4D9]')
          }`}
        >
          🟢 {language === 'tl' ? 'Naglilibot (Live)' : 'Live'}
        </button>

        <button
          type="button"
          on:click={() => (vendorStatus = 'stopped')}
          class={`py-3 px-2 rounded-2xl text-xs font-extrabold border transition cursor-pointer text-center ${
            vendorStatus === 'stopped'
              ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
              : (isDarkMode ? 'bg-[#352317] text-white border-[#3D2717]' : 'bg-[#FAF7F2] text-[#4A2E1B] border-[#EAE4D9]')
          }`}
        >
          🟡 {language === 'tl' ? 'Nakatigil' : 'Parked'}
        </button>

        <button
          type="button"
          on:click={() => (vendorStatus = 'sold_out')}
          class={`py-3 px-2 rounded-2xl text-xs font-extrabold border transition cursor-pointer text-center ${
            vendorStatus === 'sold_out'
              ? 'bg-red-600 text-white border-red-600 shadow-sm'
              : (isDarkMode ? 'bg-[#352317] text-white border-[#3D2717]' : 'bg-[#FAF7F2] text-[#4A2E1B] border-[#EAE4D9]')
          }`}
        >
          🔴 {language === 'tl' ? 'Ubos Na' : 'Sold Out'}
        </button>
      </div>
    </div>

    <!-- Product Selection ("Binebenta") -->
    <div class={`p-5 rounded-[28px] border space-y-3 ${
      isDarkMode ? 'bg-[#271A10] border-[#3D2717]' : 'bg-white border-[#EAE4D9]'
    }`}>
      <h2 class="text-xs font-bold uppercase tracking-wider text-[#796658]">
        {language === 'tl' ? 'Produktong Binebenta:' : 'Product Being Sold:'}
      </h2>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {#each PRODUCTS as p}
          <button
            type="button"
            on:click={() => setProduct(p.name)}
            class={`p-3 rounded-2xl border text-xs font-extrabold flex items-center justify-center gap-2 transition cursor-pointer min-h-[48px] ${
              activeProduct.includes(p.name)
                ? (isDarkMode ? 'bg-[#F59E0B] text-[#1A120B] border-[#F59E0B]' : 'bg-[#4A2E1B] text-white border-[#4A2E1B]')
                : (isDarkMode ? 'bg-[#352317] text-white border-[#3D2717]' : 'bg-[#FAF7F2] text-[#4A2E1B] border-[#EAE4D9]')
            }`}
          >
            <span>{p.icon}</span>
            <span>{p.name}</span>
          </button>
        {/each}
      </div>
    </div>

    <!-- Photo Verification Card -->
    <div class={`p-5 rounded-[28px] border space-y-3 ${
      isDarkMode ? 'bg-[#271A10] border-[#3D2717]' : 'bg-white border-[#EAE4D9]'
    }`}>
      <h2 class="text-xs font-bold uppercase tracking-wider text-[#796658]">
        {language === 'tl' ? 'Litrato ng Kaldero / Kariton:' : 'Verified Stall Photo:'}
      </h2>

      {#if uploadedPhoto}
        <div class="flex items-center gap-3">
          <img src={uploadedPhoto} alt="Kaldero" class="w-16 h-16 rounded-2xl object-cover border border-[#EAE4D9]" />
          <div>
            <span class="text-xs font-bold text-green-500">✓ Verified ng Komunidad</span>
            <p class={`text-[11px] ${isDarkMode ? 'text-[#D6C7B2]' : 'text-[#796658]'}`}>
              Ito ang nakikita ng mga bibili sa kanilang screen.
            </p>
          </div>
        </div>
      {:else}
        <label class="p-4 rounded-2xl bg-[#FAF7F2] dark:bg-[#352317] border border-dashed border-[#EAE4D9] dark:border-[#3D2717] flex items-center justify-center gap-2 cursor-pointer text-xs font-bold">
          <span>📷</span>
          <span>{language === 'tl' ? 'Kumuha o Mag-upload ng Litrato' : 'Upload Stall Photo'}</span>
          <input type="file" accept="image/*" on:change={handlePhotoUpload} class="hidden" />
        </label>
      {/if}
    </div>

    <!-- Primary Action: Open Map -->
    <button
      type="button"
      on:click={() => onNavigate('map')}
      class={`w-full py-4 rounded-2xl font-black text-sm sm:text-base shadow-md transition flex items-center justify-center gap-2 cursor-pointer min-h-[52px] ${
        isDarkMode
          ? 'bg-[#F59E0B] text-[#1A120B] hover:bg-[#D97706]'
          : 'bg-[#4A2E1B] text-white hover:bg-[#361F11]'
      }`}
    >
      <span>🗺️ {language === 'tl' ? 'Bumalik sa Full-Screen Mapa' : 'Return to Full-Screen Map'}</span>
      <span>→</span>
    </button>
  </div>
</div>
