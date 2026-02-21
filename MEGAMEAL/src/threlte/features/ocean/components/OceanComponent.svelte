<!--
  OceanComponent - Modern ECS Architecture with Legacy Visual Features

  This component migrates all the beautiful features from the legacy ocean systems
  while maintaining modern ECS integration and component architecture:
  - Water level rise system with dynamic animation
  - Advanced procedural textures with multi-layered wave noise  
  - Intelligent device-aware optimization using OptimizationManager
  - Perfect legacy wave timing (slow, realistic movement)
  - ECS firefly reflection integration for real-time lighting
  - Vertex wave displacement with multiple wave layers
  - Clean, maintainable, DRY codebase following modern practices
-->
<script lang="ts">
  import { onMount, getContext, onDestroy, createEventDispatcher } from 'svelte'
  import { T } from '@threlte/core'
  import { Collider, RigidBody } from '@threlte/rapier'
  import * as THREE from 'three'
  import { qualitySettingsStore } from '../../performance'
  import { TERRAIN_GROUP } from '../../../constants/physics'
  import { 
    BaseLevelComponent, 
    ComponentType, 
    MessageType,
    type LevelContext,
    type SystemMessage,
    type LightingData 
  } from '../../../core/LevelSystem'
  import { underwaterActions, underwaterStateStore } from '../stores/underwaterStore'
  import { playerStateStore } from '../../../stores/gameStateStore'
  import UnderwaterEffect from '../effects/UnderwaterEffect.svelte'

  // --- PROPS (Enhanced with legacy features) ---
  export let size = { width: 2000, height: 2000 }
  export let color = 0x006994 // Deep ocean blue from legacy
  export let opacity = 0.95
  export let position: [number, number, number] = [0, 0, 0]
  export let enableAnimation = true
  export let animationSpeed = 0.1 // Legacy uses much slower speeds for realism
  export let segments = { width: 24, height: 24 } // Default ocean segments
  
  // --- WATER LEVEL RISE SYSTEM (Modern Props) ---
  export let enableRising: boolean = false
  export let initialLevel: number = 0
  export let targetLevel: number = 0
  export let riseRate: number = 0.01
  
  // --- UNDERWATER EFFECTS INTEGRATION ---
  export let enableUnderwaterEffects: boolean = true
  export let waterCollisionSize: [number, number, number] = [10000, 2.0, 10000]
  export let underwaterFogDensity: number = 0.08 // How thick the underwater fog is (higher = less visibility)
  export let underwaterFogColor: number = 0x0a1922 // Dark blue-gray fog color
  export let surfaceFogDensity: number = 0.003 // Normal surface fog density
  
  // --- LEGACY VISUAL ENHANCEMENT PROPS ---
  export let metalness = 0.02 // Very low metalness for water (from legacy)
  export let roughness = 0.05 // Very smooth for reflections (from legacy)
  export let envMap: THREE.CubeTexture | null = null
  export let envMapIntensity = 1.5 // Higher reflection intensity like legacy
  export let reflectionStrength = 1.0 // Reflection intensity
  export let fresnelPower = 5.0 // Fresnel power for realistic edge reflections

  // --- PLANAR REFLECTIONS (optional) ---
  // MeshStandardMaterial + envMap reflects only the skybox/environment, not dynamic scene geometry.
  // Enable this to reflect actual terrain/meshes using a planar reflector render target.
  export let enablePlanarReflections: boolean = false
  export let reflectionTextureSize: number = 512
  export let reflectionClipBias: number = 0.003
  export let reflectionTint: number = 0x8899aa

  // --- CONTEXT & MANAGERS ---
  const registry = getContext('systemRegistry')
  const lightingManager = getContext('lightingManager')
  
  // --- STATE ---
  let oceanMesh: THREE.Mesh
  let oceanMaterial: THREE.Material // Can be ShaderMaterial or MeshStandardMaterial
  let oceanGeometry: THREE.PlaneGeometry
  let animationTime = 0
  let waterLevel = initialLevel // Initialize water level
  let reflector: any = null
  
  // --- UNDERWATER DETECTION STATE ---
  let playerInWater = false
  const dispatch = createEventDispatcher()
  
  // --- UNDERWATER COLLISION HANDLERS ---
  function handleIntersectionEnter(event: any) {
    try {
      const a = event?.detail?.target
      const b = event?.detail?.other

      // Prefer the collider that looks like the player. "target" is typically the ocean sensor.
      const playerCollider = isPlayer(a) ? a : (isPlayer(b) ? b : null)

      if (!playerCollider) {
        console.log('🌊 Ocean: Intersection enter - no player collider detected')
        return
      }

      console.log('🌊 Ocean: ✅ PLAYER ENTERED WATER VOLUME!')
      playerInWater = true

      // Calculate depth based on player position vs water level
      const playerY = getPlayerYPosition(playerCollider)
      const depth = Math.max(0, waterLevel - playerY)

      underwaterActions.enterWater(depth)
      dispatch('waterEnter', { depth })
    } catch (e) {
      console.warn('🌊 Ocean: Intersection enter handler error:', e)
    }
  }

  function handleIntersectionExit(event: any) {
    try {
      const a = event?.detail?.target
      const b = event?.detail?.other
      const playerCollider = isPlayer(a) ? a : (isPlayer(b) ? b : null)

      if (playerCollider && playerInWater) {
        console.log('🏖️ Ocean: Player exited water volume')
        playerInWater = false
        underwaterActions.exitWater()
        dispatch('waterExit')
      }
    } catch (e) {
      console.warn('🏖️ Ocean: Intersection exit handler error:', e)
    }
  }

  function isPlayer(collider: any): boolean {
    // Check if the collider belongs to the player
    console.log('🔍 Ocean: Checking collider:', collider)
    
    // Try multiple ways to identify the player
    const userData = collider?.userData || collider?.parent?.userData || collider?.rigidBody?.userData
    const isPlayerByUserData = userData?.isPlayer === true || userData?.type === 'player'
    
    // Also check if it's a capsule collider (typical for player)
    const isPlayerByCapsule = collider?.shape === 'capsule' || collider?.args?.length === 2
    
    console.log('🔍 Ocean: Player detection:', { userData, isPlayerByUserData, isPlayerByCapsule })
    
    return isPlayerByUserData || isPlayerByCapsule
  }

  function getPlayerYPosition(collider: any): number {
    // Get the Y position of the player's collider
    const position = collider?.position || collider?.parent?.position || collider?.rigidBody?.translation()
    const y = position?.y || position?.[1] || 0
    console.log('🔍 Ocean: Player Y position:', y)
    return y
  }

  // --- REACTIVE OPTIMIZATION SETTINGS ---
  // Use reactive store instead of manual OptimizationManager calls
  $: textureSize = $qualitySettingsStore.textureResolution
  
  // Map segments to quality settings for performance
  $: isMobileQuality = $qualitySettingsStore.level === 'ultra_low' || $qualitySettingsStore.level === 'low'
  $: optimizedSegments = {
    width: isMobileQuality ? 16 : (segments?.width || 24),
    height: isMobileQuality ? 16 : (segments?.height || 24)
  }
  
  // Single-sided rendering optimization based on underwater state
  $: if (!enablePlanarReflections && oceanMaterial instanceof THREE.MeshStandardMaterial) {
    // Above water: show top surface (FrontSide)
    // Underwater: show bottom surface (BackSide)
    oceanMaterial.side = $underwaterStateStore.isUnderwater ? THREE.BackSide : THREE.FrontSide
    oceanMaterial.needsUpdate = true
  }

  // Shader functions removed - component now uses MeshStandardMaterial for Threlte compatibility

  // Keep reflector aligned with current water level and position
  $: if (enablePlanarReflections && reflector) {
    reflector.position.set(position[0], waterLevel, position[2])
    reflector.rotation.x = -Math.PI / 2
  }

  class OceanComponent extends BaseLevelComponent {
    readonly id = 'ocean-component'
    readonly type = ComponentType.OCEAN
    private lastPointLightCount = 0

    protected async onInitialize(): Promise<void> {
      console.log('🌊 Ocean: Initializing...')
      await this.createOcean()
      if (lightingManager) {
        lightingManager.subscribe((lighting: LightingData) => {
          this.updateOceanLighting(lighting)
        })
        console.log('🌊 Ocean: Connected to lighting system')
      } else {
        console.warn('🌊 Ocean: No lightingManager found in context!')
      }
    }

    protected onUpdate(deltaTime: number): void {
      if (!enableAnimation) return
      animationTime += deltaTime * animationSpeed
      
      // Handle rising water
      if (enableRising) {
        if (waterLevel < targetLevel) {
          waterLevel = Math.min(waterLevel + riseRate * deltaTime, targetLevel)
        } else if (waterLevel > targetLevel) {
          waterLevel = Math.max(waterLevel - riseRate * deltaTime, targetLevel)
        }
      }
      
      // Backup depth check - guarantees underwater transitions even if physics events are filtered
      if (enableUnderwaterEffects) {
        const playerState = $playerStateStore
        const underwaterState = $underwaterStateStore
        
        if (playerState?.position) {
          const playerY = playerState.position[1]
          const depth = Math.max(0, waterLevel - playerY)
          const epsilon = 0.05
          
          // If player is deep enough and not already underwater → enter water
          if (depth > epsilon && !underwaterState.isUnderwater) {
            console.log('🌊 Ocean: Math-based underwater detection - entering water at depth:', depth)
            underwaterActions.enterWater(depth)
          }
          // If player is above water and currently underwater → exit water
          else if (depth <= epsilon && underwaterState.isUnderwater) {
            console.log('🏖️ Ocean: Math-based underwater detection - exiting water')
            underwaterActions.exitWater()
          }
        }
      }
      
      if (oceanMaterial instanceof THREE.MeshStandardMaterial) {
        // Animate texture offsets for water movement
        if (oceanMaterial.map) {
          oceanMaterial.map.offset.x = Math.sin(animationTime * 0.02) * 0.01
          oceanMaterial.map.offset.y = animationTime * 0.001
        }
        if (oceanMaterial.normalMap) {
          oceanMaterial.normalMap.offset.x = Math.sin(animationTime * 0.06) * 0.008
          oceanMaterial.normalMap.offset.y = animationTime * 0.002
        }
      }
    }
    
    protected onMessage(message: SystemMessage): void {
      if (message.type === MessageType.LIGHTING_UPDATE) {
        this.updateOceanLighting(message.data)
      }
    }

    protected onDispose(): void {
      oceanGeometry?.dispose()
      oceanMaterial?.dispose()
    }

    private async createOcean(): Promise<void> {
      // If planar reflections are enabled, create a Reflector instead of a standard mesh material.
      if (enablePlanarReflections) {
        // Lazy import to avoid bundling cost unless used
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore - examples path
        const { Reflector } = await import('three/examples/jsm/objects/Reflector.js')

        const reflGeom = new THREE.PlaneGeometry(size.width, size.height)
        reflector = new Reflector(reflGeom, {
          textureWidth: reflectionTextureSize,
          textureHeight: reflectionTextureSize,
          clipBias: reflectionClipBias,
          color: reflectionTint
        })
        reflector.rotation.x = -Math.PI / 2
        reflector.position.set(position[0], waterLevel, position[2])

        // Note: Reflector handles its own material/shader; we keep oceanGeometry/material
        // references null to skip standard mesh path.
        oceanGeometry = reflGeom
        oceanMaterial = reflector.material
      } else {
        oceanGeometry = new THREE.PlaneGeometry(
          size.width, size.height,
          optimizedSegments.width,
          optimizedSegments.height
        )

        // ALWAYS use MeshStandardMaterial for proper Threlte lighting integration
        const textureData = this.createLegacyWaveTextures()
        
        oceanMaterial = new THREE.MeshStandardMaterial({
          color: color,
          transparent: false,
          opacity: 1.0,
          roughness: roughness,
          metalness: metalness,
          envMap: envMap,
          envMapIntensity: envMapIntensity,
          
          // Apply our beautiful procedural textures
          map: textureData.colorTexture,
          normalMap: textureData.normalMap,
          displacementMap: textureData.displacementMap,
          displacementScale: 0.5, // Subtle displacement
          normalScale: new THREE.Vector2(0.3, 0.3), // Subtle normal mapping
          
          // Enable proper lighting integration
          fog: true, // Respond to scene fog
          side: THREE.DoubleSide,
          
          // Ocean is now opaque - standard depth handling
          depthWrite: true,  // Opaque objects write to depth buffer
          depthTest: true    // And test against it
        })
      }
      
      // Ocean setup complete
    }

    private updateOceanLighting(lighting: LightingData): void {
      // MeshStandardMaterial automatically receives lighting from Three.js lights!
      // The HybridFireflyComponent creates actual T.PointLight components,
      // so the ocean will automatically receive those lights.
      
      // Only log significant changes (but less frequently)
      if (lighting.point.length !== this.lastPointLightCount) {
        this.lastPointLightCount = lighting.point.length
        // Only log every 10th light change to avoid spam
        if (this.lastPointLightCount % 10 === 0) {
          console.log(`🌊 Ocean: Now receiving ${lighting.point.length} lights via Threlte's standard lighting`)
        }
      }
      
      // No manual uniform updates needed - Three.js handles everything!
    }

    // --- LEGACY PROCEDURAL TEXTURE GENERATION (Enhanced Multi-Layer) ---
    private createLegacyWaveTextures(): {
      displacementMap: THREE.DataTexture,
      normalMap: THREE.DataTexture,
      colorTexture: THREE.CanvasTexture
    } {
      const size = textureSize
      // Texture generation (logging removed for performance)
      
      // Multi-layered noise function exactly matching legacy OceanSystem
      const legacyWaveNoise = (x: number, y: number, time = 0): number => {
        let value = 0
        
        // Large ocean swells (legacy parameters)
        value += Math.sin(x * 0.02 + y * 0.01 + time * 0.5) * 0.4
        value += Math.cos(x * 0.015 - y * 0.02 + time * 0.3) * 0.3
        
        // Medium waves
        value += Math.sin(x * 0.05 + y * 0.08 + time * 1.2) * 0.2
        value += Math.cos(x * 0.08 - y * 0.05 + time * 0.8) * 0.15
        
        // Small ripples
        value += Math.sin(x * 0.15 + y * 0.12 + time * 2.0) * 0.08
        value += Math.cos(x * 0.18 - y * 0.15 + time * 1.5) * 0.06
        
        // Fine surface detail
        value += Math.sin(x * 0.3 + y * 0.25 + time * 3.0) * 0.04
        value += Math.cos(x * 0.35 - y * 0.3 + time * 2.5) * 0.03
        
        return (value + 1) / 2 // Normalize to 0-1 range
      }
      
      // Generate height map with legacy algorithm
      const heightMap: number[][] = []
      for (let y = 0; y < size; y++) {
        heightMap[y] = []
        for (let x = 0; x < size; x++) {
          heightMap[y][x] = legacyWaveNoise(x, y)
        }
      }
      
      // Create enhanced displacement map (RGBA for multiple wave layers)
      const displacementData = new Uint8Array(size * size * 4)
      const normalData = new Uint8Array(size * size * 4)
      
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const index = (y * size + x) * 4
          
          // Multi-layer displacement data
          const height1 = legacyWaveNoise(x, y, 0) * 255
          const height2 = legacyWaveNoise(x * 0.7, y * 0.7, 1) * 255
          const height3 = legacyWaveNoise(x * 1.5, y * 1.5, 2) * 255
          const height4 = legacyWaveNoise(x * 2.0, y * 2.0, 3) * 255
          
          displacementData[index] = height1     // R: Large waves
          displacementData[index + 1] = height2 // G: Medium waves  
          displacementData[index + 2] = height3 // B: Small ripples
          displacementData[index + 3] = height4 // A: Fine detail
          
          // Enhanced normal map calculation
          const height = heightMap[y][x]
          const heightL = x > 0 ? heightMap[y][x - 1] : height
          const heightR = x < size - 1 ? heightMap[y][x + 1] : height
          const heightU = y > 0 ? heightMap[y - 1][x] : height
          const heightD = y < size - 1 ? heightMap[y + 1][x] : height
          
          const dx = (heightR - heightL) * 2.0 // Enhanced normal strength
          const dy = (heightD - heightU) * 2.0
          const length = Math.sqrt(dx * dx + dy * dy + 1)
          
          normalData[index] = (-dx / length * 0.5 + 0.5) * 255     // R
          normalData[index + 1] = (-dy / length * 0.5 + 0.5) * 255 // G
          normalData[index + 2] = (1 / length * 0.5 + 0.5) * 255   // B
          normalData[index + 3] = 255                               // A
        }
      }
      
      // Create legacy color texture with exact original colors
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = size
      const ctx = canvas.getContext('2d')!
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const wave = heightMap[y][x]
          
          // Exact legacy color values from OceanSystem
          const blueBase = 20
          const greenBase = 50
          const blue = Math.floor(blueBase + wave * 120)
          const green = Math.floor(greenBase + wave * 100)
          const red = Math.floor(10 + wave * 30)
          
          ctx.fillStyle = `rgb(${red}, ${green}, ${blue})`
          ctx.fillRect(x, y, 1, 1)
        }
      }
      
      // Create Three.js textures with legacy settings
      const displacementTexture = new THREE.DataTexture(
        displacementData, size, size, THREE.RGBAFormat, THREE.UnsignedByteType
      )
      displacementTexture.wrapS = displacementTexture.wrapT = THREE.RepeatWrapping
      displacementTexture.repeat.set(2, 2) // <-- CHANGED FROM 15
      displacementTexture.needsUpdate = true
      
      const normalTexture = new THREE.DataTexture(
        normalData, size, size, THREE.RGBAFormat, THREE.UnsignedByteType
      )
      normalTexture.wrapS = normalTexture.wrapT = THREE.RepeatWrapping
      normalTexture.repeat.set(2, 2) // <-- CHANGED FROM 15
      normalTexture.needsUpdate = true
      
      const colorTexture = new THREE.CanvasTexture(canvas)
      colorTexture.wrapS = colorTexture.wrapT = THREE.RepeatWrapping
      colorTexture.repeat.set(2, 2) // <-- CHANGED FROM 15
      
      return {
        displacementMap: displacementTexture,
        normalMap: normalTexture,
        colorTexture: colorTexture
      }
    }
  }

  // --- COMPONENT INITIALIZATION ---
  let component: OceanComponent
  // Collision detection is now handled entirely by the Rapier sensor below

  onMount(async () => {
    console.log('🌊 Ocean: Mounting with water level:', waterLevel, 'rising enabled:', enableRising)
    console.log('🌊 Ocean: Collision box size:', waterCollisionSize)
    console.log('🌊 Ocean: Ocean position:', position)
    console.log('🌊 Ocean: Underwater effects enabled:', enableUnderwaterEffects)
    console.log('🌊 Ocean: Using MANUAL collision detection')
    
    if (registry) {
      component = new OceanComponent()
      registry.registerComponent(component)
      const levelContext = getContext('levelContext')
      if (levelContext) {
        await component.initialize(levelContext)
      }
    }
    
    // Add a debug timer to show current water level every few seconds
    // setInterval(() => {
    //   console.log('🌊 Ocean: Current water level:', waterLevel, 'target:', targetLevel)
    // }, 5000)
  })

  onDestroy(() => {
    component?.dispose()
  })

  // --- REACTIVE UPDATES for new props ---
  $: if (oceanMaterial instanceof THREE.MeshStandardMaterial) {
    oceanMaterial.envMapIntensity = envMapIntensity
    oceanMaterial.metalness = metalness
    oceanMaterial.roughness = roughness
    if (envMap) oceanMaterial.envMap = envMap
  }

  // --- REACTIVE RECREATION when quality settings change ---
  $: if (component && (optimizedSegments || textureSize)) {
    // Recreate ocean when quality settings change
    console.log(`🌊 Ocean: Quality settings changed, recreating with segments ${optimizedSegments.width}x${optimizedSegments.height}, texture ${textureSize}px`)
    component.onDispose()
    component.createOcean()
  }
