import { createHash } from 'node:crypto'
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs'

export const STYLE_BAKE_MODES = new Set([
  'procedural-material',
  'blender-geometry',
  'ai-texture-source',
])

export const STYLE_BAKE_OUTPUT_TIERS = new Set(['preview', 'runtime', 'hero'])

export const STYLE_BAKE_GENERATORS = {
  proceduralMaterial: 'Merkin deterministic procedural style bake',
  blenderGeometry: 'Merkin Blender headless geometry style bake',
}

export const styleBakeProductSchemaVersion = 1
export const proceduralStyleBakeGeneratorName =
  STYLE_BAKE_GENERATORS.proceduralMaterial
export const proceduralStyleBakeGeneratorVersion = 'procedural-material-v1'

export const styleBakeProceduralGenerator = {
  id: 'procedural-material-v1',
  label: STYLE_BAKE_GENERATORS.proceduralMaterial,
}

export const styleBakeBlenderGeometryGenerator = {
  id: 'blender-geometry-v1',
  label: STYLE_BAKE_GENERATORS.blenderGeometry,
}

function clampNumber(value, min, max, fallback) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return fallback
  return Math.min(max, Math.max(min, numeric))
}

function normalizeBoolean(value, fallback = false) {
  if (typeof value === 'boolean') return value
  if (typeof value !== 'string') return fallback
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase())
}

export function stableStyleBakeJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableStyleBakeJson).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.entries(value)
      .filter(([, item]) => item !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableStyleBakeJson(item)}`)
      .join(',')}}`
  }
  return JSON.stringify(value)
}

export function createStyleBakeStableFingerprint(value) {
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

function normalizeFingerprint(value, fallbackAlgorithm = 'sha256') {
  if (typeof value === 'string' && value.trim()) {
    return {
      algorithm: fallbackAlgorithm,
      value: value.trim(),
    }
  }
  if (
    value &&
    typeof value === 'object' &&
    typeof value.value === 'string' &&
    value.value.trim()
  ) {
    return {
      algorithm: typeof value.algorithm === 'string' ? value.algorithm : fallbackAlgorithm,
      value: value.value.trim(),
    }
  }
  return null
}

function getFingerprintText(value) {
  if (typeof value === 'string') return value
  return typeof value?.value === 'string' ? value.value : ''
}

function normalizeTransformSnapshot(value = {}) {
  const snapshot = value && typeof value === 'object' ? value : {}
  const normalizeVec3 = fallback => candidate => {
    if (!Array.isArray(candidate) || candidate.length !== 3) return fallback
    return candidate.map((component, index) => {
      const numeric = Number(component)
      return Number.isFinite(numeric) ? numeric : fallback[index]
    })
  }
  return {
    position: normalizeVec3([0, 0, 0])(snapshot.position),
    rotation: normalizeVec3([0, 0, 0])(snapshot.rotation),
    scale: normalizeVec3([1, 1, 1])(snapshot.scale),
  }
}

function normalizeProductState(status, diagnostics) {
  if (status === 'failed') {
    return {
      status: 'failed',
      reason: String(diagnostics?.reason ?? diagnostics?.message ?? ''),
      errors: Array.isArray(diagnostics?.errors) ? diagnostics.errors : undefined,
    }
  }
  if (status === 'dirty') return { status: 'dirty' }
  if (status === 'missing') return { status: 'missing' }
  return { status: 'ready' }
}

export function normalizeStyleBakeMode(value, fallback = 'procedural-material') {
  const mode = String(value || fallback)
  if (!STYLE_BAKE_MODES.has(mode)) {
    throw new Error(`Unsupported style bake mode: ${mode}`)
  }
  return mode
}

export function normalizeOutputTier(value, fallback = 'runtime') {
  const tier = String(value || fallback)
  return STYLE_BAKE_OUTPUT_TIERS.has(tier) ? tier : fallback
}

export function normalizeStyleBakeSettings(input = {}) {
  const styleProfileName = String(
    input.styleProfileName ??
      input['style-profile-name'] ??
      input.profileId ??
      input['profile-id'] ??
      'Painterly Storybook',
  ).trim() || 'Painterly Storybook'
  const profileId =
    String(input.profileId ?? input['profile-id'] ?? styleProfileName)
      .trim() || styleProfileName

  return {
    profileId,
    styleProfileName,
    prompt: String(input.prompt ?? '').trim(),
    textureSize: Math.round(
      clampNumber(input.textureSize ?? input['texture-size'], 32, 2048, 256),
    ),
    aoStrength: clampNumber(input.aoStrength ?? input['ao-strength'], 0, 2, 0.8),
    cavityStrength: clampNumber(
      input.cavityStrength ?? input['cavity-strength'],
      0,
      2,
      0.65,
    ),
    curvatureStrength: clampNumber(
      input.curvatureStrength ?? input['curvature-strength'],
      0,
      2,
      0.45,
    ),
    lineStrength: clampNumber(
      input.lineStrength ?? input['line-strength'],
      0,
      1,
      0.35,
    ),
    brushStrength: clampNumber(
      input.brushStrength ?? input['brush-strength'],
      0,
      1,
      0.25,
    ),
    geometrySimplification: clampNumber(
      input.geometrySimplification ?? input['geometry-simplification'],
      0,
      0.95,
      0,
    ),
    outputTier: normalizeOutputTier(input.outputTier ?? input['output-tier']),
    bevelCleanup: normalizeBoolean(
      input.bevelCleanup ?? input['bevel-cleanup'],
      false,
    ),
    weightedNormalCleanup: normalizeBoolean(
      input.weightedNormalCleanup ?? input['weighted-normal-cleanup'],
      true,
    ),
    lineGeometry: normalizeBoolean(
      input.lineGeometry ?? input['line-geometry'],
      false,
    ),
  }
}

export function fingerprintFile(filePath) {
  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    throw new Error(`Cannot fingerprint missing file: ${filePath}`)
  }
  return createHash('sha256').update(readFileSync(filePath)).digest('hex')
}

