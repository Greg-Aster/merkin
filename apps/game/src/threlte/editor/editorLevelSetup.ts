import type {
  EditorSceneSettings,
  ObservatoryEditorSettings,
  SharedLevelEditorSettings,
  SolitudeEditorSettings,
} from './editorTypes'

const SHARED_LEVEL_SETTING_KEYS = [
  'spawn',
  'player',
  'features',
  'style',
  'lighting',
  'water',
  'ambientParticles',
  'ambientAudio',
  'presets',
  'skyboxPreset',
] as const satisfies ReadonlyArray<keyof SharedLevelEditorSettings>

function mergeDeepRecords(
  base: Record<string, unknown>,
  overrides: Record<string, unknown>
): Record<string, unknown> {
  const result = structuredClone(base)

  for (const [key, value] of Object.entries(overrides)) {
    const current = result[key]
    if (
      value
      && typeof value === 'object'
      && !Array.isArray(value)
      && current
      && typeof current === 'object'
      && !Array.isArray(current)
    ) {
      result[key] = mergeDeepRecords(
        current as Record<string, unknown>,
        value as Record<string, unknown>
      )
    } else {
      result[key] = structuredClone(value)
    }
  }

  return result
}

export function mergeLevelSettings<T extends object>(
  ...sources: Array<Partial<T> | null | undefined>
): T {
  let merged: Record<string, unknown> = {}

  for (const source of sources) {
    if (!source) continue
    merged = mergeDeepRecords(merged, source as Record<string, unknown>)
  }

  return merged as T
}

export function pickSharedLevelSettings(
  source: Partial<SharedLevelEditorSettings> | null | undefined
): SharedLevelEditorSettings {
  const picked: SharedLevelEditorSettings = {}

  for (const key of SHARED_LEVEL_SETTING_KEYS) {
    const value = source?.[key]
    if (value !== undefined) {
      ;(picked as Record<string, unknown>)[key] = structuredClone(value)
    }
  }

  return picked
}

export function removeSharedLevelSettings<T extends object | null | undefined>(source: T): T {
  if (!source) return source

  const next = structuredClone(source) as Record<string, unknown>
  for (const key of SHARED_LEVEL_SETTING_KEYS) {
    delete next[key]
  }

  return next as T
}

function hasSettingsEntries(source: Record<string, unknown> | null | undefined) {
  return !!source && Object.keys(source).length > 0
}

export function normalizeLevelSceneSettings(levelId: string, settings?: EditorSceneSettings): EditorSceneSettings {
  const normalized = structuredClone(settings ?? {}) as EditorSceneSettings
  const legacySettings = levelId === 'solitude' ? normalized.solitude : normalized.observatory

  normalized.level = mergeLevelSettings<SharedLevelEditorSettings>(
    pickSharedLevelSettings(legacySettings),
    normalized.level ?? {}
  )

  if (normalized.observatory) {
    normalized.observatory = removeSharedLevelSettings(normalized.observatory) as ObservatoryEditorSettings
  }

  if (normalized.solitude) {
    normalized.solitude = removeSharedLevelSettings(normalized.solitude) as SolitudeEditorSettings
  }

  return normalized
}

export function mergeObservatoryEditorSettings(
  settings: EditorSceneSettings | null | undefined
): ObservatoryEditorSettings | null {
  if (!hasSettingsEntries(settings?.level as Record<string, unknown>) && !hasSettingsEntries(settings?.observatory as Record<string, unknown>)) {
    return null
  }

  return mergeLevelSettings<ObservatoryEditorSettings>(settings?.level ?? {}, settings?.observatory ?? {})
}

export function mergeSolitudeEditorSettings(
  settings: EditorSceneSettings | null | undefined
): SolitudeEditorSettings | null {
  if (!hasSettingsEntries(settings?.level as Record<string, unknown>) && !hasSettingsEntries(settings?.solitude as Record<string, unknown>)) {
    return null
  }

  return mergeLevelSettings<SolitudeEditorSettings>(settings?.level ?? {}, settings?.solitude ?? {})
}
