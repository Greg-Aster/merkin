/**
 * Global Style Manager for MEGAMEAL
 * 
 * Coordinates visual styling across all game systems,
 * integrating with the existing level management architecture.
 */

import * as THREE from 'three'
import { writable, type Writable, get } from 'svelte/store'
import type { SystemRegistry, LevelComponent, ComponentType, LevelContext, SystemMessage, MessageType } from './LevelSystem'
import { getPalette, type StylePreset, type ColorPalette } from '../styles/StylePalettes'

// Style system stores
export const currentStylePresetStore = writable<StylePreset>('ghibli')
export const enableToonShadingStore = writable<boolean>(true)
export const enableOutlinesStore = writable<boolean>(true)
export const enableColorGradingStore = writable<boolean>(true)
export const styleSystemReadyStore = writable<boolean>(false)

/**
 * Global style manager that coordinates visual styling
 */
export class StyleManager {
  private registry: SystemRegistry
  private currentPalette: ColorPalette
  private materialCache = new Map<string, THREE.Material>()
  private toonGradientMap: THREE.Texture | null = null
  
  constructor(registry: SystemRegistry) {
    this.registry = registry
    this.currentPalette = getPalette('ghibli')
    this.setupToonGradientMap()
    
    // Subscribe to style changes
    currentStylePresetStore.subscribe(preset => {
      this.updateStylePreset(preset)
    })
    
    console.log('🎨 StyleManager initialized')
  }
  
  /**
   * Update the current style preset
   */
  updateStylePreset(preset: StylePreset) {
    this.currentPalette = getPalette(preset)
    this.setupToonGradientMap()
    this.clearMaterialCache()
    
    // Notify all systems of style change
    this.registry.sendMessage({
      type: 'STYLE_CHANGED' as MessageType,
      source: 'style-manager',
      data: {
        preset,
        palette: this.currentPalette,
        gradientMap: this.toonGradientMap
      },
      timestamp: Date.now(),
      priority: 'high'
    })
    
    console.log(`🎨 Style preset changed to: ${preset}`)
  }
  
  /**
   * Get current color palette
   */
  getPalette(): ColorPalette {
    return this.currentPalette
  }
  
  /**
   * Get specific color from current palette
   */
  getColor(colorName: keyof ColorPalette): THREE.Color {
    const color = this.currentPalette[colorName]
    return color instanceof THREE.Color ? color.clone() : this.currentPalette.earth.clone()
  }
  
  /**
   * Create toon material with current palette
   */
  createToonMaterial(config: {
    colorType?: keyof ColorPalette
    baseColor?: THREE.Color
    map?: THREE.Texture | null
    normalMap?: THREE.Texture | null
    transparent?: boolean
    opacity?: number
    objectName?: string
  }): THREE.MeshToonMaterial {
    
    // Determine base color
    let baseColor: THREE.Color
    
    if (config.baseColor) {
      baseColor = config.baseColor.clone()
    } else if (config.colorType) {
      baseColor = this.getColor(config.colorType)
    } else if (config.objectName) {
      baseColor = this.getColorFromObjectName(config.objectName)
    } else {
      baseColor = this.getColor('earth')
    }
    
    // Create cache key
    const cacheKey = `toon_${baseColor.getHexString()}_${config.transparent}_${config.opacity}`
    
    // Check cache
    if (this.materialCache.has(cacheKey)) {
      return this.materialCache.get(cacheKey) as THREE.MeshToonMaterial
    }
    
    // Create new toon material
    const material = new THREE.MeshToonMaterial({
      color: baseColor,
      map: config.map || null,
      normalMap: config.normalMap || null,
      transparent: config.transparent || false,
      opacity: config.opacity || 1.0,
      gradientMap: this.toonGradientMap,
      
      // Enhanced toon properties
      shininess: 30,
      specular: new THREE.Color(0x111111),
    })
    
    // Cache the material
    this.materialCache.set(cacheKey, material)
    
    return material
  }
  
