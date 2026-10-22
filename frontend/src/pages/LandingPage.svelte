<script lang="ts">
  import type { Language, UserRole } from '../lib/types';
  import LandingView from '../lib/components/LandingView.svelte';

  export let language: Language = 'tl';
  export let isDarkMode: boolean = false;
  export let onToggleDarkMode: () => void;
  export let onStart: () => void;
  export let onSelectRoleDirect: (role: UserRole) => void;
</script>

<LandingView
  {language}
  {isDarkMode}
  {onToggleDarkMode}
  {onStart}
  {onSelectRoleDirect}
/>
