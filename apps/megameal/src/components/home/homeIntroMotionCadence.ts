import type { Stage } from '@threlte/core'

export const homeIntroMotionFps = 15
export const homeIntroActiveRenderFps = 30
export const homeIntroIdleRenderFps = 15
export const homeIntroInitialActiveRenderMs = 3200
export const homeIntroInteractionRenderHoldMs = 420
export const homeIntroMotionStageKey = 'megameal-home-intro-motion'

type HomeIntroRenderCadenceInput = {
  active: boolean
  burstUntilSeconds: number
  nowMs: number
  portalVisible: boolean
  signatureValues: readonly number[]
}

export function createHomeIntroMotionStageOptions(renderStage: Stage) {
  const stepSeconds = 1 / homeIntroMotionFps
  let accumulatedSeconds = 0

  return {
    before: renderStage,
    callback(delta: number, runTasks: (deltaOverride?: number) => void) {
      const safeDelta = Number.isFinite(delta)
        ? Math.min(0.1, Math.max(0, delta))
        : stepSeconds
      accumulatedSeconds += safeDelta

      if (accumulatedSeconds + Number.EPSILON < stepSeconds) return

      const motionDelta = Math.min(0.1, accumulatedSeconds)
      accumulatedSeconds %= stepSeconds
      runTasks(motionDelta)
    },
  }
}

export function createHomeIntroRenderCadence() {
  let lastRenderAtMs = -Infinity
  let renderActiveUntilMs = 0
  let lastInputSignature = ''

  function holdActiveUntil(untilMs: number) {
    renderActiveUntilMs = Math.max(renderActiveUntilMs, untilMs)
  }

  return {
    holdInitial(nowMs: number) {
      holdActiveUntil(nowMs + homeIntroInitialActiveRenderMs)
    },
    shouldAdvance({
      active,
      burstUntilSeconds,
      nowMs,
      portalVisible,
      signatureValues,
    }: HomeIntroRenderCadenceInput) {
      if (!portalVisible) {
        lastRenderAtMs = -Infinity
        return false
      }

      const nextInputSignature = signatureValues
        .map(value => (Number.isFinite(value) ? value.toFixed(4) : '0'))
        .join(':')
      if (lastInputSignature && nextInputSignature !== lastInputSignature) {
        holdActiveUntil(nowMs + homeIntroInteractionRenderHoldMs)
      }
      lastInputSignature = nextInputSignature

      if (active) {
        holdActiveUntil(nowMs + homeIntroInteractionRenderHoldMs)
      }

      const activelyRendering =
        active ||
        nowMs < renderActiveUntilMs ||
        nowMs * 0.001 < burstUntilSeconds
      const renderFps = activelyRendering
        ? homeIntroActiveRenderFps
        : homeIntroIdleRenderFps
      const renderIntervalMs = 1000 / renderFps

      if (nowMs - lastRenderAtMs + 0.5 < renderIntervalMs) return false

      lastRenderAtMs = Number.isFinite(lastRenderAtMs)
        ? nowMs - ((nowMs - lastRenderAtMs) % renderIntervalMs)
        : nowMs
      return true
    },
  }
}
