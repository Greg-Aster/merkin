<script lang="ts">
  import { onMount } from 'svelte'
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

  const joystickRadius = 50
  
  // --- Input State ---
  let currentMovement = { x: 0, z: 0 }
  let currentLook = { x: 0, y: 0 }
  let dragToLookActive = false
  let isJumpPressed = false
  
  // --- Update Throttling ---
  let lastUpdateTime = 0
  const updateThrottle = 16 // ~60fps

  mobileInputStore.subscribe(state => {
    dragToLookActive = state.dragToLook;
  });

  onMount(() => {
    mobileInputStore.update(state => ({ ...state, dragToLook: true }));
  });

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

    const deltaX = touch.clientX - center.x
    const deltaY = touch.clientY - center.y
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
    const clampedDistance = Math.min(distance, joystickRadius)
    const angle = Math.atan2(deltaY, deltaX)
    const knobX = Math.cos(angle) * clampedDistance
    const knobY = Math.sin(angle) * clampedDistance

    knob.style.transform = `translate(calc(-50% + ${knobX}px), calc(-50% + ${knobY}px))`

    const deadZone = 5
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

  function toggleDragToLook(event: MouseEvent | TouchEvent) {
    event.preventDefault();
    event.stopPropagation();
    mobileInputStore.update(state => ({ ...state, dragToLook: !state.dragToLook }));
  }
</script>

<div class="threlte-mobile-controls">
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
  >
    <div class="joystick-base"></div>
    <div class="joystick-knob" bind:this={lookJoystickKnob}></div>
  </div>

  <button 
    class="action-btn look-toggle-btn"
    class:active={dragToLookActive}
    on:touchstart={toggleDragToLook}
    aria-label="Toggle Drag to Look"
  >
    🖐️
  </button>
</div>

<style>
  .threlte-mobile-controls {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: 200px;
    pointer-events: none;
    z-index: 1000;
    font-family: 'Courier New', monospace;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 30px;
  }
  
  .virtual-joystick {
    position: relative;
    bottom: -20px;
    width: 100px;
    height: 100px;
    pointer-events: auto;
    touch-action: none;
    user-select: none;
  }
  
  .joystick-base {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 100px;
    height: 100px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.1);
    border: 2px solid rgba(0, 255, 136, 0.4);
    transform: translate(-50%, -50%);
    backdrop-filter: blur(10px);
    box-shadow: 
      0 0 20px rgba(0, 255, 136, 0.2),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);
    transition: box-shadow 0.2s ease-in-out;
  }

  .virtual-joystick.active .joystick-base {
    box-shadow: 
      0 0 30px rgba(0, 255, 136, 0.5),
      inset 0 1px 0 rgba(255, 255, 255, 0.2);
  }
  
  .joystick-knob {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 35px;
    height: 35px;
    border-radius: 50%;
    background: rgba(0, 255, 136, 0.7);
    border: 2px solid rgba(255, 255, 255, 0.8);
    transform: translate(-50%, -50%);
    transition: none;
    backdrop-filter: blur(5px);
    box-shadow: 0 0 15px rgba(0, 255, 136, 0.4);
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
    width: 45px;
    height: 45px;
    font-size: 20px;
    border-color: rgba(137, 207, 240, 0.4);
    background: rgba(137, 207, 240, 0.1);
    opacity: 0.3;
    pointer-events: auto;
  }

  .look-toggle-btn.active {
    background: rgba(137, 207, 240, 0.4);
    border-color: rgba(137, 207, 240, 0.8);
    opacity: 0.7;
  }
</style>