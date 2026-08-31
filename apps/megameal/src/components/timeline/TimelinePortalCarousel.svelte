<script lang="ts">
import {
  type AdaptiveCanvasDprController,
  createAdaptiveCanvasDprController,
} from '@/utils/adaptiveCanvasDpr'
import { formatTimelineYear } from '@merkin/shared-content'
import { Canvas } from '@threlte/core'
import { onDestroy, onMount, tick } from 'svelte'
import * as THREE from 'three'
import TimelineAutoplayButton from './TimelineAutoplayButton.svelte'
import TimelineBackgroundMedia from './TimelineBackgroundMedia.svelte'
import TimelineCameraPanControls from './TimelineCameraPanControls.svelte'
import TimelineConstellationOverlay from './TimelineConstellationOverlay.svelte'
import TimelinePortalCarouselScene from './TimelinePortalCarouselScene.svelte'
import TimelinePositionSlider from './TimelinePositionSlider.svelte'
import TimelineSelectedRecord from './TimelineSelectedRecord.svelte'
import TimelineViewModeButton from './TimelineViewModeButton.svelte'
import {
  type TimelineCarouselInput,
  type TimelinePortalEraConfig,
  type TimelinePortalEvent,
  advanceTimelineAutoplay,
  clamp,
  createTimelinePortalModel,
  getActiveTimelineEraSegment,
  getSelectedCardWidth,
  getStatusWidth,
  getTimelineDockWidth,
  getTimelineRecordHref,
  getTimelineSideMargin,
} from './timelinePortalCarouselModel'
import {
  getDesktopSelectedCardStyle,
  getSelectedTimelineGuideLine,
  getTimelineMaxCanvasDpr,
  getTimelineSelectedCardAnchor,
  getTimelineStarControlStyle,
  getVisibleTimelineConstellationLines,
  applyTimelineCameraDrag,
  createTimelineCameraController,
  isTimelineInteractiveTarget,
  isPointInsideTimelineShell,
  isTimelineShellVisible,
  setTimelineMapZoom,
  type TimelineStarScreenPosition,
  updateTimelinePointer,
} from './timelinePortalPresentation'

export let events: TimelinePortalEvent[] = []
export let eraConfig: TimelinePortalEraConfig = {}

type TimelineViewMode = 'travel' | 'map'

type TimelineStarPositionEvent = CustomEvent<{
  positions: TimelineStarScreenPosition[]
}>

export let initialViewMode: TimelineViewMode = 'travel'
export let presentation: 'full' | 'banner' = 'full'

let shell: HTMLDivElement | null = null
let timelineBackgroundMedia: TimelineBackgroundMedia | null = null
let panPointerId: number | null = null
let lastPanClientX = 0
let lastPanClientY = 0
let panStartClientX = 0
let panStartClientY = 0
let hasDraggedScenePan = false
let lastTouchCenterY: number | null = null
let lastTouchPanClientX: number | null = null
let lastTouchPanClientY: number | null = null
let virtualWheel = 0
let wheelVelocity = 0
let scrollFrame = 0
let lastScrollFrameAt = 0
let selectedScreenIndex = -1
let hoveredStarIndex = -1
let portraitMobile = false
let viewportWidth = 1440
let viewportHeight = 900
let canvasDpr = 1
let adaptiveDprController: AdaptiveCanvasDprController | null = null
let projectedStarPositions: TimelineStarScreenPosition[] = []
let selectedCardAnchor: { x: number; y: number } | null = null
let selectedGuideLineFrame = 0
let hasInitializedBeginningPosition = false
let hasMounted = false
let isAutoplaying = false
let isAutoplayStopping = false
let autoplayFrame = 0
let lastAutoplayFrameAt = 0
let autoplayDirection: -1 | 1 = 1
let autoplayVelocity = 0
let prefersReducedMotion = false
let runtimeActive = true
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
const mapZoomMin = 0.55
const mapZoomMax = 2.8
const mapZoomStep = 1.16
const mapOrbitLimit = 1
const mapKeyboardOrbitStep = 0.18
const autoplaySpeed = 0.34
const autoplayTurnMinSpeedScale = 0.14
const autoplayVelocityEase = 2.4
const autoplayStopVelocityThreshold = 0.006
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
  mapZoom: 1,
  mapOrbitX: 0,
  mapOrbitY: 0,
  active: false,
}
let viewMode: TimelineViewMode = initialViewMode

