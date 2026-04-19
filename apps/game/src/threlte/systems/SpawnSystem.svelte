<!--
  ECS Spawn System - Proper Game Engine Architecture
  
  This system handles all entity spawning in a clean, scalable way:
  - Levels provide spawn point data only
  - SpawnSystem handles timing, physics safety, and coordination
  - Player component is just a data container
  - Supports multiple spawn types (player, NPCs, items, etc.)
-->
<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte'
  
  const dispatch = createEventDispatcher()
  const isDev = import.meta.env.DEV
  
  // Props
  export let playerComponent: any = null
  export let playerReady = false
  export let physicsReady = false
  export let terrainReady = false
  
  // Spawn queue system for proper ECS architecture
  interface SpawnRequest {
    id: string
    entityType: 'player' | 'npc' | 'item'
    position: [number, number, number]
    component: any
    metadata?: any
    priority: number
  }
  
  let spawnQueue: SpawnRequest[] = []
  let spawnedEntities = new Set<string>()
  let isProcessingSpawn = false

  function isValidPlayerComponent(value: any) {
    return Boolean(value && typeof value.spawnAt === 'function')
  }

  function hasReadyComponentsForQueue() {
    return spawnQueue.every((request) => {
      if (request.entityType === 'player') {
        return playerReady && isValidPlayerComponent(playerComponent)
      }

      return true
    })
  }
  
  // System state
  $: canSpawn = physicsReady && terrainReady && !isProcessingSpawn && hasReadyComponentsForQueue()
  
  // Process spawn queue when conditions are met
  $: if (canSpawn && spawnQueue.length > 0) {
    processSpawnQueue()
  }
  
  /**
   * Add entity to spawn queue (called by levels)
   */
  export function requestSpawn(request: Omit<SpawnRequest, 'id'>) {
    const id = `${request.entityType}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
    
    // Prevent duplicate spawns for the same entity
    const existingRequest = spawnQueue.find(r => 
      r.entityType === request.entityType && 
      r.component === request.component
    )
    
    if (existingRequest) {
      if (isDev) console.log(`⚠️ SpawnSystem: Duplicate spawn request ignored for ${request.entityType}`)
      return false
    }
    
    const spawnRequest: SpawnRequest = { id, ...request }
    
    // Insert based on priority (higher priority first)
    const insertIndex = spawnQueue.findIndex(r => r.priority < request.priority)
    if (insertIndex === -1) {
      spawnQueue.push(spawnRequest)
    } else {
      spawnQueue.splice(insertIndex, 0, spawnRequest)
    }
    
    if (isDev) console.log(`📝 SpawnSystem: Queued ${request.entityType} spawn at [${request.position.join(', ')}]`)
    
    // Trigger reactive update
    spawnQueue = [...spawnQueue]
    
    return true
  }
  
  /**
   * Process spawn queue safely
   */
  async function processSpawnQueue() {
    if (isProcessingSpawn || spawnQueue.length === 0) return
    
    if (isDev) console.log(`🔄 SpawnSystem: Processing ${spawnQueue.length} spawn requests`)
    isProcessingSpawn = true
    
    try {
      // Process highest priority spawns first
      const request = spawnQueue.shift()
      if (!request) return
      
      // Check if already spawned
      if (spawnedEntities.has(request.id)) {
        if (isDev) console.log(`⚠️ SpawnSystem: Entity ${request.id} already spawned`)
        return
      }
      
      // Execute spawn based on entity type
      const success = await executeSpawn(request)
      
      if (success) {
        spawnedEntities.add(request.id)
        if (isDev) console.log(`✅ SpawnSystem: Successfully spawned ${request.entityType} at [${request.position.join(', ')}]`)
        
        // Dispatch spawn event for other systems
        dispatch('entitySpawned', {
          id: request.id,
          entityType: request.entityType,
          position: request.position,
          component: request.component
        })
      } else {
        console.error(`❌ SpawnSystem: Failed to spawn ${request.entityType}`)
      }
      
      // Update queue
      spawnQueue = [...spawnQueue]
      
    } finally {
      isProcessingSpawn = false
      
      // Continue processing remaining queue after short delay
      if (spawnQueue.length > 0) {
        setTimeout(() => processSpawnQueue(), 100)
      }
    }
  }
  
  /**
   * Execute actual spawn based on entity type
   */
  async function executeSpawn(request: SpawnRequest): Promise<boolean> {
    switch (request.entityType) {
      case 'player':
        return spawnPlayer(request)
      
      case 'npc':
        return spawnNPC(request)
      
      case 'item':
        return spawnItem(request)
      
      default:
        console.error(`❌ SpawnSystem: Unknown entity type: ${request.entityType}`)
        return false
    }
  }
  
  /**
   * Spawn player entity
   */
  async function spawnPlayer(request: SpawnRequest): Promise<boolean> {
    const { position } = request
    
    // Use playerComponent from props (passed from Game.svelte)
    if (!isValidPlayerComponent(playerComponent)) {
      console.warn('SpawnSystem: Player spawn requested before player component was ready.')
      return false
    }
    
    try {
      // Reset physics state first
      if (playerComponent.resetPhysics) {
        playerComponent.resetPhysics()
      }
      
      // Execute spawn
      playerComponent.spawnAt(position[0], position[1], position[2])
      
      return true
    } catch (error) {
      console.error('❌ SpawnSystem: Player spawn failed:', error)
      return false
    }
  }
  
  /**
   * Spawn NPC entity (future implementation)
   */
  function spawnNPC(request: SpawnRequest): boolean {
    if (isDev) console.log(`🤖 SpawnSystem: NPC spawning not yet implemented`)
    return false
  }
  
  /**
   * Spawn item entity (future implementation)
   */
  function spawnItem(request: SpawnRequest): boolean {
    if (isDev) console.log(`📦 SpawnSystem: Item spawning not yet implemented`)
    return false
  }
  
  /**
   * Clear spawn queue (for level transitions)
   */
  export function clearSpawnQueue() {
    if (isDev) console.log(`🧹 SpawnSystem: Clearing spawn queue (${spawnQueue.length} pending)`)
    spawnQueue = []
    spawnedEntities.clear()
    isProcessingSpawn = false
  }
  
  /**
   * Get spawn statistics
   */
  export function getStats() {
    return {
      queueLength: spawnQueue.length,
      spawnedCount: spawnedEntities.size,
      isProcessing: isProcessingSpawn
    }
  }
  
  onMount(() => {
    if (isDev) console.log('🎯 SpawnSystem: Initialized')
    
    return () => {
      if (isDev) console.log('🧹 SpawnSystem: Cleanup')
      clearSpawnQueue()
    }
  })
</script>

<!-- SpawnSystem is a pure logic component - no rendering -->
