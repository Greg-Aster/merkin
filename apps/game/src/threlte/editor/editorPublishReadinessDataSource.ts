import {
  type RuntimeSceneManifest,
  getRuntimeSceneManifestUrl,
} from '../engine/runtimeSceneManifest'
import {
  buildEditorPublishReadinessViewModel,
  getEditorPublishReadinessTerrainManifestUrl,
  getEditorStyleBakeMetadataUrl,
  isEditorStyleBakeCandidate,
} from './editorPublishReadiness'
import type {
  EditorPublishReadinessViewModel,
  LoadEditorPublishReadinessInput,
  LoadedManifest,
  MeshColliderBakeMetadata,
  RuntimeAssetCookManifest,
  RuntimePrefabManifest,
  StyleBakeMetadata,
  TerrainManifest,
} from './editorPublishReadinessContracts'
import type { EditorTerrainSourceAssetStatus } from './editorTerrainPipeline'

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

async function fetchTerrainStatus(
  fetchImpl: typeof fetch,
  input: LoadEditorPublishReadinessInput,
): Promise<{
  sourceAssets: EditorTerrainSourceAssetStatus[]
  missingSourceAssets: EditorTerrainSourceAssetStatus[]
}> {
  if (input.terrainSourceAssets || input.missingTerrainSourceAssets) {
    return {
      sourceAssets: input.terrainSourceAssets ?? [],
      missingSourceAssets:
        input.missingTerrainSourceAssets ??
        (input.terrainSourceAssets ?? []).filter(
          source => source.exists === false,
        ),
    }
  }

  try {
    const response = await fetchImpl('/api/editor-terrain/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        levelId: input.levelId,
        scene: input.scene,
      }),
    })
    if (!response.ok) return { sourceAssets: [], missingSourceAssets: [] }
    const payload = await response.json()
    if (!payload?.success) return { sourceAssets: [], missingSourceAssets: [] }
    const sourceAssets: EditorTerrainSourceAssetStatus[] = Array.isArray(
      payload.sourceAssets,
    )
      ? payload.sourceAssets
      : []
    const missingSourceAssets = Array.isArray(payload.missingSourceAssets)
      ? payload.missingSourceAssets
      : sourceAssets.filter(source => source.exists === false)
    return { sourceAssets, missingSourceAssets }
  } catch {
    return { sourceAssets: [], missingSourceAssets: [] }
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
  const terrainStatus = await fetchTerrainStatus(fetchImpl, input)
  const colliderMetadataEntries = await Promise.all(
    [
      ...new Set(
        (input.scene?.nodes ?? [])
          .map(node => node.collision?.colliderMetadataUrl?.trim() ?? '')
          .filter(Boolean),
      ),
    ].map(
      async url =>
        [
          url,
          await fetchJson<MeshColliderBakeMetadata>(fetchImpl, url),
        ] as const,
    ),
  )
  const styleBakeMetadataEntries = input.styleBakeMetadata
    ? Object.entries(input.styleBakeMetadata)
    : await Promise.all(
        [
          ...new Set(
            (input.scene?.nodes ?? [])
              .filter(isEditorStyleBakeCandidate)
              .map(node => getEditorStyleBakeMetadataUrl(node))
              .filter(Boolean),
          ),
        ].map(
          async url =>
            [
              url,
              await fetchJson<StyleBakeMetadata>(fetchImpl, url),
            ] as const,
        ),
      )

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
    terrainSourceAssets: terrainStatus.sourceAssets,
    missingTerrainSourceAssets: terrainStatus.missingSourceAssets,
    colliderMetadata: Object.fromEntries(colliderMetadataEntries),
    styleBakeMetadata: Object.fromEntries(styleBakeMetadataEntries),
  })
}
