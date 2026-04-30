import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { inflateSync } from 'node:zlib'

const repoRoot = new URL('../../..', import.meta.url).pathname.replace(
  /^\/([A-Za-z]:)/,
  '$1',
)
const publicRoot = join(repoRoot, 'apps/megameal/public')

const TERRAIN_LEVELS = [
  {
    id: 'observatory-environment',
    levelId: 'observatory',
    sceneSettingsKey: 'observatory',
    manifestPath: join(publicRoot, 'terrain/observatory-environment.manifest.json'),
    targetResolution: 128,
  },
  {
    id: 'solitude',
    levelId: 'solitude',
    sceneSettingsKey: 'solitude',
    manifestPath: join(publicRoot, 'terrain/solitude.manifest.json'),
    targetResolution: 128,
  },
  {
    id: 'sci-fi-room',
    levelId: 'sci-fi-room',
    sceneSettingsKey: 'level',
    manifestPath: join(publicRoot, 'terrain/sci-fi-room.manifest.json'),
    targetResolution: 128,
  },
  {
    id: 'yggdrasil',
    levelId: 'yggdrasil',
    sceneSettingsKey: 'level',
    manifestPath: join(publicRoot, 'terrain/yggdrasil.manifest.json'),
    targetResolution: 128,
  },
]

const MAGIC = 0x4d4d5443 // MMTC
const VERSION = 1

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/, ''))
}

function writeJson(path, value) {
  const tempPath = `${path}.tmp`
  writeFileSync(tempPath, `${JSON.stringify(value, null, 2)}\n`)
  renameSync(tempPath, path)
}

function assertPngSignature(buffer) {
  const signature = '89504e470d0a1a0a'
  if (buffer.subarray(0, 8).toString('hex') !== signature) {
    throw new Error('Invalid PNG signature')
  }
}

function parsePng(path) {
  const buffer = readFileSync(path)
  assertPngSignature(buffer)

  let offset = 8
  let width = 0
  let height = 0
  let bitDepth = 0
  let colorType = 0
  let interlace = 0
  const idatChunks = []

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset)
    const type = buffer.toString('ascii', offset + 4, offset + 8)
    const dataStart = offset + 8
    const dataEnd = dataStart + length

    if (type === 'IHDR') {
      width = buffer.readUInt32BE(dataStart)
      height = buffer.readUInt32BE(dataStart + 4)
      bitDepth = buffer[dataStart + 8]
      colorType = buffer[dataStart + 9]
      interlace = buffer[dataStart + 12]
    } else if (type === 'IDAT') {
      idatChunks.push(buffer.subarray(dataStart, dataEnd))
    } else if (type === 'IEND') {
      break
    }

    offset = dataEnd + 4
  }

  if (bitDepth !== 8) {
    throw new Error(`Unsupported PNG bit depth: ${bitDepth}`)
  }
  if (interlace !== 0) {
    throw new Error('Interlaced PNG heightmaps are not supported')
  }

  const channels =
    colorType === 0
      ? 1
      : colorType === 2
        ? 3
        : colorType === 6
          ? 4
          : null
  if (!channels) {
    throw new Error(`Unsupported PNG color type: ${colorType}`)
  }

  const inflated = inflateSync(Buffer.concat(idatChunks))
  const stride = width * channels
  const pixels = new Uint8Array(width * height * channels)
  let sourceOffset = 0
  let previousRow = new Uint8Array(stride)

  for (let y = 0; y < height; y += 1) {
    const filter = inflated[sourceOffset]
    sourceOffset += 1
    const row = new Uint8Array(inflated.subarray(sourceOffset, sourceOffset + stride))
    sourceOffset += stride
    const out = new Uint8Array(stride)

    for (let x = 0; x < stride; x += 1) {
      const left = x >= channels ? out[x - channels] : 0
      const up = previousRow[x] ?? 0
      const upLeft = x >= channels ? previousRow[x - channels] ?? 0 : 0
      let predictor = 0

      if (filter === 1) predictor = left
      else if (filter === 2) predictor = up
      else if (filter === 3) predictor = Math.floor((left + up) / 2)
      else if (filter === 4) {
        const p = left + up - upLeft
        const pa = Math.abs(p - left)
        const pb = Math.abs(p - up)
        const pc = Math.abs(p - upLeft)
        predictor = pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft
      } else if (filter !== 0) {
        throw new Error(`Unsupported PNG filter: ${filter}`)
      }

      out[x] = (row[x] + predictor) & 0xff
    }

    pixels.set(out, y * stride)
    previousRow = out
  }

  return { width, height, channels, pixels }
}

