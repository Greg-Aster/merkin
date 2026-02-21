/**
 * FireflyLightingSystem - Dedicated high-performance lighting system for fireflies
 * 
 * This system's sole responsibility is managing firefly lights efficiently.
 * It uses spatial partitioning and intelligent light management to provide
 * excellent performance even with hundreds of fireflies.
 */

import * as THREE from 'three'
import type { LightingManager } from './LightingManager'
import { SpatialGrid, type SpatialEntity } from './SpatialGrid'
import type { ECSIntegration } from '../../core/ECSIntegration'
import { fireflyQuery, Position, LightEmitter, LightCycling } from '../../core/ECSIntegration'

export interface FireflyLightConfig {
  maxLights: number          // Maximum number of simultaneous lights
  updateFrequency: number    // How often to update lights (Hz)
  twinkleSpeed: number       // Speed of light intensity animation
  fadeSpeed: number          // Speed of light fade in/out
  cullingDistance: number    // Maximum distance for light culling
}

interface LightState {
  entityId: number           // ECS entity ID
  ownerId: string            // Unique owner ID for LightingManager
  intensity: number          // Current light intensity
  targetIntensity: number    // Target intensity (for smooth transitions)
  fadeState: 'off' | 'fading-in' | 'active' | 'fading-out'
  fadeTimer: number          // Timer for fade transitions
  lastUpdate: number         // Last update timestamp
}

export class FireflyLightingSystem {
  private lightingManager: LightingManager
  private ecsWorld: ECSIntegration
  private spatialGrid: SpatialGrid
  private config: FireflyLightConfig
  
  // State management
  private activeLights: Map<string, LightState> = new Map()
  private updateTimer: number = 0
  private frameCounter: number = 0
  
  // Performance tracking
  private stats = {
    lightsActive: 0,
    lightsAvailable: 0,
    entitiesProcessed: 0,
    updateTimeMs: 0,
    spatialCullCount: 0
  }

  constructor(
    lightingManager: LightingManager, 
    ecsWorld: ECSIntegration,
    config: Partial<FireflyLightConfig> = {}
  ) {
    this.lightingManager = lightingManager
    this.ecsWorld = ecsWorld
    
    // Set up spatial grid with reasonable cell size for fireflies
    this.spatialGrid = new SpatialGrid(25) // 25 unit cells
    
    // Configure with defaults
    this.config = {
      maxLights: 25,
      updateFrequency: 15, // 15 Hz - much less frequent than 60fps
      twinkleSpeed: 0.8,
      fadeSpeed: 2.0,
      cullingDistance: 150,
      ...config
    }
    
    console.log('✨ FireflyLightingSystem: Initialized with config:', this.config)
  }

  /**
   * Main update method - called every frame but throttles actual lighting work
   */
  update(deltaTime: number, camera: THREE.Camera): void {
    this.frameCounter++
    this.updateTimer += deltaTime
    
    // Throttle updates based on configured frequency
    const updateInterval = 1.0 / this.config.updateFrequency
    if (this.updateTimer < updateInterval) {
      return // Skip this frame
    }
    
    const actualDeltaTime = this.updateTimer
    this.updateTimer = 0
    
    this.performLightingUpdate(actualDeltaTime, camera)
  }

  /**
   * Perform the actual lighting update (throttled)
   */
  private performLightingUpdate(deltaTime: number, camera: THREE.Camera): void {
    const startTime = performance.now()
    
    // Step 1: Update spatial grid with current firefly positions
    this.updateSpatialGrid()
    
    // Step 2: Get visible fireflies using spatial culling (massive performance gain)
    const visibleFireflies = this.spatialGrid.getVisibleEntities(camera)
    
    // Step 3: Determine which fireflies should have lights (with twinkle logic)
    const lightsToActivate = this.selectFirefliesForLighting(visibleFireflies, deltaTime)
    
    // Step 4: Update light states (fade in/out logic)
    this.updateLightStates(lightsToActivate, deltaTime)
    
    // Step 5: Apply light changes to the LightingManager
    this.applyLightChanges()
    
    // Update stats
    this.stats.updateTimeMs = performance.now() - startTime
    this.stats.entitiesProcessed = visibleFireflies.length
    this.stats.spatialCullCount = this.spatialGrid.getStats().lastCullCount
    
    if (import.meta.env.DEV && this.frameCounter % 300 === 0) { // Log every 5 seconds at 60fps
      this.logPerformanceStats()
    }
  }

