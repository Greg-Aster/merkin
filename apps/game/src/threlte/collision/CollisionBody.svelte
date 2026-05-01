<script lang="ts">
import { T } from '@threlte/core'
import { Collider, RigidBody } from '@threlte/rapier'
import type { EditorRigidBodyType } from '../engine/sceneDocumentTypes'
import type {
  CollisionChannel,
  CollisionIntent,
  PrimitiveGeometryKind,
} from '../engine'
import AssetTrimeshCollider from './AssetTrimeshCollider.svelte'
import ColliderHelper from './ColliderHelper.svelte'
import CollisionOverlayLabel from './CollisionOverlayLabel.svelte'
import MeshColliderHelper from './MeshColliderHelper.svelte'
import PrimitiveTrimeshCollider from './PrimitiveTrimeshCollider.svelte'
import PrimitiveTrimeshHelper from './PrimitiveTrimeshHelper.svelte'

export let physicsEnabled = true
export let showOverlay = false
export let shape: 'cuboid' | 'cylinder' | 'trimesh' = 'cuboid'
export let intent: CollisionIntent = 'blocker'
export let channel: CollisionChannel = 'worldStatic'
export let triangleBudget: number | undefined = undefined
export let args: number[] = [0.5, 0.5, 0.5]
export let bodyType: EditorRigidBodyType = 'fixed'
export let position: [number, number, number] = [0, 0, 0]
export let rotation: [number, number, number] = [0, 0, 0]
export let scale: [number, number, number] = [1, 1, 1]
export let gravityScale = 1
export let canSleep = true
export let ccd = false
export let linearDamping = 0
export let angularDamping = 0
export let lockRotations = false
export let lockTranslations = false
export let friction = 0.7
export let restitution = 0
export let sensor = false
export let assetUrl = ''
export let primitiveGeometry: PrimitiveGeometryKind | undefined = undefined
export let primitiveArgs: number[] = []
export let overlayColor = '#ff8c63'

$: isAssetTrimesh = shape === 'trimesh' && assetUrl.length > 0
$: isPrimitiveTrimesh = shape === 'trimesh' && !!primitiveGeometry
$: overlayLabelLines = [
  `shape: ${shape}`,
  `intent: ${intent}`,
  `channel: ${channel}`,
  `budget: ${triangleBudget ?? 'n/a'}`,
]
$: overlayLabelPosition = [
  0,
  Math.max(1, Number(args[1] ?? args[0] ?? 1) * 2 + 0.55),
  0,
] as [number, number, number]
</script>

<T.Group {position} {rotation} {scale}>
  {#if physicsEnabled}
    <RigidBody
      type={bodyType}
      {gravityScale}
      {canSleep}
      {ccd}
      {linearDamping}
      {angularDamping}
      {lockRotations}
      {lockTranslations}
    >
      {#if isAssetTrimesh}
        <AssetTrimeshCollider
          url={assetUrl}
          {friction}
          {restitution}
          {sensor}
        />
      {:else if isPrimitiveTrimesh}
        <PrimitiveTrimeshCollider
          geometry={primitiveGeometry}
          args={primitiveArgs}
          {friction}
          {restitution}
          {sensor}
        />
      {:else if shape === 'cylinder'}
        <Collider
          shape="cylinder"
          {args}
          {friction}
          {restitution}
          {sensor}
        />
      {:else}
        <Collider
          shape="cuboid"
          {args}
          {friction}
          {restitution}
          {sensor}
        />
      {/if}
      <slot />
    </RigidBody>
  {:else}
    <slot />
  {/if}

  {#if showOverlay}
    {#if isAssetTrimesh}
      <MeshColliderHelper url={assetUrl} color={overlayColor} />
    {:else if isPrimitiveTrimesh}
      <PrimitiveTrimeshHelper geometry={primitiveGeometry} args={primitiveArgs} />
    {:else if shape === 'cylinder'}
      <ColliderHelper shape="cylinder" {args} color={overlayColor} />
    {:else}
      <ColliderHelper shape="cuboid" {args} color={overlayColor} />
    {/if}
    <CollisionOverlayLabel
      lines={overlayLabelLines}
      position={overlayLabelPosition}
    />
  {/if}
</T.Group>
