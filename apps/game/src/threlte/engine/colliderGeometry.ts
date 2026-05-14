import {
  clampColliderSize as clampColliderSizeCore,
  getActorCollisionWorldSize as getActorCollisionWorldSizeCore,
  getColliderLocalArgs as getColliderLocalArgsCore,
  getCollisionVisualSize as getCollisionVisualSizeCore,
  getPrimitiveVisualSize as getPrimitiveVisualSizeCore,
} from './colliderGeometryCore.mjs'
import type { CollisionShape, PrimitiveGeometryKind, Vec3 } from './types'

export type ColliderArgs = [number, number, number] | [number, number]

type PrimitiveShapeInput = {
  geometry?: PrimitiveGeometryKind
  args?: readonly number[]
}

export function clampColliderSize(value: number | undefined) {
  return clampColliderSizeCore(value)
}

export function getPrimitiveVisualSize(input: {
  primitive?: PrimitiveShapeInput | null
  scale: Vec3
}): Vec3 | null {
  return getPrimitiveVisualSizeCore(input)
}

export function getCollisionVisualSize(input: {
  primitive?: PrimitiveShapeInput | null
  scale: Vec3
  authoredWorldSize?: unknown
  visualLocalBoundsSize?: unknown
}): Vec3 {
  return getCollisionVisualSizeCore(input)
}

export function getActorCollisionWorldSize(input: {
  collisionSize?: unknown
  assetLocalBoundsSize?: unknown
  primitive?: PrimitiveShapeInput | null
  scale: Vec3
}): Vec3 {
  return getActorCollisionWorldSizeCore(input)
}

export function getColliderLocalArgs(input: {
  shape: CollisionShape
  worldSize: Vec3
  scale: Vec3
}): ColliderArgs {
  return getColliderLocalArgsCore(input)
}
