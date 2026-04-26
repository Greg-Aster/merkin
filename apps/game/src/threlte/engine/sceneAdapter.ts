import type {
  EditorNodeCollisionData,
  EditorSceneDocument,
  EditorSceneNode,
} from '../editor/editorTypes'
import { resolveCollisionPolicy } from './collisionPolicy'
import type {
  ActorDefinition,
  CollisionShape,
  LevelBuildReport,
  LevelDefinition,
  PhysicsBodyType,
  Vec3,
} from './types'

function getSpawn(scene: EditorSceneDocument): Vec3 {
  return scene.settings?.level?.spawn?.position ?? [0, 1, 0]
}

function getActorKind(node: EditorSceneNode): ActorDefinition['kind'] {
  if (node.light) return 'light'
  if (node.gameplay?.type === 'audio-region') return 'volume'
  return node.kind === 'group' ? 'empty' : node.kind
}

function getPhysicsBodyType(node: EditorSceneNode): PhysicsBodyType {
  return node.physics?.bodyType ?? 'fixed'
}

function toCollisionShape(
  shape: EditorNodeCollisionData['shape'],
): CollisionShape {
  return shape
}

function toActor(node: EditorSceneNode): {
  actor: ActorDefinition
  collisionSource: 'authored' | 'none'
  warning?: string
} {
  const collisionResult = resolveCollisionPolicy({
    actorId: node.id,
    actorKind:
      node.kind === 'asset' ||
      node.kind === 'primitive' ||
      node.kind === 'prefab' ||
      node.kind === 'light'
        ? node.kind
        : 'empty',
    visible: node.visible,
    hasGameplay: Boolean(node.gameplay),
    primitiveGeometry: node.primitive?.geometry,
    authoredCollision: node.collision
      ? {
          ...node.collision,
          shape: toCollisionShape(node.collision.shape),
        }
      : null,
  })

  const actor: ActorDefinition = {
    id: node.id,
    name: node.name,
    kind: getActorKind(node),
    parentId: node.parentId,
    transform: {
      position: node.position,
      rotation: node.rotation,
      scale: node.scale,
    },
    render:
      node.kind === 'primitive' || node.kind === 'asset' || node.kind === 'prefab'
        ? {
            visible: node.visible,
            primitive: node.primitive
              ? {
                  geometry: node.primitive.geometry,
                  args: node.primitive.args,
                }
              : undefined,
            asset: node.asset,
            prefab: node.prefab,
            material: node.material as Record<string, unknown> | undefined,
          }
        : undefined,
    physics: collisionResult.collision
      ? {
          bodyType: getPhysicsBodyType(node),
          collision: collisionResult.collision,
          gravityScale: node.physics?.gravityScale,
          canSleep: node.physics?.canSleep,
          ccd: node.physics?.ccd,
          linearDamping: node.physics?.linearDamping,
          angularDamping: node.physics?.angularDamping,
          lockRotations: node.physics?.lockRotations,
          lockTranslations: node.physics?.lockTranslations,
        }
      : undefined,
    light: node.light
      ? {
          color: node.light.color,
          intensity: node.light.intensity,
          distance: node.light.distance,
          decay: node.light.decay,
        }
      : undefined,
    gameplay: node.gameplay
      ? {
          type: node.gameplay.type,
          data: node.gameplay as unknown as Record<string, unknown>,
        }
      : undefined,
    interaction: node.gameplay
      ? {
          kind:
            node.gameplay.type === 'portal'
              ? 'portal'
              : node.gameplay.type === 'note'
                ? 'note'
                : node.gameplay.type === 'firefly'
                  ? 'conversation'
                  : 'custom',
          targetId: node.gameplay.targetLevelId,
          data: node.gameplay as unknown as Record<string, unknown>,
        }
      : undefined,
    audioRegion:
      node.gameplay?.type === 'audio-region' && node.gameplay.audioTrack
        ? {
            track: node.gameplay.audioTrack,
            volume: node.gameplay.audioVolume ?? 1,
            falloff: node.gameplay.regionFalloff,
          }
        : undefined,
    editor: {
      legacyKind: node.kind,
      locked: node.locked,
      generation: node.generation,
      collisionSource: collisionResult.source,
    },
  }

  return {
    actor,
    collisionSource: collisionResult.source,
    warning: collisionResult.warning,
  }
}

export function adaptEditorSceneToLevelDefinition(
  scene: EditorSceneDocument,
): LevelDefinition {
  return {
    id: scene.levelId,
    version: scene.version,
    updatedAt: scene.updatedAt,
    spawn: {
      player: getSpawn(scene),
    },
    settings: scene.settings as Record<string, unknown>,
    actors: scene.nodes.map(node => toActor(node).actor),
  }
}

export function createLevelBuildReport(
  level: LevelDefinition,
): LevelBuildReport {
  const warnings: string[] = []
  let trimeshActorCount = 0
  let physicsActorCount = 0

  for (const actor of level.actors) {
    if (!actor.physics) continue
    physicsActorCount += 1
    if (actor.physics.collision.shape === 'trimesh') {
      trimeshActorCount += 1
    }
  }

  return {
    levelId: level.id,
    actorCount: level.actors.length,
    physicsActorCount,
    trimeshActorCount,
    warnings,
  }
}
