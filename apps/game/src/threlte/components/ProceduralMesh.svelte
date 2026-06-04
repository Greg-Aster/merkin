<script lang="ts">
import { T } from '@threlte/core'
import { getContext, onDestroy } from 'svelte'
import * as THREE from 'three'
import type {
  RenderLightingParticipation,
  RenderShadowParticipation,
} from '../engine/types'
import {
  EDITOR_MATERIAL_OVERRIDE_CONTEXT,
  type EditorMaterialOverrideStore,
} from '../utils/materialOverrideContext'

export type ProceduralGeometryKind =
  | 'box'
  | 'cylinder'
  | 'octahedron'
  | 'tetrahedron'
  | 'icosahedron'
  | 'dodecahedron'
  | 'torus'

export let geometry: ProceduralGeometryKind = 'box'
export let args: number[] = [1, 1, 1]
export let position: [number, number, number] = [0, 0, 0]
export let rotation: [number, number, number] = [0, 0, 0]
export let scale: [number, number, number] = [1, 1, 1]
export let color: string = '#ffffff'
export let emissive: string | null = null
export let emissiveIntensity = 0
export let metalness = 0.5
export let roughness = 0.5
export let transparent = false
export let opacity = 1
export let transmission = 0
export let ior = 1.5
export let clearcoat = 0
export let clearcoatRoughness = 0
export let thickness = 0
export let reflectivity = 0.5
export let name = ''
export let userData: Record<string, any> = {}
export let lighting: RenderLightingParticipation = 'lit'
export let castShadow: RenderShadowParticipation = 'auto'
export let receiveShadow: RenderShadowParticipation = 'auto'

type OverrideTextureSet = {
  map: THREE.Texture | null
  normalMap: THREE.Texture | null
  roughnessMap: THREE.Texture | null
  metalnessMap: THREE.Texture | null
  emissiveMap: THREE.Texture | null
  alphaMap: THREE.Texture | null
}

const textureLoader = new THREE.TextureLoader()
let textureLoadToken = 0
let overrideTextures: OverrideTextureSet = {
  map: null,
  normalMap: null,
  roughnessMap: null,
  metalnessMap: null,
  emissiveMap: null,
  alphaMap: null,
}

function disposeTexture(texture: THREE.Texture | null) {
  texture?.dispose()
}

function disposeOverrideTextures(textures: OverrideTextureSet) {
  disposeTexture(textures.map)
  disposeTexture(textures.normalMap)
  disposeTexture(textures.roughnessMap)
  disposeTexture(textures.metalnessMap)
  disposeTexture(textures.emissiveMap)
  disposeTexture(textures.alphaMap)
}

async function loadOverrideTexture(
  url: string | undefined,
  colorTexture = false,
) {
  if (!url) return null

  const texture = await textureLoader.loadAsync(url)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  if (colorTexture) {
    texture.colorSpace = THREE.SRGBColorSpace
  }
  texture.needsUpdate = true
  return texture
}

async function syncOverrideTextures() {
  const token = ++textureLoadToken

  const nextTextures: OverrideTextureSet = {
    map: await loadOverrideTexture(editorMaterialOverride?.mapUrl, true),
    normalMap: await loadOverrideTexture(editorMaterialOverride?.normalMapUrl),
    roughnessMap: await loadOverrideTexture(
      editorMaterialOverride?.roughnessMapUrl,
    ),
    metalnessMap: await loadOverrideTexture(
      editorMaterialOverride?.metalnessMapUrl,
    ),
    emissiveMap: await loadOverrideTexture(
      editorMaterialOverride?.emissiveMapUrl,
      true,
    ),
    alphaMap: await loadOverrideTexture(editorMaterialOverride?.alphaMapUrl),
  }

  if (token !== textureLoadToken) {
    disposeOverrideTextures(nextTextures)
    return
  }

  disposeOverrideTextures(overrideTextures)
  overrideTextures = nextTextures
}

let editorMaterialOverride = null

const editorMaterialOverrideStore = getContext<
  EditorMaterialOverrideStore | undefined
>(EDITOR_MATERIAL_OVERRIDE_CONTEXT)
const unsubscribe = editorMaterialOverrideStore?.subscribe(value => {
  editorMaterialOverride = value
})

$: resolvedColor = editorMaterialOverride?.color ?? color
$: resolvedEmissive =
  editorMaterialOverride?.emissive ?? emissive ?? resolvedColor
$: resolvedEmissiveIntensity =
  editorMaterialOverride?.emissiveIntensity ?? emissiveIntensity
$: resolvedMetalness = editorMaterialOverride?.metalness ?? metalness
$: resolvedRoughness = editorMaterialOverride?.roughness ?? roughness
$: resolvedOpacity = editorMaterialOverride?.opacity ?? opacity
$: resolvedTransparent =
  editorMaterialOverride?.transparent ?? transparent ?? resolvedOpacity < 0.999
