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
  import { createEventDispatcher, onMount } from 'svelte'
  import { T, useTask } from '@threlte/core'
  import { RigidBody, Collider } from '@threlte/rapier'
  import * as THREE from 'three'
  import LevelManager from '../core/LevelManager.svelte'
  import { gameActions } from '../stores/gameStateStore'

  const dispatch = createEventDispatcher()

  export let spawnSystem: any = null
  export let interactionSystem: any = null
  export let playerSpawnPoint: [number, number, number] = [0, 1, 0]

  const SCALE = 4
  const W = 5.39 * SCALE
  const H = 2.06 * SCALE
  const D = 4.63 * SCALE

  const FLOOR_Y = -0.08 * SCALE
  const T_WALL = 0.12 * SCALE

  const scaledSpawnPoint: [number, number, number] = [
    playerSpawnPoint[0],
    FLOOR_Y + (playerSpawnPoint[1] - (-0.08)) * SCALE,
    playerSpawnPoint[2]
  ]

  // --- Colors ---
  const COL_FLOOR = '#1a2630'
  const COL_WALL = '#2a3d4a'
  const COL_TRIM = '#00d4ff'
  const COL_ACCENT = '#ff00ff'

  // --- Animation ---
  let time = 0
  let screenPulse = 0
  let displayPhase = 0

  $: screenColor = displayPhase < 0.33 ? '#0066cc' : displayPhase < 0.66 ? '#00ccff' : '#6600ff'
  $: screenGlow = screenPulse % 2 < 1 ? 1.2 : 0.8

  useTask((delta) => {
    time += delta
    screenPulse = (time * 2) % 2
    displayPhase = (time * 0.5) % 1
  })

  // --- Story Elements ---
  const storyPoints = [
    { name: 'pillar-whisper', pos: [3.0, FLOOR_Y + 1.5, -2.0] as [number, number, number], text: 'The pillar hums with ancient knowledge.' },
    { name: 'fountain-inscription', pos: [8.0, FLOOR_Y + 0.8, 6.0] as [number, number, number], text: 'The fountain flows with water that reflects impossible colors.' },
    { name: 'strange-plant', pos: [7.0, FLOOR_Y + 0.5, 5.0] as [number, number, number], text: 'The plant grows in spirals, as if reaching toward several suns at once.' },
    { name: 'junk-memory', pos: [15.0, FLOOR_Y + 1.2, 12.0] as [number, number, number], text: 'Fragments of a forgotten civilization scatter across the plane.' },
    { name: 'bench-note', pos: [6.5, FLOOR_Y + 0.4, 7.0] as [number, number, number], text: 'Someone carved words into the bench, but they shift and change when you look away.' }
  ]

  function handleStoryClick(pointName: string) {
    const point = storyPoints.find(p => p.name === pointName)
    if (point) {
      console.log(`📖 Story: ${point.text}`)
      // Dispatch story event - can be consumed by parent component
      dispatch('storyRead', { name: pointName, text: point.text })
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

  function handlePortalContact() {
    console.log('🌀 Portal → Observatory')
    playPortalSound()
    gameActions.transitionToLevel('observatory')
  }

  onMount(() => {
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
</script>

<LevelManager>
  <T.Group name="sci-fi-room-level">

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
    <T.Group position={[0, FLOOR_Y, D + 3.0]}>
      <RigidBody type="fixed">
        <Collider shape="cuboid" args={[W * 1.2, T_WALL/2, W * 1.2]} friction={0.7} />
      </RigidBody>
    </T.Group>

    <!-- WASTELAND floor (vast plane with varied height) -->
    {#each Array.from({ length: 6 }) as _, i}
      {#each Array.from({ length: 6 }) as _, j}
        {@const x = (i - 2.5) * (W * 2.5)}
        {@const z = (j - 2.5) * (W * 2.5) + (D * 3.5)}
        {@const height = FLOOR_Y + Math.sin(i * 0.5) * 0.5 + Math.cos(j * 0.5) * 0.5}
        <T.Group position={[x, height, z]}>
          <RigidBody type="fixed">
            <Collider shape="cuboid" args={[W, T_WALL/2, W]} friction={0.5} />
          </RigidBody>
        </T.Group>
      {/each}
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

    <!-- Floating dodecahedron (center-back) -->
    <T.Mesh position={[0, FLOOR_Y + 1.9 + Math.sin(time * 0.3) * 0.4, 3.0]} rotation={[time * 0.4, time * 0.6, time * 0.2]}>
      <T.DodecahedronGeometry args={[0.8, 0]} />
      <T.MeshStandardMaterial color={COL_TRIM} emissive={COL_TRIM} emissiveIntensity={1.4 + screenGlow * 0.3} metalness={0.95} />
    </T.Mesh>

    <!-- Pulsing icosahedron (right-back) -->
    <T.Mesh position={[2.2, FLOOR_Y + 1.3, 2.5]} rotation={[time * 0.3, time * 0.5, time * 0.4]} scale={[1.0 + Math.sin(time * 2) * 0.12, 1.0 + Math.sin(time * 2) * 0.12, 1.0 + Math.sin(time * 2) * 0.12]}>
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

    {@const courtyard_y = FLOOR_Y}
    {@const courtyard_z = D + 3.0}

    <!-- Courtyard floor -->
    <T.Mesh position={[0, courtyard_y - T_WALL/2, courtyard_z]}>
      <T.BoxGeometry args={[W * 1.2, T_WALL, W * 1.2]} />
      <T.MeshStandardMaterial color="#1a2d3a" roughness={0.5} metalness={0.4} />
    </T.Mesh>

    <!-- Courtyard arch pillars (entrance) -->
    {#each [-1.2, 1.2] as x}
      <T.Mesh position={[x, courtyard_y + H/2, courtyard_z - 3.0]} receiveShadow>
        <T.BoxGeometry args={[0.3, H - 0.5, 0.3]} />
        <T.MeshStandardMaterial color="#1a5f7a" metalness={0.5} roughness={0.3} />
      </T.Mesh>
    {/each}

    <!-- FOUNTAIN (Center of courtyard) -->
    <!-- Base -->
    <T.Mesh position={[0, courtyard_y + 0.3, courtyard_z]}>
      <T.CylinderGeometry args={[1.2, 1.4, 0.6, 32]} />
      <T.MeshStandardMaterial color="#2d5f7a" metalness={0.7} roughness={0.2} />
    </T.Mesh>

    <!-- Fountain bowl -->
    <T.Mesh position={[0, courtyard_y + 0.95, courtyard_z]}>
      <T.CylinderGeometry args={[0.9, 1.0, 0.4, 32]} />
      <T.MeshStandardMaterial color="#1a3d5a" transparent={true} opacity={0.8} metalness={0.8} roughness={0.1} />
    </T.Mesh>

    <!-- Water surface (animated) -->
    <T.Mesh position={[0, courtyard_y + 1.0 + Math.sin(time * 1.5) * 0.1, courtyard_z]} rotation={[0, 0, 0]}>
      <T.CylinderGeometry args={[0.85, 0.85, 0.05, 32]} />
      <T.MeshStandardMaterial color="#4488cc" emissive="#0066aa" emissiveIntensity={0.6} transparent={true} opacity={0.7} />
    </T.Mesh>

    <!-- Fountain center pillar -->
    <T.Mesh position={[0, courtyard_y + 1.2, courtyard_z]}>
      <T.CylinderGeometry args={[0.15, 0.15, 0.8, 16]} />
      <T.MeshStandardMaterial color={COL_ACCENT} emissive={COL_ACCENT} emissiveIntensity={1.2} metalness={0.95} />
    </T.Mesh>

    <!-- PLANTS in pots (around courtyard) -->
    {#each [[-3.0, 4.0], [3.0, 4.0], [-3.0, 2.0], [3.0, 2.0]] as [x, z]}
      <!-- Pot -->
      <T.Mesh position={[x, courtyard_y + 0.4, courtyard_z + z]}>
        <T.CylinderGeometry args={[0.4, 0.5, 0.8, 8]} />
        <T.MeshStandardMaterial color="#7a5a3a" metalness={0.5} roughness={0.6} />
      </T.Mesh>

      <!-- Strange plant (spiral geometry) -->
      {#each Array.from({ length: 5 }) as _, layer}
        {@const radius = 0.3 - layer * 0.05}
        {@const height = courtyard_y + 1.2 + layer * 0.4}
        {@const rotation = layer * 0.6}
        <T.Mesh position={[x, height, courtyard_z + z]} rotation={[0, rotation + time * 0.3, 0]}>
          <T.BoxGeometry args={[radius * 2, 0.3, radius * 2]} />
          <T.MeshStandardMaterial color="#00aa44" emissive="#00cc66" emissiveIntensity={0.7 + screenGlow * 0.2} />
        </T.Mesh>
      {/each}
    {/each}

    <!-- BENCH (wood) -->
    <!-- Bench seat -->
    <T.Mesh position={[0, courtyard_y + 0.5, courtyard_z - 2.0]}>
      <T.BoxGeometry args={[2.0, 0.15, 0.6]} />
      <T.MeshStandardMaterial color="#4d3d2d" metalness={0.3} roughness={0.7} />
    </T.Mesh>

    <!-- Bench back -->
    <T.Mesh position={[0, courtyard_y + 1.2, courtyard_z - 2.6]}>
      <T.BoxGeometry args={[2.0, 0.8, 0.15]} />
      <T.MeshStandardMaterial color="#4d3d2d" metalness={0.3} roughness={0.7} />
    </T.Mesh>

    <!-- Bench legs -->
    {#each [-0.8, 0.8] as x}
      {#each [-0.2, 0.2] as z}
        <T.Mesh position={[x, courtyard_y + 0.25, courtyard_z - 2.0 + z]}>
          <T.BoxGeometry args={[0.1, 0.5, 0.1]} />
          <T.MeshStandardMaterial color="#3d2d1d" metalness={0.2} roughness={0.8} />
        </T.Mesh>
      {/each}
    {/each}

    <!-- STARFIELD (same as Observatory) -->
    {#each Array.from({ length: 40 }) as _, i}
      {@const theta = Math.random() * Math.PI * 2}
      {@const phi = Math.random() * Math.PI}
      {@const radius = W * 3.0}
      {@const x = radius * Math.sin(phi) * Math.cos(theta)}
      {@const y = courtyard_y + H + radius * Math.cos(phi)}
      {@const z = courtyard_z + radius * Math.sin(phi) * Math.sin(theta)}
      {@const scale = Math.random() * 0.3 + 0.1}

      <T.Mesh position={[x, y, z]} scale={[scale, scale, scale]}>
        <T.SphereGeometry args={[1, 8, 8]} />
        <T.MeshStandardMaterial color="#ffffff" emissive="#ffeeaa" emissiveIntensity={1.0} />
      </T.Mesh>
    {/each}

    <!-- SKY dome (subtle gradient) -->
    <T.Mesh position={[0, courtyard_y + H + 5.0, courtyard_z]}>
      <T.SphereGeometry args={[W * 4, 32, 32]} />
      <T.MeshStandardMaterial color="#001a33" emissive="#002244" emissiveIntensity={0.3} side={THREE.BackSide} />
    </T.Mesh>


    <!-- ══════════════════════════════════════════
         ARCHWAY to WASTELAND
         ══════════════════════════════════════════ -->

    {@const wasteland_z = D + 6.0}

    {#each [-1.2, 1.2] as x}
      <T.Mesh position={[x, courtyard_y + H/2, wasteland_z]} receiveShadow>
        <T.BoxGeometry args={[0.3, H - 0.5, 0.3]} />
        <T.MeshStandardMaterial color="#1a5f7a" metalness={0.5} roughness={0.3} />
      </T.Mesh>
    {/each}

    <T.Mesh position={[0, courtyard_y + H - 0.4, wasteland_z]} receiveShadow>
      <T.BoxGeometry args={[2.8, 0.3, 0.3]} />
      <T.MeshStandardMaterial color="#1a5f7a" metalness={0.5} roughness={0.3} />
    </T.Mesh>


    <!-- ══════════════════════════════════════════
         WASTELAND (Vast junk-strewn plane)
         ══════════════════════════════════════════ -->

    <!-- Wasteland base terrain (varied heights) -->
    {#each Array.from({ length: 6 }) as _, i}
      {#each Array.from({ length: 6 }) as _, j}
        {@const x = (i - 2.5) * (W * 2.0)}
        {@const z = (j - 2.5) * (W * 2.0) + wasteland_z}
        {@const height = FLOOR_Y + Math.sin(i * 0.7) * 0.8 + Math.cos(j * 0.7) * 0.8}

        <T.Mesh position={[x, height, z]}>
          <T.BoxGeometry args={[W, T_WALL * 0.8, W]} />
          <T.MeshStandardMaterial color="#3a3a2a" roughness={0.9} metalness={0.1} />
        </T.Mesh>
      {/each}
    {/each}

    <!-- Scattered junk (geometric shapes) -->
    {#each Array.from({ length: 30 }) as _, i}
      {@const x = (Math.random() - 0.5) * (W * 8)}
      {@const z = Math.random() * (W * 8) + wasteland_z - W * 4}
      {@const height = FLOOR_Y + Math.random() * 2.0}
      {@const rotX = Math.random() * Math.PI}
      {@const rotY = Math.random() * Math.PI}
      {@const rotZ = Math.random() * Math.PI}
      {@const type = i % 3}

      <T.Mesh position={[x, height, z]} rotation={[rotX, rotY, rotZ]}>
        {#if type === 0}
          <T.BoxGeometry args={[Math.random() * 0.8 + 0.3, Math.random() * 0.8 + 0.3, Math.random() * 0.8 + 0.3]} />
        {:else if type === 1}
          <T.CylinderGeometry args={[Math.random() * 0.4 + 0.2, Math.random() * 0.4 + 0.2, Math.random() * 1.0 + 0.4, 8]} />
        {:else}
          <T.OctahedronGeometry args={[Math.random() * 0.6 + 0.2]} />
        {/if}
        <T.MeshStandardMaterial color="#5a5a4a" roughness={0.95} metalness={0.05} />
      </T.Mesh>
    {/each}

    <!-- Junk accent lights -->
    {#each Array.from({ length: 8 }) as _, i}
      {@const x = (Math.random() - 0.5) * (W * 6)}
      {@const z = Math.random() * (W * 6) + wasteland_z - W * 3}
      <T.PointLight position={[x, FLOOR_Y + 2.0, z]} color="#666633" intensity={3} distance={4} decay={1.5} />
    {/each}


    <!-- ══════════════════════════════════════════
         EXIT PORTAL (back to Observatory)
         ══════════════════════════════════════════ -->

    {@const portal_x = -W/2 + 0.8}
    {@const portal_z = -D/2 + 1.0}

    <!-- Portal platform -->
    <T.Mesh position={[portal_x, FLOOR_Y + 0.04, portal_z]}>
      <T.CylinderGeometry args={[0.8, 0.8, 0.08, 32]} />
      <T.MeshStandardMaterial color={COL_ACCENT} emissive={COL_ACCENT} emissiveIntensity={2.0 + screenGlow * 0.5} metalness={1} />
    </T.Mesh>

    <!-- Portal rings (rotating) -->
    <T.Mesh position={[portal_x, FLOOR_Y + 0.2, portal_z]} rotation={[0, time * 2, 0]}>
      <T.TorusGeometry args={[0.9, 0.12, 16, 32]} />
      <T.MeshStandardMaterial color={COL_ACCENT} emissive={COL_ACCENT} emissiveIntensity={2.5 + screenGlow * 0.5} metalness={1} />
    </T.Mesh>

    <!-- Portal sensor (larger to catch player) -->
    <T.Group position={[portal_x, FLOOR_Y + 0.8, portal_z]}>
      <RigidBody type="fixed">
        <Collider shape="cylinder" args={[1.2, 2.0]} sensor={true} onsensorenter={handlePortalContact} />
      </RigidBody>
    </T.Group>

    <!-- Portal light -->
    <T.PointLight position={[portal_x, FLOOR_Y + 0.8, portal_z]} color={COL_ACCENT} intensity={14 + screenGlow * 4} distance={6} decay={2} />


    <!-- ══════════════════════════════════════════
         STORY INTERACTION POINTS (Clickable)
         ══════════════════════════════════════════ -->

    <!-- Pillar whisper (story point) -->
    <T.Mesh position={[3.0, FLOOR_Y + 1.5, -2.0]} scale={[0.2, 0.2, 0.2]} on:click={() => handleStoryClick('pillar-whisper')}>
      <T.SphereGeometry args={[1]} />
      <T.MeshStandardMaterial color={COL_ACCENT} emissive={COL_ACCENT} emissiveIntensity={screenGlow} />
    </T.Mesh>

    <!-- Fountain inscription -->
    <T.Mesh position={[0, courtyard_y + 0.8, courtyard_z]} scale={[0.15, 0.15, 0.15]} on:click={() => handleStoryClick('fountain-inscription')}>
      <T.SphereGeometry args={[1]} />
      <T.MeshStandardMaterial color="#00ccff" emissive="#00ccff" emissiveIntensity={screenGlow} />
    </T.Mesh>

    <!-- Strange plant -->
    {#each [[-3.0, 4.0], [3.0, 4.0], [-3.0, 2.0], [3.0, 2.0]] as [px, pz]}
      <T.Mesh position={[px, courtyard_y + 2.2, courtyard_z + pz]} scale={[0.15, 0.15, 0.15]} on:click={() => handleStoryClick('strange-plant')}>
        <T.SphereGeometry args={[1]} />
        <T.MeshStandardMaterial color="#00ff88" emissive="#00ff88" emissiveIntensity={screenGlow} />
      </T.Mesh>
    {/each}

    <!-- Bench note -->
    <T.Mesh position={[0, courtyard_y + 0.7, courtyard_z - 2.0]} scale={[0.2, 0.15, 0.2]} on:click={() => handleStoryClick('bench-note')}>
      <T.SphereGeometry args={[1]} />
      <T.MeshStandardMaterial color="#ffaa00" emissive="#ffaa00" emissiveIntensity={screenGlow} />
    </T.Mesh>

    <!-- Junk memory (wasteland) -->
    {#each Array.from({ length: 3 }) as _, i}
      {@const x = -3.0 + i * 3.0}
      <T.Mesh position={[x, FLOOR_Y + 1.5, wasteland_z + 2.0]} scale={[0.2, 0.2, 0.2]} on:click={() => handleStoryClick('junk-memory')}>
        <T.SphereGeometry args={[1]} />
        <T.MeshStandardMaterial color="#ff6666" emissive="#ff6666" emissiveIntensity={screenGlow} />
      </T.Mesh>
    {/each}


    <!-- ══════════════════════════════════════════
         LIGHTING
         ══════════════════════════════════════════ -->

    <T.AmbientLight intensity={1.8} color="#8899ff" />

    <!-- Interior ceiling lights (multiple for coverage) -->
    <T.PointLight position={[-3.0, FLOOR_Y + H - 0.3, 0]} color="#7fc8ff" intensity={20 + screenGlow * 3} distance={15} decay={1.5} />
    <T.PointLight position={[0, FLOOR_Y + H - 0.3, 0]} color="#7fc8ff" intensity={20 + screenGlow * 3} distance={15} decay={1.5} />
    <T.PointLight position={[3.0, FLOOR_Y + H - 0.3, 0]} color="#7fc8ff" intensity={20 + screenGlow * 3} distance={15} decay={1.5} />

    <!-- Archway illumination light -->
    <T.PointLight position={[0, FLOOR_Y + H/2, D/2 + 5.0]} color="#7fc8ff" intensity={18 + screenGlow * 2} distance={12} decay={1.5} />

    <!-- Console glow (interior) -->
    <T.PointLight position={[0, FLOOR_Y + 2.0, 0]} color="#0066cc" intensity={14 + screenGlow * 3} distance={8} decay={1.5} />

    <!-- Courtyard ambient light -->
    <T.PointLight position={[0, courtyard_y + H + 2.0, courtyard_z]} color="#ffffff" intensity={10} distance={20} decay={2} />

    <!-- Fountain glow -->
    <T.PointLight position={[0, courtyard_y + 1.0, courtyard_z]} color="#4488cc" intensity={8} distance={5} decay={2} />

  </T.Group>
</LevelManager>
