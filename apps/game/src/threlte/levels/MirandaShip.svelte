<script lang="ts">
  import { createEventDispatcher, onDestroy, onMount } from 'svelte'
  import { T, useTask } from '@threlte/core'
  import { Collider, RigidBody } from '@threlte/rapier'
  import * as THREE from 'three'
  import LevelManager from '../core/LevelManager.svelte'
  import EditorColliderHelper from '../editor/EditorColliderHelper.svelte'
  import { editorSceneStore, editorStateStore } from '../editor/editorStore'
  import LevelTransitionHandler from '../components/LevelTransitionHandler.svelte'
  import StarSprite from '../components/StarSprite.svelte'
  import Skybox from '../systems/Skybox.svelte'
  import {
    createFloorTileTextureBundle,
    createRustTextureBundle,
    createScreenTexture,
    createTechPanelTextureBundle,
    createWoodTextureBundle,
    disposeProceduralTextureBundle,
  } from '../utils/proceduralTextures'
  import { gameActions } from '../stores/gameStateStore'

  const dispatch = createEventDispatcher()

  export let spawnSystem: any = null
  export let interactionSystem: any = null
  export let playerSpawnPoint: [number, number, number] = [0, 4.25, -13.8]
  export let collisionDebugEnabled = false

  type Vector3Tuple = [number, number, number]
  type InteractiveMarkerType = 'note' | 'portal'

  interface ShipNote {
    id: string
    title: string
    author: string
    location: string
    excerpt: string
    body: string
    position: Vector3Tuple
    markerColor: string
  }

  interface InteractiveMarker {
    id: string
    position: Vector3Tuple
    size: number
    intensity: number
    color: string
    animationOffset: number
    interactionType: InteractiveMarkerType
    noteId?: string
  }

  interface CuboidColliderConfig {
    id: string
    position: Vector3Tuple
    args: number[]
    shape: 'cuboid' | 'cylinder'
  }

  interface StructuralWallConfig {
    id: string
    position: Vector3Tuple
    size: Vector3Tuple
    surface: 'hull-side' | 'hull-end' | 'bulkhead' | 'divider'
  }

  interface BoxFeatureConfig {
    id: string
    position: Vector3Tuple
    size: Vector3Tuple
  }

  const FLOOR_Y = 0
  const WALL_H = 8.8
  const CEILING_Y = FLOOR_Y + WALL_H
  const SECOND_DECK_Y = FLOOR_Y + 4.1
  const FLOOR_THICKNESS = 0.25
  const SECOND_DECK_THICKNESS = 0.22
  const WALL_THICKNESS = 0.32

  const HULL_WIDTH = 34
  const HULL_DEPTH = 102

  const COCKPIT_CENTER: Vector3Tuple = [0, FLOOR_Y + 1.6, -17.5]
  const ENGINE_ROOM_CENTER: Vector3Tuple = [0, FLOOR_Y + 1.4, 16.5]
  const CREW_QUARTERS_CENTER: Vector3Tuple = [-6.15, FLOOR_Y + 1.3, -2.6]
  const CAPTAIN_OFFICE_CENTER: Vector3Tuple = [6.1, FLOOR_Y + 1.3, -3.6]
  const AIRLOCK_CENTER: Vector3Tuple = [0, FLOOR_Y + 1.0, 6.6]
  const MEDBAY_CENTER: Vector3Tuple = [-11.1, FLOOR_Y + 1.2, 12.6]
  const MESS_CENTER: Vector3Tuple = [-10.8, FLOOR_Y + 1.2, 30.8]
  const CHAPEL_CENTER: Vector3Tuple = [10.8, FLOOR_Y + 1.2, 14.6]
  const BRIG_CENTER: Vector3Tuple = [10.8, FLOOR_Y + 1.2, 32.2]
  const CARGO_HOLD_CENTER: Vector3Tuple = [0, FLOOR_Y + 1.2, 35.2]
  const COMMAND_GALLERY_CENTER: Vector3Tuple = [0, SECOND_DECK_Y + 0.8, -27.5]
  const OBSERVATION_GALLERY_CENTER: Vector3Tuple = [-10.8, SECOND_DECK_Y + 0.8, 8.4]
  const ARCHIVE_GALLERY_CENTER: Vector3Tuple = [10.8, SECOND_DECK_Y + 0.8, 10.8]

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

  const hullTextures = createTechPanelTextureBundle({
    baseColor: '#242a36',
    detailColor: '#0b1019',
    accentColor: '#6c7f93',
    repeat: [4, 3],
    seed: 301,
  })
  const floorTextures = createFloorTileTextureBundle({
    baseColor: '#111821',
    detailColor: '#05080e',
    accentColor: '#5d1f25',
    repeat: [4, 5],
    seed: 302,
  })
  const deckPlateTextures = createTechPanelTextureBundle({
    baseColor: '#1d2430',
    detailColor: '#090d14',
    accentColor: '#7b3c42',
    repeat: [3, 2],
    seed: 303,
  })
  const engineTextures = createRustTextureBundle({
    baseColor: '#392b2d',
    detailColor: '#1c1113',
    accentColor: '#8f5844',
    repeat: [3, 3],
    seed: 304,
  })
  const deskTextures = createWoodTextureBundle({
    baseColor: '#4d3427',
    detailColor: '#24160e',
    accentColor: '#8d6940',
    repeat: [2, 1],
    seed: 305,
  })
  const cockpitScreenTexture = createScreenTexture({
    baseColor: '#11314a',
    detailColor: '#050c16',
    accentColor: '#92dfff',
    seed: 306,
  })
  const engineScreenTexture = createScreenTexture({
    baseColor: '#3f120d',
    detailColor: '#150706',
    accentColor: '#ffb56b',
    seed: 307,
  })

  const proceduralBundles = [
    hullTextures,
    floorTextures,
    deckPlateTextures,
    engineTextures,
    deskTextures,
  ]

  const shipNotes: ShipNote[] = [
    {
      id: 'captain-log-45721',
      title: "Captain's Log 45.7.21",
      author: 'Captain Helena Zhao',
      location: 'Cockpit Nav Station',
      excerpt: 'There is nothing to salvage. Only debris, salt, and the taste of a vanished system.',
      body:
        "This is Captain Helena Zhao of the salvage vessel Second Breakfast.\n\nMiranda's primary sun went supernova without warning. Inner planets vaporized. Outer planetoids were thrown into cold darkness. We entered the debris field expecting a graveyard and found something worse: a silence that feels arranged.\n\nSome say you can still taste celery salt in the dust. I laughed when I first heard it. I am not laughing now.",
      position: [-1.35, FLOOR_Y + 1.12, -18.4],
      markerColor: '#9fdcff',
    },
    {
      id: 'crew-medical-watch',
      title: 'Crew Medical Watch',
      author: 'Dr. Imani Vale',
      location: 'Crew Quarters Locker',
      excerpt: 'Headaches, nausea, deja vu. Nobody wants to say the symptoms out loud twice.',
      body:
        "Three crew reported headaches after handling drone returns from the debris field. Two described dreams of a bar they have never visited. One woke up repeating a drink order in a voice he claims was not his own.\n\nNo abnormalities on scans. No fever. No infection. The fear is the only thing progressing.\n\nRecommendation: limit direct exposure to recovered signal caches, especially any reference to a Bloody Mary and any insistence on pickle prohibition.",
      position: [-7.2, FLOOR_Y + 1.08, -0.1],
      markerColor: '#ff9d9d',
    },
    {
      id: 'engine-room-memo',
      title: 'Engineering Memo 8.15',
      author: 'Chief Engineer Mara Quill',
      location: 'Engine Room Control Deck',
      excerpt: 'The ship is humming in sympathy with transmissions that should no longer exist.',
      body:
        "Reactor output remains nominal, but the harmonic drift is wrong. Every time we pass through a dense pocket of Miranda ash, the engine room resonates with carrier bands matching the dead system's final RF burst.\n\nIt sounds like traffic stacked above an atmosphere that is no longer there. Queue chatter. Clearance loops. Repeated holds.\n\nI have shut down three relays and the sound still comes through the deck.",
      position: [2.55, FLOOR_Y + 1.2, 15.7],
      markerColor: '#ffb36d',
    },
    {
      id: 'first-officer-note',
      title: 'Private Memorandum',
      author: 'First Officer Soren Pike',
      location: "Captain's Office Desk",
      excerpt: 'The captain looks composed until someone mentions drinks, dreams, or card players.',
      body:
        "The captain has not slept properly in eleven cycles. She denies it, but the evidence is in the way she freezes whenever recovered transcripts mention the saloon.\n\nTwice now she has asked whether anyone else has seen three old men through the bridge glass. There was nobody there. On the second occasion she also asked whether the ship kept a safe for paper records.\n\nIt does now.",
      position: [6.8, FLOOR_Y + 1.06, -4.1],
      markerColor: '#e7c89d',
    },
    {
      id: 'vault-fragment',
      title: 'Vault Fragment: Recipe Lockbox',
      author: 'Recovered hardcopy, access restricted',
      location: "Captain's Safe",
      excerpt: 'The page keeps moving. The phrase keeps returning. The paper smells faintly of tomato, iron, and smoke.',
      body:
        "Cross-reference from the mechanical observer and the old man's account suggests a causality nexus formed around a drink completed at the instant of Miranda's destruction.\n\nHardcopy fragment secured in captain's vault after digital copies exhibited instability. Crew instructed not to vocalize the activation phrase aloud.\n\nFragment note: \"Bloody Mary, no pickles, make it a double.\"\n\nIf this page is found outside the safe again, burn it and do not discuss the ash.",
      position: [8.2, FLOOR_Y + 1.18, -6.55],
      markerColor: '#ff6d8e',
    },
    {
      id: 'medbay-quarantine-slip',
      title: 'Quarantine Bay Slip',
      author: 'Dr. Imani Vale',
      location: 'Medbay Cryo Pod',
      excerpt: 'The sleepers are not dead. The ship still refuses to classify them as living.',
      body:
        "We sealed three crew inside the aft medbay after the Miranda ash dreams escalated into waking fugues. They answer to their names, but only after a delay, as if translating from somewhere farther away.\n\nTheir body temperatures fall whenever the Bloody Mary phrase is spoken near the pods. The glass frosts from the inside first.\n\nI have ordered the quarantine lamps to stay red until somebody can explain why the EEG spikes match the ship's own telemetry.",
      position: [-12.9, FLOOR_Y + 1.08, 12.2],
      markerColor: '#8de0ff',
    },
    {
      id: 'mess-ledger-ashfall',
      title: 'Mess Ledger Addendum',
      author: 'Steward Callum Reef',
      location: 'Galley Service Counter',
      excerpt: 'We ran out of clean water before we ran out of stories about the bar.',
      body:
        "Nobody eats in the mess unless the speakers are playing static. If the channels are quiet, people start hearing the card table again.\n\nThe bowls rattle whenever we cross a dense ash current. Plates slide toward the aft corridor as if the ship itself leans toward Miranda.\n\nI locked the pantry and still found celery salt on the floor this morning.",
      position: [-11.4, FLOOR_Y + 1.02, 29.2],
      markerColor: '#ffc584',
    },
    {
      id: 'archive-index-anomaly',
      title: 'Archive Index: Recovered Echoes',
      author: 'Signal Archivist Nila Serrin',
      location: 'Upper Data Gallery',
      excerpt: 'Each copied transcript diverges the second time it is opened.',
      body:
        "The upper archive is no longer storing files. It is growing variants.\n\nOpen one Miranda transcript and you receive an account. Open it again and the witness order changes. Open it a third time and there is a fourth witness seated at the table.\n\nI moved the worst logs to the upper stacks and disconnected them from the main grid. The lights in this gallery still blink in answers.",
      position: [12.6, SECOND_DECK_Y + 1.02, 9.4],
      markerColor: '#cba7ff',
    },
    {
      id: 'brig-confession',
      title: 'Brig Confession',
      author: 'Unnamed detainee',
      location: 'Detention Cell 02',
      excerpt: 'I was not trying to open the safe. I was trying to put the page back.',
      body:
        "They locked me in the brig because I kept leaving the corridor at night and waking up near the captain's office with soot under my nails.\n\nThe truth is smaller and worse: every time I close my eyes, I can hear a voice asking me to return a recipe card to its proper era.\n\nThe bars hum when the engines drift. The hum knows my name.",
      position: [12.8, FLOOR_Y + 1.08, 31.6],
      markerColor: '#ff8ea6',
    },
  ]

  $: mirandaLevelSettings = $editorSceneStore?.settings?.level ?? {}
  $: activeSkyboxPreset = SKYBOX_PRESETS[mirandaLevelSettings.skyboxPreset as keyof typeof SKYBOX_PRESETS] ?? SKYBOX_PRESETS.observatory
  $: effectivePlayerSpawnPoint = mirandaLevelSettings.spawn?.position ?? playerSpawnPoint
  $: mirandaFogColor = mirandaLevelSettings.style?.fog?.color ?? '#080b12'
  $: mirandaFogDensity = mirandaLevelSettings.style?.fog?.density ?? 0.017
  $: mirandaAmbientIntensity = mirandaLevelSettings.lighting?.ambientIntensity ?? 0.38
  $: mirandaFillLightIntensity = mirandaLevelSettings.lighting?.fillLightIntensity ?? 0.42
  $: mirandaKeyLightIntensity = mirandaLevelSettings.lighting?.keyLightIntensity ?? 1.15

  const shipNoteById = new Map(shipNotes.map((note) => [note.id, note]))

  const noteMarkers: InteractiveMarker[] = shipNotes.map((note, index) => ({
    id: `note-marker-${note.id}`,
    position: [note.position[0], note.position[1] + 0.38, note.position[2]],
    size: 0.58,
    intensity: 0.9,
    color: note.markerColor,
    animationOffset: 0.4 + index * 0.37,
    interactionType: 'note',
    noteId: note.id,
  }))

  const portalMarker: InteractiveMarker = {
    id: 'miranda-return-airlock',
    position: [AIRLOCK_CENTER[0], AIRLOCK_CENTER[1] + 0.62, AIRLOCK_CENTER[2]],
    size: 0.95,
    intensity: 1.1,
    color: '#7fd3ff',
    animationOffset: 3.1,
    interactionType: 'portal',
  }

  const interactiveMarkers = [...noteMarkers, portalMarker]

  const corridorLights = Array.from({ length: 28 }, (_, index) => ({
    id: `corridor-light-${index}`,
    position: [0, CEILING_Y - 0.22, -41 + index * 3.05] as Vector3Tuple,
    emissive: index % 3 === 0 ? '#ff8f6b' : '#8fd6ff',
  }))

  const floorGuideLights = Array.from({ length: 22 }, (_, index) => ({
    id: `deck-strip-${index}`,
    position: [0, FLOOR_Y + 0.02, -32 + index * 3.0] as Vector3Tuple,
    length: index % 2 === 0 ? 1.5 : 0.9,
  }))

  const ceilingPipes = [-12, -7.2, -2.4, 2.4, 7.2, 12].map((x, index) => ({
    id: `pipe-${index}`,
    position: [x, CEILING_Y - 0.55, 7.0] as Vector3Tuple,
  }))

  const bunkStacks = [
    { id: 'bunk-port-a', position: [-7.55, FLOOR_Y + 0.76, -4.2] as Vector3Tuple },
    { id: 'bunk-port-b', position: [-7.55, FLOOR_Y + 2.1, -4.2] as Vector3Tuple },
    { id: 'bunk-starboard-a', position: [-7.55, FLOOR_Y + 0.76, 0.9] as Vector3Tuple },
    { id: 'bunk-starboard-b', position: [-7.55, FLOOR_Y + 2.1, 0.9] as Vector3Tuple },
  ]

  const lockers = Array.from({ length: 4 }, (_, index) => ({
    id: `locker-${index}`,
    position: [-4.7, FLOOR_Y + 1.32, -5.5 + index * 1.9] as Vector3Tuple,
  }))

  const engineColumns = [-3.6, -1.2, 1.2, 3.6].map((x, index) => ({
    id: `engine-column-${index}`,
    position: [x, FLOOR_Y + 1.5, 15.6] as Vector3Tuple,
  }))

  const cockpitGlowPanels = [-2.6, 0, 2.6].map((x, index) => ({
    id: `cockpit-panel-${index}`,
    position: [x, FLOOR_Y + 2.25, -20.2] as Vector3Tuple,
    rotation: [0.18, x < 0 ? 0.36 : x > 0 ? -0.36 : 0, 0] as Vector3Tuple,
  }))

  const hullWallSegments: StructuralWallConfig[] = [
    {
      id: 'hull-port-wall',
      position: [-HULL_WIDTH / 2 - WALL_THICKNESS / 2, FLOOR_Y + WALL_H / 2, 0],
      size: [WALL_THICKNESS, WALL_H, HULL_DEPTH],
      surface: 'hull-side',
    },
    {
      id: 'hull-starboard-wall',
      position: [HULL_WIDTH / 2 + WALL_THICKNESS / 2, FLOOR_Y + WALL_H / 2, 0],
      size: [WALL_THICKNESS, WALL_H, HULL_DEPTH],
      surface: 'hull-side',
    },
    {
      id: 'hull-forward-wall',
      position: [0, FLOOR_Y + WALL_H / 2, -HULL_DEPTH / 2 - WALL_THICKNESS / 2],
      size: [HULL_WIDTH, WALL_H, WALL_THICKNESS],
      surface: 'hull-end',
    },
    {
      id: 'hull-aft-wall',
      position: [0, FLOOR_Y + WALL_H / 2, HULL_DEPTH / 2 + WALL_THICKNESS / 2],
      size: [HULL_WIDTH, WALL_H, WALL_THICKNESS],
      surface: 'hull-end',
    },
  ]

  const partitionWallSegments: StructuralWallConfig[] = [
    {
      id: 'cockpit-port-bulkhead',
      position: [-4.6, FLOOR_Y + WALL_H / 2, -11.2],
      size: [6.4, WALL_H, WALL_THICKNESS],
      surface: 'bulkhead',
    },
    {
      id: 'cockpit-starboard-bulkhead',
      position: [4.6, FLOOR_Y + WALL_H / 2, -11.2],
      size: [6.4, WALL_H, WALL_THICKNESS],
      surface: 'bulkhead',
    },
    {
      id: 'engine-port-bulkhead',
      position: [-4.4, FLOOR_Y + WALL_H / 2, 11.6],
      size: [6.8, WALL_H, WALL_THICKNESS],
      surface: 'bulkhead',
    },
    {
      id: 'engine-starboard-bulkhead',
      position: [4.4, FLOOR_Y + WALL_H / 2, 11.6],
      size: [6.8, WALL_H, WALL_THICKNESS],
      surface: 'bulkhead',
    },
    {
      id: 'crew-quarters-divider',
      position: [-2.4 - WALL_THICKNESS / 2, FLOOR_Y + WALL_H / 2, -2.7],
      size: [WALL_THICKNESS, WALL_H, 14.8],
      surface: 'divider',
    },
    {
      id: 'captain-office-divider',
      position: [2.4 + WALL_THICKNESS / 2, FLOOR_Y + WALL_H / 2, -5.9],
      size: [WALL_THICKNESS, WALL_H, 9.4],
      surface: 'divider',
    },
    {
      id: 'port-forward-spine',
      position: [-6.8, FLOOR_Y + WALL_H / 2, -28],
      size: [WALL_THICKNESS, WALL_H, 27.6],
      surface: 'divider',
    },
    {
      id: 'starboard-forward-spine',
      position: [6.8, FLOOR_Y + WALL_H / 2, -28],
      size: [WALL_THICKNESS, WALL_H, 27.6],
      surface: 'divider',
    },
    {
      id: 'port-aft-spine',
      position: [-6.8, FLOOR_Y + WALL_H / 2, 18.6],
      size: [WALL_THICKNESS, WALL_H, 41.6],
      surface: 'divider',
    },
    {
      id: 'starboard-aft-spine',
      position: [6.8, FLOOR_Y + WALL_H / 2, 18.6],
      size: [WALL_THICKNESS, WALL_H, 41.6],
      surface: 'divider',
    },
    {
      id: 'medbay-mess-divider',
      position: [-10.8, FLOOR_Y + WALL_H / 2, 22.1],
      size: [9.4, WALL_H, WALL_THICKNESS],
      surface: 'bulkhead',
    },
    {
      id: 'chapel-brig-divider',
      position: [10.8, FLOOR_Y + WALL_H / 2, 24.1],
      size: [9.4, WALL_H, WALL_THICKNESS],
      surface: 'bulkhead',
    },
    {
      id: 'mess-aft-cap',
      position: [-10.8, FLOOR_Y + WALL_H / 2, 41.8],
      size: [9.4, WALL_H, WALL_THICKNESS],
      surface: 'bulkhead',
    },
    {
      id: 'brig-aft-cap',
      position: [10.8, FLOOR_Y + WALL_H / 2, 43.6],
      size: [9.4, WALL_H, WALL_THICKNESS],
      surface: 'bulkhead',
    },
    {
      id: 'cargo-port-arch',
      position: [-9.4, FLOOR_Y + WALL_H / 2, 31.4],
      size: [4.4, WALL_H, WALL_THICKNESS],
      surface: 'bulkhead',
    },
    {
      id: 'cargo-starboard-arch',
      position: [9.4, FLOOR_Y + WALL_H / 2, 33.6],
      size: [4.4, WALL_H, WALL_THICKNESS],
      surface: 'bulkhead',
    },
  ]

  const nebulaPlanes = [
    { id: 'nebula-a', position: [0, FLOOR_Y + 5.8, -67] as Vector3Tuple, scale: [56, 20, 1] as Vector3Tuple, color: '#cc4f3c' },
    { id: 'nebula-b', position: [-16, FLOOR_Y + 4.0, -60] as Vector3Tuple, scale: [22, 10, 1] as Vector3Tuple, color: '#7a2746' },
    { id: 'nebula-c', position: [18, FLOOR_Y + 7.2, -58] as Vector3Tuple, scale: [26, 12, 1] as Vector3Tuple, color: '#ff9d6c' },
    { id: 'nebula-d', position: [0, FLOOR_Y + 3.4, 66] as Vector3Tuple, scale: [40, 18, 1] as Vector3Tuple, color: '#3e2b54' },
  ]

  function toHalfExtents(size: Vector3Tuple): Vector3Tuple {
    return [size[0] / 2, size[1] / 2, size[2] / 2]
  }

  function createStairSteps(
    idPrefix: string,
    centerX: number,
    startZ: number,
    stepCount: number,
    direction: 1 | -1,
  ): BoxFeatureConfig[] {
    return Array.from({ length: stepCount }, (_, index) => {
      const height = 0.22 + index * 0.31
      return {
        id: `${idPrefix}-${index}`,
        position: [centerX, FLOOR_Y + height / 2, startZ + direction * index * 0.72],
        size: [2.4, height, 0.68],
      }
    })
  }

  const upperDeckPanels: BoxFeatureConfig[] = [
    { id: 'command-gallery-deck', position: [0, SECOND_DECK_Y, -27.5], size: [14.5, SECOND_DECK_THICKNESS, 18] },
    { id: 'port-observation-deck', position: [-11.3, SECOND_DECK_Y, 8.4], size: [7.2, SECOND_DECK_THICKNESS, 46] },
    { id: 'starboard-archive-deck', position: [11.3, SECOND_DECK_Y, 10.8], size: [7.2, SECOND_DECK_THICKNESS, 42] },
    { id: 'aft-command-catwalk', position: [0, SECOND_DECK_Y, 32.4], size: [12.4, SECOND_DECK_THICKNESS, 22] },
  ]

  const upperGuardSegments: BoxFeatureConfig[] = [
    { id: 'command-guard-port', position: [-7.3, SECOND_DECK_Y + 0.45, -27.5], size: [0.18, 0.9, 18] },
    { id: 'command-guard-starboard', position: [7.3, SECOND_DECK_Y + 0.45, -27.5], size: [0.18, 0.9, 18] },
    { id: 'port-gallery-outer-guard', position: [-14.85, SECOND_DECK_Y + 0.45, 8.4], size: [0.18, 0.9, 46] },
    { id: 'starboard-gallery-outer-guard', position: [14.85, SECOND_DECK_Y + 0.45, 10.8], size: [0.18, 0.9, 42] },
    { id: 'aft-catwalk-port-guard', position: [-6.3, SECOND_DECK_Y + 0.45, 32.4], size: [0.18, 0.9, 22] },
    { id: 'aft-catwalk-starboard-guard', position: [6.3, SECOND_DECK_Y + 0.45, 32.4], size: [0.18, 0.9, 22] },
    { id: 'aft-catwalk-forward-guard', position: [0, SECOND_DECK_Y + 0.45, 21.4], size: [12.4, 0.9, 0.18] },
    { id: 'aft-catwalk-aft-guard', position: [0, SECOND_DECK_Y + 0.45, 43.4], size: [12.4, 0.9, 0.18] },
  ]

  const stairSteps = [
    ...createStairSteps('port-stair', -3.9, 2.8, 12, 1),
    ...createStairSteps('starboard-stair', 3.9, 2.8, 12, 1),
  ]

  const cargoCrates: BoxFeatureConfig[] = [
    { id: 'cargo-stack-a', position: [-2.8, FLOOR_Y + 0.95, 33.6], size: [3.2, 1.9, 3.4] },
    { id: 'cargo-stack-b', position: [3.8, FLOOR_Y + 1.35, 38.1], size: [2.6, 2.7, 2.8] },
    { id: 'cargo-stack-c', position: [0.2, FLOOR_Y + 0.7, 44.2], size: [4.6, 1.4, 2.6] },
    { id: 'cargo-stack-d', position: [-4.6, FLOOR_Y + 0.78, 28.4], size: [2.2, 1.56, 2.2] },
  ]

  const messTables: BoxFeatureConfig[] = [
    { id: 'mess-table-a', position: [-11.4, FLOOR_Y + 0.72, 27.6], size: [2.8, 0.18, 1.2] },
    { id: 'mess-table-b', position: [-9.2, FLOOR_Y + 0.72, 33.2], size: [2.4, 0.18, 1.2] },
    { id: 'mess-counter', position: [-13.6, FLOOR_Y + 1.02, 29.8], size: [1.2, 2.04, 5.8] },
  ]

  const serverBanks: BoxFeatureConfig[] = [
    { id: 'archive-bank-a', position: [9.4, SECOND_DECK_Y + 1.3, 1.6], size: [1.4, 2.6, 3.2] },
    { id: 'archive-bank-b', position: [13.2, SECOND_DECK_Y + 1.3, 1.6], size: [1.4, 2.6, 3.2] },
    { id: 'archive-bank-c', position: [9.4, SECOND_DECK_Y + 1.3, 13.8], size: [1.4, 2.6, 3.2] },
    { id: 'archive-bank-d', position: [13.2, SECOND_DECK_Y + 1.3, 13.8], size: [1.4, 2.6, 3.2] },
    { id: 'archive-bank-e', position: [11.3, SECOND_DECK_Y + 1.3, 24.0], size: [4.8, 2.6, 1.6] },
  ]

  const medPods: BoxFeatureConfig[] = [
    { id: 'med-pod-a', position: [-12.8, FLOOR_Y + 1.02, 9.6], size: [1.2, 1.4, 3.6] },
    { id: 'med-pod-b', position: [-9.8, FLOOR_Y + 1.02, 9.6], size: [1.2, 1.4, 3.6] },
    { id: 'med-pod-c', position: [-12.8, FLOOR_Y + 1.02, 16.6], size: [1.2, 1.4, 3.6] },
    { id: 'med-pod-d', position: [-9.8, FLOOR_Y + 1.02, 16.6], size: [1.2, 1.4, 3.6] },
  ]

  const chapelMonoliths: BoxFeatureConfig[] = [
    { id: 'chapel-monolith-a', position: [9.2, FLOOR_Y + 2.0, 12.8], size: [1.1, 4.0, 1.1] },
    { id: 'chapel-monolith-b', position: [12.4, FLOOR_Y + 2.2, 12.4], size: [1.1, 4.4, 1.1] },
    { id: 'chapel-monolith-c', position: [10.8, FLOOR_Y + 0.92, 18.4], size: [3.4, 1.84, 1.3] },
  ]

  const brigBlocks: BoxFeatureConfig[] = [
    { id: 'brig-cell-a', position: [9.4, FLOOR_Y + 1.4, 30.0], size: [1.1, 2.8, 4.2] },
    { id: 'brig-cell-b', position: [13.0, FLOOR_Y + 1.4, 30.0], size: [1.1, 2.8, 4.2] },
    { id: 'brig-cell-c', position: [9.4, FLOOR_Y + 1.4, 37.6], size: [1.1, 2.8, 4.2] },
    { id: 'brig-cell-d', position: [13.0, FLOOR_Y + 1.4, 37.6], size: [1.1, 2.8, 4.2] },
    { id: 'brig-desk', position: [11.1, FLOOR_Y + 0.72, 42.0], size: [2.4, 1.44, 1.2] },
  ]

  const supportColumns = [-12.8, -7.4, 7.4, 12.8].flatMap((x, columnIndex) => [
    { id: `support-${columnIndex}-a`, position: [x, FLOOR_Y + 3.0, -6] as Vector3Tuple, size: [0.7, 6.0, 0.7] as Vector3Tuple },
    { id: `support-${columnIndex}-b`, position: [x, FLOOR_Y + 3.0, 21] as Vector3Tuple, size: [0.7, 6.0, 0.7] as Vector3Tuple },
  ])

  const roomLightClusters = [
    { id: 'medbay-light', position: [MEDBAY_CENTER[0], CEILING_Y - 1.1, MEDBAY_CENTER[2]], color: '#94eeff', intensity: 4.8, distance: 12 },
    { id: 'mess-light', position: [MESS_CENTER[0], CEILING_Y - 1.4, MESS_CENTER[2]], color: '#ffb469', intensity: 3.6, distance: 13 },
    { id: 'chapel-light', position: [CHAPEL_CENTER[0], CEILING_Y - 0.9, CHAPEL_CENTER[2]], color: '#b991ff', intensity: 4.2, distance: 12 },
    { id: 'brig-light', position: [BRIG_CENTER[0], CEILING_Y - 1.2, BRIG_CENTER[2]], color: '#ff6c7f', intensity: 3.2, distance: 10 },
    { id: 'archive-light', position: [ARCHIVE_GALLERY_CENTER[0], CEILING_Y - 1.6, ARCHIVE_GALLERY_CENTER[2]], color: '#7dc8ff', intensity: 5.0, distance: 16 },
    { id: 'observation-light', position: [OBSERVATION_GALLERY_CENTER[0], CEILING_Y - 1.6, OBSERVATION_GALLERY_CENTER[2]], color: '#8adff5', intensity: 4.6, distance: 15 },
    { id: 'cargo-light', position: [CARGO_HOLD_CENTER[0], CEILING_Y - 1.0, CARGO_HOLD_CENTER[2]], color: '#ff8c63', intensity: 5.2, distance: 19 },
  ] as const

  const propColliders: CuboidColliderConfig[] = [
    {
      id: 'cockpit-console-collider',
      position: COCKPIT_CENTER,
      args: [1.6, 0.7, 1.1],
      shape: 'cuboid',
    },
    {
      id: 'captain-desk-collider',
      position: [6.55, FLOOR_Y + 0.9, -4.6],
      args: [1.05, 0.07, 0.56],
      shape: 'cuboid',
    },
    {
      id: 'captain-safe-collider',
      position: [7.35, FLOOR_Y + 1.02, -6.55],
      args: [0.53, 0.66, 0.48],
      shape: 'cuboid',
    },
    {
      id: 'captain-chair-collider',
      position: [5.12, FLOOR_Y + 1.35, -4.85],
      args: [0.575, 0.38],
      shape: 'cylinder',
    },
    {
      id: 'engine-core-base-collider',
      position: [ENGINE_ROOM_CENTER[0], FLOOR_Y + 0.18, ENGINE_ROOM_CENTER[2]],
      args: [0.18, 2.45],
      shape: 'cylinder',
    },
    {
      id: 'engine-core-column-collider',
      position: [ENGINE_ROOM_CENTER[0], FLOOR_Y + 1.75, ENGINE_ROOM_CENTER[2]],
      args: [1.4, 1.02],
      shape: 'cylinder',
    },
    {
      id: 'airlock-platform-collider',
      position: [0, FLOOR_Y + 1.5, AIRLOCK_CENTER[2]],
      args: [0.14, 1.28],
      shape: 'cylinder',
    },
  ]

  const bunkColliders: CuboidColliderConfig[] = bunkStacks.map((bunk) => ({
    id: `${bunk.id}-collider`,
    position: [bunk.position[0], bunk.position[1] + 0.08, bunk.position[2]],
    args: [1.15, 0.16, 0.5],
    shape: 'cuboid',
  }))

  const lockerColliders: CuboidColliderConfig[] = lockers.map((locker) => ({
    id: `${locker.id}-collider`,
    position: locker.position,
    args: [0.5, 1.18, 0.34],
    shape: 'cuboid',
  }))

  const engineColumnColliders: CuboidColliderConfig[] = engineColumns.map((column) => ({
    id: `${column.id}-collider`,
    position: column.position,
    args: [1.5, 0.48],
    shape: 'cylinder',
  }))

  const structuralWallColliders: CuboidColliderConfig[] = [...hullWallSegments, ...partitionWallSegments].map((wall) => ({
    id: `${wall.id}-collider`,
    position: wall.position,
    args: toHalfExtents(wall.size),
    shape: 'cuboid',
  }))

  const upperDeckColliders: CuboidColliderConfig[] = upperDeckPanels.map((panel) => ({
    id: `${panel.id}-collider`,
    position: panel.position,
    args: toHalfExtents(panel.size),
    shape: 'cuboid',
  }))

  const upperGuardColliders: CuboidColliderConfig[] = upperGuardSegments.map((segment) => ({
    id: `${segment.id}-collider`,
    position: segment.position,
    args: toHalfExtents(segment.size),
    shape: 'cuboid',
  }))

  const stairColliders: CuboidColliderConfig[] = stairSteps.map((step) => ({
    id: `${step.id}-collider`,
    position: step.position,
    args: toHalfExtents(step.size),
    shape: 'cuboid',
  }))

  const cargoColliders: CuboidColliderConfig[] = cargoCrates.map((crate) => ({
    id: `${crate.id}-collider`,
    position: crate.position,
    args: toHalfExtents(crate.size),
    shape: 'cuboid',
  }))

  const messColliders: CuboidColliderConfig[] = messTables.map((table) => ({
    id: `${table.id}-collider`,
    position: table.position,
    args: toHalfExtents(table.size),
    shape: 'cuboid',
  }))

  const serverColliders: CuboidColliderConfig[] = serverBanks.map((bank) => ({
    id: `${bank.id}-collider`,
    position: bank.position,
    args: toHalfExtents(bank.size),
    shape: 'cuboid',
  }))

  const medPodColliders: CuboidColliderConfig[] = medPods.map((pod) => ({
    id: `${pod.id}-collider`,
    position: pod.position,
    args: toHalfExtents(pod.size),
    shape: 'cuboid',
  }))

  const chapelColliders: CuboidColliderConfig[] = chapelMonoliths.map((monolith) => ({
    id: `${monolith.id}-collider`,
    position: monolith.position,
    args: toHalfExtents(monolith.size),
    shape: 'cuboid',
  }))

  const brigColliders: CuboidColliderConfig[] = brigBlocks.map((block) => ({
    id: `${block.id}-collider`,
    position: block.position,
    args: toHalfExtents(block.size),
    shape: 'cuboid',
  }))

  const supportColumnColliders: CuboidColliderConfig[] = supportColumns.map((column) => ({
    id: `${column.id}-collider`,
    position: column.position,
    args: toHalfExtents(column.size),
    shape: 'cuboid',
  }))

  let time = 0
  let hoveredMarkerId: string | null = null
  let levelTransitionHandler: { transitionToLevel?: (levelId: string) => boolean } | null = null

  function pulse(base: number, amount: number, speed: number, offset = 0) {
    return base + Math.sin(time * speed + offset) * amount
  }

  function getMarkerSpriteSize(marker: InteractiveMarker) {
    return hoveredMarkerId === marker.id ? marker.size * 1.18 : marker.size
  }

  function getMarkerSpriteIntensity(marker: InteractiveMarker) {
    return hoveredMarkerId === marker.id ? marker.intensity * 1.24 : marker.intensity
  }

  function getMarkerLightIntensity(marker: InteractiveMarker) {
    const base = marker.interactionType === 'portal' ? 7.5 : 3.2
    return hoveredMarkerId === marker.id ? base * 1.3 : base
  }

  function getMarkerLightDistance(marker: InteractiveMarker) {
    return marker.interactionType === 'portal' ? 8.5 : 4.6
  }

  function handleInteractiveHover(markerId: string, hovered: boolean) {
    hoveredMarkerId = hovered ? markerId : hoveredMarkerId === markerId ? null : hoveredMarkerId
  }

  function requestReturnToObservatory() {
    dispatch('requestLevelReturn', {
      levelType: 'observatory',
      title: 'Return to Observatory?',
      message: 'Leave the Miranda wreck and travel back to the observatory?',
      confirmLabel: 'Return',
      cancelLabel: 'Stay Here',
    })
  }

  function handleNoteOpen(noteId: string) {
    const note = shipNoteById.get(noteId)
    if (!note) return

    dispatch('noteRead', note)
  }

  function handleInteractiveClick(marker: InteractiveMarker) {
    if (marker.interactionType === 'portal') {
      requestReturnToObservatory()
      return
    }

    if (marker.noteId) {
      handleNoteOpen(marker.noteId)
    }
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
        onHover: (_data: InteractiveMarker, hovered: boolean) => handleInteractiveHover(marker.id, hovered),
      },
    })
  }

  useTask((delta) => {
    time += delta
  })

  onMount(() => {
    if (spawnSystem?.requestSpawn) {
      spawnSystem.requestSpawn({
        entityType: 'player',
        position: effectivePlayerSpawnPoint,
        priority: 10,
        metadata: { levelName: 'miranda', spawnReason: 'level_load' },
      })
    }

    dispatch('terrainReady')
  })

  onDestroy(() => {
    proceduralBundles.forEach((bundle) => disposeProceduralTextureBundle(bundle))
    cockpitScreenTexture.dispose()
    engineScreenTexture.dispose()

    if (!interactionSystem?.unregisterInteractiveObject) return

    interactiveMarkers.forEach((marker) => {
      interactionSystem.unregisterInteractiveObject(marker.id)
    })
  })
