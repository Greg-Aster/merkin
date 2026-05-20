<script lang="ts">
import { T } from '@threlte/core'
import { createEventDispatcher, onDestroy, onMount, tick } from 'svelte'
import { get } from 'svelte/store'
import * as THREE from 'three'
import { playerStateStore } from '../../stores/gameStateStore'
import { setRuntimeDiagnostic } from '../../stores/runtimeDiagnosticsStore'
import { type TerrainConfig, TerrainManager } from './TerrainManager'
import {
  type BakedTerrainCollider,
  loadBakedTerrainCollider,
} from './bakedTerrainCollider'
import TerrainChunk from './components/TerrainChunk.svelte'
import TerrainCollider from './components/TerrainCollider.svelte'
import type { TerrainRuntimeVisualContract } from './terrainManifest'
import { terrainActions, terrainStore } from './terrainStore'
import type { TerrainRuntimeReadyDetail } from './types'

export let levelId: string
export let config: TerrainConfig
export let visualContract: TerrainRuntimeVisualContract = {
  mode: 'glb-chunk-terrain',
  visualSource: 'source-glb-chunks',
  fallbackSurfacePolicy: 'disabled',
  diagnostics: [],
}
export let collisionStrategy: 'baked-terrain-mesh' = 'baked-terrain-mesh'

const dispatch = createEventDispatcher()
let playerPosition = new THREE.Vector3()
let localManager: TerrainManager | null = null
let bakedCollider: BakedTerrainCollider | null = null
let initializationCancelled = false
let readySignature = ''
let playerPositionVersion = 0
let visibleChunks: ReturnType<TerrainManager['getVisibleChunks']> = []
let activeChunkUrls: string[] = []
let loadedChunkUrls = new Set<string>()
let failedChunkUrls = new Set<string>()
let collisionReadyDetail: TerrainRuntimeReadyDetail | null = null
let visualReady = false
let fallbackSurfaceActive = false
let visualDiagnosticSignature = ''

$: usesPrimaryVisualChunks = visualContract.visualSource === 'source-glb-chunks'
$: showVisualChunks = usesPrimaryVisualChunks

function getReadySignature(detail: TerrainRuntimeReadyDetail) {
  return [
    levelId,
    detail.source,
    detail.collision?.url ?? 'collision',
    detail.collision?.triangleCount ?? 0,
    detail.visual?.authoritativeSource ?? visualContract.visualSource,
    detail.visual?.fallbackSurfaceActive ? 'fallback' : 'primary',
    config.bounds?.min.join(',') ?? '',
    config.bounds?.max.join(',') ?? '',
  ].join('|')
}

function getChunkUrl(
  chunk: ReturnType<TerrainManager['getVisibleChunks']>[number],
) {
  if (!config.chunkPathTemplate) return ''
  return config.chunkPathTemplate
    .replace('{x}', chunk.x.toString())
    .replace('{z}', chunk.z.toString())
    .replace('{lod}', chunk.currentLod.toString())
}

function getVisualReadyDetail() {
  return {
    authoritativeSource: visualContract.visualSource,
    fallbackSurfacePolicy: visualContract.fallbackSurfacePolicy,
    fallbackSurfaceActive,
    activeChunkCount: activeChunkUrls.length,
    loadedChunkCount: activeChunkUrls.filter(url => loadedChunkUrls.has(url))
      .length,
    failedChunkCount: activeChunkUrls.filter(url => failedChunkUrls.has(url))
      .length,
  }
}

function markTerrainRuntimeReady(detail: TerrainRuntimeReadyDetail) {
  const signature = getReadySignature(detail)
  if (signature === readySignature) return
  readySignature = signature

  dispatch('terrainRuntimeReady', detail)
}

function maybeMarkTerrainRuntimeReady() {
  if (!collisionReadyDetail || !visualReady) return
  markTerrainRuntimeReady({
    ...collisionReadyDetail,
    visualReady: true,
    visual: getVisualReadyDetail(),
  })
}

function setTerrainCollisionReady(detail: TerrainRuntimeReadyDetail) {
  collisionReadyDetail = detail
  setRuntimeDiagnostic('terrainCollision', {
    label: 'Terrain Collision',
    level: 'ready',
    message: `Terrain collision ready on ${levelId}.`,
    meta: {
      levelId,
      collisionUrl: detail.collision?.url,
      triangleCount: detail.collision?.triangleCount,
    },
  })
  maybeMarkTerrainRuntimeReady()
}

function getFallbackSurfaceActive() {
  return false
}

