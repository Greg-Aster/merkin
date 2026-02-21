/**
 * Unified Terrain Manager
 * 
 * Consolidates terrain logic from:
 * - HeightmapCache.ts: generateFromImage method and height data management
 * - TerrainCollider.svelte: getHeightAt method with bilinear interpolation
 * - TerrainManager.svelte: chunk visibility and LOD calculation based on player position
 * - TerrainSystem.ts: resolutionMapping for optimization levels
 */

import * as THREE from 'three'
import { OptimizationLevel, optimizationManager } from '../performance'

export interface TerrainConfig {
  heightmapUrl: string
  worldSize: number
  worldSizeX?: number  // Actual X dimension (for rectangular terrain)
  worldSizeZ?: number  // Actual Z dimension (for rectangular terrain)
  minHeight: number
  maxHeight: number
  bounds?: { min: [number, number, number], max: [number, number, number] }
  chunkPathTemplate?: string
  chunkSize?: number
  gridSize?: [number, number]
  lods?: Array<{ level: number; distance: number }>
}

export interface TerrainChunk {
  id: string
  x: number
  z: number
  position: THREE.Vector3
  currentLod: number
}

export interface PerformanceStats {
  lastGenerationTime: number
  memoryUsage: number
  resolution: string
  sampleCount: number
}

export class TerrainManager {
  private heightData: Float32Array | null = null
  private config: TerrainConfig | null = null
  private resolution: number = 0
  private chunks: TerrainChunk[] = []
  private isReady: boolean = false

  // Resolution mapping based on optimization level (from TerrainSystem.ts)
  private readonly resolutionMapping: Record<OptimizationLevel, number> = {
    [OptimizationLevel.ULTRA_LOW]: 16,
    [OptimizationLevel.LOW]: 32,
    [OptimizationLevel.MEDIUM]: 64,
    [OptimizationLevel.HIGH]: 128,
    [OptimizationLevel.ULTRA]: 256
  }

  constructor() {}

  /**
   * Validate coordinate system consistency to prevent physics-visual misalignment
   */
  private validateCoordinateSystem(config: TerrainConfig): void {
    const issues: string[] = []

    // Check for bounds availability
    if (!config.bounds) {
      issues.push('⚠️ No bounds data - falling back to centered coordinate assumptions')
    } else {
      // Validate bounds data consistency
      const boundsWorldSizeX = config.bounds.max[0] - config.bounds.min[0]
      const boundsWorldSizeZ = config.bounds.max[2] - config.bounds.min[2]
      const maxDimension = Math.max(boundsWorldSizeX, boundsWorldSizeZ)

      // Check if worldSize matches the generation logic
      if (Math.abs(config.worldSize - maxDimension) > 0.1) {
        issues.push(
          `⚠️ WorldSize mismatch: config.worldSize=${config.worldSize.toFixed(2)} but bounds suggest ${maxDimension.toFixed(2)}`
        )
      }

      // Check for rectangular vs square terrain assumptions
      const aspectRatio = boundsWorldSizeX / boundsWorldSizeZ
      if (Math.abs(aspectRatio - 1.0) > 0.05) {
        issues.push(
          `⚠️ Rectangular terrain detected: ${boundsWorldSizeX.toFixed(1)}x${boundsWorldSizeZ.toFixed(1)} (aspect ratio: ${aspectRatio.toFixed(2)})`
        )
      }

      // Check if terrain is centered at origin
      const centerX = (config.bounds.min[0] + config.bounds.max[0]) / 2
      const centerZ = (config.bounds.min[2] + config.bounds.max[2]) / 2
      if (Math.abs(centerX) > 1.0 || Math.abs(centerZ) > 1.0) {
        issues.push(
          `⚠️ Terrain not centered: center at (${centerX.toFixed(1)}, ${centerZ.toFixed(1)}) instead of origin`
        )
      }
    }

    // Log validation results
    if (issues.length > 0) {
      if (import.meta.env.DEV) {
        console.warn('🔍 Coordinate System Validation Issues:')
        issues.forEach(issue => console.warn(issue))
      }
    } else {
      if (import.meta.env.DEV) console.log('✅ Coordinate system validation passed')
    }

    // Log coordinate system summary for debugging
    const computedWorldSizeX = config.bounds ? config.bounds.max[0] - config.bounds.min[0] : config.worldSize
    const computedWorldSizeZ = config.bounds ? config.bounds.max[2] - config.bounds.min[2] : config.worldSize
    
    if (import.meta.env.DEV) console.log('🔍 Coordinate System Summary:', {
      worldSize: config.worldSize,
      worldSizeX: config.worldSizeX || computedWorldSizeX,
      worldSizeZ: config.worldSizeZ || computedWorldSizeZ,
      bounds: config.bounds,
      hasChunks: !!(config.gridSize && config.chunkSize),
      chunkGrid: config.gridSize,
      chunkSize: config.chunkSize,
      isRectangular: Math.abs(computedWorldSizeX - computedWorldSizeZ) > 0.1
    })
  }

