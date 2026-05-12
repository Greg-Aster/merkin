import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { fixObjectMaterials } from './materialUtils'

THREE.Cache.enabled = true

const gltfLoader = new GLTFLoader()
const cacheUrlKey = '__gltfCacheUrl'
const cacheDisposedKey = '__gltfCacheDisposed'
const sharedMaterialsKey = '__gltfSharedMaterials'
const maxConcurrentGltfLoads = 2
const unknownAssetSizeBytes = 8 * 1024 * 1024

interface GltfCacheEntry {
  promise: Promise<GLTF>
  gltf: GLTF | null
  refCount: number
  evictWhenUnused: boolean
  lastUsedAt: number
  sizeBytes: number
  retention: 'required' | 'streamed' | 'prefetch'
}

export interface CloneCachedGltfSceneOptions {
  cloneMaterials?: boolean
}

export interface LoadCachedGltfOptions {
  sizeBytes?: number
  retention?: 'required' | 'streamed' | 'prefetch'
  evictWhenUnused?: boolean
}

const gltfCache = new Map<string, GltfCacheEntry>()
let activeGltfLoads = 0
const pendingGltfLoads: Array<{
  url: string
  resolve: (gltf: GLTF) => void
  reject: (error: unknown) => void
}> = []

function nowMs() {
  return typeof performance !== 'undefined' ? performance.now() : Date.now()
}

function cloneMaterial(material: THREE.Material | THREE.Material[]) {
  return Array.isArray(material)
    ? material.map(entry => entry.clone())
    : material.clone()
}

function getMaterialTextures(material: THREE.Material) {
  const textures = new Set<THREE.Texture>()

  for (const value of Object.values(material)) {
    if (value instanceof THREE.Texture) {
      textures.add(value)
    }
  }

  return textures
}

function disposeMaterial(material: THREE.Material) {
  material.dispose?.()
}

function collectSceneResources(root: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>()
  const materials = new Set<THREE.Material>()
  const textures = new Set<THREE.Texture>()

  root.traverse(child => {
    if (!(child instanceof THREE.Mesh)) return

    if (child.geometry) {
      geometries.add(child.geometry)
    }

    const childMaterials = Array.isArray(child.material)
      ? child.material
      : [child.material]

    for (const material of childMaterials) {
      if (!material) continue
      materials.add(material)
      for (const texture of getMaterialTextures(material)) {
        textures.add(texture)
      }
    }
  })

  return { geometries, materials, textures }
}

function disposeGltfSource(gltf: GLTF) {
  const geometries = new Set<THREE.BufferGeometry>()
  const materials = new Set<THREE.Material>()
  const textures = new Set<THREE.Texture>()

  for (const scene of gltf.scenes ?? []) {
    const resources = collectSceneResources(scene)
    resources.geometries.forEach(geometry => geometries.add(geometry))
    resources.materials.forEach(material => materials.add(material))
    resources.textures.forEach(texture => textures.add(texture))
  }

  if (gltf.scene && !gltf.scenes?.includes(gltf.scene)) {
    const resources = collectSceneResources(gltf.scene)
    resources.geometries.forEach(geometry => geometries.add(geometry))
    resources.materials.forEach(material => materials.add(material))
    resources.textures.forEach(texture => textures.add(texture))
  }

  materials.forEach(disposeMaterial)
  geometries.forEach(geometry => geometry.dispose())
  textures.forEach(texture => texture.dispose())
}

function disposeCloneResources(root: THREE.Object3D) {
  if (root.userData[sharedMaterialsKey]) return

  const resources = collectSceneResources(root)
  resources.materials.forEach(disposeMaterial)
}

function releaseEntryIfUnused(url: string, entry: GltfCacheEntry) {
  if (!entry.evictWhenUnused || entry.refCount > 0) return

  if (entry.gltf) {
    disposeGltfSource(entry.gltf)
  }
  THREE.Cache.remove?.(url)
  gltfCache.delete(url)
}

function normalizeGltfUrl(url: string) {
  return url.trim()
}

function normalizeAssetSizeBytes(sizeBytes: number | undefined) {
  return Number.isFinite(sizeBytes) && Number(sizeBytes) > 0
    ? Number(sizeBytes)
    : unknownAssetSizeBytes
}

function getRetentionRank(retention: GltfCacheEntry['retention']) {
  switch (retention) {
    case 'prefetch':
      return 0
    case 'streamed':
      return 1
    case 'required':
      return 2
    default:
      return 1
  }
}

