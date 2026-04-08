/**
 * Hybrid ECS Integration for MEGAMEAL
 * 
 * This bridges our existing modular component system with a high-performance
 * ECS for managing dynamic game objects like fireflies, particles, etc.
 */

import { createWorld, defineComponent, defineQuery, addComponent, addEntity, defineSystem, Types } from 'bitecs'
import * as THREE from 'three'
import type { SystemRegistry, LevelContext } from './LevelSystem'

// =============================================================================
// ECS COMPONENT DEFINITIONS
// =============================================================================

// Core transform components
export const Position = defineComponent({
  x: Types.f32,
  y: Types.f32, 
  z: Types.f32
})

export const Velocity = defineComponent({
  x: Types.f32,
  y: Types.f32,
  z: Types.f32
})

export const Rotation = defineComponent({
  x: Types.f32,
  y: Types.f32,
  z: Types.f32,
  w: Types.f32
})

// Rendering components
export const RenderableSprite = defineComponent({
  color: Types.ui32,
  intensity: Types.f32,
  size: Types.f32,
  opacity: Types.f32
})

export const LightEmitter = defineComponent({
  color: Types.ui32,
  intensity: Types.f32,
  range: Types.f32,
  decay: Types.f32
})

// Game-specific components
export const FireflyTag = defineComponent() // Empty tag component

export const EmotionalResponder = defineComponent({
  wonderFactor: Types.f32,
  melancholyFactor: Types.f32,
  hopeFactor: Types.f32,
  discoveryFactor: Types.f32
})

export const PlayerTag = defineComponent() // Player identification

export const FloatingBehavior = defineComponent({
  amplitude: Types.f32,
  frequency: Types.f32,
  phase: Types.f32,
  wanderRadius: Types.f32
})

export const TerrainFollower = defineComponent({
  minHeightOffset: Types.f32, // Minimum height above ground
  maxHeightOffset: Types.f32  // Maximum height above ground
})

export const LightCycling = defineComponent({
  isActive: Types.ui8,
  fadeProgress: Types.f32,
  cycleTime: Types.f32,
  maxCycleTime: Types.f32
})

// Global game state (singleton entity)
export const EmotionalState = defineComponent({
  wonder: Types.f32,
  melancholy: Types.f32, 
  hope: Types.f32,
  discovery: Types.f32
})

// =============================================================================
// ECS QUERIES (for system performance)
// =============================================================================

export const fireflyQuery = defineQuery([FireflyTag, Position, Velocity, LightEmitter])
export const lightEmitterQuery = defineQuery([Position, LightEmitter])
export const emotionalResponderQuery = defineQuery([EmotionalResponder, LightEmitter])
export const playerQuery = defineQuery([PlayerTag, Position])
export const floatingEntitiesQuery = defineQuery([Position, Velocity, FloatingBehavior])
export const terrainFollowingQuery = defineQuery([Position, TerrainFollower])
export const lightCyclingQuery = defineQuery([LightCycling, LightEmitter])

// =============================================================================
// ECS WORLD MANAGER
// =============================================================================

export class ECSWorldManager {
  private world: any
  private systems: Array<(world: any, deltaTime: number) => void> = []
  private registry: SystemRegistry
  private emotionalStateEntity: number
  private getHeightAt?: (x: number, z: number) => number
  private originalIntensities: Map<number, number> = new Map() // Store original prop values

  constructor(registry: SystemRegistry) {
    this.world = createWorld()
    this.registry = registry
    
    // Create singleton emotional state entity
    this.emotionalStateEntity = addEntity(this.world)
    addComponent(this.world, EmotionalState, this.emotionalStateEntity)
    
    // Initialize emotional state
    EmotionalState.wonder[this.emotionalStateEntity] = 50
    EmotionalState.melancholy[this.emotionalStateEntity] = 20
    EmotionalState.hope[this.emotionalStateEntity] = 60
    EmotionalState.discovery[this.emotionalStateEntity] = 30
    
    this.setupCoreSystems()
    console.log('🔧 ECS World initialized')
  }

  setTerrainHeightFunction(getHeightAt: (x: number, z: number) => number): void {
    this.getHeightAt = getHeightAt
  }

