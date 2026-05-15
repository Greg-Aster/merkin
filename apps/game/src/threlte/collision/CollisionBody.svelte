<script lang="ts">
import type { CollisionManagerRapierProduct } from './collisionManagerProduct'
import RuntimeCollisionBody from './RuntimeCollisionBody.svelte'

export let physicsEnabled = true
export let product: CollisionManagerRapierProduct | null = null
</script>

<RuntimeCollisionBody
  {physicsEnabled}
  {product}
>
  <slot />
</RuntimeCollisionBody>
