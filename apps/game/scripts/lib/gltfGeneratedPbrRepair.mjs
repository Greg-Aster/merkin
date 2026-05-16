import { readFileSync, writeFileSync } from 'node:fs'

const glbMagic = 0x46546c67
const glbJsonChunkType = 0x4e4f534a
const glbBinChunkType = 0x004e4942
const glbVersion = 2
const accessorComponentSizes = new Map([
  [5120, 1],
  [5121, 1],
  [5122, 2],
  [5123, 2],
  [5125, 4],
  [5126, 4],
])
const accessorTypeComponentCounts = new Map([
  ['SCALAR', 1],
  ['VEC2', 2],
  ['VEC3', 3],
  ['VEC4', 4],
])

function align4(value) {
  return Math.ceil(value / 4) * 4
}

function readGlb(path) {
  const bytes = readFileSync(path)
  if (bytes.readUInt32LE(0) !== glbMagic) {
    throw new Error(`Expected a GLB asset: ${path}`)
  }
  const version = bytes.readUInt32LE(4)
  if (version !== glbVersion) {
    throw new Error(`Unsupported GLB version ${version}: ${path}`)
  }

  let json = null
  let bin = null
  let offset = 12

  while (offset + 8 <= bytes.length) {
    const chunkLength = bytes.readUInt32LE(offset)
    const chunkType = bytes.readUInt32LE(offset + 4)
    const chunkStart = offset + 8
    const chunkEnd = chunkStart + chunkLength
    if (chunkEnd > bytes.length) {
      throw new Error(`Invalid GLB chunk length in ${path}`)
    }
    if (chunkType === glbJsonChunkType) {
      json = JSON.parse(bytes.subarray(chunkStart, chunkEnd).toString('utf8'))
    } else if (chunkType === glbBinChunkType) {
      bin = bytes.subarray(chunkStart, chunkEnd)
    }
    offset = chunkEnd
  }

  if (!json) throw new Error(`GLB has no JSON chunk: ${path}`)
  return { json, bin: Buffer.from(bin ?? []) }
}

function writeGlb(path, json, bin) {
  const jsonBytes = Buffer.from(JSON.stringify(json), 'utf8')
  const paddedJsonLength = align4(jsonBytes.length)
  const jsonChunk = Buffer.alloc(paddedJsonLength, 0x20)
  jsonBytes.copy(jsonChunk)

  const paddedBinLength = align4(bin.length)
  const binChunk = Buffer.alloc(paddedBinLength)
  bin.copy(binChunk)

  const byteLength = 12 + 8 + jsonChunk.length + 8 + binChunk.length
  const output = Buffer.alloc(byteLength)
  output.writeUInt32LE(glbMagic, 0)
  output.writeUInt32LE(glbVersion, 4)
  output.writeUInt32LE(byteLength, 8)
  output.writeUInt32LE(jsonChunk.length, 12)
  output.writeUInt32LE(glbJsonChunkType, 16)
  jsonChunk.copy(output, 20)
  const binHeaderOffset = 20 + jsonChunk.length
  output.writeUInt32LE(binChunk.length, binHeaderOffset)
  output.writeUInt32LE(glbBinChunkType, binHeaderOffset + 4)
  binChunk.copy(output, binHeaderOffset + 8)
  writeFileSync(path, output)
}

function getAccessorElementByteStride(json, accessor) {
  const bufferView = json.bufferViews?.[accessor.bufferView]
  const componentSize = accessorComponentSizes.get(accessor.componentType)
  const componentCount = accessorTypeComponentCounts.get(accessor.type)
  if (!bufferView || !componentSize || !componentCount) return null
  return bufferView.byteStride ?? componentSize * componentCount
}

function getAccessorByteOffset(json, accessor, index, componentIndex = 0) {
  const bufferView = json.bufferViews?.[accessor.bufferView]
  const componentSize = accessorComponentSizes.get(accessor.componentType)
  const stride = getAccessorElementByteStride(json, accessor)
  if (!bufferView || !componentSize || !stride) return null
  return (
    (bufferView.byteOffset ?? 0) +
    (accessor.byteOffset ?? 0) +
    index * stride +
    componentIndex * componentSize
  )
}

