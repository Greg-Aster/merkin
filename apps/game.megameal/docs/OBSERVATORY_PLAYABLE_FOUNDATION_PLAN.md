# Observatory Playable Foundation Plan

Status: implemented and validated on 2026-06-06.

## Summary

Recreate the old Observatory level in `apps/game.megameal` as a clean
target-engine scene. The old `apps/game` scene is source evidence only. This
packet creates a playable foundation: connected portal, owned source GLB visual
terrain, generated field visual terrain, explicit collision, spawn, sky, shared
water surface data, player-carried light, and deterministic three-firefly
population data.

No old `apps/game` runtime code, generated runtime scene JSON, Threlte/Svelte
lighting, terrain chunk runtime, point-light budget controller, or generated
collision binary is ported.

## Key Changes

- Add an `ObservatoryLevelContract` foundation packet through docs, content
  data, and runtime manifest ownership.
- Add runtime scene `observatory_runtime`, level `observatory`, and scene
  `observatory_game`.
- Connect the portal arena Observatory slot with
  `targetRuntimeSceneId: "observatory_runtime"`.
- Register `observatoryRuntimeSceneManifest` in `defaultRuntimeSceneManifests`
  so portal travel can resolve it through the runtime scene catalog.
- Ensure `getRuntimeSceneManifest("observatory_runtime")` resolves in focused
  validation.
- Copy source art from
  `apps/megameal/public/models/levels/observatory/observatory-environment-2026-05-20T03-59-49-020Z.glb`
  into
  `apps/game.megameal/public/assets/game/observatory/observatory-environment.glb`.
- Add manifest asset `mesh_observatory_environment` at
  `/assets/game/observatory/observatory-environment.glb`.
- Reuse `cubemap_observatory_sky`, `mesh_player`, `material_player`,
  `audio_player_jump`, and `audio_player_charge_release`.
- Add shared manifest-owned water assets through `WaterSurfaceContract`:
  - `mesh_water_plane` using the existing built-in box mesh strategy
  - `material_water_dark_still` with `color: "#050b14"`,
    `emissive: "#020711"`, `emissiveIntensity: 0.03`, `metalness: 0.12`,
    `roughness: 0.28`, `opacity: 0.92`, and `transparent: true`
- Add manifest-owned firefly marker assets:
  - `mesh_observatory_firefly_marker` using a small built-in cylinder
  - `material_observatory_firefly` with `color: "#f4ffb8"`,
    `emissive: "#f4ffb8"`, `emissiveIntensity: 1.8`, `metalness: 0`,
    and `roughness: 0.18`
- Add player spawn at `[-137.2, 1.8, -49.5]` with
  `CharacterController.groundY: 1.8` as the spawn/fallback scalar and
  `CharacterController.kinematicCollision` opt-in.
- Add player-carried point light on stable ID `player`.
- Add GLB visual entity `observatory:terrain` with unit scale `[1, 1, 1]`.
- Add Observatory V1 authored collision as a level consumer of
  `CollisionPolicy`, `WalkableCollisionContract`, and `LevelReadinessContract`:
  - required `observatory:walkable-mesh` mesh collision with
    `Collider.intent: "walkable"`, `channel: "worldStatic"`, a deterministic
    17x17 grid, 289 explicit vertices, and 512 triangles covering
    `x/z = -320..320`
  - engine-owned kinematic character collision routed through the physics
    adapter, with slide, slope-limit, snap-to-ground, autostep settings, and
    `obstacleChannels: ["worldStatic"]`
  - required `observatory_boundary_blocker` perimeter collision instances at
    `observatory:collision:boundary:north`,
    `observatory:collision:boundary:south`,
    `observatory:collision:boundary:east`, and
    `observatory:collision:boundary:west`
  - no collision inferred from `mesh_observatory_environment`
- Add character bounds `x/z = -300..300`.
- Add shared water instance `observatory:water` at `y = -2`, scale
  `[4000, 0.02, 4000]`, renderable
  `mesh_water_plane + material_water_dark_still`, and authored `WaterSurface`
  animation/reflection/refraction data. The instance has no collider and no
  gameplay volume. Richer future water behavior is tracked in
  `docs/Done/WATER_SURFACE_SYSTEM_PLAN.md`.
- Add render profile `observatory_moon_archive` using
  `cubemap_observatory_sky`, low ambient light, and no directional key/fill
  lights.
- Add deterministic `FireflyPopulationContract` data that generates three stable
  `Transform + Renderable + Light + FireflyPopulationMember` firefly instances:
  - `observatory:firefly:archive` at `[-108.5, 4.4, 68]`, scale
    `[1.25, 1.25, 1.25]`
  - `observatory:firefly:lantern` at `[72, 5.2, -92]`, scale
    `[1.1, 1.1, 1.1]`
  - `observatory:firefly:tide` at `[132, 3.6, 104]`
  - each firefly uses
    `mesh_observatory_firefly_marker + material_observatory_firefly`
  - each firefly `Light` uses `kind: "point"`, `color: "#f4ffb8"`,
    `intensity: 8`, `distance: 34`, `decay: 1.6`, and `visible: true`
- Add Observatory scene music from the old `courtyard-breeze` preset evidence.
  The old preset used `/audio/ambient/portal-deck.mp3` at volume `0.16`; the
  target engine references that through shared `audio_ambient_portal_deck`
  manifest data with `fadeSeconds: 1.5` instead of copying the old audio
  runtime.
- Keep jump and charge-release event mappings for `observatory_game`.

## Test Plan

Extend `test:runtime-scene-contract` with explicit assertions for:

- `observatory_runtime` loads, is ready, and has level ID `observatory` plus
  scene ID `observatory_game`.
