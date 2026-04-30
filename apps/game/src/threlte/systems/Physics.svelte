<script lang="ts">
import { World } from '@threlte/rapier'
import { createEventDispatcher, onMount } from 'svelte'

const dispatch = createEventDispatcher()
export let gravity = [0, -9.81, 0] as [number, number, number]
export let integrationParameters: any = undefined
export let ccd: boolean = false

onMount(() => {
  // Dispatch this event so GameWorld can advance the lifecycle to spawning.
  dispatch('physicsReady')
})
</script>

<World {gravity} {integrationParameters} {ccd}>
  <slot />
</World>