  private setupCoreSystems(): void {
    let systemUpdateCounter = 0
    
    // Movement system - updates positions based on velocity (reduced frequency)
    this.addSystem(defineSystem((world) => {
      systemUpdateCounter++
      
      // Only update positions every other frame for better performance
      if (systemUpdateCounter % 2 !== 0) return world
      
      const entities = floatingEntitiesQuery(world)
      const deltaTime = 0.032 // Compensate for reduced frequency (2 * 0.016)
      
      for (let i = 0; i < entities.length; i++) {
        const eid = entities[i]
        
        Position.x[eid] += Velocity.x[eid] * deltaTime
        Position.y[eid] += Velocity.y[eid] * deltaTime
        Position.z[eid] += Velocity.z[eid] * deltaTime
      }
      
      return world
    }))

    // Floating behavior system (much less frequent updates)
    this.addSystem(defineSystem((world) => {
      // Only update floating behavior every 4 frames (~15fps)
      if (systemUpdateCounter % 4 !== 0) return world
      
      const entities = floatingEntitiesQuery(world)
      const time = performance.now() * 0.001
      
      for (let i = 0; i < entities.length; i++) {
        const eid = entities[i]
        const behavior = FloatingBehavior
        
        // Apply floating motion
        const phase = behavior.phase[eid] + time * behavior.frequency[eid]
        Velocity.y[eid] = Math.sin(phase) * behavior.amplitude[eid]
        
        // Apply wandering (reduced calculation frequency)
        const wanderX = Math.cos(time * 0.1 + eid) * behavior.wanderRadius[eid] * 0.1
        const wanderZ = Math.sin(time * 0.1 + eid * 1.3) * behavior.wanderRadius[eid] * 0.1
        
        Velocity.x[eid] = wanderX
        Velocity.z[eid] = wanderZ
      }
      
      return world
    }))

    // Light cycling system - DISABLED for component-level random cycling
    // The HybridFireflyComponent now handles all light selection and cycling
    /*
    this.addSystem(defineSystem((world) => {
      const entities = lightCyclingQuery(world)
      const deltaTime = 0.016 // Assume 60fps
      
      for (let i = 0; i < entities.length; i++) {
        const eid = entities[i]
        
        // Update cycle time
        LightCycling.cycleTime[eid] += deltaTime
        
        // Update fade progress
        const targetFade = LightCycling.isActive[eid] ? 1.0 : 0.0
        const currentFade = LightCycling.fadeProgress[eid]
        const fadeDirection = targetFade - currentFade
        
        LightCycling.fadeProgress[eid] += fadeDirection * 0.3 * deltaTime
        LightCycling.fadeProgress[eid] = Math.max(0, Math.min(1, LightCycling.fadeProgress[eid]))
        
        // Apply fade to light intensity
        LightEmitter.intensity[eid] *= LightCycling.fadeProgress[eid]
      }
      
      return world
    }))
    */

    // Terrain following system - keeps entities above ground (less frequent)
    this.addSystem(defineSystem((world) => {
      if (!this.getHeightAt) return world // Skip if no terrain function
      
      // Only check terrain every 8 frames (~7.5fps) - terrain doesn't change much
      if (systemUpdateCounter % 8 !== 0) return world
      
      const entities = terrainFollowingQuery(world)
      
      for (let i = 0; i < entities.length; i++) {
        const eid = entities[i]
        
        // Get current position
        const x = Position.x[eid]
        const z = Position.z[eid]
        const currentY = Position.y[eid]
        
        // Get ground height at current position
        const groundHeight = this.getHeightAt(x, z)
        const minY = groundHeight + TerrainFollower.minHeightOffset[eid]
        const maxY = groundHeight + TerrainFollower.maxHeightOffset[eid]
        
        // Constrain Y position to stay above ground but below max height
        if (currentY < minY) {
          Position.y[eid] = minY
          // Add upward velocity to lift firefly above ground
          Velocity.y[eid] = Math.max(Velocity.y[eid], 0.5)
        } else if (currentY > maxY) {
          Position.y[eid] = maxY
          // Add downward velocity to bring firefly down
          Velocity.y[eid] = Math.min(Velocity.y[eid], -0.2)
        }
      }
      
      return world
    }))

    // Emotional responsiveness system (very infrequent updates)
    this.addSystem(defineSystem((world) => {
      // Only update emotional effects every 30 frames (~2fps) - emotions change slowly
      if (systemUpdateCounter % 30 !== 0) return world
      
      const entities = emotionalResponderQuery(world)
      const emotionalState = this.getEmotionalState()
      
      for (let i = 0; i < entities.length; i++) {
        const eid = entities[i]
        const responder = EmotionalResponder
        
        // Calculate emotional influence
        const wonderInfluence = emotionalState.wonder * responder.wonderFactor[eid] * 0.01
        const melancholyInfluence = emotionalState.melancholy * responder.melancholyFactor[eid] * 0.01
        const hopeInfluence = emotionalState.hope * responder.hopeFactor[eid] * 0.01
        const discoveryInfluence = emotionalState.discovery * responder.discoveryFactor[eid] * 0.01
        
        // Apply emotional influence to the ORIGINAL intensity (not hardcoded value)
        // Use the stored original intensity as the base
        const originalIntensity = this.originalIntensities.get(eid) || LightEmitter.intensity[eid]
        const emotionalMultiplier = 1.0 + wonderInfluence + hopeInfluence - melancholyInfluence * 0.5
        LightEmitter.intensity[eid] = originalIntensity * emotionalMultiplier
      }
      
      return world
    }))
  }

  addSystem(system: (world: any, deltaTime: number) => void): void {
    this.systems.push(system)
  }

  update(deltaTime: number): void {
    // Run all ECS systems
    for (const system of this.systems) {
      system(this.world, deltaTime)
    }
  }

  getWorld(): any {
    return this.world
  }

