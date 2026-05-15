import fs from 'node:fs'
import path from 'node:path'
import { Readable, Writable } from 'node:stream'
import { fileURLToPath } from 'node:url'
import { exportSceneNodeToGlb, getPrefabAssetUrl } from '../src/threlte/editor/editorBakeSource'
import { applyGeneratedAssetToNode } from '../src/threlte/editor/editorGeneratedAssetApplication'
import {
  inferNodeGenerationDescriptor,
  EDITOR_PREFAB_GENERATION_LABELS,
} from '../src/threlte/editor/editorGeneration'
import {
  getCuratedStyleBatchCandidateIds,
  levelStyleBatchPresets,
} from '../src/threlte/editor/editorStyleBatchSelection'
import type { EditorSceneDocument, EditorSceneNode } from '../src/threlte/editor/editorTypes'

type JsonValue = Record<string, any>
type Vector3Tuple = [number, number, number]

const SCRIPT_PATH = fileURLToPath(import.meta.url)
const GAME_APP_ROOT = path.resolve(path.dirname(SCRIPT_PATH), '..')
const REPO_ROOT = path.resolve(GAME_APP_ROOT, '..', '..')
const PUBLIC_ROOT = path.join(REPO_ROOT, 'apps', 'megameal', 'public')
const SCENE_PATH = path.join(
  GAME_APP_ROOT,
  'src',
  'threlte',
  'editor',
  'scenes',
  'yggdrasil.scene.json',
)
const BACKUP_ROOT = path.join(
  GAME_APP_ROOT,
  'authoring',
  'scene-backups',
  'yggdrasil',
)
const RUN_LOG_ROOT = path.join(
  GAME_APP_ROOT,
  'authoring',
  'style-batch-runs',
)
const GENERATED_HUNYUAN_ROOT = path.join(
  PUBLIC_ROOT,
  'generated',
  'hunyuan3d',
)
const DEFAULT_COMFY_WORKFLOW_PATH =
  'apps/game/authoring/workflows/ref-image/Hunyaun example.json'
const DEFAULT_HUNYUAN_API_URL = 'http://127.0.0.1:8080'
const DEFAULT_COMFYUI_API_URL = 'http://127.0.0.1:8188'

class NodeFileReader {
  result: ArrayBuffer | string | null = null
  onloadend: (() => void) | null = null

  readAsArrayBuffer(blob: Blob) {
    void blob.arrayBuffer().then(buffer => {
      this.result = buffer
      setTimeout(() => this.onloadend?.(), 0)
    })
  }

  readAsDataURL(blob: Blob) {
    void blob.arrayBuffer().then(buffer => {
      this.result = `data:${blob.type};base64,${Buffer.from(buffer).toString('base64')}`
      setTimeout(() => this.onloadend?.(), 0)
    })
  }
}

if (!(globalThis as any).FileReader) {
  ;(globalThis as any).FileReader = NodeFileReader
}

const serverModule = await import('./editor-tools/server.cjs')
const { handleEditorToolsRequest } = serverModule.default ?? serverModule

class JsonDispatchRequest extends Readable {
  sent = false

  constructor(
    public url: string,
    public method = 'GET',
    private payload: JsonValue | null = null,
  ) {
    super()
  }

  _read() {
    if (this.sent) {
      this.push(null)
      return
    }

    this.sent = true
    if (this.payload) {
      this.push(Buffer.from(JSON.stringify(this.payload), 'utf8'))
      return
    }
    this.push(null)
  }
}

class JsonDispatchResponse extends Writable {
  headers: Record<string, string> = {}
  statusCode = 200
  body = ''

  constructor(
    private resolve: (value: {
      ok: boolean
      status: number
      body: string
      json: () => any
    }) => void,
  ) {
    super()
  }

  setHeader(name: string, value: string) {
    this.headers[name.toLowerCase()] = value
  }

  writeHead(status: number, headers: Record<string, string> = {}) {
    this.statusCode = status
    for (const [name, value] of Object.entries(headers)) {
      this.setHeader(name, value)
    }
  }

