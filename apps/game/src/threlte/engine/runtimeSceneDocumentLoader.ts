import type { SceneDocument } from './sceneDocumentTypes'
import {
  getRuntimeSceneManifestUrl,
  isRuntimeSceneManifest,
  type RuntimeSceneManifest,
  validateRuntimeSceneManifest,
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

export interface RuntimeSceneDocumentLoadOptions {
  allowPackagedFallback?: boolean
}

function canUsePackagedRuntimeFallback() {
  if (!import.meta.env.DEV || typeof window === 'undefined') return false

  const params = new URLSearchParams(window.location.search)
  return params.get('runtimeSource') === 'packaged'
}

async function loadRuntimeSceneManifest(levelId: string) {
  const url = getRuntimeSceneManifestUrl(levelId)

  try {
    const response = await fetch(url)
    if (!response.ok) return null

    const manifest = await response.json()
    if (!isRuntimeSceneManifest(manifest) || manifest.levelId !== levelId) {
      throw new Error(`${levelId}: invalid runtime scene manifest ${url}.`)
    }

    const validation = validateRuntimeSceneManifest(manifest, levelId)
    if (!validation.valid) {
      throw new Error(
        `${levelId}: cooked runtime scene manifest failed validation: ${validation.errors.join(' ')}`,
      )
    }

    return manifest
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error(`${levelId}: failed to load runtime scene manifest ${url}.`)
  }
}

export async function loadRuntimeSceneDocument(
  levelId: string,
  options: RuntimeSceneDocumentLoadOptions = {},
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

  const allowPackagedFallback =
    options.allowPackagedFallback ?? canUsePackagedRuntimeFallback()
  if (!allowPackagedFallback || !import.meta.env.DEV) {
    throw new Error(
      `${levelId}: missing cooked runtime scene manifest ${getRuntimeSceneManifestUrl(levelId)}. Run pnpm --dir apps/game cook:runtime-assets before gameplay, or use ?runtimeSource=packaged in dev for explicit recovery.`,
    )
  }

  const { requirePackagedSceneDocument } = await import(
    './packagedSceneDocuments'
  )

  return {
    scene: requirePackagedSceneDocument(levelId),
    source: 'packaged',
  }
}
