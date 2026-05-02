<script lang="ts">
import { T, useTask } from '@threlte/core'
import { onDestroy, onMount } from 'svelte'
import {
  AdditiveBlending,
  DoubleSide,
  FrontSide,
  MultiplyBlending,
  NormalBlending,
  SRGBColorSpace,
  type CanvasTexture,
  type Group,
  type Texture,
  TextureLoader,
} from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import HomeIntroLogoReflections from './HomeIntroLogoReflections.svelte'
import {
  createCausticTexture,
  createFrostTexture,
  createGrimeTexture,
  createImageAlphaTexture,
  createSheenTexture,
} from './homeIntroGlassTextures'

export let index: number
export let primary = false
export let imageSrc = ''
export let stillSrc = ''

let titleTexture: Texture | null = null
let stillTexture: Texture | null = null
let titleAlphaTexture: CanvasTexture | null = null
let stillAlphaTexture: CanvasTexture | null = null
let frostTexture: CanvasTexture | null = null
let sheenTexture: CanvasTexture | null = null
let causticTexture: CanvasTexture | null = null
let grimeTexture: CanvasTexture | null = null
let sheenSweep: Group | null = null
let secondarySheenSweep: Group | null = null

const additiveBlending = AdditiveBlending
const multiplyBlending = MultiplyBlending
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
const bevelRailWidth = 0.16
const bevelHighlightWidth = 0.026
const sheenWidth = 0.42
const sheenHeight = frameHeight * 1.55
const causticWidth = frameWidth * 0.98
const causticHeight = frameHeight * 0.92
const grimeWidth = frameWidth * 0.98
const grimeHeight = frameHeight * 0.9
const prismOffset = 0.028
const mainGlassGeometry = new RoundedBoxGeometry(
  frameWidth,
  frameHeight,
  glassDepth * 1.24,
  5,
  0.095,
)
const horizontalRailGeometry = new RoundedBoxGeometry(
  frameWidth,
  bevelRailWidth,
  glassDepth * 1.9,
  5,
  0.055,
)
const verticalRailGeometry = new RoundedBoxGeometry(
  bevelRailWidth,
  frameHeight,
  glassDepth * 1.9,
  5,
  0.055,
)
const horizontalHighlightGeometry = new RoundedBoxGeometry(
  frameWidth * 0.93,
  bevelHighlightWidth,
  0.018,
  4,
  0.012,
)
const verticalHighlightGeometry = new RoundedBoxGeometry(
  bevelHighlightWidth,
  frameHeight * 0.82,
  0.018,
  4,
  0.012,
)

function disposeTitleTexture() {
  titleTexture?.dispose()
  titleTexture = null
}

function disposeStillTexture() {
  stillTexture?.dispose()
  stillTexture = null
}

function disposeTitleAlphaTexture() {
  titleAlphaTexture?.dispose()
  titleAlphaTexture = null
}

function disposeStillAlphaTexture() {
  stillAlphaTexture?.dispose()
  stillAlphaTexture = null
}

function disposeFrostTexture() {
  frostTexture?.dispose()
  frostTexture = null
}

function disposeSheenTexture() {
  sheenTexture?.dispose()
  sheenTexture = null
}

function disposeCausticTexture() {
  causticTexture?.dispose()
  causticTexture = null
}

function disposeGrimeTexture() {
  grimeTexture?.dispose()
  grimeTexture = null
}

onMount(() => {
  const loader = new TextureLoader()
  frostTexture = createFrostTexture()
  sheenTexture = createSheenTexture()
  causticTexture = createCausticTexture()
  grimeTexture = createGrimeTexture()

  if (stillSrc) {
    stillTexture = loader.load(stillSrc, texture => {
      texture.colorSpace = SRGBColorSpace
      texture.needsUpdate = true
      disposeStillAlphaTexture()
      stillAlphaTexture = createImageAlphaTexture(texture.image)
      stillTexture = texture
    })
  }

  if (primary && imageSrc) {
    titleTexture = loader.load(imageSrc, texture => {
      texture.colorSpace = SRGBColorSpace
      texture.needsUpdate = true
      disposeTitleAlphaTexture()
      titleAlphaTexture = createImageAlphaTexture(texture.image)
      titleTexture = texture
    })
  }

  return () => {
    disposeStillTexture()
    disposeTitleTexture()
    disposeStillAlphaTexture()
    disposeTitleAlphaTexture()
    disposeFrostTexture()
    disposeSheenTexture()
    disposeCausticTexture()
    disposeGrimeTexture()
  }
})

