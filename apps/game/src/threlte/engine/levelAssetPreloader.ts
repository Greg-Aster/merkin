import { loadCachedGltf } from '../utils/gltfAssetCache'
import {
  type RuntimeAssetQualityTier,
  beginLevelRuntimeAssetScope,
  getLevelRuntimeAssetTier,
  preloadRuntimeAssetManifest,
  resolveRuntimeAssetInfoSync,
  resolveRuntimeAssetUrlSync,
} from './runtimeAssetManifest'
import { traceRuntimeCulling } from './runtimeCullingTrace'

export interface LevelAssetPreloadResult {
  levelId: string
  qualityTier: RuntimeAssetQualityTier | string
  requiredSourceUrls: string[]
  requiredResolvedUrls: string[]
  requiredBytes: number
  failures: Array<{ sourceUrl: string; resolvedUrl: string; message: string }>
}

export interface LevelAssetPrefetchResult {
  levelId: string
  qualityTier: RuntimeAssetQualityTier | string
  sourceUrls: string[]
  resolvedUrls: string[]
  prefetchBytes: number
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
  beginLevelRuntimeAssetScope(levelId, qualityTier, {
    maxTier: options.maxTier,
  })
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
  const resolvedPairs = uniqueSourceUrls
    .map(sourceUrl => ({
      sourceUrl,
      resolution:
        resolveRuntimeAssetInfoSync(sourceUrl, resolvedQualityTier, {
          levelId,
        }) ?? null,
    }))
    .map(({ sourceUrl, resolution }) => ({
      sourceUrl,
      resolvedUrl:
        resolution?.resolvedUrl ??
        resolveRuntimeAssetUrlSync(sourceUrl, resolvedQualityTier, {
          levelId,
        }) ??
        sourceUrl,
      sizeBytes: resolution?.sizeBytes ?? 0,
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
    resolvedPairs.map(async ({ sourceUrl, resolvedUrl, sizeBytes }) => {
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
        await loadCachedGltf(resolvedUrl, {
          sizeBytes,
          retention: 'required',
        })
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
      requiredBytes: resolvedPairs.reduce(
        (sum, pair) => sum + pair.sizeBytes,
        0,
      ),
      failureCount: failures.length,
    },
  })

  return {
    levelId,
    qualityTier: resolvedQualityTier,
    requiredSourceUrls: uniqueSourceUrls,
    requiredResolvedUrls: resolvedPairs.map(pair => pair.resolvedUrl),
    requiredBytes: resolvedPairs.reduce((sum, pair) => sum + pair.sizeBytes, 0),
    failures,
  }
}

export async function prefetchOptionalLevelRenderAssets(
  levelId: string,
  assetUrls: string[],
  qualityTier: RuntimeAssetQualityTier | string,
  options: LevelAssetPreloadOptions & { maxPrefetchCount?: number } = {},
): Promise<LevelAssetPrefetchResult> {
  const uniqueSourceUrls = [...new Set(assetUrls)].filter(Boolean)
  const maxPrefetchCount = options.maxPrefetchCount ?? 12
  if (uniqueSourceUrls.length === 0) {
    return {
      levelId,
      qualityTier,
      sourceUrls: [],
      resolvedUrls: [],
      prefetchBytes: 0,
      failures: [],
    }
  }

  beginLevelRuntimeAssetScope(levelId, qualityTier, {
    maxTier: options.maxTier,
  })
  const resolvedQualityTier = getLevelRuntimeAssetTier(levelId, qualityTier)
  const manifestStartedAt = performance.now()
  await preloadRuntimeAssetManifest()
  options.recordTiming?.(
    'level.prefetchAssets.manifest',
    performance.now() - manifestStartedAt,
  )

  const resolvedPairs = uniqueSourceUrls
    .map(sourceUrl => ({
      sourceUrl,
      resolution: resolveRuntimeAssetInfoSync(sourceUrl, resolvedQualityTier, {
        levelId,
      }),
    }))
    .map(({ sourceUrl, resolution }) => ({
      sourceUrl,
      resolvedUrl: resolution?.resolvedUrl ?? sourceUrl,
      sizeBytes: resolution?.sizeBytes ?? 0,
    }))
    .filter(pair => isGltfAsset(pair.resolvedUrl))
    .slice(0, maxPrefetchCount)

  const loadStartedAt = performance.now()
  const failures: LevelAssetPrefetchResult['failures'] = []

  await Promise.all(
    resolvedPairs.map(async ({ sourceUrl, resolvedUrl, sizeBytes }) => {
      try {
        traceRuntimeCulling({
          levelId,
          url: resolvedUrl,
          reason: 'asset-bundle-prefetch',
          culled: true,
          detail: {
            status: 'prefetching',
            sourceUrl,
            resolvedUrl,
            qualityTier: resolvedQualityTier,
          },
        })
        await loadCachedGltf(resolvedUrl, {
          sizeBytes,
          retention: 'prefetch',
          evictWhenUnused: true,
        })
        traceRuntimeCulling({
          levelId,
          url: resolvedUrl,
          reason: 'asset-bundle-prefetch',
          culled: false,
          detail: {
            status: 'prefetched',
            sourceUrl,
            resolvedUrl,
            qualityTier: resolvedQualityTier,
          },
        })
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown asset load error'
        failures.push({ sourceUrl, resolvedUrl, message })
        traceRuntimeCulling({
          levelId,
          url: resolvedUrl,
          reason: 'asset-bundle-prefetch',
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
    'level.prefetchAssets.load',
    performance.now() - loadStartedAt,
  )

  return {
    levelId,
    qualityTier: resolvedQualityTier,
    sourceUrls: resolvedPairs.map(pair => pair.sourceUrl),
    resolvedUrls: resolvedPairs.map(pair => pair.resolvedUrl),
    prefetchBytes: resolvedPairs.reduce((sum, pair) => sum + pair.sizeBytes, 0),
    failures,
  }
}
