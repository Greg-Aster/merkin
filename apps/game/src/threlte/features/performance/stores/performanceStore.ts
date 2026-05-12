import { writable } from 'svelte/store'
import type { Writable } from 'svelte/store'

import {
  type QualitySettings,
  optimizationManager,
} from '../OptimizationManager'

export interface MemoryInfo {
  geometries: number
  textures: number
  programs: number
}

export interface RenderInfo {
  calls: number
  lines: number
  points: number
  triangles: number
}

export interface LongTaskInfo {
  supported: boolean
  count: number
  lastDuration: number
  maxDuration: number
  totalDuration: number
}

export interface SystemTimingInfo {
  lastMs: number
  avgMs: number
  maxMs: number
  samples: number
}

type OptimizationLevelChangedEvent = CustomEvent<{
  level: string
  qualitySettings: QualitySettings
}>

export const fpsStore: Writable<number> = writable(60)
export const frameTimeStore: Writable<number> = writable(16.67) // 60fps = 16.67ms
export const memoryStore: Writable<MemoryInfo> = writable({
  geometries: 0,
  textures: 0,
  programs: 0,
})
export const renderInfoStore: Writable<RenderInfo> = writable({
  calls: 0,
  lines: 0,
  points: 0,
  triangles: 0,
})
export const performanceGradeStore: Writable<string> = writable('A')
export const performanceScoreStore: Writable<number> = writable(100)
export const optimizationRecommendationsStore: Writable<string[]> = writable([])
export const longTaskStore: Writable<LongTaskInfo> = writable({
  supported: false,
  count: 0,
  lastDuration: 0,
  maxDuration: 0,
  totalDuration: 0,
})
export const systemTimingsStore: Writable<Record<string, SystemTimingInfo>> =
  writable({})

export const qualitySettingsStore: Writable<QualitySettings> = writable(
  optimizationManager.getQualitySettings(),
)

export const qualityLevelStore: Writable<string> = writable(
  optimizationManager.getOptimizationLevel(),
)

if (typeof window !== 'undefined') {
  window.addEventListener('optimizationLevelChanged', event => {
    const { qualitySettings, level } = (event as OptimizationLevelChangedEvent)
      .detail
    qualitySettingsStore.set(qualitySettings)
    qualityLevelStore.set(level)
  })
}

export function recordLongTask(duration: number): void {
  longTaskStore.update(current => ({
    supported: true,
    count: current.count + 1,
    lastDuration: duration,
    maxDuration: Math.max(current.maxDuration, duration),
    totalDuration: current.totalDuration + duration,
  }))
}

export function markLongTaskSupport(supported: boolean): void {
  longTaskStore.update(current => ({
    ...current,
    supported,
  }))
}

export function recordSystemTiming(name: string, durationMs: number): void {
  systemTimingsStore.update(current => {
    const previous = current[name]
    const nextSamples = (previous?.samples ?? 0) + 1
    const nextAvg = previous
      ? (previous.avgMs * previous.samples + durationMs) / nextSamples
      : durationMs

    return {
      ...current,
      [name]: {
        lastMs: durationMs,
        avgMs: nextAvg,
        maxMs: Math.max(previous?.maxMs ?? 0, durationMs),
        samples: nextSamples,
      },
    }
  })
}