  end(chunk = '') {
    if (chunk) this.body += chunk.toString()
    this.resolve({
      ok: this.statusCode >= 200 && this.statusCode < 300,
      status: this.statusCode,
      body: this.body,
      json: () => {
        try {
          return JSON.parse(this.body || 'null')
        } catch {
          return null
        }
      },
    })
  }

  _write(chunk: Buffer, _encoding: BufferEncoding, callback: () => void) {
    this.body += chunk.toString()
    callback()
  }
}

async function dispatchEditorToolsJsonRequest(
  route: string,
  payload?: JsonValue,
) {
  return await new Promise<{
    ok: boolean
    status: number
    body: string
    json: () => any
  }>((resolve, reject) => {
    const req = new JsonDispatchRequest(
      route,
      payload ? 'POST' : 'GET',
      payload ?? null,
    )
    const res = new JsonDispatchResponse(resolve)
    req.on('error', reject)
    res.on('error', reject)
    Promise.resolve(handleEditorToolsRequest(req, res)).catch(reject)
  })
}

function readJsonFile<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''))
}

function writeJsonFile(filePath: string, payload: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
}

function timestampKey() {
  return new Date().toISOString().replace(/[:.]/g, '-')
}

function toPublicAssetUrl(fullPath: string) {
  return `/${path.relative(PUBLIC_ROOT, fullPath).replace(/\\/g, '/')}`
}

function slugify(value = 'asset') {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'asset'
  )
}

function normalizeGeneratedAssetName(value = 'asset') {
  const normalized = String(value || 'asset')
    .replace(/\.(glb|gltf|png|jpe?g|webp)$/i, '')
    .replace(
      /(?:-reference-\d{4}-\d{2}-\d{2}t?\d{2}[-:.]\d{2}[-:.]\d{2}[-:.]\d{3}z?)+/gi,
      '',
    )
    .replace(
      /(?:-(?:generated|texture-wrap|replacement-mesh)-\d{4}-\d{2}-\d{2}t?\d{2}[-:.]\d{2}[-:.]\d{2}[-:.]\d{3}z?)+/gi,
      '',
    )
    .replace(/(?:_\d+_)+$/g, '')
    .replace(/-+$/g, '')
    .trim()

  return normalized || 'asset'
}

function buildSafeAssetSlug(value = 'asset', maxLength = 80) {
  const normalized = slugify(normalizeGeneratedAssetName(value || 'asset'))
  if (normalized.length <= maxLength) return normalized || 'asset'
  return normalized.slice(0, maxLength).replace(/-+$/g, '') || 'asset'
}

function parseArgs(argv: string[]) {
  const flags = new Map<string, string | true>()
  const nodeIds: string[] = []

  for (const arg of argv) {
    if (arg.startsWith('--node=')) {
      nodeIds.push(arg.slice('--node='.length))
      continue
    }
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=', 2)
      flags.set(key, value ?? true)
    }
  }

  return {
    write: flags.has('write'),
    noReuseExisting: flags.has('no-reuse-existing'),
    generateMissing: flags.has('generate-missing'),
    applyToScene: flags.has('apply'),
    force: flags.has('force'),
    apiUrl: String(flags.get('api-url') || DEFAULT_HUNYUAN_API_URL),
    comfyUiApiUrl: String(
      flags.get('comfy-ui-api-url') || DEFAULT_COMFYUI_API_URL,
    ),
    workflowPath: String(
      flags.get('workflow') || DEFAULT_COMFY_WORKFLOW_PATH,
    ),
    presetId: String(flags.get('preset') || 'yggdrasil-abyssal-neon'),
    limit: Number(flags.get('limit') || 0),
    nodeIds,
  }
}

function isGeneratedHunyuanNode(node: EditorSceneNode) {
  return !!node.asset?.url?.includes('/generated/hunyuan3d/')
}

