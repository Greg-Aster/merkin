type Vec3 = [number, number, number]
type ColliderArgs = [number, number, number] | [number, number]
type PrimitiveShapeInput = {
  geometry?: string
  args?: readonly number[]
}

export function clampColliderSize(value: number | undefined): number

export function getPrimitiveVisualSize(input: {
  primitive?: PrimitiveShapeInput | null
  scale: Vec3
}): Vec3 | null

export function getCollisionVisualSize(input: {
  primitive?: PrimitiveShapeInput | null
  scale: Vec3
  authoredWorldSize?: unknown
  visualLocalBoundsSize?: unknown
}): Vec3

export function getActorCollisionWorldSize(input: {
  collisionSize?: unknown
  assetLocalBoundsSize?: unknown
  primitive?: PrimitiveShapeInput | null
  scale: Vec3
}): Vec3

export function getActorDefinitionCollisionWorldSize(actor: {
  physics?: {
    collision?: {
      size?: unknown
      assetLocalTransform?: {
        colliderLocalBounds?: {
          size?: unknown
        }
      }
    }
  }
  render?: {
    primitive?: PrimitiveShapeInput | null
  }
  transform?: {
    scale?: Vec3
  }
}): Vec3

export function getColliderLocalArgs(input: {
  shape: string
  worldSize: Vec3
  scale: Vec3
}): ColliderArgs
