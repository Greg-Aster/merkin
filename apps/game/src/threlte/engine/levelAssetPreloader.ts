import { recordSystemTiming } from '../features/performance/stores/performanceStore'
import { loadCachedGltf } from '../utils/gltfAssetCache'
import {
  beginLevelRuntimeAssetScope,
  preloadRuntimeAssetManifest,
  resolveRuntimeAssetUrlSync,
  type RuntimeAssetQualityTier,
} from './runtimeAssetManifest'

export interface LevelAssetPreloadResult {
  levelId: string
  qualityTier: RuntimeAssetQualityTier | string
  requiredSourceUrls: string[]
  requiredResolvedUrls: string[]
  failures: Array<{ sourceUrl: string; resolvedUrl: string; message: string }>
}

function isGltfAsset(url: string) {
  return /\.(glb|gltf)(?:[?#].*)?$/i.test(url)
}

export async function prepareRequiredLevelRenderAssets(
  levelId: string,
  requiredAssetUrls: string[],
  qualityTier: RuntimeAssetQualityTier | string,
): Promise<LevelAssetPreloadResult> {
  const uniqueSourceUrls = [...new Set(requiredAssetUrls)].filter(Boolean)
  beginLevelRuntimeAssetScope(levelId, qualityTier)

  const manifestStartedAt = performance.now()
  await preloadRuntimeAssetManifest()
  recordSystemTiming(
    'level.requiredAssets.manifest',
    performance.now() - manifestStartedAt,
  )

  const resolveStartedAt = performance.now()
  const resolvedPairs = uniqueSourceUrls.map(sourceUrl => ({
    sourceUrl,
    resolvedUrl:
      resolveRuntimeAssetUrlSync(sourceUrl, qualityTier, { levelId }) ??
      sourceUrl,
  }))
  recordSystemTiming(
    'level.requiredAssets.resolve',
    performance.now() - resolveStartedAt,
  )

  const loadStartedAt = performance.now()
  const failures: LevelAssetPreloadResult['failures'] = []

  await Promise.all(
    resolvedPairs.map(async ({ sourceUrl, resolvedUrl }) => {
      if (!isGltfAsset(resolvedUrl)) return

      try {
        await loadCachedGltf(resolvedUrl)
      } catch (error) {
        failures.push({
          sourceUrl,
          resolvedUrl,
          message:
            error instanceof Error ? error.message : 'Unknown asset load error',
        })
      }
    }),
  )

  recordSystemTiming(
    'level.requiredAssets.preload',
    performance.now() - loadStartedAt,
  )

  return {
    levelId,
    qualityTier,
    requiredSourceUrls: uniqueSourceUrls,
    requiredResolvedUrls: resolvedPairs.map(pair => pair.resolvedUrl),
    failures,
  }
}
