<script lang="ts">
import { T } from '@threlte/core'
import { RigidBody } from '@threlte/rapier'
import {
  getCollisionProductMountKey,
  type CollisionManagerRapierProduct,
} from './collisionManagerProduct'
import RuntimeCollisionCollider from './RuntimeCollisionCollider.svelte'

export let physicsEnabled = true
export let product: CollisionManagerRapierProduct | null = null

$: body = product?.body
$: fixedColliderKey = product ? getCollisionProductMountKey(product) : ''
</script>

<T.Group
  position={body?.position ?? [0, 0, 0]}
  rotation={body?.rotation ?? [0, 0, 0]}
  scale={body?.scale ?? [1, 1, 1]}
>
  {#if physicsEnabled && product && body?.bodyType === 'fixed'}
    {#key fixedColliderKey}
      <RuntimeCollisionCollider {product} />
    {/key}
    <slot />
  {:else if physicsEnabled && product && body}
    <RigidBody
      type={body.bodyType}
      gravityScale={body.gravityScale}
      canSleep={body.canSleep}
      ccd={body.ccd}
      linearDamping={body.linearDamping}
      angularDamping={body.angularDamping}
      lockRotations={body.lockRotations}
      lockTranslations={body.lockTranslations}
    >
      <RuntimeCollisionCollider {product} />
      <slot />
    </RigidBody>
  {:else}
    <slot />
  {/if}
</T.Group>
