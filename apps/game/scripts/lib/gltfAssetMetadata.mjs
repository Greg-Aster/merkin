import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

const glbMagic = 0x46546c67
const glbJsonChunkType = 0x4e4f534a
const glbBinChunkType = 0x004e4942
const allowedMaterialExtensions = new Set([
  'KHR_materials_emissive_strength',
  'KHR_materials_ior',
])
const pbrTextureSlots = [
  'baseColor',
  'metallicRoughness',
  'normal',
  'occlusion',
  'emissive',
]

function emptyMetadata(path, error) {
  return {
    format: path?.toLowerCase().endsWith('.glb') ? 'glb' : 'gltf',
    valid: false,
    errors: [error],
    nodeCount: 0,
    meshCount: 0,
    meshPrimitiveCount: 0,
    vertexCount: 0,
    triangleCount: 0,
    bounds: null,
    materialCount: 0,
    materialSlots: 0,
    materials: [],
    materialValidation: {
      missingTextureReferences: [],
      missingRecommendedSlots: [],
      unsupportedExtensions: [],
    },
    materialAuthoring: null,
    textureCount: 0,
    imageCount: 0,
    unusedTextureCount: 0,
    unusedImageCount: 0,
    unusedTextureBytes: 0,
    textureBytes: 0,
    textures: [],
    compression: {
      extensionsUsed: [],
      geometry: {
        dracoPrimitiveCount: 0,
        meshoptAccessorCount: 0,
        quantized: false,
      },
      textures: {
        basisuTextureCount: 0,
        webpTextureCount: 0,
        mimeTypes: {},
      },
    },
  }
}

function readGlb(path) {
  const bytes = readFileSync(path)
  if (bytes.readUInt32LE(0) !== glbMagic) {
    throw new Error('Invalid GLB magic header')
  }
  const version = bytes.readUInt32LE(4)
  if (version !== 2) throw new Error(`Unsupported GLB version ${version}`)

  let offset = 12
  let json = null
  let bin = null

  while (offset + 8 <= bytes.length) {
    const chunkLength = bytes.readUInt32LE(offset)
    const chunkType = bytes.readUInt32LE(offset + 4)
    const chunkStart = offset + 8
    const chunkEnd = chunkStart + chunkLength

    if (chunkEnd > bytes.length) throw new Error('GLB chunk exceeds file size')
    if (chunkType === glbJsonChunkType) {
      json = JSON.parse(bytes.subarray(chunkStart, chunkEnd).toString('utf8'))
    } else if (chunkType === glbBinChunkType) {
      bin = bytes.subarray(chunkStart, chunkEnd)
    }

    offset = chunkEnd
  }

  if (!json) throw new Error('GLB has no JSON chunk')
  return { json, bin, rootDir: dirname(path) }
}

function readGltf(path) {
  const json = JSON.parse(readFileSync(path, 'utf8'))
  return { json, bin: null, rootDir: dirname(path) }
}

function getBufferViewBytes(json, bin, bufferViewIndex) {
  const bufferView = json.bufferViews?.[bufferViewIndex]
  if (!bufferView || !bin) return null

  const byteOffset = bufferView.byteOffset ?? 0
  const byteLength = bufferView.byteLength ?? 0
  return bin.subarray(byteOffset, byteOffset + byteLength)
}

function readImageBytes({ json, bin, rootDir, image }) {
  if (Number.isInteger(image.bufferView)) {
    return getBufferViewBytes(json, bin, image.bufferView)
  }
  if (typeof image.uri !== 'string' || image.uri.startsWith('data:')) return null

  const imagePath = join(rootDir, image.uri)
  return existsSync(imagePath) ? readFileSync(imagePath) : null
}

function getPngDimensions(bytes) {
  if (
    bytes.length < 24 ||
    bytes[0] !== 0x89 ||
    bytes[1] !== 0x50 ||
    bytes[2] !== 0x4e ||
    bytes[3] !== 0x47
  ) {
    return null
  }

  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
  }
}

function getJpegDimensions(bytes) {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null

  let offset = 2
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1
      continue
    }

    const marker = bytes[offset + 1]
    const length = bytes.readUInt16BE(offset + 2)
    if (length < 2) return null

    if (
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf)
    ) {
      return {
        height: bytes.readUInt16BE(offset + 5),
        width: bytes.readUInt16BE(offset + 7),
      }
    }

    offset += 2 + length
  }

  return null
}

