import type { CollisionComponent, CollisionIntent } from '../engine/types'
import {
  COLLISION_GROUP_MATRIX as COLLISION_GROUP_MATRIX_CORE,
  COLLISION_LAYERS as COLLISION_LAYERS_CORE,
  DETAIL_GROUP as DETAIL_GROUP_CORE,
  PLAYER_GROUP as PLAYER_GROUP_CORE,
  SCENERY_GROUP as SCENERY_GROUP_CORE,
  TERRAIN_GROUP as TERRAIN_GROUP_CORE,
  TRIGGER_GROUP as TRIGGER_GROUP_CORE,
  WORLD_DYNAMIC_GROUP as WORLD_DYNAMIC_GROUP_CORE,
  WORLD_STATIC_GROUP as WORLD_STATIC_GROUP_CORE,
  getCollisionGroupsForRuntimeCollider as getCollisionGroupsForRuntimeColliderCore,
  getRuntimeCollisionLayer as getRuntimeCollisionLayerCore,
  hasRuntimeCollisionGroupMapping as hasRuntimeCollisionGroupMappingCore,
} from './physicsGroupsCore.mjs'

export const COLLISION_LAYERS = COLLISION_LAYERS_CORE as {
  readonly player: 1
  readonly worldStatic: 2
  readonly worldDynamic: 3
  readonly trigger: 4
  readonly detail: 5
  readonly terrain: 6
}

export type RuntimeCollisionLayer = keyof typeof COLLISION_LAYERS
export const COLLISION_GROUP_MATRIX = COLLISION_GROUP_MATRIX_CORE as Record<
  RuntimeCollisionLayer,
  readonly RuntimeCollisionLayer[]
>

export const PLAYER_GROUP = PLAYER_GROUP_CORE
export const WORLD_STATIC_GROUP = WORLD_STATIC_GROUP_CORE
export const WORLD_DYNAMIC_GROUP = WORLD_DYNAMIC_GROUP_CORE
export const TRIGGER_GROUP = TRIGGER_GROUP_CORE
export const DETAIL_GROUP = DETAIL_GROUP_CORE
export const TERRAIN_GROUP = TERRAIN_GROUP_CORE

export function getRuntimeCollisionLayer(input: {
  intent: CollisionIntent
  channel: CollisionComponent['channel']
  sensor?: boolean
}): RuntimeCollisionLayer | null {
  return getRuntimeCollisionLayerCore(input) as RuntimeCollisionLayer | null
}

export function getCollisionGroupsForRuntimeCollider(
  collision: Pick<CollisionComponent, 'intent' | 'channel' | 'sensor'>,
): number | undefined {
  return getCollisionGroupsForRuntimeColliderCore(collision)
}

export function hasRuntimeCollisionGroupMapping(
  collision: Pick<CollisionComponent, 'intent' | 'channel' | 'sensor'>,
): boolean {
  return hasRuntimeCollisionGroupMappingCore(collision)
}

export const SCENERY_GROUP = SCENERY_GROUP_CORE
