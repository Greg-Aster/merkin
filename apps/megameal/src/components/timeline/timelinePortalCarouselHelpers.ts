import { type TimelineCarouselInput, clamp } from './timelinePortalCarouselModel'
import {
  applyTimelineCameraDrag,
  isPointInsideTimelineShell,
  isTimelineInteractiveTarget,
  setTimelineMapZoom,
  updateTimelinePointer,
} from './timelinePortalPresentation'

export const TIMELINE_CAROUSEL_CONSTANTS = {
  wheelMomentumDecay: 2.4,
  wheelMomentumMaxVelocity: 4.8,
  mouseWheelSensitivity: 1.15,
  mouseWheelMomentumImpulse: 3.6,
  mouseWheelMomentumMaxVelocity: 2.8,
  keyboardWheelStep: 0.82,
  pageWheelStep: 1.64,
  clickAwayDragThreshold: 7,
  cameraPanStep: 0.2,
  travelCameraPanLimit: 6.2,
  mapCameraPanLimit: 1.18,
  mapZoomMin: 0.55,
  mapZoomMax: 2.8,
  mapZoomStep: 1.16,
  mapOrbitLimit: 1,
  mapKeyboardOrbitStep: 0.18,
  backgroundVideoSrc: '/assets/banner/universbg0001-0121.webm',
  backgroundPosterSrc: '/assets/banner/posters/universe-poster.webp',
  backgroundVideoPlaybackRate: 0.25,
} as const

export const TIMELINE_KEY_WHEEL_STEPS: Record<string, number | undefined> = {
  ArrowDown: TIMELINE_CAROUSEL_CONSTANTS.keyboardWheelStep,
  ArrowRight: TIMELINE_CAROUSEL_CONSTANTS.keyboardWheelStep,
  PageDown: TIMELINE_CAROUSEL_CONSTANTS.pageWheelStep,
  ' ': TIMELINE_CAROUSEL_CONSTANTS.keyboardWheelStep,
  Spacebar: TIMELINE_CAROUSEL_CONSTANTS.keyboardWheelStep,
  ArrowUp: -TIMELINE_CAROUSEL_CONSTANTS.keyboardWheelStep,
  ArrowLeft: -TIMELINE_CAROUSEL_CONSTANTS.keyboardWheelStep,
  PageUp: -TIMELINE_CAROUSEL_CONSTANTS.pageWheelStep,
}

export function stepTimelineWheelMomentum(params: {
  virtualWheel: number
  wheelVelocity: number
  maxWheel: number
  delta: number
}): { virtualWheel: number; wheelVelocity: number } {
  const { maxWheel, delta } = params
  let { virtualWheel, wheelVelocity } = params

  if (Math.abs(wheelVelocity) > 0.001) {
    const nextWheel = clamp(virtualWheel + wheelVelocity * delta, 0, maxWheel)
    const hitScrollLimit =
      nextWheel === virtualWheel &&
      ((nextWheel <= 0 && wheelVelocity < 0) ||
        (nextWheel >= maxWheel && wheelVelocity > 0))

    virtualWheel = nextWheel
    wheelVelocity = hitScrollLimit
      ? 0
      : wheelVelocity *
        Math.exp(-TIMELINE_CAROUSEL_CONSTANTS.wheelMomentumDecay * delta)
  }

  return { virtualWheel, wheelVelocity }
}

export function getTimelineViewModeInstructions(
  isMapMode: boolean,
  autopilotEnabled: boolean,
): string {
  if (isMapMode) {
    return 'Select a star to inspect an article. Drag to rotate, scroll to zoom; use the arrow controls to pan.'
  }
  return autopilotEnabled
    ? 'Autopilot is roaming between records, holding for 20 seconds at each destination. Pause or boost from the flight controls below.'
    : 'Manual flight. Scroll, drag, or use the slider; re-enable autopilot from the flight controls below.'
}

