import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { deflateSync } from 'node:zlib'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import {
  discoverTerrainLevels,
  formatTerrainLevelList,
  resolveTerrainLevel,
} from './lib/terrainManifestDiscovery.mjs'

globalThis.self = globalThis
globalThis.createImageBitmap ??= async () => ({ width: 1, height: 1, close() {} })

const repoRoot = new URL('../../..', import.meta.url).pathname.replace(
  /^\/([A-Za-z]:)/,
  '$1',
)
const publicRoot = join(repoRoot, 'apps/megameal/public')

const DEFAULT_RESOLUTION = 512

function getArg(name, fallback = '') {
  const prefix = `--${name}=`
  return process.argv.find(arg => arg.startsWith(prefix))?.slice(prefix.length) ?? fallback
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/, ''))
}

function writeJson(path, value) {
  const tempPath = `${path}.tmp`
  writeFileSync(tempPath, `${JSON.stringify(value, null, 2)}\n`)
  renameSync(tempPath, path)
}

function resolvePublicPath(publicUrl) {
  if (!publicUrl?.startsWith('/')) {
    throw new Error(`Public asset URL must start with "/": ${publicUrl}`)
  }
  const fullPath = join(publicRoot, publicUrl.replace(/^\/+/, ''))
  if (!fullPath.startsWith(publicRoot)) {
    throw new Error('Source asset resolves outside public root')
  }
  return fullPath
}

function parseVec3(value, fallback) {
  if (!value) return fallback
  const parsed = JSON.parse(value)
  return Array.isArray(parsed) && parsed.length === 3
    ? parsed.map(Number)
    : fallback
}

function makeNodeMatrix({ position, rotation, scale }) {
  const matrix = new THREE.Matrix4()
  matrix.compose(
    new THREE.Vector3(...position),
    new THREE.Euler(...rotation),
    new THREE.Vector3(...scale),
  )
  return matrix
}

function parseMatrix(value) {
  if (!value) return null
  const parsed = Array.isArray(value) ? value : JSON.parse(value)
  if (!Array.isArray(parsed) || parsed.length !== 16) return null
  return new THREE.Matrix4().fromArray(parsed.map(Number))
}

function getSourceMatrix(source) {
  const matrix = parseMatrix(source.matrix)
  if (matrix) return matrix

  return makeNodeMatrix({
    position: Array.isArray(source.position) ? source.position : [0, 0, 0],
    rotation: Array.isArray(source.rotation) ? source.rotation : [0, 0, 0],
    scale: Array.isArray(source.scale) ? source.scale : [1, 1, 1],
  })
}

function parseSources() {
  const sourcesArg = getArg('sources')
  if (sourcesArg) {
    const parsed = JSON.parse(sourcesArg)
    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error('--sources must be a non-empty array')
    }
    return parsed
  }

  const sourceUrl = getArg('source')
  return [
    {
      sourceAssetUrl: sourceUrl,
      sourceName:
        getArg('sourceName', sourceUrl.split('/').pop() ?? 'terrain-source'),
      position: parseVec3(getArg('position'), [0, 0, 0]),
      rotation: parseVec3(getArg('rotation'), [0, 0, 0]),
      scale: parseVec3(getArg('scale'), [1, 1, 1]),
    },
  ]
}

async function loadGltfScene(sourcePath) {
  const buffer = readFileSync(sourcePath)
  const loader = new GLTFLoader()
  return await new Promise((resolve, reject) => {
    loader.parse(
      buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
      '',
      gltf => resolve(gltf.scene),
      reject,
    )
  })
}

function createPrimitiveGeometry(primitive) {
  const geometry = primitive?.geometry ?? ''
  const args = Array.isArray(primitive?.args) ? primitive.args : []
  switch (geometry) {
    case 'box':
      return new THREE.BoxGeometry(...(args.length ? args : [1, 1, 1]))
    case 'cylinder':
      return new THREE.CylinderGeometry(...(args.length ? args : [1, 1, 1, 32]))
    case 'octahedron':
      return new THREE.OctahedronGeometry(...(args.length ? args : [1, 0]))
    case 'tetrahedron':
      return new THREE.TetrahedronGeometry(...(args.length ? args : [1, 0]))
    case 'icosahedron':
      return new THREE.IcosahedronGeometry(...(args.length ? args : [1, 0]))
    case 'dodecahedron':
      return new THREE.DodecahedronGeometry(...(args.length ? args : [1, 0]))
    case 'torus':
      return new THREE.TorusGeometry(...(args.length ? args : [1, 0.4, 12, 48]))
    default:
      throw new Error(`Unsupported primitive terrain source geometry: ${geometry}`)
  }
}

