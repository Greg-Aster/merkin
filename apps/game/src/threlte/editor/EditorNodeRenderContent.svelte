<script lang="ts">
import { T } from '@threlte/core'
import { setContext } from 'svelte'
import { writable } from 'svelte/store'
import * as THREE from 'three'
import HeroProp from '../components/HeroProp.svelte'
import ProceduralMesh from '../components/ProceduralMesh.svelte'
import { getSceneNodeMeshRenderSource } from '../engine/actorRenderSource'
import { resolveSceneFireflyLighting } from '../engine/sceneFireflyField'
import ManagedLight from '../features/lighting/ManagedLight.svelte'
import { qualityLevelStore } from '../features/performance/stores/performanceStore'
import RuntimePrefabNode from '../levels/RuntimePrefabNode.svelte'
import { EDITOR_MATERIAL_OVERRIDE_CONTEXT } from '../utils/materialOverrideContext'
import type {
  EditorMaterialData,
  EditorSceneNode,
  EditorSceneSettings,
} from './editorTypes'

export let node: EditorSceneNode
export let editorEnabled = false
export let sceneSettings: EditorSceneSettings | null = null

$: meshSource = getSceneNodeMeshRenderSource(node)
$: assetNode = meshSource.kind === 'asset' ? meshSource.asset : null
$: prefabNode = meshSource.kind === 'prefab' ? meshSource.prefab : null
$: primitiveNode = meshSource.kind === 'primitive' ? meshSource.primitive : null
$: lightNode = node.kind === 'light' ? node.light ?? null : null
$: fireflyNpcPresentation =
  node.npc?.archetype === 'firefly' && node.npc.presentation.type === 'firefly'
    ? node.npc.presentation
    : null
$: fireflyLighting = resolveSceneFireflyLighting({
  settings: sceneSettings?.level?.fireflies,
  qualityTier: $qualityLevelStore,
})
$: renderKey = `${node.id}:${node.kind}:${assetNode?.url ?? prefabNode?.type ?? primitiveNode?.geometry ?? lightNode?.color ?? fireflyNpcPresentation?.color ?? 'group'}`

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
    : mergeMaterialOverrides(null, node.material ?? null),
)
</script>

{#key renderKey}
  {#if assetNode}
    <HeroProp url={assetNode.url} runtimeCulling={false} />
  {:else if prefabNode}
    <RuntimePrefabNode prefab={prefabNode} runtimeCulling={false} />
  {:else if primitiveNode}
    <ProceduralMesh
      name={node.name}
      userData={node.renderPolicy?.runtimeStyle === 'skip' ? { renderStyleSkip: true } : {}}
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
    <ManagedLight
      id={`editor-light-${node.id}`}
      ownerId={node.id}
      position={[0, 0, 0]}
      color={lightNode.color}
      intensity={lightNode.intensity}
      distance={lightNode.distance}
      decay={lightNode.decay}
      castsShadow={lightNode.castsShadow ?? false}
      runtimeBudgeted={!editorEnabled}
      budgetGroup={lightNode.budgetGroup ?? 'authored'}
      priority={lightNode.priority ?? 0}
      stableSelectionKey={`editor-light:${node.id}`}
      selectionHint="editor-light"
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
  {:else if fireflyNpcPresentation && editorEnabled}
    <ManagedLight
      id={`editor-npc-firefly-light-${node.id}`}
      ownerId={node.id}
      position={[0, 0, 0]}
      color={fireflyNpcPresentation.color}
      intensity={fireflyLighting.lightIntensity}
      distance={fireflyLighting.lightDistance}
      decay={fireflyLighting.lightDecay}
      runtimeBudgeted={!editorEnabled}
      budgetGroup="firefly-npc"
      priority={8}
      stableSelectionKey={`editor-firefly-npc:${node.id}`}
      selectionHint="editor-firefly-npc"
    />
    <ProceduralMesh
      geometry="icosahedron"
      args={[fireflyNpcPresentation.size, 0]}
      position={[0, 0, 0]}
      rotation={[0, 0, 0]}
      scale={[1, 1, 1]}
      color={fireflyNpcPresentation.color}
      emissive={fireflyNpcPresentation.color}
      emissiveIntensity={fireflyLighting.spriteIntensity}
      metalness={1}
      roughness={0.05}
      transparent={true}
      opacity={0.88}
    />
    <ProceduralMesh
      geometry="torus"
      args={[fireflyNpcPresentation.size * 0.9, 0.015, 10, 20]}
      position={[0, 0, 0]}
      rotation={[Math.PI / 2, 0, 0]}
      scale={[1, 1, 1]}
      color={fireflyNpcPresentation.secondaryColor ?? fireflyNpcPresentation.color}
      emissive={fireflyNpcPresentation.secondaryColor ?? fireflyNpcPresentation.color}
      emissiveIntensity={fireflyLighting.spriteIntensity * 0.35}
      metalness={1}
      roughness={0.04}
      transparent={true}
      opacity={0.55}
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
