import {
  Box3,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  Shape,
  ShapeGeometry,
  Vector3,
} from 'three'
import type * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

const screenModelSrc = '/assets/3D/screen.glb'
const screenDepthSurfaceOffsetZ = -0.025
const screenDepthCornerRadius = 0.22
const screenDepthRenderOrder = 7
const screenGltfLoader = new GLTFLoader()
const screenDepthGeometryCache = new Map<string, ShapeGeometry>()
const screenDepthMaterial = new MeshBasicMaterial({
  colorWrite: false,
  depthTest: true,
  depthWrite: true,
  side: DoubleSide,
})
let sharedScreenModelPromise: Promise<THREE.Object3D | null> | null = null

function loadSharedScreenModel() {
  sharedScreenModelPromise ??= screenGltfLoader
    .loadAsync(screenModelSrc)
    .then(gltf => gltf.scene ?? gltf.scenes?.[0] ?? null)
    .catch(error => {
      console.warn('Failed to load home intro screen model:', error)
      return null
    })

  return sharedScreenModelPromise
}

function cloneScreenModel(source: THREE.Object3D) {
  return source.clone(true)
}

function createRoundedRectangleShape(
  width: number,
  height: number,
  radius: number,
) {
  const shape = new Shape()
  const left = -width / 2
  const right = width / 2
  const bottom = -height / 2
  const top = height / 2
  const cornerRadius = Math.min(radius, width / 2, height / 2)

  shape.moveTo(left + cornerRadius, bottom)
  shape.lineTo(right - cornerRadius, bottom)
  shape.quadraticCurveTo(right, bottom, right, bottom + cornerRadius)
  shape.lineTo(right, top - cornerRadius)
  shape.quadraticCurveTo(right, top, right - cornerRadius, top)
  shape.lineTo(left + cornerRadius, top)
  shape.quadraticCurveTo(left, top, left, top - cornerRadius)
  shape.lineTo(left, bottom + cornerRadius)
  shape.quadraticCurveTo(left, bottom, left + cornerRadius, bottom)

  return shape
}

function getScreenDepthGeometry(width: number, height: number) {
  const key = `${width}:${height}`
  const cached = screenDepthGeometryCache.get(key)
  if (cached) return cached

  const geometry = new ShapeGeometry(
    createRoundedRectangleShape(width, height, screenDepthCornerRadius),
  )
  screenDepthGeometryCache.set(key, geometry)
  return geometry
}

function wrapScreenModelWithDepthSurface(
  model: THREE.Object3D,
  frameWidth: number,
  frameHeight: number,
) {
  const depthSurface = new Mesh(
    getScreenDepthGeometry(frameWidth, frameHeight),
    screenDepthMaterial,
  )
  depthSurface.position.z = screenDepthSurfaceOffsetZ
  depthSurface.renderOrder = screenDepthRenderOrder

  const instance = new Group()
  instance.add(model)
  instance.add(depthSurface)
  return instance
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
    mesh.renderOrder = 12
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

  return wrapScreenModelWithDepthSurface(model, frameWidth, frameHeight)
}
