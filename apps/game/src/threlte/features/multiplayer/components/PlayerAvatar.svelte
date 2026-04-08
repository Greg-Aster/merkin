<!-- src/threlte/components/PlayerAvatar.svelte -->
<script lang="ts">
  import { T, useTask } from '@threlte/core';
  import StarSprite from '../../../components/StarSprite.svelte';
  import * as THREE from 'three';

  // This prop allows the parent component to set the position.
  export let position: [number, number, number] = [0, 0, 0];

  // Player avatar appearance is hardcoded for consistency.
  const playerColor = 0x00bfff; // Bright blue
  const playerSize = 1.15;
  const baseIntensity = 20.0;
  const pulseSpeed = 2.0;
  const pulseRange = 0.6; // How much the intensity varies

  // --- Wandering Motion ---
  const wanderSpeed = 0.6;
  const wanderRadius = { x: 0.15, y: 0.1, z: 0.15 };
  const animatedOffset = new THREE.Vector3(0, 0, 0);

  let pointLight: THREE.PointLight;
  let lightIntensity = baseIntensity;

  // Animate the light's intensity and the avatar's position.
  useTask(() => {
    const time = performance.now() * 0.001;

    // Animate light intensity for a pulsing effect.
    const pulse = (Math.sin(time * pulseSpeed) + 1) / 2; // Varies between 0 and 1
    lightIntensity = baseIntensity * (1 - pulseRange + pulse * pulseRange);

    // Animate position for a gentle wandering effect.
    const wanderTime = time * wanderSpeed;
    animatedOffset.x = Math.cos(wanderTime) * wanderRadius.x;
    animatedOffset.y = Math.sin(wanderTime * 1.2) * wanderRadius.y;
    animatedOffset.z = Math.sin(wanderTime * 0.8) * wanderRadius.z;
  });
</script>

<T.Group
  position={[
    position[0] + animatedOffset.x,
    position[1] + animatedOffset.y,
    position[2] + animatedOffset.z
  ]}
>
  <!-- The visual sprite for the firefly -->
  <StarSprite
    color={playerColor}
    size={playerSize}
    intensity={baseIntensity}
    twinkleSpeed={pulseSpeed}
    enableTwinkle={true}
  />

  <!-- The integrated light source for the firefly -->
  <T.PointLight
    bind:ref={pointLight}
    color={playerColor}
    intensity={lightIntensity}
    distance={20}
    decay={2}
    castShadow={false}
  />
</T.Group>
