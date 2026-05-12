import {
  type RuntimeSceneManifest,
  getRuntimeSceneManifestUrl,
} from '../engine/runtimeSceneManifest'
import {
  buildEditorPublishReadinessViewModel,
  getEditorPublishReadinessTerrainManifestUrl,
} from './editorPublishReadiness'
import type {
  EditorPublishReadinessViewModel,
  LoadEditorPublishReadinessInput,
  LoadedManifest,
  RuntimeAssetCookManifest,
  RuntimePrefabManifest,
  TerrainManifest,
} from './editorPublishReadinessContracts'

async function fetchJson<T>(
  fetchImpl: typeof fetch,
  url: string,
): Promise<LoadedManifest<T>> {
  try {
    const response = await fetchImpl(url, { cache: 'no-store' })
    if (!response.ok) {
      return { value: null, error: `${url} returned ${response.status}` }
    }
    return { value: (await response.json()) as T, error: '' }
  } catch (error) {
    return {
      value: null,
      error: error instanceof Error ? error.message : `${url} fetch failed`,
    }
  }
}

export async function loadEditorPublishReadiness(
  input: LoadEditorPublishReadinessInput,
): Promise<EditorPublishReadinessViewModel> {
  const fetchImpl = input.fetchImpl ?? fetch
  const runtimeAsset = await fetchJson<RuntimeAssetCookManifest>(
    fetchImpl,
    '/generated/runtime-game-assets/manifest.json',
  )
  const runtimeSceneUrl =
    runtimeAsset.value?.runtimeScenes?.[input.levelId]?.url ??
    getRuntimeSceneManifestUrl(input.levelId)
  const [runtimeScene, prefabManifest] = await Promise.all([
    fetchJson<RuntimeSceneManifest>(fetchImpl, runtimeSceneUrl),
    fetchJson<RuntimePrefabManifest>(
      fetchImpl,
      '/generated/runtime-game-assets/prefabs/manifest.json',
    ),
  ])
  const terrainManifestUrl = getEditorPublishReadinessTerrainManifestUrl(
    input.scene,
    runtimeScene.value,
  )
  const terrainManifest = terrainManifestUrl
    ? await fetchJson<TerrainManifest>(fetchImpl, terrainManifestUrl)
    : { value: null, error: '' }

  return buildEditorPublishReadinessViewModel({
    levelId: input.levelId,
    scene: input.scene,
    runtimeAssetManifest: runtimeAsset.value,
    runtimeAssetError: runtimeAsset.error,
    runtimeScene: runtimeScene.value,
    runtimeSceneError: runtimeScene.error,
    prefabManifest: prefabManifest.value,
    prefabError: prefabManifest.error,
    terrainManifest: terrainManifest.value,
    terrainError: terrainManifest.error,
  })
}
