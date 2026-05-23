import * as THREE from 'three'

export type ProceduralModelViewerVariant = 'snuggaloid' | 'generic'

const viewerLighting = {
  snuggaloid: {
    exposure: 1.18,
    ambientIntensity: 0.54,
    hemisphereIntensity: 1.18,
    keyIntensity: 46,
    fillIntensity: 0.72,
    rimIntensity: 0.95,
    floorColor: 0xf472b6,
    floorOpacity: 0.2,
  },
  generic: {
    exposure: 1.42,
    ambientIntensity: 0.78,
    hemisphereIntensity: 1.64,
    keyIntensity: 82,
    fillIntensity: 1.12,
    rimIntensity: 1.85,
    floorColor: 0x38bdf8,
    floorOpacity: 0.24,
  },
} satisfies Record<
  ProceduralModelViewerVariant,
  {
    exposure: number
    ambientIntensity: number
    hemisphereIntensity: number
    keyIntensity: number
    fillIntensity: number
    rimIntensity: number
    floorColor: number
    floorOpacity: number
  }
>

export function getViewerToneMappingExposure(
  variant: ProceduralModelViewerVariant,
) {
  return viewerLighting[variant].exposure
}

export function configureViewerShadowMap(renderer: THREE.WebGLRenderer) {
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
}

export function addViewerLighting(
  scene: THREE.Scene,
  variant: ProceduralModelViewerVariant,
) {
  const lighting = viewerLighting[variant]

  scene.add(new THREE.AmbientLight(0xffffff, lighting.ambientIntensity))

  const hemisphereLight = new THREE.HemisphereLight(
    0xf8fafc,
    variant === 'snuggaloid' ? 0x25112d : 0x172554,
    lighting.hemisphereIntensity,
  )
  scene.add(hemisphereLight)

  const keyLight = new THREE.SpotLight(
    0xfff0c4,
    lighting.keyIntensity,
    28,
    0.5,
    0.58,
    1.1,
  )
  keyLight.position.set(4.8, 7.2, 5.8)
  keyLight.target.position.set(0, 0, 0)
  keyLight.castShadow = true
  keyLight.shadow.mapSize.set(1024, 1024)
  keyLight.shadow.bias = -0.00018
  keyLight.shadow.normalBias = 0.025
  keyLight.shadow.camera.near = 0.2
  keyLight.shadow.camera.far = 36
  scene.add(keyLight)
  scene.add(keyLight.target)

  const fillLight = new THREE.DirectionalLight(0xe0f2fe, lighting.fillIntensity)
  fillLight.position.set(-4.5, 2.6, 4.8)
  scene.add(fillLight)

  const rimLight = new THREE.DirectionalLight(
    variant === 'snuggaloid' ? 0xf0abfc : 0x93c5fd,
    lighting.rimIntensity,
  )
  rimLight.position.set(-5.2, 3.6, -4.8)
  scene.add(rimLight)

  const topLight = new THREE.PointLight(
    0xffffff,
    variant === 'generic' ? 18 : 8,
    8,
  )
  topLight.position.set(0, 3.2, 1.6)
  scene.add(topLight)
}

export function createViewerFloor(variant: ProceduralModelViewerVariant) {
  const lighting = viewerLighting[variant]
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(1, 96),
    new THREE.MeshStandardMaterial({
      color: lighting.floorColor,
      roughness: 0.92,
      metalness: 0,
      transparent: true,
      opacity: lighting.floorOpacity,
    }),
  )
  floor.rotation.x = -Math.PI / 2
  floor.receiveShadow = true
  return floor
}

export function positionViewerFloorForObject(
  floor: THREE.Mesh,
  object: THREE.Object3D,
) {
  const bounds = new THREE.Box3().setFromObject(object)
  if (bounds.isEmpty()) return

  const size = bounds.getSize(new THREE.Vector3())
  const maxDimension = Math.max(size.x, size.y, size.z) || 1
  floor.position.y = bounds.min.y - maxDimension * 0.025
  floor.scale.setScalar(maxDimension * 1.28)
}
