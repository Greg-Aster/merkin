import { createHash } from 'node:crypto'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { dirname, extname, join, relative } from 'node:path'
import {
  discoverTerrainLevels,
  formatTerrainLevelList,
  readTerrainSceneSettings,
  resolveTerrainLevel,
} from './lib/terrainManifestDiscovery.mjs'

const repoRoot = new URL('../../..', import.meta.url).pathname.replace(
  /^\/([A-Za-z]:)/,
  '$1',
)
const publicRoot = join(repoRoot, 'apps/megameal/public')
const MAGIC = 0x4d4d5443
const VERSION = 1
const DEFAULT_TERRAIN_COLLIDER_PRESET = 'desktop'
const TERRAIN_COLLIDER_PRESETS = {
  mobile: {
    targetTriangles: 10_000,
    maxBytes: 3 * 1024 * 1024,
  },
  desktop: {
    targetTriangles: 25_000,
    maxBytes: 6 * 1024 * 1024,
  },
  high: {
    targetTriangles: 50_000,
    maxBytes: 10 * 1024 * 1024,
  },
}
const COMPONENT_READERS = {
  5120: { size: 1, read: Buffer.prototype.readInt8, max: 127, signed: true },
  5121: { size: 1, read: Buffer.prototype.readUInt8, max: 255 },
  5122: { size: 2, read: Buffer.prototype.readInt16LE, max: 32767, signed: true },
  5123: { size: 2, read: Buffer.prototype.readUInt16LE, max: 65535 },
  5125: { size: 4, read: Buffer.prototype.readUInt32LE, max: 4294967295 },
  5126: { size: 4, read: Buffer.prototype.readFloatLE },
}
const ACCESSOR_COMPONENTS = {
  SCALAR: 1,
  VEC2: 2,
  VEC3: 3,
  VEC4: 4,
  MAT4: 16,
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/, ''))
}

function writeJson(path, value) {
  const tempPath = `${path}.tmp`
  writeFileSync(tempPath, `${JSON.stringify(value, null, 2)}\n`)
  renameSync(tempPath, path)
}

function fingerprintFile(path) {
  return {
    algorithm: 'sha256',
    value: createHash('sha256').update(readFileSync(path)).digest('hex'),
  }
}

function firstString(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (Array.isArray(value)) {
      const match = value.find(item => typeof item === 'string' && item.trim())
      if (match) return match.trim()
    }
  }
  return ''
}

function normalizePublicUrl(value) {
  return typeof value === 'string' && value.startsWith('/') ? value : ''
}

function resolvePublicPath(publicUrl) {
  const normalizedUrl = normalizePublicUrl(publicUrl)
  if (!normalizedUrl) return ''
  const fullPath = join(publicRoot, normalizedUrl.replace(/^\/+/, ''))
  return fullPath.startsWith(publicRoot) ? fullPath : ''
}

function toPublicUrl(assetPath) {
  const normalized = relative(publicRoot, assetPath).split('\\').join('/')
  return normalized.startsWith('..') ? assetPath : `/${normalized}`
}

function resolveTerrainSourceAssetUrl(manifest) {
  return normalizePublicUrl(
    firstString(
      manifest.source?.assetUrl,
      manifest.assets?.sourceGlb,
      manifest.assets?.sourceGltf,
      manifest.assets?.sourceAssetUrl,
      manifest.assets?.terrainSource,
      manifest.visualChunks?.product?.sourceAssetUrl,
    ),
  )
}

function resolveTerrainSourceAsset(manifest, sceneSettings) {
  const sourceAssetUrl =
    normalizePublicUrl(
      firstString(
        sceneSettings?.collision?.terrain?.collisionSourceAssetUrl,
        sceneSettings?.collision?.terrain?.sourceAssetUrl,
        sceneSettings?.collision?.terrain?.sourceAssetUrls,
      ),
    ) || resolveTerrainSourceAssetUrl(manifest)
  const sourceAssetPath = resolvePublicPath(sourceAssetUrl)
  if (!sourceAssetUrl || !sourceAssetPath || !existsSync(sourceAssetPath)) {
    throw new Error(
      'Terrain collision bake requires a source GLB/GLTF under the public asset root.',
    )
  }
  if (!/\.(glb|gltf)$/i.test(sourceAssetPath)) {
    throw new Error('Terrain collision source asset must be a GLB or GLTF file.')
  }
  return {
    sourceAssetUrl,
    sourceAssetPath,
    sourcePublicUrl: toPublicUrl(sourceAssetPath),
    fingerprint: fingerprintFile(sourceAssetPath),
  }
}

