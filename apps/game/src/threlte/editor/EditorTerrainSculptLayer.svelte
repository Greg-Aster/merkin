<script lang="ts">
import { EDITOR_API_BASE } from '@config/editorApi'
import { useThrelte } from '@threlte/core'
import { onDestroy, onMount } from 'svelte'
import * as THREE from 'three'
import { getLevelCollisionWorkflow } from '../engine/levelCollisionWorkflow'
import { terrainStore } from '../features/terrain/terrainStore'
import {
  type EditorState,
  editorSceneStore,
  editorStateStore,
  endSceneTransaction,
  setOrbitEnabled,
  startSceneTransaction,
  updateLevelSceneSettings,
  updateObservatorySceneSettings,
} from './editorStore'

export let levelId: string

const { scene, camera, renderer } = useThrelte()

let editorState: EditorState | undefined
let editorScene
let terrainState
let previewMesh: THREE.Mesh | null = null
let previewMaterial: THREE.MeshStandardMaterial | null = null
let previewGeometry: THREE.BufferGeometry | null = null
let brushRing: THREE.Mesh | null = null
let brushFill: THREE.Mesh | null = null
let cameraRef: THREE.Camera | null = null
let rendererRef: THREE.WebGLRenderer | null = null
let sculptActive = false
let sculptHeightData: Float32Array | null = null
let flattenTargetHeight = 0
let lastBrushTimestamp = 0
let lastBrushPoint = new THREE.Vector3()
let hasBrushIntersection = false

const pointer = new THREE.Vector2()
const raycaster = new THREE.Raycaster()
const intersectionPoint = new THREE.Vector3()

const unsubEditor = editorStateStore.subscribe(value => {
  editorState = value
})

const unsubScene = editorSceneStore.subscribe(value => {
  editorScene = value
})

const unsubTerrain = terrainStore.subscribe(value => {
  terrainState = value
})

function isTerrainModeActive() {
  const workflow = getLevelCollisionWorkflow(levelId)
  return (
    !!editorState?.enabled &&
    editorState.interactionMode === 'terrain' &&
    !!workflow.terrainSculpting &&
    !!terrainState?.isReady &&
    !!terrainState?.manager &&
    !!terrainState?.heightData
  )
}

function getPreviewStep() {
  const resolution = terrainState?.resolution ?? 0
  if (resolution <= 192) return 1
  return Math.max(1, Math.floor(resolution / 192))
}

