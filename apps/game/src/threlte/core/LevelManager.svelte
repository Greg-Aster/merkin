<script lang="ts">
import { useTask, useThrelte } from '@threlte/core'
import { onDestroy, onMount, setContext } from 'svelte'
import { LightingManager } from '../features/lighting'
import { recordSystemTiming } from '../features/performance/stores/performanceStore'
import { runtimeDebugLog } from '../utils/runtimeLog'
import { ECSWorldManager } from './ECSIntegration'
import { type LevelContext, MessageType, SystemRegistry } from './LevelSystem'

export let registry: SystemRegistry = new SystemRegistry()
const lighting = new LightingManager(registry)
const ecsWorld = new ECSWorldManager()
const threlte = useThrelte()

setContext('systemRegistry', registry)
setContext('lightingManager', lighting)
setContext('ecsWorld', ecsWorld)

const levelContext: LevelContext = {
  scene: null,
  camera: null,
  renderer: null,
  eventBus: new EventTarget(),
  registry,
  lighting,
  ecsWorld,
}
setContext('levelContext', levelContext)

let lastFrameTime = performance.now()
let frameCount = 0

onMount(() => {
  runtimeDebugLog('Level Manager: onMount triggered.')

  if (threlte.scene) {
    lighting.initialize(threlte.scene)
    levelContext.scene = threlte.scene
    levelContext.camera = threlte.camera ?? null
    levelContext.renderer = threlte.renderer ?? null
    runtimeDebugLog('Level Manager: Ready')
  } else {
    console.error('Level Manager: Scene not available onMount.')
  }
})

onDestroy(() => {
  runtimeDebugLog('Level Manager: Cleaning up.')
  registry.dispose()
})

useTask(delta => {
  frameCount++

  const ecsStart = performance.now()
  ecsWorld.update(delta)
  recordSystemTiming('ecsWorld', performance.now() - ecsStart)

  const componentsStart = performance.now()
  registry.updateComponents(delta)
  recordSystemTiming('levelComponents', performance.now() - componentsStart)

  if (frameCount % 60 === 0) {
    const currentTime = performance.now()
    const frameTime = (currentTime - lastFrameTime) / 60

    if (frameTime > 20) {
      registry.sendMessage({
        type: MessageType.PERFORMANCE_WARNING,
        source: 'level-manager',
        data: { frameTime, recommendation: 'reduce_quality' },
        timestamp: Date.now(),
        priority: 'high',
      })
    }

    lastFrameTime = currentTime
  }
})

export function getRegistry() {
  return registry
}

export function getLightingManager() {
  return lighting
}
</script>

<slot {registry} {lighting} {levelContext} />
