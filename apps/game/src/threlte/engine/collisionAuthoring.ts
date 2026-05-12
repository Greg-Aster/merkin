import type { CollisionChannel, CollisionIntent } from './types'

export const COLLISION_ASSET_CONVENTIONS = {
  colliderUrlSuffix: '.collider.glb',
  generatedColliderRoot: '/generated/runtime-game-assets/collision/',
  terrainColliderRoot: '/terrain/collision/',
  defaultPhysicsMaterial: 'stone-default',
} as const

export const COLLISION_INTENT_COLORS = {
  walkable: '#55e68a',
  blocker: '#ff8c63',
  trigger: '#63b3ff',
  detailMesh: '#d6a3ff',
  none: '#8f96a3',
} as const satisfies Record<CollisionIntent, string>

export const COLLISION_CHANNEL_COLORS = {
  worldStatic: '#ff8c63',
  worldDynamic: '#ffbd5a',
  player: '#55e68a',
  trigger: '#63b3ff',
  detail: '#d6a3ff',
} as const satisfies Record<CollisionChannel, string>

export function getCollisionOverlayColor(input: {
  intent?: CollisionIntent | null
  channel?: CollisionChannel | null
}) {
  if (input.intent && input.intent in COLLISION_INTENT_COLORS) {
    return COLLISION_INTENT_COLORS[input.intent]
  }
  if (input.channel && input.channel in COLLISION_CHANNEL_COLORS) {
    return COLLISION_CHANNEL_COLORS[input.channel]
  }
  return COLLISION_CHANNEL_COLORS.worldStatic
}

export function getColliderUrlConventionError(
  value: string | null | undefined,
) {
  const colliderUrl = String(value ?? '').trim()
  if (!colliderUrl) return 'collision.colliderUrl is required.'
  if (!colliderUrl.startsWith('/')) {
    return 'collision.colliderUrl must be a public absolute URL.'
  }
  if (
    !colliderUrl.startsWith(
      COLLISION_ASSET_CONVENTIONS.generatedColliderRoot,
    ) &&
    !colliderUrl.startsWith(COLLISION_ASSET_CONVENTIONS.terrainColliderRoot)
  ) {
    return `collision.colliderUrl must live under ${COLLISION_ASSET_CONVENTIONS.generatedColliderRoot} or ${COLLISION_ASSET_CONVENTIONS.terrainColliderRoot}.`
  }
  if (!colliderUrl.endsWith(COLLISION_ASSET_CONVENTIONS.colliderUrlSuffix)) {
    return `collision.colliderUrl must end with ${COLLISION_ASSET_CONVENTIONS.colliderUrlSuffix}.`
  }
  return ''
}
