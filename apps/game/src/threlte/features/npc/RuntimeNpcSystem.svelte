<script lang="ts">
import { createEventDispatcher, onDestroy } from 'svelte'
import RuntimeNpcInteractionTarget from './RuntimeNpcInteractionTarget.svelte'
import {
  registerRuntimeNpcActor,
  unregisterRuntimeNpcActor,
} from './runtimeNpcRegistry'
import type {
  RuntimeNpcActor,
  RuntimeNpcComponent,
  RuntimeNpcInteractionEvent,
} from './runtimeNpcTypes'

const dispatch = createEventDispatcher<{
  npcInteraction: RuntimeNpcInteractionEvent
}>()

export let actor: RuntimeNpcActor
export let levelId = ''
export let interactionSystem: any = null
export let interactiveEnabled = false
export let bindInteractionTarget = true

let registeredActorSignature = ''
let registeredActorReference: { levelId: string; actorId: string } | null = null

function getActorRegistrationSignature(
  npc: RuntimeNpcComponent | null | undefined,
) {
  if (!npc || !levelId || !actor?.id) return ''
  return JSON.stringify({
    levelId,
    actorId: actor.id,
    actorName: actor.name,
    npc,
  })
}

function clearActorRegistration() {
  if (!registeredActorReference) return
  unregisterRuntimeNpcActor(registeredActorReference)
  registeredActorReference = null
  registeredActorSignature = ''
}

function syncActorRegistration(signature: string, npc: RuntimeNpcComponent) {
  clearActorRegistration()
  registerRuntimeNpcActor({
    levelId,
    actorId: actor.id,
    actorName: actor.name,
    npc,
  })
  registeredActorReference = { levelId, actorId: actor.id }
  registeredActorSignature = signature
}

$: npc = actor.npc ?? null
$: actorRegistrationSignature = getActorRegistrationSignature(npc)
$: {
  if (!actorRegistrationSignature) {
    clearActorRegistration()
  } else if (npc && actorRegistrationSignature !== registeredActorSignature) {
    syncActorRegistration(actorRegistrationSignature, npc)
  }
}

onDestroy(() => {
  clearActorRegistration()
})
</script>

{#if npc && interactiveEnabled && bindInteractionTarget}
  <RuntimeNpcInteractionTarget
    {actor}
    {npc}
    {levelId}
    {interactionSystem}
    {interactiveEnabled}
    on:npcInteraction={(event) => dispatch('npcInteraction', event.detail)}
  />
{/if}
