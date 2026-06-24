# Game Engine Migration Plan

Source engine: `/home/greggles/Merkin/apps/game`
Target engine: `/home/greggles/Merkin/apps/game.megameal`

Lighting status update: `AuthoredLightContract` now includes spot-light data
support, rectangle area-light data/projection, optional shadow settings for
directional/point/spot lights, explicit render-profile light-budget validation
through the content graph and `test:light-contract`, and a dev/editor-only
Miranda light authoring draft. Richer light editor controls and production
shadow/area-light tuning remain future packets.

Terrain status update: the unified terrain package/cook/streaming foundation is
active production architecture. `RuntimeSceneManifest.terrainPackages` and
`RuntimeSceneManifest.readiness.requiredTerrainPackageIds` are runtime data, not
planned-only metadata. `TerrainVisualImportPipelineContract`,
`CookedTerrainChunkContract`, and `TerrainChunkStreamingContract` own visual
chunks, collision chunks, material bindings, package manifests, startup
activation, readiness, and per-tick activation/deactivation planning. Terrain
write/drift ownership is generic `cook:terrain` plus `ci:terrain-drift`;
level-specific terrain scripts remain retired. Renderer and physics adapters
project only active ECS entities; they do not own streaming or infer gameplay
collision from render meshes. Production editor import UI, material/shader
authoring UI, and terrain package integration for newly added runtime scenes
remain future content and tooling work. Current runtime scenes with terrain or
floor surfaces are already registered through the unified package path.
`docs/TERRAIN_PACKAGE_COMPLETION_CLEANUP.md` is the focused cleanup checklist
for this terrain surface.

Current status: initial framework packet complete, normal root game scripts cut over to `@merkin/game-megameal`, `starter_runtime` added as the clean-install default runtime scene, and portal arena navigation room implemented as optional Merkin game content with manifest-owned ambient playlist music, portal activation SFX, charge-release SFX, shared spatial portal loop SFX, generated GLB field terrain, a required player-carried point light with held-charge feedback, and the manifest-owned `texture_portal_arena_equirectangular_sky` equirectangular environment asset; other current production scenes remain on their authored cubemap environments unless explicitly changed. The portal sky asset is a checked-in copy of `public/assets/skyboxes/170645ae-3f1f-47db-b920-226e61838ab7.png` at `public/assets/environment/portal-arena/portal-arena-sky-equirectangular.png`, with no generated runtime artifact. Scene-environment foundation is implemented in `docs/Done/SCENE_ENVIRONMENT_FEATURE_PLAN.md` for cubemaps, equirectangular textures, muted video skies, procedural atmosphere, bounded dynamic capture, and authored reflection probes, Miranda deck/cockpit/crew-quarters/Captain's Office/Engine Room/airlock return portal/Medbay/Mess Hall/Chapel/Brig/Cargo Hold/Archive primitive foundation plus terrain-package-owned main, upper, and cargo-hold walkable floor surfaces, old cockpit command console and Chapel monolith parity as checked-in target-engine prefabs, and three authored Miranda point lights, checked-in Miranda primitive material parameters, Miranda ambient playlist music, shared portal activation SFX, shared spatial portal loop SFX, scene-manifest charge-release SFX, nine Miranda story notes, and the StoryNote reader foundation migrated, Observatory playable foundation migrated as `observatory_runtime` with target-owned GLB art, explicit walkable mesh collision, boundary collision proxies, `worldStatic` kinematic obstacle filtering, shared water surface data through `WaterSurfaceContract`, deterministic three-firefly population data through `FireflyPopulationContract`, disabled/off post-processing profile data, player/firefly lights, manifest-owned scene music, and portal transition by manifest ID, and runtime scene negative-case validation added in `apps/game.megameal`. Legacy `@merkin/game` root aliases are retired, `start-game-manual-refresh.sh` now launches `@merkin/game-megameal`, `pnpm-workspace.yaml` excludes the ignored old `apps/game` folder, and the old `apps/game` lockfile importer is removed. Player controls have a verified desktop/mobile runtime foundation with selected-target HUD projection, scene-unload selected-target cleanup, semantic mobile touch input, and remaining consumer polish tracked in `docs/PLAYER_CONTROLS_MIGRATION_PLAN.md`. Portal arena equirectangular opt-in and remaining future sky/weather/import/cooked/probe work are tracked in `docs/Done/SKYBOX_FUTURE_FEATURES_IMPLEMENTATION_PLAN.md`; the completed shared water foundation is recorded in `docs/Done/WATER_SURFACE_SYSTEM_PLAN.md` while future shared water behavior remains deferred through `WaterSurfaceContract`. Authored Miranda point-light migration is implemented through `AuthoredLightContract`; portal player lighting is implemented through `PlayerCarriedLightContract`; Miranda primitive material parameter migration is implemented through `MaterialParameterContract`; curated scene music playlists, SFX, crossfades, and spatial listener/emitter foundation are implemented through `AudioManifestAndEvents`; Miranda terrain floor package readiness is implemented through startup readiness under `TerrainChunkStreamingContract`; engine-owned kinematic player traversal is implemented through `KinematicCharacterCollisionContract`; Observatory collision content consumes `CollisionPolicy`, `WalkableCollisionContract`, `KinematicCharacterCollisionContract`, and `LevelReadinessContract`; Observatory playable foundation is implemented through `ObservatoryLevelContract` with water owned by `WaterSurfaceContract` and current fireflies owned by `FireflyPopulationContract`. `LevelAuthoringImportValidationContract` now has an implemented foundation through the `src/engine/data/contentGraph` package and `test:level-authoring-contract`, deriving or drift-checking runtime readiness from authored assets, prefabs, levels, lights, collision, audio, and transitions before broad level scaling. The current implementation register and verification gate are in `ENGINE_CONTRACT_REGISTER.md`.

Unified terrain package/readiness/streaming is part of that current foundation:
Observatory terrain now flows through `TerrainVisualImportPipelineContract`,
`CookedTerrainChunkContract`, and `TerrainChunkStreamingContract`; broader
terrain work is rollout and authoring UX, not a renderer or physics adapter
ownership gap.

Sci Fi Room status update: `sci_fi_room_runtime` is now a playable foundation
through `SciFiRoomLevelContract`, with a portal-arena transition added only
after runtime-scene and content-graph validation passed.

Solitude status update: `solitude_runtime` is admitted as a compact
target-owned playable foundation through `SolitudeLevelContract`. Provenance is
captured in `docs/SOLITUDE_MIGRATION_PROVENANCE.md`; runtime data uses
target-owned primitive/current assets, explicit plateau/dais walkable collision
stable IDs, manifest-owned audio/environment data, and portal admission after
runtime-scene and content-graph validation. Full old generated GLB,
cooked-collision, particle/firefly, post-processing/reflection, production
lighting, and partition parity remain future work.

Yggdrasil status update: `yggdrasil_runtime` is now a direct primitive-parity
playable foundation through `YggdrasilLevelContract` and
`PrimitiveSceneContentContract`. The foundation uses the older primitive-heavy
backup as provenance, owns checked-in target content data for all `125` old
primitive nodes, derives target assets/prefabs/level instances from reusable
primitive content helpers, declares explicit primitive collision and walkable
readiness, keeps manifest-owned audio/environment data, and retains
story/portal identity markers. Old scene backups, generated runtime scene JSON,
and partition JSON are provenance only; old GLB asset parity, cooked collision
products, water, ambient particle/firefly, production lighting,
post-processing, and partition parity remain future work.

## Migration Completion Checkpoint

Status as of 2026-06-06: the migration is not finished. The current target
engine is a contract-aligned playable foundation with several migrated content
packets, not full parity with the old `apps/game` project.

Implemented foundation:

- Normal root game scripts and runtime mounting now target
  `@merkin/game-megameal`.
- `starter_runtime` is the clean-install default runtime scene.
- `portal_arena_runtime` is the optional Merkin navigation room, with
  manifest-owned `texture_portal_arena_equirectangular_sky` as its required
  equirectangular scene environment.
- `prototype_arena_runtime`, `miranda_deck_runtime`, `observatory_runtime`,
  `sci_fi_room_runtime`, `solitude_runtime`, and `yggdrasil_runtime` load
  through runtime scene manifests.
- `solitude_runtime` is an admitted target-owned playable foundation with
  explicit plateau/dais walkable collision, manifest-owned audio/environment
  data, negative validation, and a portal-arena transition.
- `yggdrasil_runtime` is an admitted direct primitive-parity playable
  foundation with all `125` old primitive nodes represented as target-owned
  content data, reusable primitive assets/prefabs/instances, explicit primitive
  collision/walkable readiness, manifest-owned audio/environment data,
  story/portal markers, negative validation, and a portal-arena transition.
