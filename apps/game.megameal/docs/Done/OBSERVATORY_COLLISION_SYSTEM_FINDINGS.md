# Observatory Collision System Findings

Status: completed on 2026-06-06 and moved to `docs/Done`. Observatory has an
explicit, generated runtime collision owner, engine-wide kinematic character
collision consumption, editor/cook validation, dev-only preview/reload protocol,
generated visual-terrain provenance, the generalized terrain import/cook
contract foundation, and cooked terrain chunk foundation. Remaining production
editor, terrain LOD/streaming, and diagnostics work is tracked in
`docs/LEVEL_EDITOR_COLLISION_COOK_PLAN.md` and
`docs/WATER_SURFACE_SYSTEM_PLAN.md`.

## Final Observatory State

- The player does not spawn at the scene origin. The authored stable `player`
  instance is at `[-137.2, 1.8, -49.5]` with `CharacterController.groundY:
  1.8` retained as a spawn/fallback scalar.
- The Observatory environment GLB is visual-only:
  `mesh_observatory_environment` renders
  `/assets/game/observatory/observatory-environment.glb`.
- The GLB visual instance `observatory:terrain` uses unit scale `[1, 1, 1]`.
- The generated visual field terrain
  `mesh_observatory_field_micro_displacement` is also visual-only and has
  checked-in provenance/hash metadata.
- The collision layer affects traversal but does not change the rendered GLB surface.
- Walkability comes from explicit authored collision, not render geometry:
  `src/game/editor/collisionDrafts/observatoryCollisionDraft.ts` owns a 17x17
  height grid that cooks into 16 deterministic walkable mesh chunks.
- The 16 walkable chunks cover `x/z = -320..320`, use stable IDs in the
  `observatory:walkable-mesh:chunk:x*-z*` namespace, and preserve 289 vertices
  and 512 triangles of the authored surface while splitting
  runtime colliders into deterministic 5x5-vertex chunks.
- Four required `observatory_boundary_blocker` instances constrain current
  movement bounds:
  - `observatory:collision:boundary:north`
  - `observatory:collision:boundary:south`
  - `observatory:collision:boundary:east`
  - `observatory:collision:boundary:west`
- The Observatory player opts into
  `CharacterController.kinematicCollision`; the Rapier character controller
  remains behind the physics adapter and filters authored `worldStatic`
  obstacle channels.
- The water instance `observatory:water` remains visual-only and has no collider
  until a future water-volume/gameplay contract exists.

## Engine Rules Satisfied

- Render meshes never become collision truth implicitly.
- Colliders are authored component data or generated from checked-in authored
  collision drafts.
- Mesh colliders use explicit vertices and triangle indices.
- Source-art scale is baked into generated collision data; runtime
  `Transform.scale` is not hidden physics scale.
- Rapier objects and kinematic character movement internals stay behind the
  adapter.
- Runtime readiness fails when required collision prefabs, stable collision
  instances, walkable stable IDs, or player readiness are missing.
- Runtime owners import `src/game/generated/observatoryCollisionRuntime.ts`;
  runtime does not consume editor draft state or generated bake scratch data.

## AAA Engine Alignment

The implemented shape matches common AAA engine practice at this project scale:
collision is authored as a separate gameplay/physics layer, with cheap primitive
blockers where possible and deterministic triangle mesh collision only where
static irregular terrain needs precision. The Observatory render GLB and visual
terrain GLB stay visual products; traversal uses explicit collision data,
readiness checks, and adapter-owned physics projection.

Reference models:

- Unreal distinguishes simple collision, complex collision, and authored
  collision complexity settings.
- Unreal static mesh workflows start with simple bounds and allow explicit
  collision hulls or complexity only when needed.
- Unity documents primitive colliders as efficient approximations and reserves
  mesh colliders for precision cases with clear cost/rigidbody constraints.
- Unity/PhysX guidance encourages compound primitives or decomposition before
  expensive mesh collision where appropriate.

