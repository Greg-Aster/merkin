import type {
  RuntimePrefabBakeMeshDescriptor,
  RuntimePrefabBakePrimitiveGeometryKind,
} from './runtimePrefabBakeTypes'

type MeshOptions = Partial<
  Omit<RuntimePrefabBakeMeshDescriptor, 'id' | 'geometry' | 'args'>
>

export const RIGHT_ANGLES = [0, Math.PI / 2, Math.PI, Math.PI * 1.5]

export const SIX_WAY_ANGLES = [
  0,
  Math.PI / 3,
  (Math.PI * 2) / 3,
  Math.PI,
  (Math.PI * 4) / 3,
  (Math.PI * 5) / 3,
]

export function mesh(
  id: string,
  geometry: RuntimePrefabBakePrimitiveGeometryKind,
  args: number[],
  options: MeshOptions = {},
): RuntimePrefabBakeMeshDescriptor {
  const color = options.color ?? '#ffffff'

  return {
    id,
    geometry,
    args,
    position: options.position ?? [0, 0, 0],
    rotation: options.rotation ?? [0, 0, 0],
    scale: options.scale ?? [1, 1, 1],
    color,
    emissive: options.emissive ?? null,
    emissiveIntensity: options.emissiveIntensity ?? 0,
    metalness: options.metalness ?? 0.5,
    roughness: options.roughness ?? 0.5,
    transparent: options.transparent ?? false,
    opacity: options.opacity ?? 1,
  }
}