function getSampleIndices(resolution, targetResolution) {
  const sampleStep = Math.max(1, Math.ceil(resolution / targetResolution))
  const indices = []
  for (let index = 0; index < resolution; index += sampleStep) {
    indices.push(index)
  }
  if (indices[indices.length - 1] !== resolution - 1) {
    indices.push(resolution - 1)
  }
  return { indices, sampleStep }
}

function getSceneTerrainOverrides(level) {
  const scenePath = join(
    repoRoot,
    'apps/game/src/threlte/editor/scenes',
    `${level.levelId}.scene.json`,
  )

  try {
    const scene = readJson(scenePath)
    return (
      scene.settings?.[level.sceneSettingsKey]?.terrainSculpt
        ?.heightOverrides ??
      scene.settings?.level?.terrainSculpt?.heightOverrides ??
      {}
    )
  } catch {
    return {}
  }
}

function getHeightData(manifest, heightConfig, png, heightOverrides) {
  if (png.width !== png.height) {
    throw new Error(`Expected square heightmap, got ${png.width}x${png.height}`)
  }

  const resolution = png.width
  const heightOffset = heightConfig.heightOffset ?? manifest.physics.minHeight
  const heightScale =
    heightConfig.heightScale ??
    manifest.physics.maxHeight - manifest.physics.minHeight
  const heightData = new Float32Array(resolution * resolution)

  for (let z = 0; z < resolution; z += 1) {
    for (let x = 0; x < resolution; x += 1) {
      const index = z * resolution + x
      const pixelOffset = index * png.channels
      const grayscale = png.pixels[pixelOffset] / 255
      heightData[index] = heightOffset + grayscale * heightScale
    }
  }

  let overrideCount = 0
  for (const [rawIndex, rawHeight] of Object.entries(heightOverrides ?? {})) {
    const index = Number(rawIndex)
    const height = Number(rawHeight)
    if (
      !Number.isInteger(index) ||
      index < 0 ||
      index >= heightData.length ||
      !Number.isFinite(height)
    ) {
      continue
    }
    heightData[index] = height
    overrideCount += 1
  }

  return {
    resolution,
    heightData,
    heightOverrideCount: overrideCount,
  }
}

function buildCollider(manifest, heightConfig, png, targetResolution, heightOverrides = {}) {
  const { resolution, heightData, heightOverrideCount } = getHeightData(
    manifest,
    heightConfig,
    png,
    heightOverrides,
  )
  const { indices: xIndices, sampleStep } = getSampleIndices(
    resolution,
    targetResolution,
  )
  const zIndices = xIndices
  const cols = xIndices.length
  const rows = zIndices.length
  const bounds = heightConfig.bounds ?? manifest.physics.bounds
  const width = bounds.max[0] - bounds.min[0]
  const depth = bounds.max[2] - bounds.min[2]
  const center = [
    (bounds.min[0] + bounds.max[0]) / 2,
    0,
    (bounds.min[2] + bounds.max[2]) / 2,
  ]
  const vertices = new Float32Array(cols * rows * 3)
  const triangleCount = (cols - 1) * (rows - 1) * 2
  const indices = new Uint32Array(triangleCount * 3)

  for (let z = 0; z < rows; z += 1) {
    const sourceZ = zIndices[z]
    const localZ = (z / (rows - 1) - 0.5) * depth
    for (let x = 0; x < cols; x += 1) {
      const sourceX = xIndices[x]
      const vertexOffset = (z * cols + x) * 3
      vertices[vertexOffset] = (x / (cols - 1) - 0.5) * width
      vertices[vertexOffset + 1] = heightData[sourceZ * resolution + sourceX]
      vertices[vertexOffset + 2] = localZ
    }
  }

  let indexOffset = 0
  for (let z = 0; z < rows - 1; z += 1) {
    for (let x = 0; x < cols - 1; x += 1) {
      const topLeft = z * cols + x
      const topRight = topLeft + 1
      const bottomLeft = topLeft + cols
      const bottomRight = bottomLeft + 1
      indices[indexOffset++] = topLeft
      indices[indexOffset++] = bottomLeft
      indices[indexOffset++] = topRight
      indices[indexOffset++] = topRight
      indices[indexOffset++] = bottomLeft
      indices[indexOffset++] = bottomRight
    }
  }

  return {
    vertices,
    indices,
    meta: {
      type: 'baked-terrain-mesh',
      version: VERSION,
      sourceHeightmap: manifest.assets.heightmap,
      sourceResolution: resolution,
      colliderResolution: Math.max(rows, cols),
      sampleStep,
      vertexCount: vertices.length / 3,
      indexCount: indices.length,
      triangleCount,
      bounds,
      center,
      heightOverrideCount,
    },
  }
}

