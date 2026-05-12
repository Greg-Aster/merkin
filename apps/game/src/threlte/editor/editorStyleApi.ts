import { EDITOR_API_BASE } from '@config/editorApi'
import type { EditorJsonReader } from './editorHunyuanApi'

export interface StyleWorkspaceRequest {
  assetUrl: string
  sourceName: string
  styleProfileName: string
  prompt: string
  negativePrompt: string
  loraNotes: string
  controlNetNotes: string
  referenceImageUrl: string
  comfyUiApiUrl: string
  hunyuanApiUrl: string
  generateReferenceIfMissing?: boolean
}

export interface StyleSimplifyRequest {
  assetUrl: string
  outputName: string
  ratio: number
  error: number
  lockBorder?: boolean
}

export interface BlenderExportRequest {
  assetUrl: string
  exportName: string
  referenceImageUrl: string
  openInBlender?: boolean
}

export interface BlenderReimportRequest {
  sourceAssetUrl: string
  exportPath: string
  nodeName: string
}

export async function inspectStyleAsset(
  assetUrl: string,
  readJsonPayload: EditorJsonReader,
  context: string,
) {
  const response = await fetch(
    `${EDITOR_API_BASE}/api/style/inspect?assetUrl=${encodeURIComponent(assetUrl)}`,
  )
  return readJsonPayload(response, context)
}

export async function fetchLatestStyleWorkspace(
  assetUrl: string,
  readJsonPayload: EditorJsonReader,
) {
  const response = await fetch(
    `${EDITOR_API_BASE}/api/style/workspace/latest?assetUrl=${encodeURIComponent(assetUrl)}`,
  )
  return readJsonPayload(response, 'Latest style workspace lookup')
}

export async function packageStyleWorkspace(
  request: StyleWorkspaceRequest,
  readJsonPayload: EditorJsonReader,
) {
  const response = await fetch(`${EDITOR_API_BASE}/api/style/workspace`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })
  return readJsonPayload(response, 'Style workspace packaging')
}

export async function simplifyStyleAsset(
  request: StyleSimplifyRequest,
  readJsonPayload: EditorJsonReader,
) {
  const response = await fetch(`${EDITOR_API_BASE}/api/style/simplify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })
  return readJsonPayload(response, 'Style simplify')
}

export async function exportStyleAssetForBlender(
  request: BlenderExportRequest,
  readJsonPayload: EditorJsonReader,
) {
  const response = await fetch(`${EDITOR_API_BASE}/api/style/export-blender`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })
  return readJsonPayload(response, 'Blender export packaging')
}

export async function reimportStyleAssetFromBlender(
  request: BlenderReimportRequest,
  readJsonPayload: EditorJsonReader,
) {
  const response = await fetch(
    `${EDITOR_API_BASE}/api/style/reimport-blender`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    },
  )
  return readJsonPayload(response, 'Blender reimport packaging')
}
