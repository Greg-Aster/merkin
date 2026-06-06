# Observatory Collision System Findings

Status: findings recorded on 2026-06-06.

## Current Observatory State

- The player does not spawn at the scene origin. The authored stable `player`
  instance is at `[-137.2, 1.8, -49.5]` with `CharacterController.groundY: 1.8`.
- The Observatory environment GLB is a visual asset only:
  `mesh_observatory_environment` renders
  `/assets/game/observatory/observatory-environment.glb`.
- The GLB visual instance `observatory:terrain` now uses unit scale
  `[1, 1, 1]`.
- Walkability currently comes from one explicit flat collision proxy:
  `observatory:walkable-proxy`, a fixed solid box at `[0, 1.75, 0]` with half
  extents `[320, 0.05, 320]`.
- The water instance `observatory:water` is visual-only and has no collider.
- The current playable foundation is therefore a flat traversal plane with a
  separate visual GLB. It is not full Observatory geometry collision.

## Current Engine Rules

The existing engine documents already define the correct boundary:

- Render meshes must not silently become collision truth.
- Colliders are authored component data.
- Mesh colliders must use explicit vertices and triangle indices.
- Rapier objects stay behind the adapter.
- Runtime readiness must fail when required collision prefabs or stable
  collision instances are missing.

This keeps the renderer, physics adapter, and gameplay state separated. It also
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

The next Observatory packet should add an authored collision layer instead of
turning the GLB render mesh into physics by default.

Recommended order:

1. Measure the Observatory GLB bounds and visual origin after the unit-scale
   change.
2. Re-author the player spawn against the visible level entrance or courtyard
   once the GLB placement is confirmed.
3. Replace the single flat proxy with named collision instances:
   - floor or ground traversal proxy
   - blocking volumes for walls, cliffs, or railings
   - steps or ramps where traversal needs elevation
   - portal approach and landmark blockers where needed
4. Keep these first collision instances as simple box, capsule, cylinder, or
   convex-style mesh data where possible.
5. Add a cooked static mesh collision path only for surfaces that actually need
   triangle precision, such as irregular walkable terrain.
6. Require every critical collision stable ID in runtime scene readiness.
7. Add negative tests that prove removing the floor proxy or any required
   blocking collision fails readiness.

## Non-Goals

- Do not use the render GLB as implicit collision.
- Do not import old `apps/game` runtime collision chunks or generated collision
  binaries.
- Do not repair missing collision in the renderer or physics adapter.
- Do not add water collision until a water-volume contract exists.
- Do not expose Rapier mesh internals to game content or gameplay systems.

## Proposed Follow-Up Contract

Add `ObservatoryCollisionContract` as a focused content packet:

- Owner files:
  - `src/game/prefabs/observatoryPrefabs.ts`
  - `src/game/levels/observatoryLevel.ts`
  - `src/game/levels/runtimeSceneManifests.ts`
  - `scripts/test-runtime-scene-contract.ts`
- Runtime data:
  - named collision prefabs for common Observatory blocker types
  - stable level instances for required collision surfaces
  - readiness entries for required collision prefab IDs and stable IDs
- Validation:
  - existing manifest schema validation for collider intent/channel
  - runtime-scene readiness tests for required collision
  - negative tests for removed floor/blocker collision
  - no old generated runtime paths or collider binaries

This keeps Observatory moving toward production-quality traversal while staying
inside the current engine architecture.
