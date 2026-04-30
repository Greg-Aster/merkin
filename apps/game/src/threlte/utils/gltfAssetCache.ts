import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { fixObjectMaterials } from './materialUtils'

THREE.Cache.enabled = true

const gltfLoader = new GLTFLoader()
const cacheUrlKey = '__gltfCacheUrl'
const cacheDisposedKey = '__gltfCacheDisposed'
const sharedMaterialsKey = '__gltfSharedMaterials'

interface GltfCacheEntry {
  promise: Promise<GLTF>
  gltf: GLTF | null
  refCount: number
  evictWhenUnused: boolean
}

export interface CloneCachedGltfSceneOptions {
  cloneMaterials?: boolean
}

const gltfCache = new Map<string, GltfCacheEntry>()

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
  gltfCache.delete(url)
}

function normalizeGltfUrl(url: string) {
  return url.trim()
}

export function loadCachedGltf(url: string) {
  const normalizedUrl = normalizeGltfUrl(url)
  if (!normalizedUrl) return Promise.reject(new Error('Missing GLTF URL.'))

  const cached = gltfCache.get(normalizedUrl)
  if (cached) return cached.promise

  const entry: GltfCacheEntry = {
    promise: Promise.resolve(null as unknown as GLTF),
    gltf: null,
    refCount: 0,
    evictWhenUnused: false,
  }

  entry.promise = gltfLoader
    .loadAsync(normalizedUrl)
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
  releaseEntryIfUnused(url, entry)
}

export function clearGltfCache() {
  for (const [url, entry] of gltfCache.entries()) {
    entry.evictWhenUnused = true
    releaseEntryIfUnused(url, entry)
  }

  THREE.Cache.clear()
}

export function getGltfCacheStats() {
  return {
    entries: gltfCache.size,
    retainedEntries: Array.from(gltfCache.entries()).map(([url, entry]) => ({
      url,
      loaded: Boolean(entry.gltf),
      refCount: entry.refCount,
      evictWhenUnused: entry.evictWhenUnused,
    })),
  }
}
