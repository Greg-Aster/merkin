import { collectDescendantIds } from './editorHierarchyUtils'
import type { EditorSceneDocument, EditorSceneNode } from './editorTypes'

export interface EditorNodeTransformPatch {
  position?: EditorSceneNode['position']
  rotation?: EditorSceneNode['rotation']
  scale?: EditorSceneNode['scale']
}

export type EditorSceneNodePatch = Partial<Omit<EditorSceneNode, 'id'>>

export type EditorNodeCommand =
  | {
      type: 'add-node'
      node: EditorSceneNode
    }
  | {
      type: 'replace-node'
      nodeId: string
      node: EditorSceneNode
    }
  | {
      type: 'patch-node'
      nodeId: string
      patch: EditorSceneNodePatch
    }
  | {
      type: 'remove-nodes'
      nodeIds: string[]
    }
  | {
      type: 'reparent-node'
      nodeId: string
      parentId: string | null
      transform?: EditorNodeTransformPatch
    }

export interface ApplyEditorNodeCommandsResult {
  scene: EditorSceneDocument
  changed: boolean
}

function cloneNode(node: EditorSceneNode) {
  return structuredClone(node) as EditorSceneNode
}

function withUpdatedTimestamp(scene: EditorSceneDocument) {
  return {
    ...scene,
    updatedAt: new Date().toISOString(),
  }
}

function applyAddNodeCommand(
  scene: EditorSceneDocument,
  node: EditorSceneNode,
): ApplyEditorNodeCommandsResult {
  if (scene.nodes.some(existingNode => existingNode.id === node.id)) {
    return { scene, changed: false }
  }

  return {
    scene: withUpdatedTimestamp({
      ...scene,
      nodes: [...scene.nodes, cloneNode(node)],
    }),
    changed: true,
  }
}

function applyReplaceNodeCommand(
  scene: EditorSceneDocument,
  nodeId: string,
  node: EditorSceneNode,
): ApplyEditorNodeCommandsResult {
  let changed = false

  const nextNodes = scene.nodes.map(currentNode => {
    if (currentNode.id !== nodeId) return currentNode
    changed = true
    return cloneNode(node)
  })

  if (!changed) {
    return { scene, changed: false }
  }

  return {
    scene: withUpdatedTimestamp({
      ...scene,
      nodes: nextNodes,
    }),
    changed: true,
  }
}

function applyPatchNodeCommand(
  scene: EditorSceneDocument,
  nodeId: string,
  patch: EditorSceneNodePatch,
): ApplyEditorNodeCommandsResult {
  let changed = false

  const nextNodes = scene.nodes.map(currentNode => {
    if (currentNode.id !== nodeId) return currentNode
    changed = true
    return {
      ...currentNode,
      ...structuredClone(patch),
    }
  })

  if (!changed) {
    return { scene, changed: false }
  }

  return {
    scene: withUpdatedTimestamp({
      ...scene,
      nodes: nextNodes,
    }),
    changed: true,
  }
}

function applyRemoveNodesCommand(
  scene: EditorSceneDocument,
  nodeIds: string[],
): ApplyEditorNodeCommandsResult {
  const uniqueIds = Array.from(new Set(nodeIds))
  if (uniqueIds.length === 0) {
    return { scene, changed: false }
  }

  const idsToRemove = new Set<string>()
  for (const nodeId of uniqueIds) {
    idsToRemove.add(nodeId)
    const descendants = collectDescendantIds(scene.nodes, nodeId)
    descendants.forEach(id => idsToRemove.add(id))
  }

  const nextNodes = scene.nodes.filter(node => !idsToRemove.has(node.id))
  if (nextNodes.length === scene.nodes.length) {
    return { scene, changed: false }
  }

  return {
    scene: withUpdatedTimestamp({
      ...scene,
      nodes: nextNodes,
    }),
    changed: true,
  }
}

function applyReparentNodeCommand(
  scene: EditorSceneDocument,
  nodeId: string,
  parentId: string | null,
  transform?: EditorNodeTransformPatch,
): ApplyEditorNodeCommandsResult {
  let changed = false

  const nextNodes = scene.nodes.map(node => {
    if (node.id !== nodeId) return node
    changed = true
    return {
      ...node,
      parentId,
      ...(transform?.position
        ? { position: [...transform.position] as EditorSceneNode['position'] }
        : {}),
      ...(transform?.rotation
        ? { rotation: [...transform.rotation] as EditorSceneNode['rotation'] }
        : {}),
      ...(transform?.scale
        ? { scale: [...transform.scale] as EditorSceneNode['scale'] }
        : {}),
    }
  })

  if (!changed) {
    return { scene, changed: false }
  }

  return {
    scene: withUpdatedTimestamp({
      ...scene,
      nodes: nextNodes,
    }),
    changed: true,
  }
}

export function applyEditorNodeCommand(
  scene: EditorSceneDocument,
  command: EditorNodeCommand,
): ApplyEditorNodeCommandsResult {
  switch (command.type) {
    case 'add-node':
      return applyAddNodeCommand(scene, command.node)
    case 'replace-node':
      return applyReplaceNodeCommand(scene, command.nodeId, command.node)
    case 'patch-node':
      return applyPatchNodeCommand(scene, command.nodeId, command.patch)
    case 'remove-nodes':
      return applyRemoveNodesCommand(scene, command.nodeIds)
    case 'reparent-node':
      return applyReparentNodeCommand(
        scene,
        command.nodeId,
        command.parentId,
        command.transform,
      )
  }
}

export function applyEditorNodeCommands(
  scene: EditorSceneDocument,
  commands: EditorNodeCommand[],
): ApplyEditorNodeCommandsResult {
  let nextScene = scene
  let changed = false

  for (const command of commands) {
    const result = applyEditorNodeCommand(nextScene, command)
    nextScene = result.scene
    changed = changed || result.changed
  }

  return {
    scene: nextScene,
    changed,
  }
}
