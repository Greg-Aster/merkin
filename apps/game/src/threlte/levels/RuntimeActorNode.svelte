<script lang="ts">
import { T } from '@threlte/core'
import { onDestroy, onMount } from 'svelte'
import CollisionBody from '../collision/CollisionBody.svelte'
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
import { getRuntimeActorColliderArgs } from './runtimeActorCollision'

export let actor: ActorDefinition
export let levelId = ''
export let interactionSystem: any = null
export let interactiveEnabled = false

$: collision = actor.physics?.collision ?? null
$: bodyType = actor.physics?.bodyType ?? 'fixed'
$: renderVisual = shouldRenderActorVisual(actor)
$: mountCollision = shouldMountActorCollision(actor)
$: renderVisualInsideCollider = shouldRenderVisualInsideCollider(actor)
$: renderVisualOutsideCollider = renderVisual && !renderVisualInsideCollider
$: useHeadlessStaticCollision =
  Boolean(collision && mountCollision) && bodyType === 'fixed'
$: groupVisible = actor.render?.visible ?? true
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

{#if collision && mountCollision && useHeadlessStaticCollision}
  <CollisionBody
    transformMode="physics-explicit"
    applyScaleToPhysics={true}
    position={actor.transform.position}
    rotation={actor.transform.rotation}
    scale={actor.transform.scale}
    shape={collision.shape}
    {levelId}
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
    colliderUrl={collision.colliderUrl ?? ''}
    colliderMetadataUrl={collision.colliderMetadataUrl ?? ''}
    assetLocalTransform={collision.assetLocalTransform ?? null}
    primitiveGeometry={actor.render?.primitive?.geometry}
    primitiveArgs={actor.render?.primitive?.args ?? []}
  />
{/if}

<T.Group
  name={actor.name}
  position={actor.transform.position}
  rotation={actor.transform.rotation}
  scale={actor.transform.scale}
  visible={groupVisible}
>
  {#if collision && mountCollision && !useHeadlessStaticCollision && renderVisualInsideCollider}
    <CollisionBody
      shape={collision.shape}
      {levelId}
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
      colliderUrl={collision.colliderUrl ?? ''}
      colliderMetadataUrl={collision.colliderMetadataUrl ?? ''}
      assetLocalTransform={collision.assetLocalTransform ?? null}
      primitiveGeometry={actor.render?.primitive?.geometry}
      primitiveArgs={actor.render?.primitive?.args ?? []}
    >
      <RuntimeActorRenderContent {actor} {levelId} />
    </CollisionBody>
  {:else if collision && mountCollision && !useHeadlessStaticCollision}
    <CollisionBody
      shape={collision.shape}
      {levelId}
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
      colliderUrl={collision.colliderUrl ?? ''}
      colliderMetadataUrl={collision.colliderMetadataUrl ?? ''}
      assetLocalTransform={collision.assetLocalTransform ?? null}
      primitiveGeometry={actor.render?.primitive?.geometry}
      primitiveArgs={actor.render?.primitive?.args ?? []}
    />
    {#if renderVisualOutsideCollider}
      <RuntimeActorRenderContent {actor} {levelId} />
    {/if}
  {:else if renderVisual}
    <RuntimeActorRenderContent {actor} {levelId} />
  {/if}

  {#if actor.gameplay?.data}
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
