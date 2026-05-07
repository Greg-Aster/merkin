<script lang="ts">
import { createEventDispatcher } from 'svelte'

export let step = 0.2

type PanControl = {
  label: string
  title: string
  x: number
  y: number
  path?: string
  reset?: boolean
}

const dispatch = createEventDispatcher<{
  pan: { x: number; y: number }
  reset: void
}>()

const buttonClass =
  'grid h-7 w-7 place-items-center rounded-md border border-cyan-100/20 bg-cyan-950/50 text-cyan-100 shadow-[0_0_0.8rem_rgba(8,145,178,0.16)] transition hover:border-cyan-100/45 hover:bg-cyan-900/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200'
const resetButtonClass =
  'grid h-7 w-7 place-items-center rounded-md border border-cyan-100/20 bg-slate-950/60 text-cyan-100 shadow-[0_0_0.8rem_rgba(8,145,178,0.16)] transition hover:border-cyan-100/45 hover:bg-cyan-900/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200'

$: controls = [
  {
    label: 'Pan camera left',
    title: 'Pan left',
    x: -step,
    y: 0,
    path: 'M15 5 8 12l7 7',
  },
  {
    label: 'Pan camera up',
    title: 'Pan up',
    x: 0,
    y: step,
    path: 'm5 15 7-7 7 7',
  },
  {
    label: 'Reset camera pan',
    title: 'Center camera',
    x: 0,
    y: 0,
    reset: true,
  },
  {
    label: 'Pan camera down',
    title: 'Pan down',
    x: 0,
    y: -step,
    path: 'm5 9 7 7 7-7',
  },
  {
    label: 'Pan camera right',
    title: 'Pan right',
    x: step,
    y: 0,
    path: 'm9 5 7 7-7 7',
  },
] satisfies PanControl[]

function handleControl(control: PanControl) {
  if (control.reset) {
    dispatch('reset')
    return
  }

  dispatch('pan', { x: control.x, y: control.y })
}
</script>

<div
  class="flex shrink-0 items-center justify-center gap-1 font-mono text-[0.62rem] font-black uppercase tracking-[0.14em] text-cyan-100"
  aria-label="Camera pan controls"
  data-timeline-interactive
>
  {#each controls as control (control.label)}
    <button
      type="button"
      class={control.reset ? resetButtonClass : buttonClass}
      aria-label={control.label}
      title={control.title}
      on:click={() => handleControl(control)}
    >
      <svg class="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
        {#if control.reset}
          <path d="M12 3v4M12 17v4M3 12h4M17 12h4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" />
          <circle cx="12" cy="12" r="3.5" fill="none" stroke="currentColor" stroke-width="2.2" />
        {:else if control.path}
          <path d={control.path} fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
        {/if}
      </svg>
    </button>
  {/each}
</div>
