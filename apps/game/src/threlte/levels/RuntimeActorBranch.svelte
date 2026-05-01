<script lang="ts">
import type { ActorDefinition } from '../engine/types'
import RuntimeActorNode from './RuntimeActorNode.svelte'

export let actor: ActorDefinition
export let actors: ActorDefinition[] = []
export let levelId = ''
export let interactionSystem: any = null
export let interactiveEnabled = false

$: childActors = actors.filter(child => child.parentId === actor.id)
</script>

<RuntimeActorNode
  {actor}
  {levelId}
  {interactionSystem}
  {interactiveEnabled}
  hasChildren={childActors.length > 0}
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
      on:portalTransition
      on:noteRead
    />
  {/each}
</RuntimeActorNode>