function getWebpDimensions(bytes) {
  if (
    bytes.length < 30 ||
    bytes.toString('ascii', 0, 4) !== 'RIFF' ||
    bytes.toString('ascii', 8, 12) !== 'WEBP'
  ) {
    return null
  }

  const chunkType = bytes.toString('ascii', 12, 16)
  if (chunkType === 'VP8X') {
    return {
      width: 1 + bytes.readUIntLE(24, 3),
      height: 1 + bytes.readUIntLE(27, 3),
    }
  }
  if (chunkType === 'VP8 ' && bytes.length >= 30) {
    return {
      width: bytes.readUInt16LE(26) & 0x3fff,
      height: bytes.readUInt16LE(28) & 0x3fff,
    }
  }
  if (chunkType === 'VP8L' && bytes.length >= 25) {
    const bits = bytes.readUInt32LE(21)
    return {
      width: (bits & 0x3fff) + 1,
      height: ((bits >> 14) & 0x3fff) + 1,
    }
  }

  return null
}

function getImageDimensions(bytes) {
  if (!bytes) return null
  return getPngDimensions(bytes) ?? getJpegDimensions(bytes) ?? getWebpDimensions(bytes)
}

function inferMimeType(image, bytes) {
  if (typeof image.mimeType === 'string') return image.mimeType
  if (!bytes) return 'unknown'
  if (getPngDimensions(bytes)) return 'image/png'
  if (getJpegDimensions(bytes)) return 'image/jpeg'
  if (getWebpDimensions(bytes)) return 'image/webp'
  return 'unknown'
}

function getTextureRoleColorSpace(role) {
  return role === 'baseColor' || role === 'emissive' ? 'srgb' : 'linear'
}

function addTextureRole(textureRoles, textureInfo, role) {
  const textureIndex = textureInfo?.index
  if (!Number.isInteger(textureIndex)) return

  const roles = textureRoles.get(textureIndex) ?? new Set()
  roles.add(role)
  textureRoles.set(textureIndex, roles)
}

function collectTextureRoles(materials = []) {
  const textureRoles = new Map()

  for (const material of materials) {
    addTextureRole(
      textureRoles,
      material.pbrMetallicRoughness?.baseColorTexture,
      'baseColor',
    )
    addTextureRole(
      textureRoles,
      material.pbrMetallicRoughness?.metallicRoughnessTexture,
      'metallicRoughness',
    )
    addTextureRole(textureRoles, material.normalTexture, 'normal')
    addTextureRole(textureRoles, material.occlusionTexture, 'occlusion')
    addTextureRole(textureRoles, material.emissiveTexture, 'emissive')
  }

  return textureRoles
}

function collectUsedImageIndices(json, textures = []) {
  const usedImageIndices = new Set()

  for (const texture of textures) {
    const imageIndex = getTextureSourceIndex(texture)
    if (Number.isInteger(imageIndex)) usedImageIndices.add(imageIndex)
  }

  return usedImageIndices
}

function getTextureIndex(textureInfo) {
  return Number.isInteger(textureInfo?.index) ? textureInfo.index : null
}

function getTextureSourceIndex(texture) {
  if (Number.isInteger(texture?.source)) return texture.source
  const webpSource = texture?.extensions?.EXT_texture_webp?.source
  if (Number.isInteger(webpSource)) return webpSource
  const basisuSource = texture?.extensions?.KHR_texture_basisu?.source
  return Number.isInteger(basisuSource) ? basisuSource : null
}

function getPbrSlot(textureIndex, fallbackFactors = []) {
  return {
    textureIndex,
    hasTexture: Number.isInteger(textureIndex),
    hasFactor: fallbackFactors.some(value => value !== undefined),
    state: Number.isInteger(textureIndex)
      ? 'texture'
      : fallbackFactors.some(value => value !== undefined)
        ? 'factor'
        : 'default',
  }
}

function getMaterialExtensions(material) {
  return Object.keys(material.extensions ?? {}).sort()
}

function collectMaterials(json) {
  return (json.materials ?? []).map((material, index) => {
    const pbr = material.pbrMetallicRoughness ?? {}
    const extensions = getMaterialExtensions(material)

    return {
      index,
      name: material.name,
      alphaMode: material.alphaMode ?? 'OPAQUE',
      doubleSided: material.doubleSided === true,
      pbrSlots: {
        baseColor: getPbrSlot(getTextureIndex(pbr.baseColorTexture), [
          pbr.baseColorFactor,
        ]),
        metallicRoughness: getPbrSlot(
          getTextureIndex(pbr.metallicRoughnessTexture),
          [pbr.metallicFactor, pbr.roughnessFactor],
        ),
        normal: getPbrSlot(getTextureIndex(material.normalTexture)),
        occlusion: getPbrSlot(getTextureIndex(material.occlusionTexture)),
        emissive: getPbrSlot(getTextureIndex(material.emissiveTexture), [
          material.emissiveFactor,
        ]),
      },
      extensions,
      unsupportedExtensions: extensions.filter(
        extension => !allowedMaterialExtensions.has(extension),
      ),
    }
  })
}