- `defaultRuntimeSceneManifests` includes `observatoryRuntimeSceneManifest`, and
  `getRuntimeSceneManifest("observatory_runtime")` resolves.
- Required/preloaded assets include `mesh_observatory_environment`,
  `mesh_water_plane`, `mesh_observatory_firefly_marker`, `cubemap_observatory_sky`,
  `material_water_dark_still`, `material_observatory_firefly`,
  `audio_player_jump`, `audio_player_charge_release`, and
  `audio_ambient_portal_deck`.
- The manifest does not reference old generated runtime JSON, old terrain
  chunks, old terrain manifests, or old generated collider binaries.
- Player spawn, `CharacterController.groundY` fallback, kinematic collision
  settings, and player-carried `Light` values match this plan.
- Source terrain visual entity, terrain scale, authored walkable floor
  collision, boundary blocker collision, water transform, shared water
  renderable, and shared water material/component parameters match this plan.
- Required light stable IDs include `player`, `observatory:firefly:archive`,
  `observatory:firefly:lantern`, and `observatory:firefly:tide`.
- Each firefly marker has the expected stable ID, position, renderable
  mesh/material IDs, and point-light values.
- Removing any required player/firefly light, boundary collision, or walkable
  floor collision from the spawned report fails readiness.
- The portal arena Observatory portal targets `observatory_runtime`.
- Observatory audio content declares `audio_ambient_portal_deck` scene music at
  volume `0.16`, fade time `1.5`, and includes jump and charge-release event
  mappings for `observatory_game`.

Run:

- `pnpm --dir apps/game.megameal audit:engine-boundaries`
- `pnpm --dir apps/game.megameal type-check`
- `pnpm --dir apps/game.megameal lint`
- `pnpm --dir apps/game.megameal test:runtime-scene-contract`
- `pnpm --dir apps/game.megameal test:scene-environment-contract`
- `pnpm --dir apps/game.megameal test:water-firefly-contract`
- `pnpm --dir apps/game.megameal test:audio-contract`
- `pnpm --dir apps/game.megameal test:audio-spatial-contract`
- `pnpm --dir apps/game.megameal test:light-contract`
- `pnpm --dir apps/game.megameal test:kinematic-character-contract`
- `pnpm --dir apps/game.megameal test:level-authoring-contract`
- `pnpm --dir apps/game.megameal test:generated-glb-import-contract`
- `pnpm --dir apps/game.megameal test:terrain-import-pipeline-contract`
- `pnpm --dir apps/game.megameal test:terrain-cook-contract`
- `pnpm --dir apps/game.megameal test:level-editor-collision-cook-contract`
- `git diff --check -- apps/game.megameal pnpm-lock.yaml`

## Current Progress

- Plan file saved and updated with review feedback.
- Docs/contracts were updated with explicit catalog, water, firefly, and
  readiness requirements from review feedback.
- Content/manifests/assets were implemented:
  - `observatoryAssets.ts`
  - `waterAssets.ts`
  - `observatoryPrefabs.ts`
  - `waterPrefabs.ts`
  - `observatoryLevel.ts`
  - relevant asset, prefab, level, render profile, portal slot, runtime
    manifest, and audio manifest exports
  - copied `observatory-environment.glb`
- Runtime-scene tests were extended with the Observatory assertions above,
  including catalog resolution, shared water ownership, firefly light readiness,
  and old-runtime negative checks.
- Observatory-only water scaffolding was replaced with the shared
  `docs/Done/WATER_SURFACE_SYSTEM_PLAN.md` contract:
  - shared assets `mesh_water_plane` and `material_water_dark_still`
  - shared prefab `water_surface_plane`
  - level-owned instance `observatory:water`
- Focused validation passed:
  - `audit:engine-boundaries`
  - `type-check`
  - `lint`
  - `test:input-contract`
  - `test:charged-action-contract`
  - `test:story-note-contract`
  - `test:scene-environment-contract`
  - `test:runtime-scene-contract`
  - `build`
  - `git diff --check -- apps/game.megameal pnpm-lock.yaml`
- Follow-up scale adjustment: `observatory:terrain` now renders the source GLB
  at unit scale `[1, 1, 1]`; collision findings and the recommended next packet
  are recorded in `docs/Done/OBSERVATORY_COLLISION_SYSTEM_FINDINGS.md`.
  Follow-up validation passed for `audit:engine-boundaries`, `type-check`,
  `lint`, `test:runtime-scene-contract`, and `git diff --check`.
- Observatory V1 collision content implemented over the engine-wide collision
  contracts:
  - `observatory:walkable-mesh` is now required `walkable/worldStatic` floor
    collision with a deterministic 17x17 grid, 289 vertices, and 512 triangles.
  - four `observatory_boundary_blocker` perimeter colliders are required by
    stable ID.
  - `test:runtime-scene-contract` covers positive layout assertions and
    negative readiness failures for missing boundary/walkable collision.
- Observatory scene music was promoted from the old `courtyard-breeze` preset
  evidence through the target audio manifest contract:
  - shared production audio asset `audio_ambient_portal_deck`
  - Observatory preload/readiness requirement for that asset
  - `AudioContentManifest.sceneMusic` with volume `0.16` and
    `fadeSeconds: 1.5`
  - runtime-scene assertions proving the track is manifest-owned and selected

## Assumptions

- Reusing old source art assets is allowed; porting old runtime/editor code is
  not.
- This is a playable foundation, not full Observatory parity.
- Full terrain chunks, terrain material/shader import, procedural 200-firefly
  population tooling, live firefly flicker animation, rising water, water
  volumes, visual reflections/refraction rendering, and post-processing require
  later contracts.
- No dev server or browser smoke check is part of this packet unless explicitly
  requested.
