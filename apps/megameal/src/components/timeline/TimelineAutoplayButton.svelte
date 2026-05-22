<script lang="ts">
import Icon from '@iconify/svelte/dist/Icon.svelte'

export let isAutoplaying = false

const baseButtonClass =
  'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-cyan-100/25 bg-cyan-950/60 p-0 leading-none text-cyan-100 shadow-[0_0_0.9rem_rgba(8,145,178,0.18)] transition hover:border-cyan-100/50 hover:bg-cyan-900/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200'
const activeButtonClass = 'border-amber-200/60 bg-amber-500/20 text-amber-100'

$: buttonClass = isAutoplaying ? `${baseButtonClass} ${activeButtonClass}` : baseButtonClass
$: autoplayIcon = isAutoplaying ? 'material-symbols:pause-rounded' : 'material-symbols:play-arrow-rounded'
</script>

<button
  type="button"
  class={buttonClass}
  aria-label={isAutoplaying ? 'Pause timeline autoplay' : 'Play timeline autoplay'}
  aria-pressed={isAutoplaying}
  title={isAutoplaying ? 'Pause timeline' : 'Play timeline'}
  data-timeline-interactive
  on:click
>
  <Icon icon={autoplayIcon} class="block h-4 w-4 shrink-0" aria-hidden="true" />
</button>
