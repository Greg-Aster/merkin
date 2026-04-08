<script lang="ts">
  import { World } from '@threlte/rapier';
  import { createEventDispatcher, onMount } from 'svelte';

  const dispatch = createEventDispatcher();
  export let gravity = [0, -9.81, 0] as [number, number, number];
  export let integrationParameters: any = undefined;
  export let ccd: boolean = false;

  onMount(() => {
    // Dispatch this event so the SpawnSystem knows the physics world is active.
    dispatch('physicsReady');
  });
</script>

<World {gravity} {integrationParameters} {ccd}>
  <slot />
</World>