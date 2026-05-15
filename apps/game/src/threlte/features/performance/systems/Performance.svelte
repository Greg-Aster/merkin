<!--
  Threlte Performance Monitoring Component
  Tracks FPS metrics and drives adaptive quality via OptimizationManager.
-->
<script lang="ts">
import { useTask, useThrelte } from '@threlte/core'
import { createEventDispatcher, onMount } from 'svelte'
import { setRuntimeDiagnostic } from '../../../stores/runtimeDiagnosticsStore'
import { recordRuntimeProductionTelemetry } from '../../../stores/runtimeProductionTelemetry'
import {
  evictUnusedGltfCacheEntries,
  getGltfCacheStats,
} from '../../../utils/gltfAssetCache'
import { runtimeDebugLog } from '../../../utils/runtimeLog'
import { OptimizationLevel, optimizationManager } from '../OptimizationManager'
import {
  fpsStore,
  frameTimeStore,
  longTaskStore,
  markLongTaskSupport,
  memoryStore,
  optimizationRecommendationsStore,
  performanceGradeStore,
  performanceScoreStore,
  recordLongTask,
  renderInfoStore,
  systemTimingsStore,
} from '../stores/performanceStore'
import { getRuntimeFrameRatePolicy } from '../utils/runtimeFrameRatePolicy'
import {
  classifyRuntimePerformancePressure,
  summarizeRuntimePerformancePressure,
} from '../utils/runtimePerformancePressure'

// Props — matching what Game.svelte passes
export let enablePerformanceMonitoring = true
export let enableAutomaticOptimization = false
export let targetFPS = 0 // 0 = derive from detected device type automatically

const dispatch = createEventDispatcher()
const { renderer, scene } = useThrelte()

// --- FPS tracking ---
let frameCount = 0
let lastTime = 0

// --- Adaptive quality state ---
// Rolling window of per-second FPS samples
const FPS_WINDOW = 10
const fpsSamples: number[] = []

// Startup grace period: don't adapt quality during initial load (terrain, physics, GLB uploads
// all cause temporary frame drops that shouldn't trigger permanent quality changes)
const STARTUP_GRACE_SECONDS = 6
let startupTime = 0
let startupGraceDone = false

// Hysteresis: require N consecutive bad/good samples before changing tier
const DEGRADE_THRESHOLD = 4 // 4s consistently below the cinematic low floor -> step down
const UPGRADE_THRESHOLD = 5 // 5s consistently over target * 1.15 -> step up
let degradeCount = 0
let upgradeCount = 0
let longTaskObserver: PerformanceObserver | null = null
let lastGltfCacheEvictionTime = 0

function collectSceneStats() {
  const materialSet = new Set<unknown>()
  const geometrySet = new Set<unknown>()
  const stats = {
    objects: 0,
    visibleObjects: 0,
    meshes: 0,
    visibleMeshes: 0,
    lights: 0,
    visibleLights: 0,
    pointLights: 0,
    visiblePointLights: 0,
    directionalLights: 0,
    visibleDirectionalLights: 0,
    materials: 0,
    geometries: 0,
  }

  scene?.traverse(object => {
    stats.objects += 1
    if (object.visible) stats.visibleObjects += 1

    const candidate = object as any
    if (candidate.isMesh) {
      stats.meshes += 1
      if (object.visible) stats.visibleMeshes += 1
      if (candidate.geometry) geometrySet.add(candidate.geometry)
      if (Array.isArray(candidate.material)) {
        candidate.material.forEach((material: unknown) =>
          materialSet.add(material),
        )
      } else if (candidate.material) {
        materialSet.add(candidate.material)
      }
    }

    if (candidate.isLight) {
      stats.lights += 1
      if (object.visible) stats.visibleLights += 1
    }
    if (candidate.isPointLight) {
      stats.pointLights += 1
      if (object.visible) stats.visiblePointLights += 1
    }
    if (candidate.isDirectionalLight) {
      stats.directionalLights += 1
      if (object.visible) stats.visibleDirectionalLights += 1
    }
  })

  stats.materials = materialSet.size
  stats.geometries = geometrySet.size
  return stats
}

