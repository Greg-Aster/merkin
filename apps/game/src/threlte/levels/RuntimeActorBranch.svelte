<script lang="ts">
import type { ActorDefinition } from '../engine/types'
import RuntimeActorNode from './RuntimeActorNode.svelte'

export let actor: ActorDefinition
export let actors: ActorDefinition[] = []
export let levelId = ''
export let interactionSystem: any = null
export let interactiveEnabled = false
export let visibleActorIds: Set<string> | null = null
export let collisionOnly = false

$: childActors = actors.filter(child => {
  if (child.parentId !== actor.id) return false
  if (visibleActorIds && !visibleActorIds.has(child.id)) return false
  return true
})
</script>

<RuntimeActorNode
  {actor}
  {levelId}
  {interactionSystem}
  {interactiveEnabled}
  {collisionOnly}
  on:portalTransition
  on:noteRead
  on:npcInteraction
>
  {#each childActors as child (child.id)}
    <svelte:self
      actor={child}
      {actors}
      {levelId}
      {interactionSystem}
      {interactiveEnabled}
      {visibleActorIds}
      {collisionOnly}
      on:portalTransition
      on:noteRead
      on:npcInteraction
    />
  {/each}
</RuntimeActorNode>
