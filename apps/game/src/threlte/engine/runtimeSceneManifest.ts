import { getRuntimeGroundContract } from './groundContract'
import type { SceneDocument } from './sceneDocumentTypes'
import type { LevelBuildReport, LevelDefinition } from './types'

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
    terrainManifestUrl?: string
    ground?: Record<string, unknown>
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
  return typeof terrain?.manifestUrl === 'string' ? terrain.manifestUrl : undefined
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
      requiredRenderActorIds: input.buildReport.requiredRenderActorIds,
      requiredAssetUrls: input.buildReport.requiredAssetUrls,
      runtimeAssetUrls: input.buildReport.runtimeAssetUrls,
      terrainManifestUrl: getTerrainManifestUrl(input.levelDefinition),
      ground: getRuntimeGroundContract(input.levelDefinition),
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

function sameStringSet(left: string[], right: string[]) {
  if (left.length !== right.length) return false

  const rightSet = new Set(right)
  return left.every(value => rightSet.has(value))
}

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
  if (buildReport.errors.length > 0) {
    errors.push(
      `Cooked level build report contains ${buildReport.errors.length} error(s).`,
    )
  }
  if (
    !sameStringSet(
      runtime.requiredRenderActorIds,
      buildReport.requiredRenderActorIds,
    )
  ) {
    errors.push(
      'Runtime requiredRenderActorIds do not match build report requiredRenderActorIds.',
    )
  }
  if (!sameStringSet(runtime.requiredAssetUrls, buildReport.requiredAssetUrls)) {
    errors.push(
      'Runtime requiredAssetUrls do not match build report requiredAssetUrls.',
    )
  }
  if (!sameStringSet(runtime.runtimeAssetUrls, buildReport.runtimeAssetUrls)) {
    errors.push(
      'Runtime runtimeAssetUrls do not match build report runtimeAssetUrls.',
    )
  }
  if (!runtime.ground) {
    errors.push('Runtime ground contract is missing.')
  }

  for (const url of [
    ...runtime.requiredAssetUrls,
    ...runtime.runtimeAssetUrls,
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
