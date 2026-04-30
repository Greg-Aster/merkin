<script lang="ts">
import type { TerrainConfig } from './TerrainManager'
import TerrainRuntime from './TerrainRuntime.svelte'

export let levelId = 'legacy-terrain'
export let config: TerrainConfig
export let showVisualChunks = true
export let showVisualSurface = true
export let collisionStrategy: 'baked-terrain-mesh' = 'baked-terrain-mesh'
</script>

<TerrainRuntime
  {levelId}
  {config}
  {showVisualChunks}
  {showVisualSurface}
  {collisionStrategy}
  on:terrainRuntimeReady
  on:staticWorldReady
/>
