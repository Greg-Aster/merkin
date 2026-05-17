<script lang="ts">
import { T } from '@threlte/core'
import { useRapier } from '@threlte/rapier'
import { onDestroy } from 'svelte'
import * as THREE from 'three'
import ManagedLight from '../lighting/ManagedLight.svelte'

export let position: [number, number, number] = [0, 0, 0]
export let radius = 1
export let bandWidth = 1
export let enableContour = true
export let electricOpacity = 1
export let coreOpacity = 0.25
export let electricColor = '#7ed8ff'
export let lightColor = '#b4ecff'
export let lightDistance = 10
export let lightIntensity = 8
const gameplayPointLightScale = 180

const rapier = useRapier()
const rayDirection = { x: 0, y: -1, z: 0 }
const SAMPLE_RAY_HEIGHT = 18
const SAMPLE_RAY_DISTANCE = 72
const MIN_SAMPLE_COUNT = 14
const MAX_SAMPLE_COUNT = 22
const RADIUS_REBUILD_STEP = 2.4
const BANDWIDTH_REBUILD_STEP = 0.25
const POSITION_REBUILD_STEP = 0.5
const LIGHT_SAMPLE_COUNT = 2

let electricGeometry = new THREE.BufferGeometry()
let coreGeometry = new THREE.BufferGeometry()
let orbitLightPositions: Array<[number, number, number]> = []
let quantizedRadius = 0
let quantizedBandWidth = 0
let quantizedX = 0
let quantizedY = 0
let quantizedZ = 0
let rebuildKey = ''

function disposeGeometry(geometry: THREE.BufferGeometry) {
  geometry.dispose()
}

function replaceGeometry(
  target: 'electric' | 'core',
  nextGeometry: THREE.BufferGeometry,
) {
  const currentGeometry =
    target === 'electric' ? electricGeometry : coreGeometry

  if (target === 'electric') {
    electricGeometry = nextGeometry
  } else {
    coreGeometry = nextGeometry
  }

  disposeGeometry(currentGeometry)
}

function sampleGroundY(x: number, z: number, fallbackY: number) {
  if (!rapier.world || !rapier?.rapier?.Ray) return fallbackY

  const rayOriginY = Math.max(fallbackY + SAMPLE_RAY_HEIGHT, SAMPLE_RAY_HEIGHT)
  const ray = new rapier.rapier.Ray({ x, y: rayOriginY, z }, rayDirection)

  const hit = rapier.world.castRay(
    ray,
    SAMPLE_RAY_DISTANCE,
    true,
    rapier.rapier.QueryFilterFlags.EXCLUDE_SENSORS,
  )

  if (!hit || !Number.isFinite(hit.toi)) return fallbackY
  return rayOriginY - hit.toi
}

function sampleContourPoints() {
  const sampleCount = Math.max(
    MIN_SAMPLE_COUNT,
    Math.min(MAX_SAMPLE_COUNT, Math.round(radius * 0.45 + bandWidth * 4.5)),
  )
  const points: THREE.Vector3[] = []
  const centerX = position[0]
  const centerY = position[1]
  const centerZ = position[2]

  for (let index = 0; index < sampleCount; index += 1) {
    const angle = (index / sampleCount) * Math.PI * 2
    const radialNoise =
      Math.sin(angle * 6 + radius * 0.42) * bandWidth * 0.14 +
      Math.sin(angle * 13 - radius * 0.23) * bandWidth * 0.07
    const sampleRadius = Math.max(0.2, radius + radialNoise)
    const worldX = centerX + Math.cos(angle) * sampleRadius
    const worldZ = centerZ + Math.sin(angle) * sampleRadius
    const groundY = sampleGroundY(worldX, worldZ, centerY)
    const heightNoise =
      Math.sin(angle * 9 + radius * 0.8) * Math.min(0.16, bandWidth * 0.1)
    points.push(
      new THREE.Vector3(
        worldX - centerX,
        groundY - centerY + 0.08 + heightNoise,
        worldZ - centerZ,
      ),
    )
  }

  return points
}

