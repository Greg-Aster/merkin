/**
 * Lighting Manager - Industry standard lighting system
 */

import * as THREE from 'three'
import { writable, type Writable } from 'svelte/store'
import { MessageType, type SystemRegistry } from '../../core/LevelSystem'

export interface LightingData {
  ambient: {
    color: THREE.Color
    intensity: number
  }
  directional: Array<{
    direction: THREE.Vector3
    color: THREE.Color
    intensity: number
    castShadow: boolean
  }>
  point: Array<{
    position: THREE.Vector3
    color: THREE.Color
    intensity: number
    distance: number
    decay: number
  }>
  spot: Array<{
    position: THREE.Vector3
    target: THREE.Vector3
    color: THREE.Color
    intensity: number
    distance: number
    angle: number
    penumbra: number
  }>
}

export class LightingManager {
  private lightingData: Writable<LightingData>
  private registry: SystemRegistry
  private scene: THREE.Scene
  
  // Actual THREE.js light objects
  private ambientLight: THREE.AmbientLight
  private directionalLights: THREE.DirectionalLight[] = []
  private pointLights: THREE.PointLight[] = []
  private spotLights: THREE.SpotLight[] = []
  
  // Enhanced point light pool for dynamic lights with efficient management
  private pointLightPool: THREE.PointLight[] = []
  private activePointLights: Set<THREE.PointLight> = new Set()
  private ownedLights: Map<string, THREE.PointLight> = new Map() // Track lights by owner ID

  constructor(registry: SystemRegistry) {
    this.registry = registry
    this.lightingData = writable({
      ambient: { color: new THREE.Color(0x404060), intensity: 1.0 },
      directional: [],
      point: [],
      spot: []
    })

    // Subscribe to lighting data changes and broadcast to all components
    this.lightingData.subscribe(data => {
      // Only update lights if scene is initialized
      if (this.scene) {
        this.updateLightsFromData(data)
      }
      this.registry.sendMessage({
        type: MessageType.LIGHTING_UPDATE,
        source: 'lighting-manager',
        data: data,
        timestamp: Date.now(),
        priority: 'normal'
      })
    })
  }

  initialize(scene: THREE.Scene): void {
    this.scene = scene
    
    // Create default ambient light
    this.ambientLight = new THREE.AmbientLight(0x404060, 1.0)
    this.scene.add(this.ambientLight)

    // Initialize point light pool for performance
    this.initializePointLightPool()

    console.log('💡 LightingManager: Initialized with scene')
  }

  private initializePointLightPool(poolSize: number = 50): void {
    if (!this.scene) {
      console.error('❌ LightingManager: Cannot initialize point light pool without scene')
      return
    }
    
    // Pre-create point lights for performance
    for (let i = 0; i < poolSize; i++) {
      const light = new THREE.PointLight(0xffffff, 0, 0, 2)
      light.visible = false
      this.scene.add(light)
      this.pointLightPool.push(light)
    }
    console.log(`💡 LightingManager: Created point light pool with ${poolSize} lights`)
  }

  private updateLightsFromData(data: LightingData): void {
    // Update ambient light
    this.ambientLight.color = data.ambient.color
    this.ambientLight.intensity = data.ambient.intensity

    // Update directional lights
    this.updateDirectionalLights(data.directional)
    
    // Update point lights
    this.updatePointLightsFromData(data.point)
  }

  private updateDirectionalLights(directionalData: LightingData['directional']): void {
    // Remove excess directional lights
    while (this.directionalLights.length > directionalData.length) {
      const light = this.directionalLights.pop()!
      this.scene.remove(light)
    }

    // Update existing and create new directional lights
    directionalData.forEach((data, index) => {
      if (index < this.directionalLights.length) {
        // Update existing light
        const light = this.directionalLights[index]
        light.position.copy(data.direction).multiplyScalar(100) // Position far in direction
        light.color = data.color
        light.intensity = data.intensity
        light.castShadow = data.castShadow
      } else {
        // Create new directional light
        const light = new THREE.DirectionalLight(data.color, data.intensity)
        light.position.copy(data.direction).multiplyScalar(100)
        light.castShadow = data.castShadow
        
        if (data.castShadow) {
          light.shadow.mapSize.width = 2048
          light.shadow.mapSize.height = 2048
          light.shadow.camera.near = 0.5
          light.shadow.camera.far = 500
          light.shadow.camera.left = -300
          light.shadow.camera.right = 300
          light.shadow.camera.top = 300
          light.shadow.camera.bottom = -300
        }
        
        this.scene.add(light)
        this.directionalLights.push(light)
      }
    })
  }

  private updatePointLightsFromData(pointData: LightingData['point']): void {
    // Return all currently active point lights to the pool
    this.activePointLights.forEach(light => {
      light.visible = false
      light.intensity = 0
    })
    this.activePointLights.clear()

    // Assign lights from pool for new data
    pointData.forEach((data, index) => {
      if (index < this.pointLightPool.length) {
        const light = this.pointLightPool[index]
        light.position.copy(data.position)
        light.color = data.color
        light.intensity = data.intensity
        light.distance = data.distance
        light.decay = data.decay
        light.visible = true
        this.activePointLights.add(light)
      } else {
        // If we need more lights than in pool, create dynamically
        const light = new THREE.PointLight(data.color, data.intensity, data.distance, data.decay)
        light.position.copy(data.position)
        this.scene.add(light)
        this.pointLights.push(light)
      }
    })
  }

