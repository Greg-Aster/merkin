<script lang="ts">
export let isAutoplaying = false

const baseButtonClass =
  'grid h-8 w-8 shrink-0 place-items-center rounded-md border border-cyan-100/25 bg-cyan-950/60 text-cyan-100 shadow-[0_0_0.9rem_rgba(8,145,178,0.18)] transition hover:border-cyan-100/50 hover:bg-cyan-900/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200'
const activeButtonClass = 'border-amber-200/60 bg-amber-500/20 text-amber-100'

$: buttonClass = isAutoplaying ? `${baseButtonClass} ${activeButtonClass}` : baseButtonClass
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
  <svg class="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
    {#if isAutoplaying}
      <path d="M8 5v14M16 5v14" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" />
    {:else}
      <path d="M8 5.5v13l10-6.5-10-6.5Z" fill="currentColor" />
    {/if}
  </svg>
</button>
