<script lang="ts">
  import { getIconSvg } from '../icons';

  export let name: string;
  export let size: number = 18;
  export let color: string = 'currentColor';
  export let strokeWidth: number = 2;
  let className: string = '';
  export { className as class };

  $: svg = getIconSvg(name, { size, color, strokeWidth });
</script>

<span
  class={`inline-flex items-center justify-center shrink-0 ${className}`}
  style={`width:${size}px;height:${size}px`}
  aria-hidden="true"
>
  {@html svg}
</span>
