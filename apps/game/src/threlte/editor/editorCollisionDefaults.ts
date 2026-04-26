import type { EditorNodeCollisionData, EditorSceneNode } from './editorTypes'

const MIN_COLLIDER_SIZE = 0.05
type ColliderArgs = [number, number, number] | [number, number]

function absScale(value: number | undefined) {
  const scale = Math.abs(Number(value ?? 1))
  return Number.isFinite(scale) && scale > 0.0001 ? scale : 1
}

function clampSize(value: number | undefined) {
  const size = Math.abs(Number(value ?? 1))
  return Number.isFinite(size) ? Math.max(MIN_COLLIDER_SIZE, size) : 1
}

function isTerrainVisualNode(node: EditorSceneNode | null | undefined) {
  const id = node?.id ?? ''

  return (
    id === 'solitude-ground-plateau' ||
    id === 'solitude-ground-dais' ||
    id === 'yggdrasil-shore-ring' ||
    id === 'yggdrasil-island-shelf' ||
    id === 'yggdrasil-ground' ||
    id === 'yggdrasil-dais' ||
    id === 'yggdrasil-bifrost-path' ||
    id === 'yggdrasil-spawn-pad'
  )
}

export function getDefaultCollisionShape(
  node: EditorSceneNode | null | undefined,
): EditorNodeCollisionData['shape'] {
  if (node?.kind === 'asset') return 'cuboid'
  if (node?.kind === 'primitive' && node.primitive?.geometry === 'cylinder') {
    return 'cylinder'
  }
  if (
    node?.kind === 'primitive' &&
    node.primitive?.geometry &&
    node.primitive.geometry !== 'box'
  ) {
    return 'trimesh'
  }
  return 'cuboid'
}

function resolveAuthoredCollisionShape(
  node: EditorSceneNode,
): EditorNodeCollisionData['shape'] {
  const defaultShape = getDefaultCollisionShape(node)
  const authoredShape = node.collision?.shape

  if (!authoredShape) return defaultShape

  if (
    authoredShape === 'cuboid' &&
    defaultShape !== 'cuboid' &&
    !node.collision?.size
  ) {
    return defaultShape
  }

  return authoredShape
}

export function isEditorGeometryNode(
  node: EditorSceneNode | null | undefined,
): node is EditorSceneNode & { kind: 'primitive' | 'asset' | 'prefab' } {
  return (
    !!node &&
    (node.kind === 'primitive' ||
      node.kind === 'asset' ||
      node.kind === 'prefab')
  )
}

export function isDefaultSolidNode(node: EditorSceneNode | null | undefined) {
  return (
    isEditorGeometryNode(node) &&
    !isTerrainVisualNode(node) &&
    node?.visible !== false &&
    !node?.gameplay &&
    node?.collision?.enabled !== false
  )
}

export function resolveNodeCollision(
  node: EditorSceneNode | null | undefined,
): EditorNodeCollisionData | null {
  if (!isEditorGeometryNode(node)) return null
  if (isTerrainVisualNode(node)) return null
  const current = node
  if (current.collision?.enabled === false) return null
  if (current.collision) {
    return {
      ...current.collision,
      shape: resolveAuthoredCollisionShape(current),
      enabled: current.collision.enabled ?? true,
    }
  }
  if (!isDefaultSolidNode(current)) return null

  return {
    shape: getDefaultCollisionShape(node),
    friction: 0.7,
    restitution: 0,
    sensor: false,
  }
}

export function getNodeVisualColliderSize(
  node: EditorSceneNode | null | undefined,
): [number, number, number] {
  if (!node) return [1, 1, 1]

  if (node.primitive?.geometry === 'box') {
    const [width = 1, height = 1, depth = 1] = node.primitive.args
    return [
      clampSize(width * node.scale[0]),
      clampSize(height * node.scale[1]),
      clampSize(depth * node.scale[2]),
    ]
  }

  if (node.primitive?.geometry === 'cylinder') {
    const [radiusTop = 0.5, radiusBottom = 0.5, height = 1] =
      node.primitive.args
    const radius = Math.max(Math.abs(radiusTop), Math.abs(radiusBottom))
    return [
      clampSize(radius * 2 * node.scale[0]),
      clampSize(height * node.scale[1]),
      clampSize(radius * 2 * node.scale[2]),
    ]
  }

  if (
    node.primitive &&
    ['octahedron', 'tetrahedron', 'icosahedron', 'dodecahedron'].includes(
      node.primitive.geometry,
    )
  ) {
    const [radius = 0.5] = node.primitive.args
    return [
      clampSize(radius * 2 * node.scale[0]),
      clampSize(radius * 2 * node.scale[1]),
      clampSize(radius * 2 * node.scale[2]),
    ]
  }

  if (node.primitive?.geometry === 'torus') {
    const [radius = 0.5, tube = 0.2] = node.primitive.args
    const outerRadius = Math.abs(radius) + Math.abs(tube)
    return [
      clampSize(outerRadius * 2 * node.scale[0]),
      clampSize(Math.abs(tube) * 2 * node.scale[1]),
      clampSize(outerRadius * 2 * node.scale[2]),
    ]
  }

  if (node.generation?.sourceVisualSize?.length === 3) {
    return [
      clampSize(node.generation.sourceVisualSize[0]),
      clampSize(node.generation.sourceVisualSize[1]),
      clampSize(node.generation.sourceVisualSize[2]),
    ]
  }

  return [
    clampSize(node.scale[0]),
    clampSize(node.scale[1]),
    clampSize(node.scale[2]),
  ]
}

export function getNodeColliderArgs(
  node: EditorSceneNode | null | undefined,
): ColliderArgs {
  const collision = resolveNodeCollision(node)
  if (!node || !collision) return [0.5, 0.5, 0.5]

  const worldSize = collision.size ?? getNodeVisualColliderSize(node)
  const localSize: [number, number, number] = [
    clampSize(worldSize[0] / absScale(node.scale[0])) / 2,
    clampSize(worldSize[1] / absScale(node.scale[1])) / 2,
    clampSize(worldSize[2] / absScale(node.scale[2])) / 2,
  ]
  if (collision.shape === 'cylinder') {
    return [localSize[1], Math.max(localSize[0], localSize[2])]
  }
  return localSize
}
