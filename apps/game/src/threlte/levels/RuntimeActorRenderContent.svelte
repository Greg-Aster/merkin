<script lang="ts">
import { onDestroy, onMount } from 'svelte'
import HeroProp from '../components/HeroProp.svelte'
import ProceduralMesh from '../components/ProceduralMesh.svelte'
import { getActorMeshRenderSource } from '../engine/actorRenderSource'
import { usesLightweightRuntimeGameplayMarker } from '../engine/runtimeGameplayRenderPolicy'
import type {
  ActorDefinition,
  RenderCullingPolicy,
  RenderLightingParticipation,
  RenderShadowParticipation,
} from '../engine/types'
import ManagedLight from '../features/lighting/ManagedLight.svelte'
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
$: meshSource = getActorMeshRenderSource(actor)
$: primitive = meshSource.kind === 'primitive' ? meshSource.primitive : null
$: asset = meshSource.kind === 'asset' ? meshSource.asset : null
$: prefab = meshSource.kind === 'prefab' ? meshSource.prefab : null
$: runtimePrefab = usesLightweightRuntimeGameplayMarker(actor) ? null : prefab
$: light = actor.light ?? null
$: nestedVisibilityCulling = resolveNestedVisibilityCulling(
  render?.cullingPolicy,
)
$: lightingParticipation = resolveLightingParticipation(render?.lighting)
$: castShadowParticipation = resolveShadowParticipation(render?.castShadow)
$: receiveShadowParticipation = resolveShadowParticipation(render?.receiveShadow)

function resolveNestedVisibilityCulling(
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

function resolveLightingParticipation(
  lighting: RenderLightingParticipation | undefined,
): RenderLightingParticipation {
  return lighting ?? 'lit'
}

function resolveShadowParticipation(
  shadow: RenderShadowParticipation | undefined,
): RenderShadowParticipation {
  return shadow ?? 'auto'
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
    runtimeCulling={nestedVisibilityCulling}
    lighting={lightingParticipation}
    castShadow={castShadowParticipation}
    receiveShadow={receiveShadowParticipation}
    on:load={handleAssetLoad}
    on:error={handleAssetError}
  />
{:else if runtimePrefab}
  <RuntimePrefabNode
    prefab={runtimePrefab}
    {levelId}
    runtimeCulling={nestedVisibilityCulling}
    lighting={lightingParticipation}
    castShadow={castShadowParticipation}
    receiveShadow={receiveShadowParticipation}
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
    lighting={lightingParticipation}
    castShadow={castShadowParticipation}
    receiveShadow={receiveShadowParticipation}
  />
{:else if light}
  <ManagedLight
    id={`actor-light-${actor.id}`}
    ownerId={actor.id}
    position={[0, 0, 0]}
    color={light.color}
    intensity={light.intensity}
    distance={light.distance}
    decay={light.decay}
    castsShadow={light.castsShadow ?? false}
    runtimeBudgeted={light.runtimeBudgeted ?? true}
    budgetGroup={light.budgetGroup ?? 'authored'}
    priority={light.priority ?? 0}
    stableSelectionKey={`actor-light:${actor.id}`}
    selectionHint="actor-light"
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
    lighting="visual-only"
    castShadow="disabled"
    receiveShadow="disabled"
  />
{/if}
