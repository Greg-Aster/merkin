import * as THREE from 'three'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'
import type {
  EditorMaterialData,
  EditorPrefabType,
  EditorPrimitiveData,
  EditorSceneNode,
} from './editorTypes'

const PREFAB_ASSET_URLS: Partial<Record<EditorPrefabType, string>> = {
  'hanging-light': '/models/polyhaven/caged_hanging_light/caged_hanging_light_1k.gltf',
}

export function getPrefabAssetUrl(type: EditorPrefabType | undefined) {
  if (!type) return ''
  return PREFAB_ASSET_URLS[type] ?? ''
}

export function canBakeSceneNode(node: EditorSceneNode | null) {
  return !!(node?.asset?.url || node?.primitive || node?.prefab)
}

function resolvePrimitiveMaterial(primitive: EditorPrimitiveData, override?: EditorMaterialData) {
  const color = override?.color ?? primitive.color ?? '#ffffff'
  const emissive = override?.emissive ?? primitive.emissive ?? '#000000'
  const metalness = override?.metalness ?? primitive.metalness ?? 0.5
  const roughness = override?.roughness ?? primitive.roughness ?? 0.5
  const opacity = override?.opacity ?? primitive.opacity ?? 1
  const transparent = override?.transparent ?? primitive.transparent ?? opacity < 0.999

  return new THREE.MeshPhysicalMaterial({
    color,
    emissive,
    emissiveIntensity: override?.emissiveIntensity ?? primitive.emissiveIntensity ?? 0,
    metalness,
    roughness,
    transparent,
    opacity,
    wireframe: override?.wireframe ?? false,
    side: override?.doubleSided ? THREE.DoubleSide : THREE.FrontSide,
    flatShading: override?.flatShading ?? false,
    envMapIntensity: override?.envMapIntensity ?? 1,
    transmission: override?.transmission ?? 0,
    ior: override?.ior ?? 1.5,
    clearcoat: override?.clearcoat ?? 0,
    clearcoatRoughness: override?.clearcoatRoughness ?? 0,
    thickness: override?.thickness ?? 0,
    reflectivity: override?.reflectivity ?? 0.5,
  })
}

function createPrimitiveGeometry(geometry: EditorPrimitiveData['geometry'], args: number[]) {
  if (geometry === 'box') return new THREE.BoxGeometry(...(args as [number?, number?, number?]))
  if (geometry === 'cylinder') return new THREE.CylinderGeometry(...(args as [number?, number?, number?, number?]))
  if (geometry === 'octahedron') return new THREE.OctahedronGeometry(...(args as [number?, number?]))
  if (geometry === 'tetrahedron') return new THREE.TetrahedronGeometry(...(args as [number?, number?]))
  if (geometry === 'icosahedron') return new THREE.IcosahedronGeometry(...(args as [number?, number?]))
  if (geometry === 'dodecahedron') return new THREE.DodecahedronGeometry(...(args as [number?, number?]))
  return new THREE.TorusGeometry(...(args as [number?, number?, number?, number?, number?]))
}

function createPrimitiveMesh(
  primitive: EditorPrimitiveData,
  materialOverride?: EditorMaterialData,
  localTransform?: {
    position?: [number, number, number]
    rotation?: [number, number, number]
    scale?: [number, number, number]
  },
) {
  const geometry = createPrimitiveGeometry(primitive.geometry, primitive.args)
  const material = resolvePrimitiveMaterial(primitive, materialOverride)
  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.fromArray(localTransform?.position ?? [0, 0, 0])
  mesh.rotation.set(...(localTransform?.rotation ?? [0, 0, 0]))
  mesh.scale.fromArray(localTransform?.scale ?? [1, 1, 1])
  mesh.updateMatrixWorld(true)
  return mesh
}

function addParts(
  group: THREE.Group,
  parts: Array<{
    primitive: EditorPrimitiveData
    position?: [number, number, number]
    rotation?: [number, number, number]
    scale?: [number, number, number]
  }>,
  override?: EditorMaterialData,
) {
  for (const part of parts) {
    group.add(createPrimitiveMesh(part.primitive, override, part))
  }
}

