import { createHash } from 'node:crypto'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { dirname, extname, isAbsolute, join, relative } from 'node:path'
import pathPosix from 'node:path/posix'
import { repairGeneratedPbrGlb } from './lib/gltfGeneratedPbrRepair.mjs'
import {
  discoverTerrainLevels,
  formatTerrainLevelList,
  readTerrainSceneSettings,
  resolveTerrainLevel,
  resolveTerrainSourceAssetUrl,
} from './lib/terrainManifestDiscovery.mjs'

const repoRoot = new URL('../../..', import.meta.url).pathname.replace(
  /^\/([A-Za-z]:)/,
  '$1',
)
const publicRoot = join(repoRoot, 'apps/megameal/public')

const COMPONENT_READERS = {
  5120: { size: 1, read: Buffer.prototype.readInt8, signed: true, max: 127 },
  5121: { size: 1, read: Buffer.prototype.readUInt8, signed: false, max: 255 },
  5122: {
    size: 2,
    read: Buffer.prototype.readInt16LE,
    signed: true,
    max: 32767,
  },
  5123: {
    size: 2,
    read: Buffer.prototype.readUInt16LE,
    signed: false,
    max: 65535,
  },
  5125: {
    size: 4,
    read: Buffer.prototype.readUInt32LE,
    signed: false,
    max: 4294967295,
  },
  5126: { size: 4, read: Buffer.prototype.readFloatLE, signed: true, max: 1 },
}

const ACCESSOR_COMPONENTS = {
  SCALAR: 1,
  VEC2: 2,
  VEC3: 3,
  VEC4: 4,
  MAT2: 4,
  MAT3: 9,
  MAT4: 16,
}

