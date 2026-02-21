# Fixed Timestep Physics Implementation Plan

## Overview

This document outlines the implementation of industry-standard fixed timestep physics with interpolation to resolve mobile device shaking issues. This architectural change decouples physics simulation from rendering framerate, eliminating violent corrections caused by frame drops.

## Problem Statement

**Current Issue**: Physics simulation tied to `requestAnimationFrame` causes:
- Massive time deltas during frame drops (457ms)
- Physics engine applying violent corrective forces
- Player "teleportation" and oscillation on mobile devices
- Issue amplified on hills due to rapid height changes

**Root Cause**: Variable timestep physics simulation is fundamentally unstable on mobile devices.

## Solution Architecture

### **Two-Loop System**
1. **Fixed Physics Loop**: Runs at constant 60Hz regardless of framerate
2. **Variable Render Loop**: Runs at device capability with interpolated visuals

### **Benefits**
- Physics calculations become predictable and stable
- Immune to framerate instability
- Smooth visual motion regardless of performance
- Industry-standard approach used by all major game engines

## Implementation Steps

### **Phase 1: Core Physics Loop Restructure**

#### **Step 1.1: Create Fixed Timestep Manager**
**File**: `src/threlte/systems/FixedTimestepManager.ts`

**Purpose**: Central manager for fixed timestep physics execution

**Key Components**:
```typescript
interface PhysicsBodyState {
  rigidBody: RigidBody;
  previousPosition: THREE.Vector3;
  currentPosition: THREE.Vector3;
  previousRotation: THREE.Quaternion;
  currentRotation: THREE.Quaternion;
}

class FixedTimestepManager {
  private static readonly PHYSICS_TIMESTEP = 1 / 60; // 60Hz fixed rate
  private accumulator = 0;
  private lastTime = performance.now();
  private registeredBodies: Map<string, PhysicsBodyState> = new Map();
  public interpolationAlpha = 0;
  
  // Centralized state management
  public registerBody(id: string, rigidBody: RigidBody): void {
    const translation = rigidBody.translation();
    const rotation = rigidBody.rotation();
    
    this.registeredBodies.set(id, {
      rigidBody,
      previousPosition: new THREE.Vector3(translation.x, translation.y, translation.z),
      currentPosition: new THREE.Vector3(translation.x, translation.y, translation.z),
      previousRotation: new THREE.Quaternion(rotation.x, rotation.y, rotation.z, rotation.w),
      currentRotation: new THREE.Quaternion(rotation.x, rotation.y, rotation.z, rotation.w)
    });
  }
  
  public update(rapierWorld: World): void {
    const currentTime = performance.now();
    const deltaTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;
    
    this.accumulator += Math.min(deltaTime, 0.25); // Cap max delta to prevent spiral of death
    
    // Fixed physics updates
    while (this.accumulator >= FixedTimestepManager.PHYSICS_TIMESTEP) {
      this.storePhysicsStates(); // Store previous positions/rotations
      rapierWorld.step(); // Fixed timestep step
      this.updateCurrentStates(); // Update current positions/rotations
      this.accumulator -= FixedTimestepManager.PHYSICS_TIMESTEP;
    }
    
    // Calculate interpolation alpha for rendering
    this.interpolationAlpha = this.accumulator / FixedTimestepManager.PHYSICS_TIMESTEP;
  }
  
  private storePhysicsStates(): void {
    this.registeredBodies.forEach(state => {
      state.previousPosition.copy(state.currentPosition);
      state.previousRotation.copy(state.currentRotation);
    });
  }
  
  private updateCurrentStates(): void {
    this.registeredBodies.forEach(state => {
      const translation = state.rigidBody.translation();
      const rotation = state.rigidBody.rotation();
      
      state.currentPosition.set(translation.x, translation.y, translation.z);
      state.currentRotation.set(rotation.x, rotation.y, rotation.z, rotation.w);
    });
  }
  
  public getInterpolatedTransform(id: string): { position: THREE.Vector3, rotation: THREE.Quaternion } | null {
    const state = this.registeredBodies.get(id);
    if (!state) return null;
    
    const interpolatedPosition = new THREE.Vector3().lerpVectors(
      state.previousPosition, 
      state.currentPosition, 
      this.interpolationAlpha
    );
    
    const interpolatedRotation = new THREE.Quaternion().slerpQuaternions(
      state.previousRotation,
      state.currentRotation, 
      this.interpolationAlpha
    );
    
    return { position: interpolatedPosition, rotation: interpolatedRotation };
  }
}
```

