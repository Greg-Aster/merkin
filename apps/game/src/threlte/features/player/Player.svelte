<script lang="ts">
  import { T, useTask } from '@threlte/core';
  import { Collider, RigidBody, useRapier } from '@threlte/rapier';
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import { Euler, Group, PerspectiveCamera, Quaternion, Vector3 } from 'three';
  import { multiplayerStore, type PlayerState } from '../multiplayer/stores/multiplayerStore';
  import { uiStore } from '../../stores/uiStore';
  import { gameActions } from '../../stores/gameStateStore';
  import { PLAYER_GROUP } from '../../constants/physics';
  import { recordSystemTiming } from '../performance/stores/performanceStore';

  // --- Physics Constants ---
  const GRAVITY = 8;
  const characterControllerOffset = 0.1;
  const GAMEPAD_MOVE_DEADZONE = 0.18;
  const GAMEPAD_LOOK_DEADZONE = 0.12;
  const GAMEPAD_LOOK_SPEED = 2.2;
  
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
  let visualGroup: Group; // Visual group reference
  let cameraPivot: Group; // Camera pivot reference
  let camera: PerspectiveCamera;
  let fov = 60;
  let near = 0.1;
  let far = 2000;

  // --- Movement State ---
  const keyStates: { [key: string]: boolean } = {};
  let isGrounded = false;
  const playerVelocity = new Vector3();
  let characterController: any;

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
  let surfaceTouchId: number | null = null;
  let surfaceTouchStartTime = 0;
  let surfaceTouchStartX = 0;
  let surfaceTouchStartY = 0;
  let surfaceTouchLastX = 0;
  let surfaceTouchLastY = 0;
  let surfaceTouchMoved = false;
  let surfaceTouchForwardActive = false;
  let surfaceMoveHoldTimeout: number | null = null;
  let hasConnectedGamepad = false;
  let sendPlayerUpdateFn: ((playerState: PlayerState) => void) | null = null;
  let multiplayerServicePromise: Promise<void> | null = null;
  let networkSyncElapsed = 0;

  const tempAxisY = new Vector3(0, 1, 0);
  const tempDesiredTranslation = new Vector3();
  const tempHorizontalVelocity = new Vector3();
  const tempBodyPosition = new Vector3();
  const tempBodyRotation = new Quaternion();
  const tempDeltaRotation = new Quaternion();
  const nextTranslation = { x: 0, y: 0, z: 0 };
  const keyboardMovement = { x: 0, z: 0 };
  const gamepadState = {
    moveX: 0,
    moveZ: 0,
    lookX: 0,
    lookY: 0,
    jump: false,
    sprint: false,
  };
  const SURFACE_TAP_MOVE_THRESHOLD = 10;
  const SURFACE_HOLD_MOVE_THRESHOLD = 18;
  const SURFACE_FORWARD_HOLD_MS = 180;
  const SURFACE_LOOK_SENSITIVITY = 0.0015;

  $: if ($mobileInputStore) {
    mobileMovement = $mobileInputStore.movement;
    mobileLook = $mobileInputStore.look;
    dragToLook = $mobileInputStore.dragToLook;
    if ($mobileInputStore.actionPressed === 'jump') {
      mobileJumpPressed = true;
    }
  }

  $: if (!dragToLook && surfaceTouchId !== null) {
    resetSurfaceTouchState();
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

  function isCanvasTouchTarget(eventTarget: EventTarget | null): boolean {
    return eventTarget instanceof Element && !!eventTarget.closest('canvas');
  }

  function resetSurfaceTouchState() {
    if (surfaceMoveHoldTimeout !== null) {
      window.clearTimeout(surfaceMoveHoldTimeout);
      surfaceMoveHoldTimeout = null;
    }
    surfaceTouchId = null;
    surfaceTouchMoved = false;
    surfaceTouchForwardActive = false;
    mobileInputStore.update((state) => ({
      ...state,
      movement: { x: 0, z: 0 },
      isJoystickActive: false,
    }));
  }

  function handleTouchStart(event: TouchEvent) {
    if (!isMobile || !dragToLook || $uiStore.isInputFocused || surfaceTouchId !== null) return;
    if (!isCanvasTouchTarget(event.target)) return;
    event.preventDefault();

    const touch = event.changedTouches[0];
    if (!touch) return;

    surfaceTouchId = touch.identifier;
    surfaceTouchStartTime = performance.now();
    surfaceTouchStartX = touch.clientX;
    surfaceTouchStartY = touch.clientY;
    surfaceTouchLastX = touch.clientX;
    surfaceTouchLastY = touch.clientY;
    surfaceTouchMoved = false;
    surfaceTouchForwardActive = false;

    surfaceMoveHoldTimeout = window.setTimeout(() => {
      if (surfaceTouchId === touch.identifier && !surfaceTouchMoved) {
        surfaceTouchForwardActive = true;
        mobileInputStore.update((state) => ({
          ...state,
          movement: { x: 0, z: -1 },
          isJoystickActive: true,
        }));
      }
    }, SURFACE_FORWARD_HOLD_MS);
  }

  function handleTouchMove(event: TouchEvent) {
    if (!isMobile || !dragToLook || $uiStore.isInputFocused || surfaceTouchId === null) return;

    const touch = Array.from(event.changedTouches).find(({ identifier }) => identifier === surfaceTouchId);
    if (!touch) return;
    event.preventDefault();

    const totalDeltaX = touch.clientX - surfaceTouchStartX;
    const totalDeltaY = touch.clientY - surfaceTouchStartY;
    const movedDistance = Math.hypot(totalDeltaX, totalDeltaY);

    if (movedDistance > SURFACE_TAP_MOVE_THRESHOLD) {
      surfaceTouchMoved = true;
    }

    if (!surfaceTouchForwardActive && movedDistance > SURFACE_HOLD_MOVE_THRESHOLD && surfaceMoveHoldTimeout !== null) {
      window.clearTimeout(surfaceMoveHoldTimeout);
      surfaceMoveHoldTimeout = null;
    }

    const deltaX = touch.clientX - surfaceTouchLastX;
    const deltaY = touch.clientY - surfaceTouchLastY;
    accumulatedRotationX -= deltaX * SURFACE_LOOK_SENSITIVITY;
    accumulatedRotationY -= deltaY * SURFACE_LOOK_SENSITIVITY;
    surfaceTouchLastX = touch.clientX;
    surfaceTouchLastY = touch.clientY;
  }

  function handleTouchEnd(event: TouchEvent) {
    if (!isMobile || !dragToLook || surfaceTouchId === null) return;

    const touch = Array.from(event.changedTouches).find(({ identifier }) => identifier === surfaceTouchId);
    if (!touch) return;
    event.preventDefault();

    const touchDuration = performance.now() - surfaceTouchStartTime;
    const totalDeltaX = touch.clientX - surfaceTouchStartX;
    const totalDeltaY = touch.clientY - surfaceTouchStartY;
    const movedDistance = Math.hypot(totalDeltaX, totalDeltaY);
    const wasTap = !surfaceTouchForwardActive
      && touchDuration < SURFACE_FORWARD_HOLD_MS
      && movedDistance < SURFACE_TAP_MOVE_THRESHOLD;

    resetSurfaceTouchState();

    if (wasTap) {
      dispatch('interaction', { x: touch.clientX, y: touch.clientY, type: 'click' });
    }
  }

  function updateMovementFromKeys() {
    keyboardMovement.x = 0;
    keyboardMovement.z = 0;
    if (keyStates['KeyW'] || keyStates['ArrowUp'] || mobileMovement.z < -0.1) keyboardMovement.z -= 1;
    if (keyStates['KeyS'] || keyStates['ArrowDown'] || mobileMovement.z > 0.1) keyboardMovement.z += 1;
    if (keyStates['KeyA'] || keyStates['ArrowLeft'] || mobileMovement.x < -0.1) keyboardMovement.x -= 1;
    if (keyStates['KeyD'] || keyStates['ArrowRight'] || mobileMovement.x > 0.1) keyboardMovement.x += 1;
    return keyboardMovement;
  }

  function applyStickDeadzone(value: number, deadzone: number) {
    const magnitude = Math.abs(value);
    if (magnitude < deadzone) return 0;
    const normalized = (magnitude - deadzone) / (1 - deadzone);
    return Math.sign(value) * normalized;
  }

  function getPrimaryGamepad(): Gamepad | null {
    if (
      !hasConnectedGamepad ||
      typeof navigator === 'undefined' ||
      typeof navigator.getGamepads !== 'function'
    ) {
      return null;
    }

    for (const pad of navigator.getGamepads()) {
      if (pad) return pad;
    }

    return null;
  }

  function getGamepadInput() {
    const pad = getPrimaryGamepad();
    if (!pad) {
      gamepadState.moveX = 0;
      gamepadState.moveZ = 0;
      gamepadState.lookX = 0;
      gamepadState.lookY = 0;
      gamepadState.jump = false;
      gamepadState.sprint = false;
      return gamepadState;
    }

    gamepadState.moveX = applyStickDeadzone(pad.axes[0] ?? 0, GAMEPAD_MOVE_DEADZONE);
    gamepadState.moveZ = applyStickDeadzone(pad.axes[1] ?? 0, GAMEPAD_MOVE_DEADZONE);
    gamepadState.lookX = applyStickDeadzone(pad.axes[2] ?? 0, GAMEPAD_LOOK_DEADZONE);
    gamepadState.lookY = applyStickDeadzone(pad.axes[3] ?? 0, GAMEPAD_LOOK_DEADZONE);
    gamepadState.jump = Boolean(pad.buttons[0]?.pressed);
    gamepadState.sprint = Boolean(pad.buttons[5]?.pressed || pad.buttons[7]?.pressed);
    return gamepadState;
  }

  async function ensureMultiplayerService(): Promise<void> {
    if (sendPlayerUpdateFn) return;

    if (!multiplayerServicePromise) {
      multiplayerServicePromise = import('../multiplayer/services/MultiplayerService').then((module) => {
        sendPlayerUpdateFn = module.sendPlayerUpdate;
      });
    }

    await multiplayerServicePromise;
  }

  function handleGamepadConnected() {
    hasConnectedGamepad = true;
  }

  function handleGamepadDisconnected() {
    if (typeof navigator === 'undefined' || typeof navigator.getGamepads !== 'function') {
      hasConnectedGamepad = false;
      return;
    }

    hasConnectedGamepad = Array.from(navigator.getGamepads()).some(Boolean);
  }

  $: if ($multiplayerStore.isConnected && !sendPlayerUpdateFn) {
    void ensureMultiplayerService();
  }

  useTask((delta) => {
    if (!rigidBody || !characterController) return;
    const controllerStart = performance.now();
    const gamepadInput = getGamepadInput();

    // 1. Handle Rotation (Left/Right Mouse Look) - This directly affects the physics body
    if (isMobile && mobileLook && (mobileLook.x !== 0 || mobileLook.y !== 0)) {
      accumulatedRotationX = mobileLook.x * -0.00125;
      accumulatedRotationY = mobileLook.y * -0.00125;
    }
    if (gamepadInput.lookX !== 0 || gamepadInput.lookY !== 0) {
      accumulatedRotationX -= gamepadInput.lookX * GAMEPAD_LOOK_SPEED * delta;
      accumulatedRotationY -= gamepadInput.lookY * GAMEPAD_LOOK_SPEED * delta;
    }
    if (accumulatedRotationX !== 0) {
      const currentRotation = rigidBody.rotation();
      tempDeltaRotation.setFromAxisAngle(tempAxisY, accumulatedRotationX);
      tempBodyRotation.set(currentRotation.x, currentRotation.y, currentRotation.z, currentRotation.w);
      tempBodyRotation.multiply(tempDeltaRotation);
      rigidBody.setNextKinematicRotation(tempBodyRotation);
    }
    accumulatedRotationX = 0;

    // 2. Handle Vertical Movement (Gravity & Jump)
    playerVelocity.y -= GRAVITY * delta;
    const wantsToJump = keyStates['Space'] || mobileJumpPressed || gamepadInput.jump;
    if (wantsToJump && isGrounded) {
      playerVelocity.y = jumpForce;
    }
    mobileJumpPressed = false;

    // 3. Handle Horizontal Movement
    const input = updateMovementFromKeys();
    if (Math.abs(gamepadInput.moveX) > Math.abs(input.x)) input.x = gamepadInput.moveX;
    if (Math.abs(gamepadInput.moveZ) > Math.abs(input.z)) input.z = gamepadInput.moveZ;

    const moveSpeed = keyStates['ShiftLeft'] || keyStates['ShiftRight'] || gamepadInput.sprint ? speed * 2 : speed;
    tempHorizontalVelocity.set(input.x, 0, input.z);
    if (isMobile) tempHorizontalVelocity.set(mobileMovement.x, 0, mobileMovement.z);
    if (tempHorizontalVelocity.lengthSq() > 0) {
      const bodyRotation = rigidBody.rotation();
      tempHorizontalVelocity.normalize().multiplyScalar(moveSpeed);
      tempBodyRotation.set(bodyRotation.x, bodyRotation.y, bodyRotation.z, bodyRotation.w);
      tempHorizontalVelocity.applyQuaternion(tempBodyRotation);
    }

    // 4. Compute and Apply Movement via Character Controller
    tempDesiredTranslation.set(tempHorizontalVelocity.x, playerVelocity.y, tempHorizontalVelocity.z).multiplyScalar(delta);
    const collider = rigidBody.collider(0);
    // Exclude sensors so water doesn't block player movement
    characterController.computeColliderMovement(
      collider, 
      tempDesiredTranslation,
      rapier.rapier.QueryFilterFlags.EXCLUDE_SENSORS
    );
    const correctedMovement = characterController.computedMovement();
    const currentPos = rigidBody.translation();
    nextTranslation.x = currentPos.x + correctedMovement.x;
    nextTranslation.y = currentPos.y + correctedMovement.y;
    nextTranslation.z = currentPos.z + correctedMovement.z;
    rigidBody.setNextKinematicTranslation(nextTranslation);

    // 5. Update Ground State
    isGrounded = characterController.computedGrounded();
    if (isGrounded) {
      playerVelocity.y = 0;
    }

    // 6. Smoothly move the visual elements to the physics body's new position.
    // Use frame-rate independent exponential decay so camera speed is consistent at any FPS.
    const bodyPosition = rigidBody.translation();
    const bodyRotation = rigidBody.rotation();
    const smoothAlpha = 1 - Math.pow(1 - CAMERA_SMOOTH_SPEED, delta * 60);
    tempBodyPosition.set(bodyPosition.x, bodyPosition.y, bodyPosition.z);
    tempBodyRotation.set(bodyRotation.x, bodyRotation.y, bodyRotation.z, bodyRotation.w);
    visualGroup.position.lerp(tempBodyPosition, smoothAlpha);
    visualGroup.quaternion.slerp(tempBodyRotation, smoothAlpha);

    // 7. Handle Camera Pivot (Up/Down Look) - This now rotates the visual group, not the physics body
    cameraRotationX += accumulatedRotationY;
    cameraRotationX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, cameraRotationX));
    if (cameraPivot) {
      cameraPivot.quaternion.setFromEuler(new Euler(cameraRotationX, 0, 0));
    }
    accumulatedRotationY = 0;
    recordSystemTiming('playerController', performance.now() - controllerStart);

    networkSyncElapsed += delta * 1000;
    if (networkSyncElapsed >= 100) {
      networkSyncElapsed = 0;
      const currentPosition = rigidBody.translation();
      // Keep global player position store in sync (used by terrain/ocean systems)
      gameActions.updatePlayerPosition([currentPosition.x, currentPosition.y, currentPosition.z]);

      // Throttle multiplayer updates to ~10fps when connected
      if ($multiplayerStore.isConnected && sendPlayerUpdateFn) {
        sendPlayerUpdateFn({
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
    hasConnectedGamepad =
      typeof navigator !== 'undefined'
      && typeof navigator.getGamepads === 'function'
      && Array.from(navigator.getGamepads()).some(Boolean);
    characterController = rapier.world.createCharacterController(characterControllerOffset);
    characterController.setApplyImpulsesToDynamicBodies(true);
    characterController.enableAutostep(0.35, 0.5, true);
    characterController.setMaxSlopeClimbAngle(0.87);
    characterController.enableSnapToGround(1.0);
    window.addEventListener('gamepadconnected', handleGamepadConnected);
    window.addEventListener('gamepaddisconnected', handleGamepadDisconnected);
  });

  onDestroy(() => {
    window.removeEventListener('gamepadconnected', handleGamepadConnected);
    window.removeEventListener('gamepaddisconnected', handleGamepadDisconnected);
    if (surfaceMoveHoldTimeout !== null) {
      window.clearTimeout(surfaceMoveHoldTimeout);
    }
    characterController?.free?.();
  });
</script>

<svelte:window
  on:keydown={handleKeydown}
  on:keyup={handleKeyup}
  on:mousemove={handleMouseMove}
  on:mousedown={handleMouseDown}
  on:mouseup={handleMouseUp}
  on:touchstart={handleTouchStart}
  on:touchmove={handleTouchMove}
  on:touchend={handleTouchEnd}
  on:touchcancel={handleTouchEnd}
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