- Player controls, portal interaction, story-note interaction, scene unload
  cleanup, readiness gates, audio events, authored lights, scene environments,
  water/firefly data, and content-graph validation have focused contract
  coverage.
- Old `apps/game` references in this plan are provenance citations only, not
  active runtime dependencies.

Not complete:

- Full Miranda parity is not done. Broader terrain, cooked collision, import
  coverage, and remaining generated/content parity still need owned contracts or
  cook/import pipeline work before Miranda can be marked fully ready.
- Full generated GLB import/cook parity is not done. Current validation tracks
  selected target-engine substitutions and provenance, but it is not a complete
  generated asset pipeline.
- Level editor/cook tooling is not complete. Current dev-only preview and cook
  foundations do not replace a durable multi-level authoring, bake, preview, and
  manifest-writing pipeline.
- Audio is foundation-level. Spatial emitters and mixer buses exist, but
  occlusion/obstruction, procedural held-charge audio, expanded library
  migration, authoring UI, and durable audio import/generation remain future
  work.
- Lighting is foundation-level. Authored point, spot, rectangle area, shadows,
  and budget validation exist, but production shadow tuning, area-light material
  policy, and richer editor controls remain future work.
- Observatory is a playable foundation, not a complete old-scene recreation.
  Dynamic water rendering, reflections/refraction, post-processing adapter
  behavior, water gameplay volumes, large firefly tooling, and live firefly
  animation remain future work.
- Solitude is not full legacy parity. The foundation packet resolves its old
  missing `solitude-ground-plateau` collision-manifest blocker with target-owned
  collider/readiness data, but old generated GLBs, cooked collision,
  particle/firefly parity, post-processing/reflections, production lighting, and
  world-partition behavior remain future owned contracts.
- Yggdrasil is not full legacy parity. The foundation packet now has direct
  primitive parity for the older primitive-heavy backup and is target-owned,
  validated, and disconnected from old generated runtime/partition JSON; old
  GLB asset parity, cooked collision products, partition streaming, water,
  ambient particle/firefly, production lighting, and post-processing remain
  future owned contracts.
- The ignored local `apps/game` folder is still archival/reference material
  until explicit user approval is given for deletion or final archival.

Completion rule: do not mark the migration complete until the contract register
has no active "foundation only" migration blockers for old-content parity,
durable generated/import pipelines, authoring/cook ownership, audio expansion,
lighting production tooling, Observatory parity, and old-app retirement.

## Purpose

`apps/game.megameal` is the new engine foundation. Historical `apps/game`
paths in this plan are provenance citations captured in checked-in docs, not
live runtime dependencies. The migration must extract proven contracts, data
shapes, and validation ideas without copying the old engine's accumulated
framework coupling, editor repair paths, compatibility branches, or
generated-output sprawl.

The migration rule is:

```text
Use checked-in source-evidence notes for old apps/game evidence.
Build new contracts in apps/game.megameal.
Do not import runtime code from apps/game.
```

## Non-Negotiable Guardrails

- No runtime imports from `apps/game` into `apps/game.megameal`.
- No direct Three, Threlte, Rapier, Svelte, Astro, or browser API use in `engine/core`, `engine/math`, `engine/modules`, `engine/data`, or `game`.
- No level-id special cases in generic engine code.
- No normal-path runtime repair of missing authored data.
- No normal-path editor repair or default hydration without an explicit migration command.
- No generated runtime JSON hand edits.
- No copying old Svelte/Threlte components wholesale.
- No broad level scaling from hand-maintained readiness arrays without a
  content graph/import validation contract that derives or drift-checks assets,
  prefabs, collision IDs, walkable IDs, light IDs, and transitions.
- Every migrated system needs a contract, durable validation, and a defined owner. Add focused tests only when there is a reusable test owner; do not create one-off harnesses.

## Phase 0: Freeze Old Engine Evidence

Treat any remaining local `apps/game` folder as read-only archival material.
Source evidence needed for future target-engine work must be copied into
checked-in docs or target-engine contracts before the old folder is deleted.
Already-captured `apps/game/...` paths in this plan are historical citations
only.

Allowed:

- Inspect architecture docs.
- Inspect source data shapes.
- Inspect validation behavior.
- Copy small constants or schema ideas only after rewriting them into the new target architecture.

Forbidden:

- Import from `apps/game`.
- Move old components into the new runtime.
- Preserve compatibility branches without a removal condition.
- Port old editor behavior before the runtime contract exists.

Definition of done:

- New plan exists in `apps/game.megameal`.
- Agents understand old `apps/game` references are provenance citations, not
  active runtime dependencies.
- Migration work starts in the new contract layer, not UI or renderer code.

## Completed Work Packet: Legacy Runtime Cutover

Intent: stop the normal game website/deploy path from loading the polluted
legacy `apps/game` runtime and remove root command/workspace dependencies on
the old app.

Status: root-script cutover and legacy command retirement implemented on
2026-06-06.

Implemented behavior:

- Root `dev:game`, `build:game`, `build:game:full`, `deploy:game:static`,
  `deploy:game`, and `dev:stack` now select `@merkin/game-megameal`.
- Root `deploy:game:static` deploys `apps/game.megameal/dist` to the existing
  game Pages target.
- Legacy `@merkin/game` root aliases were removed.
- `start-game-manual-refresh.sh` now starts `@merkin/game-megameal` through
  `pnpm dev:game` instead of `apps/game`.
- `pnpm-workspace.yaml` now lists active app packages explicitly and no longer
  discovers the ignored `apps/game` folder through `apps/*`.
- The obsolete `apps/game` workspace importer was removed from `pnpm-lock.yaml`.
- `apps/blender/package-scene-bridge-addon.sh` now owns packaging
  `merkin_scene_bridge.zip`; the old `apps/game` Blender package command is
  retired.
- `pnpm audit:legacy-game-references` fails active old-app package/workspace,
  root-script, source, or tooling references while allowing checked-in
  migration docs and generated provenance metadata to retain historical
  `apps/game` citations.
- No source import, component copy, or runtime bridge was added between
  `apps/game` and `apps/game.megameal`.

Remaining future work:

- Archive or remove the local ignored `apps/game` folder only after explicit
  user approval for the destructive local deletion.
- Migrate old starmap/timeline behavior only as new manifest-owned game data,
  not as the old `ThreltGame` shell.

## Phase 1: Maintain The Contract Register

Maintain `ENGINE_CONTRACT_REGISTER.md` in `apps/game.megameal`.

The register should track:

- Contract name.
- Source of truth.
- Allowed writers.
- Runtime consumers.
- Editor or authoring consumers.
- Generated outputs.
- Validation.
- Forbidden shortcut.
- Debt or compatibility removal condition.

Initial contract rows:

- `LevelDefinition`
- `RuntimeSceneManifest`
- `AssetManifest`
- `PrefabDefinition`
- `CollisionPolicy`
- `LevelReadinessContract`
- `SpawnPoint`
- `RenderProfile`
- `PhysicsAdapter`
- `RenderAdapter`
- `InteractionRegistry`
- `SaveReplayContract`

Definition of done:

- Contract register exists.
- New work packets name the contract row they touch.
- Compatibility exceptions have owners and removal conditions.

## Phase 2: Migrate Data Shapes First

Build framework-neutral contracts before runtime behavior.

Target locations:

- `src/engine/data/schemas`
- `src/engine/data/manifests`
- `src/engine/modules/assets`
- `src/engine/modules/scene`
- `src/engine/modules/physics`
- `src/engine/modules/rendering`
- `src/game/levels`
- `src/game/prefabs`

Priority order:

1. `LevelDefinition`
2. `PrefabDefinition`
3. `AssetManifest`
4. `RuntimeSceneManifest`
5. `CollisionIntent`
6. `CollisionChannel`
7. `SpawnPoint`
8. `LevelReadinessContract`
9. `RenderProfile`

Rules:

- Schemas must validate plain data.
- Runtime systems consume validated data only.
- Missing required fields fail loudly.
- Optional defaults must be documented and deterministic.
- Authored colliders must declare collision intent and channel; trigger intent must match explicit sensor data instead of being inferred from render or runtime repair.

Definition of done:

- Schemas exist.
- Invalid data fails durable validation.
- Valid examples load into engine-neutral structures.
- No renderer, physics, DOM, Svelte, or Astro imports appear in data contracts.

## Phase 3: Build One Vertical Slice

Migrate one tiny level through the new engine path.

Target flow:

