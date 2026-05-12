import { readFileSync, writeFileSync } from 'node:fs'

const glbMagic = 0x46546c67
const glbJsonChunkType = 0x4e4f534a
const glbBinChunkType = 0x004e4942
const componentByteSizes = new Map([
  [5120, 1],
  [5121, 1],
  [5122, 2],
  [5123, 2],
  [5125, 4],
  [5126, 4],
])
const typeComponentCounts = new Map([
  ['SCALAR', 1],
  ['VEC2', 2],
  ['VEC3', 3],
  ['VEC4', 4],
  ['MAT2', 4],
  ['MAT3', 9],
  ['MAT4', 16],
])

function align4(value) {
  return (value + 3) & ~3
}

function readGlb(path) {
  const bytes = readFileSync(path)
  if (bytes.readUInt32LE(0) !== glbMagic) {
    throw new Error(`Invalid GLB magic header: ${path}`)
  }

  let offset = 12
  let json = null
  let bin = null
  while (offset + 8 <= bytes.length) {
    const chunkLength = bytes.readUInt32LE(offset)
    const chunkType = bytes.readUInt32LE(offset + 4)
    const chunkStart = offset + 8
    const chunkEnd = chunkStart + chunkLength
    if (chunkEnd > bytes.length)
      throw new Error(`GLB chunk exceeds file size: ${path}`)

    if (chunkType === glbJsonChunkType) {
      json = JSON.parse(bytes.subarray(chunkStart, chunkEnd).toString('utf8'))
    } else if (chunkType === glbBinChunkType) {
      bin = bytes.subarray(chunkStart, chunkEnd)
    }
    offset = chunkEnd
  }

  if (!json || !bin)
    throw new Error(`GLB must include JSON and BIN chunks: ${path}`)
  return { json, bin }
}

function getAccessorByteOffset(json, accessor) {
  const bufferView = json.bufferViews?.[accessor.bufferView]
  return (bufferView?.byteOffset ?? 0) + (accessor.byteOffset ?? 0)
}

function getComponentByteSize(accessor) {
  const byteSize = componentByteSizes.get(accessor.componentType)
  if (!byteSize)
    throw new Error(
      `Unsupported accessor componentType=${accessor.componentType}`,
    )
  return byteSize
}

function getAccessorElementByteSize(accessor) {
  const componentCount = typeComponentCounts.get(accessor.type)
  if (!componentCount)
    throw new Error(`Unsupported accessor type=${accessor.type}`)
  return componentCount * getComponentByteSize(accessor)
}

function readIndex(bin, byteOffset, componentType) {
  if (componentType === 5121) return bin.readUInt8(byteOffset)
  if (componentType === 5123) return bin.readUInt16LE(byteOffset)
  if (componentType === 5125) return bin.readUInt32LE(byteOffset)
  throw new Error(`Unsupported index componentType=${componentType}`)
}

function writeIndex(buffer, byteOffset, componentType, value) {
  if (componentType === 5121) {
    buffer.writeUInt8(value, byteOffset)
    return
  }
  if (componentType === 5123) {
    buffer.writeUInt16LE(value, byteOffset)
    return
  }
  if (componentType === 5125) {
    buffer.writeUInt32LE(value, byteOffset)
    return
  }
  throw new Error(`Unsupported index componentType=${componentType}`)
}

function readPositionComponent(bin, byteOffset, componentType) {
  if (componentType === 5120) return bin.readInt8(byteOffset)
  if (componentType === 5121) return bin.readUInt8(byteOffset)
  if (componentType === 5122) return bin.readInt16LE(byteOffset)
  if (componentType === 5123) return bin.readUInt16LE(byteOffset)
  if (componentType === 5125) return bin.readUInt32LE(byteOffset)
  if (componentType === 5126) return bin.readFloatLE(byteOffset)
  throw new Error(`Unsupported position componentType=${componentType}`)
}

function readPosition(bin, accessor, index) {
  const stride =
    accessor.byteStride ??
    accessor._bufferView?.byteStride ??
    getAccessorElementByteSize(accessor)
  const componentSize = getComponentByteSize(accessor)
  const baseOffset = accessor._byteOffset + index * stride
  return [
    readPositionComponent(bin, baseOffset, accessor.componentType),
    readPositionComponent(
      bin,
      baseOffset + componentSize,
      accessor.componentType,
    ),
    readPositionComponent(
      bin,
      baseOffset + componentSize * 2,
      accessor.componentType,
    ),
  ]
}

function getTriangleAreaSquared(a, b, c) {
  const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]
  const ac = [c[0] - a[0], c[1] - a[1], c[2] - a[2]]
  const cross = [
    ab[1] * ac[2] - ab[2] * ac[1],
    ab[2] * ac[0] - ab[0] * ac[2],
    ab[0] * ac[1] - ab[1] * ac[0],
  ]
  return cross[0] ** 2 + cross[1] ** 2 + cross[2] ** 2
}

