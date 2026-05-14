const MIN_COLLIDER_SIZE = 0.05

function absScale(value) {
  const scale = Math.abs(Number(value ?? 1))
  return Number.isFinite(scale) && scale > 0.0001 ? scale : 1
}

function isFiniteVec3(value) {
  return (
    Array.isArray(value) &&
    value.length === 3 &&
    value.every(component => Number.isFinite(component))
  )
}

export function clampColliderSize(value) {
  const size = Math.abs(Number(value ?? 1))
  return Number.isFinite(size) ? Math.max(MIN_COLLIDER_SIZE, size) : 1
}

export function getPrimitiveVisualSize(input) {
  const primitive = input?.primitive
  const scale = input?.scale ?? [1, 1, 1]
  if (!primitive) return null

  if (primitive.geometry === 'box') {
    const [width = 1, height = 1, depth = 1] = primitive.args ?? []
    return [
      clampColliderSize(width * scale[0]),
      clampColliderSize(height * scale[1]),
      clampColliderSize(depth * scale[2]),
    ]
  }

  if (primitive.geometry === 'cylinder') {
    const [radiusTop = 0.5, radiusBottom = 0.5, height = 1] =
      primitive.args ?? []
    const radius = Math.max(Math.abs(radiusTop), Math.abs(radiusBottom))
    return [
      clampColliderSize(radius * 2 * scale[0]),
      clampColliderSize(height * scale[1]),
      clampColliderSize(radius * 2 * scale[2]),
    ]
  }

  if (
    primitive.geometry &&
    ['octahedron', 'tetrahedron', 'icosahedron', 'dodecahedron'].includes(
      primitive.geometry,
    )
  ) {
    const [radius = 0.5] = primitive.args ?? []
    return [
      clampColliderSize(radius * 2 * scale[0]),
      clampColliderSize(radius * 2 * scale[1]),
      clampColliderSize(radius * 2 * scale[2]),
    ]
  }

  if (primitive.geometry === 'torus') {
    const [radius = 0.5, tube = 0.2] = primitive.args ?? []
    const outerRadius = Math.abs(radius) + Math.abs(tube)
    return [
      clampColliderSize(outerRadius * 2 * scale[0]),
      clampColliderSize(Math.abs(tube) * 2 * scale[1]),
      clampColliderSize(outerRadius * 2 * scale[2]),
    ]
  }

  return null
}

export function getCollisionVisualSize(input) {
  const primitiveSize = getPrimitiveVisualSize({
    primitive: input?.primitive,
    scale: input?.scale,
  })
  if (primitiveSize) return primitiveSize

  if (isFiniteVec3(input?.authoredWorldSize)) {
    return [
      clampColliderSize(input.authoredWorldSize[0]),
      clampColliderSize(input.authoredWorldSize[1]),
      clampColliderSize(input.authoredWorldSize[2]),
    ]
  }

  if (isFiniteVec3(input?.visualLocalBoundsSize)) {
    return [
      clampColliderSize(input.visualLocalBoundsSize[0] * input.scale[0]),
      clampColliderSize(input.visualLocalBoundsSize[1] * input.scale[1]),
      clampColliderSize(input.visualLocalBoundsSize[2] * input.scale[2]),
    ]
  }

  const scale = input?.scale ?? [1, 1, 1]
  return [
    clampColliderSize(scale[0]),
    clampColliderSize(scale[1]),
    clampColliderSize(scale[2]),
  ]
}

export function getActorCollisionWorldSize(input) {
  if (isFiniteVec3(input?.collisionSize)) {
    return [
      clampColliderSize(input.collisionSize[0]),
      clampColliderSize(input.collisionSize[1]),
      clampColliderSize(input.collisionSize[2]),
    ]
  }

  if (isFiniteVec3(input?.assetLocalBoundsSize)) {
    return [
      clampColliderSize(input.assetLocalBoundsSize[0] * input.scale[0]),
      clampColliderSize(input.assetLocalBoundsSize[1] * input.scale[1]),
      clampColliderSize(input.assetLocalBoundsSize[2] * input.scale[2]),
    ]
  }

  return getCollisionVisualSize({
    primitive: input?.primitive,
    scale: input?.scale,
  })
}

export function getActorDefinitionCollisionWorldSize(actor) {
  return getActorCollisionWorldSize({
    collisionSize: actor?.physics?.collision?.size,
    assetLocalBoundsSize:
      actor?.physics?.collision?.assetLocalTransform?.colliderLocalBounds?.size,
    primitive: actor?.render?.primitive,
    scale: actor?.transform?.scale ?? [1, 1, 1],
  })
}

export function getColliderLocalArgs(input) {
  const localSize = [
    clampColliderSize(input.worldSize[0] / absScale(input.scale[0])) / 2,
    clampColliderSize(input.worldSize[1] / absScale(input.scale[1])) / 2,
    clampColliderSize(input.worldSize[2] / absScale(input.scale[2])) / 2,
  ]

  if (input.shape === 'cylinder') {
    return [localSize[1], Math.max(localSize[0], localSize[2])]
  }

  return localSize
}
