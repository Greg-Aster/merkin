<script lang="ts">
import { T, useTask } from '@threlte/core'
import { onDestroy, onMount } from 'svelte'
import { Box3, Euler, Quaternion, Vector3 } from 'three'
import type * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import HomeIntroParticle from './HomeIntroParticle.svelte'
import HomeIntroRingGlow from './HomeIntroRingGlow.svelte'
import HomeIntroScreenPanel from './HomeIntroScreenPanel.svelte'
import {
  homeIntroIntroOffsetScreens,
  homeIntroScreens,
  homeIntroWheelToScreenRatio,
} from './homeIntroScreens'

type IntroInputState = {
  x: number
  y: number
  dragX: number
  dragY: number
  wheel: number
  reveal: number
  introOffsetScreens: number
  active: boolean
}

export let input: IntroInputState
export let titleImageSrc = ''
export let onLogoReady: (() => void) | undefined

let world: THREE.Group | null = null
let camera: THREE.PerspectiveCamera | null = null
let emblem: THREE.Group | null = null
let ringGlowA: THREE.Group | null = null
let ringGlowB: THREE.Group | null = null
let ringGlowC: THREE.Group | null = null
let logoMeshRoot: THREE.Group | null = null
let logoModel: THREE.Object3D | null = null
let logoSearchLightA: THREE.SpotLight | null = null
let logoSearchLightB: THREE.SpotLight | null = null
let logoSearchLightC: THREE.SpotLight | null = null
let logoSearchTargetA: THREE.Group | null = null
let logoSearchTargetB: THREE.Group | null = null
let logoSearchTargetC: THREE.Group | null = null
let starColumn: THREE.Group | null = null
let screenRail: THREE.Group | null = null
const screenNodes: THREE.Group[] = []
let portraitMobile = false
let particleLimit = 360
let logoIntroStartedAt = 0
let atmosphereReveal = 0

const particleCount = 360
const particleSizeMultiplier = 1.75
const particleClusterCount = 9
const primaryScreenIndex = 0
const screenOrbitRadiusX = 5.25
const screenOrbitRadiusZ = 3.75
const screenOrbitCenterZ = -0.72
const screenStepY = 2.24
const screenAngleStep = 0.9
const effectScrollStepY = screenStepY * homeIntroWheelToScreenRatio
const particleScrollSpan = 10.8
const targetScreenEuler = new Euler(0, 0, 0, 'YXZ')
const targetScreenQuaternion = new Quaternion()
const logoBounds = new Box3()
const logoCenter = new Vector3()
const logoSize = new Vector3()
const logoLightTarget = new Vector3(0, 0, -1.05)
const logoSearchLightPosition = new Vector3()
const logoTargetSize = new Vector3(4.68, 2.24, 1.44)
const logoModelSrc = '/assets/3D/Hy3D_textured_00005_.glb'
const logoIntroDuration = 2.05
const logoImpactDuration = 0.42
const logoRotationOffset = Math.PI
const gltfLoader = new GLTFLoader()
let activeScreenSceneId = ''
let effectWheel = 0
let logoEffectWheel = 0
const portalScreens = homeIntroScreens
const screenCount = portalScreens.length
let screenMediaLoadStates = Array.from(
  { length: screenCount },
  (_, index) => index === primaryScreenIndex,
)

$: sceneScale = portraitMobile ? 0.78 : 1
$: cameraPosition = portraitMobile
  ? ([0, 0.2, 8.85] as [number, number, number])
  : ([0, 0.08, 6.8] as [number, number, number])
$: cameraFov = portraitMobile ? 48 : 44
$: railPosition = portraitMobile
  ? ([0, 0.46, -0.68] as [number, number, number])
  : ([0, 0, -0.34] as [number, number, number])
$: starColumnPosition = portraitMobile
  ? ([0, 0.08, -2.02] as [number, number, number])
  : ([0, 0, -1.86] as [number, number, number])
$: starColumnScale = portraitMobile
  ? ([0.9, 1, 0.92] as [number, number, number])
  : ([1.04, 1, 0.98] as [number, number, number])
$: emblemScale = portraitMobile
  ? ([3.64, 3.64, 3.64] as [number, number, number])
  : ([3.98, 3.98, 3.98] as [number, number, number])
