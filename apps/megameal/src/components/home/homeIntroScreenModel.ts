import {
  Box3,
  DoubleSide,
  MeshPhysicalMaterial,
  Vector3,
} from 'three'
import type * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

const screenModelSrc = '/assets/3D/screen.glb'
const screenGltfLoader = new GLTFLoader()
let sharedScreenModelPromise: Promise<THREE.Object3D | null> | null = null

function loadSharedScreenModel() {
  sharedScreenModelPromise ??= screenGltfLoader
    .loadAsync(screenModelSrc)
    .then(gltf => gltf.scene ?? gltf.scenes?.[0] ?? null)
    .catch(() => null)

  return sharedScreenModelPromise
}

function cloneScreenModel(source: THREE.Object3D) {
  const model = source.clone(true)

  model.traverse(item => {
    const mesh = item as THREE.Mesh
    if (!mesh.isMesh) return

    if (mesh.geometry) {
      mesh.geometry = mesh.geometry.clone()
    }

    if (Array.isArray(mesh.material)) {
      mesh.material = mesh.material.map(material => material.clone())
    } else if (mesh.material) {
      mesh.material = mesh.material.clone()
    }
  })

  return model
}

function fitScreenModel(
  model: THREE.Object3D,
  frameWidth: number,
  frameHeight: number,
) {
  const screenBounds = new Box3()
  const screenCenter = new Vector3()
  const screenSize = new Vector3()

  model.updateMatrixWorld(true)
  screenBounds.setFromObject(model)
  if (screenBounds.isEmpty()) return

  screenBounds.getCenter(screenCenter)
  screenBounds.getSize(screenSize)

  const scale = Math.min(
    frameWidth / Math.max(screenSize.x, 0.001),
    frameHeight / Math.max(screenSize.y, 0.001),
  )

  model.scale.setScalar(scale)
  model.position.set(
    -screenCenter.x * scale,
    -screenCenter.y * scale,
    -screenCenter.z * scale,
  )
}

function isGlassSourceMaterial(material: THREE.Material) {
  return material.transparent || material.opacity < 0.75
}

function cloneSourceColor(
  material: THREE.Material,
  fallback: number,
) {
  const sourceColor = (material as THREE.MeshStandardMaterial).color
  return sourceColor?.isColor ? sourceColor.clone() : fallback
}

function cloneSourceEmissive(
  material: THREE.Material,
  fallback: number,
) {
  const sourceEmissive = (material as THREE.MeshStandardMaterial).emissive
  return sourceEmissive?.isColor ? sourceEmissive.clone() : fallback
}

function createScreenGlassMaterial(sourceMaterial: THREE.Material) {
  const sourceOpacity = Math.min(1, Math.max(0, sourceMaterial.opacity || 1))

  return new MeshPhysicalMaterial({
    name: sourceMaterial.name,
    color: cloneSourceColor(sourceMaterial, 0xf8fafc),
    side: DoubleSide,
    transparent: true,
    opacity: Math.max(sourceOpacity, 0.24),
    roughness: 0.08,
    metalness: 0.02,
    transmission: 0.72,
    thickness: 1.1,
    ior: 1.62,
    reflectivity: 0.74,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    iridescence: 0.24,
    iridescenceIOR: 1.36,
    iridescenceThicknessRange: [120, 380],
    attenuationColor: 0x67e8f9,
    attenuationDistance: 1.9,
    emissive: 0x06263a,
    emissiveIntensity: 0.035,
    depthWrite: false,
    depthTest: true,
  })
}

function createScreenFrameMaterial(sourceMaterial: THREE.Material) {
  return new MeshPhysicalMaterial({
    name: sourceMaterial.name,
    color: cloneSourceColor(sourceMaterial, 0x160a3f),
    emissive: cloneSourceEmissive(sourceMaterial, 0x1e1b4b),
    emissiveIntensity: 0.58,
    side: DoubleSide,
    roughness: 0.16,
    metalness: 0.34,
    clearcoat: 0.78,
    clearcoatRoughness: 0.14,
    reflectivity: 0.52,
    transparent: sourceMaterial.transparent || sourceMaterial.opacity < 1,
    opacity: sourceMaterial.opacity,
    depthWrite: false,
    depthTest: true,
  })
}

function createPortalScreenMaterial(sourceMaterial: THREE.Material) {
  const material = isGlassSourceMaterial(sourceMaterial)
    ? createScreenGlassMaterial(sourceMaterial)
    : createScreenFrameMaterial(sourceMaterial)

  material.envMapIntensity = isGlassSourceMaterial(sourceMaterial) ? 1.15 : 0.65
  material.needsUpdate = true
  sourceMaterial.dispose()

  return material
}

function tuneScreenModel(model: THREE.Object3D) {
  model.traverse(item => {
    const mesh = item as THREE.Mesh
    if (!mesh.isMesh) return

    mesh.castShadow = false
    mesh.receiveShadow = false
    mesh.frustumCulled = false
    mesh.renderOrder = 12

    if (Array.isArray(mesh.material)) {
      mesh.material = mesh.material.map(material =>
        createPortalScreenMaterial(material),
      )
    } else if (mesh.material) {
      mesh.material = createPortalScreenMaterial(mesh.material)
    }
  })
}

function disposeMaterial(material: THREE.Material) {
  material.dispose()
}

export function disposeHomeIntroScreenModel(model: THREE.Object3D | null) {
  model?.traverse(item => {
    const mesh = item as THREE.Mesh
    if (!mesh.isMesh) return

    mesh.geometry?.dispose()

    const materials = Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material]

    materials.forEach(material => {
      if (material) disposeMaterial(material)
    })
  })
}

export async function loadHomeIntroScreenModelInstance(
  frameWidth: number,
  frameHeight: number,
) {
  const source = await loadSharedScreenModel()
  if (!source) return null

  const model = cloneScreenModel(source)
  fitScreenModel(model, frameWidth, frameHeight)
  tuneScreenModel(model)

  return model
}
