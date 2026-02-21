<!-- 
  Threlte Asset Loading System
  Replaces AssetLoader.ts with reactive asset management
-->
<script lang="ts">
import { onMount, onDestroy, createEventDispatcher } from 'svelte'
import { writable } from 'svelte/store'
import { useLoader } from '@threlte/core'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

const dispatch = createEventDispatcher()

// Reactive stores for loading state
export const loadingStore = writable(false)
export const progressStore = writable(0)
export const errorStore = writable(null)
export const loadedAssetsStore = writable([])

let gltfLoader: GLTFLoader
let textureLoader: THREE.TextureLoader
let audioLoader: THREE.AudioLoader
let isInitialized = false

// Export loading state for external access
export let isLoading = false
export let loadingProgress = 0
export let loadingError = null
export let loadedAssets = []

onMount(async () => {
  console.log('📦 Initializing Threlte Asset Loading System...')
  
  try {
    // Initialize Three.js loaders
    gltfLoader = new GLTFLoader()
    textureLoader = new THREE.TextureLoader()
    audioLoader = new THREE.AudioLoader()
    
    isInitialized = true
    console.log('✅ Threlte Asset Loading System initialized')
  } catch (error) {
    console.error('❌ Failed to initialize Asset Loading System:', error)
    loadingError = error
    errorStore.set(error)
  }
})

/**
 * Update loading progress
 */
function updateProgress(progress: number, url: string) {
  loadingProgress = progress
  progressStore.set(progress)
  dispatch('loadingProgress', { url, progress })
}

/**
 * Load GLTF model
 */
export async function loadGLTF(url: string, onProgress?: (progress: number) => void) {
  if (!gltfLoader) {
    throw new Error('AssetLoader not initialized')
  }
  
  isLoading = true
  loadingStore.set(true)
  dispatch('loadingStart', { url })
  
  return new Promise((resolve, reject) => {
    gltfLoader.load(
      url,
      (gltf) => {
        isLoading = false
        loadingStore.set(false)
        loadedAssets.push(url)
        loadedAssetsStore.set([...loadedAssets])
        dispatch('loadingComplete', { url, asset: gltf })
        resolve(gltf)
      },
      (progress) => {
        const progressPercent = (progress.loaded / progress.total) * 100
        updateProgress(progressPercent, url)
        if (onProgress) onProgress(progressPercent)
      },
      (error) => {
        isLoading = false
        loadingStore.set(false)
        loadingError = error
        errorStore.set(error)
        dispatch('loadingError', { url, error })
        reject(error)
      }
    )
  })
}

/**
 * Load texture
 */
export async function loadTexture(url: string) {
  if (!textureLoader) {
    throw new Error('AssetLoader not initialized')
  }
  
  isLoading = true
  loadingStore.set(true)
  dispatch('loadingStart', { url })
  
  return new Promise((resolve, reject) => {
    textureLoader.load(
      url,
      (texture) => {
        isLoading = false
        loadingStore.set(false)
        loadedAssets.push(url)
        loadedAssetsStore.set([...loadedAssets])
        dispatch('loadingComplete', { url, asset: texture })
        resolve(texture)
      },
      (progress) => {
        const progressPercent = (progress.loaded / progress.total) * 100
        updateProgress(progressPercent, url)
      },
      (error) => {
        isLoading = false
        loadingStore.set(false)
        loadingError = error
        errorStore.set(error)
        dispatch('loadingError', { url, error })
        reject(error)
      }
    )
  })
}

/**
 * Load audio
 */
export async function loadAudio(url: string) {
  if (!audioLoader) {
    throw new Error('AssetLoader not initialized')
  }
  
  isLoading = true
  loadingStore.set(true)
  dispatch('loadingStart', { url })
  
  return new Promise((resolve, reject) => {
    audioLoader.load(
      url,
      (audioBuffer) => {
        isLoading = false
        loadingStore.set(false)
        loadedAssets.push(url)
        loadedAssetsStore.set([...loadedAssets])
        dispatch('loadingComplete', { url, asset: audioBuffer })
        resolve(audioBuffer)
      },
      (progress) => {
        const progressPercent = (progress.loaded / progress.total) * 100
        updateProgress(progressPercent, url)
      },
      (error) => {
        isLoading = false
        loadingStore.set(false)
        loadingError = error
        errorStore.set(error)
        dispatch('loadingError', { url, error })
        reject(error)
      }
    )
  })
}

/**
 * Preload assets
 */
export async function preloadAssets(urls: string[]) {
  if (!assetLoader) {
    throw new Error('AssetLoader not initialized')
  }
  
  isLoading = true
  loadingStore.set(true)
  dispatch('preloadStart', { urls })
  
  try {
    const results = []
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i]
      const progress = (i / urls.length) * 100
      
      loadingProgress = progress
      progressStore.set(progress)
      dispatch('preloadProgress', { progress, current: url })
      
      // Determine asset type and load accordingly
      if (url.endsWith('.gltf') || url.endsWith('.glb')) {
        results.push(await loadGLTF(url))
      } else if (url.match(/\.(jpg|jpeg|png|webp)$/)) {
        results.push(await loadTexture(url))
      } else if (url.match(/\.(mp3|wav|ogg)$/)) {
        results.push(await loadAudio(url))
      }
    }
    
    isLoading = false
    loadingStore.set(false)
    loadingProgress = 100
    progressStore.set(100)
    dispatch('preloadComplete', { results })
    
    return results
  } catch (error) {
    isLoading = false
    loadingStore.set(false)
    loadingError = error
    errorStore.set(error)
    dispatch('preloadError', { error })
    throw error
  }
}

/**
 * Get loading statistics
 */
export function getLoadingStats() {
  return {
    isLoading,
    progress: loadingProgress,
    loadedCount: loadedAssets.length,
    error: loadingError
  }
}

onDestroy(() => {
  // Clean up loaders
  gltfLoader = null
  textureLoader = null
  audioLoader = null
  console.log('🧹 Threlte Asset Loading System disposed')
})

// Export loaders for external access
export { gltfLoader, textureLoader, audioLoader }
</script>

<!-- No visual output - this is a system component -->

{#if isInitialized}
  <slot />
{/if}