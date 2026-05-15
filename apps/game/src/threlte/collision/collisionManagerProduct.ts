import { getCollisionGroupsForRuntimeCollider } from '../constants/physics'
import {
  getGeneratedCollisionProductCacheKey,
  getGeneratedCollisionProductMountError,
  getGeneratedCollisionProductShapeArgs,
  getGeneratedCollisionProductShapePosition,
  isArtifactBackedGeneratedCollisionProduct,
  isShapeBackedGeneratedCollisionProduct,
} from '../engine/generatedCollisionProductRuntime'
import type { EditorRigidBodyType } from '../engine/sceneDocumentTypes'
import {
  type CollisionChannel,
  type CollisionIntent,
  type CollisionProductFingerprintInput,
  type Euler3,
  type GeneratedCollisionProduct,
  type PrimitiveGeometryKind,
  type Vec3,
  isGeneratedCollisionProductStale,
} from '../engine/types'

export type RapierColliderArgs =
  | [number, number, number]
  | [number, number]
  | [number]

export interface CollisionManagerBodyProduct {
  bodyType: EditorRigidBodyType
  position: Vec3
  rotation: Euler3
  scale: Vec3
  gravityScale: number
  canSleep: boolean
  ccd: boolean
  linearDamping: number
  angularDamping: number
  lockRotations: boolean
  lockTranslations: boolean
}

export interface AssetTrimeshRapierColliderProduct {
  kind: 'assetTrimesh'
  levelId: string
  url: string
  metadataUrl: string
  cacheKey: string
  assetLocalTransform: null
  friction: number
  restitution: number
  sensor: boolean
  collisionGroups: number | undefined
}

export interface PrimitiveTrimeshRapierColliderProduct {
  kind: 'primitiveTrimesh'
  geometry: PrimitiveGeometryKind
  args: number[]
  friction: number
  restitution: number
  sensor: boolean
  collisionGroups: number | undefined
}

export interface ShapeRapierColliderProduct {
  kind: 'shape'
  shape: 'cuboid' | 'cylinder' | 'ball' | 'capsule'
  args: RapierColliderArgs
  position?: Vec3
  friction: number
  restitution: number
  sensor: boolean
  collisionGroups: number | undefined
}

export type CollisionManagerRapierColliderProduct =
  | AssetTrimeshRapierColliderProduct
  | PrimitiveTrimeshRapierColliderProduct
  | ShapeRapierColliderProduct

export type RapierColliderDescriptor = CollisionManagerRapierColliderProduct

export interface CollisionManagerRapierProduct {
  id: string
  source: 'collision-manager'
  body: CollisionManagerBodyProduct
  collider: CollisionManagerRapierColliderProduct
}

export interface GeneratedCollisionRapierProductInput {
  product: GeneratedCollisionProduct | null | undefined
  expectedFingerprints?: CollisionProductFingerprintInput
  id?: string
  intent: CollisionIntent
  channel: CollisionChannel
  bodyType?: EditorRigidBodyType
  position?: Vec3
  rotation?: Euler3
  scale?: Vec3
  gravityScale?: number
  canSleep?: boolean
  ccd?: boolean
  linearDamping?: number
  angularDamping?: number
  lockRotations?: boolean
  lockTranslations?: boolean
  friction?: number
  restitution?: number
  sensor?: boolean
  levelId?: string
}

const IDENTITY_POSITION: Vec3 = [0, 0, 0]
const IDENTITY_ROTATION: Euler3 = [0, 0, 0]
const IDENTITY_SCALE: Vec3 = [1, 1, 1]

function normalizeVec3(value: Vec3 | undefined, fallback: Vec3): Vec3 {
  return Array.isArray(value) && value.length === 3
    ? [value[0], value[1], value[2]]
    : [fallback[0], fallback[1], fallback[2]]
}

function normalizeEuler3(value: Euler3 | undefined, fallback: Euler3): Euler3 {
  return Array.isArray(value) && value.length === 3
    ? [value[0], value[1], value[2]]
    : [fallback[0], fallback[1], fallback[2]]
}

function createGeneratedRapierColliderDescriptor(input: {
  product: GeneratedCollisionProduct
  friction: number
  restitution: number
  sensor: boolean
  collisionGroups: number | undefined
  levelId: string
}): RapierColliderDescriptor | null {
  if (isArtifactBackedGeneratedCollisionProduct(input.product)) {
    return {
      kind: 'assetTrimesh',
      levelId: input.levelId,
      url: input.product.artifactUrl ?? '',
      metadataUrl: input.product.metadataUrl ?? '',
      cacheKey: getGeneratedCollisionProductCacheKey(input.product),
      assetLocalTransform: null,
      friction: input.friction,
      restitution: input.restitution,
      sensor: input.sensor,
      collisionGroups: input.collisionGroups,
    }
  }

  if (isShapeBackedGeneratedCollisionProduct(input.product)) {
    const position = getGeneratedCollisionProductShapePosition(input.product)
    return {
      kind: 'shape',
      shape: input.product.shape,
      args: getGeneratedCollisionProductShapeArgs(input.product),
      ...(position ? { position } : {}),
      friction: input.friction,
      restitution: input.restitution,
      sensor: input.sensor,
      collisionGroups: input.collisionGroups,
    }
  }

  return null
}

export function getRapierColliderDescriptor(
  product: CollisionManagerRapierProduct,
): RapierColliderDescriptor {
  return product.collider
}

export function createCollisionManagerRapierProduct(
  input: GeneratedCollisionRapierProductInput,
): CollisionManagerRapierProduct | null {
  const product = input.product
  if (!product) return null
  if (getGeneratedCollisionProductMountError(product, input.id)) return null
  if (
    input.expectedFingerprints &&
    isGeneratedCollisionProductStale(product, input.expectedFingerprints)
  ) {
    return null
  }

  const sensor = input.sensor ?? false
  const friction = input.friction ?? 0.7
  const restitution = input.restitution ?? 0
  const collisionGroups = getCollisionGroupsForRuntimeCollider({
    intent: input.intent,
    channel: input.channel,
    sensor,
  })
  const collider = createGeneratedRapierColliderDescriptor({
    product,
    friction,
    restitution,
    sensor,
    collisionGroups,
    levelId: input.levelId ?? '',
  })
  if (!collider) return null

  return {
    id: input.id ?? product.actorId,
    source: 'collision-manager',
    body: {
      bodyType: input.bodyType ?? 'fixed',
      position: normalizeVec3(input.position, IDENTITY_POSITION),
      rotation: normalizeEuler3(input.rotation, IDENTITY_ROTATION),
      scale: normalizeVec3(input.scale, IDENTITY_SCALE),
      gravityScale: input.gravityScale ?? 1,
      canSleep: input.canSleep ?? true,
      ccd: input.ccd ?? false,
      linearDamping: input.linearDamping ?? 0,
      angularDamping: input.angularDamping ?? 0,
      lockRotations: input.lockRotations ?? false,
      lockTranslations: input.lockTranslations ?? false,
    },
    collider,
  }
}

export function getCollisionProductMountKey(
  product: CollisionManagerRapierProduct,
) {
  return JSON.stringify(product)
}
