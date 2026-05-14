export function getActorRuntimeAssetUrl(
  actor: any,
  options?: {
    resolvePrefabAssetUrl?: (
      type?: string | null,
      variant?: string | null,
    ) => string | undefined
  },
): string

export function createLevelRuntimeReadinessContract(
  level: any,
  options?: {
    runtimeTerrainManifestUrl?: string | null
    requiredInitialCellKeys?: string[] | null
    worldPartitionReadiness?: {
      requiredInitialCellKeys?: string[] | null
    } | null
    worldPartition?: {
      readiness?: {
        requiredInitialCellKeys?: string[] | null
      } | null
    } | null
    resolvePrefabAssetUrl?: (
      type?: string | null,
      variant?: string | null,
    ) => string | undefined
  },
): {
  schemaVersion: 1
  levelId: string
  publish: {
    ready: boolean
    gates: Array<{
      id: string
      label: string
      required: boolean
      satisfied: boolean
      evidence: Record<string, unknown>
      blockers: string[]
    }>
    blockers: string[]
  }
  runtime: {
    activationRequired: boolean
    requiredGateIds: string[]
    requiredRenderActorIds: string[]
    requiredCollisionActorIds: string[]
    requiredAssetUrls: string[]
    requiredColliderUrls: string[]
    requiredInitialCellKeys: string[]
    requiredTerrain: boolean
    terrainManifestUrl: string
  }
  spawn: {
    player: [number, number, number]
    valid: boolean
    runtimeActorId: string
    satisfiedByRuntimeSystem: boolean
  }
  terrain: {
    runtimeActorId: string
    runtimeCollision: boolean
    satisfiedByRuntimeSystem: boolean
  }
  requiredActorIds: string[]
  requiredRenderActorIds: string[]
  requiredCollisionActorIds: string[]
  requiredColliderUrls: string[]
  requiredWalkableActorIds: string[]
  requiredInitialCellKeys: string[]
  runtimeAssetUrls: string[]
  requiredAssetUrls: string[]
  missingRequiredActorIds: string[]
  missingRequiredRenderActorIds: string[]
  missingRequiredCollisionActorIds: string[]
  missingRequiredWalkableActorIds: string[]
}

export function evaluateLevelRuntimeActivation(
  contract: any,
  state?: {
    manifestLoaded?: boolean
    requiredRenderAssetsLoaded?: boolean
    loadedAssetUrls?: string[]
    requiredRenderActorsMounted?: boolean
    mountedRenderActorIds?: string[]
    requiredCollisionMounted?: boolean
    mountedCollisionActorIds?: string[]
    requiredColliderUrlsLoaded?: boolean
    loadedColliderUrls?: string[]
    terrainCollisionMounted?: boolean
    requiredInitialCellsActive?: boolean
    activeInitialCellKeys?: string[]
    readyInitialCellKeys?: string[]
    failedInitialCellKeys?: string[]
    spawnResolved?: boolean
    physicsWorldReady?: boolean
    playerBodyReady?: boolean
    gameplayEnabled?: boolean
  },
): {
  levelId: string
  ready: boolean
  gates: Array<{
    id: string
    label: string
    required: boolean
    satisfied: boolean
    evidence: Record<string, unknown>
    blockers: string[]
  }>
  blockers: string[]
}
