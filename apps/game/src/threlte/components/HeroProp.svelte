<script lang="ts">
  import { T } from '@threlte/core'
  import { getContext } from 'svelte'
  import { createEventDispatcher, onDestroy, onMount } from 'svelte'
  import * as THREE from 'three'
  import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
  import {
    createObjectMaterialOverrideState,
    disposeObjectMaterialOverrideState,
    fixGLTFMaterials,
    syncObjectMaterialOverride,
  } from '../utils/materialUtils'
  import { EDITOR_MATERIAL_OVERRIDE_CONTEXT, type EditorMaterialOverrideStore } from '../editor/editorMaterialContext'

  const dispatch = createEventDispatcher()

  export let url: string

  let scene: THREE.Group | null = null
  let disposed = false
  let editorMaterialOverride = null
  const materialOverrideState = createObjectMaterialOverrideState()
  const textureLoader = new THREE.TextureLoader()
  let textureLoadToken = 0
  let overrideTextures: {
    map: THREE.Texture | null
    normalMap: THREE.Texture | null
    roughnessMap: THREE.Texture | null
    metalnessMap: THREE.Texture | null
    emissiveMap: THREE.Texture | null
    alphaMap: THREE.Texture | null
  } = {
    map: null,
    normalMap: null,
    roughnessMap: null,
    metalnessMap: null,
    emissiveMap: null,
    alphaMap: null,
  }
  const editorMaterialOverrideStore = getContext<EditorMaterialOverrideStore | undefined>(EDITOR_MATERIAL_OVERRIDE_CONTEXT)
  const unsubscribe = editorMaterialOverrideStore?.subscribe((value) => {
    editorMaterialOverride = value
  })

  function disposeTexture(texture: THREE.Texture | null) {
    texture?.dispose()
  }

  function disposeOverrideTextures() {
    disposeTexture(overrideTextures.map)
    disposeTexture(overrideTextures.normalMap)
    disposeTexture(overrideTextures.roughnessMap)
    disposeTexture(overrideTextures.metalnessMap)
    disposeTexture(overrideTextures.emissiveMap)
    disposeTexture(overrideTextures.alphaMap)
  }

  async function loadOverrideTexture(url: string | undefined, colorTexture = false) {
    if (!url) return null

    const texture = await textureLoader.loadAsync(url)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    if (colorTexture) {
      texture.colorSpace = THREE.SRGBColorSpace
    }
    texture.needsUpdate = true
    return texture
  }

  function applyOverrideTexturesToScene() {
    if (!scene) return

    scene.traverse((child) => {
      if (!(child instanceof THREE.Mesh) || !child.material) return

      const applyToMaterial = (material: THREE.Material) => {
        const target = material as THREE.Material & {
          map?: THREE.Texture | null
          normalMap?: THREE.Texture | null
          roughnessMap?: THREE.Texture | null
          metalnessMap?: THREE.Texture | null
          emissiveMap?: THREE.Texture | null
          alphaMap?: THREE.Texture | null
          transparent?: boolean
        }

        if (overrideTextures.map) target.map = overrideTextures.map
        if (overrideTextures.normalMap) target.normalMap = overrideTextures.normalMap
        if (overrideTextures.roughnessMap) target.roughnessMap = overrideTextures.roughnessMap
        if (overrideTextures.metalnessMap) target.metalnessMap = overrideTextures.metalnessMap
        if (overrideTextures.emissiveMap) target.emissiveMap = overrideTextures.emissiveMap
        if (overrideTextures.alphaMap) {
          target.alphaMap = overrideTextures.alphaMap
          target.transparent = true
        }

        target.needsUpdate = true
      }

      if (Array.isArray(child.material)) {
        child.material.forEach(applyToMaterial)
      } else {
        applyToMaterial(child.material)
      }
    })
  }

  async function syncOverrideTextures() {
    const token = ++textureLoadToken

    const nextTextures = {
      map: await loadOverrideTexture(editorMaterialOverride?.mapUrl, true),
      normalMap: await loadOverrideTexture(editorMaterialOverride?.normalMapUrl),
      roughnessMap: await loadOverrideTexture(editorMaterialOverride?.roughnessMapUrl),
      metalnessMap: await loadOverrideTexture(editorMaterialOverride?.metalnessMapUrl),
      emissiveMap: await loadOverrideTexture(editorMaterialOverride?.emissiveMapUrl, true),
      alphaMap: await loadOverrideTexture(editorMaterialOverride?.alphaMapUrl),
    }

    if (token !== textureLoadToken) {
      Object.values(nextTextures).forEach((texture) => texture?.dispose())
      return
    }

    disposeOverrideTextures()
    overrideTextures = nextTextures
    applyOverrideTexturesToScene()
  }

  onMount(() => {
    const loader = new GLTFLoader()

    void loader.loadAsync(url)
      .then((gltf) => {
        if (disposed) return
        scene = gltf.scene

        fixGLTFMaterials(gltf)
        scene.traverse((child) => {
          if (!(child instanceof THREE.Mesh)) return
          child.castShadow = true
          child.receiveShadow = true

          if (Array.isArray(child.material)) {
            child.material.forEach((material) => {
              const standardMaterial = material as THREE.MeshStandardMaterial
              if ('envMapIntensity' in standardMaterial) {
                standardMaterial.envMapIntensity = Math.max(standardMaterial.envMapIntensity ?? 0, 1.1)
              }
            })
            return
          }

          const standardMaterial = child.material as THREE.MeshStandardMaterial
          if ('envMapIntensity' in standardMaterial) {
            standardMaterial.envMapIntensity = Math.max(standardMaterial.envMapIntensity ?? 0, 1.1)
          }
        })

        syncObjectMaterialOverride(scene, editorMaterialOverride, materialOverrideState)
        applyOverrideTexturesToScene()

        dispatch('load', { scene })
      })
      .catch((error) => {
        if (disposed) return
        console.error(`❌ HeroProp failed to load: ${url}`, error)
        dispatch('error', { error, url })
      })
  })

  $: if (scene) {
    syncObjectMaterialOverride(scene, editorMaterialOverride, materialOverrideState)
    applyOverrideTexturesToScene()
  }

  $: void syncOverrideTextures()

  onDestroy(() => {
    disposed = true
    textureLoadToken += 1
    unsubscribe?.()
    disposeOverrideTextures()
    disposeObjectMaterialOverrideState(materialOverrideState)
  })
</script>

{#if scene}
  <T is={scene} />
{/if}
