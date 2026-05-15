<script lang="ts">
import { T, useTask, useThrelte } from '@threlte/core'
import { onDestroy } from 'svelte'
import * as THREE from 'three'
import { qualityLevelStore } from '../features/performance/stores/performanceStore'
import { getRuntimeNodeCullDistance } from '../features/performance/utils/runtimeSceneBudget'
import RuntimeGameplayRenderer from '../levels/RuntimeGameplayRenderer.svelte'
import EditorNodeGizmos from './EditorNodeGizmos.svelte'
import EditorNodePhysicsBody from './EditorNodePhysicsBody.svelte'
import EditorNodeRenderContent from './EditorNodeRenderContent.svelte'
import { getNodeVisualColliderSize } from './editorCollisionDefaults'
import { registerEditorObject, unregisterEditorObject } from './editorRegistry'
import { editorNodeViewportStateStore } from './editorStore'
import type { EditorSceneNode } from './editorStore'
import type { EditorSceneSettings } from './editorTypes'

export let node: EditorSceneNode
export let editorEnabled = false
export let selected = false
export let sceneSettings: EditorSceneSettings | null = null
export let interactionSystem: any = null
export let interactiveEnabled = false

const { camera } = useThrelte()
let group: THREE.Group
let viewportVisible = true
let runtimeDistanceVisible = true
let effectiveVisible = true
let groupVisible = true
const nodeWorldPosition = new THREE.Vector3()
let distanceCullAccumulator = 0

function getActiveCamera(): THREE.Camera | null {
  const candidate = camera as THREE.Camera & { current?: THREE.Camera | null }
  const resolved = candidate?.current ?? candidate
  return resolved && resolved.position instanceof THREE.Vector3
    ? resolved
    : null
}

function supportsRuntimeDistanceCulling() {
  return (
    node.renderPolicy?.cullingPolicy !== 'never' &&
    (node.kind === 'asset' ||
      node.kind === 'prefab' ||
      node.kind === 'primitive' ||
      node.kind === 'light')
  )
}

function getRuntimeCullDistance() {
  return getRuntimeNodeCullDistance($qualityLevelStore, node.kind)
}

function getRuntimeBoundsPadding() {
  const size = getNodeVisualColliderSize(node)
  const scaledAssetSize =
    node.kind === 'asset'
      ? ([
          Math.abs(node.scale[0] ?? 1) * 2,
          Math.abs(node.scale[1] ?? 1) * 2,
          Math.abs(node.scale[2] ?? 1) * 2,
        ] as [number, number, number])
      : ([0, 0, 0] as [number, number, number])
  const effectiveSize: [number, number, number] = [
    Math.max(size[0], scaledAssetSize[0]),
    Math.max(size[1], scaledAssetSize[1]),
    Math.max(size[2], scaledAssetSize[2]),
  ]
  return Math.max(8, Math.hypot(...effectiveSize) / 2)
}

useTask(delta => {
  const activeCamera = getActiveCamera()
  if (
    editorEnabled ||
    !activeCamera ||
    !group ||
    !supportsRuntimeDistanceCulling()
  )
    return

  distanceCullAccumulator += delta
  if (distanceCullAccumulator < 0.2) return
  distanceCullAccumulator = 0

  group.getWorldPosition(nodeWorldPosition)

  const distanceToCamera = activeCamera.position.distanceTo(nodeWorldPosition)
  runtimeDistanceVisible =
    distanceToCamera <= getRuntimeCullDistance() + getRuntimeBoundsPadding()
})

$: viewportVisible =
  $editorNodeViewportStateStore.get(node.id)?.effectiveVisible ?? node.visible
$: effectiveVisible = viewportVisible && runtimeDistanceVisible
$: groupVisible = effectiveVisible

$: if (group) {
  registerEditorObject(node.id, group)
  group.visible = groupVisible
  group.position.set(...node.position)
  group.rotation.set(...node.rotation)
  group.scale.set(...node.scale)
}

onDestroy(() => {
  unregisterEditorObject(node.id)
})
</script>

{#if !editorEnabled}
  <EditorNodePhysicsBody
    {node}
    {editorEnabled}
    {sceneSettings}
  />
{/if}

<T.Group bind:ref={group} visible={groupVisible}>
  {#if editorEnabled}
    <EditorNodePhysicsBody
      {node}
      {editorEnabled}
      {sceneSettings}
    >
      {#if effectiveVisible}
        <EditorNodeRenderContent {node} {editorEnabled} />
      {/if}
    </EditorNodePhysicsBody>
  {:else}
    {#if effectiveVisible}
      <EditorNodeRenderContent {node} {editorEnabled} />
    {/if}
  {/if}

  <EditorNodeGizmos {selected} />

  <RuntimeGameplayRenderer
    {node}
    {selected}
    {editorEnabled}
    {interactionSystem}
    {interactiveEnabled}
    on:portalTransition
    on:noteRead
  />

  <slot />
</T.Group>
