# MEGAMEAL
## Technical Architecture Manual v2.0

**Project:** MEGAMEAL  
**Platform:** Web (Three.js/Threlte)  
**Development Status:** Active Development  
**Document Version:** 2.0  
**Last Updated:** July 22, 2025

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Component System](#component-system)
3. [ECS Integration](#ecs-integration)
4. [Performance Optimization](#performance-optimization)
5. [Level System](#level-system)
6. [Component Reference](#component-reference)
7. [Best Practices](#best-practices)
8. [Development Standards](#development-standards)

---

## Architecture Overview

MEGAMEAL is built on a modern Threlte/Three.js architecture with industry-standard best practices:

### Technology Stack
- **Threlte**: Svelte wrapper for Three.js
- **Three.js**: WebGL 3D engine
- **bitECS**: High-performance entity-component-system
- **TypeScript**: Type safety and developer experience
- **Vite**: Development and build tooling

### Core Principles
- **Modular Components**: Reusable, composable level building blocks
- **ECS Performance**: High-performance entity management for dynamic objects
- **Device Optimization**: Automatic quality scaling across devices
- **Clean Architecture**: Separation of concerns with clear interfaces

---

## Component System

### Base Component Architecture

All components extend the BaseLevelComponent class with standardized lifecycle:

```typescript
abstract class BaseLevelComponent {
  readonly id: string
  readonly type: ComponentType
  
  protected abstract onInitialize(): Promise<void>
  protected abstract onUpdate(deltaTime: number): void
  protected abstract onMessage(message: SystemMessage): void
  protected abstract onDispose(): void
}
```

### Component Types

#### Core Components
- **HybridFireflyComponent**: ECS-powered particle system with legacy visual parameters
- **OceanComponent**: Shader-based water with real-time lighting integration
- **LightingComponent**: Multi-light environmental lighting system
- **StaticEnvironment**: GLTF model loading with LOD support

#### System Communication
```typescript
enum MessageType {
  LIGHTING_UPDATE = 'lighting_update',
  USER_INTERACTION = 'user_interaction',
  PERFORMANCE_WARNING = 'performance_warning'
}

interface SystemMessage {
  type: MessageType
  source: string
  data: any
  timestamp: number
  priority: 'low' | 'normal' | 'high'
}
```

### Level Creation Pattern
```svelte
<LevelManager let:registry let:lighting let:ecsWorld>
  <LightingComponent {...lightingConfig} />
  <OceanComponent {...oceanConfig} />
  <HybridFireflyComponent {...fireflyConfig} />
  <StaticEnvironment {...environmentConfig} />
</LevelManager>
```

---

## ECS Integration

### ECS World Manager
The ECSWorldManager provides high-performance entity management:

```typescript
interface ECSWorldManager {
  getWorld(): World
  createFirefly(position: Vector3, color: number, config: FireflyConfig): number
  getActiveLights(): ActiveLight[]
  updateEmotionalState(wonder: number, melancholy?: number, hope?: number, discovery?: number): void
  setGlobalIntensity(intensity: number): void
}
```

### Entity Components
```typescript
// Position component for 3D coordinates
const Position = defineComponent({
  x: Types.f32,
  y: Types.f32,
  z: Types.f32
})

// Light emitter for dynamic lighting
const LightEmitter = defineComponent({
  color: Types.ui32,
  intensity: Types.f32,
  range: Types.f32
})

// Light cycling for temporal behavior
const LightCycling = defineComponent({
  isActive: Types.ui8,
  fadeProgress: Types.f32,
  cycleTime: Types.f32
})
```

### Query System
```typescript
const fireflyQuery = defineQuery([Position, LightEmitter, LightCycling])

// Usage in system update
const entities = fireflyQuery(world)
for (let i = 0; i < entities.length; i++) {
  const eid = entities[i]
  updateFireflyLogic(eid)
}
```

---

## Performance Optimization

### OptimizationManager Integration

All components use OptimizationManager for device-aware performance:

```typescript
interface OptimizationLevel {
  ULTRA_LOW = 'ultra_low'
  LOW = 'low'
  MEDIUM = 'medium'
  HIGH = 'high'
  ULTRA = 'ultra'
}

interface QualitySettings {
  maxFireflyLights: number
  oceanSegments: { width: number; height: number }
  enableReflections: boolean
  enableRefractions: boolean
  enableProceduralTextures: boolean
  enableNormalMaps: boolean
}
```

### Performance Features
- **Instanced Rendering**: Single draw call for multiple objects
- **LOD System**: Distance-based quality reduction
- **Frustum Culling**: Only render visible objects
- **Automatic Scaling**: Real-time quality adjustment based on frame rate
- **Memory Management**: Automatic cleanup of unused resources

### Device Optimization Patterns
```typescript
// Component initialization with optimization
if (typeof window !== 'undefined') {
  try {
    const optimizationManager = OptimizationManager.getInstance()
    const qualitySettings = optimizationManager.getQualitySettings()
    const optimizationLevel = optimizationManager.getOptimizationLevel()
    
    // Apply quality-based settings
    this.maxLights = qualitySettings.maxFireflyLights
    this.segments = qualitySettings.oceanSegments
  } catch (error) {
    // Fallback to conservative settings
    this.maxLights = 0
    this.segments = { width: 8, height: 8 }
  }
}
```

---

## Level System

### Level Manager
The LevelManager provides context and lifecycle management:

```svelte
<script lang="ts">
  import LevelManager from '../core/LevelManager.svelte'
  
  // Level configuration
  const levelConfig = {
    lighting: { ... },
    ocean: { ... },
    fireflies: { ... }
  }
</script>

<LevelManager let:registry let:lighting let:ecsWorld>
  <!-- Components automatically receive context -->
  <OceanComponent {...levelConfig.ocean} />
  <HybridFireflyComponent {...levelConfig.fireflies} />
</LevelManager>
```

### Context Management
```typescript
interface LevelContext {
  scene: THREE.Scene | null
  camera: THREE.Camera | null
  renderer: THREE.WebGLRenderer | null
  registry: SystemRegistry | null
  lightingManager: LightingManager | null
  ecsWorld: ECSWorldManager | null
}
```

---

## Component Reference

### HybridFireflyComponent

**Single source of truth for firefly systems**

#### Props
```typescript
interface FireflyProps {
  count: number                    // Number of fireflies (default: 80)
  maxLights: number               // Maximum active lights (default: 20)
  colors: number[]                // Color palette array
  emissiveIntensity: number       // Material emissive strength (default: 15.0)
  lightIntensity: number          // Point light intensity (default: 15.0)
  lightRange: number              // Light falloff distance (default: 80)
  cycleDuration: number           // Light cycle time in seconds (default: 12.0)
  fadeSpeed: number               // Fade transition speed (default: 2.0)
  heightRange: { min: number; max: number }  // Y position range
  radius: number                  // Distribution radius (default: 180)
  size: number                    // Firefly sphere size (default: 0.015)
  movement: {
    speed: number                 // Animation speed (default: 0.2)
    wanderSpeed: number          // Wandering speed (default: 0.004)
    wanderRadius: number         // Wander distance (default: 4)
    floatAmplitude: Vector3      // Floating motion range
    lerpFactor: number           // Position interpolation factor
  }
  getHeightAt?: (x: number, z: number) => number  // Terrain height function
}
```

#### API Methods
```typescript
// External control interface
export function setIntensity(intensity: number): void
export function setEmotionalState(wonder: number, melancholy: number, hope: number, discovery: number): void
export function triggerDiscovery(): void
export function getStats(): FireflyStats
export function getActiveLights(): ActiveLight[]
```

### OceanComponent

**Modular water system with lighting integration**

#### Props
```typescript
interface OceanProps {
  size: { width: number; height: number }  // Water plane dimensions
  color: number                            // Base water color (default: 0x006994)
  opacity: number                          // Water transparency (default: 0.95)
  position: [number, number, number]       // World position
  segments: { width: number; height: number }  // Geometry resolution
  enableAnimation: boolean                 // Enable wave animation
  animationSpeed: number                   // Animation time multiplier (default: 0.1)
}
```

#### Shader Integration
- **Vertex Displacement**: Real-time wave geometry
- **Fragment Lighting**: Integration with firefly point lights
- **Normal Mapping**: Surface detail for realistic lighting
- **Reflection System**: Real-time reflection of environment lights

---

## Best Practices

### File Structure
```
src/threlte/
├── components/          # Reusable modular components
│   ├── HybridFireflyComponent.svelte
│   ├── OceanComponent.svelte
│   └── LightingComponent.svelte
├── core/               # Core systems and utilities
│   ├── LevelManager.svelte
│   ├── ECSIntegration.ts
│   └── LevelSystem.ts
├── levels/             # Complete level implementations
│   └── HybridObservatory.svelte
└── optimization/       # Performance management
    └── OptimizationManager.ts
```

### Component Development
1. **Extend BaseLevelComponent**: Always use the standard lifecycle
2. **Resource Cleanup**: Dispose of Three.js resources in onDispose()
3. **Performance Aware**: Integrate with OptimizationManager
4. **Cross-System Communication**: Use SystemMessage for component interaction
5. **TypeScript First**: Full type safety for all interfaces

### ECS Integration
```typescript
// Good: Use ECS for high-frequency updates
class HybridFireflyComponent extends BaseLevelComponent {
  protected onUpdate(deltaTime: number): void {
    // Let ECS handle entity logic
    this.updateInstancedRendering()  // Only handle rendering
    this.updateLightingSystem()      // Only handle system integration
  }
}

// Bad: Manual entity management in components
// Don't manually loop through entities in components
```

### Performance Patterns
```typescript
// Good: Batch operations
fireflyPositions.forEach((position, index) => {
  tempMatrix.setPosition(position)
  instancedMesh.setMatrixAt(index, tempMatrix)
})
instancedMesh.instanceMatrix.needsUpdate = true

// Bad: Individual operations
// Don't update matrices one by one
```

---

## Development Standards

### Code Quality
- **TypeScript**: Strict mode enabled, no any types
- **ESLint**: Enforced code standards
- **Prettier**: Consistent formatting
- **Component Props**: Full interface definitions
- **Error Handling**: Graceful fallbacks for all operations

### Testing Standards
```typescript
// Unit tests for component logic
describe('HybridFireflyComponent', () => {
  it('should initialize with correct default parameters', () => {
    // Test implementation
  })
  
  it('should handle performance optimization correctly', () => {
    // Test optimization integration
  })
})
```

### Memory Management
```typescript
// Always implement proper cleanup
protected onDispose(): void {
  if (this.geometry) this.geometry.dispose()
  if (this.material) this.material.dispose()
  if (this.instancedMesh) this.instancedMesh.dispose()
  
  // Clear arrays
  this.entities = []
  this.positions = []
}
```

### Performance Monitoring
```typescript
// Built-in performance tracking
let frameCount = 0
let lastFrameTime = performance.now()

// Monitor frame time and adjust quality
if (frameTime > 20) { // Reduce quality
  this.maxLights = Math.floor(this.maxLights * 0.8)
} else if (frameTime < 12) { // Increase quality
  this.maxLights = Math.min(this.maxLights * 1.1, this.targetMaxLights)
}
```

---

## Technical Specifications

### Performance Targets
- **Desktop (1080p)**: 60fps with full effects
- **Mobile (720p)**: 30fps with optimized effects  
- **Low-end devices**: 20fps with essential effects only

### Browser Support
- Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- WebGL 2.0 required
- ES2020+ JavaScript features

### Resource Management
- **Automatic LOD**: Distance-based quality reduction
- **Memory Pooling**: Reuse objects to minimize garbage collection
- **Asset Streaming**: Progressive loading of high-quality assets
- **Texture Compression**: WebP for color, PNG for normal maps

---

*This document serves as the technical reference for MEGAMEAL's component architecture. All implementations follow these standards to ensure consistency, performance, and maintainability.*

**Document Maintained By**: Development Team  
**Next Review Date**: August 15, 2025  
**Version Control**: All changes tracked in git with detailed commit messages