<script lang="ts">
import {
  type AdaptiveCanvasDprController,
  createAdaptiveCanvasDprController,
} from '@/utils/adaptiveCanvasDpr'
import { formatTimelineYear } from '@merkin/shared-content'
import { Canvas } from '@threlte/core'
import { onDestroy, onMount, tick } from 'svelte'
import TimelineBackgroundMedia from './TimelineBackgroundMedia.svelte'
import TimelineConstellationOverlay from './TimelineConstellationOverlay.svelte'
import TimelineFlightHud from './TimelineFlightHud.svelte'
import TimelinePortalNavigation from './TimelinePortalNavigation.svelte'
import TimelinePortalCarouselScene from './TimelinePortalCarouselScene.svelte'
import TimelineSelectedRecord from './TimelineSelectedRecord.svelte'
import {
  type TimelineCarouselInput,
  type TimelinePortalEraConfig,
  type TimelinePortalEvent,
  clamp,
  createTimelinePortalModel,
  getActiveTimelineEraSegment,
  getEraMarkerColor,
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
  createTimelineRenderer,
  createTimelineCameraController,
  isTimelineInteractiveTarget,
  isPointInsideTimelineShell,
  isTimelineShellVisible,
  setTimelineMapZoom,
  type TimelineStarScreenPosition,
  updateTimelinePointer,
} from './timelinePortalPresentation'
import {
  TIMELINE_CAROUSEL_CONSTANTS,
  TIMELINE_KEY_WHEEL_STEPS,
  bindTimelineWindowEvents,
  createTimelineGestureController,
  getTimelineViewModeInstructions,
  stepTimelineWheelMomentum,
} from './timelinePortalCarouselHelpers'
import { createTimelineFlightController } from './timelinePortalFlight'

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
let isPanningScene = false
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
let prefersReducedMotion = false
let runtimeActive = true
const {
  wheelMomentumDecay,
  wheelMomentumMaxVelocity,
  mouseWheelSensitivity,
  mouseWheelMomentumImpulse,
  mouseWheelMomentumMaxVelocity,
  keyboardWheelStep,
  pageWheelStep,
  cameraPanStep,
  travelCameraPanLimit,
  mapCameraPanLimit,
  mapZoomMin,
  mapZoomMax,
  mapZoomStep,
  mapOrbitLimit,
  mapKeyboardOrbitStep,
  backgroundVideoSrc: timelineBackgroundVideoSrc,
  backgroundPosterSrc: timelineBackgroundPosterSrc,
  backgroundVideoPlaybackRate: timelineBackgroundVideoPlaybackRate,
} = TIMELINE_CAROUSEL_CONSTANTS
const manualBoostMultiplier = 2.15
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

const timelineFlight = createTimelineFlightController({
  getPosition: () => virtualWheel,
  setPosition: position => {
    virtualWheel = position
    updateScrollDrivenWheel()
  },
  getCameraPan: () => ({ x: input.panX, y: input.panY }),
  setCameraPan: (x, y) => {
    input.panX = clamp(x, -travelCameraPanLimit, travelCameraPanLimit)
    input.panY = clamp(y, -travelCameraPanLimit, travelCameraPanLimit)
  },
  getTargetScreenPosition: getAutopilotTargetScreenPosition,
  getMaxPosition: () => maxWheel,
  getIsMapMode: () => isMapMode,
  getIsPortraitMobile: () => portraitMobile,
  getPrefersReducedMotion: () => prefersReducedMotion,
  selectTarget: selectAutopilotTarget,
  startMedia: () => timelineBackgroundMedia?.start(),
})

