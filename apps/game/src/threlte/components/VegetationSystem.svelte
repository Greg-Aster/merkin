<!--
  ECS-Based Vegetation System for MEGAMEAL
  
  Extends the existing ECS architecture to manage vegetation placement,
  LOD, instancing, and environmental interactions using the nature pack assets.
-->
<script lang="ts">
  import { onMount, onDestroy, getContext } from 'svelte'
  import { T, useLoader, useThrelte } from '@threlte/core'
  import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
  import * as THREE from 'three'
  import { 
    defineComponent, 
    defineQuery, 
    addComponent, 
    addEntity, 
    defineSystem, 
    Types 
  } from 'bitecs'
  import type { ECSWorldManager } from '../core/ECSIntegration'
  import type { SystemRegistry } from '../core/LevelSystem'

  // =============================================================================
  // VEGETATION ECS COMPONENTS
  // =============================================================================

  // Vegetation-specific components extending the existing ECS system
  export const VegetationTag = defineComponent()
  export const VegetationType = defineComponent({
    type: Types.ui8, // 0=tree, 1=bush, 2=grass, 3=flower
    variant: Types.ui8 // Which specific model variant
  })
  
  export const VegetationLOD = defineComponent({
    currentLOD: Types.ui8, // 0=high, 1=medium, 2=low, 3=culled
    distanceToPlayer: Types.f32,
    lastLODUpdate: Types.f32
  })
  
  export const VegetationWind = defineComponent({
    windStrength: Types.f32,
    windDirection: Types.f32,
    swayAmplitude: Types.f32,
    swayFrequency: Types.f32
  })

  export const VegetationGrowth = defineComponent({
    scale: Types.f32,
    maxScale: Types.f32,
    growthRate: Types.f32,
    maturityLevel: Types.f32 // 0-1, affects wind response
  })

  // ECS Queries for vegetation systems
  const vegetationQuery = defineQuery([VegetationTag])
  const vegetationLODQuery = defineQuery([VegetationTag, VegetationLOD])
  const vegetationWindQuery = defineQuery([VegetationTag, VegetationWind])

  // Component props and context
  export let getHeightAt: (x: number, z: number) => number
  export let count = 200 // Total vegetation instances
  export let radius = 180 // Distribution radius
  export let density = 0.8 // Vegetation density (0-1)
  export let enableWind = true
  export let enableLOD = true
  export let lodUpdateFrequency = 2.0 // seconds between LOD updates

  // Get ECS context
  const registry: SystemRegistry = getContext('systemRegistry')
  const ecsWorld: ECSWorldManager = getContext('ecsWorld')
  
  // Asset configuration based on your nature pack
  const VEGETATION_ASSETS = {
    trees: {
      birch: [
        '/assets/game/nature_pack/drive-download-20250708T221847Z-1-001/glTF/BirchTree_1.gltf',
        '/assets/game/nature_pack/drive-download-20250708T221847Z-1-001/glTF/BirchTree_2.gltf',
        '/assets/game/nature_pack/drive-download-20250708T221847Z-1-001/glTF/BirchTree_3.gltf',
        '/assets/game/nature_pack/drive-download-20250708T221847Z-1-001/glTF/BirchTree_4.gltf',
        '/assets/game/nature_pack/drive-download-20250708T221847Z-1-001/glTF/BirchTree_5.gltf'
      ],
      maple: [
        '/assets/game/nature_pack/drive-download-20250708T221847Z-1-001/glTF/MapleTree_1.gltf',
        '/assets/game/nature_pack/drive-download-20250708T221847Z-1-001/glTF/MapleTree_2.gltf',
        '/assets/game/nature_pack/drive-download-20250708T221847Z-1-001/glTF/MapleTree_3.gltf',
        '/assets/game/nature_pack/drive-download-20250708T221847Z-1-001/glTF/MapleTree_4.gltf',
        '/assets/game/nature_pack/drive-download-20250708T221847Z-1-001/glTF/MapleTree_5.gltf'
      ],
      dead: [
        '/assets/game/nature_pack/drive-download-20250708T221847Z-1-001/glTF/DeadTree_1.gltf',
        '/assets/game/nature_pack/drive-download-20250708T221847Z-1-001/glTF/DeadTree_2.gltf',
        '/assets/game/nature_pack/drive-download-20250708T221847Z-1-001/glTF/DeadTree_3.gltf',
        '/assets/game/nature_pack/drive-download-20250708T221847Z-1-001/glTF/DeadTree_4.gltf',
        '/assets/game/nature_pack/drive-download-20250708T221847Z-1-001/glTF/DeadTree_5.gltf'
      ]
    },
    bushes: [
      '/assets/game/nature_pack/drive-download-20250708T221847Z-1-001/glTF/Bush.gltf',
      '/assets/game/nature_pack/drive-download-20250708T221847Z-1-001/glTF/Bush_Large.gltf',
      '/assets/game/nature_pack/drive-download-20250708T221847Z-1-001/glTF/Bush_Small.gltf',
      '/assets/game/nature_pack/drive-download-20250708T221847Z-1-001/glTF/Bush_Flowers.gltf',
      '/assets/game/nature_pack/drive-download-20250708T221847Z-1-001/glTF/Bush_Large_Flowers.gltf',
      '/assets/game/nature_pack/drive-download-20250708T221847Z-1-001/glTF/Bush_Small_Flowers.gltf'
    ],
    grass: [
      '/assets/game/nature_pack/drive-download-20250708T221847Z-1-001/glTF/Grass_Large.gltf',
      '/assets/game/nature_pack/drive-download-20250708T221847Z-1-001/glTF/Grass_Small.gltf',
      '/assets/game/nature_pack/drive-download-20250708T221847Z-1-001/glTF/Grass_Large_Extruded.gltf'
    ],
    flowers: [
      '/assets/game/nature_pack/drive-download-20250708T221847Z-1-001/glTF/Flower_1.gltf',
      '/assets/game/nature_pack/drive-download-20250708T221847Z-1-001/glTF/Flower_2.gltf',
      '/assets/game/nature_pack/drive-download-20250708T221847Z-1-001/glTF/Flower_1_Clump.gltf',
      '/assets/game/nature_pack/drive-download-20250708T221847Z-1-001/glTF/Flower_2_Clump.gltf',
      '/assets/game/nature_pack/drive-download-20250708T221847Z-1-001/glTF/Flower_3_Clump.gltf',
      '/assets/game/nature_pack/drive-download-20250708T221847Z-1-001/glTF/Flower_4_Clump.gltf',
      '/assets/game/nature_pack/drive-download-20250708T221847Z-1-001/glTF/Flower_5_Clump.gltf'
    ]
  }

  // State management
  let vegetationEntities: number[] = []
  let loadedModels: Map<string, THREE.Group> = new Map()
  let instancedMeshes: Map<string, THREE.InstancedMesh> = new Map()
  let isInitialized = false
  let playerPosition = new THREE.Vector3(0, 0, 0)

  // Performance monitoring
  let lastLODUpdateTime = 0
  let vegetationSystemId = 'vegetation-system'

  onMount(async () => {
    console.log('🌱 Initializing ECS Vegetation System...')
    
    try {
      await loadVegetationAssets()
      setupVegetationSystems()
      await populateVegetation()
      
      isInitialized = true
      console.log(`✅ Vegetation system initialized with ${vegetationEntities.length} plants`)
    } catch (error) {
      console.error('❌ Failed to initialize vegetation system:', error)
    }
  })

  /**
   * Load all vegetation assets using the existing AssetLoader
   */
  async function loadVegetationAssets() {
    const loader = new GLTFLoader()
    const loadPromises: Promise<void>[] = []

    // Load a representative sample of each type for performance
    const loadAsset = async (url: string, key: string) => {
      try {
        const gltf = await loader.loadAsync(url)
        loadedModels.set(key, gltf.scene)
        console.log(`📦 Loaded vegetation asset: ${key}`)
      } catch (error) {
        console.warn(`⚠️ Failed to load ${key} from ${url}:`, error)
      }
    }

    // Load sample assets for instancing
    loadPromises.push(loadAsset(VEGETATION_ASSETS.trees.birch[0], 'birch_tree'))
    loadPromises.push(loadAsset(VEGETATION_ASSETS.trees.maple[0], 'maple_tree'))
    loadPromises.push(loadAsset(VEGETATION_ASSETS.trees.dead[0], 'dead_tree'))
    loadPromises.push(loadAsset(VEGETATION_ASSETS.bushes[0], 'bush'))
    loadPromises.push(loadAsset(VEGETATION_ASSETS.bushes[1], 'bush_large'))
    loadPromises.push(loadAsset(VEGETATION_ASSETS.grass[0], 'grass'))
    loadPromises.push(loadAsset(VEGETATION_ASSETS.flowers[0], 'flowers'))

    await Promise.all(loadPromises)
    console.log(`✅ Loaded ${loadedModels.size} vegetation assets`)
  }

  /**
   * Setup ECS systems for vegetation management
   */
  function setupVegetationSystems() {
    if (!ecsWorld) {
      console.warn('⚠️ ECS World not available for vegetation systems')
      return
    }

    let systemCounter = 0

    // LOD System - Updates vegetation detail based on distance to player
    ecsWorld.addSystem(defineSystem((world) => {
      systemCounter++
      
      // Only update LOD every 2 seconds for performance
      if (systemCounter % 120 !== 0) return world
      
      const entities = vegetationLODQuery(world)
      const currentTime = performance.now() * 0.001
      
      for (let i = 0; i < entities.length; i++) {
        const eid = entities[i]
        
        // Calculate distance to player (simplified - you could get actual player pos from ECS)
        const vegX = world.Position?.x[eid] || 0
        const vegZ = world.Position?.z[eid] || 0
        const distance = Math.sqrt(
          Math.pow(vegX - playerPosition.x, 2) + 
          Math.pow(vegZ - playerPosition.z, 2)
        )
        
        VegetationLOD.distanceToPlayer[eid] = distance
        VegetationLOD.lastLODUpdate[eid] = currentTime
        
        // Update LOD level based on distance
        let newLOD = 0 // high detail
        if (distance > 50) newLOD = 1      // medium detail
        if (distance > 100) newLOD = 2     // low detail  
        if (distance > 200) newLOD = 3     // culled
        
        VegetationLOD.currentLOD[eid] = newLOD
      }
      
      return world
    }))

    // Wind System - Animates vegetation based on wind parameters
    if (enableWind) {
      ecsWorld.addSystem(defineSystem((world) => {
        // Update wind animation every frame for smooth movement
        const entities = vegetationWindQuery(world)
        const time = performance.now() * 0.001
        
        for (let i = 0; i < entities.length; i++) {
          const eid = entities[i]
          
          // Calculate wind effect (this would affect rendering in a real implementation)
          const windPhase = time * VegetationWind.swayFrequency[eid] + eid * 0.1
          const windEffect = Math.sin(windPhase) * VegetationWind.swayAmplitude[eid]
          
          // In a full implementation, this would update the actual mesh transforms
          // For now, we're just calculating the values for future use
        }
        
        return world
      }))
    }

    console.log('🔧 Vegetation ECS systems initialized')
  }

  /**
   * Populate the terrain with vegetation using distribution algorithms
   */
  async function populateVegetation() {
    if (!ecsWorld || !getHeightAt) {
      console.warn('⚠️ Missing requirements for vegetation population')
      return
    }

    const world = ecsWorld.getWorld()
    
    for (let i = 0; i < count; i++) {
      // Generate random position within radius
      const angle = Math.random() * Math.PI * 2
      const distance = Math.sqrt(Math.random()) * radius * density
      const x = Math.cos(angle) * distance
      const z = Math.sin(angle) * distance
      
      // Get terrain height
      const groundHeight = getHeightAt(x, z)
      
      // Skip underwater or very steep areas
      if (groundHeight < -2) continue
      
      // Create vegetation entity
      const eid = addEntity(world)
      vegetationEntities.push(eid)
      
      // Add core components
      addComponent(world, VegetationTag, eid)
      addComponent(world, world.Position, eid) // Use existing Position component
      addComponent(world, VegetationType, eid)
      addComponent(world, VegetationLOD, eid)
      addComponent(world, VegetationGrowth, eid)
      
      if (enableWind) {
        addComponent(world, VegetationWind, eid)
      }
      
      // Set position
      world.Position.x[eid] = x
      world.Position.y[eid] = groundHeight
      world.Position.z[eid] = z
      
      // Determine vegetation type based on terrain and randomness
      let vegType = 0 // trees by default
      let variant = 0
      
      // Biome-based distribution
      if (distance < 50) {
        // Inner area - mixed trees and bushes
        vegType = Math.random() < 0.7 ? 0 : 1 // 70% trees, 30% bushes
        variant = Math.floor(Math.random() * (vegType === 0 ? 3 : 6))
      } else if (distance < 120) {
        // Middle area - mostly bushes and grass
        vegType = Math.random() < 0.4 ? 1 : (Math.random() < 0.7 ? 2 : 3) // bushes, grass, flowers
        variant = Math.floor(Math.random() * (vegType === 1 ? 6 : (vegType === 2 ? 3 : 7)))
      } else {
        // Outer area - sparse grass and dead trees
        vegType = Math.random() < 0.3 ? 0 : 2 // 30% dead trees, 70% grass
        variant = vegType === 0 ? 2 : Math.floor(Math.random() * 3) // dead tree variant or grass
      }
      
      VegetationType.type[eid] = vegType
      VegetationType.variant[eid] = variant
      
      // Initialize LOD
      VegetationLOD.currentLOD[eid] = 0
      VegetationLOD.distanceToPlayer[eid] = distance
      VegetationLOD.lastLODUpdate[eid] = 0
      
      // Initialize growth
      const scale = 0.8 + Math.random() * 0.4 // Random scale variation
      VegetationGrowth.scale[eid] = scale
      VegetationGrowth.maxScale[eid] = scale
      VegetationGrowth.growthRate[eid] = 0.1 + Math.random() * 0.2
      VegetationGrowth.maturityLevel[eid] = Math.random()
      
      // Initialize wind if enabled
      if (enableWind) {
        VegetationWind.windStrength[eid] = 0.5 + Math.random() * 0.5
        VegetationWind.windDirection[eid] = Math.random() * Math.PI * 2
        VegetationWind.swayAmplitude[eid] = vegType === 0 ? 0.02 : 0.05 // Trees sway less
        VegetationWind.swayFrequency[eid] = 0.5 + Math.random() * 0.5
      }
    }
    
    console.log(`🌱 Populated ${vegetationEntities.length} vegetation entities`)
  }

  /**
   * Update player position for LOD calculations
   */
  export function updatePlayerPosition(position: THREE.Vector3) {
    playerPosition.copy(position)
  }

  /**
   * Get vegetation statistics for debugging
   */
  export function getVegetationStats() {
    if (!ecsWorld) return null
    
    const world = ecsWorld.getWorld()
    const entities = vegetationQuery(world)
    
    let lodCounts = { high: 0, medium: 0, low: 0, culled: 0 }
    let typeCounts = { trees: 0, bushes: 0, grass: 0, flowers: 0 }
    
    for (let i = 0; i < entities.length; i++) {
      const eid = entities[i]
      
      // Count LOD levels
      const lod = VegetationLOD.currentLOD[eid]
      if (lod === 0) lodCounts.high++
      else if (lod === 1) lodCounts.medium++
      else if (lod === 2) lodCounts.low++
      else lodCounts.culled++
      
      // Count types
      const type = VegetationType.type[eid]
      if (type === 0) typeCounts.trees++
      else if (type === 1) typeCounts.bushes++
      else if (type === 2) typeCounts.grass++
      else typeCounts.flowers++
    }
    
    return {
      totalCount: entities.length,
      lodDistribution: lodCounts,
      typeDistribution: typeCounts,
      loadedAssets: loadedModels.size
    }
  }

  onDestroy(() => {
    // Clean up vegetation entities
    if (ecsWorld && vegetationEntities.length > 0) {
      console.log(`🧹 Cleaning up ${vegetationEntities.length} vegetation entities`)
      vegetationEntities = []
    }
    
    // Clean up loaded models
    loadedModels.clear()
    instancedMeshes.clear()
    
    console.log('🧹 Vegetation system disposed')
  })
