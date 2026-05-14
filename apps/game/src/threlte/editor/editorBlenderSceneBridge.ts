import { EDITOR_API_BASE } from '@config/editorApi'
import type { EditorSceneDocument } from './editorTypes'

export interface BlenderSceneExportPayload {
  success: boolean
  message?: string
  levelId?: string
  packageDirectory?: string
  packagePath?: string
  sourceScenePath?: string
  nodeCount?: number
  assetCount?: number
  warnings?: Array<{ nodeId: string; message: string }>
}

export interface BlenderSceneImportPayload {
  success: boolean
  message?: string
  scene?: EditorSceneDocument
  updatedCount?: number
  unknownNodeIds?: string[]
}

async function readJsonPayload<T>(response: Response, context: string) {
  const payload = (await response.json().catch(() => null)) as T | null
  if (
    !response.ok ||
    !payload ||
    (payload as { success?: boolean }).success === false
  ) {
    const payloadMessage =
      payload && typeof (payload as { message?: unknown }).message === 'string'
        ? String((payload as { message?: unknown }).message)
        : ''
    const message = payloadMessage || `${context} failed`
    throw new Error(message)
  }
  return payload
}

export async function exportBlenderScenePackage(
  levelId: string,
  scene: EditorSceneDocument,
) {
  const response = await fetch(
    `${EDITOR_API_BASE}/api/editor-scene/blender-export`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ levelId, scene }),
    },
  )
  return readJsonPayload<BlenderSceneExportPayload>(
    response,
    'Blender scene export',
  )
}

export async function importBlenderSceneDelta(
  scene: EditorSceneDocument,
  delta: unknown,
) {
  const response = await fetch(
    `${EDITOR_API_BASE}/api/editor-scene/blender-import-delta`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scene, delta }),
    },
  )
  return readJsonPayload<BlenderSceneImportPayload>(
    response,
    'Blender scene import',
  )
}
