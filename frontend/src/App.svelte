<script lang="ts">
  import { onMount } from 'svelte';
  import type { Language, ProductType, TaggedVendor, UserRole, UserSession } from './lib/types';
  import { generateTaggedVendorsAround } from './lib/data/spots';
  import { router, type PageRoute } from './lib/router';

  // Pages
  import LandingPage from './pages/LandingPage.svelte';
  import MapPage from './pages/MapPage.svelte';
  import VendorPage from './pages/VendorPage.svelte';
  import SettingsPage from './pages/SettingsPage.svelte';
  import SearchPage from './pages/SearchPage.svelte';

  // Modals & Prompts
  import IntentModal from './lib/components/IntentModal.svelte';
  import BuyerSearchPrompt from './lib/components/BuyerSearchPrompt.svelte';
  import VendorOnboardingPrompt from './lib/components/VendorOnboardingPrompt.svelte';
  import RoleSwitchModal from './lib/components/RoleSwitchModal.svelte';

  // Global App States
  let currentRoute: PageRoute = 'landing';
  let language: Language = 'tl';
  let isDarkMode: boolean = false;
  let largeText: boolean = false;

  // Active User Session & Tagged Vendors
  let session: UserSession | null = null;
  let activeVendors: TaggedVendor[] = [];

  // Intermediate Prompt States
  let showBuyerPrompt: boolean = false;
  let showVendorPrompt: boolean = false;
  let showRoleSwitchModal: boolean = false;

  // Subscribe to hash router
  router.subscribe((route) => {
    currentRoute = route;
  });

  onMount(() => {
    // 1. Theme initialization
    const savedTheme = localStorage.getItem('pwestoradar_theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setDarkMode(true);
    } else {
      setDarkMode(false);
    }

    // 2. Load Session from LocalStorage
    const savedSession = localStorage.getItem('pwestoradar_session');
    if (savedSession) {
      try {
        const parsed: UserSession = JSON.parse(savedSession);
        session = parsed;
        activeVendors = generateTaggedVendorsAround(parsed.lat, parsed.lng);

        // If on root with saved session, go straight to map
        if (window.location.hash === '' || window.location.hash === '#/' || window.location.hash === '#/landing') {
          router.navigate('map');
        }
      } catch (e) {
        session = null;
      }
    }
  });

  function setDarkMode(enabled: boolean) {
    isDarkMode = enabled;
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', enabled);
      document.body.classList.toggle('dark', enabled);
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('pwestoradar_theme', enabled ? 'dark' : 'light');
    }
  }

  function handleToggleDarkMode() {
    setDarkMode(!isDarkMode);
  }

  function handleToggleLanguage() {
    language = language === 'tl' ? 'en' : 'tl';
  }

  function handleToggleTextScale() {
    largeText = !largeText;
  }

  function handleStartFromLanding() {
    router.navigate('intent');
  }

  function handleSelectRole(role: UserRole) {
    if (role === 'buyer') {
      showBuyerPrompt = true;
      showVendorPrompt = false;
    } else {
      showVendorPrompt = true;
      showBuyerPrompt = false;
    }
  }

  function handleConfirmBuyerLocation(locationName: string, lat: number, lng: number) {
    const newSession: UserSession = {
      role: 'buyer',
      locationName,
      lat,
      lng,
      createdAt: new Date().toISOString(),
    };
    showBuyerPrompt = false;
    saveSessionAndNavigate(newSession, 'map');
  }

  function handleConfirmVendor(product: string, productType: ProductType, photoUrl?: string) {
    const defaultLat = 14.6091; // España / Manila
    const defaultLng = 120.9898;

    const newSession: UserSession = {
      role: 'vendor',
      locationName: 'España / Sampaloc, Manila',
      lat: defaultLat,
      lng: defaultLng,
      product,
      verifiedPhoto: photoUrl,
      createdAt: new Date().toISOString(),
    };
    showVendorPrompt = false;
    saveSessionAndNavigate(newSession, 'map');
  }

  function saveSessionAndNavigate(newSession: UserSession, targetRoute: PageRoute) {
    session = newSession;
    activeVendors = generateTaggedVendorsAround(newSession.lat, newSession.lng);

    if (typeof window !== 'undefined') {
      localStorage.setItem('pwestoradar_session', JSON.stringify(newSession));
    }

    router.navigate(targetRoute);
  }

  function handleRequestSwitchRole() {
    if (!session) return;
    showRoleSwitchModal = true;
  }

  function handleConfirmSwitchRole() {
    if (!session) return;
    showRoleSwitchModal = false;

    if (session.role === 'buyer') {
      // Switching from Buyer to Vendor: Open the full Vendor Onboarding Prompt
      // so they choose their product (Taho, Siomai, Balut, Other) and upload stall photo!
      showVendorPrompt = true;
    } else {
      // Switching from Vendor to Buyer: Pause vendor broadcast, switch to buyer, and navigate to map
      const newSession: UserSession = {
        ...session,
        role: 'buyer',
        product: undefined,
        verifiedPhoto: undefined,
      };
      saveSessionAndNavigate(newSession, 'map');
    }
  }

  function handleUpdateVendorProduct(product: string) {
    if (!session) return;
    session = { ...session, product };
    localStorage.setItem('pwestoradar_session', JSON.stringify(session));
  }

  function handleResetSession() {
    localStorage.removeItem('pwestoradar_session');
    session = null;
    showBuyerPrompt = false;
    showVendorPrompt = false;
    router.navigate('landing');
  }
