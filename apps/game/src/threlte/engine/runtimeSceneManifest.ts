import { getGeneratedCollisionProductMountError } from './generatedCollisionProductRuntime'
import { getRuntimeGroundContract } from './groundContract'
import type { SceneDocument } from './sceneDocumentTypes'
import type {
  GeneratedCollisionProduct,
  LevelBuildReport,
  LevelDefinition,
} from './types'

export const RUNTIME_SCENE_MANIFEST_SCHEMA_VERSION = 1
export const RUNTIME_SCENE_MANIFEST_BASE_URL =
  '/generated/runtime-game-assets/scenes'

export interface RuntimeSceneManifest {
  schemaVersion: typeof RUNTIME_SCENE_MANIFEST_SCHEMA_VERSION
  generatedAt: string
  levelId: string
  sceneId: string
  source: {
    kind: 'scene-document'
    path: string
    version: number
    updatedAt?: string
  }
  levelDefinition: LevelDefinition
  buildReport: LevelBuildReport
  runtime: {
    requiredRenderActorIds: string[]
    requiredAssetUrls: string[]
    runtimeAssetUrls: string[]
    generatedCollisionProducts?: GeneratedCollisionProduct[]
    assetTierCap?: 'low' | 'medium' | 'high'
    terrainManifestUrl?: string
    ground?: Record<string, unknown>
    renderProfile?: Record<string, unknown> | null
    worldPartitionUrl?: string
  }
}

export interface RuntimeSceneManifestValidationResult {
  valid: boolean
  errors: string[]
}

export function getRuntimeSceneManifestUrl(levelId: string) {
  return `${RUNTIME_SCENE_MANIFEST_BASE_URL}/${levelId}.runtime-scene.json`
}

function getTerrainManifestUrl(levelDefinition: LevelDefinition) {
  const terrain = (levelDefinition.settings as any)?.level?.collision?.terrain
  return typeof terrain?.manifestUrl === 'string'
    ? terrain.manifestUrl
    : undefined
}

function getRuntimeAssetTierCap(levelDefinition: LevelDefinition) {
  const levelSettings = (levelDefinition.settings as any)?.level
  const tier =
    levelSettings?.runtimeAssets?.maxTier ??
    levelSettings?.performance?.assetTierCap
  return tier === 'low' || tier === 'medium' || tier === 'high'
    ? tier
    : undefined
}

function getRuntimeRenderProfile(levelDefinition: LevelDefinition) {
  return (levelDefinition.settings as any)?.level?.renderProfile ?? null
}

function toStringArray(value: unknown): string[] | undefined {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : undefined
}

function firstPresentStringArray(...values: unknown[]): string[] {
  for (const value of values) {
    const strings = toStringArray(value)
    if (strings) return strings
  }
  return []
}

export function getBuildReportRequiredRenderActorIds(
  buildReport: LevelBuildReport | null | undefined,
): string[] {
  return firstPresentStringArray(
    buildReport?.runtimeReadinessContract?.runtime?.requiredRenderActorIds,
  )
}

export function getBuildReportRequiredAssetUrls(
  buildReport: LevelBuildReport | null | undefined,
): string[] {
  return firstPresentStringArray(
    buildReport?.runtimeReadinessContract?.runtime?.requiredAssetUrls,
  )
}

export function getBuildReportRuntimeAssetUrls(
  buildReport: LevelBuildReport | null | undefined,
): string[] {
  return firstPresentStringArray(
    buildReport?.runtimeReadinessContract?.runtimeAssetUrls,
  )
}

export function getRuntimeSceneRequiredRenderActorIds(
  manifest: RuntimeSceneManifest | null | undefined,
): string[] {
  return firstPresentStringArray(
    manifest?.buildReport?.runtimeReadinessContract?.runtime
      ?.requiredRenderActorIds,
    manifest?.runtime?.requiredRenderActorIds,
  )
}

export function getRuntimeSceneRequiredAssetUrls(
  manifest: RuntimeSceneManifest | null | undefined,
): string[] {
  return firstPresentStringArray(
    manifest?.buildReport?.runtimeReadinessContract?.runtime?.requiredAssetUrls,
    manifest?.runtime?.requiredAssetUrls,
  )
}

export function getRuntimeSceneRuntimeAssetUrls(
  manifest: RuntimeSceneManifest | null | undefined,
): string[] {
  return firstPresentStringArray(
    manifest?.buildReport?.runtimeReadinessContract?.runtimeAssetUrls,
    manifest?.runtime?.runtimeAssetUrls,
  )
}

