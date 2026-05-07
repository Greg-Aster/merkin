<script lang="ts">
import { Canvas } from '@threlte/core'
import { onDestroy, onMount } from 'svelte'
import * as THREE from 'three'
import {
  createAdaptiveCanvasDprController,
  type AdaptiveCanvasDprController,
} from '@/utils/adaptiveCanvasDpr'
import TimelineAutoplayButton from './TimelineAutoplayButton.svelte'
import TimelineCameraPanControls from './TimelineCameraPanControls.svelte'
import TimelineConstellationOverlay, {
  type TimelineConstellationLine,
} from './TimelineConstellationOverlay.svelte'
import TimelinePortalCarouselScene from './TimelinePortalCarouselScene.svelte'
import TimelinePositionSlider from './TimelinePositionSlider.svelte'
import TimelineSelectedRecord from './TimelineSelectedRecord.svelte'
import TimelineViewModeButton from './TimelineViewModeButton.svelte'
import {
  clamp,
  createTimelinePortalModel,
  getEraMarkerColor,
  getSelectedCardWidth,
  getStatusWidth,
  getTimelineDockWidth,
  getTimelineSideMargin,
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

let shell: HTMLDivElement | null = null
let panPointerId: number | null = null
let lastPanClientX = 0
let lastPanClientY = 0
let panStartClientX = 0
let panStartClientY = 0
let hasDraggedScenePan = false
let lastTouchCenterY: number | null = null
let virtualWheel = 0
let wheelVelocity = 0
let scrollFrame = 0
let lastScrollFrameAt = 0
let selectedScreenIndex = -1
let hoveredStarIndex = -1
let portraitMobile = false
let viewportWidth = 1440
let canvasDpr = 1
let adaptiveDprController: AdaptiveCanvasDprController | null = null
let projectedStarPositions: TimelineStarScreenPosition[] = []
let hasInitializedDefaultPosition = false
let hasMounted = false
let hasStartedInitialAutoplay = false
let isAutoplaying = false
let autoplayFrame = 0
let lastAutoplayFrameAt = 0
let nextAutoplaySelectionAt = 0
let autoplayDirection: -1 | 1 = 1
let autoplayVelocity = 0
const wheelMomentumDecay = 2.4
const wheelMomentumImpulse = 5.2
const wheelMomentumMaxVelocity = 4.8
const mouseWheelSensitivity = 1.15
const mouseWheelMomentumImpulse = 3.6
const mouseWheelMomentumMaxVelocity = 2.8
const keyboardWheelStep = 0.82
const pageWheelStep = 1.64
const clickAwayDragThreshold = 7
const cameraPanStep = 0.2
const cameraPanLimit = 1.18
const defaultTimelineEraKey = 'golden-age'
const autoplaySpeed = 0.34
const autoplayTurnMinSpeedScale = 0.14
const autoplayVelocityEase = 2.4
const autoplaySelectionIntervalMin = 2200
const autoplaySelectionIntervalRange = 1900
const timelineBackgroundVideoSrc = '/assets/banner/universbg0001-0121.webm'
const timelineBackgroundPosterSrc = '/assets/banner/posters/universe-poster.webp'
const timelineBackgroundVideoPlaybackRate = 0.25
const input: TimelineCarouselInput = {
  x: 0,
  y: 0,
  panX: 0,
  panY: 0,
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
$: timelineDockWidth = getTimelineDockWidth(viewportWidth)
$: timelineSideLaneWidth = Math.max(0, (viewportWidth - timelineDockWidth) / 2)
$: timelineSideMargin = getTimelineSideMargin(viewportWidth)
$: selectedCardWidth = getSelectedCardWidth(timelineSideLaneWidth, timelineSideMargin)
$: selectedStatusWidth = getStatusWidth(timelineSideLaneWidth)
$: timelineDockStyle = portraitMobile
  ? `bottom: max(0.75rem, calc(env(safe-area-inset-bottom) + 0.75rem)); width: ${timelineDockWidth}px`
  : `width: ${timelineDockWidth}px`
$: selectedCardStyle = portraitMobile
  ? 'bottom: max(7.65rem, calc(env(safe-area-inset-bottom) + 7.65rem)); width: min(24rem, calc(100% - 1.5rem)); max-width: calc(100% - 1.5rem)'
  : `bottom: 1rem; width: ${selectedCardWidth}px; max-width: calc(100% - 2rem)`
$: selectedStatusStyle = portraitMobile
  ? 'display: none'
  : `top: auto; bottom: 1rem; right: 1rem; width: ${selectedStatusWidth}px; min-width: 0; max-width: calc(100% - 2rem); text-align: right`
$: visibleStarControls = projectedStarPositions
  .map(position => ({ ...position, screen: screens[position.index] }))
  .filter(({ screen, visible }) => !!screen && visible)
  .sort((a, b) => a.size - b.size)
$: constellationControls = projectedStarPositions
  .map(position => ({ ...position, screen: screens[position.index] }))
  .filter(position => !!position.screen && position.size > 0)
$: constellationLines = getVisibleConstellationLines(constellationControls)
$: timelinePositionText = activeTimelineEvent
  ? `Y${activeTimelineEvent.year} / ${activeEraSegment?.displayName ?? 'Unknown Era'}`
  : 'Timeline position'
$: if (!hasInitializedDefaultPosition && screens.length > 0) {
  initializeDefaultTimelinePosition()
}

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
  viewportWidth = window.innerWidth
  portraitMobile = window.innerWidth <= 760 && window.innerHeight > window.innerWidth
}

function getTimelineMaxCanvasDpr() {
  if (typeof window === 'undefined') return 1

  const lowMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (lowMotion) return 1

  const compactViewport = window.innerWidth <= 760 || window.innerHeight <= 640
  const dprCap = compactViewport ? 1.5 : 2

  return Math.min(Math.max(1, window.devicePixelRatio || 1), dprCap)
}

function setCanvasDpr(nextDpr: number) {
  canvasDpr = nextDpr
}

function syncCanvasDpr() {
  if (typeof window === 'undefined') return

  if (adaptiveDprController) {
    adaptiveDprController.sync()
    return
  }

  setCanvasDpr(getTimelineMaxCanvasDpr())
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

function scheduleNextAutoplaySelection(timestamp: number) {
  nextAutoplaySelectionAt =
    timestamp + autoplaySelectionIntervalMin + Math.random() * autoplaySelectionIntervalRange
}

function selectRandomVisibleAutoplayStar(timestamp: number) {
  const selectableControls = visibleStarControls.filter(control => control.index !== selectedScreenIndex)
  const fallbackIndex = Math.round(clamp(input.wheel, 0, maxWheel))
  const selectedIndex =
    selectableControls.length > 0
      ? selectableControls[Math.floor(Math.random() * selectableControls.length)].index
      : fallbackIndex

  selectStar(selectedIndex, 'autoplay')
  scheduleNextAutoplaySelection(timestamp)
}

function getAutoplayTurnDistance() {
  return clamp(maxWheel * 0.1, 0.8, 2.4)
}

function getAutoplayEdgeSpeedScale() {
  if (maxWheel <= 0) return 1

  const edgeDistance = Math.min(virtualWheel, maxWheel - virtualWheel)
  const edgeRatio = clamp(edgeDistance / getAutoplayTurnDistance(), 0, 1)
  const smoothedRatio = edgeRatio * edgeRatio * (3 - 2 * edgeRatio)

  return autoplayTurnMinSpeedScale + smoothedRatio * (1 - autoplayTurnMinSpeedScale)
}

function runAutoplayFrame(timestamp: number) {
  if (!isAutoplaying) {
    autoplayFrame = 0
    lastAutoplayFrameAt = 0
    return
  }

  const delta = lastAutoplayFrameAt
    ? Math.min(0.08, (timestamp - lastAutoplayFrameAt) / 1000)
    : 1 / 60
  lastAutoplayFrameAt = timestamp

  wheelVelocity = 0
  const targetVelocity = autoplayDirection * autoplaySpeed * getAutoplayEdgeSpeedScale()
  const velocityEase = 1 - Math.exp(-delta * autoplayVelocityEase)
  autoplayVelocity += (targetVelocity - autoplayVelocity) * velocityEase

  const nextWheel = virtualWheel + autoplayVelocity * delta
  if (nextWheel >= maxWheel) {
    virtualWheel = maxWheel
    autoplayDirection = -1
    autoplayVelocity = 0
  } else if (nextWheel <= 0) {
    virtualWheel = 0
    autoplayDirection = 1
    autoplayVelocity = 0
  } else {
    virtualWheel = nextWheel
  }
  updateScrollDrivenWheel()

  if (timestamp >= nextAutoplaySelectionAt) {
    selectRandomVisibleAutoplayStar(timestamp)
  }

  autoplayFrame = window.requestAnimationFrame(runAutoplayFrame)
}

function playAutoplay() {
  if (isAutoplaying || maxWheel <= 0) return
  if (virtualWheel >= maxWheel) autoplayDirection = -1
  if (virtualWheel <= 0) autoplayDirection = 1

  isAutoplaying = true
  wheelVelocity = 0
  autoplayVelocity = 0
  lastAutoplayFrameAt = 0
  selectRandomVisibleAutoplayStar(performance.now())
  if (!autoplayFrame) autoplayFrame = window.requestAnimationFrame(runAutoplayFrame)
}

function pauseAutoplay() {
  isAutoplaying = false
  autoplayVelocity = 0
  lastAutoplayFrameAt = 0
  nextAutoplaySelectionAt = 0
  if (autoplayFrame) {
    window.cancelAnimationFrame(autoplayFrame)
    autoplayFrame = 0
  }
}

function toggleAutoplay() {
  if (isAutoplaying) {
    pauseAutoplay()
    return
  }

  playAutoplay()
}

function startInitialAutoplay() {
  if (hasStartedInitialAutoplay || !hasMounted || !hasInitializedDefaultPosition || maxWheel <= 0) return

  hasStartedInitialAutoplay = true
  playAutoplay()
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
  pauseAutoplay()
  input.dragY += deltaY / Math.max(wheelDistance, 1)
  wheelVelocity = 0
  virtualWheel = clamp(
    virtualWheel - (deltaY / Math.max(wheelDistance, 1)) * 4.2,
    0,
    maxWheel,
  )
  scheduleScrollDrivenWheel()
}

function setCameraPan(panX: number, panY: number) {
  input.panX = clamp(panX, -cameraPanLimit, cameraPanLimit)
  input.panY = clamp(panY, -cameraPanLimit, cameraPanLimit)
}

function panCameraBy(deltaX: number, deltaY: number) {
  pauseAutoplay()
  setCameraPan(input.panX + deltaX, input.panY + deltaY)
}

function resetCameraPan() {
  pauseAutoplay()
  setCameraPan(0, 0)
}

function applyCameraPanDrag(deltaX: number, deltaY: number) {
  if (!shell) return
  pauseAutoplay()

  const bounds = shell.getBoundingClientRect()
  const xDistance = Math.max(bounds.width, 1)
  const yDistance = Math.max(bounds.height, 1)

  setCameraPan(
    input.panX - (deltaX / xDistance) * 3.1,
    input.panY + (deltaY / yDistance) * 2.7,
  )
}

function handleScenePointerDown(event: PointerEvent) {
  if (!shell || event.button !== 0 || !event.isPrimary || isInteractiveTarget(event.target)) return

  pauseAutoplay()
  event.preventDefault()
  event.stopPropagation()
  panPointerId = event.pointerId
  lastPanClientX = event.clientX
  lastPanClientY = event.clientY
  panStartClientX = event.clientX
  panStartClientY = event.clientY
  hasDraggedScenePan = false
  input.active = true
  wheelVelocity = 0
  updatePointer(event.clientX, event.clientY)
  shell.setPointerCapture(event.pointerId)
}

function handleScenePointerMove(event: PointerEvent) {
  if (panPointerId !== event.pointerId) return

  event.preventDefault()
  event.stopPropagation()
  const deltaX = event.clientX - lastPanClientX
  const deltaY = event.clientY - lastPanClientY
  const totalDeltaX = event.clientX - panStartClientX
  const totalDeltaY = event.clientY - panStartClientY
  if (Math.hypot(totalDeltaX, totalDeltaY) >= clickAwayDragThreshold) {
    hasDraggedScenePan = true
  }
  lastPanClientX = event.clientX
  lastPanClientY = event.clientY
  updatePointer(event.clientX, event.clientY)
  applyCameraPanDrag(deltaX, deltaY)
}

function handleScenePointerUp(event: PointerEvent) {
  if (panPointerId !== event.pointerId) return

  try {
    shell?.releasePointerCapture(event.pointerId)
  } catch {
    // Pointer capture may already be released by the browser.
  }
  event.stopPropagation()
  if (!hasDraggedScenePan) clearSelectedStar()
  panPointerId = null
  hasDraggedScenePan = false
  input.active = false
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

  pauseAutoplay()
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

  pauseAutoplay()
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

function getDefaultTimelinePosition() {
  const preferredEra =
    eraSegments.find(segment => segment.key === defaultTimelineEraKey && segment.eventCount > 0) ??
    eraSegments.find(segment => segment.key === defaultTimelineEraKey)

  return clamp(preferredEra?.centerIndex ?? 0, 0, maxWheel)
}

function initializeDefaultTimelinePosition() {
  const defaultPosition = getDefaultTimelinePosition()
  virtualWheel = defaultPosition
  input.wheel = defaultPosition
  hasInitializedDefaultPosition = true
  autoplayDirection = defaultPosition >= maxWheel ? -1 : 1
  startInitialAutoplay()
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
          length: Math.hypot(nextControl.x - control.x, nextControl.y - control.y),
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

function selectStar(index: number, source: 'user' | 'autoplay' = 'user') {
  if (source === 'user') pauseAutoplay()
  selectedScreenIndex = index
}

function clearSelectedStar() {
  selectedScreenIndex = -1
  hoveredStarIndex = -1
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
  pauseAutoplay()
  wheelVelocity = 0
  virtualWheel = clamp(value, 0, maxWheel)
  updateScrollDrivenWheel()
}

function syncTimelineBackgroundVideoPlayback(event: Event) {
  const video = event.currentTarget
  if (video instanceof HTMLVideoElement) {
    video.playbackRate = timelineBackgroundVideoPlaybackRate
  }
}

onMount(() => {
  hasMounted = true
  syncViewportMode()
  adaptiveDprController = createAdaptiveCanvasDprController({
    getMaxDpr: getTimelineMaxCanvasDpr,
    initialDpr: 1.5,
    setDpr: setCanvasDpr,
  })
  adaptiveDprController.start()
  updateScrollDrivenWheel()
  startInitialAutoplay()
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
    adaptiveDprController?.stop()
    adaptiveDprController = null
    pauseAutoplay()
    hasMounted = false
    timelineMobileWrapper?.classList.remove('timeline-mobile-active')
    timelineMobileWrapper?.classList.add('timeline-mobile-inactive')
  }
})

onDestroy(() => {
  input.active = false
  lastTouchCenterY = null
  panPointerId = null
  if (scrollFrame) window.cancelAnimationFrame(scrollFrame)
  adaptiveDprController?.stop()
  adaptiveDprController = null
  pauseAutoplay()
})
</script>

<div
  bind:this={shell}
  class="home-intro-environment home-intro-environment--background-ready pointer-events-auto touch-none cursor-grab"
  class:home-intro-environment--screen-hover={selectedScreenIndex >= 0}
  class:cursor-grabbing={panPointerId !== null}
  style="--portal-reveal-progress: 1"
  data-timeline-shell="true"
  on:pointerdown|capture={handleScenePointerDown}
  on:pointermove|capture={handleScenePointerMove}
  on:pointerup|capture={handleScenePointerUp}
  on:pointercancel|capture={handleScenePointerUp}
>
  <div class="home-intro-background-curtain" aria-hidden="true"></div>

  <Canvas {createRenderer} dpr={canvasDpr}>
    <TimelinePortalCarouselScene
      {input}
      {screens}
      {selectedScreenIndex}
      hoveredScreenIndex={hoveredStarIndex}
      on:starpositions={handleStarPositions}
    />
  </Canvas>

  <div
    class="pointer-events-none absolute inset-0 z-0 overflow-hidden"
    data-timeline-background-video="universe"
    aria-hidden="true"
  >
    <video
      class="h-full w-full object-cover brightness-[0.88] saturate-[1.12]"
      src={timelineBackgroundVideoSrc}
      poster={timelineBackgroundPosterSrc}
      autoplay
      muted
      loop
      playsinline
      preload="metadata"
      on:loadedmetadata={syncTimelineBackgroundVideoPlayback}
      on:play={syncTimelineBackgroundVideoPlayback}
    ></video>
    <div class="absolute inset-0 bg-slate-950/20"></div>
  </div>

  <div
    class="pointer-events-auto absolute inset-0 z-[3] cursor-grab touch-none"
    class:cursor-grabbing={panPointerId !== null}
    aria-hidden="true"
  ></div>

  <TimelineConstellationOverlay lines={constellationLines} />

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

  <div class="timeline-mobile-readout pointer-events-none">
      <div class="timeline-mobile-readout__era truncate">
        {activeEraSegment?.displayName ?? 'Unknown Era'}
      </div>
      <div class="timeline-mobile-readout__title truncate">
        {activeTimelineEvent?.title ?? 'No timeline record'}
      </div>
      <div class="timeline-mobile-readout__year">
        {#if activeTimelineEvent}
          Y{activeTimelineEvent.year}
        {:else}
          Y--
        {/if}
      </div>
    </div>

  <div
    class="pointer-events-auto absolute bottom-4 left-1/2 z-[6] flex w-[min(42rem,calc(100%_-_2rem))] -translate-x-1/2 flex-col gap-2 rounded-lg border border-cyan-100/20 bg-slate-950/72 px-3 py-2.5 text-slate-50 shadow-[0_0_1.4rem_rgba(8,145,178,0.24)] backdrop-blur-md md:gap-3 md:px-4 md:py-3"
    style={timelineDockStyle}
    data-timeline-dock
    data-timeline-interactive
  >
    <div class="hidden min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 text-left font-mono uppercase tracking-[0.13em] text-slate-50 md:grid md:grid-cols-[minmax(0,1fr)_auto_auto] md:gap-3 md:tracking-[0.16em]">
      <div class="grid min-w-0 flex-1 gap-1">
        <div class="truncate text-[0.68rem] font-extrabold text-cyan-200">
          {activeEraSegment?.displayName ?? 'Unknown Era'}
        </div>
        <div class="truncate text-[0.66rem] font-bold text-slate-200/85">
          {activeTimelineEvent?.title ?? 'No timeline record'}
        </div>
      </div>

      <div class="col-span-2 flex min-w-0 items-center justify-center gap-2 md:col-span-1">
        <TimelineCameraPanControls
          step={cameraPanStep}
          on:pan={(event) => panCameraBy(event.detail.x, event.detail.y)}
          on:reset={resetCameraPan}
        />

        <TimelineViewModeButton on:click={pauseAutoplay} />

        <TimelineAutoplayButton {isAutoplaying} on:click={toggleAutoplay} />
      </div>

      <div class="col-start-2 row-start-1 grid min-w-0 shrink-0 gap-1 text-right md:col-start-auto md:row-start-auto">
        <div class="text-lg font-black leading-none text-white md:text-2xl lg:text-3xl">
          {#if activeTimelineEvent}
            Y{activeTimelineEvent.year}
          {:else}
            Y--
          {/if}
        </div>
        {#if activeEraSegment}
          <div class="max-w-[9rem] truncate text-[0.55rem] font-bold tracking-[0.12em] text-slate-200/76 md:max-w-none md:text-[0.62rem]">
            Y{activeEraSegment.startYear} - Y{activeEraSegment.endYear}
          </div>
        {/if}
      </div>
    </div>

    <div class="flex min-w-0 items-center justify-center gap-2 md:hidden">
      <TimelineCameraPanControls
        step={cameraPanStep}
        on:pan={(event) => panCameraBy(event.detail.x, event.detail.y)}
        on:reset={resetCameraPan}
      />

      <TimelineViewModeButton on:click={pauseAutoplay} />

      <TimelineAutoplayButton {isAutoplaying} on:click={toggleAutoplay} />
    </div>

    <TimelinePositionSlider
      {eraSegments}
      activeEraKey={activeEraSegment?.key}
      {maxWheel}
      value={input.wheel}
      valueText={timelinePositionText}
      keyboardStep={keyboardWheelStep}
      pageStep={pageWheelStep}
      {getEraMarkerStyle}
      on:positionchange={(event) => setTimelinePosition(event.detail.value)}
    />
  </div>

  <TimelineSelectedRecord
    {selectedScreen}
    {selectedScreenView}
    {selectedCardStyle}
    {selectedStatusStyle}
  />
</div>
