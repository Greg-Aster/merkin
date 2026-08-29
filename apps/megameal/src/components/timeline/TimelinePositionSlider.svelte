<script lang="ts">
import { createEventDispatcher } from 'svelte'
import { clamp } from './timelinePortalCarouselModel'

export let maxWheel = 0
export let value = 0
export let valueText = 'Timeline position'
export let keyboardStep = 0.82
export let pageStep = 1.64

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
  class="pointer-events-auto group relative h-9 w-full cursor-ew-resize touch-none overflow-hidden rounded-lg border border-cyan-100/22 bg-[linear-gradient(180deg,rgba(15,23,42,0.94),rgba(8,47,73,0.58)),linear-gradient(90deg,rgba(103,232,249,0.16)_1px,transparent_1px)] bg-[length:100%_100%,2.25rem_100%] shadow-[inset_0_1px_0_rgba(255,255,255,0.12),inset_0_-1rem_1.4rem_rgba(8,47,73,0.35),0_0_1.2rem_rgba(8,145,178,0.18)] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-200"
  data-timeline-interactive
  on:pointerdown={handleSliderPointerDown}
  on:pointermove={handleSliderPointerMove}
  on:pointerup={handleSliderPointerUp}
  on:pointercancel={handleSliderPointerUp}
  on:keydown={handleSliderKeydown}
>
  <div class="pointer-events-none absolute inset-x-3 top-1/2 h-px -translate-y-1/2 bg-cyan-50/18"></div>
  <div class="pointer-events-none absolute inset-x-3 top-1/2 h-3 -translate-y-1/2 rounded-full bg-cyan-950/42 shadow-[inset_0_0_1rem_rgba(6,182,212,0.28)]"></div>

  <div
    class="pointer-events-none absolute left-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-[linear-gradient(90deg,rgba(34,211,238,0.92),rgba(255,255,255,0.9))] shadow-[0_0_1.1rem_rgba(103,232,249,0.7)]"
    style={`width: ${sliderPercent}%`}
  ></div>
  <div
    class="pointer-events-none absolute top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-50/80 bg-slate-950/82 shadow-[0_0_0_1px_rgba(8,47,73,0.85),0_0_1.7rem_rgba(165,243,252,0.76)]"
    style={`left: ${sliderPercent}%`}
  >
    <span class="absolute inset-1 rounded-full border border-cyan-100/32 bg-cyan-100/18"></span>
    <span class="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-50 shadow-[0_0_1rem_rgba(255,255,255,0.92)]"></span>
  </div>
</div>