function isCuratedCandidate(node: EditorSceneNode) {
  if (node.generation?.styleBatch === 'exclude') return false
  if (node.gameplay) return false
  if (node.prefab?.type === 'story-marker') return false
  if (node.prefab?.type === 'portal-apparatus') return false
  if (node.prefab?.type === 'observation-rig') return false
  return true
}

function getAiSourceName(node: EditorSceneNode) {
  if (node.asset) return node.name
  if (node.prefab?.type) {
    return EDITOR_PREFAB_GENERATION_LABELS[node.prefab.type] ?? node.name
  }
  return node.name
}

function buildNodeStylePrompt(
  node: EditorSceneNode,
  styleProfileName: string,
  stylePrompt: string,
) {
  const descriptor = inferNodeGenerationDescriptor(node)
  return [
    descriptor ? `object: ${descriptor}` : '',
    'preserve the object identity and overall silhouette; do not turn it into a different object class',
    styleProfileName.trim() ? `style family: ${styleProfileName.trim()}` : '',
    stylePrompt.trim() ? `style treatment: ${stylePrompt.trim()}` : '',
  ]
    .filter(segment => segment.trim().length > 0)
    .join('. ')
}

function primitiveVisualSize(node: EditorSceneNode) {
  if (!node.primitive) return null
  const [sx, sy, sz] = node.scale
  const args = node.primitive.args
  switch (node.primitive.geometry) {
    case 'box': {
      const [width = 1, height = 1, depth = 1] = args
      return [
        Math.abs(width * sx),
        Math.abs(height * sy),
        Math.abs(depth * sz),
      ] as Vector3Tuple
    }
    case 'cylinder': {
      const [radiusTop = 0.5, radiusBottom = 0.5, height = 1] = args
      const radius = Math.max(Math.abs(radiusTop), Math.abs(radiusBottom))
      return [
        Math.abs(radius * 2 * sx),
        Math.abs(height * sy),
        Math.abs(radius * 2 * sz),
      ] as Vector3Tuple
    }
    case 'torus': {
      const [radius = 0.5, tube = 0.2] = args
      const outer = (Math.abs(radius) + Math.abs(tube)) * 2
      return [
        Math.abs(outer * sx),
        Math.abs(tube * 2 * sy),
        Math.abs(outer * sz),
      ] as Vector3Tuple
    }
    case 'octahedron':
    case 'tetrahedron':
    case 'icosahedron':
    case 'dodecahedron': {
      const [radius = 0.5] = args
      return [
        Math.abs(radius * 2 * sx),
        Math.abs(radius * 2 * sy),
        Math.abs(radius * 2 * sz),
      ] as Vector3Tuple
    }
    default:
      return null
  }
}

async function readJsonPayload(response: Awaited<ReturnType<typeof dispatchEditorToolsJsonRequest>>, context: string) {
  const payload = response.json()
  if (!response.ok) {
    throw new Error(
      payload?.message ||
        `${context} failed with status ${response.status}: ${response.body}`,
    )
  }
  return payload
}

async function inspectAssetBounds(assetUrl: string) {
  const response = await dispatchEditorToolsJsonRequest(
    `/api/style/inspect?assetUrl=${encodeURIComponent(assetUrl)}`,
  )
  const payload = await readJsonPayload(response, 'Style inspect')
  if (!payload?.success) return null
  const bounds = payload.analysis?.bounds
  if (
    Array.isArray(bounds?.size) &&
    bounds.size.length === 3 &&
    Number.isFinite(Number(bounds.maxDimension))
  ) {
    return {
      size: bounds.size.map((value: number) => Math.abs(Number(value))) as Vector3Tuple,
      maxDimension: Math.abs(Number(bounds.maxDimension)),
    }
  }
  return null
}

