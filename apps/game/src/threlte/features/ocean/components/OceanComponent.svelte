<!--
  OceanComponent - Modern ECS Water Surface Architecture

  Runtime water surface with modern ECS integration and component architecture:
  - Water level rise system with dynamic animation
  - Advanced procedural textures with multi-layered wave noise  
  - Intelligent device-aware optimization using OptimizationManager
  - Slow wave timing for large-scale water movement
  - ECS firefly reflection integration for real-time lighting
  - Vertex wave displacement with multiple wave layers
  - Clean, maintainable, DRY codebase following modern practices
-->
<script lang="ts">
import { T } from '@threlte/core'
import { Collider, RigidBody } from '@threlte/rapier'
import { createEventDispatcher, getContext, onDestroy, onMount } from 'svelte'
import * as THREE from 'three'
import { TRIGGER_GROUP } from '../../../constants/physics'
import {
  BaseLevelComponent,
  ComponentType,
  type LevelContext,
  MessageType,
  type SystemMessage,
} from '../../../core/LevelSystem'
import { playerStateStore } from '../../../stores/gameStateStore'
import { setRuntimeDiagnostic } from '../../../stores/runtimeDiagnosticsStore'
import { runtimeDebugLog } from '../../../utils/runtimeLog'
import {
  RUNTIME_LIGHTING_CONTEXT,
  type RuntimeLightingController,
  type RuntimeLightingSnapshot,
} from '../../lighting'
import { qualityLevelStore, qualitySettingsStore } from '../../performance'
import UnderwaterEffect from '../effects/UnderwaterEffect.svelte'
import {
  underwaterActions,
  underwaterStateStore,
} from '../stores/underwaterStore'

// --- PROPS ---
export let size = { width: 2000, height: 2000 }
export let color = 0x050b14 // Near-black night water
export let opacity = 0.92
export let position: [number, number, number] = [0, 0, 0]
export let enableAnimation = true
export let animationSpeed = 0.1
export let segments = { width: 128, height: 128 }

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

// --- VISUAL ENHANCEMENT PROPS ---
export let metalness = 0.02 // Very low metalness for water
export let roughness = 0.08 // Subtle star reflections without washing out dark water
export let envMap: THREE.CubeTexture | null = null
export let envMapIntensity = 0.85
export let reflectionStrength = 0.8 // Reflection intensity tuning multiplier
export let fresnelPower = 5.5 // Approximate fresnel bias for reflection-heavy water

// --- PLANAR REFLECTIONS (optional) ---
// MeshStandardMaterial + envMap reflects only the skybox/environment, not dynamic scene geometry.
// Enable this to reflect actual terrain/meshes using a planar reflector render target.
export let enablePlanarReflections: boolean = false
export let reflectionTextureSize: number = 512
export let reflectionClipBias: number = 0.003
export let reflectionTint: number = 0x8899aa

// --- CONTEXT & MANAGERS ---
const registry = getContext('systemRegistry')
const runtimeLighting = getContext<RuntimeLightingController | null>(
  RUNTIME_LIGHTING_CONTEXT,
)

// --- STATE ---
let oceanMesh: THREE.Mesh
let oceanMaterial: THREE.Material // Can be ShaderMaterial or MeshStandardMaterial
let oceanGeometry: THREE.PlaneGeometry
let animationTime = 0
let waterLevel = initialLevel // Initialize water level
let lastResolvedInitialLevel = initialLevel
let reflector: any = null
let unsubscribeLighting: (() => void) | null = null
let lastOceanQualityKey: string | null = null
let pendingOceanRebuild = false
let oceanFogDiagnosticSignature = ''

// --- UNDERWATER DETECTION STATE ---
let playerInWater = false
const dispatch = createEventDispatcher()

