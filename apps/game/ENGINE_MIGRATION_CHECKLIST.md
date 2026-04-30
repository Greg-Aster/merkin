# Game Engine Architecture Migration Checklist

This checklist is the working migration path from the current mixed Threlte/editor/runtime architecture to a clean world/actor/component runtime modeled after Unity and Unreal patterns.

## Phase 1: Engine Contract

- [x] Define canonical engine-level `LevelDefinition`, `ActorDefinition`, and component types.
- [x] Define explicit physics, render, interaction, gameplay, audio, light, terrain, and spawn component data.
- [x] Add a legacy scene adapter so current editor scene JSON can be viewed through the new contract.
- [x] Add a central collision policy module.
- [x] Add level runtime contracts for required actors, required assets, collision budgets, and asset count budgets.
- [x] Add build-report validation that can emit blocking engine errors before gameplay starts.
- [ ] Move all runtime level loading to consume `LevelDefinition`.
- [ ] Make `Game.svelte` an app shell only.
- [x] Make `GameCanvasStage.svelte` delegate world construction to `GameWorld.svelte`.

## Phase 2: World Lifecycle

- [x] Render active level before inserting the player into the physics world.
- [x] Block player spawn when a scene-authored level fails its runtime contract.
- [x] Introduce a canonical world lifecycle phase resolver for shell, level, static world, physics, spawn, playable, and error states.
- [x] Move direct `SpawnSystem.requestSpawn` calls out of level components and into the canvas/world boundary.
- [x] Replace legacy terrain readiness events with an explicit `terrainRuntimeReady` contract.
- [x] Introduce a single `GameWorld` lifecycle owner.
- [x] Move remaining world construction orchestration out of `GameCanvasStage.svelte` into the `GameWorld` owner.
- [x] Replace spawn timers/queue retries with construction-order ownership.
- [x] Ensure every level follows: unload old world, build static world, build physics, spawn player, enable gameplay.
- [x] Add lifecycle diagnostics for `loading`, `building`, `playable`, `unloading`, and `error`.

## Phase 3: Terrain Runtime

- [x] Replace `Terrain`, `TerrainManager`, `TerrainCollider`, `HeightmapSurface`, and `TerrainChunk` coordination with one `TerrainRuntime` boundary.
- [x] Pick one production terrain collision strategy.
- [x] Keep visual LOD separate from physics.
- [x] Make trimesh terrain an explicit authored exception, not a default.
- [x] Remove legacy terrain-specific readiness events from level components.
- [x] Move terrain runtime readiness translation out of level components and into the `TerrainRuntime` boundary.
- [x] Wire generated terrain, editor terrain, and built-in terrain through the same component data.

## Phase 4: Collision Authoring

- [x] Centralize legacy collision resolution behind one policy module.
- [x] Migrate from implicit solid visual objects to explicit collision intent.
- [x] Add collision intents: `none`, `walkable`, `blocker`, `trigger`, `detailMesh`.
- [x] Require budgets for `detailMesh`.
- [x] Migrate current level scenes so required blockers/walkable surfaces are explicit.
- [x] Make editor collision overlay show shape, intent, channel, and triangle budget.
- [x] Enforce collision channels in one place.

## Phase 5: Editor/Runtime Parity

- [x] Split `EditorSceneNode.svelte` into render, physics, interaction, gameplay, and editor gizmo renderers.
- [x] Make editor save the same actor/component data runtime consumes.
- [x] Keep editor-only helpers out of runtime bundles where possible.
- [x] Remove editor/runtime duplicate scene-loading paths.
- [x] Add import/export validation for level documents.

## Phase 6: Level Migration

- [x] Observatory migrated to canonical `LevelDefinition`.
- [x] Sci-Fi Room migrated to canonical `LevelDefinition`.
- [x] Miranda migrated to canonical `LevelDefinition`.
- [x] Solitude migrated to canonical `LevelDefinition`.
- [x] Yggdrasil migrated to canonical `LevelDefinition`.
- [x] Scene-authored future levels use the same path automatically.
- [x] Star map level registry validated against migrated level definitions.

## Phase 7: Cleanup

- [x] Move scene backup JSON files out of runtime scene directories.
- [x] Remove legacy style systems after parity check.
- [x] Remove duplicate interaction system.
- [x] Remove unused/obsolete helpers and comments that refer to old architecture.
- [x] Add an engine architecture audit script to CI.
- [x] Add runtime smoke checks for each migrated level.

## Definition Of Done

- All levels boot through one world lifecycle.
- Runtime and editor consume the same actor/component schema.
- Player spawning is a construction step, not a timed retry.
- Terrain has one runtime interface.
- Collision is explicit, budgeted, and inspectable.
- No current level depends on implicit trimesh collision.
- Mobile performance budgets are enforced by data validation, not manual testing alone.
