<script lang="ts">
import { T, useTask, useThrelte } from '@threlte/core'
import { onMount } from 'svelte'
import {
  CubeCamera,
  FrontSide,
  LinearFilter,
  LinearMipmapLinearFilter,
  SRGBColorSpace,
  TextureLoader,
  WebGLCubeRenderTarget,
  type Mesh,
  type Object3D,
  type Texture,
  type WebGLRenderer,
} from 'three'
import { homeIntroReflectionOnlyUserDataKey } from './homeIntroReflectionOnly'

export let src = ''
export let position: [number, number, number] = [0, 0, -4.2]
export let size: [number, number] = [16, 9]
export let probePosition: [number, number, number] = [0, 0, -0.1]
export let portalVisible = true
export let motionEnabled = true

const threlte = useThrelte()
const loader = new TextureLoader()
const frontSide = FrontSide
const reflectionTarget = new WebGLCubeRenderTarget(256, {
  generateMipmaps: true,
  minFilter: LinearMipmapLinearFilter,
  magFilter: LinearFilter,
})
const reflectionProbe = new CubeCamera(0.1, 90, reflectionTarget)

reflectionTarget.texture.name = 'home-intro-scene-reflection'

let texture: Texture | null = null
let previousEnvironment: Texture | null = null
let environmentInitialized = false
let backdropMesh: Mesh | null = null
let activeSrc = ''
let loadToken = 0
let mounted = false
let probeNeedsUpdate = false

function configureTexture(item: Texture) {
  item.colorSpace = SRGBColorSpace
  item.generateMipmaps = false
  item.minFilter = LinearFilter
  item.magFilter = LinearFilter
  item.needsUpdate = true
}

function getRenderer() {
  const renderer = threlte.renderer as
    | WebGLRenderer
    | { current?: WebGLRenderer }
    | null

  return renderer && 'current' in renderer ? renderer.current ?? null : renderer
}

function applyEnvironment() {
  const scene = threlte.scene

  if (!scene) return

  if (!environmentInitialized) {
    previousEnvironment = scene.environment
    environmentInitialized = true
  }

  scene.environment = reflectionTarget.texture
}

function clearEnvironment() {
  const scene = threlte.scene

  if (environmentInitialized && scene?.environment === reflectionTarget.texture) {
    scene.environment = previousEnvironment
  }

  previousEnvironment = null
  environmentInitialized = false
}

function disposeBackdrop() {
  loadToken += 1
  texture?.dispose()
  texture = null
  activeSrc = ''
  probeNeedsUpdate = false
  clearEnvironment()
}

function updateReflectionProbe() {
  const scene = threlte.scene
  const renderer = getRenderer()

  if (!scene || !renderer || !texture || !backdropMesh) return

  const backdropWasVisible = backdropMesh.visible
  const currentEnvironment = scene.environment
  if (currentEnvironment === reflectionTarget.texture) {
    scene.environment = previousEnvironment
  }

  const reflectionOnlyVisibility = showReflectionOnlyObjects(scene)

  backdropMesh.visible = true
  reflectionProbe.position.set(
    probePosition[0],
    probePosition[1],
    probePosition[2],
  )
  reflectionProbe.updateMatrixWorld(true)
  try {
    reflectionProbe.update(renderer, scene)
  } finally {
    restoreVisibility(reflectionOnlyVisibility)
    backdropMesh.visible = backdropWasVisible
  }
  scene.environment = reflectionTarget.texture

  probeNeedsUpdate = false
}

function showReflectionOnlyObjects(scene: Object3D) {
  const visibility: Array<[Object3D, boolean]> = []

  scene.traverse(object => {
    if (!object.userData[homeIntroReflectionOnlyUserDataKey]) return

    visibility.push([object, object.visible])
    object.visible = true
  })

  return visibility
}

function restoreVisibility(visibility: Array<[Object3D, boolean]>) {
  visibility.forEach(([object, visible]) => {
    object.visible = visible
  })
}

function loadBackdrop(nextSrc: string) {
  if (!mounted || !nextSrc || nextSrc === activeSrc) return

  const token = ++loadToken

  loader.load(
    nextSrc,
    loadedTexture => {
      if (!mounted || token !== loadToken) {
        loadedTexture.dispose()
        return
      }

      configureTexture(loadedTexture)

      texture?.dispose()

      texture = loadedTexture
      activeSrc = nextSrc
      applyEnvironment()
      probeNeedsUpdate = true
    },
    undefined,
    () => {
      if (token === loadToken) activeSrc = ''
    },
  )
}

onMount(() => {
  mounted = true
  loadBackdrop(src)

  return () => {
    mounted = false
    disposeBackdrop()
    reflectionTarget.dispose()
  }
})

useTask(() => {
  if (!mounted || !texture || !probeNeedsUpdate || !portalVisible || !motionEnabled) {
    return
  }

  updateReflectionProbe()
})

$: if (mounted && src) {
  loadBackdrop(src)
}

$: if (mounted && !src && activeSrc) {
  disposeBackdrop()
}

$: if (mounted) {
  reflectionProbe.position.set(
    probePosition[0],
    probePosition[1],
    probePosition[2],
  )
  probeNeedsUpdate = true
}
</script>

{#if texture}
	<T.Mesh bind:ref={backdropMesh} {position} visible={false}>
		<T.PlaneGeometry args={size} />
		<T.MeshBasicMaterial
			map={texture}
			side={frontSide}
			depthWrite={false}
		/>
	</T.Mesh>
	<T is={reflectionProbe} position={probePosition} visible={false} />
{/if}
