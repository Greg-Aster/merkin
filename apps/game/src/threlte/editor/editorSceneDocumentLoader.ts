import { EDITOR_API_BASE } from '@config/editorApi'
import { createDefaultSceneForLevel } from './defaultScenes'
import { createEmptyScene } from './editorDocumentStore'
import { loadEditorSceneFromLocalStorage } from './editorPersistence'
import type { EditorSceneDocument } from './editorTypes'

const sceneModules = import.meta.glob('./scenes/*.scene.json', {
  eager: true,
  import: 'default',
}) as Record<string, EditorSceneDocument>

export type EditorSceneDocumentSource =
  | 'disk'
  | 'local-storage'
  | 'packaged'
  | 'default'

export interface EditorSceneDocumentLoadOptions {
  includeDisk?: boolean
  includeLocalStorage?: boolean
  includePackaged?: boolean
  includeDefault?: boolean
  preferLocalStorage?: boolean
}

export interface EditorSceneDocumentLoadResult {
  scene: EditorSceneDocument
  source: EditorSceneDocumentSource
}

function cloneScene(scene: EditorSceneDocument) {
  return structuredClone(scene) as EditorSceneDocument
}

export function hasMeaningfulSceneContent(
  scene: EditorSceneDocument | null | undefined,
) {
  if (!scene) return false

  if (Array.isArray(scene.nodes) && scene.nodes.length > 0) {
    return true
  }

  if (scene.settings && Object.keys(scene.settings).length > 0) {
    return true
  }

  return false
}

export function getPackagedEditorScene(levelId: string) {
  const match = Object.entries(sceneModules).find(([path]) =>
    path.endsWith(`/${levelId}.scene.json`),
  )
  return match ? cloneScene(match[1]) : null
}

export async function fetchDiskEditorScene(levelId: string) {
  if (!import.meta.env.DEV) return null

  const response = await fetch(
    `${EDITOR_API_BASE}/api/editor-scene/load?levelId=${encodeURIComponent(levelId)}`,
  )
  if (!response.ok) return null

  const payload = await response.json()
  return payload?.success && payload.scene
    ? (payload.scene as EditorSceneDocument)
    : null
}

function getLocalEditorScene(levelId: string) {
  if (typeof localStorage === 'undefined') return null
  return loadEditorSceneFromLocalStorage(levelId)
}

export function loadImmediateEditorSceneDocument(
  levelId: string,
  options: EditorSceneDocumentLoadOptions = {},
): EditorSceneDocumentLoadResult {
  const includeLocalStorage = options.includeLocalStorage ?? false
  const includePackaged = options.includePackaged ?? true
  const includeDefault = options.includeDefault ?? true
  const preferLocalStorage = options.preferLocalStorage ?? false

  const loadedLocalScene = includeLocalStorage
    ? getLocalEditorScene(levelId)
    : null
  const localScene = loadedLocalScene
    ? ({
        scene: loadedLocalScene,
        source: 'local-storage',
      } satisfies EditorSceneDocumentLoadResult)
    : null
  const packagedScene = includePackaged ? getPackagedEditorScene(levelId) : null
  const packagedResult =
    packagedScene && hasMeaningfulSceneContent(packagedScene)
      ? ({
          scene: packagedScene,
          source: 'packaged',
        } satisfies EditorSceneDocumentLoadResult)
      : null
  const fallbackScene =
    createDefaultSceneForLevel(levelId) ?? createEmptyScene(levelId)
  const defaultResult = includeDefault
    ? ({
        scene: fallbackScene,
        source: 'default',
      } satisfies EditorSceneDocumentLoadResult)
    : null

  if (preferLocalStorage) {
    return (
      localScene ??
      packagedResult ??
      defaultResult ?? {
        scene: createEmptyScene(levelId),
        source: 'default',
      }
    )
  }

  return (
    packagedResult ??
    localScene ??
    defaultResult ?? {
      scene: createEmptyScene(levelId),
      source: 'default',
    }
  )
}

export async function loadEditorSceneDocument(
  levelId: string,
  options: EditorSceneDocumentLoadOptions = {},
): Promise<EditorSceneDocumentLoadResult> {
  const includeDisk = options.includeDisk ?? true
  const immediate = loadImmediateEditorSceneDocument(levelId, options)

  if (!includeDisk) return immediate

  let diskScene: EditorSceneDocument | null = null
  try {
    diskScene = await fetchDiskEditorScene(levelId)
  } catch {
    diskScene = null
  }
  const diskResult =
    diskScene && hasMeaningfulSceneContent(diskScene)
      ? ({
          scene: diskScene,
          source: 'disk',
        } satisfies EditorSceneDocumentLoadResult)
      : null

  return diskResult ?? immediate
}
