<!--
  SpawnSystem executes spawn commands only after GameWorld has reached the
  correct lifecycle phase. It does not queue, retry, or own construction order.
-->
<script lang="ts">
import { createEventDispatcher, onMount } from 'svelte'

const dispatch = createEventDispatcher()
const isDev = import.meta.env.DEV

export let playerComponent: any = null
export let playerReady = false
export let physicsReady = false
export let staticWorldReady = false

interface PlayerSpawnRequest {
  entityType: 'player'
  position: [number, number, number]
  metadata?: any
}

interface SpawnResult {
  success: boolean
  id?: string
  reason?: string
}

let spawnedEntities = new Set<string>()
let spawnSequence = 0

function isValidPlayerComponent(value: any) {
  return Boolean(value && typeof value.spawnAt === 'function')
}

function getSpawnKey(request: PlayerSpawnRequest) {
  return [
    request.entityType,
    request.metadata?.levelName ?? 'level',
    request.position.join(','),
    request.metadata?.spawnReason ?? 'spawn',
  ].join(':')
}

/**
 * Execute one spawn command. GameWorld owns lifecycle ordering and calls this
 * only when static world, physics, and entity components are ready.
 */
export async function requestSpawn(
  request: PlayerSpawnRequest,
): Promise<SpawnResult> {
  if (!staticWorldReady) {
    return {
      success: false,
      reason: 'static-world-not-ready',
    }
  }

  if (!physicsReady) {
    return {
      success: false,
      reason: 'physics-not-ready',
    }
  }

  if (!playerReady) {
    return {
      success: false,
      reason: 'player-component-not-ready',
    }
  }

  if (!isValidPlayerComponent(playerComponent)) {
    return {
      success: false,
      reason: 'invalid-player-component',
    }
  }

  const spawnKey = getSpawnKey(request)
  if (spawnedEntities.has(spawnKey)) {
    if (isDev) {
      console.log(`SpawnSystem: Duplicate spawn ignored for ${spawnKey}`)
    }

    return {
      success: false,
      reason: 'duplicate-spawn',
    }
  }

  const success = await spawnPlayer(request)
  if (!success) {
    console.error(`SpawnSystem: Failed to spawn ${request.entityType}`)
    return {
      success: false,
      reason: 'spawn-execution-failed',
    }
  }

  spawnSequence += 1
  const id = `${request.entityType}-${spawnSequence}`
  spawnedEntities.add(spawnKey)

  if (isDev) {
    console.log(
      `SpawnSystem: Spawned ${request.entityType} at [${request.position.join(', ')}]`,
    )
  }

  dispatch('entitySpawned', {
    id,
    entityType: request.entityType,
    position: request.position,
    metadata: request.metadata,
  })

  return {
    success: true,
    id,
  }
}

async function spawnPlayer(request: PlayerSpawnRequest): Promise<boolean> {
  const { position } = request

  try {
    if (playerComponent.resetPhysics) {
      playerComponent.resetPhysics()
    }

    playerComponent.spawnAt(position[0], position[1], position[2])
    return true
  } catch (error) {
    console.error('SpawnSystem: Player spawn failed:', error)
    return false
  }
}

export function resetSpawnState() {
  if (isDev) console.log('SpawnSystem: Resetting spawn state')
  spawnedEntities.clear()
  spawnSequence = 0
}

export function getStats() {
  return {
    spawnedCount: spawnedEntities.size,
  }
}

onMount(() => {
  if (isDev) console.log('SpawnSystem: Initialized')

  return () => {
    if (isDev) console.log('SpawnSystem: Cleanup')
    resetSpawnState()
  }
})
</script>
