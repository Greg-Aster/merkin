import {
  isCollisionChannel,
  resolveCollisionChannel,
} from './collisionChannels'
import { getLevelRuntimeContract } from './levelContracts'
import type {
  ActorDefinition,
  LevelBuildReport,
  LevelDefinition,
  Vec3,
} from './types'

function isFiniteVec3(value: Vec3): boolean {
  return value.every(component => Number.isFinite(component))
}

function isVisualOnlyActor(actor: ActorDefinition): boolean {
  return actor.editor?.collisionSource === 'none' && !actor.physics
}

function isDefaultCollisionActor(actor: ActorDefinition): boolean {
  return actor.editor?.collisionSource === 'default'
}

function isWalkableActor(actor: ActorDefinition): boolean {
  return actor.physics?.collision.intent === 'walkable'
}

function getRequiredActorError(actorId: string, reason: string) {
  return `Required actor "${actorId}" ${reason}.`
}

function hasBakedTerrainRuntime(level: LevelDefinition) {
  const terrain = (level.settings as any)?.level?.collision?.terrain
  return (
    terrain?.source === 'baked-heightmap' &&
    typeof terrain.manifestUrl === 'string'
  )
}

function getGroundContract(level: LevelDefinition) {
  return (level.settings as any)?.level?.ground
}

function validateGroundContract(
  level: LevelDefinition,
  actorsById: Map<string, ActorDefinition>,
  errors: string[],
) {
  const ground = getGroundContract(level)
  const terrain = (level.settings as any)?.level?.collision?.terrain
  if (!ground) {
    errors.push(
      `${level.id}: settings.level.ground is required so visual ground and collision ownership are explicit.`,
    )
    return
  }

  const mode = ground.mode
  const visualSource = ground.visualSource
  const collisionSource = ground.collisionSource
  const groundActorIds = Array.isArray(ground.groundActorIds)
    ? ground.groundActorIds.filter((actorId: unknown): actorId is string =>
        typeof actorId === 'string' && actorId.trim().length > 0,
      )
    : []

  if (
    !['terrain-chunks', 'authored-ground', 'hybrid', 'scene-authored'].includes(
      mode,
    )
  ) {
    errors.push(`${level.id}: ground.mode "${mode}" is invalid.`)
  }
  if (!['terrain-chunks', 'scene-actors', 'none'].includes(visualSource)) {
    errors.push(
      `${level.id}: ground.visualSource "${visualSource}" is invalid.`,
    )
  }
  if (!['baked-heightfield', 'scene-colliders'].includes(collisionSource)) {
    errors.push(
      `${level.id}: ground.collisionSource "${collisionSource}" is invalid.`,
    )
  }

  if (mode === 'terrain-chunks' && visualSource !== 'terrain-chunks') {
    errors.push(`${level.id}: terrain-chunks ground must render terrain chunks.`)
  }
  if (mode === 'authored-ground' && visualSource !== 'scene-actors') {
    errors.push(`${level.id}: authored-ground mode must render scene actors.`)
  }
  if (mode === 'scene-authored' && collisionSource !== 'scene-colliders') {
    errors.push(
      `${level.id}: scene-authored ground must use scene collider collision.`,
    )
  }
  if (
    mode !== 'hybrid' &&
    visualSource === 'terrain-chunks' &&
    groundActorIds.length > 0
  ) {
    errors.push(
      `${level.id}: groundActorIds cannot be combined with terrain chunk visuals unless ground.mode is hybrid.`,
    )
  }

  if (visualSource === 'scene-actors') {
    if (groundActorIds.length === 0) {
      errors.push(
        `${level.id}: scene-actor ground visuals require ground.groundActorIds.`,
      )
    }

    for (const actorId of groundActorIds) {
      const actor = actorsById.get(actorId)
      if (!actor) {
        errors.push(`${level.id}: ground actor "${actorId}" is missing.`)
      } else if (actor.render?.visible === false) {
        errors.push(`${level.id}: ground actor "${actorId}" is not visible.`)
      } else if (!actor.render && actor.kind !== 'empty') {
        errors.push(`${level.id}: ground actor "${actorId}" has no render.`)
      }
    }
  }

  if (collisionSource === 'baked-heightfield') {
    if (!hasBakedTerrainRuntime(level)) {
      errors.push(
        `${level.id}: baked-heightfield ground collision requires settings.level.collision.terrain.source=baked-heightmap and a manifestUrl.`,
      )
    }
    if (
      typeof ground.terrainManifestUrl === 'string' &&
      terrain?.manifestUrl &&
      ground.terrainManifestUrl !== terrain.manifestUrl
    ) {
      errors.push(
        `${level.id}: ground.terrainManifestUrl must match collision.terrain.manifestUrl.`,
      )
    }
  }
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

export function createLevelBuildReport(
  level: LevelDefinition,
): LevelBuildReport {
  const contract = getLevelRuntimeContract(level.id)
  const authoredRuntimeContract = getAuthoredRuntimeAssetContract(level)
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

    if (actor.render?.asset?.url) {
      runtimeAssetUrls.add(actor.render.asset.url)
    }

    if (actor.kind === 'asset' && !actor.render?.asset?.url) {
      errors.push(`Asset actor "${actor.id}" is missing a runtime asset URL.`)
    }

    if (isDefaultCollisionActor(actor)) {
      defaultCollisionActorCount += 1
    }

    if (isVisualOnlyActor(actor)) {
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
    }
  }

  validateGroundContract(level, actorsById, errors)

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

    if (!actor.render?.asset?.url) {
      errors.push(getRequiredActorError(actorId, 'has no runtime asset URL'))
    } else {
      requiredAssetUrls.add(actor.render.asset.url)
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
    errors,
    warnings,
  }
}
