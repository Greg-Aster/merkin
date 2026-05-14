import { type Writable, get, writable } from 'svelte/store'
import { getLevelRuntimeContract } from '../engine/levelContracts'
import { withEditorSceneEngineData } from '../engine/sceneDocumentRuntime'
import { upgradeLegacySceneDocument } from './defaultScenes'
import {
  applyCollisionLifecycleToPatch,
  materializeEditorNodeCollision,
} from './editorCollisionLifecycle'
import {
  type EditorNodeTransformPatch,
  type EditorSceneCommand,
  type EditorSceneNodePatch,
  applyEditorSceneCommands,
} from './editorCommands'
import { ensureNodeGeneration, ensureSceneGeneration } from './editorGeneration'
import {
  collectDescendantIds,
  collectSubtreeIds,
  createWorldMatrixResolver,
  getCenteredGroupTransform,
  getLocalTransformForWorldMatrix,
  getSharedParentId,
  getTopLevelNodeIds,
} from './editorHierarchyUtils'
import { createEditorHistory } from './editorHistory'
import { normalizeLevelSceneSettings } from './editorLevelSetup'
import {
  exportEditorSceneJson,
  importEditorSceneJson,
  loadEditorSceneFromLocalStorage,
  saveEditorSceneToLocalStorage,
} from './editorPersistence'
import { createEditorPrefabFactory } from './editorPrefabFactory'
import {
  clearSelection,
  editorStateStore,
  markEditorDirty,
  setSelectedNodes,
} from './editorSessionStore'
import type {
  EditorSceneDocument,
  EditorSceneNode,
  EditorSceneSettings,
  SharedLevelEditorSettings,
} from './editorTypes'

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function normalizeSceneDocument(
  scene: EditorSceneDocument,
): EditorSceneDocument {
  const upgraded = upgradeLegacySceneDocument(scene)
  const generated = ensureSceneGeneration({
    ...upgraded,
    settings: normalizeLevelSceneSettings(upgraded.levelId, upgraded.settings),
  })

  return withEditorSceneEngineData({
    ...generated,
    nodes: generated.nodes.map(node =>
      materializeEditorNodeCollision(node, generated.settings),
    ),
  })
}

function cloneScene(scene: EditorSceneDocument | null) {
  return scene
    ? normalizeSceneDocument(structuredClone(scene) as EditorSceneDocument)
    : null
}

function toStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : []
}

export function getRequiredEditorActorIds(scene: EditorSceneDocument | null) {
  if (!scene) return []

  const contract = getLevelRuntimeContract(scene.levelId)
  const runtimeAssets = scene.settings?.level?.runtimeAssets
  return Array.from(
    new Set([
      ...contract.requiredActorIds,
      ...contract.requiredAssetActorIds,
      ...toStringArray(runtimeAssets?.requiredActorIds),
      ...toStringArray(runtimeAssets?.requiredRenderActorIds),
      ...toStringArray(runtimeAssets?.requiredAssetActorIds),
    ]),
  )
}

export function getProtectedSceneNodeRemovalIds(
  scene: EditorSceneDocument | null,
  nodeIds: string[],
) {
  if (!scene || nodeIds.length === 0) return []

  const requiredActorIds = new Set(getRequiredEditorActorIds(scene))
  if (requiredActorIds.size === 0) return []

  const idsToRemove = new Set<string>()
  for (const nodeId of Array.from(new Set(nodeIds))) {
    idsToRemove.add(nodeId)
    for (const descendantId of collectDescendantIds(scene.nodes, nodeId)) {
      idsToRemove.add(descendantId)
    }
  }

  return [...idsToRemove].filter(nodeId => requiredActorIds.has(nodeId))
}

const editorHistory = createEditorHistory<EditorSceneDocument>({
  clone: cloneScene,
})

function mutateScene(
  mutator: (scene: EditorSceneDocument) => EditorSceneDocument,
) {
  const current = get(editorSceneStore)
  if (!current) return

  if (!editorHistory.prepareForMutation(current)) return

  const next = mutator(cloneScene(current)!)
  editorSceneStore.set(next)
  markEditorDirty()
}
export function executeSceneCommand(command: EditorSceneCommand) {
  return executeSceneCommands([command])
}

export function executeSceneCommands(commands: EditorSceneCommand[]) {
  const current = get(editorSceneStore)
  if (!current || commands.length === 0) return false

  const result = applyEditorSceneCommands(cloneScene(current)!, commands)
  if (!result.changed) return false

  mutateScene(() => result.scene)
  return true
}

export const editorSceneStore: Writable<EditorSceneDocument | null> =
  writable(null)
export const { canUndoStore, canRedoStore } = editorHistory

