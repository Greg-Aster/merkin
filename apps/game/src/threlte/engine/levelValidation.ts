import { getColliderUrlConventionError } from './collisionAuthoring'
import {
  describeCollisionPolicyIssue,
  getCollisionPolicyIssues,
} from './collisionPolicyIssues'
import { actorSupportsWalkabilitySample } from './collisionSpatialQueries'
import type { WalkableSupportOptions } from './collisionSpatialQueries'
import {
  getTerrainAuthorityDiagnostics,
  validateLevelGroundContract,
} from './groundContract'
import { getLevelRuntimeContract } from './levelContracts'
import {
  createLevelRuntimeReadinessContract,
  getActorRuntimeAssetUrl,
} from './levelRuntimeReadinessContract'
import { validateNpcLevelContract } from './npcValidation'
import { hasTerrainRuntimeCollision } from './terrainRuntimeCollision'
import type {
  ActorDefinition,
  CollisionClassification,
  CollisionComponent,
  LevelBuildReport,
  LevelDefinition,
  Vec3,
} from './types'

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

function getWalkableSupportOptions(level: LevelDefinition) {
  const policy = (level.settings as any)?.level?.collision?.walkability
  return {
    xzPadding: policy?.supportXzPadding,
    maxDrop: policy?.supportMaxDrop,
    maxPenetration: policy?.supportMaxPenetration,
  } satisfies WalkableSupportOptions
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

function getWalkabilityContractIssues(
  level: LevelDefinition,
  actors: ActorDefinition[],
) {
  const errors: string[] = []
  const warnings: string[] = []
  const walkableActors = actors.filter(isWalkableActor)
  const maxSlopeRadians = getMaxWalkableSlopeRadians(level)
  const supportOptions = getWalkableSupportOptions(level)

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
      actorSupportsWalkabilitySample(actor, sample.position, supportOptions),
    )
    if (!supportingActor) {
      if (hasTerrainRuntimeCollision(level)) {
        warnings.push(
          `Walkability sample "${sample.id}" is not supported by an authored primitive walkable collider; runtime terrain collision must cover it.`,
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

function getMaxFireflyNpcCount(
  level: LevelDefinition,
  contract: ReturnType<typeof getLevelRuntimeContract>,
) {
  const authoredBudget = (level.settings as any)?.level?.graphicsBudget
    ?.maxGameplayFireflies
  if (Number.isFinite(authoredBudget)) return authoredBudget

  return contract.maxFireflyNpcCount
}

function hasAuthoredColliderAsset(actor: ActorDefinition): boolean {
  return String(actor.physics?.collision.colliderUrl ?? '').trim().length > 0
}

function hasAuthoredColliderMetadata(actor: ActorDefinition): boolean {
  return (
    String(actor.physics?.collision.colliderMetadataUrl ?? '').trim().length >
      0 || Boolean(actor.physics?.collision.assetLocalTransform)
  )
}

const meshDerivedCollisionQualities = new Set([
  'convexHull',
  'simplifiedMesh',
  'trimesh',
])

function isMeshDerivedCollision(
  collision: CollisionComponent | undefined,
): boolean {
  const quality = collision?.quality
  return Boolean(
    collision?.generatedProduct ||
      (quality !== undefined && meshDerivedCollisionQualities.has(quality)),
  )
}

function hasMeshDerivedCollisionProduct(actor: ActorDefinition): boolean {
  return Boolean(actor.physics?.collision.generatedProduct)
}

function getCollisionTriangleBudget(
  collision: CollisionComponent,
): number | undefined {
  return collision.triangleBudget ?? collision.generatedProduct?.triangleBudget
}

function requiresExplicitTriangleBudget(
  collision: CollisionComponent,
): boolean {
  return (
    collision.intent === 'detailMesh' ||
    collision.quality === 'trimesh' ||
    !isMeshDerivedCollision(collision)
  )
}

function getRequiredActorError(actorId: string, reason: string) {
  return `Required actor "${actorId}" ${reason}.`
}

function isTerrainRuntimeActorId(level: LevelDefinition, actorId: string) {
  return actorId === `${level.id}-terrain`
}

export function requiresExplicitCollisionClassification(
  level: Pick<LevelDefinition, 'settings'>,
) {
  const collisionSettings = (level.settings as any)?.level?.collision
  return (
    collisionSettings?.review?.requireExplicitClassification === true ||
    collisionSettings?.defaults?.primitiveCollisionByDefault === false
  )
}

function getActorCollisionClassification(
  actor: ActorDefinition,
  visualOnlyActorIds: Set<string>,
): CollisionClassification | undefined {
  if (actor.collisionClassification) return actor.collisionClassification
  const hasVisibleRender = Boolean(
    actor.render && actor.render.visible !== false,
  )
  const hasCollision = Boolean(actor.physics?.collision)

  if (hasCollision) {
    return hasVisibleRender ? 'collidable' : 'collision-only-proxy'
  }
  if (!hasVisibleRender) return undefined
  if (visualOnlyActorIds.has(actor.id)) return 'visual-only'
  return 'missing-collision'
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
  const classifications = new Map(
    level.actors.map(actor => [
      actor.id,
      getActorCollisionClassification(actor, visualOnlyActorIds),
    ]),
  )

  return {
    authoredActorIds: level.actors
      .filter(actor => classifications.get(actor.id) === 'collidable')
      .map(actor => actor.id)
      .sort(),
    defaultActorIds: [] as string[],
    visualOnlyActorIds: [...visualOnlyActorIds]
      .filter(actorId => actorsById.has(actorId))
      .sort(),
    disabledActorIds: level.actors
      .filter(actor => classifications.get(actor.id) === 'disabled')
      .map(actor => actor.id)
      .sort(),
    missingCollisionActorIds: level.actors
      .filter(actor => classifications.get(actor.id) === 'missing-collision')
      .map(actor => actor.id)
      .sort(),
    collisionOnlyProxyActorIds: level.actors
      .filter(actor => classifications.get(actor.id) === 'collision-only-proxy')
      .map(actor => actor.id)
      .sort(),
    missingColliderMetadataActorIds: level.actors
      .filter(actor => actor.kind === 'asset')
      .filter(actor => actor.physics?.collision.shape === 'trimesh')
      .filter(actor => !visualOnlyActorIds.has(actor.id))
      .filter(actor => !hasMeshDerivedCollisionProduct(actor))
      .filter(actor => !hasAuthoredColliderMetadata(actor))
      .map(actor => actor.id)
      .sort(),
  }
}

export function createLevelBuildReport(
  level: LevelDefinition,
): LevelBuildReport {
  const contract = getLevelRuntimeContract(level.id)
  const runtimeReadinessContract = createLevelRuntimeReadinessContract(level)
  const collisionDiagnostics = getCollisionDiagnostics(level)
  const defaultCollisionActorIds = new Set(collisionDiagnostics.defaultActorIds)
  const visualOnlyActorIds = new Set(collisionDiagnostics.visualOnlyActorIds)
  const requiredActorIds = runtimeReadinessContract.requiredActorIds
  const requiredRenderActorIds =
    runtimeReadinessContract.runtime.requiredRenderActorIds
  const warnings: string[] = []
  const errors: string[] = []
  const runtimeAssets = (level.settings as any)?.level?.runtimeAssets
  const actorIds = new Set<string>()
  const duplicateActorIds = new Set<string>()
  const actorsById = new Map<string, ActorDefinition>()
  let assetActorCount = 0
  let primitiveActorCount = 0
  let neverCullActorCount = 0
  let npcActorCount = 0
  let fireflyNpcActorCount = 0
  let defaultCollisionActorCount = 0
  let physicsActorCount = 0
  let trimeshActorCount = 0
  let detailMeshActorCount = 0
  let visualOnlyActorCount = 0

  if (!isFiniteVec3(level.spawn.player)) {
    errors.push('Player spawn must be a finite Vec3.')
  }
  if (Array.isArray(runtimeAssets?.requiredAssetActorIds)) {
    errors.push(
      'runtimeAssets.requiredAssetActorIds is no longer supported; use runtimeAssets.requiredRenderActorIds.',
    )
  }
  if (
    requiresExplicitCollisionClassification(level) &&
    collisionDiagnostics.missingCollisionActorIds.length > 0
  ) {
    errors.push(
      `Visible geometry must be classified as collidable, visual-only, or disabled before publish: ${collisionDiagnostics.missingCollisionActorIds.join(', ')}.`,
    )
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
    if (actor.kind === 'asset' && !actor.render?.asset?.url) {
      errors.push(`Asset actor "${actor.id}" is missing a runtime asset URL.`)
    }

    if (defaultCollisionActorIds.has(actor.id)) {
      defaultCollisionActorCount += 1
    }

    if (visualOnlyActorIds.has(actor.id)) {
      visualOnlyActorCount += 1
    }

    if (!actor.physics) continue

    physicsActorCount += 1
    if (
      actor.physics.collision.generationStatus === 'dirty' ||
      actor.physics.collision.generationStatus === 'generating' ||
      actor.physics.collision.generationStatus === 'failed'
    ) {
      errors.push(
        `Actor "${actor.id}" collision generation status is ${actor.physics.collision.generationStatus}${actor.physics.collision.generationLastError ? `: ${actor.physics.collision.generationLastError}` : ''}.`,
      )
    }
    for (const issue of getCollisionPolicyIssues({
      collision: actor.physics.collision,
      bodyType: actor.physics.bodyType,
    })) {
      errors.push(
        describeCollisionPolicyIssue(issue, {
          actorId: actor.id,
          actorName: actor.name,
          collision: actor.physics.collision,
        }).buildGateMessage,
      )
    }
    if (actor.physics.collision.intent === 'detailMesh') {
      detailMeshActorCount += 1
      if (getCollisionTriangleBudget(actor.physics.collision) === undefined) {
        errors.push(
          `Detail mesh actor "${actor.id}" has no explicit triangle budget.`,
        )
      }
    }
    if (actor.physics.collision.shape === 'trimesh') {
      trimeshActorCount += 1
      if (
        requiresExplicitTriangleBudget(actor.physics.collision) &&
        getCollisionTriangleBudget(actor.physics.collision) === undefined
      ) {
        errors.push(
          `Trimesh actor "${actor.id}" has no explicit triangle budget.`,
        )
      }
      if (
        actor.kind === 'asset' &&
        !hasAuthoredColliderAsset(actor) &&
        !hasMeshDerivedCollisionProduct(actor)
      ) {
        errors.push(
          `Trimesh asset actor "${actor.id}" must use collision.colliderUrl instead of deriving collision from the render mesh.`,
        )
      } else if (actor.kind === 'asset' && hasAuthoredColliderAsset(actor)) {
        const conventionError = getColliderUrlConventionError(
          actor.physics.collision.colliderUrl,
        )
        if (conventionError) {
          errors.push(`Trimesh asset actor "${actor.id}" ${conventionError}`)
        }
        if (!hasAuthoredColliderMetadata(actor)) {
          errors.push(
            `Trimesh asset actor "${actor.id}" must include collision.colliderMetadataUrl or inline asset-local transform metadata.`,
          )
        }
      }
    }
  }

  errors.push(...validateLevelGroundContract(level, actorsById))
  const terrainAuthorityDiagnostics = getTerrainAuthorityDiagnostics(level)
  errors.push(...terrainAuthorityDiagnostics.errors)
  warnings.push(...terrainAuthorityDiagnostics.warnings)

  for (const actorId of duplicateActorIds) {
    errors.push(`Duplicate actor id "${actorId}" found in level definition.`)
  }

  const missingRequiredActorIds =
    runtimeReadinessContract.missingRequiredActorIds
  const missingRequiredActorIdSet = new Set(missingRequiredActorIds)

  for (const actorId of missingRequiredActorIds) {
    errors.push(getRequiredActorError(actorId, 'is missing'))
  }

  for (const actorId of requiredRenderActorIds) {
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
    }
  }

  for (const actorId of runtimeReadinessContract.requiredWalkableActorIds) {
    const actor = actorsById.get(actorId)
    if (
      !actor &&
      isTerrainRuntimeActorId(level, actorId) &&
      hasTerrainRuntimeCollision(level)
    ) {
      continue
    }
    if (!actor) continue

    if (!isWalkableActor(actor)) {
      errors.push(getRequiredActorError(actorId, 'is not walkable collision'))
    }
  }

  for (const actorId of runtimeReadinessContract.missingRequiredWalkableActorIds) {
    if (missingRequiredActorIdSet.has(actorId)) continue
    errors.push(getRequiredActorError(actorId, 'is missing walkable collision'))
  }

  const walkabilityIssues = getWalkabilityContractIssues(level, level.actors)
  errors.push(...walkabilityIssues.errors)
  warnings.push(...walkabilityIssues.warnings)

  const npcReport = validateNpcLevelContract(level, {
    legacyFireflySeverity: 'error',
    maxFireflyNpcCount: getMaxFireflyNpcCount(level, contract),
  })
  npcActorCount = npcReport.diagnostics.npcActorCount
  fireflyNpcActorCount = npcReport.diagnostics.fireflyNpcActorCount
  errors.push(...npcReport.errors)
  warnings.push(...npcReport.warnings)

  if (defaultCollisionActorCount > contract.maxDefaultCollisionActors) {
    errors.push(
      `${defaultCollisionActorCount} actors are using implicit default collision; contract allows ${contract.maxDefaultCollisionActors}.`,
    )
  }

  if (trimeshActorCount > contract.maxTrimeshActors) {
    warnings.push(
      `${trimeshActorCount} actors are using trimesh collision; contract allows ${contract.maxTrimeshActors}.`,
    )
  }

  if (
    runtimeReadinessContract.runtimeAssetUrls.length >
    contract.maxRuntimeAssetCount
  ) {
    warnings.push(
      `${runtimeReadinessContract.runtimeAssetUrls.length} runtime assets exceed contract budget of ${contract.maxRuntimeAssetCount}.`,
    )
  }

  if (primitiveActorCount > contract.maxPrimitiveActorCount) {
    warnings.push(
      `${primitiveActorCount} primitive render actors exceed contract budget of ${contract.maxPrimitiveActorCount}. Bake repeated primitives into runtime assets or chunks.`,
    )
  }

  if (neverCullActorCount > contract.maxNeverCullActorCount) {
    warnings.push(
      `${neverCullActorCount} never-cull render actors exceed contract budget of ${contract.maxNeverCullActorCount}.`,
    )
  }

  return {
    levelId: level.id,
    actorCount: level.actors.length,
    assetActorCount,
    primitiveActorCount,
    neverCullActorCount,
    npcActorCount,
    fireflyNpcActorCount,
    physicsActorCount,
    trimeshActorCount,
    detailMeshActorCount,
    defaultCollisionActorCount,
    visualOnlyActorCount,
    requiredActorCount: requiredActorIds.length,
    missingRequiredActorIds,
    runtimeReadinessContract,
    collisionDiagnostics,
    errors,
    warnings,
  }
}
