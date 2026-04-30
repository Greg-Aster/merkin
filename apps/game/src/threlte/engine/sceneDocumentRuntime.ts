import type { EditorSceneDocument } from '../editor/editorTypes'
import { adaptEditorSceneToLevelDefinition } from './sceneAdapter'
import type { LevelDefinition } from './types'

export interface EditorSceneEngineData {
  levelDefinition: LevelDefinition
}

export function createEditorSceneEngineData(
  scene: EditorSceneDocument,
): EditorSceneEngineData {
  return {
    levelDefinition: adaptEditorSceneToLevelDefinition(scene),
  }
}

export function withEditorSceneEngineData(
  scene: EditorSceneDocument,
): EditorSceneDocument {
  return {
    ...scene,
    engine: createEditorSceneEngineData(scene),
  }
}
