<script lang="ts">
  import { onDestroy, onMount } from 'svelte'
  import { mobileInputStore } from './mobileInputStore'
  import { uiStore } from '../../stores/uiStore';

  // --- State for Movement Joystick (Left) ---
  let moveJoystickContainer: HTMLElement
  let moveJoystickKnob: HTMLElement
  let isMoveDragging = false
  let moveJoystickCenter = { x: 0, y: 0 }
  let moveActiveTouchId: number | null = null
  
  // --- State for Look Joystick (Right) ---
  let lookJoystickContainer: HTMLElement
  let lookJoystickKnob: HTMLElement
  let isLookDragging = false
  let lookJoystickCenter = { x: 0, y: 0 }
  let lookActiveTouchId: number | null = null

  // --- State for Tap Gesture Logic ---
  let lookTouchStartTime = 0;
  let lookTouchStartPosition = { x: 0, y: 0 };
  let moveTouchStartTime = 0;
  let moveTouchStartPosition = { x: 0, y: 0 };
  const TAP_TIME_THRESHOLD = 200; // Max duration for a tap in ms
  const TAP_MOVE_THRESHOLD = 15;  // Max pixels moved for a tap

  // --- Input State ---
  let currentMovement = { x: 0, z: 0 }
  let currentLook = { x: 0, y: 0 }
  let dragToLookActive = false
  let isJumpPressed = false
  let showTouchModeHint = false
  let hasSeenTouchModeHint = false
  let touchModeHintTimeout: number | null = null
  
  // --- Update Throttling ---
  let lastUpdateTime = 0
  const updateThrottle = 16 // ~60fps
  const TOUCH_MODE_HINT_KEY = 'megameal-touch-mode-hint-seen'

  mobileInputStore.subscribe(state => {
    dragToLookActive = state.dragToLook;
  });

  onMount(() => {
    hasSeenTouchModeHint = localStorage.getItem(TOUCH_MODE_HINT_KEY) === '1'
  })

  onDestroy(() => {
    if (touchModeHintTimeout !== null) {
      window.clearTimeout(touchModeHintTimeout)
    }
  })

  function getJoystickRadius(type: 'move' | 'look') {
    const container = type === 'move' ? moveJoystickContainer : lookJoystickContainer
    const size = container?.clientWidth || 88
    return Math.max(32, size * 0.5)
  }

  // --- Generic Joystick Logic ---
  function handleJoystickStart(event: TouchEvent, type: 'move' | 'look') {
    event.preventDefault()
    event.stopPropagation()
    
    const touch = event.changedTouches[0]
    if (!touch) return

    if (type === 'move') {
      if (moveActiveTouchId !== null) return
      moveActiveTouchId = touch.identifier
      isMoveDragging = true
      const rect = moveJoystickContainer.getBoundingClientRect()
      moveJoystickCenter.x = rect.left + rect.width / 2
      moveJoystickCenter.y = rect.top + rect.height / 2

      // Record start time and position for tap-to-interact
      moveTouchStartTime = performance.now();
      moveTouchStartPosition.x = touch.clientX;
      moveTouchStartPosition.y = touch.clientY;

      updateJoystickFromTouch(touch, 'move')
    } else {
      if (lookActiveTouchId !== null) return
      lookActiveTouchId = touch.identifier
      isLookDragging = true
      const rect = lookJoystickContainer.getBoundingClientRect()
      lookJoystickCenter.x = rect.left + rect.width / 2
      lookJoystickCenter.y = rect.top + rect.height / 2

      // Record start time and position for tap-to-jump
      lookTouchStartTime = performance.now();
      lookTouchStartPosition.x = touch.clientX;
      lookTouchStartPosition.y = touch.clientY;

      updateJoystickFromTouch(touch, 'look')
    }
  }

  function handleJoystickMove(event: TouchEvent) {
    if ($uiStore.isInputFocused) return;
    
    event.preventDefault()
    event.stopPropagation()

    const now = performance.now()
    if (now - lastUpdateTime < updateThrottle) return
    lastUpdateTime = now

    for (const touch of Array.from(event.changedTouches)) {
      if (touch.identifier === moveActiveTouchId) {
        updateJoystickFromTouch(touch, 'move')
      }
      if (touch.identifier === lookActiveTouchId) {
        updateJoystickFromTouch(touch, 'look')
      }
    }
  }

  function handleJoystickEnd(event: TouchEvent) {
    event.preventDefault()
    event.stopPropagation()

    for (const touch of Array.from(event.changedTouches)) {
      if (touch.identifier === moveActiveTouchId) {
        // --- TAP-TO-INTERACT LOGIC ---
        const touchEndTime = performance.now();
        const touchDuration = touchEndTime - moveTouchStartTime;

        const deltaX = touch.clientX - moveTouchStartPosition.x;
        const deltaY = touch.clientY - moveTouchStartPosition.y;
        const distanceMoved = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        if (touchDuration < TAP_TIME_THRESHOLD && distanceMoved < TAP_MOVE_THRESHOLD) {
          // If it was a quick tap, trigger an interact action
          handleActionPress('interact', event);
          setTimeout(() => handleActionRelease('interact', event), 50);
        }

        // Reset move state
        isMoveDragging = false
        moveActiveTouchId = null
        currentMovement = { x: 0, z: 0 }
        if (moveJoystickKnob) moveJoystickKnob.style.transform = 'translate(-50%, -50%)'
      }
      if (touch.identifier === lookActiveTouchId) {
        // --- TAP-TO-JUMP LOGIC ---
        const touchEndTime = performance.now();
        const touchDuration = touchEndTime - lookTouchStartTime;

        const deltaX = touch.clientX - lookTouchStartPosition.x;
        const deltaY = touch.clientY - lookTouchStartPosition.y;
        const distanceMoved = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        if (touchDuration < TAP_TIME_THRESHOLD && distanceMoved < TAP_MOVE_THRESHOLD) {
          // If it was a quick tap, trigger a jump
          handleActionPress('jump', event);
          setTimeout(() => handleActionRelease('jump', event), 50);
        }

        // Reset look state
        isLookDragging = false
        lookActiveTouchId = null
        currentLook = { x: 0, y: 0 }
        if (lookJoystickKnob) lookJoystickKnob.style.transform = 'translate(-50%, -50%)'
      }
    }
    
    // Update store with final state
    mobileInputStore.update(state => ({
      ...state,
      movement: { ...currentMovement },
      look: { ...currentLook }
    }))
  }

  function updateJoystickFromTouch(touch: Touch, type: 'move' | 'look') {
    const center = type === 'move' ? moveJoystickCenter : lookJoystickCenter
    const knob = type === 'move' ? moveJoystickKnob : lookJoystickKnob
    if (!knob) return
    const joystickRadius = getJoystickRadius(type)

    const deltaX = touch.clientX - center.x
    const deltaY = touch.clientY - center.y
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
    const clampedDistance = Math.min(distance, joystickRadius)
    const angle = Math.atan2(deltaY, deltaX)
    const knobX = Math.cos(angle) * clampedDistance
    const knobY = Math.sin(angle) * clampedDistance

    knob.style.transform = `translate(calc(-50% + ${knobX}px), calc(-50% + ${knobY}px))`

    const deadZone = Math.max(5, joystickRadius * 0.12)
    if (clampedDistance > deadZone) {
       if (type === 'move') {
        currentMovement.x = knobX / joystickRadius
        currentMovement.z = knobY / joystickRadius
      } else {
        currentLook.x = deltaX * 0.1
        currentLook.y = deltaY * 0.1
      }
    } else {
      if (type === 'move') {
        currentMovement.x = 0
        currentMovement.z = 0
      } else {
        currentLook.x = 0
        currentLook.y = 0
      }
    }

    mobileInputStore.update(state => ({
      ...state,
      movement: { ...currentMovement },
      look: { ...currentLook },
      isJoystickActive: isMoveDragging || isLookDragging
    }))
  }

  function handleActionPress(action: string, event: TouchEvent) {
    event.preventDefault()
    event.stopPropagation()
    if (action === 'jump') isJumpPressed = true;
    mobileInputStore.update(state => ({ ...state, actionPressed: action }))
  }

  function handleActionRelease(action: string, event: TouchEvent) {
    event.preventDefault()
    event.stopPropagation()
    if (action === 'jump') isJumpPressed = false;
    mobileInputStore.update(state => {
      if (state.actionPressed === action) {
        return { ...state, actionPressed: null };
      }
      return state;
    });
  }

  function dismissTouchModeHint() {
    showTouchModeHint = false
    if (touchModeHintTimeout !== null) {
      window.clearTimeout(touchModeHintTimeout)
      touchModeHintTimeout = null
    }
  }

  function maybeShowTouchModeHint() {
    if (hasSeenTouchModeHint) return

    hasSeenTouchModeHint = true
    localStorage.setItem(TOUCH_MODE_HINT_KEY, '1')
    showTouchModeHint = true

    if (touchModeHintTimeout !== null) {
      window.clearTimeout(touchModeHintTimeout)
    }

    touchModeHintTimeout = window.setTimeout(() => {
      showTouchModeHint = false
      touchModeHintTimeout = null
    }, 4200)
  }

  function toggleDragToLook(event: MouseEvent | TouchEvent) {
    event.preventDefault();
    event.stopPropagation();
    const nextDragToLook = !dragToLookActive
    isMoveDragging = false
    isLookDragging = false
    moveActiveTouchId = null
    lookActiveTouchId = null
    currentMovement = { x: 0, z: 0 }
    currentLook = { x: 0, y: 0 }
    if (moveJoystickKnob) moveJoystickKnob.style.transform = 'translate(-50%, -50%)'
    if (lookJoystickKnob) lookJoystickKnob.style.transform = 'translate(-50%, -50%)'
    mobileInputStore.update(state => ({
      ...state,
      dragToLook: nextDragToLook,
      movement: { x: 0, z: 0 },
      look: { x: 0, y: 0 },
      isJoystickActive: false
    }));

    if (nextDragToLook) {
      maybeShowTouchModeHint()
    } else {
      dismissTouchModeHint()
    }
  }
