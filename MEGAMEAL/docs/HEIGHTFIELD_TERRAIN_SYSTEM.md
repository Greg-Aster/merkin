# Heightfield Terrain System Documentation

## Overview

The Heightfield Terrain System provides efficient, scalable collision detection for MEGAMEAL's 3D environments using Rapier physics engine heightfields. This system separates visual and collision concerns, allowing high-quality visual terrain with optimized physics collision.

## Architecture

### Core Components

```
StaticEnvironment.svelte → GLB Mesh Loading & Height Sampling
        ↓
TerrainSystem.ts → Height Data Generation & Processing  
        ↓
TerrainCollider.svelte → Rapier Heightfield Collision
```

## System Components

### 1. StaticEnvironment.svelte
**Purpose**: Loads GLB terrain models and provides height sampling functionality

**Key Functions**:
- Loads visual terrain GLB files
- Creates `meshHeightSampler` function for height queries
- Manages heightmap cache for performance
- Dispatches terrain loading events

**Height Sampling**:
```javascript
function getHeightAt(worldX: number, worldZ: number): number
```
- **Input**: World coordinates (e.g., -250 to +250 for 500-unit world)
- **Output**: Height in world units
- **Fallback**: Uses raycasting if height cache unavailable

### 2. TerrainSystem.ts (Singleton)
**Purpose**: Central height data processing and coordinate management

**Key Methods**:

#### `generateHeightfieldFromMesh(meshSampler, resolution, worldSize)`
Generates height data array from GLB mesh sampling.

**Parameters**:
- `meshSampler`: Function from StaticEnvironment for height queries
- `resolution`: Grid resolution (e.g., 129 for 128x128 cells)
- `worldSize`: World dimensions in units (e.g., 500)

**Process**:
1. Creates `Float32Array` of size `resolution × resolution`
2. Samples height at each grid point using world coordinates
3. Returns raw height data in world units

**Coordinate Mapping**:
```javascript
// Grid to world coordinate conversion
const worldX = (x / (resolution - 1)) * worldSize - halfSize  // e.g., -250 to +250
const worldZ = (z / (resolution - 1)) * worldSize - halfSize  // e.g., -250 to +250
```

#### `sampleHeightFromData(heightData, resolution, worldX, worldZ, worldSize)`
Samples height from generated heightfield data.

**Usage**: Used by other systems (fireflies, vegetation) for height queries.

#### `getOptimalResolution(distanceFromPlayer)`
Returns appropriate resolution based on distance for Level of Detail (LOD).

**Resolution Mapping**:
- Ultra Low: 16×16 (256 samples)
- Low: 32×32 (1,024 samples)  
- Medium: 64×64 (4,096 samples)
- High: 128×128 (16,384 samples)
- Ultra: 256×256 (65,536 samples)

### 3. TerrainCollider.svelte
**Purpose**: Creates Rapier heightfield collision from height data

**Props**:
- `worldSize`: World dimensions (default: 500)
- `position`: Collider position (default: [0,0,0])
- `friction`: Surface friction (default: 0.9)
- `restitution`: Bounce factor (default: 0.0)
- `meshHeightSampler`: Height sampling function from StaticEnvironment

**Generation Process**:
1. Receives `meshHeightSampler` from StaticEnvironment
2. Calls `TerrainSystem.generateHeightfieldFromMesh()`
3. Creates Rapier collider arguments
4. Renders RigidBody with Heightfield Collider

**Rapier Configuration**:
```javascript
// Collider arguments
[
  actualResolution - 1,    // numRows (cells, not vertices)
  actualResolution - 1,    // numCols (cells, not vertices)  
  heightData,              // Raw height data (Float32Array)
  { x: worldSize, y: 1.0, z: worldSize }  // Scale vector
]

// Positioning
rotation={[-Math.PI / 2, 0, 0]}           // Rotate to match coordinate system
position={[-worldSize / 2, 0, -worldSize / 2]}  // Center the heightfield
```

## Coordinate Systems

### World Coordinates
- **Origin**: Center of terrain (0, 0)
- **Range**: -worldSize/2 to +worldSize/2 (e.g., -250 to +250)
- **Used by**: All game logic, player spawning, object placement

### Grid Coordinates  
- **Origin**: Corner of heightfield (0, 0)
- **Range**: 0 to resolution-1 (e.g., 0 to 128)
- **Used by**: Height data array indexing

### Rapier Heightfield
- **Origin**: Corner of physics collider
- **Scaling**: Applied via scale vector and position offset
- **Rotation**: -90° around X-axis to match world orientation

## Integration Pattern

### Level Setup (HybridObservatory.svelte)
```javascript
// 1. Load visual terrain
<StaticEnvironment 
  url="/models/levels/observatory-environment.glb"
  renderOnly={true}
  on:loaded={handleEnvironmentLoaded}
/>

// 2. Extract height sampler
function handleEnvironmentLoaded(event) {
  if (event.detail.getHeightAt) {
    meshHeightSampler = event.detail.getHeightAt
  }
}

// 3. Create collision terrain
<TerrainCollider 
  worldSize={500}
  meshHeightSampler={meshHeightSampler}
  on:terrainReady={handleTerrainReady}
/>

// 4. Spawn player after collision ready
function handleTerrainReady() {
  // Safe to spawn player now
}
```

### Height Queries in Game Logic
```javascript
// Get terrain height for object placement
function getHeightAt(x: number, z: number): number {
  if (terrainCollider) {
    return terrainCollider.getHeightAt(x, z);
  }
  return -1000;
}
```

## Performance Characteristics

