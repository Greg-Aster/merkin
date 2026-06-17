<script lang="ts">
import { T, useTask } from '@threlte/core'
import { onMount } from 'svelte'
import {
  Box3,
  BufferAttribute,
  ClampToEdgeWrapping,
  FrontSide,
  LinearFilter,
  SRGBColorSpace,
  type Texture,
  TextureLoader,
  Vector3,
} from 'three'
import type * as THREE from 'three'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

type SceneQuality = 'high' | 'balanced' | 'lean'
type AnimatedAtlasUniforms = {
  animatedAtlasStrength: { value: number }
  animatedAtlasBaseIntensity: { value: number }
}

export let sceneQuality: SceneQuality = 'high'
export let animatedAtlasSrc = ''
export let animatedAtlasColumns = 6
export let animatedAtlasRows = 4
export let animatedAtlasFrames = 23
export let animatedAtlasFps = 3
export let animatedAtlasIntensity = 0.5
export let animatedAtlasBaseIntensity = 1
export let animatedAtlasUvScaleX = 1
export let animatedAtlasUvScaleY = 1
export let onReady: (() => void) | undefined

let logoModel: THREE.Object3D | null = null
let mounted = false
let activeLogoModelSrc = ''
let pendingLogoModelSrc = ''
let atlasTexture: Texture | null = null
let activeAtlasSrc = ''
let pendingAtlasSrc = ''
let atlasElapsed = 0
let activeAtlasFrame = -1
let readyNotified = false
let uvRevisionKey = ''

const gltfLoader = new GLTFLoader()
gltfLoader.setMeshoptDecoder(MeshoptDecoder)
const textureLoader = new TextureLoader()
const animatedAtlasUniforms = new WeakMap<
  THREE.MeshStandardMaterial,
  AnimatedAtlasUniforms
>()

const logoBounds = new Box3()
const logoCenter = new Vector3()
const logoSize = new Vector3()
const logoTargetSize = new Vector3(4.68, 2.24, 1.44)
const uvBounds = new Box3()
const logoModelSrc = '/assets/3D/Hy3D_textured_00005_optimized.glb'
const importedLogoTextureChannels = [
  'map',
  'alphaMap',
  'aoMap',
  'bumpMap',
  'displacementMap',
  'emissiveMap',
  'envMap',
  'lightMap',
  'metalnessMap',
  'normalMap',
  'roughnessMap',
] as const
type LogoMaterialTextureChannel = (typeof importedLogoTextureChannels)[number]

function disposeObjectResources(object: THREE.Object3D) {
  object.traverse(child => {
    const mesh = child as THREE.Mesh
    const geometry = mesh.geometry
    const material = mesh.material

    geometry?.dispose?.()

    const disposeMaterialTextures = (item: THREE.Material) => {
      Object.values(item).forEach(value => {
        const texture = value as THREE.Texture | undefined
        if (texture?.isTexture && texture !== atlasTexture) {
          texture.dispose()
        }
      })
    }

    if (Array.isArray(material)) {
      material.forEach(item => {
        disposeMaterialTextures(item)
        item.dispose()
      })
    } else {
      material && disposeMaterialTextures(material)
      material?.dispose?.()
    }
  })
}

function disposeLogoModel() {
  if (!logoModel) return

  logoModel.parent?.remove(logoModel)
  disposeObjectResources(logoModel)
  logoModel = null
}

function disposeAtlasTexture() {
  atlasTexture?.dispose()
  atlasTexture = null
  activeAtlasSrc = ''
  activeAtlasFrame = -1
}

function notifyReady() {
  if (readyNotified) return

  readyNotified = true
  onReady?.()
}

function fitLogoModel(model: THREE.Object3D) {
  model.updateMatrixWorld(true)
  logoBounds.setFromObject(model)
  if (logoBounds.isEmpty()) return

  logoBounds.getCenter(logoCenter)
  logoBounds.getSize(logoSize)

  const scale = Math.min(
    logoTargetSize.x / Math.max(logoSize.x, 0.001),
    logoTargetSize.y / Math.max(logoSize.y, 0.001),
    logoTargetSize.z / Math.max(logoSize.z, 0.001),
  )

  model.scale.setScalar(scale)
  model.position.set(
    -logoCenter.x * scale,
    -logoCenter.y * scale,
    -logoCenter.z * scale,
  )
}

function ensurePlanarUvAttribute(mesh: THREE.Mesh) {
  const geometry = mesh.geometry
  const position = geometry?.getAttribute('position') as
    | THREE.BufferAttribute
    | undefined
  if (!geometry || !position) return

  geometry.computeBoundingBox()
  if (!geometry.boundingBox) return

  uvBounds.copy(geometry.boundingBox)
  const sizeX = Math.max(uvBounds.max.x - uvBounds.min.x, 0.001)
  const sizeY = Math.max(uvBounds.max.y - uvBounds.min.y, 0.001)
  const uvs = new Float32Array(position.count * 2)

  for (let index = 0; index < position.count; index += 1) {
    const baseU = (position.getX(index) - uvBounds.min.x) / sizeX
    const baseV = (position.getY(index) - uvBounds.min.y) / sizeY

    uvs[index * 2] =
      (baseU - 0.5) * animatedAtlasUvScaleX + 0.5
    uvs[index * 2 + 1] =
      (baseV - 0.5) * animatedAtlasUvScaleY + 0.5
  }

  geometry.setAttribute('uv', new BufferAttribute(uvs, 2))
  geometry.getAttribute('uv').needsUpdate = true
}