function parseArgs(argv) {
  const parsed = {}
  for (const arg of argv) {
    const match = arg.match(/^--([^=]+)=(.*)$/)
    if (match) parsed[match[1]] = match[2]
  }
  return parsed
}

function chooseNumber(...values) {
  for (const value of values) {
    const parsed = Number(value)
    if (Number.isFinite(parsed) && parsed > 0) return parsed
  }
  return undefined
}

function normalizeBakePreset(value) {
  const normalized = String(value || DEFAULT_TERRAIN_COLLIDER_PRESET)
  return Object.hasOwn(TERRAIN_COLLIDER_PRESETS, normalized)
    ? normalized
    : DEFAULT_TERRAIN_COLLIDER_PRESET
}

function resolveTerrainBakeSettings({ level, manifest, args }) {
  const sceneSettings = readTerrainSceneSettings(repoRoot, level)
  const terrain = sceneSettings?.collision?.terrain ?? {}
  const manifestSettings = manifest.collision?.terrain?.bakeSettings ?? {}
  const preset = normalizeBakePreset(
    args.preset ?? terrain.bakePreset ?? manifestSettings.preset,
  )
  const presetDefaults = TERRAIN_COLLIDER_PRESETS[preset]
  const targetTriangles = Math.floor(
    chooseNumber(
      args['target-triangles'],
      args['triangle-budget'],
      args['max-triangles'],
      terrain.targetTriangles,
      terrain.maxTriangles,
      terrain.triangleBudget,
      manifestSettings.targetTriangles,
      presetDefaults.targetTriangles,
    ),
  )
  const maxBytes = Math.floor(
    chooseNumber(
      args['max-bytes'],
      args['byte-budget'],
      terrain.maxBytes,
      terrain.maxColliderBytes,
      manifestSettings.maxBytes,
      presetDefaults.maxBytes,
    ),
  )
  if (!Number.isFinite(targetTriangles) || targetTriangles <= 0) {
    throw new Error('Terrain target triangle budget must be positive.')
  }
  if (!Number.isFinite(maxBytes) || maxBytes <= 0) {
    throw new Error('Terrain max byte budget must be positive.')
  }

  return {
    sceneSettings,
    bake: {
      mode: 'editor-walkable-surface',
      preset,
      targetTriangles,
      maxBytes,
    },
  }
}

function readDataUri(uri) {
  const match = uri.match(/^data:.*?;base64,(.*)$/)
  if (!match) throw new Error('Only base64 GLTF data URIs are supported')
  return Buffer.from(match[1], 'base64')
}

function parseGlb(path) {
  const buffer = readFileSync(path)
  if (buffer.readUInt32LE(0) !== 0x46546c67) {
    throw new Error(`${path} is not a GLB file`)
  }
  if (buffer.readUInt32LE(4) !== 2) {
    throw new Error('Only GLB version 2 is supported')
  }

  let json = null
  let bin = null
  let offset = 12
  while (offset < buffer.byteLength) {
    const chunkLength = buffer.readUInt32LE(offset)
    const chunkType = buffer.readUInt32LE(offset + 4)
    const chunk = buffer.subarray(offset + 8, offset + 8 + chunkLength)
    if (chunkType === 0x4e4f534a) json = JSON.parse(chunk.toString('utf8'))
    if (chunkType === 0x004e4942) bin = Buffer.from(chunk)
    offset += 8 + chunkLength
  }
  if (!json) throw new Error(`${path} has no JSON chunk`)
  return { json, glbBin: bin ?? Buffer.alloc(0), path }
}

function loadGltfDocument(path) {
  const extension = extname(path).toLowerCase()
  const parsed =
    extension === '.glb'
      ? parseGlb(path)
      : { json: readJson(path), glbBin: null, path }
  const gltf = parsed.json
  const buffers = (gltf.buffers ?? []).map((buffer, index) => {
    if (index === 0 && parsed.glbBin && !buffer.uri) return parsed.glbBin
    if (!buffer.uri) throw new Error(`Buffer ${index} has no URI`)
    if (buffer.uri.startsWith('data:')) return readDataUri(buffer.uri)
    return readFileSync(join(dirname(path), buffer.uri))
  })
  return { gltf, buffers, path }
}