  /**
   * Convert existing material to toon shading
   */
  convertToToonMaterial(originalMaterial: THREE.Material, objectName?: string): THREE.MeshToonMaterial {
    const material = originalMaterial as any
    
    return this.createToonMaterial({
      baseColor: material.color || null,
      map: material.map || null,
      normalMap: material.normalMap || null,
      transparent: material.transparent || false,
      opacity: material.opacity || 1.0,
      objectName: objectName
    })
  }
  
  /**
   * Get appropriate color based on object name
   */
  private getColorFromObjectName(objectName: string): THREE.Color {
    const name = objectName.toLowerCase()
    
    if (name.includes('tree') || name.includes('birch') || name.includes('maple') || name.includes('oak')) {
      return this.getColor('trees')
    } else if (name.includes('grass') || name.includes('lawn')) {
      return this.getColor('grass')
    } else if (name.includes('flower') || name.includes('bloom')) {
      return this.getColor('flowers')
    } else if (name.includes('water') || name.includes('ocean') || name.includes('lake')) {
      return this.getColor('water')
    } else if (name.includes('ground') || name.includes('terrain') || name.includes('earth')) {
      return this.getColor('earth')
    } else if (name.includes('sky') || name.includes('cloud')) {
      return this.getColor('sky')
    }
    
    return this.getColor('earth') // Default
  }
  
  /**
   * Setup toon gradient map for current palette
   */
  private setupToonGradientMap() {
    // Dispose old gradient map
    if (this.toonGradientMap) {
      this.toonGradientMap.dispose()
    }
    
    // Create 4-step gradient for smooth toon shading
    const colors = new Uint8Array([
      // Deep shadow
      Math.floor(this.currentPalette.shadow.r * 255),
      Math.floor(this.currentPalette.shadow.g * 255),
      Math.floor(this.currentPalette.shadow.b * 255),
      
      // Mid shadow
      Math.floor(this.currentPalette.shadow.r * 255 * 1.3),
      Math.floor(this.currentPalette.shadow.g * 255 * 1.3),
      Math.floor(this.currentPalette.shadow.b * 255 * 1.3),
      
      // Mid light
      210, 210, 210,
      
      // Full light
      255, 255, 255
    ])
    
    this.toonGradientMap = new THREE.DataTexture(colors, 4, 1, THREE.RGBFormat)
    this.toonGradientMap.needsUpdate = true
    this.toonGradientMap.magFilter = THREE.NearestFilter
    this.toonGradientMap.minFilter = THREE.NearestFilter
    this.toonGradientMap.wrapS = THREE.ClampToEdgeWrapping
    this.toonGradientMap.wrapT = THREE.ClampToEdgeWrapping
  }
  
  /**
   * Create stylized lighting configuration
   */
  getStylizedLightingConfig() {
    return {
      ambient: {
        color: this.currentPalette.ambient,
        intensity: 0.4
      },
      directional: [
        {
          position: new THREE.Vector3(50, 100, 50),
          color: this.currentPalette.sun,
          intensity: 0.8,
          castShadow: true,
          shadow: {
            mapSize: 2048,
            camera: {
              near: 0.1,
              far: 500,
              left: -200,
              right: 200,
              top: 200,
              bottom: -200
            }
          }
        }
      ],
      point: [
        {
          position: new THREE.Vector3(0, 10, 0),
          color: this.currentPalette.ambient,
          intensity: 0.3,
          distance: 100,
          decay: 1
        }
      ]
    }
  }
  
  /**
   * Get renderer configuration for current style
   */
  getRendererConfig() {
    return {
      toneMapping: THREE.ACESFilmicToneMapping,
      toneMappingExposure: 1.1,
      shadowMap: {
        enabled: true,
        type: THREE.PCFSoftShadowMap
      },
      clearColor: this.currentPalette.sky,
      clearAlpha: 1.0
    }
  }
  
