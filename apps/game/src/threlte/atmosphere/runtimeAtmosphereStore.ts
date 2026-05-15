import { writable } from 'svelte/store'
import { DEFAULT_RUNTIME_ATMOSPHERE } from './buildRuntimeAtmosphere'
import {
  type RuntimeAtmosphereDefinition,
  type RuntimeAtmospherePatch,
  mergeRuntimeAtmosphere,
} from './runtimeAtmosphereTypes'

function createRuntimeAtmosphereStore() {
  const { subscribe, set, update } = writable<RuntimeAtmosphereDefinition>(
    DEFAULT_RUNTIME_ATMOSPHERE,
  )

  return {
    subscribe,
    replace: (next: RuntimeAtmosphereDefinition) => set(next),
    merge: (next: RuntimeAtmospherePatch) => {
      update(current => mergeRuntimeAtmosphere(current, next))
    },
    reset: () => set(DEFAULT_RUNTIME_ATMOSPHERE),
  }
}

export const runtimeAtmosphereStore = createRuntimeAtmosphereStore()

export function replaceRuntimeAtmosphere(next: RuntimeAtmosphereDefinition) {
  runtimeAtmosphereStore.replace(next)
}

export function mergeRuntimeAtmosphereSettings(next: RuntimeAtmospherePatch) {
  runtimeAtmosphereStore.merge(next)
}

export function resetRuntimeAtmosphere() {
  runtimeAtmosphereStore.reset()
}

export { DEFAULT_RUNTIME_ATMOSPHERE, mergeRuntimeAtmosphere }
export type { RuntimeAtmosphereDefinition, RuntimeAtmospherePatch }