  /**
   * Update the spatial grid with current firefly positions from ECS
   */
  private updateSpatialGrid(): void {
    if (!this.ecsWorld?.getWorld) return
    
    const world = this.ecsWorld.getWorld()
    const entities = fireflyQuery(world)
    
    // Update entities incrementally (no need to clear - updateEntity handles moves efficiently)
    
    for (let i = 0; i < entities.length; i++) {
      const eid = entities[i]
      const entity: SpatialEntity = {
        id: eid.toString(),
        position: new THREE.Vector3(
          Position.x[eid],
          Position.y[eid],
          Position.z[eid]
        ),
        data: {
          eid,
          color: LightEmitter.color[eid],
          intensity: LightEmitter.intensity[eid],
          range: LightEmitter.range[eid],
          fadeProgress: LightCycling.fadeProgress[eid]
        }
      }
      
      this.spatialGrid.updateEntity(entity)
    }
  }

  /**
   * Select which visible fireflies should have lights based on twinkle logic
   */
  private selectFirefliesForLighting(visibleFireflies: SpatialEntity[], deltaTime: number): Map<string, SpatialEntity> {
    const selectedFireflies = new Map<string, SpatialEntity>()
    const time = performance.now() / 1000
    
    for (const firefly of visibleFireflies) {
      const eid = firefly.data.eid
      
      // Twinkle logic - sin wave with random phase offset
      const phase = eid * 0.1 // Each firefly has a different phase
      const sinValue = (Math.sin(time * this.config.twinkleSpeed + phase) + 1) / 2
      
      // Light threshold - only brightest part of sin wave gets lights
      const lightThreshold = 0.85
      if (sinValue > lightThreshold) {
        // Calculate fade progress within the "on" period
        const fadeProgress = (sinValue - lightThreshold) / (1 - lightThreshold)
        firefly.data.twinkleFade = Math.max(0.01, fadeProgress)
        selectedFireflies.set(firefly.id, firefly)
        
        // Respect maximum light count
        if (selectedFireflies.size >= this.config.maxLights) {
          break
        }
      }
    }
    
    return selectedFireflies
  }

