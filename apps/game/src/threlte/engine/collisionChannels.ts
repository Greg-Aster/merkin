import {
  COLLISION_CHANNELS as COLLISION_CHANNELS_CORE,
  getDefaultCollisionChannel as getDefaultCollisionChannelCore,
  isCollisionChannel as isCollisionChannelCore,
  resolveCollisionChannel as resolveCollisionChannelCore,
} from './collisionChannelsCore.mjs'
import type {
  CollisionChannel,
  CollisionIntent,
  PhysicsBodyType,
} from './types'

export const COLLISION_CHANNELS =
  COLLISION_CHANNELS_CORE as readonly CollisionChannel[]

export function isCollisionChannel(
  value: string | null | undefined,
): value is CollisionChannel {
  return isCollisionChannelCore(value)
}

export function getDefaultCollisionChannel(input: {
  intent: CollisionIntent
  bodyType?: PhysicsBodyType
}): CollisionChannel {
  return getDefaultCollisionChannelCore(input) as CollisionChannel
}

export function resolveCollisionChannel(input: {
  intent: CollisionIntent
  bodyType?: PhysicsBodyType
  authoredChannel?: string | null
}): CollisionChannel {
  return resolveCollisionChannelCore(input) as CollisionChannel
}
