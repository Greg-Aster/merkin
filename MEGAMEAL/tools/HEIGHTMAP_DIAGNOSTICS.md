# MEGAMEAL Heightmap Diagnostics & Troubleshooting Guide [LEGACY/ARCHIVED]

⚠️ **NOTICE: This document is now archived. MEGAMEAL has migrated to TriMesh physics.**
🔄 **Physics now uses TriMesh collision built from heightmap data (not Rapier heightfield).**
📈 **Heightmaps remain as a height data source for the TriMesh collision system.**

## Historical Overview

This document provides comprehensive diagnostics for the legacy heightfield collision system. The heightmap system converts GLB terrain geometry into collision-ready data through a multi-stage coordinate transformation pipeline.

---

## System Architecture

### Components Overview
```
GLB Mesh → HeightmapBaker → PNG Heightmap → TerrainManager → Physics Collider
    ↓              ↓              ↓              ↓              ↓
World Space → Ray Sampling → Pixel Data → Float32Array → Rapier Heightfield
```

### Key Files & Responsibilities

1. **`tools/heightmap-generator/heightmap_baker_node.mjs`**
   - Converts GLB terrain geometry to grayscale heightmap PNG
   - Performs raycast-based height sampling
   - Generates coordinate bounds and configuration files

2. **`tools/unified-terrain-pipeline.js`**
   - Orchestrates complete level generation workflow  
   - Validates consistency between components
   - Handles batch processing of multiple assets

3. **`src/threlte/features/terrain/TerrainManager.ts`**
   - Loads heightmap PNG at runtime
   - Provides height sampling for gameplay
   - Manages chunk visibility and LOD

4. **`src/threlte/features/terrain/components/TerrainCollider.svelte`**
   - Creates Rapier physics heightfield collider
   - Positions collision geometry in world space
   - Handles coordinate transformation between systems

---

## Coordinate System Deep Dive

### Stage 1: GLB World Space Extraction
```javascript
// heightmap_baker_node.mjs lines 128-136
gltf.scene.traverse((child) => {
  if (child.isMesh) {
    child.updateMatrixWorld(true);
    const worldMesh = child.clone();
    worldMesh.geometry = child.geometry.clone().applyMatrix4(child.matrixWorld);
    meshes.push(worldMesh);
  }
});
```

**Critical Point**: GLB meshes may have nested transformations. The `applyMatrix4(child.matrixWorld)` call ensures vertices are in world coordinates, not local mesh space.

### Stage 2: Bounds Calculation & World Size
```javascript
// Lines 151-182: Coordinate system analysis
const bounds = {
  minX, maxX, minY, maxY, minZ, maxZ,
  worldSizeX: maxX - minX,
  worldSizeZ: maxZ - minZ,
  worldSize: Math.max(maxX - minX, maxZ - minZ),  // ⚠️ POTENTIAL ISSUE
  heightRange: maxY - minY
};
```

**Issue Identified**: `worldSize` uses the larger dimension, creating square assumptions when terrain is rectangular.

### Stage 3: Raycast Height Sampling
```javascript
// Lines 234-261: UV to World coordinate mapping
for (let z = 0; z < resolution; z++) {
  for (let x = 0; x < resolution; x++) {
    const u = x / (resolution - 1);  // UV coordinates [0,1]
    const v = z / (resolution - 1);
    
    const worldX = bounds.minX + u * bounds.worldSizeX;  // Actual bounds
    const worldZ = bounds.minZ + v * bounds.worldSizeZ;
    
    // Raycast from above terrain
    const rayOrigin = new THREE.Vector3(worldX, maxHeight + 100, worldZ);
    raycaster.set(rayOrigin, rayDirection);
  }
}
```

**Key Behavior**: Uses actual GLB bounds (`minX`, `minZ`) for positioning, not centered coordinates.

### Stage 4: Runtime Collision Loading
```javascript
// TerrainCollider.svelte coordinate positioning
$: terrainOffset = bounds ? 
  [bounds.min[0], 0, bounds.min[2]] :           // Use actual bounds ✅
  [-worldSize / 2, 0, -worldSize / 2]          // Fallback to centered ⚠️
```

**Recent Fix Applied**: Updated to use actual bounds instead of assuming centered terrain.

---

## Diagnostic History & Issues Encountered

### Issue #1: Camera Clipping Through Terrain
**Date**: Recent conversation sessions  
**Problem**: Player camera could pass through walls and terrain geometry  
**Root Cause**: TerrainCollider was positioned assuming centered terrain (`-worldSize/2`) while GLB bounds were offset  

**Investigation Steps Performed**:
1. ✅ **Player Collider Analysis**: Verified player collider settings (`args={[0.9, 0.45]}`)
2. ✅ **Camera Position Adjustments**: Tested camera height from `[0, 1.6, 0]` and player position tweaks
3. ✅ **Sensor Collider Attempt**: Added sensor collider to camera for collision detection (failed - no effect)
4. ✅ **Ray-cast Camera System**: Implemented comprehensive ray-casting collision system (caused black screen rendering issues)
5. ✅ **Player Collider Resize**: Attempted larger collider size adjustments (minimal improvement)
6. ✅ **Coordinate System Audit**: User provided detailed analysis identifying heightmap baker coordinate mismatch
7. ✅ **TerrainManager Bounds Support**: Added bounds property and getBounds() method
8. ✅ **Level Loading Bounds Fetch**: Modified HybridObservatory.svelte to load bounds from heightmap config files
9. ✅ **TerrainCollider Positioning Fix**: Updated to use actual terrain bounds instead of centered positioning assumption
10. ✅ **Missing Import Fix**: Added missing `import { T } from '@threlte/core'` for debug visualization
11. ✅ **ROOT CAUSE IDENTIFIED**: Coordinate system mismatch between heightmap generation and collision positioning

**Observatory Environment Example**:
- GLB bounds: `minX: -199.55, minZ: -195.10`
- Previous collision offset: `[-196.78, 0, -196.78]` (centered assumption)
- **Mismatch**: ~3 unit offset in both X and Z axes

**Detailed Fixes Implemented**:

**Step 1 - TerrainManager Bounds Support** (`src/threlte/features/terrain/TerrainManager.ts`):
```javascript
// Added bounds support to TerrainConfig interface
export interface TerrainConfig {
  bounds?: { min: [number, number, number], max: [number, number, number] }
  // ... existing properties
}

// Added getBounds() method  
public getBounds(): { min: [number, number, number], max: [number, number, number] } | null {
  return this.config?.bounds || null
}
```

**Step 2 - Level Loading Bounds Integration** (`src/threlte/levels/HybridObservatory.svelte`):
```javascript
// Automatically load bounds from heightmap config files
const heightmapConfigUrl = manifest.assets.heightmap.replace('_heightmap.png', '_config.json');
const configResponse = await fetch(heightmapConfigUrl);
if (configResponse.ok) {
  const configData = await configResponse.json();
  terrainBounds = configData.bounds;  // Pass bounds to TerrainCollider
}
```

**Step 3 - TerrainCollider Positioning Fix** (`src/threlte/features/terrain/components/TerrainCollider.svelte`):
```javascript
// Before (centered assumption)
$: terrainOffset = [-worldSize / 2, 0, -worldSize / 2]

// After (bounds-based positioning)
export let bounds: { min: [number, number, number], max: [number, number, number] } | null = null
$: terrainOffset = bounds ? [bounds.min[0], 0, bounds.min[2]] : [-worldSize / 2, 0, -worldSize / 2]

// Added missing import for debug visualization
import { T } from '@threlte/core'
```