$: emblemBaseY = portraitMobile ? 0.08 : -0.04
$: logoIntroStartPosition = portraitMobile
  ? ([0, 0.2, 2.65] as [number, number, number])
  : ([0, 0.08, 1.9] as [number, number, number])

function syncViewportMode() {
  if (typeof window === 'undefined') return
  portraitMobile = window.innerWidth <= 760 && window.innerHeight > window.innerWidth

  const connection = (navigator as Navigator & {
    connection?: { saveData?: boolean; effectiveType?: string }
  }).connection
  const deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory
  const reducedData =
    connection?.saveData === true ||
    connection?.effectiveType === 'slow-2g' ||
    connection?.effectiveType === '2g'
  const lowMemoryDevice = typeof deviceMemory === 'number' && deviceMemory <= 4

  particleLimit =
    portraitMobile || reducedData
      ? 180
      : lowMemoryDevice
        ? 240
        : particleCount
}

function disposeObjectResources(object: THREE.Object3D) {
  object.traverse(child => {
    const mesh = child as THREE.Mesh
    const geometry = mesh.geometry
    const material = mesh.material

    geometry?.dispose?.()

    if (Array.isArray(material)) {
      material.forEach(item => item.dispose())
    } else {
      material?.dispose?.()
    }
  })
}

function disposeLogoModel() {
  if (!logoModel) return

  logoModel.parent?.remove(logoModel)
  disposeObjectResources(logoModel)
  logoModel = null
}

function fitLogoModel(model: THREE.Object3D) {
  model.updateMatrixWorld(true)
  logoBounds.setFromObject(model)
  if (logoBounds.isEmpty()) return

  logoBounds.getCenter(logoCenter)
  logoBounds.getSize(logoSize)

  const scale = Math.min(
    logoTargetSize.x / Math.max(logoSize.x, 0.001),
    logoTargetSize.y / Math.max(logoSize.y, 0.001),
    logoTargetSize.z / Math.max(logoSize.z, 0.001),
  )

  model.scale.setScalar(scale)
  model.position.set(
    -logoCenter.x * scale,
    -logoCenter.y * scale,
    -logoCenter.z * scale,
  )
}

function tuneLogoModel(model: THREE.Object3D) {
  model.traverse(child => {
    const mesh = child as THREE.Mesh
    if (!mesh.isMesh) return

    mesh.castShadow = false
    mesh.receiveShadow = false
  })
}

function attachLogoModel() {
  if (!logoMeshRoot || !logoModel || logoModel.parent === logoMeshRoot) return
  logoModel.parent?.remove(logoModel)
  logoMeshRoot.add(logoModel)
}

async function loadLogoModel() {
  try {
    const gltf = await gltfLoader.loadAsync(logoModelSrc)
    const model = gltf.scene ?? gltf.scenes?.[0]
    if (!model) return

    disposeLogoModel()
    logoModel = model
    fitLogoModel(logoModel)
    tuneLogoModel(logoModel)
    attachLogoModel()
    logoIntroStartedAt = performance.now() * 0.001
    onLogoReady?.()
  } catch (error) {
    console.error('Failed to load portal logo mesh:', error)
  }
}

onMount(() => {
  syncViewportMode()
  window.addEventListener('resize', syncViewportMode)
  void loadLogoModel()

  return () => {
    window.removeEventListener('resize', syncViewportMode)
  }
})

onDestroy(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', syncViewportMode)
  }
  disposeLogoModel()
})

$: attachLogoModel()

