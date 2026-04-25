<!-- StaticEnvironment Component (visual only, no physics) -->
<script lang="ts">
import { createEventDispatcher } from 'svelte'
import HeroProp from './HeroProp.svelte'

// Path to the .glb or .gltf file for the level environment.
export let path: string

const dispatch = createEventDispatcher()

function handleLoaded() {
  // Visual-only environment: no physics colliders are created here.
  dispatch('loaded')
}
</script>

<HeroProp url={path} on:load={handleLoaded} />