```text
source data
-> runtime scene manifest
-> validation
-> asset preload
-> entity spawn
-> render sync
-> physics sync
-> player spawn
-> playable gate
```

The first level should be intentionally small:

- One floor.
- One player spawn.
- One player entity.
- One collectible or interaction target.
- One static collider.
- One renderable mesh or built-in primitive.

Do not include:

- World partition.
- Terrain streaming.
- Full editor.
- NPC/firefly system.
- Ocean.
- Post-processing.
- Multiplayer.

Definition of done:

- The level reaches playable state only after manifest, required assets, collision, spawn, physics, and player are ready.
- Removing a required asset fails validation.
- Removing spawn fails validation.
- Removing required collision fails validation.
- Missing authored collision intent/channel fails validation.
- Durable validation covers success and failure cases.

## Phase 4: Port Runtime Systems By Contract

Migrate systems in this order:

1. Asset loading and reference counting.
2. Prefab spawning.
3. Level loading.
4. Collision intent and channel validation.
5. Readiness and playable gate.
6. Player input and player controller.
7. Interaction registry.
8. Render profile and lighting policy.
9. Audio.
10. Scene environment / skybox contract.
11. Save and replay.

Porting rules:

- Extract behavior into engine-neutral systems first.
- Put third-party implementation behind adapters.
- Keep UI observational.
- Do not add old compatibility behavior unless the contract register names its removal condition.
- Delete dead migration code after each phase.

Definition of done:

- Each migrated system has a contract row.
- Each migrated system has durable validation at the owning contract boundary.
- Boundary audit still passes.
- No direct framework or renderer imports leak into core/data/modules/game.

## Phase 5: Add Guardrails As Systems Arrive

Every migrated contract must add or extend validation.

Required guardrails:

- Dependency boundary audit.
- Schema validation coverage.
- Level manifest validation coverage.
- Level authoring/import validation that derives or drift-checks readiness from
  source content before many levels are added.
- Scene load/unload leak coverage.
- Generated-output drift checks only when a durable generated-output owner exists.
- Collision policy validation.
- Asset manifest completeness validation.
- Playable gate validation.

Specific rules to audit:

- No level-id branches in generic engine code.
- No direct Three/Rapier/Svelte/Astro imports outside allowed layers.
- No browser globals outside app, UI, or browser adapter.
- No generated runtime asset edits outside owning generic import/cook tooling.
- No render mesh treated as collision without explicit collision intent.

Definition of done:

- A bad migration fails a repeatable command.
- The validation command is documented in `package.json`.
- Validation checks are narrow enough for regular agent use.

## Phase 6: Migrate Content After Runtime Contracts

Only migrate old content after the new manifest and validation paths exist.

Current durable content slice:

- `starter_runtime` is the clean-install default runtime scene. It uses built-in player, floor, prop, material, and cubemap assets, with explicit prefab collision and no Portal Arena dependency.
- `portal_arena_runtime` is the optional Merkin navigation room. It has eight authored portal slots on a generated GLB moor field, a centered player spawn, a required player-carried point light on the stable `player` entity, a content-owned GLB portal gate asset, explicit solid/world terrain collision data, a manifest-owned portal-deck scene music asset, portal activation SFX, charge-release SFX, nearest active target HUD prompt selection through world state, and manifest-ID transitions to connected runtime scenes.
- `observatory_runtime` implements the playable foundation from `docs/OBSERVATORY_PLAYABLE_FOUNDATION_PLAN.md`. It recreates the old Observatory from source art and scene evidence only, with target-owned runtime scene data, `mesh_observatory_environment`, `observatory:walkable-mesh` as required `walkable/worldStatic` terrain package collision, four required `observatory_boundary_blocker` perimeter colliders, `CharacterController.kinematicCollision` on the player for adapter-owned slide/slope/snap/autostep traversal over `worldStatic` obstacles, visual `observatory:water` through the shared `lake_water_surface` prefab plus authored `WaterSurface` animation/reflection/refraction data, `cubemap_observatory_sky`, a disabled/off post-processing profile, a player-carried light, three firefly lights generated from deterministic `FireflyPopulationContract` data, manifest-owned `audio_ambient_portal_deck` scene music from the old `courtyard-breeze` preset evidence, and portal transition by manifest ID. The Observatory terrain GLB remains visual-only; visual/collision/material chunks are engine/game data, package readiness flows through `RuntimeSceneManifest.terrainPackages`, and runtime activation flows through `TerrainChunkStreamingContract`. Current Observatory and Yggdrasil water bodies have no colliders and no gameplay volumes, and use shared `WaterSurfaceContract` assets/prefabs/components (`mesh_water_plane`, `material_water_surface`, `lake_water_surface`, `ocean_water_surface`, and `WaterSurface`) plus generic Three shader projection. The aligned packet does not import old runtime code, load old generated runtime scene JSON, restore the old terrain chunk runtime, use generated collision binaries, copy old lighting budget/controller systems, old Svelte/Howler audio systems, or make Observatory/Yggdrasil-specific water/firefly IDs the reusable owner. Explicit editable collision gizmos, richer visual reflections/refraction, water volumes, post-processing adapter implementation, production terrain editor import UI, material/shader authoring UI, terrain package integration for newly added runtime scenes, and large procedural firefly population tooling remain future contracts.
- `sci_fi_room_runtime` implements a playable foundation for the old Sci Fi Room packet. It uses old scene JSON as provenance only and owns new target-engine assets, prefabs, level data, render profile, runtime manifest, three floor surfaces through generic terrain package chunks with explicit `walkable/worldStatic` collision data, old-source player spawn, player light, kinematic collision settings, an Observatory portal by manifest ID, five target-owned `StoryNote` markers, cubemap environment data, disabled/off post-processing profile data, and scene-scoped player/portal SFX mappings. The portal arena now includes a `Sci Fi Room` slot targeting `sci_fi_room_runtime` after runtime-scene and content-graph validation pass. Full old-scene generated GLB art/collision parity, cooked collision products, post-processing/reflection rendering, richer set dressing, and durable import/cook tooling remain future contracts.
- `solitude_runtime` implements a target-owned playable foundation under `SolitudeLevelContract`. It rewrites old Solitude evidence into checked-in target assets/prefabs/level/render/audio/runtime manifest data, uses generic terrain package ownership for `solitude:ground:plateau` and `solitude:ground:dais`, resolves the old missing plateau collision manifest as target-owned terrain package/readiness data, and is linked from portal arena after validation. Old generated GLBs, cooked trimesh parity beyond the package foundation, the twelve pillar-firefly NPC groups, the large ambient particle field, old post-processing/reflection behavior, production light tuning, and old partition streaming remain future contracts.
- `yggdrasil_runtime` implements a direct primitive-parity playable foundation under `YggdrasilLevelContract` and `PrimitiveSceneContentContract`. It uses the older primitive-heavy Yggdrasil backup as provenance only, owns checked-in target content data for all `125` old primitive nodes, derives manifest assets, prefabs, level instances, collision stable IDs, and terrain package walkable chunk data through reusable primitive content helpers, includes story/portal identity markers, and is linked from portal arena after validation. Old GLB asset parity, cooked collision products beyond the package foundation, water gameplay/rendering, ambient particles/fireflies, production lighting, post-processing/reflections, and old partition streaming remain future contracts.
- `miranda_deck_runtime` migrates the old Miranda spawn, the two authored deck floor actors plus a target-engine Cargo Hold floor/bounds extension through generic terrain package walkable chunks, the three cockpit glow panel actors, the old cockpit command console, the four crew bunks, the locker bank, Captain's Desk, Captain's Chair, Recipe Safe, Engine Core, four engine columns, the airlock return portal, four Medbay pods, three Mess Hall blockers, Chapel Altar, two Chapel monoliths, four Brig cells, Brig Desk, four Cargo Hold stacks, five Archive server banks, three authored point lights, and nine story notes as checked-in target-engine data.

Legacy level inventory from `apps/game`:

The old active/deployed level registry at
`apps/game/src/threlte/levels/level-registry.json` names five legacy levels.
Miranda, Observatory, Sci Fi Room, Solitude, and Yggdrasil have target-engine
runtime foundations so far. Remaining parity work must be migrated as new
target-engine contracts, not by importing the old
Threlte/Svelte runtime, generated runtime scene JSON, or old component
ownership.

