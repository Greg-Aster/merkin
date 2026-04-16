<!--
  SciFiRoom — Multi-zone procedural level showcase

  Zones:
  1. Command Center (Entry, interior)
  2. Courtyard (Starfield, gardens, fountain)
  3. Wasteland (Vast junk-strewn plane)

  Features:
  - Clickable story objects throughout
  - Starfield from Observatory level
  - Interactive plants, bench, fountain
  - Junk terrain with varied geometry
  - Portal back to Observatory
-->
<script lang="ts">
  import { createEventDispatcher, onDestroy, onMount } from 'svelte'
  import { T, useTask } from '@threlte/core'
  import { RigidBody, Collider } from '@threlte/rapier'
  import * as THREE from 'three'
  import LevelManager from '../core/LevelManager.svelte'
  import StarSprite from '../components/StarSprite.svelte'
  import LevelTransitionHandler from '../components/LevelTransitionHandler.svelte'
  import Skybox from '../systems/Skybox.svelte'
  import StarMap from '../systems/StarMap.svelte'
  import StarNavigationSystem from '../components/StarNavigationSystem.svelte'
  import { gameActions } from '../stores/gameStateStore'

  const dispatch = createEventDispatcher()

  export let spawnSystem: any = null
  export let interactionSystem: any = null
  export let playerSpawnPoint: [number, number, number] = [0, 1, 0]
  export let timelineEvents: any[] = []
  export let timelineEventsJson: string = '[]'

  const SCALE = 4
  const W = 5.39 * SCALE
  const H = 2.06 * SCALE
  const D = 4.63 * SCALE

  const FLOOR_Y = -0.08 * SCALE
  const T_WALL = 0.12 * SCALE
  const COURTYARD_Y = FLOOR_Y
  const COURTYARD_Z = D + 3.0
  const WASTELAND_Z = D + 6.0
  const PORTAL_X = -W/2 + 0.8
  const PORTAL_Z = -D/2 + 1.0
  const STAR_MAP_ROTATION: Vector3Tuple = [-0.06, -0.52, 0.02]
  const WASTELAND_TILE_THICKNESS = T_WALL * 0.8
  const WASTELAND_TILE_GEOMETRY_ARGS: [number, number, number] = [W, WASTELAND_TILE_THICKNESS, W]
  const WASTELAND_COLLIDER_ARGS: [number, number, number] = [W/2, WASTELAND_TILE_THICKNESS/2, W/2]

  const scaledSpawnPoint: [number, number, number] = [
    playerSpawnPoint[0],
    FLOOR_Y + (playerSpawnPoint[1] - (-0.08)) * SCALE,
    playerSpawnPoint[2]
  ]

  const COL_FLOOR = '#1a2630'
  const COL_WALL = '#2a3d4a'
  const COL_TRIM = '#00d4ff'
  const COL_ACCENT = '#ff00ff'

  type Vector3Tuple = [number, number, number]
  type ColorValue = number | string

  interface StoryPoint {
    name: string
    position: Vector3Tuple
    text: string
  }

  interface WastelandTile {
    id: string
    position: Vector3Tuple
  }

  interface JunkItem {
    id: string
    position: Vector3Tuple
    rotation: Vector3Tuple
    geometry: 'box' | 'cylinder' | 'octahedron'
    args: number[]
  }

  interface AccentLight {
    id: string
    position: Vector3Tuple
  }

  interface InteractiveMarker {
    id: string
    position: Vector3Tuple
    color: ColorValue
    size: number
    intensity: number
    animationOffset: number
    interactionType: 'portal' | 'story'
    storyPointName?: string
  }

  function createVector3(x: number, y: number, z: number): Vector3Tuple {
    return [x, y, z]
  }

  function createSeededRandom(seed: number) {
    let state = seed >>> 0

    return () => {
      state += 0x6D2B79F5
      let value = Math.imul(state ^ (state >>> 15), 1 | state)
      value ^= value + Math.imul(value ^ (value >>> 7), 61 | value)
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296
    }
  }

  function createWastelandTiles(): WastelandTile[] {
    return Array.from({ length: 6 }, (_, i) =>
      Array.from({ length: 6 }, (_, j) => {
        const x = (i - 2.5) * (W * 2.0)
        const z = (j - 2.5) * (W * 2.0) + WASTELAND_Z
        const y = FLOOR_Y + Math.sin(i * 0.7) * 0.8 + Math.cos(j * 0.7) * 0.8

        return {
          id: `wasteland-tile-${i}-${j}`,
          position: createVector3(x, y, z)
        }
      })
    ).flat()
  }

  function createJunkItems(count: number): JunkItem[] {
    const random = createSeededRandom(0x7a11e2)

    return Array.from({ length: count }, (_, index) => {
      const position = createVector3(
        (random() - 0.5) * (W * 8),
        FLOOR_Y + random() * 2.0,
        random() * (W * 8) + WASTELAND_Z - W * 4
      )
      const rotation = createVector3(random() * Math.PI, random() * Math.PI, random() * Math.PI)
      const type = index % 3

      if (type === 0) {
        return {
          id: `junk-${index}`,
          position,
          rotation,
          geometry: 'box',
          args: [random() * 0.8 + 0.3, random() * 0.8 + 0.3, random() * 0.8 + 0.3]
        }
      }

      if (type === 1) {
        return {
          id: `junk-${index}`,
          position,
          rotation,
          geometry: 'cylinder',
          args: [random() * 0.4 + 0.2, random() * 0.4 + 0.2, random() * 1.0 + 0.4, 8]
        }
      }

      return {
        id: `junk-${index}`,
        position,
        rotation,
        geometry: 'octahedron',
        args: [random() * 0.6 + 0.2]
      }
    })
  }

  function createAccentLights(count: number): AccentLight[] {
    const random = createSeededRandom(0xacc311)

    return Array.from({ length: count }, (_, index) => ({
      id: `junk-accent-${index}`,
      position: createVector3(
        (random() - 0.5) * (W * 6),
        FLOOR_Y + 2.0,
        random() * (W * 6) + WASTELAND_Z - W * 3
      )
    }))
  }

  const strangePlantOffsets: Array<[number, number]> = [[-3.0, 4.0], [3.0, 4.0], [-3.0, 2.0], [3.0, 2.0]]
  const junkMemoryMarkerPositions: Vector3Tuple[] = [
    createVector3(-1.8, FLOOR_Y + 1.35, WASTELAND_Z + 2.5),
    createVector3(2.2, FLOOR_Y + 1.6, WASTELAND_Z + 7.8),
    createVector3(-3.6, FLOOR_Y + 1.8, WASTELAND_Z + 12.4)
  ]
  const wastelandTiles = createWastelandTiles()
  const junkItems = createJunkItems(30)
  const junkAccentLights = createAccentLights(8)
  const portalGuideLights = [
    createVector3(-2.6, FLOOR_Y + 0.05, -4.4),
    createVector3(-4.4, FLOOR_Y + 0.05, -5.6),
    createVector3(-6.2, FLOOR_Y + 0.05, -6.7),
    createVector3(-8.0, FLOOR_Y + 0.05, -7.5)
  ]
  const celestialCrownNodes = Array.from({ length: 6 }, (_, index) => {
    const angle = (index / 6) * Math.PI * 2
    return {
      id: `crown-node-${index}`,
      position: createVector3(
        Math.cos(angle) * 2.5,
        COURTYARD_Y + 3.1 + (index % 2 === 0 ? 0.2 : -0.05),
        COURTYARD_Z + Math.sin(angle) * 2.5
      ),
      scale: index % 2 === 0 ? 0.16 : 0.11,
      color: index % 2 === 0 ? '#d7ecff' : '#8fd4ff'
    }
  })
  const commandSilhouetteFins = [
    { id: 'fin-left', position: createVector3(-4.8, FLOOR_Y + 2.5, -3.8), height: 3.6 },
    { id: 'fin-right', position: createVector3(4.8, FLOOR_Y + 2.5, -3.8), height: 3.6 }
  ]
  const wastelandMonoliths = [
    { id: 'mono-a', position: createVector3(-8.5, FLOOR_Y + 3.8, WASTELAND_Z + 13.5), scale: createVector3(1.2, 7.6, 1.0), color: '#3d4458' },
    { id: 'mono-b', position: createVector3(7.2, FLOOR_Y + 4.6, WASTELAND_Z + 18.5), scale: createVector3(1.5, 9.2, 1.2), color: '#4d3c58' },
    { id: 'mono-c', position: createVector3(-2.4, FLOOR_Y + 3.1, WASTELAND_Z + 22.0), scale: createVector3(0.9, 6.2, 0.9), color: '#4b4d52' }
  ]
  const courtyardObservationRig = {
    base: createVector3(5.4, COURTYARD_Y + 0.8, COURTYARD_Z + 1.2),
    barrel: createVector3(5.1, COURTYARD_Y + 1.8, COURTYARD_Z + 0.1)
  }

  let time = 0
  let screenPulse = 0
  let displayPhase = 0
  let hoveredInteractiveId: string | null = null
  let levelTransitionHandler: { transitionToLevel?: (levelId: string) => boolean } | null = null
  let starMapComponent: any = null
  let starMapRef: THREE.Group
  let starNavigationSystem: any = null
  let realTimelineEvents: any[] = []
  let isLoadingTimeline = true
  let timelineLoadError: string | null = null

  $: screenColor = displayPhase < 0.33 ? '#0066cc' : displayPhase < 0.66 ? '#00ccff' : '#6600ff'
  $: screenGlow = screenPulse % 2 < 1 ? 1.2 : 0.8

  useTask((delta) => {
    time += delta
    screenPulse = (time * 2) % 2
    displayPhase = (time * 0.5) % 1
  })

  const storyPoints: StoryPoint[] = [
    { name: 'pillar-whisper', position: createVector3(3.0, FLOOR_Y + 1.5, -2.0), text: 'The pillar hums first, like a machine trying to remember the language of prayer.' },
    { name: 'bench-note', position: createVector3(0, COURTYARD_Y + 0.7, COURTYARD_Z - 2.0), text: 'The bench offers a pause before the open sky, its carved warning almost tender: look up before you go farther.' },
    { name: 'fountain-inscription', position: createVector3(0, COURTYARD_Y + 0.8, COURTYARD_Z), text: 'At the courtyard heart, the fountain mirrors the constellations, as if the room is learning to become an observatory.' },
    { name: 'strange-plant', position: createVector3(3.0, COURTYARD_Y + 2.2, COURTYARD_Z + 4.0), text: 'The spiral plants lean toward one particular star cluster, suggesting the garden knows the route better than you do.' },
    { name: 'junk-memory', position: createVector3(-3.6, FLOOR_Y + 1.8, WASTELAND_Z + 12.4), text: 'Deep in the wasteland, the debris resolves into intent: this ruin was not abandoned, it was aimed at the heavens and left mid-sentence.' }
  ]
  const storyPointByName = new Map(storyPoints.map((point) => [point.name, point]))

  const storyMarkers: InteractiveMarker[] = [
    {
      id: 'story-pillar-whisper',
      position: createVector3(3.0, FLOOR_Y + 1.5, -2.0),
      color: COL_ACCENT,
      size: 0.72,
      intensity: 0.95,
      animationOffset: 0.2,
      interactionType: 'story',
      storyPointName: 'pillar-whisper'
    },
    {
      id: 'story-bench-note',
      position: createVector3(0, COURTYARD_Y + 0.7, COURTYARD_Z - 2.0),
      color: '#ffaa00',
      size: 0.68,
      intensity: 0.92,
      animationOffset: 0.55,
      interactionType: 'story',
      storyPointName: 'bench-note'
    },
    {
      id: 'story-fountain-inscription',
      position: createVector3(0, COURTYARD_Y + 0.8, COURTYARD_Z),
      color: '#00ccff',
      size: 0.78,
      intensity: 1.0,
      animationOffset: 0.9,
      interactionType: 'story',
      storyPointName: 'fountain-inscription'
    },
    ...strangePlantOffsets.map(([x, z], index) => ({
      id: `story-strange-plant-${index}`,
      position: createVector3(x, COURTYARD_Y + 2.2, COURTYARD_Z + z),
      color: '#00ff88',
      size: 0.58,
      intensity: 0.9,
      animationOffset: 1.5 + index * 0.25,
      interactionType: 'story' as const,
      storyPointName: 'strange-plant'
    })),
    ...junkMemoryMarkerPositions.map((position, index) => ({
      id: `story-junk-memory-${index}`,
      position,
      color: '#ff6666',
      size: index === junkMemoryMarkerPositions.length - 1 ? 0.84 : 0.72,
      intensity: index === junkMemoryMarkerPositions.length - 1 ? 1.05 : 0.92,
      animationOffset: 2.6 + index * 0.28,
      interactionType: 'story' as const,
      storyPointName: 'junk-memory'
    }))
  ]

  const portalMarker: InteractiveMarker = {
    id: 'portal-observatory',
    position: createVector3(PORTAL_X, FLOOR_Y + 0.9, PORTAL_Z),
    color: COL_ACCENT,
    size: 1.25,
    intensity: 1.1,
    animationOffset: 4.2,
    interactionType: 'portal'
  }

  const interactiveMarkers = [...storyMarkers, portalMarker]

  function handleStoryClick(pointName: string) {
    const point = storyPointByName.get(pointName)
    if (point) {
      console.log(`📖 Story: ${point.text}`)
      dispatch('storyRead', { name: pointName, text: point.text, position: point.position })
    }
  }

  function playPortalSound() {
    if (typeof window !== 'undefined' && window.AudioContext) {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.setValueAtTime(800, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.3)
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.3)
    }
  }

  function transitionToObservatory() {
    console.log('🌀 Portal → Observatory')
    playPortalSound()

    if (levelTransitionHandler?.transitionToLevel) {
      levelTransitionHandler.transitionToLevel('observatory')
      return
    }

    gameActions.transitionToLevel('observatory')
  }

  function handlePortalContact() {
    transitionToObservatory()
  }

  function handleInteractiveClick(marker: InteractiveMarker) {
    if (marker.interactionType === 'portal') {
      transitionToObservatory()
      return
    }

    if (marker.storyPointName) {
      handleStoryClick(marker.storyPointName)
    }
  }

  function handleInteractiveHover(markerId: string, hovered: boolean) {
    hoveredInteractiveId = hovered ? markerId : hoveredInteractiveId === markerId ? null : hoveredInteractiveId
  }

  function registerInteractiveMarker(marker: InteractiveMarker, sprite: THREE.Sprite, index: number) {
    if (!interactionSystem?.registerInteractiveObject) return

    interactionSystem.registerInteractiveObject({
      id: marker.id,
      sprite,
      type: 'object',
      data: marker,
      index,
      handlers: {
        onClick: () => handleInteractiveClick(marker),
        onHover: (_data: InteractiveMarker, hovered: boolean) => handleInteractiveHover(marker.id, hovered)
      }
    })
  }

  function isPortalMarker(marker: InteractiveMarker) {
    return marker.interactionType === 'portal'
  }

  function getMarkerHaloHeight(marker: InteractiveMarker) {
    return isPortalMarker(marker) ? FLOOR_Y + 0.1 : marker.position[1] - 0.16
  }

  function getMarkerHaloRadius(marker: InteractiveMarker) {
    return isPortalMarker(marker) ? 1.15 : 0.26
  }

  function getMarkerHaloTube(marker: InteractiveMarker) {
    return isPortalMarker(marker) ? 0.08 : 0.035
  }

  function getMarkerLightIntensity(marker: InteractiveMarker) {
    const hovered = hoveredInteractiveId === marker.id

    if (isPortalMarker(marker)) {
      return hovered ? 11 : 7
    }

    return hovered ? 4.8 : 2.8
  }

  function getMarkerLightDistance(marker: InteractiveMarker) {
    return isPortalMarker(marker) ? 9 : 4.5
  }

  function getMarkerSpriteSize(marker: InteractiveMarker) {
    return hoveredInteractiveId === marker.id ? marker.size * 1.15 : marker.size
  }

  function getMarkerSpriteIntensity(marker: InteractiveMarker) {
    return hoveredInteractiveId === marker.id ? marker.intensity * 1.25 : marker.intensity
  }

  function loadTimelineData() {
    try {
      isLoadingTimeline = true
      timelineLoadError = null

      if (timelineEventsJson && timelineEventsJson !== '[]') {
        realTimelineEvents = JSON.parse(timelineEventsJson)
      } else if (timelineEvents.length > 0) {
        realTimelineEvents = timelineEvents
      } else {
        realTimelineEvents = []
      }
    } catch (error) {
      console.error('❌ SciFiRoom: Failed to process timeline data:', error)
      timelineLoadError = error instanceof Error ? error.message : 'Unknown error'
    } finally {
      isLoadingTimeline = false
    }
  }

  function handleStarSelected(event: CustomEvent) {
    dispatch('starSelected', event.detail)
  }

  function handleStarDeselected(event: CustomEvent) {
    dispatch('starDeselected', event.detail)
  }

  function handleLevelTransition(event: CustomEvent) {
    dispatch('levelTransition', event.detail)
  }

  onMount(() => {
    loadTimelineData()

    if (spawnSystem?.requestSpawn) {
      spawnSystem.requestSpawn({
        entityType: 'player',
        position: scaledSpawnPoint,
        priority: 10,
        metadata: { levelName: 'sci-fi-room', spawnReason: 'level_load' }
      })
    }

    dispatch('terrainReady')
    console.log('🏢 SciFiRoom: Multi-zone level loaded')
  })

  onDestroy(() => {
    hoveredInteractiveId = null

    if (!interactionSystem?.unregisterInteractiveObject) return

    interactiveMarkers.forEach((marker) => {
      interactionSystem.unregisterInteractiveObject(marker.id)
    })
  })
