<!-- src/threlte/components/PlayerAvatar.svelte -->
<script lang="ts">
  import { T, useTask } from '@threlte/core';
  import StarSprite from '../../../components/StarSprite.svelte';
  import * as THREE from 'three';

  // This prop allows the parent component to set the position.
  export let position: [number, number, number] = [0, 0, 0];
  export let chargeAmount = 0;
  export let flashAmount = 0;

  // Player avatar appearance is hardcoded for consistency.
  const playerColor = 0x00bfff; // Bright blue
  const playerSize = 1.15;
  const baseSpriteIntensity = 20.0;
  const baseLightIntensity = 42.0;
  const lightDistance = 34;
  const lightDecay = 1.2;
  const pulseSpeed = 2.0;
  const pulseRange = 0.45; // How much the intensity varies

  // --- Wandering Motion ---
  const wanderSpeed = 0.6;
  const wanderRadius = { x: 0.15, y: 0.1, z: 0.15 };
  const animatedOffset = new THREE.Vector3(0, 0, 0);
  const baseLightColor = new THREE.Color(playerColor);
  const targetChargeColor = new THREE.Color('#f3fdff');
  const currentLightColor = new THREE.Color(playerColor);

  let pointLight: THREE.PointLight;
  let lightIntensity = baseLightIntensity;
  let spriteIntensity = baseSpriteIntensity;
  let spriteSize = playerSize;
  let chargeCoreIntensity = 0;
  let chargeCoreSize = playerSize * 0.6;

  // Animate the light's intensity and the avatar's position.
  useTask(() => {
    const time = performance.now() * 0.001;

    // Animate light intensity for a pulsing effect.
    const pulse = (Math.sin(time * pulseSpeed) + 1) / 2; // Varies between 0 and 1
    const pulseFactor = 1 - pulseRange + pulse * pulseRange;
    const chargeBoost = 1 + chargeAmount * 2.6;
    const flashBoost = 1 + flashAmount * 2.2;
    const lightening = Math.min(1, chargeAmount * 0.72 + flashAmount * 0.95);

    lightIntensity = baseLightIntensity * pulseFactor * chargeBoost * flashBoost;
    spriteIntensity = baseSpriteIntensity * (1 + chargeAmount * 1.7 + flashAmount * 1.25);
    spriteSize = playerSize * (1 + chargeAmount * 0.18 + flashAmount * 0.08);
    chargeCoreIntensity = 4 + lightening * 18;
    chargeCoreSize = playerSize * (0.52 + lightening * 0.16);
    currentLightColor.copy(baseLightColor).lerp(targetChargeColor, lightening);

    if (pointLight) {
      pointLight.color.copy(currentLightColor);
    }

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
    size={spriteSize}
    intensity={spriteIntensity}
    twinkleSpeed={pulseSpeed}
    enableTwinkle={true}
  />

  <StarSprite
    color="#ffffff"
    size={chargeCoreSize}
    intensity={chargeCoreIntensity}
    twinkleSpeed={pulseSpeed * 1.35}
    enableTwinkle={true}
    opacity={Math.min(1, chargeAmount * 0.75 + flashAmount * 0.95)}
  />

  <!-- The integrated light source for the firefly -->
  <T.PointLight
    bind:ref={pointLight}
    color={currentLightColor}
    intensity={lightIntensity}
    distance={lightDistance}
    decay={lightDecay}
    castShadow={false}
  />
</T.Group>