| Legacy level | Old registry source | Current target-engine status | Migration packet to add |
| --- | --- | --- | --- |
| `miranda` / Miranda Wreck | `apps/game/src/threlte/editor/scenes/miranda.scene.json`; old generated runtime scene under `apps/megameal/public/generated/runtime-game-assets/scenes/miranda.runtime-scene.json` | Partial target-engine foundation exists as `miranda_deck_runtime`; full Miranda is not ready | Continue Miranda terrain, cooked collision, generated/content parity, remaining rooms/interactions, and import/cook ownership before marking complete |
| `observatory` / Observatory | `apps/game/src/threlte/editor/scenes/observatory.scene.json`; old generated runtime scene under `apps/megameal/public/generated/runtime-game-assets/scenes/observatory.runtime-scene.json` | Playable target-engine foundation exists as `observatory_runtime` with generic terrain package/readiness/streaming ownership; full old-scene parity is not complete | Continue production terrain editor import UI, material/shader authoring UI, shader water, reflections/refraction, post-processing adapter work, water gameplay volumes, terrain package integration for future runtime scenes, and large firefly population tooling |
| `sci-fi-room` / Sci Fi Room | `apps/game/src/threlte/editor/scenes/sci-fi-room.scene.json`; old generated runtime scene under `apps/megameal/public/generated/runtime-game-assets/scenes/sci-fi-room.runtime-scene.json` | Playable target-engine foundation exists as `sci_fi_room_runtime`; full old-scene parity is not complete | Continue generated GLB art/collision parity, cooked collision/import ownership, post-processing/reflection rendering, richer set dressing, and durable authoring/import tooling before marking complete |
| `solitude` / Solitude | `apps/game/src/threlte/editor/scenes/solitude.scene.json`; old generated runtime scene under `apps/megameal/public/generated/runtime-game-assets/scenes/solitude.runtime-scene.json`; old partition at `apps/megameal/public/runtime-world-partitions/solitude.partition.json`; provenance summary in `docs/SOLITUDE_MIGRATION_PROVENANCE.md` | Playable target-owned foundation exists as `solitude_runtime`; not full legacy parity | Continue generated GLB/cooked collision parity, old particle/firefly parity, post-processing/reflection behavior, production lighting, and partition/streaming work only through future owned contracts |
| `yggdrasil` / Yggdrasil | `apps/game/src/threlte/editor/scenes/yggdrasil.scene.json`; primitive-heavy backup at `apps/game/authoring/scene-backups/yggdrasil/yggdrasil.scene.20260418-185617.original-packaged.json`; old generated runtime scene under `apps/megameal/public/generated/runtime-game-assets/scenes/yggdrasil.runtime-scene.json`; old partition at `apps/megameal/public/runtime-world-partitions/yggdrasil.partition.json`; provenance summary in `docs/YGGDRASIL_MIGRATION_PROVENANCE.md`; plan in `docs/YGGDRASIL_MIGRATION_PLAN.md` | Playable target-owned foundation exists as `yggdrasil_runtime`; not full legacy parity | Continue generated GLB/cooked collision parity, partition streaming, water gameplay/rendering, ambient particle/firefly parity, production lighting, post-processing/reflection behavior, and editor import/cook/write tooling only through future owned contracts |

Old generated readiness evidence for migrated and not-yet-migrated levels:

- `sci-fi-room` old build report had 45 actors, 29 runtime assets, three
  required walkable/collision actors, and was not publish-ready because
  `sci-fi-floor-interior-slab` had no runtime collision manifest.
  `SciFiRoomLevelContract` is the migration owner for this packet; source
  evidence from old scene JSON and old generated runtime JSON is provenance
  only, and target-engine content must be rewritten into checked-in manifests,
  prefabs, level data, render profile, collision ownership, and validation.
  Provenance to preserve before implementation:
  - Registry metadata: `apps/game/src/threlte/levels/level-registry.json`
    lines 41-55 mark the old level as active/deployed, alias
    `sci-fi-room-level`, scene source `sci-fi-room`, star-map year 2500,
    and description `Enter the Sci Fi Room`.
  - Scene settings: `apps/game/src/threlte/editor/scenes/sci-fi-room.scene.json`
    lines 7-23 define `skyboxPreset: observatory`, player spawn
    `[0, 1.5, 0]`, scene-authored ground/collision, disabled fallback
    surfaces, and the three required ground actors. Lines 25-40 state no
    render chunks and scene-authored terrain/collision as the migration mode.
  - Render profile: the old profile
    `sci-fi-room-interior-courtyard` at scene lines 111-235 uses desktop
    default quality, one shadow-casting light budget, static-environment
    reflections, and post-processing passes for tone mapping, ambient
    occlusion, color grading, bloom, and vignette. The target packet must
    translate this into the current render-profile/post-processing contracts
    honestly; unsupported effects remain explicit future work rather than
    hidden renderer defaults.
  - Walkable floors: scene lines 278-389 define
    `sci-fi-floor-interior-slab`, `sci-fi-floor-courtyard-slab`, and
    `sci-fi-floor-wasteland-tile-4-4` as primitive `walkable/worldStatic`
    surfaces. Their old sizes/positions are provenance for target-owned
    collider data; runtime traversal must not depend on old scene JSON.
  - Actor/collision summary: the old scene has 45 nodes: 3 primitive floors,
    30 prefab actors, 8 asset actors, and 4 groups. Collision intent splits
    into 3 walkable, 32 blocker, 6 trigger, and 4 non-collision group nodes.
    The generated runtime report at
    `apps/megameal/public/generated/runtime-game-assets/scenes/sci-fi-room.runtime-scene.json`
    lines 7918-7933 records 45 actors, 8 asset actors, 3 primitive actors,
    41 physics actors, and 38 trimesh actors; the runtime data also includes
    29 runtime asset URLs and 41 generated collision products. These are
    migration-sizing evidence only, not a license to load old generated JSON.
  - Readiness blocker: old runtime report lines 7998-8045 show the three
    required walkable/collision actors were present, but
    `terrain-runtime-collision-declared` failed because
    `sci-fi-floor-interior-slab` had no runtime collision manifest. The new
    packet must own explicit readiness-required collision/walkable IDs and
    focused negative-case validation before becoming playable.
  - Story/interactions: scene lines 697-727 define one Observatory portal
    trigger targeting legacy `observatory`; the target runtime should map this
    to manifest ID `observatory_runtime`. Lines 765-1168 define five note
    triggers worth migrating as target-owned `StoryNote` data:
    `sci-fi-story-pillar`, `sci-fi-story-bench`,
    `sci-fi-story-fountain`, `sci-fi-story-plant`, and
    `sci-fi-story-junk`.
  - Admission gate result: the portal-arena transition to
    `sci_fi_room_runtime` was added only after the contract row,
    target-owned assets, prefabs, level data, render profile, explicit
    collision/walkable data, readiness checks, content-graph validation, and
    runtime-scene negative tests existed and passed. Full GLB/cooked-collision
    parity remains future work.
- `solitude` old build report had 33 actors, 16 runtime assets, two required
  walkable/collision actors, and was not publish-ready because
  `solitude-ground-plateau` had no runtime collision manifest.
  `docs/SOLITUDE_MIGRATION_PROVENANCE.md` captures exact old registry, scene,
  generated runtime scene, and partition line evidence. The old files remain
  read-only provenance and must not become runtime inputs for
  `apps/game.megameal`. The target packet is a compact playable foundation:
  target-owned primitive/current assets, prefabs, level data, render profile,
  manifest-owned audio/environment data, two explicit walkable/collision
  stable IDs, and negative validation. Portal-arena admission is now linked to
  `solitude_runtime` after those checks passed. Full old generated GLB/cooked
  collision, particle/firefly, post-processing/reflection, light tuning, and partition
  parity remain future work.
- `yggdrasil` old build report had 173 actors, 100 runtime assets, 13 required
  render actors, five required collision actors, a 33-cell world partition, and
  no publish blockers, but it exceeded the old 60-runtime-asset budget.
  `YggdrasilLevelContract` and `PrimitiveSceneContentContract` now own the
  direct primitive-parity `yggdrasil_runtime` foundation. It uses the older
  primitive-heavy backup as primary provenance, represents all `125` old
  primitive nodes as target-owned content data, keeps old generated runtime
  scene and partition JSON as provenance only, and was admitted to the portal
  arena only after target-owned data plus focused runtime-scene, content-graph,
  audio, environment, story-note, boundary, type, lint, and diff
  validation passed.

Legacy-level admission rule:

- A legacy level may appear in the portal arena only after it has a checked-in
  target runtime scene manifest, manifest-owned assets, prefabs, level data,
  render profile, explicit collision/walkable IDs, player spawn, readiness data,
  content-graph validation, runtime-scene negative-case validation, and
  contract-register row.
- Old `apps/game` scene JSON and generated runtime scene JSON are provenance
  only. They must not become runtime inputs for `apps/game.megameal`.