async function getSceneNodeVisualBounds(
  node: EditorSceneNode,
  sourceAssetUrl = '',
) {
  const localScale = node.scale.map(value => Math.abs(value)) as Vector3Tuple
  const prefabAssetUrl = getPrefabAssetUrl(
    node.prefab?.type,
    node.prefab?.variant,
  )
  const sourceBounds = sourceAssetUrl
    ? await inspectAssetBounds(sourceAssetUrl)
    : null

  if (sourceBounds?.size?.length === 3) {
    const sourceMatchesExistingAsset = !!(
      (node.asset?.url && sourceAssetUrl === node.asset.url) ||
      (prefabAssetUrl && sourceAssetUrl === prefabAssetUrl)
    )
    const size = sourceMatchesExistingAsset
      ? ([
          sourceBounds.size[0] * localScale[0],
          sourceBounds.size[1] * localScale[1],
          sourceBounds.size[2] * localScale[2],
        ] as Vector3Tuple)
      : sourceBounds.size
    return { size, maxDimension: Math.max(...size) }
  }

  if (node.generation?.sourceVisualSize?.length === 3) {
    const size = node.generation.sourceVisualSize as Vector3Tuple
    return {
      size,
      maxDimension: Math.max(...size.map(value => Math.abs(value))),
    }
  }

  const primitiveSize = primitiveVisualSize(node)
  if (primitiveSize) {
    return {
      size: primitiveSize,
      maxDimension: Math.max(...primitiveSize),
    }
  }

  return { size: localScale, maxDimension: Math.max(...localScale) }
}

function patchNode(scene: EditorSceneDocument, nodeId: string, patch: JsonValue) {
  const index = scene.nodes.findIndex(node => node.id === nodeId)
  if (index === -1) throw new Error(`Node not found: ${nodeId}`)
  scene.nodes[index] = {
    ...scene.nodes[index],
    ...patch,
  }
}

function getNodeTransformSnapshot(node: EditorSceneNode | null) {
  if (!node) return null
  return {
    position: [...node.position] as Vector3Tuple,
    rotation: [...node.rotation] as Vector3Tuple,
    scale: [...node.scale] as Vector3Tuple,
  }
}

function candidateSlugs(node: EditorSceneNode) {
  const sourceName = getAiSourceName(node)
  const descriptor = inferNodeGenerationDescriptor(node)
  const withoutLevel = node.id.replace(/^yggdrasil-/, '')
  return Array.from(
    new Set(
      [
        node.name,
        sourceName,
        withoutLevel,
        node.id,
        descriptor,
      ]
        .filter(Boolean)
        .map(value => buildSafeAssetSlug(String(value))),
    ),
  )
}

function latestGeneratedAssetForSlug(slug: string) {
  const directory = path.join(GENERATED_HUNYUAN_ROOT, slug)
  if (!fs.existsSync(directory) || !fs.statSync(directory).isDirectory()) {
    return null
  }

  const candidates = fs
    .readdirSync(directory)
    .filter(file => file.toLowerCase().endsWith('.glb'))
    .filter(file => /(?:generated|replacement-mesh)/i.test(file))
    .map(file => path.join(directory, file))
    .filter(filePath => fs.existsSync(filePath))
    .sort(
      (left, right) =>
        getGeneratedAssetSortKey(right).localeCompare(
          getGeneratedAssetSortKey(left),
        ) || fs.statSync(right).mtimeMs - fs.statSync(left).mtimeMs,
    )

  return candidates[0] ? toPublicAssetUrl(candidates[0]) : null
}

function getGeneratedAssetSortKey(filePath: string) {
  const file = path.basename(filePath)
  const match = file.match(
    /(\d{4})-(\d{2})-(\d{2})T(\d{2})[-:](\d{2})[-:](\d{2})[-:](\d{3})Z/i,
  )
  if (!match) return file
  return match.slice(1).join('')
}

function findExistingGeneratedAsset(node: EditorSceneNode) {
  for (const slug of candidateSlugs(node)) {
    const assetUrl = latestGeneratedAssetForSlug(slug)
    if (assetUrl) return assetUrl
  }
  return null
}