// --- UNDERWATER COLLISION HANDLERS ---
function handleIntersectionEnter(event: any) {
  try {
    const a = event?.detail?.target
    const b = event?.detail?.other

    // Prefer the collider that looks like the player. "target" is typically the ocean sensor.
    const playerCollider = isPlayer(a) ? a : isPlayer(b) ? b : null

    if (!playerCollider) {
      runtimeDebugLog(
        '🌊 Ocean: Intersection enter - no player collider detected',
      )
      return
    }

    runtimeDebugLog('🌊 Ocean: ✅ PLAYER ENTERED WATER VOLUME!')
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
    const playerCollider = isPlayer(a) ? a : isPlayer(b) ? b : null

    if (playerCollider && playerInWater) {
      runtimeDebugLog('🏖️ Ocean: Player exited water volume')
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
  runtimeDebugLog('🔍 Ocean: Checking collider:', collider)

  // Try multiple ways to identify the player
  const userData =
    collider?.userData ||
    collider?.parent?.userData ||
    collider?.rigidBody?.userData
  const isPlayerByUserData =
    userData?.isPlayer === true || userData?.type === 'player'

  // Also check if it's a capsule collider (typical for player)
  const isPlayerByCapsule =
    collider?.shape === 'capsule' || collider?.args?.length === 2

  runtimeDebugLog('🔍 Ocean: Player detection:', {
    userData,
    isPlayerByUserData,
    isPlayerByCapsule,
  })

  return isPlayerByUserData || isPlayerByCapsule
}

function getPlayerYPosition(collider: any): number {
  // Get the Y position of the player's collider
  const position =
    collider?.position ||
    collider?.parent?.position ||
    collider?.rigidBody?.translation()
  const y = position?.y || position?.[1] || 0
  runtimeDebugLog('🔍 Ocean: Player Y position:', y)
  return y
}

function reportOceanFogDiagnostic(signature: string) {
  if (signature === oceanFogDiagnosticSignature) return
  oceanFogDiagnosticSignature = signature

  const standardMaterialSceneFogEnabled =
    !enablePlanarReflections &&
    oceanMaterial instanceof THREE.MeshStandardMaterial &&
    oceanMaterial.fog === true
  const reflectorWaterActive = enablePlanarReflections && Boolean(reflector)

  setRuntimeDiagnostic('oceanAtmosphere', {
    label: 'Ocean Fog',
    level: 'idle',
    message:
      'Ocean material fog is disabled; water renders from its material, environment lighting, underwater-local effects, and any active full-scene depth fog pass.',
    meta: {
      path: enablePlanarReflections ? 'planar-reflector' : 'standard',
      standardMaterialSceneFogEnabled,
      reflectorWaterActive,
      reflectorSceneFogEnabled: false,
      waterLevel,
      effectiveReflectionIntensity,
      effectiveUnderwaterFogDensity,
      effectiveSurfaceMistDensity,
    },
  })
}

// --- REACTIVE OPTIMIZATION SETTINGS ---
// Use reactive store instead of manual OptimizationManager calls
$: textureSize = $qualitySettingsStore.textureResolution

// Map segments to quality settings for performance
$: isMobileQuality =
  $qualityLevelStore === 'ultra_low' || $qualityLevelStore === 'low'
$: optimizedSegments = {
  width: isMobileQuality
    ? Math.min(48, segments?.width || 128)
    : segments?.width || 128,
  height: isMobileQuality
    ? Math.min(48, segments?.height || 128)
    : segments?.height || 128,
}
$: effectiveReflectionIntensity =
  envMapIntensity * reflectionStrength * Math.max(0.25, fresnelPower / 5)
$: effectiveUnderwaterFogDensity = Math.min(
  0.35,
  Math.max(0, underwaterFogDensity),
)
$: effectiveSurfaceMistDensity = Math.max(0, surfaceFogDensity)

// Single-sided rendering optimization based on underwater state
$: if (
  !enablePlanarReflections &&
  oceanMaterial instanceof THREE.MeshStandardMaterial
) {
  // Above water: show top surface (FrontSide)
  // Underwater: show bottom surface (BackSide)
  oceanMaterial.side = $underwaterStateStore.isUnderwater
    ? THREE.BackSide
    : THREE.FrontSide
  oceanMaterial.needsUpdate = true
}

// Shader functions removed - component now uses MeshStandardMaterial for Threlte compatibility

// Keep reflector aligned with current water level and position
$: if (enablePlanarReflections && reflector) {
  reflector.position.set(position[0], waterLevel, position[2])
  reflector.rotation.x = -Math.PI / 2
}

// Scene-authored levels usually provide a static water height. Keep the runtime
// water plane aligned with prop updates unless an active rising-water sequence
// is driving the level dynamically.
$: resolvedInitialLevel = Number.isFinite(initialLevel)
  ? initialLevel
  : position[1]

$: if (
  !enableRising &&
  Number.isFinite(resolvedInitialLevel) &&
  resolvedInitialLevel !== lastResolvedInitialLevel
) {
  waterLevel = resolvedInitialLevel
  lastResolvedInitialLevel = resolvedInitialLevel
}

class OceanComponent extends BaseLevelComponent {
  readonly id = 'ocean-component'
  readonly type = ComponentType.OCEAN
  private lastPointLightCount = 0

  protected async onInitialize(): Promise<void> {
    runtimeDebugLog('🌊 Ocean: Initializing...')
    await this.createOcean()
    if (runtimeLighting) {
      unsubscribeLighting = runtimeLighting.subscribe(
        (lighting: RuntimeLightingSnapshot) => {
          this.updateOceanLighting(lighting)
        },
      )
      runtimeDebugLog('🌊 Ocean: Connected to lighting system')
    } else {
      console.warn('🌊 Ocean: No runtime lighting controller found in context!')
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
          runtimeDebugLog(
            '🌊 Ocean: Math-based underwater detection - entering water at depth:',
            depth,
          )
          underwaterActions.enterWater(depth)
        }
        // If player is above water and currently underwater → exit water
        else if (depth <= epsilon && underwaterState.isUnderwater) {
          runtimeDebugLog(
            '🏖️ Ocean: Math-based underwater detection - exiting water',
          )
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
        oceanMaterial.normalMap.offset.x =
          Math.sin(animationTime * 0.06) * 0.008
        oceanMaterial.normalMap.offset.y = animationTime * 0.002
      }
    }
  }

  protected onMessage(message: SystemMessage): void {
    if (message.type === MessageType.LIGHTING_UPDATE) {
      this.updateOceanLighting(message.data as RuntimeLightingSnapshot)
    }
  }

  protected onDispose(): void {
    this.disposeOceanResources()
  }

  private async createOcean(): Promise<void> {
    this.disposeOceanResources()

    // If planar reflections are enabled, create a Reflector instead of a standard mesh material.
    if (enablePlanarReflections) {
      // Lazy import to avoid bundling cost unless used
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore - examples path
      const { Reflector } = await import(
        'three/examples/jsm/objects/Reflector.js'
      )

      const reflGeom = new THREE.PlaneGeometry(size.width, size.height)
      reflector = new Reflector(reflGeom, {
        textureWidth: reflectionTextureSize,
        textureHeight: reflectionTextureSize,
        clipBias: reflectionClipBias,
        color: reflectionTint,
      })
      reflector.rotation.x = -Math.PI / 2
      reflector.position.set(position[0], waterLevel, position[2])

      // Note: Reflector handles its own material/shader; we keep oceanGeometry/material
      // references null to skip standard mesh path.
      oceanGeometry = reflGeom
      oceanMaterial = reflector.material
      oceanMaterial.fog = false
    } else {
      oceanGeometry = new THREE.PlaneGeometry(
        size.width,
        size.height,
        optimizedSegments.width,
        optimizedSegments.height,
      )

      // ALWAYS use MeshStandardMaterial for proper Threlte lighting integration
      const textureData = this.createWaveTextures()

      oceanMaterial = new THREE.MeshStandardMaterial({
        color: color,
        transparent: opacity < 0.999,
        opacity,
        roughness: roughness,
        metalness: metalness,
        envMap: envMap,
        envMapIntensity: effectiveReflectionIntensity,

        // Apply our beautiful procedural textures
        map: textureData.colorTexture,
        normalMap: textureData.normalMap,
        displacementMap: textureData.displacementMap,
        displacementScale: 0.16 + reflectionStrength * 0.07,
        normalScale: new THREE.Vector2(
          0.18 + Math.min(fresnelPower, 10) * 0.024,
          0.18 + Math.min(fresnelPower, 10) * 0.024,
        ),

        // Keep water independent from scene fog while the unified fog model is rebuilt.
        fog: false,
        side: THREE.DoubleSide,

        // Ocean is now opaque - standard depth handling
        depthWrite: true, // Opaque objects write to depth buffer
        depthTest: true, // And test against it
      })
    }

    // Ocean setup complete
  }

  public async recreateOcean(nextQualityKey: string): Promise<void> {
    if (pendingOceanRebuild) return

    pendingOceanRebuild = true

    try {
      await this.createOcean()
      lastOceanQualityKey = nextQualityKey
    } finally {
      pendingOceanRebuild = false
    }
  }

  private disposeOceanResources(): void {
    if (reflector && typeof reflector.dispose === 'function') {
      reflector.dispose()
    }
    reflector = null

    oceanGeometry?.dispose()
    oceanGeometry = undefined as unknown as THREE.PlaneGeometry

    if (oceanMaterial instanceof THREE.MeshStandardMaterial) {
      oceanMaterial.map?.dispose()
      oceanMaterial.normalMap?.dispose()
      oceanMaterial.displacementMap?.dispose()
    }

    oceanMaterial?.dispose()
    oceanMaterial = undefined as unknown as THREE.Material
  }

  private updateOceanLighting(lighting: RuntimeLightingSnapshot): void {
    // MeshStandardMaterial automatically receives lighting from Three.js lights.

    // Only log significant changes (but less frequently)
    if (lighting.point.length !== this.lastPointLightCount) {
      this.lastPointLightCount = lighting.point.length
      // Only log every 10th light change to avoid spam
      if (this.lastPointLightCount % 10 === 0) {
        runtimeDebugLog(
          `🌊 Ocean: Now receiving ${lighting.point.length} lights via Threlte's standard lighting`,
        )
      }
    }

    // No manual uniform updates needed - Three.js handles everything!
  }

  // --- PROCEDURAL TEXTURE GENERATION (Enhanced Multi-Layer) ---
  private createWaveTextures(): {
    displacementMap: THREE.DataTexture
    normalMap: THREE.DataTexture
    colorTexture: THREE.CanvasTexture
  } {
    const size = textureSize
    const textureRepeat = 2
    const tau = Math.PI * 2
    const baseColor = new THREE.Color(color)
    const baseRed = Math.round(baseColor.r * 255)
    const baseGreen = Math.round(baseColor.g * 255)
    const baseBlue = Math.round(baseColor.b * 255)
    const clampColor = (value: number) =>
      Math.max(0, Math.min(255, Math.round(value)))
    // Texture generation (logging removed for performance)

    const layeredWaveNoise = (x: number, y: number, time = 0): number => {
      const u = x / size
      const v = y / size
      let value = 0

      // Large ocean swells
      value += Math.sin(tau * (u + v) + time * 0.5) * 0.38
      value += Math.cos(tau * (2 * u - v) + time * 0.3) * 0.28

      // Medium waves
      value += Math.sin(tau * (3 * u + 5 * v) + time * 1.2) * 0.18
      value += Math.cos(tau * (5 * u - 3 * v) + time * 0.8) * 0.14

      // Small ripples
      value += Math.sin(tau * (9 * u + 7 * v) + time * 2.0) * 0.075
      value += Math.cos(tau * (11 * u - 8 * v) + time * 1.5) * 0.055

      // Fine surface detail
      value += Math.sin(tau * (17 * u + 13 * v) + time * 3.0) * 0.035
      value += Math.cos(tau * (19 * u - 17 * v) + time * 2.5) * 0.025

      return (value + 1) / 2 // Normalize to 0-1 range
    }

    // Generate height map
    const heightMap: number[][] = []
    for (let y = 0; y < size; y++) {
      heightMap[y] = []
      for (let x = 0; x < size; x++) {
        heightMap[y][x] = layeredWaveNoise(x, y)
      }
    }

    // Create enhanced displacement map (RGBA for multiple wave layers)
    const displacementData = new Uint8Array(size * size * 4)
    const normalData = new Uint8Array(size * size * 4)

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const index = (y * size + x) * 4

        // Multi-layer displacement data
        const height1 = layeredWaveNoise(x, y, 0) * 255
        const height2 = layeredWaveNoise(x * 0.7, y * 0.7, 1) * 255
        const height3 = layeredWaveNoise(x * 1.5, y * 1.5, 2) * 255
        const height4 = layeredWaveNoise(x * 2.0, y * 2.0, 3) * 255

        displacementData[index] = height1 // R: Large waves
        displacementData[index + 1] = height2 // G: Medium waves
        displacementData[index + 2] = height3 // B: Small ripples
        displacementData[index + 3] = height4 // A: Fine detail

        // Enhanced normal map calculation
        const height = heightMap[y][x]
        const heightL = heightMap[y][(x - 1 + size) % size]
        const heightR = heightMap[y][(x + 1) % size]
        const heightU = heightMap[(y - 1 + size) % size][x]
        const heightD = heightMap[(y + 1) % size][x]

        const dx = (heightR - heightL) * 2.0 // Enhanced normal strength
        const dy = (heightD - heightU) * 2.0
        const length = Math.sqrt(dx * dx + dy * dy + 1)

        normalData[index] = ((-dx / length) * 0.5 + 0.5) * 255 // R
        normalData[index + 1] = ((-dy / length) * 0.5 + 0.5) * 255 // G
        normalData[index + 2] = ((1 / length) * 0.5 + 0.5) * 255 // B
        normalData[index + 3] = 255 // A
      }
    }

    // Create color texture
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = size
    const ctx = canvas.getContext('2d')!
    const colorImageData = ctx.createImageData(size, size)
    const colorPixels = colorImageData.data

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const wave = heightMap[y][x]

        // Keep ocean albedo close to the scene-authored water color and add
        // only restrained blue-green variation for a dark cosmic-horror tone.
        const shimmer = Math.max(0, wave - 0.25)
        const highlight = Math.max(0, wave - 0.72)
        const red = clampColor(baseRed + shimmer * 12 + highlight * 6)
        const green = clampColor(baseGreen + shimmer * 28 + highlight * 16)
        const blue = clampColor(baseBlue + shimmer * 42 + highlight * 28)

        const pixelIndex = (y * size + x) * 4
        colorPixels[pixelIndex] = red
        colorPixels[pixelIndex + 1] = green
        colorPixels[pixelIndex + 2] = blue
        colorPixels[pixelIndex + 3] = 255
      }
    }
    ctx.putImageData(colorImageData, 0, 0)

    // Create Three.js textures
    const displacementTexture = new THREE.DataTexture(
      displacementData,
      size,
      size,
      THREE.RGBAFormat,
      THREE.UnsignedByteType,
    )
    displacementTexture.wrapS = displacementTexture.wrapT = THREE.RepeatWrapping
    displacementTexture.repeat.set(textureRepeat, textureRepeat)
    displacementTexture.magFilter = THREE.LinearFilter
    displacementTexture.minFilter = THREE.LinearFilter
    displacementTexture.needsUpdate = true

    const normalTexture = new THREE.DataTexture(
      normalData,
      size,
      size,
      THREE.RGBAFormat,
      THREE.UnsignedByteType,
    )
    normalTexture.wrapS = normalTexture.wrapT = THREE.RepeatWrapping
    normalTexture.repeat.set(textureRepeat, textureRepeat)
    normalTexture.magFilter = THREE.LinearFilter
    normalTexture.minFilter = THREE.LinearFilter
    normalTexture.needsUpdate = true

    const colorTexture = new THREE.CanvasTexture(canvas)
    colorTexture.wrapS = colorTexture.wrapT = THREE.RepeatWrapping
    colorTexture.repeat.set(textureRepeat, textureRepeat)
    colorTexture.colorSpace = THREE.SRGBColorSpace
    colorTexture.anisotropy = 4

    return {
      displacementMap: displacementTexture,
      normalMap: normalTexture,
      colorTexture: colorTexture,
    }
  }
}

