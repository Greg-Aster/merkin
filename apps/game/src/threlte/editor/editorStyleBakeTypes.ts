export type StyleBakeMode =
  | 'procedural'
  | 'procedural-material'
  | 'blender-geometry'
  | 'ai-texture-source'

export type EditorStyleBakeBackend =
  | 'procedural-material'
  | 'blender-geometry'

export type EditorStyleBakeOutputTier = 'preview' | 'runtime' | 'hero'

export type EditorStyleBakeStatus = 'clean' | 'dirty' | 'missing' | 'failed'

export type EditorStyleBakeBatchScope =
  | 'batch-selection'
  | 'selected-objects'
  | 'visible'
  | 'level'

export type StyleBakeProductStatus =
  | 'ready'
  | 'stale'
  | 'dirty'
  | 'missing'
  | 'failed'

export type StyleBakeVec3 = [number, number, number]

export interface StyleBakeFingerprint {
  algorithm: 'sha256' | 'fnv1a32' | 'fnv1a64'
  value: string
}

export interface StyleBakeTransformSnapshot {
  position: StyleBakeVec3
  rotation: StyleBakeVec3
  scale: StyleBakeVec3
}

export interface StyleBakeVisualBounds {
  size: StyleBakeVec3
  maxDimension: number
}

export interface StyleBakeSettings {
  styleProfileName: string
  prompt: string
  textureSize: number
  profileId?: string
  lineStrength?: number
  brushStrength?: number
  aoStrength?: number
  cavityStrength?: number
  curvatureStrength?: number
  geometrySimplification?: number
  outputTier?: EditorStyleBakeOutputTier
  bevelCleanup?: boolean
  weightedNormalCleanup?: boolean
  lineGeometry?: boolean
}

export interface EditorStyleBakeSettings extends StyleBakeSettings {
  profileId: string
  lineStrength: number
  brushStrength: number
  aoStrength: number
  cavityStrength: number
  curvatureStrength: number
  geometrySimplification: number
  outputTier: EditorStyleBakeOutputTier
  bevelCleanup: boolean
  weightedNormalCleanup: boolean
  lineGeometry: boolean
}

export interface EditorStyleBakeProductSource {
  assetUrl: string
  assetPath?: string
  assetFingerprint: string
  nodeId: string
  levelId: string
}

export interface EditorStyleBakeProduct {
  mode: 'procedural-material' | 'blender-geometry' | 'ai-texture-source'
  assetUrl: string
  metadataUrl: string
  source: EditorStyleBakeProductSource
  settings: EditorStyleBakeSettings
  settingsFingerprint: string
  cacheKey: string
  generator: string
  generatedAt: string
  status: EditorStyleBakeStatus
  styleBakeProduct?: StyleBakeProduct
  diagnostics?: Record<string, unknown>
}

export interface EditorStyleBakeRunOptions {
  force?: boolean
}

export interface EditorStyleBakeRunResult {
  product: EditorStyleBakeProduct
  cached: boolean
  fitReport: string
  inspectReport?: string
}

export interface EditorStyleBakePreviewSnapshot {
  nodeId: string
  previousKind: string
  previousAsset: unknown
  previousPrefab: unknown
  previousPrimitive: unknown
  previousScale: StyleBakeVec3
  previousGeneration: unknown
  previewAssetUrl: string
}

export interface StyleBakeProductState {
  status: StyleBakeProductStatus
  reason?: string
  errors?: string[]
}

export interface StyleBakeInputContract {
  sourceAssetUrl: string
  sourceAssetFingerprint: StyleBakeFingerprint
  levelId: string
  nodeId: string
  sourceNodeTransform: StyleBakeTransformSnapshot
  sourceLocalBounds?: StyleBakeVisualBounds | null
  mode: StyleBakeMode
  settings: StyleBakeSettings
  settingsFingerprint: StyleBakeFingerprint
  cacheKey: string
  generatorName: string
  generatorVersion: string
}

export interface StyleBakeProduct extends StyleBakeInputContract {
  schemaVersion: 1
  generatedAssetUrl: string
  generatedMetadataUrl: string
  generatedAt: string
  state: StyleBakeProductState
}

export interface StyleBakeCurrentStateInput {
  sourceAssetUrl: string
  sourceAssetFingerprint: StyleBakeFingerprint
  sourceNodeTransform: StyleBakeTransformSnapshot
  settings: StyleBakeSettings
  settingsFingerprint: StyleBakeFingerprint
  cacheKey: string
  generatorVersion: string
  nodeAssetUrl?: string
}

export const styleBakeProductSchemaVersion = 1
export const proceduralStyleBakeGeneratorName =
  'Merkin deterministic procedural style bake'
export const proceduralStyleBakeGeneratorVersion = 'procedural-material-v1'
export const blenderStyleBakeGeneratorName =
  'Merkin Blender headless geometry style bake'
export const blenderStyleBakeGeneratorVersion = 'blender-geometry-v1'

function clampStyleBakeNumber(
  value: unknown,
  min: number,
  max: number,
  fallback: number,
) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return fallback
  return Math.min(max, Math.max(min, numeric))
}