function groupKey(node: EditorSceneNode) {
  const descriptor = buildSafeAssetSlug(inferNodeGenerationDescriptor(node), 120)
  if (node.prefab) {
    return `prefab:${node.prefab.type}:${node.prefab.variant ?? ''}:${descriptor}`
  }
  if (node.primitive) {
    return `primitive:${node.primitive.geometry}:${descriptor}`
  }
  if (node.asset?.url) {
    return `asset:${buildSafeAssetSlug(node.name)}:${descriptor}`
  }
  return `node:${node.id}`
}

async function ensureSceneNodeSourceAsset(node: EditorSceneNode) {
  if (node.asset?.url) {
    return {
      assetUrl: node.asset.url,
      sourceName: getAiSourceName(node),
    }
  }

  const prefabAssetUrl = getPrefabAssetUrl(
    node.prefab?.type,
    node.prefab?.variant,
  )
  if (prefabAssetUrl) {
    return {
      assetUrl: prefabAssetUrl,
      sourceName: getAiSourceName(node),
    }
  }

  const exported = await exportSceneNodeToGlb(node)
  if (exported.kind === 'asset') {
    return {
      assetUrl: exported.assetUrl,
      sourceName: getAiSourceName(node),
    }
  }

  const glbBase64 = Buffer.from(await exported.blob.arrayBuffer()).toString(
    'base64',
  )
  const response = await dispatchEditorToolsJsonRequest('/api/style/source-asset', {
    fileName: exported.fileName,
    glbBase64,
    sourceName: getAiSourceName(node),
    sourceKind: exported.kind,
    descriptor: inferNodeGenerationDescriptor(node),
    levelId: 'yggdrasil',
    nodeId: node.id,
  })
  const payload = await readJsonPayload(response, 'Style source asset staging')
  if (!payload?.success || !payload.assetUrl) {
    throw new Error(
      payload?.message || `Could not stage a source mesh for ${node.name}.`,
    )
  }

  return {
    assetUrl: payload.assetUrl as string,
    sourceName: getAiSourceName(node),
  }
}

async function packageStyleWorkspace(input: {
  node: EditorSceneNode
  sourceAssetUrl: string
  prompt: string
  preset: NonNullable<(typeof levelStyleBatchPresets)[number]>
  apiUrl: string
  comfyUiApiUrl: string
}) {
  const response = await dispatchEditorToolsJsonRequest('/api/style/workspace', {
    assetUrl: input.sourceAssetUrl,
    sourceName: input.node.name,
    styleProfileName: input.preset.label,
    prompt: input.prompt,
    negativePrompt: input.preset.negativePrompt,
    loraNotes: input.preset.loraNotes,
    controlNetNotes: input.preset.controlNetNotes,
    referenceImageUrl: '',
    comfyUiApiUrl: input.comfyUiApiUrl,
    hunyuanApiUrl: input.apiUrl,
    generateReferenceIfMissing: true,
  })
  const payload = await readJsonPayload(response, 'Style workspace package')
  if (!payload?.success) {
    throw new Error(payload?.message || `Could not package ${input.node.name}.`)
  }
  return payload
}

async function runHunyuanReimagine(input: {
  node: EditorSceneNode
  sourceAssetUrl: string
  sourceName: string
  prompt: string
  referenceImageUrl: string
  apiUrl: string
  comfyUiApiUrl: string
  workflowPath: string
}) {
  const response = await dispatchEditorToolsJsonRequest('/api/hunyuan3d/run', {
    apiUrl: input.apiUrl,
    comfyUiApiUrl: input.comfyUiApiUrl,
    assetUrl: input.sourceAssetUrl,
    sourceName: input.sourceName,
    mode: 'generate',
    prompt: input.prompt,
    referenceImageUrl: input.referenceImageUrl,
    workflowPath: input.workflowPath,
  })
  const payload = await readJsonPayload(response, 'Hunyuan reimagine')
  if (!payload?.success || !payload.assetUrl) {
    throw new Error(payload?.message || `Hunyuan did not return an asset for ${input.node.name}.`)
  }
  return payload.assetUrl as string
}

