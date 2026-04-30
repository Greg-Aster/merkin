<script lang="ts">
import { TERRAIN_GROUP } from '@/threlte/constants/physics'
import { Collider, RigidBody } from '@threlte/rapier'
import { createEventDispatcher, onDestroy } from 'svelte'
import type { TerrainConfig } from '../TerrainManager'
import {
  type BakedTerrainCollider,
  loadBakedTerrainCollider,
} from '../bakedTerrainCollider'
import type { TerrainRuntimeReadyDetail } from '../types'

const dispatch = createEventDispatcher()

export let collision: TerrainConfig['collision'] | undefined = undefined
export let heightmapUrl = ''
export let terrainResolution = 0
export let terrainWorldSize = 0
export let terrainWorldSizeX: number | undefined = undefined
export let terrainWorldSizeZ: number | undefined = undefined
export let bounds: TerrainConfig['bounds'] | null = null
export let bakedColliderInput: BakedTerrainCollider | null = null
export let friction = 0.9
export let restitution = 0

let activeLoadToken = 0
let bakedCollider: BakedTerrainCollider | null = null
let loadError = ''
let loadedUrl = ''
let readySignature = ''

async function loadBakedCollider(collisionConfig: TerrainConfig['collision']) {
  const token = ++activeLoadToken
  bakedCollider = null
  loadError = ''
  readySignature = ''

  if (!collisionConfig?.url) {
    loadError = 'Missing baked terrain collision artifact.'
    console.error(loadError)
    return
  }

  try {
    const nextCollider = await loadBakedTerrainCollider(collisionConfig)
    if (token !== activeLoadToken) return
    bakedCollider = nextCollider
  } catch (error) {
    if (token !== activeLoadToken) return
    loadError =
      error instanceof Error
        ? error.message
        : 'Unknown terrain collider load error'
    console.error('Failed to load baked terrain collider:', loadError)
  }
}

$: if (bakedColliderInput) {
  activeLoadToken += 1
  bakedCollider = bakedColliderInput
}

function dispatchReady() {
  if (!bakedCollider || !collision?.url) return
  const signature = [
    collision.url,
    bakedCollider.vertexCount,
    bakedCollider.indexCount,
    bakedCollider.position.join(','),
  ].join('|')
  if (signature === readySignature) return
  readySignature = signature
  const detail: TerrainRuntimeReadyDetail = {
    source: 'baked-collider',
    heightmapUrl,
    heightmapReady: true,
    collisionReady: true,
    bounds,
    resolution: terrainResolution,
    worldSize: terrainWorldSize,
    worldSizeX: terrainWorldSizeX,
    worldSizeZ: terrainWorldSizeZ,
    collision: {
      type: 'baked-terrain-mesh',
      url: collision.url,
      sourceResolution: bakedCollider.sourceResolution,
      colliderResolution: bakedCollider.colliderResolution,
      sampleStep: bakedCollider.sampleStep,
      triangleCount: bakedCollider.triangleCount,
    },
  }
  dispatch('terrainRuntimeReady', detail)
}

$: if (collision?.url && collision.url !== loadedUrl) {
  loadedUrl = collision.url
  void loadBakedCollider(collision)
}

$: dispatchReady()

onDestroy(() => {
  activeLoadToken += 1
})
</script>

{#if bakedCollider}
  <RigidBody type="fixed" position={bakedCollider.position}>
    <Collider
      shape="trimesh"
      args={bakedCollider.args}
      collisionGroups={TERRAIN_GROUP}
      {friction}
      {restitution}
    />
  </RigidBody>
{/if}
