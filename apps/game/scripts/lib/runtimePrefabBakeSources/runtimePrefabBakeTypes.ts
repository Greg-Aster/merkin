export type RuntimePrefabBakePrimitiveGeometryKind =
  | 'box'
  | 'cylinder'
  | 'octahedron'
  | 'tetrahedron'
  | 'icosahedron'
  | 'dodecahedron'
  | 'torus'

export type RuntimePrefabBakeVec3 = [number, number, number]

export type RuntimePrefabBakeEuler3 = [number, number, number]

export interface RuntimePrefabBakeData {
  type: string
  variant?: string
}

export interface RuntimePrefabBakeMeshDescriptor {
  id: string
  geometry: RuntimePrefabBakePrimitiveGeometryKind
  args: number[]
  position: RuntimePrefabBakeVec3
  rotation: RuntimePrefabBakeEuler3
  scale: RuntimePrefabBakeVec3
  color: string
  emissive?: string | null
  emissiveIntensity?: number
  metalness?: number
  roughness?: number
  transparent?: boolean
  opacity?: number
}