function collectStreamingStats() {
  if (typeof window === 'undefined') {
    return {
      selectedRuntimeProfileId: null,
      selectedPlatformProfile: null,
      requestedAssetTier: null,
      levelAssetTierCap: null,
      selectedAssetTier: 'unknown',
      renderQualityTier: optimizationManager.getOptimizationLevel(),
      renderProfileId: null,
      renderProfileTier: null,
      activeCellCount: 0,
      activeActorCount: 0,
      activeRenderableActorCount: 0,
      requiredAssetCount: 0,
      deferredOptionalAssetCount: 0,
      gltfCacheBytes: 0,
    }
  }

  const levels = Object.values(window.__gameRuntimeStreamingState?.levels ?? {})
  const activeLevel = levels.at(-1)
  const aggregate = levels.reduce(
    (sum, level) => ({
      activeCellCount: sum.activeCellCount + level.activeCellCount,
      activeActorCount: sum.activeActorCount + level.activeActorCount,
      activeRenderableActorCount:
        sum.activeRenderableActorCount + level.activeRenderableActorCount,
      requiredAssetCount: sum.requiredAssetCount + level.requiredAssetCount,
      deferredOptionalAssetCount:
        sum.deferredOptionalAssetCount + level.deferredOptionalAssetCount,
      gltfCacheBytes: sum.gltfCacheBytes + level.gltfCacheBytes,
    }),
    {
      activeCellCount: 0,
      activeActorCount: 0,
      activeRenderableActorCount: 0,
      requiredAssetCount: 0,
      deferredOptionalAssetCount: 0,
      gltfCacheBytes: 0,
    },
  )

  return {
    selectedRuntimeProfileId: activeLevel?.selectedRuntimeProfileId ?? null,
    selectedPlatformProfile: activeLevel?.selectedPlatformProfile ?? null,
    requestedAssetTier: activeLevel?.requestedAssetTier ?? null,
    levelAssetTierCap: activeLevel?.levelAssetTierCap ?? null,
    selectedAssetTier: activeLevel?.selectedAssetTier ?? 'unknown',
    renderQualityTier:
      activeLevel?.renderQualityTier ??
      optimizationManager.getOptimizationLevel(),
    renderProfileId: activeLevel?.renderProfileId ?? null,
    renderProfileTier: activeLevel?.renderProfileTier ?? null,
    ...aggregate,
  }
}

const TIER_ORDER: OptimizationLevel[] = [
  OptimizationLevel.ULTRA_LOW,
  OptimizationLevel.LOW,
  OptimizationLevel.MEDIUM,
  OptimizationLevel.HIGH,
  OptimizationLevel.ULTRA,
]

function getEffectiveTargetFPS(): number {
  if (targetFPS > 0) return targetFPS
  return getRuntimeFrameRatePolicy().targetFps
}

function getEffectiveFrameRatePolicy() {
  return getRuntimeFrameRatePolicy(getEffectiveTargetFPS())
}

function getProfileMinimumQualityLevel() {
  const profile = optimizationManager.getRuntimeProfile()
  if (!profile?.expectedRuntimeTier) return null
  const normalized = profile.expectedRuntimeTier
    .trim()
    .toLowerCase()
    .replace(/[-\s]+/g, '_')
  return TIER_ORDER.includes(normalized as OptimizationLevel)
    ? (normalized as OptimizationLevel)
    : null
}

function stepQualityDown() {
  const current = optimizationManager.getOptimizationLevel()
  const idx = TIER_ORDER.indexOf(current)
  const minimum = getProfileMinimumQualityLevel()
  const minimumIdx = minimum ? TIER_ORDER.indexOf(minimum) : 0
  if (idx <= minimumIdx) return
  const next = TIER_ORDER[Math.max(minimumIdx, idx - 1)]
  runtimeDebugLog(`🔽 Performance: stepping quality down ${current} → ${next}`)
  optimizationManager.setOptimizationLevel(next)
  dispatch('qualityChanged', { from: current, to: next, reason: 'fps_low' })
  degradeCount = 0
  upgradeCount = 0
}

