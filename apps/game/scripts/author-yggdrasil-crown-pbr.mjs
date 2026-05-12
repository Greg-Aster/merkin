import { join } from 'node:path'
import {
  authorSourceGlbPbrMaps,
  channel,
  seededNoise,
  writePng,
} from './lib/authoredPbrGlb.mjs'

const repoRoot = join(import.meta.dirname, '../../..')
const publicRoot = join(repoRoot, 'apps/megameal/public')
const assetUrl =
  '/generated/hunyuan3d/yggdrasil-crown-ascent/yggdrasil-crown-ascent-merged-2026-04-25T02-12-58-163Z.glb'
const textureSize = 64
const workflow = 'apps/game/scripts/author-yggdrasil-crown-pbr.mjs'

function grainHeight(x, y, seed) {
  const u = x / textureSize
  const v = y / textureSize
  const rings = Math.sin((u * 9 + v * 3 + seed * 0.17) * Math.PI * 2)
  const cross = Math.sin((u * 2 - v * 7 + seed * 0.11) * Math.PI * 2)
  const noise = seededNoise(x, y, seed) * 2 - 1
  return rings * 0.55 + cross * 0.25 + noise * 0.2
}

function createBaseColorTexture(baseColor, seed) {
  const pixels = Buffer.alloc(textureSize * textureSize * 4)
  for (let y = 0; y < textureSize; y += 1) {
    for (let x = 0; x < textureSize; x += 1) {
      const height = grainHeight(x, y, seed)
      const streak = Math.sin(((x + seed * 3) / textureSize) * Math.PI * 18)
      const shade = 0.82 + height * 0.12 + streak * 0.025
      const warmth = 1 + (seed % 5) * 0.015
      const offset = (y * textureSize + x) * 4
      pixels[offset] = channel(baseColor[0] * shade * warmth)
      pixels[offset + 1] = channel(baseColor[1] * (shade + 0.035))
      pixels[offset + 2] = channel(baseColor[2] * (shade - 0.025))
      pixels[offset + 3] = channel(baseColor[3] ?? 1)
    }
  }
  return writePng({
    width: textureSize,
    height: textureSize,
    channels: 4,
    pixels,
  })
}

function createMetallicRoughnessTexture({ metallic, roughness }, seed) {
  const pixels = Buffer.alloc(textureSize * textureSize * 3)
  for (let y = 0; y < textureSize; y += 1) {
    for (let x = 0; x < textureSize; x += 1) {
      const wear = Math.abs(grainHeight(x, y, seed))
      const edgeWear = (seed % 3) * 0.015
      const offset = (y * textureSize + x) * 3
      pixels[offset] = 0
      pixels[offset + 1] = channel(roughness - wear * 0.08 + edgeWear)
      pixels[offset + 2] = channel(metallic + wear * 0.025)
    }
  }
  return writePng({
    width: textureSize,
    height: textureSize,
    channels: 3,
    pixels,
  })
}

function createNormalTexture(seed) {
  const pixels = Buffer.alloc(textureSize * textureSize * 3)
  const strength = 0.11
  for (let y = 0; y < textureSize; y += 1) {
    for (let x = 0; x < textureSize; x += 1) {
      const left = grainHeight(Math.max(0, x - 1), y, seed)
      const right = grainHeight(Math.min(textureSize - 1, x + 1), y, seed)
      const down = grainHeight(x, Math.max(0, y - 1), seed)
      const up = grainHeight(x, Math.min(textureSize - 1, y + 1), seed)
      const dx = (right - left) * strength
      const dy = (up - down) * strength
      const dz = 1
      const length = Math.hypot(dx, dy, dz) || 1
      const offset = (y * textureSize + x) * 3
      pixels[offset] = channel(dx / length * 0.5 + 0.5)
      pixels[offset + 1] = channel(dy / length * 0.5 + 0.5)
      pixels[offset + 2] = channel(dz / length * 0.5 + 0.5)
    }
  }
  return writePng({
    width: textureSize,
    height: textureSize,
    channels: 3,
    pixels,
  })
}

function createTextureSet({ label, pbr, seed }) {
  const baseColor = pbr.baseColorFactor ?? [1, 1, 1, 1]
  const metallic = pbr.metallicFactor ?? 1
  const roughness = pbr.roughnessFactor ?? 1

  return {
    baseColor: {
      name: `${label}-rootgrain-basecolor`,
      imageBytes: createBaseColorTexture(baseColor, seed),
      factor: [1, 1, 1, baseColor[3] ?? 1],
    },
    metallicRoughness: {
      name: `${label}-rootgrain-metalrough`,
      imageBytes: createMetallicRoughnessTexture({ metallic, roughness }, seed),
      metallicFactor: 1,
      roughnessFactor: 1,
    },
    normal: {
      name: `${label}-rootgrain-normal`,
      imageBytes: createNormalTexture(seed),
      scale: 0.7,
    },
  }
}

const result = authorSourceGlbPbrMaps({
  publicRoot,
  assetUrl,
  workflow,
  authoredAt: '2026-05-10',
  textureSize,
  materialPrefix: 'yggdrasil-crown-ascent',
  description:
    'Embedded procedural root-grain base color, metallic-roughness, and normal maps for the Yggdrasil crown ascent walkway materials.',
  sidecarProvenance:
    'Procedural root-grain PBR maps authored from the existing material palette and embedded in the source GLB before runtime variant cooking.',
  createTextureSet,
})

console.log(
  result.changed
    ? `Authored PBR material maps for ${assetUrl}`
    : `PBR material maps already authored for ${assetUrl}`,
)
