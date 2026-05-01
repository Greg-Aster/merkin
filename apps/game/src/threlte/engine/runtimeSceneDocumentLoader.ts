import type { SceneDocument } from './sceneDocumentTypes'
import {
  getRuntimeSceneManifestUrl,
  isRuntimeSceneManifest,
  type RuntimeSceneManifest,
} from './runtimeSceneManifest'
import type { LevelDefinition } from './types'

export type RuntimeSceneDocumentLoadResult =
  | {
      levelDefinition: LevelDefinition
      runtimeManifest: RuntimeSceneManifest
      scene: null
      source: 'runtime-manifest'
    }
  | {
      scene: SceneDocument
      source: 'packaged'
    }

async function loadRuntimeSceneManifest(levelId: string) {
  const url = getRuntimeSceneManifestUrl(levelId)

  try {
    const response = await fetch(url)
    if (!response.ok) return null

    const manifest = await response.json()
    if (!isRuntimeSceneManifest(manifest) || manifest.levelId !== levelId) {
      console.warn(`${levelId}: invalid runtime scene manifest ${url}`)
      return null
    }

    return manifest
  } catch {
    return null
  }
}

export async function loadRuntimeSceneDocument(
  levelId: string,
): Promise<RuntimeSceneDocumentLoadResult> {
  const runtimeManifest = await loadRuntimeSceneManifest(levelId)
  if (runtimeManifest) {
    return {
      levelDefinition: runtimeManifest.levelDefinition,
      runtimeManifest,
      scene: null,
      source: 'runtime-manifest',
    }
  }

  const { requirePackagedSceneDocument } = await import(
    './packagedSceneDocuments'
  )

  return {
    scene: requirePackagedSceneDocument(levelId),
    source: 'packaged',
  }
}
