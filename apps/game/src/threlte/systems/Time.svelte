<!-- 
  Threlte Time System Component
  Replaces Time.ts with reactive time management
-->
<script lang="ts">
import { useTask } from '@threlte/core'
import { onMount, onDestroy, createEventDispatcher } from 'svelte'
import { writable } from 'svelte/store'

const dispatch = createEventDispatcher()

// Reactive stores for time data
export const deltaTimeStore = writable(0)
export const totalTimeStore = writable(0)
export const fpsStore = writable(60)
export const frameCountStore = writable(0)

// Time tracking variables
let startTime = 0
let lastFrameTime = 0
let fpsFrames = 0
let fpsStartTime = 0
let isInitialized = false
let isPaused = false

// Export time values for external access
export let deltaTime = 0
export let totalTime = 0
export let fps = 60
export let frameCount = 0

onMount(() => {
  console.log('⏰ Initializing Threlte Time System...')
  
  // Initialize time tracking
  const now = performance.now()
  startTime = now
  lastFrameTime = now
  fpsStartTime = now
  
  isInitialized = true
  console.log('✅ Threlte Time System initialized')
})

// Update time system every frame
useTask((delta) => {
  if (!isInitialized || isPaused) return
  
  const now = performance.now()
  
  // Calculate delta time (convert from milliseconds to seconds)
  deltaTime = delta
  
  // Calculate total time since start (in seconds)
  totalTime = (now - startTime) / 1000
  
  // Update frame count
  frameCount++
  
  // Calculate FPS (update every 500ms)
  fpsFrames++
  if (now - fpsStartTime >= 500) {
    fps = Math.round((fpsFrames * 1000) / (now - fpsStartTime))
    fpsFrames = 0
    fpsStartTime = now
  }
  
  lastFrameTime = now
  
  // Update reactive stores
  deltaTimeStore.set(deltaTime)
  totalTimeStore.set(totalTime)
  fpsStore.set(fps)
  frameCountStore.set(frameCount)
  
  // Dispatch time update events
  dispatch('timeUpdate', {
    deltaTime,
    totalTime,
    fps,
    frameCount
  })
})

/**
 * Pause time system
 */
export function pause() {
  isPaused = true
  dispatch('timePaused')
}

/**
 * Resume time system
 */
export function resume() {
  isPaused = false
  // Reset FPS calculation when resuming
  const now = performance.now()
  lastFrameTime = now
  fpsStartTime = now
  fpsFrames = 0
  dispatch('timeResumed')
}

/**
 * Stop time system
 */
export function stop() {
  isPaused = true
  dispatch('timeStopped')
}

/**
 * Reset time system
 */
export function reset() {
  const now = performance.now()
  startTime = now
  lastFrameTime = now
  fpsStartTime = now
  fpsFrames = 0
  frameCount = 0
  totalTime = 0
  deltaTime = 0
  fps = 60
  
  // Update stores
  deltaTimeStore.set(deltaTime)
  totalTimeStore.set(totalTime)
  fpsStore.set(fps)
  frameCountStore.set(frameCount)
  
  dispatch('timeReset')
}

/**
 * Get current time information
 */
export function getTimeInfo() {
  return {
    deltaTime,
    totalTime,
    fps,
    frameCount,
    isPaused,
    isInitialized
  }
}

onDestroy(() => {
  console.log('🧹 Threlte Time System disposed')
})
</script>

<!-- No visual output - this is a system component -->

{#if isInitialized}
  <slot />
{/if}