export interface TimelineGestureControllerOptions {
  input: TimelineCarouselInput
  getShell: () => HTMLDivElement | null
  getIsMapMode: () => boolean
  startMedia: () => void
  pauseAutopilotPreserveBoost: () => void
  resetWheelVelocity: () => void
  applyPositionDelta: (deltaY: number, wheelDistance: number) => void
  clearSelectedStar: () => void
  onPanningChange: (panning: boolean) => void
}

export function createTimelineGestureController(
  options: TimelineGestureControllerOptions,
) {
  let panPointerId: number | null = null
  let lastPanClientX = 0
  let lastPanClientY = 0
  let panStartClientX = 0
  let panStartClientY = 0
  let hasDraggedScenePan = false
  let lastTouchCenterY: number | null = null
  let lastTouchPanClientX: number | null = null
  let lastTouchPanClientY: number | null = null

  const {
    clickAwayDragThreshold,
    mapCameraPanLimit,
    travelCameraPanLimit,
    mapOrbitLimit,
    mapZoomMin,
    mapZoomMax,
  } = TIMELINE_CAROUSEL_CONSTANTS

  function setPanPointerId(nextId: number | null) {
    panPointerId = nextId
    options.onPanningChange(nextId !== null)
  }

  function handleScenePointerDown(event: PointerEvent) {
    options.startMedia()
    const shell = options.getShell()
    if (
      !shell ||
      event.button !== 0 ||
      !event.isPrimary ||
      isTimelineInteractiveTarget(event.target)
    ) {
      return
    }

    options.pauseAutopilotPreserveBoost()
    event.preventDefault()
    event.stopPropagation()
    setPanPointerId(event.pointerId)
    lastPanClientX = event.clientX
    lastPanClientY = event.clientY
    panStartClientX = event.clientX
    panStartClientY = event.clientY
    hasDraggedScenePan = false
    options.input.active = true
    options.resetWheelVelocity()
    updateTimelinePointer(options.input, shell, event.clientX, event.clientY)
    shell.setPointerCapture(event.pointerId)
  }

  function handleScenePointerMove(event: PointerEvent) {
    if (panPointerId !== event.pointerId) return

    event.preventDefault()
    event.stopPropagation()
    const shell = options.getShell()
    const isMapMode = options.getIsMapMode()
    const deltaX = event.clientX - lastPanClientX
    const deltaY = event.clientY - lastPanClientY
    const totalDeltaX = event.clientX - panStartClientX
    const totalDeltaY = event.clientY - panStartClientY
    if (Math.hypot(totalDeltaX, totalDeltaY) >= clickAwayDragThreshold) {
      hasDraggedScenePan = true
    }
    lastPanClientX = event.clientX
    lastPanClientY = event.clientY
    updateTimelinePointer(options.input, shell, event.clientX, event.clientY)
    options.pauseAutopilotPreserveBoost()
    applyTimelineCameraDrag(
      options.input,
      shell,
      deltaX,
      deltaY,
      isMapMode,
      isMapMode ? mapCameraPanLimit : travelCameraPanLimit,
      mapOrbitLimit,
    )
  }

  function handleScenePointerUp(event: PointerEvent) {
    if (panPointerId !== event.pointerId) return

    try {
      options.getShell()?.releasePointerCapture(event.pointerId)
    } catch {
      // Pointer capture may already be released by the browser.
    }
    event.stopPropagation()
    if (!hasDraggedScenePan) options.clearSelectedStar()
    setPanPointerId(null)
    hasDraggedScenePan = false
    options.input.active = false
  }

  function handlePointerMove(event: PointerEvent) {
    if (event.pointerType === 'touch') return
    updateTimelinePointer(
      options.input,
      options.getShell(),
      event.clientX,
      event.clientY,
    )
  }

  function handleTouchEnd() {
    options.input.active = false
    lastTouchCenterY = null
    lastTouchPanClientX = null
    lastTouchPanClientY = null
  }

  function handleTouchStart(event: TouchEvent) {
    const shell = options.getShell()
    const isMapMode = options.getIsMapMode()
    if (isMapMode && event.touches.length === 1) {
      const touch = event.touches[0]
      if (!isPointInsideTimelineShell(shell, touch.clientX, touch.clientY)) return

      lastTouchCenterY = null
      lastTouchPanClientX = touch.clientX
      lastTouchPanClientY = touch.clientY
      options.input.active = true
      options.resetWheelVelocity()
      updateTimelinePointer(options.input, shell, touch.clientX, touch.clientY)
      return
    }

    if (event.touches.length < 2) {
      handleTouchEnd()
      return
    }

    const [touchA, touchB] = Array.from(event.touches)
    if (
      !isPointInsideTimelineShell(shell, touchA.clientX, touchA.clientY) &&
      !isPointInsideTimelineShell(shell, touchB.clientX, touchB.clientY)
    ) {
      return
    }

    lastTouchCenterY = (touchA.clientY + touchB.clientY) / 2
    lastTouchPanClientX = null
    lastTouchPanClientY = null
    options.input.active = true
    options.resetWheelVelocity()
    updateTimelinePointer(
      options.input,
      shell,
      (touchA.clientX + touchB.clientX) / 2,
      lastTouchCenterY,
    )
  }

  function handleTouchMove(event: TouchEvent) {
    const shell = options.getShell()
    const isMapMode = options.getIsMapMode()
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
      updateTimelinePointer(options.input, shell, touch.clientX, touch.clientY)
      options.pauseAutopilotPreserveBoost()
      applyTimelineCameraDrag(
        options.input,
        shell,
        deltaX,
        deltaY,
        isMapMode,
        isMapMode ? mapCameraPanLimit : travelCameraPanLimit,
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
    const touchWheelDistance = Math.max(
      220,
      Math.min(window.innerHeight * 0.46, 360),
    )
    updateTimelinePointer(options.input, shell, touchCenterX, touchCenterY)
    if (isMapMode) {
      setTimelineMapZoom(
        options.input,
        options.input.mapZoom * Math.exp(-deltaY * 0.0026),
        mapZoomMin,
        mapZoomMax,
      )
    } else {
      options.applyPositionDelta(deltaY, touchWheelDistance)
    }
    lastTouchCenterY = touchCenterY
  }

  function reset() {
    options.input.active = false
    lastTouchCenterY = null
    lastTouchPanClientX = null
    lastTouchPanClientY = null
    setPanPointerId(null)
    hasDraggedScenePan = false
  }

  return {
    handleScenePointerDown,
    handleScenePointerMove,
    handleScenePointerUp,
    handlePointerMove,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    reset,
  }
}

export function bindTimelineWindowEvents(handlers: {
  onPointerMove: (event: PointerEvent) => void
  onTouchStart: (event: TouchEvent) => void
  onTouchMove: (event: TouchEvent) => void
  onTouchEnd: () => void
  onWheel: (event: WheelEvent) => void
  onKeyDown: (event: KeyboardEvent) => void
  onKeyUp: (event: KeyboardEvent) => void
  onResize: () => void
}): () => void {
  window.addEventListener('pointermove', handlers.onPointerMove)
  window.addEventListener('touchstart', handlers.onTouchStart, { passive: false })
  window.addEventListener('touchmove', handlers.onTouchMove, { passive: false })
  window.addEventListener('touchend', handlers.onTouchEnd)
  window.addEventListener('touchcancel', handlers.onTouchEnd)
  window.addEventListener('wheel', handlers.onWheel, { passive: false })
  window.addEventListener('keydown', handlers.onKeyDown)
  window.addEventListener('keyup', handlers.onKeyUp)
  window.addEventListener('resize', handlers.onResize)

  return () => {
    window.removeEventListener('pointermove', handlers.onPointerMove)
    window.removeEventListener('touchstart', handlers.onTouchStart)
    window.removeEventListener('touchmove', handlers.onTouchMove)
    window.removeEventListener('touchend', handlers.onTouchEnd)
    window.removeEventListener('touchcancel', handlers.onTouchEnd)
    window.removeEventListener('wheel', handlers.onWheel)
    window.removeEventListener('keydown', handlers.onKeyDown)
    window.removeEventListener('keyup', handlers.onKeyUp)
    window.removeEventListener('resize', handlers.onResize)
  }
}
