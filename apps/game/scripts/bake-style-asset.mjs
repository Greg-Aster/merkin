import { existsSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  align4,
  channel,
  readGlb,
  seededNoise,
  writeGlb,
  writePng,
} from './lib/authoredPbrGlb.mjs'
import {
  STYLE_BAKE_GENERATORS,
  createStyleBakeProduct,
  fingerprintFile,
  normalizeStyleBakeMode,
  normalizeStyleBakeSettings,
  styleBakeProceduralGenerator,
  writeStyleBakeMetadata,
} from './lib/styleBakeProducts.mjs'

function parseArgs(argv) {
  const args = {}
  for (let index = 0; index < argv.length; index += 1) {
    const raw = argv[index]
    if (!raw.startsWith('--')) continue
    const [key, inlineValue] = raw.slice(2).split('=')
    if (inlineValue !== undefined) {
      args[key] = inlineValue
      continue
    }
    const next = argv[index + 1]
    if (next && !next.startsWith('--')) {
      args[key] = next
      index += 1
    } else {
      args[key] = 'true'
    }
  }
  return args
}

function hashString(value) {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function clamp01(value) {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0))
}

function optionalUnitValue(value) {
  if (value === undefined) return undefined
  return clamp01(Number(value))
}

function mix(left, right, amount) {
  return left + (right - left) * amount
}

function normalizeColor(color, fallback = [0.72, 0.68, 0.58, 1]) {
  if (!Array.isArray(color)) return fallback
  return [
    clamp01(Number(color[0] ?? fallback[0])),
    clamp01(Number(color[1] ?? fallback[1])),
    clamp01(Number(color[2] ?? fallback[2])),
    clamp01(Number(color[3] ?? fallback[3] ?? 1)),
  ]
}

function getStyleProfileSettings(styleProfileName = '', prompt = '') {
  const key = `${styleProfileName} ${prompt}`.toLowerCase()
  if (/ink|noir|graphite|charcoal|line/.test(key)) {
    return {
      label: 'ink',
      tint: [0.88, 0.86, 0.78],
      shadowTint: [0.08, 0.075, 0.07],
      accent: [0.12, 0.1, 0.08],
      posterize: 5,
      lineStrength: 0.28,
      brushStrength: 0.18,
      roughness: 0.94,
      metallic: 0,
      normalScale: 0.42,
    }
  }
  if (/neon|cosmic|abyss|surreal|signal|violet/.test(key)) {
    return {
      label: 'cosmic',
      tint: [0.56, 0.78, 1],
      shadowTint: [0.035, 0.03, 0.12],
      accent: [1, 0.24, 0.82],
      posterize: 6,
      lineStrength: 0.16,
      brushStrength: 0.22,
      roughness: 0.82,
      metallic: 0.02,
      normalScale: 0.48,
    }
  }
  return {
    label: 'storybook',
    tint: [1, 0.86, 0.62],
    shadowTint: [0.16, 0.13, 0.11],
    accent: [0.24, 0.42, 0.72],
    posterize: 5,
    lineStrength: 0.2,
    brushStrength: 0.2,
    roughness: 0.9,
    metallic: 0,
    normalScale: 0.45,
  }
}

function paintedHeight(x, y, textureSize, seed) {
  const u = x / Math.max(1, textureSize - 1)
  const v = y / Math.max(1, textureSize - 1)
  const sweep = Math.sin((u * 5.5 + v * 2.25 + seed * 0.013) * Math.PI * 2)
  const cross = Math.sin((u * -2.5 + v * 7.5 + seed * 0.019) * Math.PI * 2)
  const grain = seededNoise(x, y, seed) * 2 - 1
  const fleck = seededNoise(Math.floor(x / 3), Math.floor(y / 3), seed + 41) * 2 - 1
  return sweep * 0.45 + cross * 0.2 + grain * 0.24 + fleck * 0.11
}

