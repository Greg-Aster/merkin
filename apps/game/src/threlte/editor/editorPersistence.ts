import { withEditorSceneEngineData } from '../engine/sceneDocumentRuntime'
import { assertValidEditorSceneDocument } from './editorSceneDocumentValidation'
import type { EditorSceneDocument } from './editorTypes'

const SCENE_STORAGE_PREFIX = 'megameal.editor.scene:'
const STYLE_BATCH_STORAGE_PREFIX = 'megameal.editor.style-batch:'

export interface PersistedStyleBatchEntry {
  nodeId: string
  nodeName: string
  descriptor: string
  mode: 'texture' | 'generate'
  sourceName: string
  sourceAssetUrl?: string
  workspaceReferenceImageUrl?: string
  jobId?: string
  status:
    | 'pending'
    | 'queued'
    | 'running'
    | 'succeeded'
    | 'applied'
    | 'failed'
    | 'cancelled'
  outputAssetUrl?: string
  error?: string
}

export interface PersistedStyleBatchSession {
  levelId: string
  mode: 'texture' | 'generate'
  createdAt: string
  updatedAt: string
  styleProfileName: string
  stylePrompt: string
  styleNegativePrompt: string
  styleLoraNotes: string
  styleControlNetNotes: string
  styleReferenceImageUrl: string
  comfyUiApiUrl: string
  hunyuanApiUrl: string
  workflowPath: string
  entries: PersistedStyleBatchEntry[]
}

export function stripEditorSceneRuntimeData(scene: EditorSceneDocument) {
  const { engine: _engine, ...authoringScene } = scene
  return authoringScene as EditorSceneDocument
}

export function saveEditorSceneToLocalStorage(
  levelId: string,
  scene: EditorSceneDocument,
) {
  const authoringScene = stripEditorSceneRuntimeData({
    ...scene,
    levelId,
    updatedAt: new Date().toISOString(),
  })
  const payload: EditorSceneDocument = assertValidEditorSceneDocument(
    withEditorSceneEngineData(authoringScene),
    'Scene save',
  )

  localStorage.setItem(
    `${SCENE_STORAGE_PREFIX}${levelId}`,
    JSON.stringify(stripEditorSceneRuntimeData(payload)),
  )
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

export function saveStyleBatchSessionToLocalStorage(
  levelId: string,
  session: PersistedStyleBatchSession,
) {
  const payload: PersistedStyleBatchSession = {
    ...session,
    levelId,
    updatedAt: new Date().toISOString(),
  }

  localStorage.setItem(
    `${STYLE_BATCH_STORAGE_PREFIX}${levelId}`,
    JSON.stringify(payload),
  )
  return payload
}

export function loadStyleBatchSessionFromLocalStorage(levelId: string) {
  const raw = localStorage.getItem(`${STYLE_BATCH_STORAGE_PREFIX}${levelId}`)
  if (!raw) return null

  try {
    return JSON.parse(raw) as PersistedStyleBatchSession
  } catch (error) {
    console.error('❌ Failed to parse stored style batch session:', error)
    return null
  }
}

export function clearStyleBatchSessionFromLocalStorage(levelId: string) {
  localStorage.removeItem(`${STYLE_BATCH_STORAGE_PREFIX}${levelId}`)
}

export function clearAllStyleBatchSessionsFromLocalStorage() {
  const keysToRemove: string[] = []

  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index)
    if (!key || !key.startsWith(STYLE_BATCH_STORAGE_PREFIX)) continue
    keysToRemove.push(key)
  }

  for (const key of keysToRemove) {
    localStorage.removeItem(key)
  }
}

export function exportEditorSceneJson(scene: EditorSceneDocument | null) {
  return JSON.stringify(
    scene
      ? stripEditorSceneRuntimeData(
          assertValidEditorSceneDocument(scene, 'Scene export'),
        )
      : null,
    null,
    2,
  )
}

export function importEditorSceneJson(json: string) {
  return assertValidEditorSceneDocument(JSON.parse(json), 'Scene import')
}
