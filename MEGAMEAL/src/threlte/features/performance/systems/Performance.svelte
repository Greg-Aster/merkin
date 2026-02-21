<!--
  Threlte Performance Monitoring Component
  This is a "headless" component that calculates raw performance metrics
  and updates the central performance stores.
-->
<script lang="ts">
  import { useTask, useThrelte } from '@threlte/core'
  import { onMount } from 'svelte'
  import {
    fpsStore,
    frameTimeStore,
    memoryStore,
    renderInfoStore,
  } from '../stores/performanceStore'

  // Get access to the renderer
  const { renderer } = useThrelte()

  let frameCount = 0
  let lastTime = 0

  onMount(() => {
    lastTime = performance.now()
  })

  // Use Threlte's task loop to count frames
  useTask(() => {
    frameCount++
    const currentTime = performance.now()
    const deltaTime = currentTime - lastTime

    // Update the metrics in the store roughly every second
    if (deltaTime >= 1000) {
      const currentFps = Math.round((frameCount * 1000) / deltaTime)
      const currentFrameTime = deltaTime / frameCount

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

      frameCount = 0
      lastTime = currentTime
    }
  })
</script>