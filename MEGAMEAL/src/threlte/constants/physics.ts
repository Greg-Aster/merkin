// Helper to convert human-readable group indices (1-based)
// into Rapier InteractionGroups (32-bit bitmask):
// upper 16 bits = membership mask; lower 16 bits = filter mask.
const interactionGroups = (membershipMask: number, filterMask: number): number =>
  (membershipMask << 16) | (filterMask & 0xffff)

const makeGroups = (membershipIndex: number, collidesWithIndices: number[]) => {
  const membershipMask = 1 << (membershipIndex - 1)
  const filterMask = collidesWithIndices.reduce((mask, idx) => mask | (1 << (idx - 1)), 0)
  return interactionGroups(membershipMask, filterMask)
}

// Player is in group 1. It ONLY collides with things in group 2.
export const PLAYER_GROUP = makeGroups(1, [2])

// Terrain is in group 2. It ONLY collides with things in group 1.
export const TERRAIN_GROUP = makeGroups(2, [1])

// Scenery/Sensors are in group 3. They collide with nothing.
export const SCENERY_GROUP = makeGroups(3, [])
