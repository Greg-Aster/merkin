<script lang="ts">
import { T } from '@threlte/core'
import { onDestroy } from 'svelte'
import * as THREE from 'three'
import type { AssetLocalTransformMetadata } from '../engine/assetLocalTransform'
import { loadCachedGltf } from '../utils/gltfAssetCache'
import {
  type MeshColliderPatch,
  buildAssetTrimeshColliderPatches,
} from './assetTrimeshColliderGeometry'
import {
  loadAssetLocalTransformMetadata,
  validateInlineAssetLocalTransform,
} from './assetTrimeshColliderMetadata'

export let url = ''
export let metadataUrl = ''
export let assetLocalTransform: AssetLocalTransformMetadata | null = null
export let color = '#4df0ff'

type HelperPatch = {
  id: string
  geometry: THREE.BufferGeometry
}

let patches: HelperPatch[] = []
let material: THREE.MeshBasicMaterial | null = null
let disposed = false
let loadToken = 0
let loadedKey = ''
let materialColor = ''

function disposePatches(nextPatches: HelperPatch[]) {
  for (const patch of nextPatches) {
    patch.geometry.dispose()
  }
}

function createHelperGeometry(patch: MeshColliderPatch) {
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(patch.vertices, 3))
  geometry.setIndex(new THREE.BufferAttribute(patch.indices, 1))
  geometry.computeBoundingSphere()
  return geometry
}

function refreshMaterial() {
  if (material && materialColor === color) return

  material?.dispose()
  materialColor = color
  material = new THREE.MeshBasicMaterial({
    color,
    depthTest: false,
    depthWrite: false,
    opacity: 0.82,
    transparent: true,
    wireframe: true,
  })
}

async function loadHelperPatches(
  nextUrl: string,
  nextMetadataUrl: string,
  inlineAssetLocalTransform: AssetLocalTransformMetadata | null,
) {
  const token = ++loadToken

  try {
    const [gltf, metadataValidation] = await Promise.all([
      loadCachedGltf(nextUrl),
      nextMetadataUrl
        ? loadAssetLocalTransformMetadata(nextMetadataUrl)
        : Promise.resolve(
            validateInlineAssetLocalTransform(inlineAssetLocalTransform),
          ),
    ])
    if (disposed || token !== loadToken) {
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

    const nextPatches = buildAssetTrimeshColliderPatches(gltf.scene, {
      assetLocalTransform: metadataValidation.metadata,
    }).map(patch => ({
      id: patch.id,
      geometry: createHelperGeometry(patch),
    }))

    const previousPatches = patches
    patches = nextPatches
    disposePatches(previousPatches)
  } catch (error) {
    if (!disposed) {
      console.warn('Failed to load mesh collision helper:', nextUrl, error)
    }
    disposePatches(patches)
    patches = []
  }
}

$: inlineMatrix =
  assetLocalTransform?.visualToPhysicsLocalMatrix ??
  assetLocalTransform?.visualToPhysicsMatrix
$: loadKey = `${url}|${metadataUrl}|${inlineMatrix ? JSON.stringify(inlineMatrix) : ''}`
$: refreshMaterial()
$: if (url && loadKey !== loadedKey) {
  loadedKey = loadKey
  void loadHelperPatches(url, metadataUrl, assetLocalTransform)
}

onDestroy(() => {
  disposed = true
  loadToken += 1
  disposePatches(patches)
  material?.dispose()
})
</script>

{#if material}
  {#each patches as patch (patch.id)}
    <T.Mesh
      geometry={patch.geometry}
      {material}
      renderOrder={18}
      frustumCulled={false}
    />
  {/each}
{/if}
