import { getColliderUrlConventionError } from './collisionAuthoring'
import {
  isCollisionChannel,
  resolveCollisionChannel,
} from './collisionChannels'
import { validateLevelGroundContract } from './groundContract'
import { getLevelRuntimeContract } from './levelContracts'
import { getRuntimePrefabAssetUrl } from './runtimePrefabRegistry'
import type {
  ActorDefinition,
  LevelBuildReport,
  LevelDefinition,
  PrimitiveGeometryKind,
  Vec3,
} from './types'

const MIN_COLLIDER_SIZE = 0.05
const SPAWN_SUPPORT_XZ_PADDING = 0.15
const SPAWN_SUPPORT_MAX_DROP = 2
const SPAWN_SUPPORT_MAX_PENETRATION = 0.25
const DEFAULT_MAX_WALKABLE_SLOPE_DEGREES = 50
const DEG_TO_RAD = Math.PI / 180

function isFiniteVec3(value: Vec3): boolean {
  return value.every(component => Number.isFinite(component))
}

function isFiniteVec3Value(value: unknown): value is Vec3 {
  return (
    Array.isArray(value) &&
    value.length === 3 &&
    value.every(component => Number.isFinite(component))
  )
}

function clampColliderSize(value: number | undefined) {
  const size = Math.abs(Number(value ?? 1))
  return Number.isFinite(size) ? Math.max(MIN_COLLIDER_SIZE, size) : 1
}

function getPrimitiveVisualSize(input: {
  geometry?: PrimitiveGeometryKind
  args?: number[]
  scale: Vec3
}): Vec3 {
  const { geometry, args = [], scale } = input

  if (geometry === 'box') {
    const [width = 1, height = 1, depth = 1] = args
    return [
      clampColliderSize(width * scale[0]),
      clampColliderSize(height * scale[1]),
      clampColliderSize(depth * scale[2]),
    ]
  }

  if (geometry === 'cylinder') {
    const [radiusTop = 0.5, radiusBottom = 0.5, height = 1] = args
    const radius = Math.max(Math.abs(radiusTop), Math.abs(radiusBottom))
    return [
      clampColliderSize(radius * 2 * scale[0]),
      clampColliderSize(height * scale[1]),
      clampColliderSize(radius * 2 * scale[2]),
    ]
  }

  if (
    geometry &&
    ['octahedron', 'tetrahedron', 'icosahedron', 'dodecahedron'].includes(
      geometry,
    )
  ) {
    const [radius = 0.5] = args
    return [
      clampColliderSize(radius * 2 * scale[0]),
      clampColliderSize(radius * 2 * scale[1]),
      clampColliderSize(radius * 2 * scale[2]),
    ]
  }

  if (geometry === 'torus') {
    const [radius = 0.5, tube = 0.2] = args
    const outerRadius = Math.abs(radius) + Math.abs(tube)
    return [
      clampColliderSize(outerRadius * 2 * scale[0]),
      clampColliderSize(Math.abs(tube) * 2 * scale[1]),
      clampColliderSize(outerRadius * 2 * scale[2]),
    ]
  }

  return [
    clampColliderSize(scale[0]),
    clampColliderSize(scale[1]),
    clampColliderSize(scale[2]),
  ]
}

function isWalkableActor(actor: ActorDefinition): boolean {
  return actor.physics?.collision.intent === 'walkable'
}

function getMaxWalkableSlopeRadians(level: LevelDefinition) {
  const policy = (level.settings as any)?.level?.collision?.walkability
  const degrees = Number(policy?.maxSlopeDegrees)
  const resolvedDegrees = Number.isFinite(degrees)
    ? degrees
    : DEFAULT_MAX_WALKABLE_SLOPE_DEGREES
  return Math.max(0, Math.min(89, resolvedDegrees)) * DEG_TO_RAD
}

function getWalkabilitySamples(level: LevelDefinition) {
  const configuredSamples = (level.settings as any)?.level?.collision
    ?.walkability?.samples
  const samples = [
    {
      id: 'player-spawn',
      position: level.spawn.player,
    },
  ]

  if (Array.isArray(configuredSamples)) {
    for (const [index, sample] of configuredSamples.entries()) {
      if (!isFiniteVec3Value(sample?.position)) continue
      samples.push({
        id:
          typeof sample.id === 'string' && sample.id.trim()
            ? sample.id.trim()
            : `sample-${index}`,
        position: sample.position,
      })
    }
  }

  return samples
}

function getActorColliderWorldSize(actor: ActorDefinition): Vec3 {
  const authoredSize = actor.physics?.collision.size
  if (isFiniteVec3Value(authoredSize)) return authoredSize

  return getPrimitiveVisualSize({
    geometry: actor.render?.primitive?.geometry,
    args: actor.render?.primitive?.args,
    scale: actor.transform.scale,
  })
}

