<script lang="ts">
import { T } from '@threlte/core'
import { onDestroy, onMount } from 'svelte'
import {
  AdditiveBlending,
  CanvasTexture,
  DoubleSide,
  FrontSide,
  NormalBlending,
  RepeatWrapping,
  SRGBColorSpace,
  type Texture,
  TextureLoader,
} from 'three'

export let index: number
export let primary = false
export let imageSrc = ''
export let stillSrc = ''

let titleTexture: Texture | null = null
let stillTexture: Texture | null = null
let frostTexture: CanvasTexture | null = null

const additiveBlending = AdditiveBlending
const normalBlending = NormalBlending
const doubleSide = DoubleSide
const frontSide = FrontSide
const frameWidth = 3.18
const frameHeight = 1.78
const glowWidth = 3.38
const glowHeight = 1.98
const mediaWidth = 2.92
const mediaHeight = 1.64
const titleWidth = 2.92
const titleHeight = 1.26
const titleEchoWidth = 2.24
const titleEchoHeight = 0.96
const fallbackWidth = 2.76
const fallbackHeight = 0.44
const glassDepth = 0.16
const bevelRailWidth = 0.11
const bevelHighlightWidth = 0.018

function createFrostTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 96
  canvas.height = 96
  const context = canvas.getContext('2d')
  if (!context) return null

  const imageData = context.createImageData(canvas.width, canvas.height)
  for (let index = 0; index < imageData.data.length; index += 4) {
    const grain = 138 + Math.random() * 92
    const veil = Math.random() > 0.72 ? 255 : grain
    imageData.data[index] = veil
    imageData.data[index + 1] = Math.min(255, veil + 10)
    imageData.data[index + 2] = Math.min(255, veil + 18)
    imageData.data[index + 3] = 68 + Math.random() * 76
  }
  context.putImageData(imageData, 0, 0)

  const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height)
  gradient.addColorStop(0, 'rgb(255 255 255 / 0.22)')
  gradient.addColorStop(0.48, 'rgb(255 255 255 / 0.035)')
  gradient.addColorStop(1, 'rgb(255 255 255 / 0.14)')
  context.globalCompositeOperation = 'screen'
  context.fillStyle = gradient
  context.fillRect(0, 0, canvas.width, canvas.height)

  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.wrapS = RepeatWrapping
  texture.wrapT = RepeatWrapping
  texture.repeat.set(2.5, 1.6)
  texture.needsUpdate = true

  return texture
}

function disposeTitleTexture() {
  titleTexture?.dispose()
  titleTexture = null
}

function disposeStillTexture() {
  stillTexture?.dispose()
  stillTexture = null
}

function disposeFrostTexture() {
  frostTexture?.dispose()
  frostTexture = null
}

onMount(() => {
  const loader = new TextureLoader()
  frostTexture = createFrostTexture()

  if (stillSrc) {
    stillTexture = loader.load(stillSrc, texture => {
      texture.colorSpace = SRGBColorSpace
      texture.needsUpdate = true
      stillTexture = texture
    })
  }

  if (primary && imageSrc) {
    titleTexture = loader.load(imageSrc, texture => {
      texture.colorSpace = SRGBColorSpace
      texture.needsUpdate = true
      titleTexture = texture
    })
  }

  return () => {
    disposeStillTexture()
    disposeTitleTexture()
    disposeFrostTexture()
  }
})

onDestroy(() => {
  disposeStillTexture()
  disposeTitleTexture()
  disposeFrostTexture()
})
</script>

