<script lang="ts">
import { T, useTask } from '@threlte/core'
import * as THREE from 'three'
import HeroProp from '../components/HeroProp.svelte'
import {
  type RuntimePrefabData,
  resolveRuntimePrefabDescriptor,
} from '../engine/runtimePrefabCatalog'
import type {
  RenderLightingParticipation,
  RenderShadowParticipation,
} from '../engine/types'
import { evaluateRuntimePrefabLoopChannel } from '../engine/runtimePrefabLoopChannels'
import {
  type RuntimePrefabVfxBaseState,
  applyRuntimePrefabVfx,
  resetRuntimePrefabVfx,
  snapshotRuntimePrefabVfxState,
} from '../engine/runtimePrefabVfxController'

export let prefab: RuntimePrefabData
export let levelId: string | null = null
export let runtimeCulling: boolean
export let lighting: RenderLightingParticipation = 'lit'
export let castShadow: RenderShadowParticipation = 'auto'
export let receiveShadow: RenderShadowParticipation = 'auto'

let time = 0
let assetGroup: THREE.Group | undefined
let descriptor = resolveRuntimePrefabDescriptor(prefab)
let assetScene: THREE.Group | null = null
let vfxBaseState: RuntimePrefabVfxBaseState | null = null
const baseTransforms = new Map<
  THREE.Object3D,
  {
    position: THREE.Vector3
    rotation: THREE.Euler
    scale: THREE.Vector3
  }
>()

function snapshotBaseTransforms(root: THREE.Object3D) {
  baseTransforms.clear()
  root.traverse(object => {
    baseTransforms.set(object, {
      position: object.position.clone(),
      rotation: object.rotation.clone(),
      scale: object.scale.clone(),
    })
  })
}

function findAnimatedNode(name: string) {
  if (!assetScene) return null
  return assetScene.getObjectByName(name)
}

function applyNodeAnimation() {
  if (descriptor.kind !== 'asset' || !descriptor.assetAnimation?.nodes) return

  for (const nodeAnimation of descriptor.assetAnimation.nodes) {
    const node = findAnimatedNode(nodeAnimation.name)
    if (!node) continue

    const base = baseTransforms.get(node)
    if (!base) continue

    const rotation = nodeAnimation.rotation
    if (rotation) {
      node.rotation.x = evaluateRuntimePrefabLoopChannel(
        rotation.x,
        base.rotation.x,
        time,
      )
      node.rotation.y = evaluateRuntimePrefabLoopChannel(
        rotation.y,
        base.rotation.y,
        time,
      )
      node.rotation.z = evaluateRuntimePrefabLoopChannel(
        rotation.z,
        base.rotation.z,
        time,
      )
    }

    const position = nodeAnimation.position
    if (position) {
      node.position.x = evaluateRuntimePrefabLoopChannel(
        position.x,
        base.position.x,
        time,
      )
      node.position.y = evaluateRuntimePrefabLoopChannel(
        position.y,
        base.position.y,
        time,
      )
      node.position.z = evaluateRuntimePrefabLoopChannel(
        position.z,
        base.position.z,
        time,
      )
    }

    const scale = nodeAnimation.scale
    if (scale?.uniform) {
      const uniform = evaluateRuntimePrefabLoopChannel(scale.uniform, 1, time)
      node.scale.set(
        base.scale.x * uniform,
        base.scale.y * uniform,
        base.scale.z * uniform,
      )
    } else if (scale) {
      node.scale.x = evaluateRuntimePrefabLoopChannel(
        scale.x,
        base.scale.x,
        time,
      )
      node.scale.y = evaluateRuntimePrefabLoopChannel(
        scale.y,
        base.scale.y,
        time,
      )
      node.scale.z = evaluateRuntimePrefabLoopChannel(
        scale.z,
        base.scale.z,
        time,
      )
    }
  }
}

function resetNodeAnimation() {
  for (const [object, base] of baseTransforms) {
    object.position.copy(base.position)
    object.rotation.copy(base.rotation)
    object.scale.copy(base.scale)
  }
}

function applyAssetAnimation() {
  if (!assetGroup) {
    return
  }
  if (descriptor.kind !== 'asset') {
    assetGroup.position.y = 0
    assetGroup.rotation.y = 0
    assetGroup.scale.setScalar(1)
    resetNodeAnimation()
    resetRuntimePrefabVfx(vfxBaseState)
    return
  }

  if (descriptor.assetAnimation) {
    const root = descriptor.assetAnimation.root
    assetGroup.rotation.y = root?.rotationY ? time * root.rotationY.speed : 0

    const scale = root?.scale
      ? root.scale.base +
        Math.sin(time * root.scale.speed) * root.scale.amplitude
      : 1
    assetGroup.scale.setScalar(scale)

    assetGroup.position.y = root?.positionY
      ? Math.sin(time * root.positionY.speed) * root.positionY.amplitude
      : 0
    applyNodeAnimation()
  } else {
    assetGroup.position.y = 0
    assetGroup.rotation.y = 0
    assetGroup.scale.setScalar(1)
    resetNodeAnimation()
  }

  if (descriptor.assetVfx) {
    applyRuntimePrefabVfx({
      root: assetScene,
      contract: descriptor.assetVfx,
      transformBases: baseTransforms,
      baseState: vfxBaseState,
      time,
    })
  } else {
    resetRuntimePrefabVfx(vfxBaseState)
  }
}

function handleAssetLoad(event: CustomEvent<{ scene?: THREE.Group }>) {
  assetScene = event.detail.scene ?? null
  if (assetScene) {
    snapshotBaseTransforms(assetScene)
    vfxBaseState = snapshotRuntimePrefabVfxState(assetScene)
    applyAssetAnimation()
  } else {
    baseTransforms.clear()
    vfxBaseState = null
  }
}

useTask(delta => {
  time += delta
  applyAssetAnimation()
})

$: descriptor = resolveRuntimePrefabDescriptor(prefab)
$: applyAssetAnimation()
</script>

{#if descriptor.kind === 'asset'}
  <T.Group bind:ref={assetGroup}>
    <HeroProp
      url={descriptor.assetUrl}
      {levelId}
      {runtimeCulling}
      {lighting}
      {castShadow}
      {receiveShadow}
      cloneMaterials={Boolean(descriptor.assetVfx)}
      on:load={handleAssetLoad}
    />
  </T.Group>
{/if}
