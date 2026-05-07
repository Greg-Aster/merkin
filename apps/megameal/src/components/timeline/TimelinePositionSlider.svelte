<script lang="ts">
import { createEventDispatcher } from 'svelte'
import {
  clamp,
  type TimelinePortalEraSegment,
} from './timelinePortalCarouselModel'

export let eraSegments: TimelinePortalEraSegment[] = []
export let activeEraKey: string | undefined = undefined
export let maxWheel = 0
export let value = 0
export let valueText = 'Timeline position'
export let keyboardStep = 0.82
export let pageStep = 1.64
export let getEraMarkerStyle: (eraSegment: TimelinePortalEraSegment) => string = () => ''

const dispatch = createEventDispatcher<{
  positionchange: { value: number }
}>()

let sliderTrack: HTMLDivElement | null = null
let sliderPointerId: number | null = null

$: sliderPercent = maxWheel > 0 ? (value / maxWheel) * 100 : 0

function setTimelinePosition(nextValue: number) {
  dispatch('positionchange', { value: clamp(nextValue, 0, maxWheel) })
}

function setTimelinePositionFromClientX(clientX: number) {
  if (!sliderTrack || maxWheel <= 0) return

  const bounds = sliderTrack.getBoundingClientRect()
  const ratio = clamp((clientX - bounds.left) / Math.max(bounds.width, 1), 0, 1)
  setTimelinePosition(ratio * maxWheel)
}

function handleSliderPointerDown(event: PointerEvent) {
  event.preventDefault()
  sliderPointerId = event.pointerId
  sliderTrack?.setPointerCapture(event.pointerId)
  setTimelinePositionFromClientX(event.clientX)
}

function handleSliderPointerMove(event: PointerEvent) {
  if (sliderPointerId !== event.pointerId) return

  event.preventDefault()
  setTimelinePositionFromClientX(event.clientX)
}

function handleSliderPointerUp(event: PointerEvent) {
  if (sliderPointerId !== event.pointerId) return

  try {
    sliderTrack?.releasePointerCapture(event.pointerId)
  } catch {
    // Pointer capture may already be released by the browser.
  }
  sliderPointerId = null
}

function handleSliderKeydown(event: KeyboardEvent) {
  const stepByKey: Record<string, number | undefined> = {
    ArrowUp: keyboardStep,
    ArrowRight: keyboardStep,
    PageUp: pageStep,
    ArrowDown: -keyboardStep,
    ArrowLeft: -keyboardStep,
    PageDown: -pageStep,
  }

  if (event.key === 'Home') {
    setTimelinePosition(0)
    event.preventDefault()
    return
  }

  if (event.key === 'End') {
    setTimelinePosition(maxWheel)
    event.preventDefault()
    return
  }

  const step = stepByKey[event.key]
  if (step === undefined) return

  setTimelinePosition(value + step)
  event.preventDefault()
}
</script>

<div
  bind:this={sliderTrack}
  role="slider"
  tabindex="0"
  aria-label="Timeline position"
  aria-orientation="horizontal"
  aria-valuemin="0"
  aria-valuemax={maxWheel}
  aria-valuenow={Math.round(value * 100) / 100}
  aria-valuetext={valueText}
  class="pointer-events-auto relative h-7 w-full cursor-ew-resize touch-none rounded-full border border-cyan-100/20 bg-cyan-950/45 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-200"
  data-timeline-interactive
  on:pointerdown={handleSliderPointerDown}
  on:pointermove={handleSliderPointerMove}
  on:pointerup={handleSliderPointerUp}
  on:pointercancel={handleSliderPointerUp}
  on:keydown={handleSliderKeydown}
>
  <div
    class="absolute left-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-cyan-200/70 shadow-[0_0_1rem_rgba(103,232,249,0.74)]"
    style={`width: ${sliderPercent}%`}
  ></div>
  <div
    class="absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border border-white/80 bg-cyan-100 shadow-[0_0_1.2rem_rgba(165,243,252,0.9)]"
    style={`left: calc(${sliderPercent}% - 0.5rem)`}
  ></div>
  {#each eraSegments as eraSegment (eraSegment.key)}
    <div
      class="absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-slate-950/80 shadow-[0_0_0.75rem_currentColor]"
      class:h-2={eraSegment.isOverlapping}
      class:w-2={eraSegment.isOverlapping}
      class:rotate-45={eraSegment.isOverlapping}
      class:ring-2={activeEraKey === eraSegment.key}
      class:ring-white={activeEraKey === eraSegment.key}
      style={getEraMarkerStyle(eraSegment)}
      title={`${eraSegment.displayName}: Y${eraSegment.startYear} - Y${eraSegment.endYear}`}
      aria-hidden="true"
    ></div>
  {/each}
</div>