</script>

<!-- Ocean surface (planar reflector or standard mesh) -->
{#if enablePlanarReflections}
  {#if reflector}
    <T.Primitive object={reflector} name="ocean_reflector" />
  {/if}
{:else if oceanGeometry && oceanMaterial}
  <T.Mesh 
    bind:ref={oceanMesh}
    geometry={oceanGeometry}
    material={oceanMaterial}
    position.x={position[0]}
    position.y={waterLevel}
    position.z={position[2]}
    rotation={[-Math.PI / 2, 0, 0]}
    receiveShadow={!isMobileQuality}
    castShadow={false}
    name="ocean_surface"
    renderOrder={0}
  />
{/if}

<!-- Integrated Underwater Effects System -->
{#if enableUnderwaterEffects}
  <T.Group position={[position[0], waterLevel, position[2]]}>
    <!-- Water surface detection - thin sensor plane at water level for underwater effects -->
    <RigidBody type="kinematicPosition">
      <Collider
        shape="cuboid"
        args={[waterCollisionSize[0] / 2, waterCollisionSize[1] / 2, waterCollisionSize[2] / 2]}
        sensor={true}
        collisionGroups={TERRAIN_GROUP}
        activeEvents="INTERSECTION_EVENTS"
        userData={{ isOceanSensor: true, type: 'ocean-sensor' }}
        on:intersectionenter={handleIntersectionEnter}
        on:intersectionexit={handleIntersectionExit}
        on:create={(e) => console.log('🌊 Ocean: Collision sensor created at Y:', waterLevel, 'Box size:', waterCollisionSize)}
      />
    </RigidBody>
    
    <!-- Underwater particle effects (bubbles and mist) - also follow water level -->
    <UnderwaterEffect 
      position={[0, 0, 0]}
      size={waterCollisionSize}
    />
  </T.Group>
{/if}
