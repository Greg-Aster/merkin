<script lang="ts">
import { Canvas } from '@threlte/core'
import { onDestroy, onMount } from 'svelte'
import { fade } from 'svelte/transition'
import * as THREE from 'three'
import TimelinePortalCarouselScene from './TimelinePortalCarouselScene.svelte'
import {
  clamp,
  createTimelinePortalModel,
  type TimelineCarouselInput,
  type TimelinePortalEraConfig,
  type TimelinePortalEvent,
} from './timelinePortalCarouselModel'

import '../../styles/features/extracted/home-intro-environment.css'

export let events: TimelinePortalEvent[] = []
export let eraConfig: TimelinePortalEraConfig = {}

type TimelineStarScreenPosition = {
  index: number
  x: number
  y: number
  size: number
  visible: boolean
  eraKey: string
  isKeyEvent: boolean
}

type TimelineStarPositionEvent = CustomEvent<{
  positions: TimelineStarScreenPosition[]
}>

type TimelineConstellationLine = {
  id: string
  x1: number
  y1: number
  x2: number
  y2: number
  eraKey: string
  isActive: boolean
}

let shell: HTMLDivElement | null = null
let sliderTrack: HTMLDivElement | null = null
let sliderPointerId: number | null = null
let lastTouchCenterY: number | null = null
let virtualWheel = 0
let wheelVelocity = 0
let scrollFrame = 0
let lastScrollFrameAt = 0
let selectedScreenIndex = -1
let hoveredStarIndex = -1
let portraitMobile = false
let canvasDpr = 1
let sceneQuality: 'high' | 'balanced' | 'lean' = 'balanced'
let projectedStarPositions: TimelineStarScreenPosition[] = []
const wheelMomentumDecay = 2.4
const wheelMomentumImpulse = 5.2
const wheelMomentumMaxVelocity = 4.8
const mouseWheelSensitivity = 1.15
const mouseWheelMomentumImpulse = 3.6
const mouseWheelMomentumMaxVelocity = 2.8
const keyboardWheelStep = 0.82
const pageWheelStep = 1.64
const backgroundFadeDuration = 900
const input: TimelineCarouselInput = {
  x: 0,
  y: 0,
  dragX: 0,
  dragY: 0,
  wheel: 0,
  active: false,
}

$: timelineModel = createTimelinePortalModel(events, eraConfig)
$: sortedEvents = timelineModel.events
$: screens = timelineModel.screens
$: eraSegments = timelineModel.eraSegments
$: selectedScreen = selectedScreenIndex >= 0 ? sortedEvents[selectedScreenIndex] : null
$: selectedScreenView = selectedScreenIndex >= 0 ? screens[selectedScreenIndex] : null
$: maxWheel = Math.max(0, screens.length - 1)
$: activeTimelineEvent = sortedEvents[Math.round(clamp(input.wheel, 0, maxWheel))] ?? null
$: activeEraSegment = getActiveEraSegment(input.wheel)
$: activeEraProgress = activeEraSegment ? getEraProgress(input.wheel, activeEraSegment) : 0
$: eraBackgroundMediaStyle = getEraBackgroundMediaStyle(activeEraProgress)
$: visibleStarControls = projectedStarPositions
  .map(position => ({ ...position, screen: screens[position.index] }))
  .filter(({ screen, visible }) => !!screen && visible)
  .sort((a, b) => a.size - b.size)
$: constellationControls = projectedStarPositions
  .map(position => ({ ...position, screen: screens[position.index] }))
  .filter(position => !!position.screen && position.size > 0)
$: constellationLines = getVisibleConstellationLines(constellationControls)
$: sliderPercent = maxWheel > 0 ? (input.wheel / maxWheel) * 100 : 0
$: timelinePositionText = activeTimelineEvent
  ? `Y${activeTimelineEvent.year} / ${activeEraSegment?.displayName ?? 'Unknown Era'}`
  : 'Timeline position'

const createRenderer = (canvas: HTMLCanvasElement) => {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance',
  })

  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.08
  renderer.setClearColor(0x000000, 0)

  return renderer
}