export const createStyleBakeFileFingerprint = fingerprintFile

export function getStyleBakeSettingsFingerprint(settings = {}) {
  return createStyleBakeStableFingerprint({
    schemaVersion: styleBakeProductSchemaVersion,
    settings: normalizeStyleBakeSettings(settings),
  })
}

export const createStyleBakeSettingsFingerprint = getStyleBakeSettingsFingerprint

export function getStyleBakeCacheKey({
  sourceAssetFingerprint = '',
  mode = 'procedural-material',
  settingsFingerprint = '',
  generator = styleBakeProceduralGenerator,
} = {}) {
  const generatorVersion =
    typeof generator === 'string' ? generator : generator.id ?? generator.label
  const fingerprint = createStyleBakeStableFingerprint({
    schemaVersion: styleBakeProductSchemaVersion,
    sourceAssetFingerprint:
      normalizeFingerprint(sourceAssetFingerprint) ??
      { algorithm: 'sha256', value: '' },
    mode,
    settingsFingerprint:
      normalizeFingerprint(settingsFingerprint, 'fnv1a64') ??
      { algorithm: 'fnv1a64', value: '' },
    generatorVersion,
  })

  return `style-bake:${mode}:${fingerprint.value}`
}

export const createStyleBakeCacheKey = getStyleBakeCacheKey

