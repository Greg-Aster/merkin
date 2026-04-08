<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte'
  import { T } from '@threlte/core'
  import { Collider, RigidBody, useRapier } from '@threlte/rapier'
  import * as THREE from 'three'
  import { TERRAIN_GROUP } from '@/threlte/constants/physics'
  import { playerStateStore } from '@/threlte/stores/gameStateStore'

  const dispatch = createEventDispatcher()
  const rapier = useRapier()
  // Track player position for chunk activation
  let playerPos: [number, number, number] = [0, 0, 0]
  if (typeof window !== 'undefined') {
    playerStateStore.subscribe(p => {
      playerPos = p.position
    })
  }

  // Props
  export let heightData: Float32Array
  export let resolution: number
  export let worldSize: number
  export let worldSizeX: number | undefined = undefined
  export let worldSizeZ: number | undefined = undefined
  export let bounds: { min: [number, number, number], max: [number, number, number] } | null = null
  export let position: [number, number, number] = [0, 0, 0]
  export let friction: number = 0.9
  export let restitution: number = 0.0
  // Optional: visual debugging (disabled by default)
  export let renderDebug: boolean = false
  export let minHeight: number = 0
  export let maxHeight: number = 100
  // Additional debug overlays (disabled by default)
  export let renderPhysicsDebug: boolean = false

  // Debug toggles
  export let showBoundsAABB: boolean = false
  export let enableRaycastProbe: boolean = false
  export let useTrimesh: boolean = true // Default to TriMesh system
  export let trimeshDownsample: number = 8
  export let trimeshChunkVerts: number = 65
  export let trimeshActiveRadius: number = 3
  export let trimeshMode: 'single' | 'chunked' = 'single'
  export let chunkSize: number | null = null
  export let gridSize: [number, number] | null = null

  // Allow toggles from URL query params
  onMount(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      if (params.get('hf_pdbg') === '0') renderPhysicsDebug = false
      if (params.get('hf_pdbg') === '1') renderPhysicsDebug = true
      if (params.get('hf_aabb') === '1') showBoundsAABB = true
      if (params.get('hf_probe') === '1') enableRaycastProbe = true
      if (params.get('hf_tm') === '0') useTrimesh = false // Allow disabling for debug
      if (params.get('hf_tm_ds')) trimeshDownsample = Math.max(1, parseInt(params.get('hf_tm_ds')!))
      if (params.get('hf_tm_cv')) trimeshChunkVerts = Math.max(9, parseInt(params.get('hf_tm_cv')!))
      if (params.get('hf_tm_rad')) trimeshActiveRadius = Math.max(1, parseInt(params.get('hf_tm_rad')!))
      if (params.get('hf_tm_mode') === 'chunked') trimeshMode = 'chunked'
    } catch (e) {
      console.warn('Failed to parse URL params for debug toggles')
    }
  })

  // Signal readiness once TriMesh colliders are active so Game.svelte can proceed
  let trimeshReadyDispatched = false

  // (Removed heavy debug wireframe generation)

  // Diagnostic functions
  function logColliderInventory() {
    if (!rapier.world) return
    if (!import.meta.env.DEV) return
    console.log('🔍 Collider Inventory:')
    let count = 0
    
    try {
      if (typeof rapier.world.forEachCollider === 'function') {
        rapier.world.forEachCollider((collider: any) => {
          count++
          const t = collider.translation()
          const g = collider.collisionGroups()
          const s = typeof collider.shapeType === 'function' ? collider.shapeType() : 'unknown'
          console.log(`  ${count}. Shape: ${s}, Pos: [${t.x.toFixed(2)}, ${t.y.toFixed(2)}, ${t.z.toFixed(2)}], Groups: ${g}, Sensor: ${collider.isSensor()}`)
        })
      } else if (rapier.world.colliders && typeof rapier.world.colliders.forEach === 'function') {
        rapier.world.colliders.forEach((collider: any) => {
          count++
          const t = collider.translation()
          const g = collider.collisionGroups()
          const s = typeof collider.shapeType === 'function' ? collider.shapeType() : 'unknown'
          console.log(`  ${count}. Shape: ${s}, Pos: [${t.x.toFixed(2)}, ${t.y.toFixed(2)}, ${t.z.toFixed(2)}], Groups: ${g}, Sensor: ${collider.isSensor()}`)
        })
      } else {
        console.warn('Collider iteration API not available')
      }
    } catch (e) {
      console.warn('Collider inventory failed:', e)
    }
    console.log(`📊 Total active colliders: ${count}`)
  }

  function performRaycastProbe(testPoints: Array<[number, number, number]> = []) {
    if (!rapier.world || !bounds) return
    if (!import.meta.env.DEV) return

    const defaultTestPoints = [
      [bounds.min[0], bounds.max[1] + 10, bounds.min[2]], // Bottom-left corner
      [bounds.max[0], bounds.max[1] + 10, bounds.min[2]], // Bottom-right corner
      [bounds.max[0], bounds.max[1] + 10, bounds.max[2]], // Top-right corner
      [bounds.min[0], bounds.max[1] + 10, bounds.max[2]], // Top-left corner
      [(bounds.min[0] + bounds.max[0])/2, bounds.max[1] + 10, (bounds.min[2] + bounds.max[2])/2] // Center
    ]
    
    const points = testPoints.length > 0 ? testPoints : defaultTestPoints
    
    console.log('🎯 Ground Raycast Probe:')
    points.forEach((point, i) => {
      const ray = new rapier.rapier.Ray(
        { x: point[0], y: point[1], z: point[2] },
        { x: 0, y: -1, z: 0 }
      )
      
      const hit = rapier.world!.castRay(ray, 5000.0, true)
      if (hit && Number.isFinite(hit.toi)) {
        const hitPoint = ray.pointAt(hit.toi)
        if (hitPoint && Number.isFinite(hitPoint.y)) {
          console.log(`  Point ${i + 1} [${point[0].toFixed(2)}, ${point[2].toFixed(2)}]: Ray Y=${hitPoint.y.toFixed(3)}`)
        } else {
          console.log(`  Point ${i + 1} [${point[0].toFixed(2)}, ${point[2].toFixed(2)}]: Hit but invalid point`)
        }
      } else {
        console.log(`  Point ${i + 1} [${point[0].toFixed(2)}, ${point[2].toFixed(2)}]: No hit`)
      }
    })
  }

  // --- TriMesh Fallback (chunked, downsampled) ---
  // Downsample height data for TriMesh construction
  function downsampleGrid(src: Float32Array, srcRes: number, factor: number): { data: Float32Array; size: number } {
    const step = Math.max(1, factor|0)
    const cells = Math.floor((srcRes - 1) / step)
    const size = cells + 1
    const dst = new Float32Array(size * size)
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        const si = i * step
        const sj = j * step
        dst[i * size + j] = src[si * srcRes + sj]
      }
    }
    return { data: dst, size }
  }

  // Build a TriMesh from a grid patch (vertsW x vertsH) starting at (row0,col0) in ds grid
  function buildTrimeshPatch(dsHeights: Float32Array, dsSize: number, row0: number, col0: number, vertsH: number, vertsW: number,
    originX: number, originZ: number, stepX: number, stepZ: number): { vertices: Float32Array; indices: Uint32Array; position: [number, number, number] } {
    const vx = vertsW
    const vz = vertsH
    const vertexCount = vx * vz
    const vertices = new Float32Array(vertexCount * 3)
    // Localize to patch origin (min corner)
    const posX = originX + col0 * stepX
    const posZ = originZ + row0 * stepZ
    for (let iz = 0; iz < vz; iz++) {
      for (let ix = 0; ix < vx; ix++) {
        const gi = row0 + iz
        const gj = col0 + ix
        const h = dsHeights[gi * dsSize + gj]
        const idx = iz * vx + ix
        vertices[idx * 3 + 0] = ix * stepX
        vertices[idx * 3 + 1] = h
        vertices[idx * 3 + 2] = iz * stepZ
      }
    }
    // Indices (two tris per quad)
    const quadsX = vx - 1
    const quadsZ = vz - 1
    const triCount = quadsX * quadsZ * 2
    const indices = new Uint32Array(triCount * 3)
    let t = 0
    for (let z = 0; z < quadsZ; z++) {
      for (let x = 0; x < quadsX; x++) {
        const i0 = z * vx + x
        const i1 = i0 + 1
        const i2 = i0 + vx
        const i3 = i2 + 1
        // Triangle 1: i0, i2, i1
        indices[t++] = i0; indices[t++] = i2; indices[t++] = i1
        // Triangle 2: i1, i2, i3
        indices[t++] = i1; indices[t++] = i2; indices[t++] = i3
      }
    }
    return { vertices, indices, position: [posX, 0, posZ] }
  }

  // Compute downsampled grid and chunk layout
  $: trimeshLayout = (() => {
    if (!useTrimesh || !heightData || !resolution) return null
    const { data: dsData, size: dsSize } = downsampleGrid(heightData, resolution, trimeshDownsample)
    const vertsPerChunk = Math.max(9, trimeshChunkVerts|0)
    const quadsPerChunk = vertsPerChunk - 1
    // How many chunks cover the ds grid (overlapping one row/col at edges)
    const chunkCountX = Math.ceil((dsSize - 1) / quadsPerChunk)
    const chunkCountZ = Math.ceil((dsSize - 1) / quadsPerChunk)
    const scaleX = worldSizeX ?? (bounds ? bounds.max[0] - bounds.min[0] : worldSize)
    const scaleZ = worldSizeZ ?? (bounds ? bounds.max[2] - bounds.min[2] : worldSize)
    const originX = bounds ? bounds.min[0] : -worldSize / 2
    const originZ = bounds ? bounds.min[2] : -worldSize / 2
    const stepX = (scaleX / (resolution - 1)) * trimeshDownsample
    const stepZ = (scaleZ / (resolution - 1)) * trimeshDownsample
    return { dsData, dsSize, vertsPerChunk, quadsPerChunk, chunkCountX, chunkCountZ, originX, originZ, stepX, stepZ }
  })()

  // Build a single consolidated TriMesh covering the entire terrain in world coords
  $: singleTrimesh = (() => {
    if (!useTrimesh || !trimeshLayout || trimeshMode !== 'single') return null
    const { dsData, dsSize, originX, originZ, stepX, stepZ } = trimeshLayout
    const vx = dsSize
    const vz = dsSize
    const vertexCount = vx * vz
    const vertices = new Float32Array(vertexCount * 3)
    for (let iz = 0; iz < vz; iz++) {
      for (let ix = 0; ix < vx; ix++) {
        const idx = iz * vx + ix
        const h = dsData[idx]
        vertices[idx * 3 + 0] = originX + ix * stepX
        vertices[idx * 3 + 1] = h
        vertices[idx * 3 + 2] = originZ + iz * stepZ
      }
    }
    const quadsX = vx - 1
    const quadsZ = vz - 1
    const triCount = quadsX * quadsZ * 2
    const indices = new Uint32Array(triCount * 3)
    let t = 0
    for (let z = 0; z < quadsZ; z++) {
      for (let x = 0; x < quadsX; x++) {
        const i0 = z * vx + x
        const i1 = i0 + 1
        const i2 = i0 + vx
        const i3 = i2 + 1
        indices[t++] = i0; indices[t++] = i2; indices[t++] = i1
        indices[t++] = i1; indices[t++] = i2; indices[t++] = i3
      }
    }
    return { vertices, indices }
  })()

  // Active chunk window around player (aligned to visual GLB chunk grid if provided)
  $: activeTrimeshChunks = (() => {
    if (!trimeshLayout) return []
    const { originX, originZ, stepX, stepZ, dsSize } = trimeshLayout
    const radius = Math.max(1, trimeshActiveRadius|0)
    const px = playerPos[0]
    const pz = playerPos[2]
    const chunks: Array<{ cx: number; cz: number; row0: number; col0: number; vertsH: number; vertsW: number; pos: [number, number, number] }>
      = []

    if (chunkSize && gridSize) {
      const [gridX, gridZ] = gridSize
      // Player's current visual chunk index
      const cxi = Math.min(Math.max(0, Math.floor((px - originX) / chunkSize)), gridX - 1)
      const czi = Math.min(Math.max(0, Math.floor((pz - originZ) / chunkSize)), gridZ - 1)
      for (let dz = -radius; dz <= radius; dz++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const cx = Math.min(Math.max(0, cxi + dx), gridX - 1)
          const cz = Math.min(Math.max(0, czi + dz), gridZ - 1)
          const posX = originX + cx * chunkSize
          const posZ = originZ + cz * chunkSize
          // Map chunk world area to ds grid window
          const col0 = Math.floor((posX - originX) / stepX)
          const row0 = Math.floor((posZ - originZ) / stepZ)
          const vertsW = Math.min(dsSize - col0, Math.floor(chunkSize / stepX) + 1)
          const vertsH = Math.min(dsSize - row0, Math.floor(chunkSize / stepZ) + 1)
          chunks.push({ cx, cz, row0, col0, vertsH, vertsW, pos: [posX, 0, posZ] })
        }
      }
    } else {
      // Fallback to ds-grid chunking by vertex window
      const vertsPerChunk = Math.max(9, trimeshChunkVerts|0)
      const quadsPerChunk = vertsPerChunk - 1
      const iCol = Math.floor((px - originX) / (stepX * quadsPerChunk))
      const iRow = Math.floor((pz - originZ) / (stepZ * quadsPerChunk))
      for (let dz = -radius; dz <= radius; dz++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const cx = Math.max(0, iCol + dx)
          const cz = Math.max(0, iRow + dz)
          const col0 = cx * quadsPerChunk
          const row0 = cz * quadsPerChunk
          const vertsW = Math.min(dsSize - col0, vertsPerChunk)
          const vertsH = Math.min(dsSize - row0, vertsPerChunk)
          const posX = originX + col0 * stepX
          const posZ = originZ + row0 * stepZ
          chunks.push({ cx, cz, row0, col0, vertsH, vertsW, pos: [posX, 0, posZ] })
        }
      }
    }
    // Deduplicate by (cx,cz)
    const seen = new Set<string>()
    const unique: typeof chunks = []
    for (const c of chunks) {
      const k = `${c.cx}_${c.cz}`
      if (!seen.has(k)) { seen.add(k); unique.push(c) }
    }
    return unique
  })()

  // Build geometry cache for active chunks
  let trimeshCache: Map<string, { vertices: Float32Array; indices: Uint32Array; position: [number, number, number] }> = new Map()
  $: if (trimeshLayout && activeTrimeshChunks) {
    const { dsData, dsSize, originX, originZ, stepX, stepZ } = trimeshLayout
    for (const c of activeTrimeshChunks) {
      const key = `${c.cx}_${c.cz}`
      if (!trimeshCache.has(key)) {
        const patch = buildTrimeshPatch(dsData, dsSize, c.row0, c.col0, c.vertsH, c.vertsW, originX, originZ, stepX, stepZ)
        // Override position to exact chunk corner if provided
        patch.position = c.pos
        trimeshCache.set(key, patch)
      }
    }
    // Optional: prune far cache entries to cap memory
    if (trimeshCache.size > 100) {
      const keep = new Set(activeTrimeshChunks.map(c => `${c.cx}_${c.cz}`))
      for (const k of Array.from(trimeshCache.keys())) {
        if (!keep.has(k)) trimeshCache.delete(k)
      }
    }
  }

  // Dispatch terrainReady when TriMesh is ready (single or chunked)
  $: if (
    useTrimesh &&
    !trimeshReadyDispatched &&
    trimeshLayout &&
    ((trimeshMode === 'single' && singleTrimesh) || (trimeshMode === 'chunked' && activeTrimeshChunks && activeTrimeshChunks.length > 0))
  ) {
    try {
      trimeshReadyDispatched = true
      const dsRes = `${trimeshLayout.dsSize}x${trimeshLayout.dsSize}`
      const approxActive = trimeshMode === 'single' ? 1 : (activeTrimeshChunks?.length || 0)
      if (import.meta.env.DEV) console.log('✅ TriMesh terrain ready:', { mode: trimeshMode, approxActiveChunks: approxActive, dsResolution: dsRes })
      dispatch('terrainReady', {
        colliderType: 'trimesh',
        activeChunks: approxActive,
        dsResolution: dsRes
      })
    } catch (e) {
      console.warn('⚠️ Failed to dispatch TriMesh readiness:', e)
    }
  }

  // Calculate actual terrain position based on bounds or fallback to centered (no rotation)
  $: terrainOffset = (() => {
      const offset = bounds
        ? [bounds.min[0], 0, bounds.min[2]]
        : [-worldSize / 2, 0, -worldSize / 2]
      // Anchor info (dev only)
      if (import.meta.env.DEV) console.log('📍 Using min corner anchor:', offset)
      return offset
  })()

  // (Removed debug wireframe computation)
  
  // Run diagnostics when enabled
  onMount(() => {
    // No debug diagnostics by default
  })