</script>

<div class="threlte-mobile-controls" data-mobile-ui="true">
  {#if dragToLookActive && showTouchModeHint}
  <button
    class="touch-mode-hint"
    on:touchstart|preventDefault|stopPropagation={dismissTouchModeHint}
    on:click|preventDefault|stopPropagation={dismissTouchModeHint}
    aria-label="Dismiss touch controls hint"
    data-mobile-ui="true"
  >
    <span>Drag to look</span>
    <span>Hold to walk</span>
    <span>Tap to select</span>
  </button>
  {/if}
  {#if !dragToLookActive}
  <div 
    class="virtual-joystick left"
    class:active={isMoveDragging}
    bind:this={moveJoystickContainer}
    on:touchstart={(e) => handleJoystickStart(e, 'move')}
    on:touchmove={handleJoystickMove}
    on:touchend={handleJoystickEnd}
    role="button"
    tabindex="0"
    aria-label="Movement joystick and Interact"
    data-mobile-ui="true"
  >
    <div class="joystick-base"></div>
    <div class="joystick-knob" bind:this={moveJoystickKnob}></div>
  </div>
  
  <div 
    class="virtual-joystick right"
    class:active={isLookDragging}
    bind:this={lookJoystickContainer}
    on:touchstart={(e) => handleJoystickStart(e, 'look')}
    on:touchmove={handleJoystickMove}
    on:touchend={handleJoystickEnd}
    role="button"
    tabindex="0"
    aria-label="Look joystick and Jump"
    data-mobile-ui="true"
  >
    <div class="joystick-base"></div>
    <div class="joystick-knob" bind:this={lookJoystickKnob}></div>
  </div>
  {/if}
  <button
    class="action-btn pulse-btn"
    class:active={$mobileInputStore.actionPressed === 'pulse'}
    on:touchstart={(event) => handleActionPress('pulse', event)}
    on:touchend={(event) => handleActionRelease('pulse', event)}
    on:touchcancel={(event) => handleActionRelease('pulse', event)}
    aria-label="Charge and release a burst of light"
    data-mobile-ui="true"
  >
    ✨
  </button>
  <button 
    class="action-btn look-toggle-btn"
    class:active={dragToLookActive}
    on:touchstart={toggleDragToLook}
    aria-label="Toggle touchscreen control style"
    data-mobile-ui="true"
  >
    🖐️
  </button>
</div>

<style>
  .threlte-mobile-controls {
    --joystick-size: clamp(74px, 20vw, 92px);
    --joystick-opacity: 0.42;
    --joystick-active-opacity: 0.82;
    --joystick-knob-size: calc(var(--joystick-size) * 0.34);
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: calc(var(--joystick-size) + 72px + env(safe-area-inset-bottom, 0px));
    pointer-events: none;
    z-index: 1000;
    font-family: 'Courier New', monospace;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding:
      0 max(16px, env(safe-area-inset-right, 0px))
      max(18px, calc(12px + env(safe-area-inset-bottom, 0px)))
      max(16px, env(safe-area-inset-left, 0px));
  }
  
  .virtual-joystick {
    position: relative;
    bottom: 0;
    width: var(--joystick-size);
    height: var(--joystick-size);
    pointer-events: auto;
    touch-action: none;
    user-select: none;
  }
  
  .joystick-base {
    position: absolute;
    top: 50%;
    left: 50%;
    width: var(--joystick-size);
    height: var(--joystick-size);
    border-radius: 50%;
    background: rgba(11, 18, 28, var(--joystick-opacity));
    border: 1.5px solid rgba(124, 234, 199, 0.34);
    transform: translate(-50%, -50%);
    backdrop-filter: blur(10px);
    box-shadow: 
      0 0 16px rgba(0, 255, 136, 0.12),
      inset 0 1px 0 rgba(255, 255, 255, 0.08);
    transition: box-shadow 0.2s ease-in-out, background 0.2s ease-in-out, border-color 0.2s ease-in-out;
  }

  .virtual-joystick.active .joystick-base {
    background: rgba(14, 28, 40, var(--joystick-active-opacity));
    border-color: rgba(124, 234, 199, 0.62);
    box-shadow: 
      0 0 22px rgba(0, 255, 136, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.2);
  }
  
  .joystick-knob {
    position: absolute;
    top: 50%;
    left: 50%;
    width: var(--joystick-knob-size);
    height: var(--joystick-knob-size);
    border-radius: 50%;
    background: rgba(124, 234, 199, 0.7);
    border: 1.5px solid rgba(255, 255, 255, 0.7);
    transform: translate(-50%, -50%);
    transition: none;
    backdrop-filter: blur(5px);
    box-shadow: 0 0 12px rgba(124, 234, 199, 0.28);
  }
  
  /* ACTION BUTTONS and INTERACT BUTTON STYLES REMOVED */
  .action-btn {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.1);
    border: 2px solid rgba(255, 255, 255, 0.3);
    color: white;
    font-weight: bold;
    font-size: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(10px);
    touch-action: manipulation;
    user-select: none;
    cursor: pointer;
    transition: all 0.1s ease;
  }
  
  .action-btn:active, .action-btn.active {
    background: rgba(255, 255, 255, 0.3);
    transform: scale(0.95);
  }

  .look-toggle-btn {
    position: fixed;
    top: 60px;
    right: 12px;
    width: 40px;
    height: 40px;
    font-size: 18px;
    border-color: rgba(137, 207, 240, 0.32);
    background: rgba(10, 18, 28, 0.16);
    opacity: 0.34;
    backdrop-filter: blur(8px);
    pointer-events: auto;
  }

  .pulse-btn {
    position: fixed;
    right: 16px;
    bottom: max(110px, calc(92px + env(safe-area-inset-bottom, 0px)));
    border-color: rgba(126, 216, 255, 0.42);
    background: rgba(8, 18, 32, 0.34);
    box-shadow: 0 0 18px rgba(126, 216, 255, 0.18);
    pointer-events: auto;
  }

  .pulse-btn.active {
    background: rgba(126, 216, 255, 0.4);
    border-color: rgba(126, 216, 255, 0.9);
    box-shadow: 0 0 24px rgba(126, 216, 255, 0.38);
  }

  .look-toggle-btn.active {
    background: rgba(137, 207, 240, 0.3);
    border-color: rgba(137, 207, 240, 0.8);
    opacity: 0.72;
  }

  .touch-mode-hint {
    position: fixed;
    left: 50%;
    bottom: max(92px, calc(76px + env(safe-area-inset-bottom, 0px)));
    transform: translateX(-50%);
    display: flex;
    gap: 10px;
    align-items: center;
    padding: 10px 14px;
    border: 1px solid rgba(160, 227, 255, 0.22);
    border-radius: 999px;
    background: rgba(8, 14, 22, 0.72);
    color: rgba(240, 248, 255, 0.92);
    font-size: 11px;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    box-shadow: 0 10px 24px rgba(0, 0, 0, 0.22);
    pointer-events: auto;
    white-space: nowrap;
  }

  .touch-mode-hint span + span::before {
    content: '•';
    margin-right: 10px;
    color: rgba(124, 234, 199, 0.8);
  }

  @media (max-width: 420px) {
    .threlte-mobile-controls {
      --joystick-size: clamp(68px, 18vw, 82px);
      padding-left: max(12px, env(safe-area-inset-left, 0px));
      padding-right: max(12px, env(safe-area-inset-right, 0px));
    }

    .touch-mode-hint {
      gap: 8px;
      padding: 9px 12px;
      font-size: 10px;
      bottom: max(84px, calc(68px + env(safe-area-inset-bottom, 0px)));
    }

    .touch-mode-hint span + span::before {
      margin-right: 8px;
    }
  }
</style>