export function createStyleBakeProduct({
  mode = 'procedural-material',
  assetUrl = '',
  metadataUrl = '',
  sourceAssetUrl = '',
  sourceAssetPath = '',
  sourceAssetFingerprint = '',
  sourceFingerprint = '',
  nodeId = '',
  levelId = '',
  sourceNodeTransform = {},
  sourceLocalBounds = null,
  settings = {},
  settingsFingerprint = '',
  cacheKey = '',
  generator = styleBakeProceduralGenerator,
  generatedAt = new Date().toISOString(),
  status = 'clean',
  diagnostics = {},
} = {}) {
  const normalizedMode = normalizeStyleBakeMode(mode)
  const normalizedSettings = normalizeStyleBakeSettings(settings)
  const normalizedSourceFingerprint =
    normalizeFingerprint(sourceAssetFingerprint || sourceFingerprint) ??
    { algorithm: 'sha256', value: '' }
  const normalizedSettingsFingerprint =
    normalizeFingerprint(settingsFingerprint) ??
    getStyleBakeSettingsFingerprint(normalizedSettings)
  const generatorLabel =
    typeof generator === 'string' ? generator : generator.label ?? generator.id
  const generatorVersion =
    typeof generator === 'string' ? generator : generator.id ?? generatorLabel
  const state = normalizeProductState(status, diagnostics)

  return {
    schemaVersion: 1,
    sourceAssetUrl,
    sourceAssetFingerprint: normalizedSourceFingerprint,
    levelId,
    nodeId,
    sourceNodeTransform: normalizeTransformSnapshot(sourceNodeTransform),
    sourceLocalBounds,
    mode: normalizedMode,
    settings: normalizedSettings,
    settingsFingerprint: normalizedSettingsFingerprint,
    cacheKey,
    generatedAssetUrl: assetUrl,
    generatedMetadataUrl: metadataUrl,
    generatedAt,
    generatorName: generatorLabel || STYLE_BAKE_GENERATORS.proceduralMaterial,
    generatorVersion,
    state,
    assetUrl,
    metadataUrl,
    source: {
      assetUrl: sourceAssetUrl,
      assetPath: sourceAssetPath,
      assetFingerprint: getFingerprintText(normalizedSourceFingerprint),
      nodeId,
      levelId,
    },
    generator: generatorLabel || STYLE_BAKE_GENERATORS.proceduralMaterial,
    status,
    diagnostics,
  }
}

export function readStyleBakeProductMetadata(metadataPath) {
  if (!metadataPath || !existsSync(metadataPath) || !statSync(metadataPath).isFile()) {
    return null
  }
  try {
    return JSON.parse(readFileSync(metadataPath, 'utf8'))
  } catch {
    return null
  }
}

export function getStyleBakeProductStatus({
  product,
  assetPath,
  metadataPath,
  sourceAssetFingerprint = '',
  settingsFingerprint = '',
  cacheKey = '',
  generator = styleBakeProceduralGenerator,
} = {}) {
  if (!product) return 'missing'
  if (product.status === 'failed' || product.state?.status === 'failed') {
    return 'failed'
  }
  if (!assetPath || !existsSync(assetPath)) return 'missing'
  if (!metadataPath || !existsSync(metadataPath)) return 'missing'
  if (
    product.source?.assetFingerprint !== getFingerprintText(sourceAssetFingerprint) &&
    getFingerprintText(product.sourceAssetFingerprint) !== getFingerprintText(sourceAssetFingerprint)
  ) return 'dirty'
  if (
    getFingerprintText(product.settingsFingerprint) !==
    getFingerprintText(settingsFingerprint)
  ) return 'dirty'
  if (product.cacheKey !== cacheKey) return 'dirty'
  const generatorLabel =
    typeof generator === 'string' ? generator : generator.label ?? generator.id
  const generatorVersion =
    typeof generator === 'string' ? generator : generator.id ?? generatorLabel
  const generatorNameMatches =
    product.generator === generatorLabel || product.generatorName === generatorLabel
  const generatorVersionMatches = product.generatorVersion === generatorVersion
  if (!generatorNameMatches || !generatorVersionMatches) return 'dirty'
  return 'clean'
}

export function findReusableStyleBakeProduct(options = {}) {
  const status = getStyleBakeProductStatus(options)
  return status === 'clean' ? options.product : null
}

export function writeStyleBakeMetadata(metadataPath, metadata) {
  writeFileSync(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, 'utf8')
}
