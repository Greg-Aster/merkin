import * as THREE from 'three'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { createPrimitiveGeometry } from '../engine/primitiveGeometry'
import { getRuntimePrefabAssetUrl } from '../engine/runtimePrefabCatalog'
import {
  createWorldMatrixResolver,
  getTopLevelNodeIds,
} from './editorHierarchyUtils'
import type {
  EditorMaterialData,
  EditorPrefabType,
  EditorPrimitiveData,
  EditorSceneNode,
} from './editorTypes'

const gltfLoader = new GLTFLoader()

export function getPrefabAssetUrl(
  type: EditorPrefabType | undefined,
  variant?: string,
) {
  return getRuntimePrefabAssetUrl(type, variant)
}

export function canBakeSceneNode(node: EditorSceneNode | null) {
  return !!(node?.asset?.url || node?.primitive || node?.prefab)
}

function resolvePrimitiveMaterial(
  primitive: EditorPrimitiveData,
  override?: EditorMaterialData,
) {
  const color = override?.color ?? primitive.color ?? '#ffffff'
  const emissive = override?.emissive ?? primitive.emissive ?? '#000000'
  const metalness = override?.metalness ?? primitive.metalness ?? 0.5
  const roughness = override?.roughness ?? primitive.roughness ?? 0.5
  const opacity = override?.opacity ?? primitive.opacity ?? 1
  const transparent =
    override?.transparent ?? primitive.transparent ?? opacity < 0.999

  return new THREE.MeshPhysicalMaterial({
    color,
    emissive,
    emissiveIntensity:
      override?.emissiveIntensity ?? primitive.emissiveIntensity ?? 0,
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

function applyNodeTransformToObject(
  object: THREE.Object3D,
  transform: {
    position?: [number, number, number]
    rotation?: [number, number, number]
    scale?: [number, number, number]
  },
) {
  object.position.fromArray(transform.position ?? [0, 0, 0])
  object.rotation.set(...(transform.rotation ?? [0, 0, 0]))
  object.scale.fromArray(transform.scale ?? [1, 1, 1])
  object.updateMatrixWorld(true)
}

function applyMatrixToObject(object: THREE.Object3D, matrix: THREE.Matrix4) {
  const position = new THREE.Vector3()
  const quaternion = new THREE.Quaternion()
  const scale = new THREE.Vector3()
  matrix.decompose(position, quaternion, scale)
  const rotation = new THREE.Euler().setFromQuaternion(quaternion)
  applyNodeTransformToObject(object, {
    position: [position.x, position.y, position.z],
    rotation: [rotation.x, rotation.y, rotation.z],
    scale: [scale.x, scale.y, scale.z],
  })
}

async function loadAssetObject(assetUrl: string) {
  const gltf = await gltfLoader.loadAsync(assetUrl)
  const root = (gltf.scene ?? gltf.scenes?.[0] ?? new THREE.Group()).clone(true)
  root.updateMatrixWorld(true)
  return root
}

async function buildSceneNodeSubtreeObject(
  node: EditorSceneNode,
  nodes: EditorSceneNode[],
): Promise<THREE.Object3D | null> {
  const container = new THREE.Group()
  container.name = node.name || node.id
  let hasContent = false

  if (node.primitive) {
    container.add(createPrimitiveMesh(node.primitive, node.material))
    hasContent = true
  } else if (node.prefab) {
    const prefabAssetUrl = getPrefabAssetUrl(
      node.prefab.type,
      node.prefab.variant,
    )
    const prefabObject = prefabAssetUrl
      ? await loadAssetObject(prefabAssetUrl)
      : null
    if (prefabObject) {
      container.add(prefabObject)
      hasContent = true
    }
  } else if (node.asset?.url) {
    container.add(await loadAssetObject(node.asset.url))
    hasContent = true
  }

  for (const childNode of nodes.filter(
    candidate => candidate.parentId === node.id,
  )) {
    const childObject = await buildSceneNodeSubtreeObject(childNode, nodes)
    if (!childObject) continue
    applyNodeTransformToObject(childObject, childNode)
    container.add(childObject)
    hasContent = true
  }

  return hasContent ? container : null
}

function disposeObject(object: THREE.Object3D) {
  object.traverse(child => {
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
      result => {
        if (result instanceof ArrayBuffer) {
          resolve(new Blob([result], { type: 'model/gltf-binary' }))
          return
        }
        reject(new Error('Expected a binary GLB export result.'))
      },
      error => {
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
      const prefabAssetUrl = getPrefabAssetUrl(
        node.prefab.type,
        node.prefab.variant,
      )
      if (prefabAssetUrl) {
        return {
          kind: 'asset' as const,
          assetUrl: prefabAssetUrl,
          fileName: `${node.name || node.prefab.type}.gltf`,
        }
      }
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
    object.position.set(0, 0, 0)
    // Keep authored proportions in the staged source mesh, but leave scene rotation
    // on the node so the generated replacement does not inherit it twice.
    object.rotation.set(0, 0, 0)
    object.scale.set(...node.scale)
    object.updateMatrixWorld(true)
    const blob = await exportObjectToGlb(object)
    return {
      kind: node.prefab ? ('prefab' as const) : ('primitive' as const),
      blob,
      fileName: `${(node.name || node.id).replace(/[^a-z0-9_-]+/gi, '-').toLowerCase() || 'scene-node'}.glb`,
    }
  } finally {
    if (object) {
      disposeObject(object)
    }
  }
}

export async function exportSceneNodesToMergedGlb(
  nodes: EditorSceneNode[],
  selectedNodeIds: string[],
  label = 'merged-selection',
) {
  const topLevelIds = getTopLevelNodeIds(nodes, selectedNodeIds)
  if (topLevelIds.length === 0) {
    throw new Error('Select one or more scene nodes with exportable geometry.')
  }

  const getWorldMatrix = createWorldMatrixResolver(nodes)
  const worldCenter = new THREE.Vector3()
  for (const nodeId of topLevelIds) {
    worldCenter.add(
      new THREE.Vector3().setFromMatrixPosition(getWorldMatrix(nodeId)),
    )
  }
  worldCenter.multiplyScalar(1 / topLevelIds.length)

  const root = new THREE.Group()

  try {
    for (const nodeId of topLevelIds) {
      const node = nodes.find(candidate => candidate.id === nodeId) ?? null
      if (!node) continue
      const subtree = await buildSceneNodeSubtreeObject(node, nodes)
      if (!subtree) continue

      const relativeWorldMatrix = new THREE.Matrix4()
        .makeTranslation(-worldCenter.x, -worldCenter.y, -worldCenter.z)
        .multiply(getWorldMatrix(nodeId))
      applyMatrixToObject(subtree, relativeWorldMatrix)
      root.add(subtree)
    }

    if (root.children.length === 0) {
      throw new Error(
        'The current selection does not contain exportable geometry.',
      )
    }

    const blob = await exportObjectToGlb(root)
    return {
      blob,
      fileName: `${label.replace(/[^a-z0-9_-]+/gi, '-').toLowerCase() || 'merged-selection'}.glb`,
      topLevelIds,
    }
  } finally {
    disposeObject(root)
  }
}
