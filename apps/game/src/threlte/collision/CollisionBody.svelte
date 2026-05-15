<script lang="ts">
import RuntimeCollisionBody from './RuntimeCollisionBody.svelte'
import type { CollisionManagerRapierProduct } from './collisionManagerProduct'

export let physicsEnabled = true
export let product: CollisionManagerRapierProduct | null = null
</script>

<RuntimeCollisionBody
  {physicsEnabled}
  {product}
>
  <slot />
</RuntimeCollisionBody>
