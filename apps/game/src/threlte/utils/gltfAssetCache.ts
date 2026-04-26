import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js'

THREE.Cache.enabled = true

const gltfLoader = new GLTFLoader()
const gltfCache = new Map<string, Promise<GLTF>>()

function cloneMaterial(material: THREE.Material | THREE.Material[]) {
  return Array.isArray(material)
    ? material.map(entry => entry.clone())
    : material.clone()
}

export function loadCachedGltf(url: string) {
  const normalizedUrl = url.trim()
  if (!normalizedUrl) return Promise.reject(new Error('Missing GLTF URL.'))

  const cached = gltfCache.get(normalizedUrl)
  if (cached) return cached

  const pending = gltfLoader.loadAsync(normalizedUrl).catch(error => {
    gltfCache.delete(normalizedUrl)
    throw error
  })
  gltfCache.set(normalizedUrl, pending)
  return pending
}

export async function cloneCachedGltfScene(url: string) {
  const gltf = await loadCachedGltf(url)
  const source = gltf.scene ?? gltf.scenes?.[0] ?? new THREE.Group()
  const clone = source.clone(true)

  clone.traverse(child => {
    if (!(child instanceof THREE.Mesh) || !child.material) return
    child.material = cloneMaterial(child.material)
  })

  return clone
}
