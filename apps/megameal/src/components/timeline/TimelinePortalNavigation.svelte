<script lang="ts">
import { formatTimelineYear } from '@merkin/shared-content'
import { createEventDispatcher } from 'svelte'
import TimelineCameraPanControls from './TimelineCameraPanControls.svelte'
import TimelineMotionControls from './TimelineMotionControls.svelte'
import TimelinePositionSlider from './TimelinePositionSlider.svelte'
import TimelineViewModeButton from './TimelineViewModeButton.svelte'
import type { TimelineAutopilotPhase } from './timelinePortalFlight'
import type {
  TimelinePortalEraSegment,
  TimelinePortalEvent,
} from './timelinePortalCarouselModel'

type TimelineViewMode = 'travel' | 'map'

export let activeEraSegment: TimelinePortalEraSegment | null = null
export let activeTimelineEvent: TimelinePortalEvent | null = null
export let viewMode: TimelineViewMode = 'travel'
export let isMapMode = false
export let autopilotEnabled = false
export let autopilotPhase: TimelineAutopilotPhase = 'manual'
export let isBoosting = false
export let boostDisabled = false
export let timelineDockStyle = ''
export let cameraPanStep = 0.2
export let maxWheel = 0
export let position = 0
export let timelinePositionText = 'Timeline position'
export let keyboardWheelStep = 0.82
export let pageWheelStep = 1.64

const dispatch = createEventDispatcher<{
  pan: { x: number; y: number }
  zoom: { multiplier: number }
  orbit: { x: number; y: number }
  reset: void
  viewmode: TimelineViewMode
  autopilottoggle: void
  boosttoggle: void
  position: number
}>()
</script>

<div class="timeline-mobile-readout pointer-events-none">
  <div class="timeline-mobile-readout__era truncate">
    {activeEraSegment?.displayName ?? 'Unknown Era'}
  </div>
  <div class="timeline-mobile-readout__title truncate">
    {activeTimelineEvent?.title ?? 'No timeline record'}
  </div>
  <div class="timeline-mobile-readout__year">
    {formatTimelineYear(activeTimelineEvent?.year)}
  </div>
</div>

<div
  class="pointer-events-auto absolute bottom-4 left-1/2 z-[6] flex w-[min(42rem,calc(100%_-_2rem))] -translate-x-1/2 flex-col gap-2 rounded-lg border border-cyan-100/20 bg-slate-950/72 px-3 py-2.5 text-slate-50 shadow-[0_0_1.4rem_rgba(8,145,178,0.24)] backdrop-blur-md md:gap-3 md:px-4 md:py-3"
  style={timelineDockStyle}
  data-timeline-dock
  data-timeline-interactive
>
  <div class="hidden min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 text-left font-mono uppercase tracking-[0.13em] text-slate-50 md:grid md:gap-3 md:tracking-[0.16em]">
    <div class="grid min-w-0 flex-1 gap-1">
      <div class="truncate text-[0.68rem] font-extrabold text-cyan-200">
        {activeEraSegment?.displayName ?? 'Unknown Era'}
      </div>
      <div class="truncate text-[0.66rem] font-bold text-slate-200/85">
        {activeTimelineEvent?.title ?? 'No timeline record'}
      </div>
    </div>

    <div class="flex min-w-0 items-center justify-center gap-2">
      <TimelineCameraPanControls
        step={cameraPanStep}
        showMapControls={isMapMode}
        on:pan={(event) => dispatch('pan', event.detail)}
        on:zoom={(event) => dispatch('zoom', event.detail)}
        on:orbit={(event) => dispatch('orbit', event.detail)}
        on:reset={() => dispatch('reset')}
      />
      <TimelineViewModeButton {viewMode} on:change={(event) => dispatch('viewmode', event.detail)} />
      {#if !isMapMode}
        <TimelineMotionControls
          {autopilotEnabled}
          {autopilotPhase}
          {isBoosting}
          {boostDisabled}
          on:autopilottoggle={() => dispatch('autopilottoggle')}
          on:boosttoggle={() => dispatch('boosttoggle')}
        />
      {/if}
    </div>
  </div>

  <div class="flex min-w-0 items-center justify-center gap-2 md:hidden">
    <TimelineCameraPanControls
      step={cameraPanStep}
      showMapControls={isMapMode}
      on:pan={(event) => dispatch('pan', event.detail)}
      on:zoom={(event) => dispatch('zoom', event.detail)}
      on:orbit={(event) => dispatch('orbit', event.detail)}
      on:reset={() => dispatch('reset')}
    />
    <TimelineViewModeButton {viewMode} on:change={(event) => dispatch('viewmode', event.detail)} />
  </div>

  {#if !isMapMode}
    <div class="flex min-w-0 md:hidden">
      <TimelineMotionControls
        {autopilotEnabled}
        {autopilotPhase}
        {isBoosting}
        {boostDisabled}
        on:autopilottoggle={() => dispatch('autopilottoggle')}
        on:boosttoggle={() => dispatch('boosttoggle')}
      />
    </div>
  {/if}

  <TimelinePositionSlider
    {maxWheel}
    value={position}
    valueText={timelinePositionText}
    keyboardStep={keyboardWheelStep}
    pageStep={pageWheelStep}
    on:positionchange={(event) => dispatch('position', event.detail.value)}
  />
</div>