function buildProceduralPrefabObject(node: EditorSceneNode) {
  const type = node.prefab?.type
  if (!type) return null
  const group = new THREE.Group()
  const override = node.material

  if (type === 'anomaly-cluster') {
    addParts(group, [
      { primitive: { geometry: 'octahedron', args: [1.0, 0], color: '#ff00ff', emissive: '#ff00ff', emissiveIntensity: 1.05, metalness: 0.96, roughness: 0.03 }, position: [0, 0, 0] },
      { primitive: { geometry: 'box', args: [0.16, 0.52, 0.16], color: '#8fd8ff', emissive: '#8fd8ff', emissiveIntensity: 0.58, metalness: 1, roughness: 0.04 }, position: [1.05, 0.18, 0] },
      { primitive: { geometry: 'tetrahedron', args: [0.22, 0], color: '#8fd8ff', emissive: '#8fd8ff', emissiveIntensity: 0.58, metalness: 1, roughness: 0.04 }, position: [0, 0.18, 1.05] },
      { primitive: { geometry: 'box', args: [0.16, 0.52, 0.16], color: '#8fd8ff', emissive: '#8fd8ff', emissiveIntensity: 0.58, metalness: 1, roughness: 0.04 }, position: [-1.05, 0.18, 0] },
      { primitive: { geometry: 'tetrahedron', args: [0.22, 0], color: '#8fd8ff', emissive: '#8fd8ff', emissiveIntensity: 0.58, metalness: 1, roughness: 0.04 }, position: [0, 0.18, -1.05] },
      { primitive: { geometry: 'torus', args: [1.3, 0.04, 12, 32], color: '#8fd8ff', emissive: '#8fd8ff', emissiveIntensity: 0.4, metalness: 1, roughness: 0.03, transparent: true, opacity: 0.72 }, position: [0, 0.12, 0], rotation: [Math.PI / 2, 0, 0] },
    ], override)
    return group
  }

  if (type === 'command-console') {
    addParts(group, [
      { primitive: { geometry: 'box', args: [2.0, 0.3, 1.6], color: '#1a5f7a', emissive: '#17394a', emissiveIntensity: 0.2, metalness: 0.92, roughness: 0.18 }, position: [0, 0.18, 0] },
      { primitive: { geometry: 'box', args: [2.0, 1.4, 0.1], color: '#1a5f7a', emissive: '#17394a', emissiveIntensity: 0.22, metalness: 0.9, roughness: 0.22 }, position: [0, 1.48, -0.6] },
      { primitive: { geometry: 'box', args: [0.8, 1.0, 0.02], color: '#6ad7ff', emissive: '#6ad7ff', emissiveIntensity: 0.85, metalness: 0.16, roughness: 0.08 }, position: [-0.5, 1.48, -0.55] },
      { primitive: { geometry: 'box', args: [0.8, 1.0, 0.02], color: '#6ad7ff', emissive: '#6ad7ff', emissiveIntensity: 0.85, metalness: 0.16, roughness: 0.08 }, position: [0.5, 1.48, -0.55] },
      { primitive: { geometry: 'box', args: [0.28, 0.08, 0.22], color: '#2d4452', emissive: '#111920', emissiveIntensity: 0.15, metalness: 0.95, roughness: 0.18 }, position: [-0.7, 0.41, 0.55] },
      { primitive: { geometry: 'box', args: [0.28, 0.08, 0.22], color: '#6ad7ff', emissive: '#6ad7ff', emissiveIntensity: 0.8, metalness: 0.95, roughness: 0.18 }, position: [0, 0.41, 0.6] },
      { primitive: { geometry: 'box', args: [0.28, 0.08, 0.22], color: '#2d4452', emissive: '#111920', emissiveIntensity: 0.15, metalness: 0.95, roughness: 0.18 }, position: [0.7, 0.41, 0.55] },
      { primitive: { geometry: 'torus', args: [1.28, 0.05, 12, 28], color: '#84dfff', emissive: '#84dfff', emissiveIntensity: 0.46, metalness: 1, roughness: 0.03, transparent: true, opacity: 0.82 }, position: [0, 0.9, 0], rotation: [Math.PI / 2, 0, 0] },
    ], override)
    return group
  }

  if (type === 'command-fin') {
    addParts(group, [
      { primitive: { geometry: 'box', args: [0.22, 3.6, 1.4], color: '#0d1724', emissive: '#11263a', emissiveIntensity: 0.18, metalness: 0.65, roughness: 0.35 } },
    ], override)
    return group
  }

  if (type === 'portal-apparatus') {
    addParts(group, [
      { primitive: { geometry: 'cylinder', args: [0.8, 0.8, 0.08, 32], color: '#ff00ff', emissive: '#ff00ff', emissiveIntensity: 1.6, metalness: 1, roughness: 0.05 }, position: [0, 0.04, 0] },
      { primitive: { geometry: 'torus', args: [0.9, 0.12, 16, 32], color: '#ff00ff', emissive: '#ff00ff', emissiveIntensity: 2.0, metalness: 1, roughness: 0.05 }, position: [0, 0.2, 0] },
      { primitive: { geometry: 'torus', args: [1.58, 0.04, 12, 36], color: '#a2f0ff', emissive: '#a2f0ff', emissiveIntensity: 0.48, metalness: 1, roughness: 0.03, transparent: true, opacity: 0.7 }, position: [0, 1.12, 0], rotation: [Math.PI / 2, 0, 0] },
      { primitive: { geometry: 'torus', args: [1.15, 0.07, 16, 48], color: '#ff7aff', emissive: '#ff7aff', emissiveIntensity: 2.1, metalness: 1, roughness: 0.05 }, position: [0, 1.05, 0], rotation: [Math.PI / 2, 0, 0] },
      { primitive: { geometry: 'cylinder', args: [0.06, 0.12, 1.7, 12], color: '#e38bff', emissive: '#e38bff', emissiveIntensity: 1.4, metalness: 0.9, roughness: 0.08, transparent: true, opacity: 0.8 }, position: [0, 1.0, 0] },
    ], override)
    return group
  }

  if (type === 'support-column') {
    addParts(group, [
      { primitive: { geometry: 'cylinder', args: [0.62, 0.74, 0.28, 8], color: '#1a5f7a', emissive: '#17384a', emissiveIntensity: 0.18, metalness: 0.82, roughness: 0.3 }, position: [0, -3.58, 0] },
      { primitive: { geometry: 'cylinder', args: [0.48, 0.58, 0.22, 8], color: '#142532', emissive: '#0f1820', emissiveIntensity: 0.06, metalness: 0.78, roughness: 0.34 }, position: [0, -3.34, 0] },
      { primitive: { geometry: 'cylinder', args: [0.26, 0.3, 7.37, 8], color: '#0a3d4d', emissive: '#102734', emissiveIntensity: 0.08, metalness: 0.64, roughness: 0.4 }, position: [0, 0.25, 0] },
      { primitive: { geometry: 'box', args: [0.08, 7.07, 0.08], color: '#213846', emissive: '#111b23', emissiveIntensity: 0.04, metalness: 0.72, roughness: 0.32 }, position: [-0.24, 0.25, 0] },
      { primitive: { geometry: 'box', args: [0.08, 7.07, 0.08], color: '#213846', emissive: '#111b23', emissiveIntensity: 0.04, metalness: 0.72, roughness: 0.32 }, position: [0.24, 0.25, 0] },
      { primitive: { geometry: 'box', args: [0.08, 7.07, 0.08], color: '#213846', emissive: '#111b23', emissiveIntensity: 0.04, metalness: 0.72, roughness: 0.32 }, position: [0, 0.25, -0.24] },
      { primitive: { geometry: 'box', args: [0.08, 7.07, 0.08], color: '#213846', emissive: '#111b23', emissiveIntensity: 0.04, metalness: 0.72, roughness: 0.32 }, position: [0, 0.25, 0.24] },
      { primitive: { geometry: 'torus', args: [0.4, 0.05, 12, 24], color: '#00d4ff', emissive: '#00d4ff', emissiveIntensity: 0.9, metalness: 1, roughness: 0.05 }, position: [0, 3.42, 0], rotation: [Math.PI / 2, 0, 0] },
      { primitive: { geometry: 'cylinder', args: [0.4, 0.26, 0.42, 8], color: '#00d4ff', emissive: '#00d4ff', emissiveIntensity: 1.0, metalness: 0.95, roughness: 0.08 }, position: [0, 3.82, 0] },
      { primitive: { geometry: 'box', args: [0.16, 0.24, 0.16], color: '#d2f1ff', emissive: '#00d4ff', emissiveIntensity: 0.85, metalness: 1, roughness: 0.04 }, position: [0, 4.08, 0] },
    ], override)
    return group
  }

  if (type === 'interior-archway') {
    addParts(group, [
      { primitive: { geometry: 'box', args: [0.62, 0.4, 0.62], color: '#2a3d4a', emissive: '#173244', emissiveIntensity: 0.08, metalness: 0.7, roughness: 0.3 }, position: [-1.2, 0.08, 0] },
      { primitive: { geometry: 'box', args: [0.62, 0.4, 0.62], color: '#2a3d4a', emissive: '#173244', emissiveIntensity: 0.08, metalness: 0.7, roughness: 0.3 }, position: [1.2, 0.08, 0] },
      { primitive: { geometry: 'box', args: [0.34, 7.94, 0.34], color: '#2a3d4a', emissive: '#2a7a9a', emissiveIntensity: 0.4, metalness: 0.72, roughness: 0.26 }, position: [-1.2, 4.05, 0] },
      { primitive: { geometry: 'box', args: [0.34, 7.94, 0.34], color: '#2a3d4a', emissive: '#2a7a9a', emissiveIntensity: 0.4, metalness: 0.72, roughness: 0.26 }, position: [1.2, 4.05, 0] },
      { primitive: { geometry: 'box', args: [3.2, 0.36, 0.48], color: '#2a3d4a', emissive: '#2a7a9a', emissiveIntensity: 0.34, metalness: 0.72, roughness: 0.26 }, position: [0, 7.96, 0] },
      { primitive: { geometry: 'box', args: [2.6, 0.12, 0.2], color: '#9ae6ff', emissive: '#9ae6ff', emissiveIntensity: 0.9, metalness: 1, roughness: 0.02 }, position: [0, 8.18, 0] },
    ], override)
    return group
  }

  if (type === 'courtyard-pylon') {
    addParts(group, [
      { primitive: { geometry: 'box', args: [0.56, 0.34, 0.56], color: '#1a5f7a', emissive: '#17384a', emissiveIntensity: 0.06, metalness: 0.28, roughness: 0.66 }, position: [0, 0.07, 0] },
      { primitive: { geometry: 'box', args: [0.28, 7.74, 0.28], color: '#1a5f7a', emissive: '#17384a', emissiveIntensity: 0.08, metalness: 0.35, roughness: 0.62 }, position: [0, 3.94, 0] },
      { primitive: { geometry: 'box', args: [0.1, 7.24, 0.12], color: '#79cce8', emissive: '#79cce8', emissiveIntensity: 0.52, metalness: 0.95, roughness: 0.06 }, position: [0, 3.94, 0.16] },
    ], override)
    return group
  }

  if (type === 'story-marker') {
    const color = '#00ccff'
    addParts(group, [
      { primitive: { geometry: 'torus', args: [0.34, 0.02, 12, 24], color, emissive: color, emissiveIntensity: 0.38, metalness: 1, roughness: 0.04, transparent: true, opacity: 0.72 }, position: [0, 0.05, 0], rotation: [Math.PI / 2, 0, 0] },
      { primitive: { geometry: 'box', args: [0.05, 0.2, 0.05], color, emissive: color, emissiveIntensity: 0.3, metalness: 0.98, roughness: 0.05 }, position: [0.42, 0.1, 0] },
      { primitive: { geometry: 'tetrahedron', args: [0.12, 0], color, emissive: color, emissiveIntensity: 0.3, metalness: 0.98, roughness: 0.05 }, position: [-0.21, 0.1, 0.36] },
      { primitive: { geometry: 'box', args: [0.05, 0.2, 0.05], color, emissive: color, emissiveIntensity: 0.3, metalness: 0.98, roughness: 0.05 }, position: [-0.21, 0.1, -0.36] },
    ], override)
    return group
  }

  if (type === 'wasteland-archway') {
    addParts(group, [
      { primitive: { geometry: 'box', args: [0.62, 0.42, 0.62], color: '#1a5f7a', emissive: '#17384a', emissiveIntensity: 0.06, metalness: 0.3, roughness: 0.66 }, position: [-1.2, 0.05, 0] },
      { primitive: { geometry: 'box', args: [0.62, 0.42, 0.62], color: '#1a5f7a', emissive: '#17384a', emissiveIntensity: 0.06, metalness: 0.3, roughness: 0.66 }, position: [1.2, 0.05, 0] },
      { primitive: { geometry: 'box', args: [0.34, 7.74, 0.34], color: '#1a5f7a', emissive: '#17384a', emissiveIntensity: 0.08, metalness: 0.35, roughness: 0.62 }, position: [-1.2, 3.92, 0] },
      { primitive: { geometry: 'box', args: [0.34, 7.74, 0.34], color: '#1a5f7a', emissive: '#17384a', emissiveIntensity: 0.08, metalness: 0.35, roughness: 0.62 }, position: [1.2, 3.92, 0] },
      { primitive: { geometry: 'box', args: [3.3, 0.38, 0.5], color: '#1a5f7a', emissive: '#17384a', emissiveIntensity: 0.08, metalness: 0.35, roughness: 0.62 }, position: [0, 7.72, 0] },
      { primitive: { geometry: 'box', args: [2.4, 0.12, 0.18], color: '#8dd8f7', emissive: '#8dd8f7', emissiveIntensity: 0.68, metalness: 1, roughness: 0.03 }, position: [0, 8.04, 0] },
    ], override)
    return group
  }

  if (type === 'courtyard-fountain') {
    addParts(group, [
      { primitive: { geometry: 'cylinder', args: [1.8, 2.05, 0.24, 8], color: '#254658', emissive: '#11202b', emissiveIntensity: 0.08, metalness: 0.34, roughness: 0.6 }, position: [0, 0.12, 0] },
      { primitive: { geometry: 'cylinder', args: [1.22, 1.46, 0.44, 8], color: '#2d5f7a', emissive: '#17384a', emissiveIntensity: 0.08, metalness: 0.42, roughness: 0.56 }, position: [0, 0.46, 0] },
      { primitive: { geometry: 'torus', args: [1.02, 0.09, 14, 36], color: '#86d8ff', emissive: '#86d8ff', emissiveIntensity: 0.48, metalness: 1, roughness: 0.04 }, position: [0, 0.82, 0], rotation: [Math.PI / 2, 0, 0] },
      { primitive: { geometry: 'cylinder', args: [0.96, 1.12, 0.34, 8], color: '#1a3d5a', emissive: '#17384a', emissiveIntensity: 0.08, metalness: 0.55, roughness: 0.28, transparent: true, opacity: 0.9 }, position: [0, 1.0, 0] },
      { primitive: { geometry: 'cylinder', args: [0.85, 0.85, 0.05, 32], color: '#4488cc', emissive: '#0066aa', emissiveIntensity: 0.6, metalness: 0.08, roughness: 0.14, transparent: true, opacity: 0.7 }, position: [0, 1.0, 0] },
      { primitive: { geometry: 'cylinder', args: [0.2, 0.26, 0.9, 8], color: '#ff00ff', emissive: '#ff00ff', emissiveIntensity: 1.0, metalness: 0.95, roughness: 0.08 }, position: [0, 1.28, 0] },
      { primitive: { geometry: 'torus', args: [2.35, 0.08, 16, 48], color: '#9fd6ff', emissive: '#9fd6ff', emissiveIntensity: 1.3, metalness: 0.95, roughness: 0.08 }, position: [0, 3.0, 0], rotation: [Math.PI / 2, 0, 0] },
    ], override)
    return group
  }

  if (type === 'observation-rig') {
    addParts(group, [
      { primitive: { geometry: 'cylinder', args: [0.18, 0.26, 1.4, 10], color: '#1d2630', emissive: '#21384d', emissiveIntensity: 0.2, metalness: 0.75, roughness: 0.28 }, position: [5.4, 0.8, 22.72], rotation: [0, -0.7, 0] },
      { primitive: { geometry: 'cylinder', args: [0.18, 0.28, 2.6, 12], color: '#0f1c28', emissive: '#234764', emissiveIntensity: 0.24, metalness: 0.82, roughness: 0.18 }, position: [5.1, 1.8, 21.62], rotation: [-0.55, -0.75, 0] },
      { primitive: { geometry: 'box', args: [0.7, 0.45, 1.0], color: '#17212a', emissive: '#18344a', emissiveIntensity: 0.18, metalness: 0.6, roughness: 0.42 }, position: [5.85, 1.05, 23.12], rotation: [0, -0.35, 0] },
    ], override)
    return group
  }

  if (type === 'bench-growth') {
    addParts(group, [
      { primitive: { geometry: 'box', args: [2.0, 0.15, 0.6], color: '#4d3d2d', emissive: '#20160f', emissiveIntensity: 0.04, metalness: 0.16, roughness: 0.76 }, position: [0, 0.5, 0] },
      { primitive: { geometry: 'box', args: [2.0, 0.8, 0.15], color: '#4d3d2d', emissive: '#20160f', emissiveIntensity: 0.04, metalness: 0.16, roughness: 0.76 }, position: [0, 1.2, -0.6] },
      { primitive: { geometry: 'box', args: [0.1, 0.5, 0.1], color: '#3d2d1d', emissive: '#20160f', emissiveIntensity: 0.03, metalness: 0.12, roughness: 0.82 }, position: [-0.8, 0.25, -0.2] },
      { primitive: { geometry: 'box', args: [0.1, 0.5, 0.1], color: '#3d2d1d', emissive: '#20160f', emissiveIntensity: 0.03, metalness: 0.12, roughness: 0.82 }, position: [-0.8, 0.25, 0.2] },
      { primitive: { geometry: 'box', args: [0.1, 0.5, 0.1], color: '#3d2d1d', emissive: '#20160f', emissiveIntensity: 0.03, metalness: 0.12, roughness: 0.82 }, position: [0.8, 0.25, -0.2] },
      { primitive: { geometry: 'box', args: [0.1, 0.5, 0.1], color: '#3d2d1d', emissive: '#20160f', emissiveIntensity: 0.03, metalness: 0.12, roughness: 0.82 }, position: [0.8, 0.25, 0.2] },
      { primitive: { geometry: 'torus', args: [1.35, 0.045, 12, 32], color: '#9edfff', emissive: '#9edfff', emissiveIntensity: 0.3, metalness: 1, roughness: 0.03, transparent: true, opacity: 0.54 }, position: [0, 1.45, -0.38], rotation: [Math.PI / 2 - 0.2, 0, 0.1] },
    ], override)
    return group
  }

  if (type === 'growth-planter') {
    addParts(group, [
      { primitive: { geometry: 'cylinder', args: [0.4, 0.5, 0.8, 8], color: '#7a5a3a', emissive: '#27190d', emissiveIntensity: 0.04, metalness: 0.28, roughness: 0.72 }, position: [0, 0.4, 0] },
      { primitive: { geometry: 'torus', args: [0.54, 0.05, 12, 24], color: '#6df5c6', emissive: '#6df5c6', emissiveIntensity: 0.34, metalness: 1, roughness: 0.04, transparent: true, opacity: 0.72 }, position: [0, 0.84, 0], rotation: [Math.PI / 2, 0, 0] },
      { primitive: { geometry: 'box', args: [0.6, 0.3, 0.6], color: '#00aa44', emissive: '#00cc66', emissiveIntensity: 0.7, metalness: 0.92, roughness: 0.08 }, position: [0, 1.2, 0] },
      { primitive: { geometry: 'box', args: [0.5, 0.3, 0.5], color: '#00aa44', emissive: '#00cc66', emissiveIntensity: 0.7, metalness: 0.92, roughness: 0.08 }, position: [0, 1.6, 0] },
      { primitive: { geometry: 'box', args: [0.4, 0.3, 0.4], color: '#00aa44', emissive: '#00cc66', emissiveIntensity: 0.7, metalness: 0.92, roughness: 0.08 }, position: [0, 2.0, 0] },
      { primitive: { geometry: 'box', args: [0.3, 0.3, 0.3], color: '#00aa44', emissive: '#00cc66', emissiveIntensity: 0.7, metalness: 0.92, roughness: 0.08 }, position: [0, 2.4, 0] },
      { primitive: { geometry: 'box', args: [0.2, 0.3, 0.2], color: '#00aa44', emissive: '#00cc66', emissiveIntensity: 0.7, metalness: 0.92, roughness: 0.08 }, position: [0, 2.8, 0] },
    ], override)
    return group
  }

  if (type === 'wasteland-monolith') {
    addParts(group, [
      { primitive: { geometry: 'box', args: [1, 1, 1], color: '#4f5563', emissive: '#293240', emissiveIntensity: 0.08, metalness: 0.1, roughness: 0.9 } },
      { primitive: { geometry: 'box', args: [0.18, 0.92, 0.34], color: '#252d38', emissive: '#11161d', emissiveIntensity: 0.03, metalness: 0.18, roughness: 0.78 }, position: [-0.62, 0.04, 0] },
      { primitive: { geometry: 'box', args: [0.18, 0.92, 0.34], color: '#252d38', emissive: '#11161d', emissiveIntensity: 0.03, metalness: 0.18, roughness: 0.78 }, position: [0.62, 0.04, 0] },
      { primitive: { geometry: 'box', args: [0.16, 0.82, 0.06], color: '#88daf8', emissive: '#88daf8', emissiveIntensity: 0.46, metalness: 1, roughness: 0.04 }, position: [0, 0.08, 0.51] },
      { primitive: { geometry: 'box', args: [0.58, 0.12, 0.58], color: '#3a4550', emissive: '#1a2028', emissiveIntensity: 0.03, metalness: 0.16, roughness: 0.76 }, position: [0, 0.58, 0] },
    ], override)
    return group
  }

  if (type === 'broken-ring') {
    addParts(group, [
      { primitive: { geometry: 'torus', args: [2.6, 0.25, 14, 28, Math.PI], color: '#4f5669', emissive: '#344056', emissiveIntensity: 0.08, metalness: 0.14, roughness: 0.84 } },
    ], override)
    return group
  }

  return null
}