function createBaseColorTexture({ baseColor, style, seed, textureSize }) {
  const pixels = Buffer.alloc(textureSize * textureSize * 4)
  for (let y = 0; y < textureSize; y += 1) {
    for (let x = 0; x < textureSize; x += 1) {
      const height = paintedHeight(x, y, textureSize, seed)
      const u = x / Math.max(1, textureSize - 1)
      const v = y / Math.max(1, textureSize - 1)
      const diagonalInk = Math.abs(
        Math.sin((u * 11 + v * 7 + seed * 0.03) * Math.PI),
      )
      const lineMask = diagonalInk < style.lineStrength * 0.08 ? 1 : 0
      const value = Math.floor(
        (0.68 + height * style.brushStrength + (1 - v) * 0.18) *
          style.posterize,
      ) / style.posterize
      const ao = 1 - style.aoStrength * (1 - v) * 0.14
      const cavity = 1 - style.cavityStrength * Math.max(0, -height) * 0.22
      const curvature = style.curvatureStrength * Math.max(0, height) * 0.16
      const warmColor = [
        mix(baseColor[0], style.tint[0], 0.28),
        mix(baseColor[1], style.tint[1], 0.28),
        mix(baseColor[2], style.tint[2], 0.28),
      ]
      const shadeColor = [
        mix(style.shadowTint[0], warmColor[0], value),
        mix(style.shadowTint[1], warmColor[1], value),
        mix(style.shadowTint[2], warmColor[2], value),
      ]
      const accent = seededNoise(x, y, seed + 97) > 0.985 ? 0.28 : 0
      const offset = (y * textureSize + x) * 4
      pixels[offset] = channel(
        (mix(shadeColor[0], style.accent[0], accent) + curvature) *
          ao *
          cavity *
          (lineMask ? 0.34 : 1),
      )
      pixels[offset + 1] = channel(
        (mix(shadeColor[1], style.accent[1], accent) + curvature) *
          ao *
          cavity *
          (lineMask ? 0.34 : 1),
      )
      pixels[offset + 2] = channel(
        (mix(shadeColor[2], style.accent[2], accent) + curvature) *
          ao *
          cavity *
          (lineMask ? 0.34 : 1),
      )
      pixels[offset + 3] = channel(baseColor[3])
    }
  }
  return writePng({ width: textureSize, height: textureSize, channels: 4, pixels })
}

function createMetallicRoughnessTexture({ style, seed, textureSize }) {
  const pixels = Buffer.alloc(textureSize * textureSize * 3)
  for (let y = 0; y < textureSize; y += 1) {
    for (let x = 0; x < textureSize; x += 1) {
      const height = Math.abs(paintedHeight(x, y, textureSize, seed))
      const offset = (y * textureSize + x) * 3
      pixels[offset] = 0
      pixels[offset + 1] = channel(
        style.roughness - height * (0.08 + style.cavityStrength * 0.04),
      )
      pixels[offset + 2] = channel(style.metallic)
    }
  }
  return writePng({ width: textureSize, height: textureSize, channels: 3, pixels })
}

function createNormalTexture({ style, seed, textureSize }) {
  const pixels = Buffer.alloc(textureSize * textureSize * 3)
  for (let y = 0; y < textureSize; y += 1) {
    for (let x = 0; x < textureSize; x += 1) {
      const left = paintedHeight(Math.max(0, x - 1), y, textureSize, seed)
      const right = paintedHeight(Math.min(textureSize - 1, x + 1), y, textureSize, seed)
      const down = paintedHeight(x, Math.max(0, y - 1), textureSize, seed)
      const up = paintedHeight(x, Math.min(textureSize - 1, y + 1), textureSize, seed)
      const dx = (right - left) * style.normalScale
      const dy = (up - down) * style.normalScale
      const dz = 1
      const length = Math.hypot(dx, dy, dz) || 1
      const offset = (y * textureSize + x) * 3
      pixels[offset] = channel(dx / length * 0.5 + 0.5)
      pixels[offset + 1] = channel(dy / length * 0.5 + 0.5)
      pixels[offset + 2] = channel(dz / length * 0.5 + 0.5)
    }
  }
  return writePng({ width: textureSize, height: textureSize, channels: 3, pixels })
}

