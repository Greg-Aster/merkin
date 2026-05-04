/**
 * Post-Processing State Store - Phase 5
 * Centralized reactive state management for post-processing effects
 */

import { type Writable, derived, writable } from 'svelte/store'
import { runtimeDebugLog } from '../utils/runtimeLog'

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

export interface ToneMappingConfig extends EffectConfig {
  exposure: number
  whitePoint: number
}

// Main stores
export const DEFAULT_POST_PROCESSING_CONFIG: PostProcessingConfig = {
  enabled: true,
  qualityLevel: 'high',
  adaptiveQuality: true,
}

export const DEFAULT_BLOOM_CONFIG: BloomConfig = {
  enabled: false,
  intensity: 1.0,
  threshold: 0.85,
  smoothWidth: 0.025,
  quality: 'high',
}

export const DEFAULT_TONE_MAPPING_CONFIG: ToneMappingConfig = {
  enabled: true,
  intensity: 1.0,
  exposure: 1.0,
  whitePoint: 1.0,
  quality: 'high',
}

export const postProcessingStore: Writable<PostProcessingConfig> = writable(
  DEFAULT_POST_PROCESSING_CONFIG,
)

export const bloomStore: Writable<BloomConfig> = writable(DEFAULT_BLOOM_CONFIG)

export const toneMappingStore: Writable<ToneMappingConfig> = writable(
  DEFAULT_TONE_MAPPING_CONFIG,
)

// Quality-based effect configurations
const qualityConfigs = {
  ultra_low: {
    bloom: { enabled: false, intensity: 0, threshold: 1.0, smoothWidth: 0.1 },
    toneMapping: {
      enabled: true,
      intensity: 0.8,
      exposure: 0.9,
      whitePoint: 1.0,
    },
  },
  low: {
    bloom: { enabled: false, intensity: 0, threshold: 0.95, smoothWidth: 0.05 },
    toneMapping: {
      enabled: true,
      intensity: 0.9,
      exposure: 0.95,
      whitePoint: 1.0,
    },
  },
  medium: {
    bloom: {
      enabled: true,
      intensity: 0.58,
      threshold: 0.9,
      smoothWidth: 0.03,
    },
    toneMapping: {
      enabled: true,
      intensity: 1.0,
      exposure: 1.0,
      whitePoint: 1.0,
    },
  },
  high: {
    bloom: {
      enabled: true,
      intensity: 0.9,
      threshold: 0.84,
      smoothWidth: 0.025,
    },
    toneMapping: {
      enabled: true,
      intensity: 1.0,
      exposure: 1.0,
      whitePoint: 1.0,
    },
  },
  ultra: {
    bloom: {
      enabled: true,
      intensity: 1.05,
      threshold: 0.8,
      smoothWidth: 0.02,
    },
    toneMapping: {
      enabled: true,
      intensity: 1.1,
      exposure: 1.05,
      whitePoint: 1.0,
    },
  },
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
      quality: $postProcessing.qualityLevel,
    }
  },
)

export const adaptiveToneMappingConfig = derived(
  [postProcessingStore, toneMappingStore],
  ([$postProcessing, $toneMapping]) => {
    if (!$postProcessing.adaptiveQuality) return $toneMapping

    const qualityConfig = qualityConfigs[$postProcessing.qualityLevel]
    return {
      ...$toneMapping,
      ...qualityConfig.toneMapping,
      quality: $postProcessing.qualityLevel,
    }
  },
)

// Utility functions
export function setQualityLevel(level: QualityLevel) {
  postProcessingStore.update(config => ({
    ...config,
    qualityLevel: level,
  }))
}

export function togglePostProcessing() {
  postProcessingStore.update(config => ({
    ...config,
    enabled: !config.enabled,
  }))
}

export function enableAdaptiveQuality() {
  postProcessingStore.update(config => ({
    ...config,
    adaptiveQuality: true,
  }))
}

export function disableAdaptiveQuality() {
  postProcessingStore.update(config => ({
    ...config,
    adaptiveQuality: false,
  }))
}

// Performance-based quality adjustment
export function adjustQualityForPerformance(
  avgFPS: number,
  targetFPS: number = 60,
) {
  if (avgFPS < targetFPS * 0.7) {
    // Performance is poor, reduce quality
    postProcessingStore.update(config => {
      const currentIndex = [
        'ultra_low',
        'low',
        'medium',
        'high',
        'ultra',
      ].indexOf(config.qualityLevel)
      const newIndex = Math.max(0, currentIndex - 1)
      const newLevel = (
        ['ultra_low', 'low', 'medium', 'high', 'ultra'] as QualityLevel[]
      )[newIndex]

      runtimeDebugLog(
        `🔽 Reducing post-processing quality: ${config.qualityLevel} → ${newLevel}`,
      )
      return {
        ...config,
        qualityLevel: newLevel,
      }
    })
  } else if (avgFPS > targetFPS * 1.2) {
    // Performance is good, can increase quality
    postProcessingStore.update(config => {
      const currentIndex = [
        'ultra_low',
        'low',
        'medium',
        'high',
        'ultra',
      ].indexOf(config.qualityLevel)
      const newIndex = Math.min(4, currentIndex + 1)
      const newLevel = (
        ['ultra_low', 'low', 'medium', 'high', 'ultra'] as QualityLevel[]
      )[newIndex]

      if (newLevel !== config.qualityLevel) {
        runtimeDebugLog(
          `🔼 Increasing post-processing quality: ${config.qualityLevel} → ${newLevel}`,
        )
        return {
          ...config,
          qualityLevel: newLevel,
        }
      }
      return config
    })
  }
}

export function resetPostProcessingState() {
  postProcessingStore.set({ ...DEFAULT_POST_PROCESSING_CONFIG })
  bloomStore.set({ ...DEFAULT_BLOOM_CONFIG })
  toneMappingStore.set({ ...DEFAULT_TONE_MAPPING_CONFIG })
}

// Export all stores for easy import
export const postProcessingStores = {
  postProcessing: postProcessingStore,
  bloom: bloomStore,
  toneMapping: toneMappingStore,
  adaptiveBloom: adaptiveBloomConfig,
  adaptiveToneMapping: adaptiveToneMappingConfig,
}
