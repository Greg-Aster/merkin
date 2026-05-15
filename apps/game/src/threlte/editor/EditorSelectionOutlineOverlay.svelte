<script lang="ts">
import { useTask } from '@threlte/core'
import { onDestroy } from 'svelte'
import * as THREE from 'three'
import { getEditorObject } from './editorRegistry'

export let selectedNodeId: string | null = null
export let selectedNodeIds: string[] = []

type MeshWithGeometry = THREE.Mesh<THREE.BufferGeometry, THREE.Material>

interface SelectionOutlineRecord {
  meshSignature: string
  material: THREE.MeshBasicMaterial
  outlines: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>[]
}

const outlineRecordsByNodeId = new Map<string, SelectionOutlineRecord>()
const selectedSet = new Set<string>()
const outlineScale = 1.018

function getColor(nodeId: string) {
  return nodeId === selectedNodeId ? '#ffd27a' : '#7ecbff'
}

function getOpacity(nodeId: string) {
  return nodeId === selectedNodeId ? 0.9 : 0.72
}

function isSelectionOutlineObject(object: THREE.Object3D) {
  return (
    object.userData.editorSelectionOutline === true ||
    object.name.startsWith('editor-selection-outline')
  )
}

function isRenderableMesh(object: THREE.Object3D): object is MeshWithGeometry {
  const mesh = object as THREE.Mesh
  return (
    mesh.isMesh === true &&
    mesh.geometry instanceof THREE.BufferGeometry &&
    !isSelectionOutlineObject(mesh) &&
    mesh.visible
  )
}

function collectRenderableMeshes(root: THREE.Object3D) {
  const meshes: MeshWithGeometry[] = []
  root.traverse(object => {
    if (isRenderableMesh(object)) meshes.push(object)
  })
  return meshes
}

function getMeshSignature(meshes: MeshWithGeometry[]) {
  return meshes.map(mesh => `${mesh.uuid}:${mesh.geometry.uuid}`).join('|')
}

function createOutlineMaterial(nodeId: string) {
  const material = new THREE.MeshBasicMaterial({
    color: getColor(nodeId),
    transparent: true,
    opacity: getOpacity(nodeId),
    side: THREE.BackSide,
    depthTest: true,
    depthWrite: false,
  })
  material.toneMapped = false
  return material
}

function createOutlineMesh(
  nodeId: string,
  sourceMesh: MeshWithGeometry,
  material: THREE.MeshBasicMaterial,
) {
  const outline = new THREE.Mesh(sourceMesh.geometry, material)
  outline.name = `editor-selection-outline:${nodeId}`
  outline.renderOrder = 28
  outline.scale.setScalar(outlineScale)
  outline.frustumCulled = false
  outline.userData.editorSelectionOutline = true
  outline.raycast = () => {}
  sourceMesh.add(outline)
  return outline
}

function updateRecordMaterial(record: SelectionOutlineRecord, nodeId: string) {
  record.material.color.set(getColor(nodeId))
  record.material.opacity = getOpacity(nodeId)
}

function removeRecord(nodeId: string) {
  const record = outlineRecordsByNodeId.get(nodeId)
  if (!record) return

  for (const outline of record.outlines) {
    outline.removeFromParent()
  }
  record.material.dispose()
  outlineRecordsByNodeId.delete(nodeId)
}

function createRecord(
  nodeId: string,
  meshes: MeshWithGeometry[],
  meshSignature: string,
) {
  const material = createOutlineMaterial(nodeId)
  const outlines = meshes.map(mesh => createOutlineMesh(nodeId, mesh, material))
  return {
    meshSignature,
    material,
    outlines,
  } satisfies SelectionOutlineRecord
}

function syncSelectionOutlines() {
  selectedSet.clear()
  for (const nodeId of selectedNodeIds) selectedSet.add(nodeId)

  for (const nodeId of Array.from(outlineRecordsByNodeId.keys())) {
    if (!selectedSet.has(nodeId)) removeRecord(nodeId)
  }

  for (const nodeId of selectedSet) {
    const object = getEditorObject(nodeId)
    if (!object || !object.visible) {
      removeRecord(nodeId)
      continue
    }

    const meshes = collectRenderableMeshes(object)
    const meshSignature = getMeshSignature(meshes)
    if (meshes.length === 0 || meshSignature.length === 0) {
      removeRecord(nodeId)
      continue
    }

    const record = outlineRecordsByNodeId.get(nodeId)
    if (!record || record.meshSignature !== meshSignature) {
      removeRecord(nodeId)
      outlineRecordsByNodeId.set(
        nodeId,
        createRecord(nodeId, meshes, meshSignature),
      )
      continue
    }

    updateRecordMaterial(record, nodeId)
  }
}

useTask(() => {
  syncSelectionOutlines()
})

$: if (selectedNodeIds.length === 0) {
  for (const nodeId of Array.from(outlineRecordsByNodeId.keys())) {
    removeRecord(nodeId)
  }
}

onDestroy(() => {
  for (const nodeId of Array.from(outlineRecordsByNodeId.keys())) {
    removeRecord(nodeId)
  }
})
</script>