function updateTerrainVisualDiagnostics() {
  if (!$terrainStore.isReady) return

  const failedActiveChunkCount = activeChunkUrls.filter(url =>
    failedChunkUrls.has(url),
  ).length
  const loadedActiveChunkCount = activeChunkUrls.filter(url =>
    loadedChunkUrls.has(url),
  ).length
  const pendingActiveChunkCount = Math.max(
    0,
    activeChunkUrls.length - loadedActiveChunkCount - failedActiveChunkCount,
  )
  let level: 'loading' | 'ready' | 'warning' | 'error' = 'ready'
  let message = `Terrain visual source ${visualContract.visualSource} ready on ${levelId}.`

  visualReady = true

  if (visualContract.visualSource === 'scene-actors') {
    message = `Terrain visuals for ${levelId} are scene-authored actors.`
  } else if (visualContract.visualSource === 'none') {
    message = `Terrain runtime visual rendering disabled for ${levelId}.`
  } else if (usesPrimaryVisualChunks) {
    if (!config.chunkPathTemplate) {
      level = 'error'
      message = `Terrain chunk visuals are authoritative for ${levelId}, but no chunk path template is configured.`
      visualReady = fallbackSurfaceActive
    } else if (activeChunkUrls.length === 0) {
      level = fallbackSurfaceActive ? 'warning' : 'loading'
      message = fallbackSurfaceActive
        ? `Fallback terrain surface active for ${levelId}; no required terrain chunks are currently selected.`
        : `Waiting for terrain chunks to become visible on ${levelId}.`
      visualReady = Boolean(config.chunkPathTemplate)
    } else if (failedActiveChunkCount > 0) {
      level = fallbackSurfaceActive ? 'warning' : 'error'
      message = fallbackSurfaceActive
        ? `Fallback terrain surface active for ${levelId}; ${failedActiveChunkCount} required terrain chunk(s) failed to load.`
        : `${failedActiveChunkCount} required terrain chunk(s) failed to load on ${levelId}.`
      visualReady = false
    } else if (pendingActiveChunkCount > 0) {
      level = fallbackSurfaceActive ? 'warning' : 'loading'
      message = `Loading ${pendingActiveChunkCount} required terrain chunk(s) for ${levelId}.`
      visualReady = true
    } else {
      message = `Terrain chunk visuals ready on ${levelId}.`
    }
    if (visualContract.fallbackSurfacePolicy === 'always') {
      level = level === 'error' ? 'error' : 'warning'
      message = `Terrain chunk visuals are authoritative for ${levelId}; fallbackSurfacePolicy=always is ignored in production runtime.`
    }
  }

  const diagnostics = visualContract.diagnostics ?? []
  if (diagnostics.length > 0 && level === 'ready') {
    level = 'warning'
    message = diagnostics[0]
  }

  const signature = [
    level,
    message,
    visualContract.visualSource,
    visualContract.fallbackSurfacePolicy,
    fallbackSurfaceActive,
    activeChunkUrls.join(','),
    loadedActiveChunkCount,
    failedActiveChunkCount,
    pendingActiveChunkCount,
    diagnostics.join('|'),
  ].join('|')
  if (signature === visualDiagnosticSignature) return
  visualDiagnosticSignature = signature

  setRuntimeDiagnostic('terrainVisual', {
    label: 'Terrain Visual',
    level,
    message,
    meta: {
      levelId,
      authoritativeVisualSource: visualContract.visualSource,
      runtimeMode: visualContract.mode,
      fallbackSurfacePolicy: visualContract.fallbackSurfacePolicy,
      fallbackSurfaceActive,
      activeChunkCount: activeChunkUrls.length,
      loadedActiveChunkCount,
      failedActiveChunkCount,
      pendingActiveChunkCount,
      requiredChunkCount: visualContract.requiredChunkCount,
      diagnostics,
    },
  })
  maybeMarkTerrainRuntimeReady()
}

function handleTerrainChunkLoad(event: CustomEvent<{ url: string }>) {
  if (!event.detail.url) return
  loadedChunkUrls = new Set(loadedChunkUrls).add(event.detail.url)
}

function handleTerrainChunkError(event: CustomEvent<{ url: string }>) {
  if (!event.detail.url) return
  failedChunkUrls = new Set(failedChunkUrls).add(event.detail.url)
}

const unsubscribePlayer = playerStateStore.subscribe(p => {
  playerPosition.set(...p.position)
  playerPositionVersion += 1
})

