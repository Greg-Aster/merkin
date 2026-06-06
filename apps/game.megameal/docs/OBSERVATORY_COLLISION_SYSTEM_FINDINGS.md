# Observatory Collision System Findings

Status: Observatory explicit mesh walkable collision and engine-wide kinematic
character collision consumption are implemented on 2026-06-06. Editable
collision controls and a top-down gizmo surface are implemented for current
Observatory draft entries; dev-only game-window preview/reload is implemented
through validated preview messages and temporary runtime component application;
the explicit runtime collision bake writes a generated runtime owner module;
visual terrain displacement/import foundation is implemented. Persisted spatial
drag handles, generalized multi-level editing, preview reversal/richer reload
diagnostics, and the full generalized visual terrain import pipeline remain
planned.

## Current Observatory State

- The player does not spawn at the scene origin. The authored stable `player`
  instance is at `[-137.2, 1.8, -49.5]` with `CharacterController.groundY:
  1.8` retained as a spawn/fallback scalar.
- The Observatory environment GLB is a visual asset only:
  `mesh_observatory_environment` renders
  `/assets/game/observatory/observatory-environment.glb`.
- The GLB visual instance `observatory:terrain` now uses unit scale
  `[1, 1, 1]`.
- Walkability comes from one explicit deterministic mesh collision surface:
  `observatory:walkable-mesh`, a fixed `walkable/worldStatic` mesh collider
  with a 17x17 grid, 289 vertices and 512 triangles covering
  `x/z = -320..320`.
- The Observatory player opts into
  `CharacterController.kinematicCollision`, which routes movement through the
  engine physics adapter's kinematic character movement contract. The Rapier
  adapter implements that contract with Rapier's kinematic character controller
  for slide, slope, snap-to-ground, autostep behavior, and authored
  `worldStatic` obstacle-channel filtering.
- Current movement bounds are backed by four required
  `observatory_boundary_blocker` instances:
  - `observatory:collision:boundary:north`
  - `observatory:collision:boundary:south`
  - `observatory:collision:boundary:east`
  - `observatory:collision:boundary:west`
- The water instance `observatory:water` is visual-only and has no collider.
- The current playable foundation is therefore an explicit mesh collision
  layer plus a generated Observatory visual-terrain foundation. The collision
  mesh affects traversal but does not change the rendered GLB surface of the
  original Observatory environment asset. It is not implicit render-mesh
  collision or full old Observatory geometry parity.

## Current Engine Rules

The existing engine documents already define the correct boundary:

- Render meshes must not silently become collision truth.
- Colliders are authored component data.
- Mesh colliders must use explicit vertices and triangle indices.
- Collider dimensions and mesh vertices are final physics data; source-art
  scale must be baked by authoring/cook tools instead of relying on runtime
  `Transform.scale` as hidden physics scale.
- Rapier objects and Rapier's kinematic character controller stay behind the
  adapter.
- Runtime readiness must fail when required collision prefabs or stable
  collision instances are missing.

This keeps the renderer, physics adapter, and gameplay state separated. The
engine-wide contracts remain `CollisionPolicy`, `WalkableCollisionContract`,
`KinematicCharacterCollisionContract`, and `LevelReadinessContract`;
Observatory only authors level content that consumes those contracts. This also
prevents the old engine problem where generated products and renderer-side
fallback behavior became implicit gameplay rules.

## AAA Engine Findings

AAA engines use layered collision, not a single render-mesh-as-physics policy.

- Unreal Engine distinguishes simple collision from complex collision. Simple
  collision uses primitives and convex hulls; complex collision uses the
  object's triangle mesh. Unreal can use complex collision for precision on
  static objects, but the engine still exposes collision complexity as an
  explicit authored setting:
  https://dev.epicgames.com/documentation/unreal-engine/simple-versus-complex-collision-in-unreal-engine
- Unreal's static mesh collision workflow starts with simple bounds and then
  allows K-DOP, auto-convex, or multiple simple collision meshes when more shape
  fidelity is needed:
  https://dev.epicgames.com/documentation/en-us/unreal-engine/setting-up-collisions-with-static-meshes-in-unreal-engine
- Unity documents primitive colliders as efficient approximations that do not
  need to match the render mesh exactly:
  https://docs.unity.cn/Manual/primitive-colliders.html
- Unity Mesh Colliders are more accurate but cost more than primitives and have
  limits around convex versus non-convex rigidbody use:
  https://docs.unity.cn/540/Documentation/Manual/class-MeshCollider.html
- Unity's PhysX guidance recommends splitting geometry, using multiple
  primitives, compound colliders, or automatic convex decomposition when a
  single mesh collider is not appropriate:
  https://docs.unity3d.com/cn/2022.1/Manual/rigidbody-configure-colliders.html

## Target Observatory Collision Strategy

The implemented V1 packet adds an explicit collision layer instead of turning
the GLB render mesh into physics by default.

Implemented:

1. Keep the visual GLB at unit scale and visual-only.
2. Recast `observatory:walkable-mesh` as required `walkable/worldStatic` mesh
   collision with authored vertices and triangle indices.
3. Add four named boundary collision instances around the current movement
   bounds.
4. Route the Observatory player through engine-owned kinematic character
   collision, with Rapier's character controller behind the adapter and
   `worldStatic` channel filtering authored in level data.
5. Require the critical floor and boundary stable IDs in runtime scene
   readiness.
6. Add negative tests that prove removing the walkable mesh or a required blocker
   fails readiness.
7. Add `test:kinematic-character-contract` for the character movement query
   contract.

Still future:

1. Measure the Observatory GLB bounds and visual origin with an asset-analysis
   tool.
2. Re-author the player spawn against the visible level entrance or courtyard
   after visual placement is confirmed.
3. Add interior blockers, steps, ramps, railings, and portal approach volumes
   where they correspond to visible geometry.
4. Replace or regenerate the current deterministic mesh through an explicit
   cook/bake command once editable collision authoring exists.
5. Add a true visual terrain displacement/import pipeline for the rendered GLB
   or successor terrain asset; collider data must not be treated as the visual
   terrain source.

The planned owner for this next stage is the separate dev-only editor and cook
pipeline in `docs/LEVEL_EDITOR_COLLISION_COOK_PLAN.md`.

## Non-Goals

- Do not use the render GLB as implicit collision.
- Do not import old `apps/game` runtime collision chunks or generated collision
  binaries.
- Do not repair missing collision in the renderer or physics adapter.
- Do not add water collision until a water-volume contract exists.
- Do not expose Rapier mesh internals to game content or gameplay systems.

## Implemented Contract Surface

`ObservatoryCollisionContract` is implemented only as a focused level content
packet over the engine-wide collision contracts:

- Owner files:
  - `src/game/prefabs/observatoryPrefabs.ts`
  - `src/game/levels/observatoryLevel.ts`
  - `src/game/levels/runtimeSceneManifests.ts`
  - `scripts/test-runtime-scene-contract.ts`
- Runtime data:
  - required `observatory_walkable_mesh` mesh collision prefab
  - reusable `observatory_boundary_blocker` collision prefab
  - stable level instances for required collision surfaces
  - readiness entries for required collision prefab IDs and stable IDs
- Validation:
  - existing manifest schema validation for collider intent/channel
  - runtime-scene readiness tests for required collision
  - negative tests for removed floor/blocker collision
  - `test:kinematic-character-contract` for runtime character collision
  - no old generated runtime paths or collider binaries

This keeps Observatory moving toward production-quality traversal while staying
inside the current engine architecture.
