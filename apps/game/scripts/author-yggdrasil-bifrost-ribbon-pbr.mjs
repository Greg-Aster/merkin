import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  authorSourceGlbPbrMaps,
  channel,
  readGlb,
  seededNoise,
  writeGlb,
  writePng,
} from './lib/authoredPbrGlb.mjs'

const repoRoot = join(import.meta.dirname, '../../..')
const publicRoot = join(repoRoot, 'apps/megameal/public')
const assetUrl =
  '/generated/hunyuan3d/yggdrasil-bifrost-ribbon/yggdrasil-bifrost-ribbon-merged-2026-04-25T02-17-02-006Z.glb'
const textureSize = 64
const workflow = 'apps/game/scripts/author-yggdrasil-bifrost-ribbon-pbr.mjs'
const sourcePath = join(publicRoot, assetUrl)
const sidecarPath = sourcePath.replace(/\.glb$/i, '.json')
const authoredAt = '2026-05-11'
const slotsAuthored = [
  'baseColorTexture',
  'metallicRoughnessTexture',
  'normalTexture',
  'emissiveTexture',
]
const description =
  'Embedded consolidated procedural luminous-ribbon base color, metallic-roughness, normal, and emissive maps for the Yggdrasil Bifrost runway material.'
const sidecarProvenance =
  'Procedural luminous-ribbon PBR and emissive maps authored from the existing Bifrost material palette, consolidated to one runtime material, and embedded in the source GLB before runtime variant cooking.'

function setCollapsedAuthoringMetadata(json) {
  json.extras = {
    ...(json.extras ?? {}),
    materialAuthoring: {
      workflow,
      authoredAt,
      assetUrl,
      textureSize,
      description,
      runtimeMaterialStrategy:
        'single authored ribbon material so runtime cooking can join the seven ribbon segments into one primitive',
      materials: [
        {
          materialIndex: 0,
          baseColorTexture:
            json.materials?.[0]?.pbrMetallicRoughness?.baseColorTexture
              ?.index ?? null,
          metallicRoughnessTexture:
            json.materials?.[0]?.pbrMetallicRoughness?.metallicRoughnessTexture
              ?.index ?? null,
          normalTexture: json.materials?.[0]?.normalTexture?.index ?? null,
          emissiveTexture: json.materials?.[0]?.emissiveTexture?.index ?? null,
        },
      ],
    },
  }
}

function updateSidecarMetadata() {
  const sidecar = existsSync(sidecarPath)
    ? JSON.parse(readFileSync(sidecarPath, 'utf8'))
    : {}
  writeFileSync(
    sidecarPath,
    `${JSON.stringify(
      {
        ...sidecar,
        materialAuthoring: {
          workflow,
          authoredAt,
          textureSize,
          slotsAuthored,
          provenance: sidecarProvenance,
          runtimeMaterialStrategy:
            'single authored ribbon material for joined runtime variants',
        },
      },
      null,
      2,
    )}\n`,
  )
}

function collapseRibbonToSingleMaterial() {
  const { json, bin } = readGlb(sourcePath)
  const firstMaterial = json.materials?.[0]
  if (!firstMaterial) return false

  let changed = false
  for (const mesh of json.meshes ?? []) {
    for (const primitive of mesh.primitives ?? []) {
      if (primitive.material !== 0) {
        primitive.material = 0
        changed = true
      }
    }
  }

  if ((json.materials?.length ?? 0) !== 1) {
    json.materials = [firstMaterial]
    changed = true
  }

  const usedTextureIndices = [
    firstMaterial.pbrMetallicRoughness?.baseColorTexture?.index,
    firstMaterial.pbrMetallicRoughness?.metallicRoughnessTexture?.index,
    firstMaterial.normalTexture?.index,
    firstMaterial.emissiveTexture?.index,
  ].filter(Number.isInteger)

  if (usedTextureIndices.length > 0) {
    const textureMap = new Map(
      usedTextureIndices.map((textureIndex, nextIndex) => [
        textureIndex,
        nextIndex,
      ]),
    )
    const nextTextures = usedTextureIndices.map(
      textureIndex => json.textures?.[textureIndex],
    )
    const imageIndices = nextTextures
      .map(texture => texture?.source)
      .filter(Number.isInteger)
    const imageMap = new Map(
      imageIndices.map((imageIndex, nextIndex) => [imageIndex, nextIndex]),
    )

    json.textures = nextTextures.map(texture => ({
      ...texture,
      source: imageMap.get(texture.source),
    }))
    json.images = imageIndices.map(imageIndex => json.images?.[imageIndex])
    firstMaterial.pbrMetallicRoughness.baseColorTexture.index = textureMap.get(
      firstMaterial.pbrMetallicRoughness.baseColorTexture.index,
    )
    firstMaterial.pbrMetallicRoughness.metallicRoughnessTexture.index =
      textureMap.get(
        firstMaterial.pbrMetallicRoughness.metallicRoughnessTexture.index,
      )
    firstMaterial.normalTexture.index = textureMap.get(
      firstMaterial.normalTexture.index,
    )
    if (firstMaterial.emissiveTexture) {
      firstMaterial.emissiveTexture.index = textureMap.get(
        firstMaterial.emissiveTexture.index,
      )
    }
    changed = true
  }

  setCollapsedAuthoringMetadata(json)
  writeGlb(sourcePath, json, bin)
  updateSidecarMetadata()
  return changed
}

