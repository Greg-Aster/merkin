<script lang="ts">
import { T } from '@threlte/core'
import { RigidBody } from '@threlte/rapier'
import type { AssetLocalTransformMetadata } from '../engine/assetLocalTransform'
import type { EditorRigidBodyType } from '../engine/sceneDocumentTypes'
import type { PrimitiveGeometryKind } from '../engine/types'
import RuntimeCollisionCollider from './RuntimeCollisionCollider.svelte'

export let physicsEnabled = true
export let hasRuntimeCollider = true
export let shape: 'cuboid' | 'cylinder' | 'trimesh' = 'cuboid'
export let args: number[] = [0.5, 0.5, 0.5]
export let bodyType: EditorRigidBodyType = 'fixed'
export let position: [number, number, number] = [0, 0, 0]
export let rotation: [number, number, number] = [0, 0, 0]
export let scale: [number, number, number] = [1, 1, 1]
export let transformMode: 'scene' | 'physics-explicit' = 'scene'
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
export let collisionGroups: number | undefined = undefined
export let levelId = ''
export let colliderUrl = ''
export let colliderMetadataUrl = ''
export let assetLocalTransform: AssetLocalTransformMetadata | null = null
export let primitiveGeometry: PrimitiveGeometryKind | undefined = undefined
export let primitiveArgs: number[] = []
export let physicsScale: [number, number, number] = [1, 1, 1]

$: useExplicitPhysicsTransform = transformMode === 'physics-explicit'
</script>

{#if physicsEnabled && hasRuntimeCollider && useExplicitPhysicsTransform}
  <RigidBody
    type={bodyType}
    {position}
    {rotation}
    {gravityScale}
    {canSleep}
    {ccd}
    {linearDamping}
    {angularDamping}
    {lockRotations}
    {lockTranslations}
  >
    <RuntimeCollisionCollider
      {shape}
      {args}
      {friction}
      {restitution}
      {sensor}
      {collisionGroups}
      {levelId}
      {colliderUrl}
      {colliderMetadataUrl}
      {assetLocalTransform}
      {primitiveGeometry}
      {primitiveArgs}
      {physicsScale}
      applyScaleToPrimitiveVolumes
    />
  </RigidBody>
{/if}

<T.Group {position} {rotation} {scale}>
  {#if physicsEnabled && hasRuntimeCollider && !useExplicitPhysicsTransform}
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
      <RuntimeCollisionCollider
        {shape}
        {args}
        {friction}
        {restitution}
        {sensor}
        {collisionGroups}
        {levelId}
        {colliderUrl}
        {colliderMetadataUrl}
        {assetLocalTransform}
        {primitiveGeometry}
        {primitiveArgs}
        {physicsScale}
      />
      <slot />
    </RigidBody>
  {:else}
    <slot />
  {/if}

  <slot name="overlay" />
</T.Group>
