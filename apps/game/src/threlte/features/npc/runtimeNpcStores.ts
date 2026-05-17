import { derived, writable } from 'svelte/store'
import type {
  RuntimeNpcDiagnostics,
  RuntimeNpcInteractionEvent,
  RuntimeNpcRegistrySnapshot,
} from './runtimeNpcTypes'

const EMPTY_RUNTIME_NPC_SNAPSHOT: RuntimeNpcRegistrySnapshot = {
  registrations: [],
  interactiveNpcIds: [],
  disabledNpcIds: [],
  duplicateNpcIds: [],
  duplicateActorIds: [],
  missingActorNpcIds: [],
  missingNpcIdActorIds: [],
  unsupportedInteractionModeActorIds: [],
}

export const runtimeNpcRegistryStore = writable<RuntimeNpcRegistrySnapshot>({
  ...EMPTY_RUNTIME_NPC_SNAPSHOT,
})

export const runtimeNpcInteractionEventStore =
  writable<RuntimeNpcInteractionEvent | null>(null)

export const runtimeNpcDiagnosticsStore = derived(
  runtimeNpcRegistryStore,
  ($runtimeNpcRegistryStore): RuntimeNpcDiagnostics => ({
    registeredCount: $runtimeNpcRegistryStore.registrations.length,
    interactiveCount: $runtimeNpcRegistryStore.interactiveNpcIds.length,
    disabledCount: $runtimeNpcRegistryStore.disabledNpcIds.length,
    duplicateNpcIds: $runtimeNpcRegistryStore.duplicateNpcIds,
    duplicateActorIds: $runtimeNpcRegistryStore.duplicateActorIds,
    missingActorNpcIds: $runtimeNpcRegistryStore.missingActorNpcIds,
    missingNpcIdActorIds: $runtimeNpcRegistryStore.missingNpcIdActorIds,
    unsupportedInteractionModeActorIds:
      $runtimeNpcRegistryStore.unsupportedInteractionModeActorIds,
  }),
)

export function setRuntimeNpcRegistrySnapshot(
  snapshot: RuntimeNpcRegistrySnapshot,
) {
  runtimeNpcRegistryStore.set(snapshot)
}

export function publishRuntimeNpcInteractionEvent(
  event: RuntimeNpcInteractionEvent,
) {
  runtimeNpcInteractionEventStore.set(event)
}

export function resetRuntimeNpcStores() {
  runtimeNpcRegistryStore.set({ ...EMPTY_RUNTIME_NPC_SNAPSHOT })
  runtimeNpcInteractionEventStore.set(null)
}