function syncViewportMode() {
  if (typeof window === 'undefined') return
  portraitMobile = window.innerWidth <= 760 && window.innerHeight > window.innerWidth
}

function syncCanvasDpr() {
  if (typeof window === 'undefined') return
  const lowMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const compactViewport = window.innerWidth <= 760 || window.innerHeight <= 640
  canvasDpr = Math.min(window.devicePixelRatio || 1, compactViewport || lowMotion ? 1 : 1.25)
  sceneQuality = compactViewport || lowMotion ? 'lean' : 'balanced'
}

function updatePointer(clientX: number, clientY: number) {
  if (!shell) return

  const bounds = shell.getBoundingClientRect()
  if (bounds.width <= 0 || bounds.height <= 0) return

  input.x = ((clientX - bounds.left) / bounds.width - 0.5) * 2
  input.y = ((clientY - bounds.top) / bounds.height - 0.5) * 2
}

function isShellVisible() {
  if (!shell) return false

  const bounds = shell.getBoundingClientRect()
  return (
    bounds.bottom > 0 &&
    bounds.top < window.innerHeight &&
    bounds.right > 0 &&
    bounds.left < window.innerWidth
  )
}

function isInsideShell(clientX: number, clientY: number) {
  if (!shell) return false

  const bounds = shell.getBoundingClientRect()
  return (
    clientX >= bounds.left &&
    clientX <= bounds.right &&
    clientY >= bounds.top &&
    clientY <= bounds.bottom
  )
}

function updateScrollDrivenWheel() {
  input.wheel = clamp(virtualWheel, 0, maxWheel)
}

function runScrollDrivenWheelFrame(timestamp: number) {
  const delta = lastScrollFrameAt
    ? Math.min(0.05, (timestamp - lastScrollFrameAt) / 1000)
    : 1 / 60
  lastScrollFrameAt = timestamp

  if (Math.abs(wheelVelocity) > 0.001) {
    const nextWheel = clamp(virtualWheel + wheelVelocity * delta, 0, maxWheel)
    const hitScrollLimit =
      nextWheel === virtualWheel &&
      ((nextWheel <= 0 && wheelVelocity < 0) ||
        (nextWheel >= maxWheel && wheelVelocity > 0))

    virtualWheel = nextWheel
    wheelVelocity = hitScrollLimit
      ? 0
      : wheelVelocity * Math.exp(-wheelMomentumDecay * delta)
  }

  updateScrollDrivenWheel()

  if (Math.abs(wheelVelocity) > 0.001) {
    scrollFrame = window.requestAnimationFrame(runScrollDrivenWheelFrame)
  } else {
    scrollFrame = 0
    lastScrollFrameAt = 0
  }
}

function scheduleScrollDrivenWheel() {
  if (scrollFrame) return
  scrollFrame = window.requestAnimationFrame(runScrollDrivenWheelFrame)
}

function isInteractiveTarget(eventTarget: EventTarget | null) {
  return (
    eventTarget instanceof Element &&
    !!eventTarget.closest(
      'a, button, input, textarea, select, [role="button"], [data-timeline-interactive]',
    )
  )
}

function applyPositionDelta(deltaY: number, wheelDistance: number) {
  input.dragY += deltaY / Math.max(wheelDistance, 1)
  wheelVelocity = 0
  virtualWheel = clamp(
    virtualWheel - (deltaY / Math.max(wheelDistance, 1)) * 4.2,
    0,
    maxWheel,
  )
  scheduleScrollDrivenWheel()
}

function handlePointerMove(event: PointerEvent) {
  if (event.pointerType === 'touch') return
  updatePointer(event.clientX, event.clientY)
}

function handleTouchStart(event: TouchEvent) {
  if (isInteractiveTarget(event.target)) return
  if (event.touches.length < 2) {
    lastTouchCenterY = null
    input.active = false
    return
  }

  const [touchA, touchB] = Array.from(event.touches)
  if (!isInsideShell(touchA.clientX, touchA.clientY) && !isInsideShell(touchB.clientX, touchB.clientY)) return

  lastTouchCenterY = (touchA.clientY + touchB.clientY) / 2
  input.active = true
  wheelVelocity = 0
  updatePointer((touchA.clientX + touchB.clientX) / 2, lastTouchCenterY)
}

