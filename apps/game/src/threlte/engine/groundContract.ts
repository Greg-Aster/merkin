import {
  classifyTerrainAuthority as classifyTerrainAuthorityCore,
  getLevelGroundContract as getLevelGroundContractCore,
  getRuntimeGroundContract as getRuntimeGroundContractCore,
  getTerrainAuthorityDiagnostics as getTerrainAuthorityDiagnosticsCore,
  hasAuthoredGroundVisuals as hasAuthoredGroundVisualsCore,
  shouldRenderTerrainVisualChunks as shouldRenderTerrainVisualChunksCore,
  validateLevelGroundContract as validateLevelGroundContractCore,
} from './groundContractCore.mjs'
import type {
  SceneSettings,
  SharedLevelGroundSettings,
} from './sceneDocumentTypes'
import type { ActorDefinition, LevelDefinition } from './types'

export type LevelGroundContract = NonNullable<
  SharedLevelGroundSettings['ground']
>
type TerrainAuthorityInputLevel =
  | LevelDefinition
  | { id?: string; settings?: unknown }

export function getLevelGroundContract(
  settings: SceneSettings | Record<string, unknown> | null | undefined,
) {
  return getLevelGroundContractCore(settings) as LevelGroundContract | null
}

export function getRuntimeGroundContract(levelDefinition: LevelDefinition) {
  return getRuntimeGroundContractCore(levelDefinition) as
    | LevelGroundContract
    | undefined
}

export function hasAuthoredGroundVisuals(
  settings: SceneSettings | Record<string, unknown> | null | undefined,
) {
  return hasAuthoredGroundVisualsCore(settings)
}

export function shouldRenderTerrainVisualChunks(
  levelId: string,
  settings: SceneSettings,
) {
  return shouldRenderTerrainVisualChunksCore(levelId, settings)
}

export function classifyTerrainAuthority(
  input:
    | {
        level?: TerrainAuthorityInputLevel | null
        manifest?: unknown
        manifestUrl?: string | null
        enforceFinalAuthority?: boolean | null
      }
    | TerrainAuthorityInputLevel
    | null
    | undefined,
) {
  return classifyTerrainAuthorityCore(input)
}

export function getTerrainAuthorityDiagnostics(
  input:
    | {
        level?: TerrainAuthorityInputLevel | null
        manifest?: unknown
        manifestUrl?: string | null
        enforceFinalAuthority?: boolean | null
      }
    | TerrainAuthorityInputLevel
    | null
    | undefined,
) {
  return getTerrainAuthorityDiagnosticsCore(input)
}

export function validateLevelGroundContract(
  level: LevelDefinition,
  actorsById: Map<string, ActorDefinition>,
) {
  return validateLevelGroundContractCore(level, actorsById)
}
