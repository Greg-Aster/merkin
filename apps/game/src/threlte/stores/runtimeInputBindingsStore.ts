import { derived, writable } from 'svelte/store'
import {
  DEFAULT_RUNTIME_INPUT_BINDINGS,
  RUNTIME_INPUT_ACTIONS,
  type RuntimeInputActionId,
  type RuntimeInputBindingMap,
  createDefaultRuntimeInputBindings,
  createRuntimeInputBindingSnapshot,
  formatRuntimeInputCodeLabel,
  normalizeRuntimeInputBindingSnapshot,
  rebindRuntimeInputCode,
} from '../engine/runtimeInputBindings'

const STORAGE_KEY = 'megameal-game-runtime-input-bindings'

function readStoredBindings(): RuntimeInputBindingMap {
  if (typeof window === 'undefined') return createDefaultRuntimeInputBindings()

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (!stored) return createDefaultRuntimeInputBindings()
    return normalizeRuntimeInputBindingSnapshot(JSON.parse(stored)).keyboard
  } catch (error) {
    console.warn('Failed to load runtime input bindings:', error)
    return createDefaultRuntimeInputBindings()
  }
}

function writeStoredBindings(bindings: RuntimeInputBindingMap) {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(createRuntimeInputBindingSnapshot(bindings)),
    )
  } catch (error) {
    console.warn('Failed to persist runtime input bindings:', error)
  }
}

export const runtimeInputBindingsStore = writable<RuntimeInputBindingMap>(
  readStoredBindings(),
)

if (typeof window !== 'undefined') {
  runtimeInputBindingsStore.subscribe(writeStoredBindings)
}

export const runtimeInputBindingRows = derived(
  runtimeInputBindingsStore,
  $runtimeInputBindingsStore =>
    RUNTIME_INPUT_ACTIONS.map(action => ({
      ...action,
      keyboardCodes: $runtimeInputBindingsStore[action.id],
      keyboardLabel: $runtimeInputBindingsStore[action.id]
        .map(formatRuntimeInputCodeLabel)
        .join(' / '),
    })),
)

export function rebindRuntimeInputAction(
  actionId: RuntimeInputActionId,
  code: string,
) {
  runtimeInputBindingsStore.update(bindings =>
    rebindRuntimeInputCode(bindings, actionId, code),
  )
}

export function resetRuntimeInputBindings() {
  runtimeInputBindingsStore.set(DEFAULT_RUNTIME_INPUT_BINDINGS)
}
