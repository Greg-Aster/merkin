import * as THREE from 'three'

export interface HierarchyNodeTransform {
  id: string
  parentId?: string | null
  position: [number, number, number]
  rotation: [number, number, number]
  scale: [number, number, number]
}

export interface NodeLocalTransform {
  position: [number, number, number]
  rotation: [number, number, number]
  scale: [number, number, number]
}

export function collectDescendantIds<T extends HierarchyNodeTransform>(
  nodes: T[],
  nodeId: string,
) {
  const descendants = new Set<string>()
  const stack = [nodeId]

  while (stack.length > 0) {
    const current = stack.pop()!
    for (const node of nodes) {
      if (node.parentId !== current) continue
      if (!descendants.has(node.id)) {
        descendants.add(node.id)
        stack.push(node.id)
      }
    }
  }

  return descendants
}

export function collectSubtreeIds<T extends HierarchyNodeTransform>(
  nodes: T[],
  rootId: string,
) {
  const ids = new Set<string>([rootId])
  const descendants = collectDescendantIds(nodes, rootId)
  descendants.forEach(id => ids.add(id))
  return ids
}

export function createNodeLookup<T extends HierarchyNodeTransform>(nodes: T[]) {
  return new Map(nodes.map(node => [node.id, node]))
}

function createLocalMatrix(node: HierarchyNodeTransform) {
  const quaternion = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(...node.rotation),
  )
  return new THREE.Matrix4().compose(
    new THREE.Vector3(...node.position),
    quaternion,
    new THREE.Vector3(...node.scale),
  )
}

export function getWorldMatrixForNode<T extends HierarchyNodeTransform>(
  lookup: Map<string, T>,
  nodeId: string,
  cache = new Map<string, THREE.Matrix4>(),
  visiting = new Set<string>(),
): THREE.Matrix4 {
  const cached = cache.get(nodeId)
  if (cached) return cached.clone()

  const node = lookup.get(nodeId)
  if (!node) return new THREE.Matrix4().identity()
  if (visiting.has(nodeId)) return new THREE.Matrix4().identity()

  visiting.add(nodeId)
  const localMatrix = createLocalMatrix(node)
  const worldMatrix: THREE.Matrix4 = node.parentId
    ? getWorldMatrixForNode(lookup, node.parentId, cache, visiting).multiply(
        localMatrix,
      )
    : localMatrix
  cache.set(nodeId, worldMatrix.clone())
  visiting.delete(nodeId)
  return worldMatrix
}

function decomposeMatrix(matrix: THREE.Matrix4): NodeLocalTransform {
  const position = new THREE.Vector3()
  const quaternion = new THREE.Quaternion()
  const scale = new THREE.Vector3()
  matrix.decompose(position, quaternion, scale)
  const rotation = new THREE.Euler().setFromQuaternion(quaternion)

  return {
    position: [position.x, position.y, position.z],
    rotation: [rotation.x, rotation.y, rotation.z],
    scale: [scale.x, scale.y, scale.z],
  }
}

export function getLocalTransformForWorldMatrix<
  T extends HierarchyNodeTransform,
>(
  nodes: T[],
  parentId: string | null,
  worldMatrix: THREE.Matrix4,
): NodeLocalTransform {
  const lookup = createNodeLookup(nodes)
  const parentWorldMatrix = parentId
    ? getWorldMatrixForNode(lookup, parentId)
    : new THREE.Matrix4().identity()
  const localMatrix = parentWorldMatrix
    .clone()
    .invert()
    .multiply(worldMatrix.clone())
  return decomposeMatrix(localMatrix)
}

export function getTopLevelNodeIds<T extends HierarchyNodeTransform>(
  nodes: T[],
  nodeIds: string[],
) {
  const uniqueIds = Array.from(new Set(nodeIds))
  const selected = new Set(uniqueIds)
  const lookup = createNodeLookup(nodes)

  return uniqueIds.filter(nodeId => {
    let currentParentId = lookup.get(nodeId)?.parentId ?? null
    while (currentParentId) {
      if (selected.has(currentParentId)) return false
      currentParentId = lookup.get(currentParentId)?.parentId ?? null
    }
    return true
  })
}

export function createWorldMatrixResolver<T extends HierarchyNodeTransform>(
  nodes: T[],
) {
  const lookup = createNodeLookup(nodes)
  const cache = new Map<string, THREE.Matrix4>()

  return (nodeId: string) => getWorldMatrixForNode(lookup, nodeId, cache)
}

export function getSharedParentId<T extends HierarchyNodeTransform>(
  nodes: T[],
  nodeIds: string[],
) {
  const lookup = createNodeLookup(nodes)
  const rootNodes = nodeIds
    .map(nodeId => lookup.get(nodeId) ?? null)
    .filter((node): node is T => node !== null)

  if (rootNodes.length === 0) return null

  return rootNodes.every(
    node => (node.parentId ?? null) === (rootNodes[0].parentId ?? null),
  )
    ? rootNodes[0].parentId ?? null
    : null
}

export function getCenteredGroupTransform<T extends HierarchyNodeTransform>(
  nodes: T[],
  nodeIds: string[],
  parentId: string | null,
): NodeLocalTransform | null {
  if (nodeIds.length === 0) return null

  const getWorldMatrix = createWorldMatrixResolver(nodes)
  const center = new THREE.Vector3()

  for (const nodeId of nodeIds) {
    const worldMatrix = getWorldMatrix(nodeId)
    center.add(new THREE.Vector3().setFromMatrixPosition(worldMatrix))
  }

  center.multiplyScalar(1 / nodeIds.length)

  const groupWorldMatrix = new THREE.Matrix4().compose(
    center,
    new THREE.Quaternion(),
    new THREE.Vector3(1, 1, 1),
  )

  return getLocalTransformForWorldMatrix(nodes, parentId, groupWorldMatrix)
}