function getAnimatedAtlasUniforms(
  material: THREE.MeshStandardMaterial,
): AnimatedAtlasUniforms {
  let uniforms = animatedAtlasUniforms.get(material)
  if (!uniforms) {
    uniforms = {
      animatedAtlasStrength: { value: animatedAtlasIntensity },
      animatedAtlasBaseIntensity: { value: animatedAtlasBaseIntensity },
    }
    animatedAtlasUniforms.set(material, uniforms)
  }

  return uniforms
}

function installAnimatedAtlasShader(material: THREE.MeshStandardMaterial) {
  if (material.userData.homeIntroAnimatedAtlasShader) return

  const previousOnBeforeCompile = material.onBeforeCompile.bind(material)
  const previousCustomProgramCacheKey =
    material.customProgramCacheKey.bind(material)
  const uniforms = getAnimatedAtlasUniforms(material)

  material.onBeforeCompile = (shader, renderer) => {
    previousOnBeforeCompile(shader, renderer)
    shader.uniforms.animatedAtlasStrength = uniforms.animatedAtlasStrength
    shader.uniforms.animatedAtlasBaseIntensity =
      uniforms.animatedAtlasBaseIntensity
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        '#include <common>\nuniform float animatedAtlasStrength;\nuniform float animatedAtlasBaseIntensity;',
      )
      .replace(
        '#include <map_fragment>',
        `
#ifdef USE_MAP
  vec4 sampledDiffuseColor = texture2D( map, vMapUv );
  #ifdef DECODE_VIDEO_TEXTURE
    sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
  #endif
  float animatedAtlasMix = clamp(
    sampledDiffuseColor.a * animatedAtlasStrength,
    0.0,
    1.0
  );
  diffuseColor.rgb = mix(
    diffuseColor.rgb,
    sampledDiffuseColor.rgb,
    animatedAtlasMix
  );
#endif
`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `
#include <emissivemap_fragment>
#ifdef USE_MAP
  vec4 sampledEmissiveColor = texture2D( map, vMapUv );
  #ifdef DECODE_VIDEO_TEXTURE
    sampledEmissiveColor = sRGBTransferEOTF( sampledEmissiveColor );
  #endif
  float animatedAtlasEmissiveMix = clamp(
    sampledEmissiveColor.a * animatedAtlasStrength,
    0.0,
    1.0
  );
  totalEmissiveRadiance = mix(
    totalEmissiveRadiance,
    sampledEmissiveColor.rgb * animatedAtlasBaseIntensity,
    animatedAtlasEmissiveMix
  );
#endif
`,
      )
  }

  material.customProgramCacheKey = () =>
    `${previousCustomProgramCacheKey()}:home-intro-animated-atlas-projection`
  material.userData.homeIntroAnimatedAtlasShader = true
}

function stripImportedLogoMaterial(material: THREE.MeshStandardMaterial) {
  const materialTextures = material as unknown as Record<
    LogoMaterialTextureChannel,
    Texture | null
  >

  importedLogoTextureChannels.forEach(channel => {
    const texture = materialTextures[channel]
    if (texture && texture !== atlasTexture) {
      texture.dispose()
    }
    materialTextures[channel] = null
  })

  material.color.setScalar(0)
  material.emissive.set(0, 0, 0)
  material.emissiveIntensity = 0
  material.metalness = 0
  material.roughness = sceneQuality === 'lean' ? 0.86 : 0.78
  material.envMapIntensity = 0
  material.toneMapped = false
  material.side = FrontSide
  material.transparent = false
  material.opacity = 1
  material.alphaTest = 0
  material.depthWrite = true
  material.depthTest = true
  material.needsUpdate = true
}

function tuneLogoModel(model: THREE.Object3D) {
  model.traverse(child => {
    const mesh = child as THREE.Mesh
    if (!mesh.isMesh) return

    mesh.castShadow = false
    mesh.receiveShadow = false
    mesh.frustumCulled = false

    const materials = Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material]

    materials.forEach(item => {
      const material = item as THREE.MeshStandardMaterial | undefined
      if (!material?.isMeshStandardMaterial) return
      stripImportedLogoMaterial(material)
    })
  })
}

function syncAtlasFrame(frame: number) {
  if (!atlasTexture || frame === activeAtlasFrame) return

  const clampedFrame = Math.max(0, Math.min(animatedAtlasFrames - 1, frame))
  const column = clampedFrame % animatedAtlasColumns
  const row = Math.floor(clampedFrame / animatedAtlasColumns)

  atlasTexture.repeat.set(1 / animatedAtlasColumns, 1 / animatedAtlasRows)
  atlasTexture.offset.set(
    column / animatedAtlasColumns,
    1 - (row + 1) / animatedAtlasRows,
  )
  atlasTexture.updateMatrix()
  activeAtlasFrame = clampedFrame
}