async function applyAssetToNode(input: {
  scene: EditorSceneDocument
  node: EditorSceneNode
  assetUrl: string
  sourceAssetUrl?: string
}) {
  const result = await applyGeneratedAssetToNode(
    {
      getSceneNodeVisualBounds,
      inspectGeneratedAssetBounds: inspectAssetBounds,
      patchNode: (nodeId, patch) => patchNode(input.scene, nodeId, patch),
      appendPipelineLog: (message, detail) => {
        console.log(`[fit] ${message}`, detail ? JSON.stringify(detail) : '')
      },
      getNodeTransformSnapshot,
    },
    input.node,
    input.assetUrl,
    {
      sourceAssetUrl: input.sourceAssetUrl,
      descriptor: inferNodeGenerationDescriptor(input.node),
      logMessage: 'Applied yggdrasil command-line reimagine result',
    },
  )
  return result.fitReport
}

function createBackup(scene: EditorSceneDocument) {
  const backupPath = path.join(
    BACKUP_ROOT,
    `yggdrasil.${timestampKey()}.pre-cli-reimagine.json`,
  )
  writeJsonFile(backupPath, scene)
  return backupPath
}

function saveScene(scene: EditorSceneDocument) {
  scene.updatedAt = new Date().toISOString()
  writeJsonFile(SCENE_PATH, scene)
}

function writeRunLog(runLogPath: string, payload: JsonValue) {
  writeJsonFile(runLogPath, payload)
}

const options = parseArgs(process.argv.slice(2))
const preset =
  levelStyleBatchPresets.find(candidate => candidate.id === options.presetId) ??
  levelStyleBatchPresets[0]

if (!preset) {
  throw new Error(`Style preset not found: ${options.presetId}`)
}

const scene = readJsonFile<EditorSceneDocument>(SCENE_PATH)
const curatedIds = new Set(getCuratedStyleBatchCandidateIds(scene.nodes))
let targets = scene.nodes.filter(node => {
  if (options.nodeIds.length > 0 && !options.nodeIds.includes(node.id)) {
    return false
  }
  if (!curatedIds.has(node.id) && !isCuratedCandidate(node)) return false
  if (!options.force && isGeneratedHunyuanNode(node)) return false
  return !!(node.asset?.url || node.prefab || node.primitive)
})

if (options.limit > 0) {
  targets = targets.slice(0, options.limit)
}

const runLogPath = path.join(
  RUN_LOG_ROOT,
  `yggdrasil-reimagine-${timestampKey()}.json`,
)
const runLog: JsonValue = {
  createdAt: new Date().toISOString(),
  write: options.write,
  generateMissing: options.generateMissing,
  applyToScene: options.applyToScene,
  preset: preset.id,
  targetCount: targets.length,
  applied: [],
  generated: [],
  skipped: [],
  failed: [],
}

console.log(
  `${options.write ? 'Writing' : 'Dry run'} yggdrasil reimagine batch: ${targets.length} target(s).`,
)
console.log(`Preset: ${preset.label}`)
console.log(`Reuse existing: ${!options.noReuseExisting}`)
console.log(`Generate missing: ${options.generateMissing}`)
console.log(`Apply to scene: ${options.applyToScene}`)

if (!options.write) {
  for (const node of targets) {
    const existing = options.noReuseExisting
      ? null
      : findExistingGeneratedAsset(node)
    console.log(
      `[dry-run] ${node.id} | ${node.name} | ${existing ? `reuse ${existing}` : 'needs generation'}`,
    )
  }
  process.exit(0)
}

if (options.applyToScene) {
  const backupPath = createBackup(scene)
  console.log(`Scene backup written: ${path.relative(REPO_ROOT, backupPath)}`)
}

const generatedByGroup = new Map<string, string>()
const sourceByGroup = new Map<string, string>()

