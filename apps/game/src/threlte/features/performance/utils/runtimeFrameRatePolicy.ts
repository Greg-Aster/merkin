export const RUNTIME_TARGET_FPS = 24
export const RUNTIME_LOW_FPS = 16
export const RUNTIME_CRITICAL_FPS = 12

export type RuntimeFrameRatePolicy = {
  targetFps: number
  lowFps: number
  criticalFps: number
  targetFrameTimeMs: number
  lowFrameTimeMs: number
  criticalFrameTimeMs: number
}

export function getRuntimeFrameRatePolicy(
  targetFps = RUNTIME_TARGET_FPS,
): RuntimeFrameRatePolicy {
  const target =
    Number.isFinite(targetFps) && targetFps > 0
      ? Number(targetFps)
      : RUNTIME_TARGET_FPS
  const scale = target / RUNTIME_TARGET_FPS
  const low = Math.max(1, RUNTIME_LOW_FPS * scale)
  const critical = Math.max(1, RUNTIME_CRITICAL_FPS * scale)

  return {
    targetFps: target,
    lowFps: low,
    criticalFps: critical,
    targetFrameTimeMs: 1000 / target,
    lowFrameTimeMs: 1000 / low,
    criticalFrameTimeMs: 1000 / critical,
  }
}
