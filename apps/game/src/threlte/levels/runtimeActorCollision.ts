import type { ActorDefinition, Vec3 } from '../engine/types'

const MIN_COLLIDER_SIZE = 0.05

function absScale(value: number | undefined) {
  const scale = Math.abs(Number(value ?? 1))
  return Number.isFinite(scale) && scale > 0.0001 ? scale : 1
}

function clampSize(value: number | undefined) {
  const size = Math.abs(Number(value ?? 1))
  return Number.isFinite(size) ? Math.max(MIN_COLLIDER_SIZE, size) : 1
}

function getPrimitiveVisualSize(actor: ActorDefinition): Vec3 {
  const primitive = actor.render?.primitive
  const scale = actor.transform.scale
  if (!primitive)
    return [clampSize(scale[0]), clampSize(scale[1]), clampSize(scale[2])]

  if (primitive.geometry === 'box') {
    const [width = 1, height = 1, depth = 1] = primitive.args
    return [
      clampSize(width * scale[0]),
      clampSize(height * scale[1]),
      clampSize(depth * scale[2]),
    ]
  }

  if (primitive.geometry === 'cylinder') {
    const [radiusTop = 0.5, radiusBottom = 0.5, height = 1] = primitive.args
    const radius = Math.max(Math.abs(radiusTop), Math.abs(radiusBottom))
    return [
      clampSize(radius * 2 * scale[0]),
      clampSize(height * scale[1]),
      clampSize(radius * 2 * scale[2]),
    ]
  }

  if (
    ['octahedron', 'tetrahedron', 'icosahedron', 'dodecahedron'].includes(
      primitive.geometry,
    )
  ) {
    const [radius = 0.5] = primitive.args
    return [
      clampSize(radius * 2 * scale[0]),
      clampSize(radius * 2 * scale[1]),
      clampSize(radius * 2 * scale[2]),
    ]
  }

  if (primitive.geometry === 'torus') {
    const [radius = 0.5, tube = 0.2] = primitive.args
    const outerRadius = Math.abs(radius) + Math.abs(tube)
    return [
      clampSize(outerRadius * 2 * scale[0]),
      clampSize(Math.abs(tube) * 2 * scale[1]),
      clampSize(outerRadius * 2 * scale[2]),
    ]
  }

  return [clampSize(scale[0]), clampSize(scale[1]), clampSize(scale[2])]
}

export function getRuntimeActorColliderArgs(actor: ActorDefinition) {
  const collision = actor.physics?.collision
  if (!collision) return [0.5, 0.5, 0.5] as [number, number, number]

  const worldSize = collision.size ?? getPrimitiveVisualSize(actor)
  const scale = actor.transform.scale
  const localSize: Vec3 = [
    clampSize(worldSize[0] / absScale(scale[0])) / 2,
    clampSize(worldSize[1] / absScale(scale[1])) / 2,
    clampSize(worldSize[2] / absScale(scale[2])) / 2,
  ]

  if (collision.shape === 'cylinder') {
    return [localSize[1], Math.max(localSize[0], localSize[2])] as [
      number,
      number,
    ]
  }

  return localSize
}
