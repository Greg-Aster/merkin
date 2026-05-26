import {
  Box3,
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

function tuneScreenModel(model: THREE.Object3D) {
  model.traverse(item => {
    const mesh = item as THREE.Mesh
    if (!mesh.isMesh) return

    mesh.castShadow = false
    mesh.receiveShadow = false
    mesh.frustumCulled = false
    mesh.renderOrder = 12
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
