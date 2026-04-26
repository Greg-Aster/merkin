import type {
  CollisionComponent,
  CollisionIntent,
  CollisionShape,
  PrimitiveGeometryKind,
} from './types'

export interface CollisionPolicyInput {
  actorId: string
  actorKind: 'asset' | 'primitive' | 'prefab' | 'terrain' | 'light' | 'empty'
  visible?: boolean
  hasGameplay?: boolean
  primitiveGeometry?: PrimitiveGeometryKind
  authoredCollision?: {
    shape?: CollisionShape
    enabled?: boolean
    size?: [number, number, number]
    friction?: number
    restitution?: number
    sensor?: boolean
  } | null
}

export interface CollisionPolicyResult {
  collision: CollisionComponent | null
  source: 'authored' | 'none'
  warning?: string
}

const TERRAIN_VISUAL_ACTOR_IDS = new Set([
  'solitude-ground-plateau',
  'solitude-ground-dais',
  'yggdrasil-shore-ring',
  'yggdrasil-island-shelf',
  'yggdrasil-ground',
  'yggdrasil-dais',
  'yggdrasil-bifrost-path',
  'yggdrasil-spawn-pad',
])

export function getDefaultCollisionShape(
  input: CollisionPolicyInput,
): CollisionShape {
  if (input.actorKind === 'asset') return 'cuboid'
  if (
    input.actorKind === 'primitive' &&
    input.primitiveGeometry === 'cylinder'
  ) {
    return 'cylinder'
  }
  if (
    input.actorKind === 'primitive' &&
    input.primitiveGeometry &&
    input.primitiveGeometry !== 'box'
  ) {
    return 'trimesh'
  }
  return 'cuboid'
}

function getAuthoredShape(input: CollisionPolicyInput): CollisionShape {
  const defaultShape = getDefaultCollisionShape(input)
  const authoredShape = input.authoredCollision?.shape

  if (!authoredShape) return defaultShape

  if (
    authoredShape === 'cuboid' &&
    defaultShape !== 'cuboid' &&
    !input.authoredCollision?.size
  ) {
    return defaultShape
  }

  return authoredShape
}

function getIntent(shape: CollisionShape, sensor?: boolean): CollisionIntent {
  if (sensor) return 'trigger'
  if (shape === 'trimesh') return 'detailMesh'
  return 'blocker'
}

export function isTerrainVisualActor(actorId: string) {
  return TERRAIN_VISUAL_ACTOR_IDS.has(actorId)
}

export function resolveCollisionPolicy(
  input: CollisionPolicyInput,
): CollisionPolicyResult {
  if (isTerrainVisualActor(input.actorId)) {
    return { collision: null, source: 'none' }
  }

  if (input.authoredCollision?.enabled === false) {
    return { collision: null, source: 'none' }
  }

  if (input.authoredCollision) {
    const shape = getAuthoredShape(input)
    return {
      source: 'authored',
      collision: {
        intent: getIntent(shape, input.authoredCollision.sensor),
        shape,
        size: input.authoredCollision.size,
        friction: input.authoredCollision.friction,
        restitution: input.authoredCollision.restitution,
        sensor: input.authoredCollision.sensor,
      },
    }
  }

  return { collision: null, source: 'none' }
}
