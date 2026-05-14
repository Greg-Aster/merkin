type Vec3 = [number, number, number]

export function getActorColliderWorldSize(actor: {
  physics?: {
    collision: {
      size?: unknown
      assetLocalTransform?: {
        colliderLocalBounds?: {
          size?: unknown
        } | null
      } | null
    }
  }
  render?: {
    primitive?: {
      geometry?: string
      args?: readonly number[]
    } | null
  }
  transform: {
    scale: Vec3
  }
}): Vec3

export function actorColliderAabbContainsPoint(
  actor: {
    physics?: unknown
    render?: unknown
    transform: {
      position: Vec3
      scale: Vec3
    }
  },
  point: Vec3,
): boolean

export function actorSupportsWalkabilitySample(
  actor: {
    physics?: {
      collision: {
        intent?: string
        sensor?: boolean
        shape?: string
        size?: unknown
        assetLocalTransform?: {
          colliderLocalBounds?: {
            size?: unknown
          } | null
        } | null
      }
    }
    render?: {
      primitive?: {
        geometry?: string
        args?: readonly number[]
      } | null
    }
    transform: {
      position: Vec3
      scale: Vec3
    }
  },
  samplePosition: Vec3,
): boolean