function rebuildShockwaveGeometry() {
  const contourPoints = sampleContourPoints()
  if (contourPoints.length < 4) return

  const contourCurve = new THREE.CatmullRomCurve3(
    [...contourPoints, contourPoints[0].clone()],
    true,
    'catmullrom',
    0.32,
  )
  const tubularSegments = Math.max(14, contourPoints.length)

  replaceGeometry(
    'electric',
    new THREE.TubeGeometry(
      contourCurve,
      tubularSegments,
      Math.max(0.07, bandWidth * 0.18),
      4,
      true,
    ),
  )

  replaceGeometry(
    'core',
    new THREE.TubeGeometry(
      contourCurve,
      tubularSegments,
      Math.max(0.03, bandWidth * 0.08),
      3,
      true,
    ),
  )

  const lightIndexes = Array.from({ length: LIGHT_SAMPLE_COUNT }, (_, index) =>
    Math.floor(contourPoints.length * (index / LIGHT_SAMPLE_COUNT)),
  )

  orbitLightPositions = lightIndexes.map(pointIndex => {
    const point = contourPoints[pointIndex] ?? contourPoints[0]
    return [point.x, point.y + 0.3, point.z] as [number, number, number]
  })
}

$: quantizedRadius = Math.round(radius / RADIUS_REBUILD_STEP)
$: quantizedBandWidth = Math.round(bandWidth / BANDWIDTH_REBUILD_STEP)
$: quantizedX = Math.round(position[0] / POSITION_REBUILD_STEP)
$: quantizedY = Math.round(position[1] / POSITION_REBUILD_STEP)
$: quantizedZ = Math.round(position[2] / POSITION_REBUILD_STEP)
$: rebuildKey = `${quantizedRadius}:${quantizedBandWidth}:${quantizedX}:${quantizedY}:${quantizedZ}`
$: if (enableContour && rebuildKey) {
  rebuildShockwaveGeometry()
}

onDestroy(() => {
  disposeGeometry(electricGeometry)
  disposeGeometry(coreGeometry)
})
</script>

<T.Group {position}>
  <T.Mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} renderOrder={2}>
    <T.RingGeometry args={[Math.max(0.08, radius - bandWidth), radius, 40]} />
    <T.MeshBasicMaterial
      color={electricColor}
      transparent={true}
      opacity={enableContour ? electricOpacity * 0.26 : electricOpacity}
      depthWrite={false}
      side={THREE.DoubleSide}
    />
  </T.Mesh>

  <T.Mesh
    rotation={[-Math.PI / 2, 0, 0]}
    position={[0, 0.015, 0]}
    scale={[Math.max(1, radius * 0.2), Math.max(1, radius * 0.2), 1]}
    renderOrder={1}
  >
    <T.CircleGeometry args={[1, 28]} />
    <T.MeshBasicMaterial
      color={lightColor}
      transparent={true}
      opacity={enableContour ? coreOpacity * 0.45 : coreOpacity}
      depthWrite={false}
      side={THREE.DoubleSide}
    />
  </T.Mesh>

  <ManagedLight
    id={`ground-shockwave-core-${position[0]}-${position[1]}-${position[2]}`}
    ownerId="ground-shockwave"
    position={[0, 0.3, 0]}
    color={lightColor}
    intensity={(enableContour ? lightIntensity * 0.45 : lightIntensity) * gameplayPointLightScale}
    distance={Math.max(3, lightDistance * 0.7)}
    decay={1.4}
  />

  {#if enableContour}
  <T.Mesh geometry={electricGeometry} renderOrder={4}>
    <T.MeshStandardMaterial
      color={electricColor}
      emissive={electricColor}
      emissiveIntensity={2.9}
      transparent={true}
      opacity={electricOpacity}
      depthWrite={false}
      roughness={0.04}
      metalness={0.18}
      side={THREE.DoubleSide}
    />
  </T.Mesh>

  <T.Mesh geometry={coreGeometry} renderOrder={5}>
    <T.MeshBasicMaterial
      color={lightColor}
      transparent={true}
      opacity={coreOpacity}
      depthWrite={false}
      side={THREE.DoubleSide}
      blending={THREE.AdditiveBlending}
    />
  </T.Mesh>

  {#each orbitLightPositions as lightPosition, index (`${index}-${lightPosition[0].toFixed(2)}-${lightPosition[2].toFixed(2)}`)}
    <ManagedLight
      id={`ground-shockwave-orbit-${index}-${position[0]}-${position[1]}-${position[2]}`}
      ownerId="ground-shockwave"
      position={lightPosition}
      color={lightColor}
      intensity={lightIntensity * (0.3 + index * 0.05) * gameplayPointLightScale}
      distance={Math.max(3, lightDistance * 0.42)}
      decay={1.35}
    />
  {/each}
  {/if}
</T.Group>
