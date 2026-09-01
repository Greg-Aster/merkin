import { get, writable } from 'svelte/store'
import { advanceTimelineTargetFlight } from './timelinePortalCarouselModel'
import {
  addTimelineVisitedSlug,
  loadTimelineVisitedSlugs,
  persistTimelineVisitedSlugs,
} from './timelinePortalProgress'

export type TimelineAutopilotPhase = 'manual' | 'travel' | 'dwell'

export type TimelineFlightState = {
  autopilotEnabled: boolean
  autopilotPhase: TimelineAutopilotPhase
  autopilotTargetIndex: number
  boostLatched: boolean
  boostKeyHeld: boolean
  isBoosting: boolean
  visitedSlugs: string[]
  activeEraKey: string
  eraTransitionName: string
  eraTransitionSequence: number
  eraTransitionVisible: boolean
}

type TimelineFlightControllerOptions = {
  getPosition: () => number
  setPosition: (position: number) => void
  getCameraPan: () => { x: number; y: number }
  setCameraPan: (x: number, y: number) => void
  getTargetScreenPosition: (index: number) => {
    x: number
    y: number
    projectable: boolean
  } | null
  getMaxPosition: () => number
  getIsMapMode: () => boolean
  getIsPortraitMobile: () => boolean
  getPrefersReducedMotion: () => boolean
  selectTarget: (index: number) => void
  startMedia: () => void
}

const autopilotMaximumSpeed = 5.4
const boostedAutopilotMaximumSpeed = 8.2
const autopilotMinimumSpeed = 0.48
const autopilotApproachRate = 1.35
const autopilotVelocityEase = 4.2
const autopilotArrivalThreshold = 0.015
const autopilotFocusCenter = 50
const autopilotFocusThreshold = 0.8
const autopilotFocusApproachRate = 4.8
const autopilotFocusMaximumPanSpeed = 4.2
const autopilotDwellDuration = 20_000
const eraTransitionDuration = 2350

