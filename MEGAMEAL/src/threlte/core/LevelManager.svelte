<!--
  Industry-Standard Level Manager
  
  This component provides the infrastructure for any level to work with
  modular components. Drop this into any level and it handles all the
  cross-system communication automatically.
-->
<script lang="ts">
  import { onMount, onDestroy, setContext } from 'svelte'
  import { useTask, useThrelte } from '@threlte/core'
  import { SystemRegistry, type LevelContext } from './LevelSystem'
  import { LightingManager } from '../features/lighting'
  import { ECSWorldManager } from './ECSIntegration'

  // --- 1. Initialize Managers Immediately (without scene) ---
  export let registry: SystemRegistry = new SystemRegistry()
  const lighting = new LightingManager(registry) // Uses the updated constructor
  const ecsWorld = new ECSWorldManager(registry)

  // --- 2. Set Context Immediately ---
  // This ensures the context is available to all child components from the start.
  setContext('systemRegistry', registry)
  setContext('lightingManager', lighting)
  setContext('ecsWorld', ecsWorld)

  // The full levelContext can be passed down via slot props if needed,
  // or set here with placeholder values if child components depend on it.
  const levelContext: LevelContext = {
    scene: null,
    camera: null,
    renderer: null,
    eventBus: new EventTarget(),
    registry,
    lighting,
    ecsWorld
  }
  setContext('levelContext', levelContext)

  // Performance monitoring
  let lastFrameTime = performance.now()
  let frameCount = 0

  // --- 3. Safely Get Scene and Finalize Initialization in onMount ---
  onMount(() => {
    console.log('🏗️ Level Manager: onMount triggered.')

    // It is now safe to get the Threlte context.
    const { scene } = useThrelte()

    if (scene) {
      // Now that we have the scene, finalize the initialization
      // of the systems that need it.
      lighting.initialize(scene)
      levelContext.scene = scene // Update context if needed elsewhere
      console.log('💡 Level Manager: LightingManager initialized with scene.')
      console.log('✅ Level Manager: Ready')
    } else {
      console.error('❌ Level Manager: Scene not available onMount!')
    }
  })

  onDestroy(() => {
    console.log('🧹 Level Manager: Cleaning up...')
    registry.dispose()
  })

  // --- Main Update Loop ---
  useTask((delta) => {
    frameCount++
    
    // Update ECS world first (for performance-critical entities)
    ecsWorld.update(delta)
    
    // Update all registered components (high-level systems)
    for (const component of registry['components'].values()) {
      component.update(delta)
    }
    
    // Performance monitoring
    if (frameCount % 60 === 0) {
      const currentTime = performance.now()
      const frameTime = (currentTime - lastFrameTime) / 60
      
      if (frameTime > 20) {
        registry.sendMessage({
          type: 'performance_warning' as any,
          source: 'level-manager',
          data: { frameTime, recommendation: 'reduce_quality' },
          timestamp: Date.now(),
          priority: 'high'
        })
      }
      
      lastFrameTime = currentTime
    }
  })

  // --- Expose methods ---
  export function getRegistry() {
    return registry
  }

  export function getLightingManager() {
    return lighting
  }
</script>

<!-- Level content goes in the slot -->
<slot {registry} {lighting} {levelContext} />

<style>
  /* No styles needed */
</style>