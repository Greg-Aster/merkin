import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join } from 'node:path'
import { inflateSync } from 'node:zlib'
import {
  discoverTerrainLevels,
  formatTerrainLevelList,
  resolveTerrainLevel,
} from './lib/terrainManifestDiscovery.mjs'

const repoRoot = new URL('../../..', import.meta.url).pathname.replace(
  /^\/([A-Za-z]:)/,
  '$1',
)
const publicRoot = join(repoRoot, 'apps/megameal/public')

function getArg(name, fallback = '') {
  const prefix = `--${name}=`
  return (
    process.argv.find(arg => arg.startsWith(prefix))?.slice(prefix.length) ??
    fallback
  )
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/, ''))
}

function writeJson(path, value) {
  const tempPath = `${path}.tmp`
  writeFileSync(tempPath, `${JSON.stringify(value, null, 2)}\n`)
  renameSync(tempPath, path)
}

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function parseLodResolutions(value) {
  return String(value || '33,17,9')
    .split(',')
    .map(item => parsePositiveInt(item.trim(), 0))
    .filter(resolution => resolution >= 3)
    .map(resolution => (resolution % 2 === 0 ? resolution + 1 : resolution))
}

function assertPngSignature(buffer) {
  if (buffer.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') {
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

  if (bitDepth !== 8) throw new Error(`Unsupported PNG bit depth: ${bitDepth}`)
  if (interlace !== 0)
    throw new Error('Interlaced PNG heightmaps are not supported')

  const channels =
    colorType === 0 ? 1 : colorType === 2 ? 3 : colorType === 6 ? 4 : null
  if (!channels) throw new Error(`Unsupported PNG color type: ${colorType}`)

  const inflated = inflateSync(Buffer.concat(idatChunks))
  const stride = width * channels
  const pixels = new Uint8Array(width * height * channels)
  let sourceOffset = 0
  let previousRow = new Uint8Array(stride)

  for (let y = 0; y < height; y += 1) {
    const filter = inflated[sourceOffset]
    sourceOffset += 1
    const row = new Uint8Array(
      inflated.subarray(sourceOffset, sourceOffset + stride),
    )
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

function readHeightData(manifest, heightConfig, png, heightOverrides) {
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

  for (const [rawIndex, rawHeight] of Object.entries(heightOverrides ?? {})) {
    const index = Number(rawIndex)
    const height = Number(rawHeight)
    if (
      Number.isInteger(index) &&
      index >= 0 &&
      index < heightData.length &&
      Number.isFinite(height)
    ) {
      heightData[index] = height
    }
  }

  return { resolution, heightData }
}

function sampleHeight(heightData, resolution, u, v) {
  const x = Math.min(resolution - 1, Math.max(0, u * (resolution - 1)))
  const z = Math.min(resolution - 1, Math.max(0, v * (resolution - 1)))
  const x0 = Math.floor(x)
  const z0 = Math.floor(z)
  const x1 = Math.min(resolution - 1, x0 + 1)
  const z1 = Math.min(resolution - 1, z0 + 1)
  const tx = x - x0
  const tz = z - z0
  const h00 = heightData[z0 * resolution + x0]
  const h10 = heightData[z0 * resolution + x1]
  const h01 = heightData[z1 * resolution + x0]
  const h11 = heightData[z1 * resolution + x1]
  return (
    h00 * (1 - tx) * (1 - tz) +
    h10 * tx * (1 - tz) +
    h01 * (1 - tx) * tz +
    h11 * tx * tz
  )
}

function buildChunkMesh({
  heightData,
  sourceResolution,
  bounds,
  gridX,
  gridZ,
  x,
  z,
  resolution,
}) {
  const width = bounds.max[0] - bounds.min[0]
  const depth = bounds.max[2] - bounds.min[2]
  const chunkMinX = bounds.min[0] + (x / gridX) * width
  const chunkMaxX = bounds.min[0] + ((x + 1) / gridX) * width
  const chunkMinZ = bounds.min[2] + (z / gridZ) * depth
  const chunkMaxZ = bounds.min[2] + ((z + 1) / gridZ) * depth
  const vertexCount = resolution * resolution
  const positions = new Float32Array(vertexCount * 3)
  const normals = new Float32Array(vertexCount * 3)
  const uvs = new Float32Array(vertexCount * 2)
  const indices = new Uint32Array((resolution - 1) * (resolution - 1) * 6)
  const min = [Infinity, Infinity, Infinity]
  const max = [-Infinity, -Infinity, -Infinity]

  for (let row = 0; row < resolution; row += 1) {
    const rowT = row / (resolution - 1)
    const worldZ = chunkMinZ + rowT * (chunkMaxZ - chunkMinZ)
    const v = (worldZ - bounds.min[2]) / depth
    for (let col = 0; col < resolution; col += 1) {
      const colT = col / (resolution - 1)
      const worldX = chunkMinX + colT * (chunkMaxX - chunkMinX)
      const u = (worldX - bounds.min[0]) / width
      const height = sampleHeight(heightData, sourceResolution, u, v)
      const vertexOffset = (row * resolution + col) * 3
      const uvOffset = (row * resolution + col) * 2
      positions[vertexOffset] = worldX
      positions[vertexOffset + 1] = height
      positions[vertexOffset + 2] = worldZ
      uvs[uvOffset] = u
      uvs[uvOffset + 1] = v
      min[0] = Math.min(min[0], worldX)
      min[1] = Math.min(min[1], height)
      min[2] = Math.min(min[2], worldZ)
      max[0] = Math.max(max[0], worldX)
      max[1] = Math.max(max[1], height)
      max[2] = Math.max(max[2], worldZ)
    }
  }

  let indexOffset = 0
  for (let row = 0; row < resolution - 1; row += 1) {
    for (let col = 0; col < resolution - 1; col += 1) {
      const topLeft = row * resolution + col
      const topRight = topLeft + 1
      const bottomLeft = topLeft + resolution
      const bottomRight = bottomLeft + 1
      indices[indexOffset++] = topLeft
      indices[indexOffset++] = bottomLeft
      indices[indexOffset++] = topRight
      indices[indexOffset++] = topRight
      indices[indexOffset++] = bottomLeft
      indices[indexOffset++] = bottomRight
    }
  }

  accumulateNormals(positions, normals, indices)
  return { positions, normals, uvs, indices, min, max }
}

function accumulateNormals(positions, normals, indices) {
  const ax = new Float32Array(3)
  const bx = new Float32Array(3)
  const cx = new Float32Array(3)

  for (let i = 0; i < indices.length; i += 3) {
    const ia = indices[i] * 3
    const ib = indices[i + 1] * 3
    const ic = indices[i + 2] * 3
    ax[0] = positions[ia]
    ax[1] = positions[ia + 1]
    ax[2] = positions[ia + 2]
    bx[0] = positions[ib]
    bx[1] = positions[ib + 1]
    bx[2] = positions[ib + 2]
    cx[0] = positions[ic]
    cx[1] = positions[ic + 1]
    cx[2] = positions[ic + 2]

    const abx = bx[0] - ax[0]
    const aby = bx[1] - ax[1]
    const abz = bx[2] - ax[2]
    const acx = cx[0] - ax[0]
    const acy = cx[1] - ax[1]
    const acz = cx[2] - ax[2]
    const nx = aby * acz - abz * acy
    const ny = abz * acx - abx * acz
    const nz = abx * acy - aby * acx

    for (const index of [ia, ib, ic]) {
      normals[index] += nx
      normals[index + 1] += ny
      normals[index + 2] += nz
    }
  }

  for (let i = 0; i < normals.length; i += 3) {
    const length = Math.hypot(normals[i], normals[i + 1], normals[i + 2]) || 1
    normals[i] /= length
    normals[i + 1] /= length
    normals[i + 2] /= length
  }
}

function align4(buffer) {
  const padding = (4 - (buffer.byteLength % 4)) % 4
  return padding ? Buffer.concat([buffer, Buffer.alloc(padding)]) : buffer
}

function alignJson(buffer) {
  const padding = (4 - (buffer.byteLength % 4)) % 4
  return padding ? Buffer.concat([buffer, Buffer.alloc(padding, 0x20)]) : buffer
}

function makeBufferView(bufferViews, chunks, typedArray, target) {
  const source = Buffer.from(
    typedArray.buffer,
    typedArray.byteOffset,
    typedArray.byteLength,
  )
  const offset = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0)
  const padded = align4(source)
  chunks.push(padded)
  bufferViews.push({
    buffer: 0,
    byteOffset: offset,
    byteLength: source.byteLength,
    target,
  })
  return bufferViews.length - 1
}

function writeGlb(path, mesh) {
  mkdirSync(dirname(path), { recursive: true })
  const chunks = []
  const bufferViews = []
  const positionView = makeBufferView(
    bufferViews,
    chunks,
    mesh.positions,
    34962,
  )
  const normalView = makeBufferView(bufferViews, chunks, mesh.normals, 34962)
  const uvView = makeBufferView(bufferViews, chunks, mesh.uvs, 34962)
  const indexView = makeBufferView(bufferViews, chunks, mesh.indices, 34963)
  const bin = Buffer.concat(chunks)
  const json = {
    asset: { version: '2.0', generator: 'Merkin terrain chunk cooker' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0 }],
    materials: [
      {
        name: 'terrain-chunk',
        pbrMetallicRoughness: {
          baseColorFactor: [0.27, 0.34, 0.25, 1],
          roughnessFactor: 0.94,
          metallicFactor: 0,
        },
      },
    ],
    meshes: [
      {
        primitives: [
          {
            attributes: {
              POSITION: 0,
              NORMAL: 1,
              TEXCOORD_0: 2,
            },
            indices: 3,
            material: 0,
          },
        ],
      },
    ],
    accessors: [
      {
        bufferView: positionView,
        componentType: 5126,
        count: mesh.positions.length / 3,
        type: 'VEC3',
        min: mesh.min,
        max: mesh.max,
      },
      {
        bufferView: normalView,
        componentType: 5126,
        count: mesh.normals.length / 3,
        type: 'VEC3',
      },
      {
        bufferView: uvView,
        componentType: 5126,
        count: mesh.uvs.length / 2,
        type: 'VEC2',
      },
      {
        bufferView: indexView,
        componentType: 5125,
        count: mesh.indices.length,
        type: 'SCALAR',
      },
    ],
    bufferViews,
    buffers: [{ byteLength: bin.byteLength }],
  }
  const jsonBuffer = alignJson(Buffer.from(JSON.stringify(json), 'utf8'))
  const totalLength = 12 + 8 + jsonBuffer.byteLength + 8 + bin.byteLength
  const header = Buffer.alloc(12)
  header.writeUInt32LE(0x46546c67, 0)
  header.writeUInt32LE(2, 4)
  header.writeUInt32LE(totalLength, 8)
  const jsonHeader = Buffer.alloc(8)
  jsonHeader.writeUInt32LE(jsonBuffer.byteLength, 0)
  jsonHeader.writeUInt32LE(0x4e4f534a, 4)
  const binHeader = Buffer.alloc(8)
  binHeader.writeUInt32LE(bin.byteLength, 0)
  binHeader.writeUInt32LE(0x004e4942, 4)
  writeFileSync(
    path,
    Buffer.concat([header, jsonHeader, jsonBuffer, binHeader, bin]),
  )
}

function updateManifest(manifest, { level, grid, lods, chunksPath, bounds }) {
  const width = bounds.max[0] - bounds.min[0]
  return {
    ...manifest,
    assets: {
      ...(manifest.assets ?? {}),
      chunksPath,
    },
    physics: {
      ...(manifest.physics ?? {}),
      gridX: grid,
      gridY: grid,
      chunkSize: width / grid,
    },
    visualChunks: {
      generatedAt: new Date().toISOString(),
      generatedBy: 'cook-terrain-chunks',
      chunkCount: grid * grid * lods.length,
      lods: lods.map((lod, index) => ({
        level: index,
        distance: lod.distance,
        resolution: lod.resolution,
      })),
    },
  }
}

const requestedLevel = getArg('level') || process.argv[2]
const grid = parsePositiveInt(getArg('grid', '4'), 4)
const lodResolutions = parseLodResolutions(getArg('lod-resolutions', '33,17,9'))
const terrainLevels = discoverTerrainLevels({ repoRoot, publicRoot })
const level = resolveTerrainLevel(terrainLevels, requestedLevel)

if (!requestedLevel || !level) {
  throw new Error(
    `Expected --level to be one of: ${formatTerrainLevelList(terrainLevels)}`,
  )
}

const manifest = readJson(level.manifestPath)
if (!manifest.assets?.heightmap) {
  throw new Error(
    `Terrain manifest for ${level.levelId} has no heightmap asset`,
  )
}

const heightmapPath = join(
  publicRoot,
  manifest.assets.heightmap.replace(/^\//, ''),
)
const heightConfigPath = heightmapPath.replace('_heightmap.png', '_config.json')
const heightConfig = existsSync(heightConfigPath)
  ? readJson(heightConfigPath)
  : {}
const bounds = heightConfig.bounds ?? manifest.physics?.bounds
if (!bounds?.min || !bounds?.max) {
  throw new Error(`Terrain manifest for ${level.levelId} needs explicit bounds`)
}

const png = parsePng(heightmapPath)
const heightOverrides = getSceneTerrainOverrides(level)
const { resolution: sourceResolution, heightData } = readHeightData(
  manifest,
  heightConfig,
  png,
  heightOverrides,
)
const width = bounds.max[0] - bounds.min[0]
const depth = bounds.max[2] - bounds.min[2]
const maxDimension = Math.max(width, depth)
const lods = lodResolutions.map((resolution, index) => ({
  resolution,
  distance: maxDimension * (0.45 + index * 0.45),
}))
const publicChunksPath = `/terrain/levels/${level.id}/`
const chunksDir = join(publicRoot, publicChunksPath.replace(/^\//, ''))

rmSync(chunksDir, { recursive: true, force: true })
mkdirSync(chunksDir, { recursive: true })

let totalTriangles = 0
for (let x = 0; x < grid; x += 1) {
  for (let z = 0; z < grid; z += 1) {
    for (let lod = 0; lod < lods.length; lod += 1) {
      const mesh = buildChunkMesh({
        heightData,
        sourceResolution,
        bounds,
        gridX: grid,
        gridZ: grid,
        x,
        z,
        resolution: lods[lod].resolution,
      })
      totalTriangles += mesh.indices.length / 3
      writeGlb(join(chunksDir, `chunk_${x}_${z}_LOD${lod}.glb`), mesh)
    }
  }
}

writeJson(
  level.manifestPath,
  updateManifest(manifest, {
    level,
    grid,
    lods,
    chunksPath: publicChunksPath,
    bounds,
  }),
)

console.log(
  JSON.stringify({
    success: true,
    levelId: level.levelId,
    manifestUrl: `/terrain/${level.id}.manifest.json`,
    chunksPath: publicChunksPath,
    grid,
    lods,
    chunkCount: grid * grid * lods.length,
    totalTriangles,
  }),
)
