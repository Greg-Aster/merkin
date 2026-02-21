<!--
  Modular Lighting Component
  
  This component handles level-specific lighting like directional lights,
  ambient lighting, etc. It automatically integrates with the lighting system.
-->
<script lang="ts">
  import { onMount, getContext } from 'svelte'
  import * as THREE from 'three'
  import { 
    BaseLevelComponent, 
    ComponentType, 
    MessageType,
    type LevelContext,
    type SystemMessage 
  } from '../../core/LevelSystem'

  // Props for lighting configuration
  export let ambientColor = 0x404060
  export let ambientIntensity = 10.0
  export let directionalLights: Array<{
    position: [number, number, number]
    color: string | number
    intensity: number
    castShadow?: boolean
    shadowMapSize?: number
  }> = []

  // Get level context
  const registry = getContext('systemRegistry')
  const lightingManager = getContext('lightingManager')

  /**
   * Lighting Component Implementation
   */
  class LightingComponent extends BaseLevelComponent {
    readonly id = 'lighting-component'
    readonly type = ComponentType.LIGHTING

    protected async onInitialize(): Promise<void> {
      console.log('💡 Lighting: Initializing...')
      this.setupLighting()
    }

    protected onUpdate(deltaTime: number): void {
      // Lighting is generally static, but could animate if needed
    }

    protected onMessage(message: SystemMessage): void {
      // Could respond to performance warnings by reducing shadow quality
    }

    protected onDispose(): void {
      // Lighting cleanup if needed
    }

    private setupLighting(): void {
      if (!lightingManager) return

      // Set ambient lighting
      lightingManager.updateAmbientLight(
        new THREE.Color(ambientColor),
        ambientIntensity
      )

      // Add directional lights
      directionalLights.forEach(light => {
        const direction = new THREE.Vector3(...light.position).normalize()
        const color = new THREE.Color(light.color)
        
        lightingManager.addDirectionalLight(
          direction,
          color,
          light.intensity,
          light.castShadow || false
        )
      })

      console.log(`✅ Lighting: Setup ${directionalLights.length} directional lights`)
    }
  }

  // Create and register the component
  let component: LightingComponent

  onMount(async () => {
    if (registry) {
      component = new LightingComponent()
      registry.registerComponent(component)
      
      // Initialize with level context
      const levelContext = getContext('levelContext')
      if (levelContext) {
        await component.initialize(levelContext)
      }
    }
  })
</script>

<!-- Light rendering now handled by LightingManager -->

<style>
  /* No styles needed */
</style>