function addEmbeddedTexture({ json, binChunks, name, imageBytes }) {
  const byteOffset = binChunks.reduce((sum, chunk) => sum + chunk.byteLength, 0)
  binChunks.push(align4(imageBytes))

  const bufferViewIndex = json.bufferViews.length
  json.bufferViews.push({
    buffer: 0,
    byteOffset,
    byteLength: imageBytes.byteLength,
  })

  const imageIndex = json.images.length
  json.images.push({
    name,
    bufferView: bufferViewIndex,
    mimeType: 'image/png',
  })

  const textureIndex = json.textures.length
  json.textures.push({
    name,
    source: imageIndex,
  })

  return textureIndex
}

function ensureMaterialCoverage(json) {
  json.materials ??= []
  if (json.materials.length === 0) {
    json.materials.push({
      name: 'merkin-style-default',
      pbrMetallicRoughness: {
        baseColorFactor: [0.72, 0.68, 0.58, 1],
        metallicFactor: 0,
        roughnessFactor: 0.9,
      },
    })
  }

  for (const mesh of json.meshes ?? []) {
    for (const primitive of mesh.primitives ?? []) {
      if (!Number.isInteger(primitive.material)) {
        primitive.material = 0
      }
    }
  }
}

function bakeStyleAsset({
  inputPath,
  outputPath,
  prompt,
  settings,
  sourceAssetUrl = '',
  outputAssetUrl = '',
  metadataUrl = '',
  nodeId = '',
  levelId = '',
}) {
  if (!existsSync(inputPath) || !statSync(inputPath).isFile()) {
    throw new Error(`Input GLB not found: ${inputPath}`)
  }

  const sourceFingerprint = fingerprintFile(inputPath)
  const sourceFingerprintValue =
    typeof sourceFingerprint === 'string'
      ? sourceFingerprint
      : sourceFingerprint.value
  const { json, bin } = readGlb(inputPath)
  const styleProfileName = settings.styleProfileName ?? settings.profileId
  const style = {
    ...getStyleProfileSettings(styleProfileName, prompt),
    lineStrength: optionalUnitValue(settings.lineStrength) ?? 0.35,
    brushStrength: optionalUnitValue(settings.brushStrength) ?? 0.25,
    aoStrength: Number(settings.aoStrength ?? 0.8),
    cavityStrength: Number(settings.cavityStrength ?? 0.65),
    curvatureStrength: Number(settings.curvatureStrength ?? 0.45),
    geometrySimplification: Number(settings.geometrySimplification ?? 0),
    outputTier: settings.outputTier ?? 'runtime',
  }
  const seedBase = hashString(
    `${styleProfileName}|${prompt}|${sourceFingerprintValue}`,
  )

  json.bufferViews ??= []
  json.images ??= []
  json.textures ??= []
  json.buffers ??= [{ byteLength: bin.byteLength }]
  ensureMaterialCoverage(json)

  const binChunks = [align4(bin)]
  const bakedMaterials = []

  for (const [materialIndex, material] of json.materials.entries()) {
    const pbr = (material.pbrMetallicRoughness ??= {})
    const baseColor = normalizeColor(pbr.baseColorFactor)
    const materialName = material.name ?? `material-${materialIndex}`
    const seed = hashString(`${seedBase}|${materialName}|${materialIndex}`)
    const label = `merkin-${style.label}-${String(materialIndex).padStart(2, '0')}`

    const baseColorTexture = addEmbeddedTexture({
      json,
      binChunks,
      name: `${label}-basecolor`,
      imageBytes: createBaseColorTexture({
        baseColor,
        style,
        seed,
        textureSize: settings.textureSize,
      }),
    })
    const metallicRoughnessTexture = addEmbeddedTexture({
      json,
      binChunks,
      name: `${label}-metalrough`,
      imageBytes: createMetallicRoughnessTexture({
        style,
        seed,
        textureSize: settings.textureSize,
      }),
    })
    const normalTexture = addEmbeddedTexture({
      json,
      binChunks,
      name: `${label}-normal`,
      imageBytes: createNormalTexture({
        style,
        seed,
        textureSize: settings.textureSize,
      }),
    })

    pbr.baseColorTexture = { index: baseColorTexture }
    pbr.metallicRoughnessTexture = { index: metallicRoughnessTexture }
    pbr.baseColorFactor = [1, 1, 1, baseColor[3]]
    pbr.metallicFactor = 1
    pbr.roughnessFactor = 1
    material.normalTexture = { index: normalTexture, scale: 0.72 }
    material.name = `${materialName}-style-baked`
    material.extras = {
      ...(material.extras ?? {}),
      merkinStyleBake: {
        mode: 'procedural-material',
        profileId: settings.profileId,
        styleProfileName,
        profile: style.label,
        textureSize: settings.textureSize,
      },
    }

    bakedMaterials.push({
      materialIndex,
      materialName,
      baseColorTexture,
      metallicRoughnessTexture,
      normalTexture,
    })
  }

  const nextBin = Buffer.concat(binChunks)
  json.buffers[0].byteLength = nextBin.byteLength
  const generatedAt = new Date().toISOString()
  json.asset = {
    ...(json.asset ?? {}),
    generator: STYLE_BAKE_GENERATORS.proceduralMaterial,
  }
  json.extras = {
    ...(json.extras ?? {}),
    merkinStyleBake: {
      bakedAt: generatedAt,
      mode: 'procedural-material',
      profileId: settings.profileId,
      styleProfileName,
      prompt,
      profile: style.label,
      settings,
      materialCount: bakedMaterials.length,
    },
  }

  writeGlb(outputPath, json, nextBin)
  const outputSizeBytes = statSync(outputPath).size
  const product = createStyleBakeProduct({
    mode: 'procedural-material',
    assetUrl: outputAssetUrl,
    metadataUrl,
    sourceAssetUrl,
    sourceAssetPath: inputPath,
    sourceFingerprint,
    nodeId,
    levelId,
    settings,
    generator: styleBakeProceduralGenerator,
    generatedAt,
    diagnostics: {
      materialCount: bakedMaterials.length,
      outputPath,
      outputSizeBytes,
      profile: style.label,
    },
  })

  return {
    outputPath,
    outputSizeBytes,
    textureSize: settings.textureSize,
    styleProfileName,
    profile: style.label,
    materialCount: bakedMaterials.length,
    sourceFingerprint,
    generator: STYLE_BAKE_GENERATORS.proceduralMaterial,
    mode: 'procedural-material',
    settings,
    product,
  }
}