export function createRuntimeSceneManifest(input: {
  scene: SceneDocument
  sceneId: string
  sourcePath: string
  levelDefinition: LevelDefinition
  buildReport: LevelBuildReport
  generatedAt?: string
  worldPartitionUrl?: string
}): RuntimeSceneManifest {
  const generatedCollisionProducts = input.levelDefinition.actors
    .map(actor => actor.physics?.collision.generatedProduct)
    .filter(
      (product): product is GeneratedCollisionProduct => Boolean(product),
    )
  return {
    schemaVersion: RUNTIME_SCENE_MANIFEST_SCHEMA_VERSION,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    levelId: input.levelDefinition.id,
    sceneId: input.sceneId,
    source: {
      kind: 'scene-document',
      path: input.sourcePath,
      version: input.scene.version,
      updatedAt: input.scene.updatedAt,
    },
    levelDefinition: input.levelDefinition,
    buildReport: input.buildReport,
    runtime: {
      requiredRenderActorIds: getBuildReportRequiredRenderActorIds(
        input.buildReport,
      ),
      requiredAssetUrls: getBuildReportRequiredAssetUrls(input.buildReport),
      runtimeAssetUrls: getBuildReportRuntimeAssetUrls(input.buildReport),
      generatedCollisionProducts,
      assetTierCap: getRuntimeAssetTierCap(input.levelDefinition),
      terrainManifestUrl: getTerrainManifestUrl(input.levelDefinition),
      ground: getRuntimeGroundContract(input.levelDefinition),
      renderProfile: getRuntimeRenderProfile(input.levelDefinition),
      worldPartitionUrl: input.worldPartitionUrl,
    },
  }
}

export function isRuntimeSceneManifest(
  value: unknown,
): value is RuntimeSceneManifest {
  const manifest = value as RuntimeSceneManifest
  return (
    Boolean(manifest) &&
    manifest.schemaVersion === RUNTIME_SCENE_MANIFEST_SCHEMA_VERSION &&
    typeof manifest.levelId === 'string' &&
    typeof manifest.sceneId === 'string' &&
    typeof manifest.generatedAt === 'string' &&
    Boolean(manifest.levelDefinition) &&
    Array.isArray(manifest.levelDefinition.actors) &&
    Boolean(manifest.buildReport)
  )
}

function isFiniteVec3(value: unknown): value is [number, number, number] {
  return (
    Array.isArray(value) &&
    value.length === 3 &&
    value.every(component => Number.isFinite(component))
  )
}

function isGeneratedCollisionProduct(value: unknown) {
  const product = value as GeneratedCollisionProduct
  const hasFingerprint = (fingerprint: unknown) =>
    typeof fingerprint === 'string' ||
    (Boolean(fingerprint) &&
      typeof (fingerprint as { value?: unknown }).value === 'string')
  return (
    Boolean(product) &&
    typeof product.actorId === 'string' &&
    hasFingerprint(product.sourceMeshFingerprint) &&
    hasFingerprint(product.transformFingerprint) &&
    hasFingerprint(product.policyFingerprint) &&
    typeof product.shape === 'string' &&
    typeof product.generatorVersion === 'string' &&
    isFiniteVec3(product.localBounds?.min) &&
    isFiniteVec3(product.localBounds?.max) &&
    isFiniteVec3(product.localBounds?.size) &&
    isFiniteVec3(product.localBounds?.center)
  )
}

const artifactBackedGeneratedProductShapes = new Set(['convexHull', 'trimesh'])
const meshDerivedCollisionQualities = new Set([
  'convexHull',
  'simplifiedMesh',
  'trimesh',
])

function getExpectedGeneratedProductShape(
  quality: unknown,
): GeneratedCollisionProduct['shape'] | null {
  if (quality === 'convexHull') return 'convexHull'
  if (quality === 'simplifiedMesh' || quality === 'trimesh') return 'trimesh'
  return null
}

function hasArtifactBackedGeneratedProductShape(
  product: GeneratedCollisionProduct,
) {
  return artifactBackedGeneratedProductShapes.has(product.shape)
}

function sameStringSet(left: string[], right: string[]) {
  if (left.length !== right.length) return false

  const rightSet = new Set(right)
  return left.every(value => rightSet.has(value))
}

const forbiddenRuntimeActorFields = new Set([
  'editor',
  'legacyKind',
  'locked',
  'generation',
])