function readComponent(view, byteOffset, componentType, normalized = false) {
  switch (componentType) {
    case 5120: {
      const value = view.getInt8(byteOffset)
      return normalized ? Math.max(value / 127, -1) : value
    }
    case 5121: {
      const value = view.getUint8(byteOffset)
      return normalized ? value / 255 : value
    }
    case 5122: {
      const value = view.getInt16(byteOffset, true)
      return normalized ? Math.max(value / 32767, -1) : value
    }
    case 5123: {
      const value = view.getUint16(byteOffset, true)
      return normalized ? value / 65535 : value
    }
    case 5125: {
      const value = view.getUint32(byteOffset, true)
      return normalized ? value / 4294967295 : value
    }
    case 5126:
      return view.getFloat32(byteOffset, true)
    default:
      return 0
  }
}

function readScalarAccessor(json, bin, accessorIndex) {
  const accessor = json.accessors?.[accessorIndex]
  if (!accessor || accessor.type !== 'SCALAR' || accessor.sparse) return null
  const output = new Uint32Array(accessor.count ?? 0)
  const view = new DataView(bin.buffer, bin.byteOffset, bin.byteLength)

  for (let index = 0; index < output.length; index += 1) {
    const byteOffset = getAccessorByteOffset(json, accessor, index)
    if (byteOffset === null) return null
    output[index] = readComponent(
      view,
      byteOffset,
      accessor.componentType,
      false,
    )
  }

  return output
}

function readVec3Accessor(json, bin, accessorIndex) {
  const accessor = json.accessors?.[accessorIndex]
  if (!accessor || accessor.type !== 'VEC3' || accessor.sparse) return null
  const output = new Float32Array((accessor.count ?? 0) * 3)
  const view = new DataView(bin.buffer, bin.byteOffset, bin.byteLength)

  for (let index = 0; index < accessor.count; index += 1) {
    for (let component = 0; component < 3; component += 1) {
      const byteOffset = getAccessorByteOffset(json, accessor, index, component)
      if (byteOffset === null) return null
      output[index * 3 + component] = readComponent(
        view,
        byteOffset,
        accessor.componentType,
        accessor.normalized === true,
      )
    }
  }

  return output
}

function getPrimitiveIndices(json, bin, primitive, vertexCount) {
  if (!Number.isInteger(primitive.indices)) {
    return Uint32Array.from({ length: vertexCount }, (_value, index) => index)
  }
  return readScalarAccessor(json, bin, primitive.indices)
}

function addTriangleNormal(normals, positions, a, b, c) {
  const ax = positions[a * 3]
  const ay = positions[a * 3 + 1]
  const az = positions[a * 3 + 2]
  const abx = positions[b * 3] - ax
  const aby = positions[b * 3 + 1] - ay
  const abz = positions[b * 3 + 2] - az
  const acx = positions[c * 3] - ax
  const acy = positions[c * 3 + 1] - ay
  const acz = positions[c * 3 + 2] - az
  const nx = aby * acz - abz * acy
  const ny = abz * acx - abx * acz
  const nz = abx * acy - aby * acx

  normals[a * 3] += nx
  normals[a * 3 + 1] += ny
  normals[a * 3 + 2] += nz
  normals[b * 3] += nx
  normals[b * 3 + 1] += ny
  normals[b * 3 + 2] += nz
  normals[c * 3] += nx
  normals[c * 3 + 1] += ny
  normals[c * 3 + 2] += nz
}

function computeVertexNormals(positions, indices) {
  const normals = new Float32Array(positions.length)

  for (let index = 0; index + 2 < indices.length; index += 3) {
    addTriangleNormal(
      normals,
      positions,
      indices[index],
      indices[index + 1],
      indices[index + 2],
    )
  }

  for (let index = 0; index < normals.length; index += 3) {
    const x = normals[index]
    const y = normals[index + 1]
    const z = normals[index + 2]
    const length = Math.hypot(x, y, z)
    if (length > 0) {
      normals[index] = x / length
      normals[index + 1] = y / length
      normals[index + 2] = z / length
    } else {
      normals[index] = 0
      normals[index + 1] = 1
      normals[index + 2] = 0
    }
  }

  return normals
}

