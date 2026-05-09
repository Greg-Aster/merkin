export type RuntimeStreamingLevelTelemetry = {
  levelId: string
  partitioned: boolean
  activeCellKeys: string[]
  activeCellCount: number
  totalCellCount: number
  residentActorCount: number
  streamableActorCount: number
  activeActorCount: number
  activeRenderableActorCount: number
  readinessGateCount: number
  initialCellCount: number
  lastUpdatedAt: number
}

export type RuntimeStreamingTelemetryState = {
  levels: Record<string, RuntimeStreamingLevelTelemetry>
}

declare global {
  interface Window {
    __gameRuntimeStreamingState?: RuntimeStreamingTelemetryState
  }
}

const levelTelemetryById = new Map<string, RuntimeStreamingLevelTelemetry>()

function publishRuntimeStreamingTelemetry() {
  if (typeof window === 'undefined') return

  window.__gameRuntimeStreamingState = {
    levels: Object.fromEntries(
      Array.from(levelTelemetryById.entries()).map(([levelId, telemetry]) => [
        levelId,
        {
          ...telemetry,
          activeCellKeys: [...telemetry.activeCellKeys].sort(),
        },
      ]),
    ),
  }
}

export function setRuntimeStreamingTelemetry(
  levelId: string,
  telemetry: Omit<RuntimeStreamingLevelTelemetry, 'levelId' | 'lastUpdatedAt'>,
) {
  levelTelemetryById.set(levelId, {
    ...telemetry,
    levelId,
    lastUpdatedAt: Date.now(),
  })
  publishRuntimeStreamingTelemetry()
}

export function clearRuntimeStreamingTelemetry(levelId: string) {
  levelTelemetryById.delete(levelId)
  publishRuntimeStreamingTelemetry()
}
