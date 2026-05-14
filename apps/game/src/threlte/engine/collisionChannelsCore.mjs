export const COLLISION_CHANNELS = Object.freeze([
  'worldStatic',
  'worldDynamic',
  'player',
  'trigger',
  'detail',
])

const COLLISION_CHANNEL_SET = new Set(COLLISION_CHANNELS)

export function isCollisionChannel(value) {
  return !!value && COLLISION_CHANNEL_SET.has(value)
}

export function getDefaultCollisionChannel({ intent, bodyType }) {
  if (intent === 'trigger') return 'trigger'
  if (intent === 'detailMesh') return 'detail'
  if (bodyType === 'dynamic' || bodyType === 'kinematicPosition') {
    return 'worldDynamic'
  }
  return 'worldStatic'
}

export function resolveCollisionChannel({ intent, bodyType, authoredChannel }) {
  if (intent === 'trigger') return 'trigger'
  if (intent === 'detailMesh') return 'detail'
  if (
    authoredChannel === 'worldStatic' ||
    authoredChannel === 'worldDynamic' ||
    authoredChannel === 'player'
  ) {
    return authoredChannel
  }
  return getDefaultCollisionChannel({ intent, bodyType })
}
