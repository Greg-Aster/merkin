<script lang="ts">
import { useTask, useThrelte } from '@threlte/core'
import { onDestroy } from 'svelte'
import * as THREE from 'three'
import { heightmapSourcePreviewNodeIdsStore } from './editorHeightmapSourcePreview'
import { getEditorObject } from './editorRegistry'

const { scene } = useThrelte()

const helpersByNodeId = new Map<string, THREE.Box3Helper>()
const sourceBounds = new THREE.Box3()
const sourceNodeIds = new Set<string>()

function createHelper() {
  const helper = new THREE.Box3Helper(new THREE.Box3(), '#7ecbff')
  helper.name = 'editor-heightmap-source-preview'
  helper.renderOrder = 26
  const material = helper.material as THREE.LineBasicMaterial
  material.transparent = true
  material.opacity = 0.95
  material.depthTest = false
  material.depthWrite = false
  return helper
}

function removeHelper(nodeId: string) {
  const helper = helpersByNodeId.get(nodeId)
  if (!helper) return
  scene.remove(helper)
  ;(helper.material as THREE.Material).dispose()
  helpersByNodeId.delete(nodeId)
}

function syncHelpers() {
  sourceNodeIds.clear()
  for (const nodeId of $heightmapSourcePreviewNodeIdsStore) {
    sourceNodeIds.add(nodeId)
  }

  for (const nodeId of helpersByNodeId.keys()) {
    if (!sourceNodeIds.has(nodeId)) removeHelper(nodeId)
  }

  for (const nodeId of sourceNodeIds) {
    const object = getEditorObject(nodeId)
    if (!object || !object.visible) {
      removeHelper(nodeId)
      continue
    }

    let helper = helpersByNodeId.get(nodeId)
    if (!helper) {
      helper = createHelper()
      helpersByNodeId.set(nodeId, helper)
      scene.add(helper)
    }

    sourceBounds.setFromObject(object)
    helper.box.copy(sourceBounds)
    helper.visible = !sourceBounds.isEmpty()
    helper.updateMatrixWorld(true)
  }
}

useTask(() => {
  syncHelpers()
})

$: if ($heightmapSourcePreviewNodeIdsStore.length === 0) {
  for (const nodeId of Array.from(helpersByNodeId.keys())) {
    removeHelper(nodeId)
  }
}

onDestroy(() => {
  for (const nodeId of Array.from(helpersByNodeId.keys())) {
    removeHelper(nodeId)
  }
})
</script>