function writeColliderBinary(path, collider) {
  mkdirSync(dirname(path), { recursive: true })
  const headerBytes = 4 + 4 + 4 + 4 + 4 + 4 + 4 + 4
  const buffer = Buffer.alloc(
    headerBytes + collider.vertices.byteLength + collider.indices.byteLength,
  )
  let offset = 0
  buffer.writeUInt32LE(MAGIC, offset)
  offset += 4
  buffer.writeUInt32LE(VERSION, offset)
  offset += 4
  buffer.writeUInt32LE(collider.meta.vertexCount, offset)
  offset += 4
  buffer.writeUInt32LE(collider.meta.indexCount, offset)
  offset += 4
  buffer.writeUInt32LE(collider.meta.triangleCount, offset)
  offset += 4
  buffer.writeUInt32LE(collider.meta.sourceResolution, offset)
  offset += 4
  buffer.writeUInt32LE(collider.meta.colliderResolution, offset)
  offset += 4
  buffer.writeUInt32LE(collider.meta.sampleStep, offset)
  offset += 4
  Buffer.from(collider.vertices.buffer).copy(buffer, offset)
  offset += collider.vertices.byteLength
  Buffer.from(collider.indices.buffer).copy(buffer, offset)
  writeFileSync(path, buffer)
}

function updateManifestCollision(manifest, publicBinaryPath, publicMetaPath, meta) {
  const { trimesh: _legacyTrimesh, ...physicsWithoutLegacyTrimesh } =
    manifest.physics ?? {}
  return {
    ...manifest,
    collision: {
      ...(manifest.collision ?? {}),
      terrain: {
        type: 'baked-terrain-mesh',
        authoredException: true,
        url: publicBinaryPath,
        metadataUrl: publicMetaPath,
        triangleCount: meta.triangleCount,
        vertexCount: meta.vertexCount,
        colliderResolution: meta.colliderResolution,
        sampleStep: meta.sampleStep,
        bounds: meta.bounds,
        center: meta.center,
      },
    },
    physics: {
      ...physicsWithoutLegacyTrimesh,
      type: 'baked-terrain-mesh',
    },
  }
}

const requestedLevel =
  process.argv.find(arg => arg.startsWith('--level='))?.split('=')[1] ??
  process.argv[2]
const levelsToBake = requestedLevel
  ? TERRAIN_LEVELS.filter(
      level => level.id === requestedLevel || level.levelId === requestedLevel,
    )
  : TERRAIN_LEVELS

if (requestedLevel && levelsToBake.length === 0) {
  throw new Error(`Unknown terrain collision bake level: ${requestedLevel}`)
}

for (const level of levelsToBake) {
  const manifest = readJson(level.manifestPath)
  const heightmapPath = join(publicRoot, manifest.assets.heightmap.replace(/^\//, ''))
  const heightConfigPath = heightmapPath.replace('_heightmap.png', '_config.json')
  const heightConfig = readJson(heightConfigPath)
  const png = parsePng(heightmapPath)
  const heightOverrides = getSceneTerrainOverrides(level)
  const collider = buildCollider(
    manifest,
    heightConfig,
    png,
    level.targetResolution,
    heightOverrides,
  )
  const publicBinaryPath = `/terrain/collision/${level.id}.collider.bin`
  const publicMetaPath = `/terrain/collision/${level.id}.collider.meta.json`
  const binaryPath = join(publicRoot, publicBinaryPath.replace(/^\//, ''))
  const metaPath = join(publicRoot, publicMetaPath.replace(/^\//, ''))

  writeColliderBinary(binaryPath, collider)
  writeJson(metaPath, collider.meta)
  writeJson(
    level.manifestPath,
    updateManifestCollision(manifest, publicBinaryPath, publicMetaPath, collider.meta),
  )

  console.log(
    `[bake-terrain-collision] ${level.id}: ${collider.meta.vertexCount} vertices, ${collider.meta.triangleCount} triangles, ${collider.meta.heightOverrideCount} editor height overrides -> ${publicBinaryPath}`,
  )
}
