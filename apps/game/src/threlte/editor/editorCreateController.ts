import * as THREE from 'three'
import {
  createWorldMatrixResolver,
  getLocalTransformForWorldMatrix,
} from './editorHierarchyUtils'
import type { EditorPrefabType, EditorSceneNode } from './editorStore'

interface EditorCreateControllerDeps {
  getSelectedNode: () => EditorSceneNode | null
  getSelectedNodes: () => EditorSceneNode[]
  getEditorNodes: () => EditorSceneNode[]
  getActiveSceneLevelId: () => string
  setSaveMessage: (message: string) => void
  addNode: (node: EditorSceneNode) => void
  addEmptyNode: (name: string, parentId?: string | null) => void
  setSelectedNodes: (ids: string[], activeId: string | null) => void
  groupNodes: (ids: string[], name: string) => void
  ungroupNodes: (ids: string[]) => void
  duplicateNodes: (ids: string[]) => void
  removeNodes: (ids: string[]) => void
  editorPrefabs: {
    addAnomaly: (parentId?: string | null) => void
    addMarker: (parentId?: string | null) => void
    addFireflyDialogue: (parentId?: string | null) => void
    addAmbientAudioRegion: (parentId?: string | null) => void
    addFogVolume: (parentId?: string | null) => void
    addMistRegion: (parentId?: string | null) => void
    addPointLight: (parentId?: string | null) => void
    addPrefab: (
      name: string,
      type: EditorPrefabType,
      position: [number, number, number],
      parentId?: string | null,
    ) => void
    addAsset: (
      name: string,
      url: string,
      parentId?: string | null,
      scale?: [number, number, number],
    ) => void
  }
}

export function createEditorCreateController(deps: EditorCreateControllerDeps) {
  function addPrimitivePrefab(
    type:
      | 'anomaly'
      | 'marker'
      | 'light'
      | 'firefly'
      | 'audio-region'
      | 'fog-volume'
      | 'mist-region',
  ) {
    const parentId = deps.getSelectedNode()?.id ?? null
    if (type === 'anomaly') deps.editorPrefabs.addAnomaly(parentId)
    else if (type === 'marker') deps.editorPrefabs.addMarker(parentId)
    else if (type === 'firefly') deps.editorPrefabs.addFireflyDialogue(parentId)
    else if (type === 'audio-region')
      deps.editorPrefabs.addAmbientAudioRegion(parentId)
    else if (type === 'fog-volume') deps.editorPrefabs.addFogVolume(parentId)
    else if (type === 'mist-region') deps.editorPrefabs.addMistRegion(parentId)
    else deps.editorPrefabs.addPointLight(parentId)
  }

  function addFireflyToSelection() {
    const selectedNodes = deps.getSelectedNodes()
    const targetNodes = selectedNodes.filter(node => !node.gameplay)
    if (targetNodes.length === 0) {
      deps.setSaveMessage(
        'Select one or more scene objects before adding fireflies',
      )
      return
    }

    const editorNodes = deps.getEditorNodes()
    const getWorldMatrix = createWorldMatrixResolver(editorNodes)
    const createdIds: string[] = []

    for (const targetNode of targetNodes) {
      const worldMatrix = getWorldMatrix(targetNode.id)
      const worldPosition = new THREE.Vector3()
      const worldQuaternion = new THREE.Quaternion()
      const worldScale = new THREE.Vector3()
      worldMatrix.decompose(worldPosition, worldQuaternion, worldScale)

      const targetWorldMatrix = new THREE.Matrix4().compose(
        new THREE.Vector3(
          worldPosition.x,
          worldPosition.y + Math.abs(worldScale.y) * 0.5 + 0.8,
          worldPosition.z,
        ),
        new THREE.Quaternion(),
        new THREE.Vector3(1, 1, 1),
      )

      const localTransform = getLocalTransformForWorldMatrix(
        editorNodes,
        targetNode.parentId ?? null,
        targetWorldMatrix,
      )
      const fireflyId = `firefly-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

      deps.addNode({
        id: fireflyId,
        name: `${targetNode.name} Firefly`,
        kind: 'group',
        parentId: targetNode.parentId ?? null,
        position: localTransform.position,
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        visible: true,
        gameplay: {
          type: 'firefly',
          markerColor: '#f5f1a8',
          markerSize: 0.52,
          title: targetNode.name,
          author: 'Pillar Firefly',
          location: deps.getActiveSceneLevelId(),
          excerpt: `A patient glow hovers above ${targetNode.name}.`,
          body: `A solitary firefly keeps watch above ${targetNode.name}.`,
        },
      })

      createdIds.push(fireflyId)
    }

    if (createdIds.length > 0) {
      deps.setSelectedNodes(createdIds, createdIds[0] ?? null)
      deps.setSaveMessage(
        `Added ${createdIds.length} firefl${createdIds.length === 1 ? 'y' : 'ies'} to selection`,
      )
    }
  }

  function addPrefabWithParent(
    name: string,
    type: EditorPrefabType,
    position: [number, number, number] = [0, 0, 0],
  ) {
    deps.editorPrefabs.addPrefab(
      name,
      type,
      position,
      deps.getSelectedNode()?.id ?? null,
    )
  }

  function addAssetPrefab(
    name: string,
    url: string,
    scale: [number, number, number] = [0.001, 0.001, 0.001],
  ) {
    deps.editorPrefabs.addAsset(
      name,
      url,
      deps.getSelectedNode()?.id ?? null,
      scale,
    )
  }

  function addEmpty() {
    deps.addEmptyNode('Empty', deps.getSelectedNode()?.id ?? null)
  }

  function groupSelection() {
    const ids = deps.getSelectedNodes().map(node => node.id)
    if (ids.length < 1) return
    deps.groupNodes(ids, ids.length > 1 ? 'Group' : 'Empty Group')
  }

  function ungroupSelection() {
    const ids = deps.getSelectedNodes().map(node => node.id)
    if (ids.length === 0) return
    deps.ungroupNodes(ids)
  }

  function duplicateSelection() {
    const selectedNodes = deps.getSelectedNodes()
    const selectedNode = deps.getSelectedNode()
    const ids = selectedNodes.map(node => node.id)
    if (ids.length === 0 && selectedNode) {
      deps.duplicateNodes([selectedNode.id])
      return
    }
    if (ids.length > 0) {
      deps.duplicateNodes(ids)
    }
  }

  function deleteSelection() {
    const selectedNodes = deps.getSelectedNodes()
    const selectedNode = deps.getSelectedNode()
    const ids = selectedNodes.map(node => node.id)
    if (ids.length === 0 && selectedNode) {
      deps.removeNodes([selectedNode.id])
      return
    }
    if (ids.length > 0) {
      deps.removeNodes(ids)
    }
  }

  return {
    addPrimitivePrefab,
    addFireflyToSelection,
    addPrefabWithParent,
    addAssetPrefab,
    addEmpty,
    groupSelection,
    ungroupSelection,
    duplicateSelection,
    deleteSelection,
  }
}