const particleClusters = [
  { x: -0.92, y: 3.25, z: -0.38, spread: 0.58, hue: 0.53 },
  { x: 1.02, y: 2.36, z: -0.72, spread: 0.64, hue: 0.58 },
  { x: -1.12, y: 0.54, z: -0.94, spread: 0.58, hue: 0.66 },
  { x: 1.06, y: -0.18, z: -1.08, spread: 0.64, hue: 0.73 },
  { x: -0.88, y: -1.62, z: -0.82, spread: 0.62, hue: 0.8 },
  { x: 0.76, y: -2.74, z: -0.46, spread: 0.58, hue: 0.88 },
  { x: 0, y: 0.08, z: -1.38, spread: 0.64, hue: 0.61 },
  { x: -0.38, y: 4.28, z: 0.08, spread: 0.54, hue: 0.55 },
  { x: 0.42, y: -4.08, z: 0.02, spread: 0.56, hue: 0.7 },
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
  const randomE = Math.abs(hash01(index + 131))
  const randomF = Math.abs(hash01(index + 181))
  const radialT = randomA ** 1.25
  const angle = randomB * Math.PI * 2
  const verticalAngle = (randomC - 0.5) * Math.PI
  const strayT =
    randomE > 0.74 ? ((randomE - 0.74) / 0.26) ** 0.72 : 0
  const edgeAngle = randomF * Math.PI * 2
  const radius =
    clusterCenter.spread * (0.1 + radialT * (0.82 + strayT * 1.45))
  const anchorX =
    clusterCenter.x * (1 - strayT * 0.58) + Math.cos(edgeAngle) * strayT * 4.2
  const anchorZ =
    clusterCenter.z + Math.sin(edgeAngle) * strayT * 1.25

  return {
    anchorX,
    anchorY: clusterCenter.y,
    anchorZ,
    angle,
    cluster,
    clusterStrength: 0.26 + (1 - radialT) * 0.58,
    height: Math.sin(verticalAngle) * clusterCenter.spread * 1.42,
    radius,
    phase: randomB * Math.PI * 2,
    radialT,
    speed: 0.038 + randomD * 0.072 + radialT * 0.032,
    size:
      (0.012 + (1 - radialT) * 0.024 + randomE * 0.014) *
      (1 - strayT * 0.22) *
      particleSizeMultiplier,
    hueOffset: clusterCenter.hue + randomD * 0.08,
    shape: randomE,
    strayT,
    zOffset:
      Math.cos(verticalAngle) *
      clusterCenter.spread *
      (randomD - 0.5) *
      (0.72 + strayT * 0.56),
  }
})

const screens = Array.from({ length: screenCount }, (_, index) => {
  return {
    position: [0, 0, 0] as [number, number, number],
    rotation: [0, 0, 0] as [number, number, number],
    sceneId: portalScreens[index].sceneId,
    stillSrc: portalScreens[index].stillSrc,
    primary: index === primaryScreenIndex,
  }
})
$: visibleParticles = particles.slice(0, particleLimit)

function clampScreenIndex(value: number) {
  return Math.min(screenCount - 1, Math.max(0, value))
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value))
}

function smoothstep(value: number) {
  const normalized = clamp01(value)
  return normalized * normalized * (3 - normalized * 2)
}

function updateLogoSearchLight(
  light: THREE.SpotLight | null,
  target: THREE.Group | null,
  time: number,
  phase: number,
  intensity: number,
  radiusX: number,
  radiusY: number,
  frontOffset: number,
) {
  if (!light || !target) return

  const drift = time * 0.24 + phase
  const sweep = time * 0.11 + phase * 0.7
  const targetX = logoLightTarget.x + Math.cos(sweep) * 0.18
  const targetY = logoLightTarget.y + Math.sin(sweep) * 0.14

  target.position.set(targetX, targetY, logoLightTarget.z)
  logoSearchLightPosition.set(
    logoLightTarget.x + Math.cos(drift) * radiusX,
    logoLightTarget.y + 0.42 + Math.sin(drift) * radiusY,
    logoLightTarget.z + frontOffset,
  )
  light.position.copy(logoSearchLightPosition)
  light.intensity = atmosphereReveal * intensity

  if (light.target !== target) {
    light.target = target
  }
}

function getSelectedScreenIndex(wheel: number) {
  const introOffsetScreens = Number.isFinite(input.introOffsetScreens)
    ? input.introOffsetScreens
    : homeIntroIntroOffsetScreens

  return (
    primaryScreenIndex +
    wheel * homeIntroWheelToScreenRatio -
    introOffsetScreens
  )
}

function syncBannerToFrontScreen(selectedIndex: number) {
  if (typeof window === 'undefined') return

  const activeIndex = clampScreenIndex(Math.round(selectedIndex))
  const sceneId = portalScreens[activeIndex]?.sceneId
  if (!sceneId || sceneId === activeScreenSceneId) return

  activeScreenSceneId = sceneId
  window.dispatchEvent(
    new CustomEvent('merkin:banner-select-scene', {
      detail: {
        sceneId,
        screenIndex: activeIndex,
      },
    }),
  )
}