function createPrimitiveScene(primitive) {
  const geometry = createPrimitiveGeometry(primitive)
  const mesh = new THREE.Mesh(geometry)
  return { scene: mesh, dispose: () => geometry.dispose() }
}

function collectTriangles(scene, rootMatrix) {
  const triangles = []
  const bounds = new THREE.Box3()
  const a = new THREE.Vector3()
  const b = new THREE.Vector3()
  const c = new THREE.Vector3()

  scene.updateMatrixWorld(true)
  scene.traverse(object => {
    if (!object.isMesh || !object.geometry?.attributes?.position) return

    const geometry = object.geometry
    const positions = geometry.attributes.position
    const index = geometry.index
    const matrix = rootMatrix.clone().multiply(object.matrixWorld)
    const triangleCount = index ? index.count / 3 : positions.count / 3

    for (let triangleIndex = 0; triangleIndex < triangleCount; triangleIndex += 1) {
      const ia = index ? index.getX(triangleIndex * 3) : triangleIndex * 3
      const ib = index ? index.getX(triangleIndex * 3 + 1) : triangleIndex * 3 + 1
      const ic = index ? index.getX(triangleIndex * 3 + 2) : triangleIndex * 3 + 2

      a.fromBufferAttribute(positions, ia).applyMatrix4(matrix)
      b.fromBufferAttribute(positions, ib).applyMatrix4(matrix)
      c.fromBufferAttribute(positions, ic).applyMatrix4(matrix)

      bounds.expandByPoint(a)
      bounds.expandByPoint(b)
      bounds.expandByPoint(c)
      triangles.push([a.clone(), b.clone(), c.clone()])
    }
  })

  if (triangles.length === 0 || bounds.isEmpty()) {
    throw new Error('Source mesh did not contain readable triangle geometry')
  }

  return { triangles, bounds }
}

function barycentric2d(px, pz, a, b, c) {
  const v0x = b.x - a.x
  const v0z = b.z - a.z
  const v1x = c.x - a.x
  const v1z = c.z - a.z
  const v2x = px - a.x
  const v2z = pz - a.z
  const den = v0x * v1z - v1x * v0z
  if (Math.abs(den) < 1e-8) return null
  const v = (v2x * v1z - v1x * v2z) / den
  const w = (v0x * v2z - v2x * v0z) / den
  const u = 1 - v - w
  return { u, v, w }
}

function fillHeightData(heightData, resolution, fallbackHeight) {
  for (let pass = 0; pass < resolution; pass += 1) {
    let changed = false
    const next = new Float32Array(heightData)
    for (let z = 0; z < resolution; z += 1) {
      for (let x = 0; x < resolution; x += 1) {
        const index = z * resolution + x
        if (Number.isFinite(heightData[index])) continue

        let sum = 0
        let count = 0
        for (let dz = -1; dz <= 1; dz += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            if (dx === 0 && dz === 0) continue
            const nx = x + dx
            const nz = z + dz
            if (nx < 0 || nx >= resolution || nz < 0 || nz >= resolution) continue
            const value = heightData[nz * resolution + nx]
            if (!Number.isFinite(value)) continue
            sum += value
            count += 1
          }
        }
        if (count > 0) {
          next[index] = sum / count
          changed = true
        }
      }
    }
    heightData.set(next)
    if (!changed) break
  }

  for (let index = 0; index < heightData.length; index += 1) {
    if (!Number.isFinite(heightData[index])) heightData[index] = fallbackHeight
  }
}