- Generated assets from the old runtime asset folders must go through
  `GeneratedGlbImportParityContract` or a future durable generated-asset import
  contract before runtime use.
- Historical source evidence captured before archival: old Miranda scene player
  spawn and ground contract in
  `apps/game/src/threlte/editor/scenes/miranda.scene.json` lines 7-18, deck
  floors on lines 229-287, command gallery light on lines 298-310, cockpit
  parent on lines 314-319, cockpit command console and panels on lines
  320-473, cockpit story note on lines 474-496, crew-quarters primitive
  blockers on lines 557-719, crew story note on lines 720-742, Captain's
  Office primitive blockers on lines 803-903, Captain's Office story notes on
  lines 904-1008, airlock return portal on lines 1068-1094, Engine Core on
  lines 1156-1184, Engine Room equal-radius column blockers on lines
  1187-1305, Engine Room story note on lines 1310-1332, Medbay primitive
  blockers on lines 1393-1532, Medbay story note on lines 1533-1555, Mess Hall
  primitive blockers on lines 1616-1716, Mess Hall story note on lines
  1717-1739, Chapel monoliths and Chapel Altar on lines 1807-1964, Brig
  primitive blockers on lines 1966-2128, Brig story note on lines 2129-2151,
  Cargo Hold primitive blockers on lines 2212-2343, Observation Light on lines
  2354-2366, Archive server-bank primitive blockers on lines 2370-2532,
  Archive Light on lines 2534-2546, and Archive story note on lines 2549-2571.
  These paths are retained as provenance notes only; target-engine content must
  continue from checked-in `apps/game.megameal` contracts if the old folder is
  archived.
- App-level runtime manifest selection can load checked-in manifests such as `miranda_deck_runtime` without importing old runtime code or adding an editor.
- Checked-in runtime manifests carry narrow asset/prefab sets. The runtime registers the selected manifest's assets, validates renderable references against the owning manifest and preload set, and has no hidden boot preload or all-default asset-registry path.
- Miranda floor readiness preserves the old scene-authored ground contract for
  `miranda-floor-main` and `miranda-floor-upper` as explicit
  `Collider.intent: "walkable"` data, then adds a checked-in
  `miranda_floor_cargo_hold` extension so Cargo Stack C and the Brig Desk
  extent are covered by authored walkable collision before character bounds
  expand. `miranda_deck_runtime` requires `miranda:floor:main`,
  `miranda:floor:upper`, and `miranda:floor:cargo-hold` through
  `requiredWalkableStableIds`; current character bounds match the authored
  walkable footprint (`x = -20..20`, `z = -50..48`). The same current floor
  footprint is represented by checked-in draft/source data under
  `src/game/editor/collisionDrafts`, while generic runtime-scene,
  level-authoring, and terrain/collision contract tests validate readiness and
  authored character bounds without writing generated Miranda runtime files.
- The cockpit, crew-quarters, Captain's Office, Medbay, Mess Hall, Chapel, Brig, Cargo Hold, and Archive parent transforms are flattened into level-instance transforms; prefab definitions own archetype geometry/collider/material, and level instances own authored placement and stable IDs.
- Cylinder primitive support exists in the render/physics/data contracts for authored old-game cylinder blockers. The tapered Engine Core uses a parameterized Three cylinder/frustum render mesh plus an explicit authored mesh collider, without generated GLB/collider files.
- The story-note migration preserves old note title, author, location, excerpt, body, marker color, and marker size as authored `StoryNote` component data. Reusable target-engine marker prefabs own the trigger collider and marker material, gameplay systems own open/close reader state, and the HUD observes selected/open interaction world state instead of hardcoding story text or choosing targets in UI.
- The Miranda return-portal migration preserves the old airlock portal's authored
  placement and destination as a checked-in `Portal` instance targeting
  `observatory_runtime`. It uses shared `portal_gate`, `mesh_portal_gate`, and
  `audio_portal_activate` contracts, with preload and readiness validation; the
  old generated portal apparatus GLB/collider products remain excluded.
- Generated GLB parity tracking now validates the old command-console, Chapel
  monolith, and used story-marker GLBs as target-engine substitutions. The old
  green story marker and portal apparatus remain planned entries with explicit
  owner metadata and removal conditions.
- Authored point-light migration is implemented for the old Miranda Command Gallery Beacon, Observation Light, and Archive Light. Light data lives in `Light` components on checked-in level/prefab data, syncs through `LightSyncSystem` and the renderer adapter, and is required by Miranda runtime-scene readiness through stable light IDs. Portal player-carried lighting is implemented through `PlayerCarriedLightContract` as a steady `Light` on the moving stable `player` entity, with portal readiness requiring that stable light ID. Held charge now boosts and restores that player light through game-owned `ChargedAction` and `PlayerLightFeedback` state, while `LightSyncSystem` and the Three adapter project mutable light updates in place. `AuthoredLightContract` now includes spot-light schema/adapter support, rectangle area-light schema/adapter support, optional shadow settings for directional/point/spot lights, explicit render-profile light budgets enforced by `test:light-contract`/content graph validation, and a dev/editor-only Miranda light authoring draft. The old Svelte runtime lighting controller, point-light budget system, hidden player-radius culling, shockwave arrays, and renderer-local light mutation remain excluded.
- Material parameter migration preserves old primitive base color, emissive color/intensity, metalness, roughness, and Medbay transparent opacity through schema-owned material asset data. The cockpit center panel and wide Archive server bank use split material IDs because their old authored values differ from their sibling prefabs.
- Audio migration preserves the old/shared portal-deck ambience evidence from
  `packages/shared-audio/src/game-audio-profile.ts` lines 22-31 and the
  historical `apps/game/public/audio/ambient/portal-deck.mp3` path as a
  checked-in target audio asset at `public/audio/ambient/portal-deck.mp3`.
  Current target-only curated additions include
  `audio_ambient_wicked_shadows_whisper`,
  `audio_ambient_dark_shadows_of_delight`, `audio_ambient_shadow_waltz`,
  `audio_ambient_whistling_dreams`, `audio_ui_collect`, `audio_player_jump`,
  `audio_player_charge_release`, and `audio_portal_activate`. Runtime scene
  transitions stop previous scene music, apply the selected scene's manifest
  music or manifest playlist entry after readiness succeeds, and scene cleanup
  stops scene-scoped music through `SceneScope`.
- `public/audio/sfx/audition/` is source/audition material only. Runtime manifests must reference only curated production audio assets through stable manifest IDs.
- The slice deliberately does not import old runtime JSON, generated collision products, old generated GLB files, old Svelte-owned note state, old Three raycast interaction architecture, the old Svelte runtime lighting controller, point-light budget system, old Svelte/Howler audio systems, old held-charge oscillator code, post-processing, reflections, old runtime material mutation/repair, or editor behavior.
- Cargo Hold floor/bounds readiness is implemented for the currently migrated primitive slice. Source evidence showed Cargo Stack C and the Brig Desk extent beyond the old main-floor max Z, so the target adds `miranda:floor:cargo-hold` instead of only broadening bounds.
- Full Miranda is not ready: the old runtime readiness report in `apps/megameal/public/generated/runtime-game-assets/scenes/miranda.runtime-scene.json` lines 7320-7429 identified the old generated terrain-collision manifest blocker. The target now replaces that dependency for the current primitive slice with checked-in walkable floor stable IDs and a matching cook draft, but broader Miranda still needs durable terrain/cooked collision/import coverage.

Content migration order:

1. Static assets.
2. Authored level data.
3. Runtime scene manifests.
4. Collision products.
5. Spawn metadata.
6. Render profiles.
7. Area-light projection and richer production light tooling. Spot-light data,
   rectangle area-light projection, optional shadows for supported light kinds,
   and explicit light-budget validation have an implemented foundation;
   production area-light tuning, material policy, and editor controls remain
   future.
8. Audio regions.
9. Interactions.

Rules:

- Source assets and runtime assets stay separate.
- Collision assets are separate from visible render assets.
- Audio event mappings must be manifest data that references explicit audio assets.
- Sky/environment assets must be manifest data that references explicit cubemap/environment assets.
- Required runtime data must be declared, not discovered by failed rendering.
- Asset budgets must be explicit.
- Content migration must run through an owned import/generation pipeline once generation exists.
- Current hand-authored readiness arrays are transitional; broad level scaling
  requires content graph derivation or drift checks against authored assets,
  prefabs, level instances, collision intent, walkable surfaces, authored
  lights, and portal target runtime scene IDs.

Definition of done:

- One migrated level runs without old engine imports.
- Any generated files are reproducible and owned by the import/generation pipeline.
- Missing required content fails validation before runtime.
- Readiness requirements can be derived or drift-checked from authored content,
  not maintained only as isolated arrays.

