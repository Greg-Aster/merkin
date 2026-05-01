import type {
  EditorSceneSettings,
  ObservatoryEditorSettings,
  SharedLevelEditorSettings,
  SolitudeEditorSettings,
} from './sceneDocumentTypes'
import { getLevelCollisionWorkflow } from './levelCollisionWorkflow'

const SHARED_LEVEL_SETTING_KEYS = [
  'spawn',
  'player',
  'features',
  'style',
  'lighting',
  'water',
  'ambientParticles',
  'ambientAudio',
  'collision',
  'terrainSculpt',
  'presets',
  'skyboxPreset',
] as const satisfies ReadonlyArray<keyof SharedLevelEditorSettings>

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

export function normalizeRuntimeLevelSceneSettings(
  levelId: string,
  settings?: EditorSceneSettings,
): EditorSceneSettings {
  const normalized = structuredClone(settings ?? {}) as EditorSceneSettings
  const workflow = getLevelCollisionWorkflow(levelId)
  const legacySettings =
    levelId === 'solitude' ? normalized.solitude : normalized.observatory

  normalized.level = mergeLevelSettings<SharedLevelEditorSettings>(
    pickSharedLevelSettings(legacySettings),
    normalized.level ?? {},
  )

  normalized.level = mergeLevelSettings<SharedLevelEditorSettings>(
    {
      collision: {
        workflow: {
          actorCollision: workflow.defaultActorCollision,
          colliderBudget: workflow.colliderBudget,
          terrainSculpting: workflow.terrainSculpting ?? false,
          autoBakeTerrain: workflow.autoBakeTerrain ?? true,
          terrainVisualChunks: workflow.terrainVisualChunks ?? 'auto',
        },
        terrain: {
          source:
            workflow.terrainCollision === 'heightmap'
              ? 'baked-heightmap'
              : workflow.terrainCollision,
          runtimeSource:
            workflow.terrainCollision === 'heightmap'
              ? 'built-in-manifest'
              : undefined,
          manifestUrl: workflow.terrainManifestUrl,
          autoBakeOnTerrainChange: workflow.autoBakeTerrain ?? true,
          dirty: false,
        },
        defaults: {
          solidObjectsByDefault: true,
          defaultFriction: 0.7,
          defaultRestitution: 0,
        },
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