export const editorPrefabs = createEditorPrefabFactory({
  createId,
  addNode,
})

export function createEmptyScene(levelId: string): EditorSceneDocument {
  return {
    levelId,
    version: 1,
    updatedAt: new Date().toISOString(),
    nodes: [],
    settings: {},
  }
}

export function setEditorScene(scene: EditorSceneDocument) {
  const normalized = normalizeSceneDocument(scene)
  editorSceneStore.set(normalized)
  editorHistory.reset()
  editorStateStore.update(state => ({
    ...state,
    currentLevelId: normalized.levelId,
    interactionMode: state.interactionMode,
    isolatedNodeIds: [],
    transformAxis: 'all',
    modalTransformActive: false,
    dirty: false,
    lastSavedAt: normalized.updatedAt,
  }))
}
export function selectAllNodes() {
  const scene = get(editorSceneStore)
  if (!scene) return
  const ids = scene.nodes.map(node => node.id)
  setSelectedNodes(ids, ids[0] ?? null)
}
export function updateSceneSettings(
  updater: (settings: EditorSceneSettings) => EditorSceneSettings,
) {
  const scene = get(editorSceneStore)
  if (!scene) return

  executeSceneCommand({
    type: 'replace-settings',
    settings: normalizeLevelSceneSettings(
      scene.levelId,
      updater(structuredClone(scene.settings ?? {}) as EditorSceneSettings),
    ),
  })
}

export function updateLevelSceneSettings(
  updater: (settings: SharedLevelEditorSettings) => SharedLevelEditorSettings,
) {
  updateSceneSettings(settings => ({
    ...settings,
    level: updater(settings.level ?? {}),
  }))
}
export function addNode(node: EditorSceneNode) {
  const scene = get(editorSceneStore)
  const normalizedNode = materializeEditorNodeCollision(
    ensureNodeGeneration(node),
    scene?.settings,
  )
  const applied = executeSceneCommand({
    type: 'add-node',
    node: normalizedNode,
  })

  if (applied) {
    editorStateStore.update(state => ({
      ...state,
      selectedNodeId: normalizedNode.id,
      selectedNodeIds: [normalizedNode.id],
      selectionAnchorId: normalizedNode.id,
    }))
  }

  return normalizedNode.id
}

function updateNode(
  nodeId: string,
  updater: (node: EditorSceneNode) => EditorSceneNode,
) {
  const scene = get(editorSceneStore)
  if (!scene) return

  const currentNode = scene.nodes.find(node => node.id === nodeId)
  if (!currentNode) return

  const nextNode = updater(structuredClone(currentNode) as EditorSceneNode)
  executeSceneCommand({
    type: 'replace-node',
    nodeId,
    node: nextNode,
  })
}

export function patchNode(nodeId: string, patch: EditorSceneNodePatch) {
  const scene = get(editorSceneStore)
  const currentNode = scene?.nodes.find(node => node.id === nodeId)
  const normalizedPatch = currentNode
    ? applyCollisionLifecycleToPatch(currentNode, patch, scene?.settings)
    : patch

  return executeSceneCommand({
    type: 'patch-node',
    nodeId,
    patch: normalizedPatch,
  })
}

export function patchNodes(nodeIds: string[], patch: EditorSceneNodePatch) {
  const uniqueNodeIds = Array.from(new Set(nodeIds))
  if (uniqueNodeIds.length === 0) return false

  return executeSceneCommands(
    uniqueNodeIds.map(nodeId => {
      const scene = get(editorSceneStore)
      const currentNode = scene?.nodes.find(node => node.id === nodeId)
      return {
        type: 'patch-node',
        nodeId,
        patch: currentNode
          ? applyCollisionLifecycleToPatch(currentNode, patch, scene?.settings)
          : patch,
      }
    }),
  )
}

export function patchNodeTransform(
  nodeId: string,
  transform: EditorNodeTransformPatch,
) {
  return patchNode(nodeId, transform)
}

export function removeNode(nodeId: string) {
  return removeNodes([nodeId])
}

export function removeNodes(nodeIds: string[]) {
  const scene = get(editorSceneStore)
  const protectedIds = getProtectedSceneNodeRemovalIds(scene, nodeIds)
  if (protectedIds.length > 0) {
    console.warn(
      `Blocked deletion of required level actor${protectedIds.length === 1 ? '' : 's'}: ${protectedIds.join(', ')}`,
    )
    return false
  }

  const applied = executeSceneCommand({
    type: 'remove-nodes',
    nodeIds,
  })

  if (applied) {
    clearSelection()
  }

  return applied
}

export function addEmptyNode(
  name = 'Empty',
  parentId: string | null = null,
  position: [number, number, number] = [0, 0, 0],
) {
  return editorPrefabs.addEmpty(name, parentId, position)
}