function validateMaterials(json, materials) {
  const textureCount = json.textures?.length ?? 0
  const missingTextureReferences = []
  const missingRecommendedSlots = []
  const unsupportedExtensions = []

  for (const material of materials) {
    for (const [slot, pbrSlot] of Object.entries(material.pbrSlots)) {
      if (
        Number.isInteger(pbrSlot.textureIndex) &&
        (pbrSlot.textureIndex < 0 || pbrSlot.textureIndex >= textureCount)
      ) {
        missingTextureReferences.push({
          materialIndex: material.index,
          materialName: material.name,
          slot,
          textureIndex: pbrSlot.textureIndex,
        })
      }
      if (
        ['baseColor', 'metallicRoughness', 'normal'].includes(slot) &&
        !pbrSlot.hasTexture
      ) {
        missingRecommendedSlots.push({
          materialIndex: material.index,
          materialName: material.name,
          slot,
          fallback: pbrSlot.state,
        })
      }
    }

    for (const extension of material.unsupportedExtensions) {
      unsupportedExtensions.push({
        materialIndex: material.index,
        materialName: material.name,
        extension,
      })
    }
  }

  return {
    missingTextureReferences,
    missingRecommendedSlots,
    unsupportedExtensions,
  }
}

function getColorSpace(roles) {
  if (roles.length === 0) return 'unknown'
  const colorSpaces = [...new Set(roles.map(getTextureRoleColorSpace))]
  return colorSpaces.length === 1 ? colorSpaces[0] : 'mixed'
}

function countMimeTypes(textures) {
  return textures.reduce((counts, texture) => {
    counts[texture.mimeType] = (counts[texture.mimeType] ?? 0) + 1
    return counts
  }, {})
}

function countCompressedTextureExtensions(json) {
  return (json.textures ?? []).reduce(
    (counts, texture) => {
      if (texture.extensions?.KHR_texture_basisu) counts.basisuTextureCount += 1
      if (texture.extensions?.EXT_texture_webp) counts.webpTextureCount += 1
      return counts
    },
    { basisuTextureCount: 0, webpTextureCount: 0 },
  )
}

function getAccessorCount(json, accessorIndex) {
  const accessor = json.accessors?.[accessorIndex]
  return Number.isInteger(accessor?.count) ? accessor.count : 0
}

function getPrimitiveVertexCount(json, primitive) {
  return getAccessorCount(json, primitive.attributes?.POSITION)
}

function getPrimitiveBounds(json, primitive) {
  const accessor = json.accessors?.[primitive.attributes?.POSITION]
  if (!Array.isArray(accessor?.min) || !Array.isArray(accessor?.max)) {
    return null
  }

  return {
    min: accessor.min.slice(0, 3),
    max: accessor.max.slice(0, 3),
  }
}

function mergeBounds(left, right) {
  if (!left) return right
  if (!right) return left

  return {
    min: left.min.map((value, index) => Math.min(value, right.min[index])),
    max: left.max.map((value, index) => Math.max(value, right.max[index])),
  }
}

function finalizeBounds(bounds) {
  if (!bounds) return null
  const size = bounds.max.map((value, index) => value - bounds.min[index])
  const center = bounds.max.map(
    (value, index) => bounds.min[index] + size[index] / 2,
  )

  return {
    min: bounds.min,
    max: bounds.max,
    size,
    center,
  }
}

function getPrimitiveTriangleCount(json, primitive) {
  const vertexCount = Number.isInteger(primitive.indices)
    ? getAccessorCount(json, primitive.indices)
    : getPrimitiveVertexCount(json, primitive)
  const mode = primitive.mode ?? 4

  if (mode === 4) return Math.floor(vertexCount / 3)
  if (mode === 5 || mode === 6) return Math.max(0, vertexCount - 2)
  return 0
}

function getGeometryCounts(json) {
  return (json.meshes ?? []).reduce(
    (sum, mesh) => {
      for (const primitive of mesh.primitives ?? []) {
        sum.vertexCount += getPrimitiveVertexCount(json, primitive)
        sum.triangleCount += getPrimitiveTriangleCount(json, primitive)
        sum.bounds = mergeBounds(sum.bounds, getPrimitiveBounds(json, primitive))
      }
      return sum
    },
    { vertexCount: 0, triangleCount: 0, bounds: null },
  )
}

