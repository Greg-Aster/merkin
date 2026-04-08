<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte'
  import { T } from '@threlte/core'
  import * as THREE from 'three'
  import { TerrainManager, type TerrainConfig } from './TerrainManager'
  import TerrainCollider from './components/TerrainCollider.svelte'
  import TerrainChunk from './components/TerrainChunk.svelte'
  import { terrainStore } from './terrainStore'
  import { playerStateStore } from '../../stores/gameStateStore'

  export let config: TerrainConfig

  const dispatch = createEventDispatcher()
  let playerPosition = new THREE.Vector3()

  // Subscribe to player position
  playerStateStore.subscribe(p => playerPosition.set(...p.position))

  onMount(async () => {
    try {
      // Use a local const for the manager instance
      const manager = new TerrainManager()
      await manager.initialize(config)
      
      // Update store with the INITIALIZED manager and data
      terrainStore.update(state => ({
        ...state,
        isReady: true,
        heightData: manager.getHeightData(),
        resolution: manager.getResolution(),
        worldSize: manager.getWorldSize(),
        bounds: manager.getBounds(),
        manager: manager // Put the manager in the store
      }))

    } catch (error) {
      console.error('L Failed to initialize terrain:', error)
      terrainStore.update(state => ({
        ...state,
        error: error instanceof Error ? error.message : 'Unknown terrain error'
      }))
    }
  })

  // --- THIS IS THE FIX ---
  // Derive visibleChunks from the store. This code will only run when the manager
  // is ready and available in the store, and will re-run when playerPosition changes.
  $: visibleChunks = ($terrainStore.isReady && $terrainStore.manager)
    ? $terrainStore.manager.getVisibleChunks(playerPosition)
    : []
</script>

<T.Group>
  {#if $terrainStore.isReady && $terrainStore.heightData}
    <!-- Physics Collider -->
    <TerrainCollider
      heightData={$terrainStore.heightData}
      resolution={$terrainStore.resolution}
      worldSize={$terrainStore.worldSize}
      worldSizeX={$terrainStore.manager?.getWorldSizeX()}
      worldSizeZ={$terrainStore.manager?.getWorldSizeZ()}
      bounds={$terrainStore.bounds}
      useTrimesh={true}
      chunkSize={config.chunkSize}
      gridSize={config.gridSize}
      minHeight={config.minHeight}
      maxHeight={config.maxHeight}
      renderDebug={false}
      renderPhysicsDebug={false}
      showBoundsAABB={false}
      enableRaycastProbe={false}
      flipRowsForCollider={false}
      swapAxesForCollider={false}
      anchorAtCenter={false}
      on:terrainReady={(e) => dispatch('terrainReady', e.detail)}
    />
    
    <!-- Visual Chunks -->
    {#each visibleChunks as chunk (chunk.id)}
      {#if chunk.currentLod !== -1 && config.chunkPathTemplate}
        <TerrainChunk
          x={chunk.x}
          z={chunk.z}
          lod={chunk.currentLod}
          position={chunk.position}
          chunkSize={config.chunkSize}
          origin={$terrainStore.bounds ? [$terrainStore.bounds.min[0], $terrainStore.bounds.min[2]] : [-$terrainStore.worldSize/2, -$terrainStore.worldSize/2]}
          pathTemplate={config.chunkPathTemplate}
        />
      {/if}
    {/each}
  {/if}
</T.Group>
