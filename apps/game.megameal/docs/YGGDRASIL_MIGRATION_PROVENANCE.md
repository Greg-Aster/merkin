# Yggdrasil Migration Provenance

Status: provenance packet only. No runtime, editor, source, asset, or generated
output was migrated by this document.

## Source Files

- Primary primitive-heavy source:
  `/home/greggles/Merkin/apps/game/authoring/scene-backups/yggdrasil/yggdrasil.scene.20260418-185617.original-packaged.json`
- Later generated-asset editor source:
  `/home/greggles/Merkin/apps/game/src/threlte/editor/scenes/yggdrasil.scene.json`
- Old generated runtime evidence, inspected only for collision/readiness history:
  `/home/greggles/Merkin/apps/megameal/public/generated/runtime-game-assets/scenes/yggdrasil.runtime-scene.json`
- Old generated partition evidence, inspected only for streaming/readiness history:
  `/home/greggles/Merkin/apps/megameal/public/runtime-world-partitions/yggdrasil.partition.json`

These paths are historical citations only. Do not import from them, copy old
runtime/editor code, or load old generated JSON as target-engine runtime data.

## Node Counts

Primary source, `updatedAt` 2026-04-19T01:38:28.019Z:

- Total nodes: 248
- Primitive nodes: 125
- Asset nodes: 28
- Prefab nodes: 36
- Group nodes: 59
- Primitive geometry mix: 61 box, 49 cylinder, 6 torus, 5 icosahedron,
  4 dodecahedron

Later editor source, `updatedAt` 2026-06-04T19:34:05.996Z:

- Total nodes: 172
- Asset nodes: 98
- Group nodes: 57
- Prefab nodes: 16
- Primitive nodes: 1

Old generated runtime evidence:

- Build report actor count: 173
- Asset actors: 98
- Primitive actors: 1
- NPC/firefly actors: 32
- Physics actors: 101
- Trimesh actors: 48
- Visual-only actors: 14
- Warning: 100 runtime assets exceeded the old contract budget of 60

Old partition evidence:

- Partition file reports 22 cells, 69 resident actors, 104 streamable actors,
  cell size 120, active radius 1.
- The later editor scene settings separately reference
  `/runtime-world-partitions/yggdrasil.partition.json` and record a stale-looking
  snapshot with 33 cells, cell size 80, active radius 5, 69 resident actors, and
  104 streamable actors.

## Spawn And Settings Evidence

Primary source:

- Spawn position: `[0, 6.2, -118]`
- Skybox preset: `observatory`
- Audio preset: `ruin-whispers`
- Features enabled: `starMap`, `conversations`, `water`, `styles`,
  `ambientParticles`
- Ambient particles: enabled, count 220, radius 240, height range 1 to 96,
  colors `#c9dd9a` and `#d9f7ff`
- Style: `monument`, fog color `#78866c`, fog density `0.00072`
- Lighting: ambient `0.95`, key `0.88`, fill `0.32`
- Water: enabled, level `-0.7`, size `4200 x 4200`, color `#2f4f63`,
  opacity `0.88`

Later editor source:

- Spawn position: `[0, 5, -118]`
- Spawn rotation: `[0, -0.01, 0]`
- Spawn support actor: `yggdrasil-spawn-pad`
- `conversations` is false, `fireflies.enabled` is false, and
  `terrainRuntimeMode` is `scene-authored`
- Collision source is `scene-colliders`; fallback surface policy is `disabled`

## Selected Primitive IDs

Candidate foundation surfaces from the primary source:

- `yggdrasil-ground`: cylinder at `[0, -2.9, 0]`, args
  `[172, 196, 6.4, 56]`
- `yggdrasil-island-shelf`: cylinder at `[0, -1.55, 0]`, args
  `[118, 152, 3.6, 48]`
- `yggdrasil-mound`: cylinder at `[0, -0.18, 0]`, args `[60, 88, 13, 36]`
- `yggdrasil-dais`: cylinder at `[0, 0.42, 0]`, args `[26, 36, 3.2, 28]`
- `yggdrasil-bifrost-path`: box at `[0, 0.42, -74]`, args
  `[10, 0.9, 82]`
- `yggdrasil-spawn-pad`: invisible box at `[0, 1.55, -118]`, args
  `[16, 1.6, 16]`

Selected identity/layout IDs from the primary source:

- Perimeter and roots: `yggdrasil-shore-ring`,
  `yggdrasil-root-north`, `yggdrasil-root-south`, `yggdrasil-root-east`,
  `yggdrasil-root-west`, `yggdrasil-root-northeast`,
  `yggdrasil-root-northwest`, `yggdrasil-root-southeast`,
  `yggdrasil-root-southwest`
- World tree/crown: `yggdrasil-trunk-lower`, `yggdrasil-trunk-mid`,
  `yggdrasil-trunk-upper`, `yggdrasil-canopy-1` through
  `yggdrasil-canopy-9`, `yggdrasil-crown-halo`
- Wells: `yggdrasil-well-urd-ring`, `yggdrasil-well-urd-pool`,
  `yggdrasil-well-mimir-ring`, `yggdrasil-well-mimir-pool`,
  `yggdrasil-well-hvergelmir-ring`, `yggdrasil-well-hvergelmir-pool`
- Approach: `yggdrasil-path-stone-1` through `yggdrasil-path-stone-6`,
  `yggdrasil-bifrost-ribbon-1` through `yggdrasil-bifrost-ribbon-7`
- Arrival set dressing: `yggdrasil-arrival-arch`,
  `yggdrasil-arrival-column-left`, `yggdrasil-arrival-column-right`,
  `yggdrasil-arrival-monolith-left`, `yggdrasil-arrival-monolith-right`

## Collision And Walkable Implications

The later editor source names these ground actors:

- `yggdrasil-ground`
- `yggdrasil-island-shelf`
- `yggdrasil-dais`
- `yggdrasil-bifrost-path`
- `yggdrasil-spawn-pad`

It also names `yggdrasil-bifrost-path` as the required walkable surface,
declares `scene-colliders` as the collision source, and disables fallback
surface policy. The old generated runtime readiness repeats the five ground
actors as required walkable/collision actors, but its required collider URLs
only list cooked collider assets for `yggdrasil-dais` and `yggdrasil-ground`.

Target-engine migration starts with explicit target-owned primitive content data
and `walkable`/`worldStatic` collision for the older primitive-heavy backup.
The direct primitive parity packet represents all `125` old primitive nodes as
checked-in target data under `PrimitiveSceneContentContract`, including the
crown-ascent primitive path and spawn pad. Render meshes, old generated GLB
actors, old cooked collider products, and partition residency must not become
implicit walkable truth.

## Explicitly Deferred

- Any source-code migration from old `apps/game` runtime, editor, Svelte,
  Threlte, Three, Rapier, repair, scene lifecycle, or cook scripts
- Loading the old generated runtime scene JSON or old partition JSON
- Full generated GLB parity and old Hunyuan/style-lab asset parity
- Old cooked collider product parity and old triangle-budget behavior
- World-partition streaming parity
- Full water rendering, underwater behavior, and gameplay-volume behavior
- Ambient particle parity and large firefly/NPC population parity
- Star map and conversation behavior
- Production lighting, shadows, reflections, and post-processing parity
- Further portal/transition expansion beyond the validated portal-arena
  admission for the primitive-parity `yggdrasil_runtime` foundation