<T.Group>
	<T.Mesh position={[0, 0, -0.07]}>
		<T.BoxGeometry args={[frameWidth, frameHeight, glassDepth]} />
		<T.MeshPhysicalMaterial
			color="#f8fafc"
			side={doubleSide}
			transparent={true}
			opacity={primary ? 0.13 : 0.1}
			roughness={0.9}
			metalness={0}
			transmission={0.52}
			thickness={0.58}
			clearcoat={0.52}
			clearcoatRoughness={0.62}
			depthWrite={false}
		/>
	</T.Mesh>

	<T.Mesh position={[0, 0, 0.018]}>
		<T.PlaneGeometry args={[frameWidth * 0.94, frameHeight * 0.86]} />
		<T.MeshBasicMaterial
			map={frostTexture}
			color="#dff7ff"
			side={doubleSide}
			transparent={true}
			opacity={primary ? 0.07 : 0.055}
			blending={normalBlending}
			depthWrite={false}
		/>
	</T.Mesh>

	<T.Mesh position={[0, 0, -0.052]}>
		<T.PlaneGeometry args={[frameWidth, frameHeight]} />
		<T.MeshBasicMaterial
			color="#f8fafc"
			side={doubleSide}
			transparent={true}
			opacity={primary ? 0.045 : 0.035}
			blending={normalBlending}
			depthWrite={false}
		/>
	</T.Mesh>

	<T.Mesh position={[0, 0, -0.045]}>
		<T.PlaneGeometry args={[glowWidth, glowHeight]} />
		<T.MeshBasicMaterial
			color={primary ? "#1e1b4b" : "#172554"}
			side={doubleSide}
			transparent={true}
			opacity={primary ? 0.2 : 0.16}
			blending={additiveBlending}
			depthWrite={false}
		/>
	</T.Mesh>

	{#if stillTexture}
		<T.Mesh position={[0, 0, 0]}>
			<T.PlaneGeometry args={[mediaWidth, mediaHeight]} />
			<T.MeshBasicMaterial
				map={stillTexture}
				side={frontSide}
				transparent={true}
				opacity={primary ? 0.94 : 0.94}
				blending={normalBlending}
				depthWrite={false}
			/>
		</T.Mesh>
	{:else if primary && titleTexture}
		<T.Mesh position={[0, 0.02, 0.01]}>
			<T.PlaneGeometry args={[titleWidth, titleHeight]} />
			<T.MeshBasicMaterial
				map={titleTexture}
				side={frontSide}
				transparent={true}
				opacity={0.62}
				blending={normalBlending}
				depthWrite={false}
			/>
		</T.Mesh>
	{:else}
		<T.Mesh position={[0, 0.02, 0.01]}>
			<T.PlaneGeometry args={[fallbackWidth, fallbackHeight]} />
			<T.MeshBasicMaterial
				color={primary ? "#67e8f9" : "#8b5cf6"}
				side={doubleSide}
				transparent={true}
				opacity={primary ? 0.32 : 0.16}
				blending={additiveBlending}
				depthWrite={false}
			/>
		</T.Mesh>
	{/if}

	{#if primary && titleTexture}
		<T.Mesh position={[0, 0.02, 0.018]}>
			<T.PlaneGeometry args={[titleEchoWidth, titleEchoHeight]} />
			<T.MeshBasicMaterial
				map={titleTexture}
				side={frontSide}
				transparent={true}
				opacity={0.34}
				blending={normalBlending}
				depthWrite={false}
			/>
		</T.Mesh>
	{/if}

	<T.Mesh position={[0, frameHeight / 2 - bevelRailWidth / 2, 0.035]}>
		<T.BoxGeometry args={[frameWidth, bevelRailWidth, glassDepth * 1.45]} />
		<T.MeshPhysicalMaterial
			color="#f8fafc"
			transparent={true}
			opacity={primary ? 0.21 : 0.15}
			roughness={0.52}
			metalness={0}
			transmission={0.38}
			thickness={0.32}
			clearcoat={0.64}
			clearcoatRoughness={0.38}
			depthWrite={false}
		/>
	</T.Mesh>

	<T.Mesh position={[0, -frameHeight / 2 + bevelRailWidth / 2, 0.035]}>
		<T.BoxGeometry args={[frameWidth, bevelRailWidth, glassDepth * 1.45]} />
		<T.MeshPhysicalMaterial
			color="#f8fafc"
			transparent={true}
			opacity={primary ? 0.16 : 0.12}
			roughness={0.58}
			metalness={0}
			transmission={0.4}
			thickness={0.32}
			clearcoat={0.58}
			clearcoatRoughness={0.44}
			depthWrite={false}
		/>
	</T.Mesh>

	<T.Mesh position={[-frameWidth / 2 + bevelRailWidth / 2, 0, 0.035]}>
		<T.BoxGeometry args={[bevelRailWidth, frameHeight, glassDepth * 1.45]} />
		<T.MeshPhysicalMaterial
			color="#f8fafc"
			transparent={true}
			opacity={primary ? 0.18 : 0.13}
			roughness={0.56}
			metalness={0}
			transmission={0.4}
			thickness={0.32}
			clearcoat={0.58}
			clearcoatRoughness={0.42}
			depthWrite={false}
		/>
	</T.Mesh>

	<T.Mesh position={[frameWidth / 2 - bevelRailWidth / 2, 0, 0.035]}>
		<T.BoxGeometry args={[bevelRailWidth, frameHeight, glassDepth * 1.45]} />
		<T.MeshPhysicalMaterial
			color="#f8fafc"
			transparent={true}
			opacity={primary ? 0.15 : 0.105}
			roughness={0.62}
			metalness={0}
			transmission={0.42}
			thickness={0.32}
			clearcoat={0.54}
			clearcoatRoughness={0.48}
			depthWrite={false}
		/>
	</T.Mesh>

	<T.Mesh position={[0, frameHeight / 2 - bevelHighlightWidth, 0.14]}>
		<T.BoxGeometry args={[frameWidth * 0.92, bevelHighlightWidth, 0.012]} />
		<T.MeshBasicMaterial
			color="#ffffff"
			transparent={true}
			opacity={primary ? 0.32 : 0.22}
			blending={additiveBlending}
			depthWrite={false}
		/>
	</T.Mesh>

	<T.Mesh position={[-frameWidth / 2 + bevelHighlightWidth, 0, 0.14]}>
		<T.BoxGeometry args={[bevelHighlightWidth, frameHeight * 0.82, 0.012]} />
		<T.MeshBasicMaterial
			color="#ffffff"
			transparent={true}
			opacity={primary ? 0.24 : 0.16}
			blending={additiveBlending}
			depthWrite={false}
		/>
	</T.Mesh>
</T.Group>
