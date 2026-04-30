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
  return terrain?.source === 'baked-heightmap' && typeof terrain.manifestUrl === 'string'
}

function isTerrainRuntimeActorId(level: LevelDefinition, actorId: string) {
  return actorId === `${level.id}-terrain`
}

function isSpawnRuntimeActorId(level: LevelDefinition, actorId: string) {
  return actorId === `${level.id}-player-spawn`
}

function isSatisfiedByRuntimeSystem(level: LevelDefinition, actorId: string) {
  if (isTerrainRuntimeActorId(level, actorId) && hasBakedTerrainRuntime(level)) {
    return true
  }
  if (isSpawnRuntimeActorId(level, actorId) && isFiniteVec3(level.spawn.player)) {
    return true
  }
  return false
}

export function createLevelBuildReport(
  level: LevelDefinition,
): LevelBuildReport {
  const contract = getLevelRuntimeContract(level.id)
  const warnings: string[] = []
  const errors: string[] = []
  const actorIds = new Set<string>()
  const duplicateActorIds = new Set<string>()
  const actorsById = new Map<string, ActorDefinition>()
  const runtimeAssetUrls = new Set<string>()
  const requiredAssetUrls = new Set<string>()
  let assetActorCount = 0
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

  for (const actorId of duplicateActorIds) {
    errors.push(`Duplicate actor id "${actorId}" found in level definition.`)
  }

  const missingRequiredActorIds = contract.requiredActorIds.filter(
    actorId =>
      !actorsById.has(actorId) && !isSatisfiedByRuntimeSystem(level, actorId),
  )

  for (const actorId of missingRequiredActorIds) {
    errors.push(getRequiredActorError(actorId, 'is missing'))
  }

  for (const actorId of contract.requiredAssetActorIds) {
    const actor = actorsById.get(actorId)
    if (!actor) continue

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
    if (!actor && isTerrainRuntimeActorId(level, actorId) && hasBakedTerrainRuntime(level)) {
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

  return {
    levelId: level.id,
    actorCount: level.actors.length,
    assetActorCount,
    physicsActorCount,
    trimeshActorCount,
    detailMeshActorCount,
    defaultCollisionActorCount,
    visualOnlyActorCount,
    requiredActorCount: contract.requiredActorIds.length,
    requiredRenderActorIds: [...contract.requiredAssetActorIds],
    missingRequiredActorIds,
    requiredAssetUrls: [...requiredAssetUrls].sort(),
    runtimeAssetUrls: [...runtimeAssetUrls].sort(),
    errors,
    warnings,
  }
}