function readAccessor(doc, accessorIndex) {
  const accessor = doc.gltf.accessors?.[accessorIndex]
  if (!accessor) throw new Error(`Missing accessor ${accessorIndex}`)
  if (accessor.sparse) throw new Error('Sparse accessors are not supported')

  const component = COMPONENT_READERS[accessor.componentType]
  const componentCount = ACCESSOR_COMPONENTS[accessor.type]
  if (!component || !componentCount) {
    throw new Error(
      `Unsupported accessor format ${accessor.componentType}/${accessor.type}`,
    )
  }

  const bufferView = doc.gltf.bufferViews?.[accessor.bufferView]
  if (!bufferView) throw new Error(`Accessor ${accessorIndex} has no bufferView`)

  const buffer = doc.buffers[bufferView.buffer]
  const stride = bufferView.byteStride ?? component.size * componentCount
  const baseOffset = (bufferView.byteOffset ?? 0) + (accessor.byteOffset ?? 0)
  const values = new Float32Array(accessor.count * componentCount)

  for (let item = 0; item < accessor.count; item += 1) {
    const itemOffset = baseOffset + item * stride
    for (let c = 0; c < componentCount; c += 1) {
      const offset = itemOffset + c * component.size
      let value = component.read.call(buffer, offset)
      if (accessor.normalized && accessor.componentType !== 5126) {
        value = component.signed
          ? Math.max(value / component.max, -1)
          : value / component.max
      }
      values[item * componentCount + c] = value
    }
  }

  return { values, count: accessor.count, componentCount }
}

function readIndices(doc, primitive, vertexCount) {
  if (primitive.indices === undefined) {
    return Uint32Array.from({ length: vertexCount }, (_, index) => index)
  }
  const accessor = readAccessor(doc, primitive.indices)
  return Uint32Array.from(accessor.values, value => value)
}

function identityMatrix() {
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
}

function multiplyMatrices(a, b) {
  const out = new Array(16).fill(0)
  for (let row = 0; row < 4; row += 1) {
    for (let col = 0; col < 4; col += 1) {
      for (let k = 0; k < 4; k += 1) {
        out[col * 4 + row] += a[k * 4 + row] * b[col * 4 + k]
      }
    }
  }
  return out
}

function composeNodeMatrix(node) {
  if (Array.isArray(node.matrix) && node.matrix.length === 16) {
    return node.matrix.slice()
  }
  const [tx, ty, tz] = node.translation ?? [0, 0, 0]
  const [x, y, z, w] = node.rotation ?? [0, 0, 0, 1]
  const [sx, sy, sz] = node.scale ?? [1, 1, 1]
  const x2 = x + x
  const y2 = y + y
  const z2 = z + z
  const xx = x * x2
  const xy = x * y2
  const xz = x * z2
  const yy = y * y2
  const yz = y * z2
  const zz = z * z2
  const wx = w * x2
  const wy = w * y2
  const wz = w * z2

  return [
    (1 - (yy + zz)) * sx,
    (xy + wz) * sx,
    (xz - wy) * sx,
    0,
    (xy - wz) * sy,
    (1 - (xx + zz)) * sy,
    (yz + wx) * sy,
    0,
    (xz + wy) * sz,
    (yz - wx) * sz,
    (1 - (xx + yy)) * sz,
    0,
    tx,
    ty,
    tz,
    1,
  ]
}

function transformPoint(matrix, x, y, z) {
  return [
    matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12],
    matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13],
    matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14],
  ]
}

function expandBounds(bounds, x, y, z) {
  bounds.min[0] = Math.min(bounds.min[0], x)
  bounds.min[1] = Math.min(bounds.min[1], y)
  bounds.min[2] = Math.min(bounds.min[2], z)
  bounds.max[0] = Math.max(bounds.max[0], x)
  bounds.max[1] = Math.max(bounds.max[1], y)
  bounds.max[2] = Math.max(bounds.max[2], z)
}

function emptyBounds() {
  return {
    min: [Infinity, Infinity, Infinity],
    max: [-Infinity, -Infinity, -Infinity],
  }
}