function stepQualityUp() {
  const current = optimizationManager.getOptimizationLevel()
  const idx = TIER_ORDER.indexOf(current)
  if (idx >= TIER_ORDER.length - 1) return
  const next = TIER_ORDER[idx + 1]
  runtimeDebugLog(`🔼 Performance: stepping quality up ${current} → ${next}`)
  optimizationManager.setOptimizationLevel(next)
  dispatch('qualityChanged', { from: current, to: next, reason: 'fps_good' })
  degradeCount = 0
  upgradeCount = 0
}

onMount(() => {
  lastTime = performance.now()
  startupTime = performance.now()

  const supportsLongTaskObserver =
    typeof PerformanceObserver !== 'undefined' &&
    PerformanceObserver.supportedEntryTypes?.includes('longtask')

  markLongTaskSupport(supportsLongTaskObserver)

  if (supportsLongTaskObserver) {
    longTaskObserver = new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        recordLongTask(entry.duration)
      }
    })

    longTaskObserver.observe({ entryTypes: ['longtask'] })
  }

  if (typeof window !== 'undefined') {
    window.__megamealDiagnostics = {
      getSnapshot: () => ({
        fps: $fpsStore,
        frameTime: $frameTimeStore,
        longTasks: $longTaskStore,
        systemTimings: $systemTimingsStore,
        renderInfo: renderer.info
          ? {
              calls: renderer.info.render.calls,
              triangles: renderer.info.render.triangles,
              points: renderer.info.render.points,
              lines: renderer.info.render.lines,
              geometries: renderer.info.memory.geometries,
              textures: renderer.info.memory.textures,
              programs: renderer.info.programs?.length || 0,
            }
          : null,
        scene: collectSceneStats(),
        streaming: collectStreamingStats(),
        gltfCache: getGltfCacheStats(),
        quality: optimizationManager.getOptimizationLevel(),
      }),
    }
  }

  return () => {
    longTaskObserver?.disconnect()
    longTaskObserver = null
  }
})