## Implemented Contract Surface

`ObservatoryCollisionContract` is implemented as a focused level-content packet
over `CollisionPolicy`, `WalkableCollisionContract`,
`KinematicCharacterCollisionContract`, `LevelReadinessContract`, and
`LevelEditorCollisionCookContract`. `TerrainVisualImportPipelineContract` and
`CookedTerrainChunkContract` are implemented as foundations through the
engine-data terrain cook contract and Observatory chunked collision product.

Owner files:

- `src/engine/data/collisionCook/index.ts`
- `src/engine/data/terrainCook/index.ts`
- `src/game/editor/collisionDrafts/observatoryCollisionDraft.ts`
- `src/game/editor/collisionDrafts/generated/observatoryCollisionBake.json`
- `src/game/generated/observatoryCollisionRuntime.ts`
- `src/game/prefabs/observatoryPrefabs.ts`
- `src/game/levels/observatoryLevel.ts`
- `src/game/levels/runtimeSceneManifests.ts`
- `src/app/editor/levelEditorSession.ts`
- `src/app/devPreview/*`
- `scripts/cook-observatory-collision.ts`
- `scripts/check-observatory-collision-drift.ts`
- `scripts/test-level-editor-collision-cook-contract.ts`
- `scripts/test-terrain-cook-contract.ts`
- `scripts/test-terrain-import-pipeline-contract.ts`
- `scripts/test-live-preview-protocol-contract.ts`
- `scripts/test-kinematic-character-contract.ts`
- `scripts/test-runtime-scene-contract.ts`

Runtime data:

- generated runtime collision module with prefab colliders, level instances, and
  readiness data
- required `observatory_walkable_mesh` walkable mesh chunk prefab
- reusable `observatory_boundary_blocker` solid blocker prefab
- stable runtime instances for all required walkable chunks and blockers
- manifest readiness entries for required collision prefab IDs, collision stable
  IDs, and walkable stable IDs

Validation surface:

- `pnpm --dir apps/game.megameal test:runtime-scene-contract`
- `pnpm --dir apps/game.megameal test:kinematic-character-contract`
- `pnpm --dir apps/game.megameal test:level-editor-collision-cook-contract`
- `pnpm --dir apps/game.megameal test:terrain-cook-contract`
- `pnpm --dir apps/game.megameal test:terrain-import-pipeline-contract`
- `pnpm --dir apps/game.megameal test:live-preview-protocol-contract`
- `pnpm --dir apps/game.megameal cook:observatory-collision`
- `pnpm --dir apps/game.megameal ci:observatory-collision-drift`
- `pnpm --dir apps/game.megameal audit:engine-boundaries`
- `pnpm --dir apps/game.megameal type-check`

## Non-Goals Preserved

- Do not use `mesh_observatory_environment` or
  `mesh_observatory_field_micro_displacement` as implicit collision.
- Do not import old `apps/game` runtime collision chunks or generated collision
  binaries.
- Do not repair missing collision in the renderer or physics adapter.
- Do not add water collision until water volumes/gameplay behavior are
  explicitly contracted.
- Do not expose Rapier mesh internals to game content or gameplay systems.
- Do not mutate arbitrary TypeScript owner files as a bake path; generated
  runtime collision output has its own owner module.

## Future Work Handed Off

The original findings packet is complete. The remaining work is intentionally
tracked elsewhere:

- asset-analysis tooling to measure the Observatory GLB bounds and visual origin
- re-authoring the player spawn after visible entrance/courtyard placement is
  confirmed
- interior blockers, steps, ramps, railings, and portal approach volumes that
  correspond to visible geometry
- persisted spatial drag handles and generalized multi-level editor authoring
- preview reversal, richer reload diagnostics, and multi-window editor feedback
- production terrain editor import UI, material/shader import, and multi-level
  import reports beyond the current contract/editor-status foundation
- terrain LOD/streaming and multi-level cooked terrain packages beyond the
  current Observatory chunk foundation