function getRuntimeMemoryPressureLevel() {
  if (typeof navigator === 'undefined') return 'normal'
  const connection = (navigator as any).connection
  const memory = (navigator as any).deviceMemory
  const cores = navigator.hardwareConcurrency

  if (connection?.saveData) return 'high'
  if (typeof memory === 'number' && memory <= 4) return 'high'
  if (typeof cores === 'number' && cores > 0 && cores <= 4) return 'high'
  if (['slow-2g', '2g', '3g'].includes(connection?.effectiveType)) return 'high'
  if (typeof memory === 'number' && memory <= 8) return 'medium'
  return 'normal'
}

function updateEntryPolicy(
  entry: GltfCacheEntry,
  options: LoadCachedGltfOptions,
) {
  entry.sizeBytes = Math.max(
    entry.sizeBytes,
    normalizeAssetSizeBytes(options.sizeBytes),
  )
  const nextRetention = options.retention ?? entry.retention
  if (getRetentionRank(nextRetention) > getRetentionRank(entry.retention)) {
    entry.retention = nextRetention
  }
  entry.evictWhenUnused =
    nextRetention === 'required'
      ? false
      : entry.evictWhenUnused || Boolean(options.evictWhenUnused)
}

function pumpGltfLoadQueue() {
  while (
    activeGltfLoads < maxConcurrentGltfLoads &&
    pendingGltfLoads.length > 0
  ) {
    const request = pendingGltfLoads.shift()
    if (!request) return

    activeGltfLoads += 1
    gltfLoader
      .loadAsync(request.url)
      .then(request.resolve, request.reject)
      .finally(() => {
        activeGltfLoads = Math.max(0, activeGltfLoads - 1)
        pumpGltfLoadQueue()
      })
  }
}

function loadGltfWithBudget(url: string) {
  return new Promise<GLTF>((resolve, reject) => {
    pendingGltfLoads.push({ url, resolve, reject })
    pumpGltfLoadQueue()
  })
}

export function loadCachedGltf(
  url: string,
  options: LoadCachedGltfOptions = {},
) {
  const normalizedUrl = normalizeGltfUrl(url)
  if (!normalizedUrl) return Promise.reject(new Error('Missing GLTF URL.'))

  const cached = gltfCache.get(normalizedUrl)
  if (cached) {
    updateEntryPolicy(cached, options)
    return cached.promise
  }

  const entry: GltfCacheEntry = {
    promise: Promise.resolve(null as unknown as GLTF),
    gltf: null,
    refCount: 0,
    evictWhenUnused: Boolean(options.evictWhenUnused),
    lastUsedAt: nowMs(),
    sizeBytes: normalizeAssetSizeBytes(options.sizeBytes),
    retention: options.retention ?? 'streamed',
  }

  entry.promise = loadGltfWithBudget(normalizedUrl)
    .then(gltf => {
      for (const scene of gltf.scenes ?? []) {
        fixObjectMaterials(scene)
      }
      if (gltf.scene && !gltf.scenes?.includes(gltf.scene)) {
        fixObjectMaterials(gltf.scene)
      }
      entry.gltf = gltf
      releaseEntryIfUnused(normalizedUrl, entry)
      return gltf
    })
    .catch(error => {
      gltfCache.delete(normalizedUrl)
      throw error
    })

  gltfCache.set(normalizedUrl, entry)
  return entry.promise
}

export async function cloneCachedGltfScene(
  url: string,
  options: CloneCachedGltfSceneOptions = {},
) {
  const normalizedUrl = normalizeGltfUrl(url)
  const gltf = await loadCachedGltf(url)
  const entry = gltfCache.get(normalizedUrl)
  const source = gltf.scene ?? gltf.scenes?.[0] ?? new THREE.Group()
  const clone = source.clone(true)
  const cloneMaterials = options.cloneMaterials ?? true

  if (entry) {
    entry.refCount += 1
    entry.lastUsedAt = nowMs()
    clone.userData[cacheUrlKey] = normalizedUrl
    clone.userData[cacheDisposedKey] = false
    clone.userData[sharedMaterialsKey] = !cloneMaterials
  }

  if (cloneMaterials) {
    clone.traverse(child => {
      if (!(child instanceof THREE.Mesh) || !child.material) return
      child.material = cloneMaterial(child.material)
    })
  }

  return clone
}

