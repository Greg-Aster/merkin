# Observatory Collision System Findings

Status: Observatory V1 authored proxy collision layer implemented on
2026-06-06 as a temporary level consumer of the engine-wide collision
contracts. The proxy layer is not the target-quality Observatory collision
solution.

## Current Observatory State

- The player does not spawn at the scene origin. The authored stable `player`
  instance is at `[-137.2, 1.8, -49.5]` with `CharacterController.groundY: 1.8`.
- The Observatory environment GLB currently has no matching authored or cooked
  environment collision product:
  `mesh_observatory_environment` renders
  `/assets/game/observatory/observatory-environment.glb`.
- The GLB visual instance `observatory:terrain` now uses unit scale
  `[1, 1, 1]`.
- Walkability comes from one explicit flat collision proxy:
  `observatory:walkable-proxy`, a fixed `walkable/worldStatic` box at
  `[0, 1.75, 0]` with half extents `[320, 0.05, 320]`.
- Current movement bounds are backed by four required
  `observatory_boundary_blocker` instances:
  - `observatory:collision:boundary:north`
  - `observatory:collision:boundary:south`
  - `observatory:collision:boundary:east`
  - `observatory:collision:boundary:west`
- The water instance `observatory:water` currently has no collider or water
  volume contract.
- The current playable foundation is therefore an authored proxy layer with a
  separate render GLB. This is a quality gap, not the intended final
  Observatory collision model.

## Current Engine Rules

The existing engine documents already define the correct boundary:

- Render asset IDs alone must not silently become collision truth.
- Colliders are authored component data.
- Mesh colliders must use explicit vertices and triangle indices.
- Cooked static environment collision must be an authored/cooked level-owned
  product that can be inspected, validated, and required by readiness.
- Rapier objects stay behind the adapter.
- Runtime readiness must fail when required collision prefabs or stable
  collision instances are missing.

This keeps the renderer, physics adapter, and gameplay state separated. The
engine-wide contracts remain `CollisionPolicy`, `WalkableCollisionContract`,
and `LevelReadinessContract`; Observatory only authors level content that
consumes those contracts. This also prevents the old engine problem where
generated products and renderer-side fallback behavior became implicit gameplay
rules.

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

The implemented V1 packet adds a temporary authored collision layer instead of
turning the GLB render asset ID into physics by default. It is enough to stand
up the scene, but it is not acceptable final collision for a detailed
environment GLB.

Implemented:

1. Keep the render GLB at unit scale.
2. Recast `observatory:walkable-proxy` as required `walkable/worldStatic` floor
   collision.
3. Add four named boundary collision instances around the current movement
   bounds.
4. Keep V1 collision as simple authored box proxies.
5. Require the critical floor and boundary stable IDs in runtime scene
   readiness.
6. Add negative tests that prove removing the floor proxy or a required blocker
   fails readiness.

Still future:

1. Measure the Observatory GLB bounds and visual origin with an asset-analysis
   tool.
2. Add a cooked static environment collision product for the Observatory GLB
   where visible geometry needs player-blocking or walkable behavior.
3. Re-author the player spawn against the visible level entrance or courtyard
   after visual placement is confirmed.
4. Add interior blockers, steps, ramps, railings, and portal approach volumes
   where they correspond to visible geometry.
5. Add triangle-precision static mesh collision only for surfaces that actually need
   triangle precision, such as irregular walkable terrain.

## Non-Goals

- Do not treat the render GLB asset ID as sufficient collision data.
- Do not import old `apps/game` runtime collision chunks or generated collision
  binaries.
- Do not repair missing collision in the renderer or physics adapter.
- Do not add water collision until a water-volume contract exists.
- Do not expose Rapier mesh internals to game content or gameplay systems.

## Proposed Follow-Up Contract

`ObservatoryCollisionContract` is implemented only as a focused level content
packet over the engine-wide collision contracts:

- Owner files:
  - `src/levels/observatory/prefabs.ts`
  - `src/levels/observatory/level.ts`
  - `src/levels/observatory/manifest.ts`
  - `scripts/test-runtime-scene-contract.ts`
- Runtime data:
  - required `observatory_walkable_proxy` floor collision prefab
  - reusable `observatory_boundary_blocker` collision prefab
  - stable level instances for required collision surfaces
  - readiness entries for required collision prefab IDs and stable IDs
- Validation:
  - existing manifest schema validation for collider intent/channel
  - runtime-scene readiness tests for required collision
  - negative tests for removed floor/blocker collision
  - no old generated runtime paths or collider binaries

This keeps Observatory moving toward production-quality traversal while staying
inside the current engine architecture.
