<script lang="ts">
import CollisionBody from '../collision/CollisionBody.svelte'
import { createCollisionManagerRapierProduct } from '../collision/collisionManagerProduct'
import type { GeneratedCollisionProduct } from '../engine/types'
import { resolveNodeCollision } from './editorCollisionDefaults'
import type { EditorSceneNode } from './editorStore'
import type { EditorNodeCollisionData } from './editorTypes'
import type { EditorSceneSettings } from './editorTypes'

export let node: EditorSceneNode
export let editorEnabled = false
export let sceneSettings: EditorSceneSettings | null = null

function hasPhysicsBody() {
  return !!collisionProduct
}

function hasLiveCollisionBody() {
  return hasPhysicsBody()
}

function getRigidBodyType() {
  return node.physics?.bodyType ?? 'fixed'
}

function getGeneratedProduct(
  collision: EditorNodeCollisionData | null,
): GeneratedCollisionProduct | null {
  return (
    (
      collision as
        | (EditorNodeCollisionData & {
            generatedProduct?: GeneratedCollisionProduct
          })
        | null
    )?.generatedProduct ?? null
  )
}

$: effectiveCollision = resolveNodeCollision(node, sceneSettings)
$: collisionProduct = effectiveCollision
  ? createCollisionManagerRapierProduct({
      id: node.id,
      product: getGeneratedProduct(effectiveCollision),
      position: node.position,
      rotation: node.rotation,
      scale: node.scale,
      intent: effectiveCollision.intent,
      channel: effectiveCollision.channel,
      bodyType: getRigidBodyType(),
      gravityScale: node.physics?.gravityScale ?? 1,
      canSleep: node.physics?.canSleep ?? true,
      ccd: node.physics?.ccd ?? false,
      linearDamping: node.physics?.linearDamping ?? 0,
      angularDamping: node.physics?.angularDamping ?? 0,
      lockRotations: node.physics?.lockRotations ?? false,
      lockTranslations: node.physics?.lockTranslations ?? false,
      friction: effectiveCollision.friction ?? 0.7,
      restitution: effectiveCollision.restitution ?? 0,
      sensor: effectiveCollision.sensor ?? false,
    })
  : null
</script>

{#if !editorEnabled && hasLiveCollisionBody()}
  <CollisionBody product={collisionProduct} />
{/if}
<slot />
