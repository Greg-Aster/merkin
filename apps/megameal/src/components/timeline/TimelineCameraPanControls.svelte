<script lang="ts">
import Icon from '@iconify/svelte/dist/Icon.svelte'
import { createEventDispatcher } from 'svelte'

export let step = 0.2
export let showMapControls = false

type CameraControl = {
  label: string
  title: string
  x?: number
  y?: number
  multiplier?: number
  icon?: string
  kind: 'pan' | 'zoom' | 'orbit' | 'reset'
}

const dispatch = createEventDispatcher<{
  pan: { x: number; y: number }
  zoom: { multiplier: number }
  orbit: { x: number; y: number }
  reset: undefined
}>()

const buttonClass =
  'inline-flex h-7 w-7 items-center justify-center rounded-md border border-cyan-100/20 bg-cyan-950/50 p-0 leading-none text-cyan-100 shadow-[0_0_0.8rem_rgba(8,145,178,0.16)] transition hover:border-cyan-100/45 hover:bg-cyan-900/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200'
const resetButtonClass =
  'inline-flex h-7 w-7 items-center justify-center rounded-md border border-cyan-100/20 bg-slate-950/60 p-0 leading-none text-cyan-100 shadow-[0_0_0.8rem_rgba(8,145,178,0.16)] transition hover:border-cyan-100/45 hover:bg-cyan-900/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200'

$: panControls = [
  {
    label: 'Pan camera left',
    title: 'Pan left',
    x: -step,
    y: 0,
    icon: 'material-symbols:keyboard-arrow-left-rounded',
    kind: 'pan',
  },
  {
    label: 'Pan camera up',
    title: 'Pan up',
    x: 0,
    y: step,
    icon: 'material-symbols:keyboard-arrow-up-rounded',
    kind: 'pan',
  },
  {
    label: showMapControls ? 'Reset map camera view' : 'Reset camera pan',
    title: showMapControls ? 'Reset view' : 'Center camera',
    x: 0,
    y: 0,
    icon: 'mdi:crosshairs-gps',
    kind: 'reset',
  },
  {
    label: 'Pan camera down',
    title: 'Pan down',
    x: 0,
    y: -step,
    icon: 'material-symbols:keyboard-arrow-down-rounded',
    kind: 'pan',
  },
  {
    label: 'Pan camera right',
    title: 'Pan right',
    x: step,
    y: 0,
    icon: 'material-symbols:keyboard-arrow-right-rounded',
    kind: 'pan',
  },
] satisfies CameraControl[]

$: mapControls = [
  {
    label: 'Zoom timeline map out',
    title: 'Zoom out',
    multiplier: 1 / 1.16,
    icon: 'mdi:magnify-minus-outline',
    kind: 'zoom',
  },
  {
    label: 'Orbit timeline map left',
    title: 'Orbit left',
    x: -0.18,
    y: 0,
    icon: 'mdi:rotate-left',
    kind: 'orbit',
  },
  {
    label: 'Orbit timeline map up',
    title: 'Orbit up',
    x: 0,
    y: -0.18,
    icon: 'material-symbols:keyboard-double-arrow-up-rounded',
    kind: 'orbit',
  },
  {
    label: 'Orbit timeline map down',
    title: 'Orbit down',
    x: 0,
    y: 0.18,
    icon: 'material-symbols:keyboard-double-arrow-down-rounded',
    kind: 'orbit',
  },
  {
    label: 'Orbit timeline map right',
    title: 'Orbit right',
    x: 0.18,
    y: 0,
    icon: 'mdi:rotate-right',
    kind: 'orbit',
  },
  {
    label: 'Zoom timeline map in',
    title: 'Zoom in',
    multiplier: 1.16,
    icon: 'mdi:magnify-plus-outline',
    kind: 'zoom',
  },
] satisfies CameraControl[]

$: controls = showMapControls
  ? [mapControls[0], ...panControls, ...mapControls.slice(1)]
  : panControls

function handleControl(control: CameraControl) {
  if (control.kind === 'reset') {
    dispatch('reset')
    return
  }

  if (control.kind === 'zoom') {
    dispatch('zoom', { multiplier: control.multiplier ?? 1 })
    return
  }

  if (control.kind === 'orbit') {
    dispatch('orbit', { x: control.x ?? 0, y: control.y ?? 0 })
    return
  }

  dispatch('pan', { x: control.x ?? 0, y: control.y ?? 0 })
}
</script>

<div
  class="flex max-w-full shrink-0 flex-wrap items-center justify-center gap-1 font-mono text-[0.62rem] font-black uppercase tracking-[0.14em] text-cyan-100"
  aria-label={showMapControls ? 'Timeline map camera controls' : 'Camera pan controls'}
  data-timeline-interactive
>
  {#each controls as control (control.label)}
    <button
      type="button"
      class={control.kind === 'reset' ? resetButtonClass : buttonClass}
      aria-label={control.label}
      title={control.title}
      on:click={() => handleControl(control)}
    >
      <Icon icon={control.icon ?? 'mdi:circle-small'} class="block h-4 w-4 shrink-0" aria-hidden="true" />
    </button>
  {/each}
</div>