onMount(async () => {
  initializationCancelled = false
  localManager = null
  readySignature = ''
  visualDiagnosticSignature = ''
  collisionReadyDetail = null
  visualReady = false
  loadedChunkUrls = new Set()
  failedChunkUrls = new Set()
  terrainActions.reset()
  setRuntimeDiagnostic('terrain', {
    level: 'loading',
    message: `Loading terrain runtime for ${levelId}.`,
    meta: {
      levelId,
      authoritativeVisualSource: visualContract.visualSource,
      runtimeMode: visualContract.mode,
      fallbackSurfacePolicy: visualContract.fallbackSurfacePolicy,
    },
  })
  setRuntimeDiagnostic('terrainVisual', {
    label: 'Terrain Visual',
    level: 'loading',
    message: `Resolving terrain visual source ${visualContract.visualSource} for ${levelId}.`,
    meta: {
      levelId,
      authoritativeVisualSource: visualContract.visualSource,
      runtimeMode: visualContract.mode,
      fallbackSurfacePolicy: visualContract.fallbackSurfacePolicy,
      diagnostics: visualContract.diagnostics,
    },
  })
  setRuntimeDiagnostic('terrainCollision', {
    label: 'Terrain Collision',
    level: 'loading',
    message: `Loading terrain collision for ${levelId}.`,
    meta: { levelId },
  })

  try {
    const manager = new TerrainManager()
    localManager = manager
    await manager.initialize(config)

    if (initializationCancelled) return

    terrainStore.update(state => ({
      ...state,
      isReady: true,
      resolution: manager.getResolution(),
      worldSize: manager.getWorldSize(),
      bounds: manager.getBounds(),
      manager,
    }))
    setRuntimeDiagnostic('terrain', {
      level: 'loading',
      message: `Terrain source bounds ready for ${levelId}; loading collision.`,
      meta: {
        levelId,
        chunksPath: config.chunkPathTemplate,
      },
    })

    if (collisionStrategy === 'baked-terrain-mesh' && config.collision?.url) {
      bakedCollider = await loadBakedTerrainCollider(config.collision)
    }

    if (collisionStrategy === 'baked-terrain-mesh' && !config.collision?.url) {
      const message = `TerrainRuntime ${levelId} requires a baked terrain collision artifact URL.`
      console.error(message)
      terrainStore.update(state => ({
        ...state,
        error: message,
      }))
      setRuntimeDiagnostic('terrain', {
        level: 'error',
        message,
        meta: { levelId },
      })
      setRuntimeDiagnostic('terrainCollision', {
        label: 'Terrain Collision',
        level: 'error',
        message,
        meta: { levelId },
      })
      return
    }

    if (bakedCollider && config.collision?.url) {
      await tick()
      setRuntimeDiagnostic('terrain', {
        level: 'ready',
        message: `Terrain ready on ${levelId}.`,
        meta: {
          levelId,
          collisionUrl: config.collision.url,
          triangleCount: bakedCollider.triangleCount,
          visualChunks: Boolean(config.chunkPathTemplate),
          authoritativeVisualSource: visualContract.visualSource,
          fallbackSurfacePolicy: visualContract.fallbackSurfacePolicy,
          fallbackSurfaceActive,
        },
      })
      setTerrainCollisionReady({
        source: 'baked-collider',
        collisionReady: true,
        bounds: config.bounds,
        resolution: manager.getResolution(),
        worldSize: manager.getWorldSize(),
        worldSizeX: manager.getWorldSizeX(),
        worldSizeZ: manager.getWorldSizeZ(),
        collision: {
          type: 'baked-terrain-mesh',
          sourceLinked: config.collision.sourceLinked,
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
    const message =
      error instanceof Error ? error.message : 'Unknown terrain error'
    terrainStore.update(state => ({
      ...state,
      error: message,
    }))
    setRuntimeDiagnostic('terrain', {
      level: 'error',
      message: `Failed to initialize terrain runtime for ${levelId}: ${message}`,
      meta: { levelId },
    })
    setRuntimeDiagnostic('terrainCollision', {
      label: 'Terrain Collision',
      level: 'error',
      message: `Failed to initialize terrain runtime for ${levelId}: ${message}`,
      meta: { levelId },
    })
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

$: {
  playerPositionVersion
  visibleChunks =
    $terrainStore.isReady && $terrainStore.manager
      ? $terrainStore.manager.getVisibleChunks(playerPosition)
      : []
  activeChunkUrls =
    config.chunkPathTemplate && usesPrimaryVisualChunks
      ? visibleChunks
          .filter(chunk => chunk.currentLod !== -1)
          .map(chunk => getChunkUrl(chunk))
          .filter(Boolean)
      : []
  fallbackSurfaceActive = getFallbackSurfaceActive()
  updateTerrainVisualDiagnostics()
}
</script>

<T.Group>
  {#if $terrainStore.isReady}
    {#if bakedCollider}
      <T.Group name={`${levelId}-terrain-physics`}>
      <TerrainCollider
        resolution={$terrainStore.resolution}
        worldSize={$terrainStore.worldSize}
        worldSizeX={$terrainStore.manager?.getWorldSizeX()}
        worldSizeZ={$terrainStore.manager?.getWorldSizeZ()}
        bounds={$terrainStore.bounds}
        collision={config.collision}
        terrainResolution={$terrainStore.resolution}
        terrainWorldSize={$terrainStore.worldSize}
        terrainWorldSizeX={$terrainStore.manager?.getWorldSizeX()}
        terrainWorldSizeZ={$terrainStore.manager?.getWorldSizeZ()}
        bakedColliderInput={bakedCollider}
        on:terrainRuntimeReady={(event) => setTerrainCollisionReady(event.detail)}
      />
      </T.Group>
    {/if}

    <T.Group name={`${levelId}-terrain-visual-lod`}>
      {#if showVisualChunks}
        {#each visibleChunks as chunk (chunk.id)}
          {#if chunk.currentLod !== -1 && config.chunkPathTemplate}
            <TerrainChunk
              x={chunk.x}
              z={chunk.z}
              lod={chunk.currentLod}
              pathTemplate={config.chunkPathTemplate}
              materialOverride={config.visualChunkMaterial}
              {levelId}
              on:load={handleTerrainChunkLoad}
              on:error={handleTerrainChunkError}
            />
          {/if}
        {/each}
      {/if}
    </T.Group>
  {/if}
</T.Group>
