<script lang="ts">
import { T, useTask } from '@threlte/core'
import type * as THREE from 'three'
import HomeIntroParticle from './HomeIntroParticle.svelte'
import HomeIntroScreenPanel from './HomeIntroScreenPanel.svelte'

type IntroInputState = {
  x: number
  y: number
  dragX: number
  dragY: number
  wheel: number
  active: boolean
}

export let input: IntroInputState
export let titleImageSrc = ''

let world: THREE.Group | null = null
let emblem: THREE.Group | null = null
let ringA: THREE.Mesh | null = null
let ringB: THREE.Mesh | null = null
let ringC: THREE.Mesh | null = null
let starColumn: THREE.Group | null = null
let screenRail: THREE.Group | null = null
const screenNodes: THREE.Group[] = []

const particleCount = 260
const particleClusterCount = 7
const primaryScreenIndex = 3
const screenCount = 7
const screenStepX = 2.28
const screenStepY = 1.68
const screenStepDepth = 1.08
const screenStillMedia = [
  '/assets/banner/golden-era.webp',
  '/assets/banner/ultra-headquarters.png',
  '/assets/banner/archive_still.png',
  '/assets/banner/ComfyUI_00138_.webp',
  '/assets/banner/ComfyUI_0144.png',
  '/assets/banner/golden-era1280wide.jpg',
  '/assets/banner/ComfyUI_0145.png',
]

const particleClusters = [
  { x: -2.75, y: 2.22, z: -0.55, spread: 0.78, hue: 0.53 },
  { x: 2.74, y: 2.0, z: -1.38, spread: 0.88, hue: 0.77 },
  { x: -3.34, y: -1.98, z: -1.68, spread: 0.82, hue: 0.62 },
  { x: 2.95, y: -2.18, z: -2.28, spread: 0.86, hue: 0.86 },
  { x: -0.34, y: 2.7, z: -1.72, spread: 0.7, hue: 0.58 },
  { x: 0.95, y: -2.72, z: -1.05, spread: 0.76, hue: 0.71 },
  { x: 0.18, y: 0.08, z: -3.12, spread: 1.02, hue: 0.66 },
]

function hash01(seed: number) {
  return (Math.sin(seed * 12.9898) * 43758.5453) % 1
}

const particles = Array.from({ length: particleCount }, (_, index) => {
  const cluster = index % particleClusterCount
  const clusterCenter = particleClusters[cluster]
  const randomA = Math.abs(hash01(index + 1))
  const randomB = Math.abs(hash01(index + 17))
  const randomC = Math.abs(hash01(index + 41))
  const randomD = Math.abs(hash01(index + 79))
  const radialT = randomA ** 1.65
  const angle = randomB * Math.PI * 2
  const verticalAngle = (randomC - 0.5) * Math.PI
  const radius = clusterCenter.spread * (0.18 + radialT * 1.05)

  return {
    anchorX: clusterCenter.x,
    anchorY: clusterCenter.y,
    anchorZ: clusterCenter.z,
    angle,
    cluster,
    clusterStrength: 0.26 + (1 - radialT) * 0.58,
    height: Math.sin(verticalAngle) * clusterCenter.spread * 1.72,
    radius,
    phase: randomB * Math.PI * 2,
    radialT,
    speed: 0.026 + randomD * 0.045 + radialT * 0.026,
    size: 0.008 + (1 - radialT) * 0.018 + (index % 5) * 0.0013,
    hueOffset: clusterCenter.hue + randomD * 0.08,
    zOffset:
      Math.cos(verticalAngle) * clusterCenter.spread * (randomD - 0.5) * 1.35,
  }
})

const screens = Array.from({ length: screenCount }, (_, index) => {
  return {
    position: [0, 0, 0] as [number, number, number],
    rotation: [0, 0, 0] as [number, number, number],
    primary: index === primaryScreenIndex,
  }
})

function centeredOrbitProgress(value: number) {
  const wrapped = ((value % 1) + 1) % 1
  return wrapped > 0.5 ? wrapped - 1 : wrapped
}

function wrappedScreenOffset(value: number) {
  return centeredOrbitProgress(value / screenCount) * screenCount
}

