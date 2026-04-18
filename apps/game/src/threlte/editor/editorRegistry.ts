import * as THREE from 'three'

const objectByNodeId = new Map<string, THREE.Object3D>()
const nodeIdByObject = new Map<THREE.Object3D, string>()

export function registerEditorObject(nodeId: string, object: THREE.Object3D) {
  const previous = objectByNodeId.get(nodeId)
  if (previous) {
    nodeIdByObject.delete(previous)
  }

  objectByNodeId.set(nodeId, object)
  nodeIdByObject.set(object, nodeId)
}

export function unregisterEditorObject(nodeId: string) {
  const object = objectByNodeId.get(nodeId)
  if (!object) return

  objectByNodeId.delete(nodeId)
  nodeIdByObject.delete(object)
}

export function getEditorObject(nodeId: string | null) {
  if (!nodeId) return null
  return objectByNodeId.get(nodeId) ?? null
}

export function getEditorObjects(nodeIds: string[]) {
  return nodeIds
    .map((nodeId) => objectByNodeId.get(nodeId) ?? null)
    .filter((object): object is THREE.Object3D => object !== null)
}

export function getSelectableEditorObjects() {
  return Array.from(objectByNodeId.values())
}

export function getNodeIdForObject(object: THREE.Object3D | null) {
  if (!object) return null

  let current: THREE.Object3D | null = object
  while (current) {
    const nodeId = nodeIdByObject.get(current)
    if (nodeId) return nodeId
    current = current.parent
  }

  return null
}

export function clearEditorRegistry() {
  objectByNodeId.clear()
  nodeIdByObject.clear()
}
