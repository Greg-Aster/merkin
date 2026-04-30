<script lang="ts">
import { T } from '@threlte/core'
import { onDestroy } from 'svelte'
import * as THREE from 'three'
import {
  cloneCachedGltfScene,
  disposeCachedGltfScene,
} from '../utils/gltfAssetCache'

export let url = ''
export let color = '#4df0ff'

let scene: THREE.Group | null = null
let disposed = false
let loadToken = 0
let loadedUrl = ''

function disposeScene(root: THREE.Object3D | null) {
  if (!root) return
  disposeCachedGltfScene(root)
}

function disposeMeshMaterial(material: THREE.Material | THREE.Material[]) {
  if (Array.isArray(material)) {
    material.forEach(entry => entry.dispose?.())
    return
  }

  material.dispose?.()
}

async function loadHelperScene(nextUrl: string) {
  const token = ++loadToken

  try {
    const nextScene = await cloneCachedGltfScene(nextUrl)
    if (disposed || token !== loadToken) {
      disposeScene(nextScene)
      return
    }

    const helperMaterial = new THREE.MeshBasicMaterial({
      color,
      depthTest: false,
      depthWrite: false,
      opacity: 0.42,
      transparent: true,
      wireframe: true,
    })

    nextScene.traverse(child => {
      if (!(child instanceof THREE.Mesh)) return
      disposeMeshMaterial(child.material)
      child.material = helperMaterial
      child.renderOrder = 18
      child.frustumCulled = false
    })

    const previousScene = scene
    scene = nextScene
    if (previousScene && previousScene !== scene) {
      disposeScene(previousScene)
    }
  } catch (error) {
    if (!disposed) {
      console.warn('Failed to load mesh collision helper:', nextUrl, error)
    }
    scene = null
  }
}

$: if (url && url !== loadedUrl) {
  loadedUrl = url
  void loadHelperScene(url)
}

onDestroy(() => {
  disposed = true
  loadToken += 1
  disposeScene(scene)
})
</script>

{#if scene}
  <T is={scene} />
{/if}