onDestroy(() => {
  disposeStillTexture()
  disposeTitleTexture()
  disposeStillAlphaTexture()
  disposeTitleAlphaTexture()
  disposeFrostTexture()
  disposeSheenTexture()
  disposeCausticTexture()
  disposeGrimeTexture()
})

useTask(() => {
  const time = performance.now() * 0.001
  const panelPhase = index * 0.19
  const travel = frameWidth * 2.3
  const startX = -travel * 0.5
  const primarySpeed = primary ? 0.18 : 0.12
  const secondarySpeed = primary ? 0.13 : 0.09
  const primaryPass = (time * primarySpeed + panelPhase) % 1
  const secondaryPass = (time * secondarySpeed + panelPhase + 0.46) % 1

  if (sheenSweep) {
    sheenSweep.position.x = startX + primaryPass * travel
    sheenSweep.position.y = Math.sin(time * 0.42 + index) * 0.035
  }

  if (secondarySheenSweep) {
    secondarySheenSweep.position.x = startX + secondaryPass * travel
    secondarySheenSweep.position.y = Math.cos(time * 0.36 + index) * 0.028
  }

  if (causticTexture) {
    causticTexture.offset.x = time * (primary ? 0.012 : 0.008) + index * 0.037
    causticTexture.offset.y = Math.sin(time * 0.18 + index) * 0.018
    causticTexture.rotation = Math.sin(time * 0.08 + index) * 0.035
  }

  if (grimeTexture) {
    grimeTexture.offset.x = Math.sin(time * 0.035 + index) * 0.012
    grimeTexture.offset.y = Math.cos(time * 0.028 + index) * 0.01
  }
})
</script>