export function duplicateNode(nodeId: string) {
  return duplicateNodes([nodeId])[0] ?? null
}

export function duplicateNodes(
  nodeIds: string[],
  options?: { offset?: [number, number, number] },
) {
  const scene = get(editorSceneStore)
  if (!scene) return []

  const offset = options?.offset ?? [1, 0, 1]
  const topLevelIds = getTopLevelNodeIds(scene.nodes, nodeIds)
  const idsToDuplicate = new Set<string>()
  const idMap = new Map<string, string>()

  for (const rootId of topLevelIds) {
    const subtreeIds = collectSubtreeIds(scene.nodes, rootId)
    subtreeIds.forEach(id => idsToDuplicate.add(id))
  }

  const copies = scene.nodes
    .filter(node => idsToDuplicate.has(node.id))
    .map(source => {
      const nextId = createId(source.kind)
      idMap.set(source.id, nextId)
      return { source, nextId }
    })
    .map(({ source, nextId }) => ({
      ...structuredClone(source),
      id: nextId,
      name: topLevelIds.includes(source.id)
        ? `${source.name} Copy`
        : source.name,
      parentId: idMap.get(source.parentId ?? '') ?? source.parentId ?? null,
      position: topLevelIds.includes(source.id)
        ? ([
            source.position[0] + offset[0],
            source.position[1] + offset[1],
            source.position[2] + offset[2],
          ] as [number, number, number])
        : ([source.position[0], source.position[1], source.position[2]] as [
            number,
            number,
            number,
          ]),
    }))

  if (copies.length === 0) return []

  const selectedCopyIds = topLevelIds
    .map(nodeId => idMap.get(nodeId) ?? null)
    .filter((nodeId): nodeId is string => nodeId !== null)

  const applied = executeSceneCommands(
    copies.map(node => ({
      type: 'add-node',
      node,
    })),
  )

  if (applied) {
    editorStateStore.update(state => ({
      ...state,
      selectedNodeId: selectedCopyIds[0] ?? null,
      selectedNodeIds: selectedCopyIds,
      selectionAnchorId: selectedCopyIds[0] ?? null,
    }))
  }

  return applied ? selectedCopyIds : []
}

export function reparentNode(
  nodeId: string,
  parentId: string | null,
  options?: { preserveWorldTransform?: boolean },
) {
  const scene = get(editorSceneStore)
  if (!scene) return false
  if (nodeId === parentId) return false

  const descendants = collectDescendantIds(scene.nodes, nodeId)
  if (parentId && descendants.has(parentId)) {
    return false
  }

  const worldMatrix =
    options?.preserveWorldTransform === false
      ? null
      : createWorldMatrixResolver(scene.nodes)(nodeId)

  return executeSceneCommand({
    type: 'reparent-node',
    nodeId,
    parentId,
    ...(worldMatrix
      ? {
          transform: getLocalTransformForWorldMatrix(
            scene.nodes,
            parentId,
            worldMatrix,
          ),
        }
      : {}),
  })
}

export function reparentNodes(nodeIds: string[], parentId: string | null) {
  const scene = get(editorSceneStore)
  if (!scene || nodeIds.length === 0) return false

  let success = true
  let workingScene = scene
  const commands: EditorSceneCommand[] = []

  for (const nodeId of nodeIds) {
    if (nodeId === parentId) {
      success = false
      continue
    }

    const node = workingScene.nodes.find(candidate => candidate.id === nodeId)
    if (!node) {
      success = false
      continue
    }

    const descendants = collectDescendantIds(workingScene.nodes, nodeId)
    if (parentId && descendants.has(parentId)) {
      success = false
      continue
    }

    const worldMatrix = createWorldMatrixResolver(workingScene.nodes)(nodeId)
    const command: EditorSceneCommand = {
      type: 'reparent-node',
      nodeId,
      parentId,
      transform: getLocalTransformForWorldMatrix(
        workingScene.nodes,
        parentId,
        worldMatrix,
      ),
    }

    const result = applyEditorSceneCommands(workingScene, [command])
    if (!result.changed) {
      success = false
      continue
    }

    commands.push(command)
    workingScene = result.scene
  }

  if (commands.length === 0) return false

  return executeSceneCommands(commands) && success
}

