<!-- StaticEnvironment Component (visual only, no physics) -->
<script lang="ts">
  import HeroProp from './HeroProp.svelte'
  import { createEventDispatcher } from 'svelte'

  // Path to the .glb or .gltf file for the level environment.
  export let path: string

  const dispatch = createEventDispatcher()

  function handleLoaded() {
    // Visual-only environment: no physics colliders are created here.
    dispatch('loaded')
  }
</script>

<HeroProp url={path} on:load={handleLoaded} />
