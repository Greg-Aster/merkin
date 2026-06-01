<script lang="ts">
import { createEventDispatcher } from 'svelte'

type TimelineViewMode = 'travel' | 'map'

const dispatch = createEventDispatcher<{ click: undefined }>()

export let viewMode: TimelineViewMode = 'travel'

$: href = viewMode === 'map' ? '/timeline/' : '/timeline/2d/'
$: label = viewMode === 'map' ? '3D' : 'Map'
$: title =
  viewMode === 'map'
    ? 'Switch to traveling 3D timeline'
    : 'Switch to timeline map'
</script>

<a
  {href}
  class="inline-flex h-8 min-w-8 items-center justify-center rounded border border-cyan-100/20 bg-cyan-950/50 px-2 leading-none text-[0.62rem] font-black uppercase tracking-[0.14em] text-cyan-100 shadow-[0_0_0.7rem_rgba(8,145,178,0.18)] transition hover:border-cyan-100/45 hover:bg-cyan-900/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200"
  {title}
  aria-label={title}
  data-timeline-interactive
  on:click={() => dispatch('click')}
>
  {label}
</a>
