<script lang="ts">
import { Collider } from '@threlte/rapier'
import { onDestroy } from 'svelte'
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
import {
  markRuntimeColliderUrlLoaded,
  unmarkRuntimeColliderUrlLoaded,
} from '../stores/runtimeCollisionRegistry'

export let levelId = ''
export let url = ''
export let metadataUrl = ''
export let assetLocalTransform: AssetLocalTransformMetadata | null = null
export let friction = 0.7
export let restitution = 0
export let sensor = false
export let collisionGroups: number | undefined = undefined
export let scale: [number, number, number] = [1, 1, 1]

let patches: MeshColliderPatch[] = []
let disposed = false
let loadToken = 0
let loadedKey = ''
let registeredColliderUrl = ''

function unregisterLoadedCollider() {
  if (!levelId || !registeredColliderUrl) return
  unmarkRuntimeColliderUrlLoaded(levelId, registeredColliderUrl)
  registeredColliderUrl = ''
}

function registerLoadedCollider(nextUrl: string) {
  if (!levelId || !nextUrl || registeredColliderUrl === nextUrl) return
  unregisterLoadedCollider()
  registeredColliderUrl = nextUrl
  markRuntimeColliderUrlLoaded(levelId, nextUrl)
}

async function loadColliderPatches(
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
    if (disposed || token !== loadToken) return

    if (
      metadataValidation.state === 'malformed' ||
      metadataValidation.state === 'invalid'
    ) {
      console.warn(
        'Invalid asset-local collider metadata; using legacy collider placement:',
        nextUrl,
        metadataValidation.errors,
      )
    } else if (metadataValidation.state === 'missing') {
      console.warn(
        'Missing asset-local collider metadata; using legacy collider placement:',
        nextUrl,
      )
    }

    patches = buildAssetTrimeshColliderPatches(gltf.scene, {
      assetLocalTransform: metadataValidation.metadata,
      scale,
    })
    if (patches.length > 0) {
      registerLoadedCollider(nextUrl)
    } else {
      unregisterLoadedCollider()
    }
  } catch (error) {
    if (!disposed) {
      console.warn(
        'Failed to build authored asset trimesh collider:',
        nextUrl,
        error,
      )
    }
    patches = []
    unregisterLoadedCollider()
  }
}

$: inlineMatrix =
  assetLocalTransform?.visualToPhysicsLocalMatrix ??
  assetLocalTransform?.visualToPhysicsMatrix
$: scaleKey = JSON.stringify(scale)
$: loadKey = `${url}|${metadataUrl}|${inlineMatrix ? JSON.stringify(inlineMatrix) : ''}|${scaleKey}`
$: if (url && loadKey !== loadedKey) {
  loadedKey = loadKey
  unregisterLoadedCollider()
  void loadColliderPatches(url, metadataUrl, assetLocalTransform)
}

onDestroy(() => {
  disposed = true
  loadToken += 1
  unregisterLoadedCollider()
})
</script>

{#each patches as patch (patch.id)}
  <Collider
    shape="trimesh"
    args={[patch.vertices, patch.indices]}
    {collisionGroups}
    {friction}
    {restitution}
    {sensor}
  />
{/each}