export function createTimelineFlightController(
  options: TimelineFlightControllerOptions,
) {
  const state = writable<TimelineFlightState>({
    autopilotEnabled: false,
    autopilotPhase: 'manual',
    autopilotTargetIndex: -1,
    boostLatched: false,
    boostKeyHeld: false,
    isBoosting: false,
    visitedSlugs: [],
    activeEraKey: '',
    eraTransitionName: '',
    eraTransitionSequence: 0,
    eraTransitionVisible: false,
  })
  let flightFrame = 0
  let lastFlightFrameAt = 0
  let flightVelocity = 0
  let autopilotDwellTimeout = 0
  let eraTransitionTimeout = 0

  function patchState(patch: Partial<TimelineFlightState>) {
    state.update(current => ({ ...current, ...patch }))
  }

  function clearFrame() {
    if (flightFrame && typeof window !== 'undefined') {
      window.cancelAnimationFrame(flightFrame)
    }
    flightFrame = 0
    lastFlightFrameAt = 0
  }

  function clearAutopilotDwell() {
    if (autopilotDwellTimeout && typeof window !== 'undefined') {
      window.clearTimeout(autopilotDwellTimeout)
    }
    autopilotDwellTimeout = 0
  }

  function getRandomTargetIndex() {
    const maximumIndex = Math.floor(options.getMaxPosition())
    if (maximumIndex <= 0) return maximumIndex

    const currentIndex = Math.round(options.getPosition())
    const previousTarget = get(state).autopilotTargetIndex
    const candidates = Array.from({ length: maximumIndex + 1 }, (_, index) => index)
      .filter(index => index !== currentIndex && index !== previousTarget)
    const fallbackCandidates = Array.from(
      { length: maximumIndex + 1 },
      (_, index) => index,
    ).filter(index => index !== currentIndex)
    const availableTargets = candidates.length > 0 ? candidates : fallbackCandidates
    const randomIndex = Math.min(
      availableTargets.length - 1,
      Math.floor(Math.random() * availableTargets.length),
    )
    return availableTargets[randomIndex] ?? currentIndex
  }

  function scheduleNextAutopilotLeg() {
    clearAutopilotDwell()
    autopilotDwellTimeout = window.setTimeout(() => {
      autopilotDwellTimeout = 0
      if (get(state).autopilotEnabled) beginAutopilotLeg()
    }, autopilotDwellDuration)
  }

  function arriveAtAutopilotTarget() {
    clearFrame()
    flightVelocity = 0
    patchState({
      autopilotPhase: 'dwell',
      boostLatched: false,
      boostKeyHeld: false,
      isBoosting: false,
    })
    scheduleNextAutopilotLeg()
  }

  function advanceAutopilotFocus(targetIndex: number, delta: number) {
    const target = options.getTargetScreenPosition(targetIndex)
    if (!target?.projectable) return false

    const errorX = target.x - autopilotFocusCenter
    const errorY = target.y - autopilotFocusCenter
    const centered =
      Math.abs(errorX) <= autopilotFocusThreshold &&
      Math.abs(errorY) <= autopilotFocusThreshold
    if (centered) return true

    const cameraPan = options.getCameraPan()
    const maximumStep = autopilotFocusMaximumPanSpeed * delta
    const panStepX = Math.min(
      maximumStep,
      Math.max(
        -maximumStep,
        (errorX / autopilotFocusCenter) * autopilotFocusApproachRate * delta,
      ),
    )
    const panStepY = Math.min(
      maximumStep,
      Math.max(
        -maximumStep,
        (-errorY / autopilotFocusCenter) * autopilotFocusApproachRate * delta,
      ),
    )
    options.setCameraPan(cameraPan.x + panStepX, cameraPan.y + panStepY)
    return false
  }

  function runFlightFrame(timestamp: number) {
    const current = get(state)
    if (
      !current.autopilotEnabled ||
      current.autopilotPhase !== 'travel' ||
      current.autopilotTargetIndex < 0
    ) {
      clearFrame()
      flightVelocity = 0
      return
    }

    const minimumFrameInterval = 1000 / (options.getIsPortraitMobile() ? 20 : 30)
    if (lastFlightFrameAt && timestamp - lastFlightFrameAt < minimumFrameInterval) {
      flightFrame = window.requestAnimationFrame(runFlightFrame)
      return
    }

    const delta = lastFlightFrameAt
      ? Math.min(0.08, (timestamp - lastFlightFrameAt) / 1000)
      : 1 / 60
    lastFlightFrameAt = timestamp
    const nextFlight = advanceTimelineTargetFlight({
      position: options.getPosition(),
      targetPosition: current.autopilotTargetIndex,
      velocity: flightVelocity,
      delta,
      maximumSpeed: current.isBoosting
        ? boostedAutopilotMaximumSpeed
        : autopilotMaximumSpeed,
      minimumSpeed: autopilotMinimumSpeed,
      approachRate: autopilotApproachRate,
      velocityEaseRate: autopilotVelocityEase,
      arrivalThreshold: autopilotArrivalThreshold,
    })
    flightVelocity = nextFlight.velocity
    options.setPosition(nextFlight.position)
    const focusCentered = advanceAutopilotFocus(
      current.autopilotTargetIndex,
      delta,
    )

    if (nextFlight.arrived && focusCentered) {
      arriveAtAutopilotTarget()
      return
    }

    flightFrame = window.requestAnimationFrame(runFlightFrame)
  }

  function beginAutopilotLeg(preferredTargetIndex = -1) {
    const current = get(state)
    if (
      !current.autopilotEnabled ||
      options.getIsMapMode() ||
      options.getMaxPosition() <= 0
    ) return

    clearAutopilotDwell()
    clearFrame()
    const targetIndex =
      preferredTargetIndex >= 0 && preferredTargetIndex <= options.getMaxPosition()
        ? preferredTargetIndex
        : getRandomTargetIndex()
    options.selectTarget(targetIndex)
    patchState({
      autopilotPhase: 'travel',
      autopilotTargetIndex: targetIndex,
    })
    flightVelocity = 0

    if (options.getPrefersReducedMotion()) {
      options.setPosition(targetIndex)
      arriveAtAutopilotTarget()
      return
    }

    lastFlightFrameAt = 0
    flightFrame = window.requestAnimationFrame(runFlightFrame)
  }

  function enableAutopilot(preferredTargetIndex = -1) {
    if (options.getIsMapMode() || options.getMaxPosition() <= 0) return false

    clearAutopilotDwell()
    clearFrame()
    patchState({
      autopilotEnabled: true,
      autopilotPhase: 'manual',
      autopilotTargetIndex: -1,
    })
    options.startMedia()
    beginAutopilotLeg(preferredTargetIndex)
    return true
  }

  function pauseAutopilot({ preserveBoost = false } = {}) {
    const current = get(state)
    clearAutopilotDwell()
    clearFrame()
    flightVelocity = 0
    patchState({
      autopilotEnabled: false,
      autopilotPhase: 'manual',
      autopilotTargetIndex: -1,
      boostLatched: preserveBoost && current.boostLatched,
      boostKeyHeld: preserveBoost && current.boostKeyHeld,
      isBoosting: preserveBoost && current.isBoosting,
    })
  }

  function toggleAutopilot(preferredTargetIndex = -1) {
    if (get(state).autopilotEnabled) {
      pauseAutopilot()
      return false
    }
    return enableAutopilot(preferredTargetIndex)
  }

  function toggleBoost() {
    const current = get(state)
    if (
      options.getIsMapMode() ||
      options.getPrefersReducedMotion() ||
      (current.autopilotEnabled && current.autopilotPhase !== 'travel')
    ) return false

    const boostLatched = !current.boostLatched
    patchState({
      boostLatched,
      isBoosting: boostLatched || current.boostKeyHeld,
    })
    if (boostLatched) options.startMedia()
    return boostLatched
  }

  function setBoostKeyHeld(boostKeyHeld: boolean) {
    const current = get(state)
    const canBoost =
      !options.getIsMapMode() &&
      !options.getPrefersReducedMotion() &&
      (!current.autopilotEnabled || current.autopilotPhase === 'travel')
    patchState({
      boostKeyHeld: canBoost && boostKeyHeld,
      isBoosting: canBoost && (current.boostLatched || boostKeyHeld),
    })
    if (canBoost && boostKeyHeld) options.startMedia()
  }

  function loadVisitedProgress() {
    patchState({ visitedSlugs: loadTimelineVisitedSlugs() })
  }

  function markVisited(slug: string) {
    const current = get(state)
    if (!slug || current.visitedSlugs.includes(slug)) return

    const visitedSlugs = addTimelineVisitedSlug(current.visitedSlugs, slug)
    patchState({ visitedSlugs })
    persistTimelineVisitedSlugs(visitedSlugs)
  }

  function initializeEra(eraKey: string) {
    if (eraKey) patchState({ activeEraKey: eraKey })
  }

  function enterEra(eraKey: string, displayName: string) {
    const current = get(state)
    if (!eraKey || eraKey === current.activeEraKey) return

    patchState({
      activeEraKey: eraKey,
      eraTransitionName: displayName || eraKey.replaceAll('-', ' '),
      eraTransitionSequence: current.eraTransitionSequence + 1,
      eraTransitionVisible: true,
    })
    if (eraTransitionTimeout) window.clearTimeout(eraTransitionTimeout)
    eraTransitionTimeout = window.setTimeout(() => {
      patchState({ eraTransitionVisible: false })
      eraTransitionTimeout = 0
    }, eraTransitionDuration)
  }

  function destroy() {
    clearAutopilotDwell()
    clearFrame()
    if (eraTransitionTimeout && typeof window !== 'undefined') {
      window.clearTimeout(eraTransitionTimeout)
    }
    eraTransitionTimeout = 0
  }

  return {
    subscribe: state.subscribe,
    destroy,
    enableAutopilot,
    enterEra,
    initializeEra,
    loadVisitedProgress,
    markVisited,
    pauseAutopilot,
    setBoostKeyHeld,
    toggleAutopilot,
    toggleBoost,
  }
}
