import type {
  CollisionChannel,
  CollisionIntent,
  PhysicsBodyType,
} from './types'

export const COLLISION_CHANNELS = [
  'worldStatic',
  'worldDynamic',
  'player',
  'trigger',
  'detail',
] as const satisfies readonly CollisionChannel[]

const COLLISION_CHANNEL_SET = new Set<string>(COLLISION_CHANNELS)

export function isCollisionChannel(
  value: string | null | undefined,
): value is CollisionChannel {
  return !!value && COLLISION_CHANNEL_SET.has(value)
}

export function getDefaultCollisionChannel(input: {
  intent: CollisionIntent
  bodyType?: PhysicsBodyType
}): CollisionChannel {
  if (input.intent === 'trigger') return 'trigger'
  if (input.intent === 'detailMesh') return 'detail'
  if (input.bodyType === 'dynamic' || input.bodyType === 'kinematicPosition') {
    return 'worldDynamic'
  }
  return 'worldStatic'
}

export function resolveCollisionChannel(input: {
  intent: CollisionIntent
  bodyType?: PhysicsBodyType
  authoredChannel?: string | null
}): CollisionChannel {
  if (input.intent === 'trigger') return 'trigger'
  if (input.intent === 'detailMesh') return 'detail'
  if (
    input.authoredChannel === 'worldStatic' ||
    input.authoredChannel === 'worldDynamic' ||
    input.authoredChannel === 'player'
  ) {
    return input.authoredChannel
  }
  return getDefaultCollisionChannel(input)
}