function actorSupportsWalkabilitySample(
  actor: ActorDefinition,
  samplePosition: Vec3,
) {
  const collision = actor.physics?.collision
  if (!collision || collision.sensor || collision.intent !== 'walkable') {
    return false
  }
  if (collision.shape === 'trimesh') return false

  const [x, y, z] = samplePosition
  const [width, height, depth] = getActorColliderWorldSize(actor)
  const [actorX, actorY, actorZ] = actor.transform.position
  const halfWidth = width / 2 + SPAWN_SUPPORT_XZ_PADDING
  const halfDepth = depth / 2 + SPAWN_SUPPORT_XZ_PADDING
  const topY = actorY + height / 2

  if (collision.shape === 'cylinder') {
    const normalizedX = (x - actorX) / halfWidth
    const normalizedZ = (z - actorZ) / halfDepth
    if (normalizedX * normalizedX + normalizedZ * normalizedZ > 1) {
      return false
    }
  } else if (
    Math.abs(x - actorX) > halfWidth ||
    Math.abs(z - actorZ) > halfDepth
  ) {
    return false
  }

  return (
    y >= topY - SPAWN_SUPPORT_MAX_PENETRATION &&
    y <= topY + SPAWN_SUPPORT_MAX_DROP
  )
}

function getWalkabilityContractIssues(
  level: LevelDefinition,
  actors: ActorDefinition[],
) {
  const errors: string[] = []
  const warnings: string[] = []
  const walkableActors = actors.filter(isWalkableActor)
  const maxSlopeRadians = getMaxWalkableSlopeRadians(level)

  for (const actor of walkableActors) {
    const [pitch, , roll] = actor.transform.rotation
    const steepestAxis = Math.max(Math.abs(pitch), Math.abs(roll))
    if (steepestAxis > maxSlopeRadians) {
      errors.push(
        `Walkable actor "${actor.id}" exceeds max slope ${Math.round(maxSlopeRadians / DEG_TO_RAD)}deg.`,
      )
    }
  }

  for (const sample of getWalkabilitySamples(level)) {
    if (!isFiniteVec3Value(sample.position)) continue
    const supportingActor = walkableActors.find(actor =>
      actorSupportsWalkabilitySample(actor, sample.position),
    )
    if (!supportingActor) {
      if (hasBakedTerrainRuntime(level)) {
        warnings.push(
          `Walkability sample "${sample.id}" is not supported by an authored primitive walkable collider; baked terrain collision must cover it at runtime.`,
        )
      } else {
        errors.push(
          `Walkability sample "${sample.id}" does not land on authored walkable collision.`,
        )
      }
    }
  }

  return { errors, warnings }
}

function hasAuthoredColliderAsset(actor: ActorDefinition): boolean {
  return String(actor.physics?.collision.colliderUrl ?? '').trim().length > 0
}

function getActorRuntimeAssetUrl(actor: ActorDefinition): string {
  const assetUrl = actor.render?.asset?.url
  if (assetUrl) return assetUrl

  return getRuntimePrefabAssetUrl(
    actor.render?.prefab?.type,
    actor.render?.prefab?.variant,
  )
}

function getRequiredActorError(actorId: string, reason: string) {
  return `Required actor "${actorId}" ${reason}.`
}

function hasBakedTerrainRuntime(level: LevelDefinition) {
  const terrain = (level.settings as any)?.level?.collision?.terrain
  const ground = (level.settings as any)?.level?.ground
  return (
    (terrain?.source === 'baked-heightmap' &&
      typeof terrain.manifestUrl === 'string') ||
    (ground?.collisionSource === 'baked-heightfield' &&
      typeof ground.terrainManifestUrl === 'string')
  )
}

function isTerrainRuntimeActorId(level: LevelDefinition, actorId: string) {
  return actorId === `${level.id}-terrain`
}

function isSpawnRuntimeActorId(level: LevelDefinition, actorId: string) {
  return actorId === `${level.id}-player-spawn`
}

function isSatisfiedByRuntimeSystem(level: LevelDefinition, actorId: string) {
  if (
    isTerrainRuntimeActorId(level, actorId) &&
    hasBakedTerrainRuntime(level)
  ) {
    return true
  }
  if (
    isSpawnRuntimeActorId(level, actorId) &&
    isFiniteVec3(level.spawn.player)
  ) {
    return true
  }
  return false
}

function getAuthoredRuntimeAssetContract(level: LevelDefinition) {
  const runtimeAssets = (level.settings as any)?.level?.runtimeAssets
  const toStringArray = (value: unknown) =>
    Array.isArray(value)
      ? value.filter((item): item is string => typeof item === 'string')
      : []

  return {
    requiredActorIds: toStringArray(runtimeAssets?.requiredActorIds),
    requiredAssetActorIds: [
      ...toStringArray(runtimeAssets?.requiredRenderActorIds),
      ...toStringArray(runtimeAssets?.requiredAssetActorIds),
    ],
  }
}

