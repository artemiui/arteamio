<script lang="ts">
  import type { DemandHotspot, DemandHotspotCategory, Language, SchoolDismissalConfig, CommunityEventConfig, UserSession } from '../types';
  import {
    createSchoolHotspot,
    createCommunityEventHotspot,
    saveCustomHotspot,
    deleteCustomHotspot,
    resetHotspotsToDefault,
    HOTSPOT_CATEGORY_META,
    HOTSPOT_LEVEL_META,
  } from '../data/hotspots';
  import Icon from './Icon.svelte';

  export let language: Language = 'tl';
  export let isDarkMode: boolean = false;
  export let session: UserSession | null = null;
  export let activeHotspots: DemandHotspot[] = [];
  export let defaultLat: number | undefined = undefined;
  export let defaultLng: number | undefined = undefined;
  export let onClose: () => void;
  export let onHotspotsUpdated: () => void;

  type ActiveTab = 'school' | 'event' | 'manage';
  let activeTab: ActiveTab = 'school';

  // School Form State
  let schoolName: string = '';
  let gateLocation: string = '';
  let primaryDismissalTime: string = '15:30';
  let secondaryDismissalTime: string = '17:00';
  let estimatedStudents: number = 2500;
  let favoriteMeriendaTl: string = 'Taho, Siomai Rice, at Gulaman';
  let favoriteMeriendaEn: string = 'Taho, Siomai Rice, and Cold Drinks';
  let schoolLat: number = defaultLat ?? session?.lat ?? 14.6091;
  let schoolLng: number = defaultLng ?? session?.lng ?? 120.9898;

  // Event Form State
  let eventTitle: string = '';
  let eventCategory: DemandHotspotCategory = 'basketball';
  let eventVenue: string = '';
  let eventDays: string = 'Biyernes at Sabado ng Gabi';
  let eventStartTime: string = '17:30';
  let eventEndTime: string = '21:30';
  let estimatedAttendees: number = 400;
  let eventDemandExplanationTl: string =
    'Siksikan ang mga manonood at manlalaro. Mataas ang gana sa malamig na pampalamig, siomai, at balot habang nanonood ng palaro.';
  let eventDemandExplanationEn: string =
    'Crowded spectators and players looking for cold drinks, siomai, and balut snacks during the game.';
  let eventLat: number = defaultLat ?? session?.lat ?? 14.6091;
  let eventLng: number = defaultLng ?? session?.lng ?? 120.9898;

  // Feedback toast
  let statusMessage: string | null = null;

  function showToast(msg: string) {
    statusMessage = msg;
    setTimeout(() => {
      statusMessage = null;
    }, 3500);
  }

  function handleSaveSchool() {
    if (!schoolName.trim() || !gateLocation.trim()) {
      showToast(language === 'tl' ? 'Punan ang pangalan ng paaralan at gate.' : 'Please provide school name and gate location.');
      return;
    }

    const config: SchoolDismissalConfig = {
      schoolName: schoolName.trim(),
      gateLocation: gateLocation.trim(),
      lat: schoolLat,
      lng: schoolLng,
      primaryDismissalTime,
      secondaryDismissalTime: secondaryDismissalTime || undefined,
      estimatedStudents: Number(estimatedStudents) || 1000,
      favoriteMeriendaTl: favoriteMeriendaTl.trim(),
      favoriteMeriendaEn: favoriteMeriendaEn.trim(),
    };

    const newHotspot = createSchoolHotspot(config);
    saveCustomHotspot(newHotspot);
    onHotspotsUpdated();
    showToast(
      language === 'tl'
        ? `Na-save ang skedyul ng ${config.schoolName}! (Score: ${newHotspot.opportunityScore}/100)`
        : `Saved dismissal schedule for ${config.schoolName}! (Score: ${newHotspot.opportunityScore}/100)`
    );

    // Reset fields
    schoolName = '';
    gateLocation = '';
    activeTab = 'manage';
  }

  function handleSaveCommunityEvent() {
    if (!eventTitle.trim() || !eventVenue.trim()) {
      showToast(language === 'tl' ? 'Punan ang pamagat ng event at lugar.' : 'Please provide event title and venue.');
      return;
    }

    const config: CommunityEventConfig = {
      title: eventTitle.trim(),
      category: eventCategory,
      venueName: eventVenue.trim(),
      lat: eventLat,
      lng: eventLng,
      startTime: eventStartTime,
      endTime: eventEndTime,
      scheduleDays: eventDays.trim(),
      estimatedAttendees: Number(estimatedAttendees) || 300,
      demandExplanationTl: eventDemandExplanationTl.trim(),
      demandExplanationEn: eventDemandExplanationEn.trim(),
    };

    const newHotspot = createCommunityEventHotspot(config);
    saveCustomHotspot(newHotspot);
    onHotspotsUpdated();
    showToast(
      language === 'tl'
        ? `Na-save ang event: ${config.title}! (Score: ${newHotspot.opportunityScore}/100)`
        : `Saved community event: ${config.title}! (Score: ${newHotspot.opportunityScore}/100)`
    );

    // Reset fields
    eventTitle = '';
    eventVenue = '';
    activeTab = 'manage';
  }

  function handleDeleteHotspot(id: string) {
    deleteCustomHotspot(id);
    onHotspotsUpdated();
    showToast(language === 'tl' ? 'Natanggal ang hotspot.' : 'Hotspot deleted.');
  }

  function handleResetDefaults() {
    if (confirm(language === 'tl' ? 'I-reset ang lahat ng naidagdag na hotspot sa default?' : 'Reset all custom hotspots to default?')) {
      resetHotspotsToDefault();
      onHotspotsUpdated();
      showToast(language === 'tl' ? 'Naibalik sa default presets.' : 'Restored to default presets.');
    }
  }

  function setCoordinatesToSession() {
    if (session) {
      schoolLat = session.lat;
      schoolLng = session.lng;
      eventLat = session.lat;
      eventLng = session.lng;
      showToast(language === 'tl' ? 'Ginamit ang iyong kasalukuyang GPS.' : 'Set coordinates to your current GPS.');
    }
  }
