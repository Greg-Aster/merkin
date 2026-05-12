<script lang="ts">
import { onDestroy, onMount } from 'svelte'
import AdaptivePointLight from '../components/AdaptivePointLight.svelte'
import HeroProp from '../components/HeroProp.svelte'
import ProceduralMesh from '../components/ProceduralMesh.svelte'
import { usesLightweightRuntimeGameplayMarker } from '../engine/runtimeGameplayRenderPolicy'
import type { ActorDefinition, RenderCullingPolicy } from '../engine/types'
import {
  markRuntimeActorRendered,
  markRuntimeAssetActorLoaded,
  unmarkRuntimeActorRendered,
  unmarkRuntimeAssetActorLoaded,
} from '../stores/runtimeRenderRegistry'
import RuntimePrefabNode from './RuntimePrefabNode.svelte'

export let actor: ActorDefinition
export let levelId = ''

$: render = actor.render ?? null
$: material = (render?.material ?? {}) as Record<string, any>
$: primitive = render?.primitive ?? null
$: asset = render?.asset ?? null
$: prefab = render?.prefab ?? null
$: runtimePrefab = usesLightweightRuntimeGameplayMarker(actor) ? null : prefab
$: light = actor.light ?? null
$: runtimePropCulling = resolveRuntimePropCulling(render?.cullingPolicy)

function resolveRuntimePropCulling(
  cullingPolicy: RenderCullingPolicy | undefined,
) {
  // Actor culling policies are resolved by the actor/partition layer. Keep
  // nested GLB culling disabled so HeroProp does not become a second owner.
  switch (cullingPolicy) {
    case 'runtime-budget':
    case 'never':
    default:
      return false
  }
}

function hasImmediateRenderContent() {
  return Boolean(runtimePrefab || primitive || light)
}

function handleAssetLoad() {
  if (!levelId) return
  markRuntimeAssetActorLoaded(levelId, actor.id)
  markRuntimeActorRendered(levelId, actor.id)
}

function handleAssetError() {
  if (!levelId) return
  unmarkRuntimeAssetActorLoaded(levelId, actor.id)
  unmarkRuntimeActorRendered(levelId, actor.id)
}

onMount(() => {
  if (!levelId || !hasImmediateRenderContent()) return
  markRuntimeActorRendered(levelId, actor.id)
})

onDestroy(() => {
  if (!levelId) return
  unmarkRuntimeActorRendered(levelId, actor.id)
  unmarkRuntimeAssetActorLoaded(levelId, actor.id)
})
</script>

{#if asset}
  <HeroProp
    url={asset.url}
    {levelId}
    materialOverride={material}
    runtimeCulling={runtimePropCulling}
    on:load={handleAssetLoad}
    on:error={handleAssetError}
  />
{:else if runtimePrefab}
  <RuntimePrefabNode
    prefab={runtimePrefab}
    {levelId}
    runtimeCulling={runtimePropCulling}
  />
{:else if primitive}
  <ProceduralMesh
    name={actor.name}
    geometry={primitive.geometry}
    args={primitive.args}
    position={[0, 0, 0]}
    rotation={[0, 0, 0]}
    scale={[1, 1, 1]}
    color={material.color ?? '#ffffff'}
    emissive={material.emissive}
    emissiveIntensity={material.emissiveIntensity ?? 0}
    metalness={material.metalness ?? 0.7}
    roughness={material.roughness ?? 0.3}
    transparent={material.transparent ?? false}
    opacity={material.opacity ?? 1}
    transmission={material.transmission ?? 0}
    ior={material.ior ?? 1.5}
    clearcoat={material.clearcoat ?? 0}
    clearcoatRoughness={material.clearcoatRoughness ?? 0}
    thickness={material.thickness ?? 0}
    reflectivity={material.reflectivity ?? 0.5}
  />
{:else if light}
  <AdaptivePointLight
    position={[0, 0, 0]}
    color={light.color}
    intensity={light.intensity}
    distance={light.distance}
    decay={light.decay}
  />
  <ProceduralMesh
    geometry="icosahedron"
    args={[0.2, 0]}
    position={[0, 0, 0]}
    rotation={[0, 0, 0]}
    scale={[1, 1, 1]}
    color={light.color}
    emissive={light.color}
    emissiveIntensity={0.7}
    metalness={1}
    roughness={0.05}
  />
{/if}
