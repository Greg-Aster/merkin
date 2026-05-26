<script lang="ts">
import { T } from '@threlte/core'
import { onMount } from 'svelte'
import { Box3, Vector3 } from 'three'
import type * as THREE from 'three'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

const tentacleModelSrc = '/assets/3D/tentacle.glb'
const gltfLoader = new GLTFLoader()
const bounds = new Box3()
const center = new Vector3()
const size = new Vector3()
const targetSize = new Vector3(1.95, 5.75, 1.4)

gltfLoader.setMeshoptDecoder(MeshoptDecoder)

let model: THREE.Object3D | null = null
let mounted = false

function disposeObjectResources(object: THREE.Object3D) {
  object.traverse(child => {
    const mesh = child as THREE.Mesh
    const geometry = mesh.geometry
    const material = mesh.material

    geometry?.dispose?.()

    const disposeMaterialTextures = (item: THREE.Material) => {
      Object.values(item).forEach(value => {
        const texture = value as THREE.Texture | undefined
        texture?.isTexture && texture.dispose()
      })
    }

    if (Array.isArray(material)) {
      material.forEach(item => {
        disposeMaterialTextures(item)
        item.dispose()
      })
    } else {
      material && disposeMaterialTextures(material)
      material?.dispose?.()
    }
  })
}

function disposeModel() {
  if (!model) return

  disposeObjectResources(model)
  model = null
}

function fitModel(target: THREE.Object3D) {
  target.updateMatrixWorld(true)
  bounds.setFromObject(target)
  if (bounds.isEmpty()) return

  bounds.getCenter(center)
  bounds.getSize(size)

  const fitScale = Math.min(
    targetSize.x / Math.max(size.x, 0.001),
    targetSize.y / Math.max(size.y, 0.001),
    targetSize.z / Math.max(size.z, 0.001),
  )

  target.scale.setScalar(fitScale)
  target.position.set(
    -center.x * fitScale,
    -center.y * fitScale,
    -center.z * fitScale,
  )
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