</script>

<div
  class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs animate-fade-in overflow-y-auto"
  role="dialog"
  aria-modal="true"
  aria-labelledby="modal-title"
>
  <div
    class={`relative w-full max-w-xl rounded-[32px] shadow-2xl border flex flex-col max-h-[90vh] overflow-hidden transition-colors ${
      isDarkMode
        ? 'bg-[#1A120B] border-[#3D2717] text-[#FAF7F2]'
        : 'bg-[#FAF7F2] border-[#EAE4D9] text-[#4A2E1B]'
    }`}
  >
    <!-- Modal Header -->
    <div
      class={`p-5 sm:p-6 pb-4 flex items-center justify-between border-b shrink-0 ${
        isDarkMode ? 'border-[#3D2717]' : 'border-[#EAE4D9]'
      }`}
    >
      <div class="flex items-center gap-2.5">
        <Icon name="flame" size={24} />
        <div>
          <h2 id="modal-title" class="text-base sm:text-lg font-black">
            {language === 'tl' ? 'I-configure ang Demand Hotspots' : 'Configure Demand Hotspots'}
          </h2>
          <p class={`text-[11px] font-medium ${isDarkMode ? 'text-[#D6C7B2]' : 'text-[#796658]'}`}>
            {language === 'tl'
              ? 'Magdagdag ng mga skedyul ng paaralan at kaganapan sa komunidad'
              : 'Add school dismissal schedules & community events'}
          </p>
        </div>
      </div>

      <button
        type="button"
        on:click={onClose}
        class={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition cursor-pointer active:scale-95 ${
          isDarkMode ? 'bg-[#271A10] hover:bg-[#352317] text-[#FAF7F2]' : 'bg-white hover:bg-[#EAE4D9] text-[#4A2E1B]'
        }`}
        aria-label="Close"
      >
        ✕
      </button>
    </div>

    <!-- Toast Banner -->
    {#if statusMessage}
      <div class="px-5 py-2.5 bg-green-500/15 border-b border-green-500/30 text-green-600 text-xs font-black flex items-center gap-2">
        <span>✓</span>
        <span>{statusMessage}</span>
      </div>
    {/if}

    <!-- Tab Bar -->
    <div
      class={`p-2 flex items-center gap-1.5 border-b shrink-0 overflow-x-auto no-scrollbar ${
        isDarkMode ? 'bg-[#271A10] border-[#3D2717]' : 'bg-white border-[#EAE4D9]'
      }`}
    >
      <button
        type="button"
        on:click={() => (activeTab = 'school')}
        class={`flex-1 min-w-[130px] py-2.5 px-3 rounded-2xl text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer ${
          activeTab === 'school'
            ? (isDarkMode ? 'bg-[#F59E0B] text-[#1A120B]' : 'bg-[#4A2E1B] text-white shadow-xs')
            : (isDarkMode ? 'text-[#D6C7B2] hover:bg-[#352317]' : 'text-[#796658] hover:bg-[#FAF7F2]')
        }`}
      >
        <Icon name="school" size={14} />
        <span>{language === 'tl' ? 'Paaralan' : 'School Dismissals'}</span>
      </button>

      <button
        type="button"
        on:click={() => (activeTab = 'event')}
        class={`flex-1 min-w-[130px] py-2.5 px-3 rounded-2xl text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer ${
          activeTab === 'event'
            ? (isDarkMode ? 'bg-[#F59E0B] text-[#1A120B]' : 'bg-[#4A2E1B] text-white shadow-xs')
            : (isDarkMode ? 'text-[#D6C7B2] hover:bg-[#352317]' : 'text-[#796658] hover:bg-[#FAF7F2]')
        }`}
      >
        <Icon name="tent" size={14} />
        <span>{language === 'tl' ? 'Events & Liga' : 'Events & Games'}</span>
      </button>

      <button
        type="button"
        on:click={() => (activeTab = 'manage')}
        class={`flex-1 min-w-[130px] py-2.5 px-3 rounded-2xl text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer ${
          activeTab === 'manage'
            ? (isDarkMode ? 'bg-[#F59E0B] text-[#1A120B]' : 'bg-[#4A2E1B] text-white shadow-xs')
            : (isDarkMode ? 'text-[#D6C7B2] hover:bg-[#352317]' : 'text-[#796658] hover:bg-[#FAF7F2]')
        }`}
      >
        <Icon name="clipboard" size={14} />
        <span>{language === 'tl' ? 'Mga Hotspot' : 'Manage List'}</span>
        <span class="text-[10px] px-1.5 py-0.2 rounded-full bg-[#D97706] text-white font-black">{activeHotspots.length}</span>
      </button>
    </div>

    <!-- Tab Contents (Scrollable) -->
    <div class="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
      <!-- TAB 1: SCHOOL DISMISSAL CONFIGURATION -->
      {#if activeTab === 'school'}
        <form on:submit|preventDefault={handleSaveSchool} class="space-y-4">
          <div class="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-xs space-y-1">
            <span class="font-black text-blue-600">🎓 {language === 'tl' ? 'Iskedyul ng Uwian ng mga Mag-aaral' : 'School Dismissal Intel'}</span>
            <p class={isDarkMode ? 'text-[#D6C7B2]' : 'text-[#5C4D40]'}>
              {language === 'tl'
                ? 'Ang mga oras ng dismissal ay nagdudulot ng mabilisang bugso ng gutom at uhaw sa mga estudyante. Awtomatikong kukuwentahin ang Opportunity Score batay sa dami ng mag-aaral.'
                : 'School dismissal hours trigger instant merienda demand. Opportunity score is algorithmically calculated based on student volume and timing.'}
            </p>
          </div>

          <!-- School Name -->
          <div>
            <label for="school-name-input" class="block text-xs font-black uppercase mb-1.5 text-[#796658] dark:text-[#D6C7B2]">
              {language === 'tl' ? 'Pangalan ng Paaralan / Unibersidad:' : 'School or Campus Name:'}
            </label>
            <input
              id="school-name-input"
              type="text"
              bind:value={schoolName}
              placeholder="hal. UST Junior High School / Ramon Magsaysay HS"
              class={`w-full p-3 rounded-2xl text-xs font-bold border transition ${
                isDarkMode ? 'bg-[#271A10] border-[#3D2717] text-white focus:border-[#F59E0B]' : 'bg-white border-[#EAE4D9] text-[#4A2E1B] focus:border-[#4A2E1B]'
              }`}
              required
            />
          </div>

          <!-- Gate / Specific Location -->
          <div>
            <label for="school-gate-input" class="block text-xs font-black uppercase mb-1.5 text-[#796658] dark:text-[#D6C7B2]">
              {language === 'tl' ? 'Gate o Tawiran kung Saan Lumalabas:' : 'Exit Gate / Street Location:'}
            </label>
            <input
              id="school-gate-input"
              type="text"
              bind:value={gateLocation}
              placeholder="hal. España Main Gate 2 / Dapitan St. Gate"
              class={`w-full p-3 rounded-2xl text-xs font-bold border transition ${
                isDarkMode ? 'bg-[#271A10] border-[#3D2717] text-white focus:border-[#F59E0B]' : 'bg-white border-[#EAE4D9] text-[#4A2E1B] focus:border-[#4A2E1B]'
              }`}
              required
            />
          </div>

          <!-- Dismissal Times Grid -->
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label for="school-time-primary" class="block text-xs font-black uppercase mb-1.5 text-[#796658] dark:text-[#D6C7B2]">
                {language === 'tl' ? 'Pangunahing Uwian:' : 'Primary Dismissal:'}
              </label>
              <input
                id="school-time-primary"
                type="text"
                bind:value={primaryDismissalTime}
                placeholder="hal. 3:30 PM"
                class={`w-full p-3 rounded-2xl text-xs font-bold border ${
                  isDarkMode ? 'bg-[#271A10] border-[#3D2717] text-white' : 'bg-white border-[#EAE4D9] text-[#4A2E1B]'
                }`}
                required
              />
            </div>

            <div>
              <label for="school-time-secondary" class="block text-xs font-black uppercase mb-1.5 text-[#796658] dark:text-[#D6C7B2]">
                {language === 'tl' ? 'Ikalawang Batch (Optional):' : 'Late Batch (Optional):'}
              </label>
              <input
                id="school-time-secondary"
                type="text"
                bind:value={secondaryDismissalTime}
                placeholder="hal. 5:30 PM"
                class={`w-full p-3 rounded-2xl text-xs font-bold border ${
                  isDarkMode ? 'bg-[#271A10] border-[#3D2717] text-white' : 'bg-white border-[#EAE4D9] text-[#4A2E1B]'
                }`}
              />
            </div>
          </div>

          <!-- Estimated Student Crowd -->
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <label for="school-crowd-range" class="text-xs font-black uppercase text-[#796658] dark:text-[#D6C7B2]">
                {language === 'tl' ? 'Tantiyang Dami ng Mag-aaral:' : 'Estimated Student Crowd:'}
              </label>
              <span class="text-xs font-black text-[#D97706]">
                ~{estimatedStudents.toLocaleString()} {language === 'tl' ? 'estudyante' : 'students'}
              </span>
            </div>
            <input
              id="school-crowd-range"
              type="range"
              min="200"
              max="6000"
              step="100"
              bind:value={estimatedStudents}
              class="w-full accent-[#D97706] cursor-pointer"
            />
            <span class="text-[10px] opacity-70 block mt-1">
              * {language === 'tl' ? 'Malinaw na lalagyan ng tag na Tantiyang Datos sa mapa' : 'Explicitly labeled as Estimated Demand on the map'}
            </span>
          </div>

          <!-- Favorite Merienda Rationale -->
          <div>
            <label for="school-merienda-input" class="block text-xs font-black uppercase mb-1.5 text-[#796658] dark:text-[#D6C7B2]">
              {language === 'tl' ? 'Paboritong Meryenda / Demand Note:' : 'Popular Street Food / Demand Note:'}
            </label>
            <input
              id="school-merienda-input"
              type="text"
              bind:value={favoriteMeriendaTl}
              placeholder="hal. Taho, Siomai, Tusok-tusok, Gulaman"
              class={`w-full p-3 rounded-2xl text-xs font-bold border ${
                isDarkMode ? 'bg-[#271A10] border-[#3D2717] text-white' : 'bg-white border-[#EAE4D9] text-[#4A2E1B]'
              }`}
            />
          </div>

          <!-- GPS Location Anchor -->
          <div class={`p-3 rounded-2xl border flex items-center justify-between gap-2 text-xs ${
            isDarkMode ? 'bg-[#271A10] border-[#3D2717]' : 'bg-white border-[#EAE4D9]'
          }`}>
            <div>
              <span class="font-bold text-[11px] block">{language === 'tl' ? 'Lokasyon sa Mapa' : 'Map Coordinates'}</span>
              <span class="text-[10px] opacity-70">{schoolLat.toFixed(4)}, {schoolLng.toFixed(4)}</span>
            </div>
            <button
              type="button"
              on:click={setCoordinatesToSession}
              class="px-2.5 py-1.5 rounded-xl bg-[#D97706]/15 text-[#D97706] font-black text-[11px] cursor-pointer hover:bg-[#D97706]/25"
            >
              📍 {language === 'tl' ? 'Kasalukuyang GPS' : 'Use Current GPS'}
            </button>
          </div>

          <!-- Submit Button -->
          <button
            type="submit"
            class={`w-full py-4 rounded-2xl font-black text-xs sm:text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-98 ${
              isDarkMode ? 'bg-[#F59E0B] text-[#1A120B] hover:bg-[#D97706]' : 'bg-[#4A2E1B] text-white hover:bg-[#361F11]'
            }`}
          >
            <span>💾</span>
            <span>{language === 'tl' ? 'I-save ang Skedyul ng Paaralan' : 'Save School Dismissal Schedule'}</span>
          </button>
        </form>

      <!-- TAB 2: COMMUNITY EVENT CONFIGURATION -->
      {:else if activeTab === 'event'}
        <form on:submit|preventDefault={handleSaveCommunityEvent} class="space-y-4">
          <div class="p-3.5 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-xs space-y-1">
            <span class="font-black text-orange-600">🏀 {language === 'tl' ? 'Palaro, Liga, at Barangay Events' : 'Sports Tournaments & Civic Events'}</span>
            <p class={isDarkMode ? 'text-[#D6C7B2]' : 'text-[#5C4D40]'}>
              {language === 'tl'
                ? 'Iulat ang inter-purok basketball games, pista, medical mission, o mga rush hour commuter surge sa inyong barangay.'
                : 'Report basketball tournaments, barangay fiestas, health missions, or transit queues in your area.'}
            </p>
          </div>

          <!-- Category Selector -->
          <div>
            <span class="block text-xs font-black uppercase mb-1.5 text-[#796658] dark:text-[#D6C7B2]">
              {language === 'tl' ? 'Uri ng Kaganapan:' : 'Event Category:'}
            </span>
            <div class="grid grid-cols-3 gap-2">
              <button
                type="button"
                on:click={() => (eventCategory = 'basketball')}
                class={`p-2.5 rounded-xl border text-xs font-black flex flex-col items-center gap-1 cursor-pointer transition ${
                  eventCategory === 'basketball'
                    ? 'bg-[#EA580C] text-white border-[#EA580C] shadow-xs'
                    : (isDarkMode ? 'bg-[#271A10] border-[#3D2717] text-[#FAF7F2]' : 'bg-white border-[#EAE4D9] text-[#4A2E1B]')
                }`}
              >
                <Icon name="trophy" size={18} />
                <span>{language === 'tl' ? 'Basketball' : 'Basketball'}</span>
              </button>

              <button
                type="button"
                on:click={() => (eventCategory = 'barangay')}
                class={`p-2.5 rounded-xl border text-xs font-black flex flex-col items-center gap-1 cursor-pointer transition ${
                  eventCategory === 'barangay'
                    ? 'bg-[#059669] text-white border-[#059669] shadow-xs'
                    : (isDarkMode ? 'bg-[#271A10] border-[#3D2717] text-[#FAF7F2]' : 'bg-white border-[#EAE4D9] text-[#4A2E1B]')
                }`}
              >
                <Icon name="tent" size={18} />
                <span>{language === 'tl' ? 'Barangay' : 'Barangay'}</span>
              </button>

              <button
                type="button"
                on:click={() => (eventCategory = 'commuter')}
                class={`p-2.5 rounded-xl border text-xs font-black flex flex-col items-center gap-1 cursor-pointer transition ${
                  eventCategory === 'commuter'
                    ? 'bg-[#7C3AED] text-white border-[#7C3AED] shadow-xs'
                    : (isDarkMode ? 'bg-[#271A10] border-[#3D2717] text-[#FAF7F2]' : 'bg-white border-[#EAE4D9] text-[#4A2E1B]')
                }`}
              >
                <Icon name="bus" size={18} />
                <span>{language === 'tl' ? 'Commuter' : 'Commuters'}</span>
              </button>
            </div>
          </div>

          <!-- Event Title -->
          <div>
            <label for="event-title-input" class="block text-xs font-black uppercase mb-1.5 text-[#796658] dark:text-[#D6C7B2]">
              {language === 'tl' ? 'Pamagat ng Event o Palaro:' : 'Event or League Title:'}
            </label>
            <input
              id="event-title-input"
              type="text"
              bind:value={eventTitle}
              placeholder="hal. Brgy. 398 Inter-Purok Basketball Finals"
              class={`w-full p-3 rounded-2xl text-xs font-bold border transition ${
                isDarkMode ? 'bg-[#271A10] border-[#3D2717] text-white focus:border-[#F59E0B]' : 'bg-white border-[#EAE4D9] text-[#4A2E1B] focus:border-[#4A2E1B]'
              }`}
              required
            />
          </div>

          <!-- Venue / Court Name -->
          <div>
            <label for="event-venue-input" class="block text-xs font-black uppercase mb-1.5 text-[#796658] dark:text-[#D6C7B2]">
              {language === 'tl' ? 'Pangalan ng Court, Plaza, o Terminal:' : 'Venue or Court Location:'}
            </label>
            <input
              id="event-venue-input"
              type="text"
              bind:value={eventVenue}
              placeholder="hal. Covered Basketball Court / Plaza / UV Express Stop"
              class={`w-full p-3 rounded-2xl text-xs font-bold border transition ${
                isDarkMode ? 'bg-[#271A10] border-[#3D2717] text-white focus:border-[#F59E0B]' : 'bg-white border-[#EAE4D9] text-[#4A2E1B] focus:border-[#4A2E1B]'
              }`}
              required
            />
          </div>

          <!-- Days & Hours Grid -->
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label for="event-days-input" class="block text-xs font-black uppercase mb-1.5 text-[#796658] dark:text-[#D6C7B2]">
                {language === 'tl' ? 'Araw o Skedyul:' : 'Active Days:'}
              </label>
              <input
                id="event-days-input"
                type="text"
                bind:value={eventDays}
                placeholder="hal. Tuwing Sabado & Linggo"
                class={`w-full p-3 rounded-2xl text-xs font-bold border ${
                  isDarkMode ? 'bg-[#271A10] border-[#3D2717] text-white' : 'bg-white border-[#EAE4D9] text-[#4A2E1B]'
                }`}
                required
              />
            </div>

            <div>
              <span class="block text-xs font-black uppercase mb-1.5 text-[#796658] dark:text-[#D6C7B2]">
                {language === 'tl' ? 'Oras ng Dagsa:' : 'Busy Hours:'}
              </span>
              <div class="flex items-center gap-1.5">
                <input
                  type="text"
                  aria-label="Event Start Time"
                  bind:value={eventStartTime}
                  placeholder="5:30 PM"
                  class={`w-1/2 p-3 rounded-2xl text-xs font-bold border text-center ${
                    isDarkMode ? 'bg-[#271A10] border-[#3D2717] text-white' : 'bg-white border-[#EAE4D9] text-[#4A2E1B]'
                  }`}
                  required
                />
                <span class="text-xs font-bold">–</span>
                <input
                  type="text"
                  aria-label="Event End Time"
                  bind:value={eventEndTime}
                  placeholder="9:30 PM"
                  class={`w-1/2 p-3 rounded-2xl text-xs font-bold border text-center ${
                    isDarkMode ? 'bg-[#271A10] border-[#3D2717] text-white' : 'bg-white border-[#EAE4D9] text-[#4A2E1B]'
                  }`}
                  required
                />
              </div>
            </div>
          </div>

          <!-- Estimated Attendees -->
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <label for="event-attendees-range" class="text-xs font-black uppercase text-[#796658] dark:text-[#D6C7B2]">
                {language === 'tl' ? 'Tantiyang Dami ng Manonood / Tao:' : 'Estimated Attendees / Footfall:'}
              </label>
              <span class="text-xs font-black text-[#D97706]">
                ~{estimatedAttendees.toLocaleString()} {language === 'tl' ? 'katao' : 'people'}
              </span>
            </div>
            <input
              id="event-attendees-range"
              type="range"
              min="50"
              max="2500"
              step="50"
              bind:value={estimatedAttendees}
              class="w-full accent-[#D97706] cursor-pointer"
            />
          </div>

          <!-- Why Customers Gather -->
          <div>
            <label for="event-explanation-textarea" class="block text-xs font-black uppercase mb-1.5 text-[#796658] dark:text-[#D6C7B2]">
              {language === 'tl' ? 'Paliwanag kung Bakit Malakas ang Bentahan:' : 'Why Customers Gather Here:'}
            </label>
            <textarea
              id="event-explanation-textarea"
              bind:value={eventDemandExplanationTl}
              rows="2"
              class={`w-full p-3 rounded-2xl text-xs font-medium border resize-none ${
                isDarkMode ? 'bg-[#271A10] border-[#3D2717] text-white' : 'bg-white border-[#EAE4D9] text-[#4A2E1B]'
              }`}
              placeholder="Paliwanag kung bakit magandang magtinda dito..."
              required
            ></textarea>
          </div>

          <!-- GPS Anchor -->
          <div class={`p-3 rounded-2xl border flex items-center justify-between gap-2 text-xs ${
            isDarkMode ? 'bg-[#271A10] border-[#3D2717]' : 'bg-white border-[#EAE4D9]'
          }`}>
            <div>
              <span class="font-bold text-[11px] block">{language === 'tl' ? 'Lokasyon sa Mapa' : 'Map Coordinates'}</span>
              <span class="text-[10px] opacity-70">{eventLat.toFixed(4)}, {eventLng.toFixed(4)}</span>
            </div>
            <button
              type="button"
              on:click={setCoordinatesToSession}
              class="px-2.5 py-1.5 rounded-xl bg-[#D97706]/15 text-[#D97706] font-black text-[11px] cursor-pointer hover:bg-[#D97706]/25"
            >
              📍 {language === 'tl' ? 'Kasalukuyang GPS' : 'Use Current GPS'}
            </button>
          </div>

          <!-- Submit Button -->
          <button
            type="submit"
            class={`w-full py-4 rounded-2xl font-black text-xs sm:text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-98 ${
              isDarkMode ? 'bg-[#F59E0B] text-[#1A120B] hover:bg-[#D97706]' : 'bg-[#4A2E1B] text-white hover:bg-[#361F11]'
            }`}
          >
            <span>💾</span>
            <span>{language === 'tl' ? 'I-save ang Community Event' : 'Save Community Event'}</span>
          </button>
        </form>

      <!-- TAB 3: MANAGE HOTSPOTS LIST -->
      {:else if activeTab === 'manage'}
        <div class="space-y-3">
          <div class="flex items-center justify-between pb-2 border-b border-black/5 dark:border-white/5">
            <span class="text-xs font-black uppercase text-[#796658] dark:text-[#D6C7B2]">
              {language === 'tl' ? 'Lahat ng Aktibong Hotspot' : 'All Active Hotspots'} ({activeHotspots.length})
            </span>
            <button
              type="button"
              on:click={handleResetDefaults}
              class="text-xs font-bold text-red-500 hover:underline cursor-pointer"
            >
              🔄 {language === 'tl' ? 'I-reset sa Defaults' : 'Reset to Defaults'}
            </button>
          </div>

          <div class="space-y-2">
            {#each activeHotspots as hotspot}
              {@const lvl = HOTSPOT_LEVEL_META[hotspot.potentialLevel]}
              {@const cat = HOTSPOT_CATEGORY_META[hotspot.category]}
              <div
                class={`p-3 rounded-2xl border flex items-start justify-between gap-3 ${
                  isDarkMode ? 'bg-[#271A10] border-[#3D2717]' : 'bg-white border-[#EAE4D9]'
                }`}
              >
                <div class="flex items-start gap-2.5 min-w-0">
                  <div
                    class="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 border"
                    style={`background-color: ${lvl.badgeBg}; border-color: ${lvl.mapStroke};`}
                  >
                    <Icon name={cat.icon} size={18} />
                  </div>

                  <div class="min-w-0">
                    <div class="flex items-center gap-1.5 flex-wrap">
                      <span
                        class="text-[9px] font-black uppercase px-2 py-0.5 rounded-full"
                        style={`background-color: ${lvl.badgeBg}; color: ${lvl.badgeColor};`}
                      >
                        <span class="inline-flex items-center gap-1">
                          <Icon name={lvl.iconEmoji} size={10} />
                          {hotspot.opportunityScore}/100
                        </span>
                      </span>
                      {#if hotspot.isUserAdded}
                        <span class="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#D97706]/15 text-[#D97706]">
                          ✓ Inulat Mo
                        </span>
                      {/if}
                    </div>

                    <h4 class="text-xs font-black truncate mt-1">{hotspot.name}</h4>
                    <p class={`text-[11px] font-semibold truncate ${isDarkMode ? 'text-[#D6C7B2]' : 'text-[#796658]'}`}>
                      🕒 {hotspot.expectedBusyTime}
                    </p>
                    <p class="text-[10px] text-[#D97706] font-medium mt-0.5">
                      👥 {hotspot.estimatedCrowd}
                    </p>
                  </div>
                </div>

                {#if hotspot.isUserAdded}
                  <button
                    type="button"
                    on:click={() => handleDeleteHotspot(hotspot.id)}
                    class="w-7 h-7 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 flex items-center justify-center text-xs font-bold cursor-pointer shrink-0"
                    title="Burahin ang hotspot"
                  >
                    🗑️
                  </button>
                {/if}
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>

    <!-- Modal Footer / Truthful Data Disclaimer -->
    <div
      class={`p-4 border-t shrink-0 text-center text-[10px] ${
        isDarkMode ? 'border-[#3D2717] bg-[#1A120B] text-[#A89885]' : 'border-[#EAE4D9] bg-[#FAF7F2] text-[#8A7969]'
      }`}
    >
      <p class="font-medium">
        🛡️ <strong>{language === 'tl' ? 'Paalala sa Datos:' : 'Data Integrity Notice:'}</strong>
        {language === 'tl'
          ? 'Ang mga kalkulasyon ay hango sa nakatakdang iskedyul ng paaralan at iniulat na aktibidad ng barangay, hindi totoong foot surveillance camera.'
          : 'Calculations are derived from configured school calendars and reported community activities, not surveillance camera feeds.'}
      </p>
    </div>
  </div>
</div>