function syncScreenMediaLoadStates(selectedIndex: number) {
  let changed = false
  const activeIndex = clampScreenIndex(Math.round(selectedIndex))
  const next = screenMediaLoadStates.map((loaded, index) => {
    const shouldLoad =
      loaded ||
      index === primaryScreenIndex ||
      index === activeIndex ||
      Math.abs(index - selectedIndex) <= 1.15

    if (shouldLoad !== loaded) changed = true
    return shouldLoad
  })

  if (changed) {
    screenMediaLoadStates = next
  }
}

function updateScreenOrbit(wheel: number, ease: number) {
  const selectedIndex = getSelectedScreenIndex(wheel)
  syncBannerToFrontScreen(selectedIndex)
  syncScreenMediaLoadStates(selectedIndex)

  for (let index = 0; index < screenCount; index += 1) {
    const screen = screenNodes[index]
    if (!screen) continue

    const offset = index - selectedIndex
    const depth = Math.abs(offset)
    const spiral = offset * screenAngleStep
    const orbitRadiusX = screenOrbitRadiusX * (portraitMobile ? 0.96 : 1)
    const orbitRadiusZ = screenOrbitRadiusZ * (portraitMobile ? 0.94 : 1)
    const stepY = screenStepY * (portraitMobile ? 1.08 : 1)
    const x = Math.sin(spiral) * orbitRadiusX
    const y = -offset * stepY
    const z =
      screenOrbitCenterZ + Math.cos(spiral) * orbitRadiusZ - depth * 0.08
    const targetScale = portraitMobile ? 1.0 : 1.12
    const outwardYaw = Math.atan2(
      x / orbitRadiusX,
      (z - screenOrbitCenterZ) / orbitRadiusZ,
    )
    const targetPitch = Math.sin(spiral) * -0.025
    const targetRoll = Math.sin(spiral) * 0.018

    screen.position.x += (x - screen.position.x) * ease
    screen.position.y += (y - screen.position.y) * ease
    screen.position.z += (z - screen.position.z) * ease
    targetScreenEuler.set(targetPitch, outwardYaw, targetRoll)
    targetScreenQuaternion.setFromEuler(targetScreenEuler)
    screen.quaternion.slerp(targetScreenQuaternion, ease)

    const scale = screen.scale.x + (targetScale - screen.scale.x) * ease
    screen.scale.setScalar(scale)
  }
}