  /**
   * Get fog configuration for current style
   */
  getFogConfig() {
    return {
      color: this.currentPalette.fog,
      near: 50,
      far: 300,
      density: 0.01
    }
  }
  
  /**
   * Apply style to a Three.js object
   */
  styleObject(object: THREE.Object3D, options: {
    forceToonShading?: boolean
    preserveOriginal?: boolean
  } = {}) {
    const enableToon = options.forceToonShading ?? get(enableToonShadingStore)
    
    if (!enableToon) return
    
    object.traverse((child) => {
      if (child.isMesh && child.material) {
        const mesh = child as THREE.Mesh
        
        // Store original material if requested
        if (options.preserveOriginal && !mesh.userData.originalMaterial) {
          mesh.userData.originalMaterial = mesh.material.clone()
        }
        
        // Convert to toon material
        mesh.material = this.convertToToonMaterial(mesh.material, child.name)
        
        // Enable shadow casting/receiving
        mesh.castShadow = true
        mesh.receiveShadow = true
      }
    })
  }
  
  /**
   * Clear material cache (called when style changes)
   */
  private clearMaterialCache() {
    // Dispose cached materials
    this.materialCache.forEach(material => material.dispose())
    this.materialCache.clear()
  }
  
  /**
   * Dispose resources
   */
  dispose() {
    this.clearMaterialCache()
    if (this.toonGradientMap) {
      this.toonGradientMap.dispose()
    }
    console.log('🧹 StyleManager disposed')
  }
}

/**
 * Style System Component for integration with level management
 */
export class StyleSystemComponent implements LevelComponent {
  readonly id = 'style-system'
  readonly type = ComponentType.UI // Closest match for visual system
  
  private styleManager: StyleManager
  private context?: LevelContext
  
  constructor(styleManager: StyleManager) {
    this.styleManager = styleManager
  }
  
  async initialize(context: LevelContext): Promise<void> {
    this.context = context
    
    // Apply renderer configuration
    const rendererConfig = this.styleManager.getRendererConfig()
    if (context.renderer) {
      context.renderer.toneMapping = rendererConfig.toneMapping
      context.renderer.toneMappingExposure = rendererConfig.toneMappingExposure
      context.renderer.shadowMap.enabled = rendererConfig.shadowMap.enabled
      context.renderer.shadowMap.type = rendererConfig.shadowMap.type
      context.renderer.setClearColor(rendererConfig.clearColor, rendererConfig.clearAlpha)
    }
    
    // Apply fog configuration
    const fogConfig = this.styleManager.getFogConfig()
    if (context.scene) {
      context.scene.fog = new THREE.Fog(fogConfig.color, fogConfig.near, fogConfig.far)
    }
    
    styleSystemReadyStore.set(true)
    console.log('✅ Style system component initialized')
  }
  
  update(deltaTime: number): void {
    // Style system doesn't need regular updates
  }
  
  handleMessage(message: SystemMessage): void {
    if (message.type === 'COMPONENT_READY' && message.data.componentType === ComponentType.ENVIRONMENT) {
      // When environment components are ready, apply styling
      this.applyStyleToScene()
    }
  }
  
  private applyStyleToScene() {
    if (this.context?.scene) {
      this.styleManager.styleObject(this.context.scene, {
        forceToonShading: true,
        preserveOriginal: true
      })
    }
  }
  
  dispose(): void {
    styleSystemReadyStore.set(false)
  }
}

// Action creators for style system
export const styleActions = {
  setStylePreset: (preset: StylePreset) => {
    currentStylePresetStore.set(preset)
  },
  
  toggleToonShading: () => {
    enableToonShadingStore.update(enabled => !enabled)
  },
  
  toggleOutlines: () => {
    enableOutlinesStore.update(enabled => !enabled)
  },
  
  toggleColorGrading: () => {
    enableColorGradingStore.update(enabled => !enabled)
  }
}