for (let index = 0; index < targets.length; index += 1) {
  const node = scene.nodes.find(candidate => candidate.id === targets[index]?.id)
  if (!node) continue
  if (!options.force && isGeneratedHunyuanNode(node)) {
    runLog.skipped.push({ nodeId: node.id, reason: 'already-generated' })
    continue
  }

  const key = groupKey(node)
  try {
    let assetUrl = !options.noReuseExisting
      ? findExistingGeneratedAsset(node)
      : null
    let sourceAssetUrl = node.asset?.url || getPrefabAssetUrl(
      node.prefab?.type,
      node.prefab?.variant,
    ) || ''
    let mode: 'reuse-existing' | 'reuse-group' | 'generate' = 'reuse-existing'

    if (!assetUrl && generatedByGroup.has(key)) {
      assetUrl = generatedByGroup.get(key) ?? null
      sourceAssetUrl = sourceByGroup.get(key) || sourceAssetUrl
      mode = 'reuse-group'
    }

    if (!assetUrl) {
      if (!options.generateMissing) {
        runLog.skipped.push({ nodeId: node.id, reason: 'no-existing-output' })
        console.log(
          `[${index + 1}/${targets.length}] skipped ${node.id}; no existing generated output.`,
        )
        continue
      }

      mode = 'generate'
      console.log(`[${index + 1}/${targets.length}] generating ${node.id} (${node.name})`)
      const source = await ensureSceneNodeSourceAsset(node)
      sourceAssetUrl = source.assetUrl
      const prompt = buildNodeStylePrompt(node, preset.label, preset.prompt)
      const workspace = await packageStyleWorkspace({
        node,
        sourceAssetUrl,
        prompt,
        preset,
        apiUrl: options.apiUrl,
        comfyUiApiUrl: options.comfyUiApiUrl,
      })
      const referenceImageUrl =
        workspace.referenceImageUrl ||
        workspace.generatedReferenceImageUrl ||
        workspace.workspaceReferenceImageUrl ||
        ''
      assetUrl = await runHunyuanReimagine({
        node,
        sourceAssetUrl,
        sourceName: source.sourceName,
        prompt,
        referenceImageUrl,
        apiUrl: options.apiUrl,
        comfyUiApiUrl: options.comfyUiApiUrl,
        workflowPath: options.workflowPath,
      })
      runLog.generated.push({
        nodeId: node.id,
        nodeName: node.name,
        assetUrl,
        sourceAssetUrl,
        referenceImageUrl,
      })
    } else {
      const action = options.applyToScene ? 'applying' : 'found'
      console.log(
        `[${index + 1}/${targets.length}] ${action} ${mode} ${node.id} -> ${assetUrl}`,
      )
    }

    generatedByGroup.set(key, assetUrl)
    if (sourceAssetUrl) sourceByGroup.set(key, sourceAssetUrl)

    if (options.applyToScene) {
      const fitReport = await applyAssetToNode({
        scene,
        node,
        assetUrl,
        sourceAssetUrl,
      })
      runLog.applied.push({
        nodeId: node.id,
        nodeName: node.name,
        mode,
        assetUrl,
        sourceAssetUrl,
        fitReport,
      })
      saveScene(scene)
    } else {
      runLog.skipped.push({
        nodeId: node.id,
        nodeName: node.name,
        reason: mode === 'generate' ? 'generated-not-applied' : 'existing-output-not-applied',
        assetUrl,
      })
    }
    writeRunLog(runLogPath, runLog)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    runLog.failed.push({
      nodeId: node.id,
      nodeName: node.name,
      error: message,
    })
    writeRunLog(runLogPath, runLog)
    console.error(`[${index + 1}/${targets.length}] failed ${node.id}: ${message}`)
  }
}

if (options.applyToScene) {
  saveScene(scene)
}
writeRunLog(runLogPath, {
  ...runLog,
  finishedAt: new Date().toISOString(),
})

console.log(
  `Done. Applied ${runLog.applied.length}, generated ${runLog.generated.length}, skipped ${runLog.skipped.length}, failed ${runLog.failed.length}.`,
)
console.log(`Run log: ${path.relative(REPO_ROOT, runLogPath)}`)