#### **Step 1.2: Modify Physics.svelte Integration**
**File**: `src/threlte/systems/Physics.svelte`

**Changes**:
- Remove variable timestep `world.step()`
- Integrate `FixedTimestepManager`
- Pass fixed timestep manager to physics context

**Implementation**:
```svelte
<script lang="ts">
  import { FixedTimestepManager } from './FixedTimestepManager'
  
  let fixedTimestepManager: FixedTimestepManager
  
  onMount(() => {
    fixedTimestepManager = new FixedTimestepManager()
  })
  
  useTask(() => {
    if (world && fixedTimestepManager) {
      fixedTimestepManager.update(world)
    }
  })
</script>
```

### **Phase 2: Player Physics State Management**

#### **Step 2.1: Add Position State Tracking**
**File**: `src/threlte/components/Player.svelte`

**New State Variables**:
```typescript
// Physics state management
let previousPhysicsPosition = new THREE.Vector3()
let currentPhysicsPosition = new THREE.Vector3()
let interpolatedPosition = new THREE.Vector3()
let physicsTimestamp = 0
```

#### **Step 2.2: Implement Physics State Updates**
**Methods to Add**:
```typescript
function storePhysicsState() {
  if (!rigidBody) return
  
  // Store previous position before physics step
  previousPhysicsPosition.copy(currentPhysicsPosition)
  physicsTimestamp = performance.now()
}

function updatePhysicsState() {
  if (!rigidBody) return
  
  // Update current position after physics step
  const translation = rigidBody.translation()
  currentPhysicsPosition.set(translation.x, translation.y, translation.z)
}

function interpolateVisualPosition(alpha: number) {
  // Interpolate between previous and current physics positions
  interpolatedPosition.lerpVectors(previousPhysicsPosition, currentPhysicsPosition, alpha)
}
```

#### **Step 2.3: Implement Proper Input Handling Pattern**
**Industry Standard Approach**:

**Input Sampling (Render Loop)**:
```typescript
// Sample input once per frame in render loop (useTask)
let inputState = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  jump: false,
  running: false
};

// In useTask (render loop)
function updateInputState() {
  inputState.forward = keyStates['KeyW'] || joystickInput.forward > 0.1;
  inputState.backward = keyStates['KeyS'] || joystickInput.backward > 0.1;
  inputState.left = keyStates['KeyA'] || joystickInput.left > 0.1;
  inputState.right = keyStates['KeyD'] || joystickInput.right > 0.1;
  inputState.jump = keyStates['Space'] || mobileJumpPressed;
  inputState.running = keyStates['ShiftLeft'] || keyStates['ShiftRight'];
}
```

**Input Application (Fixed Physics Loop)**:
```typescript
// Apply input forces during fixed timestep physics updates
function applyInputForces() {
  if (!rigidBody) return;
  
  const moveSpeed = inputState.running ? speed * 2 : speed;
  let movement = new THREE.Vector3();
  
  if (inputState.forward) movement.z -= moveSpeed;
  if (inputState.backward) movement.z += moveSpeed;
  if (inputState.left) movement.x -= moveSpeed;
  if (inputState.right) movement.x += moveSpeed;
  
  // Apply movement during fixed physics step
  if (movement.length() > 0) {
    const rotation = rigidBody.rotation();
    const quaternion = new THREE.Quaternion(rotation.x, rotation.y, rotation.z, rotation.w);
    movement.applyQuaternion(quaternion);
    
    const currentVel = rigidBody.linvel();
    rigidBody.setLinvel({
      x: movement.x,
      y: currentVel.y, // Preserve gravity
      z: movement.z
    }, true);
  }
  
  // Handle jump
  if (inputState.jump && isGrounded) {
    const currentVel = rigidBody.linvel();
    rigidBody.setLinvel({
      x: currentVel.x,
      y: jumpForce,
      z: currentVel.z
    }, true);
  }
}
```

