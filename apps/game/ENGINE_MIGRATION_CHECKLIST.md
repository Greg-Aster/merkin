# Game Engine Architecture Migration Checklist

This checklist is the working migration path from the current mixed Threlte/editor/runtime architecture to a clean world/actor/component runtime modeled after Unity and Unreal patterns.

## Phase 1: Engine Contract

- [x] Define canonical engine-level `LevelDefinition`, `ActorDefinition`, and component types.
- [x] Define explicit physics, render, interaction, gameplay, audio, light, terrain, and spawn component data.
- [x] Add a legacy scene adapter so current editor scene JSON can be viewed through the new contract.
- [x] Add a central collision policy module.
- [ ] Move all runtime level loading to consume `LevelDefinition`.
- [ ] Make `Game.svelte` an app shell only.
- [ ] Make `GameCanvasStage.svelte` a world host only.

## Phase 2: World Lifecycle

- [x] Render active level before inserting the player into the physics world.
- [ ] Introduce a single `GameWorld` lifecycle owner.
- [ ] Replace ad hoc `terrainReady` with world construction phases.
- [ ] Replace spawn timers/queue retries with construction-order ownership.
- [ ] Ensure every level follows: unload old world, build static world, build physics, spawn player, enable gameplay.
- [ ] Add lifecycle diagnostics for `loading`, `building`, `playable`, `unloading`, and `error`.

## Phase 3: Terrain Runtime

- [ ] Replace `Terrain`, `TerrainManager`, `TerrainCollider`, `HeightmapSurface`, and `TerrainChunk` coordination with one `TerrainRuntime` boundary.
- [ ] Pick one production terrain collision strategy.
- [ ] Keep visual LOD separate from physics.
- [ ] Make trimesh terrain an explicit authored exception, not a default.
- [ ] Remove terrain-specific readiness events from level components.
- [ ] Wire generated terrain, editor terrain, and built-in terrain through the same component data.

## Phase 4: Collision Authoring

- [x] Centralize legacy collision resolution behind one policy module.
- [ ] Migrate from implicit solid visual objects to explicit collision intent.
- [ ] Add collision intents: `none`, `walkable`, `blocker`, `trigger`, `detailMesh`.
- [ ] Require budgets for `detailMesh`.
- [ ] Migrate current level scenes so required blockers/walkable surfaces are explicit.
- [ ] Make editor collision overlay show shape, intent, channel, and triangle budget.
- [ ] Enforce collision channels in one place.

## Phase 5: Editor/Runtime Parity

- [ ] Split `EditorSceneNode.svelte` into render, physics, interaction, gameplay, and editor gizmo renderers.
- [ ] Make editor save the same actor/component data runtime consumes.
- [ ] Keep editor-only helpers out of runtime bundles where possible.
- [ ] Remove editor/runtime duplicate scene-loading paths.
- [ ] Add import/export validation for level documents.

## Phase 6: Level Migration

- [ ] Observatory migrated to canonical `LevelDefinition`.
- [ ] Sci-Fi Room migrated to canonical `LevelDefinition`.
- [ ] Miranda migrated to canonical `LevelDefinition`.
- [ ] Solitude migrated to canonical `LevelDefinition`.
- [ ] Yggdrasil migrated to canonical `LevelDefinition`.
- [ ] Scene-authored future levels use the same path automatically.
- [ ] Star map level registry validated against migrated level definitions.

## Phase 7: Cleanup

- [ ] Move scene backup JSON files out of runtime scene directories.
- [ ] Remove legacy style systems after parity check.
- [ ] Remove duplicate interaction system.
- [ ] Remove unused/obsolete helpers and comments that refer to old architecture.
- [ ] Add an engine architecture audit script to CI.
- [ ] Add runtime smoke checks for each migrated level.

## Definition Of Done

- All levels boot through one world lifecycle.
- Runtime and editor consume the same actor/component schema.
- Player spawning is a construction step, not a timed retry.
- Terrain has one runtime interface.
- Collision is explicit, budgeted, and inspectable.
- No current level depends on implicit trimesh collision.
- Mobile performance budgets are enforced by data validation, not manual testing alone.
