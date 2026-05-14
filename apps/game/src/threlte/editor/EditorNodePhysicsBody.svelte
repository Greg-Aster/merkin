<script lang="ts">
import CollisionBody from '../collision/CollisionBody.svelte'
import ColliderHelper from '../collision/ColliderHelper.svelte'
import CollisionOverlayLabel from '../collision/CollisionOverlayLabel.svelte'
import { getColliderLocalArgs } from '../engine/colliderGeometry'
import {
  describeNodeCollisionSource,
  getNodeColliderArgs,
  getNodeVisualColliderSize,
  resolveNodeCollision,
} from './editorCollisionDefaults'
import type { EditorSceneNode } from './editorStore'
import type { EditorSceneSettings } from './editorTypes'

export let node: EditorSceneNode
export let editorEnabled = false
export let sceneSettings: EditorSceneSettings | null = null
export let collisionOverlayEnabled = false

let collisionOverlayLogSignature = ''

function hasPhysicsBody() {
  return !!effectiveCollision
}

function hasLiveCollisionBody() {
  return hasPhysicsBody()
}

function getRigidBodyType() {
  return node.physics?.bodyType ?? 'fixed'
}

function getColliderArgs() {
  return getNodeColliderArgs(node, sceneSettings)
}

function getVisualColliderArgs() {
  return getColliderLocalArgs({
    shape: 'cuboid',
    worldSize: getNodeVisualColliderSize(node),
    scale: node.scale,
  })
}

function getNoCollisionOverlayState() {
  if (effectiveCollision) return null
  const status = describeNodeCollisionSource(node, sceneSettings)
  if (status.label === 'Missing collision') {
    return {
      color: '#ff5c70',
      lines: ['state: missing collision', 'runtime: no collider'],
    }
  }
  if (status.label === 'Collision disabled by level role') {
    return {
      color: '#90a4c8',
      lines: ['state: visual-only', 'runtime: no collider'],
    }
  }
  if (
    status.label === 'Disabled' &&
    (node.collision?.enabled === false || node.collision?.intent === 'none')
  ) {
    return {
      color: '#8f96a3',
      lines: ['state: disabled', 'runtime: no collider'],
    }
  }
  return null
}

function getNoCollisionLabelPosition() {
  const args = getVisualColliderArgs()
  return [0, Math.max(1, Number(args[1] ?? args[0] ?? 1) * 2 + 0.55), 0] as [
    number,
    number,
    number,
  ]
}

function logCollisionOverlaySource() {
  if (!effectiveCollision) return
  const signature = JSON.stringify({
    id: node.id,
    shape: effectiveCollision.shape,
    intent: effectiveCollision.intent,
    triangleBudget: effectiveCollision.triangleBudget ?? null,
    args: effectiveCollision.shape === 'cuboid' ? getColliderArgs() : null,
    url: node.asset?.url ?? null,
  })
  if (signature === collisionOverlayLogSignature) return
  collisionOverlayLogSignature = signature
  console.info('[collision-overlay]', {
    id: node.id,
    name: node.name,
    kind: node.kind,
    shape: effectiveCollision.shape,
    intent: effectiveCollision.intent,
    triangleBudget: effectiveCollision.triangleBudget,
    colliderArgs:
      effectiveCollision.shape === 'cuboid' ? getColliderArgs() : undefined,
    assetUrl: node.asset?.url,
    visible: node.visible !== false,
  })
}

$: effectiveCollision = resolveNodeCollision(node, sceneSettings)
$: noCollisionOverlayState = getNoCollisionOverlayState()
$: if (editorEnabled && collisionOverlayEnabled) {
  logCollisionOverlaySource()
} else {
  collisionOverlayLogSignature = ''
}
</script>

{#if !editorEnabled && hasLiveCollisionBody()}
  <CollisionBody
    transformMode="physics-explicit"
    applyScaleToPhysics={true}
    position={node.position}
    rotation={node.rotation}
    scale={node.scale}
    shape={effectiveCollision?.shape ?? 'cuboid'}
    intent={effectiveCollision?.intent ?? 'blocker'}
    channel={effectiveCollision?.channel ?? 'worldStatic'}
    triangleBudget={effectiveCollision?.triangleBudget}
    args={getColliderArgs()}
    bodyType={getRigidBodyType()}
    gravityScale={node.physics?.gravityScale ?? 1}
    canSleep={node.physics?.canSleep ?? true}
    ccd={node.physics?.ccd ?? false}
    linearDamping={node.physics?.linearDamping ?? 0}
    angularDamping={node.physics?.angularDamping ?? 0}
    lockRotations={node.physics?.lockRotations ?? false}
    lockTranslations={node.physics?.lockTranslations ?? false}
    friction={effectiveCollision?.friction ?? 0.7}
    restitution={effectiveCollision?.restitution ?? 0}
    sensor={effectiveCollision?.sensor ?? false}
    colliderUrl={effectiveCollision?.colliderUrl ?? ''}
    colliderMetadataUrl={effectiveCollision?.colliderMetadataUrl ?? ''}
    assetLocalTransform={effectiveCollision?.assetLocalTransform ?? null}
    primitiveGeometry={node.primitive?.geometry}
    primitiveArgs={node.primitive?.args ?? []}
  />
{/if}
<slot />

{#if hasLiveCollisionBody() && editorEnabled && collisionOverlayEnabled}
  <CollisionBody
    physicsEnabled={false}
    showOverlay={true}
    shape={effectiveCollision?.shape ?? 'cuboid'}
    intent={effectiveCollision?.intent ?? 'blocker'}
    channel={effectiveCollision?.channel ?? 'worldStatic'}
    triangleBudget={effectiveCollision?.triangleBudget}
    args={getColliderArgs()}
    colliderUrl={effectiveCollision?.colliderUrl ?? ''}
    colliderMetadataUrl={effectiveCollision?.colliderMetadataUrl ?? ''}
    assetLocalTransform={effectiveCollision?.assetLocalTransform ?? null}
    primitiveGeometry={node.primitive?.geometry}
    primitiveArgs={node.primitive?.args ?? []}
  />
{:else if editorEnabled && collisionOverlayEnabled && noCollisionOverlayState}
  <ColliderHelper
    shape="cuboid"
    args={getVisualColliderArgs()}
    color={noCollisionOverlayState.color}
  />
  <CollisionOverlayLabel
    lines={noCollisionOverlayState.lines}
    position={getNoCollisionLabelPosition()}
  />
{/if}
