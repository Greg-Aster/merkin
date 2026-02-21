// src/threlte/stores/underwaterStore.ts
// Underwater effect state management following MEGAMEAL architecture

import { writable, derived } from 'svelte/store'

// Types
export interface UnderwaterState {
  isUnderwater: boolean
  depth: number
  transitionProgress: number
  bubbleIntensity: number
  mistDensity: number
  waterColor: string
  ambientSound: boolean
}

export interface UnderwaterConfig {
  enableBubbles: boolean
  enableMist: boolean
  enableColorGrading: boolean
  enableSound: boolean
  transitionDuration: number
  maxDepth: number
  mistParticleCount: number
  bubbleParticleCount: number
}

// Default state
const defaultUnderwaterState: UnderwaterState = {
  isUnderwater: false,
  depth: 0,
  transitionProgress: 0,
  bubbleIntensity: 0,
  mistDensity: 0,
  waterColor: '#006994',
  ambientSound: false
}

const defaultUnderwaterConfig: UnderwaterConfig = {
  enableBubbles: true,
  enableMist: true,
  enableColorGrading: true,
  enableSound: true,
  transitionDuration: 1000, // milliseconds
  maxDepth: 50,
  mistParticleCount: 200,
  bubbleParticleCount: 50
}

// Stores
export const underwaterStateStore = writable<UnderwaterState>(defaultUnderwaterState)
export const underwaterConfigStore = writable<UnderwaterConfig>(defaultUnderwaterConfig)

// Derived stores for computed values
export const underwaterIntensity = derived(
  underwaterStateStore,
  ($state) => Math.min($state.depth / 10, 1) // Intensity based on depth
)

export const underwaterFogDensity = derived(
  [underwaterStateStore, underwaterConfigStore],
  ([$state, $config]) => {
    if (!$state.isUnderwater) return 0
    return Math.min($state.depth / $config.maxDepth, 0.8)
  }
)

// Action creators following MEGAMEAL store pattern
export const underwaterActions = {
  enterWater: (depth: number = 1) => {
    console.log('🌊 Player entered water at depth:', depth)
    underwaterStateStore.update(state => ({
      ...state,
      isUnderwater: true,
      depth,
      transitionProgress: 0
    }))
    
    // Animate transition
    animateTransition(true)
  },

  exitWater: () => {
    console.log('🏖️ Player exited water')
    underwaterStateStore.update(state => ({
      ...state,
      isUnderwater: false,
      transitionProgress: 0
    }))
    
    // Animate transition out
    animateTransition(false)
  },

  updateDepth: (depth: number) => {
    underwaterStateStore.update(state => ({
      ...state,
      depth: Math.max(0, depth)
    }))
  },

  setConfig: (config: Partial<UnderwaterConfig>) => {
    underwaterConfigStore.update(current => ({
      ...current,
      ...config
    }))
  }
}

// Animation helper
function animateTransition(entering: boolean) {
  const startTime = performance.now()
  
  function animate() {
    const elapsed = performance.now() - startTime
    let progress = elapsed / defaultUnderwaterConfig.transitionDuration
    
    if (progress >= 1) {
      progress = 1
    } else {
      requestAnimationFrame(animate)
    }
    
    // Smooth easing function
    const easedProgress = entering 
      ? 1 - Math.pow(1 - progress, 3) // Ease out cubic
      : Math.pow(progress, 3) // Ease in cubic for exit
    
    underwaterStateStore.update(state => ({
      ...state,
      transitionProgress: entering ? easedProgress : 1 - easedProgress,
      bubbleIntensity: entering ? easedProgress * 0.8 : (1 - easedProgress) * 0.8,
      mistDensity: entering ? easedProgress * 0.6 : (1 - easedProgress) * 0.6
    }))
  }
  
  animate()
}

// Utility functions
export const underwaterUtils = {
  getWaterColor: (depth: number): string => {
    // Darker blue as depth increases
    const lightness = Math.max(20, 60 - (depth * 2))
    return `hsl(200, 80%, ${lightness}%)`
  },
  
  getVisibilityDistance: (depth: number): number => {
    // Reduce fog distance underwater
    return Math.max(5, 50 - (depth * 1.5))
  },
  
  getBubbleCount: (intensity: number): number => {
    return Math.floor(intensity * defaultUnderwaterConfig.bubbleParticleCount)
  }
}