<script lang="ts">
import { T, useTask } from '@threlte/core'
import { getContext, onDestroy, onMount } from 'svelte'
import * as THREE from 'three'
import {
  RUNTIME_LIGHTING_CONTEXT,
  type RuntimeLightEmitterKind,
  type RuntimeLightingController,
} from './RuntimeLightingController'

export let id = ''
export let ownerId = ''
export let kind: RuntimeLightEmitterKind = 'point'
export let position: [number, number, number] = [0, 0, 0]
export let color = '#ffffff'
export let intensity = 1
export let distance = 0
export let decay = 2
export let runtimeBudgeted = true
export let enabled = true

const controller = getContext<RuntimeLightingController | null>(
  RUNTIME_LIGHTING_CONTEXT,
)
const generatedId = `managed-light-${Math.random().toString(36).slice(2)}`
const worldPosition = new THREE.Vector3()

let anchorRef: THREE.Group | null = null
let mounted = false
let lastPublishedSignature = ''

$: resolvedId = id || generatedId
$: resolvedOwnerId = ownerId || resolvedId
$: emitterSignature = JSON.stringify({
  resolvedId,
  resolvedOwnerId,
  kind,
  color,
  intensity,
  distance,
  decay,
  runtimeBudgeted,
  enabled,
  position,
})

function publishEmitter() {
  if (!controller || !mounted) return

  if (!enabled) {
    if (lastPublishedSignature !== 'removed') {
      controller.removeEmitter(resolvedId)
      lastPublishedSignature = 'removed'
    }
    return
  }

  if (kind === 'point') {
    if (!anchorRef) return
    anchorRef.getWorldPosition(worldPosition)
  }

  const nextEmitter = {
    id: resolvedId,
    ownerId: resolvedOwnerId,
    kind,
    color,
    intensity,
    position:
      kind === 'point'
        ? [worldPosition.x, worldPosition.y, worldPosition.z]
        : undefined,
    distance,
    decay,
    runtimeBudgeted,
    enabled,
  }
  const nextSignature = JSON.stringify(nextEmitter)
  if (nextSignature === lastPublishedSignature) return

  lastPublishedSignature = nextSignature
  controller.upsertEmitter(nextEmitter)
}

onMount(() => {
  mounted = true
  publishEmitter()
})

$: if (mounted && emitterSignature) {
  publishEmitter()
}

useTask(() => {
  if (kind !== 'point') return
  publishEmitter()
})

onDestroy(() => {
  controller?.removeEmitter(resolvedId)
})
</script>

{#if kind === 'point'}
  <T.Group bind:ref={anchorRef} {position} />
{/if}
