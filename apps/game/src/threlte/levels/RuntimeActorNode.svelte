<script lang="ts">
import { T, useTask, useThrelte } from '@threlte/core'
import * as THREE from 'three'
import CollisionBody from '../collision/CollisionBody.svelte'
import type {
  ActorDefinition,
  RuntimeGameplayData,
  RuntimeGameplayRenderNode,
} from '../engine'
import { qualityLevelStore } from '../features/performance/stores/performanceStore'
import {
  type RuntimeQualityTier,
  getRuntimeNodeCullDistance,
} from '../features/performance/utils/runtimeSceneBudget'
import RuntimeActorRenderContent from './RuntimeActorRenderContent.svelte'
import RuntimeGameplayRenderer from './RuntimeGameplayRenderer.svelte'
import { getRuntimeActorColliderArgs } from './runtimeActorCollision'

export let actor: ActorDefinition
export let levelId = ''
export let interactionSystem: any = null
export let interactiveEnabled = false
export let hasChildren = false

const { camera } = useThrelte()
const actorWorldPosition = new THREE.Vector3()
let group: THREE.Group | null = null
let runtimeDistanceVisible = true
let distanceCheckAccumulator = 0

function getActiveCamera(): THREE.Camera | null {
  const candidate = camera as THREE.Camera & { current?: THREE.Camera | null }
  const resolved = candidate?.current ?? candidate
  return resolved && resolved.position instanceof THREE.Vector3
    ? resolved
    : null
}

function supportsRuntimeDistanceActivation() {
  return (
    actor.kind === 'primitive' &&
    !hasChildren &&
    !actor.physics &&
    !actor.gameplay &&
    !actor.interaction &&
    !actor.light &&
    !actor.audioRegion &&
    actor.render?.cullingPolicy !== 'never'
  )
}

function getRuntimeBoundsPadding() {
  const args = actor.render?.primitive?.args ?? []
  const scale = actor.transform.scale
  const extents = [
    Math.abs(Number(args[0] ?? 1) * (scale[0] ?? 1)),
    Math.abs(Number(args[1] ?? args[0] ?? 1) * (scale[1] ?? 1)),
    Math.abs(Number(args[2] ?? args[0] ?? 1) * (scale[2] ?? 1)),
  ]
  return Math.max(4, Math.hypot(...extents) / 2)
}

useTask(delta => {
  if (!supportsRuntimeDistanceActivation()) {
    runtimeDistanceVisible = true
    return
  }

  distanceCheckAccumulator += delta
  if (distanceCheckAccumulator < 0.25) return
  distanceCheckAccumulator = 0

  const activeCamera = getActiveCamera()
  if (!activeCamera || !group) {
    runtimeDistanceVisible = true
    return
  }

  group.getWorldPosition(actorWorldPosition)
  const cullDistance =
    getRuntimeNodeCullDistance(
      $qualityLevelStore as RuntimeQualityTier,
      actor.kind,
    ) + getRuntimeBoundsPadding()
  runtimeDistanceVisible =
    activeCamera.position.distanceTo(actorWorldPosition) <= cullDistance
})

$: visible = (actor.render?.visible ?? true) && runtimeDistanceVisible
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
</script>

<T.Group
  bind:ref={group}
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
  {:else}
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