function sanitizeBounds(bounds) {
  if (!Number.isFinite(bounds.min[0])) return { min: [0, 0, 0], max: [0, 0, 0] }
  return bounds
}

function getRootNodeIndexes(gltf) {
  const scene = gltf.scenes?.[gltf.scene ?? 0]
  if (scene?.nodes?.length) return scene.nodes
  const childNodes = new Set()
  for (const node of gltf.nodes ?? []) {
    for (const child of node.children ?? []) childNodes.add(child)
  }
  return (gltf.nodes ?? [])
    .map((_, index) => index)
    .filter(index => !childNodes.has(index))
}

function collectColliderGeometry(doc) {
  const positions = []
  const indices = []
  const bounds = emptyBounds()

  function visitNode(nodeIndex, parentMatrix) {
    const node = doc.gltf.nodes?.[nodeIndex]
    if (!node) return
    const matrix = multiplyMatrices(parentMatrix, composeNodeMatrix(node))
    const mesh = doc.gltf.meshes?.[node.mesh]

    if (mesh) {
      for (const primitive of mesh.primitives ?? []) {
        if ((primitive.mode ?? 4) !== 4) continue
        const positionAccessorIndex = primitive.attributes?.POSITION
        if (positionAccessorIndex === undefined) continue

        const position = readAccessor(doc, positionAccessorIndex)
        const primitiveIndices = readIndices(doc, primitive, position.count)
        const vertexOffset = positions.length / 3

        for (let i = 0; i < position.count; i += 1) {
          const sourceOffset = i * 3
          const [x, y, z] = transformPoint(
            matrix,
            position.values[sourceOffset],
            position.values[sourceOffset + 1],
            position.values[sourceOffset + 2],
          )
          positions.push(x, y, z)
          expandBounds(bounds, x, y, z)
        }
        for (const index of primitiveIndices) indices.push(vertexOffset + index)
      }
    }

    for (const child of node.children ?? []) visitNode(child, matrix)
  }

  for (const nodeIndex of getRootNodeIndexes(doc.gltf)) {
    visitNode(nodeIndex, identityMatrix())
  }

  return {
    vertices: Float32Array.from(positions),
    indices: Uint32Array.from(indices),
    bounds: sanitizeBounds(bounds),
  }
}

function getBoundsCenter(bounds) {
  return [
    (bounds.min[0] + bounds.max[0]) / 2,
    (bounds.min[1] + bounds.max[1]) / 2,
    (bounds.min[2] + bounds.max[2]) / 2,
  ]
}

function getTriangleCount(geometry) {
  return Math.floor(geometry.indices.length / 3)
}

function estimateGridColliderBytes(resolution) {
  const vertexCount = resolution * resolution
  const triangleCount = (resolution - 1) * (resolution - 1) * 2
  return 32 + vertexCount * 3 * 4 + triangleCount * 3 * 4
}

