<script lang="ts">
  import type { Language, TaggedVendor, UserSession } from '../lib/types';
  import MainMapScreen from '../lib/components/MainMapScreen.svelte';

  export let session: UserSession;
  export let vendors: TaggedVendor[];
  export let language: Language = 'tl';
  export let isDarkMode: boolean = false;
  export let onToggleDarkMode: (() => void) | undefined = undefined;
  export let onSwitchRole: () => void;
  export let onResetSession: () => void;
  export let onNavigate: (route: string) => void;
</script>

<MainMapScreen
  {session}
  {vendors}
  {language}
  {isDarkMode}
  {onToggleDarkMode}
  {onSwitchRole}
  {onResetSession}
  onNavigateToLanding={() => onNavigate('landing')}
  onNavigateToSettings={() => onNavigate('settings')}
  onNavigateToSearch={() => onNavigate('search')}
  onNavigateToVendor={() => onNavigate('vendor')}
/>
