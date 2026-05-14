<script lang="ts">
import { T } from '@threlte/core'
import { onDestroy } from 'svelte'
import * as THREE from 'three'
import type { AssetLocalTransformMetadata } from '../engine/assetLocalTransform'
import { applyAssetLocalTransformToObject } from '../engine/assetLocalTransform'
import {
  cloneCachedGltfScene,
  disposeCachedGltfScene,
} from '../utils/gltfAssetCache'
import {
  loadAssetLocalTransformMetadata,
  validateInlineAssetLocalTransform,
} from './assetTrimeshColliderMetadata'

export let url = ''
export let metadataUrl = ''
export let assetLocalTransform: AssetLocalTransformMetadata | null = null
export let color = '#4df0ff'

let scene: THREE.Group | null = null
let disposed = false
let loadToken = 0
let loadedKey = ''

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

async function loadHelperScene(
  nextUrl: string,
  nextMetadataUrl: string,
  inlineAssetLocalTransform: AssetLocalTransformMetadata | null,
) {
  const token = ++loadToken

  try {
    const [nextScene, metadataValidation] = await Promise.all([
      cloneCachedGltfScene(nextUrl),
      nextMetadataUrl
        ? loadAssetLocalTransformMetadata(nextMetadataUrl)
        : Promise.resolve(
            validateInlineAssetLocalTransform(inlineAssetLocalTransform),
          ),
    ])
    if (disposed || token !== loadToken) {
      disposeScene(nextScene)
      return
    }

    if (
      metadataValidation.state === 'malformed' ||
      metadataValidation.state === 'invalid'
    ) {
      console.warn(
        'Invalid asset-local collider metadata; helper uses legacy placement:',
        nextUrl,
        metadataValidation.errors,
      )
    }
    applyAssetLocalTransformToObject(nextScene, metadataValidation.metadata)

    const helperMaterial = new THREE.MeshBasicMaterial({
      color,
      depthTest: false,
      depthWrite: false,
      opacity: 0.82,
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

$: inlineMatrix =
  assetLocalTransform?.visualToPhysicsLocalMatrix ??
  assetLocalTransform?.visualToPhysicsMatrix
$: loadKey = `${url}|${metadataUrl}|${inlineMatrix ? JSON.stringify(inlineMatrix) : ''}`
$: if (url && loadKey !== loadedKey) {
  loadedKey = loadKey
  void loadHelperScene(url, metadataUrl, assetLocalTransform)
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