  /**
   * Initialize terrain from heightmap image (from HeightmapCache.ts)
   */
  public async initialize(config: TerrainConfig): Promise<void> {
    if (import.meta.env.DEV) console.log(`🗺️ Loading terrain heightmap: ${config.heightmapUrl}`)
    
    // Validate coordinate system consistency
    this.validateCoordinateSystem(config)
    
    this.config = config
    
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')!
          
          canvas.width = img.width
          canvas.height = img.height
          this.resolution = img.width

          ctx.drawImage(img, 0, 0)
          const imageData = ctx.getImageData(0, 0, img.width, img.height)
          
          this.heightData = new Float32Array(img.width * img.height)
          const { minHeight, maxHeight } = config
          const heightRange = maxHeight - minHeight
          
          for (let i = 0; i < imageData.data.length; i += 4) {
            const grayscale = imageData.data[i] / 255
            const worldHeight = minHeight + (grayscale * heightRange)
            this.heightData[i / 4] = worldHeight
          }
          
          // Initialize chunks if we have chunk configuration
          if (config.gridSize && config.chunkSize) {
            this.initializeChunks()
          }
          
          this.isReady = true
          if (import.meta.env.DEV) console.log(`✅ Terrain initialized: ${img.width}x${img.height}, ${(this.heightData.length * 4 / 1024).toFixed(1)}KB`)
          resolve()
        } catch (error) {
          reject(error)
        }
      }
      
      img.onerror = () => reject(new Error(`Failed to load heightmap: ${config.heightmapUrl}`))
      img.src = config.heightmapUrl
    })
  }

  /**
   * Initialize chunk grid (from TerrainManager.svelte)
   */
  private initializeChunks(): void {
    if (!this.config || !this.config.gridSize || !this.config.chunkSize) return

    const [gridX, gridZ] = this.config.gridSize
    const chunkSize = this.config.chunkSize
    const bounds = this.config.bounds

    this.chunks = []
    for (let x = 0; x < gridX; x++) {
      for (let z = 0; z < gridZ; z++) {
        // Calculate chunk center position using bounds and chunkSize
        let centerX: number, centerZ: number

        if (bounds) {
          // Use actual bounds for positioning (matches generation pipeline)
          centerX = bounds.min[0] + (x + 0.5) * chunkSize
          centerZ = bounds.min[2] + (z + 0.5) * chunkSize
        } else {
          // Fallback to centered grid assumption
          centerX = (x - gridX/2 + 0.5) * chunkSize
          centerZ = (z - gridZ/2 + 0.5) * chunkSize
        }

        this.chunks.push({
          id: `chunk_${x}_${z}`,
          x,
          z,
          position: new THREE.Vector3(centerX, 0, centerZ),
          currentLod: -1,
        })
      }
    }
    if (import.meta.env.DEV) console.log('🏔️ TerrainManager: Initialized', this.chunks.length, 'chunks with bounds-based positioning')
  }

  /**
   * Get visible chunks based on player position (from TerrainManager.svelte)
   */
  public getVisibleChunks(playerPosition: THREE.Vector3): TerrainChunk[] {
    if (!this.config || !this.config.lods || this.chunks.length === 0) {
      console.log('🏔️ getVisibleChunks: No config/lods/chunks', { 
        hasConfig: !!this.config, 
        hasLods: !!this.config?.lods, 
        chunkCount: this.chunks.length,
        playerPos: [playerPosition.x, playerPosition.y, playerPosition.z]
      })
      return []
    }

    this.chunks.forEach(chunk => {
      const distance = playerPosition.distanceTo(chunk.position)
      let newLod = -1

      for (let i = this.config!.lods!.length - 1; i >= 0; i--) {
        if (distance < this.config!.lods![i].distance) {
          newLod = this.config!.lods![i].level
        }
      }

      if (newLod !== chunk.currentLod) {
        console.log(`🏔️ Chunk ${chunk.id}: playerDist=${distance.toFixed(1)}, newLOD=${newLod}`)
        chunk.currentLod = newLod
      }
    })

    return this.chunks.filter(chunk => chunk.currentLod !== -1)
  }

  /**
   * Get height at world coordinates with bilinear interpolation (from TerrainCollider.svelte)
   */
  public getHeightAt(worldX: number, worldZ: number): number {
    if (!this.heightData || !this.config) {
      console.warn('⚠️ Terrain not initialized')
      return 0
    }

    const resolution = this.resolution

    // Use actual bounds for coordinate conversion (matches heightmap generation)
    const bounds = this.config.bounds
    if (!bounds) {
      console.warn('⚠️ No bounds available for height sampling, falling back to centered assumption')
      const worldSize = this.config.worldSize
      const halfSize = worldSize / 2
      const u = (worldX + halfSize) / worldSize
      const v = (worldZ + halfSize) / worldSize
      return this.sampleHeightAtUV(u, v)
    }

    // Convert world coordinates to UV using actual bounds (matches generation pipeline)
    const worldSizeX = bounds.max[0] - bounds.min[0]
    const worldSizeZ = bounds.max[2] - bounds.min[2]
    
    const u = (worldX - bounds.min[0]) / worldSizeX
    const v = (worldZ - bounds.min[2]) / worldSizeZ

    return this.sampleHeightAtUV(u, v)
  }

  /**
   * Sample height at UV coordinates with bilinear interpolation
   */
  private sampleHeightAtUV(u: number, v: number): number {
    if (!this.heightData) return 0

    const resolution = this.resolution
    
    // Clamp to valid range
    const clampedU = Math.max(0, Math.min(1, u))
    const clampedV = Math.max(0, Math.min(1, v))

    // Convert to array indices
    const x = clampedU * (resolution - 1)
    const z = clampedV * (resolution - 1)

    // Get integer and fractional parts for bilinear interpolation
    const x0 = Math.floor(x)
    const z0 = Math.floor(z)
    const x1 = Math.min(x0 + 1, resolution - 1)
    const z1 = Math.min(z0 + 1, resolution - 1)

    const fx = x - x0
    const fz = z - z0

    // Sample four corners
    const h00 = this.heightData[z0 * resolution + x0]
    const h10 = this.heightData[z0 * resolution + x1]
    const h01 = this.heightData[z1 * resolution + x0]
    const h11 = this.heightData[z1 * resolution + x1]

    // Bilinear interpolation for smooth height
    const h0 = h00 * (1 - fx) + h10 * fx
    const h1 = h01 * (1 - fx) + h11 * fx
    return h0 * (1 - fz) + h1 * fz
  }

  /**
   * Get optimal resolution based on optimization level
   */
  public getOptimalResolution(): number {
    const currentLevel = optimizationManager.getOptimizationLevel()
    return this.resolutionMapping[currentLevel]
  }

  /**
   * Check if terrain is ready
   */
  public getIsReady(): boolean {
    return this.isReady
  }

  /**
   * Get height data for physics collider
   */
  public getHeightData(): Float32Array {
    return this.heightData || new Float32Array(0)
  }

  /**
   * Get resolution for physics collider
   */
  public getResolution(): number {
    return this.resolution
  }

  /**
   * Get world size
   */
  public getWorldSize(): number {
    return this.config?.worldSize || 0
  }

  /**
   * Get actual world dimensions (supports rectangular terrain)
   */
  public getWorldSizeX(): number {
    if (this.config?.worldSizeX) return this.config.worldSizeX
    if (this.config?.bounds) {
      return this.config.bounds.max[0] - this.config.bounds.min[0]
    }
    return this.config?.worldSize || 0
  }

  public getWorldSizeZ(): number {
    if (this.config?.worldSizeZ) return this.config.worldSizeZ
    if (this.config?.bounds) {
      return this.config.bounds.max[2] - this.config.bounds.min[2]
    }
    return this.config?.worldSize || 0
  }

  /**
   * Get terrain bounds for accurate physics collider positioning
   */
  public getBounds(): { min: [number, number, number], max: [number, number, number] } | null {
    return this.config?.bounds || null
  }

  /**
   * Get performance statistics
   */
  public getStats(): PerformanceStats {
    if (!this.heightData || !this.config) {
      return {
        lastGenerationTime: 0,
        memoryUsage: 0,
        resolution: '0x0',
        sampleCount: 0
      }
    }

    return {
      lastGenerationTime: 0, // Could be tracked if needed
      memoryUsage: this.heightData.length * 4,
      resolution: `${this.resolution}x${this.resolution}`,
      sampleCount: this.heightData.length
    }
  }

  /**
   * Clear terrain data
   */
  public clear(): void {
    this.heightData = null
    this.config = null
    this.chunks = []
    this.isReady = false
    console.log('🗑️ Terrain cleared')
  }
}
