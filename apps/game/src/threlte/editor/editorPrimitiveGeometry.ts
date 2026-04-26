import * as THREE from 'three'
import type { PrimitiveGeometryKind } from './editorTypes'

export function createPrimitiveGeometry(
  geometry: PrimitiveGeometryKind,
  args: number[],
): THREE.BufferGeometry {
  switch (geometry) {
    case 'box':
      return new THREE.BoxGeometry(
        args[0] ?? 1,
        args[1] ?? 1,
        args[2] ?? 1,
      )
    case 'cylinder':
      return new THREE.CylinderGeometry(
        args[0] ?? 0.5,
        args[1] ?? 0.5,
        args[2] ?? 1,
        args[3] ?? 32,
      )
    case 'octahedron':
      return new THREE.OctahedronGeometry(args[0] ?? 0.5, args[1] ?? 0)
    case 'tetrahedron':
      return new THREE.TetrahedronGeometry(args[0] ?? 0.5, args[1] ?? 0)
    case 'icosahedron':
      return new THREE.IcosahedronGeometry(args[0] ?? 0.5, args[1] ?? 0)
    case 'dodecahedron':
      return new THREE.DodecahedronGeometry(args[0] ?? 0.5, args[1] ?? 0)
    case 'torus':
      return new THREE.TorusGeometry(
        args[0] ?? 0.5,
        args[1] ?? 0.2,
        args[2] ?? 12,
        args[3] ?? 48,
      )
    default:
      return new THREE.BoxGeometry(1, 1, 1)
  }
}

export function createPrimitiveTrimeshArgs(
  geometry: PrimitiveGeometryKind,
  args: number[],
): [Float32Array, Uint32Array] {
  const bufferGeometry = createPrimitiveGeometry(geometry, args)
  const positionAttribute = bufferGeometry.getAttribute('position')
  const vertices = new Float32Array(positionAttribute.count * 3)

  for (let index = 0; index < positionAttribute.count; index += 1) {
    vertices[index * 3] = positionAttribute.getX(index)
    vertices[index * 3 + 1] = positionAttribute.getY(index)
    vertices[index * 3 + 2] = positionAttribute.getZ(index)
  }

  const indices = bufferGeometry.index
    ? new Uint32Array(Array.from(bufferGeometry.index.array))
    : new Uint32Array(
        Array.from({ length: positionAttribute.count }, (_, index) => index),
      )

  bufferGeometry.dispose()
  return [vertices, indices]
}