function createEditorWalkableSurfaceGeometry(geometry, bake) {
  const targetResolution = Math.max(
    2,
    Math.floor(Math.sqrt(bake.targetTriangles / 2)) + 1,
  )
  let resolution = targetResolution
  while (resolution > 2 && (resolution - 1) * (resolution - 1) * 2 > bake.targetTriangles) {
    resolution -= 1
  }
  while (resolution > 2 && estimateGridColliderBytes(resolution) > bake.maxBytes) {
    resolution -= 1
  }

  const bounds = sanitizeBounds(geometry.bounds)
  const width = Math.max(0.0001, bounds.max[0] - bounds.min[0])
  const depth = Math.max(0.0001, bounds.max[2] - bounds.min[2])
  const cellCount = resolution * resolution
  const heights = new Float32Array(cellCount)
  const filled = new Uint8Array(cellCount)
  heights.fill(-Infinity)

  for (let offset = 0; offset < geometry.vertices.length; offset += 3) {
    const x = geometry.vertices[offset]
    const y = geometry.vertices[offset + 1]
    const z = geometry.vertices[offset + 2]
    const xi = Math.max(
      0,
      Math.min(resolution - 1, Math.round(((x - bounds.min[0]) / width) * (resolution - 1))),
    )
    const zi = Math.max(
      0,
      Math.min(resolution - 1, Math.round(((z - bounds.min[2]) / depth) * (resolution - 1))),
    )
    const index = zi * resolution + xi
    heights[index] = Math.max(heights[index], y)
    filled[index] = 1
  }

  for (let pass = 0; pass < resolution * 2; pass += 1) {
    let changed = false
    const nextHeights = new Float32Array(heights)
    const nextFilled = new Uint8Array(filled)
    for (let z = 0; z < resolution; z += 1) {
      for (let x = 0; x < resolution; x += 1) {
        const index = z * resolution + x
        if (filled[index]) continue
        let total = 0
        let count = 0
        for (let nz = Math.max(0, z - 1); nz <= Math.min(resolution - 1, z + 1); nz += 1) {
          for (let nx = Math.max(0, x - 1); nx <= Math.min(resolution - 1, x + 1); nx += 1) {
            const neighbor = nz * resolution + nx
            if (!filled[neighbor]) continue
            total += heights[neighbor]
            count += 1
          }
        }
        if (count > 0) {
          nextHeights[index] = total / count
          nextFilled[index] = 1
          changed = true
        }
      }
    }
    heights.set(nextHeights)
    filled.set(nextFilled)
    if (!changed) break
  }

  const projectedBounds = emptyBounds()
  const vertices = new Float32Array(cellCount * 3)
  for (let z = 0; z < resolution; z += 1) {
    for (let x = 0; x < resolution; x += 1) {
      const cell = z * resolution + x
      const offset = cell * 3
      const vx = bounds.min[0] + (width * x) / (resolution - 1)
      const vy = Number.isFinite(heights[cell]) ? heights[cell] : bounds.min[1]
      const vz = bounds.min[2] + (depth * z) / (resolution - 1)
      vertices[offset] = vx
      vertices[offset + 1] = vy
      vertices[offset + 2] = vz
      expandBounds(projectedBounds, vx, vy, vz)
    }
  }

  const indices = new Uint32Array((resolution - 1) * (resolution - 1) * 6)
  let writeIndex = 0
  for (let z = 0; z < resolution - 1; z += 1) {
    for (let x = 0; x < resolution - 1; x += 1) {
      const a = z * resolution + x
      const b = a + 1
      const c = a + resolution
      const d = c + 1
      indices[writeIndex++] = a
      indices[writeIndex++] = c
      indices[writeIndex++] = b
      indices[writeIndex++] = b
      indices[writeIndex++] = c
      indices[writeIndex++] = d
    }
  }

  return {
    vertices,
    indices,
    bounds: sanitizeBounds(projectedBounds),
    surfaceResolution: resolution,
  }
}

function buildColliderMeta({
  source,
  sourceGeometry,
  geometry,
  bake,
  binaryBytes,
  surface,
}) {
  const vertexCount = geometry.vertices.length / 3
  const indexCount = geometry.indices.length
  const triangleCount = Math.floor(indexCount / 3)
  const sourceVertexCount = sourceGeometry.vertices.length / 3
  const sourceTriangleCount = getTriangleCount(sourceGeometry)
  const sourceBounds = sourceGeometry.bounds
  return {
    type: 'baked-terrain-mesh',
    version: VERSION,
    sourceAssetUrl: source.sourcePublicUrl,
    sourceAssetFingerprint: source.fingerprint,
    bakeMode: 'editor-walkable-surface',
    preset: bake.preset,
    targetTriangles: bake.targetTriangles,
    maxBytes: bake.maxBytes,
    byteSize: binaryBytes,
    sourceTriangleCount,
    sourceVertexCount,
    sourceResolution: sourceTriangleCount,
    colliderResolution: triangleCount,
    sampleStep: Math.max(
      1,
      Math.ceil(sourceTriangleCount / Math.max(1, triangleCount)),
    ),
    vertexCount,
    indexCount,
    triangleCount,
    bounds: geometry.bounds,
    center: getBoundsCenter(geometry.bounds),
    surface,
    bakeSettings: {
      preset: bake.preset,
      targetTriangles: bake.targetTriangles,
      maxBytes: bake.maxBytes,
    },
    sourceContract: {
      schemaVersion: 1,
      terrainSourceType: 'glb-chunk-terrain',
      runtimeMode: 'editor-baked-terrain',
      sourceAssetUrl: source.sourcePublicUrl,
      sourceAssetUrls: [source.sourcePublicUrl],
      authoredSourceAssetUrls: [source.sourcePublicUrl],
      sourceAssetFingerprint: source.fingerprint,
      sourceAssetFingerprints: [
        { url: source.sourcePublicUrl, fingerprint: source.fingerprint },
      ],
      sourceCoordinateSystem: 'three-y-up-xz-ground',
      sourceBounds,
      renderBakeMode: 'source-glb-chunk-mesh',
      collisionBakeMode: 'editor-walkable-surface',
      collisionMeshSource: {
        type: 'editor-walkable-surface',
        url: source.sourcePublicUrl,
        fingerprint: source.fingerprint,
        surface,
      },
      collisionCoverageBounds: geometry.bounds,
      role: 'walkable',
      sourceVertexCount,
      sourceTriangleCount,
      vertexCount,
      triangleCount,
      byteSize: binaryBytes,
      targetTriangles: bake.targetTriangles,
      maxBytes: bake.maxBytes,
    },
  }
}

