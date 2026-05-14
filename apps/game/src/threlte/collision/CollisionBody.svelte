<script lang="ts">
import { getCollisionGroupsForRuntimeCollider } from '../constants/physics'
import type { AssetLocalTransformMetadata } from '../engine/assetLocalTransform'
import type { EditorRigidBodyType } from '../engine/sceneDocumentTypes'
import type {
  CollisionChannel,
  CollisionIntent,
  PrimitiveGeometryKind,
} from '../engine/types'
import CollisionBodyOverlay from './CollisionBodyOverlay.svelte'
import RuntimeCollisionBody from './RuntimeCollisionBody.svelte'

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
export let transformMode: 'scene' | 'physics-explicit' = 'scene'
export let applyScaleToPhysics = false
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
export let levelId = ''
export let colliderUrl = ''
export let colliderMetadataUrl = ''
export let assetLocalTransform: AssetLocalTransformMetadata | null = null
export let proxy = false
export let bakeStatus: 'ready' | 'needsBake' | 'stale' | 'notRequired' | '' = ''
export let primitiveGeometry: PrimitiveGeometryKind | undefined = undefined
export let primitiveArgs: number[] = []
export let overlayColor = ''

$: assetColliderUrl = colliderUrl
$: isAssetTrimesh = shape === 'trimesh' && assetColliderUrl.length > 0
$: isPrimitiveTrimesh = shape === 'trimesh' && !!primitiveGeometry
$: hasRuntimeCollider =
  isAssetTrimesh ||
  isPrimitiveTrimesh ||
  shape === 'cylinder' ||
  shape === 'cuboid'
$: collisionGroups = getCollisionGroupsForRuntimeCollider({
  intent,
  channel,
  sensor,
})
$: physicsScale = applyScaleToPhysics
  ? ([
      Math.abs(Number(scale[0] ?? 1)) || 1,
      Math.abs(Number(scale[1] ?? 1)) || 1,
      Math.abs(Number(scale[2] ?? 1)) || 1,
    ] as [number, number, number])
  : ([1, 1, 1] as [number, number, number])
</script>

<RuntimeCollisionBody
  {physicsEnabled}
  {hasRuntimeCollider}
  {shape}
  {args}
  {bodyType}
  {position}
  {rotation}
  {scale}
  {transformMode}
  {gravityScale}
  {canSleep}
  {ccd}
  {linearDamping}
  {angularDamping}
  {lockRotations}
  {lockTranslations}
  {friction}
  {restitution}
  {sensor}
  {collisionGroups}
  {levelId}
  colliderUrl={assetColliderUrl}
  {colliderMetadataUrl}
  {assetLocalTransform}
  {primitiveGeometry}
  {primitiveArgs}
  {physicsScale}
>
  <slot />

  <svelte:fragment slot="overlay">
    {#if showOverlay}
      <CollisionBodyOverlay
        {shape}
        {intent}
        {channel}
        {triangleBudget}
        {args}
        colliderUrl={assetColliderUrl}
        {colliderMetadataUrl}
        {assetLocalTransform}
        {primitiveGeometry}
        {primitiveArgs}
        {proxy}
        {bakeStatus}
        {overlayColor}
      />
    {/if}
  </svelte:fragment>
</RuntimeCollisionBody>
