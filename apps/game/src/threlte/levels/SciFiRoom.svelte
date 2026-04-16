<!--
  SciFiRoom — Procedural placeholder level

  TODO: Replace procedural geometry with a real GLB once the model is ready.
  Drop sci-fi-room.glb into apps/megameal/public/models/levels/ and restore
  the GLTF loader. The component interface (props / events) stays the same.

  Room bounds (from sci-fi-room.manifest.json):
    X: -2.63 → 2.76  (5.39 m wide,  centerX ≈ 0.07)
    Y: -0.08 → 1.98  (2.06 m tall,  centerY ≈ 0.95)
    Z: -2.28 → 2.35  (4.63 m deep,  centerZ ≈ 0.04)
  Spawn: [0, 1, 0]
-->
<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte'
  import { T } from '@threlte/core'
  import { RigidBody, Collider } from '@threlte/rapier'
  import LevelManager from '../core/LevelManager.svelte'

  const dispatch = createEventDispatcher()

  // --- Props (identical interface to the GLB version) ---
  export let spawnSystem: any = null
  export let interactionSystem: any = null
  export let playerSpawnPoint: [number, number, number] = [0, 1, 0]

  // --- Room geometry constants (from manifest bounds) ---
  const W  = 5.39   // total width  X
  const H  = 2.06   // total height Y
  const D  = 4.63   // total depth  Z
  const CX = 0.07   // center X
  const CY = 0.95   // center Y
  const CZ = 0.04   // center Z

  const FLOOR_Y = -0.08
  const T_WALL  = 0.12   // wall thickness (half = 0.06)

  // Colours
  const COL_FLOOR   = '#1a1f2e'
  const COL_WALL    = '#1e2435'
  const COL_CEILING = '#151b28'
  const COL_TRIM    = '#00d4ff'
  const COL_PANEL   = '#0a3d5c'
  const TRIM_I      = 1.6    // trim emissive intensity

  const PANEL_W = 1.0
  const PANEL_H = 0.6
  const PANEL_D = 0.02

  onMount(() => {
    if (spawnSystem?.requestSpawn) {
      spawnSystem.requestSpawn({
        entityType: 'player',
        position: playerSpawnPoint,
        priority: 10,
        metadata: { levelName: 'sci-fi-room', spawnReason: 'level_load' }
      })
    }
    // Box colliders are synchronous — physics is ready immediately
    dispatch('terrainReady')
    console.log('🏢 SciFiRoom (procedural placeholder): ready')
  })
</script>

