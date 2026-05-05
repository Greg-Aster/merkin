<script lang="ts">
import type { ActorDefinition } from '../engine/types'
import RuntimeActorNode from './RuntimeActorNode.svelte'

export let actor: ActorDefinition
export let actors: ActorDefinition[] = []
export let levelId = ''
export let interactionSystem: any = null
export let interactiveEnabled = false
export let visibleActorIds: Set<string> | null = null

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
  on:portalTransition
  on:noteRead
>
  {#each childActors as child (child.id)}
    <svelte:self
      actor={child}
      {actors}
      {levelId}
      {interactionSystem}
      {interactiveEnabled}
      {visibleActorIds}
      on:portalTransition
      on:noteRead
    />
  {/each}
</RuntimeActorNode>