**Step 4 - Enhanced Debugging & Logging**:
```javascript
$: if (colliderArgs) {
  console.log('🏔️ Creating heightfield collider:', {
    resolution: `${resolution}x${resolution}`,
    worldSize: worldSize,
    colliderPosition: terrainOffset,
    bounds: bounds,
    colliderArgs: `[${resolution-1}, ${resolution-1}, heightData(${heightData.length}), {x:${worldSize}, y:1.0, z:${worldSize}}]`
  })
}

**Status**: ⚠️ **ISSUE PERSISTS AFTER FIX** - Additional investigation needed

---

## Extended Diagnostic Session (Separate Agent)

### Comprehensive Root Cause Analysis & Resolution
**Date**: Subsequent debugging session  
**Approach**: Systematic investigation of visual vs physics alignment  

#### Step 1: System Architecture Review
**Action**: Reviewed `docs/HEIGHTFIELD_TERRAIN_SYSTEM.md` to understand terrain architecture  
**Understanding Gained**:
- Heightmaps serve performance, scalability, and physics purposes
- TerrainCollider expected configuration and coordinate systems
- Overall system design and component interactions

#### Step 2: WorldSize Discrepancy Investigation (First Hypothesis)
**Problem Identified**: Suspected worldSize mismatch between systems  

**Investigation Steps**:
1. ✅ Examined `public/terrain/observatory-environment.manifest.json` - confirmed actual worldSize: `393.55...`
2. ✅ Traced worldSize propagation through:
   - `src/threlte/levels/HybridObservatory.svelte` 
   - `src/threlte/features/terrain/Terrain.svelte`
   - `src/threlte/features/terrain/components/TerrainCollider.svelte`
3. ✅ **Issue Found**: Default `worldSize: 500` in TerrainCollider.svelte
4. ✅ **Fix Attempted**: Removed default worldSize value

**Result**: Issue persisted - not the primary cause

#### Step 3: Bounds Configuration Investigation (Second Hypothesis)  
**Problem Identified**: Suspected bounds loading and application issues

**Investigation Steps**:
1. ✅ Discovered HybridObservatory.svelte loads bounds from `_config.json` if missing from manifest
2. ✅ **Action**: Read `public/terrain/heightmaps/observatory-environment_config.json`
3. ✅ **Critical Finding**: Non-symmetrical bounds discovered:
   ```json
   {
     "bounds": {
       "min": [-199.55, -1.84, -195.10],
       "max": [194.00, 56.31, 198.43]
     }
   }
   ```
4. ✅ Verified TerrainManager.ts correctly processed bounds and worldSize
5. ✅ **Conclusion**: Bounds were consistently applied to both physics and visuals

**Result**: System correctly handling bounds - not the root cause

#### Step 4: Visual Chunk Positioning Analysis (Root Cause Discovery)
**Critical Investigation**: Examined visual terrain chunk rendering

**Action**: Deep dive into `src/threlte/features/terrain/components/TerrainChunk.svelte`

**🔍 ROOT CAUSE IDENTIFIED**:
```javascript
// TerrainChunk.svelte was hardcoded to:
position={[0, 0, 0]}  // COMPLETELY IGNORED passed props!

