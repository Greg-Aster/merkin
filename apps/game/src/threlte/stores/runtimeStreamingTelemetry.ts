export type RuntimeStreamingLevelTelemetry = {
  levelId: string
  selectedRuntimeProfileId: string | null
  selectedPlatformProfile: string | null
  requestedAssetTier: string | null
  levelAssetTierCap: string | null
  selectedAssetTier: string
  renderQualityTier: string
  renderProfileId: string | null
  renderProfileTier: string | null
  requiredAssetCount: number
  deferredOptionalAssetCount: number
  partitioned: boolean
  activeCellKeys: string[]
  prefetchCellKeys: string[]
  evictableCellKeys: string[]
  activeCellCount: number
  prefetchCellCount: number
  evictableCellCount: number
  totalCellCount: number
  residentActorCount: number
  streamableActorCount: number
  activeActorCount: number
  activeRenderableActorCount: number
  pendingRequiredCellKeys: string[]
  readinessGateCount: number
  initialCellCount: number
  loadedRenderAssetCount: number
  loadedCollisionAssetCount: number
  gltfCacheEntries: number
  gltfCacheLoadedEntries: number
  gltfCachePendingEntries: number
  gltfCacheReferencedEntries: number
  gltfCacheUnreferencedEntries: number
  gltfCacheLoadedBytes: number
  gltfCacheBytes: number
  gltfCachePendingBytes: number
  gltfCacheReferencedBytes: number
  gltfCacheUnreferencedBytes: number
  cellStateCounts: Record<string, number>
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
          prefetchCellKeys: [...telemetry.prefetchCellKeys].sort(),
          evictableCellKeys: [...telemetry.evictableCellKeys].sort(),
          pendingRequiredCellKeys: [
            ...telemetry.pendingRequiredCellKeys,
          ].sort(),
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
