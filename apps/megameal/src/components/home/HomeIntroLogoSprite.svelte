<script lang="ts">
import { T, useTask } from '@threlte/core'
import { onDestroy, onMount } from 'svelte'
import {
  ClampToEdgeWrapping,
  DoubleSide,
  LinearFilter,
  SRGBColorSpace,
  type Texture,
  TextureLoader,
} from 'three'

export let atlasSrc = '/assets/sprites/sprite-rest-atlas.webp'
export let columns = 6
export let rows = 4
export let frames = 23
export let fps = 6
export let width = 5.32
export let height = 2.66
export let offsetX = 0
export let offsetY = 0
export let offsetZ = -0.32
export let motionEnabled = true
export let opacity = 1
export let onReady: (() => void) | undefined

let texture: Texture | null = null
let mounted = false
let elapsed = 0
let activeFrame = -1
let readyNotified = false

const loader = new TextureLoader()
const doubleSide = DoubleSide
const logoSpriteRotation = [0, Math.PI, 0] as [number, number, number]

function disposeTexture() {
  texture?.dispose()
  texture = null
}

function notifyReady() {
  if (readyNotified) return

  readyNotified = true
  onReady?.()
}

function syncFrame(frame: number) {
  if (!texture || frame === activeFrame) return

  const clampedFrame = Math.max(0, Math.min(frames - 1, frame))
  const column = clampedFrame % columns
  const row = Math.floor(clampedFrame / columns)

  texture.repeat.set(1 / columns, 1 / rows)
  texture.offset.set(column / columns, 1 - (row + 1) / rows)
  texture.needsUpdate = true
  activeFrame = clampedFrame
}

function configureTexture(nextTexture: Texture) {
  nextTexture.colorSpace = SRGBColorSpace
  nextTexture.generateMipmaps = false
  nextTexture.minFilter = LinearFilter
  nextTexture.magFilter = LinearFilter
  nextTexture.wrapS = ClampToEdgeWrapping
  nextTexture.wrapT = ClampToEdgeWrapping
  nextTexture.needsUpdate = true
}

function loadAtlas() {
  const requestSrc = atlasSrc

  loader.load(requestSrc, nextTexture => {
    if (!mounted || requestSrc !== atlasSrc) {
      nextTexture.dispose()
      return
    }

    disposeTexture()
    configureTexture(nextTexture)
    texture = nextTexture
    activeFrame = -1
    syncFrame(0)
    notifyReady()
  })
}

onMount(() => {
  mounted = true
  loadAtlas()

  return () => {
    mounted = false
    disposeTexture()
  }
})

onDestroy(() => {
  mounted = false
  disposeTexture()
})

useTask(delta => {
  if (!texture || !motionEnabled || frames <= 1 || fps <= 0) return

  elapsed += delta
  syncFrame(Math.floor(elapsed * fps) % frames)
})
</script>

{#if texture}
	<T.Mesh
		position={[offsetX, offsetY, offsetZ]}
		rotation={logoSpriteRotation}
		frustumCulled={false}
		renderOrder={34}
	>
		<T.PlaneGeometry args={[width, height]} />
		<T.MeshBasicMaterial
			map={texture}
			side={doubleSide}
			transparent={true}
			opacity={opacity}
			alphaTest={0.02}
			depthWrite={false}
			depthTest={false}
			toneMapped={false}
		/>
	</T.Mesh>
{/if}
