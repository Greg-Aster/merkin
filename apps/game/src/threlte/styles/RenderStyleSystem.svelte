<script lang="ts">
  import { onDestroy, onMount, createEventDispatcher, getContext } from 'svelte'
  import { T, useThrelte } from '@threlte/core'
  import * as THREE from 'three'
  import type { SystemRegistry } from '../core/LevelSystem'
  import { qualityLevelStore, qualitySettingsStore } from '../features/performance/stores/performanceStore'
  import { shouldEnableSceneShadows } from '../features/performance/utils/runtimeSceneBudget'
  import {
    createToonGradientMap,
    findClosestPaletteColor,
    getPalette,
    type ColorPalette,
    type StylePreset,
  } from './StylePalettes'

  type MaterialSet = THREE.Material | THREE.Material[]
  type ChildObjectEvent = THREE.Event & { child?: THREE.Object3D }

  const dispatch = createEventDispatcher()
  const registry = getContext<SystemRegistry | undefined>('systemRegistry')
  const { scene, renderer } = useThrelte()
  const isDev = import.meta.env.DEV

  export let stylePreset: StylePreset = 'site'
  export let enableOutlines = true
  export let enableToonShading = true
  export let flattenMaterials = true
  export let usePaintedOutlines = true
  export let outlineThickness = 0.03
  export let outlineOpacity = 0.88

  export let enableStyleLighting = true
  export let ambientColor = ''
  export let ambientIntensity = 10.4
  export let sunIntensity = 0.8
  export let fillIntensity = 0.3
  export let toneMappingExposure = 1.2

  let isInitialized = false
  let currentPalette: ColorPalette = getPalette(stylePreset)
  let toonGradientMap: THREE.Texture | null = null
  const originalMaterials = new Map<string, MaterialSet>()
  const processedMaterials = new Map<string, MaterialSet>()
  const outlineShells = new Map<string, THREE.Mesh>()
  const watchedObjects = new Map<
    THREE.Object3D,
    {
      onChildAdded: (event: THREE.Event) => void
      onChildRemoved: (event: THREE.Event) => void
    }
  >()

  function disposeMaterialSet(materialSet: MaterialSet) {
    if (Array.isArray(materialSet)) {
      materialSet.forEach((material) => material.dispose())
      return
    }

    materialSet.dispose()
  }

  function resolveAmbientColor() {
    if (!ambientColor) return currentPalette.ambient

    try {
      return new THREE.Color(ambientColor)
    } catch (error) {
      console.warn('Failed to resolve custom ambient color for render style:', error)
      return currentPalette.ambient
    }
  }

  function setupRenderer() {
    if (!renderer) return

    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = toneMappingExposure
    renderer.shadowMap.enabled = shouldEnableSceneShadows($qualityLevelStore, $qualitySettingsStore)
    if (renderer.shadowMap.enabled) {
      renderer.shadowMap.type = THREE.PCFSoftShadowMap
    }
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.setClearColor(currentPalette.sky, 1.0)
  }

  function rebuildGradientMap() {
    toonGradientMap?.dispose()
    toonGradientMap = createToonGradientMap(currentPalette.shadow, currentPalette.sun)
  }

  function getMaterialKey(mesh: THREE.Mesh) {
    return `${mesh.uuid}:material`
  }

  function getOutlineKey(mesh: THREE.Mesh) {
    return `${mesh.uuid}:outline`
  }

  function getBaseColorFromObjectName(objectName: string) {
    const normalizedName = objectName.toLowerCase()

    if (normalizedName.includes('tree') || normalizedName.includes('birch') || normalizedName.includes('maple')) {
      return currentPalette.trees.clone()
    }

    if (normalizedName.includes('grass') || normalizedName.includes('lawn') || normalizedName.includes('fern')) {
      return currentPalette.grass.clone()
    }

    if (normalizedName.includes('flower') || normalizedName.includes('petal')) {
      return currentPalette.flowers.clone()
    }

    if (normalizedName.includes('water') || normalizedName.includes('ocean') || normalizedName.includes('lake')) {
      return currentPalette.water.clone()
    }

    if (normalizedName.includes('sky') || normalizedName.includes('cloud')) {
      return currentPalette.skyGradient.clone()
    }

    return currentPalette.earth.clone()
  }

  function getNormalizedMaterialColor(material: THREE.Material, objectName: string) {
    const candidateMaterial = material as THREE.Material & { color?: THREE.Color | string | number }
    const fallbackColor = getBaseColorFromObjectName(objectName)

    if (!candidateMaterial.color) {
      return fallbackColor
    }

    try {
      const sourceColor =
        candidateMaterial.color instanceof THREE.Color
          ? candidateMaterial.color
          : new THREE.Color(candidateMaterial.color as string | number)
      const paletteColor = findClosestPaletteColor(sourceColor, currentPalette)
      return flattenMaterials
        ? paletteColor.clone().lerp(sourceColor, 0.12)
        : paletteColor.clone().lerp(sourceColor, 0.32)
    } catch (error) {
      console.warn('Failed to normalize material color for render style:', error)
      return fallbackColor
    }
  }

  function shouldKeepColorMap(material: THREE.Material) {
    const candidateMaterial = material as THREE.Material & {
      map?: THREE.Texture | null
      transparent?: boolean
      opacity?: number
      alphaTest?: number
    }

    if (!candidateMaterial.map) return false
    if (!flattenMaterials) return true

    return Boolean(
      candidateMaterial.transparent
      || (candidateMaterial.opacity ?? 1) < 0.999
      || (candidateMaterial.alphaTest ?? 0) > 0
    )
  }

  function createStylizedMaterial(originalMaterial: THREE.Material, objectName: string) {
    const sourceMaterial = originalMaterial as THREE.Material & {
      color?: THREE.Color
      map?: THREE.Texture | null
      normalMap?: THREE.Texture | null
      alphaMap?: THREE.Texture | null
      emissive?: THREE.Color
      emissiveMap?: THREE.Texture | null
      emissiveIntensity?: number
      transparent?: boolean
      opacity?: number
      alphaTest?: number
      side?: THREE.Side
      aoMap?: THREE.Texture | null
      flatShading?: boolean
    }

    const toonMaterial = new THREE.MeshToonMaterial({
      color: getNormalizedMaterialColor(originalMaterial, objectName),
      map: shouldKeepColorMap(originalMaterial) ? sourceMaterial.map ?? null : null,
      normalMap: flattenMaterials ? null : sourceMaterial.normalMap ?? null,
      alphaMap: sourceMaterial.alphaMap ?? null,
      transparent: sourceMaterial.transparent ?? false,
      opacity: sourceMaterial.opacity ?? 1,
      alphaTest: sourceMaterial.alphaTest ?? 0,
      side: sourceMaterial.side ?? THREE.FrontSide,
      aoMap: sourceMaterial.aoMap ?? null,
      emissive: sourceMaterial.emissive ?? new THREE.Color(0x000000),
      emissiveMap: sourceMaterial.emissiveMap ?? null,
      emissiveIntensity: sourceMaterial.emissiveIntensity ?? 0,
      gradientMap: toonGradientMap,
      fog: true,
    })

    toonMaterial.dithering = true
    toonMaterial.flatShading = flattenMaterials || Boolean(sourceMaterial.flatShading)

    return toonMaterial
  }

  function createPaintedOutlineMaterial() {
    const outlineMaterial = new THREE.MeshBasicMaterial({
      color: currentPalette.outline.clone(),
      side: THREE.BackSide,
      transparent: true,
      opacity: outlineOpacity,
      depthWrite: false,
      depthTest: true,
      toneMapped: false,
      fog: true,
    })

    if (usePaintedOutlines) {
      outlineMaterial.onBeforeCompile = (shader) => {
        shader.vertexShader = shader.vertexShader
          .replace(
            '#include <common>',
            `#include <common>
            varying vec3 vRenderStyleWorldPosition;`
          )
          .replace(
            '#include <worldpos_vertex>',
            `#include <worldpos_vertex>
            vRenderStyleWorldPosition = worldPosition.xyz;`
          )

        shader.fragmentShader = shader.fragmentShader
          .replace(
            '#include <common>',
            `#include <common>
            varying vec3 vRenderStyleWorldPosition;
            float renderStyleNoise(vec2 value) {
              return fract(sin(dot(value, vec2(12.9898, 78.233))) * 43758.5453123);
            }`
          )
          .replace(
            'vec4 diffuseColor = vec4( diffuse, opacity );',
            `vec4 diffuseColor = vec4( diffuse, opacity );
            float brushNoise = renderStyleNoise(floor(vRenderStyleWorldPosition.xz * 10.0));
            diffuseColor.a *= mix(0.78, 1.0, brushNoise);`
          )
      }

      outlineMaterial.customProgramCacheKey = () => 'render-style-painted-outline'
    }

    return outlineMaterial
  }

  function applyMaterialStyling(mesh: THREE.Mesh) {
    if (mesh.userData.renderStyleOutline) return

    const materialKey = getMaterialKey(mesh)
    if (!originalMaterials.has(materialKey)) {
      originalMaterials.set(materialKey, mesh.material)
    }

    const existingProcessed = processedMaterials.get(materialKey)
    if (existingProcessed) {
      disposeMaterialSet(existingProcessed)
      processedMaterials.delete(materialKey)
    }

    if (!enableToonShading) {
      const originalMaterial = originalMaterials.get(materialKey)
      if (originalMaterial) {
        mesh.material = originalMaterial
      }
      return
    }

    const nextMaterial = Array.isArray(mesh.material)
      ? mesh.material.map((material) => createStylizedMaterial(material, mesh.name))
      : createStylizedMaterial(mesh.material, mesh.name)

    mesh.material = nextMaterial
    processedMaterials.set(materialKey, nextMaterial)
    mesh.frustumCulled = true
    mesh.castShadow = shouldEnableSceneShadows($qualityLevelStore, $qualitySettingsStore)
    mesh.receiveShadow = shouldEnableSceneShadows($qualityLevelStore, $qualitySettingsStore)
  }

  function removeOutlineShell(mesh: THREE.Mesh) {
    const outlineKey = getOutlineKey(mesh)
    const existingShell = outlineShells.get(outlineKey)
    if (!existingShell) return

    existingShell.removeFromParent()
    if (existingShell.material instanceof THREE.Material) {
      existingShell.material.dispose()
    }
    outlineShells.delete(outlineKey)
  }

  function applyOutlineShell(mesh: THREE.Mesh) {
    const skinnedMesh = mesh as THREE.Mesh & { isSkinnedMesh?: boolean }
    if (!enableOutlines || mesh.userData.renderStyleOutline || skinnedMesh.isSkinnedMesh) {
      removeOutlineShell(mesh)
      return
    }

    removeOutlineShell(mesh)

    const outlineMaterial = createPaintedOutlineMaterial()
    const outlineShell = new THREE.Mesh(mesh.geometry, outlineMaterial)
    outlineShell.name = `${mesh.name || mesh.uuid}__renderStyleOutline`
    outlineShell.userData.renderStyleOutline = true
    outlineShell.renderOrder = (mesh.renderOrder ?? 0) - 1
    outlineShell.frustumCulled = mesh.frustumCulled
    outlineShell.position.set(0, 0, 0)
    outlineShell.rotation.set(0, 0, 0)
    outlineShell.scale.setScalar(1 + outlineThickness)

    // Outline shells are visual-only and should never capture interactions.
    outlineShell.raycast = () => null

    mesh.add(outlineShell)
    outlineShells.set(getOutlineKey(mesh), outlineShell)
  }

  function restoreOriginalSceneMaterials() {
    if (!scene) return

    scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh) || object.userData.renderStyleOutline) return

      const materialKey = getMaterialKey(object)
      const originalMaterial = originalMaterials.get(materialKey)
      if (originalMaterial) {
        object.material = originalMaterial
      }

      removeOutlineShell(object)
    })
  }

  function disposeProcessedMaterials() {
    processedMaterials.forEach((materialSet) => {
      disposeMaterialSet(materialSet)
    })
    processedMaterials.clear()
  }

  function applyStyleToScene() {
    if (!scene) return

    scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return
      if (object.userData.renderStyleOutline) return

      applyMaterialStyling(object)
      applyOutlineShell(object)
    })
  }

  function watchObject(object: THREE.Object3D) {
    if (watchedObjects.has(object)) return

    const onChildAdded = (event: THREE.Event) => {
      const { child } = event as ChildObjectEvent
      if (!child || child.userData.renderStyleOutline) return

      styleNewObject(child)
      watchObjectTree(child)
    }

    const onChildRemoved = (event: THREE.Event) => {
      const { child } = event as ChildObjectEvent
      if (!child) return
      unwatchObjectTree(child)
    }

    object.addEventListener('childadded', onChildAdded)
    object.addEventListener('childremoved', onChildRemoved)
    watchedObjects.set(object, { onChildAdded, onChildRemoved })
  }

  function watchObjectTree(root: THREE.Object3D) {
    watchObject(root)
    root.traverse((object) => {
      if (object === root) return
      watchObject(object)
    })
  }

  function unwatchObject(object: THREE.Object3D) {
    const listeners = watchedObjects.get(object)
    if (!listeners) return

    object.removeEventListener('childadded', listeners.onChildAdded)
    object.removeEventListener('childremoved', listeners.onChildRemoved)
    watchedObjects.delete(object)
  }

  function unwatchObjectTree(root: THREE.Object3D) {
    const objects: THREE.Object3D[] = [root]
    root.traverse((object) => {
      if (object === root) return
      objects.push(object)
    })

    objects.reverse().forEach(unwatchObject)
  }

  function registerWithLevelSystem() {
    registry?.sendMessage({
      type: 'STYLE_SYSTEM_READY' as any,
      source: 'render-style-system',
      data: {
        palette: currentPalette,
        preset: stylePreset,
        flattenMaterials,
        paintedOutlines: usePaintedOutlines,
      },
      timestamp: Date.now(),
      priority: 'normal',
    })
  }

  function notifyStyleChanged() {
    dispatch('styleChanged', {
      palette: currentPalette,
      preset: stylePreset,
      flattenMaterials,
      paintedOutlines: usePaintedOutlines,
    })

    registry?.sendMessage({
      type: 'STYLE_CHANGED' as any,
      source: 'render-style-system',
      data: {
        palette: currentPalette,
        preset: stylePreset,
        flattenMaterials,
        paintedOutlines: usePaintedOutlines,
      },
      timestamp: Date.now(),
      priority: 'high',
    })
  }

  function updateSceneStyle() {
    if (!scene || !renderer) return

    currentPalette = getPalette(stylePreset)
    setupRenderer()
    rebuildGradientMap()
    restoreOriginalSceneMaterials()
    disposeProcessedMaterials()
    applyStyleToScene()
    notifyStyleChanged()
  }

  function initializeStyleSystem() {
    if (!scene || !renderer) {
      console.warn('RenderStyleSystem could not initialize because scene or renderer is unavailable.')
      return
    }

    currentPalette = getPalette(stylePreset)
    setupRenderer()
    rebuildGradientMap()
    applyStyleToScene()
    watchObjectTree(scene)
    registerWithLevelSystem()

    isInitialized = true

    if (isDev) {
      console.log('🎨 RenderStyleSystem initialized', {
        preset: stylePreset,
        flattenMaterials,
        usePaintedOutlines,
      })
    }

    dispatch('styleSystemReady', {
      palette: currentPalette,
      preset: stylePreset,
    })
  }

  export function styleNewObject(object: THREE.Object3D) {
    object.traverse((child) => {
      if (!(child instanceof THREE.Mesh) || child.userData.renderStyleOutline) return
      applyMaterialStyling(child)
      applyOutlineShell(child)
    })
  }

  export function getCurrentPalette() {
    return currentPalette
  }

  onMount(() => {
    initializeStyleSystem()
  })

  $: if (isInitialized) {
    stylePreset
    enableOutlines
    enableToonShading
    flattenMaterials
    usePaintedOutlines
    outlineThickness
    outlineOpacity
    toneMappingExposure
    updateSceneStyle()
  }

  onDestroy(() => {
    if (scene) {
      unwatchObjectTree(scene)
    }

    restoreOriginalSceneMaterials()
    disposeProcessedMaterials()

    originalMaterials.clear()

    toonGradientMap?.dispose()
    toonGradientMap = null
  })
</script>

{#if isInitialized && enableStyleLighting}
  <T.AmbientLight color={resolveAmbientColor()} intensity={ambientIntensity} />

  <T.DirectionalLight
    position={[50, 100, 50]}
    color={currentPalette.sun}
    intensity={sunIntensity}
    castShadow={false}
    shadow.mapSize.width={2048}
    shadow.mapSize.height={2048}
    shadow.camera.near={0.1}
    shadow.camera.far={500}
    shadow.camera.left={-200}
    shadow.camera.right={200}
    shadow.camera.top={200}
    shadow.camera.bottom={-200}
  />

  <T.DirectionalLight
    position={[-30, 50, -30]}
    color={currentPalette.ambient}
    intensity={fillIntensity}
    castShadow={false}
  />
{/if}

{#if isInitialized}
  <T.Fog color={currentPalette.fog} near={50} far={300} />
{/if}
