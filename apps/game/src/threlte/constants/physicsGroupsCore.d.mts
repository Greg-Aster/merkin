export const COLLISION_LAYERS: Readonly<Record<string, number>>
export const COLLISION_GROUP_MATRIX: Readonly<Record<string, readonly string[]>>

export const PLAYER_GROUP: number
export const WORLD_STATIC_GROUP: number
export const WORLD_DYNAMIC_GROUP: number
export const TRIGGER_GROUP: number
export const DETAIL_GROUP: number
export const TERRAIN_GROUP: number

export function getRuntimeCollisionLayer(input: {
  intent?: string | null
  channel?: string | null
  sensor?: boolean | null
}): string | null

export function getCollisionGroupsForRuntimeCollider(collision: {
  intent?: string | null
  channel?: string | null
  sensor?: boolean | null
}): number | undefined

export function hasRuntimeCollisionGroupMapping(collision: {
  intent?: string | null
  channel?: string | null
  sensor?: boolean | null
}): boolean

export const SCENERY_GROUP: number