function ensurePreviewObjects() {
  if (!previewMesh) {
    previewMaterial = new THREE.MeshStandardMaterial({
      color: '#72c7ff',
      transparent: true,
      opacity: 0.52,
      roughness: 0.9,
      metalness: 0.05,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      side: THREE.DoubleSide,
    })
    previewGeometry = new THREE.BufferGeometry()
    previewMesh = new THREE.Mesh(previewGeometry, previewMaterial)
    previewMesh.renderOrder = 12
    previewMesh.frustumCulled = false
    scene.add(previewMesh)
  }

  if (!brushRing) {
    brushRing = new THREE.Mesh(
      new THREE.RingGeometry(0.92, 1, 48),
      new THREE.MeshBasicMaterial({
        color: '#7ecbff',
        transparent: true,
        opacity: 0.95,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    )
    brushRing.rotation.x = -Math.PI / 2
    brushRing.renderOrder = 20
    brushRing.visible = false
    scene.add(brushRing)
  }

  if (!brushFill) {
    brushFill = new THREE.Mesh(
      new THREE.CircleGeometry(1, 48),
      new THREE.MeshBasicMaterial({
        color: '#7ecbff',
        transparent: true,
        opacity: 0.18,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    )
    brushFill.rotation.x = -Math.PI / 2
    brushFill.renderOrder = 19
    brushFill.visible = false
    scene.add(brushFill)
  }
}

function rebuildPreviewGeometry(
  heightData: Float32Array | null = terrainState?.heightData ?? null,
) {
  if (
    !previewGeometry ||
    !terrainState?.manager ||
    !heightData ||
    terrainState.resolution === 0
  )
    return

  const manager = terrainState.manager
  const resolution = terrainState.resolution
  const step = getPreviewStep()
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
      const height = heightData[gridZ * resolution + gridX]
      positions[vertexIndex * 3 + 0] = world?.x ?? 0
      positions[vertexIndex * 3 + 1] = height
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

  previewGeometry.setAttribute(
    'position',
    new THREE.BufferAttribute(positions, 3),
  )
  previewGeometry.setIndex(new THREE.BufferAttribute(indices, 1))
  previewGeometry.computeVertexNormals()
  previewGeometry.computeBoundingSphere()
}

function updateBrushVisual() {
  const active = isTerrainModeActive() && hasBrushIntersection
  if (!brushRing || !brushFill) return

  brushRing.visible = active
  brushFill.visible = active
  if (!active) return

  const radius = editorState?.terrainBrushSize ?? 12
  brushRing.position.set(
    intersectionPoint.x,
    intersectionPoint.y + 0.15,
    intersectionPoint.z,
  )
  brushFill.position.set(
    intersectionPoint.x,
    intersectionPoint.y + 0.08,
    intersectionPoint.z,
  )
  brushRing.scale.setScalar(radius)
  brushFill.scale.setScalar(radius)

  const color =
    editorState?.terrainBrushMode === 'smooth'
      ? '#7cf8d2'
      : editorState?.terrainBrushMode === 'flatten'
        ? '#ffcf70'
        : '#7ecbff'
  ;(brushRing.material as THREE.MeshBasicMaterial).color.set(color)
  ;(brushFill.material as THREE.MeshBasicMaterial).color.set(color)
}

function updatePointer(event: PointerEvent | MouseEvent) {
  if (!rendererRef || !cameraRef) return false
  const rect = rendererRef.domElement.getBoundingClientRect()
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
  raycaster.setFromCamera(pointer, cameraRef)
  const intersections = previewMesh
    ? raycaster.intersectObject(previewMesh, false)
    : []
  if (intersections.length === 0) {
    hasBrushIntersection = false
    updateBrushVisual()
    return false
  }

  intersectionPoint.copy(intersections[0].point)
  if (terrainState?.manager) {
    intersectionPoint.y = terrainState.manager.getHeightAt(
      intersectionPoint.x,
      intersectionPoint.z,
    )
  }
  hasBrushIntersection = true
  updateBrushVisual()
  return true
}

function brushFalloff(distance: number, radius: number) {
  const normalized = Math.max(0, 1 - distance / radius)
  const exponent = 1 + (editorState?.terrainBrushFalloff ?? 0.65) * 4
  return Math.pow(normalized, exponent)
}

function applyBrushAt(worldX: number, worldZ: number, lower = false) {
  if (!terrainState?.manager) return

  const manager = terrainState.manager
  if (!sculptHeightData) {
    sculptHeightData = manager.getHeightDataCopy()
  }

  const sourceData = new Float32Array(sculptHeightData)
  const resolution = terrainState.resolution
  const brushSize = editorState?.terrainBrushSize ?? 12
  const strength = editorState?.terrainBrushStrength ?? 0.45
  const mode = editorState?.terrainBrushMode ?? 'raise'
  const gridCenter = manager.worldToGrid(worldX, worldZ)
  if (!gridCenter) return

  const worldStepX = manager.getWorldSizeX() / Math.max(resolution - 1, 1)
  const worldStepZ = manager.getWorldSizeZ() / Math.max(resolution - 1, 1)
  const radiusX = Math.ceil(brushSize / worldStepX)
  const radiusZ = Math.ceil(brushSize / worldStepZ)
  const minHeight = manager.getMinHeight()
  const maxHeight = manager.getMaxHeight()

  for (
    let z = Math.max(0, gridCenter.indexZ - radiusZ);
    z <= Math.min(resolution - 1, gridCenter.indexZ + radiusZ);
    z += 1
  ) {
    for (
      let x = Math.max(0, gridCenter.indexX - radiusX);
      x <= Math.min(resolution - 1, gridCenter.indexX + radiusX);
      x += 1
    ) {
      const world = manager.gridToWorld(x, z)
      if (!world) continue
      const distance = Math.hypot(world.x - worldX, world.z - worldZ)
      if (distance > brushSize) continue

      const influence = brushFalloff(distance, brushSize)
      const index = z * resolution + x
      const currentHeight = sculptHeightData[index]
      let nextHeight = currentHeight

      if (mode === 'raise') {
        const direction = lower ? -1 : 1
        nextHeight = currentHeight + direction * strength * influence
      } else if (mode === 'flatten') {
        nextHeight = THREE.MathUtils.lerp(
          currentHeight,
          flattenTargetHeight,
          Math.min(1, strength * influence),
        )
      } else {
        let neighborSum = 0
        let neighborCount = 0
        for (
          let sampleZ = Math.max(0, z - 1);
          sampleZ <= Math.min(resolution - 1, z + 1);
          sampleZ += 1
        ) {
          for (
            let sampleX = Math.max(0, x - 1);
            sampleX <= Math.min(resolution - 1, x + 1);
            sampleX += 1
          ) {
            neighborSum += sourceData[sampleZ * resolution + sampleX]
            neighborCount += 1
          }
        }
        const average =
          neighborCount > 0 ? neighborSum / neighborCount : currentHeight
        nextHeight = THREE.MathUtils.lerp(
          currentHeight,
          average,
          Math.min(1, strength * influence * 0.6),
        )
      }

      sculptHeightData[index] = THREE.MathUtils.clamp(
        nextHeight,
        minHeight,
        maxHeight,
      )
    }
  }

  manager.setHeightData(sculptHeightData)
  terrainStore.update(state => ({
    ...state,
    heightData: new Float32Array(sculptHeightData!),
  }))
  rebuildPreviewGeometry(sculptHeightData)
}

function commitSculptStroke() {
  if (!terrainState?.manager || !sculptHeightData) return

  const baseHeightData = terrainState.manager.getBaseHeightData()
  const overrides: Record<string, number> = {}
  for (let index = 0; index < sculptHeightData.length; index += 1) {
    if (Math.abs(sculptHeightData[index] - baseHeightData[index]) > 0.001) {
      overrides[index.toString()] = Number(sculptHeightData[index].toFixed(4))
    }
  }

  updateObservatorySceneSettings(settings => ({
    ...settings,
    terrainSculpt: {
      ...(settings.terrainSculpt ?? {}),
      heightOverrides: overrides,
    },
  }))

  updateLevelSceneSettings(settings => ({
    ...settings,
    collision: {
      ...(settings.collision ?? {}),
      terrain: {
        ...(settings.collision?.terrain ?? {}),
        source: 'baked-heightmap',
        runtimeSource:
          settings.collision?.terrain?.runtimeSource ?? 'editor-manifest',
        autoBakeOnTerrainChange:
          settings.collision?.terrain?.autoBakeOnTerrainChange ?? false,
        dirty: true,
      },
    },
  }))

  const autoBake =
    editorScene?.settings?.level?.collision?.terrain
      ?.autoBakeOnTerrainChange === true
  if (autoBake) {
    void bakeTerrainCollisionFromEditor()
  }
}

async function bakeTerrainCollisionFromEditor() {
  try {
    const response = await fetch(
      `${EDITOR_API_BASE}/api/editor-terrain/bake-collision`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ levelId }),
      },
    )
    const payload = await response.json()
    if (!payload?.success) {
      throw new Error(payload?.message ?? 'Terrain collision bake failed')
    }
    const collision = payload.collision
    const metadata = payload.metadata
    updateLevelSceneSettings(settings => ({
      ...settings,
      collision: {
        ...(settings.collision ?? {}),
        terrain: {
          ...(settings.collision?.terrain ?? {}),
          source: 'baked-heightmap',
          runtimeSource: 'editor-manifest',
          manifestUrl: getLevelCollisionWorkflow(levelId).terrainManifestUrl,
          heightmapUrl:
            metadata?.sourceHeightmap ??
            settings.collision?.terrain?.heightmapUrl,
          colliderUrl:
            collision?.url ?? settings.collision?.terrain?.colliderUrl,
          metadataUrl:
            collision?.metadataUrl ?? settings.collision?.terrain?.metadataUrl,
          colliderResolution:
            collision?.colliderResolution ??
            settings.collision?.terrain?.colliderResolution,
          triangleCount:
            collision?.triangleCount ??
            settings.collision?.terrain?.triangleCount,
          vertexCount:
            collision?.vertexCount ?? settings.collision?.terrain?.vertexCount,
          autoBakeOnTerrainChange:
            settings.collision?.terrain?.autoBakeOnTerrainChange ?? true,
          dirty: false,
          lastGeneratedAt: new Date().toISOString(),
          heightOverrideCount:
            metadata?.heightOverrideCount ??
            settings.collision?.terrain?.heightOverrideCount,
        },
      },
    }))
  } catch (error) {
    console.error('Editor terrain collision bake failed:', error)
  }
}

function handlePointerDown(event: PointerEvent) {
  if (!isTerrainModeActive() || !rendererRef || event.button !== 0) return
  if (!updatePointer(event)) return

  event.preventDefault()
  event.stopPropagation()
  sculptActive = true
  sculptHeightData = terrainState.manager?.getHeightDataCopy() ?? null
  flattenTargetHeight =
    terrainState.manager?.getHeightAt(
      intersectionPoint.x,
      intersectionPoint.z,
    ) ?? 0
  lastBrushTimestamp = 0
  lastBrushPoint.copy(intersectionPoint)
  setOrbitEnabled(false)
  startSceneTransaction()
  applyBrushAt(intersectionPoint.x, intersectionPoint.z, event.shiftKey)
}

function handlePointerMove(event: PointerEvent) {
  if (!rendererRef || !isTerrainModeActive()) return
  const hasIntersection = updatePointer(event)
  if (!sculptActive || !hasIntersection) return

  const now = performance.now()
  const movedEnough = lastBrushPoint.distanceToSquared(intersectionPoint) > 1
  if (now - lastBrushTimestamp < 16 && !movedEnough) return

  lastBrushTimestamp = now
  lastBrushPoint.copy(intersectionPoint)
  applyBrushAt(intersectionPoint.x, intersectionPoint.z, event.shiftKey)
}

function handlePointerUp() {
  if (!sculptActive) return

  sculptActive = false
  commitSculptStroke()
  sculptHeightData = null
  endSceneTransaction()
  setOrbitEnabled(true)
}

onMount(() => {
  cameraRef = (camera as any).current ?? (camera as any)
  rendererRef = (renderer as any).current ?? (renderer as any)
  ensurePreviewObjects()
  rebuildPreviewGeometry()

  rendererRef?.domElement.addEventListener('pointerdown', handlePointerDown, {
    capture: true,
  })
  rendererRef?.domElement.addEventListener('pointermove', handlePointerMove, {
    capture: true,
  })
  window.addEventListener('pointerup', handlePointerUp)
})

$: cameraRef = (camera as any).current ?? cameraRef
$: rendererRef = (renderer as any).current ?? rendererRef

$: if (previewMesh) {
  const active = isTerrainModeActive()
  previewMesh.visible = active
  if (!active) {
    hasBrushIntersection = false
    updateBrushVisual()
  }
}

$: if (terrainState?.heightData && previewGeometry) {
  rebuildPreviewGeometry(terrainState.heightData)
}

onDestroy(() => {
  unsubEditor()
  unsubScene()
  unsubTerrain()
  rendererRef?.domElement.removeEventListener(
    'pointerdown',
    handlePointerDown,
    { capture: true },
  )
  rendererRef?.domElement.removeEventListener(
    'pointermove',
    handlePointerMove,
    { capture: true },
  )
  window.removeEventListener('pointerup', handlePointerUp)

  previewGeometry?.dispose()
  previewMaterial?.dispose()
  if (brushRing) {
    ;(brushRing.geometry as THREE.BufferGeometry).dispose()
    ;(brushRing.material as THREE.Material).dispose()
    scene.remove(brushRing)
  }
  if (brushFill) {
    ;(brushFill.geometry as THREE.BufferGeometry).dispose()
    ;(brushFill.material as THREE.Material).dispose()
    scene.remove(brushFill)
  }
  if (previewMesh) {
    scene.remove(previewMesh)
  }
})
</script>