// --- COMPONENT INITIALIZATION ---
let component: OceanComponent
// Collision detection is now handled entirely by the Rapier sensor below

onMount(async () => {
  runtimeDebugLog(
    '🌊 Ocean: Mounting with water level:',
    waterLevel,
    'rising enabled:',
    enableRising,
  )
  runtimeDebugLog('🌊 Ocean: Collision box size:', waterCollisionSize)
  runtimeDebugLog('🌊 Ocean: Ocean position:', position)
  runtimeDebugLog(
    '🌊 Ocean: Underwater effects enabled:',
    enableUnderwaterEffects,
  )
  runtimeDebugLog('🌊 Ocean: Using MANUAL collision detection')

  if (registry) {
    component = new OceanComponent()
    registry.registerComponent(component)
    const levelContext = getContext('levelContext')
    if (levelContext) {
      await component.initialize(levelContext)
      lastOceanQualityKey = `${optimizedSegments.width}x${optimizedSegments.height}:${textureSize}:${Number(enablePlanarReflections)}`
    }
  }
})

onDestroy(() => {
  unsubscribeLighting?.()
  unsubscribeLighting = null
  component?.dispose()
  setRuntimeDiagnostic('oceanAtmosphere', {
    label: 'Ocean Fog',
    level: 'idle',
    message: 'Ocean fog diagnostic unmounted.',
  })
})