function disposeObject(object: THREE.Object3D) {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose()
      const material = child.material
      if (Array.isArray(material)) {
        for (const entry of material) entry.dispose()
      } else {
        material?.dispose()
      }
    }
  })
}

function exportObjectToGlb(object: THREE.Object3D) {
  return new Promise<Blob>((resolve, reject) => {
    const exporter = new GLTFExporter()
    exporter.parse(
      object,
      (result) => {
        if (result instanceof ArrayBuffer) {
          resolve(new Blob([result], { type: 'model/gltf-binary' }))
          return
        }
        reject(new Error('Expected a binary GLB export result.'))
      },
      (error) => {
        reject(error instanceof Error ? error : new Error('GLB export failed.'))
      },
      { binary: true, trs: false, onlyVisible: true },
    )
  })
}

export async function exportSceneNodeToGlb(node: EditorSceneNode) {
  let object: THREE.Object3D | null = null

  try {
    if (node.primitive) {
      object = createPrimitiveMesh(node.primitive, node.material)
    } else if (node.prefab) {
      const prefabAssetUrl = getPrefabAssetUrl(node.prefab.type)
      if (prefabAssetUrl) {
        return {
          kind: 'asset' as const,
          assetUrl: prefabAssetUrl,
          fileName: `${node.name || node.prefab.type}.gltf`,
        }
      }

      object = buildProceduralPrefabObject(node)
    } else if (node.asset?.url) {
      return {
        kind: 'asset' as const,
        assetUrl: node.asset.url,
        fileName: `${node.name || 'asset'}.glb`,
      }
    }

    if (!object) {
      throw new Error('This node does not have exportable geometry.')
    }

    object.name = node.name || node.id
    const blob = await exportObjectToGlb(object)
    return {
      kind: node.prefab ? 'prefab' as const : 'primitive' as const,
      blob,
      fileName: `${(node.name || node.id).replace(/[^a-z0-9_-]+/gi, '-').toLowerCase() || 'scene-node'}.glb`,
    }
  } finally {
    if (object) {
      disposeObject(object)
    }
  }
}