  getEmotionalState() {
    return {
      wonder: EmotionalState.wonder[this.emotionalStateEntity],
      melancholy: EmotionalState.melancholy[this.emotionalStateEntity],
      hope: EmotionalState.hope[this.emotionalStateEntity],
      discovery: EmotionalState.discovery[this.emotionalStateEntity]
    }
  }

  updateEmotionalState(wonder?: number, melancholy?: number, hope?: number, discovery?: number): void {
    if (wonder !== undefined) EmotionalState.wonder[this.emotionalStateEntity] = wonder
    if (melancholy !== undefined) EmotionalState.melancholy[this.emotionalStateEntity] = melancholy
    if (hope !== undefined) EmotionalState.hope[this.emotionalStateEntity] = hope
    if (discovery !== undefined) EmotionalState.discovery[this.emotionalStateEntity] = discovery
    
    console.log('🎭 Emotional state updated:', this.getEmotionalState())
  }

  // Modern ECS entity creation with configuration
  createFirefly(position: THREE.Vector3, color: number, config: {
    lightIntensity: number
    lightRange: number
    cycleDuration: number
    floatAmplitude: number
    wanderRadius: number
    size: number
    emissiveIntensity: number
  }): number {
    const eid = addEntity(this.world)
    
    addComponent(this.world, FireflyTag, eid)
    addComponent(this.world, Position, eid)
    addComponent(this.world, Velocity, eid)
    addComponent(this.world, LightEmitter, eid)
    addComponent(this.world, EmotionalResponder, eid)
    addComponent(this.world, FloatingBehavior, eid)
    addComponent(this.world, LightCycling, eid)
    addComponent(this.world, RenderableSprite, eid)
    addComponent(this.world, TerrainFollower, eid)
    
    // Set position
    Position.x[eid] = position.x
    Position.y[eid] = position.y
    Position.z[eid] = position.z
    
    // Configure light with passed parameters
    LightEmitter.color[eid] = color
    LightEmitter.intensity[eid] = config.lightIntensity
    LightEmitter.range[eid] = config.lightRange
    LightEmitter.decay[eid] = 1.2
    
    // Store original intensity for emotional system
    this.originalIntensities.set(eid, config.lightIntensity)
    
    // Configure emotional responsiveness
    EmotionalResponder.wonderFactor[eid] = Math.random() * 0.5 + 0.5
    EmotionalResponder.melancholyFactor[eid] = Math.random() * 0.3
    EmotionalResponder.hopeFactor[eid] = Math.random() * 0.4 + 0.3
    EmotionalResponder.discoveryFactor[eid] = Math.random() * 0.6 + 0.4
    
    // Configure floating behavior with passed parameters
    FloatingBehavior.amplitude[eid] = config.floatAmplitude
    FloatingBehavior.frequency[eid] = 0.2 + Math.random() * 0.3
    FloatingBehavior.phase[eid] = Math.random() * Math.PI * 2
    FloatingBehavior.wanderRadius[eid] = config.wanderRadius
    
    // Configure light cycling with passed parameters - set to always active
    // since component-level cycling now handles selection
    LightCycling.isActive[eid] = 1 // Always active
    LightCycling.fadeProgress[eid] = 1.0 // Always full brightness
    LightCycling.cycleTime[eid] = 0
    LightCycling.maxCycleTime[eid] = config.cycleDuration
    
    // Configure rendering with passed parameters
    RenderableSprite.color[eid] = color
    RenderableSprite.intensity[eid] = config.emissiveIntensity
    RenderableSprite.size[eid] = config.size
    RenderableSprite.opacity[eid] = 0.9
    
    // Configure terrain following
    TerrainFollower.minHeightOffset[eid] = 2.0  // Stay at least 2 units above ground (eye level)
    TerrainFollower.maxHeightOffset[eid] = 6.0  // Don't go higher than 6 units above ground
    
    return eid
  }

  createPlayer(position: THREE.Vector3): number {
    const eid = addEntity(this.world)
    
    addComponent(this.world, PlayerTag, eid)
    addComponent(this.world, Position, eid)
    addComponent(this.world, Velocity, eid)
    
    Position.x[eid] = position.x
    Position.y[eid] = position.y
    Position.z[eid] = position.z
    
    return eid
  }

  // Get all active lights for external systems (like ocean reflections)
  getActiveLights(): Array<{position: THREE.Vector3, color: THREE.Color, intensity: number, distance: number}> {
    const lights: Array<{position: THREE.Vector3, color: THREE.Color, intensity: number, distance: number}> = []
    const entities = lightEmitterQuery(this.world)
    
    for (let i = 0; i < entities.length; i++) {
      const eid = entities[i]
      
      // Only include lights with significant intensity
      if (LightEmitter.intensity[eid] > 0.1) {
        lights.push({
          position: new THREE.Vector3(
            Position.x[eid],
            Position.y[eid], 
            Position.z[eid]
          ),
          color: new THREE.Color(LightEmitter.color[eid]),
          intensity: LightEmitter.intensity[eid],
          distance: LightEmitter.range[eid]
        })
      }
    }
    
    return lights
  }

  dispose(): void {
    // Clean up ECS world
    console.log('🧹 ECS World disposed')
  }
}