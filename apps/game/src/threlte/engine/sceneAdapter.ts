import type {
  EditorNodeCollisionData,
  EditorSceneDocument,
  EditorSceneNode,
} from '../editor/editorTypes'
import { resolveCollisionPolicy } from './collisionPolicy'
import type {
  ActorDefinition,
  CollisionShape,
  LevelDefinition,
  PhysicsBodyType,
  RenderCullingPolicy,
  RenderPhysicsAttachmentPolicy,
  Vec3,
} from './types'

function getSpawn(scene: EditorSceneDocument): Vec3 {
  const position = scene.settings?.level?.spawn?.position
  if (
    !position ||
    position.length !== 3 ||
    !position.every(component => Number.isFinite(component))
  ) {
    throw new Error(
      `${scene.levelId}: scene is missing a finite settings.level.spawn.position Vec3.`,
    )
  }

  return position
}

function getActorKind(node: EditorSceneNode): ActorDefinition['kind'] {
  if (node.light) return 'light'
  if (node.gameplay?.type === 'audio-region') return 'volume'
  return node.kind === 'group' ? 'empty' : node.kind
}

function getPhysicsBodyType(node: EditorSceneNode): PhysicsBodyType {
  return node.physics?.bodyType ?? 'fixed'
}

function getRenderCullingPolicy(node: EditorSceneNode): RenderCullingPolicy {
  return node.renderPolicy?.cullingPolicy ?? 'runtime-budget'
}

function getRenderPhysicsAttachmentPolicy(
  node: EditorSceneNode,
): RenderPhysicsAttachmentPolicy {
  return (
    node.renderPolicy?.physicsAttachment ??
    (node.kind === 'asset' && getPhysicsBodyType(node) === 'fixed'
      ? 'outside-collider'
      : 'inside-collider')
  )
}

function toCollisionShape(
  shape: EditorNodeCollisionData['shape'],
): CollisionShape {
  return shape
}

function getPrimitiveMaterial(node: EditorSceneNode) {
  if (!node.primitive)
    return node.material as Record<string, unknown> | undefined

  return {
    color: node.material?.color ?? node.primitive.color,
    mapUrl: node.material?.mapUrl,
    emissive: node.material?.emissive ?? node.primitive.emissive,
    emissiveMapUrl: node.material?.emissiveMapUrl,
    emissiveIntensity:
      node.material?.emissiveIntensity ?? node.primitive.emissiveIntensity,
    metalness: node.material?.metalness ?? node.primitive.metalness,
    metalnessMapUrl: node.material?.metalnessMapUrl,
    roughness: node.material?.roughness ?? node.primitive.roughness,
    roughnessMapUrl: node.material?.roughnessMapUrl,
    normalMapUrl: node.material?.normalMapUrl,
    alphaMapUrl: node.material?.alphaMapUrl,
    opacity: node.material?.opacity ?? node.primitive.opacity,
    transparent: node.material?.transparent ?? node.primitive.transparent,
    wireframe: node.material?.wireframe,
    doubleSided: node.material?.doubleSided,
    flatShading: node.material?.flatShading,
    envMapIntensity: node.material?.envMapIntensity,
    transmission: node.material?.transmission,
    ior: node.material?.ior,
    clearcoat: node.material?.clearcoat,
    clearcoatRoughness: node.material?.clearcoatRoughness,
    thickness: node.material?.thickness,
    reflectivity: node.material?.reflectivity,
  } satisfies Record<string, unknown>
}

function toActor(
  scene: EditorSceneDocument,
  node: EditorSceneNode,
): {
  actor: ActorDefinition
  collisionSource: 'authored' | 'default' | 'none'
  warning?: string
} {
  const collisionResult = resolveCollisionPolicy({
    levelId: scene.levelId,
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
    bodyType: getPhysicsBodyType(node),
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
      node.kind === 'primitive' ||
      node.kind === 'asset' ||
      node.kind === 'prefab'
        ? {
            visible: node.visible,
            cullingPolicy: getRenderCullingPolicy(node),
            physicsAttachment: getRenderPhysicsAttachmentPolicy(node),
            primitive: node.primitive
              ? {
                  geometry: node.primitive.geometry,
                  args: node.primitive.args,
                }
              : undefined,
            asset: node.asset,
            prefab: node.prefab,
            material: getPrimitiveMaterial(node),
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
    actors: scene.nodes.map(node => toActor(scene, node).actor),
  }
}
