<script lang="ts">
import { T } from '@threlte/core'
import { onMount } from 'svelte'
import {
  ClampToEdgeWrapping,
  LinearFilter,
  SRGBColorSpace,
  TextureLoader,
  type Texture,
} from 'three'

type AtlasSegment = {
  src: string
  startFrame: number
  frames: number
  columns: number
  rows: number
}

export let targetHeight = 5.75
export let orbitPhase = 0

const atlasFrames = 24
const frameAspect = 689 / 1833
const atlasSegments: AtlasSegment[] = [
  {
    src: '/assets/sprites/tentacle/atlas-24-1.webp',
    startFrame: 0,
    frames: 6,
    columns: 3,
    rows: 2,
  },
  {
    src: '/assets/sprites/tentacle/atlas-24-2.webp',
    startFrame: 6,
    frames: 6,
    columns: 3,
    rows: 2,
  },
  {
    src: '/assets/sprites/tentacle/atlas-24-3.webp',
    startFrame: 12,
    frames: 6,
    columns: 3,
    rows: 2,
  },
  {
    src: '/assets/sprites/tentacle/atlas-24-4.webp',
    startFrame: 18,
    frames: 6,
    columns: 3,
    rows: 2,
  },
]
const textureLoader = new TextureLoader()
const tentacleDepthRenderOrder = 10
const tentacleAlphaTest = 17 / 255
const preloadBoundaryFrames = 1

let atlasTextures: Array<Texture | null> = atlasSegments.map(() => null)
let atlasTextureLoading = atlasSegments.map(() => false)
let activeAtlasTexture: Texture | null = null
let nextAtlasTexture: Texture | null = null
let activeFrame = 0
let loadToken = 0
let mounted = false

$: spriteScale = [targetHeight * frameAspect, targetHeight, 1] as [
  number,
  number,
  number,
]
$: activeFrame = wrapFrame(
  Math.round((orbitPhase / (Math.PI * 2)) * atlasFrames),
)
$: if (mounted) {
  syncRequiredAtlasSegments(activeFrame, atlasTextures)
}
$: nextAtlasTexture = getAtlasTexture(activeFrame, atlasTextures)
$: if (nextAtlasTexture) {
  activeAtlasTexture = nextAtlasTexture
  syncAtlasFrame(nextAtlasTexture, activeFrame)
}

function wrapFrame(frame: number) {
  return ((frame % atlasFrames) + atlasFrames) % atlasFrames
}

function getAtlasSegmentIndex(frame: number) {
  return atlasSegments.findIndex(
    segment =>
      frame >= segment.startFrame &&
      frame < segment.startFrame + segment.frames,
  )
}

function getAtlasSegment(frame: number) {
  const segmentIndex = getAtlasSegmentIndex(frame)
  return segmentIndex >= 0 ? atlasSegments[segmentIndex] : null
}

function getAtlasTexture(
  frame: number,
  textures: Array<Texture | null>,
) {
  const segmentIndex = getAtlasSegmentIndex(frame)
  return segmentIndex >= 0 ? textures[segmentIndex] : null
}

function configureAtlasTexture(texture: Texture) {
  texture.colorSpace = SRGBColorSpace
  texture.generateMipmaps = false
  texture.minFilter = LinearFilter
  texture.magFilter = LinearFilter
  texture.wrapS = ClampToEdgeWrapping
  texture.wrapT = ClampToEdgeWrapping
  texture.anisotropy = 4
  texture.needsUpdate = true
}

function syncAtlasFrame(texture: Texture, frame: number) {
  const segment = getAtlasSegment(frame)
  if (!segment) return

  const localFrame = frame - segment.startFrame
  const column = localFrame % segment.columns
  const row = Math.floor(localFrame / segment.columns)

  texture.repeat.set(1 / segment.columns, 1 / segment.rows)
  texture.offset.set(column / segment.columns, 1 - (row + 1) / segment.rows)
  texture.updateMatrix()
}

function disposeAtlasTextures() {
  atlasTextures.forEach(texture => texture?.dispose())
  atlasTextures = atlasSegments.map(() => null)
  atlasTextureLoading = atlasSegments.map(() => false)
  activeAtlasTexture = null
  nextAtlasTexture = null
}

function getRequiredAtlasSegmentIndexes(frame: number) {
  const segmentIndex = getAtlasSegmentIndex(frame)
  if (segmentIndex < 0) return new Set<number>()

  const segment = atlasSegments[segmentIndex]
  const localFrame = frame - segment.startFrame
  const required = new Set([segmentIndex])

  if (localFrame <= preloadBoundaryFrames) {
    required.add(
      (segmentIndex - 1 + atlasSegments.length) % atlasSegments.length,
    )
  }
  if (localFrame >= segment.frames - 1 - preloadBoundaryFrames) {
    required.add((segmentIndex + 1) % atlasSegments.length)
  }

  return required
}

function syncRequiredAtlasSegments(
  frame: number,
  textures: Array<Texture | null>,
) {
  const required = getRequiredAtlasSegmentIndexes(frame)
  const activeSegmentIndex = getAtlasSegmentIndex(frame)

  required.forEach(segmentIndex => {
    if (textures[segmentIndex] || atlasTextureLoading[segmentIndex]) return
    loadAtlasSegment(
      atlasSegments[segmentIndex],
      segmentIndex,
      loadToken,
    )
  })

  if (activeSegmentIndex < 0 || !textures[activeSegmentIndex]) return

  let changed = false
  const nextTextures = textures.map((texture, segmentIndex) => {
    if (!texture || required.has(segmentIndex)) return texture
    texture.dispose()
    changed = true
    return null
  })

  if (changed) atlasTextures = nextTextures
}

function loadAtlasSegment(
  segment: AtlasSegment,
  segmentIndex: number,
  token: number,
) {
  atlasTextureLoading[segmentIndex] = true
  textureLoader.load(
    segment.src,
    texture => {
      if (!mounted || token !== loadToken) {
        texture.dispose()
        return
      }

      atlasTextureLoading[segmentIndex] = false
      configureAtlasTexture(texture)
      const nextTextures = atlasTextures.slice()
      nextTextures[segmentIndex]?.dispose()
      nextTextures[segmentIndex] = texture
      atlasTextures = nextTextures
    },
    undefined,
    error => {
      if (token !== loadToken) return

      atlasTextureLoading[segmentIndex] = false
      console.error(
        `Failed to load portal tentacle sprite atlas: ${segment.src}`,
        error,
      )
    },
  )
}

onMount(() => {
  mounted = true
  loadToken += 1
  syncRequiredAtlasSegments(activeFrame, atlasTextures)

  return () => {
    mounted = false
    loadToken += 1
    disposeAtlasTextures()
  }
})
</script>

{#if activeAtlasTexture}
	<T.Sprite scale={spriteScale} renderOrder={tentacleDepthRenderOrder}>
		<T.SpriteMaterial
			map={activeAtlasTexture}
			color="#ffffff"
			transparent={true}
			alphaTest={tentacleAlphaTest}
			depthTest={true}
			depthWrite={true}
			toneMapped={false}
		/>
	</T.Sprite>
{/if}