function updateScreenOrbit(wheel: number, ease: number) {
  const selectedIndex = primaryScreenIndex + wheel * 1.08

  for (let index = 0; index < screenCount; index += 1) {
    const screen = screenNodes[index]
    if (!screen) continue

    const offset = wrappedScreenOffset(index - selectedIndex)
    const depth = Math.abs(offset)
    const side = Math.sign(offset)
    const spiral = offset * 0.96
    const frontWeight = Math.max(0, 1 - depth * 0.42)
    const x = Math.sin(spiral) * screenStepX + side * depth * 0.18
    const y = -offset * screenStepY
    const z =
      0.4 - depth * screenStepDepth + side * 0.12 + Math.cos(spiral) * 0.2
    const targetScale = Math.max(0.38, 0.98 - depth * 0.14 + frontWeight * 0.08)
    const targetYaw = -x * 0.12 + side * Math.min(depth * 0.09, 0.24)
    const targetPitch = 0.018 - offset * 0.056
    const targetRoll = -offset * 0.044

    screen.position.x += (x - screen.position.x) * ease
    screen.position.y += (y - screen.position.y) * ease
    screen.position.z += (z - screen.position.z) * ease
    screen.rotation.x += (targetPitch - screen.rotation.x) * ease
    screen.rotation.y += (targetYaw - screen.rotation.y) * ease
    screen.rotation.z += (targetRoll - screen.rotation.z) * ease
    screen.scale.x += (targetScale - screen.scale.x) * ease
    screen.scale.y += (targetScale - screen.scale.y) * ease
    screen.scale.z += (targetScale - screen.scale.z) * ease
  }
}

useTask(delta => {
  const time = performance.now() * 0.001
  const ease = Math.min(1, delta * 4.8)
  const pointerX = Number.isFinite(input.x) ? input.x : 0
  const pointerY = Number.isFinite(input.y) ? input.y : 0
  const wheel = Number.isFinite(input.wheel) ? input.wheel : 0

  if (world) {
    world.rotation.x += (-pointerY * 0.085 - world.rotation.x) * ease
    world.rotation.y += (pointerX * 0.12 - world.rotation.y) * ease
    world.position.x += (pointerX * 0.1 - world.position.x) * ease
    world.position.y += (-pointerY * 0.055 - world.position.y) * ease
  }

  if (emblem) {
    emblem.rotation.x = Math.sin(time * 0.56) * 0.08 + input.dragY * 1.8
    emblem.rotation.y = time * 0.18 + input.dragX * 2.6
    emblem.rotation.z = Math.sin(time * 0.32) * 0.045
    emblem.position.y = Math.sin(time * 0.82) * 0.08
  }

  if (ringA) ringA.rotation.z += delta * 0.34
  if (ringB) ringB.rotation.x -= delta * 0.2
  if (ringC) ringC.rotation.y += delta * 0.26

  if (starColumn) {
    starColumn.rotation.y = time * 0.055 - input.dragX * 0.5 + wheel * 0.2
    starColumn.rotation.z = Math.sin(time * 0.18) * 0.035
  }

  if (screenRail) {
    screenRail.rotation.y = time * 0.035 - input.dragX * 0.42
    screenRail.position.y = Math.sin(time * 0.45) * 0.055
  }

  updateScreenOrbit(wheel, ease)
})
</script>

<T.PerspectiveCamera makeDefault position={[0, 0.08, 6.8]} fov={44} />

<T.AmbientLight intensity={0.56} color="#dbeafe" />
<T.PointLight position={[-3.2, 2.6, 2.4]} intensity={18} color="#60a5fa" distance={10} />
<T.PointLight position={[3.4, -1.2, 3.2]} intensity={12} color="#8b5cf6" distance={10} />
<T.SpotLight
	position={[0, 4.2, 4.8]}
	angle={0.52}
	penumbra={0.6}
	intensity={34}
	distance={16}
	color="#ffffff"
/>

