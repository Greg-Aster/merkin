<script lang="ts">
import { T } from '@threlte/core'
import { createEventDispatcher, onDestroy, onMount, tick } from 'svelte'
import { get } from 'svelte/store'
import * as THREE from 'three'
import { playerStateStore } from '../../stores/gameStateStore'
import { type TerrainConfig, TerrainManager } from './TerrainManager'
import {
  type BakedTerrainCollider,
  loadBakedTerrainCollider,
} from './bakedTerrainCollider'
import HeightmapSurface from './components/HeightmapSurface.svelte'
import TerrainChunk from './components/TerrainChunk.svelte'
import TerrainCollider from './components/TerrainCollider.svelte'
import { terrainActions, terrainStore } from './terrainStore'
import type { TerrainRuntimeReadyDetail } from './types'

export let levelId: string
export let config: TerrainConfig
export let showVisualChunks = true
export let showVisualSurface = true
export let collisionStrategy: 'baked-terrain-mesh' = 'baked-terrain-mesh'

const dispatch = createEventDispatcher()
let playerPosition = new THREE.Vector3()
let localManager: TerrainManager | null = null
let bakedCollider: BakedTerrainCollider | null = null
let initializationCancelled = false
let readySignature = ''

function getReadySignature(detail: TerrainRuntimeReadyDetail) {
  return [
    levelId,
    config.heightmapUrl,
    detail.source,
    detail.collision?.url ?? 'heightmap',
    detail.collision?.triangleCount ?? 0,
    config.bounds?.min.join(',') ?? '',
    config.bounds?.max.join(',') ?? '',
  ].join('|')
}

function markTerrainRuntimeReady(detail: TerrainRuntimeReadyDetail) {
  const signature = getReadySignature(detail)
  if (signature === readySignature) return
  readySignature = signature

  dispatch('terrainRuntimeReady', detail)
}

const unsubscribePlayer = playerStateStore.subscribe(p =>
  playerPosition.set(...p.position),
)

onMount(async () => {
  initializationCancelled = false
  localManager = null
  readySignature = ''
  terrainActions.reset()

  try {
    const manager = new TerrainManager()
    localManager = manager
    await manager.initialize(config)

    if (initializationCancelled) return

    terrainStore.update(state => ({
      ...state,
      isReady: true,
      heightData: manager.getHeightData(),
      resolution: manager.getResolution(),
      worldSize: manager.getWorldSize(),
      bounds: manager.getBounds(),
      manager,
    }))

    if (collisionStrategy === 'baked-terrain-mesh' && config.collision?.url) {
      bakedCollider = await loadBakedTerrainCollider(config.collision)
    }

    if (
      collisionStrategy === 'baked-terrain-mesh' &&
      (!config.collision?.url || config.collision.authoredException !== true)
    ) {
      const message = `TerrainRuntime ${levelId} requires an authored baked terrain collision exception with an artifact URL.`
      console.error(message)
      terrainStore.update(state => ({
        ...state,
        error: message,
      }))
      return
    }

    if (bakedCollider && config.collision?.url) {
      await tick()
      markTerrainRuntimeReady({
        source: 'baked-collider',
        heightmapUrl: config.heightmapUrl,
        heightmapReady: true,
        collisionReady: true,
        bounds: config.bounds,
        resolution: manager.getResolution(),
        worldSize: manager.getWorldSize(),
        worldSizeX: manager.getWorldSizeX(),
        worldSizeZ: manager.getWorldSizeZ(),
        collision: {
          type: 'baked-terrain-mesh',
          url: config.collision.url,
          sourceResolution: bakedCollider.sourceResolution,
          colliderResolution: bakedCollider.colliderResolution,
          sampleStep: bakedCollider.sampleStep,
          triangleCount: bakedCollider.triangleCount,
        },
      })
    }
  } catch (error) {
    if (initializationCancelled) return
    console.error('Failed to initialize terrain runtime:', error)
    terrainStore.update(state => ({
      ...state,
      error: error instanceof Error ? error.message : 'Unknown terrain error',
    }))
  }
})

onDestroy(() => {
  initializationCancelled = true
  bakedCollider = null
  unsubscribePlayer()

  if (get(terrainStore).manager === localManager) {
    terrainActions.reset()
  }
})

$: visibleChunks =
  $terrainStore.isReady && $terrainStore.manager
    ? $terrainStore.manager.getVisibleChunks(playerPosition)
    : []
</script>

<T.Group>
  {#if $terrainStore.isReady && $terrainStore.heightData}
    <T.Group name={`${levelId}-terrain-physics`}>
      <TerrainCollider
        heightData={$terrainStore.heightData}
        resolution={$terrainStore.resolution}
        worldSize={$terrainStore.worldSize}
        worldSizeX={$terrainStore.manager?.getWorldSizeX()}
        worldSizeZ={$terrainStore.manager?.getWorldSizeZ()}
        bounds={$terrainStore.bounds}
        collision={config.collision}
        heightmapUrl={config.heightmapUrl}
        terrainResolution={$terrainStore.resolution}
        terrainWorldSize={$terrainStore.worldSize}
        terrainWorldSizeX={$terrainStore.manager?.getWorldSizeX()}
        terrainWorldSizeZ={$terrainStore.manager?.getWorldSizeZ()}
        bakedColliderInput={bakedCollider}
        on:terrainRuntimeReady={(event) => markTerrainRuntimeReady(event.detail)}
      />
    </T.Group>

    <T.Group name={`${levelId}-terrain-visual-lod`}>
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

      {#if showVisualChunks}
        {#each visibleChunks as chunk (chunk.id)}
          {#if chunk.currentLod !== -1 && config.chunkPathTemplate}
            <TerrainChunk
              x={chunk.x}
              z={chunk.z}
              lod={chunk.currentLod}
              pathTemplate={config.chunkPathTemplate}
              {levelId}
            />
          {/if}
        {/each}
      {/if}
    </T.Group>
  {/if}
</T.Group>
