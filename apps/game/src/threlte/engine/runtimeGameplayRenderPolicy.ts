import type { ActorDefinition } from './types'

export function usesLightweightRuntimeGameplayMarker(
  actor: Pick<ActorDefinition, 'gameplay' | 'render'>,
) {
  return (
    actor.gameplay?.type === 'note' &&
    actor.render?.prefab?.type === 'story-marker'
  )
}