function getColliderBinaryByteLength(geometry) {
  return 32 + geometry.vertices.byteLength + geometry.indices.byteLength
}

function writeColliderBinary(path, geometry, meta) {
  mkdirSync(dirname(path), { recursive: true })
  const headerBytes = 32
  const buffer = Buffer.alloc(
    headerBytes + geometry.vertices.byteLength + geometry.indices.byteLength,
  )
  let offset = 0
  buffer.writeUInt32LE(MAGIC, offset)
  offset += 4
  buffer.writeUInt32LE(VERSION, offset)
  offset += 4
  buffer.writeUInt32LE(meta.vertexCount, offset)
  offset += 4
  buffer.writeUInt32LE(meta.indexCount, offset)
  offset += 4
  buffer.writeUInt32LE(meta.triangleCount, offset)
  offset += 4
  buffer.writeUInt32LE(meta.sourceResolution, offset)
  offset += 4
  buffer.writeUInt32LE(meta.colliderResolution, offset)
  offset += 4
  buffer.writeUInt32LE(meta.sampleStep, offset)
  offset += 4
  Buffer.from(geometry.vertices.buffer).copy(buffer, offset)
  offset += geometry.vertices.byteLength
  Buffer.from(geometry.indices.buffer).copy(buffer, offset)
  writeFileSync(path, buffer)
}

function updateManifestCollision(manifest, publicBinaryPath, publicMetaPath, meta) {
  const { trimesh: _legacyTrimesh, ...physicsWithoutLegacyTrimesh } =
    manifest.physics ?? {}
  return {
    ...manifest,
    runtime: {
      ...(manifest.runtime ?? {}),
      terrainAuthority: 'editor-baked-terrain',
      mode: 'glb-chunk-terrain',
      visualSource: 'source-glb-chunks',
      fallbackSurfacePolicy: manifest.runtime?.fallbackSurfacePolicy ?? 'disabled',
    },
    collision: {
      ...(manifest.collision ?? {}),
      terrain: {
        type: 'baked-terrain-mesh',
        sourceLinked: true,
        url: publicBinaryPath,
        metadataUrl: publicMetaPath,
        triangleCount: meta.triangleCount,
        vertexCount: meta.vertexCount,
        byteSize: meta.byteSize,
        bakeMode: meta.bakeMode,
        preset: meta.preset,
        targetTriangles: meta.targetTriangles,
        maxBytes: meta.maxBytes,
        bakeSettings: meta.bakeSettings,
        colliderResolution: meta.colliderResolution,
        sampleStep: meta.sampleStep,
        bounds: meta.bounds,
        center: meta.center,
        sourceContract: meta.sourceContract,
      },
    },
    visualChunks: manifest.visualChunks
      ? {
          ...manifest.visualChunks,
          source: 'source-glb',
          sourceContract: {
            ...(manifest.visualChunks.sourceContract ?? {}),
            terrainSourceType: 'glb-chunk-terrain',
            runtimeMode: 'editor-baked-terrain',
            sourceAssetUrl: meta.sourceContract.sourceAssetUrl,
            sourceAssetUrls: meta.sourceContract.sourceAssetUrls,
            sourceAssetFingerprint: meta.sourceContract.sourceAssetFingerprint,
            sourceCoordinateSystem: meta.sourceContract.sourceCoordinateSystem,
            sourceBounds:
              manifest.visualChunks.sourceContract?.sourceBounds ??
              meta.sourceContract.sourceBounds,
            renderBakeMode: 'source-glb-chunk-mesh',
            collisionBakeMode: 'editor-walkable-surface',
            collisionMeshSource: meta.sourceContract.collisionMeshSource,
          },
        }
      : manifest.visualChunks,
    physics: {
      ...physicsWithoutLegacyTrimesh,
      bounds: physicsWithoutLegacyTrimesh.bounds ?? meta.bounds,
      minHeight: physicsWithoutLegacyTrimesh.minHeight ?? meta.bounds.min[1],
      maxHeight: physicsWithoutLegacyTrimesh.maxHeight ?? meta.bounds.max[1],
      type: 'baked-terrain-mesh',
    },
  }
}

