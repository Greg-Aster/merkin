<script lang="ts">
import { useThrelte } from '@threlte/core'
import { onDestroy, onMount } from 'svelte'
import * as THREE from 'three'
import { getLevelCollisionWorkflow } from '../engine/levelCollisionWorkflow'
import { terrainStore } from '../features/terrain/terrainStore'
import { editorStateStore } from './editorStore'

export let levelId: string

const { scene } = useThrelte()

let editorState
let terrainState
let terrainMesh: THREE.Mesh | null = null
let terrainGeometry: THREE.BufferGeometry | null = null
let terrainMaterial: THREE.MeshBasicMaterial | null = null
let boundsMesh: THREE.Mesh | null = null
let terrainGeometrySignature = ''

const unsubEditor = editorStateStore.subscribe(value => {
  editorState = value
})

const unsubTerrain = terrainStore.subscribe(value => {
  terrainState = value
})

function shouldShowTerrainOverlay() {
  const workflow = getLevelCollisionWorkflow(levelId)
  return (
    !!editorState?.enabled &&
    !!editorState?.collisionOverlayEnabled &&
    !!levelId &&
    workflow.terrainCollision === 'heightmap' &&
    !!terrainState?.manager &&
    !!terrainState?.heightData &&
    terrainState?.resolution > 0
  )
}

function ensureObjects() {
  if (!terrainMesh) {
    terrainGeometry = new THREE.BufferGeometry()
    terrainMaterial = new THREE.MeshBasicMaterial({
      color: '#ff8c63',
      wireframe: true,
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
      depthTest: false,
    })
    terrainMesh = new THREE.Mesh(terrainGeometry, terrainMaterial)
    terrainMesh.frustumCulled = false
    terrainMesh.renderOrder = 16
    scene.add(terrainMesh)
  }

  if (!boundsMesh) {
    boundsMesh = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial({
        color: '#ffd27a',
        wireframe: true,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
        depthTest: false,
      }),
    )
    boundsMesh.renderOrder = 17
    boundsMesh.visible = false
    scene.add(boundsMesh)
  }
}

function rebuildTerrainGeometry() {
  if (
    !terrainGeometry ||
    !terrainState?.manager ||
    !terrainState?.heightData ||
    terrainState.resolution === 0
  )
    return

  const signature = [
    levelId,
    terrainState.resolution,
    terrainState.worldSize,
    terrainState.worldSizeX,
    terrainState.worldSizeZ,
    terrainState.bounds
      ? `${terrainState.bounds.min.join(',')}:${terrainState.bounds.max.join(',')}`
      : 'no-bounds',
  ].join('|')
  if (signature === terrainGeometrySignature) return
  terrainGeometrySignature = signature

  const manager = terrainState.manager
  const resolution = terrainState.resolution
  const step = resolution <= 160 ? 1 : Math.max(1, Math.floor(resolution / 160))
  const cells = Math.ceil((resolution - 1) / step)
  const vertsX = cells + 1
  const vertsZ = cells + 1
  const positions = new Float32Array(vertsX * vertsZ * 3)
  const indices = new Uint32Array(cells * cells * 6)

  let vertexIndex = 0
  for (let z = 0; z < vertsZ; z += 1) {
    const gridZ = Math.min(z * step, resolution - 1)
    for (let x = 0; x < vertsX; x += 1) {
      const gridX = Math.min(x * step, resolution - 1)
      const world = manager.gridToWorld(gridX, gridZ)
      const height = terrainState.heightData[gridZ * resolution + gridX]
      positions[vertexIndex * 3 + 0] = world?.x ?? 0
      positions[vertexIndex * 3 + 1] = height + 0.04
      positions[vertexIndex * 3 + 2] = world?.z ?? 0
      vertexIndex += 1
    }
  }

  let indexOffset = 0
  for (let z = 0; z < cells; z += 1) {
    for (let x = 0; x < cells; x += 1) {
      const i0 = z * vertsX + x
      const i1 = i0 + 1
      const i2 = i0 + vertsX
      const i3 = i2 + 1
      indices[indexOffset++] = i0
      indices[indexOffset++] = i2
      indices[indexOffset++] = i1
      indices[indexOffset++] = i1
      indices[indexOffset++] = i2
      indices[indexOffset++] = i3
    }
  }

  terrainGeometry.setAttribute(
    'position',
    new THREE.BufferAttribute(positions, 3),
  )
  terrainGeometry.setIndex(new THREE.BufferAttribute(indices, 1))
  terrainGeometry.computeBoundingSphere()
}

function updateBoundsMesh() {
  if (!boundsMesh) return
  const bounds = terrainState?.bounds
  if (!bounds) {
    boundsMesh.visible = false
    return
  }

  boundsMesh.visible = shouldShowTerrainOverlay()
  boundsMesh.position.set(
    (bounds.min[0] + bounds.max[0]) / 2,
    (bounds.min[1] + bounds.max[1]) / 2,
    (bounds.min[2] + bounds.max[2]) / 2,
  )
  boundsMesh.scale.set(
    bounds.max[0] - bounds.min[0],
    bounds.max[1] - bounds.min[1],
    bounds.max[2] - bounds.min[2],
  )
}

onMount(() => {
  ensureObjects()
  rebuildTerrainGeometry()
  updateBoundsMesh()
})

$: if (shouldShowTerrainOverlay()) {
  ensureObjects()
}

$: if (terrainMesh) {
  terrainMesh.visible = shouldShowTerrainOverlay()
}

$: if (terrainState?.heightData && terrainGeometry) {
  rebuildTerrainGeometry()
}

$: if (boundsMesh) {
  updateBoundsMesh()
}

onDestroy(() => {
  unsubEditor()
  unsubTerrain()
  terrainGeometry?.dispose()
  terrainMaterial?.dispose()
  if (terrainMesh) scene.remove(terrainMesh)
  if (boundsMesh) {
    ;(boundsMesh.geometry as THREE.BufferGeometry).dispose()
    ;(boundsMesh.material as THREE.Material).dispose()
    scene.remove(boundsMesh)
  }
})
</script>
