<script lang="ts">
import { T, useTask, useThrelte } from '@threlte/core'
import { getContext } from 'svelte'
import { createEventDispatcher, onDestroy } from 'svelte'
import * as THREE from 'three'
import {
  EDITOR_MATERIAL_OVERRIDE_CONTEXT,
  type EditorMaterialOverrideStore,
} from '../editor/editorMaterialContext'
import {
  qualityLevelStore,
  qualitySettingsStore,
  recordSystemTiming,
} from '../features/performance/stores/performanceStore'
import {
  getRuntimePropBudget,
  shouldEnableSceneShadows,
} from '../features/performance/utils/runtimeSceneBudget'
import {
  getLevelRuntimeAssetTier,
  resolveRuntimeAssetUrl,
  resolveRuntimeAssetUrlSync,
} from '../engine/runtimeAssetManifest'
import { reportRuntimeAssetFailure } from '../stores/runtimeDiagnosticsStore'
import { runtimeVisualStyleStore } from '../styles/runtimeVisualStyleStore'
import {
  cloneCachedGltfScene,
  disposeCachedGltfScene,
} from '../utils/gltfAssetCache'
import {
  createObjectMaterialOverrideState,
  disposeObjectMaterialOverrideState,
  syncObjectMaterialOverride,
} from '../utils/materialUtils'

const dispatch = createEventDispatcher()

export let url: string
export let levelId: string | null = null
export let runtimeCulling = true

const { camera } = useThrelte()
let scene: THREE.Group | null = null
let disposed = false
let activeLoadToken = 0
let activeResolveToken = 0
let loadedUrl = ''
let resolvedUrl = ''
let lastResolveKey = ''
let loadErrorMessage = ''
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
const editorMaterialOverrideStore = getContext<
  EditorMaterialOverrideStore | undefined
>(EDITOR_MATERIAL_OVERRIDE_CONTEXT)
const inEditorContext = !!editorMaterialOverrideStore
const propWorldPosition = new THREE.Vector3()
const propWorldScale = new THREE.Vector3(1, 1, 1)
const propBoundingSphere = new THREE.Sphere()
let sceneMeshes: THREE.Mesh[] = []
let currentDistanceToCamera = 0
let currentCullDistance = 0
let runtimeVisible = true
let distanceCheckAccumulator = 0
let appliedMaterialStyleKey = ''
const unsubscribe = editorMaterialOverrideStore?.subscribe(value => {
  editorMaterialOverride = value
})

function getActiveCamera(): THREE.Camera | null {
  const candidate = camera as THREE.Camera & { current?: THREE.Camera | null }
  const resolved = candidate?.current ?? candidate
  return resolved && resolved.position instanceof THREE.Vector3
    ? resolved
    : null
}

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

