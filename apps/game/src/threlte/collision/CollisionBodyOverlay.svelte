<script lang="ts">
import type { AssetLocalTransformMetadata } from '../engine/assetLocalTransform'
import { getCollisionOverlayColor } from '../engine/collisionAuthoring'
import type {
  CollisionChannel,
  CollisionIntent,
  PrimitiveGeometryKind,
} from '../engine/types'
import ColliderHelper from './ColliderHelper.svelte'
import CollisionOverlayLabel from './CollisionOverlayLabel.svelte'
import MeshColliderHelper from './MeshColliderHelper.svelte'
import PrimitiveTrimeshHelper from './PrimitiveTrimeshHelper.svelte'

export let shape: 'cuboid' | 'cylinder' | 'trimesh' = 'cuboid'
export let intent: CollisionIntent = 'blocker'
export let channel: CollisionChannel = 'worldStatic'
export let triangleBudget: number | undefined = undefined
export let args: number[] = [0.5, 0.5, 0.5]
export let colliderUrl = ''
export let colliderMetadataUrl = ''
export let assetLocalTransform: AssetLocalTransformMetadata | null = null
export let primitiveGeometry: PrimitiveGeometryKind | undefined = undefined
export let primitiveArgs: number[] = []
export let overlayColor = ''

$: isAssetTrimesh = shape === 'trimesh' && colliderUrl.length > 0
$: isPrimitiveTrimesh = shape === 'trimesh' && !!primitiveGeometry
$: missingAssetTrimeshCollider =
  shape === 'trimesh' && !primitiveGeometry && colliderUrl.length === 0
$: resolvedOverlayColor =
  overlayColor ||
  (missingAssetTrimeshCollider
    ? '#ff3344'
    : getCollisionOverlayColor({ intent, channel }))
$: overlayLabelLines = [
  `shape: ${shape}`,
  `intent: ${intent}`,
  `channel: ${channel}`,
  `budget: ${triangleBudget ?? 'n/a'}`,
  missingAssetTrimeshCollider
    ? 'missing: collision.colliderUrl'
    : colliderUrl
      ? 'source: authored collider'
      : 'source: explicit primitive volume',
  isAssetTrimesh && !colliderMetadataUrl && !assetLocalTransform
    ? 'asset-local: legacy metadata missing'
    : '',
]
$: visibleOverlayLabelLines = overlayLabelLines.filter(Boolean)
$: overlayLabelPosition = [
  0,
  Math.max(1, Number(args[1] ?? args[0] ?? 1) * 2 + 0.55),
  0,
] as [number, number, number]
</script>

{#if isAssetTrimesh}
  <MeshColliderHelper
    url={colliderUrl}
    metadataUrl={colliderMetadataUrl}
    {assetLocalTransform}
    color={resolvedOverlayColor}
  />
{:else if isPrimitiveTrimesh}
  <PrimitiveTrimeshHelper
    geometry={primitiveGeometry}
    args={primitiveArgs}
    color={resolvedOverlayColor}
  />
{:else if shape === 'cylinder'}
  <ColliderHelper shape="cylinder" {args} color={resolvedOverlayColor} />
{:else}
  <ColliderHelper shape="cuboid" {args} color={resolvedOverlayColor} />
{/if}

<CollisionOverlayLabel
  lines={visibleOverlayLabelLines}
  position={overlayLabelPosition}
/>
