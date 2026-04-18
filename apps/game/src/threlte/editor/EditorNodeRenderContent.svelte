<script lang="ts">
  import { setContext } from 'svelte'
  import { writable } from 'svelte/store'
  import * as THREE from 'three'
  import { T } from '@threlte/core'
  import HeroProp from '../components/HeroProp.svelte'
  import ProceduralMesh from '../components/ProceduralMesh.svelte'
  import EditorPrefabNode from './EditorPrefabNode.svelte'
  import { EDITOR_MATERIAL_OVERRIDE_CONTEXT } from './editorMaterialContext'
  import type { EditorMaterialData, EditorSceneNode } from './editorTypes'

  export let node: EditorSceneNode
  export let editorEnabled = false

  const materialOverrideStore = writable<EditorMaterialData | null>(null)
  setContext(EDITOR_MATERIAL_OVERRIDE_CONTEXT, materialOverrideStore)

  function getPrimitiveFallbackMaterial(node: EditorSceneNode): EditorMaterialData | null {
    if (!node.primitive) return node.material ?? null

    return {
      color: node.material?.color ?? node.primitive.color,
      mapUrl: node.material?.mapUrl,
      emissive: node.material?.emissive ?? node.primitive.emissive,
      emissiveMapUrl: node.material?.emissiveMapUrl,
      emissiveIntensity: node.material?.emissiveIntensity ?? node.primitive.emissiveIntensity,
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

  $: materialOverrideStore.set(node.kind === 'primitive' ? getPrimitiveFallbackMaterial(node) : node.material ?? null)
</script>

{#if node.kind === 'asset' && node.asset}
  <HeroProp url={node.asset.url} />
{:else if node.kind === 'prefab' && node.prefab}
  <EditorPrefabNode prefab={node.prefab} />
{:else if node.kind === 'primitive' && node.primitive}
  <ProceduralMesh
    geometry={node.primitive.geometry}
    args={node.primitive.args}
    position={[0, 0, 0]}
    rotation={[0, 0, 0]}
    scale={[1, 1, 1]}
    color={node.primitive.color}
    emissive={node.primitive.emissive}
    emissiveIntensity={node.primitive.emissiveIntensity ?? 0}
    metalness={node.primitive.metalness ?? 0.7}
    roughness={node.primitive.roughness ?? 0.3}
    transparent={node.primitive.transparent ?? false}
    opacity={node.primitive.opacity ?? 1}
  />
{:else if node.kind === 'light' && node.light}
  <T.PointLight
    position={[0, 0, 0]}
    color={node.light.color}
    intensity={node.light.intensity}
    distance={node.light.distance}
    decay={node.light.decay}
  />
  <ProceduralMesh
    geometry="icosahedron"
    args={[0.2, 0]}
    position={[0, 0, 0]}
    rotation={[0, 0, 0]}
    scale={[1, 1, 1]}
    color={node.light.color}
    emissive={node.light.color}
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
