<script lang="ts">
  import { T, useTask } from '@threlte/core';
  import { Collider, RigidBody, useRapier } from '@threlte/rapier';
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import * as THREE from 'three';
  import { Euler, Group, PerspectiveCamera, Quaternion, Vector3 } from 'three';
  import { multiplayerStore, type PlayerState } from '../multiplayer/stores/multiplayerStore';
  import PlayerAvatar from '../multiplayer/components/PlayerAvatar.svelte';
  import GroundShockwave from './GroundShockwave.svelte';
  import {
    uiStore,
    isSoundEnabled,
    masterVolumeSetting,
    sfxVolumeSetting,
  } from '../../stores/uiStore';
  import { gameActions } from '../../stores/gameStateStore';
  import { PLAYER_GROUP } from '../../constants/physics';
  import {
    frameTimeStore,
    qualitySettingsStore,
    recordSystemTiming,
  } from '../performance/stores/performanceStore';

  // --- Physics Constants ---
  const GRAVITY = 8;
  const characterControllerOffset = 0.1;
  const GAMEPAD_MOVE_DEADZONE = 0.18;
  const GAMEPAD_LOOK_DEADZONE = 0.12;
  const GAMEPAD_LOOK_SPEED = 2.2;
  const PLAYER_CAPSULE_HALF_HEIGHT = 0.9;
  const PLAYER_CAPSULE_RADIUS = 0.45;
  const PLAYER_SPAWN_RAY_HEIGHT = 24;
  const PLAYER_SPAWN_RAY_DISTANCE = 120;
  const PLAYER_SPAWN_STABILIZE_DELAYS_MS = [120, 260];
  
  // --- Visual Constants ---
  const CAMERA_SMOOTH_SPEED = 0.2; // How quickly visuals catch up to physics
  const LIGHT_CHARGE_MAX_TIME = 1.6;
  const LIGHT_BURST_THRESHOLD = 0.62;
  const LIGHT_FLASH_DECAY = 1.8;
  const LIGHT_FLASH_TAP_BOOST = 0.55;
  const LIGHT_SHOCKWAVE_SPEED = 26;
  const LIGHT_SHOCKWAVE_RADIUS_BASE = 12;
  const LIGHT_SHOCKWAVE_RADIUS_BONUS = 28;
  const LIGHT_SHOCKWAVE_DURATION = 0.9;
  const LIGHT_SHOCKWAVE_COLOR = '#7ed8ff';
  const LIGHT_SHOCKWAVE_FIRE_COLOR = '#ff9b4d';
  const LIGHT_SHOCKWAVE_CORE_COLOR = '#fff2cf';
  const SHOCKWAVE_FALLBACK_TRIGGER_MS = 24;
  const SHOCKWAVE_FALLBACK_RECOVER_MS = 18;
  const SHOCKWAVE_FALLBACK_HOLD_MS = 2500;

  const dispatch = createEventDispatcher();
  const rapier = useRapier();

  // --- Props ---
  export let position: [number, number, number] = [0, 10, 0];
  export let speed = 5;
  export let jumpForce = 10;
  export let lightIntensityScale = 60;
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
  let mobilePulsePressed = false;
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
  let spawnStabilizeTimeoutIds: number[] = [];
  let lastReportedSpawnReady = false;

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
    pulse: false,
  };
  let lightChargeAmount = 0;
  let lightFlashAmount = 0;
  let wasLightCharging = false;
  let shockwaveId = 0;
  let shockwaves: Array<{
    id: number;
    position: [number, number, number];
    radius: number;
    bandWidth: number;
    opacity: number;
    electricOpacity: number;
    fireOpacity: number;
    coreOpacity: number;
    progress: number;
    maxScale: number;
    strength: number;
    electricColor: string;
    fireColor: string;
    lightColor: string;
    lightDistance: number;
    lightIntensity: number;
  }> = [];
  let chargeAudioContext: AudioContext | null = null;
  let playerAudioOutputGain: GainNode | null = null;
  let chargeMasterGain: GainNode | null = null;
  let chargeOscillator: OscillatorNode | null = null;
  let chargeHarmonicOscillator: OscillatorNode | null = null;
  let chargeFilterNode: BiquadFilterNode | null = null;
  let chargeLfoOscillator: OscillatorNode | null = null;
  let chargeAudioActive = false;
  let chargeAudioPending = false;
  let chargeAudioDesired = false;
  let chargeAudioRequestId = 0;
  let smoothedFrameMs = 16.67;
  let shockwaveFallbackHoldMs = 0;
  let shockwaveContourEnabled = true;
  const shockwaveElectricBaseColor = new THREE.Color(LIGHT_SHOCKWAVE_COLOR);
  const shockwaveFireBaseColor = new THREE.Color(LIGHT_SHOCKWAVE_FIRE_COLOR);
  const shockwaveCoreBaseColor = new THREE.Color(LIGHT_SHOCKWAVE_CORE_COLOR);
  const shockwaveColorScratch = new THREE.Color();
  const SURFACE_TAP_MOVE_THRESHOLD = 10;
  const SURFACE_HOLD_MOVE_THRESHOLD = 18;
  const SURFACE_FORWARD_HOLD_MS = 180;
  const SURFACE_LOOK_SENSITIVITY = 0.0015;

  $: if ($mobileInputStore) {
    mobileMovement = $mobileInputStore.movement;
    mobileLook = $mobileInputStore.look;
    dragToLook = $mobileInputStore.dragToLook;
    mobilePulsePressed = $mobileInputStore.actionPressed === 'pulse';
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
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'KeyF'].includes(event.code)) {
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

  function handleWindowBlur() {
    keyStates.KeyF = false;
    isMouseDown = false;
  }

  $: if ($uiStore.isInputFocused && keyStates.KeyF) {
    keyStates.KeyF = false;
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
      gamepadState.pulse = false;
      return gamepadState;
    }

    gamepadState.moveX = applyStickDeadzone(pad.axes[0] ?? 0, GAMEPAD_MOVE_DEADZONE);
    gamepadState.moveZ = applyStickDeadzone(pad.axes[1] ?? 0, GAMEPAD_MOVE_DEADZONE);
    gamepadState.lookX = applyStickDeadzone(pad.axes[2] ?? 0, GAMEPAD_LOOK_DEADZONE);
    gamepadState.lookY = applyStickDeadzone(pad.axes[3] ?? 0, GAMEPAD_LOOK_DEADZONE);
    gamepadState.jump = Boolean(pad.buttons[0]?.pressed);
    gamepadState.sprint = Boolean(pad.buttons[5]?.pressed || pad.buttons[7]?.pressed);
    gamepadState.pulse = Boolean(pad.buttons[1]?.pressed || pad.buttons[6]?.pressed);
    return gamepadState;
  }

  function getLightChargeInputActive(gamepadInput: typeof gamepadState) {
    return keyStates['KeyF'] || mobilePulsePressed || gamepadInput.pulse;
  }

  function resolvePlayerSfxVolume(baseVolume: number) {
    return Math.min(1, Math.max(0, $masterVolumeSetting * $sfxVolumeSetting * baseVolume));
  }

  function mixShockwaveColor(from: THREE.Color, to: THREE.Color, amount: number) {
    return `#${shockwaveColorScratch.copy(from).lerp(to, Math.min(1, Math.max(0, amount))).getHexString()}`;
  }

  async function ensureChargeAudioContext() {
    if (typeof window === 'undefined') return null;

    const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return null;

    if (!chargeAudioContext) {
      chargeAudioContext = new AudioContextCtor();
      playerAudioOutputGain = chargeAudioContext.createGain();
      playerAudioOutputGain.gain.value = 1;
      playerAudioOutputGain.connect(chargeAudioContext.destination);
    }

    if (chargeAudioContext.state === 'suspended') {
      try {
        await chargeAudioContext.resume();
      } catch (error) {
        console.warn('Player charge audio resume failed:', error);
        return null;
      }
    }

    return chargeAudioContext;
  }

  async function beginChargeAudio() {
    if (chargeAudioActive || chargeAudioPending || !$isSoundEnabled) return;

    chargeAudioDesired = true;
    chargeAudioPending = true;
    const requestId = ++chargeAudioRequestId;

    try {
      const context = await ensureChargeAudioContext();
      if (
        !context
        || !playerAudioOutputGain
        || !$isSoundEnabled
        || !chargeAudioDesired
        || requestId !== chargeAudioRequestId
      ) {
        return;
      }

      const masterGain = context.createGain();
      const chargeGain = context.createGain();
      const filter = context.createBiquadFilter();
      const primaryOscillator = context.createOscillator();
      const harmonicOscillator = context.createOscillator();
      const lfoOscillator = context.createOscillator();
      const lfoGain = context.createGain();

      filter.type = 'bandpass';
      filter.frequency.value = 880;
      filter.Q.value = 1.1;

      primaryOscillator.type = 'triangle';
      primaryOscillator.frequency.value = 220;
      harmonicOscillator.type = 'sine';
      harmonicOscillator.frequency.value = 330;

      lfoOscillator.type = 'sine';
      lfoOscillator.frequency.value = 5.5;
      lfoGain.gain.value = 9;

      masterGain.gain.value = 0.0001;
      chargeGain.gain.value = 0.75;

      primaryOscillator.connect(chargeGain);
      harmonicOscillator.connect(chargeGain);
      chargeGain.connect(filter);
      filter.connect(masterGain);
      masterGain.connect(playerAudioOutputGain);

      lfoOscillator.connect(lfoGain);
      lfoGain.connect(primaryOscillator.frequency);

      const now = context.currentTime;
      masterGain.gain.cancelScheduledValues(now);
      masterGain.gain.setValueAtTime(0.0001, now);
      masterGain.gain.exponentialRampToValueAtTime(resolvePlayerSfxVolume(0.1), now + 0.08);

      primaryOscillator.start(now);
      harmonicOscillator.start(now);
      lfoOscillator.start(now);

      if (!chargeAudioDesired || requestId !== chargeAudioRequestId) {
        masterGain.gain.cancelScheduledValues(now);
        masterGain.gain.setValueAtTime(masterGain.gain.value, now);
        masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
        primaryOscillator.stop(now + 0.06);
        harmonicOscillator.stop(now + 0.06);
        lfoOscillator.stop(now + 0.06);
        return;
      }

      chargeOscillator = primaryOscillator;
      chargeHarmonicOscillator = harmonicOscillator;
      chargeFilterNode = filter;
      chargeMasterGain = masterGain;
      chargeLfoOscillator = lfoOscillator;
      chargeAudioActive = true;
    } finally {
      if (requestId === chargeAudioRequestId) {
        chargeAudioPending = false;
      }
    }
  }

  function stopChargeAudio() {
    chargeAudioDesired = false;
    chargeAudioPending = false;
    chargeAudioRequestId += 1;

    const localContext = chargeAudioContext;
    const localMasterGain = chargeMasterGain;
    const localPrimaryOscillator = chargeOscillator;
    const localHarmonicOscillator = chargeHarmonicOscillator;
    const localLfoOscillator = chargeLfoOscillator;
    const localFilter = chargeFilterNode;

    chargeOscillator = null;
    chargeHarmonicOscillator = null;
    chargeFilterNode = null;
    chargeMasterGain = null;
    chargeLfoOscillator = null;
    chargeAudioActive = false;

    if (!localContext) return;

    const now = localContext.currentTime;
    const stopAt = now + 0.12;

    try {
      localMasterGain?.gain.cancelScheduledValues(now);
      localMasterGain?.gain.setValueAtTime(Math.max(localMasterGain.gain.value, 0.0001), now);
      localMasterGain?.gain.exponentialRampToValueAtTime(0.0001, stopAt);
    } catch (error) {
      console.warn('Player charge audio envelope stop failed:', error);
    }

    try {
      localPrimaryOscillator?.stop(stopAt);
      localHarmonicOscillator?.stop(stopAt);
      localLfoOscillator?.stop(stopAt);
    } catch (error) {
      console.warn('Player charge oscillator stop failed:', error);
    }

    window.setTimeout(() => {
      try {
        localPrimaryOscillator?.disconnect();
        localHarmonicOscillator?.disconnect();
        localLfoOscillator?.disconnect();
        localFilter?.disconnect();
        localMasterGain?.disconnect();
      } catch {
      }
    }, 180);
  }

  async function playReleaseAudio(strength: number) {
    if (!$isSoundEnabled) return;

    const context = await ensureChargeAudioContext();
    if (!context || !playerAudioOutputGain) return;

    const envelope = context.createGain();
    const filter = context.createBiquadFilter();
    const primaryOscillator = context.createOscillator();
    const harmonicOscillator = context.createOscillator();

    filter.type = 'lowpass';
    filter.frequency.value = 2400 + strength * 1800;
    filter.Q.value = 0.8;

    primaryOscillator.type = strength >= LIGHT_BURST_THRESHOLD ? 'sawtooth' : 'triangle';
    harmonicOscillator.type = 'sine';

    const startFrequency = 420 + strength * 340;
    const endFrequency = 120 + strength * 90;
    primaryOscillator.frequency.value = startFrequency;
    harmonicOscillator.frequency.value = startFrequency * 1.5;

    primaryOscillator.connect(filter);
    harmonicOscillator.connect(filter);
    filter.connect(envelope);
    envelope.connect(playerAudioOutputGain);

    const now = context.currentTime;
    const duration = 0.24 + strength * 0.22;
    const peakVolume = resolvePlayerSfxVolume(0.16 + strength * 0.18);

    envelope.gain.setValueAtTime(0.0001, now);
    envelope.gain.exponentialRampToValueAtTime(Math.max(peakVolume, 0.0002), now + 0.018);
    envelope.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    primaryOscillator.frequency.setValueAtTime(startFrequency, now);
    primaryOscillator.frequency.exponentialRampToValueAtTime(endFrequency, now + duration);
    harmonicOscillator.frequency.setValueAtTime(startFrequency * 1.5, now);
    harmonicOscillator.frequency.exponentialRampToValueAtTime(endFrequency * 0.75, now + duration);

    primaryOscillator.start(now);
    harmonicOscillator.start(now);
    primaryOscillator.stop(now + duration + 0.04);
    harmonicOscillator.stop(now + duration + 0.04);
  }

  function updateChargeAudio(chargeAmount: number, flashAmount: number) {
    if (!chargeAudioContext || !chargeAudioActive || !chargeOscillator || !chargeHarmonicOscillator || !chargeMasterGain || !chargeFilterNode) {
      return;
    }

    const now = chargeAudioContext.currentTime;
    const brightness = Math.min(1, chargeAmount + flashAmount * 0.35);
    const baseFrequency = 210 + brightness * 480;

    chargeOscillator.frequency.setTargetAtTime(baseFrequency, now, 0.035);
    chargeHarmonicOscillator.frequency.setTargetAtTime(baseFrequency * 1.5, now, 0.05);
    chargeFilterNode.frequency.setTargetAtTime(880 + brightness * 2600, now, 0.05);
    chargeMasterGain.gain.setTargetAtTime(resolvePlayerSfxVolume(0.06 + brightness * 0.14), now, 0.045);
  }

  function spawnLightShockwave(origin: [number, number, number], strength: number) {
    const maxScale = LIGHT_SHOCKWAVE_RADIUS_BASE + strength * LIGHT_SHOCKWAVE_RADIUS_BONUS;
    shockwaves = [
      ...shockwaves,
      {
        id: ++shockwaveId,
        position: origin,
        radius: 0.8,
        bandWidth: 0.9 + strength * 0.7,
        opacity: 0.65 + strength * 0.2,
        electricOpacity: 0.96,
        fireOpacity: 0.14 + strength * 0.08,
        coreOpacity: 0.32 + strength * 0.12,
        progress: 0,
        maxScale,
        strength,
        electricColor: LIGHT_SHOCKWAVE_COLOR,
        fireColor: LIGHT_SHOCKWAVE_FIRE_COLOR,
        lightColor: LIGHT_SHOCKWAVE_COLOR,
        lightDistance: 7,
        lightIntensity: 6 + strength * 16,
      }
    ];

    dispatch('lightBurst', {
      origin,
      strength,
      maxRadius: maxScale,
      speed: LIGHT_SHOCKWAVE_SPEED,
    });
  }

  function clearSpawnStabilizers() {
    spawnStabilizeTimeoutIds.forEach((timeoutId) => {
      window.clearTimeout(timeoutId);
    });
    spawnStabilizeTimeoutIds = [];
  }

  function sampleSpawnGroundY(x: number, z: number, fallbackY: number) {
    if (!rapier.world || !rapier?.rapier?.Ray) return null;

    const rayOriginY = Math.max(fallbackY + PLAYER_SPAWN_RAY_HEIGHT, PLAYER_SPAWN_RAY_HEIGHT);
    const ray = new rapier.rapier.Ray(
      { x, y: rayOriginY, z },
      { x: 0, y: -1, z: 0 },
    );

    const hit = rapier.world.castRay(
      ray,
      PLAYER_SPAWN_RAY_DISTANCE,
      true,
      rapier.rapier.QueryFilterFlags.EXCLUDE_SENSORS,
    );

    if (!hit || !Number.isFinite(hit.toi)) return null;
    return rayOriginY - hit.toi;
  }

  function resolveSafeSpawnPosition(x: number, y: number, z: number) {
    const groundY = sampleSpawnGroundY(x, z, y);
    const safeY = groundY === null
      ? y
      : Math.max(y, groundY + getSpawnGroundOffset());

    return { x, y: safeY, z };
  }

  function applySpawnPosition(x: number, y: number, z: number) {
    if (!rigidBody) return;
    const pos = { x, y, z };
    rigidBody.setTranslation(pos, true);
    playerVelocity.set(0, 0, 0);
    gameActions.updatePlayerPosition([pos.x, pos.y, pos.z]);
    if (visualGroup) {
      visualGroup.position.set(pos.x, pos.y, pos.z);
    }
  }

  function scheduleSpawnStabilization(x: number, y: number, z: number) {
    clearSpawnStabilizers();

    PLAYER_SPAWN_STABILIZE_DELAYS_MS.forEach((delayMs) => {
      const timeoutId = window.setTimeout(() => {
        if (!rigidBody) return;
        const safePosition = resolveSafeSpawnPosition(x, y, z);
        applySpawnPosition(safePosition.x, safePosition.y, safePosition.z);
      }, delayMs);

      spawnStabilizeTimeoutIds = [...spawnStabilizeTimeoutIds, timeoutId];
    });
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
    if (
      !rigidBody
      || !characterController
      || (typeof rigidBody.isValid === 'function' && !rigidBody.isValid())
      || typeof rigidBody.numColliders !== 'function'
      || rigidBody.numColliders() < 1
    ) return;
    const controllerStart = performance.now();
    const gamepadInput = getGamepadInput();
    const lightChargeInputActive = getLightChargeInputActive(gamepadInput);
    smoothedFrameMs = THREE.MathUtils.lerp(smoothedFrameMs, delta * 1000, 0.12);

    const qualitySettings = $qualitySettingsStore;
    const qualityForcesFallback = !qualitySettings.enableDynamicLighting || qualitySettings.canvasScale < 0.75;
    const reportedFrameMs = $frameTimeStore;
    const overloadDetected = smoothedFrameMs >= SHOCKWAVE_FALLBACK_TRIGGER_MS || reportedFrameMs >= SHOCKWAVE_FALLBACK_TRIGGER_MS;

    if (qualityForcesFallback || overloadDetected) {
      shockwaveFallbackHoldMs = SHOCKWAVE_FALLBACK_HOLD_MS;
    } else if (shockwaveFallbackHoldMs > 0 && smoothedFrameMs <= SHOCKWAVE_FALLBACK_RECOVER_MS && reportedFrameMs <= SHOCKWAVE_FALLBACK_TRIGGER_MS) {
      shockwaveFallbackHoldMs = Math.max(0, shockwaveFallbackHoldMs - delta * 1000);
    }

    shockwaveContourEnabled = !qualityForcesFallback && shockwaveFallbackHoldMs <= 0;

    if ($isSoundEnabled && lightChargeInputActive && !chargeAudioActive) {
      void beginChargeAudio();
    } else if ((!$isSoundEnabled || !lightChargeInputActive) && chargeAudioActive) {
      stopChargeAudio();
    }

    if (lightChargeInputActive) {
      lightChargeAmount = Math.min(1, lightChargeAmount + delta / LIGHT_CHARGE_MAX_TIME);
      lightFlashAmount = Math.min(1, lightFlashAmount + delta * 0.75);
    } else {
      lightFlashAmount = Math.max(0, lightFlashAmount - delta * LIGHT_FLASH_DECAY);
    }

    if (!lightChargeInputActive && wasLightCharging) {
      const releaseCharge = lightChargeAmount;
      lightFlashAmount = Math.max(lightFlashAmount, Math.min(1, LIGHT_FLASH_TAP_BOOST + releaseCharge * 0.45));
      void playReleaseAudio(Math.max(0.2, releaseCharge));

      if (releaseCharge >= LIGHT_BURST_THRESHOLD) {
        const currentPosition = rigidBody.translation();
        const groundY = currentPosition.y - (PLAYER_CAPSULE_HALF_HEIGHT + PLAYER_CAPSULE_RADIUS) + 0.08;
        spawnLightShockwave(
          [currentPosition.x, groundY, currentPosition.z],
          releaseCharge
        );
      }

      lightChargeAmount = 0;
    }

    wasLightCharging = lightChargeInputActive;
    updateChargeAudio(lightChargeAmount, lightFlashAmount);

    if (shockwaves.length > 0) {
      shockwaves = shockwaves
        .map((shockwave) => {
          const nextProgress = Math.min(1, shockwave.progress + delta / LIGHT_SHOCKWAVE_DURATION);
          const nextRadius = 0.8 + shockwave.maxScale * nextProgress;
          const warmth = Math.max(0, (nextProgress - 0.16) / 0.84);
          const electricMix = Math.min(1, nextProgress * 0.38 + shockwave.strength * 0.08);
          const fireMix = Math.min(1, 0.08 + warmth * 0.52);
          return {
            ...shockwave,
            progress: nextProgress,
            radius: nextRadius,
            opacity: (1 - nextProgress) * 0.75,
            electricOpacity: (1 - nextProgress) * (1.04 + shockwave.strength * 0.06),
            fireOpacity: (1 - nextProgress) * (0.16 + shockwave.strength * 0.08) * Math.max(0.14, 0.4 + warmth * 0.26),
            coreOpacity: (1 - nextProgress) * (0.34 + shockwave.strength * 0.14),
            lightDistance: 5 + nextRadius * 1.35,
            lightIntensity: (1 - nextProgress) * (8 + shockwave.strength * 18),
            electricColor: mixShockwaveColor(shockwaveElectricBaseColor, shockwaveCoreBaseColor, electricMix),
            fireColor: mixShockwaveColor(shockwaveCoreBaseColor, shockwaveFireBaseColor, fireMix),
            lightColor: mixShockwaveColor(shockwaveElectricBaseColor, shockwaveFireBaseColor, Math.min(1, nextProgress * 0.95 + shockwave.strength * 0.15)),
          };
        })
        .filter((shockwave) => shockwave.progress < 1);
    }

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
    if (!collider) return;
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
      cameraPivot.quaternion.setFromEuler(new THREE.Euler(cameraRotationX, 0, 0));
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
  export function isSpawnReady() {
    return Boolean(rigidBody)
  }

  export function getSpawnGroundOffset() {
    return PLAYER_CAPSULE_HALF_HEIGHT + PLAYER_CAPSULE_RADIUS + 0.18
  }

  export function resetPhysics() {
    playerVelocity.set(0, 0, 0)
  }

  export function spawnAt(x: number, y: number, z: number) {
    if (!rigidBody) return;
    const safePosition = resolveSafeSpawnPosition(x, y, z);
    applySpawnPosition(safePosition.x, safePosition.y, safePosition.z);
    scheduleSpawnStabilization(x, y, z);
  }

  $: spawnReady = Boolean(rigidBody);
  $: if (spawnReady !== lastReportedSpawnReady) {
    lastReportedSpawnReady = spawnReady;
    dispatch('spawnReadyChange', { ready: spawnReady });
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
    stopChargeAudio();
    window.removeEventListener('gamepadconnected', handleGamepadConnected);
    window.removeEventListener('gamepaddisconnected', handleGamepadDisconnected);
    if (surfaceMoveHoldTimeout !== null) {
      window.clearTimeout(surfaceMoveHoldTimeout);
    }
    clearSpawnStabilizers();
    characterController?.free?.();
    chargeAudioContext?.close?.();
    chargeAudioContext = null;
    playerAudioOutputGain = null;
  });
