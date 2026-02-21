<script lang="ts">
  import { T, useTask } from '@threlte/core';
  import { Collider, RigidBody } from '@threlte/rapier';
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import * as RAPIER from '@dimforge/rapier3d-compat';
  import * as THREE from 'three';
  import { useRapier } from '@threlte/rapier';
  import { multiplayerStore } from '../multiplayer';
  import { sendPlayerUpdate } from '../multiplayer';
  import { PlayerAvatar } from '../multiplayer';
  import { uiStore } from '../../stores/uiStore';
  import { gameActions } from '../../stores/gameStateStore';
  import { PLAYER_GROUP } from '../../constants/physics';

  // --- Physics Constants ---
  const GRAVITY = 8;
  const characterControllerOffset = 0.1;
  
  // --- Visual Constants ---
  const CAMERA_SMOOTH_SPEED = 0.2; // How quickly visuals catch up to physics

  const dispatch = createEventDispatcher();
  const rapier = useRapier();

  // --- Props ---
  export let position: [number, number, number] = [0, 10, 0];
  export let speed = 5;
  export let jumpForce = 10;
  export let mouseSensitivity = 0.002;

  // --- Player State ---
  let rigidBody: any; // Physics body reference
  let visualGroup: THREE.Group; // Visual group reference
  let cameraPivot: THREE.Group; // Camera pivot reference
  let camera: THREE.PerspectiveCamera;
  let fov = 60;
  let near = 0.1;
  let far = 2000;

  // --- Movement State ---
  const keyStates: { [key: string]: boolean } = {};
  let isGrounded = false;
  const playerVelocity = new THREE.Vector3();
  let characterController: RAPIER.KinematicCharacterController;

  // --- Look/Camera State ---
  let isMouseDown = false;
  let lastMouseX = 0;
  let lastMouseY = 0;
  let cameraRotationX = 0;
  let accumulatedRotationX = 0;
  let accumulatedRotationY = 0;

  // --- Mobile Input ---
  import { mobileInputStore } from './mobileInputStore';
  let mobileMovement = { x: 0, z: 0 };
  let mobileLook = { x: 0, y: 0 };
  let mobileJumpPressed = false;
  let isMobile = false;
  let dragToLook = false;

  $: if ($mobileInputStore) {
    mobileMovement = $mobileInputStore.movement;
    mobileLook = $mobileInputStore.look;
    dragToLook = $mobileInputStore.dragToLook;
    if ($mobileInputStore.actionPressed === 'jump') {
      mobileJumpPressed = true;
    }
  }

  // --- Input Handlers ---
  function handleKeydown(event: KeyboardEvent) {
    if ($uiStore.isInputFocused) return;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space'].includes(event.code)) {
      event.preventDefault();
    }
    keyStates[event.code] = true;
  }

  function handleKeyup(event: KeyboardEvent) {
    if ($uiStore.isInputFocused) return;
    keyStates[event.code] = false;
  }

  function handleMouseDown(event: MouseEvent) {
    isMouseDown = true;
    lastMouseX = event.clientX;
    lastMouseY = event.clientY;
    dispatch('lock');
  }

  function handleMouseUp(event: MouseEvent) {
    const wasMouseDown = isMouseDown;
    isMouseDown = false;
    dispatch('unlock');
    const deltaX = Math.abs(event.clientX - lastMouseX);
    const deltaY = Math.abs(event.clientY - lastMouseY);
    if (wasMouseDown && deltaX < 5 && deltaY < 5) {
      dispatch('interaction', { x: event.clientX, y: event.clientY, type: 'click' });
    }
  }

  function handleMouseMove(event: MouseEvent) {
    if ($uiStore.isInputFocused) return;
    if (!isMouseDown) return;
    const deltaX = event.clientX - lastMouseX;
    const deltaY = event.clientY - lastMouseY;
    accumulatedRotationX -= deltaX * mouseSensitivity;
    accumulatedRotationY -= deltaY * mouseSensitivity;
    lastMouseX = event.clientX;
    lastMouseY = event.clientY;
  }

  function updateMovementFromKeys() {
    const movement = { x: 0, z: 0 };
    if (keyStates['KeyW'] || keyStates['ArrowUp'] || mobileMovement.z < -0.1) movement.z -= 1;
    if (keyStates['KeyS'] || keyStates['ArrowDown'] || mobileMovement.z > 0.1) movement.z += 1;
    if (keyStates['KeyA'] || keyStates['ArrowLeft'] || mobileMovement.x < -0.1) movement.x -= 1;
    if (keyStates['KeyD'] || keyStates['ArrowRight'] || mobileMovement.x > 0.1) movement.x += 1;
    return movement;
  }

  // --- Main Game Loop ---
  // This now handles ONLY the physics simulation. Visuals are smoothed separately.
  useTask((delta) => {
    if (!rigidBody || !characterController) return;

    // 1. Handle Rotation (Left/Right Mouse Look) - This directly affects the physics body
    if (isMobile && mobileLook && (mobileLook.x !== 0 || mobileLook.y !== 0)) {
      accumulatedRotationX = mobileLook.x * -0.00125;
      accumulatedRotationY = mobileLook.y * -0.00125;
    }
    if (accumulatedRotationX !== 0) {
      const currentRotation = rigidBody.rotation();
      const deltaRotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), accumulatedRotationX);
      const newRotation = new THREE.Quaternion(currentRotation.x, currentRotation.y, currentRotation.z, currentRotation.w).multiply(deltaRotation);
      rigidBody.setNextKinematicRotation(newRotation);
    }
    accumulatedRotationX = 0;

    // 2. Handle Vertical Movement (Gravity & Jump)
    playerVelocity.y -= GRAVITY * delta;
    const wantsToJump = keyStates['Space'] || mobileJumpPressed;
    if (wantsToJump && isGrounded) {
      playerVelocity.y = jumpForce;
    }
    mobileJumpPressed = false;

    // 3. Handle Horizontal Movement
    const input = updateMovementFromKeys();
    const moveSpeed = keyStates['ShiftLeft'] || keyStates['ShiftRight'] ? speed * 2 : speed;
    const horizontalVelocity = new THREE.Vector3(input.x, 0, input.z);
    if (isMobile) horizontalVelocity.set(mobileMovement.x, 0, mobileMovement.z);
    if (horizontalVelocity.lengthSq() > 0) {
      const bodyRotation = rigidBody.rotation();
      horizontalVelocity.normalize().multiplyScalar(moveSpeed);
      horizontalVelocity.applyQuaternion(new THREE.Quaternion(bodyRotation.x, bodyRotation.y, bodyRotation.z, bodyRotation.w));
    }

    // 4. Compute and Apply Movement via Character Controller
    const desiredTranslation = new THREE.Vector3(horizontalVelocity.x, playerVelocity.y, horizontalVelocity.z).multiplyScalar(delta);
    const collider = rigidBody.collider(0);
    // Exclude sensors so water doesn't block player movement
    characterController.computeColliderMovement(
      collider, 
      desiredTranslation, 
      RAPIER.QueryFilterFlags.EXCLUDE_SENSORS
    );
    const correctedMovement = characterController.computedMovement();
    const currentPos = rigidBody.translation();
    const newPos = {
      x: currentPos.x + correctedMovement.x,
      y: currentPos.y + correctedMovement.y,
      z: currentPos.z + correctedMovement.z
    };
    rigidBody.setNextKinematicTranslation(newPos);

    // 5. Update Ground State
    isGrounded = characterController.computedGrounded();
    if (isGrounded) {
      playerVelocity.y = 0;
    }

    // 6. NEW: Smoothly move the visual elements to the physics body's new position
    const bodyPosition = rigidBody.translation();
    const bodyRotation = rigidBody.rotation();
    visualGroup.position.lerp(new THREE.Vector3(bodyPosition.x, bodyPosition.y, bodyPosition.z), CAMERA_SMOOTH_SPEED);
    visualGroup.quaternion.slerp(new THREE.Quaternion(bodyRotation.x, bodyRotation.y, bodyRotation.z, bodyRotation.w), CAMERA_SMOOTH_SPEED);

    // 7. Handle Camera Pivot (Up/Down Look) - This now rotates the visual group, not the physics body
    cameraRotationX += accumulatedRotationY;
    cameraRotationX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, cameraRotationX));
    if (cameraPivot) {
      cameraPivot.quaternion.setFromEuler(new THREE.Euler(cameraRotationX, 0, 0));
    }
    accumulatedRotationY = 0;

  });

  // --- Multiplayer Update (No changes needed) ---
  let lastUpdateTime = 0;
  const updateInterval = 100;
  useTask(() => {
    const now = performance.now();
    if (now - lastUpdateTime > updateInterval && rigidBody) {
      lastUpdateTime = now;
      const currentPosition = rigidBody.translation();
      // Keep global player position store in sync (used by terrain/ocean systems)
      gameActions.updatePlayerPosition([currentPosition.x, currentPosition.y, currentPosition.z]);

      // Throttle multiplayer updates to ~10fps when connected
      if ($multiplayerStore.isConnected) {
        sendPlayerUpdate({
          position: [currentPosition.x, currentPosition.y, currentPosition.z],
        });
      }
    }
  });

  // --- Component API & Lifecycle ---
  export function spawnAt(x: number, y: number, z: number) {
    if (!rigidBody) return;
    const pos = { x, y, z };
    rigidBody.setTranslation(pos, true);
    playerVelocity.set(0, 0, 0);
    if (visualGroup) {
      visualGroup.position.set(x, y, z); // Instantly move visual group on spawn
    }
  }

  onMount(() => {
    isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    characterController = rapier.world.createCharacterController(characterControllerOffset);
    characterController.setApplyImpulsesToDynamicBodies(true);
    characterController.enableAutostep(0.35, 0.5, true);
    characterController.setMaxSlopeClimbAngle(0.87);
    characterController.enableSnapToGround(1.0);
  });
</script>

<svelte:window
  on:keydown={handleKeydown}
  on:keyup={handleKeyup}
  on:mousemove={handleMouseMove}
  on:mousedown={handleMouseDown}
  on:mouseup={handleMouseUp}
/>

<!-- 
  This is the "headless" physics body. It is invisible and contains only the collider.
  Its position will snap directly to the terrain.
-->
<RigidBody
  bind:rigidBody
  type="kinematicPosition"
  enabledRotations={[false, true, false]}
  userData={{ isPlayer: true, type: 'player' }}
>
  <Collider
    shape="capsule"
    args={[0.9, 0.45]}
    collisionGroups={PLAYER_GROUP}
  />
</RigidBody>

<!-- 
  This is the "visual" group. It contains the player's avatar and camera.
  Its position and rotation will be smoothly interpolated to follow the physics body,
  hiding any jitter from the player's view.
-->
<T.Group bind:ref={visualGroup} position={position}>
  <PlayerAvatar position={[0, 0, 0]} />
  <T.Group bind:ref={cameraPivot}>
    <T.PerspectiveCamera
      makeDefault
      bind:ref={camera}
      {fov}
      {near}
      {far}
      position={[0, 1.6, 0]}
    />
  </T.Group>
</T.Group>