useTask(() => {
  frameCount++
  const currentTime = performance.now()
  const deltaTime = currentTime - lastTime

  // Sample once per second
  if (deltaTime < 1000) return

  if (currentTime - lastGltfCacheEvictionTime >= 5000) {
    lastGltfCacheEvictionTime = currentTime
    const deviceMemory =
      typeof navigator !== 'undefined'
        ? (navigator as any).deviceMemory
        : undefined
    const memoryPressure =
      typeof deviceMemory === 'number' && deviceMemory <= 4
        ? 'high'
        : typeof deviceMemory === 'number' && deviceMemory <= 8
          ? 'medium'
          : 'normal'
    evictUnusedGltfCacheEntries({
      maxUnreferencedEntries: memoryPressure === 'high' ? 1 : 4,
      maxUnusedAgeMs: memoryPressure === 'high' ? 2000 : 8000,
      maxUnreferencedBytes:
        memoryPressure === 'high'
          ? 32 * 1024 * 1024
          : memoryPressure === 'medium'
            ? 64 * 1024 * 1024
            : 128 * 1024 * 1024,
      memoryPressure,
    })
  }

  const currentFps = Math.round((frameCount * 1000) / deltaTime)
  const currentFrameTime = deltaTime / frameCount

  if (enablePerformanceMonitoring) {
    fpsStore.set(currentFps)
    frameTimeStore.set(currentFrameTime)

    if (renderer.info) {
      const memory = {
        geometries: renderer.info.memory.geometries,
        textures: renderer.info.memory.textures,
        programs: renderer.info.programs?.length || 0,
      }
      const renderInfo = {
        calls: renderer.info.render.calls,
        triangles: renderer.info.render.triangles,
        points: renderer.info.render.points,
        lines: renderer.info.render.lines,
      }
      memoryStore.set(memory)
      renderInfoStore.set(renderInfo)
      const streaming = collectStreamingStats()
      const gltfCache = getGltfCacheStats()
      const frameRatePolicy = getEffectiveFrameRatePolicy()
      const pressure = classifyRuntimePerformancePressure({
        fps: currentFps,
        frameTimeMs: currentFrameTime,
        targetFps: frameRatePolicy.targetFps,
        lowFps: frameRatePolicy.lowFps,
        renderInfo,
        memory,
        longTasks: $longTaskStore,
        streaming,
        gltfCache,
      })
      const performanceSummary = summarizeRuntimePerformancePressure(pressure)
      performanceScoreStore.set(performanceSummary.score)
      performanceGradeStore.set(performanceSummary.grade)
      optimizationRecommendationsStore.set(performanceSummary.recommendations)
      recordRuntimeProductionTelemetry({
        timestamp: Date.now(),
        fps: currentFps,
        frameTimeMs: currentFrameTime,
        quality: optimizationManager.getOptimizationLevel(),
        renderInfo,
        memory,
        streaming,
        gltfCache,
      })
      setRuntimeDiagnostic('rendererFrame', {
        label: 'Renderer Frame',
        level: 'ready',
        message: `${renderInfo.calls} draw call(s), ${renderInfo.triangles} triangle(s), ${memory.textures} texture(s).`,
        meta: {
          renderInfo,
          memory,
          scene: collectSceneStats(),
        },
      })
      setRuntimeDiagnostic('performancePressure', {
        label: 'Performance Pressure',
        level: pressure.level === 'ready' ? 'ready' : 'warning',
        message:
          pressure.level === 'critical'
            ? `Critical: ${pressure.message}`
            : pressure.message,
        meta: {
          pressure,
          streaming,
          gltfCache,
        },
      })
    }
  }

  // Rolling average
  fpsSamples.push(currentFps)
  if (fpsSamples.length > FPS_WINDOW) fpsSamples.shift()
  const avgFPS = fpsSamples.reduce((a, b) => a + b, 0) / fpsSamples.length

  const frameRatePolicy = getEffectiveFrameRatePolicy()
  const effectiveTarget = frameRatePolicy.targetFps

  dispatch('performanceUpdate', {
    currentFPS: currentFps,
    averageFPS: Math.round(avgFPS),
    targetFPS: effectiveTarget,
  })

  // Check startup grace period
  if (!startupGraceDone) {
    const elapsedSeconds = (performance.now() - startupTime) / 1000
    if (elapsedSeconds >= STARTUP_GRACE_SECONDS) {
      startupGraceDone = true
      // Reset counters so we measure from a clean baseline
      degradeCount = 0
      upgradeCount = 0
      fpsSamples.length = 0
      runtimeDebugLog(
        '⏱️ Performance: startup grace period over, adaptive quality enabled',
      )
    }
  }

  // Adaptive quality: adjust tier based on sustained FPS (after startup grace)
  if (
    enableAutomaticOptimization &&
    startupGraceDone &&
    fpsSamples.length >= 3
  ) {
    if (
      avgFPS < frameRatePolicy.criticalFps ||
      currentFps < frameRatePolicy.criticalFps
    ) {
      upgradeCount = 0
      degradeCount += 2
      if (degradeCount >= DEGRADE_THRESHOLD) {
        stepQualityDown()
      }
    } else if (avgFPS < frameRatePolicy.lowFps) {
      upgradeCount = 0
      degradeCount++
      if (degradeCount >= DEGRADE_THRESHOLD) {
        stepQualityDown()
      }
    } else if (avgFPS > effectiveTarget * 1.15) {
      degradeCount = 0
      upgradeCount++
      if (upgradeCount >= UPGRADE_THRESHOLD) {
        stepQualityUp()
      }
    } else {
      // Within acceptable range — slowly reset counters
      degradeCount = Math.max(0, degradeCount - 1)
      upgradeCount = Math.max(0, upgradeCount - 1)
    }
  }

  frameCount = 0
  lastTime = currentTime
})
</script>
