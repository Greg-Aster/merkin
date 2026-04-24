<script lang="ts">
import { T } from '@threlte/core'
import { setContext } from 'svelte'
import { writable } from 'svelte/store'
import * as THREE from 'three'
import AdaptivePointLight from '../components/AdaptivePointLight.svelte'
import HeroProp from '../components/HeroProp.svelte'
import ProceduralMesh from '../components/ProceduralMesh.svelte'
import EditorPrefabNode from './EditorPrefabNode.svelte'
import { EDITOR_MATERIAL_OVERRIDE_CONTEXT } from './editorMaterialContext'
import type { EditorMaterialData, EditorSceneNode } from './editorTypes'

export let node: EditorSceneNode
export let editorEnabled = false

$: assetNode = node.kind === 'asset' ? node.asset ?? null : null
$: prefabNode = node.kind === 'prefab' ? node.prefab ?? null : null
$: primitiveNode = node.kind === 'primitive' ? node.primitive ?? null : null
$: lightNode = node.kind === 'light' ? node.light ?? null : null
$: renderKey = `${node.id}:${node.kind}:${assetNode?.url ?? prefabNode?.type ?? primitiveNode?.geometry ?? lightNode?.color ?? 'group'}`

const SOLITUDE_RUIN_BASE_MATERIAL: EditorMaterialData = {
  color: '#5f6874',
  emissive: '#171b22',
  emissiveIntensity: 0,
  metalness: 0.04,
  roughness: 0.94,
  envMapIntensity: 0.22,
  transmission: 0,
  clearcoat: 0,
  clearcoatRoughness: 1,
  thickness: 0,
  reflectivity: 0.18,
}

const SOLITUDE_FOUNDATION_MATERIAL: EditorMaterialData = {
  ...SOLITUDE_RUIN_BASE_MATERIAL,
  color: '#555e69',
  roughness: 0.97,
  envMapIntensity: 0.18,
}

const materialOverrideStore = writable<EditorMaterialData | null>(null)
setContext(EDITOR_MATERIAL_OVERRIDE_CONTEXT, materialOverrideStore)

function mergeMaterialOverrides(
  base: EditorMaterialData | null,
  override: EditorMaterialData | null | undefined,
): EditorMaterialData | null {
  if (!base && !override) return null
  return {
    ...(base ?? {}),
    ...(override ?? {}),
  }
}

function getSolitudeAssetMaterial(
  node: EditorSceneNode,
): EditorMaterialData | null {
  if (node.kind !== 'asset' || !node.asset?.url) return null

  if (
    node.id === 'solitude-ground-plateau' ||
    node.id === 'solitude-ground-dais'
  ) {
    return SOLITUDE_FOUNDATION_MATERIAL
  }

  if (
    node.id.startsWith('solitude-pillar-') ||
    node.id.startsWith('solitude-ring-fragment-')
  ) {
    return SOLITUDE_RUIN_BASE_MATERIAL
  }

  return null
}

function getPrimitiveFallbackMaterial(
  node: EditorSceneNode,
): EditorMaterialData | null {
  if (!node.primitive) return node.material ?? null

  return {
    color: node.material?.color ?? node.primitive.color,
    mapUrl: node.material?.mapUrl,
    emissive: node.material?.emissive ?? node.primitive.emissive,
    emissiveMapUrl: node.material?.emissiveMapUrl,
    emissiveIntensity:
      node.material?.emissiveIntensity ?? node.primitive.emissiveIntensity,
    metalness: node.material?.metalness ?? node.primitive.metalness,
    metalnessMapUrl: node.material?.metalnessMapUrl,
    roughness: node.material?.roughness ?? node.primitive.roughness,
    roughnessMapUrl: node.material?.roughnessMapUrl,
    normalMapUrl: node.material?.normalMapUrl,
    alphaMapUrl: node.material?.alphaMapUrl,
    opacity: node.material?.opacity ?? node.primitive.opacity,
    transparent: node.material?.transparent ?? node.primitive.transparent,
    wireframe: node.material?.wireframe,
    doubleSided: node.material?.doubleSided,
    flatShading: node.material?.flatShading,
    envMapIntensity: node.material?.envMapIntensity,
    transmission: node.material?.transmission,
    ior: node.material?.ior,
    clearcoat: node.material?.clearcoat,
    clearcoatRoughness: node.material?.clearcoatRoughness,
    thickness: node.material?.thickness,
    reflectivity: node.material?.reflectivity,
  }
}

$: materialOverrideStore.set(
  primitiveNode
    ? getPrimitiveFallbackMaterial(node)
    : mergeMaterialOverrides(
        getSolitudeAssetMaterial(node),
        node.material ?? null,
      ),
)
</script>

{#key renderKey}
  {#if assetNode}
    <HeroProp url={assetNode.url} />
  {:else if prefabNode}
    <EditorPrefabNode prefab={prefabNode} />
  {:else if primitiveNode}
    <ProceduralMesh
      name={node.name}
      userData={node.id === 'solitude-ground-plateau' || node.id === 'solitude-ground-dais'
        ? { renderStyleSkip: true }
        : {}}
      geometry={primitiveNode.geometry}
      args={primitiveNode.args}
      position={[0, 0, 0]}
      rotation={[0, 0, 0]}
      scale={[1, 1, 1]}
      color={primitiveNode.color}
      emissive={primitiveNode.emissive}
      emissiveIntensity={primitiveNode.emissiveIntensity ?? 0}
      metalness={primitiveNode.metalness ?? 0.7}
      roughness={primitiveNode.roughness ?? 0.3}
      transparent={primitiveNode.transparent ?? false}
      opacity={primitiveNode.opacity ?? 1}
    />
  {:else if lightNode}
    <AdaptivePointLight
      position={[0, 0, 0]}
      color={lightNode.color}
      intensity={lightNode.intensity}
      distance={lightNode.distance}
      decay={lightNode.decay}
    />
    <ProceduralMesh
      geometry="icosahedron"
      args={[0.2, 0]}
      position={[0, 0, 0]}
      rotation={[0, 0, 0]}
      scale={[1, 1, 1]}
      color={lightNode.color}
      emissive={lightNode.color}
      emissiveIntensity={0.7}
      metalness={1}
      roughness={0.05}
    />
  {:else if node.kind === 'group' && editorEnabled}
    <ProceduralMesh
      geometry="octahedron"
      args={[0.18, 0]}
      position={[0, 0, 0]}
      rotation={[0, 0, 0]}
      scale={[1, 1, 1]}
      color="#a7d9ff"
      emissive="#7ecbff"
      emissiveIntensity={0.35}
      metalness={1}
      roughness={0.08}
      transparent={true}
      opacity={0.82}
    />
    <ProceduralMesh
      geometry="torus"
      args={[0.42, 0.015, 10, 20]}
      position={[0, 0, 0]}
      rotation={[Math.PI / 2, 0, 0]}
      scale={[1, 1, 1]}
      color="#7ecbff"
      emissive="#7ecbff"
      emissiveIntensity={0.2}
      metalness={1}
      roughness={0.04}
      transparent={true}
      opacity={0.45}
    />
  {/if}
{/key}
