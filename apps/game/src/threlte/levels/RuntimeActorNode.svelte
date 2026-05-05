<script lang="ts">
import { T } from '@threlte/core'
import { onDestroy, onMount } from 'svelte'
import CollisionBody from '../collision/CollisionBody.svelte'
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
import { getRuntimeActorColliderArgs } from './runtimeActorCollision'

export let actor: ActorDefinition
export let levelId = ''
export let interactionSystem: any = null
export let interactiveEnabled = false

$: visible = actor.render?.visible ?? true
$: collision = actor.physics?.collision ?? null
$: bodyType = actor.physics?.bodyType ?? 'fixed'
$: renderVisualOutsideCollider =
  actor.render?.physicsAttachment === 'outside-collider'
$: gameplayNode = {
  id: actor.id,
  name: actor.name,
  scale: actor.transform.scale,
  gameplay: actor.gameplay?.data as RuntimeGameplayData | undefined,
} satisfies RuntimeGameplayRenderNode

onMount(() => {
  if (!levelId) return
  markRuntimeActorMounted(levelId, actor.id)
})

onDestroy(() => {
  if (!levelId) return
  unmarkRuntimeActorMounted(levelId, actor.id)
})
</script>

<T.Group
  name={actor.name}
  position={actor.transform.position}
  rotation={actor.transform.rotation}
  scale={actor.transform.scale}
  {visible}
>
  {#if collision && visible && !renderVisualOutsideCollider}
    <CollisionBody
      shape={collision.shape}
      intent={collision.intent}
      channel={collision.channel}
      triangleBudget={collision.triangleBudget}
      args={getRuntimeActorColliderArgs(actor)}
      {bodyType}
      gravityScale={actor.physics?.gravityScale ?? 1}
      canSleep={actor.physics?.canSleep ?? true}
      ccd={actor.physics?.ccd ?? false}
      linearDamping={actor.physics?.linearDamping ?? 0}
      angularDamping={actor.physics?.angularDamping ?? 0}
      lockRotations={actor.physics?.lockRotations ?? false}
      lockTranslations={actor.physics?.lockTranslations ?? false}
      friction={collision.friction ?? 0.7}
      restitution={collision.restitution ?? 0}
      sensor={collision.sensor ?? false}
      assetUrl={actor.render?.asset?.url ?? ''}
      primitiveGeometry={actor.render?.primitive?.geometry}
      primitiveArgs={actor.render?.primitive?.args ?? []}
    >
      <RuntimeActorRenderContent {actor} {levelId} />
    </CollisionBody>
  {:else if collision && visible && renderVisualOutsideCollider}
    <CollisionBody
      shape={collision.shape}
      intent={collision.intent}
      channel={collision.channel}
      triangleBudget={collision.triangleBudget}
      args={getRuntimeActorColliderArgs(actor)}
      {bodyType}
      gravityScale={actor.physics?.gravityScale ?? 1}
      canSleep={actor.physics?.canSleep ?? true}
      ccd={actor.physics?.ccd ?? false}
      linearDamping={actor.physics?.linearDamping ?? 0}
      angularDamping={actor.physics?.angularDamping ?? 0}
      lockRotations={actor.physics?.lockRotations ?? false}
      lockTranslations={actor.physics?.lockTranslations ?? false}
      friction={collision.friction ?? 0.7}
      restitution={collision.restitution ?? 0}
      sensor={collision.sensor ?? false}
      assetUrl={actor.render?.asset?.url ?? ''}
      primitiveGeometry={actor.render?.primitive?.geometry}
      primitiveArgs={actor.render?.primitive?.args ?? []}
    />
    <RuntimeActorRenderContent {actor} {levelId} />
  {:else if visible}
    <RuntimeActorRenderContent {actor} {levelId} />
  {/if}

  <RuntimeGameplayRenderer
    node={gameplayNode}
    selected={false}
    editorEnabled={false}
    {interactionSystem}
    {interactiveEnabled}
    on:portalTransition
    on:noteRead
  />

  <slot />
</T.Group>