function handleTouchMove(event: TouchEvent) {
  if (event.touches.length < 2 || lastTouchCenterY === null) return

  event.preventDefault()
  const [touchA, touchB] = Array.from(event.touches)
  const touchCenterX = (touchA.clientX + touchB.clientX) / 2
  const touchCenterY = (touchA.clientY + touchB.clientY) / 2
  const deltaY = (touchCenterY - lastTouchCenterY) * 2.15
  const touchWheelDistance = Math.max(220, Math.min(window.innerHeight * 0.46, 360))
  updatePointer(touchCenterX, touchCenterY)
  applyPositionDelta(deltaY, touchWheelDistance)
  lastTouchCenterY = touchCenterY
}

function handleTouchEnd() {
  input.active = false
  lastTouchCenterY = null
}

function handleWheel(event: WheelEvent) {
  if (!shell || (!isInsideShell(event.clientX, event.clientY) && !isShellVisible())) return

  event.preventDefault()
  const viewportHeight = Math.max(window.innerHeight, 1)
  const wheelDelta = -(event.deltaY / viewportHeight) * mouseWheelSensitivity
  wheelVelocity = clamp(
    wheelVelocity + wheelDelta * mouseWheelMomentumImpulse,
    -mouseWheelMomentumMaxVelocity,
    mouseWheelMomentumMaxVelocity,
  )
  scheduleScrollDrivenWheel()
}

function handleKeyboardScroll(event: KeyboardEvent) {
  if (
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey ||
    isInteractiveTarget(event.target) ||
    !isShellVisible()
  ) {
    return
  }

  const stepByKey: Record<string, number | undefined> = {
    ArrowDown: keyboardWheelStep,
    ArrowRight: keyboardWheelStep,
    PageDown: pageWheelStep,
    ' ': keyboardWheelStep,
    Spacebar: keyboardWheelStep,
    ArrowUp: -keyboardWheelStep,
    ArrowLeft: -keyboardWheelStep,
    PageUp: -pageWheelStep,
  }
  const step = stepByKey[event.key]
  if (step === undefined) return

  const direction = Math.sign(step)
  if (
    direction === 0 ||
    (direction > 0 && virtualWheel >= maxWheel) ||
    (direction < 0 && virtualWheel <= 0)
  ) {
    return
  }

  wheelVelocity = clamp(
    wheelVelocity + step * wheelMomentumDecay,
    -wheelMomentumMaxVelocity,
    wheelMomentumMaxVelocity,
  )
  scheduleScrollDrivenWheel()
  event.preventDefault()
}

function handleResize() {
  syncViewportMode()
  syncCanvasDpr()
  scheduleScrollDrivenWheel()
}

function getStarControlStyle(position: TimelineStarScreenPosition) {
  return [
    `left: ${position.x}%`,
    `top: ${position.y}%`,
    `width: ${position.size}px`,
    `height: ${position.size}px`,
    'transform: translate(-50%, -50%)',
  ].join(';')
}

function getEraMarkerStyle(eraSegment: (typeof eraSegments)[number]) {
  const percent = maxWheel > 0 ? (eraSegment.startIndex / maxWheel) * 100 : 0
  return [
    `left: ${percent}%`,
    `top: ${eraSegment.isOverlapping ? 'calc(50% + 0.72rem)' : '50%'}`,
    `background-color: ${getEraMarkerColor(eraSegment.key)}`,
    `color: ${getEraMarkerColor(eraSegment.key)}`,
  ].join(';')
}

function getEraProgress(position: number, eraSegment: (typeof eraSegments)[number]) {
  const span = Math.max(1, eraSegment.endIndex - eraSegment.startIndex)
  return clamp((position - eraSegment.startIndex) / span, 0, 1)
}

