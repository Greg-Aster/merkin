import {
  actorColliderAabbContainsPoint as actorColliderAabbContainsPointCore,
  actorSupportsWalkabilitySample as actorSupportsWalkabilitySampleCore,
  getActorColliderWorldSize as getActorColliderWorldSizeCore,
} from './collisionSpatialQueriesCore.mjs'
import type { ActorDefinition, Vec3 } from './types'

export interface WalkableSupportOptions {
  xzPadding?: number
  maxDrop?: number
  maxPenetration?: number
}

export function getActorColliderWorldSize(actor: ActorDefinition): Vec3 {
  return getActorColliderWorldSizeCore(actor)
}

export function actorColliderAabbContainsPoint(
  actor: ActorDefinition,
  point: Vec3,
) {
  return actorColliderAabbContainsPointCore(actor, point)
}

export function actorSupportsWalkabilitySample(
  actor: ActorDefinition,
  samplePosition: Vec3,
  options?: WalkableSupportOptions,
) {
  return actorSupportsWalkabilitySampleCore(actor, samplePosition, options)
}
