# Post-Processing Effect API Documentation

## Overview
The Threlte post-processing system provides a declarative, reactive approach to adding visual effects. Effects are implemented as Svelte components that automatically register with the central PostProcessing system.

## Creating a New Post-Processing Effect

### 1. Basic Effect Component Structure

Create a new Svelte component in `src/threlte/effects/YourEffect.svelte`:

```svelte
<!-- 
  YourEffect Component - Brief description
  Registers with PostProcessing component via context
-->
<script lang="ts">
import { onMount, onDestroy, getContext } from 'svelte'
import { YourEffect } from 'postprocessing'

// Effect configuration props
export let intensity = 1.0
export let enabled = true

// Mobile optimization
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
  navigator.userAgent
)

// Get post-processing context
const postProcessing = getContext('postprocessing')

// Effect instance
let yourEffect: YourEffect | null = null
const effectId = 'yourEffect' // Unique identifier

/**
 * Create your effect
 */
function createYourEffect() {
  try {
    // Mobile optimization adjustments
    const mobileIntensity = isMobile ? intensity * 0.7 : intensity
    
    yourEffect = new YourEffect({
      intensity: mobileIntensity,
      // ... other configuration
    })
    
    console.log(`✨ YourEffect created (mobile: ${isMobile})`)
    return yourEffect
    
  } catch (error) {
    console.error('❌ Failed to create YourEffect:', error)
    return null
  }
}

/**
 * Register effect with post-processing system
 */
function registerEffect() {
  if (!postProcessing) {
    console.warn('⚠️ PostProcessing context not available for YourEffect')
    return
  }
  
  const effect = createYourEffect()
  if (effect) {
    postProcessing.registerEffect(effectId, effect)
    
    if (!enabled) {
      postProcessing.disableEffect(effectId)
    }
  }
}

/**
 * Update effect properties
 */
function updateEffect() {
  if (!yourEffect) return
  
  const mobileIntensity = isMobile ? intensity * 0.7 : intensity
  yourEffect.intensity = mobileIntensity
}

onMount(() => {
  console.log('🎨 YourEffect component mounted')
  registerEffect()
})

onDestroy(() => {
  console.log('🧹 Cleaning up YourEffect')
  
  if (postProcessing) {
    postProcessing.unregisterEffect(effectId)
  }
  
  if (yourEffect) {
    yourEffect.dispose()
    yourEffect = null
  }
})

// Reactive updates
$: if (yourEffect) {
  updateEffect()
}

$: if (postProcessing) {
  if (enabled) {
    postProcessing.enableEffect(effectId)
  } else {
    postProcessing.disableEffect(effectId)
  }
}

// Export for external access
export { yourEffect }
</script>

<!-- This component has no visual output - it's an effect component -->
```

### 2. Store Integration (Optional)

If you want your effect to respond to quality level changes, add it to the post-processing store:

#### 2.1 Update `postProcessingStore.ts`

```typescript
// Add your effect configuration interface
export interface YourEffectConfig extends EffectConfig {
  yourProperty: number
}

// Add store for your effect
export const yourEffectStore: Writable<YourEffectConfig> = writable({
  enabled: true,
  intensity: 1.0,
  yourProperty: 0.5,
  quality: 'high'
})

// Add quality configurations
const qualityConfigs = {
  ultra_low: {
    // ... other effects
    yourEffect: { enabled: false, intensity: 0, yourProperty: 0.1 }
  },
  // ... add for all quality levels
}

// Add derived store for adaptive configuration
export const adaptiveYourEffectConfig = derived(
  [postProcessingStore, yourEffectStore],
  ([$postProcessing, $yourEffect]) => {
    if (!$postProcessing.adaptiveQuality) return $yourEffect
    
    const qualityConfig = qualityConfigs[$postProcessing.qualityLevel]
    return {
      ...$yourEffect,
      ...qualityConfig.yourEffect,
      quality: $postProcessing.qualityLevel
    }
  }
)
```

#### 2.2 Update your effect component to use the store

```svelte
<script lang="ts">
// Import your adaptive store
import { adaptiveYourEffectConfig } from '../stores/postProcessingStore'

onMount(() => {
  // Subscribe to adaptive configuration
  const unsubscribeStore = adaptiveYourEffectConfig.subscribe(config => {
    intensity = config.intensity
    yourProperty = config.yourProperty
    enabled = config.enabled
    
    if (yourEffect) {
      updateEffect()
    }
  })
  
  registerEffect()
  
  onDestroy(() => {
    unsubscribeStore()
  })
})
</script>
```

### 3. Add to the Game Component

In `Game.svelte`, import and add your effect:

```svelte
<script>
import YourEffect from './effects/YourEffect.svelte'
</script>

<PostProcessing>
  <!-- Other effects -->
  <YourEffect />
</PostProcessing>
```

## API Reference

### PostProcessing Context
The context provides these methods to effect components:

```typescript
interface PostProcessingContext {
  registerEffect(id: string, effect: any): void
  unregisterEffect(id: string): void
  enableEffect(id: string): void
  disableEffect(id: string): void
  getComposer(): EffectComposer | null
}
```

### Effect Component Lifecycle

1. **onMount**: Create and register the effect
2. **Reactive updates**: Update effect properties when props change
3. **Enable/disable**: Toggle effect based on `enabled` prop
4. **onDestroy**: Unregister and dispose of the effect

### Mobile Optimization Best Practices

1. **Reduce intensity** on mobile devices (typically 0.5x - 0.7x)
2. **Lower quality settings** (fewer samples, smaller resolutions)
3. **Disable expensive effects** on low-end devices
4. **Use simpler algorithms** when available

### Performance Considerations

1. **Disposal**: Always dispose of effects in `onDestroy`
2. **Recreation**: Some properties require recreating the effect
3. **Mobile detection**: Use hardware concurrency checks for low-end devices
4. **Quality levels**: Implement adaptive quality for different performance targets

## Examples

See existing effect components for reference:
- `BloomEffect.svelte` - Basic effect with mobile optimization
- `SSAOEffect.svelte` - Complex effect with recreation logic
- `ToneMappingEffect.svelte` - Mode-based effect with fallbacks
- `FXAAEffect.svelte` - Simple effect without configuration

## Debugging

- Check browser console for effect creation/disposal logs
- Use PostProcessing component's debug mode
- Monitor effect registry with Svelte DevTools
- Test on mobile devices for performance validation