function getEraBackgroundMediaStyle(progress: number) {
  const zoom = 1 + progress * 0.25
  const objectX = clamp(50 + input.x * 3.4, 44, 56)
  const objectY = clamp(50 + input.y * 2.4 + (0.5 - progress) * 5, 42, 58)

  return [
    `transform: scale(${zoom.toFixed(4)})`,
    'transform-origin: center',
    `object-position: ${objectX.toFixed(2)}% ${objectY.toFixed(2)}%`,
    'will-change: transform, object-position',
  ].join(';')
}

function getEraMarkerColor(eraKey: string) {
  const colors: Record<string, string> = {
    'ancient-epoch': '#67e8f9',
    'awakening-era': '#22d3ee',
    'golden-age': '#facc15',
    'conflict-epoch': '#fb7185',
    'transcendent-age': '#a78bfa',
    'final-epoch': '#e2e8f0',
    'singularity-conflict': '#f0abfc',
  }

  return colors[eraKey] ?? '#94a3b8'
}

function getActiveEraSegment(position: number) {
  const mainSegments = eraSegments.filter(segment => !segment.isOverlapping)
  return (
    mainSegments.find(segment => position >= segment.startIndex && position <= segment.endIndex) ??
    mainSegments.reduce(
      (nearest, segment) =>
        Math.abs(segment.centerIndex - position) < Math.abs(nearest.centerIndex - position)
          ? segment
          : nearest,
      mainSegments[0],
    ) ??
    eraSegments[0] ??
    null
  )
}

function getVisibleConstellationLines(
  controls: Array<TimelineStarScreenPosition & { screen: (typeof screens)[number] }>,
): TimelineConstellationLine[] {
  const groups = controls.reduce<Record<string, typeof controls>>((groupedControls, control) => {
    groupedControls[control.eraKey] ??= []
    groupedControls[control.eraKey].push(control)
    return groupedControls
  }, {})

  return Object.entries(groups).flatMap(([eraKey, eraControls]) => {
    const sortedEraControls = [...eraControls].sort((a, b) => a.index - b.index)

    return sortedEraControls
      .slice(0, -1)
      .map((control, index) => {
        const nextControl = sortedEraControls[index + 1]
        return {
          id: `${eraKey}-${control.index}-${nextControl.index}`,
          x1: clampConstellationPoint(control.x),
          y1: clampConstellationPoint(control.y),
          x2: clampConstellationPoint(nextControl.x),
          y2: clampConstellationPoint(nextControl.y),
          eraKey,
          isActive: control.index === selectedScreenIndex || nextControl.index === selectedScreenIndex,
        }
      })
  })
}

function clampConstellationPoint(value: number) {
  return clamp(value, -18, 118)
}

function handleStarPositions(event: TimelineStarPositionEvent) {
  projectedStarPositions = event.detail.positions
}

function selectStar(index: number) {
  selectedScreenIndex = index
}

function handleStarPointerDown(event: PointerEvent, index: number) {
  event.preventDefault()
  event.stopPropagation()
  selectStar(index)
}

function setHoveredStar(index: number) {
  hoveredStarIndex = index
}

function clearHoveredStar(index: number) {
  if (hoveredStarIndex === index) hoveredStarIndex = -1
}

function setTimelinePosition(value: number) {
  wheelVelocity = 0
  virtualWheel = clamp(value, 0, maxWheel)
  updateScrollDrivenWheel()
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
    ArrowUp: keyboardWheelStep,
    ArrowRight: keyboardWheelStep,
    PageUp: pageWheelStep,
    ArrowDown: -keyboardWheelStep,
    ArrowLeft: -keyboardWheelStep,
    PageDown: -pageWheelStep,
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

  setTimelinePosition(input.wheel + step)
  event.preventDefault()
}