</script>

<main class={`w-full min-h-screen antialiased transition-colors duration-300 ${largeText ? 'text-lg' : 'text-base'} ${
  isDarkMode ? 'bg-[#1A120B] text-[#FAF7F2]' : 'bg-[#FAF7F2] text-[#4A2E1B]'
}`}>
  <!-- ROUTE 1: LANDING PAGE -->
  {#if currentRoute === 'landing'}
    <LandingPage
      {language}
      {isDarkMode}
      onToggleDarkMode={handleToggleDarkMode}
      onStart={handleStartFromLanding}
      onSelectRoleDirect={handleSelectRole}
    />

  <!-- ROUTE 2: INTENT (BIBILI O MAGBEBENTA) -->
  {:else if currentRoute === 'intent'}
    <IntentModal
      {language}
      onSelect={handleSelectRole}
      onBack={() => router.navigate('landing')}
    />

  <!-- ROUTE 3: FULL SCREEN MAP PAGE -->
  {:else if currentRoute === 'map'}
    {#if session}
      <MapPage
        {session}
        vendors={activeVendors}
        {language}
        {isDarkMode}
        onToggleDarkMode={handleToggleDarkMode}
        onSwitchRole={handleRequestSwitchRole}
        onResetSession={handleResetSession}
        onNavigate={(r) => router.navigate(r as PageRoute)}
      />
    {:else}
      <LandingPage
        {language}
        {isDarkMode}
        onToggleDarkMode={handleToggleDarkMode}
        onStart={handleStartFromLanding}
        onSelectRoleDirect={handleSelectRole}
      />
    {/if}

  <!-- ROUTE 4: VENDOR DASHBOARD PAGE -->
  {:else if currentRoute === 'vendor'}
    {#if session && session.role === 'vendor'}
      <VendorPage
        {session}
        {language}
        {isDarkMode}
        onUpdateProduct={handleUpdateVendorProduct}
        onRequestSwitchRole={handleRequestSwitchRole}
        onNavigate={(r) => router.navigate(r as PageRoute)}
      />
    {:else}
      <!-- Buyers attempting to access /vendor are guarded and shown map -->
      <MapPage
        session={session || { role: 'buyer', locationName: 'Kasalukuyang Lokasyon', lat: 14.6091, lng: 120.9898, createdAt: new Date().toISOString() }}
        vendors={activeVendors}
        {language}
        {isDarkMode}
        onToggleDarkMode={handleToggleDarkMode}
        onSwitchRole={handleRequestSwitchRole}
        onResetSession={handleResetSession}
        onNavigate={(r) => router.navigate(r as PageRoute)}
      />
    {/if}

  <!-- ROUTE 5: SETTINGS PAGE -->
  {:else if currentRoute === 'settings'}
    <SettingsPage
      {language}
      {isDarkMode}
      {largeText}
      {session}
      onToggleDarkMode={handleToggleDarkMode}
      onToggleLanguage={handleToggleLanguage}
      onToggleTextScale={handleToggleTextScale}
      onSwitchRole={handleRequestSwitchRole}
      onResetSession={handleResetSession}
      onNavigate={(r) => router.navigate(r as PageRoute)}
    />

  <!-- ROUTE 6: SEARCH PAGE -->
  {:else if currentRoute === 'search'}
    <SearchPage
      {language}
      {isDarkMode}
      onConfirmLocation={handleConfirmBuyerLocation}
      onNavigate={(r) => router.navigate(r as PageRoute)}
    />
  {/if}

  <!-- POPUP PROMPTS -->
  {#if showBuyerPrompt}
    <BuyerSearchPrompt
      {language}
      onConfirmLocation={handleConfirmBuyerLocation}
      onBack={() => (showBuyerPrompt = false)}
    />
  {/if}

  {#if showVendorPrompt}
    <VendorOnboardingPrompt
      {language}
      onConfirmVendor={handleConfirmVendor}
      onBack={() => (showVendorPrompt = false)}
    />
  {/if}
  {#if showRoleSwitchModal && session}
    <RoleSwitchModal
      currentRole={session.role}
      {language}
      {isDarkMode}
      onConfirmSwitch={handleConfirmSwitchRole}
      onCancel={() => (showRoleSwitchModal = false)}
    />
  {/if}
</main>