<T.Group>
	<T.Mesh position={[0, 0, -0.07]}>
		<T is={mainGlassGeometry} />
		<T.MeshPhysicalMaterial
			color="#f8fafc"
			side={doubleSide}
			transparent={true}
			opacity={primary ? 0.2 : 0.15}
			roughness={0.18}
			roughnessMap={grimeTexture}
			metalness={0.08}
			transmission={0.82}
			thickness={1.15}
			clearcoat={1}
			clearcoatRoughness={0.08}
			ior={1.7}
			reflectivity={0.78}
			iridescence={primary ? 0.36 : 0.24}
			iridescenceIOR={1.42}
			iridescenceThicknessRange={[120, 420]}
			attenuationColor={primary ? "#67e8f9" : "#a78bfa"}
			attenuationDistance={primary ? 2.1 : 1.55}
			emissive={primary ? "#0e7490" : "#1e1b4b"}
			emissiveIntensity={primary ? 0.025 : 0.014}
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

	<T.Mesh position={[0, 0, 0.105]}>
		<T.PlaneGeometry args={[causticWidth, causticHeight]} />
		<T.MeshBasicMaterial
			map={causticTexture}
			color={primary ? "#e0f2fe" : "#c4b5fd"}
			side={frontSide}
			transparent={true}
			opacity={primary ? 0.18 : 0.1}
			blending={additiveBlending}
			depthWrite={false}
			depthTest={true}
		/>
	</T.Mesh>

	<T.Mesh position={[0, 0, 0.118]}>
		<T.PlaneGeometry args={[grimeWidth, grimeHeight]} />
		<T.MeshBasicMaterial
			map={grimeTexture}
			color="#64748b"
			side={frontSide}
			transparent={true}
			opacity={primary ? 0.22 : 0.16}
			blending={multiplyBlending}
			premultipliedAlpha={true}
			depthWrite={false}
			depthTest={true}
		/>
	</T.Mesh>

	<T.Group position={[0, 0, -0.18]} scale={[primary ? 1.08 : 0.9, primary ? 0.82 : 0.68, 1]}>
		<HomeIntroLogoReflections atmosphereReveal={primary ? 0.42 : 0.26} />
	</T.Group>

	<T.Group bind:ref={sheenSweep} position={[-frameWidth * 0.5, 0, 0.132]} rotation={[0, 0, -0.48]}>
		<T.Mesh>
			<T.PlaneGeometry args={[sheenWidth, sheenHeight]} />
			<T.MeshBasicMaterial
				map={sheenTexture}
				color="#dff7ff"
				side={doubleSide}
				transparent={true}
				opacity={primary ? 0.14 : 0.08}
				blending={additiveBlending}
				depthWrite={false}
				depthTest={true}
			/>
		</T.Mesh>
	</T.Group>

	<T.Group bind:ref={secondarySheenSweep} position={[frameWidth * 0.3, 0, 0.128]} rotation={[0, 0, -0.48]}>
		<T.Mesh>
			<T.PlaneGeometry args={[sheenWidth * 0.56, sheenHeight * 0.92]} />
			<T.MeshBasicMaterial
				map={sheenTexture}
				color="#c4b5fd"
				side={doubleSide}
				transparent={true}
				opacity={primary ? 0.08 : 0.05}
				blending={additiveBlending}
				depthWrite={false}
				depthTest={true}
			/>
		</T.Mesh>
	</T.Group>

	{#if stillTexture}
		<T.Mesh position={[0, 0, 0.158]}>
			<T.PlaneGeometry args={[mediaWidth, mediaHeight]} />
			<T.MeshBasicMaterial
				map={stillTexture}
				side={frontSide}
				transparent={false}
				opacity={1}
				blending={normalBlending}
				depthWrite={true}
			/>
		</T.Mesh>
	{:else if primary && titleTexture}
		<T.Mesh position={[0, 0.02, 0.158]}>
			<T.PlaneGeometry args={[titleWidth, titleHeight]} />
			<T.MeshBasicMaterial
				map={titleTexture}
				side={frontSide}
				transparent={false}
				opacity={1}
				blending={normalBlending}
				depthWrite={true}
			/>
		</T.Mesh>
	{:else}
		<T.Mesh position={[0, 0.02, 0.158]}>
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
		<T.Mesh position={[0, 0.02, 0.19]}>
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
		<T is={horizontalRailGeometry} />
		<T.MeshPhysicalMaterial
			color="#f8fafc"
			transparent={true}
			opacity={primary ? 0.36 : 0.25}
			roughness={0.14}
			roughnessMap={grimeTexture}
			metalness={0.12}
			transmission={0.58}
			thickness={0.55}
			clearcoat={1}
			clearcoatRoughness={0.06}
			ior={1.78}
			reflectivity={0.86}
			iridescence={primary ? 0.55 : 0.36}
			iridescenceIOR={1.48}
			iridescenceThicknessRange={[180, 520]}
			attenuationColor="#67e8f9"
			attenuationDistance={1.8}
			emissive="#67e8f9"
			emissiveIntensity={primary ? 0.055 : 0.026}
			depthWrite={false}
		/>
	</T.Mesh>

	<T.Mesh position={[0, -frameHeight / 2 + bevelRailWidth / 2, 0.035]}>
		<T is={horizontalRailGeometry} />
		<T.MeshPhysicalMaterial
			color="#f8fafc"
			transparent={true}
			opacity={primary ? 0.28 : 0.2}
			roughness={0.18}
			roughnessMap={grimeTexture}
			metalness={0.1}
			transmission={0.56}
			thickness={0.52}
			clearcoat={0.94}
			clearcoatRoughness={0.08}
			ior={1.72}
			reflectivity={0.76}
			iridescence={primary ? 0.38 : 0.24}
			iridescenceIOR={1.44}
			iridescenceThicknessRange={[120, 440]}
			attenuationColor="#38bdf8"
			attenuationDistance={1.7}
			emissive="#38bdf8"
			emissiveIntensity={primary ? 0.035 : 0.018}
			depthWrite={false}
		/>
	</T.Mesh>

	<T.Mesh position={[-frameWidth / 2 + bevelRailWidth / 2, 0, 0.035]}>
		<T is={verticalRailGeometry} />
		<T.MeshPhysicalMaterial
			color="#f8fafc"
			transparent={true}
			opacity={primary ? 0.3 : 0.21}
			roughness={0.16}
			roughnessMap={grimeTexture}
			metalness={0.1}
			transmission={0.56}
			thickness={0.52}
			clearcoat={0.96}
			clearcoatRoughness={0.08}
			ior={1.74}
			reflectivity={0.78}
			iridescence={primary ? 0.44 : 0.28}
			iridescenceIOR={1.48}
			iridescenceThicknessRange={[160, 500]}
			attenuationColor="#a78bfa"
			attenuationDistance={1.7}
			emissive="#a78bfa"
			emissiveIntensity={primary ? 0.038 : 0.02}
			depthWrite={false}
		/>
	</T.Mesh>

	<T.Mesh position={[frameWidth / 2 - bevelRailWidth / 2, 0, 0.035]}>
		<T is={verticalRailGeometry} />
		<T.MeshPhysicalMaterial
			color="#f8fafc"
			transparent={true}
			opacity={primary ? 0.24 : 0.17}
			roughness={0.2}
			roughnessMap={grimeTexture}
			metalness={0.08}
			transmission={0.54}
			thickness={0.5}
			clearcoat={0.9}
			clearcoatRoughness={0.1}
			ior={1.68}
			reflectivity={0.7}
			iridescence={primary ? 0.3 : 0.18}
			iridescenceIOR={1.4}
			iridescenceThicknessRange={[120, 360]}
			attenuationColor="#60a5fa"
			attenuationDistance={1.6}
			emissive="#60a5fa"
			emissiveIntensity={primary ? 0.032 : 0.017}
			depthWrite={false}
		/>
	</T.Mesh>

	<T.Mesh position={[0, frameHeight / 2 - bevelHighlightWidth, 0.14]}>
		<T is={horizontalHighlightGeometry} />
		<T.MeshBasicMaterial
			color="#ffffff"
			transparent={true}
			opacity={primary ? 0.58 : 0.36}
			blending={additiveBlending}
			depthWrite={false}
		/>
	</T.Mesh>

	<T.Mesh position={[-prismOffset, frameHeight / 2 - bevelHighlightWidth * 2.4, 0.152]}>
		<T is={horizontalHighlightGeometry} />
		<T.MeshBasicMaterial
			color="#22d3ee"
			transparent={true}
			opacity={primary ? 0.22 : 0.14}
			blending={additiveBlending}
			depthWrite={false}
		/>
	</T.Mesh>

	<T.Mesh position={[prismOffset, frameHeight / 2 - bevelHighlightWidth * 3.4, 0.154]}>
		<T is={horizontalHighlightGeometry} />
		<T.MeshBasicMaterial
			color="#fb7185"
			transparent={true}
			opacity={primary ? 0.16 : 0.1}
			blending={additiveBlending}
			depthWrite={false}
		/>
	</T.Mesh>

	<T.Mesh position={[-frameWidth / 2 + bevelHighlightWidth, 0, 0.14]}>
		<T is={verticalHighlightGeometry} />
		<T.MeshBasicMaterial
			color="#ffffff"
			transparent={true}
			opacity={primary ? 0.38 : 0.24}
			blending={additiveBlending}
			depthWrite={false}
		/>
	</T.Mesh>

	<T.Mesh position={[-frameWidth / 2 + bevelHighlightWidth * 2.4, -prismOffset, 0.152]}>
		<T is={verticalHighlightGeometry} />
		<T.MeshBasicMaterial
			color="#22d3ee"
			transparent={true}
			opacity={primary ? 0.18 : 0.11}
			blending={additiveBlending}
			depthWrite={false}
		/>
	</T.Mesh>

	<T.Mesh position={[-frameWidth / 2 + bevelHighlightWidth * 3.4, prismOffset, 0.154]}>
		<T is={verticalHighlightGeometry} />
		<T.MeshBasicMaterial
			color="#fb7185"
			transparent={true}
			opacity={primary ? 0.14 : 0.085}
			blending={additiveBlending}
			depthWrite={false}
		/>
	</T.Mesh>

	<T.Mesh position={[frameWidth / 2 - bevelHighlightWidth, 0, 0.14]}>
		<T is={verticalHighlightGeometry} />
		<T.MeshBasicMaterial
			color="#93c5fd"
			transparent={true}
			opacity={primary ? 0.2 : 0.13}
			blending={additiveBlending}
			depthWrite={false}
		/>
	</T.Mesh>

	<T.Mesh position={[0, -frameHeight / 2 + bevelHighlightWidth, 0.14]}>
		<T is={horizontalHighlightGeometry} />
		<T.MeshBasicMaterial
			color="#67e8f9"
			transparent={true}
			opacity={primary ? 0.24 : 0.15}
			blending={additiveBlending}
			depthWrite={false}
		/>
	</T.Mesh>
</T.Group>
