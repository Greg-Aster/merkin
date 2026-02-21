# MEGAMEAL Movement System Documentation

## Overview

The MEGAMEAL movement system implements first-person controls using Threlte + Rapier physics. This document explains the architecture, common issues, and solutions implemented to resolve the "spinning player" bug.

## Architecture

### Components
- **Player.svelte**: Main first-person controller component
- **RigidBody**: Rapier physics body (capsule collider)
- **Camera**: Three.js camera parented to the RigidBody

### Input Systems
- **Desktop**: WASD + click-and-drag mouse look
- **Mobile**: Touch controls with virtual joystick areas

## The "Spinning Player" Problem

### Root Cause
The spinning issue was caused by **physics-generated angular forces** conflicting with input controls:

1. **Capsule vs Trimesh Collisions**: The capsule collider hitting complex trimesh ground geometry generates small rotational forces
2. **Accumulating Angular Velocity**: These micro-rotations accumulate over time, causing circular movement
3. **Wall/Incline Amplification**: Complex geometry (walls, slopes) creates stronger rotational forces
4. **Mouse Input Conflicts**: Mouse rotation system compounded the physics-generated rotation

### Symptoms
- Player moves in circles when walking straight
- Worse spinning when hitting walls or inclines
- Movement direction changes continuously during forward movement

## Solution Implementation

### Key Principle: "Chain of Command" Pattern
The robust solution establishes **input as the single source of truth** for rotation, overriding any physics-generated rotation noise every frame.

```typescript
// Movement = Velocity-based (physics-friendly)
rigidBody.setLinvel(velocity, true)

// Rotation = Authoritative state-based control (every frame)
const bodyQuaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), bodyRotationY)
rigidBody.setRotation(bodyQuaternion, true)

// Camera pitch = Direct state control
camera.rotation.x = cameraRotationX
```

### 1. Movement Logic (Velocity-Based)
```typescript
// Calculate world-space movement using body rotation
const localMovement = new THREE.Vector3(movement.x * speed, 0, movement.z * speed)
localMovement.applyQuaternion(bodyQuaternion)
velocity.x = localMovement.x
velocity.z = localMovement.z
rigidBody.setLinvel(velocity, true)
```

### 2. Rotation Logic (Position-Based)
```typescript
// Mouse/touch input directly sets rotation position
bodyRotationY -= deltaX * mouseSensitivity
const bodyQuaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), bodyRotationY)
rigidBody.setRotation({ x: bodyQuaternion.x, y: bodyQuaternion.y, z: bodyQuaternion.z, w: bodyQuaternion.w }, true)
```

### 3. Physics Interference Prevention
```typescript
// CRITICAL: Always lock angular velocity to prevent physics-generated rotation
if (!isMouseDown && !isDragging) {
  // No mouse input: completely lock ALL rotation
  rigidBody.setAngvel({ x: 0, y: 0, z: 0 }, true)
  
  // Lock rotation position to prevent drift
  const lockedRotation = new THREE.Quaternion(0, currentRotation.y, 0, currentRotation.w)
  rigidBody.setRotation(lockedRotation, true)
} else {
  // Mouse active: still lock angular velocity, mouse handles rotation via setRotation
  rigidBody.setAngvel({ x: 0, y: 0, z: 0 }, true)
}
```

## Technical Details

### RigidBody Configuration
```svelte
<RigidBody
  type="dynamic"
  enabledRotations={[false, true, false]}  <!-- Only Y-axis rotation enabled -->
  gravityScale={1}
>
  <Collider 
    shape="capsule" 
    args={[0.3, 0.8]}    <!-- radius, height -->
    friction={0.2}
    restitution={0}      <!-- No bouncing -->
  />
</RigidBody>
```

### Input Handling States
- **isMouseDown**: Tracks mouse button state for look controls
- **isDragging**: Tracks touch drag state for mobile
- **keyStates**: Object tracking all pressed keys
- **jumpKeyPressed**: Anti-fly protection for jump input

### Coordinate Systems
- **Local Movement**: Relative to player (forward/backward/strafe)
- **World Movement**: Transformed by player's Y-axis rotation
- **Camera Pitch**: Independent X-axis rotation (looking up/down)
- **Body Yaw**: Y-axis rotation applied to physics body

## Common Issues and Solutions

### Issue: Player Still Spins
**Cause**: Angular velocity not being locked every frame
**Solution**: Ensure `setAngvel({ x: 0, y: 0, z: 0 })` is called in every physics update

### Issue: Mouse Look Not Working
**Cause**: Angular velocity locking preventing mouse rotation
**Solution**: Use `setRotation()` for mouse look, not angular velocity

### Issue: Player Slides on Slopes
**Cause**: Low friction on capsule collider
**Solution**: Adjust friction value or implement slope angle limits

### Issue: Jittery Movement
**Cause**: Conflicting position/velocity updates
**Solution**: Use velocity for movement, position for rotation only

## Performance Considerations

### Frame Rate Impact
- Physics calculations run every frame
- Quaternion operations are relatively expensive
- Consider caching quaternions for frequently used rotations

### Mobile Optimization
- Touch sensitivity adjusted for mobile devices
- Separate handling for mobile controls area
- Performance monitoring for physics updates

## Testing Guidelines

### Movement Testing
1. **Straight Line Test**: Walk forward without mouse - should move straight
2. **Wall Test**: Walk into walls - should not spin or rotate
3. **Incline Test**: Walk on slopes - should maintain direction
4. **Mouse Test**: Look around while walking - should be smooth

### Debug Logging
```typescript
// Enable movement debugging
console.log('🎮 Movement Debug:', {
  input: movement,
  bodyRotation: { x: rotation.x, y: rotation.y, z: rotation.z, w: rotation.w },
  localMovement: { x: localMovement.x, y: localMovement.y, z: localMovement.z },
  finalVelocity: { x: localMovement.x, y: velocity.y, z: localMovement.z }
})
```

## Future Improvements

### Potential Enhancements
1. **Configurable Physics**: Expose friction, restitution as props
2. **Advanced Ground Detection**: Ray-casting for better slope handling
3. **Movement Modes**: Walk/run/crouch with different physics settings
4. **Collision Callbacks**: Custom handling for different surface types

### Code Organization
- Consider extracting physics logic to separate utility functions
- Implement movement state machine for different player states
- Add TypeScript interfaces for better type safety

## Legacy System Migration

This system replaced the legacy MovementComponent.ts which had these issues:
- Direct camera position updates conflicting with physics
- Coupling of movement and rotation logic
- No separation between input handling and physics application

The new system provides:
- Clean separation of movement (velocity) and rotation (position)
- Physics-aware collision handling
- Cross-platform input support
- Better performance and maintainability

---

**Last Updated**: January 2025  
**Authors**: Claude Code Assistant  
**Related Files**: 
- `src/threlte/components/Player.svelte`
- `src/threlte/Game.svelte`
- `src/game/GAME_DESIGN_DOCUMENT.md`