<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher, getContext } from 'svelte'
  import { T, useTask, useThrelte } from '@threlte/core'
  import * as THREE from 'three'
  import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
  import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
  import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js'
  import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
  import type { SystemRegistry, ComponentType, LevelComponent } from '../core/LevelSystem'
  import { findClosestPaletteColor } from './StylePalettes'
  import { fixMaterialDepthIssues } from '../utils/materialUtils'
  
  const dispatch = createEventDispatcher()
  
  // Props for style configuration
  export let stylePreset: 'ghibli' | 'alto' | 'monument' | 'retro' = 'ghibli'
  export let enableOutlines = false
  export let enableToonShading = true
  export let enableColorGrading = true
  export let enableVignette = true
  export let outlineStrength = 2.5
  export let outlineThickness = 0.005
  
  // Lighting control props
  export let enableStyleLighting = true
  export let ambientColor = '#222244' // <-- ADDED THIS NEW PROP
  export let ambientIntensity = 10.4
  export let sunIntensity = 0.8
  export let fillIntensity = 0.3
  export let toneMappingExposure = 1.2
  
  // Get system context
  const registry: SystemRegistry = getContext('systemRegistry')
  const { scene, renderer, camera } = useThrelte()
  
  // Style system state
  let isInitialized = false
  let processedMaterials = new Map<string, THREE.Material>()
  let originalMaterials = new Map<string, THREE.Material>()
  let composer: EffectComposer | null = null
  let outlinePass: OutlinePass | null = null
  
  // Ghibli-inspired color palettes
  const stylePalettes = {
    ghibli: {
      sky: new THREE.Color('#0A0A20'), // Very dark blue-purple (almost black)
      skyGradient: new THREE.Color('#1A1A33'), // Dark blue-purple
      water: new THREE.Color('#003344'), // Deep teal/dark blue-green
      grass: new THREE.Color('#004433'), // Deep forest green-blue
      earth: new THREE.Color('#222233'), // Dark blue-grey
      trees: new THREE.Color('#002211'), // Very dark green-blue
      flowers: [new THREE.Color('#663366'), new THREE.Color('#336666')], // Dark purple, dark blue-green
      fireflies: [new THREE.Color('#FFD700'), new THREE.Color('#FFAC33'), new THREE.Color('#FF6347')], // Keep warm for contrast
      ambient: new THREE.Color('#222244'), // Dark blue-purple ambient
      sun: new THREE.Color('#CCCCFF'), // Cool white/light blue for moon/subtle light
      shadow: new THREE.Color('#000011'), // Extremely dark blue for shadows
      fog: new THREE.Color('#333355'), // Dark blue-purple fog
      outline: new THREE.Color('#000000') // Pure black outlines
    },
    alto: {
      sky: new THREE.Color('#F0E68C'),
      skyGradient: new THREE.Color('#DDA0DD'),
      water: new THREE.Color('#87CEEB'),
      grass: new THREE.Color('#98FB98'),
      earth: new THREE.Color('#F5DEB3'),
      trees: new THREE.Color('#8FBC8F'),
      flowers: new THREE.Color('#FFB6C1'),
      fireflies: [new THREE.Color('#FFFF00'), new THREE.Color('#FFA500')],
      ambient: new THREE.Color('#FFF8DC'),
      sun: new THREE.Color('#FFD700'),
      shadow: new THREE.Color('#708090'),
      fog: new THREE.Color('#E0E0E0'),
      outline: new THREE.Color('#696969')
    },
    monument: {
      sky: new THREE.Color('#E6E6FA'),
      skyGradient: new THREE.Color('#F0E68C'),
      water: new THREE.Color('#B0E0E6'),
      grass: new THREE.Color('#90EE90'),
      earth: new THREE.Color('#F5F5DC'),
      trees: new THREE.Color('#8FBC8F'),
      flowers: new THREE.Color('#DDA0DD'),
      fireflies: [new THREE.Color('#FFFACD'), new THREE.Color('#F0E68C')],
      ambient: new THREE.Color('#F8F8FF'),
      sun: new THREE.Color('#FFFACD'),
      shadow: new THREE.Color('#D3D3D3'),
      fog: new THREE.Color('#F0F8FF'),
      outline: new THREE.Color('#A9A9A9')
    },
    retro: {
      sky: new THREE.Color('#FF6B6B'),
      skyGradient: new THREE.Color('#4ECDC4'),
      water: new THREE.Color('#45B7D1'),
      grass: new THREE.Color('#96CEB4'),
      earth: new THREE.Color('#FFEAA7'),
      trees: new THREE.Color('#6C5CE7'),
      flowers: new THREE.Color('#FD79A8'),
      fireflies: [new THREE.Color('#FDCB6E'), new THREE.Color('#E17055')],
      ambient: new THREE.Color('#DDA0DD'),
      sun: new THREE.Color('#FDCB6E'),
      shadow: new THREE.Color('#2D3436'),
      fog: new THREE.Color('#B2BEC3'),
      outline: new THREE.Color('#2D3436')
    }
  }
  
  // Current palette
  $: currentPalette = stylePalettes[stylePreset]
  
  onMount(() => {
    console.log(`🎨 Initializing ${stylePreset} visual style system...`)
    initializeStyleSystem()
  })
  
  /**
   * Initialize the global style system
   */
  function initializeStyleSystem() {
    if (!scene || !renderer) {
      console.warn('⚠️ Scene or renderer not available for style system')
      return
    }
    
    // Apply global renderer settings for stylized look
    setupRenderer()
    
    // Convert existing materials to toon shading
    if (enableToonShading) {
      convertSceneToToonShading()
    }
    
    // Setup post-processing if enabled
    if (enableOutlines && scene && renderer) {
      setupPostProcessing()
    }
    
    // Register with level management system
    registerWithLevelSystem()
    
    isInitialized = true
    console.log(`✅ ${stylePreset} style system initialized`)
    
    dispatch('styleSystemReady', { palette: currentPalette, preset: stylePreset })
  }
  
  /**
   * Configure renderer for stylized visuals
   */
  function setupRenderer() {
    if (!renderer) return
    
    // Enable tone mapping for better color control
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = toneMappingExposure
    
    // Enable shadows with soft edges for more stylized look
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    
    // Set clear color based on style
    renderer.setClearColor(currentPalette.sky, 1.0)
    
    // Enable gamma correction for better colors
    renderer.outputColorSpace = THREE.SRGBColorSpace
    
    console.log('🎨 Renderer configured for stylized visuals')
  }
  
  /**
   * Setup post-processing effects
   */
  function setupPostProcessing() {
    if (!scene || !renderer) return
    
    // Create effect composer
    composer = new EffectComposer(renderer)
    
    // Add render pass
    const renderPass = new RenderPass(scene, camera)
    composer.addPass(renderPass)
    
    // Add outline pass if enabled
    if (enableOutlines) {
      outlinePass = new OutlinePass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        scene,
        camera
      )
      
      outlinePass.edgeStrength = outlineStrength
      outlinePass.edgeGlow = 0.2
      outlinePass.edgeThickness = outlineThickness
      outlinePass.visibleEdgeColor.set(currentPalette.outline)
      outlinePass.hiddenEdgeColor.set(currentPalette.outline)
      
      composer.addPass(outlinePass)
    }
    
    console.log('🎨 Post-processing effects initialized')
  }
  
  /**
   * Convert scene materials to toon shading
   */
  function convertSceneToToonShading() {
    if (!scene) return
    
    scene.traverse((object) => {
      if (object.isMesh && object.material) {
        const mesh = object as THREE.Mesh
        
        // Skip if already processed
        const materialId = mesh.uuid + '_material'
        if (processedMaterials.has(materialId)) return
        
        // Store original material
        originalMaterials.set(materialId, mesh.material.clone())
        
        // Convert to toon material
        const toonMaterial = createToonMaterial(mesh.material, object.name)
        mesh.material = toonMaterial
        processedMaterials.set(materialId, toonMaterial)
      }
    })
    
    console.log(`🎨 Converted ${processedMaterials.size} materials to toon shading`)
  }
  
  /**
   * Create toon material from existing material
   */
  function createToonMaterial(originalMaterial: THREE.Material, objectName: string): THREE.MeshToonMaterial {
    const material = originalMaterial as any
    
    // Determine appropriate color based on object type
    let baseColor = currentPalette.earth // default
    
    if (objectName.toLowerCase().includes('tree') || objectName.toLowerCase().includes('birch') || objectName.toLowerCase().includes('maple')) {
      baseColor = currentPalette.trees
    } else if (objectName.toLowerCase().includes('grass')) {
      baseColor = currentPalette.grass
    } else if (objectName.toLowerCase().includes('flower')) {
      baseColor = currentPalette.flowers
    } else if (objectName.toLowerCase().includes('water') || objectName.toLowerCase().includes('ocean')) {
      baseColor = currentPalette.water
    } else if (material.color) {
      // Try to convert and map existing color to palette
      try {
        let sourceColor: THREE.Color
        if (material.color instanceof THREE.Color) {
          sourceColor = material.color
        } else if (typeof material.color === 'number') {
          sourceColor = new THREE.Color(material.color)
        } else if (typeof material.color === 'string') {
          sourceColor = new THREE.Color(material.color)
        } else {
          sourceColor = new THREE.Color(0xffffff) // fallback to white
        }
        baseColor = findClosestPaletteColor(sourceColor, currentPalette)
      } catch (error) {
        console.warn('Failed to convert material color:', error)
        baseColor = currentPalette.earth
      }
    }
    
    return new THREE.MeshToonMaterial({
      color: baseColor,
      map: material.map || null,
      normalMap: material.normalMap || null,
      transparent: material.transparent || false,
      opacity: material.opacity || 1.0,
      alphaTest: material.alphaTest || 0,
      side: material.side || THREE.FrontSide,
      
      // Toon-specific properties
      gradientMap: createToonGradientMap(),
      
      // Preserve supported material properties (envMap not supported in MeshToonMaterial)
      aoMap: material.aoMap || null,
    })
  }
  
  /**
   * Create gradient map for toon shading
   */
  function createToonGradientMap(): THREE.Texture {
    // Create a simple 3-step gradient for cartoon-like shading
    const colors = new Uint8Array([
      // Dark shadow
      Math.floor(currentPalette.shadow.r * 255),
      Math.floor(currentPalette.shadow.g * 255), 
      Math.floor(currentPalette.shadow.b * 255),
      // Mid tone
      200, 200, 200,
      // Light
      255, 255, 255
    ])
    
    const gradientMap = new THREE.DataTexture(colors, 3, 1, THREE.RGBFormat)
    gradientMap.needsUpdate = true
    gradientMap.magFilter = THREE.NearestFilter
    gradientMap.minFilter = THREE.NearestFilter
    
    return gradientMap
  }
  
  
  /**
   * Register with level management system
   */
  function registerWithLevelSystem() {
    if (registry) {
      // Send style palette to other systems
      registry.sendMessage({
        type: 'STYLE_SYSTEM_READY' as any,
        source: 'ghibli-style-system',
        data: {
          palette: currentPalette,
          preset: stylePreset,
          materials: processedMaterials
        },
        timestamp: Date.now(),
        priority: 'normal'
      })
    }
  }
  
  /**
   * Update scene when style preset changes
   */
  $: if (isInitialized && scene) {
    updateSceneStyle()
  }
  
  function updateSceneStyle() {
    // Update renderer clear color
    renderer?.setClearColor(currentPalette.sky, 1.0)
    
    // Re-convert materials with new palette
    convertSceneToToonShading()
    
    // Update outline colors if enabled
    if (outlinePass) {
      outlinePass.visibleEdgeColor.set(currentPalette.outline)
      outlinePass.hiddenEdgeColor.set(currentPalette.outline)
    }
    
    // Notify other systems of style change
    dispatch('styleChanged', { palette: currentPalette, preset: stylePreset })
    
    if (registry) {
      registry.sendMessage({
        type: 'STYLE_CHANGED' as any,
        source: 'ghibli-style-system',
        data: { palette: currentPalette, preset: stylePreset },
        timestamp: Date.now(),
        priority: 'high'
      })
    }
  }
  
  /**
   * Apply style to new objects (called when objects are added to scene)
   */
  export function styleNewObject(object: THREE.Object3D) {
    if (!enableToonShading) return
    
    object.traverse((child) => {
      if (child.isMesh && child.material) {
        const mesh = child as THREE.Mesh
        const materialId = mesh.uuid + '_material'
        
        if (!processedMaterials.has(materialId)) {
          originalMaterials.set(materialId, mesh.material.clone())
          const toonMaterial = createToonMaterial(mesh.material, child.name)
          mesh.material = toonMaterial
          processedMaterials.set(materialId, toonMaterial)
        }
      }
    })
  }
  
  /**
   * Get current palette for other systems
   */
  export function getCurrentPalette() {
    return currentPalette
  }
  
  /**
   * Get specific palette color
   */
  export function getColor(colorName: keyof typeof currentPalette): THREE.Color {
    const color = currentPalette[colorName]
    return color instanceof THREE.Color ? color : currentPalette.earth
  }
  
  /**
   * Revert to original materials (for debugging)
   */
  export function revertToOriginalMaterials() {
    if (!scene) return
    
    scene.traverse((object) => {
      if (object.isMesh) {
        const mesh = object as THREE.Mesh
        const materialId = mesh.uuid + '_material'
        const originalMaterial = originalMaterials.get(materialId)
        
        if (originalMaterial) {
          mesh.material = originalMaterial
        }
      }
    })
    
    processedMaterials.clear()
    console.log('🎨 Reverted to original materials')
  }
  
  onDestroy(() => {
    // Clean up processed materials
    processedMaterials.forEach(material => material.dispose())
    processedMaterials.clear()
    originalMaterials.clear()
    
    // Clean up post-processing
    if (composer) {
      composer.dispose()
      composer = null
    }
    
    if (outlinePass) {
      outlinePass.dispose()
      outlinePass = null
    }
    
    console.log('🧹 Style system disposed')
  })
</script>

{#if isInitialized && enableStyleLighting}
  
  <T.AmbientLight 
    color={ambientColor} intensity={ambientIntensity}
  />
  
  <T.DirectionalLight
    position={[50, 100, 50]}
    color={currentPalette.sun}
    intensity={sunIntensity}
    castShadow={false}
    shadow.mapSize.width={2048}
    shadow.mapSize.height={2048}
    shadow.camera.near={0.1}
    shadow.camera.far={500}
    shadow.camera.left={-200}
    shadow.camera.right={200}
    shadow.camera.top={200}
    shadow.camera.bottom={-200}
  />
  
  <T.DirectionalLight
    position={[-30, 50, -30]}
    color={currentPalette.ambient}
    intensity={fillIntensity}
    castShadow={false}
  />
  
{/if}

{#if isInitialized}
  <T.Fog
    color={currentPalette.fog}
    near={50}
    far={300}
  />
{/if}

<style>
  /* No styles needed */
</style>