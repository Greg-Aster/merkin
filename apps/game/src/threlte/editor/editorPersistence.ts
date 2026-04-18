import type { EditorSceneDocument } from './editorTypes'

const SCENE_STORAGE_PREFIX = 'megameal.editor.scene:'

export function saveEditorSceneToLocalStorage(levelId: string, scene: EditorSceneDocument) {
  const payload: EditorSceneDocument = {
    ...scene,
    levelId,
    updatedAt: new Date().toISOString(),
  }

  localStorage.setItem(`${SCENE_STORAGE_PREFIX}${levelId}`, JSON.stringify(payload))
  return payload
}

export function loadEditorSceneFromLocalStorage(levelId: string) {
  const raw = localStorage.getItem(`${SCENE_STORAGE_PREFIX}${levelId}`)
  if (!raw) return null

  try {
    return JSON.parse(raw) as EditorSceneDocument
  } catch (error) {
    console.error('❌ Failed to parse stored editor scene:', error)
    return null
  }
}

export function exportEditorSceneJson(scene: EditorSceneDocument | null) {
  return JSON.stringify(scene, null, 2)
}

export function importEditorSceneJson(json: string) {
  return JSON.parse(json) as EditorSceneDocument
}
