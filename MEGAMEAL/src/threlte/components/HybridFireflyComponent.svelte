<!--
  HybridFireflyComponent - Modern ECS Architecture with Performant Glow Effect

  This component uses the full ECS architecture and combines it with a high-performance,
  shader-based rendering method for a soft "bloom" effect on each firefly.

  - ECS entities for high-performance firefly management
  - Shader-based Points rendering for a fuzzy glow (replaces InstancedMesh)
  - Perfect legacy visual parameters preserved
  - Device-aware optimization with OptimizationManager
  - Modern component lifecycle management
-->
<script lang="ts">
  import { onMount, getContext } from 'svelte'
  import { T, useTask, useThrelte } from '@threlte/core'
  import * as THREE from 'three'
  import { qualitySettingsStore } from '../features/performance'
  import { bloomStore } from '../stores/postProcessingStore'
  import { OptimizationLevel, optimizationManager } from '../features/performance'
  import {
    BaseLevelComponent,
    ComponentType,
    MessageType,
    type LevelContext,
    type SystemMessage
  } from '../core/LevelSystem'
  import {
    fireflyQuery,
    Position,
    LightEmitter,
    LightCycling
  } from '../core/ECSIntegration'
  import StarSprite from './StarSprite.svelte'
  import { gameActions } from '../stores/gameStateStore'
  
  // Import our modern character system
  import { 
    getObservatoryContext 
  } from '../features/conversation'
  
  // Import the modern character system
  import { characterRegistry } from '../features/conversation'
  
  // Import conversation system
  import {
    conversationActions,
    isConversationActive,
  } from '../features/conversation'
  
  // Import the new efficient lighting system
  import { FireflyLightingSystem } from '../features/lighting'

  // Enhanced FireflyVisual interface with AI personality data
  interface FireflyVisual {
    id: number
    position: [number, number, number]
    color: number
    size: number
    intensity: number
    twinkleSpeed: number
    animationOffset: number
    // Enhanced interactive properties with AI personality
    name: string
    species: string
    age: number // Keep as number for consistency with ECS system
    characterId?: string | null // Character ID for modern system
    isClickable: boolean
    isHovered?: boolean
    isConversational: boolean // New: indicates if this firefly supports AI conversations
    basicResponse?: string // For non-conversational fireflies
  }

  // Props with perfect legacy visual parameters
  export let count = 100
  export let colors = [0x87ceeb, 0x98fb98, 0xffffe0, 0xdda0dd, 0xf0e68c, 0xffa07a, 0x20b2aa, 0x9370db]
  export let emissiveIntensity = 15.0 // Kept for logic, but not directly used by new material
  export let lightIntensity = 40.0
  export let lightRange = 300
  export let cycleDuration = 12.0
  export let fadeSpeed = 2.0
  export let heightRange = { min: 0.5, max: 2.5 }
  export let radius = 30
  export let size = 0.015 // Kept for ECS logic
  export let pointSize = 25.0 // Controls the visual size of the firefly glow
  // Removed unused shader-related props - now handled by StarSprite component
  export let movement = {
    speed: 0.2,
    wanderSpeed: 0.004,
    wanderRadius: 4,
    floatAmplitude: { x: 1.5, y: 0.5, z: 1.5 },
    lerpFactor: 1.0
  }
  export let getHeightAt: ((x: number, z: number) => number) | undefined = undefined
  export let environmentReady = true // Allow external control of when to create fireflies
  export let interactionSystem: any = null // Centralized interaction system from Game
  
  // AI Conversation enhancement props
  export let enableAIConversations = false // Enable AI-powered conversations
  export let conversationChance = 0.2 // Percentage of fireflies that are conversational (0.0 - 1.0)
  
  // Component-specific optimization settings
  const fireflyOptimizationConfig = {
    [OptimizationLevel.ULTRA_LOW]: {
      maxParticleCount: 15,
      particleSize: 15.0,
      enableGlow: false,
      updateFrequency: 0.5, // Update every 2 seconds
      enableInteractions: false
    },
    [OptimizationLevel.LOW]: {
      maxParticleCount: 20,
      particleSize: 20.0,
      enableGlow: true,
      updateFrequency: 0.33, // Update every 3 seconds
      enableInteractions: true
    },
    [OptimizationLevel.MEDIUM]: {
      maxParticleCount: 40,
      particleSize: 25.0,
      enableGlow: true,
      updateFrequency: 0.2, // Update every 5 seconds
      enableInteractions: true
    },
    [OptimizationLevel.HIGH]: {
      maxParticleCount: 60,
      particleSize: 30.0,
      enableGlow: true,
      updateFrequency: 0.1, // Update every 10 seconds
      enableInteractions: true
    },
    [OptimizationLevel.ULTRA]: {
      maxParticleCount: 80,
      particleSize: 35.0,
      enableGlow: true,
      updateFrequency: 0.05, // Update every 20 seconds
      enableInteractions: true
    }
  }

  // Get level context (modern component architecture)
  const registry = getContext('systemRegistry')
  const ecsWorld = getContext('ecsWorld')
  const lightingManager = getContext('lightingManager')

  // --- REACTIVE OPTIMIZATION SETTINGS ---
  // Use reactive store instead of manual OptimizationManager calls
  $: optimizedMaxLights = $qualitySettingsStore.maxFireflyLights
  
  // Get component-specific optimization settings
  $: currentFireflySettings = optimizationManager.getComponentSettings('hybrid-firefly-component')
  $: optimizedCount = currentFireflySettings.maxParticleCount || (optimizedMaxLights === 0 ? Math.min(count, 30) : count)
  $: optimizedPointSize = currentFireflySettings.particleSize || pointSize
  $: optimizedEnableGlow = currentFireflySettings.enableGlow !== undefined ? currentFireflySettings.enableGlow : true
  $: optimizedEnableInteractions = currentFireflySettings.enableInteractions !== undefined ? currentFireflySettings.enableInteractions : true

  // ECS entities (modern architecture)
  let fireflyEntities: number[] = []
  
  // Visual firefly data for StarSprite rendering
  let visualFireflies: FireflyVisual[] = []
  let fireflySprites: THREE.Sprite[] = [] // Track sprites for interaction system

  // Performance objects (simplified - no more complex lighting management)
  const tempColor = new THREE.Color()

  /**
   * Modern Component Class following documented architecture
   */
  class HybridFireflyComponent extends BaseLevelComponent {
    readonly id = 'hybrid-firefly-component'
    readonly type = ComponentType.PARTICLE_SYSTEM

    protected async onInitialize(): Promise<void> {
      console.log('✅ HybridFirefly: Initializing with modern ECS architecture...')
      if (!ecsWorld) {
        console.error('❌ ECS World required for modern architecture')
        return
      }
      
      // Set up terrain following
      if (getHeightAt && ecsWorld.setTerrainHeightFunction) {
        ecsWorld.setTerrainHeightFunction(getHeightAt)
        console.log('✅ HybridFirefly: Terrain following enabled')
      }
      
      // Create ECS entities for logic and visual data for rendering
      this.createECSFireflies()
      await this.setupVisualFireflies()
      console.log(`✅ HybridFirefly: Created ${optimizedCount} ECS entities with StarSprite visuals`)
    }

    protected onUpdate(deltaTime: number): void {
      // Update visual firefly data from ECS
      this.updateVisualFireflies()
    }

    protected onMessage(message: SystemMessage): void {
      // ... (no changes needed here)
    }

    protected onDispose(): void {
      // Clean up the new lighting system
      if (fireflyLightingSystem) {
        fireflyLightingSystem.dispose()
        fireflyLightingSystem = null
      }
      
      // StarSprite components handle their own disposal
      console.log('✅ HybridFirefly: Disposed properly')
    }

    private createECSFireflies(): void {
      if (!ecsWorld) {
        console.error('❌ createECSFireflies: ecsWorld is not available')
        return
      }
      
      // Validate terrain function before creating fireflies
      if (!getHeightAt) {
        console.warn('🧚 Warning: No terrain height function available - fireflies may spawn below ground')
      } else {
        // Test the terrain function at center
        const testHeight = getHeightAt(0, 0)
        console.log(`🧚 Firefly spawn: Terrain function working, center height = ${testHeight.toFixed(2)}`)
      }
      
      fireflyEntities = []
      console.log(`🧚 Creating ${optimizedCount} ECS fireflies...`)
      
      for (let i = 0; i < optimizedCount; i++) {
        const angle = Math.random() * Math.PI * 2
        const radiusPos = Math.pow(Math.random(), 2) * radius
        const x = Math.cos(angle) * radiusPos
        const z = Math.sin(angle) * radiusPos
        // Ensure fireflies spawn above ground with safety margin
        const groundHeight = getHeightAt ? getHeightAt(x, z) : 0
        const safetyMargin = 1.0 // Extra buffer to ensure above ground
        const minHeight = Math.max(groundHeight + heightRange.min, groundHeight + safetyMargin)
        const maxHeight = groundHeight + heightRange.max
        const y = minHeight + Math.random() * (maxHeight - minHeight)
        
        // Spawn position validation in development only
        if (import.meta.env.DEV && i < 2 && y < groundHeight) {
          console.warn(`⚠️ Firefly ${i} spawned below ground: y=${y.toFixed(2)}, ground=${groundHeight.toFixed(2)}`)
        }
        const position = new THREE.Vector3(x, y, z)
        const color = colors[Math.floor(Math.random() * colors.length)]

        // ECS firefly creation - debug logs removed for performance
        
        const entity = ecsWorld.createFirefly(position, color, {
            lightIntensity, lightRange, cycleDuration,
            floatAmplitude: movement.floatAmplitude.y,
            wanderRadius: movement.wanderRadius,
            size, emissiveIntensity
        });
        fireflyEntities.push(entity)
      }
      
      console.log(`✅ Created ${fireflyEntities.length} ECS firefly entities`)
    }

    public async setupVisualFireflies(): Promise<void> {
      // Generate character assignments if conversations are enabled
      let characterAssignments: string[] = []
      if (enableAIConversations) {
        const conversationalCount = Math.floor(optimizedCount * conversationChance)
        
        try {
          // Auto-discover available characters from the registry
          const availableCharacters = await characterRegistry.getAvailableCharacterIds()
          
          // Assign characters to conversational fireflies
          for (let i = 0; i < conversationalCount; i++) {
            const characterId = availableCharacters[i % availableCharacters.length]
            characterAssignments.push(characterId)
          }
          
          if (import.meta.env.DEV) console.log(`🧠 Auto-discovered and assigned ${characterAssignments.length} characters to conversational fireflies`)
        } catch (error) {
          console.error('❌ Failed to auto-discover characters:', error)
          // Fallback: disable conversations for this session
          if (import.meta.env.DEV) console.warn('🔄 Disabling AI conversations due to character discovery failure')
        }
      }
      
      // Nonverbal responses for basic fireflies - lost souls without full personalities
      const basicPersonalities = [
        '*glows with curiosity, then dims sadly*',
        '*speaks in a language you do not understand... the words fade like whispers*',
        '*flickers weakly* Where... where am I?',
        '*pulses with longing* We are all lost here...',
        '*light grows dim, barely visible* I... miss... someone...',
        '*flashes frantically, then goes dark for a moment*',
        '*glows softly, as if trying to remember something important*',
        '*dances in erratic patterns, clearly confused*',
        '*A faint, sorrowful hum accompanies its gentle, pulsing light.*',
        '*Its light traces the shape of a forgotten symbol in the air before fading.*',
        'I remember a name, but not whose it was... Was it mine?',
        '*Flickers in time with a slow, mournful melody only it can hear.*',
        'We were promised a dawn that never came.',
        '*Its light seems to search for something, or someone, in the darkness.*',
        'Have you seen the others? They were just here...',
        '*A single, bright flash, followed by a long, sorrowful dimming.*',
        'The stars feel so far away tonight.',
        '*It spells out a single, desperate word in points of light: "Wait."*',
        '*Pulses with a soft, warm glow, like a distant, cherished memory.*',
        'I was on my way to... I can\'t recall. It was important, though.'
      ]
      
      visualFireflies = fireflyEntities.map((eid, i) => {
        // Determine if this firefly gets a character assignment
        const hasCharacterAssignment = enableAIConversations && i < characterAssignments.length
        const characterId = hasCharacterAssignment ? characterAssignments[i] : null
        
        // Use character data if available, otherwise use basic system
        const species = hasCharacterAssignment ? 'Lost Soul' : 'Common Eastern Firefly'
        const name = hasCharacterAssignment && characterId ? 
          characterId.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') : 
          `${species} ${i + 1}`
        const age = Math.floor(Math.random() * 30) + 10
        const basicPersonality = basicPersonalities[Math.floor(Math.random() * basicPersonalities.length)]
        
        return {
          id: eid,
          position: [Position.x[eid], Position.y[eid], Position.z[eid]] as [number, number, number],
          color: LightEmitter.color[eid],
          size: optimizedPointSize * 0.05, // Convert point size to sprite scale with optimization
          intensity: 1.0,
          twinkleSpeed: 0.8 + Math.random() * 0.4,
          animationOffset: Math.random() * Math.PI * 2,
          // Enhanced interactive properties
          name: name,
          species: species,
          age: age,
          basicResponse: basicPersonality, // For non-conversational fireflies
          characterId: characterId, // Character ID for modern system
          isClickable: optimizedEnableInteractions,
          isHovered: false,
          isConversational: hasCharacterAssignment && optimizedEnableInteractions // New flag
        }
      })
      
      if (import.meta.env.DEV) console.log(`✨ Created ${visualFireflies.length} fireflies (${characterAssignments.length} with character personalities)`)
    }

    private updateVisualFireflies(): void {
      if (!ecsWorld || typeof ecsWorld.getWorld !== 'function') return
      
      const world = ecsWorld.getWorld()
      const entities = fireflyQuery(world)
      
      // Pre-calculate normalization factor
      const intensityNorm = 1.0 / lightIntensity

      for (let i = 0; i < entities.length && i < visualFireflies.length; i++) {
        const eid = entities[i]
        const visual = visualFireflies[i]
        
        if (!visual) continue
        
        // Update position from ECS
        visual.position[0] = Position.x[eid]
        visual.position[1] = Position.y[eid]
        visual.position[2] = Position.z[eid]

        // Update intensity from ECS with light cycling
        const baseIntensity = LightEmitter.intensity[eid]
        const fadeProgress = LightCycling.fadeProgress[eid]
        visual.intensity = Math.min(baseIntensity * intensityNorm, 1.0) * fadeProgress
        
        // Update color from ECS
        visual.color = LightEmitter.color[eid]
      }
      
      // Trigger reactivity
      visualFireflies = visualFireflies
    }

    // getActiveLightsFromECS method removed - now handled by FireflyLightingSystem

    public handleDiscovery(): void {
      // ... (no changes needed here)
    }
  }

  // Create and register the component
  let component: HybridFireflyComponent
  onMount(async () => {
    // Register firefly-specific optimization settings
    optimizationManager.registerComponent('hybrid-firefly-component', {
      componentId: 'hybrid-firefly-component',
      optimizationSettings: fireflyOptimizationConfig
    })
    
    console.log('🧚‍♀️ HybridFirefly: Registered component-specific optimization settings')
    
    if (registry && typeof registry.registerComponent === 'function') {
      component = new HybridFireflyComponent()
      registry.registerComponent(component)
      const levelContext = getContext('levelContext')
      if (levelContext) {
        await component.initialize(levelContext)
      }
    }

    // Light pool initialization now handled by FireflyLightingSystem

    // Gracefully enable bloom after a short delay
    setTimeout(() => {
      bloomStore.update(config => ({ ...config, enabled: true }));
    }, 2000); // 2-second delay
  })

  let fireflyLightingSystem: FireflyLightingSystem | null = null

  // Initialize the lighting system once we have the required dependencies
  $: if (lightingManager && ecsWorld && !fireflyLightingSystem) {
    fireflyLightingSystem = new FireflyLightingSystem(lightingManager, ecsWorld, {
      maxLights: Math.min(optimizedMaxLights, 25), // Respect optimization limits
      updateFrequency: 15, // 15 Hz updates instead of 60 Hz
      twinkleSpeed: 0.8,
      fadeSpeed: 2.0,
      cullingDistance: 200
    })
    
    if (import.meta.env.DEV) console.log('✨ Initialized efficient FireflyLightingSystem')
  }

  // Get camera from Threlte context
  const { camera } = useThrelte()

  // Much simpler update loop - just delegate to the lighting system
  useTask((delta) => {
    if (!component || !fireflyLightingSystem || !$camera) return

    // Update ECS systems first (this is still needed for firefly movement)
    if (ecsWorld && typeof ecsWorld.update === 'function') {
      ecsWorld.update(delta)
    }

    // Update the dedicated lighting system (handles all the complex lighting logic)
    fireflyLightingSystem.update(delta, $camera)

    // Update component's visual representation
    component.onUpdate(delta)
  })

  // Remove problematic reactive statements that cause infinite loops
  // Firefly recreation should be handled through proper component lifecycle

  // Reactive handling of optimization changes - now handled by reactive statements above

  // REMOVED: Broken reactive system that violates ECS principles

  // --- FIREFLY AI CONVERSATION SYSTEM ---
  
  // No longer need ConversationManager - using store actions directly

  // --- FIREFLY INTERACTION HANDLERS ---
  
  async function handleFireflyClick(data: any) {
  const { sprite, index, timestamp, ...firefly } = data;
  console.log('✨ Firefly clicked:', firefly.name);

  // Check if this firefly has a character assignment for conversations
  if (enableAIConversations && firefly.isConversational && firefly.characterId) {
    // It's a conversational firefly. Use the ConversationManager.
    console.log(`🤖 Starting AI conversation with ${firefly.name} using character: ${firefly.characterId}`);
    await handleConversationalFirefly(firefly);
    gameActions.recordInteraction('firefly_ai_conversation', firefly.id || 'unknown');
  } else {
    // It's a basic firefly. Use the modern conversation system for simple text.
    handleBasicFirefly(firefly);
  }

  // This part can remain for other effects
  if (typeof triggerDiscovery === 'function') {
    triggerDiscovery();
  }

  if (import.meta.env.DEV) console.log(`✨ Clicked firefly: ${firefly.name}`)
  }
  
  // Helper function for handling conversational fireflies with store actions directly
  async function handleConversationalFirefly(firefly: any) {
    try {
      const character = await characterRegistry.getCharacter(firefly.characterId)
      if (character) {
        // Convert FireflyPersonality to NPCPersonality format for conversation system
        const npcPersonality = characterRegistry.convertToNPCPersonality(character)
        
        // Use store actions directly - no need for legacy ConversationManager
        await conversationActions.startConversation(
          firefly.characterId,
          npcPersonality,
          {
            firefly: firefly,
            location: 'observatory',
            type: 'firefly_conversation'
          }
        )
        if (import.meta.env.DEV) console.log('✅ Started AI conversation via store system with converted personality')
      } else {
        console.error(`❌ Failed to load character: ${firefly.characterId}`)
        handleBasicFirefly(firefly)
      }
    } catch (error) {
      console.error(`❌ Error loading character ${firefly.characterId}:`, error)
      handleBasicFirefly(firefly)
    }
  }

  // Helper function for basic fireflies using modern system
  function handleBasicFirefly(firefly: any) {
    const poeticSpecies = [
      'Wandering Star', 'Twilight Wisp', 'Stellar Wanderer', 'Drifting Light',
      'Celestial Wisp', 'Night Wanderer', 'Fading Ember', 'Lost Lamplight'
    ]
    const randomSpecies = poeticSpecies[Math.floor(Math.random() * poeticSpecies.length)]
    
    const mockPersonality = {
      name: randomSpecies,
      species: 'Lost Soul Firefly', 
      id: String(firefly.id || 'basic_firefly'),
      behavior: { defaultMood: 'peaceful' }
    }
    
    // All fireflies now use the modern conversation system
    conversationActions.startReadOnlyConversation(
      firefly.id || 'basic_firefly',
      mockPersonality, 
      firefly.basicResponse || '*glows softly in the darkness*',
      4000
    )
    
    gameActions.recordInteraction('firefly_click', firefly.id || 'unknown')
  }
  
  function handleFireflyHover(data: any, hovered: boolean) {
    if (hovered) {
      // Find the visual firefly and mark it as hovered
      const visualFirefly = visualFireflies.find(f => f.id === data.id)
      if (visualFirefly) {
        visualFirefly.isHovered = true
        // Force reactivity update
        visualFireflies = visualFireflies
      }
    } else {
      // Remove hover state from all fireflies
      visualFireflies.forEach(f => f.isHovered = false)
      // Force reactivity update
      visualFireflies = visualFireflies
    }
  }
  
  // Function to handle sprite registration
  function handleSpriteReady(sprite: THREE.Sprite, firefly: FireflyVisual, index: number) {
    // console.log(`🧚‍♀️ Firefly sprite ready: ${firefly.name} (clickable: ${firefly.isClickable})`)
    fireflySprites[index] = sprite
    
    // Register with interaction system if available
    if (interactionSystem && firefly.isClickable) {
      // console.log(`🎯 Registering firefly ${firefly.name} with InteractionSystem`)
      interactionSystem.registerInteractiveObject({
        id: `firefly_${firefly.id}`,
        sprite: sprite,
        type: 'firefly',
        data: firefly,
        index: index,
        handlers: {
          onClick: handleFireflyClick,
          onHover: (data: any, hovered: boolean) => handleFireflyHover(data, hovered)
        }
      })
    } else {
      console.warn(`⚠️ Failed to register firefly: interactionSystem=${!!interactionSystem}, clickable=${firefly.isClickable}`)
    }
  }

  // API functions (no changes needed)
  export function triggerDiscovery() { /* ... */ }
  export function setEmotionalState(wonder: number, melancholy: number, hope: number, discovery: number) { /* ... */ }
  export function setIntensity(intensity: number) { /* ... */ }
  export function getStats() { /* ... */ }
  export function getActiveLights() { /* ... */ }
</script>

<!-- Beautiful StarSprite fireflies with star-like appearance and centralized interaction -->
{#each visualFireflies as firefly, index (firefly.id)}
  <StarSprite
    position={firefly.position}
    color={firefly.color}
    size={firefly.size}
    intensity={firefly.intensity}
    twinkleSpeed={firefly.twinkleSpeed}
    animationOffset={firefly.animationOffset}
    enableTwinkle={optimizedEnableGlow}
    opacity={optimizedEnableGlow ? 1.0 : 0.8}
    isClickable={firefly.isClickable}
    isHovered={firefly.isHovered || false}
    fireflyData={firefly}
    onSpriteReady={(sprite) => handleSpriteReady(sprite, firefly, index)}
  />
{/each}

<!-- Point light rendering now handled by LightingManager -->

