// Rapier InteractionGroups are a 32-bit bitmask:
// upper 16 bits = membership mask; lower 16 bits = filter mask.
const interactionGroups = (membershipMask, filterMask) =>
  (membershipMask << 16) | (filterMask & 0xffff)

export const COLLISION_LAYERS = Object.freeze({
  player: 1,
  worldStatic: 2,
  worldDynamic: 3,
  trigger: 4,
  detail: 5,
  terrain: 6,
})

export const COLLISION_GROUP_MATRIX = Object.freeze({
  player: Object.freeze(['worldStatic', 'worldDynamic', 'trigger', 'terrain']),
  worldStatic: Object.freeze(['player', 'worldDynamic']),
  worldDynamic: Object.freeze([
    'player',
    'worldStatic',
    'worldDynamic',
    'terrain',
  ]),
  trigger: Object.freeze(['player']),
  detail: Object.freeze([]),
  terrain: Object.freeze(['player', 'worldDynamic']),
})

const makeGroups = (membershipLayer, collidesWithLayers) => {
  const membershipIndex = COLLISION_LAYERS[membershipLayer]
  const membershipMask = 1 << (membershipIndex - 1)
  const filterMask = collidesWithLayers.reduce(
    (mask, layer) => mask | (1 << (COLLISION_LAYERS[layer] - 1)),
    0,
  )
  return interactionGroups(membershipMask, filterMask)
}

export const PLAYER_GROUP = makeGroups('player', COLLISION_GROUP_MATRIX.player)
export const WORLD_STATIC_GROUP = makeGroups(
  'worldStatic',
  COLLISION_GROUP_MATRIX.worldStatic,
)
export const WORLD_DYNAMIC_GROUP = makeGroups(
  'worldDynamic',
  COLLISION_GROUP_MATRIX.worldDynamic,
)
export const TRIGGER_GROUP = makeGroups(
  'trigger',
  COLLISION_GROUP_MATRIX.trigger,
)
export const DETAIL_GROUP = makeGroups('detail', COLLISION_GROUP_MATRIX.detail)
export const TERRAIN_GROUP = makeGroups(
  'terrain',
  COLLISION_GROUP_MATRIX.terrain,
)

const COLLISION_GROUPS_BY_LAYER = Object.freeze({
  player: PLAYER_GROUP,
  worldStatic: WORLD_STATIC_GROUP,
  worldDynamic: WORLD_DYNAMIC_GROUP,
  trigger: TRIGGER_GROUP,
  detail: DETAIL_GROUP,
  terrain: TERRAIN_GROUP,
})

export function getRuntimeCollisionLayer(input) {
  if (input?.intent === 'none') return null
  if (input?.intent === 'trigger' || input?.sensor) return 'trigger'
  if (input?.intent === 'detailMesh') return 'detail'
  return input?.channel ?? null
}

export function getCollisionGroupsForRuntimeCollider(collision) {
  const layer = getRuntimeCollisionLayer(collision)
  return layer ? COLLISION_GROUPS_BY_LAYER[layer] : undefined
}

export function hasRuntimeCollisionGroupMapping(collision) {
  return getCollisionGroupsForRuntimeCollider(collision) !== undefined
}

export const SCENERY_GROUP = DETAIL_GROUP
