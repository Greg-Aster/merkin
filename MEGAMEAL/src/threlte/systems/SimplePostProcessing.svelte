<!--
  Simple Post-Processing Alternative using Native Threlte
  No external libraries, just shader-based effects
-->
<script lang="ts">
import { T } from '@threlte/core'
import { onMount } from 'svelte'

// Configuration
export let enableGlow = true
export let enableAmbientLight = true
export let toneMappingExposure = 1.0

// Mobile optimization
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
  navigator.userAgent
)

// Mobile-optimized settings
$: mobileExposure = isMobile ? toneMappingExposure * 0.9 : toneMappingExposure

onMount(() => {
  console.log('✨ Simple Threlte post-processing effects loaded')
})
</script>

<!-- 
  This component is intended for post-processing effects.
  Lighting has been moved to level-specific components (e.g., Observatory.svelte)
  to prevent conflicts and give each level unique atmospheric control.
-->

<style>
/* No styles needed */
</style>