## Completed Work Packet: Level Authoring Import Validation

Intent: prevent the playable-level pipeline from diverging into manual
readiness bookkeeping as more levels are added.

Status: implemented foundation on 2026-06-06. Terrain package cook/drift
ownership now exists through generic `cook:terrain` and `ci:terrain-drift`;
future non-terrain cook/import generation ownership remains planned.

Owner contract row:

- `LevelAuthoringImportValidationContract`

Implemented behavior:

- Added a focused content graph validator for current checked-in game data.
- Derive or compare each runtime scene's required asset IDs, prefab IDs,
  collision stable IDs, walkable stable IDs, required light stable IDs, and
  portal target manifest IDs from authored level, prefab, asset, render, audio,
  and transition data.
- Fail duplicate stable IDs, missing asset or prefab definitions, orphaned
  preload/readiness entries, missing portal targets, and readiness arrays that
  drift from source content.
- Keep `RuntimeSceneManifest` as the runtime load contract. The validator may
  compare against it now and can become the future cook/import owner later.
- Do not change runtime behavior, silently generate files during normal builds,
  or add a broad catch-all test file.

Definition of done:

- `test:level-authoring-contract` is the focused test owner for the content
  graph contract.
- Current portal arena, prototype arena, Miranda deck, Observatory, and Sci Fi
  Room runtime scenes pass content graph validation.
- Negative cases prove missing assets, missing readiness assets, unknown
  prefabs, duplicate stable IDs, missing walkable readiness, missing light
  readiness, stale collision IDs, and missing portal targets fail before
  runtime.
- `ENGINE_CONTRACT_REGISTER.md`, `GAME_ENGINE_DESIGN_DOCUMENT.md`, and this
  plan name the same contract and ownership boundaries.

## Completed Work Packet: Generated GLB Import Parity Contract

Intent: stop generated GLB parity from living as vague future work while still
preventing old generated files and old bake scripts from entering the runtime
without ownership.

Status: implemented foundation on 2026-06-06. Full generated GLB import and
asset-cook parity remain future work.

Owner contract row:

- `GeneratedGlbImportParityContract`

Implemented behavior:

- Added a framework-neutral generated GLB import manifest validator to the
  `src/engine/data/contentGraph` package.
- Added checked-in target game parity data in
  `src/game/assets/generatedGlbImportParity.ts`.
- Validated Miranda command-console, Chapel monolith, and used story-marker
  generated GLBs as target-engine substitutions that resolve to current asset
  IDs, prefab IDs, and stable level instance IDs.
- Requires imported target-engine generated GLBs to declare a stable generator
  ID, checked-in provenance metadata path, and generated GLB SHA-256 in the
  import parity manifest.
- Kept the old green story-marker GLB and old portal-apparatus GLB as planned
  entries with owner, contract, reason, and removal-condition metadata.
- Did not copy old generated GLB files, generated collider products, old
  runtime scene JSON, or old `apps/game` bake/import scripts.

Definition of done:

- `test:generated-glb-import-contract` validates the import parity manifest and
  negative cases for duplicate entries, missing target IDs, unknown runtime
  scenes, non-generated source URLs, missing planned metadata, missing imported
  artifact provenance, non-target generated artifact URLs, invalid generated
  artifact hashes, and drift between imported artifact metadata and checked-in
  GLB hash.
- Runtime still consumes only resolved `AssetManifest`, `PrefabDefinition`,
  `LevelDefinition`, and `RuntimeSceneManifest` data.
- The packet is a parity tracking foundation, not full generated GLB import
  parity.

## Phase 7: Delay Editor Migration

The old editor is high-risk. Do not port it wholesale.

The first approved editor direction is the new dev-only level editor and
collision cook plan in `docs/LEVEL_EDITOR_COLLISION_COOK_PLAN.md`. That plan
starts with a separate catalog-driven editor window, explicit bake/cook
commands, dev-only preview/reload, and build-time drift validation.
Observatory is the first rich collision content draft, not the editor default
or fallback. The editor must not embed editor ownership in the game HUD or
make runtime playback depend on editor state.

Current foundation: `LevelEditorCollisionCookContract` now has a dev-only
editor/cook slice. `src/engine/data/collisionCook` validates authored
collision drafts, builds deterministic in-memory cook plans, creates temporary
preview patches, and derives bake diagnostics in memory. The current Miranda
walkable floor footprint has a checked-in collision draft at
`src/game/editor/collisionDrafts/mirandaCollisionDraft.ts`; current validation
now lives in generic runtime-scene, level-authoring, and terrain/collision
contract tests instead of a Miranda-specific package command.
`src/game/editor/collisionDrafts/observatoryCollisionDraft.ts` owns the current
Observatory V1 collision draft, and
`src/game/editor/collisionDrafts/collisionDraftRegistry.ts` registers draft
content by runtime scene ID. `/editor/` opens from the checked-in runtime scene
catalog default and reports missing draft state for scenes without a registered
draft; selecting `observatory_runtime` loads the Observatory draft outside the
normal game HUD. The former Observatory-only cook/drift commands were retired;
future collision bake/write paths must be generic and manifest/catalog-driven,
while terrain package writes use `cook:terrain` and drift checks use
`ci:terrain-drift`. The former checked-in editor bake JSON was removed. The
checked-in generated runtime collision module at
`src/game/generated/observatoryCollisionRuntime.ts` remains current runtime
data until the generic terrain runtime module fully replaces the legacy
collision module; Observatory prefab, level, and manifest owners import it for
shipped collision data. Direct
collision authoring controls and first game-window preview/reload/clear
application are implemented; spatial drag handles, richer reload lifecycle
diagnostics, and generalized multi-level editing remain future packets.

Allowed early editor work:

- Minimal manifest viewer.
- Validation error display.
- Simple level selection.
- Simple spawn/collider/debug overlays.
- Observatory collision authoring and baking through
  `LevelEditorCollisionCookContract`.

Forbidden early editor work:

- Normal-path auto-repair.
- Legacy default hydration.
- Silent scene upgrades.
- Silent cook/bake during normal app build.
- Full old panel migration.
- Old editor stores as runtime dependencies.

Definition of done:

- Runtime can load validated data without the editor.
- Editor tools write only documented contracts.
- Editor repair actions are explicit commands with visible diffs.

## First Work Packet

Status: prototype runtime manifest load gate complete for the current prototype framework. Keep this section as the historical packet definition; use `ENGINE_CONTRACT_REGISTER.md` for current status.

Start with a small, enforceable packet:

1. Add `ENGINE_CONTRACT_REGISTER.md`. Done.
2. Add `LevelDefinition` schema. Done.
3. Add `RuntimeSceneManifest` schema. Done for prototype runtime loading; cooked manifest generation remains future work.
4. Add `AssetManifest` schema. Done.
5. Add a manifest validator. Done for asset and runtime scene manifests.
6. Add one tiny sample level manifest. Prototype runtime scene manifest data exists; durable generated manifest files remain future work.
7. Load that manifest through `SceneManager` and `LevelLoader`. Done for the prototype manifest path.
8. Add prototype audio content manifest data. Done for current event-to-sound mappings, portal arena scene music, Miranda scene music, Observatory scene music, manifest-driven music fade/crossfade seconds, portal activation SFX, charge-release SFX, and shared portal spatial emitters; expanded authored audio content and cooked audio manifests remain future work.
9. Register runtime manifest assets and prefabs before scene load. Done; runtime construction now uses the selected manifest as the asset/prefab source of truth.
10. Add Miranda primitive foundation. Done for the player spawn, main/upper/Cargo Hold terrain-package walkable floor chunks, three cockpit panel collision/render instances, the old cockpit command console, four crew bunk instances, the locker bank instance, Captain's Desk, Captain's Chair, Recipe Safe, Engine Core, four engine column instances, the airlock return portal, four Medbay pods, three Mess Hall blockers, Chapel Altar, two Chapel monoliths, four Brig cells, Brig Desk, four Cargo Hold stacks, five Archive server banks, three authored point-light instances, StoryNote proximity/reader foundation, and nine Miranda story-note instances; full Miranda remains future work.
11. Add app-level runtime manifest selection. Done for checked-in manifests; no in-engine level-id branches or editor dependency were added.
12. Narrow checked-in runtime manifests. Done; prototype and Miranda carry only their own asset/prefab sets, and runtime startup no longer preloads a hidden `boot` group.
13. Add durable negative-case validation. Done through `test:runtime-scene-contract`, a focused runtime-scene contract owner. Covered cases:
   - valid manifest validates,
   - missing required asset fails,
   - missing spawn fails,
   - missing required collision prefab fails,
   - missing required collision stable ID fails,
   - missing required light stable ID fails,
   - invalid `Light` component data fails,
   - invalid material asset parameters fail,
   - audio event mappings reference explicit audio assets,
   - cubemap environment missing preload fails,
   - cubemap environment missing readiness asset fails,
   - required terrain package IDs fail when package data or activation is
     missing,
   - malformed cubemap faces fail,
   - Observatory foundation requires target-owned assets, explicit collision, player/firefly lights, shared visual-only water, and portal transition by manifest ID,
   - scene cleanup releases entities/assets through the existing level-loader path.
