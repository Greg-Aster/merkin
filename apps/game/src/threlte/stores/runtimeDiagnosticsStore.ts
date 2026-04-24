import { derived, writable } from 'svelte/store'

export type DiagnosticLevel = 'idle' | 'loading' | 'ready' | 'warning' | 'error'

export interface DiagnosticRecord {
  key: string
  label: string
  level: DiagnosticLevel
  message: string
  updatedAt: number
  meta?: Record<string, unknown>
}

export interface AssetFailureRecord {
  id: string
  source: string
  message: string
  updatedAt: number
}

const DEFAULT_DIAGNOSTICS: Record<string, DiagnosticRecord> = {
  engine: {
    key: 'engine',
    label: 'Engine Boot',
    level: 'idle',
    message: 'Engine has not started yet.',
    updatedAt: 0,
  },
  mode: {
    key: 'mode',
    label: 'Runtime Mode',
    level: 'idle',
    message: 'Mode not resolved.',
    updatedAt: 0,
  },
  terrain: {
    key: 'terrain',
    label: 'Terrain',
    level: 'idle',
    message: 'Terrain not initialized.',
    updatedAt: 0,
  },
  levelBoot: {
    key: 'levelBoot',
    label: 'Level Boot',
    level: 'idle',
    message: 'Level has not started loading yet.',
    updatedAt: 0,
  },
  timeline: {
    key: 'timeline',
    label: 'Timeline',
    level: 'idle',
    message: 'Timeline has not started loading yet.',
    updatedAt: 0,
  },
  physics: {
    key: 'physics',
    label: 'Physics',
    level: 'idle',
    message: 'Physics not initialized.',
    updatedAt: 0,
  },
  player: {
    key: 'player',
    label: 'Player',
    level: 'idle',
    message: 'Player not initialized.',
    updatedAt: 0,
  },
  editor: {
    key: 'editor',
    label: 'Editor',
    level: 'idle',
    message: 'Editor disabled.',
    updatedAt: 0,
  },
  toolsBridge: {
    key: 'toolsBridge',
    label: 'Tools Bridge',
    level: 'idle',
    message: 'Tools bridge status unknown.',
    updatedAt: 0,
  },
  comfyUi: {
    key: 'comfyUi',
    label: 'ComfyUI',
    level: 'idle',
    message: 'ComfyUI status unknown.',
    updatedAt: 0,
  },
  hunyuan: {
    key: 'hunyuan',
    label: 'AI Mesh Backend',
    level: 'idle',
    message: 'AI mesh backend status unknown.',
    updatedAt: 0,
  },
  selection: {
    key: 'selection',
    label: 'Editor Selection',
    level: 'idle',
    message: 'No active editor selection.',
    updatedAt: 0,
  },
  scenePersistence: {
    key: 'scenePersistence',
    label: 'Scene Persistence',
    level: 'idle',
    message: 'Scene persistence status unknown.',
    updatedAt: 0,
  },
  fog: {
    key: 'fog',
    label: 'Scene Fog',
    level: 'idle',
    message: 'Scene fog has not been configured.',
    updatedAt: 0,
  },
}

export const runtimeDiagnosticsStore =
  writable<Record<string, DiagnosticRecord>>(DEFAULT_DIAGNOSTICS)
export const runtimeAssetFailuresStore = writable<AssetFailureRecord[]>([])

function now() {
  return Date.now()
}

export function setRuntimeDiagnostic(
  key: keyof typeof DEFAULT_DIAGNOSTICS | string,
  patch: Partial<Omit<DiagnosticRecord, 'key' | 'updatedAt'>> & {
    label?: string
  },
) {
  runtimeDiagnosticsStore.update(current => {
    const existing = current[key] ?? {
      key,
      label: patch.label ?? key,
      level: 'idle' as DiagnosticLevel,
      message: '',
      updatedAt: 0,
    }

    return {
      ...current,
      [key]: {
        ...existing,
        ...patch,
        key,
        updatedAt: now(),
      },
    }
  })
}

export function resetRuntimeDiagnostics() {
  runtimeDiagnosticsStore.set(DEFAULT_DIAGNOSTICS)
  runtimeAssetFailuresStore.set([])
}

export function reportRuntimeAssetFailure(source: string, message: string) {
  const entry: AssetFailureRecord = {
    id: `${source}:${now()}`,
    source,
    message,
    updatedAt: now(),
  }

  runtimeAssetFailuresStore.update(current => [entry, ...current].slice(0, 12))
  setRuntimeDiagnostic('toolsBridge', {
    level: 'warning',
    message:
      'Asset/runtime failures have been reported. Open diagnostics for details.',
  })
}

export function clearRuntimeAssetFailures() {
  runtimeAssetFailuresStore.set([])
}

export const runtimeDiagnosticsSummaryStore = derived(
  [runtimeDiagnosticsStore, runtimeAssetFailuresStore],
  ([$runtimeDiagnosticsStore, $runtimeAssetFailuresStore]) => {
    const diagnostics = Object.values($runtimeDiagnosticsStore)
    const errors = diagnostics.filter(entry => entry.level === 'error').length
    const warnings = diagnostics.filter(
      entry => entry.level === 'warning',
    ).length

    return {
      diagnostics,
      errors,
      warnings,
      assetFailures: $runtimeAssetFailuresStore,
    }
  },
)
