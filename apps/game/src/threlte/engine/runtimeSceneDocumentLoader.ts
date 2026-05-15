import {
  type RuntimeSceneManifest,
  getRuntimeSceneManifestUrl,
  isRuntimeSceneManifest,
  validateRuntimeSceneManifest,
} from './runtimeSceneManifest'
import type { LevelDefinition } from './types'

export type RuntimeSceneDocumentLoadResult = {
  levelDefinition: LevelDefinition
  runtimeManifest: RuntimeSceneManifest
  source: 'runtime-manifest'
}

async function loadRuntimeSceneManifest(levelId: string) {
  const url = getRuntimeSceneManifestUrl(levelId)

  try {
    const response = await fetch(url, {
      cache: import.meta.env.DEV ? 'no-store' : 'default',
    })
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
): Promise<RuntimeSceneDocumentLoadResult> {
  const runtimeManifest = await loadRuntimeSceneManifest(levelId)
  if (runtimeManifest) {
    return {
      levelDefinition: runtimeManifest.levelDefinition,
      runtimeManifest,
      source: 'runtime-manifest',
    }
  }

  throw new Error(
    `${levelId}: missing cooked runtime scene manifest ${getRuntimeSceneManifestUrl(levelId)}. Run pnpm --dir apps/game cook:runtime-assets before gameplay.`,
  )
}
