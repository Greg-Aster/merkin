<script lang="ts">
import Icon from '@iconify/svelte/dist/Icon.svelte'
import { createEventDispatcher } from 'svelte'
import type { TimelineAutopilotPhase } from './timelinePortalFlight'

export let autopilotEnabled = false
export let autopilotPhase: TimelineAutopilotPhase = 'manual'
export let isBoosting = false
export let boostDisabled = false

const dispatch = createEventDispatcher<{
  autopilottoggle: void
  boosttoggle: void
}>()
const baseButtonClass =
  'inline-flex h-8 min-w-0 flex-1 shrink-0 items-center justify-center gap-1.5 rounded-md border border-cyan-100/25 bg-cyan-950/60 px-2 font-mono text-[0.56rem] font-black uppercase leading-none tracking-[0.08em] text-cyan-100 shadow-[0_0_0.9rem_rgba(8,145,178,0.18)] transition hover:border-cyan-100/50 hover:bg-cyan-900/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200 disabled:cursor-not-allowed disabled:opacity-40 md:flex-none'
const activeButtonClass = 'border-amber-200/60 bg-amber-500/20 text-amber-100'

$: autopilotButtonClass = autopilotEnabled
  ? `${baseButtonClass} ${activeButtonClass}`
  : baseButtonClass
$: boostButtonClass = isBoosting
  ? `${baseButtonClass} ${activeButtonClass}`
  : baseButtonClass
$: autopilotIcon = autopilotEnabled
  ? 'material-symbols:pause-rounded'
  : 'material-symbols:route-rounded'
$: autopilotStateLabel = autopilotPhase === 'dwell'
  ? 'holding at destination'
  : autopilotPhase === 'travel'
    ? 'flying to destination'
    : 'manual flight'
$: boostDisabledLabel = autopilotEnabled
  ? 'Boost is unavailable while holding at a destination'
  : 'Boost is unavailable when reduced motion is enabled'
</script>

<div
  class="flex w-full shrink-0 items-center justify-center gap-1.5 md:w-auto"
  aria-label="Timeline flight controls"
  data-timeline-motion-controls
>
  <button
    type="button"
    class={autopilotButtonClass}
    aria-label={autopilotEnabled ? 'Disable timeline autopilot' : 'Enable timeline autopilot'}
    aria-pressed={autopilotEnabled}
    title={autopilotEnabled
      ? `Autopilot on · ${autopilotStateLabel} · switch to manual flight`
      : 'Autopilot off · fly to a destination'}
    data-timeline-interactive
    data-timeline-autopilot
    on:click={() => dispatch('autopilottoggle')}
  >
    <Icon icon={autopilotIcon} class="block h-4 w-4 shrink-0" aria-hidden="true" />
    <span>Autopilot {autopilotEnabled ? 'On' : 'Off'}</span>
  </button>

  <button
    type="button"
    class={boostButtonClass}
    aria-label={isBoosting ? 'Disengage timeline boost' : 'Engage timeline boost'}
    aria-pressed={isBoosting}
    aria-keyshortcuts="Shift"
    disabled={boostDisabled}
    title={boostDisabled ? boostDisabledLabel : 'Boost flight · Shift'}
    data-timeline-interactive
    data-timeline-boost
    on:click={() => dispatch('boosttoggle')}
  >
    <Icon
      icon="material-symbols:keyboard-double-arrow-right-rounded"
      class="block h-4 w-4 shrink-0"
      aria-hidden="true"
    />
    <span>{isBoosting ? 'Boosting' : 'Boost'}</span>
  </button>
</div>
