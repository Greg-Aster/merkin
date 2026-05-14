<script lang="ts">
import { Collider } from '@threlte/rapier'
import type { AssetLocalTransformMetadata } from '../engine/assetLocalTransform'
import type { PrimitiveGeometryKind } from '../engine/types'
import AssetTrimeshCollider from './AssetTrimeshCollider.svelte'
import PrimitiveTrimeshCollider from './PrimitiveTrimeshCollider.svelte'

export let shape: 'cuboid' | 'cylinder' | 'trimesh' = 'cuboid'
export let args: number[] = [0.5, 0.5, 0.5]
export let friction = 0.7
export let restitution = 0
export let sensor = false
export let collisionGroups: number | undefined = undefined
export let levelId = ''
export let colliderUrl = ''
export let colliderMetadataUrl = ''
export let assetLocalTransform: AssetLocalTransformMetadata | null = null
export let primitiveGeometry: PrimitiveGeometryKind | undefined = undefined
export let primitiveArgs: number[] = []
export let physicsScale: [number, number, number] = [1, 1, 1]
export let applyScaleToPrimitiveVolumes = false

$: isAssetTrimesh = shape === 'trimesh' && colliderUrl.length > 0
$: isPrimitiveTrimesh = shape === 'trimesh' && !!primitiveGeometry
$: cuboidArgs = applyScaleToPrimitiveVolumes
  ? [
      Number(args[0] ?? 0.5) * physicsScale[0],
      Number(args[1] ?? 0.5) * physicsScale[1],
      Number(args[2] ?? 0.5) * physicsScale[2],
    ]
  : args
$: cylinderArgs = applyScaleToPrimitiveVolumes
  ? [
      Number(args[0] ?? 0.5) * physicsScale[1],
      Number(args[1] ?? 0.5) * Math.max(physicsScale[0], physicsScale[2]),
    ]
  : args
</script>

{#if isAssetTrimesh}
  <AssetTrimeshCollider
    {levelId}
    url={colliderUrl}
    metadataUrl={colliderMetadataUrl}
    {assetLocalTransform}
    scale={physicsScale}
    {friction}
    {restitution}
    {sensor}
    {collisionGroups}
  />
{:else if isPrimitiveTrimesh}
  <PrimitiveTrimeshCollider
    geometry={primitiveGeometry}
    args={primitiveArgs}
    scale={physicsScale}
    {friction}
    {restitution}
    {sensor}
    {collisionGroups}
  />
{:else if shape === 'cylinder'}
  <Collider
    shape="cylinder"
    args={cylinderArgs}
    {friction}
    {restitution}
    {sensor}
    {collisionGroups}
  />
{:else if shape === 'cuboid'}
  <Collider
    shape="cuboid"
    args={cuboidArgs}
    {friction}
    {restitution}
    {sensor}
    {collisionGroups}
  />
{/if}
