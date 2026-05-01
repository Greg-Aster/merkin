<!--
  Threlte Performance Monitoring Component
  Tracks FPS metrics and drives adaptive quality via OptimizationManager.
-->
<script lang="ts">
import { useTask, useThrelte } from '@threlte/core'
import { createEventDispatcher, onMount } from 'svelte'
import { OptimizationLevel, optimizationManager } from '../OptimizationManager'
import {
  fpsStore,
  frameTimeStore,
  longTaskStore,
  markLongTaskSupport,
  memoryStore,
  recordLongTask,
  renderInfoStore,
  systemTimingsStore,
} from '../stores/performanceStore'
import { getGltfCacheStats } from '../../../utils/gltfAssetCache'

// Props — matching what Game.svelte passes
export let enablePerformanceMonitoring = true
export let enableAutomaticOptimization = false
export let targetFPS = 0 // 0 = derive from detected device type automatically

const dispatch = createEventDispatcher()
const { renderer, scene } = useThrelte()
const isDev = import.meta.env.DEV

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
const DEGRADE_THRESHOLD = 4 // 4s consistently under target * 0.75 → step down
const UPGRADE_THRESHOLD = 12 // 12s consistently over target * 1.15 → step up
let degradeCount = 0
let upgradeCount = 0
let longTaskObserver: PerformanceObserver | null = null

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

const TIER_ORDER: OptimizationLevel[] = [
  OptimizationLevel.ULTRA_LOW,
  OptimizationLevel.LOW,
  OptimizationLevel.MEDIUM,
  OptimizationLevel.HIGH,
  OptimizationLevel.ULTRA,
]

function getEffectiveTargetFPS(): number {
  if (targetFPS > 0) return targetFPS
  const caps = optimizationManager.getDeviceCapabilities()
  if (!caps) return 60
  if (caps.deviceType === 'phone') return 30
  if (caps.deviceType === 'tablet') return 45
  return 60
}

function stepQualityDown() {
  const current = optimizationManager.getOptimizationLevel()
  const idx = TIER_ORDER.indexOf(current)
  if (idx <= 0) return
  const next = TIER_ORDER[idx - 1]
  if (isDev) {
    console.log(`🔽 Performance: stepping quality down ${current} → ${next}`)
  }
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
  if (isDev) {
    console.log(`🔼 Performance: stepping quality up ${current} → ${next}`)
  }
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

  const currentFps = Math.round((frameCount * 1000) / deltaTime)
  const currentFrameTime = deltaTime / frameCount

  if (enablePerformanceMonitoring) {
    fpsStore.set(currentFps)
    frameTimeStore.set(currentFrameTime)

    if (renderer.info) {
      memoryStore.set({
        geometries: renderer.info.memory.geometries,
        textures: renderer.info.memory.textures,
        programs: renderer.info.programs?.length || 0,
      })
      renderInfoStore.set({
        calls: renderer.info.render.calls,
        triangles: renderer.info.render.triangles,
        points: renderer.info.render.points,
        lines: renderer.info.render.lines,
      })
    }
  }

  // Rolling average
  fpsSamples.push(currentFps)
  if (fpsSamples.length > FPS_WINDOW) fpsSamples.shift()
  const avgFPS = fpsSamples.reduce((a, b) => a + b, 0) / fpsSamples.length

  const effectiveTarget = getEffectiveTargetFPS()

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
      if (isDev) {
        console.log(
          '⏱️ Performance: startup grace period over, adaptive quality enabled',
        )
      }
    }
  }

  // Adaptive quality: adjust tier based on sustained FPS (after startup grace)
  if (
    enableAutomaticOptimization &&
    startupGraceDone &&
    fpsSamples.length >= 3
  ) {
    if (
      avgFPS < effectiveTarget * 0.55 ||
      currentFps < effectiveTarget * 0.45
    ) {
      upgradeCount = 0
      degradeCount += 2
      if (degradeCount >= DEGRADE_THRESHOLD) {
        stepQualityDown()
      }
    } else if (avgFPS < effectiveTarget * 0.75) {
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