const timelineCameraController = createTimelineCameraController({
  input,
  isMapMode: () => isMapMode,
  pause: () => pauseAutopilot({ preserveBoost: true }),
  panStep: cameraPanStep,
  getPanLimit: () => isMapMode ? mapCameraPanLimit : travelCameraPanLimit,
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
$: activeEraAccent = getEraMarkerColor(activeEraSegment?.key ?? 'unknown')
$: isBoosting = $timelineFlight.isBoosting
$: autopilotEnabled = $timelineFlight.autopilotEnabled
$: autopilotPhase = $timelineFlight.autopilotPhase
$: isAutopilotTraveling = autopilotEnabled && autopilotPhase === 'travel'
$: travelEffectStrength = isBoosting ? 1 : isAutopilotTraveling ? 0.58 : 0
$: visitedSlugSet = new Set($timelineFlight.visitedSlugs)
$: visitedScreenIndexes = sortedEvents.reduce<number[]>((indexes, event, index) => {
  if (visitedSlugSet.has(event.slug)) indexes.push(index)
  return indexes
}, [])
$: lockOnIndex = hoveredStarIndex >= 0
  ? hoveredStarIndex
  : selectedScreenIndex >= 0
    ? selectedScreenIndex
    : Math.round(clamp(input.wheel, 0, maxWheel))
$: lockOnEvent = sortedEvents[lockOnIndex] ?? null
$: lockOnScreen = screens[lockOnIndex] ?? null
$: lockOnPosition = projectedStarPositions.find(
  position => position.index === lockOnIndex && position.size > 0,
) ?? null
$: lockOnIsVisited = Boolean(lockOnEvent && visitedSlugSet.has(lockOnEvent.slug))
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
  ? ''
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
$: viewModeInstructions = getTimelineViewModeInstructions(
  isMapMode,
  autopilotEnabled,
)
$: if (!hasInitializedBeginningPosition && screens.length > 0) {
  initializeBeginningPosition()
}
$: if (isMapMode) pauseAutopilot()
$: if (
  hasMounted &&
  !isBannerPresentation &&
  activeEraSegment?.key &&
  activeEraSegment.key !== $timelineFlight.activeEraKey
) {
  timelineFlight.enterEra(activeEraSegment.key, activeEraSegment.displayName)
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

  const stepped = stepTimelineWheelMomentum({
    virtualWheel,
    wheelVelocity,
    maxWheel,
    delta,
  })
  virtualWheel = stepped.virtualWheel
  wheelVelocity = stepped.wheelVelocity

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

function pauseAutopilot({ preserveBoost = false } = {}) {
  timelineFlight.pauseAutopilot({ preserveBoost })
}

function toggleBoost() {
  if (!isBannerPresentation) timelineFlight.toggleBoost()
}

function toggleAutopilot() {
  if (isBannerPresentation) return
  timelineFlight.toggleAutopilot(selectedScreenIndex)
}

function applyPositionDelta(deltaY: number, wheelDistance: number) {
  pauseAutopilot({ preserveBoost: true })
  const boostedDeltaY = deltaY * (isBoosting ? manualBoostMultiplier : 1)
  input.dragY += boostedDeltaY / Math.max(wheelDistance, 1)
  wheelVelocity = 0
  virtualWheel = clamp(
    virtualWheel - (boostedDeltaY / Math.max(wheelDistance, 1)) * 4.2,
    0,
    maxWheel,
  )
  scheduleScrollDrivenWheel()
}

const gestureController = createTimelineGestureController({
  input,
  getShell: () => shell,
  getIsMapMode: () => isMapMode,
  startMedia: () => timelineBackgroundMedia?.start(),
  pauseAutopilotPreserveBoost: () => pauseAutopilot({ preserveBoost: true }),
  resetWheelVelocity: () => {
    wheelVelocity = 0
  },
  applyPositionDelta,
  clearSelectedStar,
  onPanningChange: panning => {
    isPanningScene = panning
  },
})

function handleTouchStart(event: TouchEvent) {
  timelineBackgroundMedia?.start()
  if (isTimelineInteractiveTarget(event.target)) return
  if (isBannerPresentation && event.touches.length < 2) {
    return gestureController.handleTouchEnd()
  }
  gestureController.handleTouchStart(event)
}

function handleWheel(event: WheelEvent) {
  if (
    isBannerPresentation ||
    !shell ||
    (!isPointInsideTimelineShell(shell, event.clientX, event.clientY) &&
      !isTimelineShellVisible(shell))
  ) return

  timelineBackgroundMedia?.start()
  pauseAutopilot({ preserveBoost: true })
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
  const wheelDelta =
    -(event.deltaY / viewportHeight) *
    mouseWheelSensitivity *
    (isBoosting ? manualBoostMultiplier : 1)
  wheelVelocity = clamp(
    wheelVelocity + wheelDelta * mouseWheelMomentumImpulse,
    -mouseWheelMomentumMaxVelocity,
    mouseWheelMomentumMaxVelocity,
  )
  scheduleScrollDrivenWheel()
}

function handleKeyboardScroll(event: KeyboardEvent) {
  if (
    event.key === 'Shift' &&
    !isBannerPresentation &&
    !isMapMode &&
    !prefersReducedMotion &&
    !isTimelineInteractiveTarget(event.target) &&
    isTimelineShellVisible(shell)
  ) {
    timelineFlight.setBoostKeyHeld(true)
    return
  }

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

  const step = TIMELINE_KEY_WHEEL_STEPS[event.key]
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

  pauseAutopilot({ preserveBoost: true })
  const boostedStep = step * (isBoosting ? manualBoostMultiplier : 1)
  wheelVelocity = clamp(
    wheelVelocity + boostedStep * wheelMomentumDecay,
    -wheelMomentumMaxVelocity,
    wheelMomentumMaxVelocity,
  )
  scheduleScrollDrivenWheel()
  event.preventDefault()
}

function handleKeyboardUp(event: KeyboardEvent) {
  if (event.key === 'Shift') timelineFlight.setBoostKeyHeld(false)
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
}

function setViewMode(nextViewMode: TimelineViewMode) {
  if (viewMode === nextViewMode) return

  pauseAutopilot()
  viewMode = nextViewMode
  input.panX = 0
  input.panY = 0
  input.mapZoom = 1
  input.mapOrbitX = 0
  input.mapOrbitY = 0
  projectedStarPositions = []
  selectedCardAnchor = null
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

function selectAutopilotTarget(index: number) {
  selectedScreenIndex = index
  hoveredStarIndex = -1
  void tick().then(scheduleSelectedGuideLineSync)
}

function getAutopilotTargetScreenPosition(index: number) {
  const target = projectedStarPositions.find(position => position.index === index)
  return target
    ? { x: target.x, y: target.y, projectable: target.size > 0 }
    : null
}

function selectStar(index: number) {
  pauseAutopilot({ preserveBoost: true })
  selectAutopilotTarget(index)
}

function markTimelineRecordVisited(index: number) {
  const slug = sortedEvents[index]?.slug
  if (slug) timelineFlight.markVisited(slug)
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

  markTimelineRecordVisited(index)
  window.location.href = getTimelineRecordHref(url)
}

function handleStarClick(event: MouseEvent, index: number) {
  event.preventDefault()
  event.stopPropagation()

  if (selectedScreenIndex === index) {
    pauseAutopilot()
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
  pauseAutopilot({ preserveBoost: true })
  wheelVelocity = 0
  virtualWheel = clamp(value, 0, maxWheel)
  updateScrollDrivenWheel()
}

onMount(() => {
  hasMounted = true
  syncViewportMode()
  timelineFlight.loadVisitedProgress()
  timelineFlight.initializeEra(activeEraSegment?.key ?? '')
  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  let resumeAutopilotWhenActive = false

  function isRuntimeActive() {
    return document.visibilityState === 'visible' && runtimeActive
  }

  function applyMotionPreference() {
    prefersReducedMotion = reducedMotionQuery.matches
    if (prefersReducedMotion) {
      pauseAutopilot()
    }
    else if (isRuntimeActive()) resumeRuntime()
  }

  function suspendRuntime() {
    resumeAutopilotWhenActive ||= autopilotEnabled
    pauseAutopilot()
    adaptiveDprController?.stop()
  }

  function resumeRuntime() {
    adaptiveDprController?.start()
    if (resumeAutopilotWhenActive && !prefersReducedMotion) {
      resumeAutopilotWhenActive = false
      timelineFlight.enableAutopilot()
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
  if (!prefersReducedMotion && !isMapMode) timelineFlight.enableAutopilot()
  if (shell) shell.dataset.timelineInitialized = 'true'

  const unbindWindowEvents = bindTimelineWindowEvents({
    onPointerMove: gestureController.handlePointerMove,
    onTouchStart: handleTouchStart,
    onTouchMove: gestureController.handleTouchMove,
    onTouchEnd: gestureController.handleTouchEnd,
    onWheel: handleWheel,
    onKeyDown: handleKeyboardScroll,
    onKeyUp: handleKeyboardUp,
    onResize: handleResize,
  })

  return () => {
    runtimeObserver.disconnect()
    reducedMotionQuery.removeEventListener('change', applyMotionPreference)
    document.removeEventListener('visibilitychange', syncRuntimeActivity)
    unbindWindowEvents()
    if (scrollFrame) window.cancelAnimationFrame(scrollFrame)
    if (selectedGuideLineFrame) window.cancelAnimationFrame(selectedGuideLineFrame)
    selectedGuideLineFrame = 0
    adaptiveDprController?.stop()
    adaptiveDprController = null
    pauseAutopilot()
    hasMounted = false
  }
})

onDestroy(() => {
  gestureController.reset()
  if (scrollFrame) window.cancelAnimationFrame(scrollFrame)
  if (selectedGuideLineFrame) window.cancelAnimationFrame(selectedGuideLineFrame)
  selectedGuideLineFrame = 0
  adaptiveDprController?.stop()
  adaptiveDprController = null
  pauseAutopilot()
  timelineFlight.destroy()
})
</script>

<div
  bind:this={shell}
  class={`home-intro-environment home-intro-environment--background-ready pointer-events-auto cursor-grab ${isBannerPresentation ? 'touch-pan-y' : 'touch-none'}`}
  class:home-intro-environment--screen-hover={displayedScreenIndex >= 0}
  class:cursor-grabbing={isPanningScene}
  style={`--portal-reveal-progress: 1; --timeline-era-accent: ${activeEraAccent}`}
  class:h-full={isBannerPresentation}
  class:w-full={isBannerPresentation}
  role="region"
  aria-label={`MEGAMEAL timeline — ${viewModeLabel}`}
  data-timeline-shell="true"
  data-timeline-view-mode={viewMode}
  data-timeline-presentation={presentation}
  data-timeline-era={activeEraSegment?.key ?? 'unknown'}
  data-timeline-boosting={isBoosting ? 'true' : 'false'}
  data-timeline-autopilot-enabled={autopilotEnabled ? 'true' : 'false'}
  data-timeline-autopilot-phase={autopilotPhase}
  data-timeline-autopilot-target={$timelineFlight.autopilotTargetIndex}
  on:pointerdown|capture={gestureController.handleScenePointerDown}
  on:pointermove|capture={gestureController.handleScenePointerMove}
  on:pointerup|capture={gestureController.handleScenePointerUp}
  on:pointercancel|capture={gestureController.handleScenePointerUp}
>
  <div class="home-intro-background-curtain" aria-hidden="true"></div>

  <Canvas createRenderer={createTimelineRenderer} dpr={canvasDpr}>
    <TimelinePortalCarouselScene
      {input}
      {screens}
      selectedScreenIndex={displayedScreenIndex}
      hoveredScreenIndex={hoveredStarIndex}
      {viewMode}
      ambientOrbitEnabled={!prefersReducedMotion && runtimeActive}
      {visitedScreenIndexes}
      {travelEffectStrength}
      {autopilotPhase}
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
    class:cursor-grabbing={isPanningScene}
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
        data-timeline-index={control.index}
        data-timeline-visited={visitedSlugSet.has(sortedEvents[control.index]?.slug ?? '') ? 'true' : 'false'}
        on:mouseenter={() => setHoveredStar(control.index)}
        on:mouseleave={() => clearHoveredStar(control.index)}
        on:focus={() => setHoveredStar(control.index)}
        on:blur={() => clearHoveredStar(control.index)}
        on:pointerdown={(event) => handleStarPointerDown(event, control.index)}
        on:click={(event) => handleStarClick(event, control.index)}
      ></button>
      {/each}
  </div>

  <TimelinePortalNavigation
    {activeEraSegment}
    {activeTimelineEvent}
    {viewMode}
    {isMapMode}
    {autopilotEnabled}
    {autopilotPhase}
    {isBoosting}
    boostDisabled={prefersReducedMotion || (autopilotEnabled && !isAutopilotTraveling)}
    {timelineDockStyle}
    {cameraPanStep}
    {maxWheel}
    position={input.wheel}
    {timelinePositionText}
    {keyboardWheelStep}
    {pageWheelStep}
    on:pan={(event) => timelineCameraController.pan(event.detail.x, event.detail.y)}
    on:zoom={(event) => timelineCameraController.zoom(event.detail.multiplier)}
    on:orbit={(event) => timelineCameraController.orbit(event.detail.x, event.detail.y)}
    on:reset={timelineCameraController.reset}
    on:viewmode={(event) => setViewMode(event.detail)}
    on:autopilottoggle={toggleAutopilot}
    on:boosttoggle={toggleBoost}
    on:position={(event) => setTimelinePosition(event.detail)}
  />

  {#if !isBannerPresentation}
    <TimelineFlightHud
      lockEvent={lockOnEvent}
      lockScreen={lockOnScreen}
      lockPosition={lockOnPosition}
      lockIsVisited={lockOnIsVisited}
      {isBoosting}
      visitedCount={visitedScreenIndexes.length}
      totalCount={sortedEvents.length}
      eraName={activeEraSegment?.displayName ?? ''}
      eraTransitionName={$timelineFlight.eraTransitionName}
      eraTransitionSequence={$timelineFlight.eraTransitionSequence}
      eraTransitionVisible={$timelineFlight.eraTransitionVisible}
    />
  {/if}

  <TimelineSelectedRecord
    {selectedScreen}
    {selectedScreenView}
    {selectedCardStyle}
    {selectedStatusStyle}
    on:open={() => markTimelineRecordVisited(displayedScreenIndex)}
  />
</div>