<T.Group bind:ref={world} position={[0, 0, 0]}>
	<T.Group bind:ref={screenRail} position={[0, 0, -0.34]}>
		{#each screens as screen, index}
			<T.Group bind:ref={screenNodes[index]} position={screen.position} rotation={screen.rotation}>
				<HomeIntroScreenPanel
					{index}
					imageSrc={screen.primary ? titleImageSrc : ""}
					stillSrc={screenStillMedia[index]}
					primary={screen.primary}
				/>
			</T.Group>
		{/each}
	</T.Group>

  <T.Group bind:ref={starColumn} position={[0, 0, -0.42]}>
		{#each particles as particle, index}
			<HomeIntroParticle {particle} {index} {input} />
		{/each}
	</T.Group>

	<T.Group bind:ref={emblem} position={[0, -0.04, -2.05]} scale={[0.5, 0.5, 0.5]}>
		<T.Mesh bind:ref={ringA} rotation={[Math.PI / 2, 0, 0]}>
			<T.TorusGeometry args={[1.18, 0.01, 12, 128]} />
			<T.MeshBasicMaterial color="#67e8f9" transparent={true} opacity={0.48} />
		</T.Mesh>

		<T.Mesh bind:ref={ringB} rotation={[0.32, Math.PI / 2, 0.26]}>
			<T.TorusGeometry args={[1.48, 0.008, 12, 128]} />
			<T.MeshBasicMaterial color="#8b5cf6" transparent={true} opacity={0.44} />
		</T.Mesh>

		<T.Mesh bind:ref={ringC} rotation={[0.76, 0.28, Math.PI / 2]}>
			<T.TorusGeometry args={[1.78, 0.006, 10, 128]} />
			<T.MeshBasicMaterial color="#a78bfa" transparent={true} opacity={0.36} />
		</T.Mesh>

		<T.Group position={[0, 0.02, 0.78]}>
			<T.Mesh position={[-0.52, 0, 0]} rotation={[0, 0, -0.22]}>
				<T.BoxGeometry args={[0.16, 1.06, 0.16]} />
				<T.MeshStandardMaterial color="#fff7ed" emissive="#f97316" emissiveIntensity={0.22} />
			</T.Mesh>
			<T.Mesh position={[-0.28, 0, 0]} rotation={[0, 0, 0.24]}>
				<T.BoxGeometry args={[0.14, 0.78, 0.16]} />
				<T.MeshStandardMaterial color="#fde68a" emissive="#eab308" emissiveIntensity={0.2} />
			</T.Mesh>
			<T.Mesh position={[-0.04, 0, 0]} rotation={[0, 0, -0.24]}>
				<T.BoxGeometry args={[0.14, 0.78, 0.16]} />
				<T.MeshStandardMaterial color="#fde68a" emissive="#eab308" emissiveIntensity={0.2} />
			</T.Mesh>
			<T.Mesh position={[0.2, 0, 0]} rotation={[0, 0, 0.22]}>
				<T.BoxGeometry args={[0.16, 1.06, 0.16]} />
				<T.MeshStandardMaterial color="#fff7ed" emissive="#f97316" emissiveIntensity={0.22} />
			</T.Mesh>
			<T.Mesh position={[0.54, 0, 0]} rotation={[0, 0, -0.18]}>
				<T.BoxGeometry args={[0.16, 1.06, 0.16]} />
				<T.MeshStandardMaterial color="#fff7ed" emissive="#22d3ee" emissiveIntensity={0.2} />
			</T.Mesh>
			<T.Mesh position={[0.8, 0, 0]} rotation={[0, 0, 0.22]}>
				<T.BoxGeometry args={[0.14, 0.78, 0.16]} />
				<T.MeshStandardMaterial color="#bae6fd" emissive="#0284c7" emissiveIntensity={0.22} />
			</T.Mesh>
			<T.Mesh position={[1.04, 0, 0]} rotation={[0, 0, -0.22]}>
				<T.BoxGeometry args={[0.14, 0.78, 0.16]} />
				<T.MeshStandardMaterial color="#bae6fd" emissive="#0284c7" emissiveIntensity={0.22} />
			</T.Mesh>
			<T.Mesh position={[1.3, 0, 0]} rotation={[0, 0, 0.18]}>
				<T.BoxGeometry args={[0.16, 1.06, 0.16]} />
				<T.MeshStandardMaterial color="#fff7ed" emissive="#22d3ee" emissiveIntensity={0.2} />
			</T.Mesh>
		</T.Group>
	</T.Group>
</T.Group>
