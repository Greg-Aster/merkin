<script lang="ts">
  import { createEventDispatcher, onDestroy, onMount } from 'svelte'
  import { get } from 'svelte/store'
  import { T } from '@threlte/core'
  import * as THREE from 'three'
  import { TerrainManager, type TerrainConfig } from './TerrainManager'
  import HeightmapSurface from './components/HeightmapSurface.svelte'
  import TerrainCollider from './components/TerrainCollider.svelte'
  import TerrainChunk from './components/TerrainChunk.svelte'
  import { terrainActions, terrainStore } from './terrainStore'
  import { playerStateStore } from '../../stores/gameStateStore'
  import { qualityLevelStore } from '../performance/stores/performanceStore'
  import { OptimizationLevel } from '../performance/OptimizationManager'

  export let config: TerrainConfig
  export let showVisualChunks = true
  export let showVisualSurface = true

  const dispatch = createEventDispatcher()
  let playerPosition = new THREE.Vector3()
  let localManager: TerrainManager | null = null
  let initializationCancelled = false

  // Subscribe to player position
  const unsubscribePlayer = playerStateStore.subscribe((p) => playerPosition.set(...p.position))

  onMount(async () => {
    initializationCancelled = false
    localManager = null
    terrainActions.reset()

    try {
      // Use a local const for the manager instance
      const manager = new TerrainManager()
      localManager = manager
      await manager.initialize(config)

      if (initializationCancelled) {
        return
      }
      
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
      if (initializationCancelled) {
        return
      }
      console.error('L Failed to initialize terrain:', error)
      terrainStore.update(state => ({
        ...state,
        error: error instanceof Error ? error.message : 'Unknown terrain error'
      }))
    }
  })

  onDestroy(() => {
    initializationCancelled = true
    unsubscribePlayer()

    if (get(terrainStore).manager === localManager) {
      terrainActions.reset()
    }
  })

  // --- THIS IS THE FIX ---
  // Derive visibleChunks from the store. This code will only run when the manager
  // is ready and available in the store, and will re-run when playerPosition changes.
  $: visibleChunks = ($terrainStore.isReady && $terrainStore.manager)
    ? $terrainStore.manager.getVisibleChunks(playerPosition)
    : []
  $: colliderDownsample = (() => {
    switch ($qualityLevelStore) {
      case OptimizationLevel.ULTRA_LOW:
        return 16
      case OptimizationLevel.LOW:
        return 14
      case OptimizationLevel.MEDIUM:
        return 12
      case OptimizationLevel.HIGH:
        return 10
      case OptimizationLevel.ULTRA:
        return 8
      default:
        return 12
    }
  })()
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
      trimeshMode="single"
      trimeshDownsample={colliderDownsample}
      chunkSize={config.chunkSize}
      gridSize={config.gridSize}
      renderPhysicsDebug={false}
      showBoundsAABB={false}
      enableRaycastProbe={false}
      flipRowsForCollider={false}
      swapAxesForCollider={false}
      anchorAtCenter={false}
      on:terrainReady={(e) => dispatch('terrainReady', e.detail)}
    />

    {#if showVisualSurface && !config.chunkPathTemplate}
      <HeightmapSurface
        heightData={$terrainStore.heightData}
        resolution={$terrainStore.resolution}
        worldSize={$terrainStore.worldSize}
        worldSizeX={$terrainStore.manager?.getWorldSizeX()}
        worldSizeZ={$terrainStore.manager?.getWorldSizeZ()}
        bounds={$terrainStore.bounds}
      />
    {/if}
    
    <!-- Visual Chunks -->
    {#if showVisualChunks}
      {#each visibleChunks as chunk (chunk.id)}
        {#if chunk.currentLod !== -1 && config.chunkPathTemplate}
          <TerrainChunk
            x={chunk.x}
            z={chunk.z}
            lod={chunk.currentLod}
            pathTemplate={config.chunkPathTemplate}
          />
        {/if}
      {/each}
    {/if}
  {/if}
</T.Group>
