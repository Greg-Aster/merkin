import { getLevelCollisionWorkflow } from '../engine/levelCollisionWorkflow'
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
  'renderProfile',
  'water',
  'ambientParticles',
  'ambientAudio',
  'collision',
  'ground',
  'terrainSculpt',
  'worldPartition',
  'graphicsBudget',
  'editorPanels',
  'presets',
  'skyboxPreset',
  'skybox',
] as const satisfies ReadonlyArray<keyof SharedLevelEditorSettings>

const LEGACY_SHARED_SETTING_BUCKETS = [
  'observatory',
  'solitude',
] as const satisfies ReadonlyArray<keyof EditorSceneSettings>

function mergeDeepRecords(
  base: Record<string, unknown>,
  overrides: Record<string, unknown>,
): Record<string, unknown> {
  const result = structuredClone(base)

  for (const [key, value] of Object.entries(overrides)) {
    const current = result[key]
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      current &&
      typeof current === 'object' &&
      !Array.isArray(current)
    ) {
      result[key] = mergeDeepRecords(
        current as Record<string, unknown>,
        value as Record<string, unknown>,
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
  source: Partial<SharedLevelEditorSettings> | null | undefined,
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

export function removeSharedLevelSettings<T extends object | null | undefined>(
  source: T,
): T {
  if (!source) return source

  const next = structuredClone(source) as Record<string, unknown>
  for (const key of SHARED_LEVEL_SETTING_KEYS) {
    delete next[key]
  }

  return next as T
}

function hasSettingsEntries(
  source: Record<string, unknown> | null | undefined,
) {
  return !!source && Object.keys(source).length > 0
}

function collectLegacySharedLevelSettings(
  settings: EditorSceneSettings,
): SharedLevelEditorSettings {
  return mergeLevelSettings<SharedLevelEditorSettings>(
    ...LEGACY_SHARED_SETTING_BUCKETS.map(bucket =>
      pickSharedLevelSettings(settings[bucket] as SharedLevelEditorSettings),
    ),
  )
}

function migrateLegacyFeatureAliases(settings: SharedLevelEditorSettings) {
  const features = settings.features as
    | (NonNullable<SharedLevelEditorSettings['features']> & {
        ocean?: boolean
      })
    | undefined

  if (!features || features.ocean === undefined) return

  if (features.water === undefined) {
    features.water = features.ocean
  }
  features.ocean = undefined
}

function migrateLegacyGroundVisualSource(settings: SharedLevelEditorSettings) {
  const ground = settings.ground
  if (!ground || ground.visualSource !== 'terrain-chunks') return

  const terrain = settings.collision?.terrain
  const renderChunks = ground.renderChunks ?? terrain?.renderChunks
  const sourceGlbChunks =
    ground.terrainVisualSource === 'source-glb-chunks' ||
    ground.terrainRuntimeMode === 'glb-chunk-terrain' ||
    terrain?.visualSource === 'source-glb-chunks' ||
    terrain?.runtimeMode === 'glb-chunk-terrain' ||
    terrain?.source === 'source-glb' ||
    renderChunks?.type === 'glb-chunk-terrain'

  ground.visualSource = sourceGlbChunks
    ? 'source-glb-chunks'
    : 'generated-heightmap-chunks'
  ground.terrainVisualSource ??= ground.visualSource
}

function migrateLegacyObservatorySettings(settings: EditorSceneSettings): void {
  const observatory = settings.observatory as
    | (ObservatoryEditorSettings & {
        ocean?: ObservatoryEditorSettings['water']
      })
    | undefined

  if (!observatory?.ocean) return

  settings.level = mergeLevelSettings<SharedLevelEditorSettings>(
    {
      water: observatory.ocean,
    },
    settings.level ?? {},
  )
  observatory.ocean = undefined
}

export function normalizeLevelSceneSettings(
  levelId: string,
  settings?: EditorSceneSettings,
): EditorSceneSettings {
  const normalized = structuredClone(settings ?? {}) as EditorSceneSettings

  normalized.level = mergeLevelSettings<SharedLevelEditorSettings>(
    collectLegacySharedLevelSettings(normalized),
    normalized.level ?? {},
  )

  migrateLegacyObservatorySettings(normalized)
  migrateLegacyFeatureAliases(normalized.level)
  migrateLegacyGroundVisualSource(normalized.level)

  const workflow = getLevelCollisionWorkflow(levelId, normalized)

  normalized.level = mergeLevelSettings<SharedLevelEditorSettings>(
    {
      collision: {
        workflow: {
          colliderBudget: workflow.colliderBudget,
        },
        terrain: {
          source:
            workflow.terrainCollision === 'heightmap'
              ? 'baked-heightmap'
              : workflow.terrainCollision,
          runtimeSource:
            workflow.terrainCollision === 'heightmap' ||
            workflow.terrainCollision === 'source-glb'
              ? 'built-in-manifest'
              : undefined,
          manifestUrl: workflow.terrainManifestUrl,
          dirty: false,
        },
        defaults: {
          primitiveCollisionByDefault: true,
          defaultFriction: 0.7,
          defaultRestitution: 0,
        },
      },
      terrainSculpt: {
        enabled: workflow.terrainCollision === 'heightmap',
        autoBakeCollision: true,
      },
    },
    normalized.level,
  )

  if (normalized.observatory) {
    normalized.observatory = removeSharedLevelSettings(
      normalized.observatory,
    ) as ObservatoryEditorSettings
  }

  if (normalized.solitude) {
    normalized.solitude = removeSharedLevelSettings(
      normalized.solitude,
    ) as SolitudeEditorSettings
  }

  return normalized
}

export function mergeObservatoryEditorSettings(
  settings: EditorSceneSettings | null | undefined,
): ObservatoryEditorSettings | null {
  if (
    !hasSettingsEntries(settings?.level as Record<string, unknown>) &&
    !hasSettingsEntries(settings?.observatory as Record<string, unknown>)
  ) {
    return null
  }

  return mergeLevelSettings<ObservatoryEditorSettings>(
    settings?.level ?? {},
    settings?.observatory ?? {},
  )
}

export function mergeSolitudeEditorSettings(
  settings: EditorSceneSettings | null | undefined,
): SolitudeEditorSettings | null {
  if (
    !hasSettingsEntries(settings?.level as Record<string, unknown>) &&
    !hasSettingsEntries(settings?.solitude as Record<string, unknown>)
  ) {
    return null
  }

  return mergeLevelSettings<SolitudeEditorSettings>(
    settings?.level ?? {},
    settings?.solitude ?? {},
  )
}