useTask(delta => {
  const time = performance.now() * 0.001
  const ease = Math.min(1, delta * 4.8)
  const pointerX = Number.isFinite(input.x) ? input.x : 0
  const pointerY = Number.isFinite(input.y) ? input.y : 0
  const wheel = Number.isFinite(input.wheel) ? input.wheel : 0
  effectWheel += (wheel - effectWheel) * ease
  logoEffectWheel += (wheel - logoEffectWheel) * Math.min(1, delta * 2.7)
  const selectedIndex = getSelectedScreenIndex(effectWheel)
  const spiralPhase = selectedIndex * screenAngleStep
  const revealProgress = clamp01(Number.isFinite(input.reveal) ? input.reveal : 0)
  const logoIntroElapsed = logoIntroStartedAt
    ? Math.max(0, time - logoIntroStartedAt)
    : 0
  const logoIntroRaw = clamp01(logoIntroElapsed / logoIntroDuration)
  const logoIntroDrop = logoIntroRaw
  const logoIntroScale = logoIntroRaw
  const logoImpactElapsed = logoIntroElapsed - logoIntroDuration
  const logoImpactRaw =
    logoImpactElapsed >= 0 ? clamp01(logoImpactElapsed / logoImpactDuration) : 1
  const logoImpactStrength =
    logoImpactElapsed >= 0 && logoImpactRaw < 1 ? (1 - logoImpactRaw) ** 2 : 0
  atmosphereReveal = smoothstep((logoIntroRaw - 0.72) / 0.28)

  if (camera) {
    const shakeX =
      logoImpactStrength *
      (portraitMobile ? 0.045 : 0.035) *
      Math.sin(time * 82)
    const shakeY =
      logoImpactStrength *
      (portraitMobile ? 0.06 : 0.045) *
      Math.sin(time * 107)
    camera.position.set(
      cameraPosition[0] + shakeX,
      cameraPosition[1] + shakeY,
      cameraPosition[2],
    )
  }

  if (world) {
    world.rotation.x += (-pointerY * 0.085 - world.rotation.x) * ease
    world.rotation.y += (pointerX * 0.12 - world.rotation.y) * ease
    world.position.x += (pointerX * 0.1 - world.position.x) * ease
    world.position.y += (-pointerY * 0.055 - world.position.y) * ease
  }

  if (emblem) {
    const baseZ = portraitMobile ? -1.42 : -0.9
    emblem.rotation.x = Math.sin(time * 0.56) * 0.08 + input.dragY * 1.8
    emblem.rotation.y = spiralPhase + time * 0.18 + input.dragX * 2.6
    emblem.rotation.z = Math.sin(time * 0.32) * 0.045
    emblem.position.x += (0 - emblem.position.x) * ease
    emblem.position.y += (emblemBaseY + Math.sin(time * 0.82) * 0.08 - emblem.position.y) * ease
    emblem.position.z += (baseZ - emblem.position.z) * ease
  }

  if (logoMeshRoot) {
    const logoBaseY = portraitMobile ? 0.2 : 0.08
    const logoBaseZ = portraitMobile ? -1.45 : -1.05
    const logoDriftX = Math.sin(time * 0.31) * (portraitMobile ? 0.012 : 0.018)
    const logoStartY = logoBaseY
    const logoStartZ = portraitMobile ? 2.65 : 1.9
    const logoRestY = logoBaseY + Math.sin(time * 0.38) * 0.025
    const logoRestZ = logoBaseZ + Math.sin(time * 0.24) * 0.018
    const logoTargetY = logoStartY + (logoRestY - logoStartY) * logoIntroDrop
    const logoTargetZ = logoStartZ + (logoRestZ - logoStartZ) * logoIntroDrop
    const logoTargetScale = 2.35 + (1 - 2.35) * logoIntroScale

    if (logoIntroRaw < 1) {
      logoMeshRoot.position.set(0, logoTargetY, logoTargetZ)
      logoMeshRoot.scale.setScalar(logoTargetScale)
    } else {
      logoMeshRoot.position.x += (logoDriftX - logoMeshRoot.position.x) * ease
      logoMeshRoot.position.y += (logoRestY - logoMeshRoot.position.y) * ease
      logoMeshRoot.position.z += (logoRestZ - logoMeshRoot.position.z) * ease
      logoMeshRoot.scale.setScalar(logoMeshRoot.scale.x + (1 - logoMeshRoot.scale.x) * ease)
    }
    logoMeshRoot.rotation.x = -0.075 + logoEffectWheel * 0.012 + input.dragY * 0.035
    logoMeshRoot.rotation.y = logoRotationOffset + logoEffectWheel * 0.16 + input.dragX * 0.035
    logoMeshRoot.rotation.z = 0.045 + logoEffectWheel * 0.008
    logoMeshRoot.getWorldPosition(logoLightTarget)
  } else {
    logoLightTarget.set(0, 0, -1.05)
  }

  if (ringGlowA) ringGlowA.rotation.z += delta * 0.34
  if (ringGlowB) ringGlowB.rotation.x -= delta * 0.2
  if (ringGlowC) ringGlowC.rotation.y += delta * 0.26

  updateLogoSearchLight(
    logoSearchLightA,
    logoSearchTargetA,
    time,
    0,
    180,
    3.05,
    11.4,
    6.5,
  )
  updateLogoSearchLight(
    logoSearchLightB,
    logoSearchTargetB,
    time,
    Math.PI * 0.72,
    154,
    2.75,
    1.12,
    6,
  )
  updateLogoSearchLight(
    logoSearchLightC,
    logoSearchTargetC,
    time,
    Math.PI * 1.38,
    130,
    2.45,
    1.02,
    5.6,
  )

  if (starColumn) {
    starColumn.rotation.y = -spiralPhase + time * 0.055 - input.dragX * 0.5
    starColumn.rotation.z = Math.sin(time * 0.18) * 0.035
  }

  if (screenRail) {
    screenRail.rotation.y +=
      (revealProgress * -input.dragX * 0.24 - screenRail.rotation.y) * ease
    screenRail.position.x = railPosition[0]
    screenRail.position.y =
      railPosition[1] +
      Math.sin(time * 0.45) * 0.055 * revealProgress +
      wheel * 0.025 * revealProgress
    screenRail.position.z = railPosition[2]
    screenRail.scale.setScalar(1)
  }

  updateScreenOrbit(wheel, ease)
})
</script>