function appendAccessorBuffer(json, bin, typedArray, target) {
  const data = Buffer.from(
    typedArray.buffer,
    typedArray.byteOffset,
    typedArray.byteLength,
  )
  const byteOffset = align4(bin.length)
  const padding = Buffer.alloc(byteOffset - bin.length)
  const nextBin = Buffer.concat([bin, padding, data])
  json.buffers ??= [{ byteLength: 0 }]
  json.buffers[0].byteLength = nextBin.length
  json.bufferViews ??= []
  json.accessors ??= []
  const bufferViewIndex = json.bufferViews.length
  json.bufferViews.push({
    buffer: 0,
    byteOffset,
    byteLength: data.length,
    target,
  })
  const accessorIndex = json.accessors.length
  json.accessors.push({
    bufferView: bufferViewIndex,
    byteOffset: 0,
    componentType: 5126,
    count: typedArray.length / 3,
    type: 'VEC3',
  })
  return { bin: nextBin, accessorIndex }
}

function repairMissingNormals(json, bin) {
  let nextBin = bin
  let addedNormalPrimitiveCount = 0
  let skippedNormalPrimitiveCount = 0

  for (const mesh of json.meshes ?? []) {
    for (const primitive of mesh.primitives ?? []) {
      if (Number.isInteger(primitive.attributes?.NORMAL)) continue
      if (!Number.isInteger(primitive.attributes?.POSITION)) {
        skippedNormalPrimitiveCount += 1
        continue
      }
      if ((primitive.mode ?? 4) !== 4) {
        skippedNormalPrimitiveCount += 1
        continue
      }

      const positions = readVec3Accessor(
        json,
        nextBin,
        primitive.attributes.POSITION,
      )
      if (!positions) {
        skippedNormalPrimitiveCount += 1
        continue
      }
      const indices = getPrimitiveIndices(
        json,
        nextBin,
        primitive,
        positions.length / 3,
      )
      if (!indices) {
        skippedNormalPrimitiveCount += 1
        continue
      }

      const normals = computeVertexNormals(positions, indices)
      const appended = appendAccessorBuffer(json, nextBin, normals, 34962)
      nextBin = appended.bin
      primitive.attributes.NORMAL = appended.accessorIndex
      addedNormalPrimitiveCount += 1
    }
  }

  return {
    bin: nextBin,
    addedNormalPrimitiveCount,
    skippedNormalPrimitiveCount,
  }
}

function repairImplicitMetalness(json, { metallicFactor, roughnessFactor }) {
  let repairedImplicitMetallicMaterialCount = 0

  for (const material of json.materials ?? []) {
    const pbr = (material.pbrMetallicRoughness ??= {})
    if (
      pbr.metallicFactor === undefined &&
      pbr.metallicRoughnessTexture === undefined
    ) {
      pbr.metallicFactor = metallicFactor
      pbr.roughnessFactor ??= roughnessFactor
      repairedImplicitMetallicMaterialCount += 1
    }
  }

  return { repairedImplicitMetallicMaterialCount }
}

export function repairGeneratedPbrGlb({
  inputPath,
  outputPath = inputPath,
  metallicFactor = 0,
  roughnessFactor = 0.9,
} = {}) {
  if (!inputPath) throw new Error('inputPath is required')
  const { json, bin } = readGlb(inputPath)
  const declaredByteLength = json.buffers?.[0]?.byteLength
  const sourceBin =
    Number.isInteger(declaredByteLength) && declaredByteLength <= bin.length
      ? bin.subarray(0, declaredByteLength)
      : bin
  const normalRepair = repairMissingNormals(json, sourceBin)
  const materialRepair = repairImplicitMetalness(json, {
    metallicFactor,
    roughnessFactor,
  })
  const changed =
    normalRepair.addedNormalPrimitiveCount > 0 ||
    materialRepair.repairedImplicitMetallicMaterialCount > 0

  if (changed) {
    writeGlb(outputPath, json, normalRepair.bin)
  } else if (outputPath !== inputPath) {
    writeGlb(outputPath, json, normalRepair.bin)
  }

  return {
    changed,
    addedNormalPrimitiveCount: normalRepair.addedNormalPrimitiveCount,
    skippedNormalPrimitiveCount: normalRepair.skippedNormalPrimitiveCount,
    repairedImplicitMetallicMaterialCount:
      materialRepair.repairedImplicitMetallicMaterialCount,
  }
}
