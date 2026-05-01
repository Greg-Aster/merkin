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
    worldPartitionUrl?: string
  }
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