14. Add manifest-backed skybox environment contract. Done for the current cubemap foundation: `cubemap_classic_sky` and `cubemap_observatory_sky` are checked-in target-engine cubemap assets, render profiles declare required cubemap environments, scene preload/readiness includes those assets, and the Three adapter applies loaded cubemap assets without Svelte/Threlte ownership.

## Completed Work Packet: Material Parameters

Intent: migrate the old Miranda primitive material parameters into the new
asset-manifest material contract without copying old renderer/runtime repair
code.

Status: implemented foundation on 2026-06-06.

Owner contract rows:

- `MaterialParameterContract`
- `AssetManifest`
- `RenderAdapter`
- `RuntimeSceneManifest`

Implemented behavior:

- Material asset entries may carry structured `material` parameters for base
  color, emissive color/intensity, metalness, roughness, opacity, and
  transparent mode.
- The material schema validates those values before scene load. Invalid
  colors, non-finite values, out-of-range unit values, opacity without
  transparent mode, and unknown material parameter keys fail validation.
- The Three adapter projects loaded material asset parameters into
  `MeshStandardMaterial`; gameplay and UI code do not mutate renderer material
  state.
- Existing migrated Miranda primitive prefabs preserve authored material
  differences from the old source, including the distinct cockpit center panel
  and wide archive server-bank material values.

Definition of done:

- The already-migrated Miranda primitive material assets encode old source
  emissive, emissive intensity, metalness, roughness, and Medbay opacity values.
- Split material IDs exist only where old authored values differ for already
  migrated primitive prefabs.
- Focused runtime-scene validation covers bad material parameters.
- No generated material files, URL-query material hacks, renderer-side repair,
  old Svelte/Threlte material mutation, or broad new test script is added.

## Completed Work Packet: Scene Music And SFX

Intent: migrate curated track and SFX content into the new manifest audio
contract without copying old Svelte/Threlte audio components, old held-charge
oscillator code, or editor audio-region behavior.

Status: implemented foundation on 2026-06-06.

Owner contract rows:

- `AudioManifestAndEvents`
- `AssetManifest`
- `RuntimeSceneManifest`
- `SceneScope`
- `LevelAuthoringImportValidationContract`

Implemented behavior:

- Scene music and one-shot SFX are declared in an `AudioContentManifest`,
  reference explicit manifest-owned audio assets, and validate before runtime
  use.
- Scene music supports either a single `trackId` or an ordered `trackIds`
  playlist. The runtime rotates through playlist entries on repeated scene
  loads without scanning ambient folders.
- Scene-scoped event-to-sound mappings are filtered by the active runtime scene
  so shared semantic events do not trigger inactive scene mappings.
- The browser audio adapter starts/stops looped music from the selected audio
  asset when `setMusic` is called and owns manifest-driven fade-in, fade-out,
  and crossfade scheduling through bounded `fadeSeconds`.
- Audio content manifests now own neutral `music`, `sfx`, and `spatial` mixer
  buses. Scene music, semantic event mappings, and `SoundEmitter` components
  reference those buses by stable `busId`; the browser audio adapter owns the
  corresponding Web Audio gain graph.
- Runtime scene transitions stop previous scene music and apply the selected
  scene music after the new scene and its preload assets are ready.
- Engine-owned `SoundEmitter` components project entity transforms into the
  browser audio adapter through a spatial sync system. The browser adapter owns
  Web Audio listener, panner, gain, playback, and cleanup nodes.
- Implemented content includes the old/shared `portal-deck.mp3` ambient track
  for `portal_arena_runtime`, target Miranda ambient track
  `Wicked Shadows Whisper.mp3`, promoted ambient playlist tracks
  `Dark Shadows of Delight.mp3`, `Shadow Waltz.mp3`, and
  `Whistling Dreams.mp3`, file-backed collect/jump SFX, charge-release SFX, and
  portal activation SFX.
- The shared `portal_gate` prefab owns a low-volume spatial loop using the
  production `audio_portal_cycle` asset. Portal arena and Miranda preload and
  readiness lists include the emitter sound explicitly.

Definition of done:

- `portal_arena_runtime` owns and preloads its ambient playlist, portal
  activation, jump, and charge-release audio assets.
- `miranda_deck_runtime` owns and preloads its ambient playlist, portal
  activation, jump, and charge-release audio assets.
- The audio content manifest validates scene music and event-mapping references
  against the owning asset manifest.
- Runtime-scene validation covers missing scene-music and playlist asset
  references.
- Runtime-scene validation covers active-scene filtering for scene-scoped audio
  event mappings.
- Runtime-scene validation covers mapped audio assets being preload-listed and
  readiness-required for the owning runtime scene.
- `test:audio-contract` validates scene-music fade metadata, manifest-owned
  mixer-bus references, and Web Audio adapter crossfade/bus routing without a
  browser smoke check.
- `test:audio-spatial-contract` validates listener pose sync, entity
  `SoundEmitter` projection, browser panner/gain/bus updates, and emitter
  cleanup without a browser smoke check.
- Spatial authoring UI, occlusion/obstruction, procedural held charge audio,
  expanded library migration, and durable audio import/generation remain future
  work.

Validation commands for this packet:

```bash
pnpm --dir apps/game.megameal lint
pnpm --dir apps/game.megameal test:input-contract
pnpm --dir apps/game.megameal test:charged-action-contract
pnpm --dir apps/game.megameal test:story-note-contract
pnpm --dir apps/game.megameal test:audio-contract
pnpm --dir apps/game.megameal test:audio-spatial-contract
pnpm --dir apps/game.megameal test:runtime-scene-contract
pnpm --dir apps/game.megameal audit:engine-boundaries
pnpm --dir apps/game.megameal type-check
pnpm --dir apps/game.megameal build
git diff --check -- apps/game.megameal pnpm-lock.yaml
```

## Active Work Packet: Player Controls

Intent: implement the first-person player-control contract from `docs/PLAYER_CONTROLS_MIGRATION_PLAN.md` without copying old `apps/game` runtime code.

Status: desktop/mobile runtime foundation implemented and verified on 2026-06-06. Charge-release SFX now consumes the semantic `ChargeActionReleased` event through `AudioManifestAndEvents`, held charge boosts the player-carried point light through ECS `Light` state, and nearest active target arbitration selects between active portals and story notes before HUD/activation consume the interaction. Screen-space/raycast inspect targeting, release-pulse/avatar VFX, held-charge procedural audio, and expanded input settings remain future work under `docs/PLAYER_CONTROLS_MIGRATION_PLAN.md`.

Owner contract rows:

- `InputActionMap`
- `LookActivationContract`
- `ClickInteractionContract`
- `ChargedActionContract`
- `MobileControlsContract`
- `InteractionRegistry`

Current target behavior:

- Cursor movement over the canvas does not rotate the player/camera unless held-look is active.
- Holding the look button produces sanitized look delta through the engine input contract.
- Releasing the look button, losing focus, page visibility loss, or input disablement clears look state and stale pointer deltas.
- Small press/release motion produces an `InteractAtScreenPoint` command instead of a look drag.
- Runtime interaction systems consume interaction commands, proximity candidates, and selected-target state; Svelte does not mutate portals, collectibles, NPCs, or gameplay state directly.
- `primary` runtime usage is retired in favor of explicit `look.hold`, `interact.primary`, and `charge.light` actions.
- Charge/release is represented as game-owned state and semantic events, not Svelte-local state or direct renderer/audio side effects.
- Mobile touch controls feed the same engine input, command, and event contracts as desktop/gamepad controls.

Implementation order:

1. Extend the input snapshot/action-map contract for held-look state, pointer click packets, explicit interaction, and charge action IDs.
2. Update the browser input adapter to own pointer hold/click candidate tracking and to discard pointer deltas outside active look.
3. Update player input and interaction systems to consume sanitized input and dispatch commands/events.
4. Add focused durable validation under the input contract owner; do not add a broad catch-all harness.
5. Reconcile `ENGINE_CONTRACT_REGISTER.md`, `ARCHITECTURE.md`, and this plan with the shipped behavior.