  updateAmbientLight(color: THREE.Color, intensity: number): void {
    this.lightingData.update(data => ({
      ...data,
      ambient: { color: color.clone(), intensity }
    }))
  }

  addDirectionalLight(direction: THREE.Vector3, color: THREE.Color, intensity: number, castShadow = false): void {
    this.lightingData.update(data => ({
      ...data,
      directional: [...data.directional, {
        direction: direction.clone(),
        color: color.clone(),
        intensity,
        castShadow
      }]
    }))
  }

  addPointLight(position: THREE.Vector3, color: THREE.Color, intensity: number, distance: number, decay = 2): void {
    this.lightingData.update(data => ({
      ...data,
      point: [...data.point, {
        position: position.clone(),
        color: color.clone(),
        intensity,
        distance,
        decay
      }]
    }))
  }

  clearPointLights(): void {
    this.lightingData.update(data => ({
      ...data,
      point: []
    }))
  }

  updatePointLights(lights: Array<{position: THREE.Vector3, color: THREE.Color, intensity: number, distance: number}>): void {
    this.lightingData.update(data => ({
      ...data,
      point: lights.map(light => ({
        position: light.position.clone(),
        color: light.color.clone(),
        intensity: light.intensity,
        distance: light.distance,
        decay: 2
      }))
    }))
  }

  getLightingData(): LightingData {
    let currentData: LightingData
    this.lightingData.subscribe(data => currentData = data)()
    return currentData!
  }

  subscribe(callback: (data: LightingData) => void) {
    return this.lightingData.subscribe(callback)
  }

  // =====================================================
  // EFFICIENT LIGHT POOL MANAGEMENT METHODS
  // =====================================================
  
  /**
   * Request a light for a specific owner (e.g., firefly entity ID)
   * Returns a light from the pool or null if none available
   */
  requestLight(ownerId: string): THREE.PointLight | null {
    // Check if this owner already has a light assigned
    const existingLight = this.ownedLights.get(ownerId)
    if (existingLight) {
      return existingLight
    }

    // Find an available light from the pool
    const availableLight = this.pointLightPool.find(light => !this.activePointLights.has(light))
    if (!availableLight) {
      console.warn(`💡 LightingManager: No available lights in pool for owner ${ownerId}`)
      return null
    }

    // Assign the light to this owner
    this.activePointLights.add(availableLight)
    this.ownedLights.set(ownerId, availableLight)
    availableLight.visible = true

    return availableLight
  }

  /**
   * Release a light from a specific owner back to the pool
   */
  releaseLight(ownerId: string): boolean {
    const light = this.ownedLights.get(ownerId)
    if (!light) {
      return false // Owner doesn't have a light assigned
    }

    // Return light to pool
    light.visible = false
    light.intensity = 0
    this.activePointLights.delete(light)
    this.ownedLights.delete(ownerId)

    return true
  }

  /**
   * Get the light owned by a specific owner
   */
  getLight(ownerId: string): THREE.PointLight | null {
    return this.ownedLights.get(ownerId) || null
  }

  /**
   * Update a specific light's properties efficiently
   */
  updateLight(ownerId: string, properties: {
    position?: THREE.Vector3
    color?: THREE.Color | number
    intensity?: number
    distance?: number
  }): boolean {
    const light = this.ownedLights.get(ownerId)
    if (!light) {
      return false
    }

    if (properties.position) {
      light.position.copy(properties.position)
    }
    if (properties.color !== undefined) {
      light.color = properties.color instanceof THREE.Color ? properties.color : new THREE.Color(properties.color)
    }
    if (properties.intensity !== undefined) {
      light.intensity = properties.intensity
    }
    if (properties.distance !== undefined) {
      light.distance = properties.distance
    }

    return true
  }

  /**
   * Get statistics about the light pool usage
   */
  getPoolStats(): {
    total: number
    active: number
    available: number
    owners: string[]
  } {
    return {
      total: this.pointLightPool.length,
      active: this.activePointLights.size,
      available: this.pointLightPool.length - this.activePointLights.size,
      owners: Array.from(this.ownedLights.keys())
    }
  }

  dispose(): void {
    // Remove all lights from scene
    this.scene.remove(this.ambientLight)
    
    this.directionalLights.forEach(light => this.scene.remove(light))
    this.directionalLights = []
    
    this.pointLightPool.forEach(light => this.scene.remove(light))
    this.pointLightPool = []
    this.activePointLights.clear()
    this.ownedLights.clear() // Clear the new ownership tracking
    
    this.pointLights.forEach(light => this.scene.remove(light))
    this.pointLights = []
    
    this.spotLights.forEach(light => this.scene.remove(light))
    this.spotLights = []
    
    console.log('💡 LightingManager: Disposed all lights')
  }
}