</script>

<svelte:window
  on:keydown={handleKeydown}
  on:keyup={handleKeyup}
  on:blur={handleWindowBlur}
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
    args={[PLAYER_CAPSULE_HALF_HEIGHT, PLAYER_CAPSULE_RADIUS]}
    collisionGroups={PLAYER_GROUP}
  />
</RigidBody>

<!-- 
  This is the "visual" group. It contains the player's avatar and camera.
  Its position and rotation will be smoothly interpolated to follow the physics body,
  hiding any jitter from the player's view.
-->
<T.Group bind:ref={visualGroup} position={position}>
  <PlayerAvatar
    position={[0, 0, 0]}
    chargeAmount={lightChargeAmount}
    flashAmount={lightFlashAmount}
    lightIntensityScale={lightIntensityScale}
  />
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

{#each shockwaves as shockwave (shockwave.id)}
  <GroundShockwave
    position={shockwave.position}
    enableContour={shockwaveContourEnabled}
    radius={shockwave.radius}
    bandWidth={shockwave.bandWidth}
    electricOpacity={shockwave.electricOpacity}
    fireOpacity={shockwave.fireOpacity}
    coreOpacity={shockwave.coreOpacity}
    electricColor={shockwave.electricColor}
    fireColor={shockwave.fireColor}
    lightColor={shockwave.lightColor}
    lightDistance={shockwave.lightDistance}
    lightIntensity={shockwave.lightIntensity}
  />
{/each}
