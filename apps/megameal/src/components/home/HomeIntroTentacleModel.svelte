<script lang="ts">
import { T } from '@threlte/core'
import { onMount } from 'svelte'
import { Box3, Color, Vector3 } from 'three'
import type * as THREE from 'three'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

const tentacleModelSrc = '/assets/3D/tentacle2.glb'
const gltfLoader = new GLTFLoader()
const bounds = new Box3()
const center = new Vector3()
const size = new Vector3()
const untexturedColor = new Color('#6d3fa3')

gltfLoader.setMeshoptDecoder(MeshoptDecoder)

let model: THREE.Object3D | null = null
let mounted = false

export let targetHeight = 5.75

function disposeObjectResources(object: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>()
  const materials = new Set<THREE.Material>()
  const textures = new Set<THREE.Texture>()

  object.traverse(child => {
    const mesh = child as THREE.Mesh
    if (!mesh.isMesh) return

    mesh.geometry && geometries.add(mesh.geometry)
    const meshMaterials = Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material]

    meshMaterials.forEach(material => {
      if (!material) return
      materials.add(material)
      Object.values(material).forEach(value => {
        const texture = value as THREE.Texture | undefined
        if (texture?.isTexture) textures.add(texture)
      })
    })
  })

  geometries.forEach(geometry => geometry.dispose())
  materials.forEach(material => material.dispose())
  textures.forEach(texture => texture.dispose())
}

function disposeModel() {
  if (!model) return

  model.parent?.remove(model)
  disposeObjectResources(model)
  model = null
}

function fitModel(target: THREE.Object3D) {
  target.updateMatrixWorld(true)
  bounds.setFromObject(target)
  if (bounds.isEmpty()) return

  bounds.getCenter(center)
  bounds.getSize(size)
  const fitScale = targetHeight / Math.max(size.y, 0.001)

  target.scale.setScalar(fitScale)
  target.position.set(
    -center.x * fitScale,
    -center.y * fitScale,
    -center.z * fitScale,
  )
}

function tuneModel(target: THREE.Object3D) {
  target.traverse(child => {
    const mesh = child as THREE.Mesh
    if (!mesh.isMesh) return

    mesh.castShadow = false
    mesh.receiveShadow = false
    mesh.frustumCulled = false

    const materials = Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material]

    materials.forEach(item => {
      const material = item as THREE.MeshStandardMaterial | undefined
      if (!material?.isMeshStandardMaterial) return

      if (material.map) {
        material.emissive.set(0xffffff)
        material.emissiveMap = material.map
        material.emissiveIntensity = 0.72
      } else {
        material.color.copy(untexturedColor)
        material.emissive.copy(untexturedColor)
        material.emissiveIntensity = 0.78
      }
      material.metalness = 0.02
      material.roughness = 0.86
      material.needsUpdate = true
    })
  })
}

async function loadModel() {
  try {
    const gltf = await gltfLoader.loadAsync(tentacleModelSrc)
    const loadedModel = gltf.scene ?? gltf.scenes?.[0] ?? null

    if (!loadedModel) return
    if (!mounted) {
      disposeObjectResources(loadedModel)
      return
    }

    disposeModel()
    fitModel(loadedModel)
    tuneModel(loadedModel)
    model = loadedModel
  } catch (error) {
    console.error('Failed to load portal tentacle mesh:', error)
  }
}

onMount(() => {
  mounted = true
  void loadModel()

  return () => {
    mounted = false
    disposeModel()
  }
})
</script>

{#if model}
	<T is={model} />
{/if}