onMount(() => {
  syncViewportMode()
  syncCanvasDpr()
  updateScrollDrivenWheel()
  if (shell) shell.dataset.timelineInitialized = 'true'
  const timelineMobileWrapper = shell?.closest<HTMLElement>('#timeline-mobile-wrapper')
  timelineMobileWrapper?.classList.remove('timeline-mobile-inactive')
  timelineMobileWrapper?.classList.add('timeline-mobile-active')

  window.addEventListener('pointermove', handlePointerMove)
  window.addEventListener('touchstart', handleTouchStart, { passive: false })
  window.addEventListener('touchmove', handleTouchMove, { passive: false })
  window.addEventListener('touchend', handleTouchEnd)
  window.addEventListener('touchcancel', handleTouchEnd)
  window.addEventListener('wheel', handleWheel, { passive: false })
  window.addEventListener('keydown', handleKeyboardScroll)
  window.addEventListener('resize', handleResize)

  return () => {
    window.removeEventListener('pointermove', handlePointerMove)
    window.removeEventListener('touchstart', handleTouchStart)
    window.removeEventListener('touchmove', handleTouchMove)
    window.removeEventListener('touchend', handleTouchEnd)
    window.removeEventListener('touchcancel', handleTouchEnd)
    window.removeEventListener('wheel', handleWheel)
    window.removeEventListener('keydown', handleKeyboardScroll)
    window.removeEventListener('resize', handleResize)
    if (scrollFrame) window.cancelAnimationFrame(scrollFrame)
    timelineMobileWrapper?.classList.remove('timeline-mobile-active')
    timelineMobileWrapper?.classList.add('timeline-mobile-inactive')
  }
})

onDestroy(() => {
  input.active = false
  lastTouchCenterY = null
  sliderPointerId = null
  if (scrollFrame) window.cancelAnimationFrame(scrollFrame)
})
</script>

<div
  bind:this={shell}
  class="home-intro-environment home-intro-environment--background-ready pointer-events-auto"
  class:home-intro-environment--screen-hover={selectedScreenIndex >= 0}
  style="--portal-reveal-progress: 1"
  data-timeline-shell="true"
