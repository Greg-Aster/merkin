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
  import ProceduralMesh from '../components/ProceduralMesh.svelte'
  import StarSprite from '../components/StarSprite.svelte'
  import LevelTransitionHandler from '../components/LevelTransitionHandler.svelte'
  import StarNavigationSystem from '../components/StarNavigationSystem.svelte'
  import Skybox from '../systems/Skybox.svelte'
  import StarMap from '../systems/StarMap.svelte'
  import EditorColliderHelper from '../editor/EditorColliderHelper.svelte'
  import { editorSceneStore, editorStateStore } from '../editor/editorStore'
  import {
    createRustTextureBundle,
    createScreenTexture,
    createTechPanelTextureBundle,
    disposeProceduralTextureBundle
  } from '../utils/proceduralTextures'
  import { gameActions } from '../stores/gameStateStore'

  const dispatch = createEventDispatcher()

  export let spawnSystem: any = null
  export let interactionSystem: any = null
  export let playerSpawnPoint: [number, number, number] = [0, 1, 0]
  export let timelineEvents: any[] = []
  export let timelineEventsJson: string = '[]'
  export let collisionDebugEnabled = false

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

  const SKYBOX_PRESETS = {
    observatory: {
      path: '/assets/hdri/skywip4-cubemap/',
      files: ['px.webp', 'nx.webp', 'py.webp', 'ny.webp', 'pz.webp', 'nz.webp'] as [string, string, string, string, string, string],
    },
    classic: {
      path: '/assets/skyboxes/',
      files: ['px.webp', 'nx.webp', 'py.webp', 'ny.webp', 'pz.webp', 'nz.webp'] as [string, string, string, string, string, string],
    },
  } as const

  const scaledSpawnPoint: [number, number, number] = [
    ($editorSceneStore?.settings?.level?.spawn?.position?.[0] ?? playerSpawnPoint[0]),
    FLOOR_Y + (($editorSceneStore?.settings?.level?.spawn?.position?.[1] ?? playerSpawnPoint[1]) - (-0.08)) * SCALE,
    ($editorSceneStore?.settings?.level?.spawn?.position?.[2] ?? playerSpawnPoint[2])
  ]

  const COL_WALL = '#2a3d4a'
  const COL_TRIM = '#00d4ff'
  const COL_ACCENT = '#ff00ff'

  type Vector3Tuple = [number, number, number]
  type ColorValue = number | string
  type ProceduralGeometryKind = 'box' | 'cylinder' | 'octahedron' | 'tetrahedron' | 'icosahedron' | 'dodecahedron' | 'torus'

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

  interface ProceduralShapeConfig {
    id: string
    geometry: ProceduralGeometryKind
    args: number[]
    position: Vector3Tuple
    rotation: Vector3Tuple
    scale: Vector3Tuple
    color: string
    emissive?: string
    emissiveIntensity?: number
    metalness?: number
    roughness?: number
    transparent?: boolean
    opacity?: number
  }

  interface FloatingAnomaly {
    id: string
    position: Vector3Tuple
    rotation: Vector3Tuple
    drift: Vector3Tuple
    shell: ProceduralShapeConfig
    satellites: ProceduralShapeConfig[]
    shards: ProceduralShapeConfig[]
    rings: ProceduralShapeConfig[]
  }

  interface JunkAssembly {
    id: string
    position: Vector3Tuple
    rotation: Vector3Tuple
    core: ProceduralShapeConfig
    satellites: ProceduralShapeConfig[]
    shards: ProceduralShapeConfig[]
    halo: ProceduralShapeConfig | null
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

  function randomRange(random: () => number, min: number, max: number) {
    return min + (max - min) * random()
  }

  function createFloatingAnomalies(): FloatingAnomaly[] {
    const anchors: Array<{ id: string, position: Vector3Tuple, rotation: Vector3Tuple, drift: Vector3Tuple, color: string, accent: string, geometry: ProceduralGeometryKind, args: number[] }> = [
      { id: 'anomaly-left', position: createVector3(-2.5, FLOOR_Y + 1.8, 2.0), rotation: createVector3(0.5, 0.3, 0), drift: createVector3(0.12, 0.08, 0.04), color: COL_ACCENT, accent: '#8fd8ff', geometry: 'octahedron', args: [1.0, 0] },
      { id: 'anomaly-right', position: createVector3(2.8, FLOOR_Y + 1.5, 1.5), rotation: createVector3(0.7, 0.5, 0.3), drift: createVector3(0.2, 0.1, 0.16), color: '#00ff88', accent: '#c8fff4', geometry: 'tetrahedron', args: [0.8, 0] },
      { id: 'anomaly-back-left', position: createVector3(-4.2, FLOOR_Y + 2.3, 2.8), rotation: createVector3(0.4, 0.6, 0.2), drift: createVector3(0.08, 0.4, 0.06), color: COL_TRIM, accent: '#d9f4ff', geometry: 'dodecahedron', args: [0.8, 0] },
      { id: 'anomaly-back-right', position: createVector3(4.6, FLOOR_Y + 1.6, 2.1), rotation: createVector3(0.3, 0.5, 0.4), drift: createVector3(0.1, 0.12, 0.1), color: '#ff0088', accent: '#ffd0f0', geometry: 'icosahedron', args: [0.7, 0] }
    ]

    return anchors.map((anchor, index) => {
      const random = createSeededRandom(0x510000 + index * 97)
      const satellites = Array.from({ length: 4 + index % 2 }, (_, satelliteIndex) => {
        const angle = (satelliteIndex / (4 + index % 2)) * Math.PI * 2
        const radius = randomRange(random, 0.9, 1.6)
        return {
          id: `${anchor.id}-sat-${satelliteIndex}`,
          geometry: satelliteIndex % 2 === 0 ? 'box' : 'tetrahedron',
          args: satelliteIndex % 2 === 0 ? [0.22, 0.22, 0.48] : [0.24, 0],
          position: createVector3(Math.cos(angle) * radius, randomRange(random, -0.35, 0.45), Math.sin(angle) * radius),
          rotation: createVector3(randomRange(random, 0, Math.PI), randomRange(random, 0, Math.PI), randomRange(random, 0, Math.PI)),
          scale: createVector3(randomRange(random, 0.7, 1.3), randomRange(random, 0.7, 1.4), randomRange(random, 0.7, 1.3)),
          color: anchor.accent,
          emissive: anchor.accent,
          emissiveIntensity: randomRange(random, 0.45, 0.9),
          metalness: 0.92,
          roughness: 0.08
        }
      })
      const shards = Array.from({ length: 6 }, (_, shardIndex) => {
        const angle = (shardIndex / 6) * Math.PI * 2 + randomRange(random, -0.2, 0.2)
        return {
          id: `${anchor.id}-shard-${shardIndex}`,
          geometry: 'box' as const,
          args: [0.07, randomRange(random, 0.45, 0.9), 0.09],
          position: createVector3(Math.cos(angle) * randomRange(random, 0.6, 1.0), randomRange(random, -0.25, 0.55), Math.sin(angle) * randomRange(random, 0.6, 1.0)),
          rotation: createVector3(randomRange(random, -0.9, 0.9), angle, randomRange(random, -0.9, 0.9)),
          scale: createVector3(1, 1, 1),
          color: anchor.color,
          emissive: anchor.color,
          emissiveIntensity: randomRange(random, 0.2, 0.55),
          metalness: 0.95,
          roughness: 0.08
        }
      })
      const rings = Array.from({ length: 2 }, (_, ringIndex) => ({
        id: `${anchor.id}-ring-${ringIndex}`,
        geometry: 'torus' as const,
        args: [1.05 + ringIndex * 0.32, 0.04 + ringIndex * 0.015, 12, 28],
        position: createVector3(0, ringIndex === 0 ? 0 : 0.1, 0),
        rotation: createVector3(Math.PI / 2 + ringIndex * 0.35, ringIndex * 0.2, ringIndex === 0 ? 0 : Math.PI / 3),
        scale: createVector3(1, 1, 1),
        color: anchor.accent,
        emissive: anchor.accent,
        emissiveIntensity: 0.45 + ringIndex * 0.15,
        metalness: 1,
        roughness: 0.04,
        transparent: true,
        opacity: 0.82
      }))

      return {
        id: anchor.id,
        position: anchor.position,
        rotation: anchor.rotation,
        drift: anchor.drift,
        shell: {
          id: `${anchor.id}-shell`,
          geometry: anchor.geometry,
          args: anchor.args,
          position: createVector3(0, 0, 0),
          rotation: createVector3(0, 0, 0),
          scale: createVector3(1, 1, 1),
          color: anchor.color,
          emissive: anchor.color,
          emissiveIntensity: 1.15,
          metalness: 0.96,
          roughness: 0.03
        },
        satellites,
        shards,
        rings
      }
    })
  }

  function createJunkAssemblies(items: JunkItem[]): JunkAssembly[] {
    return items.map((item, index) => {
      const random = createSeededRandom(0x730000 + index * 31)
      const satellites = Array.from({ length: 2 + (index % 3) }, (_, satelliteIndex) => {
        const angle = (satelliteIndex / (2 + (index % 3))) * Math.PI * 2
        return {
          id: `${item.id}-sat-${satelliteIndex}`,
          geometry: satelliteIndex % 2 === 0 ? 'box' : 'octahedron',
          args: satelliteIndex % 2 === 0 ? [randomRange(random, 0.16, 0.42), randomRange(random, 0.08, 0.18), randomRange(random, 0.16, 0.42)] : [randomRange(random, 0.12, 0.28)],
          position: createVector3(Math.cos(angle) * randomRange(random, 0.35, 0.85), randomRange(random, 0.1, 0.55), Math.sin(angle) * randomRange(random, 0.35, 0.85)),
          rotation: createVector3(randomRange(random, 0, Math.PI), randomRange(random, 0, Math.PI), randomRange(random, 0, Math.PI)),
          scale: createVector3(1, 1, 1),
          color: satelliteIndex % 2 === 0 ? '#7f7a67' : '#8fd8ff',
          emissive: satelliteIndex % 2 === 0 ? '#2a241f' : '#8fd8ff',
          emissiveIntensity: satelliteIndex % 2 === 0 ? 0.08 : 0.28,
          metalness: 0.62,
          roughness: 0.52
        }
      })
      const shards = Array.from({ length: 3 + (index % 4) }, (_, shardIndex) => {
        const angle = (shardIndex / (3 + (index % 4))) * Math.PI * 2
        return {
          id: `${item.id}-shard-${shardIndex}`,
          geometry: 'box' as const,
          args: [0.05, randomRange(random, 0.28, 0.72), 0.06],
          position: createVector3(Math.cos(angle) * randomRange(random, 0.22, 0.6), randomRange(random, -0.1, 0.42), Math.sin(angle) * randomRange(random, 0.22, 0.6)),
          rotation: createVector3(randomRange(random, -1.2, 1.2), angle, randomRange(random, -1.2, 1.2)),
          scale: createVector3(1, 1, 1),
          color: '#4c6170',
          emissive: '#4c6170',
          emissiveIntensity: 0.12,
          metalness: 0.84,
          roughness: 0.24
        }
      })

      return {
        id: `${item.id}-assembly`,
        position: item.position,
        rotation: item.rotation,
        core: {
          id: `${item.id}-core`,
          geometry: item.geometry,
          args: item.args,
          position: createVector3(0, 0, 0),
          rotation: createVector3(0, 0, 0),
          scale: createVector3(1, 1, 1),
          color: '#5a5a4a',
          emissive: '#2e2a25',
          emissiveIntensity: 0.05,
          metalness: 0.08,
          roughness: 0.93
        },
        satellites,
        shards,
        halo: index % 2 === 0 ? {
          id: `${item.id}-halo`,
          geometry: 'torus',
          args: [randomRange(random, 0.18, 0.42), 0.025, 10, 20],
          position: createVector3(0, randomRange(random, 0.12, 0.38), 0),
          rotation: createVector3(Math.PI / 2 + randomRange(random, -0.5, 0.5), randomRange(random, 0, Math.PI), 0),
          scale: createVector3(1, 1, 1),
          color: '#86cfff',
          emissive: '#86cfff',
          emissiveIntensity: 0.3,
          metalness: 1,
          roughness: 0.04,
          transparent: true,
          opacity: 0.68
        } : null
      }
    })
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
  const junkAssemblies = createJunkAssemblies(junkItems)
  const junkAccentLights = createAccentLights(8)
  const floatingAnomalies = createFloatingAnomalies()
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
  const portalPetalAngles = [0, Math.PI / 3, (Math.PI * 2) / 3, Math.PI, (Math.PI * 4) / 3, (Math.PI * 5) / 3]
  const markerOrbitAngles = [0, (Math.PI * 2) / 3, (Math.PI * 4) / 3]
  const interiorPanelTextures = createTechPanelTextureBundle({
    baseColor: '#2a3d4a',
    detailColor: '#0f1822',
    accentColor: '#3d7e9d',
    seed: 51,
    repeat: [3, 2]
  })
  const junkTextures = createRustTextureBundle({
    baseColor: '#5a5a4a',
    detailColor: '#60402e',
    accentColor: '#8f846a',
    seed: 58,
    repeat: [1, 1]
  })
  const screenTexture = createScreenTexture({
    baseColor: '#08365f',
    detailColor: '#021321',
    accentColor: '#6de1ff',
    seed: 60
  })
  const textureBundlesToDispose = [
    interiorPanelTextures,
    junkTextures,
  ]

  let time = 0
  let screenPulse = 0
  let displayPhase = 0
  let hoveredInteractiveId: string | null = null
  let portalTransitionPending = false
  let portalTransitionResetId: number | null = null
  let levelTransitionHandler: { transitionToLevel?: (levelId: string) => boolean } | null = null
  let starMapComponent: any = null
  let starMapRef: THREE.Group
  let starNavigationSystem: any = null
  let realTimelineEvents: any[] = []
  let isLoadingTimeline = true
  let timelineLoadError: string | null = null
  $: sciFiLevelSettings = $editorSceneStore?.settings?.level ?? {}
  $: activeSkyboxPreset = SKYBOX_PRESETS[sciFiLevelSettings.skyboxPreset as keyof typeof SKYBOX_PRESETS] ?? SKYBOX_PRESETS.observatory
  $: sciFiFogColor = sciFiLevelSettings.style?.fog?.color ?? '#5f76a8'
  $: sciFiFogDensity = sciFiLevelSettings.style?.fog?.density ?? 0.0035
  $: sciFiAmbientIntensity = sciFiLevelSettings.lighting?.ambientIntensity ?? 1.25
  $: sciFiKeyLightIntensity = sciFiLevelSettings.lighting?.keyLightIntensity ?? 0.55
  $: sciFiFillLightIntensity = sciFiLevelSettings.lighting?.fillLightIntensity ?? 0.2
  $: sciFiStarMapEnabled = sciFiLevelSettings.features?.starMap ?? true

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

  function requestReturnToObservatory() {
    if (portalTransitionPending) return

    portalTransitionPending = true
    if (portalTransitionResetId !== null) {
      window.clearTimeout(portalTransitionResetId)
    }
    portalTransitionResetId = window.setTimeout(() => {
      portalTransitionPending = false
      portalTransitionResetId = null
    }, 350)
    console.log('🌀 Portal requested return to observatory')
    dispatch('requestLevelReturn', {
      levelType: 'observatory',
      title: 'Return to Observatory?',
      message: 'Leave the Sci Fi Room and travel back to the observatory?',
      confirmLabel: 'Return',
      cancelLabel: 'Stay Here',
    })
  }

  function resetPortalTransitionState() {
    if (portalTransitionResetId !== null) {
      window.clearTimeout(portalTransitionResetId)
      portalTransitionResetId = null
    }
    portalTransitionPending = false
  }

  function handlePortalContact() {
    requestReturnToObservatory()
  }

  function handleInteractiveClick(marker: InteractiveMarker) {
    if (marker.interactionType === 'portal') {
      requestReturnToObservatory()
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
    resetPortalTransitionState()

    textureBundlesToDispose.forEach((bundle) => {
      disposeProceduralTextureBundle(bundle)
    })
    screenTexture.dispose()

    if (!interactionSystem?.unregisterInteractiveObject) return

    interactiveMarkers.forEach((marker) => {
      interactionSystem.unregisterInteractiveObject(marker.id)
    })
  })
</script>

<LevelManager>
  <T.Group name="sci-fi-room-level">

    <Skybox
      path={activeSkyboxPreset.path}
      files={activeSkyboxPreset.files}
    />

    <T.FogExp2 color={$editorStateStore.enabled && $editorStateStore.viewportLightingMode === 'workbench' ? '#d9e6f5' : sciFiFogColor} density={$editorStateStore.enabled && $editorStateStore.viewportLightingMode === 'workbench' ? 0.00025 : sciFiFogDensity} />

    <!-- ══════════════════════════════════════════
         PHYSICS BASE LAYER
         ══════════════════════════════════════════ -->

    <!-- Interior ceiling -->
    <T.Group position={[0, FLOOR_Y + H, 0]}>
      <RigidBody type="fixed">
        <Collider shape="cuboid" args={[W/2, T_WALL/2, D/2]} />
      </RigidBody>
      {#if collisionDebugEnabled}
        <EditorColliderHelper shape="cuboid" args={[W/2, T_WALL/2, D/2]} />
      {/if}
    </T.Group>

    <!-- Interior walls (excluding back wall for archway) -->
    {#each [[0, 0, -D/2], [-W/2, 0, 0], [W/2, 0, 0]] as [x, y, z]}
      <T.Group position={[x, FLOOR_Y + H/2, z]}>
        <RigidBody type="fixed">
          <Collider shape="cuboid" args={[Math.abs(x) > 0.1 ? T_WALL/2 : W/2, H/2, Math.abs(z) > 0.1 ? T_WALL/2 : D/2]} />
        </RigidBody>
        {#if collisionDebugEnabled}
          <EditorColliderHelper shape="cuboid" args={[Math.abs(x) > 0.1 ? T_WALL/2 : W/2, H/2, Math.abs(z) > 0.1 ? T_WALL/2 : D/2]} />
        {/if}
      </T.Group>
    {/each}

    <!-- Back wall split around archway opening -->
    <!-- Left back section -->
    <T.Group position={[-W/4 - 0.7, FLOOR_Y + H/2, D/2]}>
      <RigidBody type="fixed">
        <Collider shape="cuboid" args={[W/4 - 0.7, H/2, T_WALL/2]} />
      </RigidBody>
      {#if collisionDebugEnabled}
        <EditorColliderHelper shape="cuboid" args={[W/4 - 0.7, H/2, T_WALL/2]} />
      {/if}
    </T.Group>
    <!-- Right back section -->
    <T.Group position={[W/4 + 0.7, FLOOR_Y + H/2, D/2]}>
      <RigidBody type="fixed">
        <Collider shape="cuboid" args={[W/4 - 0.7, H/2, T_WALL/2]} />
      </RigidBody>
      {#if collisionDebugEnabled}
        <EditorColliderHelper shape="cuboid" args={[W/4 - 0.7, H/2, T_WALL/2]} />
      {/if}
    </T.Group>

    <!-- ══════════════════════════════════════════
         COMMAND CENTER (Condensed Interior)
         ══════════════════════════════════════════ -->

    <!-- Interior walls (excluding back wall for archway) -->
    {#each [[0, -D/2 - T_WALL/2], [-W/2 - T_WALL/2, 0], [W/2 + T_WALL/2, 0]] as [x, z]}
      <T.Mesh position={[x, FLOOR_Y + H/2, z]} receiveShadow>
        <T.BoxGeometry args={[Math.abs(x) > W/3 ? T_WALL : W, H, Math.abs(z) > D/3 ? T_WALL : D]} />
        <T.MeshStandardMaterial
          color={COL_WALL}
          map={interiorPanelTextures.map}
          roughnessMap={interiorPanelTextures.roughnessMap}
          bumpMap={interiorPanelTextures.bumpMap}
          bumpScale={0.06}
          emissive="#173244"
          emissiveIntensity={0.28}
          roughness={0.46}
          metalness={0.66}
          envMapIntensity={1.15}
        />
      </T.Mesh>
    {/each}

    <!-- Back wall split sections -->
    {#each [[-W/4 - 0.7, D/2 + T_WALL/2], [W/4 + 0.7, D/2 + T_WALL/2]] as [x, z]}
      <T.Mesh position={[x, FLOOR_Y + H/2, z]} receiveShadow>
        <T.BoxGeometry args={[W/4 - 0.7, H, T_WALL]} />
        <T.MeshStandardMaterial
          color={COL_WALL}
          map={interiorPanelTextures.map}
          roughnessMap={interiorPanelTextures.roughnessMap}
          bumpMap={interiorPanelTextures.bumpMap}
          bumpScale={0.06}
          emissive="#173244"
          emissiveIntensity={0.28}
          roughness={0.46}
          metalness={0.66}
          envMapIntensity={1.15}
        />
      </T.Mesh>
    {/each}

    <!-- Ceiling -->
    <T.Mesh position={[0, FLOOR_Y + H, 0]}>
      <T.BoxGeometry args={[W, T_WALL, D]} />
      <T.MeshStandardMaterial
        color="#2a3a48"
        map={interiorPanelTextures.map}
        roughnessMap={interiorPanelTextures.roughnessMap}
        bumpMap={interiorPanelTextures.bumpMap}
        bumpScale={0.04}
        emissive="#163245"
        emissiveIntensity={0.2}
        roughness={0.58}
        metalness={0.55}
        envMapIntensity={0.9}
      />
    </T.Mesh>

    <!-- Animated screens -->
    {#each [-0.5, 0.5] as x}
      <T.Mesh position={[x, FLOOR_Y + 1.8, -0.55]}>
        <T.BoxGeometry args={[0.8, 1.0, 0.02]} />
        <T.MeshStandardMaterial
          color={screenColor}
          map={screenTexture}
          emissiveMap={screenTexture}
          emissive={screenColor}
          emissiveIntensity={screenGlow}
          metalness={0.12}
          roughness={0.08}
        />
      </T.Mesh>
    {/each}

    <!-- Floor grates -->
    {#each [-4.0, 4.0] as x}
      <T.Mesh position={[x, FLOOR_Y + 0.01, -2.4]}>
        <T.BoxGeometry args={[1.4, 0.03, 2.4]} />
        <T.MeshStandardMaterial color="#18232d" map={interiorPanelTextures.map} roughnessMap={interiorPanelTextures.roughnessMap} bumpMap={interiorPanelTextures.bumpMap} bumpScale={0.04} metalness={0.72} roughness={0.52} />
      </T.Mesh>
    {/each}

    <!-- Ceiling conduits -->
    {#each [-2.8, 0, 2.8] as x}
      <T.Mesh position={[x, FLOOR_Y + H - 0.22, -0.8]} rotation={[0, 0, Math.PI / 2]}>
        <T.CylinderGeometry args={[0.06, 0.06, D - 1.0, 10]} />
        <T.MeshStandardMaterial color="#314755" metalness={0.82} roughness={0.34} envMapIntensity={1.1} />
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
      {#if sciFiStarMapEnabled}
      <StarMap
          bind:this={starMapComponent}
          bind:starMapRef={starMapRef}
          timelineEvents={realTimelineEvents}
          {interactionSystem}
          on:starSelected={handleStarSelected}
        />
      {/if}
      </T.Group>

      {#if sciFiStarMapEnabled}
      <StarNavigationSystem
        bind:this={starNavigationSystem}
        timelineEvents={realTimelineEvents}
        starMapComponent={starMapRef}
        on:starSelected={handleStarSelected}
        on:starDeselected={handleStarDeselected}
        on:levelTransition={handleLevelTransition}
      />
      {/if}

    {/if}


    <!-- ══════════════════════════════════════════
         WASTELAND (Vast junk-strewn plane)
         ══════════════════════════════════════════ -->

    <!-- Scattered junk (geometric shapes) -->
    {#each junkAssemblies as assembly, assemblyIndex (assembly.id)}
      <T.Group position={assembly.position} rotation={assembly.rotation}>
        <ProceduralMesh
          geometry={assembly.core.geometry}
          args={assembly.core.args}
          position={assembly.core.position}
          rotation={assembly.core.rotation}
          scale={assembly.core.scale}
          color={assembly.core.color}
          emissive={assembly.core.emissive}
          emissiveIntensity={assembly.core.emissiveIntensity ?? 0}
          metalness={assembly.core.metalness ?? 0.08}
          roughness={assembly.core.roughness ?? 0.93}
        />

        {#if assembly.halo}
          <ProceduralMesh
            geometry={assembly.halo.geometry}
            args={assembly.halo.args}
            position={assembly.halo.position}
            rotation={[
              assembly.halo.rotation[0] + time * 0.55,
              assembly.halo.rotation[1] + time * 0.22,
              assembly.halo.rotation[2] + time * 0.18
            ]}
            scale={assembly.halo.scale}
            color={assembly.halo.color}
            emissive={assembly.halo.emissive}
            emissiveIntensity={(assembly.halo.emissiveIntensity ?? 0) + screenGlow * 0.04}
            metalness={assembly.halo.metalness ?? 1}
            roughness={assembly.halo.roughness ?? 0.04}
            transparent={assembly.halo.transparent ?? false}
            opacity={assembly.halo.opacity ?? 1}
          />
        {/if}

        {#each assembly.shards as shard, shardIndex (shard.id)}
          <ProceduralMesh
            geometry={shard.geometry}
            args={shard.args}
            position={shard.position}
            rotation={[
              shard.rotation[0] + time * (0.18 + shardIndex * 0.03),
              shard.rotation[1] + time * 0.08,
              shard.rotation[2] - time * (0.12 + shardIndex * 0.02)
            ]}
            scale={shard.scale}
            color={shard.color}
            emissive={shard.emissive}
            emissiveIntensity={shard.emissiveIntensity ?? 0}
            metalness={shard.metalness ?? 0.8}
            roughness={shard.roughness ?? 0.24}
          />
        {/each}

        {#each assembly.satellites as satellite, satelliteIndex (satellite.id)}
          <ProceduralMesh
            geometry={satellite.geometry}
            args={satellite.args}
            position={[
              satellite.position[0] + Math.cos(time * 0.42 + satelliteIndex + assemblyIndex * 0.2) * 0.05,
              satellite.position[1] + Math.sin(time * 0.35 + satelliteIndex) * 0.08,
              satellite.position[2] + Math.sin(time * 0.38 + satelliteIndex + assemblyIndex * 0.1) * 0.05
            ]}
            rotation={[
              satellite.rotation[0] + time * 0.24,
              satellite.rotation[1] - time * (0.2 + satelliteIndex * 0.03),
              satellite.rotation[2] + time * 0.16
            ]}
            scale={satellite.scale}
            color={satellite.color}
            emissive={satellite.emissive}
            emissiveIntensity={(satellite.emissiveIntensity ?? 0) + screenGlow * 0.03}
            metalness={satellite.metalness ?? 0.6}
            roughness={satellite.roughness ?? 0.5}
          />
        {/each}
      </T.Group>
    {/each}

    <!-- Junk accent lights -->
    {#each junkAccentLights as light (light.id)}
      <T.PointLight position={light.position} color="#666633" intensity={3} distance={4} decay={1.5} />
    {/each}


    <!-- ══════════════════════════════════════════
         LIGHTING
         ══════════════════════════════════════════ -->

    <T.AmbientLight intensity={sciFiAmbientIntensity} color="#8899ff" />
    <T.HemisphereLight skyColor="#b8d8ff" groundColor="#1d2633" intensity={0.95} />
    <T.DirectionalLight position={[10, 18, -12]} color="#b7d7ff" intensity={sciFiKeyLightIntensity} />
    <T.DirectionalLight position={[-18, 12, 22]} color="#2a4069" intensity={sciFiFillLightIntensity} />

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