const args = parseArgs(process.argv.slice(2))
const mode = normalizeStyleBakeMode(args.mode ?? 'procedural-material')
const inputPath = resolve(args.input ?? '')
const outputPath = resolve(args.output ?? inputPath)

if (!args.input) {
  throw new Error('--input is required')
}

if (mode !== 'procedural-material') {
  throw new Error(
    `bake-style-asset.mjs only runs procedural-material bakes. Use blender-style-bake.py or the editor blender-geometry API for mode ${mode}.`,
  )
}

const settings = normalizeStyleBakeSettings({
  ...args,
  profileId: args['profile-id'] ?? args['style-profile-name'] ?? 'Painterly Storybook',
  textureSize: args['texture-size'] ?? 256,
})

const result = bakeStyleAsset({
  inputPath,
  outputPath,
  prompt: String(args.prompt ?? ''),
  settings,
  sourceAssetUrl: String(args['source-asset-url'] ?? ''),
  outputAssetUrl: String(args['asset-url'] ?? ''),
  metadataUrl: String(args['metadata-url'] ?? ''),
  nodeId: String(args['node-id'] ?? ''),
  levelId: String(args['level-id'] ?? ''),
})

if (args['metadata-output']) {
  writeStyleBakeMetadata(resolve(args['metadata-output']), result)
}

console.log(JSON.stringify(result))