  /**
   * Update light states with smooth fade transitions
   */
  private updateLightStates(targetLights: Map<string, SpatialEntity>, deltaTime: number): void {
    const currentTime = performance.now()
    
    // Process lights that should be fading out (no longer in target list)
    for (const [ownerId, lightState] of this.activeLights) {
      if (!targetLights.has(lightState.entityId.toString())) {
        if (lightState.fadeState === 'active' || lightState.fadeState === 'fading-in') {
          lightState.fadeState = 'fading-out'
          lightState.fadeTimer = 0
          lightState.targetIntensity = 0
        }
      }
    }
    
    // Process lights that should be fading in (new in target list)
    for (const [entityIdStr, firefly] of targetLights) {
      const ownerId = `firefly_${entityIdStr}`
      let lightState = this.activeLights.get(ownerId)
      
      if (!lightState) {
        // Check budget limit before requesting new light
        if (this.activeLights.size >= this.config.maxLights) {
          continue // Budget is full, skip activating new lights
        }
        
        // New light - request from pool
        const light = this.lightingManager.requestLight(ownerId)
        if (light) {
          lightState = {
            entityId: firefly.data.eid,
            ownerId,
            intensity: 0,
            targetIntensity: firefly.data.intensity * firefly.data.twinkleFade,
            fadeState: 'fading-in',
            fadeTimer: 0,
            lastUpdate: currentTime
          }
          this.activeLights.set(ownerId, lightState)
        }
      } else {
        // Existing light - update target
        lightState.targetIntensity = firefly.data.intensity * firefly.data.twinkleFade
        if (lightState.fadeState === 'fading-out') {
          lightState.fadeState = 'fading-in'
          lightState.fadeTimer = 0
        }
      }
    }
    
    // Update fade timers and intensities
    for (const [ownerId, lightState] of this.activeLights) {
      lightState.fadeTimer += deltaTime
      
      const fadeProgress = Math.min(lightState.fadeTimer / this.config.fadeSpeed, 1.0)
      
      if (lightState.fadeState === 'fading-in') {
        lightState.intensity = lightState.targetIntensity * fadeProgress
        if (fadeProgress >= 1.0) {
          lightState.fadeState = 'active'
        }
      } else if (lightState.fadeState === 'fading-out') {
        const startIntensity = lightState.intensity
        lightState.intensity = startIntensity * (1.0 - fadeProgress)
        if (fadeProgress >= 1.0) {
          // Light fully faded out - remove it
          this.lightingManager.releaseLight(ownerId)
          this.activeLights.delete(ownerId)
          continue
        }
      } else if (lightState.fadeState === 'active') {
        // Active light - smooth transition to target intensity
        const intensityDiff = lightState.targetIntensity - lightState.intensity
        lightState.intensity += intensityDiff * deltaTime * 3.0 // Quick response to intensity changes
      }
      
      lightState.lastUpdate = currentTime
    }
  }

  /**
   * Apply current light states to the LightingManager
   */
  private applyLightChanges(): void {
    for (const [ownerId, lightState] of this.activeLights) {
      if (!this.ecsWorld?.getWorld) continue
      
      const world = this.ecsWorld.getWorld()
      const eid = lightState.entityId
      
      // Update the light with current ECS data
      this.lightingManager.updateLight(ownerId, {
        position: new THREE.Vector3(
          Position.x[eid],
          Position.y[eid],
          Position.z[eid]
        ),
        color: LightEmitter.color[eid],
        intensity: lightState.intensity,
        distance: LightEmitter.range[eid]
      })
    }
    
    // Update stats
    this.stats.lightsActive = this.activeLights.size
    this.stats.lightsAvailable = this.config.maxLights - this.activeLights.size
  }

  /**
   * Update configuration at runtime
   */
  updateConfig(newConfig: Partial<FireflyLightConfig>): void {
    this.config = { ...this.config, ...newConfig }
    console.log('✨ FireflyLightingSystem: Configuration updated:', this.config)
  }

  /**
   * Get performance statistics
   */
  getStats(): typeof this.stats & { spatialGridStats: ReturnType<SpatialGrid['getStats']> } {
    return {
      ...this.stats,
      spatialGridStats: this.spatialGrid.getStats()
    }
  }

  /**
   * Log performance statistics for debugging
   */
  private logPerformanceStats(): void {
    const lightPoolStats = this.lightingManager.getPoolStats()
    const spatialStats = this.spatialGrid.getStats()
    
    console.log('✨ FireflyLightingSystem Performance Stats:')
    console.log(`  Lights: ${this.stats.lightsActive}/${this.config.maxLights} active`)
    console.log(`  Light Pool: ${lightPoolStats.active}/${lightPoolStats.total} used`)
    console.log(`  Update Time: ${this.stats.updateTimeMs.toFixed(2)}ms`)
    console.log(`  Entities Processed: ${this.stats.entitiesProcessed} (culled from ${spatialStats.totalEntities})`)
    console.log(`  Spatial Grid: ${spatialStats.activeCells} cells, ${spatialStats.averageEntitiesPerCell.toFixed(1)} avg entities/cell`)
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    // Release all lights back to the pool
    for (const [ownerId] of this.activeLights) {
      this.lightingManager.releaseLight(ownerId)
    }
    
    this.activeLights.clear()
    this.spatialGrid.clear()
    
    console.log('✨ FireflyLightingSystem: Disposed')
  }
}