function uniqueStrings(values: string[]) {
  return [...new Set(values)]
}

function getCollisionDiagnostics(level: LevelDefinition) {
  const actorsById = new Map(level.actors.map(actor => [actor.id, actor]))
  const roleSettings = (level.settings as any)?.level?.collision?.roles
  const visualOnlyActorIds = new Set<string>(
    Array.isArray(roleSettings?.visualOnlyActorIds)
      ? roleSettings.visualOnlyActorIds.filter(
          (actorId: unknown): actorId is string => typeof actorId === 'string',
        )
      : [],
  )

  return {
    authoredActorIds: level.actors
      .filter(actor => Boolean(actor.physics))
      .filter(actor => !visualOnlyActorIds.has(actor.id))
      .map(actor => actor.id)
      .sort(),
    defaultActorIds: [] as string[],
    visualOnlyActorIds: [...visualOnlyActorIds]
      .filter(actorId => actorsById.has(actorId))
      .sort(),
  }
}

export function createLevelBuildReport(
  level: LevelDefinition,
): LevelBuildReport {
  const contract = getLevelRuntimeContract(level.id)
  const authoredRuntimeContract = getAuthoredRuntimeAssetContract(level)
  const collisionDiagnostics = getCollisionDiagnostics(level)
  const defaultCollisionActorIds = new Set(collisionDiagnostics.defaultActorIds)
  const visualOnlyActorIds = new Set(collisionDiagnostics.visualOnlyActorIds)
  const requiredActorIds = uniqueStrings([
    ...contract.requiredActorIds,
    ...authoredRuntimeContract.requiredActorIds,
  ])
  const requiredAssetActorIds = uniqueStrings([
    ...contract.requiredAssetActorIds,
    ...authoredRuntimeContract.requiredAssetActorIds,
  ])
  const warnings: string[] = []
  const errors: string[] = []
  const actorIds = new Set<string>()
  const duplicateActorIds = new Set<string>()
  const actorsById = new Map<string, ActorDefinition>()
  const runtimeAssetUrls = new Set<string>()
  const requiredAssetUrls = new Set<string>()
  let assetActorCount = 0
  let primitiveActorCount = 0
  let neverCullActorCount = 0
  let gameplayFireflyActorCount = 0
  let defaultCollisionActorCount = 0
  let physicsActorCount = 0
  let trimeshActorCount = 0
  let detailMeshActorCount = 0
  let visualOnlyActorCount = 0

  if (!isFiniteVec3(level.spawn.player)) {
    errors.push('Player spawn must be a finite Vec3.')
  }

  for (const actor of level.actors) {
    if (actorIds.has(actor.id)) {
      duplicateActorIds.add(actor.id)
    }

    actorIds.add(actor.id)
    actorsById.set(actor.id, actor)

    if (actor.kind === 'asset') {
      assetActorCount += 1
    }
    if (actor.kind === 'primitive') {
      primitiveActorCount += 1
    }
    if (actor.render?.cullingPolicy === 'never') {
      neverCullActorCount += 1
    }
    if (actor.gameplay?.type === 'firefly') {
      gameplayFireflyActorCount += 1
    }

    const runtimeAssetUrl = getActorRuntimeAssetUrl(actor)
    if (runtimeAssetUrl) {
      runtimeAssetUrls.add(runtimeAssetUrl)
    }

    if (actor.kind === 'asset' && !actor.render?.asset?.url) {
      errors.push(`Asset actor "${actor.id}" is missing a runtime asset URL.`)
    }

    if (defaultCollisionActorIds.has(actor.id)) {
      defaultCollisionActorCount += 1
    }

    if (visualOnlyActorIds.has(actor.id) || (!actor.physics && actor.render)) {
      visualOnlyActorCount += 1
    }

    if (!actor.physics) continue

    physicsActorCount += 1
    if (!isCollisionChannel(actor.physics.collision.channel)) {
      errors.push(`Actor "${actor.id}" has an invalid collision channel.`)
    }
    const resolvedChannel = resolveCollisionChannel({
      intent: actor.physics.collision.intent,
      bodyType: actor.physics.bodyType,
      authoredChannel: actor.physics.collision.channel,
    })
    if (actor.physics.collision.channel !== resolvedChannel) {
      errors.push(
        `Actor "${actor.id}" collision channel "${actor.physics.collision.channel}" does not match intent "${actor.physics.collision.intent}".`,
      )
    }
    if (actor.physics.collision.intent === 'detailMesh') {
      detailMeshActorCount += 1
      if (actor.physics.collision.triangleBudget === undefined) {
        errors.push(
          `Detail mesh actor "${actor.id}" has no explicit triangle budget.`,
        )
      }
    }
    if (actor.physics.collision.shape === 'trimesh') {
      trimeshActorCount += 1
      if (actor.physics.collision.triangleBudget === undefined) {
        errors.push(
          `Trimesh actor "${actor.id}" has no explicit triangle budget.`,
        )
      }
      if (actor.kind === 'asset' && !hasAuthoredColliderAsset(actor)) {
        errors.push(
          `Trimesh asset actor "${actor.id}" must use collision.colliderUrl instead of deriving collision from the render mesh.`,
        )
      } else if (actor.kind === 'asset') {
        const conventionError = getColliderUrlConventionError(
          actor.physics.collision.colliderUrl,
        )
        if (conventionError) {
          errors.push(`Trimesh asset actor "${actor.id}" ${conventionError}`)
        }
      }
    }
  }

  errors.push(...validateLevelGroundContract(level, actorsById))

  for (const actorId of duplicateActorIds) {
    errors.push(`Duplicate actor id "${actorId}" found in level definition.`)
  }

  const missingRequiredActorIds = requiredActorIds.filter(
    actorId =>
      !actorsById.has(actorId) && !isSatisfiedByRuntimeSystem(level, actorId),
  )

  for (const actorId of missingRequiredActorIds) {
    errors.push(getRequiredActorError(actorId, 'is missing'))
  }

  for (const actorId of requiredAssetActorIds) {
    const actor = actorsById.get(actorId)
    if (!actor) {
      errors.push(getRequiredActorError(actorId, 'is missing'))
      continue
    }

    if (actor.render?.visible === false) {
      errors.push(getRequiredActorError(actorId, 'is not visible'))
    }

    const runtimeAssetUrl = getActorRuntimeAssetUrl(actor)
    if (!runtimeAssetUrl) {
      errors.push(getRequiredActorError(actorId, 'has no runtime asset URL'))
    } else {
      requiredAssetUrls.add(runtimeAssetUrl)
    }
  }

  for (const actorId of contract.requiredWalkableActorIds) {
    const actor = actorsById.get(actorId)
    if (
      !actor &&
      isTerrainRuntimeActorId(level, actorId) &&
      hasBakedTerrainRuntime(level)
    ) {
      continue
    }
    if (!actor) continue

    if (!isWalkableActor(actor)) {
      errors.push(getRequiredActorError(actorId, 'is not walkable collision'))
    }
  }

  const walkabilityIssues = getWalkabilityContractIssues(level, level.actors)
  errors.push(...walkabilityIssues.errors)
  warnings.push(...walkabilityIssues.warnings)

  if (defaultCollisionActorCount > contract.maxDefaultCollisionActors) {
    errors.push(
      `${defaultCollisionActorCount} actors are using implicit default collision; contract allows ${contract.maxDefaultCollisionActors}.`,
    )
  }

  if (trimeshActorCount > contract.maxTrimeshActors) {
    errors.push(
      `${trimeshActorCount} actors are using trimesh collision; contract allows ${contract.maxTrimeshActors}.`,
    )
  }

  if (runtimeAssetUrls.size > contract.maxRuntimeAssetCount) {
    errors.push(
      `${runtimeAssetUrls.size} runtime assets exceed contract budget of ${contract.maxRuntimeAssetCount}.`,
    )
  }

  if (primitiveActorCount > contract.maxPrimitiveActorCount) {
    errors.push(
      `${primitiveActorCount} primitive render actors exceed contract budget of ${contract.maxPrimitiveActorCount}. Bake repeated primitives into runtime assets or chunks.`,
    )
  }

  if (neverCullActorCount > contract.maxNeverCullActorCount) {
    errors.push(
      `${neverCullActorCount} never-cull render actors exceed contract budget of ${contract.maxNeverCullActorCount}.`,
    )
  }

  if (gameplayFireflyActorCount > contract.maxGameplayFireflyCount) {
    errors.push(
      `${gameplayFireflyActorCount} firefly gameplay actors exceed contract budget of ${contract.maxGameplayFireflyCount}. Use chunked/pooled marker presentation.`,
    )
  }

  return {
    levelId: level.id,
    actorCount: level.actors.length,
    assetActorCount,
    primitiveActorCount,
    neverCullActorCount,
    gameplayFireflyActorCount,
    physicsActorCount,
    trimeshActorCount,
    detailMeshActorCount,
    defaultCollisionActorCount,
    visualOnlyActorCount,
    requiredActorCount: requiredActorIds.length,
    requiredRenderActorIds: requiredAssetActorIds,
    missingRequiredActorIds,
    requiredAssetUrls: [...requiredAssetUrls].sort(),
    runtimeAssetUrls: [...runtimeAssetUrls].sort(),
    collisionDiagnostics,
    errors,
    warnings,
  }
}
