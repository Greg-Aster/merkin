import { TriMeshFlags } from '@dimforge/rapier3d-compat'
import type { TerrainConfig } from './TerrainManager'

export type BakedTerrainCollider = {
  args: [Float32Array, Uint32Array, TriMeshFlags]
  position: [number, number, number]
  vertexCount: number
  indexCount: number
  triangleCount: number
  sourceResolution: number
  colliderResolution: number
  sampleStep: number
}

const MAGIC = 0x4d4d5443
const VERSION = 1
const colliderBufferCache = new Map<string, Promise<ArrayBuffer>>()

function readHeader(view: DataView) {
  const magic = view.getUint32(0, true)
  const version = view.getUint32(4, true)
  if (magic !== MAGIC) {
    throw new Error(`Invalid terrain collider magic: 0x${magic.toString(16)}`)
  }
  if (version !== VERSION) {
    throw new Error(`Unsupported terrain collider version: ${version}`)
  }
  return {
    vertexCount: view.getUint32(8, true),
    indexCount: view.getUint32(12, true),
    triangleCount: view.getUint32(16, true),
    sourceResolution: view.getUint32(20, true),
    colliderResolution: view.getUint32(24, true),
    sampleStep: view.getUint32(28, true),
  }
}

export function parseBakedTerrainCollider(
  buffer: ArrayBuffer,
  collisionConfig: NonNullable<TerrainConfig['collision']>,
): BakedTerrainCollider {
  const headerBytes = 32
  const view = new DataView(buffer)
  const header = readHeader(view)
  const vertexBytes = header.vertexCount * 3 * Float32Array.BYTES_PER_ELEMENT
  const indexBytes = header.indexCount * Uint32Array.BYTES_PER_ELEMENT
  const expectedBytes = headerBytes + vertexBytes + indexBytes

  if (buffer.byteLength !== expectedBytes) {
    throw new Error(
      `Terrain collider byte mismatch: expected ${expectedBytes}, got ${buffer.byteLength}`,
    )
  }
  if (
    collisionConfig.triangleCount !== undefined &&
    collisionConfig.triangleCount !== header.triangleCount
  ) {
    throw new Error(
      `Terrain collider triangle mismatch: manifest=${collisionConfig.triangleCount}, artifact=${header.triangleCount}`,
    )
  }

  const vertices = new Float32Array(
    buffer.slice(headerBytes, headerBytes + vertexBytes),
  )
  const indices = new Uint32Array(buffer.slice(headerBytes + vertexBytes))

  return {
    args: [
      vertices,
      indices,
      TriMeshFlags.DELETE_BAD_TOPOLOGY_TRIANGLES |
        TriMeshFlags.DELETE_DEGENERATE_TRIANGLES |
        TriMeshFlags.DELETE_DUPLICATE_TRIANGLES |
        TriMeshFlags.FIX_INTERNAL_EDGES,
    ],
    position: collisionConfig.center ?? [0, 0, 0],
    ...header,
  }
}

export async function loadBakedTerrainCollider(
  collisionConfig: NonNullable<TerrainConfig['collision']>,
) {
  return parseBakedTerrainCollider(
    await loadBakedTerrainColliderBuffer(collisionConfig.url),
    collisionConfig,
  )
}

function loadBakedTerrainColliderBuffer(url: string) {
  const cachedBuffer = colliderBufferCache.get(url)
  if (cachedBuffer) return cachedBuffer

  const bufferPromise = fetch(url)
    .then(response => {
      if (!response.ok) {
        throw new Error(`Failed to fetch ${url}: ${response.status}`)
      }
      return response.arrayBuffer()
    })
    .catch(error => {
      colliderBufferCache.delete(url)
      throw error
    })

  colliderBufferCache.set(url, bufferPromise)
  return bufferPromise
}
