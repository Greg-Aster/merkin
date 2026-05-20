import { getLevelRuntimeContract } from './levelContractsCore.mjs'

export const LEVEL_RUNTIME_ACTIVATION_GATE_IDS = Object.freeze([
  'publish-contract-ready',
  'manifest-loaded',
  'required-render-assets-loaded',
  'required-render-actors-mounted',
  'required-collision-mounted',
  'required-collider-assets-loaded',
  'terrain-collision-mounted',
  'required-initial-world-partition-cells-ready',
  'spawn-resolved',
  'physics-world-ready',
  'player-body-ready',
  'gameplay-enabled',
])

function isFiniteVec3(value) {
  return (
    Array.isArray(value) &&
    value.length === 3 &&
    value.every(component => Number.isFinite(component))
  )
}

function hasString(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function uniqueStrings(values) {
  return [...new Set(values.filter(value => typeof value === 'string'))]
}

function toStringArray(value) {
  return Array.isArray(value)
    ? value.filter(item => typeof item === 'string')
    : []
}

function getAuthoredRuntimeAssetContract(level) {
  const runtimeAssets = level?.settings?.level?.runtimeAssets
  return {
    requiredActorIds: toStringArray(runtimeAssets?.requiredActorIds),
    requiredRenderActorIds: toStringArray(
      runtimeAssets?.requiredRenderActorIds,
    ),
    legacyRequiredAssetActorIds: toStringArray(
      runtimeAssets?.requiredAssetActorIds,
    ),
  }
}

function hasTerrainRuntimeCollision(level, options = {}) {
  const terrain = level?.settings?.level?.collision?.terrain
  const ground = level?.settings?.level?.ground
  return Boolean(
    hasString(options.runtimeTerrainManifestUrl) ||
      (terrain?.source === 'source-glb' &&
        hasString(terrain.manifestUrl)) ||
      (ground?.collisionSource === 'source-linked-terrain-collision' &&
        hasString(ground.terrainManifestUrl)),
  )
}

export function getActorRuntimeAssetUrl(actor, options = {}) {
  const assetUrl = actor?.render?.asset?.url
  if (assetUrl) return assetUrl

  if (typeof options.resolvePrefabAssetUrl === 'function') {
    return options.resolvePrefabAssetUrl(
      actor?.render?.prefab?.type,
      actor?.render?.prefab?.variant,
    )
  }

  return ''
}

function isTerrainRuntimeActorId(level, actorId) {
  return actorId === `${level.id}-terrain`
}

function isSpawnRuntimeActorId(level, actorId) {
  return actorId === `${level.id}-player-spawn`
}

function isSatisfiedByRuntimeSystem(level, actorId, terrainRuntimeCollision) {
  if (isTerrainRuntimeActorId(level, actorId) && terrainRuntimeCollision) {
    return true
  }
  if (
    isSpawnRuntimeActorId(level, actorId) &&
    isFiniteVec3(level.spawn?.player)
  ) {
    return true
  }
  return false
}

function createGate({
  id,
  label,
  required = true,
  satisfied,
  evidence = {},
  blocker,
}) {
  return {
    id,
    label,
    required,
    satisfied,
    evidence,
    blockers: required && !satisfied && blocker ? [blocker] : [],
  }
}

function getTerrainManifestUrl(level, options = {}) {
  const terrain = level?.settings?.level?.collision?.terrain
  const ground = level?.settings?.level?.ground
  return (
    options.runtimeTerrainManifestUrl ??
    terrain?.manifestUrl ??
    ground?.terrainManifestUrl ??
    ''
  )
}

function getWorldPartitionRequiredInitialCellKeys(options = {}) {
  return uniqueStrings([
    ...toStringArray(options.requiredInitialCellKeys),
    ...toStringArray(options.worldPartitionReadiness?.requiredInitialCellKeys),
    ...toStringArray(
      options.worldPartition?.readiness?.requiredInitialCellKeys,
    ),
  ]).sort()
}

function toSet(values) {
  return new Set(toStringArray(values))
}

function allRequiredStringsPresent(requiredValues, observedValues) {
  if (requiredValues.length === 0) return true
  const observed = toSet(observedValues)
  return requiredValues.every(value => observed.has(value))
}

export function createLevelRuntimeReadinessContract(level, options = {}) {
  const levelId = String(level?.id ?? '').trim()
  const staticContract = getLevelRuntimeContract(levelId)
  const authoredContract = getAuthoredRuntimeAssetContract(level)
  const actors = Array.isArray(level?.actors) ? level.actors : []
  const actorsById = new Map(actors.map(actor => [actor.id, actor]))
  const terrainRuntimeCollision = hasTerrainRuntimeCollision(level, {
    runtimeTerrainManifestUrl: options.runtimeTerrainManifestUrl,
  })
  const requiredActorIds = uniqueStrings([
    ...staticContract.requiredActorIds,
    ...authoredContract.requiredActorIds,
  ])
  const requiredRenderActorIds = uniqueStrings([
    ...staticContract.requiredRenderActorIds,
    ...authoredContract.requiredRenderActorIds,
  ])
  const requiredWalkableActorIds = uniqueStrings(
    staticContract.requiredWalkableActorIds,
  )
  const terrainRuntimeActorId = `${levelId}-terrain`
  const spawnRuntimeActorId = `${levelId}-player-spawn`
  const terrainRequired =
    requiredActorIds.includes(terrainRuntimeActorId) ||
    requiredWalkableActorIds.includes(terrainRuntimeActorId)
  const requiredCollisionActorIds = uniqueStrings([
    ...requiredWalkableActorIds,
    ...requiredActorIds.filter(actorId =>
      Boolean(actorsById.get(actorId)?.physics),
    ),
  ])
  const requiredColliderUrls = uniqueStrings(
    requiredCollisionActorIds
      .map(actorId => actorsById.get(actorId)?.physics?.collision?.colliderUrl)
      .filter(Boolean),
  ).sort()
  const requiredInitialCellKeys =
    getWorldPartitionRequiredInitialCellKeys(options)
  const runtimeAssetUrls = uniqueStrings(
    actors
      .map(actor => getActorRuntimeAssetUrl(actor, options))
      .filter(Boolean),
  ).sort()
  const requiredAssetUrls = uniqueStrings(
    requiredRenderActorIds
      .map(actorId => actorsById.get(actorId))
      .filter(Boolean)
      .map(actor => getActorRuntimeAssetUrl(actor, options))
      .filter(Boolean),
  ).sort()
  const missingRequiredActorIds = requiredActorIds.filter(
    actorId =>
      !actorsById.has(actorId) &&
      !isSatisfiedByRuntimeSystem(level, actorId, terrainRuntimeCollision),
  )
  const missingRequiredRenderActorIds = requiredRenderActorIds.filter(
    actorId => !actorsById.has(actorId),
  )
  const missingRequiredWalkableActorIds = requiredWalkableActorIds.filter(
    actorId => {
      const actor = actorsById.get(actorId)
      if (
        !actor &&
        isTerrainRuntimeActorId(level, actorId) &&
        terrainRuntimeCollision
      ) {
        return false
      }
      return !actor
    },
  )
  const missingRequiredCollisionActorIds = requiredCollisionActorIds.filter(
    actorId => {
      const actor = actorsById.get(actorId)
      if (
        !actor &&
        isTerrainRuntimeActorId(level, actorId) &&
        terrainRuntimeCollision
      ) {
        return false
      }
      return !actor?.physics
    },
  )

  const spawnValid = isFiniteVec3(level?.spawn?.player)
  const terrainRuntimeCollisionDeclared =
    !terrainRequired || terrainRuntimeCollision
  const publishGates = [
    createGate({
      id: 'legacy-required-asset-actor-ids-absent',
      label: 'Legacy Required Asset Actor Ids Absent',
      satisfied: authoredContract.legacyRequiredAssetActorIds.length === 0,
      evidence: {
        actorIds: authoredContract.legacyRequiredAssetActorIds,
      },
      blocker:
        'runtimeAssets.requiredAssetActorIds is no longer supported; use runtimeAssets.requiredRenderActorIds.',
    }),
    createGate({
      id: 'spawn-valid',
      label: 'Spawn Valid',
      satisfied: spawnValid,
      evidence: {
        runtimeActorId: spawnRuntimeActorId,
        player: spawnValid ? level.spawn.player : [0, 0, 0],
      },
      blocker: 'Player spawn must be a finite Vec3.',
    }),
    createGate({
      id: 'required-actors-present',
      label: 'Required Actors Present',
      satisfied: missingRequiredActorIds.length === 0,
      evidence: {
        actorIds: requiredActorIds,
        missingActorIds: missingRequiredActorIds,
      },
      blocker: `${missingRequiredActorIds.length} required actor(s) are missing.`,
    }),
    createGate({
      id: 'required-render-actors-present',
      label: 'Required Render Actors Present',
      required: requiredRenderActorIds.length > 0,
      satisfied: missingRequiredRenderActorIds.length === 0,
      evidence: {
        actorIds: requiredRenderActorIds,
        assetUrls: requiredAssetUrls,
        missingActorIds: missingRequiredRenderActorIds,
      },
      blocker: `${missingRequiredRenderActorIds.length} required render actor(s) are missing.`,
    }),
    createGate({
      id: 'required-walkable-collision-present',
      label: 'Required Walkable Collision Present',
      required: requiredWalkableActorIds.length > 0,
      satisfied: missingRequiredWalkableActorIds.length === 0,
      evidence: {
        actorIds: requiredWalkableActorIds,
        missingActorIds: missingRequiredWalkableActorIds,
      },
      blocker: `${missingRequiredWalkableActorIds.length} required walkable collision actor(s) are missing.`,
    }),
    createGate({
      id: 'required-collision-present',
      label: 'Required Collision Present',
      required: requiredCollisionActorIds.length > 0,
      satisfied: missingRequiredCollisionActorIds.length === 0,
      evidence: {
        actorIds: requiredCollisionActorIds,
        colliderUrls: requiredColliderUrls,
        missingActorIds: missingRequiredCollisionActorIds,
      },
      blocker: `${missingRequiredCollisionActorIds.length} required collision actor(s) are missing.`,
    }),
    createGate({
      id: 'terrain-runtime-collision-declared',
      label: 'Terrain Runtime Collision Declared',
      required: terrainRequired,
      satisfied: terrainRuntimeCollisionDeclared,
      evidence: {
        runtimeActorId: terrainRuntimeActorId,
        manifestUrl: getTerrainManifestUrl(level, options),
      },
      blocker: `Required terrain actor "${terrainRuntimeActorId}" has no runtime collision manifest.`,
    }),
  ]
  const publishBlockers = publishGates.flatMap(gate => gate.blockers)
  const runtimeGateIds = [...LEVEL_RUNTIME_ACTIVATION_GATE_IDS]

  return {
    schemaVersion: 2,
    levelId: levelId || '*',
    publish: {
      ready: publishBlockers.length === 0,
      gates: publishGates,
      blockers: publishBlockers,
    },
    runtime: {
      activationRequired: true,
      requiredGateIds: runtimeGateIds,
      requiredRenderActorIds,
      requiredCollisionActorIds,
      requiredAssetUrls,
      requiredColliderUrls,
      requiredInitialCellKeys,
      requiredTerrain: terrainRequired,
      terrainManifestUrl: getTerrainManifestUrl(level, options),
    },
    spawn: {
      player: isFiniteVec3(level?.spawn?.player)
        ? level.spawn.player
        : [0, 0, 0],
      valid: spawnValid,
      runtimeActorId: spawnRuntimeActorId,
      satisfiedByRuntimeSystem: isSatisfiedByRuntimeSystem(
        level,
        spawnRuntimeActorId,
        terrainRuntimeCollision,
      ),
    },
    terrain: {
      runtimeActorId: terrainRuntimeActorId,
      runtimeCollision: terrainRuntimeCollision,
      satisfiedByRuntimeSystem: isSatisfiedByRuntimeSystem(
        level,
        terrainRuntimeActorId,
        terrainRuntimeCollision,
      ),
    },
    requiredActorIds,
    requiredWalkableActorIds,
    runtimeAssetUrls,
    missingRequiredActorIds,
    missingRequiredRenderActorIds,
    missingRequiredCollisionActorIds,
    missingRequiredWalkableActorIds,
  }
}

export function evaluateLevelRuntimeActivation(contract, state = {}) {
  const requiredAssetUrls = toStringArray(contract?.runtime?.requiredAssetUrls)
  const requiredRenderActorIds = toStringArray(
    contract?.runtime?.requiredRenderActorIds,
  )
  const requiredCollisionActorIds = toStringArray(
    contract?.runtime?.requiredCollisionActorIds,
  )
  const requiredInitialCellKeys = toStringArray(
    contract?.runtime?.requiredInitialCellKeys,
  )
  const requiredColliderUrls = toStringArray(
    contract?.runtime?.requiredColliderUrls,
  )
  const terrainRequired = Boolean(
    contract?.runtime?.requiredTerrain ??
      requiredCollisionActorIds.includes(contract?.terrain?.runtimeActorId),
  )
  const terrainActorId = contract?.terrain?.runtimeActorId

  const renderAssetsLoaded = Boolean(
    state.requiredRenderAssetsLoaded ??
      allRequiredStringsPresent(requiredAssetUrls, state.loadedAssetUrls),
  )
  const renderActorsMounted = Boolean(
    state.requiredRenderActorsMounted ??
      allRequiredStringsPresent(
        requiredRenderActorIds,
        state.mountedRenderActorIds,
      ),
  )
  const terrainCollisionMounted = Boolean(state.terrainCollisionMounted)
  const collisionActorIdsForRuntime = requiredCollisionActorIds.filter(
    actorId => actorId !== terrainActorId,
  )
  const collisionActorsMounted = Boolean(
    state.requiredCollisionMounted ??
      (allRequiredStringsPresent(
        collisionActorIdsForRuntime,
        state.mountedCollisionActorIds,
      ) &&
        (!terrainRequired || terrainCollisionMounted)),
  )
  const activeInitialCellKeys = toStringArray(state.activeInitialCellKeys)
  const readyInitialCellKeys = toStringArray(state.readyInitialCellKeys)
  const failedInitialCellKeys = toStringArray(state.failedInitialCellKeys)
  const observedInitialCellKeys = uniqueStrings([
    ...activeInitialCellKeys,
    ...readyInitialCellKeys,
  ])
  const failedRequiredInitialCellKeys = requiredInitialCellKeys.filter(
    cellKey => failedInitialCellKeys.includes(cellKey),
  )
  const initialWorldPartitionCellsReady = Boolean(
    state.requiredInitialCellsActive ??
      (allRequiredStringsPresent(
        requiredInitialCellKeys,
        observedInitialCellKeys,
      ) &&
        failedRequiredInitialCellKeys.length === 0),
  )
  const colliderAssetsLoaded = Boolean(
    state.requiredColliderUrlsLoaded ??
      allRequiredStringsPresent(requiredColliderUrls, state.loadedColliderUrls),
  )

  const gates = [
    createGate({
      id: 'publish-contract-ready',
      label: 'Publish Contract Ready',
      satisfied: Boolean(contract?.publish?.ready ?? true),
      evidence: {
        blockers: toStringArray(contract?.publish?.blockers),
      },
      blocker: 'Level publish contract has unresolved blockers.',
    }),
    createGate({
      id: 'manifest-loaded',
      label: 'Manifest Loaded',
      satisfied: Boolean(state.manifestLoaded),
      blocker: 'Runtime scene manifest is not loaded.',
    }),
    createGate({
      id: 'required-render-assets-loaded',
      label: 'Required Render Assets Loaded',
      required: requiredAssetUrls.length > 0,
      satisfied: renderAssetsLoaded,
      evidence: { requiredAssetUrls },
      blocker: `${requiredAssetUrls.length} required render asset(s) are not loaded.`,
    }),
    createGate({
      id: 'required-render-actors-mounted',
      label: 'Required Render Actors Mounted',
      required: requiredRenderActorIds.length > 0,
      satisfied: renderActorsMounted,
      evidence: { requiredRenderActorIds },
      blocker: `${requiredRenderActorIds.length} required render actor(s) are not mounted.`,
    }),
    createGate({
      id: 'required-collision-mounted',
      label: 'Required Collision Mounted',
      required: requiredCollisionActorIds.length > 0,
      satisfied: collisionActorsMounted,
      evidence: { requiredCollisionActorIds },
      blocker: `${requiredCollisionActorIds.length} required collision actor(s) are not mounted.`,
    }),
    createGate({
      id: 'required-collider-assets-loaded',
      label: 'Required Collider Assets Loaded',
      required: requiredColliderUrls.length > 0,
      satisfied: colliderAssetsLoaded,
      evidence: { requiredColliderUrls },
      blocker: `${requiredColliderUrls.length} required collider asset(s) are not loaded.`,
    }),
    createGate({
      id: 'terrain-collision-mounted',
      label: 'Terrain Collision Mounted',
      required: terrainRequired,
      satisfied: terrainCollisionMounted,
      evidence: {
        runtimeActorId: terrainActorId,
        manifestUrl: contract?.runtime?.terrainManifestUrl,
      },
      blocker: `Required terrain collision "${terrainActorId}" is not mounted.`,
    }),
    createGate({
      id: 'required-initial-world-partition-cells-ready',
      label: 'Required Initial World Partition Cells Ready',
      required: requiredInitialCellKeys.length > 0,
      satisfied: initialWorldPartitionCellsReady,
      evidence: {
        requiredInitialCellKeys,
        activeInitialCellKeys,
        readyInitialCellKeys,
        failedInitialCellKeys,
        failedRequiredInitialCellKeys,
      },
      blocker: `${requiredInitialCellKeys.length} required initial world partition cell(s) are not ready.`,
    }),
    createGate({
      id: 'spawn-resolved',
      label: 'Spawn Resolved',
      satisfied: Boolean(state.spawnResolved),
      evidence: {
        runtimeActorId: contract?.spawn?.runtimeActorId,
        player: contract?.spawn?.player,
      },
      blocker: 'Runtime player spawn has not been resolved.',
    }),
    createGate({
      id: 'physics-world-ready',
      label: 'Physics World Ready',
      satisfied: Boolean(state.physicsWorldReady),
      blocker: 'Physics world is not ready.',
    }),
    createGate({
      id: 'player-body-ready',
      label: 'Player Body Ready',
      satisfied: Boolean(state.playerBodyReady),
      blocker: 'Player body is not ready.',
    }),
    createGate({
      id: 'gameplay-enabled',
      label: 'Gameplay Enabled',
      satisfied: Boolean(state.gameplayEnabled),
      blocker: 'Gameplay is not enabled.',
    }),
  ]
  assertGatesMatchDeclaredIds(gates)
  const blockers = gates.flatMap(gate => gate.blockers)

  return {
    levelId: contract?.levelId ?? '*',
    ready: blockers.length === 0,
    gates,
    blockers,
  }
}

function assertGatesMatchDeclaredIds(gates) {
  const actualIds = gates.map(gate => gate.id)
  const declaredIds = LEVEL_RUNTIME_ACTIVATION_GATE_IDS
  if (
    actualIds.length !== declaredIds.length ||
    actualIds.some((id, index) => id !== declaredIds[index])
  ) {
    throw new Error(
      `Runtime activation gate ids drifted from LEVEL_RUNTIME_ACTIVATION_GATE_IDS. Declared: [${declaredIds.join(', ')}]. Actual: [${actualIds.join(', ')}].`,
    )
  }
}
