import type { EditorSceneNode } from './editorTypes'

function isFiniteVec3(value: unknown): value is [number, number, number] {
  return (
    Array.isArray(value) &&
    value.length === 3 &&
    value.every(component => Number.isFinite(component))
  )
}

export function canHostPointLight(node: EditorSceneNode) {
  return (
    node.kind !== 'light' &&
    Boolean(
      node.asset || node.prefab || node.primitive || node.kind === 'group',
    )
  )
}

export function getDefaultChildPointLightPosition(
  targetNode: EditorSceneNode,
): [number, number, number] {
  const visualBounds =
    targetNode.collision?.assetLocalTransform?.visualLocalBounds
  const center = visualBounds?.center
  const max = visualBounds?.max

  if (isFiniteVec3(center) && isFiniteVec3(max)) {
    return [center[0], max[1] + 0.35, center[2]]
  }

  const localLightHeight = Math.max(
    0.75,
    Math.min(3, Math.abs(targetNode.scale?.[1] ?? 1) * 1.25),
  )
  return [0, localLightHeight, 0]
}