**Benefits**:
- **Responsive Input**: Sampled every frame for immediate feedback
- **Deterministic Physics**: Applied only during fixed timesteps
- **Stable Forces**: No input-related physics instability

### **Phase 3: Rendering Integration**

#### **Step 3.1: Create Interpolation Context**
**File**: `src/threlte/core/InterpolationContext.ts`

**Purpose**: Provide interpolation alpha to all rendered objects

```typescript
export interface InterpolationContext {
  alpha: number;
  getInterpolatedPosition(rigidBody: RigidBody): THREE.Vector3;
}
```

#### **Step 3.2: Update Player Rendering**
**File**: `src/threlte/components/Player.svelte`

**Visual Position Updates**:
```svelte
<!-- Use interpolated position for visual components -->
<T.Group position={[interpolatedPosition.x, interpolatedPosition.y, interpolatedPosition.z]}>
  <!-- Camera and visual elements -->
  <T.PerspectiveCamera bind:ref={camera} position={[0, 0.5, 0]} />
</T.Group>
```

### **Phase 4: Integration Points**

#### **Step 4.1: Rapier Integration**
**File**: `src/threlte/systems/Physics.svelte`

**Modifications**:
- Remove `world.step()` from `useTask`
- Integrate with `FixedTimestepManager`
- Provide physics context to components

#### **Step 4.2: Component Integration**
**Files**: All physics-based components

**Simplified Pattern with Centralized State Management**:
```svelte
<script>
  import { getContext, onMount, onDestroy } from 'svelte'
  
  const { fixedTimestepManager } = getContext('physics')
  const componentId = `player-${Math.random()}` // Unique ID
  
  let rigidBody: RigidBody
  let interpolatedTransform = { position: new THREE.Vector3(), rotation: new THREE.Quaternion() }
  
  // Register with centralized state manager
  onMount(() => {
    if (rigidBody && fixedTimestepManager) {
      fixedTimestepManager.registerBody(componentId, rigidBody)
    }
  })
  
  // Get interpolated transform for rendering
  useTask(() => {
    if (fixedTimestepManager) {
      const transform = fixedTimestepManager.getInterpolatedTransform(componentId)
      if (transform) {
        interpolatedTransform = transform
      }
    }
  })
  
  onDestroy(() => {
    // Clean up registration
    if (fixedTimestepManager) {
      fixedTimestepManager.unregisterBody(componentId)
    }
  })
</script>

<!-- Use interpolated transform for smooth visuals -->
<T.Group 
  position={[interpolatedTransform.position.x, interpolatedTransform.position.y, interpolatedTransform.position.z]}
  quaternion={[interpolatedTransform.rotation.x, interpolatedTransform.rotation.y, interpolatedTransform.rotation.z, interpolatedTransform.rotation.w]}
>
  <!-- Visual components -->
</T.Group>
```

**Benefits of Centralized Approach**:
- **Simpler Components**: No manual state management per component
- **Consistent Behavior**: All physics objects handled uniformly  
- **Easier Debugging**: Central location for all physics state
- **Better Performance**: Batch processing of state updates

## Implementation Priority

### **Phase 1: Core Implementation (Critical)**
1. `FixedTimestepManager.ts` - Core fixed timestep logic
2. `Physics.svelte` integration - Remove variable timestep
3. Basic interpolation framework

### **Phase 2: Player Integration (High)**
1. Player physics state management
2. Input processing at fixed timestep
3. Visual interpolation for smooth movement

### **Phase 3: System Integration (Medium)**
1. Context providers for interpolation
2. Integration with existing physics components
3. Performance monitoring and optimization

### **Phase 4: Polish and Optimization (Low)**
1. Fine-tune interpolation parameters
2. Add configuration options
3. Performance profiling and optimization

## Expected Outcomes

### **Immediate Benefits**
- Elimination of mobile device shaking
- Stable physics simulation regardless of framerate
- Smooth visual motion on all devices

### **Long-term Benefits**
- Predictable physics behavior for all game systems
- Foundation for advanced features (networking, replays)
- Professional-grade physics architecture

## Performance Considerations

### **CPU Impact**
- **Minimal**: Fixed timestep often more efficient than variable
- **Predictable**: Consistent CPU usage patterns
- **Scalable**: Better performance on low-end devices

### **Memory Impact**
- **Small increase**: Position state storage for interpolation
- **Optimizable**: Can use object pooling for state management