const args = parseArgs(process.argv.slice(2))
const requestedLevel = args.level ?? process.argv[2]
const terrainLevels = discoverTerrainLevels({ repoRoot, publicRoot })
const requestedTerrainLevel = resolveTerrainLevel(terrainLevels, requestedLevel)
const levelsToBake = requestedLevel
  ? [requestedTerrainLevel].filter(Boolean)
  : terrainLevels

if (requestedLevel && levelsToBake.length === 0) {
  throw new Error(
    `Unknown terrain collision bake level: ${requestedLevel}. Known terrain levels: ${formatTerrainLevelList(terrainLevels)}`,
  )
}
if (levelsToBake.length === 0) {
  throw new Error('No deployed terrain manifests were discovered for collision baking')
}

for (const level of levelsToBake) {
  const manifest = readJson(level.manifestPath)
  const { sceneSettings, bake } = resolveTerrainBakeSettings({
    level,
    manifest,
    args,
  })
  const source = resolveTerrainSourceAsset(manifest, sceneSettings)
  const sourceGeometry = collectColliderGeometry(loadGltfDocument(source.sourceAssetPath))
  if (sourceGeometry.indices.length < 3) {
    throw new Error(`No triangle mesh primitives found in ${source.sourceAssetUrl}`)
  }
  const geometry = createEditorWalkableSurfaceGeometry(sourceGeometry, bake)
  const binaryBytes = getColliderBinaryByteLength(geometry)
  const meta = buildColliderMeta({
    source,
    sourceGeometry,
    geometry,
    bake,
    binaryBytes,
    surface: {
      algorithm: 'editor-walkable-grid',
      resolution: geometry.surfaceResolution,
      sourceTriangleCount: getTriangleCount(sourceGeometry),
      outputTriangleCount: getTriangleCount(geometry),
    },
  })
  const publicBinaryPath = `/terrain/collision/${level.id}.collider.bin`
  const publicMetaPath = `/terrain/collision/${level.id}.collider.meta.json`
  const binaryPath = join(publicRoot, publicBinaryPath.replace(/^\//, ''))
  const metaPath = join(publicRoot, publicMetaPath.replace(/^\//, ''))

  writeColliderBinary(binaryPath, geometry, meta)
  meta.byteSize = statSync(binaryPath).size
  writeJson(metaPath, meta)
  writeJson(
    level.manifestPath,
    updateManifestCollision(manifest, publicBinaryPath, publicMetaPath, meta),
  )

  console.log(
    `[bake-terrain-collision] ${level.id}: ${meta.vertexCount} vertices, ${meta.triangleCount}/${bake.targetTriangles} triangles, ${meta.byteSize}/${bake.maxBytes} bytes from ${source.sourcePublicUrl} -> ${publicBinaryPath}`,
  )
  console.log(
    JSON.stringify({
      success: true,
      levelId: level.levelId,
      manifestUrl: `/terrain/${level.id}.manifest.json`,
      collision: {
        url: publicBinaryPath,
        metadataUrl: publicMetaPath,
        triangleCount: meta.triangleCount,
        vertexCount: meta.vertexCount,
        byteSize: meta.byteSize,
        bakeMode: meta.bakeMode,
        preset: meta.preset,
        targetTriangles: meta.targetTriangles,
        maxBytes: meta.maxBytes,
        colliderResolution: meta.colliderResolution,
      },
      metadata: meta,
    }),
  )
}
