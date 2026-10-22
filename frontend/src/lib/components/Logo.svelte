<script lang="ts">
  export let isDarkMode: boolean = false;
  export let className: string = 'h-10 sm:h-12 w-auto object-contain';
</script>

<img
  src={isDarkMode ? '/assets/pwesto_dark.svg' : '/assets/pwesto_default.svg'}
  alt="Pwesto"
  class={className}
/>
