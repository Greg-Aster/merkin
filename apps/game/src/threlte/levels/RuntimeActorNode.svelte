<script lang="ts">
import { T } from '@threlte/core'
import { onDestroy, onMount } from 'svelte'
import CollisionBody from '../collision/CollisionBody.svelte'
import { createCollisionManagerRapierProduct } from '../collision/collisionManagerProduct'
import {
  shouldMountActorCollision,
  shouldRenderActorVisual,
  shouldRenderVisualInsideCollider,
} from '../engine/actorPresence'
import type {
  RuntimeGameplayData,
  RuntimeGameplayRenderNode,
} from '../engine/runtimeGameplayTypes'
import type { ActorDefinition } from '../engine/types'
import {
  markRuntimeActorMounted,
  unmarkRuntimeActorMounted,
} from '../stores/runtimeRenderRegistry'
import RuntimeActorRenderContent from './RuntimeActorRenderContent.svelte'
import RuntimeGameplayRenderer from './RuntimeGameplayRenderer.svelte'

export let actor: ActorDefinition
export let levelId = ''
export let interactionSystem: any = null
export let interactiveEnabled = false
export let collisionOnly = false

$: collision = actor.physics?.collision ?? null
$: bodyType = actor.physics?.bodyType ?? 'fixed'
$: renderVisual = !collisionOnly && shouldRenderActorVisual(actor)
$: mountCollision = shouldMountActorCollision(actor)
$: renderVisualInsideCollider =
  !collisionOnly && shouldRenderVisualInsideCollider(actor)
$: renderVisualOutsideCollider = renderVisual && !renderVisualInsideCollider
$: collisionProduct =
  collision && mountCollision
    ? createCollisionManagerRapierProduct({
        id: actor.id,
        product: collision.generatedProduct,
        position: actor.transform.position,
        rotation: actor.transform.rotation,
        scale: actor.transform.scale,
        intent: collision.intent,
        channel: collision.channel,
        levelId,
        bodyType,
        gravityScale: actor.physics?.gravityScale ?? 1,
        canSleep: actor.physics?.canSleep ?? true,
        ccd: actor.physics?.ccd ?? false,
        linearDamping: actor.physics?.linearDamping ?? 0,
        angularDamping: actor.physics?.angularDamping ?? 0,
        lockRotations: actor.physics?.lockRotations ?? false,
        lockTranslations: actor.physics?.lockTranslations ?? false,
        friction: collision.friction ?? 0.7,
        restitution: collision.restitution ?? 0,
        sensor: collision.sensor ?? false,
      })
    : null
$: hasCollisionProduct = Boolean(collisionProduct)
$: groupVisible = collisionOnly || (actor.render?.visible ?? true)
$: actorTransformKey = JSON.stringify({
  position: actor.transform.position,
  rotation: actor.transform.rotation,
  scale: actor.transform.scale,
})
$: gameplayNode = {
  id: actor.id,
  name: actor.name,
  scale: actor.transform.scale,
  gameplay: actor.gameplay?.data as RuntimeGameplayData | undefined,
} satisfies RuntimeGameplayRenderNode

onMount(() => {
  if (!levelId || collisionOnly) return
  markRuntimeActorMounted(levelId, actor.id)
})

onDestroy(() => {
  if (!levelId || collisionOnly) return
  unmarkRuntimeActorMounted(levelId, actor.id)
})
</script>

{#key actorTransformKey}
  {#if collisionProduct}
    <CollisionBody product={collisionProduct}>
      {#if renderVisualInsideCollider}
        <RuntimeActorRenderContent {actor} {levelId} />
      {/if}
    </CollisionBody>
  {/if}

  <T.Group
    name={actor.name}
    position={actor.transform.position}
    rotation={actor.transform.rotation}
    scale={actor.transform.scale}
    visible={groupVisible}
  >
    {#if hasCollisionProduct && renderVisualOutsideCollider}
      <RuntimeActorRenderContent {actor} {levelId} />
    {:else if !hasCollisionProduct && renderVisual}
      <RuntimeActorRenderContent {actor} {levelId} />
    {/if}

    {#if !collisionOnly && actor.gameplay?.data}
      <RuntimeGameplayRenderer
        node={gameplayNode}
        selected={false}
        editorEnabled={false}
        {interactionSystem}
        {interactiveEnabled}
        on:portalTransition
        on:noteRead
      />
    {/if}

    <slot />
  </T.Group>
{/key}