</script>

{#if useTrimesh && trimeshLayout && trimeshMode === 'chunked'}
  {#each activeTrimeshChunks as chunk (chunk.cx + '_' + chunk.cz)}
    {#if trimeshCache.get(chunk.cx + '_' + chunk.cz)}
      {@const patch = trimeshCache.get(chunk.cx + '_' + chunk.cz)}
      <RigidBody type="fixed" position={patch.position}>
        <Collider
          shape="trimesh"
          args={[patch.vertices, patch.indices]}
          collisionGroups={TERRAIN_GROUP}
          friction={friction}
          restitution={restitution}
          on:create={() => console.log('✅ TriMesh collider created at', patch.position, 'for', chunk)}
          on:destroy={() => console.log('🗑️ TriMesh collider destroyed:', chunk)}
        />
      </RigidBody>
    {/if}
  {/each}
{/if}

{#if useTrimesh && trimeshLayout && trimeshMode === 'single' && singleTrimesh}
  <RigidBody type="fixed" position={[0, 0, 0]}>
    <Collider
      shape="trimesh"
      args={[singleTrimesh.vertices, singleTrimesh.indices]}
      collisionGroups={TERRAIN_GROUP}
      friction={friction}
      restitution={restitution}
      on:create={() => console.log('✅ Single TriMesh collider created (world-space)')}
    />
  </RigidBody>
{/if}



{#if showBoundsAABB && bounds}
  <T.Group position={position}>
    <T.Mesh
      position={[
        (bounds.min[0] + bounds.max[0]) / 2,
        (bounds.min[1] + bounds.max[1]) / 2,
        (bounds.min[2] + bounds.max[2]) / 2
      ]}
    >
      <T.BoxGeometry
        args={[
          bounds.max[0] - bounds.min[0],
          bounds.max[1] - bounds.min[1],
          bounds.max[2] - bounds.min[2]
        ]}
      />
      <T.MeshBasicMaterial wireframe color="white" />
    </T.Mesh>
  </T.Group>
{/if}
