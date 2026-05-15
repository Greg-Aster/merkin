import {
  getSceneNodeMeshRenderSource,
  hasMeshRenderSource,
} from './actorRenderSource'
import { resolveCollisionPolicy } from './collisionPolicy'
import type { SceneDocument, SceneNode } from './sceneDocumentTypes'
import type {
  ActorDefinition,
  CollisionClassification,
  GeneratedCollisionProduct,
  LevelDefinition,
  PhysicsBodyType,
  RenderCullingPolicy,
  RenderPhysicsAttachmentPolicy,
  Vec3,
} from './types'

export type GeneratedCollisionProductLookup =
  | Map<string, GeneratedCollisionProduct>
  | Record<string, GeneratedCollisionProduct | undefined>

export interface SceneAdapterOptions {
  generatedCollisionProductsByActorId?: GeneratedCollisionProductLookup
}

function getSpawn(scene: SceneDocument): Vec3 {
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

function getSpawnRotation(scene: SceneDocument): Vec3 {
  const rotation = scene.settings?.level?.spawn?.rotation
  if (!rotation) {
    return [0, 0, 0]
  }

  if (
    rotation.length !== 3 ||
    !rotation.every(component => Number.isFinite(component))
  ) {
    throw new Error(
      `${scene.levelId}: settings.level.spawn.rotation must be a finite Vec3 when provided.`,
    )
  }

  return rotation
}

function getActorKind(node: SceneNode): ActorDefinition['kind'] {
  if (node.light) return 'light'
  if (node.gameplay?.type === 'audio-region') return 'volume'
  const meshSource = getSceneNodeMeshRenderSource(node)
  if (meshSource.kind === 'asset') return 'asset'
  if (meshSource.kind === 'prefab') return 'prefab'
  if (meshSource.kind === 'primitive') return 'primitive'
  return node.kind === 'group' ? 'empty' : node.kind
}

function getCollisionPolicyActorKind(node: SceneNode) {
  const actorKind = getActorKind(node)
  return actorKind === 'asset' ||
    actorKind === 'primitive' ||
    actorKind === 'prefab' ||
    actorKind === 'light'
    ? actorKind
    : 'empty'
}

function getCollisionPolicyPrimitiveGeometry(node: SceneNode) {
  const meshSource = getSceneNodeMeshRenderSource(node)
  return meshSource.kind === 'primitive'
    ? meshSource.primitive.geometry
    : undefined
}

function getPhysicsBodyType(node: SceneNode): PhysicsBodyType {
  return node.physics?.bodyType ?? 'fixed'
}

function getRenderCullingPolicy(node: SceneNode): RenderCullingPolicy {
  return node.renderPolicy?.cullingPolicy ?? 'runtime-budget'
}

function getRenderPhysicsAttachmentPolicy(
  node: SceneNode,
): RenderPhysicsAttachmentPolicy {
  return (
    node.renderPolicy?.physicsAttachment ??
    (node.kind === 'asset' && getPhysicsBodyType(node) === 'fixed'
      ? 'outside-collider'
      : 'inside-collider')
  )
}

function getPrimitiveMaterial(node: SceneNode) {
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

function getGeneratedProductFromLookup(
  lookup: GeneratedCollisionProductLookup | undefined,
  actorId: string,
) {
  if (!lookup) return null
  if (lookup instanceof Map) return lookup.get(actorId) ?? null
  return lookup[actorId] ?? null
}

function getCurrentNodeSourceUrl(node: SceneNode) {
  return (
    node.collision?.colliderSourceAssetUrl ??
    node.collision?.sourceAssetUrl ??
    node.asset?.url ??
    null
  )
}

function isGeneratedProductCompatibleWithNode(
  product: GeneratedCollisionProduct,
  node: SceneNode,
) {
  if (product.actorId !== node.id) return false
  if (node.collision?.generationStatus === 'failed') return false
  if (node.collision?.generationStatus === 'dirty') return false
  if (node.collision?.generationStatus === 'generating') return false

  if (product.sourceKind === 'none') return false

  if (product.sourceKind === 'primitive') {
    return Boolean(node.primitive)
  }

  if (product.sourceKind === 'asset') {
    const currentSourceUrl = getCurrentNodeSourceUrl(node)
    return Boolean(
      node.asset &&
        currentSourceUrl &&
        product.sourceMeshUrl &&
        product.sourceMeshUrl === currentSourceUrl,
    )
  }

  if (product.sourceKind === 'prefab') {
    const currentSourceUrl = getCurrentNodeSourceUrl(node)
    return Boolean(
      node.prefab &&
        (!product.sourceMeshUrl ||
          (currentSourceUrl && product.sourceMeshUrl === currentSourceUrl)),
    )
  }

  if (product.sourceKind === 'terrain') {
    return false
  }

  if (product.sourceMeshUrl) {
    return product.sourceMeshUrl === getCurrentNodeSourceUrl(node)
  }

  return true
}

function getGeneratedProductForNode(
  node: SceneNode,
  options: SceneAdapterOptions,
) {
  const product = getGeneratedProductFromLookup(
    options.generatedCollisionProductsByActorId,
    node.id,
  )
  if (!product) return undefined
  return isGeneratedProductCompatibleWithNode(product, node)
    ? product
    : undefined
}

function getCollisionClassification(input: {
  scene: SceneDocument
  node: SceneNode
  actor: Pick<ActorDefinition, 'render' | 'physics'>
}): CollisionClassification | undefined {
  const hasVisibleRender = Boolean(
    input.actor.render && input.actor.render.visible !== false,
  )
  const hasCollision = Boolean(input.actor.physics?.collision)
  const visualOnlyActorIds =
    input.scene.settings?.level?.collision?.roles?.visualOnlyActorIds ?? []
  const isVisualOnly = visualOnlyActorIds.includes(input.node.id)

  if (hasCollision) {
    return hasVisibleRender ? 'collidable' : 'collision-only-proxy'
  }
  if (!hasVisibleRender) return undefined
  if (isVisualOnly) return 'visual-only'
  if (
    input.node.collision?.enabled === false ||
    input.node.collision?.intent === 'none'
  ) {
    return 'disabled'
  }
  if (input.node.collision) return 'disabled'
  return 'missing-collision'
}

function toActor(
  scene: SceneDocument,
  node: SceneNode,
  options: SceneAdapterOptions,
): {
  actor: ActorDefinition
  collisionSource: 'authored' | 'default' | 'none'
  warning?: string
} {
  const collisionResult = resolveCollisionPolicy({
    levelId: scene.levelId,
    actorId: node.id,
    actorKind: getCollisionPolicyActorKind(node),
    visible: node.visible,
    hasGameplay: Boolean(node.gameplay),
    bodyType: getPhysicsBodyType(node),
    primitiveGeometry: getCollisionPolicyPrimitiveGeometry(node),
    levelSettings: scene.settings,
    authoredCollision: node.collision ?? null,
  })

  const generatedProduct = collisionResult.collision
    ? getGeneratedProductForNode(node, options)
    : undefined

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
    render: hasMeshRenderSource(node)
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
          collision: generatedProduct
            ? {
                ...collisionResult.collision,
                generatedProduct,
              }
            : collisionResult.collision,
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
  }

  actor.collisionClassification = getCollisionClassification({
    scene,
    node,
    actor,
  })

  return {
    actor,
    collisionSource: collisionResult.source,
    warning: collisionResult.warning,
  }
}

export function adaptSceneDocumentToLevelDefinition(
  scene: SceneDocument,
  options: SceneAdapterOptions = {},
): LevelDefinition {
  return {
    id: scene.levelId,
    version: scene.version,
    updatedAt: scene.updatedAt,
    spawn: {
      player: getSpawn(scene),
      rotation: getSpawnRotation(scene),
    },
    settings: scene.settings as Record<string, unknown>,
    actors: scene.nodes.map(node => toActor(scene, node, options).actor),
  }
}

export const adaptEditorSceneToLevelDefinition =
  adaptSceneDocumentToLevelDefinition