>
  <div class="home-intro-background-curtain" aria-hidden="true"></div>

  <Canvas {createRenderer} dpr={canvasDpr}>
    <TimelinePortalCarouselScene
      {input}
      {screens}
      {selectedScreenIndex}
      hoveredScreenIndex={hoveredStarIndex}
      {sceneQuality}
      on:starpositions={handleStarPositions}
    />
  </Canvas>

  {#if activeEraSegment}
    {#key activeEraSegment.key}
      <div
        class="pointer-events-none absolute inset-0 z-0 overflow-hidden"
        data-timeline-era-background={activeEraSegment.key}
        aria-hidden="true"
        transition:fade={{ duration: backgroundFadeDuration }}
      >
        {#if activeEraSegment.backgroundVideo}
          <video
            class="h-full w-full object-cover brightness-[0.88] saturate-[1.12]"
            style={eraBackgroundMediaStyle}
            src={activeEraSegment.backgroundVideo}
            poster={activeEraSegment.backgroundImage}
            autoplay
            muted
            loop
            playsinline
          ></video>
        {:else if activeEraSegment.backgroundImage}
          <img
            class="h-full w-full object-cover brightness-[0.88] saturate-[1.12]"
            style={eraBackgroundMediaStyle}
            src={activeEraSegment.backgroundImage}
            alt=""
            loading="eager"
          />
        {/if}
        <div class="absolute inset-0 bg-slate-950/20"></div>
      </div>
    {/key}
  {/if}

  <svg
    class="pointer-events-none absolute inset-0 z-[4] h-full w-full"
    viewBox="0 0 100 100"
    preserveAspectRatio="none"
    aria-hidden="true"
  >
    {#each constellationLines as line (line.id)}
      <line
        x1={line.x1}
        y1={line.y1}
        x2={line.x2}
        y2={line.y2}
        stroke={getEraMarkerColor(line.eraKey)}
        stroke-width={line.isActive ? 0.16 : 0.08}
        stroke-opacity={line.isActive ? 0.7 : 0.34}
      />
    {/each}
  </svg>

  <div class="pointer-events-none absolute inset-0 z-[5]" data-timeline-interactive>
    {#each visibleStarControls as control (control.index)}
      <button
        type="button"
        class="pointer-events-auto absolute cursor-pointer rounded-full border-0 bg-transparent p-0 opacity-0 focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-200"
        style={getStarControlStyle(control)}
        aria-label={`Open timeline record: ${control.screen.title}`}
        title={control.screen.title}
        data-timeline-interactive
        on:mouseenter={() => setHoveredStar(control.index)}
        on:mouseleave={() => clearHoveredStar(control.index)}
        on:focus={() => setHoveredStar(control.index)}
        on:blur={() => clearHoveredStar(control.index)}
        on:pointerdown={(event) => handleStarPointerDown(event, control.index)}
        on:click|stopPropagation={() => selectStar(control.index)}
      ></button>
    {/each}
  </div>

  <div
    class="pointer-events-auto absolute bottom-4 left-1/2 z-[6] flex w-[min(42rem,calc(100%_-_2rem))] -translate-x-1/2 flex-col gap-3 rounded-lg border border-cyan-100/20 bg-slate-950/72 px-4 py-3 text-slate-50 shadow-[0_0_1.4rem_rgba(8,145,178,0.24)] backdrop-blur-md"
    data-timeline-interactive
  >
    <div class="flex min-w-0 items-end justify-between gap-4 text-left font-mono uppercase tracking-[0.16em] text-slate-50">
      <div class="grid min-w-0 flex-1 gap-1">
        <div class="truncate text-[0.68rem] font-extrabold text-cyan-200">
          {activeEraSegment?.displayName ?? 'Unknown Era'}
        </div>
        <div class="truncate text-[0.66rem] font-bold text-slate-200/85">
          {activeTimelineEvent?.title ?? 'No timeline record'}
        </div>
      </div>
      <div class="grid shrink-0 gap-1 text-right">
        <div class="text-2xl font-black leading-none text-white sm:text-3xl">
          {#if activeTimelineEvent}
            Y{activeTimelineEvent.year}
          {:else}
            Y--
          {/if}
        </div>
        {#if activeEraSegment}
          <div class="text-[0.62rem] font-bold text-slate-200/76">
            Y{activeEraSegment.startYear} - Y{activeEraSegment.endYear}
          </div>
        {/if}
      </div>
    </div>

    <div
      bind:this={sliderTrack}
      role="slider"
      tabindex="0"
      aria-label="Timeline position"
      aria-orientation="horizontal"
      aria-valuemin="0"
      aria-valuemax={maxWheel}
      aria-valuenow={Math.round(input.wheel * 100) / 100}
      aria-valuetext={timelinePositionText}
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
          class:ring-2={activeEraSegment?.key === eraSegment.key}
          class:ring-white={activeEraSegment?.key === eraSegment.key}
          style={getEraMarkerStyle(eraSegment)}
          title={`${eraSegment.displayName}: Y${eraSegment.startYear} - Y${eraSegment.endYear}`}
          aria-hidden="true"
        ></div>
      {/each}
    </div>
  </div>

  {#if selectedScreen && selectedScreenView}
    <div class="home-intro-copy home-intro-copy--status" aria-live="polite">
      <div class="home-intro-copy__label">{selectedScreenView.kicker}</div>
      <div class="home-intro-copy__stat">{selectedScreenView.stat}</div>
    </div>

    <aside
      class="home-intro-copy home-intro-copy--feature"
      style="bottom: clamp(11rem, 22vh, 14rem)"
      aria-label={`Timeline event: ${selectedScreen.title}`}
      data-timeline-interactive
    >
      <div class="home-intro-copy__label">{selectedScreenView.kicker}</div>
      {#if selectedScreenView.stillSrc}
        <img
          class="aspect-video w-full rounded-md border border-white/15 object-cover shadow-[0_0.8rem_1.8rem_rgb(0_0_0_/_0.32)]"
          src={selectedScreenView.stillSrc}
          alt=""
          loading="lazy"
        />
      {/if}
      <h2>{selectedScreen.title}</h2>
      <p>{selectedScreen.description}</p>
      {#if selectedScreen.url}
        <a
          href={selectedScreen.url}
          class="home-intro-copy__button"
          data-sfx-hover="portal-hover"
          data-sfx-click="portal-activate"
        >
          Open Record
        </a>
      {/if}
    </aside>
  {/if}
</div>
