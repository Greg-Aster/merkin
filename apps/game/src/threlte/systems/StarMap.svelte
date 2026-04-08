<!--
  Enhanced StarMap System Component
  Features:
  - Renders all stars in a single draw call using THREE.InstancedMesh.
  - GPU-powered animations (twinkle, float) via a custom shader for maximum performance.
  - No individual point lights; glow is handled efficiently by the emissive material.
  - Centralized interaction handling (click, hover) on the InstancedMesh.
  - Reactive selection highlighting is also handled on the GPU.
  - Integrated with StarNavigationSystem for timeline card display.
-->
<script lang="ts">
  import { T, useTask, useThrelte } from '@threlte/core'
  import { onMount, createEventDispatcher } from 'svelte'
  import * as THREE from 'three'
  import {
    selectedStarStore,
    gameActions,
    type StarData
  } from '../stores/gameStateStore'

  // Import the ACTUAL original system configurations
  import {
    constellationConfig,
    constellationPatterns,
    connectionPatterns,
    eraColorMap,
    colorSpectrum,
    starTypes,
  } from '../../config/timelineconfig'
  import {
    hashCode,
    getStarColor,
    getStarType,
    getSizeFactor,
    createEnhancedStarTexture
  } from '../../utils/starUtils'

  const dispatch = createEventDispatcher()
  const { camera } = useThrelte()

  // --- PROPS ---
  export let timelineEvents: any[] = []
  export let interactionSystem: any = null // Centralized interaction system from Game

  // --- STATE ---
  let stars: StarData[] = []
  let starSprites: THREE.Sprite[] = []
  let constellationLines: THREE.LineSegments[] = []
  let starGroup: THREE.Group
  let hoveredStarIndex: number | null = null
  
  // Smooth transition states for natural glow effects
  let hoverTransitions: Map<number, number> = new Map() // starIndex -> transition value (0-1)
  let selectionTransitions: Map<string, number> = new Map() // uniqueId -> transition value (0-1)
  
  // Export the component reference for StarNavigationSystem
  export { starGroup as starMapRef }

  // --- STORES ---
  $: selectedStar = $selectedStarStore

  // --- SHADER UNIFORMS ---
  // These are variables we can pass from our JS to the GPU shader.
  const uniforms = {
    u_time: { value: 0 },
    u_selectedStarIndex: { value: -1 }, // -1 means no star is selected
    u_hoveredStarIndex: { value: -1 },
    u_cameraPosition: { value: new THREE.Vector3() }
  }

  // --- LIFECYCLE & DATA GENERATION ---

  onMount(() => {
    console.log('✨ StarMap: Initializing with centralized interaction system')
    generateStars()
  })

  // This reactive block creates star sprites whenever the star data changes.
  $: if (starGroup && stars.length > 0) {
    setupStarSprites()
  }

  function generateStars() {
    const newStars: StarData[] = []
    
    console.log(`🌟 StarMap: Processing ${timelineEvents.length} timeline events`)
    
    // Process timeline events (blog posts)
    timelineEvents.forEach((event, index) => {
      const star = createStarFromTimelineEvent(event, index)
      newStars.push(star)
      if (index < 3) { // Log first few stars for debugging
        console.log(`⭐ Star ${index}:`, {
          title: star.title,
          position: star.position,
          color: star.color,
          size: star.size,
          isKeyEvent: star.isKeyEvent
        })
      }
    })
    
    // Add level stars as timeline events (they use the exact same system)
    const levelEvents = getLevelEvents()
    levelEvents.forEach((event, index) => {
      const star = createStarFromTimelineEvent(event, newStars.length + index)
      newStars.push(star)
      console.log(`🎮 Level Star ${index}:`, {
        title: star.title,
        levelId: star.levelId,
        isLevel: star.isLevel
      })
    })
    
    stars = newStars
    console.log(`✅ StarMap: Generated ${stars.length} total stars (${timelineEvents.length} timeline + ${levelEvents.length} level stars)`)
    
    // Log star distribution for debugging
    const keyEventStars = stars.filter(s => s.isKeyEvent).length
    const levelStars = stars.filter(s => s.isLevel).length
    console.log(`📊 Star distribution: ${keyEventStars} key events, ${levelStars} level stars, ${stars.length - keyEventStars - levelStars} timeline events`)
  }

  function setupStarSprites() {
    console.log(`🌟 StarMap: Creating authentic star sprites for ${stars.length} stars`)
    
    // Clear existing sprites and constellation lines
    starSprites.forEach(sprite => starGroup.remove(sprite))
    constellationLines.forEach(line => starGroup.remove(line))
    starSprites = []
    constellationLines = []

    stars.forEach((star, i) => {
      // Create authentic star sprite with enhanced texture
      const sprite = createStarSprite(star, i)
      starSprites.push(sprite)
      starGroup.add(sprite)
      
      // Debug first few stars
      if (i < 3) {
        console.log(`⭐ Star ${i} created:`, {
          title: star.title,
          position: star.position,
          color: star.color,
          era: star.era,
          size: star.size
        })
      }
    })
    
    // Create constellation lines like original system
    createConstellationLines()
    
    // Register sprites with centralized interaction system
    if (interactionSystem && starSprites.length > 0) {
      interactionSystem.registerStarSprites(starSprites, stars, {
        onClick: handleStarClick,
        onHover: (data: any, hovered: boolean) => handleStarHover(data, hovered)
      })
    }
    
    console.log(`✅ StarMap: Created ${starSprites.length} authentic star sprites with centralized interaction`)
  }

  function createStarSprite(star: StarData, index: number): THREE.Sprite {
    // Use original enhanced star texture generation
    const starType = getStarType(star.uniqueId, star.isKeyEvent)
    const canvas = createEnhancedStarTexture(star.color, starType, star.isKeyEvent)
    const texture = new THREE.CanvasTexture(canvas)
    texture.needsUpdate = true
    
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      alphaTest: 0.001,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })

    const sprite = new THREE.Sprite(material)
    sprite.position.set(...star.position)
    sprite.scale.setScalar(star.size * 30) // Natural size for distance 1000 with good clickability
    
    // Store star data for interaction
    ;(sprite as any).starData = star
    ;(sprite as any).starIndex = index
    
    // Sprite verification (minimal logging)
    if (index === 0) {
      const actualDistance = sprite.position.length()
      console.log(`🔍 Sprite created: ${star.title.substring(0, 20)}... distance ${actualDistance.toFixed(1)}`)
    }

    return sprite
  }

  // Create constellation lines like original system
  function createConstellationLines() {
    const eraGroups = groupStarsByEra()
    
    Object.entries(eraGroups).forEach(([era, eraStars]) => {
      if (eraStars.length < 2) return
      
      const config = constellationConfig[era]
      if (!config) return
      
      const pattern = constellationPatterns[config.pattern]
      const connections = connectionPatterns[config.pattern]
      
      if (!connections || !pattern) return
      
      // Create line geometry for this era's constellation
      const points: THREE.Vector3[] = []
      const colors: number[] = []
      const eraColor = new THREE.Color(eraColorMap[era] || '#ffffff')
      
      connections.forEach(([startIdx, endIdx]) => {
        if (startIdx < eraStars.length && endIdx < eraStars.length) {
          const startStar = eraStars[startIdx]
          const endStar = eraStars[endIdx]
          
          points.push(new THREE.Vector3(...startStar.position))
          points.push(new THREE.Vector3(...endStar.position))
          
          // Add colors for each vertex
          colors.push(eraColor.r, eraColor.g, eraColor.b)
          colors.push(eraColor.r, eraColor.g, eraColor.b)
        }
      })
      
      if (points.length > 0) {
        const geometry = new THREE.BufferGeometry().setFromPoints(points)
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
        
        const material = new THREE.LineBasicMaterial({
          vertexColors: true,
          transparent: true,
          opacity: 0.3,
          blending: THREE.AdditiveBlending
        })
        
        const lines = new THREE.LineSegments(geometry, material)
        constellationLines.push(lines)
        starGroup.add(lines)
      }
    })
  }
  
  function groupStarsByEra(): { [era: string]: StarData[] } {
    const groups: { [era: string]: StarData[] } = {}
    
    stars.forEach(star => {
      const era = star.era || 'unknown'
      if (!groups[era]) groups[era] = []
      groups[era].push(star)
    })
    
    return groups
  }
  
  // --- ANIMATION ---

  useTask((delta) => {
    if (starSprites.length === 0) return

    const time = performance.now() * 0.001
    
    // Periodically clean up transition maps to prevent memory leaks
    if (Math.floor(time) % 10 === 0) { // Every 10 seconds
      // Remove zero transitions
      for (const [key, value] of hoverTransitions.entries()) {
        if (value <= 0) hoverTransitions.delete(key)
      }
      for (const [key, value] of selectionTransitions.entries()) {
        if (value <= 0) selectionTransitions.delete(key)
      }
    }

    starSprites.forEach((sprite, index) => {
      const star = stars[index]
      if (!star) return

      // Authentic twinkling animation like original system
      const twinkleTime = time * star.twinkleSpeed + star.animationOffset
      const twinkle1 = Math.sin(twinkleTime) * 0.15
      const twinkle2 = Math.sin(twinkleTime * 1.7 + 1) * 0.1
      const twinkle3 = Math.sin(twinkleTime * 0.3 + 2) * 0.05
      const twinkle = 0.85 + twinkle1 + twinkle2 + twinkle3

      let scale = star.size * 50 * twinkle
      let opacity = star.intensity * twinkle

      // Smooth transition effects for natural glow
      const isSelected = selectedStar && selectedStar.uniqueId === star.uniqueId
      const isHovered = index === hoveredStarIndex
      
      // Update hover transition (smooth fade in/out)
      const currentHoverTransition = hoverTransitions.get(index) || 0
      if (isHovered) {
        hoverTransitions.set(index, Math.min(1, currentHoverTransition + delta * 3)) // 3 = transition speed
      } else {
        hoverTransitions.set(index, Math.max(0, currentHoverTransition - delta * 3))
      }
      const hoverAmount = hoverTransitions.get(index) || 0
      
      // Update selection transition (smooth fade in/out)
      const currentSelectionTransition = selectionTransitions.get(star.uniqueId) || 0
      if (isSelected) {
        selectionTransitions.set(star.uniqueId, Math.min(1, currentSelectionTransition + delta * 2)) // 2 = slower for selection
      } else {
        selectionTransitions.set(star.uniqueId, Math.max(0, currentSelectionTransition - delta * 2))
      }
      const selectionAmount = selectionTransitions.get(star.uniqueId) || 0

      // Apply smooth effects based on transition amounts
      scale *= 1 + (selectionAmount * 0.8) + (hoverAmount * 0.4) // Gradual scale increase
      opacity *= 1 + (selectionAmount * 1.0) + (hoverAmount * 0.5) // Gradual opacity increase
      
      // Debug only when transition starts
      if (isSelected && selectionAmount < 0.1 && index === 0) {
        console.log(`🔥 Selected star transition started: ${star.title.substring(0, 30)}...`)
      }

      sprite.scale.setScalar(scale)
      if (sprite.material) {
        ;(sprite.material as THREE.SpriteMaterial).opacity = Math.min(1, opacity)
      }
    })
    
    // Animate constellation lines opacity
    constellationLines.forEach(line => {
      if (line.material) {
        const baseMaterial = line.material as THREE.LineBasicMaterial
        const time = performance.now() * 0.0005
        baseMaterial.opacity = 0.2 + Math.sin(time) * 0.1
      }
    })
  })

  // --- INTERACTION HANDLERS (for centralized interaction system) ---

  function handleStarClick(data: any) {
    const { sprite, index, timestamp, ...star } = data
    console.log('⭐ StarMap: Star clicked via InteractionSystem:', star.title)
    
    // Update stores
    gameActions.selectStar(star)
    gameActions.recordInteraction('star_click', star.uniqueId)
    
    // Calculate screen position for timeline cards
    const worldPosition = new THREE.Vector3().copy(sprite.position)
    const screenPosition = interactionSystem?.getScreenPosition(worldPosition) || { x: 0, y: 0 }
    
    // Dispatch enhanced event with all necessary data
    dispatch('starSelected', {
      star: star,
      eventData: star,
      screenPosition: screenPosition,
      worldPosition: worldPosition,
      index: index,
      timestamp: timestamp
    })
    
    // Emit global event for StarNavigationSystem
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('starmap.star.selected', {
        detail: {
          eventData: star,
          screenPosition: screenPosition,
          worldPosition: worldPosition,
          index: index
        }
      }))
    }
  }

  function handleStarHover(data: any, hovered: boolean) {
    if (hovered) {
      hoveredStarIndex = data.index
      gameActions.recordInteraction('star_hover', data.uniqueId)
    } else {
      hoveredStarIndex = null
    }
  }


  // --- REACTIVE UPDATES ---

  // Update shader uniform when the selected star changes
  $: uniforms.u_selectedStarIndex.value = selectedStar
    ? stars.findIndex(s => s.uniqueId === selectedStar.uniqueId)
    : -1
  
  // Update shader uniform for hover effect
  $: uniforms.u_hoveredStarIndex.value = hoveredStarIndex ?? -1

  // --- ADVANCED STAR SHADER (Modernized from original) ---

  const onBeforeCompile = (shader: THREE.Shader) => {
    // Add our custom uniforms and attributes to the shader
    shader.uniforms.u_time = uniforms.u_time
    shader.uniforms.u_selectedStarIndex = uniforms.u_selectedStarIndex
    shader.uniforms.u_hoveredStarIndex = uniforms.u_hoveredStarIndex
    shader.uniforms.u_cameraPosition = uniforms.u_cameraPosition

    // Inject code into the vertex shader
    shader.vertexShader = `
      attribute vec3 a_color;
      attribute vec4 a_attributes; // size, intensity, twinkleSpeed, animationOffset
      
      varying vec3 v_color;
      varying vec4 v_attributes;
      varying float v_is_selected;
      varying float v_is_hovered;
      varying vec2 v_uv;
      varying vec3 v_worldPosition;

      ${shader.vertexShader}
    `.replace(
      '#include <project_vertex>',
      `
      v_color = a_color;
      v_attributes = a_attributes;
      v_uv = uv;
      
      // Check if this instance is selected or hovered
      v_is_selected = float(gl_InstanceID == int(u_selectedStarIndex));
      v_is_hovered = float(gl_InstanceID == int(u_hoveredStarIndex));

      // Advanced twinkle animation (combining multiple sine waves like original)
      float baseTime = u_time * v_attributes.z + v_attributes.w;
      float twinkle1 = sin(baseTime) * 0.2;
      float twinkle2 = sin(baseTime * 1.7 + 1.0) * 0.15;
      float twinkle3 = sin(baseTime * 0.3 + 2.0) * 0.1;
      float twinkle = 0.85 + twinkle1 + twinkle2 + twinkle3;
      
      float scale = v_attributes.x * twinkle;
      
      // Selection and hover effects
      scale *= 1.0 + v_is_selected * 0.8 + v_is_hovered * 0.4;

      // Store world position for constellation lines later
      vec4 worldPos = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
      v_worldPosition = worldPos.xyz;

      // Final position calculation
      vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position * scale, 1.0);
      gl_Position = projectionMatrix * mvPosition;
      `
    )

    // Enhanced fragment shader with star-like appearance
    shader.fragmentShader = `
      varying vec3 v_color;
      varying vec4 v_attributes;
      varying float v_is_selected;
      varying float v_is_hovered;
      varying vec2 v_uv;
      varying vec3 v_worldPosition;

      uniform float u_time;
      
      ${shader.fragmentShader}
    `.replace(
      '#include <dithering_fragment>',
      `
      #include <dithering_fragment>
      
      // Create star-like appearance with UV coordinates
      vec2 center = vec2(0.5, 0.5);
      vec2 uv_centered = v_uv - center;
      float dist = length(uv_centered);
      
      // Create multiple glow layers like original system
      float core = 1.0 - smoothstep(0.0, 0.1, dist);
      float inner_glow = 1.0 - smoothstep(0.0, 0.3, dist);
      float outer_glow = 1.0 - smoothstep(0.0, 0.5, dist);
      
      // Base intensity with twinkle
      float baseTime = u_time * v_attributes.z + v_attributes.w;
      float intensity_twinkle = sin(baseTime * 0.8) * 0.3 + 0.7;
      float intensity = v_attributes.y * intensity_twinkle;
      
      // Create classic star rays (4-pointed star effect)
      float angle = atan(uv_centered.y, uv_centered.x);
      float ray_intensity = abs(cos(angle * 2.0)) * 0.3;
      float vertical_ray = abs(cos(angle)) * 0.3;
      
      // Combine all effects
      float final_alpha = core * 1.0 + inner_glow * 0.6 + outer_glow * 0.3;
      final_alpha += ray_intensity * intensity;
      final_alpha += vertical_ray * intensity * 0.5;
      
      // Apply selection and hover glow
      float glow_boost = v_is_selected * 1.5 + v_is_hovered * 0.8;
      intensity += glow_boost;
      
      // Create bright emissive star appearance
      vec3 final_color = v_color * (intensity + 0.5);
      final_color += v_color * glow_boost * 2.0; // Extra glow for selected/hovered
      
      // Ensure stars are always visible (emissive)
      gl_FragColor = vec4(final_color, final_alpha * intensity);
      gl_FragColor.rgb = max(gl_FragColor.rgb, v_color * 0.3); // Minimum visibility
      `
    )
  }

  // --- CONSTELLATION-BASED STAR POSITIONING (Using imported configuration) ---

  function createStarFromTimelineEvent(event: any, index: number): StarData {
    const era = event.era || 'unknown'
    const config = constellationConfig[era] || constellationConfig.unknown
    const pattern = constellationPatterns[config.pattern] || constellationPatterns.scattered
    
    // Group events by era for constellation positioning
    const eraEvents = timelineEvents.filter(e => (e.era || 'unknown') === era)
    let indexInEra = eraEvents.findIndex(e => e.uniqueId === event.uniqueId || e.slug === event.slug)
    
    // If not found in timeline events (e.g., level stars), use a deterministic index
    if (indexInEra === -1) {
      // Use hash of the star's unique ID to get consistent positioning
      const starId = event.uniqueId || event.id || event.title
      const hash = hashCode(starId)
      indexInEra = Math.abs(hash) % 10 // Deterministic position in constellation
    }
    
    const patternIndex = indexInEra % pattern.length
    const patternPosition = pattern[patternIndex]
    
    // Add offset for overlapping stars (when more events than pattern positions)
    const overlapGroup = Math.floor(indexInEra / pattern.length)
    const offsetMultiplier = overlapGroup * 8 // 8 degrees offset per overlap group
    
    // Safety check for pattern position
    if (!patternPosition) {
      console.warn(`Missing pattern position for era: ${era}, pattern: ${config.pattern}, index: ${patternIndex}`)
      // Use default offset if pattern position is missing
      return {
        uniqueId: event.uniqueId || event.slug || `fallback_star_${index}`,
        position: [100, 100, 100], // Safe fallback position
        color: '#ffffff',
        size: 1.0,
        title: event.title || 'Unknown Star'
      }
    }
    
    // Calculate position using spherical coordinates with overlap prevention
    const azimuthDeg = config.centerAzimuth + patternPosition.azOffset + offsetMultiplier
    const elevationDeg = Math.max(25, Math.min(75, 
      config.centerElevation + patternPosition.elOffset + (offsetMultiplier * 0.3)
    ))
    
    // Convert to 3D coordinates using skybox radius
    const azimuthRad = (azimuthDeg * Math.PI) / 180
    const elevationRad = (elevationDeg * Math.PI) / 180
    const polarAngleRad = Math.PI / 2 - elevationRad
    const sphereRadius = 1000  // Match skybox distance exactly
    
    const x = sphereRadius * Math.sin(polarAngleRad) * Math.cos(azimuthRad)
    const y = sphereRadius * Math.cos(polarAngleRad)
    const z = sphereRadius * Math.sin(polarAngleRad) * Math.sin(azimuthRad)
    
    // Positioning verification (minimal logging)
    const calculatedDistance = Math.sqrt(x*x + y*y + z*z)
    if (index === 0) {
      console.log(`🔍 Star positioning verified: distance ${calculatedDistance.toFixed(1)} (expected ${sphereRadius})`)
    }
    
    // Use original era colors and sizing with size factor
    const eraColor = getStarColor(event.uniqueId || event.slug, era, true)
    const starSize = getSizeFactor(event.isKeyEvent || false)
    
    const starData = {
      uniqueId: event.uniqueId || event.slug || `timeline_star_${index}`,
      position: [x, y, z],
      color: eraColor,
      size: starSize,
      intensity: event.isKeyEvent ? 1.2 : 0.8,
      title: event.title || `Star ${index + 1}`,
      description: event.description || 'A distant star',
      timelineYear: event.year,
      timelineEra: event.era,
      timelineLocation: event.location,
      isKeyEvent: event.isKeyEvent || false,
      isLevel: event.isLevel || false,
      levelId: event.levelId,
      tags: event.tags || [],
      category: event.category || 'unknown',
      slug: event.slug,
      clickable: true,
      hoverable: true,
      unlocked: true,
      animationOffset: 0,
      twinkleSpeed: 1.0,
      screenPosition: { cardClass: 'bottom' },
      era: era,
      // Include all original event data for timeline cards
      ...event
    }
    
    // Debug duplicate events (only first 3 for brevity)
    if (index < 3) {
      console.log(`🔍 Star ${index} data mapping:`, {
        uniqueId: starData.uniqueId,
        title: starData.title?.substring(0, 30) + '...'
      })
    }
    
    return starData
  }

  // --- PURE LEVEL STAR DATA ---
  
  function getLevelEvents() {
    // Level stars as simple timeline events - same format as existing events
    return [
      {
        id: "level-star-hybrid-observatory",
        uniqueId: "level-star-hybrid-observatory", 
        title: "Hybrid Observatory",
        description: "Enter the Hybrid Observatory level",
        slug: null,
        year: 2150,
        era: "unknown", // Use unknown era so it floats by itself
        isLevel: true,
        levelId: "hybrid-observatory",
        isKeyEvent: false,
        category: "level"
      },
      {
        id: "level-star-sci-fi-room",
        uniqueId: "level-star-sci-fi-room",
        title: "Sci Fi Room", 
        description: "Enter the Sci Fi Room level",
        slug: null,
        year: 2500,
        era: "unknown", // Use unknown era so it floats by itself
        isLevel: true,
        levelId: "sci-fi-room", 
        isKeyEvent: false,
        category: "level"
      }
    ]
  }

</script>

<T.Group name="authentic-starnode-system" bind:ref={starGroup}>
  <!-- Sprites are registered with InteractionSystem automatically -->
</T.Group>