### Memory Usage
- **Resolution 65×65**: ~17KB height data
- **Resolution 129×129**: ~66KB height data  
- **Resolution 257×257**: ~263KB height data

### Generation Time
- **65×65**: ~2-5ms
- **129×129**: ~8-15ms
- **257×257**: ~30-60ms

### Runtime Performance
- **Height Queries**: O(1) array lookup
- **Collision Detection**: Handled by Rapier (very fast)
- **LOD Scaling**: Automatic based on player distance

## Error Handling

### Common Issues & Solutions

**Player Falls Through Terrain**:
- Check `meshHeightSampler` is provided
- Verify `terrainReady` event fired
- Ensure coordinate system alignment

**Collision Offset from Visual**:
- Verify heightfield position: `[-worldSize/2, 0, -worldSize/2]`
- Check rotation: `[-Math.PI/2, 0, 0]`
- Confirm scale vector: `{x: worldSize, y: 1.0, z: worldSize}`

**Performance Issues**:
- Reduce resolution for distant terrain
- Enable async generation: `enableAsyncGeneration: true`
- Use LOD system for dynamic resolution

## Configuration Examples

### Standard Observatory Level
```javascript
const terrainConfig = {
  worldSize: 500,           // 500×500 world units
  resolution: 129,          // 128×128 collision cells
  position: [0, 0, 0],      // Centered at world origin
  friction: 0.9,            // High friction for walking
  restitution: 0.0          // No bounce
}
```

### Large Open World
```javascript
const terrainConfig = {
  worldSize: 2000,          // 2km×2km world
  resolution: 257,          // High detail collision
  enableAsyncGeneration: true,  // Prevent frame drops
  friction: 0.7,            // Slightly slippery
  restitution: 0.1          // Slight bounce
}
```

### Mobile/Low-End Device
```javascript
const terrainConfig = {
  worldSize: 500,
  resolution: 65,           // Lower resolution for performance
  enableAsyncGeneration: true,
  friction: 0.9,
  restitution: 0.0
}
```

## API Reference

### TerrainSystem Methods

#### `generateHeightfieldFromMesh(meshSampler, resolution, worldSize): Float32Array`
Generates height data from GLB mesh sampling.

#### `sampleHeightFromData(heightData, resolution, worldX, worldZ, worldSize): number`
Samples height from heightfield data at world coordinates.

#### `getOptimalResolution(distanceFromPlayer): number`
Returns LOD-appropriate resolution based on distance.

#### `clearCache(): void`
Clears cached heightfield data.

#### `getCacheStats(): object`
Returns cache statistics and memory usage.

### TerrainCollider Events

#### `terrainReady`
Fired when heightfield collision is ready for use.
```javascript
detail: {
  resolution: number,
  colliderType: 'heightfield',
  performance: { lastGenerationTime: number },
  memoryUsage: string,
  bounds: { minY: number, maxY: number }
}
```

### TerrainCollider Methods

#### `getHeightAt(worldX, worldZ): number`
Returns height at world coordinates using heightfield data.

## Best Practices

### 1. Loading Order
Always ensure this sequence:
1. Load StaticEnvironment (visual terrain)  
2. Wait for `loaded` event → extract `meshHeightSampler`
3. Create TerrainCollider with `meshHeightSampler`
4. Wait for `terrainReady` event → spawn player/objects

### 2. Resolution Selection
- **Close terrain** (0-50m): High resolution (128×128+)
- **Mid-distance** (50-200m): Medium resolution (64×64)  
- **Far terrain** (200m+): Low resolution (32×32 or less)

### 3. Coordinate Consistency
- Always use world coordinates for game logic
- Let TerrainSystem handle coordinate conversions
- Use TerrainCollider as single source of truth for heights

### 4. Performance Optimization
- Enable async generation for large terrains
- Use LOD system for dynamic resolution scaling
- Cache height queries when possible
- Clear cache periodically to prevent memory leaks

## Troubleshooting

### Debug Information
Enable development logging:
```javascript
// Temporary debug logging
console.log('Height at spawn:', meshHeightSampler(0, 0));
console.log('Terrain bounds:', terrainCollider.getBounds());
```

### Validation Tests
```javascript
// Test coordinate mapping
const testPoints = [[0, 0], [100, 100], [-100, -100]];
testPoints.forEach(([x, z]) => {
  const visualHeight = meshHeightSampler(x, z);
  const collisionHeight = terrainCollider.getHeightAt(x, z);
  console.log(`[${x}, ${z}]: Visual=${visualHeight}, Collision=${collisionHeight}`);
});
```

## Migration Guide

### From Trimesh to Heightfield
1. Replace `<Collider shape="trimesh">` with `<TerrainCollider>`
2. Add `meshHeightSampler` prop from StaticEnvironment  
3. Update height queries to use `terrainCollider.getHeightAt()`
4. Test coordinate alignment and adjust positioning if needed

### Upgrading Resolution
1. Change resolution in TerrainCollider props
2. Test performance impact
3. Consider enabling async generation for high resolutions
4. Update LOD thresholds if using distance-based scaling

## Future Enhancements

### Planned Features
- **Multi-resolution streaming**: Different resolutions for different areas
- **Dynamic heightfield updates**: Runtime terrain modification
- **Heightfield materials**: Different friction/restitution per region
- **Compression**: Reduced memory usage for large terrains

### Extension Points
- Custom height sampling algorithms
- Procedural terrain generation fallbacks  
- Integration with level editors
- Runtime terrain modification tools

---

*This documentation covers the core heightfield terrain system. For implementation examples, see the Observatory level in `src/threlte/levels/HybridObservatory.svelte`.*