<T.PerspectiveCamera bind:ref={camera} makeDefault position={cameraPosition} fov={cameraFov} />

<T.AmbientLight intensity={0.0} color="#dbeafe" />
<T.Group bind:ref={logoSearchTargetA} />
<T.Group bind:ref={logoSearchTargetB} />
<T.Group bind:ref={logoSearchTargetC} />
<T.SpotLight
	bind:ref={logoSearchLightA}
	color="#dff7ff"
	distance={16.5}
	decay={1.02}
	angle={0.9}
	penumbra={0.98}
/>
<T.SpotLight
	bind:ref={logoSearchLightB}
	color="#8b5cf6"
	distance={15.7}
	decay={1.04}
	angle={0.94}
	penumbra={0.98}
/>
<T.SpotLight
	bind:ref={logoSearchLightC}
	color="#67e8f9"
	distance={15}
	decay={1.06}
	angle={0.98}
	penumbra={0.99}
/>

<T.Group bind:ref={world} position={[0, 0, 0]} scale={[sceneScale, sceneScale, sceneScale]}>
	<T.Group bind:ref={screenRail} position={railPosition}>
		{#each screens as screen, index}
			<T.Group bind:ref={screenNodes[index]} position={screen.position} rotation={screen.rotation}>
				<HomeIntroScreenPanel
					{index}
					imageSrc={screen.primary ? titleImageSrc : ""}
					stillSrc={screen.stillSrc}
					primary={screen.primary}
					shouldLoadMedia={screenMediaLoadStates[index]}
				/>
			</T.Group>
		{/each}
	</T.Group>

  <T.Group bind:ref={starColumn} position={starColumnPosition} scale={starColumnScale}>
		{#each visibleParticles as particle, index}
			<HomeIntroParticle
				{particle}
				{index}
				{input}
				wheel={effectWheel}
				scrollStep={effectScrollStepY}
				scrollSpan={particleScrollSpan}
				{atmosphereReveal}
			/>
		{/each}
	</T.Group>

	<T.Group bind:ref={emblem} position={[0, emblemBaseY, -2.28]} scale={emblemScale}>
		<T.Group bind:ref={ringGlowA} rotation={[Math.PI / 2, 0, 0]}>
			<HomeIntroRingGlow
				radius={0.86}
				count={0}
				color="#67e8f9"
				opacity={0.5}
				size={0.3}
				haloOpacity={0.96}
				emitter={true}
				emitterAngle={0.18}
				emitterSize={1.52}
				emitterOpacity={1}
				emitterFrontFacing={true}
				emitterFrontOffset={1.65}
				{atmosphereReveal}
			/>
		</T.Group>

		<T.Group bind:ref={ringGlowB} rotation={[0.32, Math.PI / 2, 0.26]}>
			<HomeIntroRingGlow
				radius={0.88}
				count={0}
				color="#8b5cf6"
				opacity={0.9}
				size={0.27}
				haloOpacity={0.86}
				emitter={true}
				emitterAngle={2.24}
				emitterSize={1.34}
				emitterOpacity={1}
				emitterFrontFacing={true}
				emitterFrontOffset={1.55}
				{atmosphereReveal}
			/>
		</T.Group>

		<T.Group bind:ref={ringGlowC} rotation={[0.76, 0.28, Math.PI / 2]}>
			<HomeIntroRingGlow
				radius={0.82}
				count={0}
				color="#a78bfa"
				opacity={0.9}
				size={0.24}
				haloOpacity={0.78}
				emitter={true}
				emitterAngle={4.18}
				emitterSize={1.18}
				emitterOpacity={1}
				emitterFrontFacing={true}
				emitterFrontOffset={1.45}
				{atmosphereReveal}
			/>
		</T.Group>

	</T.Group>
</T.Group>

<T.Group bind:ref={logoMeshRoot} position={logoIntroStartPosition} scale={[2.35, 2.35, 2.35]} />
