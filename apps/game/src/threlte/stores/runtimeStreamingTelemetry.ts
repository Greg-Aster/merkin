import { derived, writable } from 'svelte/store'

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

export type RuntimeStreamingTelemetrySummary = {
  levelCount: number
  activeLevelId: string | null
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
  activeCellCount: number
  prefetchCellCount: number
  evictableCellCount: number
  totalCellCount: number
  residentActorCount: number
  streamableActorCount: number
  activeActorCount: number
  activeRenderableActorCount: number
  pendingRequiredCellCount: number
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
}

declare global {
  interface Window {
    __gameRuntimeStreamingState?: RuntimeStreamingTelemetryState
  }
}

const levelTelemetryById = new Map<string, RuntimeStreamingLevelTelemetry>()

const emptyTelemetryState: RuntimeStreamingTelemetryState = { levels: {} }

export const runtimeStreamingTelemetryStore =
  writable<RuntimeStreamingTelemetryState>(emptyTelemetryState)

function createRuntimeStreamingTelemetryState(): RuntimeStreamingTelemetryState {
  return {
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

function createEmptyRuntimeStreamingTelemetrySummary(): RuntimeStreamingTelemetrySummary {
  return {
    levelCount: 0,
    activeLevelId: null,
    selectedRuntimeProfileId: null,
    selectedPlatformProfile: null,
    requestedAssetTier: null,
    levelAssetTierCap: null,
    selectedAssetTier: 'unknown',
    renderQualityTier: 'unknown',
    renderProfileId: null,
    renderProfileTier: null,
    requiredAssetCount: 0,
    deferredOptionalAssetCount: 0,
    partitioned: false,
    activeCellCount: 0,
    prefetchCellCount: 0,
    evictableCellCount: 0,
    totalCellCount: 0,
    residentActorCount: 0,
    streamableActorCount: 0,
    activeActorCount: 0,
    activeRenderableActorCount: 0,
    pendingRequiredCellCount: 0,
    readinessGateCount: 0,
    initialCellCount: 0,
    loadedRenderAssetCount: 0,
    loadedCollisionAssetCount: 0,
    gltfCacheEntries: 0,
    gltfCacheLoadedEntries: 0,
    gltfCachePendingEntries: 0,
    gltfCacheReferencedEntries: 0,
    gltfCacheUnreferencedEntries: 0,
    gltfCacheLoadedBytes: 0,
    gltfCacheBytes: 0,
    gltfCachePendingBytes: 0,
    gltfCacheReferencedBytes: 0,
    gltfCacheUnreferencedBytes: 0,
  }
}

export const runtimeStreamingTelemetrySummaryStore = derived(
  runtimeStreamingTelemetryStore,
  state => {
    const levels = Object.values(state.levels)
    if (levels.length === 0)
      return createEmptyRuntimeStreamingTelemetrySummary()

    const latestLevel = [...levels].sort(
      (a, b) => b.lastUpdatedAt - a.lastUpdatedAt,
    )[0]
    const summary = createEmptyRuntimeStreamingTelemetrySummary()
    summary.levelCount = levels.length
    summary.activeLevelId = latestLevel.levelId
    summary.selectedRuntimeProfileId = latestLevel.selectedRuntimeProfileId
    summary.selectedPlatformProfile = latestLevel.selectedPlatformProfile
    summary.requestedAssetTier = latestLevel.requestedAssetTier
    summary.levelAssetTierCap = latestLevel.levelAssetTierCap
    summary.selectedAssetTier = latestLevel.selectedAssetTier
    summary.renderQualityTier = latestLevel.renderQualityTier
    summary.renderProfileId = latestLevel.renderProfileId
    summary.renderProfileTier = latestLevel.renderProfileTier
    summary.partitioned = levels.some(level => level.partitioned)

    for (const level of levels) {
      summary.requiredAssetCount += level.requiredAssetCount
      summary.deferredOptionalAssetCount += level.deferredOptionalAssetCount
      summary.activeCellCount += level.activeCellCount
      summary.prefetchCellCount += level.prefetchCellCount
      summary.evictableCellCount += level.evictableCellCount
      summary.totalCellCount += level.totalCellCount
      summary.residentActorCount += level.residentActorCount
      summary.streamableActorCount += level.streamableActorCount
      summary.activeActorCount += level.activeActorCount
      summary.activeRenderableActorCount += level.activeRenderableActorCount
      summary.pendingRequiredCellCount += level.pendingRequiredCellKeys.length
      summary.readinessGateCount += level.readinessGateCount
      summary.initialCellCount += level.initialCellCount
      summary.loadedRenderAssetCount += level.loadedRenderAssetCount
      summary.loadedCollisionAssetCount += level.loadedCollisionAssetCount
      summary.gltfCacheEntries += level.gltfCacheEntries
      summary.gltfCacheLoadedEntries += level.gltfCacheLoadedEntries
      summary.gltfCachePendingEntries += level.gltfCachePendingEntries
      summary.gltfCacheReferencedEntries += level.gltfCacheReferencedEntries
      summary.gltfCacheUnreferencedEntries += level.gltfCacheUnreferencedEntries
      summary.gltfCacheLoadedBytes += level.gltfCacheLoadedBytes
      summary.gltfCacheBytes += level.gltfCacheBytes
      summary.gltfCachePendingBytes += level.gltfCachePendingBytes
      summary.gltfCacheReferencedBytes += level.gltfCacheReferencedBytes
      summary.gltfCacheUnreferencedBytes += level.gltfCacheUnreferencedBytes
    }

    return summary
  },
)

function publishRuntimeStreamingTelemetry() {
  const state = createRuntimeStreamingTelemetryState()
  runtimeStreamingTelemetryStore.set(state)

  if (typeof window === 'undefined') return
  window.__gameRuntimeStreamingState = state
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
