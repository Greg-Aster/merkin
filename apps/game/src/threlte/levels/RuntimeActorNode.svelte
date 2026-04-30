<script lang="ts">
import { T } from '@threlte/core'
import CollisionBody from '../collision/CollisionBody.svelte'
import EditorNodeGameplayRenderer from '../editor/EditorNodeGameplayRenderer.svelte'
import type {
  ActorDefinition,
  RuntimeGameplayData,
  RuntimeGameplayRenderNode,
} from '../engine'
import RuntimeActorRenderContent from './RuntimeActorRenderContent.svelte'
import { getRuntimeActorColliderArgs } from './runtimeActorCollision'

export let actor: ActorDefinition
export let interactionSystem: any = null
export let interactiveEnabled = false

$: visible = actor.render?.visible ?? true
$: collision = actor.physics?.collision ?? null
$: gameplayNode = {
  id: actor.id,
  name: actor.name,
  scale: actor.transform.scale,
  gameplay: actor.gameplay?.data as RuntimeGameplayData | undefined,
} satisfies RuntimeGameplayRenderNode
</script>

<T.Group
  name={actor.name}
  position={actor.transform.position}
  rotation={actor.transform.rotation}
  scale={actor.transform.scale}
  {visible}
>
  {#if collision && visible}
    <CollisionBody
      shape={collision.shape}
      intent={collision.intent}
      channel={collision.channel}
      triangleBudget={collision.triangleBudget}
      args={getRuntimeActorColliderArgs(actor)}
      bodyType={actor.physics?.bodyType ?? 'fixed'}
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
      <RuntimeActorRenderContent {actor} />
    </CollisionBody>
  {:else}
    <RuntimeActorRenderContent {actor} />
  {/if}

  <EditorNodeGameplayRenderer
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
