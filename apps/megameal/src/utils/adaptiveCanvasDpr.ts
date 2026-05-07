type AdaptiveCanvasDprOptions = {
  getMaxDpr: () => number
  setDpr: (dpr: number) => void
  minDpr?: number
  slowFrameMs?: number
  stableFrameMs?: number
  slowFrameCount?: number
  stableFrameCount?: number
}

export type AdaptiveCanvasDprController = {
  start: () => void
  stop: () => void
  sync: () => void
}

const defaultDprSteps = [1, 1.25, 1.5]

function getStepForDpr(dpr: number, minDpr: number) {
  return defaultDprSteps.find(step => step >= dpr && step >= minDpr) ?? defaultDprSteps[0]
}

function getBestStep(maxDpr: number, minDpr: number) {
  const allowedSteps = defaultDprSteps.filter(step => step <= maxDpr && step >= minDpr)
  return allowedSteps.at(-1) ?? Math.max(minDpr, Math.min(maxDpr, defaultDprSteps[0]))
}

function getNextLowerStep(currentDpr: number, minDpr: number) {
  return (
    [...defaultDprSteps]
      .reverse()
      .find(step => step < currentDpr - 0.01 && step >= minDpr) ?? currentDpr
  )
}

function getNextHigherStep(currentDpr: number, maxDpr: number) {
  return defaultDprSteps.find(step => step > currentDpr + 0.01 && step <= maxDpr) ?? currentDpr
}

export function createAdaptiveCanvasDprController({
  getMaxDpr,
  setDpr,
  minDpr = 1,
  slowFrameMs = 42,
  stableFrameMs = 23,
  slowFrameCount = 24,
  stableFrameCount = 240,
}: AdaptiveCanvasDprOptions): AdaptiveCanvasDprController {
  let frame = 0
  let lastFrameAt = 0
  let currentDpr = getBestStep(getMaxDpr(), minDpr)
  let slowFrames = 0
  let stableFrames = 0

  const applyDpr = (nextDpr: number) => {
    const maxDpr = getMaxDpr()
    const normalizedDpr = Math.min(getStepForDpr(nextDpr, minDpr), maxDpr)
    if (Math.abs(normalizedDpr - currentDpr) < 0.01) return

    currentDpr = normalizedDpr
    setDpr(currentDpr)
    slowFrames = 0
    stableFrames = 0
  }

  const sync = () => {
    const maxDpr = getMaxDpr()
    const targetDpr = Math.min(currentDpr, getBestStep(maxDpr, minDpr))
    currentDpr = targetDpr
    setDpr(currentDpr)
    slowFrames = 0
    stableFrames = 0
  }

  const tick = (timestamp: number) => {
    if (lastFrameAt > 0 && document.visibilityState === 'visible') {
      const frameMs = timestamp - lastFrameAt

      if (frameMs > slowFrameMs && frameMs < 250) {
        slowFrames += 1
        stableFrames = 0
      } else if (frameMs < stableFrameMs) {
        stableFrames += 1
        slowFrames = Math.max(0, slowFrames - 1)
      } else {
        slowFrames = Math.max(0, slowFrames - 1)
        stableFrames = Math.max(0, stableFrames - 2)
      }

      if (slowFrames >= slowFrameCount) {
        applyDpr(getNextLowerStep(currentDpr, minDpr))
      } else if (stableFrames >= stableFrameCount) {
        applyDpr(getNextHigherStep(currentDpr, getMaxDpr()))
      }
    }

    lastFrameAt = timestamp
    frame = window.requestAnimationFrame(tick)
  }

  return {
    start() {
      if (frame || typeof window === 'undefined') return
      sync()
      lastFrameAt = 0
      frame = window.requestAnimationFrame(tick)
    },
    stop() {
      if (!frame || typeof window === 'undefined') return
      window.cancelAnimationFrame(frame)
      frame = 0
      lastFrameAt = 0
      slowFrames = 0
      stableFrames = 0
    },
    sync,
  }
}