</script>

<LevelManager>
  <T.Group name="sci-fi-room-level">

    <Skybox
      path="/assets/hdri/skywip4-cubemap/"
      files={['px.webp', 'nx.webp', 'py.webp', 'ny.webp', 'pz.webp', 'nz.webp']}
    />

    <T.FogExp2 color="#5f76a8" density={0.0035} />

    <!-- ══════════════════════════════════════════
         PHYSICS BASE LAYER
         ══════════════════════════════════════════ -->

    <!-- Interior floor -->
    <T.Group position={[0, FLOOR_Y - T_WALL/2, 0]}>
      <RigidBody type="fixed">
        <Collider shape="cuboid" args={[W/2, T_WALL/2, D/2]} friction={0.9} />
      </RigidBody>
    </T.Group>

    <!-- Interior ceiling -->
    <T.Group position={[0, FLOOR_Y + H, 0]}>
      <RigidBody type="fixed">
        <Collider shape="cuboid" args={[W/2, T_WALL/2, D/2]} />
      </RigidBody>
    </T.Group>

    <!-- Interior walls (excluding back wall for archway) -->
    {#each [[0, 0, -D/2], [-W/2, 0, 0], [W/2, 0, 0]] as [x, y, z]}
      <T.Group position={[x, FLOOR_Y + H/2, z]}>
        <RigidBody type="fixed">
          <Collider shape="cuboid" args={[Math.abs(x) > 0.1 ? T_WALL/2 : W/2, H/2, Math.abs(z) > 0.1 ? T_WALL/2 : D/2]} />
        </RigidBody>
      </T.Group>
    {/each}

    <!-- Back wall split around archway opening -->
    <!-- Left back section -->
    <T.Group position={[-W/4 - 0.7, FLOOR_Y + H/2, D/2]}>
      <RigidBody type="fixed">
        <Collider shape="cuboid" args={[W/4 - 0.7, H/2, T_WALL/2]} />
      </RigidBody>
    </T.Group>
    <!-- Right back section -->
    <T.Group position={[W/4 + 0.7, FLOOR_Y + H/2, D/2]}>
      <RigidBody type="fixed">
        <Collider shape="cuboid" args={[W/4 - 0.7, H/2, T_WALL/2]} />
      </RigidBody>
    </T.Group>

    <!-- COURTYARD floor (large platform) -->
    <T.Group position={[0, COURTYARD_Y - T_WALL/2, COURTYARD_Z]}>
      <RigidBody type="fixed">
        <Collider shape="cuboid" args={[W * 0.6, T_WALL/2, W * 0.6]} friction={0.7} />
      </RigidBody>
    </T.Group>

    <!-- WASTELAND floor (vast plane with varied height) -->
    {#each wastelandTiles as tile (tile.id)}
      <T.Group position={tile.position}>
        <RigidBody type="fixed">
          <Collider shape="cuboid" args={WASTELAND_COLLIDER_ARGS} friction={0.5} />
        </RigidBody>
      </T.Group>
    {/each}


    <!-- ══════════════════════════════════════════
         COMMAND CENTER (Condensed Interior)
         ══════════════════════════════════════════ -->

    <!-- Interior floor -->
    <T.Mesh position={[0, FLOOR_Y - T_WALL/2, 0]} receiveShadow>
      <T.BoxGeometry args={[W, T_WALL, D]} />
      <T.MeshStandardMaterial color={COL_FLOOR} emissive="#1a3d4a" emissiveIntensity={0.6} roughness={0.3} metalness={0.8} />
    </T.Mesh>

    <!-- Interior walls (excluding back wall for archway) -->
    {#each [[0, -D/2 - T_WALL/2], [-W/2 - T_WALL/2, 0], [W/2 + T_WALL/2, 0]] as [x, z]}
      <T.Mesh position={[x, FLOOR_Y + H/2, z]} receiveShadow>
        <T.BoxGeometry args={[Math.abs(x) > W/3 ? T_WALL : W, H, Math.abs(z) > D/3 ? T_WALL : D]} />
        <T.MeshStandardMaterial color={COL_WALL} emissive="#1a3d4a" emissiveIntensity={0.4} roughness={0.4} metalness={0.6} />
      </T.Mesh>
    {/each}

    <!-- Back wall split sections -->
    {#each [[-W/4 - 0.7, D/2 + T_WALL/2], [W/4 + 0.7, D/2 + T_WALL/2]] as [x, z]}
      <T.Mesh position={[x, FLOOR_Y + H/2, z]} receiveShadow>
        <T.BoxGeometry args={[W/4 - 0.7, H, T_WALL]} />
        <T.MeshStandardMaterial color={COL_WALL} emissive="#1a3d4a" emissiveIntensity={0.4} roughness={0.4} metalness={0.6} />
      </T.Mesh>
    {/each}

    <!-- Ceiling -->
    <T.Mesh position={[0, FLOOR_Y + H, 0]}>
      <T.BoxGeometry args={[W, T_WALL, D]} />
      <T.MeshStandardMaterial color="#2a3a48" emissive="#1a3d4a" emissiveIntensity={0.6} roughness={0.6} metalness={0.5} />
    </T.Mesh>

    <!-- Console (centered) -->
    <T.Mesh position={[0, FLOOR_Y + 0.5, 0]}>
      <T.BoxGeometry args={[2.0, 0.3, 1.6]} />
      <T.MeshStandardMaterial color="#1a5f7a" metalness={0.95} roughness={0.15} />
    </T.Mesh>

    <!-- Console back panel -->
    <T.Mesh position={[0, FLOOR_Y + 1.8, -0.6]}>
      <T.BoxGeometry args={[2.0, 1.4, 0.1]} />
      <T.MeshStandardMaterial color="#1a5f7a" metalness={0.92} roughness={0.2} />
    </T.Mesh>

    <!-- Command-center silhouette fins -->
    {#each commandSilhouetteFins as fin (fin.id)}
      <T.Mesh position={fin.position}>
        <T.BoxGeometry args={[0.22, fin.height, 1.4]} />
        <T.MeshStandardMaterial color="#0d1724" emissive="#11263a" emissiveIntensity={0.18} metalness={0.65} roughness={0.35} />
      </T.Mesh>
    {/each}

    <!-- Animated screens -->
    {#each [-0.5, 0.5] as x}
      <T.Mesh position={[x, FLOOR_Y + 1.8, -0.55]}>
        <T.BoxGeometry args={[0.8, 1.0, 0.02]} />
        <T.MeshStandardMaterial
          color={screenColor}
          emissive={screenColor}
          emissiveIntensity={screenGlow}
        />
      </T.Mesh>
    {/each}

    <!-- Neon trim -->
    <T.Mesh position={[0, FLOOR_Y + 0.06, D/2 - 0.1]}>
      <T.BoxGeometry args={[W, 0.1, 0.02]} />
      <T.MeshStandardMaterial color={COL_TRIM} emissive={COL_TRIM} emissiveIntensity={2.0} />
    </T.Mesh>


    <!-- ══════════════════════════════════════════
         FLOATING SURREAL GEOMETRY (Wow Factor)
         ══════════════════════════════════════════ -->

    <!-- Rotating octahedron (left) -->
    <T.Mesh position={[-2.5, FLOOR_Y + 1.8, 2.0]} rotation={[time * 0.5, time * 0.3, 0]}>
      <T.OctahedronGeometry args={[1.0, 0]} />
      <T.MeshStandardMaterial color={COL_ACCENT} emissive={COL_ACCENT} emissiveIntensity={1.2 + screenGlow * 0.3} metalness={1} roughness={0} />
    </T.Mesh>

    <!-- Orbiting tetrahedron (right) -->
    <T.Mesh position={[2.8 + Math.cos(time * 0.5) * 1.2, FLOOR_Y + 1.5, 1.5 + Math.sin(time * 0.5) * 1.0]} rotation={[time * 0.7, time * 0.5, time * 0.3]}>
      <T.TetrahedronGeometry args={[0.8, 0]} />
      <T.MeshStandardMaterial color="#00ff88" emissive="#00ff88" emissiveIntensity={1.3 + screenGlow * 0.4} metalness={0.9} />
    </T.Mesh>

    <!-- Floating dodecahedron (shifted off centerline for cleaner sightline) -->
    <T.Mesh position={[-4.2, FLOOR_Y + 2.3 + Math.sin(time * 0.3) * 0.4, 2.8]} rotation={[time * 0.4, time * 0.6, time * 0.2]}>
      <T.DodecahedronGeometry args={[0.8, 0]} />
      <T.MeshStandardMaterial color={COL_TRIM} emissive={COL_TRIM} emissiveIntensity={1.4 + screenGlow * 0.3} metalness={0.95} />
    </T.Mesh>

    <!-- Pulsing icosahedron (pulled wider to frame exit view) -->
    <T.Mesh position={[4.6, FLOOR_Y + 1.6, 2.1]} rotation={[time * 0.3, time * 0.5, time * 0.4]} scale={[1.0 + Math.sin(time * 2) * 0.12, 1.0 + Math.sin(time * 2) * 0.12, 1.0 + Math.sin(time * 2) * 0.12]}>
      <T.IcosahedronGeometry args={[0.7, 0]} />
      <T.MeshStandardMaterial color="#ff0088" emissive="#ff0088" emissiveIntensity={1.5 + screenGlow * 0.4} metalness={0.92} />
    </T.Mesh>


    <!-- ══════════════════════════════════════════
         SUPPORT COLUMNS WITH GLOW
         ══════════════════════════════════════════ -->

    {#each [[-3.5, -2.0], [3.5, 2.0], [-3.5, 2.0], [3.5, -2.0]] as [x, z], i}
      <!-- Column base -->
      <T.Mesh position={[x, FLOOR_Y + 0.3, z]}>
        <T.CylinderGeometry args={[0.4, 0.5, 0.6, 8]} />
        <T.MeshStandardMaterial color={i < 2 ? "#1a5f7a" : "#2d5f6d"} emissive={i < 2 ? "#1a5f7a" : "#2d5f6d"} emissiveIntensity={0.3} metalness={0.8} />
      </T.Mesh>

      <!-- Column shaft -->
      <T.Mesh position={[x, FLOOR_Y + H/2, z]}>
        <T.CylinderGeometry args={[0.22, 0.22, H - 0.5, 8]} />
        <T.MeshStandardMaterial color={i < 2 ? "#0a3d4d" : "#0d2a3a"} metalness={0.6} roughness={0.4} />
      </T.Mesh>

      <!-- Column cap with glow -->
      <T.Mesh position={[x, FLOOR_Y + H - 0.3, z]}>
        <T.CylinderGeometry args={[0.35, 0.22, 0.4, 8]} />
        <T.MeshStandardMaterial
          color={i < 2 ? COL_TRIM : "#00ccaa"}
          emissive={i < 2 ? COL_TRIM : "#00ccaa"}
          emissiveIntensity={1.0 + screenGlow * 0.2}
          metalness={0.95}
        />
      </T.Mesh>
    {/each}


    <!-- ══════════════════════════════════════════
         ARCHWAY to COURTYARD (Moved Closer, Brightened)
         ══════════════════════════════════════════ -->

    <!-- Arch left pillar (moved forward to z = 3.5) -->
    <T.Mesh position={[-1.2, FLOOR_Y + H/2, 3.5]} receiveShadow>
      <T.BoxGeometry args={[0.3, H - 0.3, 0.3]} />
      <T.MeshStandardMaterial color={COL_WALL} emissive="#2a7a9a" emissiveIntensity={0.8} metalness={0.7} roughness={0.2} />
    </T.Mesh>

    <!-- Arch right pillar -->
    <T.Mesh position={[1.2, FLOOR_Y + H/2, 3.5]} receiveShadow>
      <T.BoxGeometry args={[0.3, H - 0.3, 0.3]} />
      <T.MeshStandardMaterial color={COL_WALL} emissive="#2a7a9a" emissiveIntensity={0.8} metalness={0.7} roughness={0.2} />
    </T.Mesh>

    <!-- Arch top -->
    <T.Mesh position={[0, FLOOR_Y + H - 0.3, 3.5]} receiveShadow>
      <T.BoxGeometry args={[2.8, 0.3, 0.3]} />
      <T.MeshStandardMaterial color={COL_WALL} emissive="#2a7a9a" emissiveIntensity={0.8} metalness={0.7} roughness={0.2} />
    </T.Mesh>

    <!-- Arch glow trim (bright cyan) -->
    <T.Mesh position={[0, FLOOR_Y + H/2, 3.4]}>
      <T.BoxGeometry args={[2.7, H - 0.4, 0.02]} />
      <T.MeshStandardMaterial color={COL_TRIM} emissive={COL_TRIM} emissiveIntensity={2.5} metalness={1} roughness={0} />
    </T.Mesh>

    <!-- Arch glow light (bright) -->
    <T.PointLight position={[0, FLOOR_Y + H/2, 3.5]} color={COL_TRIM} intensity={24 + screenGlow * 4} distance={10} decay={1.5} />


    <!-- ══════════════════════════════════════════
         COURTYARD (Outdoor garden space)
         ══════════════════════════════════════════ -->

    <!-- Courtyard floor -->
    <T.Mesh position={[0, COURTYARD_Y - T_WALL/2, COURTYARD_Z]}>
      <T.BoxGeometry args={[W * 1.2, T_WALL, W * 1.2]} />
      <T.MeshStandardMaterial color="#1a2d3a" roughness={0.5} metalness={0.4} />
    </T.Mesh>

    <!-- Courtyard arch pillars (entrance) -->
    {#each [-1.2, 1.2] as x}
      <T.Mesh position={[x, COURTYARD_Y + H/2, COURTYARD_Z - 3.0]} receiveShadow>
        <T.BoxGeometry args={[0.3, H - 0.5, 0.3]} />
        <T.MeshStandardMaterial color="#1a5f7a" metalness={0.5} roughness={0.3} />
      </T.Mesh>
    {/each}

    <!-- FOUNTAIN (Center of courtyard) -->
    <!-- Base -->
    <T.Mesh position={[0, COURTYARD_Y + 0.3, COURTYARD_Z]}>
      <T.CylinderGeometry args={[1.2, 1.4, 0.6, 32]} />
      <T.MeshStandardMaterial color="#2d5f7a" metalness={0.7} roughness={0.2} />
    </T.Mesh>

    <!-- Fountain bowl -->
    <T.Mesh position={[0, COURTYARD_Y + 0.95, COURTYARD_Z]}>
      <T.CylinderGeometry args={[0.9, 1.0, 0.4, 32]} />
      <T.MeshStandardMaterial color="#1a3d5a" transparent={true} opacity={0.8} metalness={0.8} roughness={0.1} />
    </T.Mesh>

    <!-- Water surface (animated) -->
    <T.Mesh position={[0, COURTYARD_Y + 1.0 + Math.sin(time * 1.5) * 0.1, COURTYARD_Z]} rotation={[0, 0, 0]}>
      <T.CylinderGeometry args={[0.85, 0.85, 0.05, 32]} />
      <T.MeshStandardMaterial color="#4488cc" emissive="#0066aa" emissiveIntensity={0.6} transparent={true} opacity={0.7} />
    </T.Mesh>

    <!-- Fountain center pillar -->
    <T.Mesh position={[0, COURTYARD_Y + 1.2, COURTYARD_Z]}>
      <T.CylinderGeometry args={[0.15, 0.15, 0.8, 16]} />
      <T.MeshStandardMaterial color={COL_ACCENT} emissive={COL_ACCENT} emissiveIntensity={1.2} metalness={0.95} />
    </T.Mesh>

    <!-- Celestial crown (observatory-inspired focal point) -->
    <T.Mesh position={[0, COURTYARD_Y + 3.0 + Math.sin(time * 0.35) * 0.08, COURTYARD_Z]} rotation={[Math.PI / 2, time * 0.25, 0]}>
      <T.TorusGeometry args={[2.35, 0.08, 16, 48]} />
      <T.MeshStandardMaterial color="#9fd6ff" emissive="#9fd6ff" emissiveIntensity={1.4 + screenGlow * 0.2} metalness={0.95} roughness={0.08} />
    </T.Mesh>

    {#each celestialCrownNodes as node (node.id)}
      <T.Mesh position={node.position} scale={[node.scale, node.scale, node.scale]}>
        <T.SphereGeometry args={[1, 12, 12]} />
        <T.MeshStandardMaterial color={node.color} emissive={node.color} emissiveIntensity={1.1} />
      </T.Mesh>
    {/each}

    <T.PointLight position={[0, COURTYARD_Y + 3.1, COURTYARD_Z]} color="#b8e2ff" intensity={6} distance={14} decay={2} />

    <!-- Courtyard observation rig silhouette -->
    <T.Mesh position={courtyardObservationRig.base} rotation={[0, -0.7, 0]}>
      <T.CylinderGeometry args={[0.18, 0.26, 1.4, 10]} />
      <T.MeshStandardMaterial color="#1d2630" emissive="#21384d" emissiveIntensity={0.2} metalness={0.75} roughness={0.28} />
    </T.Mesh>
    <T.Mesh position={courtyardObservationRig.barrel} rotation={[-0.55, -0.75, 0]}>
      <T.CylinderGeometry args={[0.18, 0.28, 2.6, 12]} />
      <T.MeshStandardMaterial color="#0f1c28" emissive="#234764" emissiveIntensity={0.24} metalness={0.82} roughness={0.18} />
    </T.Mesh>
    <T.Mesh position={[courtyardObservationRig.base[0] + 0.45, courtyardObservationRig.base[1] + 0.25, courtyardObservationRig.base[2] + 0.4]} rotation={[0, -0.35, 0]}>
      <T.BoxGeometry args={[0.7, 0.45, 1.0]} />
      <T.MeshStandardMaterial color="#17212a" emissive="#18344a" emissiveIntensity={0.18} metalness={0.6} roughness={0.42} />
    </T.Mesh>

    <!-- PLANTS in pots (around courtyard) -->
    {#each [[-3.0, 4.0], [3.0, 4.0], [-3.0, 2.0], [3.0, 2.0]] as [x, z]}
      <!-- Pot -->
      <T.Mesh position={[x, COURTYARD_Y + 0.4, COURTYARD_Z + z]}>
        <T.CylinderGeometry args={[0.4, 0.5, 0.8, 8]} />
        <T.MeshStandardMaterial color="#7a5a3a" metalness={0.5} roughness={0.6} />
      </T.Mesh>

      <!-- Strange plant (spiral geometry) -->
      {#each Array.from({ length: 5 }) as _, layer}
        {@const radius = 0.3 - layer * 0.05}
        {@const height = COURTYARD_Y + 1.2 + layer * 0.4}
        {@const rotation = layer * 0.6}
        <T.Mesh position={[x, height, COURTYARD_Z + z]} rotation={[0, rotation + time * 0.3, 0]}>
          <T.BoxGeometry args={[radius * 2, 0.3, radius * 2]} />
          <T.MeshStandardMaterial color="#00aa44" emissive="#00cc66" emissiveIntensity={0.7 + screenGlow * 0.2} />
        </T.Mesh>
      {/each}
    {/each}

    <!-- BENCH (wood) -->
    <!-- Bench seat -->
    <T.Mesh position={[0, COURTYARD_Y + 0.5, COURTYARD_Z - 2.0]}>
      <T.BoxGeometry args={[2.0, 0.15, 0.6]} />
      <T.MeshStandardMaterial color="#4d3d2d" metalness={0.3} roughness={0.7} />
    </T.Mesh>

    <!-- Bench back -->
    <T.Mesh position={[0, COURTYARD_Y + 1.2, COURTYARD_Z - 2.6]}>
      <T.BoxGeometry args={[2.0, 0.8, 0.15]} />
      <T.MeshStandardMaterial color="#4d3d2d" metalness={0.3} roughness={0.7} />
    </T.Mesh>

    <!-- Bench legs -->
    {#each [-0.8, 0.8] as x}
      {#each [-0.2, 0.2] as z}
        <T.Mesh position={[x, COURTYARD_Y + 0.25, COURTYARD_Z - 2.0 + z]}>
          <T.BoxGeometry args={[0.1, 0.5, 0.1]} />
          <T.MeshStandardMaterial color="#3d2d1d" metalness={0.2} roughness={0.8} />
        </T.Mesh>
      {/each}
    {/each}

    <!-- REAL STAR MAP + CONSTELLATIONS (same navigation system as Observatory) -->
    {#if isLoadingTimeline}
      <T.Group position={[0, COURTYARD_Y + 4.0, COURTYARD_Z]} name="starmap-loading-indicator">
        <T.Mesh>
          <T.SphereGeometry args={[0.6]} />
          <T.MeshBasicMaterial color="#8fd4ff" transparent opacity={0.7} />
        </T.Mesh>
      </T.Group>
    {:else if timelineLoadError}
      <T.Group position={[0, COURTYARD_Y + 4.0, COURTYARD_Z]} name="starmap-error-indicator">
        <T.Mesh>
          <T.SphereGeometry args={[0.6]} />
          <T.MeshBasicMaterial color="#ff4a7a" transparent opacity={0.7} />
        </T.Mesh>
      </T.Group>
    {:else}
      <T.Group position={[0, 0, COURTYARD_Z]} rotation={STAR_MAP_ROTATION}>
        <StarMap
          bind:this={starMapComponent}
          bind:starMapRef={starMapRef}
          timelineEvents={realTimelineEvents}
          {interactionSystem}
          on:starSelected={handleStarSelected}
        />
      </T.Group>

      <StarNavigationSystem
        bind:this={starNavigationSystem}
        timelineEvents={realTimelineEvents}
        starMapComponent={starMapRef}
        on:starSelected={handleStarSelected}
        on:starDeselected={handleStarDeselected}
        on:levelTransition={handleLevelTransition}
      />
    {/if}


    <!-- ══════════════════════════════════════════
         ARCHWAY to WASTELAND
         ══════════════════════════════════════════ -->

    {#each [-1.2, 1.2] as x}
      <T.Mesh position={[x, COURTYARD_Y + H/2, WASTELAND_Z]} receiveShadow>
        <T.BoxGeometry args={[0.3, H - 0.5, 0.3]} />
        <T.MeshStandardMaterial color="#1a5f7a" metalness={0.5} roughness={0.3} />
      </T.Mesh>
    {/each}

    <T.Mesh position={[0, COURTYARD_Y + H - 0.4, WASTELAND_Z]} receiveShadow>
      <T.BoxGeometry args={[2.8, 0.3, 0.3]} />
      <T.MeshStandardMaterial color="#1a5f7a" metalness={0.5} roughness={0.3} />
    </T.Mesh>


    <!-- ══════════════════════════════════════════
         WASTELAND (Vast junk-strewn plane)
         ══════════════════════════════════════════ -->

    <!-- Wasteland base terrain (varied heights) -->
    {#each wastelandTiles as tile (tile.id)}
        <T.Mesh position={tile.position}>
          <T.BoxGeometry args={WASTELAND_TILE_GEOMETRY_ARGS} />
          <T.MeshStandardMaterial color="#3a3a2a" roughness={0.9} metalness={0.1} />
        </T.Mesh>
    {/each}

    <!-- Wasteland landmark silhouettes -->
    {#each wastelandMonoliths as monolith (monolith.id)}
      <T.Mesh position={monolith.position} scale={monolith.scale}>
        <T.BoxGeometry args={[1, 1, 1]} />
        <T.MeshStandardMaterial color={monolith.color} emissive={monolith.color} emissiveIntensity={0.12} roughness={0.88} metalness={0.08} />
      </T.Mesh>
    {/each}
    <T.Mesh position={[2.8, FLOOR_Y + 4.1, WASTELAND_Z + 16.4]} rotation={[0.28, 0.45, 0]}>
      <T.TorusGeometry args={[2.6, 0.25, 14, 28, Math.PI]} />
      <T.MeshStandardMaterial color="#4f5669" emissive="#344056" emissiveIntensity={0.1} roughness={0.82} metalness={0.12} />
    </T.Mesh>

    <!-- Scattered junk (geometric shapes) -->
    {#each junkItems as item (item.id)}
      <T.Mesh position={item.position} rotation={item.rotation}>
        {#if item.geometry === 'box'}
          <T.BoxGeometry args={item.args} />
        {:else if item.geometry === 'cylinder'}
          <T.CylinderGeometry args={item.args} />
        {:else}
          <T.OctahedronGeometry args={item.args} />
        {/if}
        <T.MeshStandardMaterial color="#5a5a4a" roughness={0.95} metalness={0.05} />
      </T.Mesh>
    {/each}

    <!-- Junk accent lights -->
    {#each junkAccentLights as light (light.id)}
      <T.PointLight position={light.position} color="#666633" intensity={3} distance={4} decay={1.5} />
    {/each}


    <!-- ══════════════════════════════════════════
         EXIT PORTAL (back to Observatory)
         ══════════════════════════════════════════ -->

    <!-- Portal platform -->
    <T.Mesh position={[PORTAL_X, FLOOR_Y + 0.04, PORTAL_Z]}>
      <T.CylinderGeometry args={[0.8, 0.8, 0.08, 32]} />
      <T.MeshStandardMaterial color={COL_ACCENT} emissive={COL_ACCENT} emissiveIntensity={2.0 + screenGlow * 0.5} metalness={1} />
    </T.Mesh>

    <!-- Portal rings (rotating) -->
    <T.Mesh position={[PORTAL_X, FLOOR_Y + 0.2, PORTAL_Z]} rotation={[0, time * 2, 0]}>
      <T.TorusGeometry args={[0.9, 0.12, 16, 32]} />
      <T.MeshStandardMaterial color={COL_ACCENT} emissive={COL_ACCENT} emissiveIntensity={2.5 + screenGlow * 0.5} metalness={1} />
    </T.Mesh>

    <T.Mesh position={[PORTAL_X, FLOOR_Y + 1.05, PORTAL_Z]} rotation={[Math.PI / 2, time * -1.4, 0]}>
      <T.TorusGeometry args={[1.15, 0.07, 16, 48]} />
      <T.MeshStandardMaterial color="#ff7aff" emissive="#ff7aff" emissiveIntensity={2.2 + screenGlow * 0.35} metalness={1} roughness={0.05} />
    </T.Mesh>

    <T.Mesh position={[PORTAL_X, FLOOR_Y + 1.0, PORTAL_Z]}>
      <T.CylinderGeometry args={[0.06, 0.12, 1.7, 12]} />
      <T.MeshStandardMaterial color="#e38bff" emissive="#e38bff" emissiveIntensity={1.6} transparent opacity={0.8} />
    </T.Mesh>

    <!-- Portal sensor (larger to catch player) -->
    <T.Group position={[PORTAL_X, FLOOR_Y + 0.8, PORTAL_Z]}>
      <RigidBody type="fixed">
        <Collider shape="cylinder" args={[1.45, 2.4]} sensor={true} onsensorenter={handlePortalContact} />
      </RigidBody>
    </T.Group>

    {#each portalGuideLights as guideLight, index}
      <T.Mesh position={guideLight} rotation={[Math.PI / 2, 0, 0]}>
        <T.CircleGeometry args={[0.16 + index * 0.02, 20]} />
        <T.MeshStandardMaterial color="#7ecbff" emissive="#7ecbff" emissiveIntensity={1.4 + index * 0.1} transparent opacity={0.88} />
      </T.Mesh>
      <T.PointLight position={[guideLight[0], guideLight[1] + 0.3, guideLight[2]]} color="#7ecbff" intensity={1.9 + index * 0.3} distance={3.5} decay={2} />
    {/each}

    <!-- Portal light -->
    <T.PointLight position={[PORTAL_X, FLOOR_Y + 0.95, PORTAL_Z]} color={COL_ACCENT} intensity={18 + screenGlow * 5} distance={8} decay={2} />


    <!-- ══════════════════════════════════════════
         STORY INTERACTION POINTS (Clickable)
         ══════════════════════════════════════════ -->

    {#each interactiveMarkers as marker, index (marker.id)}
      <T.Mesh position={[marker.position[0], getMarkerHaloHeight(marker), marker.position[2]]} rotation={[Math.PI / 2, time * 0.8 + index * 0.35, 0]}>
        <T.TorusGeometry args={[getMarkerHaloRadius(marker), getMarkerHaloTube(marker), 12, 36]} />
        <T.MeshStandardMaterial color={marker.color} emissive={marker.color} emissiveIntensity={hoveredInteractiveId === marker.id ? 2.2 : isPortalMarker(marker) ? 1.8 : 1.1} transparent opacity={0.9} metalness={1} roughness={0.05} />
      </T.Mesh>

      <T.PointLight
        position={[marker.position[0], marker.position[1] + (isPortalMarker(marker) ? 0.2 : 0.05), marker.position[2]]}
        color={marker.color}
        intensity={getMarkerLightIntensity(marker)}
        distance={getMarkerLightDistance(marker)}
        decay={2}
      />

      <StarSprite
        position={marker.position}
        color={marker.color}
        size={getMarkerSpriteSize(marker)}
        intensity={getMarkerSpriteIntensity(marker)}
        twinkleSpeed={1.2}
        animationOffset={marker.animationOffset}
        enableTwinkle={true}
        opacity={1.0}
        isClickable={true}
        isHovered={hoveredInteractiveId === marker.id}
        onSpriteReady={(sprite) => registerInteractiveMarker(marker, sprite, index)}
      />
    {/each}


    <!-- ══════════════════════════════════════════
         LIGHTING
         ══════════════════════════════════════════ -->

    <T.AmbientLight intensity={1.25} color="#8899ff" />
    <T.HemisphereLight skyColor="#b8d8ff" groundColor="#1d2633" intensity={0.95} />
    <T.DirectionalLight position={[10, 18, -12]} color="#b7d7ff" intensity={0.55} />
    <T.DirectionalLight position={[-18, 12, 22]} color="#2a4069" intensity={0.2} />

    <!-- Interior ceiling lights (multiple for coverage) -->
    <T.PointLight position={[-3.0, FLOOR_Y + H - 0.3, 0]} color="#7fc8ff" intensity={20 + screenGlow * 3} distance={15} decay={1.5} />
    <T.PointLight position={[0, FLOOR_Y + H - 0.3, 0]} color="#7fc8ff" intensity={20 + screenGlow * 3} distance={15} decay={1.5} />
    <T.PointLight position={[3.0, FLOOR_Y + H - 0.3, 0]} color="#7fc8ff" intensity={20 + screenGlow * 3} distance={15} decay={1.5} />

    <!-- Archway illumination light -->
    <T.PointLight position={[0, FLOOR_Y + H/2, D/2 + 5.0]} color="#7fc8ff" intensity={18 + screenGlow * 2} distance={12} decay={1.5} />

    <!-- Console glow (interior) -->
    <T.PointLight position={[0, FLOOR_Y + 2.0, 0]} color="#0066cc" intensity={14 + screenGlow * 3} distance={8} decay={1.5} />

    <!-- Courtyard ambient light -->
    <T.PointLight position={[0, COURTYARD_Y + H + 2.0, COURTYARD_Z]} color="#ffffff" intensity={10} distance={20} decay={2} />

    <!-- Fountain glow -->
    <T.PointLight position={[0, COURTYARD_Y + 1.0, COURTYARD_Z]} color="#4488cc" intensity={8} distance={5} decay={2} />

  </T.Group>
</LevelManager>

<LevelTransitionHandler bind:this={levelTransitionHandler} />
