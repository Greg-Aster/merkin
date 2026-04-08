/**
 * SpatialGrid - Efficient spatial partitioning for lighting culling
 * 
 * This system divides the game world into a grid and tracks which fireflies
 * are in each cell. This dramatically reduces culling checks from O(n) per frame
 * to O(visible_cells) per frame.
 */

import * as THREE from 'three'

export interface SpatialEntity {
  id: string
  position: THREE.Vector3
  data?: any // Additional data (like ECS entity ID, color, etc.)
}

export interface GridCell {
  entities: Set<SpatialEntity>
  lastUpdated: number
}

export class SpatialGrid {
  private cellSize: number
  private worldBounds: { min: THREE.Vector3; max: THREE.Vector3 }
  private grid: Map<string, GridCell> = new Map()
  private entityToCell: Map<string, string> = new Map() // Track which cell each entity is in
  
  // Performance tracking
  private stats = {
    totalEntities: 0,
    activeCells: 0,
    lastCullCount: 0,
    lastUpdateTime: 0
  }

  constructor(cellSize: number = 50, worldBounds?: { min: THREE.Vector3; max: THREE.Vector3 }) {
    this.cellSize = cellSize
    this.worldBounds = worldBounds || {
      min: new THREE.Vector3(-500, -50, -500),
      max: new THREE.Vector3(500, 100, 500)
    }
    
    console.log(`🔲 SpatialGrid: Initialized with cell size ${cellSize}, bounds:`, this.worldBounds)
  }

  /**
   * Convert world position to grid coordinates
   */
  private worldToGrid(position: THREE.Vector3): { x: number, z: number } {
    return {
      x: Math.floor(position.x / this.cellSize),
      z: Math.floor(position.z / this.cellSize)
    }
  }

  /**
   * Convert grid coordinates to cell key
   */
  private gridToKey(gridX: number, gridZ: number): string {
    return `${gridX},${gridZ}`
  }

  /**
   * Get or create a grid cell
   */
  private getCell(gridX: number, gridZ: number): GridCell {
    const key = this.gridToKey(gridX, gridZ)
    let cell = this.grid.get(key)
    
    if (!cell) {
      cell = {
        entities: new Set(),
        lastUpdated: performance.now()
      }
      this.grid.set(key, cell)
    }
    
    return cell
  }

  /**
   * Add or update an entity in the spatial grid
   */
  updateEntity(entity: SpatialEntity): void {
    const gridCoords = this.worldToGrid(entity.position)
    const newCellKey = this.gridToKey(gridCoords.x, gridCoords.z)
    const oldCellKey = this.entityToCell.get(entity.id)

    // If entity moved to a different cell, remove from old cell
    if (oldCellKey && oldCellKey !== newCellKey) {
      const oldCell = this.grid.get(oldCellKey)
      if (oldCell) {
        // Find the entity with matching ID and remove it
        for (const existingEntity of oldCell.entities) {
          if (existingEntity.id === entity.id) {
            oldCell.entities.delete(existingEntity)
            break
          }
        }
        if (oldCell.entities.size === 0) {
          this.grid.delete(oldCellKey) // Clean up empty cells
        }
      }
    }

    // Add to new cell
    const newCell = this.getCell(gridCoords.x, gridCoords.z)
    newCell.entities.add(entity)
    newCell.lastUpdated = performance.now()
    this.entityToCell.set(entity.id, newCellKey)
  }

  /**
   * Remove an entity from the spatial grid
   */
  removeEntity(entityId: string): boolean {
    const cellKey = this.entityToCell.get(entityId)
    if (!cellKey) return false

    const cell = this.grid.get(cellKey)
    if (!cell) return false

    // Find and remove the entity
    for (const entity of cell.entities) {
      if (entity.id === entityId) {
        cell.entities.delete(entity)
        this.entityToCell.delete(entityId)
        
        // Clean up empty cells
        if (cell.entities.size === 0) {
          this.grid.delete(cellKey)
        }
        
        return true
      }
    }
    
    return false
  }