export function readGltfAssetMetadata(path) {
  if (!existsSync(path)) {
    return emptyMetadata(path, 'File does not exist')
  }

  try {
    const source = path.toLowerCase().endsWith('.glb')
      ? readGlb(path)
      : readGltf(path)
    const { json, bin, rootDir } = source
    const textureRoles = collectTextureRoles(json.materials)
    const usedImageIndices = collectUsedImageIndices(json, json.textures ?? [])
    const textures = (json.textures ?? []).map((texture, index) => {
      const imageIndex = getTextureSourceIndex(texture)
      const image = Number.isInteger(imageIndex) ? json.images?.[imageIndex] ?? {} : {}
      const imageBytes = readImageBytes({ json, bin, rootDir, image })
      const dimensions = getImageDimensions(imageBytes)
      const roles = [...(textureRoles.get(index) ?? [])].sort()
      const mimeType = inferMimeType(image, imageBytes)

      return {
        index,
        name: texture.name ?? image.name,
        imageIndex,
        mimeType,
        width: dimensions?.width ?? null,
        height: dimensions?.height ?? null,
        byteLength: imageBytes?.byteLength ?? null,
        roles,
        colorSpace: getColorSpace(roles),
        compression:
          texture.extensions?.KHR_texture_basisu
            ? 'basisu'
            : texture.extensions?.EXT_texture_webp || mimeType === 'image/webp'
              ? 'webp'
              : 'none',
      }
    })
    const unusedTextureCount = textures.filter(
      texture => texture.roles.length === 0,
    ).length
    const unusedTextureBytes = textures.reduce(
      (sum, texture) =>
        texture.roles.length === 0 ? sum + (texture.byteLength ?? 0) : sum,
      0,
    )
    const unusedImageCount = (json.images ?? []).filter(
      (_image, index) => !usedImageIndices.has(index),
    ).length
    const meshPrimitiveCount = (json.meshes ?? []).reduce(
      (sum, mesh) => sum + (mesh.primitives?.length ?? 0),
      0,
    )
    const geometryCounts = getGeometryCounts(json)
    const materials = collectMaterials(json)
    const materialValidation = validateMaterials(json, materials)
    const materialSlots = (json.meshes ?? []).reduce(
      (sum, mesh) =>
        sum +
        (mesh.primitives ?? []).filter(primitive =>
          Number.isInteger(primitive.material),
        ).length,
      0,
    )
    const dracoPrimitiveCount = (json.meshes ?? []).reduce(
      (sum, mesh) =>
        sum +
        (mesh.primitives ?? []).filter(
          primitive => primitive.extensions?.KHR_draco_mesh_compression,
        ).length,
      0,
    )
    const meshoptAccessorCount = (json.accessors ?? []).filter(
      accessor => accessor.extensions?.EXT_meshopt_compression,
    ).length
    const compressedTextureExtensions = countCompressedTextureExtensions(json)

    return {
      format: path.toLowerCase().endsWith('.glb') ? 'glb' : 'gltf',
      valid: true,
      errors: [],
      nodeCount: json.nodes?.length ?? 0,
      meshCount: json.meshes?.length ?? 0,
      meshPrimitiveCount,
      vertexCount: geometryCounts.vertexCount,
      triangleCount: geometryCounts.triangleCount,
      bounds: finalizeBounds(geometryCounts.bounds),
      materialCount: json.materials?.length ?? 0,
      materialSlots,
      materials,
      materialValidation,
      materialAuthoring: json.extras?.materialAuthoring ?? null,
      textureCount: json.textures?.length ?? 0,
      imageCount: json.images?.length ?? 0,
      unusedTextureCount,
      unusedImageCount,
      unusedTextureBytes,
      textureBytes: textures.reduce(
        (sum, texture) => sum + (texture.byteLength ?? 0),
        0,
      ),
      textures,
      compression: {
        extensionsUsed: [...new Set(json.extensionsUsed ?? [])].sort(),
        geometry: {
          dracoPrimitiveCount,
          meshoptAccessorCount,
          quantized: (json.extensionsUsed ?? []).includes(
            'KHR_mesh_quantization',
          ),
        },
        textures: {
          ...compressedTextureExtensions,
          mimeTypes: countMimeTypes(textures),
        },
      },
    }
  } catch (error) {
    return emptyMetadata(
      path,
      error instanceof Error ? error.message : 'Unknown glTF metadata error',
    )
  }
}
