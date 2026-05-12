<script lang="ts">
import CollisionBody from '../collision/CollisionBody.svelte'
import {
  getNodeColliderArgs,
  resolveNodeCollision,
} from './editorCollisionDefaults'
import type { EditorSceneNode } from './editorStore'

export let node: EditorSceneNode
export let editorEnabled = false
export let visible = true
export let collisionOverlayEnabled = false

let collisionOverlayLogSignature = ''

function hasPhysicsBody() {
  return !!resolveNodeCollision(node)
}

function hasLiveCollisionBody() {
  return hasPhysicsBody() && visible
}

function getRigidBodyType() {
  return node.physics?.bodyType ?? 'fixed'
}

function getColliderArgs() {
  return getNodeColliderArgs(node)
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

$: effectiveCollision = resolveNodeCollision(node)
$: if (editorEnabled && collisionOverlayEnabled) {
  logCollisionOverlaySource()
} else {
  collisionOverlayLogSignature = ''
}
</script>

{#if !editorEnabled && hasLiveCollisionBody()}
  <CollisionBody
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
    primitiveGeometry={node.primitive?.geometry}
    primitiveArgs={node.primitive?.args ?? []}
  >
    <slot />
  </CollisionBody>
{:else}
  <slot />
{/if}

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
    primitiveGeometry={node.primitive?.geometry}
    primitiveArgs={node.primitive?.args ?? []}
  />
{/if}
