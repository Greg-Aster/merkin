import { derived } from 'svelte/store'
import { editorSceneStore } from './editorDocumentStore'
import { mergeObservatoryEditorSettings, mergeSolitudeEditorSettings } from './editorLevelSetup'
import { editorStateStore } from './editorSessionStore'
import { collectDescendantIds, createNodeLookup } from './editorHierarchyUtils'

export interface EditorNodeViewportState {
  effectiveVisible: boolean
  isolated: boolean
  dimmed: boolean
  locked: boolean
}

export const editorSceneSettingsStore = derived(editorSceneStore, ($scene) => $scene?.settings ?? {})

export const levelEditorSettingsStore = derived(
  editorSceneSettingsStore,
  ($settings) => $settings.level ?? null
)

export const observatoryEditorSettingsStore = derived(
  editorSceneSettingsStore,
  ($settings) => mergeObservatoryEditorSettings($settings)
)

export const solitudeEditorSettingsStore = derived(
  editorSceneSettingsStore,
  ($settings) => mergeSolitudeEditorSettings($settings)
)

export const selectedEditorNodeStore = derived(
  [editorStateStore, editorSceneStore],
  ([$editorStateStore, $editorSceneStore]) => {
    if (!$editorSceneStore || !$editorStateStore.selectedNodeId) return null
    return $editorSceneStore.nodes.find((node) => node.id === $editorStateStore.selectedNodeId) ?? null
  }
)

export const selectedEditorNodesStore = derived(
  [editorStateStore, editorSceneStore],
  ([$editorStateStore, $editorSceneStore]) => {
    if (!$editorSceneStore || $editorStateStore.selectedNodeIds.length === 0) return []
    return $editorSceneStore.nodes.filter((node) => $editorStateStore.selectedNodeIds.includes(node.id))
  }
)

export const editorNodesStore = derived(editorSceneStore, ($scene) => $scene?.nodes ?? [])

export const editorRootNodesStore = derived(
  editorNodesStore,
  ($nodes) => $nodes.filter((node) => !node.parentId)
)

export const isolationActiveStore = derived(
  editorStateStore,
  ($editorStateStore) => $editorStateStore.isolatedNodeIds.length > 0
)

export const editorNodeViewportStateStore = derived(
  [editorNodesStore, editorStateStore],
  ([$nodes, $editorStateStore]) => {
    const isolatedNodeIds = $editorStateStore.isolatedNodeIds.filter((nodeId) => $nodes.some((node) => node.id === nodeId))
    const isolatedSet = new Set(isolatedNodeIds)
    const allowedSet = new Set<string>()
    const lookup = createNodeLookup($nodes)

    if (isolatedSet.size > 0) {
      for (const nodeId of isolatedSet) {
        allowedSet.add(nodeId)
        const descendants = collectDescendantIds($nodes, nodeId)
        descendants.forEach((id) => allowedSet.add(id))

        let currentParentId = lookup.get(nodeId)?.parentId ?? null
        while (currentParentId) {
          allowedSet.add(currentParentId)
          currentParentId = lookup.get(currentParentId)?.parentId ?? null
        }
      }
    }

    return new Map(
      $nodes.map((node) => [
        node.id,
        {
          effectiveVisible: node.visible && (isolatedSet.size === 0 || allowedSet.has(node.id)),
          isolated: isolatedSet.has(node.id),
          dimmed: isolatedSet.size > 0 && !allowedSet.has(node.id),
          locked: node.locked ?? false,
        } satisfies EditorNodeViewportState,
      ])
    )
  }
)