  /**
   * Get all entities within a camera frustum (efficient version)
   * This is the key performance optimization - instead of checking every entity,
   * we only check entities in cells that intersect the frustum.
   */
  getVisibleEntities(camera: THREE.Camera): SpatialEntity[] {
    const startTime = performance.now()
    const visibleEntities: SpatialEntity[] = []
    
    // Create frustum from camera
    const frustum = new THREE.Frustum()
    const projScreenMatrix = new THREE.Matrix4()
    projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
    frustum.setFromProjectionMatrix(projScreenMatrix)

    // Get the approximate bounds of the frustum in world space
    const frustumBounds = this.getFrustumBounds(camera)
    
    // Convert frustum bounds to grid coordinates
    const minGrid = this.worldToGrid(frustumBounds.min)
    const maxGrid = this.worldToGrid(frustumBounds.max)
    
    let cellsChecked = 0
    let entitiesChecked = 0

    // Only check cells that might intersect the frustum
    for (let x = minGrid.x - 1; x <= maxGrid.x + 1; x++) {
      for (let z = minGrid.z - 1; z <= maxGrid.z + 1; z++) {
        const cellKey = this.gridToKey(x, z)
        const cell = this.grid.get(cellKey)
        
        if (!cell || cell.entities.size === 0) continue
        
        cellsChecked++
        
        // Check each entity in this cell against the frustum
        for (const entity of cell.entities) {
          entitiesChecked++
          if (frustum.containsPoint(entity.position)) {
            visibleEntities.push(entity)
          }
        }
      }
    }

    // Update stats
    this.stats.lastCullCount = entitiesChecked
    this.stats.lastUpdateTime = performance.now() - startTime
    this.stats.activeCells = this.grid.size
    this.stats.totalEntities = this.entityToCell.size

    // Removed console spam - stats are available via getStats() if needed
    // if (import.meta.env.DEV && cellsChecked > 0) {
    //   console.log(`🔲 SpatialGrid: Checked ${entitiesChecked} entities in ${cellsChecked} cells, found ${visibleEntities.length} visible (${this.stats.lastUpdateTime.toFixed(2)}ms)`)
    // }

    return visibleEntities
  }

  /**
   * Get approximate bounds of camera frustum in world space
   * This is a rough approximation to determine which grid cells to check
   */
  private getFrustumBounds(camera: THREE.Camera): { min: THREE.Vector3; max: THREE.Vector3 } {
    if (camera instanceof THREE.PerspectiveCamera) {
      // For perspective camera, approximate the frustum as expanding cone
      const distance = camera.far * 0.7 // Use 70% of far distance for practical culling
      const halfHeight = Math.tan(camera.fov * Math.PI / 360) * distance
      const halfWidth = halfHeight * camera.aspect
      
      const cameraPos = camera.position
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion)
      const centerPoint = cameraPos.clone().add(forward.multiplyScalar(distance * 0.5))
      
      return {
        min: new THREE.Vector3(
          centerPoint.x - halfWidth,
          centerPoint.y - halfHeight,
          centerPoint.z - distance * 0.5
        ),
        max: new THREE.Vector3(
          centerPoint.x + halfWidth,
          centerPoint.y + halfHeight,
          centerPoint.z + distance * 0.5
        )
      }
    } else {
      // Fallback for orthographic or other camera types
      return this.worldBounds
    }
  }

  /**
   * Get entities in a specific radius around a point (useful for local effects)
   */
  getEntitiesInRadius(center: THREE.Vector3, radius: number): SpatialEntity[] {
    const entities: SpatialEntity[] = []
    const radiusSquared = radius * radius
    
    // Determine which cells to check
    const gridRadius = Math.ceil(radius / this.cellSize)
    const centerGrid = this.worldToGrid(center)
    
    for (let x = centerGrid.x - gridRadius; x <= centerGrid.x + gridRadius; x++) {
      for (let z = centerGrid.z - gridRadius; z <= centerGrid.z + gridRadius; z++) {
        const cellKey = this.gridToKey(x, z)
        const cell = this.grid.get(cellKey)
        
        if (!cell) continue
        
        for (const entity of cell.entities) {
          const distanceSquared = center.distanceToSquared(entity.position)
          if (distanceSquared <= radiusSquared) {
            entities.push(entity)
          }
        }
      }
    }
    
    return entities
  }

  /**
   * Get performance statistics
   */
  getStats(): {
    totalEntities: number
    activeCells: number
    lastCullCount: number
    lastUpdateTimeMs: number
    averageEntitiesPerCell: number
  } {
    return {
      ...this.stats,
      lastUpdateTimeMs: this.stats.lastUpdateTime,
      averageEntitiesPerCell: this.stats.totalEntities / Math.max(this.stats.activeCells, 1)
    }
  }

  /**
   * Clear all entities from the grid
   */
  clear(): void {
    this.grid.clear()
    this.entityToCell.clear()
    this.stats.totalEntities = 0
    this.stats.activeCells = 0
  }

  /**
   * Debug visualization of the grid (for development)
   */
  debugVisualize(): void {
    if (!import.meta.env.DEV) return
    
    console.log('🔲 SpatialGrid Debug:')
    console.log(`  Cells: ${this.grid.size}`)
    console.log(`  Total entities: ${this.entityToCell.size}`)
    
    // Show most populated cells
    const cellsWithCounts = Array.from(this.grid.entries())
      .map(([key, cell]) => ({ key, count: cell.entities.size }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
    
    console.log('  Top 5 cells by entity count:')
    cellsWithCounts.forEach(({ key, count }) => {
      console.log(`    ${key}: ${count} entities`)
    })
  }
}