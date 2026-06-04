import { writable } from 'svelte/store'
import type { RuntimeLightBudgetGroup } from '../engine/sceneDocumentTypes'

export interface RuntimeLightingGroupTelemetry {
  totalPointLights: number
  activePointLights: number
}

export interface RuntimePointLightingTelemetry {
  total: number
  active: number
  inactive: number
}

export interface RuntimeLightingTelemetry {
  pointLights: RuntimePointLightingTelemetry
  fireflyPointLights: RuntimePointLightingTelemetry
  groups: Partial<
    Record<RuntimeLightBudgetGroup, RuntimeLightingGroupTelemetry>
  >
  updatedAt: number
}

declare global {
  interface Window {
    __gameRuntimeLightingState?: RuntimeLightingTelemetry
  }
}

const emptyRuntimeLightingTelemetry: RuntimeLightingTelemetry = {
  pointLights: {
    total: 0,
    active: 0,
    inactive: 0,
  },
  fireflyPointLights: {
    total: 0,
    active: 0,
    inactive: 0,
  },
  groups: {},
  updatedAt: 0,
}

export const runtimeLightingTelemetryStore = writable<RuntimeLightingTelemetry>(
  emptyRuntimeLightingTelemetry,
)

export function publishRuntimeLightingTelemetry(
  telemetry: Omit<RuntimeLightingTelemetry, 'updatedAt'>,
) {
  const next = {
    ...telemetry,
    updatedAt: Date.now(),
  }
  runtimeLightingTelemetryStore.set(next)

  if (typeof window !== 'undefined') {
    window.__gameRuntimeLightingState = next
  }
}

export function clearRuntimeLightingTelemetry() {
  runtimeLightingTelemetryStore.set(emptyRuntimeLightingTelemetry)

  if (typeof window !== 'undefined') {
    window.__gameRuntimeLightingState = emptyRuntimeLightingTelemetry
  }
}
