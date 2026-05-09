import type {
  SharedLevelGroundSettings,
  SceneSettings,
} from './sceneDocumentTypes'
import type { ActorDefinition, LevelDefinition } from './types'
import {
  getLevelGroundContract as getLevelGroundContractCore,
  getRuntimeGroundContract as getRuntimeGroundContractCore,
  hasAuthoredGroundVisuals as hasAuthoredGroundVisualsCore,
  shouldRenderTerrainVisualChunks as shouldRenderTerrainVisualChunksCore,
  validateLevelGroundContract as validateLevelGroundContractCore,
} from './groundContractCore.mjs'

export type LevelGroundContract = NonNullable<SharedLevelGroundSettings['ground']>

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

export function shouldRenderTerrainVisualChunks(levelId: string, settings: SceneSettings) {
  return shouldRenderTerrainVisualChunksCore(levelId, settings)
}

export function validateLevelGroundContract(
  level: LevelDefinition,
  actorsById: Map<string, ActorDefinition>,
) {
  return validateLevelGroundContractCore(level, actorsById)
}