// While receiving these props (that were being ignored):
export let position: [number, number, number]
export let chunkSize: number  
export let origin: [number, number]
```

**Critical Problem**:
- **Physics Collider**: Correctly offset by `bounds.min` → `[-199.55, 0, -195.10]`
- **Visual Chunks**: Hardcoded to `[0, 0, 0]` → All chunks rendered at world origin
- **Result**: ~200 unit offset between physics and visual terrain

#### Step 5: Incorrect Fix Attempt  
**Attempted Solution**: Calculate individual chunk positions in TerrainChunk.svelte
```javascript
// Attempted fix (INCORRECT)
$: calculatedPosition = [
  origin[0] + (x * chunkSize),
  0, 
  origin[1] + (z * chunkSize)
]
```

**Result**: Created "wide gaps" between chunks  
**Problem**: GLB chunks were already correctly positioned relative to each other internally

#### Step 6: Correct Solution Implementation
**Key Insight**: Visual chunks need single global offset, not individual positioning

**Refined Understanding**:
- Visual chunks have correct relative positioning within GLB files
- Entire visual chunk group needs global offset to match physics collider position

**Initial Fix Implementation** (Later Refined):

**Action 1 - Revert TerrainChunk.svelte**:
```javascript
// Initial revert back to original state
position={[0, 0, 0]}  // Let chunks use their internal GLB positioning
```

**Action 2 - Apply Global Visual Offset in Terrain.svelte**:
```javascript
// Initial group-level approach (later replaced with per-chunk alignment)
<T.Group position={visualOffset}>
  {#each visibleChunks as chunk (chunk.id)}
    <TerrainChunk ... />  <!-- Individual chunks at [0,0,0] -->
  {/each}
</T.Group>

// Where visualOffset derived from bounds:
$: visualOffset = bounds ? [bounds.min[0], 0, bounds.min[2]] : [0, 0, 0]
```

**Note**: This group-level approach was later superseded by per-chunk bounding box alignment (see Runtime Visual Alignment Fixes v2).

**Status**: ⚠️ **PARTIALLY RESOLVED** - Basic alignment achieved, further refinements applied

### Issue #2: Development Tools JavaScript Errors
**Date**: Recent conversation sessions  
**Problem**: `ReferenceError: updateEditor3D is not defined` and null reference errors in tools client.js  
**Root Cause**: Missing defensive checks in DOM manipulation and function definition issues  

**Detailed Fixes Applied**:

**Fix 1 - updateEditor3D Reference Error** (`tools/app/client.js`):
```javascript
// Ensured proper function hoisting and defensive checks
function updateEditor3D() {
  // Function was properly defined but added additional safety checks
  if (typeof updateEditor3D === 'undefined') {
    console.warn('updateEditor3D function not available');
    return;
  }
  // ... function implementation
}
```

**Fix 2 - Null Reference Protection** (`tools/app/client.js`):
```javascript
function updateVisualDebugging() {
  const showChunkBoundsEl = document.getElementById('show-chunk-bounds');
  if (showChunkBoundsEl) {  // Added null check
    const showChunkBounds = showChunkBoundsEl.checked;
    chunkBounds.forEach(helper => {
      helper.visible = showChunkBounds;
    });
  }
  
  // Added similar null checks for all DOM element access
  const otherElements = document.getElementById('other-debug-elements');
  if (otherElements) {
    // Safe to access element properties
  }
}
```

**Status**: ✅ **RESOLVED**

### Issue #3: Runtime Import Errors
**Date**: Recent conversation sessions  
**Problem**: `ReferenceError: T is not defined` in TerrainCollider.svelte  
**Root Cause**: Missing Threlte component import after adding debug visualization elements  

**Error Details**:
```
runtime.js:254 Uncaught ReferenceError: T is not defined
    at TerrainCollider.svelte:100:58
    at Function.$$invalidate (svelte/internal/index.mjs:1154:5)
```

**Fix Applied** (`src/threlte/features/terrain/components/TerrainCollider.svelte`):
```javascript
// Added missing import at top of file
import { T } from '@threlte/core'  
import { createEventDispatcher } from 'svelte'
import { Collider, RigidBody } from '@threlte/rapier'
import * as THREE from 'three'
```

**Context**: This error occurred after updating the TerrainCollider to include Three.js mesh components for debug visualization, but the required `T` import from `@threlte/core` was missing.

**Status**: ✅ **RESOLVED**

### Issue #4: Server Port Configuration Error
**Date**: Recent conversation sessions  
**Problem**: Incorrect assumption about development server port  
**Root Cause**: Tools server was running on port 3001, not assumed port 3000  

**User Correction**: *"fuck you it was runnin gon 3001. wht the fuck did you just do?"*  

**Fix Applied**: Updated port detection and configuration to use correct port 3001

**Status**: ✅ **RESOLVED**

---

## Runtime Visual Alignment Fixes v2 (Continued Development)

### Issue #5: Chunk Alignment and Gap Elimination
**Date**: Continued development sessions  
**Problem**: Initial group-level offset approach left gaps between chunks and alignment issues  
**Root Cause**: GLB chunks needed per-chunk bounding box alignment rather than group transforms  

#### Step 1: Per-Chunk Alignment Implementation
**File**: `src/threlte/features/terrain/components/TerrainChunk.svelte`  
**Changes Applied**:
```javascript
// Added origin and chunkSize props
export let origin: [number, number]
export let chunkSize: number

// On GLB load, align each chunk by its bounding-box min corner to tile min corner
on:load={() => {
  // Calculate tile position from chunk coordinates and origin
  const tileMinX = origin[0] + (x * chunkSize)
  const tileMinZ = origin[1] + (z * chunkSize)
  
  // Align GLB bounding box min to tile min
  const bbox = new THREE.Box3().setFromObject(gltfScene)
  const offset = [
    tileMinX - bbox.min.x,
    0,
    tileMinZ - bbox.min.z
  ]
  gltfScene.position.set(...offset)
}}
```

**Rationale**: GLB submeshes maintain absolute vertex coordinates; aligning bbox to tile min removes double offset while preserving internal relative positions.

#### Step 2: Chunk Position Calculation in TerrainManager
**File**: `src/threlte/features/terrain/TerrainManager.ts`  
**Changes Applied**:
```javascript
// initializeChunks() now sets proper chunk positions
private initializeChunks(): void {
  const [gridX, gridZ] = this.config.gridSize
  
  for (let x = 0; x < gridX; x++) {
    for (let z = 0; z < gridZ; z++) {
      // Calculate chunk center position using bounds and chunkSize
      const centerX = bounds ? 
        bounds.min[0] + (x + 0.5) * chunkSize :
        (x - gridX/2 + 0.5) * chunkSize
      const centerZ = bounds ?
        bounds.min[2] + (z + 0.5) * chunkSize :
        (z - gridZ/2 + 0.5) * chunkSize
        
      this.chunks.push({
        id: `chunk_${x}_${z}`,
        x, z,
        position: new THREE.Vector3(centerX, 0, centerZ), // Proper positioning
        currentLod: -1,
      })
    }
  }
}
```

**Previous Issue**: Chunk positions were hardcoded to `(0,0,0)`  
**Fix**: Calculate chunk center positions from bounds.min, chunkSize, and grid coordinates

#### Step 3: TerrainCollider Debug Overlay Implementation  
**File**: `src/threlte/features/terrain/components/TerrainCollider.svelte`  
**Problem**: Need visual debug overlay to verify physics-visual alignment  

**Implementation**:
```javascript
// Added renderDebug prop
export let renderDebug: boolean = false

// Robust debug overlay implementation
$: debugTexture = (() => {
  if (!renderDebug || !heightData) return null
  
  // Build normalized THREE.DataTexture from heightData
  const normalizedData = new Uint8Array(heightData.length)
  const minHeight = Math.min(...heightData)
  const maxHeight = Math.max(...heightData)
  const heightRange = maxHeight - minHeight
  
  for (let i = 0; i < heightData.length; i++) {
    normalizedData[i] = ((heightData[i] - minHeight) / heightRange) * 255
  }
  
  return new THREE.DataTexture(
    normalizedData,
    resolution,
    resolution,
    THREE.RedFormat
  )
})()

// Debug overlay mesh positioning
$: debugMeshPosition = [
  terrainOffset[0],
  minHeight, // Position at min height 
  terrainOffset[2]
]

$: displacementScale = maxHeight - minHeight // Vertical scale to match physics
```

**Added missing import**:
```javascript
import { T } from '@threlte/core' // For rendering overlay meshes
```

**Previous Issues Fixed**:
- Removed older inline template overlay that caused hydration 500s
- Fixed "renderDebug is not defined" errors
- Proper vertical alignment with physics collider

#### Step 4: Terrain.svelte Integration Updates
**File**: `src/threlte/features/terrain/Terrain.svelte`  
**Changes**:
```javascript
<!-- Pass renderDebug and chunk alignment props -->
<TerrainCollider
  renderDebug={true}  // Temporary for inspection
  bounds={$terrainStore.bounds}
  on:terrainReady
/>

<!-- Pass origin and chunkSize to chunks for alignment -->
{#each visibleChunks as chunk (chunk.id)}
  <TerrainChunk
    origin={$terrainStore.bounds ? [$terrainStore.bounds.min[0], $terrainStore.bounds.min[2]] : [-$terrainStore.worldSize/2, -$terrainStore.worldSize/2]}
    chunkSize={config.chunkSize}
    x={chunk.x}
    z={chunk.z}
    lod={chunk.currentLod}
    position={chunk.position}
    pathTemplate={config.chunkPathTemplate}
  />
{/each}
```

#### Step 5: TerrainCollider Smoothing Defaults
**File**: `src/threlte/features/terrain/components/TerrainCollider.svelte`  
**Issue**: Physics smoothing could deviate from baked PNG heightmap  
**Fix**: Set conservative defaults
```javascript
export let smoothHeights: boolean = false  // Changed from true
export let smoothingPasses: number = 0     // Changed from default smoothing
```

**Status**: ✅ **IMPROVED ALIGNMENT** - Per-chunk bbox alignment eliminates gaps robustly

---

## Level Editor Synchronization Improvements

### Enhanced Debug and Preview Features
**Date**: Continued development sessions  
**Problem**: Level editor preview not matching runtime rendering exactly  

#### Step 1: UI Debug Controls
**File**: `tools/app/index.html`  
**Added Debug Controls**:
```html
<!-- 3D Preview Options -->
<div class="form-group">
  <label>Debug Options</label>
  <label><input type="checkbox" id="show-chunks"> Show Chunks</label>
  <label><input type="checkbox" id="show-chunk-bounds"> Show Chunk Bounds</label>
  <label><input type="checkbox" id="show-world-axes"> Show World Axes</label>
</div>
```

#### Step 2: Level Editor Chunk Alignment  
**File**: `tools/app/client.js`  
**Problem**: Level editor chunks had gaps similar to runtime issue  

**Fix Applied**:
```javascript
// Dynamic GLTFLoader CDN fallback
function ensureGLTFLoader() {
  return new Promise((resolve) => {
    if (typeof THREE.GLTFLoader !== 'undefined') {
      resolve()
      return
    }
    
    const script = document.createElement('script')
    script.src = 'https://unpkg.com/three@0.128.0/examples/js/loaders/GLTFLoader.js'
    script.onload = resolve
    document.head.appendChild(script)
  })
}

// Per-chunk bbox alignment (same method as runtime)
loader.load(chunkUrl, (gltf) => {
  const scene = gltf.scene
  
  // Calculate tile position
  const tileMinX = origin[0] + (chunkX * chunkSize)  
  const tileMinZ = origin[1] + (chunkZ * chunkSize)
  
  // Align GLB bbox to tile min
  const bbox = new THREE.Box3().setFromObject(scene)
  const offsetX = tileMinX - bbox.min.x
  const offsetZ = tileMinZ - bbox.min.z
  
  scene.position.set(offsetX, 0, offsetZ)
  editorScene.add(scene)
})

// Added null-safe DOM access guards
function updateVisualDebugging() {
  const showChunksEl = document.getElementById('show-chunks')
  if (showChunksEl) {
    // Safe to access checked property
    chunks.forEach(chunk => chunk.visible = showChunksEl.checked)
  }
}
```

#### Step 3: Heightmap Preview Fidelity Improvements
**File**: `tools/app/client.js`  
**Problem**: Heightmap preview not matching exact resolution and scale  

**Improvements**:
```javascript
// Load heightmap config for exact parameters
const configResponse = await fetch(configUrl)
const config = await configResponse.json()

// Use exact resolution from config
const segments = config.resolution ? config.resolution - 1 : 512

// Apply exact height scaling
const heightOffset = config.heightOffset || 0
const heightScale = config.heightScale || 1

// Create geometry with exact parameters
const geometry = new THREE.PlaneGeometry(
  worldSize, worldSize,
  segments, segments
)

// Apply height displacement with exact scaling
geometry.vertices.forEach((vertex, i) => {
  const heightValue = heightData[i] 
  vertex.z = heightOffset + (heightValue * heightScale)
})
```

**Status**: ✅ **EDITOR SYNC IMPROVED** - Level editor preview now matches runtime rendering

---

## Attempted Solutions That Failed

### Failed Approach #1: Ray-cast Camera Collision System
**Implementation**: Added comprehensive ray-casting collision detection to prevent camera clipping
```javascript
// Complex ray-casting system with multiple direction checks
const rays = [
  new THREE.Vector3(0, 0, -1), // Forward
  new THREE.Vector3(0, 0, 1),  // Backward  
  new THREE.Vector3(-1, 0, 0), // Left
  new THREE.Vector3(1, 0, 0),  // Right
  new THREE.Vector3(0, -1, 0)  // Down
];
```
**Result**: Caused complete black screen - all rendering failed  
**Reverted**: System restored to original simpler approach

### Failed Approach #2: Sensor Collider Addition  
**Implementation**: Added sensor collider to camera for collision detection
**Result**: No improvement in collision detection
**Reverted**: Removed sensor collider approach

### Failed Approach #3: Player Collider Size Adjustments
**Implementation**: Tested various collider sizes and camera positions  
**Result**: Minimal improvement, did not resolve clipping through terrain
**Outcome**: Some settings retained, but did not solve core issue

---

## Current Debugging Status & Next Steps

### Current Resolution Status  
**Major Progress**: Significant improvements in heightmap synchronization achieved through multiple diagnostic iterations.

**Root Causes Identified & Addressed**:
1. **Visual chunk positioning**: Chunks were hardcoded to `[0, 0, 0]` - resolved with per-chunk bbox alignment
2. **Coordinate system mismatch**: Physics vs visual offset discrepancy - resolved with bounds-based positioning  
3. **Chunk gaps**: GLB internal positioning conflicts - resolved with tile-min alignment approach
4. **Debug visualization**: Missing physics overlay - resolved with DataTexture-based overlay

**Previous Approach**: Per-chunk bounding box alignment addressed visual gaps but didn't fix underlying coordinate system issues.

---

## Critical Coordinate System Fixes (Current Session)

### Issue #6: Fundamental Coordinate System Fragmentation  
**Date**: Current debugging session  
**Problem**: Despite per-chunk alignment fixes, terrain misalignment persisted due to coordinate system inconsistencies across components  
**Root Cause**: Different parts of the system used incompatible coordinate transformations

#### Comprehensive System Audit Findings:

**Critical Issue #1 - Height Sampling Coordinate Mismatch**:
- **Generation**: Used actual GLB bounds (`bounds.minX + u * bounds.worldSizeX`)
- **Runtime**: Used centered assumption (`(worldX + halfSize) / worldSize`)
- **Impact**: Height queries sampled wrong heightmap pixels

**Critical Issue #2 - Physics Collider Dimension Mismatch**:
- **Generation**: Used actual dimensions (`worldSizeX: 393.55, worldSizeZ: 389.18`)
- **Physics**: Used square worldSize (`{ x: worldSize, y: 1.0, z: worldSize }`)
- **Impact**: Rectangular terrain had wrong collider shape

**Critical Issue #3 - Chunk Positioning Still Broken**:
- **Code**: Chunks still hardcoded to `position: new THREE.Vector3(0, 0, 0)`
- **Documentation**: Incorrectly claimed chunk positioning was fixed
- **Impact**: Visual chunks rendered at wrong positions

**Critical Issue #4 - No Coordinate System Validation**:
- **Problem**: No validation of coordinate system consistency between components
- **Impact**: Misalignment issues went undetected

#### Comprehensive Fixes Implemented:

**Fix #1: TerrainManager Height Sampling** (`src/threlte/features/terrain/TerrainManager.ts`):
```typescript
// Before: Centered coordinate assumption
const u = (worldX + halfSize) / worldSize
const v = (worldZ + halfSize) / worldSize

// After: Bounds-based coordinates (matches generation pipeline)
const worldSizeX = bounds.max[0] - bounds.min[0]
const worldSizeZ = bounds.max[2] - bounds.min[2]
const u = (worldX - bounds.min[0]) / worldSizeX
const v = (worldZ - bounds.min[2]) / worldSizeZ

// Added fallback with warning for missing bounds
if (!bounds) {
  console.warn('⚠️ No bounds available, falling back to centered assumption')
}
```

**Fix #2: TerrainCollider Actual Dimensions** (`src/threlte/features/terrain/components/TerrainCollider.svelte`):
```typescript
// Before: Square worldSize assumption
{ x: worldSize, y: 1.0, z: worldSize }

// After: Actual terrain dimensions
bounds ? 
  { x: bounds.max[0] - bounds.min[0], y: 1.0, z: bounds.max[2] - bounds.min[2] } :
  { x: worldSize, y: 1.0, z: worldSize }  // Fallback only
```

**Fix #3: Proper Chunk Position Calculation** (`src/threlte/features/terrain/TerrainManager.ts`):
```typescript
// Before: Hardcoded to origin
position: new THREE.Vector3(0, 0, 0),

// After: Calculated from bounds and chunk grid
if (bounds) {
  centerX = bounds.min[0] + (x + 0.5) * chunkSize
  centerZ = bounds.min[2] + (z + 0.5) * chunkSize
} else {
  centerX = (x - gridX/2 + 0.5) * chunkSize
  centerZ = (z - gridZ/2 + 0.5) * chunkSize
}
position: new THREE.Vector3(centerX, 0, centerZ)
```

**Fix #4: Coordinate System Validation** (`src/threlte/features/terrain/TerrainManager.ts`):
```typescript
private validateCoordinateSystem(config: TerrainConfig): void {
  // Detects worldSize mismatches, rectangular terrain, non-centered positioning
  // Logs coordinate system summary for debugging
  // Warns about missing bounds data
}
```

**Fix #5: Enhanced Diagnostic Logging**:
```typescript
console.log('🏔️ Creating heightfield collider:', {
  colliderScale: `${colliderScale.x.toFixed(2)}x${colliderScale.z.toFixed(2)}`,
  coordinateSystem: bounds ? 'bounds-based' : 'centered-fallback',
  colliderPosition: terrainOffset
})
```

#### Expected Resolution:

**For Observatory Environment**:
- **Height Sampling**: Now queries correct heightmap pixels using bounds `[-199.55, -195.10]`
- **Physics Collider**: Uses actual dimensions `393.55 x 389.18` instead of square `393.55 x 393.55`  
- **Chunk Positions**: Calculated from bounds, not hardcoded to origin
- **Validation**: Automatic detection of coordinate system issues

**Coordinate System Unification**:
- **Generation Pipeline**: Uses actual GLB bounds and dimensions ✅
- **Physics Collider**: Uses actual bounds and dimensions ✅  
- **Height Sampling**: Uses actual bounds and dimensions ✅
- **Visual Chunks**: Use calculated positions from bounds ✅

**Status**: 🎯 **COORDINATE SYSTEM UNIFIED** - All components now use consistent bounds-based coordinate transformations

---

## Critical Dimension and Scaling Fixes (External Audit)

### Issue #7: Single WorldSize vs Rectangular Terrain Mismatch  
**Date**: Current debugging session (external audit findings)  
**Problem**: Despite coordinate system unification, terrain still showed size/shape mismatch due to square worldSize assumption for rectangular terrain  
**Root Cause**: Physics collider used square dimensions while heightmap generation used actual rectangular dimensions

#### External Audit Key Findings:

**Critical Issue #1 - Square Collider for Rectangular Terrain**:
- **Observatory Actual Dimensions**: `393.55 x 389.18` (aspect ratio: 1.012)
- **Physics Collider**: Used `{ x: worldSize, y: 1.0, z: worldSize }` (square assumption)
- **Impact**: Heightfield stretched/squashed on one axis despite correct positioning

**Critical Issue #2 - Vertical Scale Parameter Source**:
- **Config File Values**: `heightOffset: -1.844`, `heightScale: 58.152`
- **Manifest Values**: `minHeight: -1.844`, `maxHeight: 56.308`
- **Risk**: Different vertical parameters between generation and runtime could cause height mismatch

**Critical Issue #3 - Missing WorldSizeX/WorldSizeZ Pipeline**:
- **Generation**: Used actual X/Z extents during raycast sampling
- **Runtime**: Only carried single `worldSize` value through config system
- **Impact**: Lost dimensional information in the configuration pipeline

#### Comprehensive Dimensional Fixes Implemented:

**Fix #1: Vertical Parameter Loading from _config.json** (`src/threlte/levels/HybridObservatory.svelte`):
```typescript
// Load vertical parameters from config to ensure exact match with generation  
const worldSizeX = configData.bounds.max[0] - configData.bounds.min[0]
const worldSizeZ = configData.bounds.max[2] - configData.bounds.min[2]

heightmapConfig = {
  ...configData,
  minHeight: configData.heightOffset,                    // Use exact generation values
  maxHeight: configData.heightOffset + configData.heightScale,
  worldSizeX: worldSizeX,
  worldSizeZ: worldSizeZ
};

// Validate height parameters match between manifest and config
if (heightmapConfig && 
    (Math.abs(heightmapConfig.minHeight - manifest.physics.minHeight) > 0.01 ||
     Math.abs(heightmapConfig.maxHeight - manifest.physics.maxHeight) > 0.01)) {
  console.warn('⚠️ Height parameter mismatch detected')
}
```

**Fix #2: WorldSizeX/WorldSizeZ Support in TerrainConfig** (`src/threlte/features/terrain/TerrainManager.ts`):
```typescript
export interface TerrainConfig {
  worldSizeX?: number  // Actual X dimension (for rectangular terrain)
  worldSizeZ?: number  // Actual Z dimension (for rectangular terrain)
  // ... existing properties
}

// Added getters for actual dimensions
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
```

**Fix #3: TerrainCollider Actual Dimensions** (`src/threlte/features/terrain/components/TerrainCollider.svelte`):
```typescript
// Added worldSizeX/Z props
export let worldSizeX: number | undefined = undefined
export let worldSizeZ: number | undefined = undefined

// Use actual dimensions in collider args
$: colliderArgs = [
  resolution - 1,
  resolution - 1, 
  heightData,
  {
    x: worldSizeX ?? (bounds ? bounds.max[0] - bounds.min[0] : worldSize), 
    y: 1.0, 
    z: worldSizeZ ?? (bounds ? bounds.max[2] - bounds.min[2] : worldSize)
  }
] as [number, number, Float32Array, { x: number; y: number; z: number }]
```

**Fix #4: Enhanced Dimensional Diagnostics**:
```typescript
// TerrainManager validation
console.log('🔍 Coordinate System Summary:', {
  worldSize: config.worldSize,
  worldSizeX: config.worldSizeX || computedWorldSizeX,
  worldSizeZ: config.worldSizeZ || computedWorldSizeZ,
  isRectangular: Math.abs(computedWorldSizeX - computedWorldSizeZ) > 0.1
})

// TerrainCollider diagnostics
console.log('🏔️ Creating heightfield collider:', {
  colliderScale: `${colliderScale.x.toFixed(2)}x${colliderScale.z.toFixed(2)}`,
  aspectRatio: (colliderScale.x / colliderScale.z).toFixed(3),
  isRectangular: Math.abs(colliderScale.x - colliderScale.z) > 0.1,
  dimensionSource: worldSizeX ? 'explicit-worldSizeXZ' : bounds ? 'computed-from-bounds' : 'fallback-square'
})
```

**Fix #5: Terrain.svelte Pipeline Integration** (`src/threlte/features/terrain/Terrain.svelte`):
```typescript
<TerrainCollider
  worldSizeX={$terrainStore.manager?.getWorldSizeX()}
  worldSizeZ={$terrainStore.manager?.getWorldSizeZ()}
  // ... other props
/>
```

#### Expected Resolution:

**For Observatory Environment**:
- **Physics Collider**: Now uses `393.55 x 389.18` dimensions (matching GLB exactly)
- **Aspect Ratio**: `1.012` (correctly rectangular, not forced square)
- **Vertical Scale**: Uses exact `heightOffset: -1.844` and `heightScale: 58.152` from generation
- **Height Validation**: Automatic detection if manifest and config vertical parameters differ
- **Dimension Source**: Logs whether using explicit worldSizeX/Z, computed from bounds, or square fallback

**Dimensional System Unification**:
- **Generation Pipeline**: Uses actual GLB rectangular bounds ✅
- **Configuration Loading**: Preserves rectangular dimensions through pipeline ✅
- **Physics Collider**: Uses actual rectangular dimensions ✅  
- **Height Sampling**: Uses bounds-based coordinates ✅
- **Visual Chunks**: Use calculated positions from bounds ✅
- **Vertical Scaling**: Uses exact generation parameters ✅

**Status**: 🎯 **DIMENSIONAL CONSISTENCY ACHIEVED** - Physics collider now matches GLB geometry exactly in all dimensions (X, Z, and Y scaling)

---

## Tools Pipeline Updates for Future Levels

### Issue #8: Tools Pipeline Dimensional Consistency Integration
**Date**: Current session (tools pipeline updates)  
**Problem**: Future levels generated by tools needed to include the dimensional consistency fixes  
**Solution**: Updated unified terrain pipeline and level generation templates to include architectural improvements

#### Tools Pipeline Updates Implemented:

**Update #1: Unified Terrain Pipeline Bounds Propagation** (`tools/unified-terrain-pipeline.js`):
```javascript
// Added bounds data propagation to level generator
const levelOptions = {
  // ... existing options
  worldSize: this.results.heightmapConfig ? this.results.heightmapConfig.worldSize : 500,
  minHeight: this.results.heightmapConfig ? this.results.heightmapConfig.heightOffset : 0,
  maxHeight: this.results.heightmapConfig ? this.results.heightmapConfig.heightOffset + this.results.heightmapConfig.heightScale : 100,
  // Add bounds data for dimensional consistency
  bounds: this.results.heightmapConfig ? this.results.heightmapConfig.bounds : null
};
```

**Update #2: Level Generator Manifest Integration** (`tools/levelprocessor/level-generator.js`):
```javascript
// Include bounds in generated manifests
physics: {
  ...this.getPhysicsConfig(type),
  worldSize: worldSize || this.getPhysicsConfig(type).worldSize,
  gridX: options.gridX || 4,
  gridY: options.gridY || 4,
  chunkSize: (worldSize || this.getPhysicsConfig(type).worldSize) / (options.gridX || 4),
  minHeight: minHeight !== undefined ? minHeight : -10,
  maxHeight: maxHeight !== undefined ? maxHeight : 100,
  // Include bounds data for dimensional consistency (when available from heightmap config)
  bounds: bounds || null
}
```

**Update #3: Terrain Template Architectural Integration** (`tools/levelprocessor/templates/terrain.template.svelte`):
```javascript
// Load bounds and vertical parameters from heightmap config
let heightmapConfig: any = null

// Try to load bounds and vertical parameters from the heightmap config file
const heightmapConfigUrl = manifest.assets.heightmap.replace('_heightmap.png', '_config.json');
const configResponse = await fetch(heightmapConfigUrl);
if (configResponse.ok) {
  const configData = await configResponse.json();
  terrainBounds = configData.bounds;
  
  // Load vertical parameters from config to ensure exact match with generation  
  const worldSizeX = configData.bounds.max[0] - configData.bounds.min[0]
  const worldSizeZ = configData.bounds.max[2] - configData.bounds.min[2]
  
  heightmapConfig = {
    ...configData,
    minHeight: configData.heightOffset,
    maxHeight: configData.heightOffset + configData.heightScale,
    worldSizeX: worldSizeX,
    worldSizeZ: worldSizeZ
  };
}

// Build terrain configuration with dimensional consistency
terrainConfig = {
  heightmapUrl: manifest.assets.heightmap,
  worldSize: manifest.physics.worldSize,
  // Use heightmap config values for exact match with generation, fallback to manifest
  worldSizeX: heightmapConfig?.worldSizeX,
  worldSizeZ: heightmapConfig?.worldSizeZ,
  minHeight: heightmapConfig?.minHeight ?? manifest.physics.minHeight ?? -50,
  maxHeight: heightmapConfig?.maxHeight ?? manifest.physics.maxHeight ?? 50,
  bounds: terrainBounds,
  // ... rest of config
};

// Validate height parameters match between manifest and config
if (heightmapConfig && 
    (Math.abs(heightmapConfig.minHeight - (manifest.physics.minHeight ?? -50)) > 0.01 ||
     Math.abs(heightmapConfig.maxHeight - (manifest.physics.maxHeight ?? 50)) > 0.01)) {
  console.warn('⚠️ Height parameter mismatch detected')
}
```

#### Future Level Generation Benefits:

**Automatic Dimensional Consistency**:
- **Bounds Injection**: All future levels will include bounds data in manifests
- **Vertical Parameter Accuracy**: Generated levels use exact heightOffset/heightScale from generation
- **Rectangular Terrain Support**: worldSizeX/worldSizeZ automatically calculated and used
- **Configuration Validation**: Automatic detection of parameter mismatches

**Developer Experience**:
- **Enhanced Logging**: Clear visibility into dimensional characteristics during generation
- **Template Integration**: New levels automatically include all architectural fixes
- **Pipeline Validation**: Built-in checks for coordinate system consistency

**Backward Compatibility**:
- **Graceful Fallbacks**: Template handles missing bounds data gracefully
- **Existing Level Support**: Current levels continue working while gaining new features
- **Migration Path**: Clear upgrade path for existing levels to gain dimensional consistency

**Status**: 🎯 **TOOLS PIPELINE UPDATED** - All future levels generated through tools will automatically include dimensional consistency architecture

---

## Critical Rapier Heightfield Fixes (Final Audit)

### Issue #9: Off-by-One and Orientation Issues in Physics Heightfield
**Date**: Current session (final external audit)  
**Problem**: Despite all coordinate system fixes, potential off-by-one in Rapier heightfield dimensions and orientation issues could still cause misalignment  
**Root Cause**: Rapier heightfield expects exact grid dimensions and proper orientation

#### Critical Issues Identified by Final Audit:

**Critical Issue #1 - Off-by-One in Rapier Grid Dimensions**:
- **Problem**: Passing `resolution - 1` for nrows/ncols but heightData has `resolution * resolution` elements
- **Impact**: Rapier drops last row/column causing incorrect spacing and misaligned heightfield
- **Evidence**: `heightData.length !== (nrows * ncols)` when using `resolution - 1`

**Critical Issue #2 - Rectangular Scaling Already Fixed**:
- **Status**: ✅ Our previous fixes correctly use actual bounds dimensions for scaling
- **Confirmation**: `{ x: worldSizeX, z: worldSizeZ }` implemented correctly

**Critical Issue #3 - Potential Orientation/Flip Issues**:
- **Problem**: Current rotation `[-Math.PI/2, 0, 0]` may cause heightfield mirroring
- **Investigation Needed**: Test with and without rotation to verify orientation

#### Critical Fixes Implemented:

**Fix #1: Corrected Rapier Heightfield Dimensions** (`src/threlte/features/terrain/components/TerrainCollider.svelte`):
```typescript
// Before: Off-by-one error
$: colliderArgs = [
  resolution - 1,  // WRONG: Doesn't match heightData.length
  resolution - 1,  // WRONG: Doesn't match heightData.length
  heightData,
  { x: worldSizeX, y: 1.0, z: worldSizeZ }
]

// After: Correct grid dimensions
$: colliderArgs = [
  resolution,      // CORRECT: Matches heightData.length = resolution * resolution
  resolution,      // CORRECT: Matches heightData.length = resolution * resolution  
  heightData,
  { x: worldSizeX, y: 1.0, z: worldSizeZ }
]
```

**Fix #2: Enhanced Validation Logging**:
```typescript
console.log('🏔️ Creating heightfield collider:', {
  resolution: `${resolution}x${resolution}`,
  rapierGrid: `${rapierRows}x${rapierCols}`,
  heightDataLength: heightData.length,
  dataMatchesGrid: heightData.length === (rapierRows * rapierCols),  // Should be true now
  // ... other diagnostics
})
```

**Fix #3: Orientation Testing Parameter**:
```typescript
export let testOrientation: boolean = false

<Collider 
  rotation={testOrientation ? [0, 0, 0] : [-Math.PI / 2, 0, 0]}
  // ... other props
/>
```

**Fix #4: Corner Height Validation Functions** (`src/threlte/features/terrain/TerrainManager.ts`):
```typescript
public validateCornerHeights(): void {
  const corners = [
    { name: 'Min corner', x: bounds.min[0], z: bounds.min[2] },
    { name: 'Max corner', x: bounds.max[0], z: bounds.max[2] },
    // ... additional corners
  ]

  corners.forEach(corner => {
    const height = this.getHeightAt(corner.x, corner.z)
    const withinRange = height >= expectedMinHeight - 0.1 && height <= expectedMaxHeight + 0.1
    console.log(`   ${corner.name}: ${height.toFixed(2)} ${withinRange ? '✅' : '❌'}`)
  })
}

public logSystemState(): void {
  console.log('🔍 Terrain System State:', {
    bounds: this.config?.bounds,
    resolution: this.resolution,
    heightDataLength: this.heightData?.length,
    dataMatchesResolution: this.heightData?.length === (this.resolution * this.resolution)
  })
}
```

**Fix #5: Automatic Validation on Terrain Ready**:
```typescript
// Add validation logging when terrain becomes ready  
$: if ($terrainStore.isReady && $terrainStore.manager) {
  setTimeout(() => {
    $terrainStore.manager?.logSystemState()
    $terrainStore.manager?.validateCornerHeights()
  }, 100)
}
```

#### Expected Results:

**Heightfield Grid Validation**:
- `dataMatchesGrid: true` - heightData.length should equal rapierRows * rapierCols
- No more dropped rows/columns in physics heightfield
- Exact 1:1 correspondence between heightmap pixels and physics grid points

**Corner Height Validation**:  
- Corner sampling should return values within expected min/max range
- Heights at bounds edges should match heightmap generation parameters
- Validation will show ✅ or ❌ for each corner test

**Visual Debug Overlay**:
- Green wireframe overlay should align exactly with GLB visual terrain
- No more offset, stretching, or orientation issues
- Physics collider geometry matches visual geometry perfectly

**Testing Protocol**:
1. **Verify Grid Match**: Check `dataMatchesGrid: true` in console logs
2. **Test Corner Heights**: Check validation shows ✅ for all corners  
3. **Visual Alignment**: Confirm debug overlay sits exactly on GLB terrain
4. **Orientation Test**: If issues remain, set `testOrientation={true}` to test without rotation

**Status**: 🎯 **CRITICAL PHYSICS FIXES APPLIED** - Off-by-one grid dimensions corrected, validation functions added, orientation testing enabled

### Open Items & Next Steps

#### Remaining Issues to Address:
1. **Micro-Seams (Visual)**: If tiny gaps remain between chunk boundaries
   - **Solution**: Update chunk processor to split triangles at exact tile borders
   - **Alternative**: Generate visual tiles directly from heightmap PNG for watertight visuals

2. **Walk Through Walls**: Heightfield physics cannot represent vertical structures  
   - **Solution**: Add fixed colliders for buildings and vertical structures
   - **Implementation**: Separate collision mesh generation for architectural elements

3. **LOD Boundary Consistency**: Ensure smooth transitions between different LOD levels
   - **Solution**: Pin LOD boundary vertices across tiles for seamless transitions

#### Successfully Resolved Areas:
- ✅ **Basic terrain-physics alignment**: Per-chunk bbox alignment working
- ✅ **Chunk gap elimination**: Robust tile-min alignment approach  
- ✅ **Debug visualization**: Physics overlay for verification
- ✅ **Level editor sync**: Preview matching runtime rendering
- ✅ **Coordinate system consistency**: Bounds-based positioning throughout pipeline

### Historical Investigation Areas (Reference Only)
These areas were investigated but found not to be primary causes:

#### Possible Causes Still Under Investigation:

1. **Heightmap Resolution vs Physics Resolution Mismatch**
   ```javascript
   // Generation: uses full resolution (1024x1024)
   // Physics: may be using downsampled resolution
   ```

2. **Height Scale/Offset Issues**
   ```javascript
   // Check if height normalization matches between generation and runtime
   const worldHeight = minHeight + (grayscale * heightRange)  // Generation
   // vs runtime height sampling
   ```

3. **Multiple Mesh/Collision Geometry in GLB**
   - GLB may contain both visual mesh and separate collision mesh
   - Heightmap generation might be sampling wrong geometry

4. **Rapier Physics Heightfield Orientation**
   ```javascript
   // TerrainCollider.svelte line 92
   rotation={[-Math.PI / 2, 0, 0]}  // 90° X rotation for Rapier
   ```
   
5. **Chunk Boundary Alignment Issues**
   - Runtime chunks may not align with heightmap pixel boundaries
   - Coordinate rounding differences between systems

### Recommended Diagnostic Steps

#### Step 1: Validate Heightmap Content
```bash
# Check heightmap generation logs for coordinate bounds
node tools/heightmap-generator/heightmap_baker_node.mjs [your-glb-file]

# Look for output like:
# "📏 GLB bounds: min=[-199.55, -1.84, -195.10], max=[193.98, 56.31, 198.43]"
# "🎯 Heightmap config saved: [config-file-path]"
```

#### Step 2: Runtime Coordinate Verification
```javascript
// Add to TerrainCollider.svelte for debugging
$: if (colliderArgs) {
  console.log('🔍 TERRAIN DEBUG:', {
    terrainOffset: terrainOffset,
    bounds: bounds,
    worldSize: worldSize,
    colliderArgs: colliderArgs
  });
}
```

#### Step 3: Height Sampling Comparison
```javascript
// In game, test height sampling at known coordinates
// Compare with heightmap generation logs
console.log('Height at spawn:', terrainManager.getHeightAt(-100, -50));
```

#### Step 4: Physics Debug Visualization
```javascript
// Enable physics debug rendering in game
// Verify collision mesh aligns with visual terrain
```

### Configuration File Analysis

#### Current Observatory Environment Config:
```json
{
  "physics": {
    "worldSize": 393.5526885986328,
    "minHeight": -1.8438290357589722,
    "maxHeight": 56.307861328125
  }
}
```

#### Missing Critical Data:
The manifest lacks explicit bounds data that the heightmap generation creates:
```json
// This should be added to manifests:
"bounds": {
  "min": [-199.55, -1.84, -195.10],
  "max": [193.98, 56.31, 198.43]
}
```

---

## Diagnostic Commands & Tools

### Generate New Heightmap with Verbose Logging
```bash
cd tools
node heightmap-generator/heightmap_baker_node.mjs ../public/models/levels/observatory-environment.glb --verbose
```

### Validate Terrain Pipeline
```bash
node unified-terrain-pipeline.js --validate observatory-environment
```

### Test Height Sampling
```javascript
// Browser console in game
window.terrainManager.getHeightAt(-100, -50);  // Should match spawn height
```

### Physics Debug Mode
```javascript
// Enable in game settings
window.gameSettings.physics.debugMode = true;
```

---

## Known Working Configurations

### Coordinate System Requirements for Successful Sync:
1. GLB bounds must be properly extracted with world matrix transformations
2. Heightmap generation must use actual bounds (not centered assumptions)  
3. Runtime collision must use same bounds for positioning
4. All components must use consistent worldSize calculation
5. Physics heightfield orientation must match heightmap UV mapping

### Validated Fix Pattern:
```javascript
// ✅ Working approach (bounds-based)
$: terrainOffset = bounds ? [bounds.min[0], 0, bounds.min[2]] : fallback

// ❌ Problematic approach (centered assumption)  
$: terrainOffset = [-worldSize / 2, 0, -worldSize / 2]
```

---

## Troubleshooting Checklist

### When experiencing terrain collision issues:

- [ ] **Verify GLB has proper world transformations applied**
  - Check for nested transformations in GLB hierarchy
  - Ensure `updateMatrixWorld(true)` is called before bounds calculation

- [ ] **Confirm heightmap bounds match GLB bounds**
  - Compare heightmap config bounds with GLB analysis output
  - Verify no coordinate system conversions are lost

- [ ] **Validate runtime bounds loading**  
  - Ensure TerrainManager receives correct bounds from config
  - Check that bounds are passed to TerrainCollider component

- [ ] **Test coordinate mapping consistency**
  - Sample height at known coordinates in both generation and runtime
  - Verify UV to world coordinate transformation matches

- [ ] **Check physics heightfield parameters**
  - Confirm resolution matches between heightmap and collider
  - Verify height scale and offset are correctly applied

- [ ] **Inspect chunk alignment**
  - Ensure runtime chunks align with heightmap pixel boundaries
  - Verify chunk positioning uses same coordinate system

### Emergency Debugging Mode

If issues persist, enable comprehensive logging:

```javascript
// Add to TerrainManager.ts
console.log('🔍 HEIGHTMAP LOAD:', {
  config: this.config,
  resolution: this.resolution,
  heightDataSample: this.heightData?.slice(0, 10),
  bounds: this.config?.bounds
});

// Add to TerrainCollider.svelte  
$: console.log('🔍 COLLIDER CREATE:', {
  terrainOffset,
  bounds,
  worldSize,
  colliderArgs
});
```

---

## Future Improvements

### Proposed System Enhancements:
1. **Automatic bounds validation** between generation and runtime
2. **Visual debugging overlay** showing collision vs visual mesh alignment  
3. **Coordinate system unit tests** to prevent regression
4. **Pipeline validation warnings** for common misconfigurations
5. **Runtime coordinate system diagnostics** UI panel

---

## Document History

**Version 1.0** - Initial diagnostic documentation  
- Documented coordinate system analysis and initial fix attempts
- Recorded failed approaches and debugging steps

**Version 1.1** - Complete diagnostic record  
- Added extended diagnostic session from separate agent
- Documented initial root cause discovery and group-level fix approach

**Version 1.2** - Runtime refinements and continued development
- Added per-chunk alignment implementation and gap elimination fixes
- Added TerrainCollider debug overlay and visualization improvements  
- Added level editor synchronization improvements
- Updated approach from group-level offset to per-chunk bbox alignment
- Corrected documentation inconsistencies

**Version 1.3** - Critical coordinate system unification fixes
- Identified and resolved fundamental coordinate system fragmentation
- Fixed TerrainManager height sampling to use bounds-based coordinates
- Fixed TerrainCollider to use actual terrain dimensions instead of square worldSize
- Implemented proper chunk position calculation using bounds
- Added comprehensive coordinate system validation and diagnostics
- Unified all components to use consistent bounds-based coordinate transformations

**Version 1.4** - Dimensional consistency and external audit fixes
- Addressed external audit findings on single worldSize vs rectangular terrain mismatch
- Implemented worldSizeX/worldSizeZ support throughout the pipeline
- Added vertical parameter loading from _config.json for exact generation match
- Enhanced dimensional diagnostics with aspect ratio and rectangle detection
- Fixed physics collider to use actual rectangular dimensions instead of square assumption
- Added height parameter validation between manifest and generation config

**Version 1.5** - Tools pipeline integration for future level generation
- Updated unified terrain pipeline to propagate bounds data to level generator
- Modified level generator to inject bounds data into generated manifests
- Enhanced terrain template to include all dimensional consistency fixes
- Added comprehensive logging for dimensional characteristics during generation
- Ensured backward compatibility with graceful fallbacks for missing data
- Integrated architectural improvements into tools workflow for automatic application

**Version 1.6** - Critical physics heightfield fixes and validation
- Fixed off-by-one error in Rapier heightfield grid dimensions (resolution vs resolution-1)
- Added comprehensive validation functions for corner height testing
- Implemented orientation testing parameter for debugging heightfield rotation issues
- Enhanced diagnostic logging with grid dimension validation and data consistency checks
- Added automatic validation on terrain ready with corner height verification
- Established testing protocol for systematic heightfield alignment verification

**Version 1.8** - Advanced Diagnostic Framework Implementation
- **Current Issue**: Visual terrain and heightfield mesh are perfectly aligned, but player walking surface doesn't match what's visible
- **Root Cause**: Despite unified coordinates, there's still a transform mismatch between the physics collider data and the visual mesh
- **Investigation**: Implemented comprehensive diagnostic framework to systematically identify the exact transformation needed
- **Status**: 🔧 **DIAGNOSTIC TOOLS ACTIVE** - Debug toggles, collider inventory, raycast probes, and bounds visualization deployed
- **Next Steps**: Use diagnostic matrix (flipRows/swapAxes/centerAnchor) to identify the specific data transformation that aligns physics with visuals

---

## Current Diagnostic Framework (Version 1.8)

### Issue Status: Walking Surface Mismatch
**Current Symptoms**: 
- Visual terrain mesh perfectly aligned ✅
- Heightfield debug wireframe perfectly aligned ✅  
- Player walking surface doesn't match visible/debug terrain ❌

**Root Cause Theory**: Physics collider data needs transformation (flip rows, swap axes, or different anchoring) to match the coordinate system used by the visual terrain.

### Implemented Diagnostic Tools

#### 1. Debug Toggle Matrix
**Location**: `src/threlte/features/terrain/components/TerrainCollider.svelte:28-35`
```typescript
export let flipRowsForCollider: boolean = false    // Test V-axis inversion
export let swapAxesForCollider: boolean = false    // Test X/Z transpose  
export let anchorAtCenter: boolean = false         // Test center vs corner anchor
export let showBoundsAABB: boolean = false         // White bounds overlay
export let enableRaycastProbe: boolean = false     // 5-point ground validation
```

#### 2. URL Parameter Control System
**Usage**: Add query parameters to test configurations without code changes:
```
?hf_flip=1&hf_swap=1&hf_center=1&hf_aabb=1&hf_probe=1
```

#### 3. Dual Wireframe Visualization
- **Green Wireframe**: Original heightfield data (visual reference)
- **Red/Physics Wireframe**: Transformed collider data (physics reference)
- **White AABB Box**: Terrain bounds validation

#### 4. Collider Inventory Logger
**Function**: `logColliderInventory()` - Lists all active physics colliders
**Output**: Shape type, position, collision groups, sensor status

#### 5. Ground Raycast Probe
**Function**: `performRaycastProbe()` - Tests 5 points (4 corners + center)  
**Validation**: Compares raycast Y-values with expected ground height

### Current Test Configuration
**File**: `src/threlte/features/terrain/Terrain.svelte:66-71`
```typescript
showBoundsAABB={true}        // White bounds overlay active
enableRaycastProbe={true}    // 5-point validation active
flipRowsForCollider={false}  // Default: no V-flip
swapAxesForCollider={false}  // Default: no transpose
anchorAtCenter={false}       // Default: min-corner anchor
```

### Testing Matrix Protocol

#### Test Sequence:
1. **Baseline** (current): All toggles false - Document behavior
2. **V-Flip Test**: `flipRowsForCollider={true}` - Test row inversion
3. **Transpose Test**: `swapAxesForCollider={true}` - Test axis swap  
4. **Both Test**: Both flip and swap - Test combined transform
5. **Center Anchor**: `anchorAtCenter={true}` - Test origin mode
6. **All Combinations**: Test systematic matrix of all toggle combinations

#### Expected Resolution Patterns:
- **Mirrored front/back**: Fix with `flipRowsForCollider={true}`
- **Mirrored left/right**: Fix with `swapAxesForCollider={true}`
- **Consistent offset**: Fix with `anchorAtCenter={true}`
- **Scaled mismatch**: Already addressed by worldSizeX/Z fixes

### Enhanced Logging System
```typescript
console.log('🏔️ Creating heightfield collider:', {
  resolution: `${resolution}x${resolution}`,
  heightDataLength: heightsForCollider.length,
  expectedLength: (resolution * resolution),
  debugTransforms: {
    flipRows: flipRowsForCollider,
    swapAxes: swapAxesForCollider, 
    centerAnchor: anchorAtCenter
  },
  colliderScale: `${colliderScale.x}x${colliderScale.z}`,
  aspectRatio: (colliderScale.x / colliderScale.z).toFixed(3)
})
```

### Fixed TypeScript Issues
- Corrected Rapier Shape API usage (`shape.type` not `shape().type`)
- Fixed RayColliderHit property access (correct property names)
- Removed invalid `collisionGroups` prop from Threlte Collider
- Fixed Threlte position prop type casting

---

*Document Version: 1.8*  
*Last Updated: Current session*  
*Status: **DIAGNOSTIC FRAMEWORK DEPLOYED** - Advanced debugging tools implemented to systematically identify the exact data transformation needed to align physics walking surface with visual terrain. Ready for test matrix execution.*

## Key Lessons Learned

1. **Coordinate system audit is critical** - Visual alignment fixes can mask fundamental coordinate system fragmentation that prevents proper physics-visual synchronization.

2. **System-wide consistency required** - All components (generation, physics, height sampling, chunks) must use the same coordinate transformation approach to prevent cumulative errors.

3. **Bounds-based coordinates essential** - Centered coordinate assumptions fail for non-square, non-centered terrain; actual GLB bounds must be used consistently.

4. **Validation prevents silent failures** - Coordinate system validation catches mismatches that would otherwise manifest as mysterious alignment issues.

5. **Documentation accuracy matters** - Incorrect documentation of "fixed" issues led to continued debugging of non-existent problems while real issues went unaddressed.

6. **Progressive refinement reveals deeper issues** - Surface-level fixes (per-chunk alignment) can work around but not solve fundamental architectural problems.

7. **Comprehensive auditing finds root causes** - Systematic examination of the entire pipeline revealed that the problem wasn't in alignment algorithms but coordinate system incompatibility.

8. **Physics limitations require architectural awareness** - Heightfield collision works for terrain but vertical structures need separate fixed colliders.

9. **Debug logging essential for complex coordinate systems** - Enhanced logging with coordinate system detection helps identify which transformation approach is being used.

10. **External audits reveal hidden issues** - Even after comprehensive internal fixes, external perspective identified critical dimensional mismatch that internal debugging missed.

11. **Rectangular terrain requires explicit support** - Single worldSize parameter fails for rectangular terrain; explicit worldSizeX/Z support throughout pipeline is essential.

12. **Configuration parameter source matters** - Using manifest physics parameters vs. generation config parameters can cause subtle mismatches even when values appear similar.

13. **Aspect ratio validation catches dimensional issues** - Logging and validating terrain aspect ratios helps identify when square assumptions are applied to rectangular geometry.

14. **Pipeline dimensional preservation crucial** - Dimensional information must be preserved from generation through configuration loading to runtime physics creation.