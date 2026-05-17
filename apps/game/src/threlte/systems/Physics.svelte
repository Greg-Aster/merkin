<script lang="ts">
import { World } from '@threlte/rapier'
import { createEventDispatcher, onMount } from 'svelte'
import RapierCollisionOverlay from '../collision/RapierCollisionOverlay.svelte'
import RapierWorldLifecycle from './RapierWorldLifecycle.svelte'

const dispatch = createEventDispatcher()
export let gravity = [0, -9.81, 0] as [number, number, number]
export let integrationParameters: any = undefined
export let ccd: boolean = false
export let collisionDebugEnabled = false
export let paused = false

onMount(() => {
  // Dispatch this event so GameWorld can advance the gameplay lifecycle.
  dispatch('physicsReady')
})
</script>

<World {gravity} {integrationParameters} {ccd}>
  <RapierWorldLifecycle {paused} />
  <slot />
  <RapierCollisionOverlay enabled={collisionDebugEnabled} />
</World>