function rasterizeHeightmap(triangles, bounds, resolution) {
  const min = bounds.min
  const max = bounds.max
  const width = Math.max(0.0001, max.x - min.x)
  const depth = Math.max(0.0001, max.z - min.z)
  const heightData = new Float32Array(resolution * resolution)
  heightData.fill(Number.NaN)

  for (const [a, b, c] of triangles) {
    const minX = Math.max(
      0,
      Math.floor(((Math.min(a.x, b.x, c.x) - min.x) / width) * (resolution - 1)) - 1,
    )
    const maxX = Math.min(
      resolution - 1,
      Math.ceil(((Math.max(a.x, b.x, c.x) - min.x) / width) * (resolution - 1)) + 1,
    )
    const minZ = Math.max(
      0,
      Math.floor(((Math.min(a.z, b.z, c.z) - min.z) / depth) * (resolution - 1)) - 1,
    )
    const maxZ = Math.min(
      resolution - 1,
      Math.ceil(((Math.max(a.z, b.z, c.z) - min.z) / depth) * (resolution - 1)) + 1,
    )

    for (let z = minZ; z <= maxZ; z += 1) {
      const pz = min.z + (z / (resolution - 1)) * depth
      for (let x = minX; x <= maxX; x += 1) {
        const px = min.x + (x / (resolution - 1)) * width
        const bary = barycentric2d(px, pz, a, b, c)
        if (!bary) continue
        if (bary.u < -0.001 || bary.v < -0.001 || bary.w < -0.001) continue
        const height = bary.u * a.y + bary.v * b.y + bary.w * c.y
        const index = z * resolution + x
        heightData[index] = Number.isFinite(heightData[index])
          ? Math.max(heightData[index], height)
          : height
      }
    }
  }

  fillHeightData(heightData, resolution, min.y)
  return heightData
}

function makeCrcTable() {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[n] = c >>> 0
  }
  return table
}

const crcTable = makeCrcTable()

function crc32(buffer) {
  let crc = 0xffffffff
  for (const byte of buffer) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type, 'ascii')
  const chunk = Buffer.alloc(12 + data.length)
  chunk.writeUInt32BE(data.length, 0)
  typeBuffer.copy(chunk, 4)
  data.copy(chunk, 8)
  chunk.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 8 + data.length)
  return chunk
}