$: resolvedWireframe = editorMaterialOverride?.wireframe ?? false
$: resolvedSide = editorMaterialOverride?.doubleSided
  ? THREE.DoubleSide
  : THREE.FrontSide
$: resolvedFlatShading = editorMaterialOverride?.flatShading ?? false
$: resolvedEnvMapIntensity = editorMaterialOverride?.envMapIntensity ?? 1
$: resolvedTransmission = editorMaterialOverride?.transmission ?? transmission
$: resolvedIor = editorMaterialOverride?.ior ?? ior
$: resolvedClearcoat = editorMaterialOverride?.clearcoat ?? clearcoat
$: resolvedClearcoatRoughness =
  editorMaterialOverride?.clearcoatRoughness ?? clearcoatRoughness
$: resolvedThickness = editorMaterialOverride?.thickness ?? thickness
$: resolvedReflectivity = editorMaterialOverride?.reflectivity ?? reflectivity
$: needsPhysicalMaterial =
  resolvedTransmission > 0.001 ||
  resolvedClearcoat > 0.001 ||
  resolvedThickness > 0.001 ||
  Math.abs(resolvedIor - 1.5) > 0.001 ||
  Math.abs(resolvedReflectivity - 0.5) > 0.001
$: participatesInLighting = lighting === 'lit'
$: resolvedCastShadow =
  participatesInLighting && castShadow !== 'disabled'
$: resolvedReceiveShadow =
  participatesInLighting && receiveShadow !== 'disabled'
$: void syncOverrideTextures()

onDestroy(() => {
  textureLoadToken += 1
  disposeOverrideTextures(overrideTextures)
  unsubscribe?.()
})
</script>

<T.Mesh
  {name}
  {userData}
  {position}
  {rotation}
  {scale}
  castShadow={resolvedCastShadow}
  receiveShadow={resolvedReceiveShadow}
>
  {#if geometry === 'box'}
    <T.BoxGeometry args={args} />
  {:else if geometry === 'cylinder'}
    <T.CylinderGeometry args={args} />
  {:else if geometry === 'octahedron'}
    <T.OctahedronGeometry args={args} />
  {:else if geometry === 'tetrahedron'}
    <T.TetrahedronGeometry args={args} />
  {:else if geometry === 'icosahedron'}
    <T.IcosahedronGeometry args={args} />
  {:else if geometry === 'dodecahedron'}
    <T.DodecahedronGeometry args={args} />
  {:else}
    <T.TorusGeometry args={args} />
  {/if}

  {#if !participatesInLighting}
    <T.MeshBasicMaterial
      color={resolvedEmissive}
      transparent={resolvedTransparent}
      opacity={resolvedOpacity}
      wireframe={resolvedWireframe}
      side={resolvedSide}
      map={overrideTextures.map}
      alphaMap={overrideTextures.alphaMap}
    />
  {:else if needsPhysicalMaterial}
    <T.MeshPhysicalMaterial
      color={resolvedColor}
      emissive={resolvedEmissive}
      emissiveIntensity={resolvedEmissiveIntensity}
      metalness={resolvedMetalness}
      metalnessMap={overrideTextures.metalnessMap}
      roughness={resolvedRoughness}
      roughnessMap={overrideTextures.roughnessMap}
      transparent={resolvedTransparent}
      opacity={resolvedOpacity}
      wireframe={resolvedWireframe}
      side={resolvedSide}
      flatShading={resolvedFlatShading}
      envMapIntensity={resolvedEnvMapIntensity}
      map={overrideTextures.map}
      normalMap={overrideTextures.normalMap}
      emissiveMap={overrideTextures.emissiveMap}
      alphaMap={overrideTextures.alphaMap}
      transmission={resolvedTransmission}
      ior={resolvedIor}
      clearcoat={resolvedClearcoat}
      clearcoatRoughness={resolvedClearcoatRoughness}
      thickness={resolvedThickness}
      reflectivity={resolvedReflectivity}
    />
  {:else}
    <T.MeshStandardMaterial
      color={resolvedColor}
      emissive={resolvedEmissive}
      emissiveIntensity={resolvedEmissiveIntensity}
      metalness={resolvedMetalness}
      metalnessMap={overrideTextures.metalnessMap}
      roughness={resolvedRoughness}
      roughnessMap={overrideTextures.roughnessMap}
      transparent={resolvedTransparent}
      opacity={resolvedOpacity}
      wireframe={resolvedWireframe}
      side={resolvedSide}
      flatShading={resolvedFlatShading}
      envMapIntensity={resolvedEnvMapIntensity}
      map={overrideTextures.map}
      normalMap={overrideTextures.normalMap}
      emissiveMap={overrideTextures.emissiveMap}
      alphaMap={overrideTextures.alphaMap}
    />
  {/if}
</T.Mesh>
