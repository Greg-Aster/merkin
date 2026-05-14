import type { ActorDefinition } from './types'

export function shouldRenderActorVisual(actor: ActorDefinition) {
  return actor.render?.visible ?? true
}

export function shouldMountActorCollision(actor: ActorDefinition) {
  return Boolean(actor.physics?.collision)
}

export function shouldRenderVisualInsideCollider(actor: ActorDefinition) {
  return (
    shouldRenderActorVisual(actor) &&
    shouldMountActorCollision(actor) &&
    actor.render?.physicsAttachment !== 'outside-collider'
  )
}
