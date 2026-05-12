import { join } from 'node:path'
import {
  authorSourceGlbPbrMaps,
  channel,
  seededNoise,
  writePng,
} from './lib/authoredPbrGlb.mjs'

const repoRoot = join(import.meta.dirname, '../../..')
const publicRoot = join(repoRoot, 'apps/megameal/public')
const textureSize = 64
const workflow = 'apps/game/scripts/author-weathered-monolith-pbr.mjs'
const assetUrls = [
  '/generated/hunyuan3d/weathered-monolith-pillar/weathered-monolith-pillar-generated-2026-04-18T22-01-36-007Z.glb',
  '/generated/hunyuan3d/weathered-monolith-pillar/weathered-monolith-pillar-generated-2026-04-19T23-24-06-758Z.glb',
  '/generated/hunyuan3d/weathered-monolith-pillar/weathered-monolith-pillar-generated-2026-04-19T23-27-04-251Z.glb',
  '/generated/hunyuan3d/weathered-monolith-pillar/weathered-monolith-pillar-generated-2026-04-19T23-30-13-924Z.glb',
  '/generated/hunyuan3d/weathered-monolith-pillar/weathered-monolith-pillar-generated-2026-04-19T23-33-28-476Z.glb',
  '/generated/hunyuan3d/weathered-monolith-pillar/weathered-monolith-pillar-generated-2026-04-19T23-36-30-619Z.glb',
  '/generated/hunyuan3d/weathered-monolith-pillar/weathered-monolith-pillar-generated-2026-04-19T23-39-39-599Z.glb',
  '/generated/hunyuan3d/weathered-monolith-pillar/weathered-monolith-pillar-generated-2026-04-19T23-42-40-008Z.glb',
  '/generated/hunyuan3d/weathered-monolith-pillar/weathered-monolith-pillar-generated-2026-04-19T23-45-16-485Z.glb',
  '/generated/hunyuan3d/weathered-monolith-pillar/weathered-monolith-pillar-generated-2026-04-19T23-48-08-244Z.glb',
  '/generated/hunyuan3d/weathered-monolith-pillar/weathered-monolith-pillar-generated-2026-04-19T23-51-13-313Z.glb',
]

function stoneHeight(x, y, seed) {
  const u = x / textureSize
  const v = y / textureSize
  const strata = Math.sin((v * 16 + seed * 0.13) * Math.PI * 2)
  const chips = Math.sin((u * 11 - v * 4 + seed * 0.07) * Math.PI * 2)
  const pits = seededNoise(Math.floor(x / 2), Math.floor(y / 2), seed) * 2 - 1
  return strata * 0.35 + chips * 0.22 + pits * 0.43
}

function createBaseColorTexture(baseColor, seed) {
  const pixels = Buffer.alloc(textureSize * textureSize * 4)
  for (let y = 0; y < textureSize; y += 1) {
    for (let x = 0; x < textureSize; x += 1) {
      const height = stoneHeight(x, y, seed)
      const fissure =
        Math.abs(Math.sin((x * 0.33 + y * 0.17 + seed) * Math.PI)) > 0.965
      const coolLichen = seededNoise(x, y, seed + 31) > 0.92
      const shade = 0.74 + height * 0.16
      const violetVein = fissure ? 0.18 : 0
      const lichen = coolLichen ? 0.1 : 0
      const offset = (y * textureSize + x) * 4
      pixels[offset] = channel(baseColor[0] * shade + violetVein * 0.48)
      pixels[offset + 1] = channel(baseColor[1] * (shade + lichen * 0.7))
      pixels[offset + 2] = channel(baseColor[2] * (shade + 0.05) + violetVein)
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

function createMetallicRoughnessTexture({ roughness }, seed) {
  const pixels = Buffer.alloc(textureSize * textureSize * 3)
  for (let y = 0; y < textureSize; y += 1) {
    for (let x = 0; x < textureSize; x += 1) {
      const weathering = Math.abs(stoneHeight(x, y, seed))
      const polishedEdge = Math.max(0, seededNoise(x, y, seed + 47) - 0.84)
      const offset = (y * textureSize + x) * 3
      pixels[offset] = 0
      pixels[offset + 1] = channel(roughness + weathering * 0.07 - polishedEdge)
      pixels[offset + 2] = 0
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
  const strength = 0.18
  for (let y = 0; y < textureSize; y += 1) {
    for (let x = 0; x < textureSize; x += 1) {
      const left = stoneHeight(Math.max(0, x - 1), y, seed)
      const right = stoneHeight(Math.min(textureSize - 1, x + 1), y, seed)
      const down = stoneHeight(x, Math.max(0, y - 1), seed)
      const up = stoneHeight(x, Math.min(textureSize - 1, y + 1), seed)
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
  const baseColor = pbr.baseColorFactor ?? [0.36, 0.39, 0.45, 1]
  const roughness = pbr.roughnessFactor ?? 0.9

  return {
    baseColor: {
      name: `${label}-stone-basecolor`,
      imageBytes: createBaseColorTexture(baseColor, seed),
      factor: [1, 1, 1, baseColor[3] ?? 1],
    },
    metallicRoughness: {
      name: `${label}-stone-metalrough`,
      imageBytes: createMetallicRoughnessTexture({ roughness }, seed),
      metallicFactor: 0,
      roughnessFactor: 1,
    },
    normal: {
      name: `${label}-stone-normal`,
      imageBytes: createNormalTexture(seed),
      scale: 0.85,
    },
  }
}

let changedCount = 0

for (const assetUrl of assetUrls) {
  const result = authorSourceGlbPbrMaps({
    publicRoot,
    assetUrl,
    workflow,
    authoredAt: '2026-05-10',
    textureSize,
    materialPrefix: 'weathered-monolith-pillar',
    description:
      'Embedded procedural weathered-stone base color, metallic-roughness, and normal maps for Solitude/Yggdrasil monolith pillar source materials.',
    sidecarProvenance:
      'Procedural weathered-stone PBR maps authored from the existing material palette and embedded in the source GLB before runtime variant cooking.',
    createTextureSet,
  })
  if (result.changed) changedCount += 1
}

console.log(
  changedCount > 0
    ? `Authored PBR material maps for ${changedCount} weathered monolith source assets`
    : 'PBR material maps already authored for weathered monolith source assets',
)