function configureAtlasTexture(texture: Texture) {
  texture.colorSpace = SRGBColorSpace
  texture.generateMipmaps = false
  texture.minFilter = LinearFilter
  texture.magFilter = LinearFilter
  texture.wrapS = ClampToEdgeWrapping
  texture.wrapT = ClampToEdgeWrapping
  texture.needsUpdate = true
}

function applyAnimatedAtlasToModel() {
  if (!logoModel || !atlasTexture) return

  uvRevisionKey = [
    animatedAtlasIntensity,
    animatedAtlasBaseIntensity,
    animatedAtlasUvScaleX,
    animatedAtlasUvScaleY,
  ].join(':')

  logoModel.traverse(child => {
    const mesh = child as THREE.Mesh
    if (!mesh.isMesh) return

    ensurePlanarUvAttribute(mesh)
    const materials = Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material]

    materials.forEach(item => {
      const material = item as THREE.MeshStandardMaterial | undefined
      if (!material?.isMeshStandardMaterial) return

      stripImportedLogoMaterial(material)
      const uniforms = getAnimatedAtlasUniforms(material)
      uniforms.animatedAtlasStrength.value = animatedAtlasIntensity
      uniforms.animatedAtlasBaseIntensity.value = animatedAtlasBaseIntensity

      installAnimatedAtlasShader(material)
      material.map = atlasTexture
      material.emissiveMap = null
      material.emissive.set(0, 0, 0)
      material.emissiveIntensity = 1
      material.map.colorSpace = SRGBColorSpace
      material.map.anisotropy = sceneQuality === 'high' ? 4 : 2
      material.map.generateMipmaps = false
      material.map.minFilter = LinearFilter
      material.map.magFilter = LinearFilter
      material.needsUpdate = true
    })
  })
}

function loadAnimatedAtlas(sourceUrl: string) {
  pendingAtlasSrc = sourceUrl

  textureLoader.load(
    sourceUrl,
    texture => {
      if (!mounted || pendingAtlasSrc !== sourceUrl) {
        texture.dispose()
        return
      }

      disposeAtlasTexture()
      configureAtlasTexture(texture)
      atlasTexture = texture
      activeAtlasSrc = sourceUrl
      pendingAtlasSrc = ''
      atlasElapsed = 0
      syncAtlasFrame(0)
      applyAnimatedAtlasToModel()
    },
    undefined,
    () => {
      if (pendingAtlasSrc === sourceUrl) pendingAtlasSrc = ''
    },
  )
}

async function loadLogoModel(sourceUrl: string) {
  pendingLogoModelSrc = sourceUrl

  try {
    const gltf = await gltfLoader.loadAsync(sourceUrl)
    const model = gltf.scene ?? gltf.scenes?.[0]
    if (!model) {
      if (pendingLogoModelSrc === sourceUrl) pendingLogoModelSrc = ''
      return
    }

    if (!mounted || pendingLogoModelSrc !== sourceUrl) {
      disposeObjectResources(model)
      return
    }

    disposeLogoModel()
    fitLogoModel(model)
    tuneLogoModel(model)
    logoModel = model
    activeLogoModelSrc = sourceUrl
    pendingLogoModelSrc = ''
    applyAnimatedAtlasToModel()
    notifyReady()
  } catch (error) {
    if (pendingLogoModelSrc === sourceUrl) pendingLogoModelSrc = ''
    console.error('Failed to load portal logo mesh:', error)
  }
}

onMount(() => {
  mounted = true

  return () => {
    mounted = false
    disposeLogoModel()
    disposeAtlasTexture()
  }
})

$: if (
  mounted &&
  logoModelSrc !== activeLogoModelSrc &&
  logoModelSrc !== pendingLogoModelSrc
) {
  void loadLogoModel(logoModelSrc)
}

$: if (
  mounted &&
  animatedAtlasSrc &&
  animatedAtlasSrc !== activeAtlasSrc &&
  animatedAtlasSrc !== pendingAtlasSrc
) {
  void loadAnimatedAtlas(animatedAtlasSrc)
}

$: if (mounted && logoModel && atlasTexture) {
  const nextUvRevisionKey = [
    animatedAtlasIntensity,
    animatedAtlasBaseIntensity,
    animatedAtlasUvScaleX,
    animatedAtlasUvScaleY,
  ].join(':')

  if (nextUvRevisionKey !== uvRevisionKey) {
    applyAnimatedAtlasToModel()
  }
}

useTask(delta => {
  if (!atlasTexture || animatedAtlasFrames <= 1 || animatedAtlasFps <= 0) {
    return
  }

  atlasElapsed += delta
  syncAtlasFrame(
    Math.floor(atlasElapsed * animatedAtlasFps) % animatedAtlasFrames,
  )
})
</script>

{#if logoModel}
	<T is={logoModel} />
{/if}