function getArg(name, fallback = '') {
  const prefix = `--${name}=`
  return (
    process.argv.find(arg => arg.startsWith(prefix))?.slice(prefix.length) ??
    fallback
  )
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`)
}

function isPublicRuntimePath(assetUrl) {
  return typeof assetUrl === 'string' && assetUrl.startsWith('/')
}

function isGltfAssetUrl(assetUrl) {
  return /\.(glb|gltf)$/i.test(assetUrl.split('?')[0] ?? '')
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

function align4(buffer) {
  const padding = (4 - (buffer.byteLength % 4)) % 4
  return padding ? Buffer.concat([buffer, Buffer.alloc(padding)]) : buffer
}

function alignJson(buffer) {
  const padding = (4 - (buffer.byteLength % 4)) % 4
  return padding ? Buffer.concat([buffer, Buffer.alloc(padding, 0x20)]) : buffer
}

function cloneJson(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value))
}

function readDataUri(uri) {
  const match = /^data:.*?;base64,(.*)$/i.exec(uri)
  if (!match) throw new Error('Only base64 data URIs are supported')
  return Buffer.from(match[1], 'base64')
}

function resolvePublicAssetPath(assetUrl) {
  if (!assetUrl) return ''
  if (assetUrl.startsWith('data:')) return ''
  if (isAbsolute(assetUrl) && existsSync(assetUrl)) return assetUrl
  return join(publicRoot, assetUrl.replace(/^\//, ''))
}

function toPublicUrl(assetPath) {
  const normalized = relative(publicRoot, assetPath).split('\\').join('/')
  return normalized.startsWith('..') ? assetPath : `/${normalized}`
}

function resolveSource({ level, manifest, sourceOverride }) {
  const sourceAssetUrl =
    sourceOverride ||
    resolveTerrainSourceAssetUrl({
      repoRoot,
      level,
      manifest,
    })
  const sourceAssetPath = resolvePublicAssetPath(sourceAssetUrl)
  const sourcePublicUrl =
    sourceAssetUrl?.startsWith('/') || sourceAssetUrl?.startsWith('data:')
      ? sourceAssetUrl
      : sourceAssetPath
        ? toPublicUrl(sourceAssetPath)
        : sourceAssetUrl

  return {
    sourceAssetUrl,
    sourcePublicUrl,
    sourceAssetPath,
    exists: Boolean(sourceAssetPath && existsSync(sourceAssetPath)),
  }
}

function getTerrainContract({ level, manifest }) {
  const settings = readTerrainSceneSettings(repoRoot, level)
  const terrain = settings.collision?.terrain ?? {}
  const ground = settings.ground ?? {}
  const renderProduct = manifest.visualChunks?.product ?? terrain.renderChunks
  const runtimeMode =
    terrain.runtimeMode ?? ground.terrainRuntimeMode ?? manifest.runtime?.mode
  const visualSource =
    terrain.visualSource ??
    ground.terrainVisualSource ??
    manifest.runtime?.visualSource

  return {
    runtimeMode,
    visualSource,
    renderProductType: renderProduct?.type,
    sourceAssetUrl:
      terrain.sourceAssetUrl ??
      manifest.source?.assetUrl ??
      manifest.assets?.sourceGlb ??
      manifest.assets?.environment,
  }
}

function isGlbChunkTerrainContract(contract) {
  return (
    contract.runtimeMode === 'glb-chunk-terrain' ||
    contract.visualSource === 'source-glb-chunks' ||
    contract.renderProductType === 'glb-chunk-terrain'
  )
}

function auditTerrainSources(levels) {
  const items = levels.map(level => {
    const manifest = readJson(level.manifestPath)
    const source = resolveSource({ level, manifest, sourceOverride: '' })
    const terrainContract = getTerrainContract({ level, manifest })
    const sourceRequired = isGlbChunkTerrainContract(terrainContract)
    const validPublicPath = isPublicRuntimePath(source.sourcePublicUrl)
    const validAssetType = isGltfAssetUrl(source.sourcePublicUrl)
    const exists = source.exists
    const sourceHash = exists
      ? createHash('sha256')
          .update(readFileSync(source.sourceAssetPath))
          .digest('hex')
      : ''
    const problems = [
      source.sourceAssetUrl ? '' : 'missing source URL',
      source.sourceAssetUrl && !validPublicPath
        ? 'source URL is not a public runtime path'
        : '',
      source.sourceAssetUrl && !validAssetType
        ? 'source URL is not a .glb/.gltf asset'
        : '',
      source.sourceAssetUrl && !exists ? 'source file is missing on disk' : '',
    ].filter(Boolean)

    return {
      levelId: level.levelId,
      manifestUrl: `/terrain/${level.id}.manifest.json`,
      runtimeMode: terrainContract.runtimeMode ?? 'unconfigured',
      visualSource: terrainContract.visualSource ?? 'unconfigured',
      sourceRequired,
      sourceAssetUrl: source.sourceAssetUrl,
      sourcePublicUrl: source.sourcePublicUrl,
      sourceLocalPath: source.sourceAssetPath,
      sourceExists: exists,
      sourceHash: sourceHash || undefined,
      problems,
    }
  })
  const blockers = items.filter(
    item => item.sourceRequired && item.problems.length > 0,
  )
  const warnings = items.filter(
    item => !item.sourceRequired && item.problems.length > 0,
  )

  return {
    success: blockers.length === 0,
    checkedLevelCount: items.length,
    blockerCount: blockers.length,
    warningCount: warnings.length,
    blockers,
    warnings,
    levels: items,
  }
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
  if (!bufferView)
    throw new Error(`Accessor ${accessorIndex} has no bufferView`)

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

  return {
    values,
    count: accessor.count,
    componentCount,
    componentType: accessor.componentType,
    type: accessor.type,
  }
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

function transformDirection(matrix, x, y, z) {
  const nx = matrix[0] * x + matrix[4] * y + matrix[8] * z
  const ny = matrix[1] * x + matrix[5] * y + matrix[9] * z
  const nz = matrix[2] * x + matrix[6] * y + matrix[10] * z
  const length = Math.hypot(nx, ny, nz) || 1
  return [nx / length, ny / length, nz / length]
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
  if (!Number.isFinite(bounds.min[0])) {
    return { min: [0, 0, 0], max: [0, 0, 0] }
  }
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

function extractSourcePrimitives(doc) {
  const primitives = []
  const bounds = emptyBounds()

  function visitNode(nodeIndex, parentMatrix, nodePath) {
    const node = doc.gltf.nodes?.[nodeIndex]
    if (!node) return
    const matrix = multiplyMatrices(parentMatrix, composeNodeMatrix(node))
    const nextPath = [...nodePath, node.name ?? `node_${nodeIndex}`]
    const mesh = doc.gltf.meshes?.[node.mesh]

    if (mesh) {
      for (
        let primitiveIndex = 0;
        primitiveIndex < (mesh.primitives ?? []).length;
        primitiveIndex += 1
      ) {
        const primitive = mesh.primitives[primitiveIndex]
        if ((primitive.mode ?? 4) !== 4) continue
        const positionAccessorIndex = primitive.attributes?.POSITION
        if (positionAccessorIndex === undefined) continue

        const position = readAccessor(doc, positionAccessorIndex)
        const normal =
          primitive.attributes.NORMAL === undefined
            ? null
            : readAccessor(doc, primitive.attributes.NORMAL)
        const tangent =
          primitive.attributes.TANGENT === undefined
            ? null
            : readAccessor(doc, primitive.attributes.TANGENT)
        const uv =
          primitive.attributes.TEXCOORD_0 === undefined
            ? null
            : readAccessor(doc, primitive.attributes.TEXCOORD_0)
        const indices = readIndices(doc, primitive, position.count)
        const positions = new Float32Array(position.count * 3)
        const normals = normal ? new Float32Array(position.count * 3) : null
        const tangents = tangent ? new Float32Array(position.count * 4) : null

        for (let i = 0; i < position.count; i += 1) {
          const sourceOffset = i * 3
          const [x, y, z] = transformPoint(
            matrix,
            position.values[sourceOffset],
            position.values[sourceOffset + 1],
            position.values[sourceOffset + 2],
          )
          positions[sourceOffset] = x
          positions[sourceOffset + 1] = y
          positions[sourceOffset + 2] = z
          expandBounds(bounds, x, y, z)

          if (normal && normals) {
            const [nx, ny, nz] = transformDirection(
              matrix,
              normal.values[sourceOffset],
              normal.values[sourceOffset + 1],
              normal.values[sourceOffset + 2],
            )
            normals[sourceOffset] = nx
            normals[sourceOffset + 1] = ny
            normals[sourceOffset + 2] = nz
          }

          if (tangent && tangents) {
            const tangentOffset = i * 4
            const [tx, ty, tz] = transformDirection(
              matrix,
              tangent.values[tangentOffset],
              tangent.values[tangentOffset + 1],
              tangent.values[tangentOffset + 2],
            )
            tangents[tangentOffset] = tx
            tangents[tangentOffset + 1] = ty
            tangents[tangentOffset + 2] = tz
            tangents[tangentOffset + 3] = tangent.values[tangentOffset + 3]
          }
        }

        primitives.push({
          sourceIndex: primitives.length,
          nodeName: node.name ?? `node_${nodeIndex}`,
          nodePath: nextPath.join('/'),
          meshName: mesh.name ?? `mesh_${node.mesh}`,
          primitiveIndex,
          materialIndex: primitive.material,
          positions,
          normals,
          tangents,
          uvs: uv?.values ?? null,
          indices,
          triangleCount: Math.floor(indices.length / 3),
        })
      }
    }

    for (const child of node.children ?? []) visitNode(child, matrix, nextPath)
  }

  for (const nodeIndex of getRootNodeIndexes(doc.gltf)) {
    visitNode(nodeIndex, identityMatrix(), [])
  }

  return { primitives, bounds: sanitizeBounds(bounds) }
}

function copyVertex(part, primitive, sourceVertex) {
  let targetVertex = part.vertexMap.get(sourceVertex)
  if (targetVertex !== undefined) return targetVertex

  targetVertex = part.positions.length / 3
  part.vertexMap.set(sourceVertex, targetVertex)
  const positionOffset = sourceVertex * 3
  part.positions.push(
    primitive.positions[positionOffset],
    primitive.positions[positionOffset + 1],
    primitive.positions[positionOffset + 2],
  )

  if (primitive.normals) {
    part.normals.push(
      primitive.normals[positionOffset],
      primitive.normals[positionOffset + 1],
      primitive.normals[positionOffset + 2],
    )
  }
  if (primitive.tangents) {
    const tangentOffset = sourceVertex * 4
    part.tangents.push(
      primitive.tangents[tangentOffset],
      primitive.tangents[tangentOffset + 1],
      primitive.tangents[tangentOffset + 2],
      primitive.tangents[tangentOffset + 3],
    )
  }
  if (primitive.uvs) {
    const uvOffset = sourceVertex * 2
    part.uvs.push(primitive.uvs[uvOffset], primitive.uvs[uvOffset + 1])
  }

  return targetVertex
}

function createChunk(x, z, bounds) {
  return {
    x,
    z,
    lod: 0,
    bounds,
    parts: [],
    partBySource: new Map(),
    triangleCount: 0,
    materialSlots: new Set(),
  }
}

function getPart(chunk, primitive) {
  let part = chunk.partBySource.get(primitive.sourceIndex)
  if (part) return part
  part = {
    sourceIndex: primitive.sourceIndex,
    nodeName: primitive.nodeName,
    nodePath: primitive.nodePath,
    meshName: primitive.meshName,
    primitiveIndex: primitive.primitiveIndex,
    materialIndex: primitive.materialIndex,
    positions: [],
    normals: [],
    tangents: [],
    uvs: [],
    indices: [],
    vertexMap: new Map(),
    bounds: emptyBounds(),
  }
  chunk.partBySource.set(primitive.sourceIndex, part)
  chunk.parts.push(part)
  return part
}

function cellIndex(value, min, max, grid) {
  const size = max - min || 1
  return Math.max(
    0,
    Math.min(grid - 1, Math.floor(((value - min) / size) * grid)),
  )
}

function partitionPrimitives({ primitives, bounds, grid }) {
  const chunks = []
  const byCell = new Map()

  for (let x = 0; x < grid; x += 1) {
    for (let z = 0; z < grid; z += 1) {
      const chunkBounds = {
        min: [
          bounds.min[0] + ((bounds.max[0] - bounds.min[0]) * x) / grid,
          bounds.min[1],
          bounds.min[2] + ((bounds.max[2] - bounds.min[2]) * z) / grid,
        ],
        max: [
          bounds.min[0] + ((bounds.max[0] - bounds.min[0]) * (x + 1)) / grid,
          bounds.max[1],
          bounds.min[2] + ((bounds.max[2] - bounds.min[2]) * (z + 1)) / grid,
        ],
      }
      const chunk = createChunk(x, z, chunkBounds)
      byCell.set(`${x}:${z}`, chunk)
      chunks.push(chunk)
    }
  }

  for (const primitive of primitives) {
    for (let i = 0; i < primitive.indices.length; i += 3) {
      const a = primitive.indices[i]
      const b = primitive.indices[i + 1]
      const c = primitive.indices[i + 2]
      const ax = primitive.positions[a * 3]
      const ay = primitive.positions[a * 3 + 1]
      const az = primitive.positions[a * 3 + 2]
      const bx = primitive.positions[b * 3]
      const by = primitive.positions[b * 3 + 1]
      const bz = primitive.positions[b * 3 + 2]
      const cx = primitive.positions[c * 3]
      const cy = primitive.positions[c * 3 + 1]
      const cz = primitive.positions[c * 3 + 2]
      const x = cellIndex(
        (ax + bx + cx) / 3,
        bounds.min[0],
        bounds.max[0],
        grid,
      )
      const z = cellIndex(
        (az + bz + cz) / 3,
        bounds.min[2],
        bounds.max[2],
        grid,
      )
      const chunk = byCell.get(`${x}:${z}`)
      const part = getPart(chunk, primitive)
      const ia = copyVertex(part, primitive, a)
      const ib = copyVertex(part, primitive, b)
      const ic = copyVertex(part, primitive, c)
      part.indices.push(ia, ib, ic)
      for (const [px, py, pz] of [
        [ax, ay, az],
        [bx, by, bz],
        [cx, cy, cz],
      ]) {
        expandBounds(part.bounds, px, py, pz)
        expandBounds(chunk.bounds, px, py, pz)
      }
      chunk.triangleCount += 1
      if (primitive.materialIndex !== undefined) {
        chunk.materialSlots.add(primitive.materialIndex)
      }
    }
  }

  for (const chunk of chunks) {
    chunk.bounds = sanitizeBounds(chunk.bounds)
    for (const part of chunk.parts) part.bounds = sanitizeBounds(part.bounds)
  }
  return chunks
}

function makeBufferView(bufferViews, chunks, typedArray, target) {
  const source = Buffer.from(
    typedArray.buffer,
    typedArray.byteOffset,
    typedArray.byteLength,
  )
  const offset = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0)
  chunks.push(align4(source))
  bufferViews.push({
    buffer: 0,
    byteOffset: offset,
    byteLength: source.byteLength,
    ...(target ? { target } : {}),
  })
  return bufferViews.length - 1
}

function makeAccessor(
  accessors,
  bufferView,
  componentType,
  count,
  type,
  extras = {},
) {
  accessors.push({ bufferView, componentType, count, type, ...extras })
  return accessors.length - 1
}

function appendSourceBufferView({
  sourceDoc,
  sourceBufferViewIndex,
  bufferViews,
  chunks,
}) {
  const sourceView = sourceDoc.gltf.bufferViews?.[sourceBufferViewIndex]
  if (!sourceView)
    throw new Error(`Missing source image bufferView ${sourceBufferViewIndex}`)
  const sourceBuffer = sourceDoc.buffers[sourceView.buffer]
  const source = sourceBuffer.subarray(
    sourceView.byteOffset ?? 0,
    (sourceView.byteOffset ?? 0) + sourceView.byteLength,
  )
  const offset = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0)
  chunks.push(align4(Buffer.from(source)))
  bufferViews.push({
    buffer: 0,
    byteOffset: offset,
    byteLength: source.byteLength,
  })
  return bufferViews.length - 1
}

function normalizeImageUri(uri, sourcePublicUrl) {
  if (
    !uri ||
    uri.startsWith('data:') ||
    uri.startsWith('/') ||
    /^[a-z]+:/i.test(uri)
  ) {
    return uri
  }
  const base = pathPosix.dirname(
    sourcePublicUrl.startsWith('/') ? sourcePublicUrl : `/${sourcePublicUrl}`,
  )
  return pathPosix.normalize(pathPosix.join(base, uri))
}

function copyMaterialState({
  sourceDoc,
  sourcePublicUrl,
  bufferViews,
  chunks,
}) {
  const gltf = sourceDoc.gltf
  const images = cloneJson(gltf.images)
  if (images) {
    for (const image of images) {
      if (image.bufferView !== undefined) {
        image.bufferView = appendSourceBufferView({
          sourceDoc,
          sourceBufferViewIndex: image.bufferView,
          bufferViews,
          chunks,
        })
      } else if (image.uri) {
        image.uri = normalizeImageUri(image.uri, sourcePublicUrl)
      }
    }
  }

  return {
    materials: cloneJson(gltf.materials),
    textures: cloneJson(gltf.textures),
    images,
    samplers: cloneJson(gltf.samplers),
    extensionsUsed: cloneJson(gltf.extensionsUsed),
    extensionsRequired: cloneJson(gltf.extensionsRequired),
  }
}

function writeChunkGlb(path, chunk, sourceDoc, sourcePublicUrl) {
  mkdirSync(dirname(path), { recursive: true })
  const chunks = []
  const bufferViews = []
  const accessors = []
  const primitives = []
  const materialState = copyMaterialState({
    sourceDoc,
    sourcePublicUrl,
    bufferViews,
    chunks,
  })

  for (const part of chunk.parts) {
    if (part.indices.length === 0) continue
    const attributes = {}
    const positions = Float32Array.from(part.positions)
    const positionView = makeBufferView(bufferViews, chunks, positions, 34962)
    attributes.POSITION = makeAccessor(
      accessors,
      positionView,
      5126,
      positions.length / 3,
      'VEC3',
      { min: part.bounds.min, max: part.bounds.max },
    )

    if (part.normals.length) {
      const normals = Float32Array.from(part.normals)
      const normalView = makeBufferView(bufferViews, chunks, normals, 34962)
      attributes.NORMAL = makeAccessor(
        accessors,
        normalView,
        5126,
        normals.length / 3,
        'VEC3',
      )
    }

    if (part.tangents.length) {
      const tangents = Float32Array.from(part.tangents)
      const tangentView = makeBufferView(bufferViews, chunks, tangents, 34962)
      attributes.TANGENT = makeAccessor(
        accessors,
        tangentView,
        5126,
        tangents.length / 4,
        'VEC4',
      )
    }

    if (part.uvs.length) {
      const uvs = Float32Array.from(part.uvs)
      const uvView = makeBufferView(bufferViews, chunks, uvs, 34962)
      attributes.TEXCOORD_0 = makeAccessor(
        accessors,
        uvView,
        5126,
        uvs.length / 2,
        'VEC2',
      )
    }

    const indices = Uint32Array.from(part.indices)
    const indexView = makeBufferView(bufferViews, chunks, indices, 34963)
    const primitive = {
      attributes,
      indices: makeAccessor(
        accessors,
        indexView,
        5125,
        indices.length,
        'SCALAR',
      ),
      mode: 4,
      extras: {
        sourceNodePath: part.nodePath,
        sourceMeshName: part.meshName,
        sourcePrimitiveIndex: part.primitiveIndex,
      },
    }
    if (part.materialIndex !== undefined)
      primitive.material = part.materialIndex
    primitives.push(primitive)
  }

  const bin = Buffer.concat(chunks)
  const json = {
    asset: { version: '2.0', generator: 'Merkin GLB terrain chunk cooker' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0, name: `chunk_${chunk.x}_${chunk.z}_LOD0` }],
    meshes: [{ primitives }],
    ...Object.fromEntries(
      Object.entries(materialState).filter(([, value]) => value?.length),
    ),
    accessors,
    bufferViews,
    buffers: [{ byteLength: bin.byteLength }],
    extras: {
      terrainChunk: {
        x: chunk.x,
        z: chunk.z,
        lod: 0,
        triangleCount: chunk.triangleCount,
        bounds: chunk.bounds,
      },
    },
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

function getMaterialSlots(gltf, materialIndexes) {
  return [...materialIndexes]
    .sort((a, b) => a - b)
    .map(index => ({
      index,
      name: gltf.materials?.[index]?.name ?? `material_${index}`,
    }))
}

function buildSourceFingerprint(sourceHash) {
  return {
    algorithm: 'sha256',
    value: sourceHash,
  }
}

function withSourceUrl(sourceAssetUrls, sourceAssetUrl) {
  const urls = Array.isArray(sourceAssetUrls) ? sourceAssetUrls : []
  return urls.includes(sourceAssetUrl) ? urls : [sourceAssetUrl, ...urls]
}

function buildVisualSourceContract({ manifest, source, sourceHash, bounds }) {
  const current = manifest.visualChunks?.sourceContract ?? {}
  const sourceAssetFingerprint = buildSourceFingerprint(sourceHash)

  return {
    ...current,
    schemaVersion: current.schemaVersion ?? 1,
    terrainSourceType: 'glb-chunk-terrain',
    sourceAssetUrl: source.sourcePublicUrl,
    sourceAssetUrls: withSourceUrl(
      current.sourceAssetUrls,
      source.sourcePublicUrl,
    ),
    sourceAssetFingerprint,
    sourceCoordinateSystem:
      current.sourceCoordinateSystem ?? 'three-y-up-xz-ground',
    sourceBounds: current.sourceBounds ?? bounds,
    renderBakeMode: 'source-glb-chunk-mesh',
    collisionBakeMode: 'editor-walkable-surface',
    collisionMeshSource: {
      type: 'editor-walkable-surface',
      url: source.sourcePublicUrl,
      fingerprint: sourceAssetFingerprint,
    },
  }
}

function buildManifest({
  manifest,
  source,
  sourceHash,
  sourceByteSize,
  primitives,
  textureReferenceCount,
  grid,
  chunks,
  chunksPath,
  bounds,
  lodDistance,
  pbrRepairReport,
}) {
  const primitiveByIndex = new Map(
    primitives.map(primitive => [primitive.sourceIndex, primitive]),
  )
  const sourceHasUvs = primitives.some(primitive => primitive.uvs)
  const sourceHasTextures = textureReferenceCount > 0
  const chunkMetadata = chunks.map(chunk => ({
    x: chunk.x,
    z: chunk.z,
    lod: 0,
    url: `${chunksPath}chunk_${chunk.x}_${chunk.z}_LOD0.glb`,
    bounds: chunk.bounds,
    byteSize: chunk.byteSize ?? 0,
    triangleCount: chunk.triangleCount,
    materialSlots: chunk.materialSlotsMetadata,
  }))
  const chunkCount = chunks.length
  const sourceAssetFingerprint = buildSourceFingerprint(sourceHash)
  const preserves = {
    sourceUvs:
      sourceHasUvs &&
      chunks.every(chunk =>
        chunk.parts.every(part => {
          const primitive = primitiveByIndex.get(part.sourceIndex)
          return (
            !primitive?.uvs || part.uvs.length / 2 === part.positions.length / 3
          )
        }),
      ),
    normals: chunks.some(chunk =>
      chunk.parts.some(part => part.normals.length > 0),
    ),
    tangents: chunks.some(chunk =>
      chunk.parts.some(part => part.tangents.length > 0),
    ),
    materialSlots: true,
    meshGroups: true,
    textureReferences: sourceHasTextures,
  }

  return {
    ...manifest,
    runtime: {
      ...(manifest.runtime ?? {}),
      mode: 'glb-chunk-terrain',
      visualSource: 'source-glb-chunks',
      fallbackSurfacePolicy:
        manifest.runtime?.fallbackSurfacePolicy ?? 'disabled',
    },
    assets: {
      ...(manifest.assets ?? {}),
      sourceGlb: source.sourcePublicUrl,
      chunksPath,
    },
    source: {
      ...(manifest.source ?? {}),
      assetUrl: source.sourcePublicUrl,
      assetHash: sourceHash,
      assetFingerprint: sourceAssetFingerprint,
    },
    physics: {
      ...(manifest.physics ?? {}),
      gridX: grid,
      gridY: grid,
      chunkSize: (bounds.max[0] - bounds.min[0]) / grid,
    },
    visualChunks: {
      ...(manifest.visualChunks ?? {}),
      material: undefined,
      runtimeMode: 'glb-chunk-terrain',
      visualSource: 'source-glb-chunks',
      generatedAt: new Date().toISOString(),
      generatedBy: 'cook-terrain-glb-chunks',
      chunkCount,
      source: 'source-glb',
      preservesSourceUvs: preserves.sourceUvs,
      preservesSourceMaterialSlots: preserves.materialSlots,
      preservesSourceNormals: preserves.normals,
      preservesSourceTangents: preserves.tangents,
      preservesSourceMeshGroups: preserves.meshGroups,
      preservesTextureReferences: preserves.textureReferences,
      sourceContract: buildVisualSourceContract({
        manifest,
        source,
        sourceHash,
        bounds,
      }),
      pbrRepair: pbrRepairReport,
      product: {
        type: 'glb-chunk-terrain',
        visualSource: 'source-glb-chunks',
        chunksPath,
        chunkCount,
        lods: [0],
        generatedAt: new Date().toISOString(),
        generatedBy: 'cook-terrain-glb-chunks',
        sourceAssetUrl: source.sourcePublicUrl,
        sourceHash,
        textureReferenceCount,
        preservesSourceUvs: preserves.sourceUvs,
        preservesSourceMaterialSlots: preserves.materialSlots,
        preservesSourceNormals: preserves.normals,
        preservesSourceTangents: preserves.tangents,
        preservesSourceMeshGroups: preserves.meshGroups,
        textureReferencesPreserved: preserves.textureReferences,
        pbrRepair: pbrRepairReport,
      },
      chunks: chunkMetadata,
      warnings: ['LOD generation not configured; emitted LOD0 only.'],
      lods: [{ level: 0, distance: lodDistance }],
    },
  }
}

const requestedLevel = getArg('level') || process.argv[2]
const grid = parsePositiveInt(getArg('grid', '4'), 4)
const dryRun = hasFlag('dry-run')
const allowModeUpgrade = hasFlag('allow-mode-upgrade')
const auditSources = hasFlag('audit-sources')
const strictSourceAudit = hasFlag('strict-source-audit')
const sourceOverride = getArg('source')
const terrainLevels = discoverTerrainLevels({ repoRoot, publicRoot })

if (auditSources) {
  const report = auditTerrainSources(terrainLevels)
  console.log(JSON.stringify(report, null, 2))
  if (strictSourceAudit && !report.success) process.exit(1)
  process.exit(0)
}

const level = resolveTerrainLevel(terrainLevels, requestedLevel)

if (!requestedLevel || !level) {
  throw new Error(
    `Expected --level to be one of: ${formatTerrainLevelList(terrainLevels)}`,
  )
}

const manifest = readJson(level.manifestPath)
const source = resolveSource({ level, manifest, sourceOverride })
const terrainContract = getTerrainContract({ level, manifest })
const hasGlbContract = isGlbChunkTerrainContract(terrainContract)
const publicChunksPath = `/terrain/levels/${level.id}/`
const chunksDir = join(publicRoot, publicChunksPath.replace(/^\//, ''))

if (!source.sourceAssetUrl) {
  throw new Error(
    `Terrain manifest for ${level.levelId} has no GLB/GLTF source asset; pass --source=/public/source.glb`,
  )
}

if (!isPublicRuntimePath(source.sourcePublicUrl)) {
  throw new Error(
    `Source asset must be a public runtime path under apps/megameal/public, got: ${source.sourceAssetUrl}`,
  )
}

if (!isGltfAssetUrl(source.sourcePublicUrl)) {
  throw new Error(
    `Source asset must reference a .glb or .gltf file, got: ${source.sourceAssetUrl}`,
  )
}

if (!source.exists) {
  const payload = {
    success: dryRun,
    dryRun,
    levelId: level.levelId,
    manifestUrl: `/terrain/${level.id}.manifest.json`,
    sourceAssetUrl: source.sourceAssetUrl,
    sourcePublicUrl: source.sourcePublicUrl,
    sourceLocalPath: source.sourceAssetPath,
    sourceExists: false,
    sourceRequired: !dryRun || hasGlbContract,
    terrainContract,
    chunksPath: publicChunksPath,
    grid,
    warnings: [
      'Source GLB/GLTF is not present in this checkout; no chunks were cooked. Place the exported source under apps/megameal/public or update the manifest/source settings to a valid public asset URL.',
    ],
  }
  if (dryRun) {
    console.log(JSON.stringify(payload))
    process.exit(0)
  }
  throw new Error(`Source asset does not exist: ${source.sourceAssetUrl}`)
}

if (!dryRun && !hasGlbContract && !allowModeUpgrade) {
  throw new Error(
    `Refusing to overwrite ${level.levelId} terrain chunks as source-glb-chunks. Declare runtimeMode="glb-chunk-terrain" / visualSource="source-glb-chunks", or pass --allow-mode-upgrade intentionally.`,
  )
}

const sourceBuffer = readFileSync(source.sourceAssetPath)
const sourceHash = createHash('sha256').update(sourceBuffer).digest('hex')
const sourceByteSize = statSync(source.sourceAssetPath).size
const sourceDoc = loadGltfDocument(source.sourceAssetPath)
const { primitives, bounds: sourceBounds } = extractSourcePrimitives(sourceDoc)
if (!primitives.length) {
  throw new Error(
    `No triangle mesh primitives found in ${source.sourceAssetUrl}`,
  )
}

const bounds =
  manifest.physics?.bounds?.min && manifest.physics?.bounds?.max
    ? manifest.physics.bounds
    : sourceBounds
const maxDimension = Math.max(
  bounds.max[0] - bounds.min[0],
  bounds.max[2] - bounds.min[2],
)
const lodDistance = Number(getArg('lod0-distance', '')) || maxDimension * 2
const chunks = partitionPrimitives({ primitives, bounds, grid })
for (const chunk of chunks) {
  chunk.materialSlotsMetadata = getMaterialSlots(
    sourceDoc.gltf,
    chunk.materialSlots,
  )
}
const cookWarnings = [
  !hasGlbContract
    ? 'Terrain is not currently declared as glb-chunk-terrain/source-glb-chunks; dry-run did not modify the manifest.'
    : '',
].filter(Boolean)

if (!dryRun) {
  rmSync(chunksDir, { recursive: true, force: true })
  mkdirSync(chunksDir, { recursive: true })
  for (const chunk of chunks) {
    const path = join(chunksDir, `chunk_${chunk.x}_${chunk.z}_LOD0.glb`)
    writeChunkGlb(path, chunk, sourceDoc, source.sourcePublicUrl)
    chunk.pbrRepair = repairGeneratedPbrGlb({ inputPath: path })
    chunk.byteSize = statSync(path).size
  }
}

const pbrRepairReport = {
  tool: 'gltfGeneratedPbrRepair',
  repairedChunkCount: chunks.filter(chunk => chunk.pbrRepair?.changed).length,
  addedNormalPrimitiveCount: chunks.reduce(
    (sum, chunk) => sum + (chunk.pbrRepair?.addedNormalPrimitiveCount ?? 0),
    0,
  ),
  skippedNormalPrimitiveCount: chunks.reduce(
    (sum, chunk) => sum + (chunk.pbrRepair?.skippedNormalPrimitiveCount ?? 0),
    0,
  ),
  repairedImplicitMetallicMaterialCount: chunks.reduce(
    (sum, chunk) =>
      sum + (chunk.pbrRepair?.repairedImplicitMetallicMaterialCount ?? 0),
    0,
  ),
}

const nextManifest = buildManifest({
  manifest,
  source,
  sourceHash,
  sourceByteSize,
  primitives,
  textureReferenceCount:
    (sourceDoc.gltf.textures?.length ?? 0) +
    (sourceDoc.gltf.images?.length ?? 0),
  grid,
  chunks,
  chunksPath: publicChunksPath,
  bounds,
  lodDistance,
  pbrRepairReport,
})

if (!dryRun) {
  writeJson(level.manifestPath, nextManifest)
}

console.log(
  JSON.stringify({
    success: true,
    dryRun,
    levelId: level.levelId,
    manifestUrl: `/terrain/${level.id}.manifest.json`,
    sourceAssetUrl: source.sourcePublicUrl,
    sourceExists: true,
    terrainContract,
    sourceHash,
    sourceByteSize,
    chunksPath: publicChunksPath,
    grid,
    lods: nextManifest.visualChunks.lods,
    chunkCount: chunks.length,
    generatedFileCount: dryRun ? 0 : chunks.length,
    totalTriangles: chunks.reduce((sum, chunk) => sum + chunk.triangleCount, 0),
    preservation: {
      sourceUvs: nextManifest.visualChunks.preservesSourceUvs,
      normals: nextManifest.visualChunks.preservesSourceNormals,
      tangents: nextManifest.visualChunks.preservesSourceTangents,
      materialSlots: nextManifest.visualChunks.preservesSourceMaterialSlots,
      meshGroups: nextManifest.visualChunks.preservesSourceMeshGroups,
      textureReferences: nextManifest.visualChunks.preservesTextureReferences,
    },
    pbrRepair: pbrRepairReport,
    warnings: nextManifest.visualChunks.warnings,
    diagnostics: cookWarnings,
  }),
)
