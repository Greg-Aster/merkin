<script lang="ts">
import { type Stage, T, useTask, useThrelte } from '@threlte/core'
import { onMount } from 'svelte'
import {
  ClampToEdgeWrapping,
  DoubleSide,
  type Group,
  LinearFilter,
  SRGBColorSpace,
  type Texture,
  TextureLoader,
  Vector3,
} from 'three'

type TentacleTile = {
  index: number
  sourceY: number
  sourceHeight: number
}

type TentacleTileManifest = {
  version: number
  frameCount: number
  sourceWidth: number
  sourceHeight: number
  crop: {
    left: number
    width: number
  }
  renderAspect: number
  alphaTest: number
  tileCount: number
  tiles: TentacleTile[]
}

export let targetHeight = 5.75
export let orbitPhase = 0
export let motionStage: Stage

const manifestSrc = '/assets/sprites/tentacle/tiles/manifest.json'
const tileBaseSrc = '/assets/sprites/tentacle/tiles'
const textureLoader = new TextureLoader()
const tentacleDepthRenderOrder = 10
const doubleSide = DoubleSide
const viewportOverscan = 1.28
const phaseEpsilon = 0.0001
const projectedTileTop = new Vector3()
const projectedTileBottom = new Vector3()
const { camera } = useThrelte()

let tileRoot: Group | null = null
let manifest: TentacleTileManifest | null = null
let tileTextures = new Map<string, Texture>()
let loadingTileKeys = new Set<string>()
let visibleTileIndexes: number[] = []
let activeFrame = 0
let displayedFrame = -1
let scrollDirection = 1
let lastOrbitPhase = orbitPhase
let lastAdmissionKey = ''
let loadToken = 0
let mounted = false

function wrapFrame(frame: number, frameCount: number) {
  return ((frame % frameCount) + frameCount) % frameCount
}

function getTileKey(frame: number, tileIndex: number) {
  return `${frame}:${tileIndex}`
}

function getTileSrc(frame: number, tileIndex: number) {
  return `${tileBaseSrc}/frame-${String(frame).padStart(2, '0')}-tile-${tileIndex}.webp`
}

function arraysEqual(left: number[], right: number[]) {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  )
}

