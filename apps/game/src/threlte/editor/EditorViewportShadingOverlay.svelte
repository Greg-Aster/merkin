<script lang="ts">
import { useTask, useThrelte } from '@threlte/core'
import { onDestroy } from 'svelte'
import * as THREE from 'three'
import { editorStateStore } from './editorStore'
import type { EditorViewportShadingMode } from './editorTypes'

const { scene } = useThrelte()

const authoredMaterialsByMesh = new Map<
  THREE.Mesh,
  THREE.Material | THREE.Material[]
>()
const solidMaterial = new THREE.MeshStandardMaterial({
  color: '#b9c4d3',
  roughness: 0.92,
  metalness: 0,
  side: THREE.DoubleSide,
})
const wireframeMaterial = new THREE.MeshBasicMaterial({
  color: '#8fd3ff',
  wireframe: true,
  transparent: true,
  opacity: 0.74,
  depthWrite: false,
  side: THREE.DoubleSide,
})

let syncAccumulator = 0
let lastAppliedMode: EditorViewportShadingMode | 'off' = 'off'

function getEffectiveMode(): EditorViewportShadingMode | 'off' {
  if (!$editorStateStore.enabled) return 'off'
  return $editorStateStore.viewportShadingMode ?? 'rendered'
}

function getOverrideMaterial(mode: EditorViewportShadingMode) {
  if (mode === 'solid') return solidMaterial
  if (mode === 'wireframe') return wireframeMaterial
  return null
}

function restoreAuthoredMaterials() {
  for (const [mesh, material] of authoredMaterialsByMesh.entries()) {
    mesh.material = material
  }
  authoredMaterialsByMesh.clear()
}

function isSkippableObject(object: THREE.Object3D) {
  let current: THREE.Object3D | null = object
  while (current) {
    if (
      current.userData.editorViewportOverlay ||
      current.name.startsWith('editor-selection-outline') ||
      current.name.startsWith('editor-heightmap-source-preview') ||
      current.name.startsWith('editor-workbench-lighting') ||
      current.type.includes('Helper') ||
      current.type.includes('TransformControls')
    ) {
      return true
    }
    current = current.parent
  }
  return false
}

function applyShadingMode(mode: EditorViewportShadingMode | 'off') {
  if (mode === 'off' || mode === 'rendered') {
    restoreAuthoredMaterials()
    lastAppliedMode = mode
    return
  }

  const overrideMaterial = getOverrideMaterial(mode)
  if (!overrideMaterial) return

  scene.traverse(object => {
    if (!(object instanceof THREE.Mesh) || isSkippableObject(object)) return

    if (!authoredMaterialsByMesh.has(object)) {
      authoredMaterialsByMesh.set(object, object.material)
    }
    if (object.material !== overrideMaterial) {
      object.material = overrideMaterial
    }
  })

  lastAppliedMode = mode
}

$: {
  const effectiveMode = getEffectiveMode()
  if (effectiveMode !== lastAppliedMode) {
    applyShadingMode(effectiveMode)
  }
}

useTask(delta => {
  const effectiveMode = getEffectiveMode()
  if (effectiveMode === 'off' || effectiveMode === 'rendered') return

  syncAccumulator += delta
  if (syncAccumulator < 0.3) return
  syncAccumulator = 0
  applyShadingMode(effectiveMode)
})

onDestroy(() => {
  restoreAuthoredMaterials()
  solidMaterial.dispose()
  wireframeMaterial.dispose()
})
</script>