</script>

<!-- 
  Vegetation Rendering
  
  This renders instanced meshes for performance. In a full implementation,
  this would create InstancedMesh objects for each vegetation type and
  update their matrices based on ECS entity positions and LOD levels.
-->
<T.Group name="vegetation-system">
  
  {#if isInitialized}
    <!-- Trees Group -->
    <T.Group name="trees">
      {#each Array.from(loadedModels.entries()) as [key, model]}
        {#if key.includes('tree')}
          <!-- This would be replaced with instanced meshes in production -->
          <T.Group name={key}>
            <!-- Placeholder for instanced tree meshes -->
          </T.Group>
        {/if}
      {/each}
    </T.Group>
    
    <!-- Bushes Group -->
    <T.Group name="bushes">
      {#each Array.from(loadedModels.entries()) as [key, model]}
        {#if key.includes('bush')}
          <T.Group name={key}>
            <!-- Placeholder for instanced bush meshes -->
          </T.Group>
        {/if}
      {/each}
    </T.Group>
    
    <!-- Grass Group -->
    <T.Group name="grass">
      {#each Array.from(loadedModels.entries()) as [key, model]}
        {#if key.includes('grass')}
          <T.Group name={key}>
            <!-- Placeholder for instanced grass meshes -->
          </T.Group>
        {/if}
      {/each}
    </T.Group>
    
    <!-- Flowers Group -->
    <T.Group name="flowers">
      {#each Array.from(loadedModels.entries()) as [key, model]}
        {#if key.includes('flower')}
          <T.Group name={key}>
            <!-- Placeholder for instanced flower meshes -->
          </T.Group>
        {/if}
      {/each}
    </T.Group>
    
  {:else}
    <!-- Loading indicator -->
    <T.Group name="loading">
      <T.Mesh position={[0, 5, 0]}>
        <T.SphereGeometry args={[1]} />
        <T.MeshBasicMaterial color="#90EE90" transparent opacity={0.5} />
      </T.Mesh>
    </T.Group>
  {/if}
  
</T.Group>

<style>
  /* No styles needed */
</style>