function isFinitePositive(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

function parseManifest(value: unknown): TentacleTileManifest {
  if (!value || typeof value !== 'object') {
    throw new Error('Tentacle tile manifest must be an object')
  }

  const candidate = value as Partial<TentacleTileManifest>
  if (
    candidate.version !== 1 ||
    !Number.isInteger(candidate.frameCount) ||
    !isFinitePositive(candidate.frameCount) ||
    !Number.isInteger(candidate.sourceWidth) ||
    !isFinitePositive(candidate.sourceWidth) ||
    !Number.isInteger(candidate.sourceHeight) ||
    !isFinitePositive(candidate.sourceHeight) ||
    !candidate.crop ||
    !Number.isInteger(candidate.crop.left) ||
    !Number.isInteger(candidate.crop.width) ||
    !isFinitePositive(candidate.crop.width) ||
    !isFinitePositive(candidate.renderAspect) ||
    !isFinitePositive(candidate.alphaTest) ||
    !Number.isInteger(candidate.tileCount) ||
    !isFinitePositive(candidate.tileCount) ||
    !Array.isArray(candidate.tiles) ||
    candidate.tiles.length !== candidate.tileCount
  ) {
    throw new Error('Tentacle tile manifest has an invalid geometry contract')
  }

  const tiles = candidate.tiles.map((tile, index) => {
    if (
      !tile ||
      tile.index !== index ||
      !Number.isInteger(tile.sourceY) ||
      tile.sourceY < 0 ||
      !Number.isInteger(tile.sourceHeight) ||
      !isFinitePositive(tile.sourceHeight) ||
      tile.sourceY + tile.sourceHeight > candidate.sourceHeight!
    ) {
      throw new Error(`Tentacle tile manifest entry ${index} is invalid`)
    }
    return tile
  })

  return {
    ...candidate,
    frameCount: candidate.frameCount,
    sourceWidth: candidate.sourceWidth,
    sourceHeight: candidate.sourceHeight,
    crop: candidate.crop,
    renderAspect: candidate.renderAspect,
    alphaTest: candidate.alphaTest,
    tileCount: candidate.tileCount,
    tiles,
  } as TentacleTileManifest
}

function configureTileTexture(texture: Texture) {
  texture.colorSpace = SRGBColorSpace
  texture.generateMipmaps = false
  texture.minFilter = LinearFilter
  texture.magFilter = LinearFilter
  texture.wrapS = ClampToEdgeWrapping
  texture.wrapT = ClampToEdgeWrapping
  texture.anisotropy = 4
  texture.needsUpdate = true
}

function getTileScale(tile: TentacleTile) {
  if (!manifest) return [0, 0, 1] as [number, number, number]
  return [
    targetHeight * manifest.renderAspect,
    targetHeight * (tile.sourceHeight / manifest.sourceHeight),
    1,
  ] as [number, number, number]
}

function getTileY(tile: TentacleTile) {
  if (!manifest) return 0
  const sourceCenter = tile.sourceY + tile.sourceHeight / 2
  return (
    targetHeight / 2 - (sourceCenter / manifest.sourceHeight) * targetHeight
  )
}

function getVisibleTileIndexes() {
  const currentCamera = camera.current
  if (!manifest || !tileRoot || !currentCamera) return []

  currentCamera.updateWorldMatrix(true, false)
  tileRoot.updateWorldMatrix(true, false)

  return manifest.tiles
    .filter(tile => {
      const localTop =
        targetHeight / 2 -
        (tile.sourceY / manifest!.sourceHeight) * targetHeight
      const localBottom =
        targetHeight / 2 -
        ((tile.sourceY + tile.sourceHeight) / manifest!.sourceHeight) *
          targetHeight

      projectedTileTop
        .set(0, localTop, 0)
        .applyMatrix4(tileRoot!.matrixWorld)
        .project(currentCamera)
      projectedTileBottom
        .set(0, localBottom, 0)
        .applyMatrix4(tileRoot!.matrixWorld)
        .project(currentCamera)

      const projectedTop = Math.max(projectedTileTop.y, projectedTileBottom.y)
      const projectedBottom = Math.min(
        projectedTileTop.y,
        projectedTileBottom.y,
      )
      return (
        projectedTop >= -viewportOverscan && projectedBottom <= viewportOverscan
      )
    })
    .map(tile => tile.index)
}

function getRequiredTileKeys() {
  if (!manifest || visibleTileIndexes.length === 0) return new Set<string>()

  const requiredFrames = new Set([activeFrame])
  if (displayedFrame >= 0) requiredFrames.add(displayedFrame)
  if (displayedFrame === activeFrame) {
    requiredFrames.add(
      wrapFrame(activeFrame + scrollDirection, manifest.frameCount),
    )
  }

  const requiredKeys = new Set<string>()
  requiredFrames.forEach(frame => {
    visibleTileIndexes.forEach(tileIndex => {
      requiredKeys.add(getTileKey(frame, tileIndex))
    })
  })
  return requiredKeys
}

function disposeUnneededTileTextures() {
  const requiredKeys = getRequiredTileKeys()
  let changed = false
  const nextTextures = new Map(tileTextures)

  tileTextures.forEach((texture, key) => {
    if (requiredKeys.has(key)) return
    texture.dispose()
    nextTextures.delete(key)
    changed = true
  })

  if (changed) tileTextures = nextTextures
}

function tryPromoteActiveFrame() {
  if (!manifest || visibleTileIndexes.length === 0) return
  const ready = visibleTileIndexes.every(tileIndex =>
    tileTextures.has(getTileKey(activeFrame, tileIndex)),
  )
  if (!ready || displayedFrame === activeFrame) return

  displayedFrame = activeFrame
  syncRequiredTileTextures()
}

function loadTileTexture(frame: number, tileIndex: number, token: number) {
  const key = getTileKey(frame, tileIndex)
  loadingTileKeys.add(key)
  const src = getTileSrc(frame, tileIndex)

  textureLoader.load(
    src,
    texture => {
      loadingTileKeys.delete(key)
      if (!mounted || token !== loadToken) {
        texture.dispose()
        return
      }

      if (!getRequiredTileKeys().has(key)) {
        texture.dispose()
        return
      }

      configureTileTexture(texture)
      const nextTextures = new Map(tileTextures)
      nextTextures.get(key)?.dispose()
      nextTextures.set(key, texture)
      tileTextures = nextTextures
      tryPromoteActiveFrame()
      disposeUnneededTileTextures()
    },
    undefined,
    error => {
      loadingTileKeys.delete(key)
      if (token !== loadToken) return
      console.error(`Failed to load portal tentacle tile: ${src}`, error)
    },
  )
}

function syncRequiredTileTextures() {
  if (!manifest || !mounted) return
  const requiredKeys = getRequiredTileKeys()

  requiredKeys.forEach(key => {
    if (tileTextures.has(key) || loadingTileKeys.has(key)) return
    const [frame, tileIndex] = key.split(':').map(Number)
    loadTileTexture(frame, tileIndex, loadToken)
  })
  disposeUnneededTileTextures()
}

function disposeTileTextures() {
  tileTextures.forEach(texture => texture.dispose())
  tileTextures = new Map()
  loadingTileKeys.clear()
}

async function loadManifest(token: number) {
  try {
    const response = await fetch(manifestSrc)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    const nextManifest = parseManifest(await response.json())
    if (!mounted || token !== loadToken) return
    manifest = nextManifest
  } catch (error) {
    if (token !== loadToken) return
    console.error(
      `Failed to load portal tentacle manifest: ${manifestSrc}`,
      error,
    )
  }
}

function updateVisibleTentacleTiles() {
  if (!manifest || !mounted) return

  const phaseDelta = orbitPhase - lastOrbitPhase
  if (Math.abs(phaseDelta) >= phaseEpsilon) {
    scrollDirection = phaseDelta > 0 ? 1 : -1
  }
  lastOrbitPhase = orbitPhase

  const nextActiveFrame = wrapFrame(
    Math.round((orbitPhase / (Math.PI * 2)) * manifest.frameCount),
    manifest.frameCount,
  )
  const nextVisibleTileIndexes = getVisibleTileIndexes()
  const nextAdmissionKey = [
    nextActiveFrame,
    scrollDirection,
    ...nextVisibleTileIndexes,
  ].join(':')

  if (nextAdmissionKey === lastAdmissionKey) return
  lastAdmissionKey = nextAdmissionKey
  activeFrame = nextActiveFrame
  if (!arraysEqual(nextVisibleTileIndexes, visibleTileIndexes)) {
    visibleTileIndexes = nextVisibleTileIndexes
  }
  syncRequiredTileTextures()
  tryPromoteActiveFrame()
}

useTask(updateVisibleTentacleTiles, {
  stage: motionStage,
  autoInvalidate: false,
})

onMount(() => {
  mounted = true
  loadToken += 1
  void loadManifest(loadToken)

  return () => {
    mounted = false
    loadToken += 1
    disposeTileTextures()
  }
})
</script>

<T.Group bind:ref={tileRoot}>
	{#if manifest && displayedFrame >= 0}
		{#each manifest.tiles as tile}
			{@const tileTexture = tileTextures.get(getTileKey(displayedFrame, tile.index))}
			{#if tileTexture && visibleTileIndexes.includes(tile.index)}
				<T.Mesh
					position={[0, getTileY(tile), 0]}
					scale={getTileScale(tile)}
					renderOrder={tentacleDepthRenderOrder}
				>
					<T.PlaneGeometry args={[1, 1]} />
					<T.MeshBasicMaterial
						map={tileTexture}
						color="#ffffff"
						side={doubleSide}
						transparent={true}
						alphaTest={manifest.alphaTest}
						depthTest={true}
						depthWrite={true}
						toneMapped={false}
					/>
				</T.Mesh>
			{/if}
		{/each}
	{/if}
</T.Group>
