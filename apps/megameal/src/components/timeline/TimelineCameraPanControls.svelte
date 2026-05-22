<script lang="ts">
import Icon from '@iconify/svelte/dist/Icon.svelte'
import { createEventDispatcher } from 'svelte'

export let step = 0.2

type PanControl = {
  label: string
  title: string
  x: number
  y: number
  icon?: string
  reset?: boolean
}

const dispatch = createEventDispatcher<{
  pan: { x: number; y: number }
  reset: void
}>()

const buttonClass =
  'inline-flex h-7 w-7 items-center justify-center rounded-md border border-cyan-100/20 bg-cyan-950/50 p-0 leading-none text-cyan-100 shadow-[0_0_0.8rem_rgba(8,145,178,0.16)] transition hover:border-cyan-100/45 hover:bg-cyan-900/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200'
const resetButtonClass =
  'inline-flex h-7 w-7 items-center justify-center rounded-md border border-cyan-100/20 bg-slate-950/60 p-0 leading-none text-cyan-100 shadow-[0_0_0.8rem_rgba(8,145,178,0.16)] transition hover:border-cyan-100/45 hover:bg-cyan-900/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200'

$: controls = [
  {
    label: 'Pan camera left',
    title: 'Pan left',
    x: -step,
    y: 0,
    icon: 'material-symbols:keyboard-arrow-left-rounded',
  },
  {
    label: 'Pan camera up',
    title: 'Pan up',
    x: 0,
    y: step,
    icon: 'material-symbols:keyboard-arrow-up-rounded',
  },
  {
    label: 'Reset camera pan',
    title: 'Center camera',
    x: 0,
    y: 0,
    icon: 'mdi:crosshairs-gps',
    reset: true,
  },
  {
    label: 'Pan camera down',
    title: 'Pan down',
    x: 0,
    y: -step,
    icon: 'material-symbols:keyboard-arrow-down-rounded',
  },
  {
    label: 'Pan camera right',
    title: 'Pan right',
    x: step,
    y: 0,
    icon: 'material-symbols:keyboard-arrow-right-rounded',
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
      <Icon icon={control.icon ?? 'mdi:circle-small'} class="block h-4 w-4 shrink-0" aria-hidden="true" />
    </button>
  {/each}
</div>