export function validateRuntimeSceneManifest(
  manifest: RuntimeSceneManifest,
  expectedLevelId = manifest.levelId,
): RuntimeSceneManifestValidationResult {
  const errors: string[] = []
  const buildReport = manifest.buildReport
  const runtime = manifest.runtime

  if (manifest.levelId !== expectedLevelId) {
    errors.push(
      `Manifest levelId "${manifest.levelId}" does not match requested level "${expectedLevelId}".`,
    )
  }
  if (manifest.levelDefinition.id !== manifest.levelId) {
    errors.push(
      `Level definition id "${manifest.levelDefinition.id}" does not match manifest level "${manifest.levelId}".`,
    )
  }
  if (buildReport.levelId !== manifest.levelId) {
    errors.push(
      `Build report levelId "${buildReport.levelId}" does not match manifest level "${manifest.levelId}".`,
    )
  }
  if (!isFiniteVec3(manifest.levelDefinition.spawn?.player)) {
    errors.push('Level definition has no finite player spawn Vec3.')
  }
  if (
    manifest.levelDefinition.spawn?.rotation !== undefined &&
    !isFiniteVec3(manifest.levelDefinition.spawn.rotation)
  ) {
    errors.push('Level definition player spawn rotation must be a finite Vec3.')
  }
  if (buildReport.errors.length > 0) {
    errors.push(
      `Cooked level build report contains ${buildReport.errors.length} error(s).`,
    )
  }
  if (
    !sameStringSet(
      runtime.requiredRenderActorIds,
      getBuildReportRequiredRenderActorIds(buildReport),
    )
  ) {
    errors.push(
      'Runtime requiredRenderActorIds do not match build report readiness contract.',
    )
  }
  if (
    !sameStringSet(
      runtime.requiredAssetUrls,
      getBuildReportRequiredAssetUrls(buildReport),
    )
  ) {
    errors.push(
      'Runtime requiredAssetUrls do not match build report readiness contract.',
    )
  }
  if (
    !sameStringSet(
      runtime.runtimeAssetUrls,
      getBuildReportRuntimeAssetUrls(buildReport),
    )
  ) {
    errors.push(
      'Runtime runtimeAssetUrls do not match build report readiness contract.',
    )
  }
  if (!runtime.ground) {
    errors.push('Runtime ground contract is missing.')
  }
  if (
    runtime.generatedCollisionProducts !== undefined &&
    !Array.isArray(runtime.generatedCollisionProducts)
  ) {
    errors.push('Runtime generatedCollisionProducts must be an array.')
  }
  for (const [index, product] of (
    runtime.generatedCollisionProducts ?? []
  ).entries()) {
    if (!isGeneratedCollisionProduct(product)) {
      errors.push(
        `Runtime generated collision product ${index} is missing required fingerprints, bounds, or generator metadata.`,
      )
      continue
    }
    if (
      hasArtifactBackedGeneratedProductShape(product) &&
      typeof product.artifactUrl !== 'string'
    ) {
      errors.push(
        `Runtime generated collision product ${index} is artifact-backed but has no artifactUrl.`,
      )
    }
    if (
      hasArtifactBackedGeneratedProductShape(product) &&
      typeof product.metadataUrl !== 'string'
    ) {
      errors.push(
        `Runtime generated collision product ${index} is artifact-backed but has no metadataUrl.`,
      )
    }
  }

  for (const actor of manifest.levelDefinition.actors) {
    for (const field of forbiddenRuntimeActorFields) {
      if (Object.hasOwn(actor, field)) {
        errors.push(
          `Runtime actor "${actor.id}" contains forbidden field "${field}".`,
        )
      }
    }
    const collision = actor.physics?.collision
    const generatedProduct = collision?.generatedProduct
    if (collision) {
      const mountError = getGeneratedCollisionProductMountError(
        generatedProduct,
        actor.id,
      )
      if (mountError) {
        errors.push(
          `Runtime actor "${actor.id}" collision generatedProduct is not mountable: ${mountError}`,
        )
      }
    }
    if (
      generatedProduct &&
      typeof collision?.quality === 'string' &&
      meshDerivedCollisionQualities.has(collision.quality)
    ) {
      const expectedShape = getExpectedGeneratedProductShape(collision.quality)
      if (expectedShape && generatedProduct.shape !== expectedShape) {
        errors.push(
          `Runtime actor "${actor.id}" generated collision product shape ${generatedProduct.shape} does not match ${collision?.quality} policy.`,
        )
      }
      if (
        expectedShape &&
        artifactBackedGeneratedProductShapes.has(expectedShape) &&
        typeof generatedProduct.artifactUrl !== 'string'
      ) {
        errors.push(
          `Runtime actor "${actor.id}" mesh-derived generated collision product has no artifactUrl.`,
        )
      }
    }
  }

  for (const url of [
    ...getRuntimeSceneRequiredAssetUrls(manifest),
    ...getRuntimeSceneRuntimeAssetUrls(manifest),
  ]) {
    if (!url.startsWith('/')) {
      errors.push(`Runtime asset URL "${url}" must be a public absolute path.`)
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
