/**
 * Post-Processing State Store - Phase 5
 * Centralized reactive state management for post-processing effects
 */

import { writable, derived, type Writable } from 'svelte/store'

// Quality level definitions (matches existing optimization system)
export type QualityLevel = 'ultra_low' | 'low' | 'medium' | 'high' | 'ultra'

// Post-processing configuration interface
export interface PostProcessingConfig {
  enabled: boolean
  qualityLevel: QualityLevel
  adaptiveQuality: boolean
}

// Individual effect configurations
export interface EffectConfig {
  enabled: boolean
  intensity: number
  quality: QualityLevel
}

export interface BloomConfig extends EffectConfig {
  threshold: number
  smoothWidth: number
}

export interface SSAOConfig extends EffectConfig {
  radius: number
  samples: number
  rings: number
}

export interface FXAAConfig extends EffectConfig {
  // FXAA doesn't have additional configuration
}

export interface ToneMappingConfig extends EffectConfig {
  exposure: number
  whitePoint: number
}

// Main stores
export const postProcessingStore: Writable<PostProcessingConfig> = writable({
  enabled: true,
  qualityLevel: 'high',
  adaptiveQuality: true
})

export const bloomStore: Writable<BloomConfig> = writable({
  enabled: false, // Changed to false
  intensity: 1.0,
  threshold: 0.85,
  smoothWidth: 0.025,
  quality: 'high'
})

export const ssaoStore: Writable<SSAOConfig> = writable({
  enabled: false, // Disabled by default for performance
  intensity: 0.5,
  radius: 0.1,
  samples: 16,
  rings: 3,
  quality: 'medium'
})

export const fxaaStore: Writable<FXAAConfig> = writable({
  enabled: true,
  intensity: 1.0,
  quality: 'high'
})

export const toneMappingStore: Writable<ToneMappingConfig> = writable({
  enabled: true,
  intensity: 1.0,
  exposure: 1.0,
  whitePoint: 1.0,
  quality: 'high'
})

// Quality-based effect configurations
const qualityConfigs = {
  ultra_low: {
    bloom: { enabled: false, intensity: 0, threshold: 1.0, smoothWidth: 0.1 },
    ssao: { enabled: false, intensity: 0, radius: 0.05, samples: 4, rings: 2 },
    fxaa: { enabled: true, intensity: 1.0 },
    toneMapping: { enabled: true, intensity: 0.8, exposure: 0.9, whitePoint: 1.0 }
  },
  low: {
    bloom: { enabled: true, intensity: 0.5, threshold: 0.9, smoothWidth: 0.05 },
    ssao: { enabled: false, intensity: 0, radius: 0.08, samples: 8, rings: 2 },
    fxaa: { enabled: true, intensity: 1.0 },
    toneMapping: { enabled: true, intensity: 0.9, exposure: 0.95, whitePoint: 1.0 }
  },
  medium: {
    bloom: { enabled: true, intensity: 0.8, threshold: 0.85, smoothWidth: 0.025 },
    ssao: { enabled: false, intensity: 0.3, radius: 0.1, samples: 12, rings: 3 },
    fxaa: { enabled: true, intensity: 1.0 },
    toneMapping: { enabled: true, intensity: 1.0, exposure: 1.0, whitePoint: 1.0 }
  },
  high: {
    bloom: { enabled: true, intensity: 1.0, threshold: 0.85, smoothWidth: 0.025 },
    ssao: { enabled: true, intensity: 0.5, radius: 0.1, samples: 16, rings: 3 },
    fxaa: { enabled: true, intensity: 1.0 },
    toneMapping: { enabled: true, intensity: 1.0, exposure: 1.0, whitePoint: 1.0 }
  },
  ultra: {
    bloom: { enabled: true, intensity: 1.2, threshold: 0.8, smoothWidth: 0.02 },
    ssao: { enabled: true, intensity: 0.7, radius: 0.12, samples: 24, rings: 4 },
    fxaa: { enabled: true, intensity: 1.0 },
    toneMapping: { enabled: true, intensity: 1.1, exposure: 1.05, whitePoint: 1.0 }
  }
}