export function disposeCachedGltfScene(root: THREE.Object3D | null) {
  if (!root) return

  const url = root.userData[cacheUrlKey] as string | undefined
  if (root.userData[cacheDisposedKey]) return
  root.userData[cacheDisposedKey] = true

  disposeCloneResources(root)

  if (!url) return
  const entry = gltfCache.get(url)
  if (!entry) return

  entry.refCount = Math.max(0, entry.refCount - 1)
  entry.lastUsedAt = nowMs()
  releaseEntryIfUnused(url, entry)
}

export function evictUnusedGltfCacheEntries(
  options: {
    maxUnreferencedEntries?: number
    maxUnusedAgeMs?: number
    maxUnreferencedBytes?: number
    memoryPressure?: 'normal' | 'medium' | 'high'
  } = {},
) {
  const pressure = options.memoryPressure ?? getRuntimeMemoryPressureLevel()
  const maxUnreferencedEntries =
    options.maxUnreferencedEntries ??
    (pressure === 'high' ? 1 : pressure === 'medium' ? 2 : 4)
  const maxUnusedAgeMs =
    options.maxUnusedAgeMs ??
    (pressure === 'high' ? 2_000 : pressure === 'medium' ? 5_000 : 8_000)
  const maxUnreferencedBytes =
    options.maxUnreferencedBytes ??
    (pressure === 'high'
      ? 32 * 1024 * 1024
      : pressure === 'medium'
        ? 64 * 1024 * 1024
        : 128 * 1024 * 1024)
  const currentTime = nowMs()
  const unusedEntries = Array.from(gltfCache.entries())
    .filter(([, entry]) => entry.gltf && entry.refCount === 0)
    .sort(
      ([, left], [, right]) =>
        getRetentionRank(left.retention) - getRetentionRank(right.retention) ||
        left.lastUsedAt - right.lastUsedAt,
    )
  const overBudgetCount = Math.max(
    0,
    unusedEntries.length - Math.max(0, maxUnreferencedEntries),
  )
  const overBudgetUrls = new Set(
    unusedEntries.slice(0, overBudgetCount).map(([url]) => url),
  )
  let unusedBytes = unusedEntries.reduce(
    (sum, [, entry]) => sum + entry.sizeBytes,
    0,
  )
  const overByteBudgetUrls = new Set<string>()
  for (const [url, entry] of unusedEntries) {
    if (unusedBytes <= maxUnreferencedBytes) break
    overByteBudgetUrls.add(url)
    unusedBytes -= entry.sizeBytes
  }

  for (const [url, entry] of unusedEntries) {
    const stale = currentTime - entry.lastUsedAt >= maxUnusedAgeMs
    if (
      !stale &&
      !overBudgetUrls.has(url) &&
      !overByteBudgetUrls.has(url) &&
      !(pressure === 'high' && entry.retention === 'prefetch')
    ) {
      continue
    }

    entry.evictWhenUnused = true
    releaseEntryIfUnused(url, entry)
  }
}

export function clearGltfCache() {
  for (const [url, entry] of gltfCache.entries()) {
    entry.evictWhenUnused = true
    releaseEntryIfUnused(url, entry)
  }

  THREE.Cache.clear()
}

export function getGltfCacheStats() {
  const retainedEntries = Array.from(gltfCache.entries()).map(
    ([url, entry]) => ({
      url,
      loaded: Boolean(entry.gltf),
      refCount: entry.refCount,
      evictWhenUnused: entry.evictWhenUnused,
      retention: entry.retention,
      sizeBytes: entry.sizeBytes,
    }),
  )
  const loadedEntries = retainedEntries.filter(entry => entry.loaded)
  const pendingEntries = retainedEntries.filter(entry => !entry.loaded)
  const referencedEntries = retainedEntries.filter(entry => entry.refCount > 0)
  const unreferencedEntries = retainedEntries.filter(
    entry => entry.refCount === 0,
  )

  return {
    entries: gltfCache.size,
    loadedEntries: loadedEntries.length,
    pendingEntries: pendingEntries.length,
    referencedEntries: referencedEntries.length,
    unreferencedEntries: unreferencedEntries.length,
    loadedBytes: loadedEntries.reduce((sum, entry) => sum + entry.sizeBytes, 0),
    pendingBytes: pendingEntries.reduce(
      (sum, entry) => sum + entry.sizeBytes,
      0,
    ),
    referencedBytes: referencedEntries.reduce(
      (sum, entry) => sum + entry.sizeBytes,
      0,
    ),
    unreferencedBytes: unreferencedEntries.reduce(
      (sum, entry) => sum + entry.sizeBytes,
      0,
    ),
    retainedEntries,
  }
}