const timelineCameraController = createTimelineCameraController({
  input,
  isMapMode: () => isMapMode,
  pause: () => pauseAutoplay(),
  panStep: cameraPanStep,
  panLimit: cameraPanLimit,
  minimumMapZoom: mapZoomMin,
  maximumMapZoom: mapZoomMax,
  mapZoomStep,
  mapOrbitLimit,
  mapOrbitStep: mapKeyboardOrbitStep,
})

$: timelineModel = createTimelinePortalModel(events, eraConfig)
$: sortedEvents = timelineModel.events
$: screens = timelineModel.screens
$: eraSegments = timelineModel.eraSegments
$: maxWheel = Math.max(0, screens.length - 1)
$: displayedScreenIndex = selectedScreenIndex >= 0 || isMapMode ? selectedScreenIndex : Math.round(clamp(input.wheel, 0, maxWheel))
$: selectedScreen = displayedScreenIndex >= 0 ? sortedEvents[displayedScreenIndex] : null
$: selectedScreenView = displayedScreenIndex >= 0 ? screens[displayedScreenIndex] : null
$: activeTimelineEvent = sortedEvents[Math.round(clamp(input.wheel, 0, maxWheel))] ?? null
$: activeEraSegment = getActiveTimelineEraSegment(input.wheel, eraSegments)
$: timelineDockWidth = getTimelineDockWidth(viewportWidth)
$: timelineSideLaneWidth = Math.max(0, (viewportWidth - timelineDockWidth) / 2)
$: timelineSideMargin = getTimelineSideMargin(viewportWidth)
$: selectedCardWidth = getSelectedCardWidth(timelineSideLaneWidth, timelineSideMargin)
$: selectedStatusWidth = getStatusWidth(timelineSideLaneWidth)
$: timelineDockStyle = portraitMobile
  ? `bottom: max(0.75rem, calc(env(safe-area-inset-bottom) + 0.75rem)); width: ${timelineDockWidth}px`
  : `width: ${timelineDockWidth}px`
$: selectedStarPosition = displayedScreenIndex >= 0
  ? projectedStarPositions.find(position => position.index === displayedScreenIndex && position.size > 0) ?? null
  : null
$: selectedCardStyle = portraitMobile
  ? 'bottom: max(7.65rem, calc(env(safe-area-inset-bottom) + 7.65rem)); width: min(24rem, calc(100% - 1.5rem)); max-width: calc(100% - 1.5rem)'
  : getDesktopSelectedCardStyle(selectedStarPosition, selectedCardWidth, viewportHeight)
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
$: constellationLines = getVisibleTimelineConstellationLines(
  constellationControls,
  displayedScreenIndex,
)
$: selectedGuideLine = getSelectedTimelineGuideLine(
  selectedCardAnchor,
  displayedScreenIndex,
  projectedStarPositions,
  screens,
)
$: timelinePositionText = activeTimelineEvent
  ? `${formatTimelineYear(activeTimelineEvent.year)} / ${activeEraSegment?.displayName ?? 'Unknown Era'}`
  : 'Timeline position'
$: isMapMode = viewMode === 'map'
$: isBannerPresentation = presentation === 'banner'
$: viewModeLabel = isMapMode ? 'Complete overview' : 'First-person chronology'
$: viewModeInstructions = isMapMode ? 'Select a star to inspect an article. Drag to rotate, scroll to zoom; use the arrow controls to pan.' : 'Travel from the beginning. Scroll, drag, or use the slider to move through time.'
$: if (!hasInitializedBeginningPosition && screens.length > 0) {
  initializeBeginningPosition()
}
$: if (isMapMode) pauseAutoplay()

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
  viewportHeight = window.innerHeight
  portraitMobile = window.innerWidth <= 760 && window.innerHeight > window.innerWidth
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

