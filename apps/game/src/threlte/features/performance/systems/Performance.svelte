<!--
  Threlte Performance Monitoring Component
  Tracks FPS metrics and drives adaptive quality via OptimizationManager.
-->
<script lang="ts">
  import { useTask, useThrelte } from '@threlte/core'
  import { onMount, createEventDispatcher } from 'svelte'
  import {
    fpsStore,
    frameTimeStore,
    memoryStore,
    renderInfoStore,
    longTaskStore,
    markLongTaskSupport,
    recordLongTask,
  } from '../stores/performanceStore'
  import { optimizationManager, OptimizationLevel } from '../OptimizationManager'

  // Props — matching what Game.svelte passes
  export let enablePerformanceMonitoring = true
  export let enableAutomaticOptimization = false
  export let targetFPS = 0  // 0 = derive from detected device type automatically

  const dispatch = createEventDispatcher()
  const { renderer } = useThrelte()

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
  const DEGRADE_THRESHOLD = 4   // 4s consistently under target * 0.75 → step down
  const UPGRADE_THRESHOLD = 12  // 12s consistently over target * 1.15 → step up
  let degradeCount = 0
  let upgradeCount = 0
  let longTaskObserver: PerformanceObserver | null = null

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
    console.log(`🔽 Performance: stepping quality down ${current} → ${next}`)
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
    console.log(`🔼 Performance: stepping quality up ${current} → ${next}`)
    optimizationManager.setOptimizationLevel(next)
    dispatch('qualityChanged', { from: current, to: next, reason: 'fps_good' })
    degradeCount = 0
    upgradeCount = 0
  }

  onMount(() => {
    lastTime = performance.now()
    startupTime = performance.now()

    const supportsLongTaskObserver =
      typeof PerformanceObserver !== 'undefined'
      && PerformanceObserver.supportedEntryTypes?.includes('longtask')

    markLongTaskSupport(supportsLongTaskObserver)

    if (supportsLongTaskObserver) {
      longTaskObserver = new PerformanceObserver((list) => {
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
        console.log('⏱️ Performance: startup grace period over, adaptive quality enabled')
      }
    }

    // Adaptive quality: adjust tier based on sustained FPS (after startup grace)
    if (enableAutomaticOptimization && startupGraceDone && fpsSamples.length >= 3) {
      if (avgFPS < effectiveTarget * 0.55 || currentFps < effectiveTarget * 0.45) {
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