<LevelManager>
  <T.Group name="sci-fi-room-level" position={[CX, 0, CZ]}>

    <!-- ══════════════════════════════════════════
         PHYSICS — T.Group positions the RigidBody
         via parent world transform (v3.1.4 API)
         ══════════════════════════════════════════ -->

    <!-- Floor -->
    <T.Group position={[0, FLOOR_Y, 0]}>
      <RigidBody type="fixed">
        <Collider shape="cuboid" args={[W/2, T_WALL/2, D/2]} friction={0.9} />
      </RigidBody>
    </T.Group>

    <!-- Ceiling -->
    <T.Group position={[0, CY + H/2, 0]}>
      <RigidBody type="fixed">
        <Collider shape="cuboid" args={[W/2, T_WALL/2, D/2]} />
      </RigidBody>
    </T.Group>

    <!-- North wall (−Z) -->
    <T.Group position={[0, CY, -D/2]}>
      <RigidBody type="fixed">
        <Collider shape="cuboid" args={[W/2, H/2, T_WALL/2]} />
      </RigidBody>
    </T.Group>

    <!-- South wall (+Z) -->
    <T.Group position={[0, CY, D/2]}>
      <RigidBody type="fixed">
        <Collider shape="cuboid" args={[W/2, H/2, T_WALL/2]} />
      </RigidBody>
    </T.Group>

    <!-- West wall (−X) -->
    <T.Group position={[-W/2, CY, 0]}>
      <RigidBody type="fixed">
        <Collider shape="cuboid" args={[T_WALL/2, H/2, D/2]} />
      </RigidBody>
    </T.Group>

    <!-- East wall (+X) -->
    <T.Group position={[W/2, CY, 0]}>
      <RigidBody type="fixed">
        <Collider shape="cuboid" args={[T_WALL/2, H/2, D/2]} />
      </RigidBody>
    </T.Group>


    <!-- ══════════════════════════════════════════
         VISIBLE GEOMETRY
         ══════════════════════════════════════════ -->

    <!-- Floor -->
    <T.Mesh position={[0, FLOOR_Y - T_WALL/2, 0]} receiveShadow>
      <T.BoxGeometry args={[W, T_WALL, D]} />
      <T.MeshStandardMaterial color={COL_FLOOR} roughness={0.4} metalness={0.7} />
    </T.Mesh>

    <!-- Floor grid lines (X axis) -->
    {#each [-1.5, -0.5, 0.5, 1.5] as gx}
      <T.Mesh position={[gx, FLOOR_Y + 0.002, 0]}>
        <T.BoxGeometry args={[0.03, 0.001, D]} />
        <T.MeshStandardMaterial color={COL_TRIM} emissive={COL_TRIM} emissiveIntensity={0.4} roughness={1} metalness={0} />
      </T.Mesh>
    {/each}

    <!-- Floor grid lines (Z axis) -->
    {#each [-1.5, -0.5, 0.5, 1.5] as gz}
      <T.Mesh position={[0, FLOOR_Y + 0.002, gz]}>
        <T.BoxGeometry args={[W, 0.001, 0.03]} />
        <T.MeshStandardMaterial color={COL_TRIM} emissive={COL_TRIM} emissiveIntensity={0.4} roughness={1} metalness={0} />
      </T.Mesh>
    {/each}

    <!-- Ceiling -->
    <T.Mesh position={[0, CY + H/2 + T_WALL/2, 0]}>
      <T.BoxGeometry args={[W, T_WALL, D]} />
      <T.MeshStandardMaterial color={COL_CEILING} roughness={0.6} metalness={0.5} />
    </T.Mesh>

    <!-- Ceiling light panels -->
    {#each [-0.9, 0.9] as px}
      <T.Mesh position={[px, CY + H/2 - 0.01, 0]}>
        <T.BoxGeometry args={[0.6, 0.01, D * 0.7]} />
        <T.MeshStandardMaterial color="#c8e8ff" emissive="#a0d4ff" emissiveIntensity={1.2} roughness={1} metalness={0} />
      </T.Mesh>
    {/each}

    <!-- North wall -->
    <T.Mesh position={[0, CY, -D/2 - T_WALL/2]} receiveShadow>
      <T.BoxGeometry args={[W, H, T_WALL]} />
      <T.MeshStandardMaterial color={COL_WALL} roughness={0.7} metalness={0.3} />
    </T.Mesh>

    <!-- North wall panel insets -->
    {#each [-1.6, 0, 1.6] as px}
      <T.Mesh position={[px, CY, -D/2 + 0.01]}>
        <T.BoxGeometry args={[PANEL_W, PANEL_H, PANEL_D]} />
        <T.MeshStandardMaterial color={COL_PANEL} roughness={0.5} metalness={0.6} />
      </T.Mesh>
    {/each}

    <!-- South wall -->
    <T.Mesh position={[0, CY, D/2 + T_WALL/2]} receiveShadow>
      <T.BoxGeometry args={[W, H, T_WALL]} />
      <T.MeshStandardMaterial color={COL_WALL} roughness={0.7} metalness={0.3} />
    </T.Mesh>

    <!-- South wall panel insets -->
    {#each [-1.6, 0, 1.6] as px}
      <T.Mesh position={[px, CY, D/2 - 0.01]}>
        <T.BoxGeometry args={[PANEL_W, PANEL_H, PANEL_D]} />
        <T.MeshStandardMaterial color={COL_PANEL} roughness={0.5} metalness={0.6} />
      </T.Mesh>
    {/each}

    <!-- West wall -->
    <T.Mesh position={[-W/2 - T_WALL/2, CY, 0]} receiveShadow>
      <T.BoxGeometry args={[T_WALL, H, D]} />
      <T.MeshStandardMaterial color={COL_WALL} roughness={0.7} metalness={0.3} />
    </T.Mesh>

    <!-- East wall -->
    <T.Mesh position={[W/2 + T_WALL/2, CY, 0]} receiveShadow>
      <T.BoxGeometry args={[T_WALL, H, D]} />
      <T.MeshStandardMaterial color={COL_WALL} roughness={0.7} metalness={0.3} />
    </T.Mesh>

    <!-- Cyan trim — floor/wall junction (all 4 sides) -->
    <T.Mesh position={[0, FLOOR_Y + 0.04, -D/2]}>
      <T.BoxGeometry args={[W, 0.06, 0.02]} />
      <T.MeshStandardMaterial color={COL_TRIM} emissive={COL_TRIM} emissiveIntensity={TRIM_I} roughness={1} metalness={0} />
    </T.Mesh>
    <T.Mesh position={[0, FLOOR_Y + 0.04, D/2]}>
      <T.BoxGeometry args={[W, 0.06, 0.02]} />
      <T.MeshStandardMaterial color={COL_TRIM} emissive={COL_TRIM} emissiveIntensity={TRIM_I} roughness={1} metalness={0} />
    </T.Mesh>
    <T.Mesh position={[-W/2, FLOOR_Y + 0.04, 0]}>
      <T.BoxGeometry args={[0.02, 0.06, D]} />
      <T.MeshStandardMaterial color={COL_TRIM} emissive={COL_TRIM} emissiveIntensity={TRIM_I} roughness={1} metalness={0} />
    </T.Mesh>
    <T.Mesh position={[W/2, FLOOR_Y + 0.04, 0]}>
      <T.BoxGeometry args={[0.02, 0.06, D]} />
      <T.MeshStandardMaterial color={COL_TRIM} emissive={COL_TRIM} emissiveIntensity={TRIM_I} roughness={1} metalness={0} />
    </T.Mesh>

    <!-- Cyan trim — ceiling/wall junction (all 4 sides) -->
    <T.Mesh position={[0, CY + H/2 - 0.04, -D/2]}>
      <T.BoxGeometry args={[W, 0.06, 0.02]} />
      <T.MeshStandardMaterial color={COL_TRIM} emissive={COL_TRIM} emissiveIntensity={TRIM_I * 0.7} roughness={1} metalness={0} />
    </T.Mesh>
    <T.Mesh position={[0, CY + H/2 - 0.04, D/2]}>
      <T.BoxGeometry args={[W, 0.06, 0.02]} />
      <T.MeshStandardMaterial color={COL_TRIM} emissive={COL_TRIM} emissiveIntensity={TRIM_I * 0.7} roughness={1} metalness={0} />
    </T.Mesh>
    <T.Mesh position={[-W/2, CY + H/2 - 0.04, 0]}>
      <T.BoxGeometry args={[0.02, 0.06, D]} />
      <T.MeshStandardMaterial color={COL_TRIM} emissive={COL_TRIM} emissiveIntensity={TRIM_I * 0.7} roughness={1} metalness={0} />
    </T.Mesh>
    <T.Mesh position={[W/2, CY + H/2 - 0.04, 0]}>
      <T.BoxGeometry args={[0.02, 0.06, D]} />
      <T.MeshStandardMaterial color={COL_TRIM} emissive={COL_TRIM} emissiveIntensity={TRIM_I * 0.7} roughness={1} metalness={0} />
    </T.Mesh>


    <!-- ══════════════════════════════════════════
         LIGHTING
         ══════════════════════════════════════════ -->

    <T.AmbientLight intensity={0.6} color="#cce8ff" />

    <!-- Ceiling panel downlights -->
    <T.PointLight position={[-0.9, CY + H/2 - 0.1, 0]} color="#a0d4ff" intensity={12} distance={6} decay={2} />
    <T.PointLight position={[ 0.9, CY + H/2 - 0.1, 0]} color="#a0d4ff" intensity={12} distance={6} decay={2} />

    <!-- Floor trim accent lights -->
    <T.PointLight position={[0, FLOOR_Y + 0.1, -D/2 + 0.2]} color={COL_TRIM} intensity={3} distance={3} decay={2} />
    <T.PointLight position={[0, FLOOR_Y + 0.1,  D/2 - 0.2]} color={COL_TRIM} intensity={3} distance={3} decay={2} />

  </T.Group>
</LevelManager>
