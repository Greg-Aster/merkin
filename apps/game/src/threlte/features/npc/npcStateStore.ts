import { derived, writable } from 'svelte/store'
import type { NpcConversationConfig } from '../../engine/npcTypes'

export type NpcConversationMode = NpcConversationConfig['mode']

export interface NpcInteractionEvent {
  id: string
  eventKey: string
  npcId: string
  actorId: string
  levelId: string
  mode: NpcConversationMode
  timestamp: number
}

export interface NpcRuntimeState {
  interactionEvents: NpcInteractionEvent[]
}

export interface NpcInteractionIdentity {
  npcId: string
  actorId: string
  levelId: string
}

const maxStoredInteractionEvents = 100

function createInteractionEventId(input: NpcInteractionEvent) {
  return [
    input.timestamp,
    input.levelId || 'unknown-level',
    input.actorId,
    input.npcId,
    input.mode,
  ].join(':')
}

export const npcStateStore = writable<NpcRuntimeState>({
  interactionEvents: [],
})

export const npcInteractionEvents = derived(
  npcStateStore,
  state => state.interactionEvents,
)

export const npcStateActions = {
  recordInteractionEvent(input: Omit<NpcInteractionEvent, 'id'>) {
    const event: NpcInteractionEvent = {
      ...input,
      id: createInteractionEventId({ ...input, id: '' }),
    }

    npcStateStore.update(current => ({
      ...current,
      interactionEvents: [...current.interactionEvents, event].slice(
        -maxStoredInteractionEvents,
      ),
    }))

    return event
  },

  clearLevel(levelId: string) {
    npcStateStore.update(current => {
      return {
        interactionEvents: current.interactionEvents.filter(
          event => event.levelId !== levelId,
        ),
      }
    })
  },

  reset() {
    npcStateStore.set({
      interactionEvents: [],
    })
  },
}