function writeGrayscalePng(path, heightData, resolution, minHeight, maxHeight) {
  mkdirSync(dirname(path), { recursive: true })
  const scanlineLength = 1 + resolution
  const raw = Buffer.alloc(scanlineLength * resolution)
  const heightRange = Math.max(0.0001, maxHeight - minHeight)

  for (let z = 0; z < resolution; z += 1) {
    const rowOffset = z * scanlineLength
    raw[rowOffset] = 0
    for (let x = 0; x < resolution; x += 1) {
      const height = heightData[z * resolution + x]
      const normalized = THREE.MathUtils.clamp((height - minHeight) / heightRange, 0, 1)
      raw[rowOffset + 1 + x] = Math.round(normalized * 255)
    }
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(resolution, 0)
  ihdr.writeUInt32BE(resolution, 4)
  ihdr[8] = 8
  ihdr[9] = 0
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  writeFileSync(
    path,
    Buffer.concat([
      Buffer.from('89504e470d0a1a0a', 'hex'),
      pngChunk('IHDR', ihdr),
      pngChunk('IDAT', deflateSync(raw)),
      pngChunk('IEND', Buffer.alloc(0)),
    ]),
  )
}

function updateManifest(manifest, publicHeightmapPath, bounds, minHeight, maxHeight) {
  const width = bounds.max[0] - bounds.min[0]
  const depth = bounds.max[2] - bounds.min[2]
  const { trimesh: _legacyTrimesh, ...physicsWithoutLegacyTrimesh } =
    manifest.physics ?? {}
  return {
    ...manifest,
    assets: {
      ...(manifest.assets ?? {}),
      heightmap: publicHeightmapPath,
    },
    physics: {
      ...physicsWithoutLegacyTrimesh,
      type: 'baked-terrain-mesh',
      worldSize: Math.max(width, depth),
      worldSizeX: width,
      worldSizeZ: depth,
      minHeight,
      maxHeight,
      bounds,
    },
  }
}

const levelId = getArg('level')
const sourceDescriptors = parseSources()
const sourceUrl = sourceDescriptors[0]?.sourceAssetUrl ?? ''
const sourceName =
  sourceDescriptors.length === 1
    ? (sourceDescriptors[0]?.sourceName ?? sourceUrl.split('/').pop() ?? 'terrain-source')
    : `${sourceDescriptors.length} terrain sources`
const resolution = Math.max(
  64,
  Math.min(2048, Number.parseInt(getArg('resolution', `${DEFAULT_RESOLUTION}`), 10)),
)

const terrainLevels = discoverTerrainLevels({ repoRoot, publicRoot })
const level = resolveTerrainLevel(terrainLevels, levelId)

if (!levelId) {
  throw new Error(`Expected --level to be one of: ${formatTerrainLevelList(terrainLevels)}`)
}
if (!level) {
  throw new Error(
    `Unknown terrain heightmap level: ${levelId}. Known terrain levels: ${formatTerrainLevelList(terrainLevels)}`,
  )
}
if (sourceDescriptors.length === 0) {
  throw new Error('Expected --source=/public/source.glb or --sources=[...]')
}

const triangles = []
const sourceBounds = new THREE.Box3()
const sourceAssetUrls = []
const sourceNodeIds = []

for (const source of sourceDescriptors) {
  const rootMatrix = getSourceMatrix(source)
  let sourceScene
  let disposeSource = () => {}

  if (source.sourceAssetUrl) {
    const sourcePath = resolvePublicPath(source.sourceAssetUrl)
    if (!existsSync(sourcePath)) {
      throw new Error(`Source mesh not found: ${source.sourceAssetUrl}`)
    }
    sourceScene = await loadGltfScene(sourcePath)
    sourceAssetUrls.push(source.sourceAssetUrl)
  } else if (source.primitive) {
    const primitiveSource = createPrimitiveScene(source.primitive)
    sourceScene = primitiveSource.scene
    disposeSource = primitiveSource.dispose
  } else {
    throw new Error(
      `Terrain source "${source.sourceName ?? source.nodeId ?? '<unknown>'}" must provide sourceAssetUrl or primitive`,
    )
  }

  if (source.nodeId) sourceNodeIds.push(source.nodeId)
  const collected = collectTriangles(sourceScene, rootMatrix)
  triangles.push(...collected.triangles)
  sourceBounds.union(collected.bounds)
  disposeSource()
}

const bounds = {
  min: [sourceBounds.min.x, sourceBounds.min.y, sourceBounds.min.z],
  max: [sourceBounds.max.x, sourceBounds.max.y, sourceBounds.max.z],
}
const heightData = rasterizeHeightmap(triangles, sourceBounds, resolution)
let minHeight = Infinity
let maxHeight = -Infinity
for (const height of heightData) {
  minHeight = Math.min(minHeight, height)
  maxHeight = Math.max(maxHeight, height)
}

const publicHeightmapPath = `/terrain/heightmaps/${level.id}_heightmap.png`
const heightmapPath = join(publicRoot, publicHeightmapPath.replace(/^\//, ''))
const configPath = heightmapPath.replace('_heightmap.png', '_config.json')
const manifest = readJson(level.manifestPath)

writeGrayscalePng(heightmapPath, heightData, resolution, minHeight, maxHeight)
writeJson(configPath, {
  heightmapUrl: publicHeightmapPath,
  bounds,
  heightOffset: minHeight,
  heightScale: maxHeight - minHeight,
  generatedAt: new Date().toISOString(),
  generatedBy: 'editor-terrain-heightmap-generator',
  sourceAssetUrl: sourceUrl,
  sourceAssetUrls,
  sourceNodeIds,
  sourceName,
  sourceTriangleCount: triangles.length,
  resolution,
})
writeJson(level.manifestPath, updateManifest(manifest, publicHeightmapPath, bounds, minHeight, maxHeight))

console.log(
  JSON.stringify({
    success: true,
    levelId: level.levelId,
    manifestUrl: `/terrain/${level.id}.manifest.json`,
    heightmapUrl: publicHeightmapPath,
    configUrl: publicHeightmapPath.replace('_heightmap.png', '_config.json'),
    sourceAssetUrl: sourceUrl,
    sourceAssetUrls,
    sourceNodeIds,
    sourceName,
    sourceTriangleCount: triangles.length,
    resolution,
    bounds,
    minHeight,
    maxHeight,
  }),
)