function updateScrollDrivenWheel() {
  input.wheel = clamp(virtualWheel, 0, maxWheel)
}

function runScrollDrivenWheelFrame(timestamp: number) {
  const minimumFrameInterval = 1000 / (portraitMobile ? 24 : 40)
  if (lastScrollFrameAt && timestamp - lastScrollFrameAt < minimumFrameInterval) {
    scrollFrame = window.requestAnimationFrame(runScrollDrivenWheelFrame)
    return
  }

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

function runAutoplayFrame(timestamp: number) {
  if (!isAutoplaying && !isAutoplayStopping) {
    autoplayFrame = 0
    lastAutoplayFrameAt = 0
    autoplayVelocity = 0
    return
  }

  const minimumFrameInterval = 1000 / (portraitMobile ? 20 : 30)
  if (lastAutoplayFrameAt && timestamp - lastAutoplayFrameAt < minimumFrameInterval) {
    autoplayFrame = window.requestAnimationFrame(runAutoplayFrame)
    return
  }

  const delta = lastAutoplayFrameAt
    ? Math.min(0.08, (timestamp - lastAutoplayFrameAt) / 1000)
    : 1 / 60
  lastAutoplayFrameAt = timestamp

  wheelVelocity = 0
  const nextState = advanceTimelineAutoplay({
    position: virtualWheel,
    maxPosition: maxWheel,
    direction: autoplayDirection,
    velocity: autoplayVelocity,
    delta,
    stopping: isAutoplayStopping,
    speed: autoplaySpeed,
    minimumEdgeSpeedScale: autoplayTurnMinSpeedScale,
    velocityEaseRate: autoplayVelocityEase,
  })
  virtualWheel = nextState.position
  autoplayDirection = nextState.direction
  autoplayVelocity = nextState.velocity

  if (isAutoplayStopping && Math.abs(autoplayVelocity) <= autoplayStopVelocityThreshold) {
    isAutoplayStopping = false
    autoplayVelocity = 0
    autoplayFrame = 0
    lastAutoplayFrameAt = 0
    updateScrollDrivenWheel()
    return
  }

  updateScrollDrivenWheel()

  autoplayFrame = window.requestAnimationFrame(runAutoplayFrame)
}

function playAutoplay() {
  if (isMapMode || isAutoplaying || maxWheel <= 0) return
  if (virtualWheel >= maxWheel) autoplayDirection = -1
  if (virtualWheel <= 0) autoplayDirection = 1

  isAutoplaying = true
  isAutoplayStopping = false
  wheelVelocity = 0
  if (!autoplayFrame) autoplayVelocity = 0
  lastAutoplayFrameAt = 0
  if (!autoplayFrame) autoplayFrame = window.requestAnimationFrame(runAutoplayFrame)
}

function pauseAutoplay({ smooth = false } = {}) {
  if (smooth && autoplayFrame && Math.abs(autoplayVelocity) > autoplayStopVelocityThreshold) {
    isAutoplaying = false
    isAutoplayStopping = true
    return
  }

  isAutoplaying = false
  isAutoplayStopping = false
  autoplayVelocity = 0
  lastAutoplayFrameAt = 0
  if (autoplayFrame) {
    window.cancelAnimationFrame(autoplayFrame)
    autoplayFrame = 0
  }
}

function toggleAutoplay() {
  if (isAutoplaying) {
    pauseAutoplay({ smooth: true })
    return
  }

  timelineBackgroundMedia?.start()
  playAutoplay()
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

function handleScenePointerDown(event: PointerEvent) {
  timelineBackgroundMedia?.start()
  if (
    !shell ||
    event.button !== 0 ||
    !event.isPrimary ||
    isTimelineInteractiveTarget(event.target)
  ) return

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
  updateTimelinePointer(input, shell, event.clientX, event.clientY)
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
  updateTimelinePointer(input, shell, event.clientX, event.clientY)
  pauseAutoplay()
  applyTimelineCameraDrag(
    input,
    shell,
    deltaX,
    deltaY,
    isMapMode,
    cameraPanLimit,
    mapOrbitLimit,
  )
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
  updateTimelinePointer(input, shell, event.clientX, event.clientY)
}

function handleTouchStart(event: TouchEvent) {
  timelineBackgroundMedia?.start()
  if (isTimelineInteractiveTarget(event.target)) return
  if (isBannerPresentation && event.touches.length < 2) return handleTouchEnd()
  if (isMapMode && event.touches.length === 1) {
    const touch = event.touches[0]
    if (!isPointInsideTimelineShell(shell, touch.clientX, touch.clientY)) return

    lastTouchCenterY = null
    lastTouchPanClientX = touch.clientX
    lastTouchPanClientY = touch.clientY
    input.active = true
    wheelVelocity = 0
    updateTimelinePointer(input, shell, touch.clientX, touch.clientY)
    return
  }

  if (event.touches.length < 2) {
    lastTouchCenterY = null
    lastTouchPanClientX = null
    lastTouchPanClientY = null
    input.active = false
    return
  }

  const [touchA, touchB] = Array.from(event.touches)
  if (
    !isPointInsideTimelineShell(shell, touchA.clientX, touchA.clientY) &&
    !isPointInsideTimelineShell(shell, touchB.clientX, touchB.clientY)
  ) return

  lastTouchCenterY = (touchA.clientY + touchB.clientY) / 2
  lastTouchPanClientX = null
  lastTouchPanClientY = null
  input.active = true
  wheelVelocity = 0
  updateTimelinePointer(input, shell, (touchA.clientX + touchB.clientX) / 2, lastTouchCenterY)
}

function handleTouchMove(event: TouchEvent) {
  if (
    isMapMode &&
    event.touches.length === 1 &&
    lastTouchPanClientX !== null &&
    lastTouchPanClientY !== null
  ) {
    event.preventDefault()
    const touch = event.touches[0]
    const deltaX = touch.clientX - lastTouchPanClientX
    const deltaY = touch.clientY - lastTouchPanClientY
    lastTouchPanClientX = touch.clientX
    lastTouchPanClientY = touch.clientY
    updateTimelinePointer(input, shell, touch.clientX, touch.clientY)
    pauseAutoplay()
    applyTimelineCameraDrag(
      input,
      shell,
      deltaX,
      deltaY,
      isMapMode,
      cameraPanLimit,
      mapOrbitLimit,
    )
    return
  }

  if (event.touches.length < 2 || lastTouchCenterY === null) return

  event.preventDefault()
  const [touchA, touchB] = Array.from(event.touches)
  const touchCenterX = (touchA.clientX + touchB.clientX) / 2
  const touchCenterY = (touchA.clientY + touchB.clientY) / 2
  const deltaY = (touchCenterY - lastTouchCenterY) * 2.15
  const touchWheelDistance = Math.max(220, Math.min(window.innerHeight * 0.46, 360))
  updateTimelinePointer(input, shell, touchCenterX, touchCenterY)
  if (isMapMode) {
    setTimelineMapZoom(
      input,
      input.mapZoom * Math.exp(-deltaY * 0.0026),
      mapZoomMin,
      mapZoomMax,
    )
  } else {
    applyPositionDelta(deltaY, touchWheelDistance)
  }
  lastTouchCenterY = touchCenterY
}

function handleTouchEnd() {
  input.active = false
  lastTouchCenterY = null
  lastTouchPanClientX = null
  lastTouchPanClientY = null
}

function handleWheel(event: WheelEvent) {
  if (
    isBannerPresentation ||
    !shell ||
    (!isPointInsideTimelineShell(shell, event.clientX, event.clientY) &&
      !isTimelineShellVisible(shell))
  ) return

  timelineBackgroundMedia?.start()
  pauseAutoplay()
  event.preventDefault()
  updateTimelinePointer(input, shell, event.clientX, event.clientY)
  if (isMapMode) {
    setTimelineMapZoom(
      input,
      input.mapZoom * Math.exp(-event.deltaY * 0.0018),
      mapZoomMin,
      mapZoomMax,
    )
    return
  }

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
    isBannerPresentation ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey ||
    isTimelineInteractiveTarget(event.target) ||
    !isTimelineShellVisible(shell)
  ) {
    return
  }

  if (isMapMode) {
    if (timelineCameraController.handleKey(event)) event.preventDefault()
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

  timelineBackgroundMedia?.start()

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
  scheduleSelectedGuideLineSync()
}

function initializeBeginningPosition() {
  virtualWheel = 0
  input.wheel = 0
  hasInitializedBeginningPosition = true
  autoplayDirection = 1
}

function setViewMode(nextViewMode: TimelineViewMode) {
  if (viewMode === nextViewMode) return

  pauseAutoplay()
  viewMode = nextViewMode
  input.panX = 0
  input.panY = 0
  input.mapZoom = 1
  input.mapOrbitX = 0
  input.mapOrbitY = 0
  projectedStarPositions = []
  selectedCardAnchor = null
  if (nextViewMode === 'travel' && !prefersReducedMotion) void tick().then(() => playAutoplay())
}

function handleStarPositions(event: TimelineStarPositionEvent) {
  projectedStarPositions = event.detail.positions
  if (displayedScreenIndex >= 0) scheduleSelectedGuideLineSync()
}

function syncSelectedGuideLineAnchor() {
  selectedCardAnchor = getTimelineSelectedCardAnchor(
    shell,
    displayedScreenIndex,
    projectedStarPositions,
  )
}

function scheduleSelectedGuideLineSync() {
  if (!hasMounted || selectedGuideLineFrame) return

  selectedGuideLineFrame = window.requestAnimationFrame(() => {
    selectedGuideLineFrame = 0
    syncSelectedGuideLineAnchor()
  })
}

function selectStar(index: number) {
  pauseAutoplay({ smooth: true })
  selectedScreenIndex = index
  void tick().then(scheduleSelectedGuideLineSync)
}

function clearSelectedStar() {
  selectedScreenIndex = -1
  hoveredStarIndex = -1
  selectedCardAnchor = null
}

function handleStarPointerDown(event: PointerEvent, index: number) {
  event.stopPropagation()
  if (event.pointerType !== 'mouse' || event.button === 0) setHoveredStar(index)
}

function openTimelineRecord(index: number) {
  const url = sortedEvents[index]?.url
  if (!url || typeof window === 'undefined') return

  window.location.href = getTimelineRecordHref(url)
}

function handleStarClick(event: MouseEvent, index: number) {
  event.preventDefault()
  event.stopPropagation()

  if (selectedScreenIndex === index) {
    pauseAutoplay()
    openTimelineRecord(index)
    return
  }

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

onMount(() => {
  hasMounted = true
  syncViewportMode()
  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  let resumeAutoplayWhenActive = false

  function isRuntimeActive() {
    return document.visibilityState === 'visible' && runtimeActive
  }

  function applyMotionPreference() {
    prefersReducedMotion = reducedMotionQuery.matches
    if (prefersReducedMotion) pauseAutoplay()
    else if (isRuntimeActive()) resumeRuntime()
  }

  function suspendRuntime() {
    resumeAutoplayWhenActive ||= isAutoplaying || isAutoplayStopping
    pauseAutoplay()
    adaptiveDprController?.stop()
  }

  function resumeRuntime() {
    adaptiveDprController?.start()
    if (resumeAutoplayWhenActive && !prefersReducedMotion) {
      resumeAutoplayWhenActive = false
      playAutoplay()
    }
  }

  function syncRuntimeActivity() {
    if (isRuntimeActive()) resumeRuntime()
    else suspendRuntime()
  }

  const runtimeObserver = new IntersectionObserver(entries => {
    runtimeActive = entries.some(entry => entry.isIntersecting)
    syncRuntimeActivity()
  })
  if (shell) runtimeObserver.observe(shell)
  reducedMotionQuery.addEventListener('change', applyMotionPreference)
  document.addEventListener('visibilitychange', syncRuntimeActivity)
  adaptiveDprController = createAdaptiveCanvasDprController({
    getMaxDpr: getTimelineMaxCanvasDpr,
    initialDpr: 1.5,
    setDpr: setCanvasDpr,
  })
  adaptiveDprController.start()
  applyMotionPreference()
  updateScrollDrivenWheel()
  if (!prefersReducedMotion && !isMapMode) playAutoplay()
  if (shell) shell.dataset.timelineInitialized = 'true'

  window.addEventListener('pointermove', handlePointerMove)
  window.addEventListener('touchstart', handleTouchStart, { passive: false })
  window.addEventListener('touchmove', handleTouchMove, { passive: false })
  window.addEventListener('touchend', handleTouchEnd)
  window.addEventListener('touchcancel', handleTouchEnd)
  window.addEventListener('wheel', handleWheel, { passive: false })
  window.addEventListener('keydown', handleKeyboardScroll)
  window.addEventListener('resize', handleResize)

  return () => {
    runtimeObserver.disconnect()
    reducedMotionQuery.removeEventListener('change', applyMotionPreference)
    document.removeEventListener('visibilitychange', syncRuntimeActivity)
    window.removeEventListener('pointermove', handlePointerMove)
    window.removeEventListener('touchstart', handleTouchStart)
    window.removeEventListener('touchmove', handleTouchMove)
    window.removeEventListener('touchend', handleTouchEnd)
    window.removeEventListener('touchcancel', handleTouchEnd)
    window.removeEventListener('wheel', handleWheel)
    window.removeEventListener('keydown', handleKeyboardScroll)
    window.removeEventListener('resize', handleResize)
    if (scrollFrame) window.cancelAnimationFrame(scrollFrame)
    if (selectedGuideLineFrame) window.cancelAnimationFrame(selectedGuideLineFrame)
    selectedGuideLineFrame = 0
    adaptiveDprController?.stop()
    adaptiveDprController = null
    pauseAutoplay()
    hasMounted = false
  }
})

onDestroy(() => {
  input.active = false
  lastTouchCenterY = null
  panPointerId = null
  if (scrollFrame) window.cancelAnimationFrame(scrollFrame)
  if (selectedGuideLineFrame) window.cancelAnimationFrame(selectedGuideLineFrame)
  selectedGuideLineFrame = 0
  adaptiveDprController?.stop()
  adaptiveDprController = null
  pauseAutoplay()
})
</script>

<div
  bind:this={shell}
  class={`home-intro-environment home-intro-environment--background-ready pointer-events-auto cursor-grab ${isBannerPresentation ? 'touch-pan-y' : 'touch-none'}`}
  class:home-intro-environment--screen-hover={displayedScreenIndex >= 0}
  class:cursor-grabbing={panPointerId !== null}
  style="--portal-reveal-progress: 1"
  class:h-full={isBannerPresentation}
  class:w-full={isBannerPresentation}
  role="region"
  aria-label={`MEGAMEAL timeline — ${viewModeLabel}`}
  data-timeline-shell="true"
  data-timeline-view-mode={viewMode}
  data-timeline-presentation={presentation}
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
      selectedScreenIndex={displayedScreenIndex}
      hoveredScreenIndex={hoveredStarIndex}
      {viewMode} ambientOrbitEnabled={!prefersReducedMotion && runtimeActive}
      on:starpositions={handleStarPositions}
    />
  </Canvas>

  <TimelineBackgroundMedia
    bind:this={timelineBackgroundMedia}
    videoSrc={timelineBackgroundVideoSrc}
    posterSrc={timelineBackgroundPosterSrc}
    playbackRate={timelineBackgroundVideoPlaybackRate}
  />

  <div
    class={`pointer-events-auto absolute inset-0 z-[3] cursor-grab ${isBannerPresentation ? 'touch-pan-y' : 'touch-none'}`}
    class:cursor-grabbing={panPointerId !== null}
    aria-hidden="true"
  ></div>

  <TimelineConstellationOverlay lines={constellationLines} guideLine={selectedGuideLine} isOverview={isMapMode} />

  <div
    class="pointer-events-none absolute left-4 top-4 z-[6] hidden max-w-sm rounded-lg border border-cyan-100/15 bg-slate-950/70 px-4 py-3 font-mono text-slate-100 shadow-[0_0_1.4rem_rgba(8,145,178,0.14)] backdrop-blur-md md:block"
    data-timeline-navigator-heading
  >
    <div class="text-[0.65rem] font-black uppercase tracking-[0.18em] text-cyan-200">
      {screens.length} destinations · {viewModeLabel}
    </div>
    <p class="mt-1 text-xs leading-relaxed text-slate-300">{viewModeInstructions}</p>
    {#if isBannerPresentation}
      <a
        href="/timeline/"
        class="pointer-events-auto mt-2 inline-flex text-[0.65rem] font-black uppercase tracking-[0.14em] text-cyan-200 underline decoration-cyan-400/40 underline-offset-4 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200"
        data-timeline-interactive
      >Open full timeline</a>
    {/if}
  </div>

  <div class="pointer-events-none absolute inset-0 z-[5]" data-timeline-interactive>
    {#each visibleStarControls as control (control.index)}
      <button
        type="button"
        class="pointer-events-auto absolute cursor-pointer rounded-full border-0 bg-transparent p-0 opacity-0 focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-200"
        style={getTimelineStarControlStyle(control)}
        aria-label={`${selectedScreenIndex === control.index ? 'Open' : 'Select'} timeline record: ${control.screen.title}`}
        title={control.screen.title}
        data-timeline-interactive
        data-timeline-star-control
        on:mouseenter={() => setHoveredStar(control.index)}
        on:mouseleave={() => clearHoveredStar(control.index)}
        on:focus={() => setHoveredStar(control.index)}
        on:blur={() => clearHoveredStar(control.index)}
        on:pointerdown={(event) => handleStarPointerDown(event, control.index)}
        on:click={(event) => handleStarClick(event, control.index)}
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
          {formatTimelineYear(activeTimelineEvent.year)}
        {:else}
          {formatTimelineYear(undefined)}
        {/if}
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
          on:pan={(event) => timelineCameraController.pan(event.detail.x, event.detail.y)}
          on:zoom={(event) => timelineCameraController.zoom(event.detail.multiplier)}
          on:orbit={(event) => timelineCameraController.orbit(event.detail.x, event.detail.y)}
          on:reset={timelineCameraController.reset}
        />

        <TimelineViewModeButton {viewMode} on:change={(event) => setViewMode(event.detail)} />

        {#if !isMapMode}
          <TimelineAutoplayButton {isAutoplaying} on:click={toggleAutoplay} />
        {/if}
      </div>
    </div>

    <div class="flex min-w-0 items-center justify-center gap-2 md:hidden">
      <TimelineCameraPanControls
        step={cameraPanStep}
        showMapControls={isMapMode}
        on:pan={(event) => timelineCameraController.pan(event.detail.x, event.detail.y)}
        on:zoom={(event) => timelineCameraController.zoom(event.detail.multiplier)}
        on:orbit={(event) => timelineCameraController.orbit(event.detail.x, event.detail.y)}
        on:reset={timelineCameraController.reset}
      />

      <TimelineViewModeButton {viewMode} on:change={(event) => setViewMode(event.detail)} />

      {#if !isMapMode}
        <TimelineAutoplayButton {isAutoplaying} on:click={toggleAutoplay} />
      {/if}
    </div>

    <TimelinePositionSlider
      {maxWheel}
      value={input.wheel}
      valueText={timelinePositionText}
      keyboardStep={keyboardWheelStep}
      pageStep={pageWheelStep}
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