$: if (oceanMaterial instanceof THREE.MeshStandardMaterial) {
  oceanMaterial.envMapIntensity = effectiveReflectionIntensity
  oceanMaterial.metalness = metalness
  oceanMaterial.roughness = roughness
  if (envMap) oceanMaterial.envMap = envMap
}

$: oceanFogDiagnosticKey = [
  enablePlanarReflections ? 'reflector' : 'standard',
  Boolean(oceanMaterial),
  Boolean(reflector),
  waterLevel,
  effectiveReflectionIntensity,
  effectiveUnderwaterFogDensity,
  effectiveSurfaceMistDensity,
].join('|')

$: if (oceanFogDiagnosticKey) {
  reportOceanFogDiagnostic(oceanFogDiagnosticKey)
}

// --- REACTIVE RECREATION when quality settings change ---
$: oceanQualityKey = `${optimizedSegments.width}x${optimizedSegments.height}:${textureSize}:${Number(enablePlanarReflections)}`

$: if (
  component &&
  lastOceanQualityKey &&
  oceanQualityKey !== lastOceanQualityKey
) {
  runtimeDebugLog(
    `🌊 Ocean: Quality settings changed, recreating with segments ${optimizedSegments.width}x${optimizedSegments.height}, texture ${textureSize}px`,
  )
  void component.recreateOcean(oceanQualityKey)
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
        collisionGroups={TRIGGER_GROUP}
        activeEvents="INTERSECTION_EVENTS"
        userData={{ isOceanSensor: true, type: 'ocean-sensor' }}
        on:intersectionenter={handleIntersectionEnter}
        on:intersectionexit={handleIntersectionExit}
        on:create={() => {
          runtimeDebugLog('🌊 Ocean: Collision sensor created at Y:', waterLevel, 'Box size:', waterCollisionSize)
        }}
      />
    </RigidBody>
    
    <!-- Underwater particle effects (bubbles and mist) - also follow water level -->
    <UnderwaterEffect 
      position={[0, 0, 0]}
      size={waterCollisionSize}
      fogColor={underwaterFogColor}
      fogDensityScale={effectiveUnderwaterFogDensity}
      surfaceMistDensity={effectiveSurfaceMistDensity}
    />
  </T.Group>
{/if}
