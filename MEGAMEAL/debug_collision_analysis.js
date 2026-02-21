/**
 * Collision System Analysis
 * Run this in browser console to debug player-terrain collision issues
 */

function analyzeCollisionSystem() {
    console.group('🔍 Player Collision System Analysis');
    
    // 1. Check terrain store state
    console.group('📊 Terrain Store State');
    try {
        // Access the Svelte store (this will vary based on how stores are exposed)
        console.log('Terrain ready:', window.__TERRAIN_DEBUG || 'Store not accessible from console');
        console.log('Height data available:', 'Check in Svelte devtools');
    } catch (e) {
        console.warn('Cannot access terrain store from console:', e.message);
    }
    console.groupEnd();
    
    // 2. Check Rapier world state
    console.group('⚡ Rapier Physics World');
    try {
        // Try to access the Rapier world if exposed globally
        if (window.RAPIER && window.RAPIER_WORLD) {
            const world = window.RAPIER_WORLD;
            console.log('Rapier world exists:', !!world);
            console.log('Number of colliders:', world.colliders.len());
            console.log('Number of rigid bodies:', world.bodies.len());
            
            // Log all colliders
            world.colliders.forEach((collider, handle) => {
                const parent = collider.parent();
                const userData = parent?.userData;
                console.log(`Collider ${handle}:`, {
                    shape: collider.shape.type,
                    isPlayer: userData?.isPlayer,
                    isOceanSensor: userData?.isOceanSensor,
                    position: collider.translation(),
                });
            });
        } else {
            console.warn('Rapier world not accessible globally');
        }
    } catch (e) {
        console.warn('Error accessing Rapier world:', e.message);
    }
    console.groupEnd();
    
    // 3. Check heightfield collider specifics
    console.group('🗻 Heightfield Collider Analysis');
    console.log('Expected heightfield properties:');
    console.log('- Shape: "heightfield"');
    console.log('- Rotation: [-π/2, 0, 0] (rotated to match world coordinates)');
    console.log('- Position: [-worldSize/2, 0, -worldSize/2] (centered)');
    console.log('- Args: [resolution-1, resolution-1, heightData, {x: worldSize, y: 1.0, z: worldSize}]');
    console.groupEnd();
    
    // 4. Character controller analysis
    console.group('🎮 Character Controller Settings');
    console.log('Expected settings:');
    console.log('- Type: KinematicCharacterController');
    console.log('- Autostep enabled: max height 0.5, min width 0.2');
    console.log('- Snap to ground enabled: distance 1.0');
    console.log('- Apply impulses to dynamic bodies: true');
    console.log('- Offset: 0.01');
    console.groupEnd();
    
    // 5. Collision filtering analysis
    console.group('🔍 Collision Filtering');
    console.log('Player collision filter should:');
    console.log('- Ignore ocean sensors (isOceanSensor: true)');
    console.log('- Collide with terrain heightfield');
    console.log('- Collide with static environment objects');
    console.groupEnd();
    
    // 6. Common issues checklist
    console.group('⚠️ Common Issues Checklist');
    console.log('1. Heightfield collider not created - check terrain initialization');
    console.log('2. Heightfield positioned incorrectly - should be centered at world origin');
    console.log('3. Character controller not snapping to terrain - check snap distance');
    console.log('4. Collision filtering preventing interaction - check predicate function');
    console.log('5. Terrain position offset - HybridObservatory uses [0, -0.40, 0] group position');
    console.log('6. Height data empty or corrupted - check heightmap loading');
    console.log('7. World size mismatch - manifest shows 500x500 world');
    console.groupEnd();
    
    console.groupEnd();
    
    return {
        recommendations: [
            'Add console.log to TerrainCollider.svelte to verify heightfield creation',
            'Add console.log to Player.svelte character controller setup',
            'Check browser network tab for failed heightmap loading',
            'Verify terrain group positioning in HybridObservatory matches collision position'
        ]
    };
}

// Run the analysis
analyzeCollisionSystem();