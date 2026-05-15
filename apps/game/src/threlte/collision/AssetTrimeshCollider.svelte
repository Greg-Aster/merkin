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
export let cacheKey = ''
export let assetLocalTransform: AssetLocalTransformMetadata | null = null
export let friction = 0.7
export let restitution = 0
export let sensor = false
export let collisionGroups: number | undefined = undefined

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

function getCanonicalUrl(nextUrl: string) {
  return nextUrl.split('?')[0] ?? nextUrl
}

function registerLoadedCollider(nextUrl: string) {
  const canonicalUrl = getCanonicalUrl(nextUrl)
  if (!levelId || !canonicalUrl || registeredColliderUrl === canonicalUrl) {
    return
  }
  unregisterLoadedCollider()
  registeredColliderUrl = canonicalUrl
  markRuntimeColliderUrlLoaded(levelId, canonicalUrl)
}

function withCacheKey(nextUrl: string, nextCacheKey: string) {
  const normalizedUrl = nextUrl.trim()
  const normalizedCacheKey = nextCacheKey.trim()
  if (!normalizedUrl || !normalizedCacheKey) return normalizedUrl
  const separator = normalizedUrl.includes('?') ? '&' : '?'
  return `${normalizedUrl}${separator}collisionRevision=${encodeURIComponent(normalizedCacheKey)}`
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
$: resolvedUrl = withCacheKey(url, cacheKey)
$: resolvedMetadataUrl = withCacheKey(metadataUrl, cacheKey)
$: loadKey = `${resolvedUrl}|${resolvedMetadataUrl}|${inlineMatrix ? JSON.stringify(inlineMatrix) : ''}`
$: if (resolvedUrl && loadKey !== loadedKey) {
  loadedKey = loadKey
  unregisterLoadedCollider()
  void loadColliderPatches(
    resolvedUrl,
    resolvedMetadataUrl,
    assetLocalTransform,
  )
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