function getAccessorBufferViewIndices(primitive) {
  return [
    primitive.indices,
    ...Object.values(primitive.attributes ?? {}),
  ].filter(Number.isInteger)
}

function validateSingleMeshPrimitive(json, path) {
  const primitive = json.meshes?.[0]?.primitives?.[0]
  if (
    !primitive ||
    json.meshes.length !== 1 ||
    json.meshes[0].primitives.length !== 1
  ) {
    throw new Error(`LOD retopology expects a single mesh primitive: ${path}`)
  }
  if (!Number.isInteger(primitive.indices)) {
    throw new Error(`LOD retopology requires indexed geometry: ${path}`)
  }
  if (!Number.isInteger(primitive.attributes?.POSITION)) {
    throw new Error(`LOD retopology requires POSITION geometry: ${path}`)
  }
  return primitive
}

function collectKeptTriangles({
  bin,
  indicesAccessor,
  positionAccessor,
  maxTriangles,
}) {
  const indexByteSize = getComponentByteSize(indicesAccessor)
  const triangleCount = Math.floor(indicesAccessor.count / 3)
  if (triangleCount <= maxTriangles) return null

  const triangles = []
  for (
    let triangleIndex = 0;
    triangleIndex < triangleCount;
    triangleIndex += 1
  ) {
    const indexOffset =
      indicesAccessor._byteOffset + triangleIndex * 3 * indexByteSize
    const ia = readIndex(bin, indexOffset, indicesAccessor.componentType)
    const ib = readIndex(
      bin,
      indexOffset + indexByteSize,
      indicesAccessor.componentType,
    )
    const ic = readIndex(
      bin,
      indexOffset + indexByteSize * 2,
      indicesAccessor.componentType,
    )
    const areaSquared = getTriangleAreaSquared(
      readPosition(bin, positionAccessor, ia),
      readPosition(bin, positionAccessor, ib),
      readPosition(bin, positionAccessor, ic),
    )
    triangles.push({ triangleIndex, areaSquared, indices: [ia, ib, ic] })
  }

  const keep = new Set(
    triangles
      .toSorted((left, right) => right.areaSquared - left.areaSquared)
      .slice(0, maxTriangles)
      .map(triangle => triangle.triangleIndex),
  )

  return triangles.filter(triangle => keep.has(triangle.triangleIndex))
}

function createCompactBuffers({ bin, json, primitive, keptTriangles }) {
  const indexAccessor = json.accessors[primitive.indices]
  const positionAccessor = json.accessors[primitive.attributes.POSITION]
  const vertexBufferView = json.bufferViews[positionAccessor.bufferView]
  const indexBufferView = json.bufferViews[indexAccessor.bufferView]
  const vertexStride =
    vertexBufferView.byteStride ?? getAccessorElementByteSize(positionAccessor)
  const indexByteSize = getComponentByteSize(indexAccessor)
  const usedVertexIds = [
    ...new Set(keptTriangles.flatMap(triangle => triangle.indices)),
  ].toSorted((left, right) => left - right)
  const remap = new Map(
    usedVertexIds.map((oldIndex, newIndex) => [oldIndex, newIndex]),
  )
  const newIndexBuffer = Buffer.alloc(keptTriangles.length * 3 * indexByteSize)
  const oldVertexStart = vertexBufferView.byteOffset ?? 0
  const newVertexBuffer = Buffer.alloc(usedVertexIds.length * vertexStride)

  for (
    let triangleIndex = 0;
    triangleIndex < keptTriangles.length;
    triangleIndex += 1
  ) {
    const triangle = keptTriangles[triangleIndex]
    for (let corner = 0; corner < 3; corner += 1) {
      writeIndex(
        newIndexBuffer,
        (triangleIndex * 3 + corner) * indexByteSize,
        indexAccessor.componentType,
        remap.get(triangle.indices[corner]),
      )
    }
  }

  for (let newIndex = 0; newIndex < usedVertexIds.length; newIndex += 1) {
    const oldIndex = usedVertexIds[newIndex]
    bin.copy(
      newVertexBuffer,
      newIndex * vertexStride,
      oldVertexStart + oldIndex * vertexStride,
      oldVertexStart + oldIndex * vertexStride + vertexStride,
    )
  }

  return { newIndexBuffer, newVertexBuffer, usedVertexIds }
}

