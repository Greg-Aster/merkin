<!-- StaticEnvironment Component (visual only, no physics) -->
<script lang="ts">
  import { GLTF } from '@threlte/extras'
  import { createEventDispatcher } from 'svelte'

  // Path to the .glb or .gltf file for the level environment.
  export let path: string

  const dispatch = createEventDispatcher()

  function handleLoaded() {
    // Visual-only environment: no physics colliders are created here.
    dispatch('loaded')
  }
</script>

<GLTF url={path} on:load={handleLoaded} />

