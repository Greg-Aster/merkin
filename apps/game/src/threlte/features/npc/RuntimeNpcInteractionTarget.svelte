<script lang="ts">
import { T } from '@threlte/core'
import { createEventDispatcher, onDestroy } from 'svelte'
import * as THREE from 'three'
import {
  canBindRuntimeNpcInteraction,
  getRuntimeNpcInteractiveObjectId,
  recordRuntimeNpcInteraction,
} from './runtimeNpcRegistry'
import type {
  RuntimeNpcActor,
  RuntimeNpcComponent,
  RuntimeNpcInteractionEvent,
} from './runtimeNpcTypes'

const dispatch = createEventDispatcher<{
  npcInteraction: RuntimeNpcInteractionEvent
  npcHover: { hovered: boolean }
}>()

export let actor: RuntimeNpcActor
export let npc: RuntimeNpcComponent
export let levelId = ''
export let interactionSystem: any = null
export let interactiveEnabled = false
export let position: [number, number, number] = [0, 0, 0]
export let scale = 1.25

let sprite: THREE.Sprite | undefined
let registeredInteractionSignature = ''
let registeredInteractiveObjectId: string | null = null
const hitTargetMaterial = new THREE.SpriteMaterial({
  transparent: true,
  opacity: 0,
  depthWrite: false,
  depthTest: false,
})

function getNpcId(value: RuntimeNpcComponent | null | undefined) {
  return typeof value?.id === 'string' ? value.id.trim() : ''
}

function getInteractionRegistrationSignature(
  value: RuntimeNpcComponent | null | undefined,
) {
  const npcId = getNpcId(value)
  if (!value || !npcId || !levelId || !actor?.id || !sprite) return ''
  if (!interactiveEnabled || !interactionSystem?.registerInteractiveObject) {
    return ''
  }

  return JSON.stringify({
    levelId,
    actorId: actor.id,
    npcId,
    mode: value.interaction?.mode,
    enabled: value.interaction?.enabled,
    prompt: value.interaction?.prompt,
    cooldownMs: value.interaction?.cooldownMs,
    eventKey: value.interaction?.eventKey,
  })
}

function clearInteractionRegistration() {
  if (
    registeredInteractiveObjectId &&
    interactionSystem?.unregisterInteractiveObject
  ) {
    interactionSystem.unregisterInteractiveObject(registeredInteractiveObjectId)
  }
  registeredInteractiveObjectId = null
  registeredInteractionSignature = ''
}

function syncInteractionRegistration(
  signature: string,
  value: RuntimeNpcComponent,
) {
  const npcId = getNpcId(value)
  if (
    !sprite ||
    !canBindRuntimeNpcInteraction({ levelId, actorId: actor.id, npcId })
  ) {
    clearInteractionRegistration()
    return
  }

  const interactiveObjectId = getRuntimeNpcInteractiveObjectId(npcId)
  if (registeredInteractiveObjectId !== interactiveObjectId) {
    clearInteractionRegistration()
  }

  interactionSystem.registerInteractiveObject({
    id: interactiveObjectId,
    sprite,
    type: 'npc',
    data: {
      type: 'npc',
      levelId,
      actorId: actor.id,
      actorName: actor.name,
      npcId,
      archetype: value.archetype,
      displayName: value.displayName,
    },
    index: 0,
    handlers: {
      onClick: () => {
        const event = recordRuntimeNpcInteraction(npcId, 'click')
        if (event) {
          dispatch('npcInteraction', event)
        }
      },
      onHover: (_data: unknown, hovered: boolean) => {
        dispatch('npcHover', { hovered })
      },
    },
  })

  registeredInteractiveObjectId = interactiveObjectId
  registeredInteractionSignature = signature
}

$: interactionRegistrationSignature = getInteractionRegistrationSignature(npc)
$: {
  if (!interactionRegistrationSignature) {
    clearInteractionRegistration()
  } else if (
    npc &&
    interactionRegistrationSignature !== registeredInteractionSignature
  ) {
    syncInteractionRegistration(interactionRegistrationSignature, npc)
  }
}

onDestroy(() => {
  clearInteractionRegistration()
  hitTargetMaterial.dispose()
})
</script>

{#if npc && interactiveEnabled}
  <T.Sprite
    bind:ref={sprite}
    name={`npc-interaction-${getNpcId(npc)}`}
    {position}
    {scale}
    material={hitTargetMaterial}
  />
{/if}