export function normalizeStyleBakeSettings(
  settings: Partial<StyleBakeSettings>,
): StyleBakeSettings {
  const styleProfileName = String(
    settings.styleProfileName ?? settings.profileId ?? 'Painterly Storybook',
  ).trim()
  return {
    styleProfileName,
    prompt: String(settings.prompt ?? '').trim(),
    textureSize: Math.round(
      clampStyleBakeNumber(settings.textureSize, 32, 2048, 256),
    ),
    profileId: settings.profileId ?? styleProfileName,
    lineStrength: clampStyleBakeNumber(settings.lineStrength, 0, 1, 0.35),
    brushStrength: clampStyleBakeNumber(settings.brushStrength, 0, 1, 0.25),
    aoStrength: clampStyleBakeNumber(settings.aoStrength, 0, 2, 0.8),
    cavityStrength: clampStyleBakeNumber(
      settings.cavityStrength,
      0,
      2,
      0.65,
    ),
    curvatureStrength: clampStyleBakeNumber(
      settings.curvatureStrength,
      0,
      2,
      0.45,
    ),
    geometrySimplification: clampStyleBakeNumber(
      settings.geometrySimplification,
      0,
      0.95,
      0,
    ),
    outputTier: settings.outputTier ?? 'runtime',
    bevelCleanup: Boolean(settings.bevelCleanup ?? false),
    weightedNormalCleanup: settings.weightedNormalCleanup !== false,
    lineGeometry: Boolean(settings.lineGeometry ?? false),
  }
}

export function stableStyleBakeJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(item => stableStyleBakeJson(item)).join(',')}]`
  }
  if (value && typeof value === 'object') {
    return `{${Object.entries(value)
      .filter(([, item]) => item !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableStyleBakeJson(item)}`)
      .join(',')}}`
  }
  return JSON.stringify(value)
}

export function createStyleBakeStableFingerprint(
  value: unknown,
): StyleBakeFingerprint {
  const input = stableStyleBakeJson(value)
  let hash = 0xcbf29ce484222325n
  const prime = 0x100000001b3n
  const mask = 0xffffffffffffffffn
  for (let index = 0; index < input.length; index += 1) {
    hash ^= BigInt(input.charCodeAt(index))
    hash = (hash * prime) & mask
  }
  return {
    algorithm: 'fnv1a64',
    value: hash.toString(16).padStart(16, '0'),
  }
}

export function createStyleBakeSettingsFingerprint(
  settings: StyleBakeSettings,
): StyleBakeFingerprint {
  return createStyleBakeStableFingerprint({
    schemaVersion: styleBakeProductSchemaVersion,
    settings: normalizeStyleBakeSettings(settings),
  })
}

export function createStyleBakeCacheKey(input: {
  sourceAssetUrl: string
  sourceAssetFingerprint: StyleBakeFingerprint
  levelId: string
  nodeId: string
  sourceNodeTransform: StyleBakeTransformSnapshot
  sourceLocalBounds?: StyleBakeVisualBounds | null
  mode: StyleBakeMode
  settingsFingerprint: StyleBakeFingerprint
  generatorVersion: string
}) {
  const fingerprint = createStyleBakeStableFingerprint({
    schemaVersion: styleBakeProductSchemaVersion,
    sourceAssetFingerprint: input.sourceAssetFingerprint,
    mode: input.mode,
    settingsFingerprint: input.settingsFingerprint,
    generatorVersion: input.generatorVersion,
  })

  return `style-bake:${input.mode}:${fingerprint.value}`
}

function fingerprintValue(fingerprint: StyleBakeFingerprint | undefined) {
  return fingerprint?.value ?? ''
}

function transformsMatch(
  left: StyleBakeTransformSnapshot,
  right: StyleBakeTransformSnapshot,
) {
  return (
    stableStyleBakeJson(left.position) === stableStyleBakeJson(right.position) &&
    stableStyleBakeJson(left.rotation) === stableStyleBakeJson(right.rotation) &&
    stableStyleBakeJson(left.scale) === stableStyleBakeJson(right.scale)
  )
}

export function getStyleBakeProductState(
  product: StyleBakeProduct | null | undefined,
  current: StyleBakeCurrentStateInput,
): StyleBakeProductState {
  if (!product) {
    return { status: 'missing', reason: 'No style bake product is recorded.' }
  }

  if (product.state.status === 'failed') {
    return product.state
  }

  if (!product.generatedAssetUrl || !product.generatedMetadataUrl) {
    return {
      status: 'missing',
      reason: 'The style bake product is missing generated asset metadata.',
    }
  }

  if (current.nodeAssetUrl && current.nodeAssetUrl !== product.generatedAssetUrl) {
    return {
      status: 'stale',
      reason: 'The node no longer points at the generated style bake asset.',
    }
  }

  if (
    product.sourceAssetUrl !== current.sourceAssetUrl ||
    fingerprintValue(product.sourceAssetFingerprint) !==
      fingerprintValue(current.sourceAssetFingerprint) ||
    fingerprintValue(product.settingsFingerprint) !==
      fingerprintValue(current.settingsFingerprint) ||
    product.cacheKey !== current.cacheKey ||
    product.generatorVersion !== current.generatorVersion
  ) {
    return {
      status: 'stale',
      reason:
        'The style bake product no longer matches the current source, settings, or generator.',
    }
  }

  if (!transformsMatch(product.sourceNodeTransform, current.sourceNodeTransform)) {
    return {
      status: 'dirty',
      reason: 'The node transform changed after the style bake was generated.',
    }
  }

  return { status: 'ready' }
}