function ribbonWave(x, y, seed) {
  const u = x / textureSize
  const v = y / textureSize
  const flow = Math.sin((u * 7 + v * 2 + seed * 0.13) * Math.PI * 2)
  const shimmer = Math.sin((u * 19 - v * 11 + seed * 0.07) * Math.PI * 2)
  const pulse = Math.sin((u + v + seed * 0.03) * Math.PI * 8)
  const noise = seededNoise(x, y, seed) * 2 - 1
  return flow * 0.42 + shimmer * 0.24 + pulse * 0.18 + noise * 0.16
}

function createBaseColorTexture(baseColor, seed) {
  const pixels = Buffer.alloc(textureSize * textureSize * 4)
  for (let y = 0; y < textureSize; y += 1) {
    for (let x = 0; x < textureSize; x += 1) {
      const wave = ribbonWave(x, y, seed)
      const sparkle = seededNoise(x, y, seed + 101) > 0.94 ? 0.18 : 0
      const core = Math.max(
        0,
        Math.sin((x / textureSize + seed * 0.05) * Math.PI * 6),
      )
      const shade = 0.76 + wave * 0.14 + sparkle + core * 0.08
      const offset = (y * textureSize + x) * 4
      pixels[offset] = channel(baseColor[0] * shade + sparkle * 0.35)
      pixels[offset + 1] = channel(baseColor[1] * (shade + 0.05))
      pixels[offset + 2] = channel(baseColor[2] * (shade + 0.12))
      pixels[offset + 3] = channel(baseColor[3] ?? 0.78)
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
      const wave = Math.abs(ribbonWave(x, y, seed))
      const polishedCurrent = seededNoise(x, y, seed + 149) > 0.88 ? 0.12 : 0
      const offset = (y * textureSize + x) * 3
      pixels[offset] = 0
      pixels[offset + 1] = channel(roughness + wave * 0.06 - polishedCurrent)
      pixels[offset + 2] = channel(metallic + polishedCurrent * 0.45)
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
  const strength = 0.16
  for (let y = 0; y < textureSize; y += 1) {
    for (let x = 0; x < textureSize; x += 1) {
      const left = ribbonWave(Math.max(0, x - 1), y, seed)
      const right = ribbonWave(Math.min(textureSize - 1, x + 1), y, seed)
      const down = ribbonWave(x, Math.max(0, y - 1), seed)
      const up = ribbonWave(x, Math.min(textureSize - 1, y + 1), seed)
      const dx = (right - left) * strength
      const dy = (up - down) * strength
      const dz = 1
      const length = Math.hypot(dx, dy, dz) || 1
      const offset = (y * textureSize + x) * 3
      pixels[offset] = channel((dx / length) * 0.5 + 0.5)
      pixels[offset + 1] = channel((dy / length) * 0.5 + 0.5)
      pixels[offset + 2] = channel((dz / length) * 0.5 + 0.5)
    }
  }
  return writePng({
    width: textureSize,
    height: textureSize,
    channels: 3,
    pixels,
  })
}

function createEmissiveTexture(emissive, seed) {
  const pixels = Buffer.alloc(textureSize * textureSize * 4)
  for (let y = 0; y < textureSize; y += 1) {
    for (let x = 0; x < textureSize; x += 1) {
      const wave = ribbonWave(x, y, seed)
      const filament = Math.max(
        0,
        Math.sin(
          ((x / textureSize) * 13 + (y / textureSize) * 3 + seed) * Math.PI,
        ),
      )
      const spark = seededNoise(x, y, seed + 211) > 0.9 ? 0.3 : 0
      const glow = 0.58 + Math.max(0, wave) * 0.28 + filament * 0.22 + spark
      const offset = (y * textureSize + x) * 4
      pixels[offset] = channel(emissive[0] * glow)
      pixels[offset + 1] = channel(emissive[1] * glow)
      pixels[offset + 2] = channel(emissive[2] * glow)
      pixels[offset + 3] = 255
    }
  }
  return writePng({
    width: textureSize,
    height: textureSize,
    channels: 4,
    pixels,
  })
}

function createTextureSet({ label, material, pbr, seed }) {
  const baseColor = pbr.baseColorFactor ?? [1, 1, 1, 0.78]
  const metallic = pbr.metallicFactor ?? 0.75
  const roughness = pbr.roughnessFactor ?? 0.2
  const emissive = material.emissiveFactor ?? [
    baseColor[0] * 0.25,
    baseColor[1] * 0.25,
    baseColor[2] * 0.25,
  ]

  return {
    baseColor: {
      name: `${label}-bifrost-basecolor`,
      imageBytes: createBaseColorTexture(baseColor, seed),
      factor: [1, 1, 1, baseColor[3] ?? 0.78],
    },
    metallicRoughness: {
      name: `${label}-bifrost-metalrough`,
      imageBytes: createMetallicRoughnessTexture({ metallic, roughness }, seed),
      metallicFactor: 1,
      roughnessFactor: 1,
    },
    normal: {
      name: `${label}-bifrost-normal`,
      imageBytes: createNormalTexture(seed),
      scale: 0.65,
    },
    emissive: {
      name: `${label}-bifrost-emissive`,
      imageBytes: createEmissiveTexture(emissive, seed),
      factor: [1, 1, 1],
    },
  }
}

collapseRibbonToSingleMaterial()

const result = authorSourceGlbPbrMaps({
  publicRoot,
  assetUrl,
  workflow,
  authoredAt,
  textureSize,
  slotsAuthored,
  materialPrefix: 'yggdrasil-bifrost-ribbon',
  description,
  sidecarProvenance,
  createTextureSet,
})

collapseRibbonToSingleMaterial()

console.log(
  result.changed
    ? `Authored PBR material maps for ${assetUrl}`
    : `PBR material maps already authored for ${assetUrl}`,
)
