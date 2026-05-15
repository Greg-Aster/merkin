<script lang="ts">
import { Collider } from '@threlte/rapier'
import AssetTrimeshCollider from './AssetTrimeshCollider.svelte'
import PrimitiveTrimeshCollider from './PrimitiveTrimeshCollider.svelte'
import {
  getRapierColliderDescriptor,
  type CollisionManagerRapierProduct,
} from './collisionManagerProduct'

export let product: CollisionManagerRapierProduct

$: descriptor = getRapierColliderDescriptor(product)
</script>

{#if descriptor?.kind === 'assetTrimesh'}
  <AssetTrimeshCollider
    levelId={descriptor.levelId}
    url={descriptor.url}
    metadataUrl={descriptor.metadataUrl}
    cacheKey={descriptor.cacheKey}
    assetLocalTransform={descriptor.assetLocalTransform}
    friction={descriptor.friction}
    restitution={descriptor.restitution}
    sensor={descriptor.sensor}
    collisionGroups={descriptor.collisionGroups}
  />
{:else if descriptor?.kind === 'primitiveTrimesh'}
  <PrimitiveTrimeshCollider
    geometry={descriptor.geometry}
    args={descriptor.args}
    friction={descriptor.friction}
    restitution={descriptor.restitution}
    sensor={descriptor.sensor}
    collisionGroups={descriptor.collisionGroups}
  />
{:else if descriptor?.kind === 'shape'}
  <Collider
    shape={descriptor.shape}
    args={descriptor.args}
    position={descriptor.position ?? [0, 0, 0]}
    friction={descriptor.friction}
    restitution={descriptor.restitution}
    sensor={descriptor.sensor}
    collisionGroups={descriptor.collisionGroups}
  />
{/if}