### **Mobile Optimization**
- Physics runs at consistent rate regardless of rendering performance
- Visual smoothness maintained even during frame drops
- Better battery life due to predictable CPU usage

## Testing Strategy

### **Phase 1 Testing**
1. Verify fixed timestep execution frequency
2. Confirm physics simulation stability
3. Test interpolation smoothness

### **Phase 2 Testing**
1. Mobile device testing with intentional frame drops
2. Hill traversal testing (previous problem area)
3. Input responsiveness verification

### **Phase 3 Testing**
1. Cross-device compatibility testing
2. Performance benchmarking
3. Edge case testing (very low/high framerates)

## Technical Implementation Notes

### **Quaternion Rotation Interpolation**
**Critical for Smooth Character Movement**:

```typescript
// WRONG: Linear interpolation of Euler angles causes gimbal lock
const interpolatedRotation = {
  x: lerp(previousRotation.x, currentRotation.x, alpha),
  y: lerp(previousRotation.y, currentRotation.y, alpha),
  z: lerp(previousRotation.z, currentRotation.z, alpha)
};

// CORRECT: Spherical linear interpolation of quaternions
const interpolatedRotation = new THREE.Quaternion().slerpQuaternions(
  previousRotationQuaternion,
  currentRotationQuaternion,
  alpha
);
```

**Why This Matters**:
- **Prevents Gimbal Lock**: Quaternions don't suffer from rotation axis limitations
- **Smooth Motion**: SLERP provides the shortest rotation path
- **Industry Standard**: All major game engines use quaternion SLERP for rotation

### **Spiral of Death Prevention**
The `Math.min(deltaTime, 0.25)` cap is essential:

```typescript
// Without cap: Browser tab switch (5 second pause) would cause:
// accumulator += 5.0 → 300 physics steps in one frame → game freeze

// With cap: Maximum 15 physics steps (0.25s ÷ 1/60s) → responsive recovery
this.accumulator += Math.min(deltaTime, 0.25);
```

### **Memory Management**
**Efficient Object Reuse**:
```typescript
// Reuse Vector3/Quaternion objects to prevent garbage collection
private tempVector = new THREE.Vector3();
private tempQuaternion = new THREE.Quaternion();

public getInterpolatedTransform(id: string): { position: THREE.Vector3, rotation: THREE.Quaternion } {
  const state = this.registeredBodies.get(id);
  if (!state) return null;
  
  // Reuse temp objects instead of creating new ones
  this.tempVector.lerpVectors(state.previousPosition, state.currentPosition, this.interpolationAlpha);
  this.tempQuaternion.slerpQuaternions(state.previousRotation, state.currentRotation, this.interpolationAlpha);
  
  return { 
    position: this.tempVector.clone(), 
    rotation: this.tempQuaternion.clone() 
  };
}
```

## Risk Mitigation

### **Implementation Risks**
- **Risk**: Breaking existing physics behavior
- **Mitigation**: Incremental rollout with feature flags

### **Performance Risks**
- **Risk**: Increased CPU usage
- **Mitigation**: Performance monitoring and optimization

### **Compatibility Risks**
- **Risk**: Browser-specific issues
- **Mitigation**: Cross-browser testing matrix

## Success Metrics

### **Primary Metrics**
1. **Elimination of mobile shaking**: 0 reports of violent oscillation
2. **Smooth hill traversal**: Stable movement on slopes
3. **Frame rate independence**: Consistent behavior across devices

### **Secondary Metrics**
1. **Performance improvement**: Better FPS on mobile devices
2. **Input responsiveness**: Consistent control response
3. **Physics stability**: Predictable collision behavior

## Migration Strategy

### **Backward Compatibility**
- Implement behind feature flag initially
- Gradual rollout to test devices
- Fallback to current system if issues arise

### **Rollout Plan**
1. **Development**: Implement and test in development environment
2. **Staging**: Deploy to staging with A/B testing
3. **Production**: Gradual rollout starting with less critical levels
4. **Full Deployment**: Complete migration once stability confirmed

---

*This implementation plan provides a comprehensive roadmap for implementing industry-standard fixed timestep physics to resolve mobile device shaking issues through architectural improvements rather than symptomatic fixes.*