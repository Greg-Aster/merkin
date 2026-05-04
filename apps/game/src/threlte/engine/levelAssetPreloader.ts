import { loadCachedGltf } from '../utils/gltfAssetCache'
import { traceRuntimeCulling } from './runtimeCullingTrace'
import {
  beginLevelRuntimeAssetScope,
  getLevelRuntimeAssetTier,
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

export interface LevelAssetPreloadOptions {
  maxTier?: RuntimeAssetQualityTier | string
  recordTiming?: (name: string, durationMs: number) => void
}

function isGltfAsset(url: string) {
  return /\.(glb|gltf)(?:[?#].*)?$/i.test(url)
}

export async function prepareRequiredLevelRenderAssets(
  levelId: string,
  requiredAssetUrls: string[],
  qualityTier: RuntimeAssetQualityTier | string,
  options: LevelAssetPreloadOptions = {},
): Promise<LevelAssetPreloadResult> {
  const uniqueSourceUrls = [...new Set(requiredAssetUrls)].filter(Boolean)
  beginLevelRuntimeAssetScope(levelId, qualityTier, { maxTier: options.maxTier })
  const resolvedQualityTier = getLevelRuntimeAssetTier(levelId, qualityTier)
  traceRuntimeCulling({
    levelId,
    reason: 'required-asset-preload',
    culled: true,
    detail: {
      status: 'start',
      requiredAssetCount: uniqueSourceUrls.length,
      requestedQualityTier: qualityTier,
      resolvedQualityTier,
      maxTier: options.maxTier,
    },
  })

  const manifestStartedAt = performance.now()
  await preloadRuntimeAssetManifest()
  options.recordTiming?.(
    'level.requiredAssets.manifest',
    performance.now() - manifestStartedAt,
  )

  const resolveStartedAt = performance.now()
  const resolvedPairs = uniqueSourceUrls.map(sourceUrl => ({
    sourceUrl,
    resolvedUrl:
      resolveRuntimeAssetUrlSync(sourceUrl, resolvedQualityTier, { levelId }) ??
      sourceUrl,
  }))
  for (const { sourceUrl, resolvedUrl } of resolvedPairs) {
    traceRuntimeCulling({
      levelId,
      url: resolvedUrl,
      reason: 'required-asset-preload',
      culled: true,
      detail: {
        status: 'resolved',
        sourceUrl,
        resolvedUrl,
        qualityTier: resolvedQualityTier,
      },
    })
  }
  options.recordTiming?.(
    'level.requiredAssets.resolve',
    performance.now() - resolveStartedAt,
  )

  const loadStartedAt = performance.now()
  const failures: LevelAssetPreloadResult['failures'] = []

  await Promise.all(
    resolvedPairs.map(async ({ sourceUrl, resolvedUrl }) => {
      if (!isGltfAsset(resolvedUrl)) return

      try {
        traceRuntimeCulling({
          levelId,
          url: resolvedUrl,
          reason: 'required-asset-preload',
          culled: true,
          detail: {
            status: 'loading',
            sourceUrl,
            resolvedUrl,
          },
        })
        await loadCachedGltf(resolvedUrl)
        traceRuntimeCulling({
          levelId,
          url: resolvedUrl,
          reason: 'required-asset-preload',
          culled: false,
          detail: {
            status: 'loaded',
            sourceUrl,
            resolvedUrl,
          },
        })
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown asset load error'
        failures.push({
          sourceUrl,
          resolvedUrl,
          message,
        })
        traceRuntimeCulling({
          levelId,
          url: resolvedUrl,
          reason: 'required-asset-preload',
          culled: true,
          detail: {
            status: 'failed',
            sourceUrl,
            resolvedUrl,
            message,
          },
        })
      }
    }),
  )

  options.recordTiming?.(
    'level.requiredAssets.preload',
    performance.now() - loadStartedAt,
  )
  traceRuntimeCulling({
    levelId,
    reason: 'required-asset-preload',
    culled: failures.length > 0,
    detail: {
      status: failures.length > 0 ? 'failed' : 'complete',
      requiredAssetCount: uniqueSourceUrls.length,
      resolvedAssetCount: resolvedPairs.length,
      failureCount: failures.length,
    },
  })

  return {
    levelId,
    qualityTier: resolvedQualityTier,
    requiredSourceUrls: uniqueSourceUrls,
    requiredResolvedUrls: resolvedPairs.map(pair => pair.resolvedUrl),
    failures,
  }
}