export function groupNodes(nodeIds: string[], name = 'Group') {
  const scene = get(editorSceneStore)
  if (!scene) return null

  const topLevelIds = getTopLevelNodeIds(scene.nodes, nodeIds)
  if (topLevelIds.length === 0) return null

  const commonParentId = getSharedParentId(scene.nodes, topLevelIds)
  const groupTransform = getCenteredGroupTransform(
    scene.nodes,
    topLevelIds,
    commonParentId,
  )
  if (!groupTransform) return null
  const getWorldMatrix = createWorldMatrixResolver(scene.nodes)

  const groupId = createId('group')

  const groupNode: EditorSceneNode = {
    id: groupId,
    name,
    kind: 'group',
    parentId: commonParentId,
    visible: true,
    ...groupTransform,
  }

  const commands: EditorSceneCommand[] = [
    {
      type: 'add-node',
      node: groupNode,
    },
  ]
  const sceneWithGroup = applyEditorSceneCommands(scene, commands).scene

  for (const nodeId of topLevelIds) {
    const worldMatrix = getWorldMatrix(nodeId)
    commands.push({
      type: 'reparent-node',
      nodeId,
      parentId: groupId,
      transform: getLocalTransformForWorldMatrix(
        sceneWithGroup.nodes,
        groupId,
        worldMatrix,
      ),
    })
  }

  const applied = executeSceneCommands(commands)
  if (!applied) return null

  setSelectedNodes([groupId], groupId)
  return groupId
}

export function ungroupNodes(nodeIds: string[]) {
  const scene = get(editorSceneStore)
  if (!scene) return []

  const topLevelIds = getTopLevelNodeIds(scene.nodes, nodeIds)
  const groupIds = topLevelIds.filter(
    nodeId => scene.nodes.find(node => node.id === nodeId)?.kind === 'group',
  )
  if (groupIds.length === 0) return []

  const nextSelection: string[] = []
  let workingScene = scene
  const commands: EditorSceneCommand[] = []

  for (const groupId of groupIds) {
    const groupNode = workingScene.nodes.find(node => node.id === groupId)
    if (!groupNode) continue

    const childIds = workingScene.nodes
      .filter(node => node.parentId === groupId)
      .map(node => node.id)
    const groupCommands: EditorSceneCommand[] = []

    if (childIds.length > 0) {
      const getWorldMatrix = createWorldMatrixResolver(workingScene.nodes)
      const parentId = groupNode.parentId ?? null

      for (const childId of childIds) {
        const worldMatrix = getWorldMatrix(childId)
        nextSelection.push(childId)
        groupCommands.push({
          type: 'reparent-node',
          nodeId: childId,
          parentId,
          transform: getLocalTransformForWorldMatrix(
            workingScene.nodes,
            parentId,
            worldMatrix,
          ),
        })
      }
    }

    groupCommands.push({
      type: 'remove-nodes',
      nodeIds: [groupId],
    })

    const result = applyEditorSceneCommands(workingScene, groupCommands)
    if (!result.changed) continue

    commands.push(...groupCommands)
    workingScene = result.scene
  }

  if (commands.length === 0) return []

  const applied = executeSceneCommands(commands)
  if (!applied) return []

  setSelectedNodes(nextSelection, nextSelection[0] ?? null)
  return nextSelection
}

export function startSceneTransaction() {
  editorHistory.startTransaction(get(editorSceneStore))
}

export function endSceneTransaction() {
  editorHistory.endTransaction()
}

export function undoScene() {
  const current = get(editorSceneStore)
  const result = editorHistory.undo(current)
  if (!result.changed) return false

  editorSceneStore.set(result.document)
  editorStateStore.update(state => ({
    ...state,
    dirty: true,
    selectedNodeId: null,
    selectedNodeIds: [],
    selectionAnchorId: null,
  }))
  return true
}

export function redoScene() {
  const current = get(editorSceneStore)
  const result = editorHistory.redo(current)
  if (!result.changed) return false

  editorSceneStore.set(result.document)
  editorStateStore.update(state => ({
    ...state,
    dirty: true,
    selectedNodeId: null,
    selectedNodeIds: [],
    selectionAnchorId: null,
  }))
  return true
}

export function saveSceneToLocalStorage(levelId: string) {
  const scene = get(editorSceneStore)
  if (!scene) return null

  let payload: EditorSceneDocument
  try {
    payload = saveEditorSceneToLocalStorage(levelId, scene)
  } catch (error) {
    console.error('Scene local save failed:', error)
    return null
  }

  editorSceneStore.set(payload)
  editorStateStore.update(state => ({
    ...state,
    dirty: false,
    lastSavedAt: payload.updatedAt,
  }))
  return payload
}

export function loadSceneFromLocalStorage(levelId: string) {
  return loadEditorSceneFromLocalStorage(levelId)
}

export function exportSceneJson() {
  return exportEditorSceneJson(get(editorSceneStore))
}

export function importSceneJson(json: string) {
  const parsed = importEditorSceneJson(json)
  setEditorScene(parsed)
  markEditorDirty()
}
