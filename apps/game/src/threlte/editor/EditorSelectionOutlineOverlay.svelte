<script lang="ts">
import { useTask, useThrelte } from '@threlte/core'
import { onDestroy } from 'svelte'
import * as THREE from 'three'
import { getEditorObject } from './editorRegistry'

export let selectedNodeId: string | null = null
export let selectedNodeIds: string[] = []

const { scene } = useThrelte()

const helpersByNodeId = new Map<string, THREE.Box3Helper>()
const selectedSet = new Set<string>()
const bounds = new THREE.Box3()

function createHelper(nodeId: string) {
  const helper = new THREE.Box3Helper(new THREE.Box3(), getColor(nodeId))
  helper.name = 'editor-selection-outline'
  helper.renderOrder = 28
  const material = helper.material as THREE.LineBasicMaterial
  material.transparent = true
  material.opacity = 0.92
  material.depthTest = false
  material.depthWrite = false
  return helper
}

function getColor(nodeId: string) {
  return nodeId === selectedNodeId ? '#ffd27a' : '#7ecbff'
}

function updateHelperColor(helper: THREE.Box3Helper, nodeId: string) {
  const material = helper.material as THREE.LineBasicMaterial
  material.color.set(getColor(nodeId))
}

function removeHelper(nodeId: string) {
  const helper = helpersByNodeId.get(nodeId)
  if (!helper) return
  scene.remove(helper)
  ;(helper.material as THREE.Material).dispose()
  helpersByNodeId.delete(nodeId)
}

function syncHelpers() {
  selectedSet.clear()
  for (const nodeId of selectedNodeIds) {
    selectedSet.add(nodeId)
  }

  for (const nodeId of helpersByNodeId.keys()) {
    if (!selectedSet.has(nodeId)) removeHelper(nodeId)
  }

  for (const nodeId of selectedSet) {
    const object = getEditorObject(nodeId)
    if (!object || !object.visible) {
      removeHelper(nodeId)
      continue
    }

    let helper = helpersByNodeId.get(nodeId)
    if (!helper) {
      helper = createHelper(nodeId)
      helpersByNodeId.set(nodeId, helper)
      scene.add(helper)
    }

    bounds.setFromObject(object)
    helper.box.copy(bounds)
    helper.visible = !bounds.isEmpty()
    updateHelperColor(helper, nodeId)
    helper.updateMatrixWorld(true)
  }
}

useTask(() => {
  syncHelpers()
})

$: if (selectedNodeIds.length === 0) {
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