// Derived stores that update based on quality level
export const adaptiveBloomConfig = derived(
  [postProcessingStore, bloomStore],
  ([$postProcessing, $bloom]) => {
    if (!$postProcessing.adaptiveQuality) return $bloom
    
    const qualityConfig = qualityConfigs[$postProcessing.qualityLevel]
    return {
      ...$bloom,
      ...qualityConfig.bloom,
      quality: $postProcessing.qualityLevel
    }
  }
)

export const adaptiveSSAOConfig = derived(
  [postProcessingStore, ssaoStore],
  ([$postProcessing, $ssao]) => {
    if (!$postProcessing.adaptiveQuality) return $ssao
    
    const qualityConfig = qualityConfigs[$postProcessing.qualityLevel]
    return {
      ...$ssao,
      ...qualityConfig.ssao,
      quality: $postProcessing.qualityLevel
    }
  }
)

export const adaptiveFXAAConfig = derived(
  [postProcessingStore, fxaaStore],
  ([$postProcessing, $fxaa]) => {
    if (!$postProcessing.adaptiveQuality) return $fxaa
    
    const qualityConfig = qualityConfigs[$postProcessing.qualityLevel]
    return {
      ...$fxaa,
      ...qualityConfig.fxaa,
      quality: $postProcessing.qualityLevel
    }
  }
)

export const adaptiveToneMappingConfig = derived(
  [postProcessingStore, toneMappingStore],
  ([$postProcessing, $toneMapping]) => {
    if (!$postProcessing.adaptiveQuality) return $toneMapping
    
    const qualityConfig = qualityConfigs[$postProcessing.qualityLevel]
    return {
      ...$toneMapping,
      ...qualityConfig.toneMapping,
      quality: $postProcessing.qualityLevel
    }
  }
)

// Utility functions
export function setQualityLevel(level: QualityLevel) {
  postProcessingStore.update(config => ({
    ...config,
    qualityLevel: level
  }))
}

export function togglePostProcessing() {
  postProcessingStore.update(config => ({
    ...config,
    enabled: !config.enabled
  }))
}

export function enableAdaptiveQuality() {
  postProcessingStore.update(config => ({
    ...config,
    adaptiveQuality: true
  }))
}

export function disableAdaptiveQuality() {
  postProcessingStore.update(config => ({
    ...config,
    adaptiveQuality: false
  }))
}

// Performance-based quality adjustment
export function adjustQualityForPerformance(avgFPS: number, targetFPS: number = 60) {
  const currentConfig = postProcessingStore
  
  if (avgFPS < targetFPS * 0.7) {
    // Performance is poor, reduce quality
    postProcessingStore.update(config => {
      const currentIndex = ['ultra_low', 'low', 'medium', 'high', 'ultra'].indexOf(config.qualityLevel)
      const newIndex = Math.max(0, currentIndex - 1)
      const newLevel = (['ultra_low', 'low', 'medium', 'high', 'ultra'] as QualityLevel[])[newIndex]
      
      console.log(`🔽 Reducing post-processing quality: ${config.qualityLevel} → ${newLevel}`)
      return {
        ...config,
        qualityLevel: newLevel
      }
    })
  } else if (avgFPS > targetFPS * 1.2) {
    // Performance is good, can increase quality
    postProcessingStore.update(config => {
      const currentIndex = ['ultra_low', 'low', 'medium', 'high', 'ultra'].indexOf(config.qualityLevel)
      const newIndex = Math.min(4, currentIndex + 1)
      const newLevel = (['ultra_low', 'low', 'medium', 'high', 'ultra'] as QualityLevel[])[newIndex]
      
      if (newLevel !== config.qualityLevel) {
        console.log(`🔼 Increasing post-processing quality: ${config.qualityLevel} → ${newLevel}`)
        return {
          ...config,
          qualityLevel: newLevel
        }
      }
      return config
    })
  }
}

// Export all stores for easy import
export const postProcessingStores = {
  postProcessing: postProcessingStore,
  bloom: bloomStore,
  ssao: ssaoStore,
  fxaa: fxaaStore,
  toneMapping: toneMappingStore,
  adaptiveBloom: adaptiveBloomConfig,
  adaptiveSSAO: adaptiveSSAOConfig,
  adaptiveFXAA: adaptiveFXAAConfig,
  adaptiveToneMapping: adaptiveToneMappingConfig
}