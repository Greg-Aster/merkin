import * as THREE from 'three'
import {
  type AssetLocalTransformMetadata,
  applyAssetLocalTransformToVertices,
} from '../engine/assetLocalTransform'

export type MeshColliderPatch = {
  id: string
  vertices: Float32Array
  indices: Uint32Array
}

const meshRootLocalMatrix = new THREE.Matrix4()
const vertex = new THREE.Vector3()
const identityScale: [number, number, number] = [1, 1, 1]

function getFiniteScale(scale: [number, number, number] | undefined) {
  return scale?.map(value => {
    const numeric = Number(value)
    return Number.isFinite(numeric) ? numeric : 1
  }) as [number, number, number] | undefined
}

function applyScaleToVertices(
  vertices: Float32Array,
  scale: [number, number, number],
) {
  if (scale[0] === 1 && scale[1] === 1 && scale[2] === 1) return vertices

  const scaledVertices = new Float32Array(vertices.length)
  for (let i = 0; i < vertices.length; i += 3) {
    scaledVertices[i] = vertices[i] * scale[0]
    scaledVertices[i + 1] = vertices[i + 1] * scale[1]
    scaledVertices[i + 2] = vertices[i + 2] * scale[2]
  }
  return scaledVertices
}

function createMeshColliderPatch(
  mesh: THREE.Mesh,
  index: number,
  externalParentInverseMatrix: THREE.Matrix4,
  assetLocalTransform: AssetLocalTransformMetadata | null,
  scale: [number, number, number],
): MeshColliderPatch | null {
  const geometry = mesh.geometry
  const positionAttribute = geometry?.getAttribute('position')
  if (!positionAttribute || positionAttribute.count < 3) return null

  meshRootLocalMatrix
    .copy(externalParentInverseMatrix)
    .multiply(mesh.matrixWorld)

  const vertices = new Float32Array(positionAttribute.count * 3)
  for (let i = 0; i < positionAttribute.count; i += 1) {
    vertex
      .set(
        positionAttribute.getX(i),
        positionAttribute.getY(i),
        positionAttribute.getZ(i),
      )
      .applyMatrix4(meshRootLocalMatrix)
    vertices[i * 3] = vertex.x
    vertices[i * 3 + 1] = vertex.y
    vertices[i * 3 + 2] = vertex.z
  }
  const transformedVertices = applyAssetLocalTransformToVertices(
    vertices,
    assetLocalTransform,
  )
  const scaledVertices = applyScaleToVertices(transformedVertices, scale)

  const geometryIndex = geometry.index
  const indices = geometryIndex
    ? new Uint32Array(Array.from(geometryIndex.array))
    : new Uint32Array(
        Array.from({ length: positionAttribute.count }, (_, i) => i),
      )

  if (indices.length < 3) return null

  return {
    id: `${mesh.name || 'mesh'}-${index}`,
    vertices: scaledVertices,
    indices,
  }
}

export function buildAssetTrimeshColliderPatches(
  root: THREE.Object3D,
  options: {
    assetLocalTransform?: AssetLocalTransformMetadata | null
    scale?: [number, number, number]
  } = {},
): MeshColliderPatch[] {
  const patches: MeshColliderPatch[] = []
  const scale = getFiniteScale(options.scale) ?? identityScale
  root.updateWorldMatrix(true, true)
  const externalParentInverseMatrix = root.parent
    ? new THREE.Matrix4().copy(root.parent.matrixWorld).invert()
    : new THREE.Matrix4()

  root.traverse(child => {
    if (!(child instanceof THREE.Mesh)) return
    const patch = createMeshColliderPatch(
      child,
      patches.length,
      externalParentInverseMatrix,
      options.assetLocalTransform ?? null,
      scale,
    )
    if (patch) patches.push(patch)
  })

  return patches
}