async function loadOverrideTexture(
  url: string | undefined,
  colorTexture = false,
) {
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
  const hasTextures = Object.values(overrideTextures).some(Boolean)
  if (!hasTextures) return

  scene.traverse(child => {
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
      if (overrideTextures.normalMap)
        target.normalMap = overrideTextures.normalMap
      if (overrideTextures.roughnessMap)
        target.roughnessMap = overrideTextures.roughnessMap
      if (overrideTextures.metalnessMap)
        target.metalnessMap = overrideTextures.metalnessMap
      if (overrideTextures.emissiveMap)
        target.emissiveMap = overrideTextures.emissiveMap
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

function disposeLoadedScene(object: THREE.Object3D | null) {
  disposeCachedGltfScene(object)
}

function snapshotSceneMeshes(root: THREE.Group) {
  sceneMeshes = []

  root.traverse(child => {
    if (!(child instanceof THREE.Mesh)) return
    child.frustumCulled = !inEditorContext
    sceneMeshes.push(child)
  })

  const bounds = new THREE.Box3().setFromObject(root)
  if (!bounds.isEmpty()) {
    bounds.getBoundingSphere(propBoundingSphere)
  } else {
    propBoundingSphere.center.set(0, 0, 0)
    propBoundingSphere.radius = 1
  }
}

function getScaledBoundingRadius() {
  if (!scene) return Math.max(1, propBoundingSphere.radius)

  scene.getWorldScale(propWorldScale)
  const maxWorldScale = Math.max(
    Math.abs(propWorldScale.x),
    Math.abs(propWorldScale.y),
    Math.abs(propWorldScale.z),
  )

  return Math.max(1, propBoundingSphere.radius * maxWorldScale)
}

function applyRuntimePropBudget() {
  if (!scene) return

  if (inEditorContext || !runtimeCulling) {
    currentCullDistance = Number.POSITIVE_INFINITY
    runtimeVisible = true
    scene.visible = true
    sceneMeshes.forEach(mesh => {
      mesh.castShadow = inEditorContext
      mesh.receiveShadow = inEditorContext
      mesh.frustumCulled = false
    })
    return
  }

  const propBudget = getRuntimePropBudget($qualityLevelStore)
  const shadowsEnabled = shouldEnableSceneShadows(
    $qualityLevelStore,
    $qualitySettingsStore,
  )
  const scaledBoundingRadius = getScaledBoundingRadius()

  currentCullDistance = propBudget.cullDistance + scaledBoundingRadius

  sceneMeshes.forEach(mesh => {
    mesh.castShadow =
      shadowsEnabled && currentDistanceToCamera <= propBudget.shadowDistance
    mesh.receiveShadow =
      shadowsEnabled &&
      currentDistanceToCamera <= propBudget.receiveShadowDistance
    mesh.frustumCulled = true
  })
}

function applyRuntimeMaterialStyle() {
  if (!scene) return
  const styleKey = String(
    $runtimeVisualStyleStore.screenFx.accentGlowIntensity ?? 0,
  )
  if (styleKey === appliedMaterialStyleKey) return
  appliedMaterialStyleKey = styleKey

  const envBoost = Math.max(
    1.1,
    0.92 + $runtimeVisualStyleStore.screenFx.accentGlowIntensity * 1.6,
  )

  scene.traverse(child => {
    if (!(child instanceof THREE.Mesh) || !child.material) return

    const applyToMaterial = (material: THREE.Material) => {
      const standardMaterial = material as THREE.MeshStandardMaterial
      if ('envMapIntensity' in standardMaterial) {
        standardMaterial.envMapIntensity = Math.max(
          standardMaterial.envMapIntensity ?? 0,
          envBoost,
        )
      }
      standardMaterial.needsUpdate = true
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
    roughnessMap: await loadOverrideTexture(
      editorMaterialOverride?.roughnessMapUrl,
    ),
    metalnessMap: await loadOverrideTexture(
      editorMaterialOverride?.metalnessMapUrl,
    ),
    emissiveMap: await loadOverrideTexture(
      editorMaterialOverride?.emissiveMapUrl,
      true,
    ),
    alphaMap: await loadOverrideTexture(editorMaterialOverride?.alphaMapUrl),
  }

  if (token !== textureLoadToken) {
    Object.values(nextTextures).forEach(texture => texture?.dispose())
    return
  }

  disposeOverrideTextures()
  overrideTextures = nextTextures
  applyOverrideTexturesToScene()
}

async function loadSceneFromUrl(nextUrl: string) {
  const token = ++activeLoadToken
  const startedAt = performance.now()

  try {
    const nextScene = await cloneCachedGltfScene(nextUrl, {
      cloneMaterials: inEditorContext,
    })
    recordSystemTiming('asset.gltf.load', performance.now() - startedAt)
    if (disposed || token !== activeLoadToken) {
      disposeLoadedScene(nextScene)
      return
    }

    const previousScene = scene
    scene = nextScene
    appliedMaterialStyleKey = ''
    loadErrorMessage = ''

    scene.traverse(child => {
      if (!(child instanceof THREE.Mesh)) return
      child.frustumCulled = !inEditorContext
    })

    snapshotSceneMeshes(scene)
    applyRuntimePropBudget()
    applyRuntimeMaterialStyle()

    if (inEditorContext) {
      syncObjectMaterialOverride(
        scene,
        editorMaterialOverride,
        materialOverrideState,
      )
    }
    applyOverrideTexturesToScene()

    if (previousScene && previousScene !== scene) {
      disposeLoadedScene(previousScene)
    }

    dispatch('load', { scene })
  } catch (error) {
    recordSystemTiming('asset.gltf.load.failed', performance.now() - startedAt)
    if (disposed || token !== activeLoadToken) return
    scene = null
    loadErrorMessage =
      error instanceof Error ? error.message : 'Unknown GLTF load error'
    console.error(`❌ HeroProp failed to load: ${nextUrl}`, error)
    reportRuntimeAssetFailure(
      nextUrl,
      error instanceof Error ? error.message : 'Unknown GLTF load error',
    )
    dispatch('error', { error, url: nextUrl })
  }
}

async function syncResolvedUrl(sourceUrl: string, qualityTier: string) {
  const token = ++activeResolveToken
  const startedAt = performance.now()
  const cachedUrl = resolveRuntimeAssetUrlSync(sourceUrl, qualityTier, {
    levelId,
  })

  if (cachedUrl) {
    recordSystemTiming(
      cachedUrl === sourceUrl
        ? 'asset.manifest.resolve.cachedRaw'
        : 'asset.manifest.resolve.cachedCooked',
      performance.now() - startedAt,
    )
    resolvedUrl = cachedUrl
    return
  }

  const nextUrl = await resolveRuntimeAssetUrl(sourceUrl, qualityTier, {
    levelId,
  })
  recordSystemTiming(
    nextUrl === sourceUrl
      ? 'asset.manifest.resolve.raw'
      : 'asset.manifest.resolve.cooked',
    performance.now() - startedAt,
  )
  if (disposed || token !== activeResolveToken) return
  resolvedUrl = nextUrl
}

$: effectiveQualityTier = getLevelRuntimeAssetTier(levelId, $qualityLevelStore)

$: if (url) {
  const resolveKey = `${levelId ?? ''}|${effectiveQualityTier}|${url}`
  if (resolveKey !== lastResolveKey) {
    lastResolveKey = resolveKey
    void syncResolvedUrl(url, effectiveQualityTier)
  }
}

$: if (resolvedUrl && resolvedUrl !== loadedUrl) {
  loadedUrl = resolvedUrl
  void loadSceneFromUrl(resolvedUrl)
}

$: if (scene) {
  if (inEditorContext) {
    syncObjectMaterialOverride(
      scene,
      editorMaterialOverride,
      materialOverrideState,
    )
  }
  applyOverrideTexturesToScene()
  applyRuntimePropBudget()
  applyRuntimeMaterialStyle()
}

$: void syncOverrideTextures()

useTask(delta => {
  const activeCamera = getActiveCamera()
  if (!scene || !activeCamera) return

  if (inEditorContext || !runtimeCulling) {
    if (!runtimeVisible) {
      runtimeVisible = true
      scene.visible = true
    }
    return
  }

  distanceCheckAccumulator += delta
  if (distanceCheckAccumulator < 0.2) return
  distanceCheckAccumulator = 0

  scene.getWorldPosition(propWorldPosition)
  const scaledBoundingRadius = getScaledBoundingRadius()
  currentDistanceToCamera = Math.max(
    0,
    activeCamera.position.distanceTo(propWorldPosition) - scaledBoundingRadius,
  )

  const nextVisible = currentDistanceToCamera <= currentCullDistance
  if (runtimeVisible !== nextVisible) {
    runtimeVisible = nextVisible
    scene.visible = nextVisible
  }

  if (nextVisible) {
    applyRuntimePropBudget()
  }
})

onDestroy(() => {
  disposed = true
  activeLoadToken += 1
  activeResolveToken += 1
  textureLoadToken += 1
  unsubscribe?.()
  disposeOverrideTextures()
  disposeObjectMaterialOverrideState(materialOverrideState)
  disposeLoadedScene(scene)
})
</script>

{#if scene}
  <T is={scene} />
{:else if loadErrorMessage}
  <T.Group>
    <T.Mesh position={[0, 1, 0]}>
      <T.BoxGeometry args={[1.6, 1.6, 1.6]} />
      <T.MeshBasicMaterial color="#ff3355" wireframe={true} transparent opacity={0.95} />
    </T.Mesh>
    <T.PointLight position={[0, 2.2, 0]} color="#ff3355" intensity={1.2} distance={6} decay={2} />
  </T.Group>
{/if}
