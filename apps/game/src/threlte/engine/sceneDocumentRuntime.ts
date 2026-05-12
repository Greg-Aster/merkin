import { adaptSceneDocumentToLevelDefinition } from './sceneAdapter'
import type { SceneDocument } from './sceneDocumentTypes'
import type { LevelDefinition } from './types'

export interface SceneEngineData {
  levelDefinition: LevelDefinition
}

export function createSceneEngineData(scene: SceneDocument): SceneEngineData {
  return {
    levelDefinition: adaptSceneDocumentToLevelDefinition(scene),
  }
}

export function withSceneEngineData(scene: SceneDocument): SceneDocument {
  return {
    ...scene,
    engine: createSceneEngineData(scene),
  }
}

export type EditorSceneEngineData = SceneEngineData
export const createEditorSceneEngineData = createSceneEngineData
export const withEditorSceneEngineData = withSceneEngineData