function updatePositionBounds({ json, bin, accessorIndex, usedVertexIds }) {
  const accessor = json.accessors[accessorIndex]
  const bounds = {
    min: [
      Number.POSITIVE_INFINITY,
      Number.POSITIVE_INFINITY,
      Number.POSITIVE_INFINITY,
    ],
    max: [
      Number.NEGATIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
    ],
  }

  for (const vertexIndex of usedVertexIds) {
    const position = readPosition(bin, accessor, vertexIndex)
    for (let axis = 0; axis < 3; axis += 1) {
      bounds.min[axis] = Math.min(bounds.min[axis], position[axis])
      bounds.max[axis] = Math.max(bounds.max[axis], position[axis])
    }
  }

  accessor.min = bounds.min
  accessor.max = bounds.max
}

function writeGlb(path, json, bufferViews, chunksByBufferView) {
  const binParts = []
  let byteOffset = 0
  for (let index = 0; index < bufferViews.length; index += 1) {
    const chunk = chunksByBufferView.get(index)
    if (!chunk) continue
    const alignedOffset = align4(byteOffset)
    if (alignedOffset > byteOffset) {
      binParts.push(Buffer.alloc(alignedOffset - byteOffset))
      byteOffset = alignedOffset
    }
    bufferViews[index].byteOffset = byteOffset
    bufferViews[index].byteLength = chunk.length
    binParts.push(chunk)
    byteOffset += chunk.length
  }

  const alignedBinLength = align4(byteOffset)
  if (alignedBinLength > byteOffset) {
    binParts.push(Buffer.alloc(alignedBinLength - byteOffset))
  }
  const newBin = Buffer.concat(binParts)
  json.buffers[0].byteLength = newBin.length

  const jsonBuffer = Buffer.from(`${JSON.stringify(json)} `)
  const jsonLength = align4(jsonBuffer.length)
  const paddedJson = Buffer.alloc(jsonLength, 0x20)
  jsonBuffer.copy(paddedJson)

  const totalLength = 12 + 8 + paddedJson.length + 8 + newBin.length
  const output = Buffer.alloc(totalLength)
  output.writeUInt32LE(glbMagic, 0)
  output.writeUInt32LE(2, 4)
  output.writeUInt32LE(totalLength, 8)
  output.writeUInt32LE(paddedJson.length, 12)
  output.writeUInt32LE(glbJsonChunkType, 16)
  paddedJson.copy(output, 20)
  const binHeaderOffset = 20 + paddedJson.length
  output.writeUInt32LE(newBin.length, binHeaderOffset)
  output.writeUInt32LE(glbBinChunkType, binHeaderOffset + 4)
  newBin.copy(output, binHeaderOffset + 8)
  writeFileSync(path, output)
}

export function retopologizeGlbLodByTriangleArea({ path, maxTriangles }) {
  const { json, bin } = readGlb(path)
  const primitive = validateSingleMeshPrimitive(json, path)
  const accessorIndices = getAccessorBufferViewIndices(primitive)

  for (const accessorIndex of accessorIndices) {
    const accessor = json.accessors[accessorIndex]
    accessor._bufferView = json.bufferViews[accessor.bufferView]
    accessor._byteOffset = getAccessorByteOffset(json, accessor)
  }

  const indexAccessor = json.accessors[primitive.indices]
  const positionAccessor = json.accessors[primitive.attributes.POSITION]
  const sourceTriangleCount = Math.floor(indexAccessor.count / 3)
  const keptTriangles = collectKeptTriangles({
    bin,
    indicesAccessor: indexAccessor,
    positionAccessor,
    maxTriangles,
  })

  if (!keptTriangles) {
    return {
      changed: false,
      sourceTriangleCount,
      triangleCount: sourceTriangleCount,
      vertexCount: positionAccessor.count,
    }
  }

  const { newIndexBuffer, newVertexBuffer, usedVertexIds } =
    createCompactBuffers({
      bin,
      json,
      primitive,
      keptTriangles,
    })
  updatePositionBounds({
    json,
    bin,
    accessorIndex: primitive.attributes.POSITION,
    usedVertexIds,
  })

  const chunksByBufferView = new Map()
  for (let index = 0; index < json.bufferViews.length; index += 1) {
    const bufferView = json.bufferViews[index]
    const start = bufferView.byteOffset ?? 0
    const end = start + (bufferView.byteLength ?? 0)
    chunksByBufferView.set(index, Buffer.from(bin.subarray(start, end)))
  }
  chunksByBufferView.set(indexAccessor.bufferView, newIndexBuffer)
  chunksByBufferView.set(positionAccessor.bufferView, newVertexBuffer)

  indexAccessor.count = keptTriangles.length * 3
  for (const accessorIndex of Object.values(primitive.attributes ?? {})) {
    json.accessors[accessorIndex].count = usedVertexIds.length
  }

  for (const accessor of json.accessors) {
    accessor._bufferView = undefined
    accessor._byteOffset = undefined
  }

  writeGlb(path, json, json.bufferViews, chunksByBufferView)

  return {
    changed: true,
    sourceTriangleCount,
    triangleCount: keptTriangles.length,
    vertexCount: usedVertexIds.length,
  }
}