Definition of done:

- The desktop/mobile runtime foundation in `docs/PLAYER_CONTROLS_MIGRATION_PLAN.md` is satisfied, and future consumer work remains explicitly marked.
- `ENGINE_CONTRACT_REGISTER.md` does not overstate implementation status.
- `audit:engine-boundaries`, `type-check`, `lint`, `test:input-contract`, `test:charged-action-contract`, and `test:story-note-contract` pass.
- No temporary probes, broad one-off scripts, copied old player code, or stale pointer-lock compatibility paths remain.

## Completed Work Packet: Scene Environment Foundation

Intent: migrate the useful parts of the old six-face cubemap skybox system into
the new scene-environment architecture without copying the old Svelte/Threlte
runtime component.

Status: cubemap foundation implemented on 2026-06-06; expanded
scene-environment foundation implemented on 2026-06-06.

Owner contract rows:

- `SkyboxEnvironmentContract`
- `AssetManifest`
- `RenderProfile`
- `RuntimeSceneManifest`
- `LevelReadinessContract`

Implemented behavior:

- Runtime render profiles declare stable scene environment data. The default
  `portal_arena_runtime` profile now uses
  `environment.kind: "equirectangular-environment"` with
  `texture_portal_arena_equirectangular_sky`; other current production scenes
  remain on authored cubemap environments unless explicitly changed.
- Cubemap assets live in selected scene asset manifests and declare exactly six
  WebP face URLs.
- The portal arena equirectangular asset lives in the selected portal arena
  asset manifest, uses `projection: "equirectangular"`, and is a checked-in copy
  of `public/assets/skyboxes/170645ae-3f1f-47db-b920-226e61838ab7.png` at
  `public/assets/environment/portal-arena/portal-arena-sky-equirectangular.png`
  with no generated runtime artifact.
- Environment schema now accepts solid color, cubemap, equirectangular texture,
  muted video, and procedural atmosphere modes.
- Asset manifests support equirectangular texture projection metadata and muted
  video metadata for sky media.
- The Three adapter projects equirectangular textures, video skies, procedural
  atmosphere, bounded cube capture, and authored reflection probes through
  renderer-owned APIs.
- `src/game/assets/skyboxAssets.ts` declares manifest-owned cubemaps, the portal
  arena equirectangular asset, and small checked-in sample equirectangular and
  video sky assets under `public/assets/environment/samples/`.
- `portal_arena_runtime` preloads and requires its equirectangular environment
  asset. `prototype_arena_runtime`, `miranda_deck_runtime`,
  `observatory_runtime`, `sci_fi_room_runtime`, and `solitude_runtime` preload
  and require their cubemap environment assets.
- The game runtime clears old renderer environment references before scene
  unload releases the previous scene's assets.
- The Three adapter loads cubemap assets through `AssetManager` and applies
  loaded cubemap assets to `Scene.background` and `Scene.environment`.
- `test:runtime-scene-contract` covers missing preload, missing readiness, and
  malformed cubemap-face failures.
- `test:scene-environment-contract` covers accepted environment variants,
  invalid projection/video/dynamic-capture data, and reflection-probe validation.

Future work:

- Editor/import controls for sky, atmosphere, and reflection probes.
- Richer probe blending/debug visualization.
- Fog, cloud, weather, and fuller physical atmosphere integration.
- Environment quality tiers and generated/cooked environment pipelines.
- Additional production content authoring that opts non-portal scenes into
  non-cubemap modes.

## Completed Work Packet: Scene Environment Expansion

Intent: implement the saved plan in
`docs/Done/SCENE_ENVIRONMENT_FEATURE_PLAN.md` without weakening the existing
cubemap contract or introducing renderer-side fallbacks.

Status: implemented foundation on 2026-06-06.

- Framework-neutral rendering-module types exist for `solid-color`,
  `cubemap-skybox`, `equirectangular-environment`, `video-skybox`, and
  `procedural-atmosphere`.
- Rendering-module types define bounded dynamic capture settings and a
  `ReflectionProbe` component/sync system contract.
- `src/engine/data/schemas` validates environment variants, required asset
  preload/readiness, texture projection, muted video metadata, dynamic capture
  settings, and authored reflection probe components.
- The Three adapter projects cubemap, equirectangular, muted
  `equirectangular-360` video, and procedural atmosphere environments, owns
  bounded dynamic cube capture, and restores local probe material mutations.
- Checked-in sample equirectangular and video sky media are registered through
  game asset data.
- `test:scene-environment-contract` covers accepted environment variants and
  rejected projection/video/dynamic-capture/probe failures.

Remaining future work:

- Editor/import controls for authoring sky media and reflection probes.
- Higher quality probe blending/debug visualization, 180/strip video sky
  mappings, fog/cloud/weather integration, generated/cooked environment
  pipelines, and production content using the new non-cubemap modes.
- Planned follow-on packets are tracked in
  `docs/Done/SKYBOX_FUTURE_FEATURES_IMPLEMENTATION_PLAN.md`.

## Completed Work Packet: Water And Firefly Data Foundation

Intent: move the unfinished Observatory water/firefly gap into explicit
contracts without adding hidden Three renderer behavior or copying old
`apps/game` runtime code.

Status: data/runtime foundation implemented on 2026-06-06.

Owner contract rows:

- `WaterSurfaceContract`
- `FireflyPopulationContract`
- `RenderProfile`
- `ObservatoryLevelContract`

Implemented behavior:

- `src/engine/data/schemas` validates authored `WaterSurface` component data:
  surface type, scrolling/static animation parameters, reflection mode,
  refraction settings, render order, and an explicitly disabled gameplay
  volume slot.
- `src/engine/modules/rendering` exposes framework-neutral `WaterSurface`
  types and a renderer-safe projection helper that intentionally excludes
  gameplay-volume policy.
- Shared `water_surface_plane` prefab data carries default static
  `WaterSurface` settings.
- `observatory:water` overrides that shared prefab with authored scrolling
  water and environment-reflection data while staying collision-free and
  gameplay-volume-free.
- `RenderProfile` schema now accepts optional post-processing profile data;
  Observatory explicitly declares disabled/off post-processing until adapter
  implementation exists.
- `src/game/populations/fireflyPopulation.ts` creates deterministic firefly
  level instances from checked-in game-owned population data.
- `src/game/populations/fireflyPopulation.ts` also derives bounded
  deterministic flicker preview/cook samples from authored
  seed/phase/frequency/amplitude data, giving future renderer/tooling work a
  stable data source without live adapter defaults.
- Current Observatory fireflies are generated from
  `observatoryFireflyPopulation` and receive `FireflyPopulationMember`
  metadata in addition to inherited `Transform`, `Renderable`, and `Light`
  components.
- `test:water-firefly-contract` validates the current Observatory data,
  renderer-safe water projection, post-processing disabled/off data, generated
  firefly stable IDs, runtime-spawned population member metadata, and invalid
  water/firefly/post-processing data failures.

Remaining future work:

- Three adapter shader/material projection for visible wave animation.
- Visual water reflections/refraction, depth fade, foam, and shoreline blending.
- Active water gameplay volumes, underwater state, rising water, and buoyancy.
- Post-processing adapter implementation and quality controls.
- Large deterministic firefly scatter tooling, live runtime flicker animation,
  light-budget integration, and population editor controls.

Validation commands for this packet:

```bash
pnpm --dir apps/game.megameal test:water-firefly-contract
pnpm --dir apps/game.megameal audit:engine-boundaries
pnpm --dir apps/game.megameal type-check
pnpm --dir apps/game.megameal lint
pnpm --dir apps/game.megameal build
git diff --check -- apps/game.megameal pnpm-lock.yaml
```

## Explicitly Rejected From Migration

Do not migrate these patterns from `apps/game`:

- Broad Svelte/Threlte runtime ownership.
- Component-local canvas listeners or physics ownership.
- Level-specific branches in generic systems.
- Runtime quality overrides that invent unauthored policy.
- Hidden point-light or post-processing defaults without contract data.
- Runtime GLB material/light mutation as a generic repair.
- Editor load/save repairs in normal paths.
- Generated-output writes after hard validation failures.
- Large all-purpose audit scripts that are not locally runnable.
- Empty subsystem barrels, placeholder types, fake asset rows, or dependency entries for systems that do not exist yet.
- Compatibility debt without owner, reason, guardrail, and removal condition.

## Migration Principle

The old engine proves what problems are real. The new engine decides how those problems are allowed to exist.

When in doubt, migrate the contract, not the implementation.