</script>

<LevelManager>
  <T.Group name="miranda-ship-level">
    <Skybox
      path={activeSkyboxPreset.path}
      files={activeSkyboxPreset.files}
    />

    <T.FogExp2 color={$editorStateStore.enabled && $editorStateStore.viewportLightingMode === 'workbench' ? '#d7e4f0' : mirandaFogColor} density={$editorStateStore.enabled && $editorStateStore.viewportLightingMode === 'workbench' ? 0.00035 : mirandaFogDensity} />

    <T.AmbientLight intensity={mirandaAmbientIntensity} color="#7d8ba7" />
    <T.HemisphereLight skyColor="#8fb5ff" groundColor="#09070a" intensity={mirandaFillLightIntensity} />
    <T.DirectionalLight
      position={[4, 8, -12]}
      intensity={mirandaKeyLightIntensity}
      color="#bfd8ff"
      castShadow
      shadow-mapSize-width={2048}
      shadow-mapSize-height={2048}
    />
    <T.PointLight position={[0, FLOOR_Y + 4.0, -24]} color="#e76949" intensity={12} distance={36} />
    <T.PointLight position={[0, FLOOR_Y + 2.8, 17.5]} color="#ff9b5c" intensity={pulse(11, 1.8, 2.5)} distance={18} />
    <T.PointLight position={[6.3, FLOOR_Y + 2.8, -4.1]} color="#e9c9a8" intensity={2.7} distance={9} />
    <T.PointLight position={[-6.2, FLOOR_Y + 2.2, -1.8]} color="#73a7ff" intensity={2.15} distance={8} />

    {#each corridorLights as light (light.id)}
      <T.PointLight
        position={light.position}
        color={light.emissive}
        intensity={pulse(1.25, 0.3, 1.3, light.position[2])}
        distance={6.2}
      />
    {/each}

    {#each nebulaPlanes as plane (plane.id)}
      <T.Mesh position={plane.position} renderOrder={-2}>
        <T.PlaneGeometry args={plane.scale} />
        <T.MeshBasicMaterial color={plane.color} transparent opacity={0.18} depthWrite={false} />
      </T.Mesh>
    {/each}

    <T.Mesh position={[0, FLOOR_Y - FLOOR_THICKNESS / 2, 0]} receiveShadow>
      <T.BoxGeometry args={[HULL_WIDTH, FLOOR_THICKNESS, HULL_DEPTH]} />
      <T.MeshStandardMaterial
        color="#111821"
        map={floorTextures.map}
        roughnessMap={floorTextures.roughnessMap}
        bumpMap={floorTextures.bumpMap}
        bumpScale={0.1}
        roughness={0.48}
        metalness={0.7}
        emissive="#160d10"
        emissiveIntensity={0.16}
      />
    </T.Mesh>
    <RigidBody type="fixed">
      <Collider
        shape="cuboid"
        args={[HULL_WIDTH / 2, FLOOR_THICKNESS / 2, HULL_DEPTH / 2]}
        position={[0, FLOOR_Y - FLOOR_THICKNESS / 2, 0]}
        friction={0.9}
      />
    </RigidBody>
    {#if collisionDebugEnabled}
      <EditorColliderHelper shape="cuboid" args={[HULL_WIDTH / 2, FLOOR_THICKNESS / 2, HULL_DEPTH / 2]} position={[0, FLOOR_Y - FLOOR_THICKNESS / 2, 0]} />
    {/if}

    <T.Mesh position={[0, CEILING_Y + FLOOR_THICKNESS / 2, 0]}>
      <T.BoxGeometry args={[HULL_WIDTH, FLOOR_THICKNESS, HULL_DEPTH]} />
      <T.MeshStandardMaterial
        color="#202838"
        map={hullTextures.map}
        roughnessMap={hullTextures.roughnessMap}
        bumpMap={hullTextures.bumpMap}
        bumpScale={0.05}
        roughness={0.6}
        metalness={0.42}
        emissive="#0d1220"
        emissiveIntensity={0.16}
      />
    </T.Mesh>

    <RigidBody type="fixed">
      {#each structuralWallColliders as collider (collider.id)}
        <Collider shape={collider.shape} args={collider.args} position={collider.position} />
      {/each}
      {#each propColliders as collider (collider.id)}
        <Collider shape={collider.shape} args={collider.args} position={collider.position} />
      {/each}
      {#each bunkColliders as collider (collider.id)}
        <Collider shape={collider.shape} args={collider.args} position={collider.position} />
      {/each}
      {#each lockerColliders as collider (collider.id)}
        <Collider shape={collider.shape} args={collider.args} position={collider.position} />
      {/each}
      {#each engineColumnColliders as collider (collider.id)}
        <Collider shape={collider.shape} args={collider.args} position={collider.position} />
      {/each}
      {#each upperDeckColliders as collider (collider.id)}
        <Collider shape={collider.shape} args={collider.args} position={collider.position} />
      {/each}
      {#each upperGuardColliders as collider (collider.id)}
        <Collider shape={collider.shape} args={collider.args} position={collider.position} />
      {/each}
      {#each stairColliders as collider (collider.id)}
        <Collider shape={collider.shape} args={collider.args} position={collider.position} />
      {/each}
      {#each cargoColliders as collider (collider.id)}
        <Collider shape={collider.shape} args={collider.args} position={collider.position} />
      {/each}
      {#each messColliders as collider (collider.id)}
        <Collider shape={collider.shape} args={collider.args} position={collider.position} />
      {/each}
      {#each serverColliders as collider (collider.id)}
        <Collider shape={collider.shape} args={collider.args} position={collider.position} />
      {/each}
      {#each medPodColliders as collider (collider.id)}
        <Collider shape={collider.shape} args={collider.args} position={collider.position} />
      {/each}
      {#each chapelColliders as collider (collider.id)}
        <Collider shape={collider.shape} args={collider.args} position={collider.position} />
      {/each}
      {#each brigColliders as collider (collider.id)}
        <Collider shape={collider.shape} args={collider.args} position={collider.position} />
      {/each}
      {#each supportColumnColliders as collider (collider.id)}
        <Collider shape={collider.shape} args={collider.args} position={collider.position} />
      {/each}
    </RigidBody>
    {#if collisionDebugEnabled}
      {#each structuralWallColliders as collider (collider.id)}
        <EditorColliderHelper shape={collider.shape} args={collider.args} position={collider.position} />
      {/each}
      {#each propColliders as collider (collider.id)}
        <EditorColliderHelper shape={collider.shape} args={collider.args} position={collider.position} />
      {/each}
      {#each bunkColliders as collider (collider.id)}
        <EditorColliderHelper shape={collider.shape} args={collider.args} position={collider.position} />
      {/each}
      {#each lockerColliders as collider (collider.id)}
        <EditorColliderHelper shape={collider.shape} args={collider.args} position={collider.position} />
      {/each}
      {#each engineColumnColliders as collider (collider.id)}
        <EditorColliderHelper shape={collider.shape} args={collider.args} position={collider.position} />
      {/each}
      {#each upperDeckColliders as collider (collider.id)}
        <EditorColliderHelper shape={collider.shape} args={collider.args} position={collider.position} />
      {/each}
      {#each upperGuardColliders as collider (collider.id)}
        <EditorColliderHelper shape={collider.shape} args={collider.args} position={collider.position} />
      {/each}
      {#each stairColliders as collider (collider.id)}
        <EditorColliderHelper shape={collider.shape} args={collider.args} position={collider.position} />
      {/each}
      {#each cargoColliders as collider (collider.id)}
        <EditorColliderHelper shape={collider.shape} args={collider.args} position={collider.position} />
      {/each}
      {#each messColliders as collider (collider.id)}
        <EditorColliderHelper shape={collider.shape} args={collider.args} position={collider.position} />
      {/each}
      {#each serverColliders as collider (collider.id)}
        <EditorColliderHelper shape={collider.shape} args={collider.args} position={collider.position} />
      {/each}
      {#each medPodColliders as collider (collider.id)}
        <EditorColliderHelper shape={collider.shape} args={collider.args} position={collider.position} />
      {/each}
      {#each chapelColliders as collider (collider.id)}
        <EditorColliderHelper shape={collider.shape} args={collider.args} position={collider.position} />
      {/each}
      {#each brigColliders as collider (collider.id)}
        <EditorColliderHelper shape={collider.shape} args={collider.args} position={collider.position} />
      {/each}
      {#each supportColumnColliders as collider (collider.id)}
        <EditorColliderHelper shape={collider.shape} args={collider.args} position={collider.position} />
      {/each}
    {/if}
    {#each hullWallSegments as wall (wall.id)}
      <T.Mesh position={wall.position} receiveShadow castShadow>
        <T.BoxGeometry args={wall.size} />
        <T.MeshStandardMaterial
          color={wall.surface === 'hull-side' ? '#232b37' : '#1d2430'}
          map={hullTextures.map}
          roughnessMap={hullTextures.roughnessMap}
          bumpMap={hullTextures.bumpMap}
          bumpScale={0.07}
          roughness={0.56}
          metalness={0.52}
        />
      </T.Mesh>
    {/each}

    {#each partitionWallSegments as wall (wall.id)}
      <T.Mesh position={wall.position} receiveShadow>
        <T.BoxGeometry args={wall.size} />
        <T.MeshStandardMaterial
          color={wall.surface === 'bulkhead' ? '#1a202b' : '#1d2430'}
          map={deckPlateTextures.map}
          roughnessMap={deckPlateTextures.roughnessMap}
          bumpMap={deckPlateTextures.bumpMap}
          bumpScale={0.08}
          metalness={wall.surface === 'bulkhead' ? 0.65 : 0.62}
          roughness={wall.surface === 'bulkhead' ? 0.48 : 0.52}
        />
      </T.Mesh>
    {/each}

    {#each upperDeckPanels as panel (panel.id)}
      <T.Mesh position={panel.position} receiveShadow castShadow>
        <T.BoxGeometry args={panel.size} />
        <T.MeshStandardMaterial
          color="#202633"
          map={deckPlateTextures.map}
          roughnessMap={deckPlateTextures.roughnessMap}
          bumpMap={deckPlateTextures.bumpMap}
          bumpScale={0.08}
          metalness={0.68}
          roughness={0.42}
          emissive="#111823"
          emissiveIntensity={0.14}
        />
      </T.Mesh>
    {/each}

    {#each upperGuardSegments as guard (guard.id)}
      <T.Mesh position={guard.position} receiveShadow castShadow>
        <T.BoxGeometry args={guard.size} />
        <T.MeshStandardMaterial
          color="#2a3340"
          map={hullTextures.map}
          roughnessMap={hullTextures.roughnessMap}
          bumpMap={hullTextures.bumpMap}
          bumpScale={0.05}
          metalness={0.64}
          roughness={0.44}
          emissive="#18212e"
          emissiveIntensity={0.12}
        />
      </T.Mesh>
    {/each}

    {#each stairSteps as step (step.id)}
      <T.Mesh position={step.position} receiveShadow castShadow>
        <T.BoxGeometry args={step.size} />
        <T.MeshStandardMaterial
          color="#252d39"
          map={deckPlateTextures.map}
          roughnessMap={deckPlateTextures.roughnessMap}
          bumpMap={deckPlateTextures.bumpMap}
          bumpScale={0.07}
          metalness={0.66}
          roughness={0.38}
        />
      </T.Mesh>
    {/each}

    {#each supportColumns as column (column.id)}
      <T.Mesh position={column.position} receiveShadow castShadow>
        <T.BoxGeometry args={column.size} />
        <T.MeshStandardMaterial
          color="#313949"
          map={hullTextures.map}
          roughnessMap={hullTextures.roughnessMap}
          bumpMap={hullTextures.bumpMap}
          bumpScale={0.06}
          metalness={0.72}
          roughness={0.36}
        />
      </T.Mesh>
    {/each}

    {#each roomLightClusters as light (light.id)}
      <T.PointLight position={light.position} color={light.color} intensity={light.intensity} distance={light.distance} />
    {/each}

    <T.Group position={[0, SECOND_DECK_Y + 1.6, -33.5]}>
      <T.Mesh rotation={[0.4, time * 0.18, 0]}>
        <T.OctahedronGeometry args={[3.4, 0]} />
        <T.MeshStandardMaterial color="#7fd6ff" emissive="#7fd6ff" emissiveIntensity={0.42} metalness={0.96} roughness={0.06} transparent opacity={0.2} />
      </T.Mesh>
      <T.Mesh rotation={[Math.PI / 2 + 0.12, time * 0.3, 0]}>
        <T.TorusGeometry args={[5.6, 0.08, 16, 72]} />
        <T.MeshStandardMaterial color="#a59dff" emissive="#a59dff" emissiveIntensity={0.95} metalness={1} roughness={0.04} />
      </T.Mesh>
      <T.Mesh rotation={[Math.PI / 2 - 0.2, -time * 0.22, 0.18]}>
        <T.TorusGeometry args={[3.8, 0.05, 12, 56]} />
        <T.MeshStandardMaterial color="#ff8f7a" emissive="#ff8f7a" emissiveIntensity={0.7} metalness={1} roughness={0.05} />
      </T.Mesh>
      <T.PointLight position={[0, 0.8, 0]} color="#8ad9ff" intensity={8} distance={18} />
    </T.Group>

    {#each cargoCrates as crate (crate.id)}
      <T.Mesh position={crate.position} receiveShadow castShadow>
        <T.BoxGeometry args={crate.size} />
        <T.MeshStandardMaterial
          color="#3d2f31"
          map={engineTextures.map}
          roughnessMap={engineTextures.roughnessMap}
          bumpMap={engineTextures.bumpMap}
          bumpScale={0.08}
          metalness={0.58}
          roughness={0.46}
          emissive="#201114"
          emissiveIntensity={0.08}
        />
      </T.Mesh>
    {/each}

    {#each medPods as pod, index (pod.id)}
      <T.Group position={pod.position}>
        <T.Mesh castShadow receiveShadow>
          <T.BoxGeometry args={pod.size} />
          <T.MeshStandardMaterial color="#243340" map={hullTextures.map} roughnessMap={hullTextures.roughnessMap} bumpMap={hullTextures.bumpMap} bumpScale={0.05} metalness={0.74} roughness={0.32} />
        </T.Mesh>
        <T.Mesh position={[0, 0.18, 0]}>
          <T.BoxGeometry args={[pod.size[0] - 0.2, pod.size[1] - 0.4, pod.size[2] - 0.32]} />
          <T.MeshStandardMaterial color="#87dfff" emissive="#87dfff" emissiveIntensity={pulse(0.32, 0.1, 1.4, index)} transparent opacity={0.16} metalness={0.04} roughness={0.08} />
        </T.Mesh>
      </T.Group>
    {/each}

    {#each messTables as table, index (table.id)}
      <T.Group position={table.position}>
        <T.Mesh castShadow receiveShadow>
          <T.BoxGeometry args={table.size} />
          <T.MeshStandardMaterial color={index === 2 ? '#2e3844' : '#5b3b2a'} map={index === 2 ? hullTextures.map : deskTextures.map} roughnessMap={index === 2 ? hullTextures.roughnessMap : deskTextures.roughnessMap} bumpMap={index === 2 ? hullTextures.bumpMap : deskTextures.bumpMap} bumpScale={0.05} metalness={index === 2 ? 0.66 : 0.16} roughness={index === 2 ? 0.42 : 0.74} />
        </T.Mesh>
      </T.Group>
    {/each}

    {#each serverBanks as bank, index (bank.id)}
      <T.Group position={bank.position}>
        <T.Mesh castShadow receiveShadow>
          <T.BoxGeometry args={bank.size} />
          <T.MeshStandardMaterial color="#27303e" map={hullTextures.map} roughnessMap={hullTextures.roughnessMap} bumpMap={hullTextures.bumpMap} bumpScale={0.05} metalness={0.78} roughness={0.3} />
        </T.Mesh>
        <T.Mesh position={[0, 0, bank.size[2] / 2 + 0.02]}>
          <T.BoxGeometry args={[bank.size[0] - 0.18, bank.size[1] - 0.18, 0.05]} />
          <T.MeshStandardMaterial color="#7dc8ff" emissive="#7dc8ff" emissiveIntensity={pulse(0.46, 0.14, 1.7, index)} map={cockpitScreenTexture} metalness={0.02} roughness={0.08} />
        </T.Mesh>
      </T.Group>
    {/each}

    {#each chapelMonoliths as slab, index (slab.id)}
      <T.Group position={slab.position}>
        <T.Mesh castShadow receiveShadow>
          <T.BoxGeometry args={slab.size} />
          <T.MeshStandardMaterial color={index === 2 ? '#45252d' : '#282232'} map={index === 2 ? engineTextures.map : hullTextures.map} roughnessMap={index === 2 ? engineTextures.roughnessMap : hullTextures.roughnessMap} bumpMap={index === 2 ? engineTextures.bumpMap : hullTextures.bumpMap} bumpScale={0.06} metalness={0.54} roughness={0.44} />
        </T.Mesh>
        {#if index < 2}
          <T.Mesh position={[0, slab.size[1] / 2 - 0.5, slab.size[2] / 2 + 0.06]}>
            <T.BoxGeometry args={[slab.size[0] * 0.35, slab.size[1] - 1.0, 0.08]} />
            <T.MeshStandardMaterial color="#b78fff" emissive="#b78fff" emissiveIntensity={0.8} metalness={0.9} roughness={0.05} />
          </T.Mesh>
        {/if}
      </T.Group>
    {/each}

    {#each brigBlocks as block, index (block.id)}
      <T.Mesh position={block.position} receiveShadow castShadow>
        <T.BoxGeometry args={block.size} />
        <T.MeshStandardMaterial color={index === brigBlocks.length - 1 ? '#3e2c25' : '#242b38'} map={index === brigBlocks.length - 1 ? deskTextures.map : hullTextures.map} roughnessMap={index === brigBlocks.length - 1 ? deskTextures.roughnessMap : hullTextures.roughnessMap} bumpMap={index === brigBlocks.length - 1 ? deskTextures.bumpMap : hullTextures.bumpMap} bumpScale={0.05} metalness={index === brigBlocks.length - 1 ? 0.14 : 0.78} roughness={index === brigBlocks.length - 1 ? 0.74 : 0.34} />
      </T.Mesh>
    {/each}

    <T.Mesh position={[0, FLOOR_Y + 0.02, -17.1]} receiveShadow rotation={[-0.1, 0, 0]}>
      <T.BoxGeometry args={[10.5, 0.05, 8.4]} />
      <T.MeshStandardMaterial color="#0d131d" metalness={0.18} roughness={0.72} />
    </T.Mesh>

    {#each cockpitGlowPanels as panel (panel.id)}
      <T.Mesh position={panel.position} rotation={panel.rotation}>
        <T.PlaneGeometry args={[3.2, 2.1]} />
        <T.MeshStandardMaterial
          color="#4d6f8f"
          emissive="#95d6ff"
          emissiveIntensity={0.26}
          map={cockpitScreenTexture}
          transparent
          opacity={0.2}
          metalness={0}
          roughness={0.26}
        />
      </T.Mesh>
    {/each}

    <T.Mesh position={COCKPIT_CENTER} receiveShadow castShadow>
      <T.BoxGeometry args={[3.2, 1.4, 2.2]} />
      <T.MeshStandardMaterial
        color="#273546"
        map={deckPlateTextures.map}
        roughnessMap={deckPlateTextures.roughnessMap}
        bumpMap={deckPlateTextures.bumpMap}
        bumpScale={0.09}
        emissive="#1e3142"
        emissiveIntensity={0.2}
        metalness={0.74}
        roughness={0.34}
      />
    </T.Mesh>

    {#each [-1.1, 0, 1.1] as x, index}
      <T.Mesh position={[x, FLOOR_Y + 1.78, -17.38]}>
        <T.BoxGeometry args={[0.9, 0.56, 0.04]} />
        <T.MeshStandardMaterial color="#8fd6ff" emissive="#8fd6ff" emissiveIntensity={pulse(0.92, 0.22, 1.9, index)} map={cockpitScreenTexture} metalness={0.08} roughness={0.1} />
      </T.Mesh>
    {/each}

    {#each [-4.8, -1.6, 1.6, 4.8] as x, index}
      <T.Mesh position={[x, FLOOR_Y + 0.04, -7.5 + index * 5.3]} receiveShadow>
        <T.BoxGeometry args={[0.22, 0.03, 1.4]} />
        <T.MeshStandardMaterial color="#711f28" emissive="#ff5f6b" emissiveIntensity={pulse(0.4, 0.16, 2.1, index)} metalness={0.52} roughness={0.22} />
      </T.Mesh>
    {/each}

    {#each floorGuideLights as strip (strip.id)}
      <T.Mesh position={strip.position} receiveShadow>
        <T.BoxGeometry args={[0.2, 0.01, strip.length]} />
        <T.MeshStandardMaterial color="#882f36" emissive="#ff6a73" emissiveIntensity={pulse(0.55, 0.2, 1.8, strip.length)} metalness={0.35} roughness={0.18} />
      </T.Mesh>
    {/each}

    {#each ceilingPipes as pipe (pipe.id)}
      <T.Mesh position={pipe.position} rotation={[Math.PI / 2, 0, 0]}>
        <T.CylinderGeometry args={[0.11, 0.11, 18, 12]} />
        <T.MeshStandardMaterial color="#424d5e" metalness={0.8} roughness={0.32} />
      </T.Mesh>
    {/each}

    <T.Mesh position={CREW_QUARTERS_CENTER} receiveShadow>
      <T.BoxGeometry args={[5.3, 0.08, 8.4]} />
      <T.MeshStandardMaterial color="#12151d" metalness={0.2} roughness={0.86} />
    </T.Mesh>

    {#each bunkStacks as bunk (bunk.id)}
      <T.Group position={bunk.position}>
        <T.Mesh castShadow receiveShadow position={[0, 0, 0]}>
          <T.BoxGeometry args={[2.4, 0.24, 1.02]} />
          <T.MeshStandardMaterial color="#5a6676" metalness={0.62} roughness={0.42} />
        </T.Mesh>
        <T.Mesh position={[0, 0.24, 0]} castShadow receiveShadow>
          <T.BoxGeometry args={[2.25, 0.1, 0.94]} />
          <T.MeshStandardMaterial color="#2f3948" metalness={0.12} roughness={0.92} emissive="#18212a" emissiveIntensity={0.08} />
        </T.Mesh>
        <T.Mesh position={[0.92, 0.38, -0.08]} rotation={[0, 0.06, 0]}>
          <T.BoxGeometry args={[0.58, 0.08, 0.46]} />
          <T.MeshStandardMaterial color="#938376" roughness={0.98} metalness={0.04} />
        </T.Mesh>
      </T.Group>
    {/each}

    {#each lockers as locker (locker.id)}
      <T.Mesh position={locker.position} castShadow receiveShadow>
        <T.BoxGeometry args={[1.05, 2.4, 0.72]} />
        <T.MeshStandardMaterial color="#303744" map={hullTextures.map} roughnessMap={hullTextures.roughnessMap} bumpMap={hullTextures.bumpMap} bumpScale={0.05} metalness={0.66} roughness={0.5} />
      </T.Mesh>
    {/each}

    <T.Mesh position={CAPTAIN_OFFICE_CENTER} receiveShadow>
      <T.BoxGeometry args={[4.8, 0.08, 6.8]} />
      <T.MeshStandardMaterial color="#181219" metalness={0.14} roughness={0.94} />
    </T.Mesh>

    <T.Mesh position={[6.55, FLOOR_Y + 0.9, -4.6]} castShadow receiveShadow>
      <T.BoxGeometry args={[2.2, 0.18, 1.2]} />
      <T.MeshStandardMaterial
        color="#5b3b2a"
        map={deskTextures.map}
        roughnessMap={deskTextures.roughnessMap}
        bumpMap={deskTextures.bumpMap}
        bumpScale={0.05}
        metalness={0.18}
        roughness={0.72}
      />
    </T.Mesh>
    <T.Mesh position={[6.55, FLOOR_Y + 1.34, -5.0]} castShadow receiveShadow>
      <T.BoxGeometry args={[0.1, 0.74, 0.9]} />
      <T.MeshStandardMaterial color="#2a3342" metalness={0.56} roughness={0.42} />
    </T.Mesh>
    <T.Mesh position={[7.35, FLOOR_Y + 1.02, -6.55]} castShadow receiveShadow>
      <T.BoxGeometry args={[1.1, 1.35, 1.0]} />
      <T.MeshStandardMaterial color="#2e343f" map={hullTextures.map} roughnessMap={hullTextures.roughnessMap} bumpMap={hullTextures.bumpMap} bumpScale={0.06} metalness={0.74} roughness={0.34} emissive="#140d11" emissiveIntensity={0.08} />
    </T.Mesh>
    <T.Mesh position={[7.35, FLOOR_Y + 1.25, -6.01]}>
      <T.BoxGeometry args={[0.82, 0.22, 0.08]} />
      <T.MeshStandardMaterial color="#74303d" emissive="#ff6e89" emissiveIntensity={pulse(0.42, 0.14, 2.8, 0.4)} metalness={0.46} roughness={0.22} />
    </T.Mesh>

    <T.Mesh position={[5.12, FLOOR_Y + 1.35, -4.85]} rotation={[0, Math.PI / 2, 0]}>
      <T.CylinderGeometry args={[0.34, 0.42, 1.15, 18]} />
      <T.MeshStandardMaterial color="#3d221c" metalness={0.22} roughness={0.78} />
    </T.Mesh>

    <T.Group position={ENGINE_ROOM_CENTER}>
      <T.Mesh position={[0, 0.18, 0]} receiveShadow>
        <T.CylinderGeometry args={[2.2, 2.8, 0.32, 24]} />
        <T.MeshStandardMaterial color="#261a1a" map={engineTextures.map} roughnessMap={engineTextures.roughnessMap} bumpMap={engineTextures.bumpMap} bumpScale={0.07} metalness={0.52} roughness={0.48} />
      </T.Mesh>
      <T.Mesh position={[0, 1.75, 0]} castShadow receiveShadow>
        <T.CylinderGeometry args={[0.95, 1.15, 2.8, 24]} />
        <T.MeshStandardMaterial color="#5d2b20" emissive="#ff8d54" emissiveIntensity={pulse(0.92, 0.22, 2.7)} metalness={0.74} roughness={0.24} />
      </T.Mesh>
      <T.Mesh position={[0, 1.75, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <T.TorusGeometry args={[1.65, 0.14, 18, 48]} />
        <T.MeshStandardMaterial color="#ff8b54" emissive="#ff8b54" emissiveIntensity={pulse(1.25, 0.25, 2.8, 0.6)} metalness={0.36} roughness={0.12} />
      </T.Mesh>
      <T.PointLight position={[0, 2.1, 0]} color="#ff9b5f" intensity={pulse(15, 2, 3)} distance={12} />
    </T.Group>

    {#each engineColumns as column (column.id)}
      <T.Group position={column.position}>
        <T.Mesh castShadow receiveShadow>
          <T.CylinderGeometry args={[0.42, 0.54, 3.0, 16]} />
          <T.MeshStandardMaterial color="#34353c" map={engineTextures.map} roughnessMap={engineTextures.roughnessMap} bumpMap={engineTextures.bumpMap} bumpScale={0.08} metalness={0.62} roughness={0.4} />
        </T.Mesh>
        <T.Mesh position={[0, 1.35, 0]}>
          <T.BoxGeometry args={[0.6, 0.52, 0.6]} />
          <T.MeshStandardMaterial color="#ff8f5e" emissive="#ff8f5e" emissiveIntensity={pulse(0.82, 0.2, 2.4, column.position[0])} metalness={0.18} roughness={0.14} map={engineScreenTexture} />
        </T.Mesh>
      </T.Group>
    {/each}

    {#each [-3.4, 0, 3.4] as x, index}
      <T.Mesh position={[x, FLOOR_Y + 1.7, 12.8]}>
        <T.BoxGeometry args={[1.4, 1.1, 0.2]} />
        <T.MeshStandardMaterial color="#ffab77" emissive="#ffab77" emissiveIntensity={pulse(0.76, 0.22, 1.9, index)} map={engineScreenTexture} metalness={0.05} roughness={0.1} />
      </T.Mesh>
    {/each}

    <T.Group position={[0, FLOOR_Y + 1.5, AIRLOCK_CENTER[2]]}>
      <T.Mesh castShadow receiveShadow>
        <T.CylinderGeometry args={[1.35, 1.35, 0.28, 32]} />
        <T.MeshStandardMaterial color="#223142" metalness={0.82} roughness={0.24} emissive="#13324c" emissiveIntensity={0.24} />
      </T.Mesh>
      <T.Mesh position={[0, 0, 0.16]}>
        <T.TorusGeometry args={[1.55, 0.08, 16, 48]} />
        <T.MeshStandardMaterial color="#91ddff" emissive="#91ddff" emissiveIntensity={pulse(1.2, 0.24, 2.2, 0.5)} metalness={0.3} roughness={0.12} />
      </T.Mesh>
    </T.Group>

    {#each shipNotes as note (note.id)}
      <T.Group position={note.position}>
        <T.Mesh rotation={[-1.35, 0, 0.12]} castShadow receiveShadow>
          <T.BoxGeometry args={[0.6, 0.03, 0.42]} />
          <T.MeshStandardMaterial color="#d8c8b0" roughness={0.94} metalness={0.02} emissive="#251710" emissiveIntensity={0.08} />
        </T.Mesh>
      </T.Group>
    {/each}

    {#each interactiveMarkers as marker, index (marker.id)}
      <T.Group position={marker.position}>
        <StarSprite
          position={[0, 0, 0]}
          color={marker.color}
          size={getMarkerSpriteSize(marker)}
          intensity={getMarkerSpriteIntensity(marker)}
          isClickable
          isHovered={hoveredMarkerId === marker.id}
          twinkleSpeed={marker.interactionType === 'portal' ? 1.4 : 0.9}
          animationOffset={marker.animationOffset}
          onSpriteReady={(sprite) => registerInteractiveMarker(marker, sprite, index)}
        />
        <T.PointLight
          position={[0, 0, 0]}
          color={marker.color}
          intensity={getMarkerLightIntensity(marker)}
          distance={getMarkerLightDistance(marker)}
        />
      </T.Group>
    {/each}

    <LevelTransitionHandler bind:this={levelTransitionHandler} transitionDelay={350} />
  </T.Group>
</LevelManager>
