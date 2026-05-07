<script lang="ts">
import { createEventDispatcher } from 'svelte'

const dispatch = createEventDispatcher<{ click: void }>()
</script>

<a
  href="/timeline/2d/"
  class="grid h-8 min-w-8 place-items-center rounded border border-cyan-100/20 bg-cyan-950/50 px-2 text-[0.62rem] font-black uppercase tracking-[0.14em] text-cyan-100 shadow-[0_0_0.7rem_rgba(8,145,178,0.18)] transition hover:border-cyan-100/45 hover:bg-cyan-900/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200"
  title="Switch to legacy 2D timeline"
  aria-label="Switch to legacy 2D timeline"
  data-timeline-interactive
  on:click={() => dispatch('click')}
>
  2D
</a>
