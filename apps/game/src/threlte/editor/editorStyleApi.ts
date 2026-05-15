import { EDITOR_API_BASE } from '@config/editorApi'
import type { EditorJsonReader } from './editorHunyuanApi'
import type {
  StyleBakeFingerprint,
  StyleBakeMode,
  StyleBakeSettings,
  StyleBakeTransformSnapshot,
  StyleBakeVisualBounds,
} from './editorStyleBakeTypes'

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
  comfyUiLowVramMode?: boolean
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

export interface ProceduralStyleBakeRequest {
  assetUrl: string
  outputName: string
  mode?: 'procedural-material' | 'blender-geometry'
  nodeId?: string
  levelId?: string
  sourceAssetFingerprint?: StyleBakeFingerprint
  sourceNodeTransform?: StyleBakeTransformSnapshot
  sourceLocalBounds?: StyleBakeVisualBounds | null
  bakeMode?: StyleBakeMode
  styleProfileName: string
  prompt: string
  textureSize?: number
  settings?: StyleBakeSettings
  settingsFingerprint?: StyleBakeFingerprint
  cacheKey?: string
  generatorName?: string
  generatorVersion?: string
  lineStrength?: number
  brushStrength?: number
  aoStrength?: number
  cavityStrength?: number
  curvatureStrength?: number
  geometrySimplification?: number
  outputTier?: 'preview' | 'runtime' | 'hero'
  force?: boolean
}

export type StyleBakeBackend = 'procedural-material' | 'blender-geometry'

export interface BlenderGeometryStyleBakeRequest
  extends ProceduralStyleBakeRequest {
  profileId?: string
  aoStrength?: number
  cavityStrength?: number
  curvatureStrength?: number
  geometrySimplification?: number
  outputTier?: 'preview' | 'runtime' | 'hero'
  bevelCleanup?: boolean
  weightedNormalCleanup?: boolean
  lineGeometry?: boolean
}

export type StyleBakeAssetRequest =
  | (ProceduralStyleBakeRequest & { mode?: 'procedural-material' })
  | (BlenderGeometryStyleBakeRequest & { mode: 'blender-geometry' })

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

export async function fingerprintStyleAsset(
  assetUrl: string,
  readJsonPayload: EditorJsonReader,
) {
  const response = await fetch(
    `${EDITOR_API_BASE}/api/style/fingerprint?assetUrl=${encodeURIComponent(assetUrl)}`,
  )
  return readJsonPayload(response, 'Style source fingerprint')
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

export async function bakeProceduralStyleAsset(
  request: ProceduralStyleBakeRequest,
  readJsonPayload: EditorJsonReader,
) {
  const response = await fetch(`${EDITOR_API_BASE}/api/style/bake-procedural`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })
  return readJsonPayload(response, 'Procedural style bake')
}

export async function bakeBlenderGeometryStyleAsset(
  request: BlenderGeometryStyleBakeRequest,
  readJsonPayload: EditorJsonReader,
) {
  const response = await fetch(`${EDITOR_API_BASE}/api/style/bake-blender`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })
  return readJsonPayload(response, 'Blender geometry style bake')
}

export async function bakeStyleAsset(
  request: StyleBakeAssetRequest,
  readJsonPayload: EditorJsonReader,
) {
  if (request.mode === 'blender-geometry') {
    return bakeBlenderGeometryStyleAsset(request, readJsonPayload)
  }

  return bakeProceduralStyleAsset(request, readJsonPayload)
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
