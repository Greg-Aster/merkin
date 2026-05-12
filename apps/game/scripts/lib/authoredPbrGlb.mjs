import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { deflateSync } from 'node:zlib'

const glbMagic = 0x46546c67
const jsonChunkType = 0x4e4f534a
const binChunkType = 0x004e4942

export function clamp01(value) {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0))
}

export function channel(value) {
  return Math.round(clamp01(value) * 255)
}

export function align4(buffer, fill = 0) {
  const padding = (4 - (buffer.byteLength % 4)) % 4
  return padding ? Buffer.concat([buffer, Buffer.alloc(padding, fill)]) : buffer
}

function alignJson(buffer) {
  return align4(buffer, 0x20)
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

export function writePng({ width, height, channels, pixels }) {
  const colorType = channels === 4 ? 6 : 2
  const rowLength = 1 + width * channels
  const raw = Buffer.alloc(rowLength * height)

  for (let y = 0; y < height; y += 1) {
    const rawOffset = y * rowLength
    raw[rawOffset] = 0
    pixels.copy(
      raw,
      rawOffset + 1,
      y * width * channels,
      (y + 1) * width * channels,
    )
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = colorType
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  return Buffer.concat([
    Buffer.from('89504e470d0a1a0a', 'hex'),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}

export function seededNoise(x, y, seed) {
  let n = (x * 374761393 + y * 668265263 + seed * 982451653) >>> 0
  n = (n ^ (n >>> 13)) >>> 0
  n = Math.imul(n, 1274126177) >>> 0
  return ((n ^ (n >>> 16)) >>> 0) / 0xffffffff
}

export function readGlb(path) {
  const bytes = readFileSync(path)
  if (bytes.readUInt32LE(0) !== glbMagic) {
    throw new Error(`Invalid GLB magic header: ${path}`)
  }
  if (bytes.readUInt32LE(4) !== 2) {
    throw new Error(`Unsupported GLB version: ${bytes.readUInt32LE(4)}`)
  }

  let offset = 12
  let json = null
  let bin = Buffer.alloc(0)

  while (offset + 8 <= bytes.length) {
    const chunkLength = bytes.readUInt32LE(offset)
    const chunkType = bytes.readUInt32LE(offset + 4)
    const chunkStart = offset + 8
    const chunkEnd = chunkStart + chunkLength
    if (chunkEnd > bytes.length) throw new Error('GLB chunk exceeds file size')
    if (chunkType === jsonChunkType) {
      json = JSON.parse(bytes.subarray(chunkStart, chunkEnd).toString('utf8'))
    } else if (chunkType === binChunkType) {
      bin = Buffer.from(bytes.subarray(chunkStart, chunkEnd))
    }
    offset = chunkEnd
  }

  if (!json) throw new Error(`GLB has no JSON chunk: ${path}`)
  return { json, bin }
}

export function writeGlb(path, json, bin) {
  mkdirSync(dirname(path), { recursive: true })
  const jsonBuffer = alignJson(Buffer.from(JSON.stringify(json), 'utf8'))
  const binBuffer = align4(bin)
  const totalLength = 12 + 8 + jsonBuffer.byteLength + 8 + binBuffer.byteLength
  const header = Buffer.alloc(12)
  header.writeUInt32LE(glbMagic, 0)
  header.writeUInt32LE(2, 4)
  header.writeUInt32LE(totalLength, 8)

  const jsonHeader = Buffer.alloc(8)
  jsonHeader.writeUInt32LE(jsonBuffer.byteLength, 0)
  jsonHeader.writeUInt32LE(jsonChunkType, 4)

  const binHeader = Buffer.alloc(8)
  binHeader.writeUInt32LE(binBuffer.byteLength, 0)
  binHeader.writeUInt32LE(binChunkType, 4)

  writeFileSync(
    path,
    Buffer.concat([header, jsonHeader, jsonBuffer, binHeader, binBuffer]),
  )
}

function addTexture({ json, binChunks, name, mimeType, imageBytes }) {
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
    mimeType,
  })

  const textureIndex = json.textures.length
  json.textures.push({
    name,
    source: imageIndex,
  })

  return textureIndex
}

function hasAuthoredRecommendedSlots(material) {
  const pbr = material.pbrMetallicRoughness ?? {}
  return (
    Number.isInteger(pbr.baseColorTexture?.index) &&
    Number.isInteger(pbr.metallicRoughnessTexture?.index) &&
    Number.isInteger(material.normalTexture?.index)
  )
}

function updateSidecar(path, metadata) {
  const sidecar = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : {}
  const nextSidecar = {
    ...sidecar,
    materialAuthoring: metadata,
  }
  const current = `${JSON.stringify(sidecar, null, 2)}\n`
  const next = `${JSON.stringify(nextSidecar, null, 2)}\n`
  if (current === next) return false

  writeFileSync(path, next)
  return true
}

export function authorSourceGlbPbrMaps({
  publicRoot,
  assetUrl,
  workflow,
  authoredAt,
  textureSize,
  slotsAuthored = [
    'baseColorTexture',
    'metallicRoughnessTexture',
    'normalTexture',
  ],
  materialPrefix,
  description,
  sidecarProvenance,
  createTextureSet,
}) {
  const sourcePath = join(publicRoot, assetUrl)
  const sidecarPath = sourcePath.replace(/\.glb$/i, '.json')
  const { json, bin } = readGlb(sourcePath)

  json.bufferViews ??= []
  json.images ??= []
  json.textures ??= []
  json.buffers ??= [{ byteLength: bin.byteLength }]

  const materials = json.materials ?? []
  const alreadyAuthored =
    materials.length > 0 && materials.every(hasAuthoredRecommendedSlots)

  const sidecarMetadata = {
    workflow,
    authoredAt,
    textureSize,
    slotsAuthored,
    provenance: sidecarProvenance,
  }

  if (
    alreadyAuthored &&
    json.extras?.materialAuthoring?.workflow === workflow &&
    json.extras.materialAuthoring.assetUrl === assetUrl &&
    json.extras.materialAuthoring.textureSize === textureSize
  ) {
    const sidecarChanged = updateSidecar(sidecarPath, sidecarMetadata)
    return { changed: sidecarChanged, assetUrl }
  }

  if (alreadyAuthored) {
    json.extras = {
      ...(json.extras ?? {}),
      materialAuthoring: {
        ...(json.extras?.materialAuthoring ?? {}),
        workflow,
        assetUrl,
        textureSize,
      },
    }
    const sidecarChanged = updateSidecar(sidecarPath, sidecarMetadata)
    writeGlb(sourcePath, json, bin)
    return { changed: true, assetUrl }
  }

  const binChunks = [align4(bin)]
  const authored = []

  for (const [materialIndex, material] of materials.entries()) {
    const pbr = (material.pbrMetallicRoughness ??= {})
    const seed = materialIndex + 17
    const label = `${materialPrefix}-m${String(materialIndex).padStart(2, '0')}`
    const textures = createTextureSet({
      label,
      material,
      materialIndex,
      pbr,
      seed,
      textureSize,
    })

    pbr.baseColorTexture = {
      index: addTexture({
        json,
        binChunks,
        name: textures.baseColor.name,
        mimeType: 'image/png',
        imageBytes: textures.baseColor.imageBytes,
      }),
    }
    pbr.metallicRoughnessTexture = {
      index: addTexture({
        json,
        binChunks,
        name: textures.metallicRoughness.name,
        mimeType: 'image/png',
        imageBytes: textures.metallicRoughness.imageBytes,
      }),
    }
    material.normalTexture = {
      index: addTexture({
        json,
        binChunks,
        name: textures.normal.name,
        mimeType: 'image/png',
        imageBytes: textures.normal.imageBytes,
      }),
      scale: textures.normal.scale,
    }
    if (textures.emissive) {
      material.emissiveTexture = {
        index: addTexture({
          json,
          binChunks,
          name: textures.emissive.name,
          mimeType: 'image/png',
          imageBytes: textures.emissive.imageBytes,
        }),
      }
      material.emissiveFactor = textures.emissive.factor
    }

    pbr.baseColorFactor = textures.baseColor.factor
    pbr.metallicFactor = textures.metallicRoughness.metallicFactor
    pbr.roughnessFactor = textures.metallicRoughness.roughnessFactor
    material.name ??= `${materialPrefix}-material-${materialIndex}`
    const authoredMaterial = {
      materialIndex,
      baseColorTexture: pbr.baseColorTexture.index,
      metallicRoughnessTexture: pbr.metallicRoughnessTexture.index,
      normalTexture: material.normalTexture.index,
    }
    if (textures.emissive) {
      authoredMaterial.emissiveTexture = material.emissiveTexture.index
    }
    authored.push(authoredMaterial)
  }

  const nextBin = Buffer.concat(binChunks)
  json.buffers[0].byteLength = nextBin.byteLength
  json.asset = {
    ...(json.asset ?? {}),
    generator: 'Merkin authored PBR material pass over THREE.GLTFExporter r178',
  }
  json.extras = {
    ...(json.extras ?? {}),
    materialAuthoring: {
      workflow,
      authoredAt,
      assetUrl,
      textureSize,
      description,
      materials: authored,
    },
  }

  writeGlb(sourcePath, json, nextBin)
  updateSidecar(sidecarPath, sidecarMetadata)
  return { changed: true, assetUrl }
}
