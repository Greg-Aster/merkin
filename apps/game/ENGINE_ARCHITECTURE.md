# MEGAMEAL Game Engine Architecture

This game should behave like a small production engine, not a set of level-specific Svelte scenes. Runtime levels are compiled products with explicit contracts, validation, staged loading, and performance budgets.

## Runtime Pipeline

1. Source level data is authored in editor scene files, terrain manifests, and asset metadata.
2. Source data is adapted into canonical `LevelDefinition` data.
3. `LevelDefinition` is validated against a `LevelRuntimeContract`.
4. Runtime builds the world in phases: unload old world, load required assets, build static render world, build physics world, spawn player, enable gameplay.
5. A level reaches playable state only after required actors, required assets, walkable collision, physics, and spawn are ready.

The current lifecycle owner lives in `src/threlte/core/GameWorld.svelte`, with phase resolution in `src/threlte/core/gameWorldLifecycle.ts`. Its phases are `shell-loading`, `loading-level`, `unloading`, `building-static-world`, `building-physics`, `spawning-player`, `playable`, and `error`.

Each level transition creates a fresh `GameWorld` session. That session clears prior readiness, remounts the physics world, waits for the active level to publish `staticWorldReady`, waits for physics and player component readiness, executes the player spawn command, and only then enables gameplay input.

Lifecycle diagnostics are emitted as separate runtime diagnostic records for loading, building, playable, unloading, and error states. These records are derived from the same `GameWorldLifecycleSnapshot` that controls engine readiness, so the diagnostics panel and the runtime gate cannot drift apart.

Terrain runtime is owned by `src/threlte/features/terrain/TerrainRuntime.svelte`. It coordinates `TerrainManager`, terrain visual surfaces/chunks, and terrain collider readiness behind one boundary. Production terrain collision uses baked terrain mesh artifacts declared by the level manifest with explicit source-linked provenance, for example `sourceLinked: true` and a collision bake mode tied to the same source asset contract as the visual terrain. The terrain runtime publishes `terrainRuntimeReady` with explicit `heightmapReady` and `collisionReady` state, then emits `staticWorldReady` for the level only after the baked collider is ready. Visual LOD chunks and physics collision are separate named runtime branches; visual chunk visibility never controls collision availability.

Terrain data enters that boundary through `TerrainRuntimeComponentData` from `src/threlte/features/terrain/terrainManifest.ts`. Built-in terrain manifests, editor-authored terrain manifests, and generated terrain heightmaps all adapt to this same component data shape before `TerrainRuntime.svelte` mounts. Level code should not rebuild terrain config ad hoc or bypass the component data source/runtime/collision metadata.

Runtime scene files live in `src/threlte/editor/scenes` and that directory is production-only: every JSON file in it must be a runtime-loaded `*.scene.json` document. Backup snapshots and source-history captures belong under `authoring/scene-backups` so editor/runtime globs, audits, and bundle scans cannot accidentally treat archival data as level data.

Runtime visual styling is data-driven. Level profiles and authored scene settings adapt into `RuntimeVisualStyleSettings` through `src/threlte/styles/GameplayStyleProfiles.ts`, then runtime systems consume `src/threlte/styles/runtimeVisualStyleStore.ts`. Legacy scene-traversal style systems and dev style toggles are not part of the runtime boundary.

Runtime interaction has one boundary: `src/threlte/systems/InteractionSystem.svelte`. Stars, fireflies, editor gameplay markers, and future interactable objects register with that central system instead of attaching separate canvas listeners or maintaining local raycaster loops.

Runtime prefabs are asset-only. Bake source geometry lives under `scripts/lib/runtimePrefabBakeSources` and is consumed by `scripts/bake-runtime-prefabs.mjs`; gameplay imports only the prefab catalog, asset URLs, animation descriptors, VFX descriptors, and generated GLBs. `RuntimePrefabNode.svelte` must not import bake descriptor modules or render procedural fallback geometry.

Engine CI runs game type-checking, the architecture audit, and browser smoke checks. The smoke check boots gameplay, editor mode, and each migrated level through Playwright; migrated levels must reach the explicit world lifecycle/player-spawn readiness signal without console warnings or errors.

Level components publish construction data through `src/threlte/core/levelRuntimeEvents.ts`. They emit `staticWorldReady` when their authored render/collision world is available and `playerSpawnRequested` with spawn data. `GameWorld.svelte` owns the spawn and gameplay-enable phases and calls `SpawnSystem` only after the static world, physics world, and player component are ready. `SpawnSystem` executes a single spawn command immediately; it does not queue, retry, or own lifecycle timing.

## Required Boundaries

- `Game.svelte` is the application shell.
- `GameCanvasStage.svelte` owns the canvas/global systems and delegates world construction to `GameWorld.svelte`.
- Level components provide data and authored presentation, not spawn timing or physics orchestration.
- Editor scene rendering and runtime rendering must converge on the same actor/component data.
- Editor scene nodes are transform hosts only. Rendering, physics bodies, gameplay/interaction markers, and editor gizmos live in separate renderer components so editor/runtime parity can be validated by component boundary instead of by one mixed scene node.
- Editor scene documents saved by the editor include an `engine.levelDefinition` snapshot generated from the same actor/component adapter used by runtime validation. Disk saves, local saves, and exported JSON all write that canonical runtime data.
- Editor-authored scene documents are loaded through `src/threlte/editor/editorSceneDocumentLoader.ts`. Editor view and runtime scene playback must not maintain separate disk/static/default scene lookup logic.
- Editor scene import, export, local save, and disk save run document validation through `src/threlte/editor/editorSceneDocumentValidation.ts`, including runtime `LevelDefinition` build-report validation.
- Scene-authored runtime levels render from `LevelDefinition.actors` through the runtime actor renderer. Editor scene nodes are source data only after adaptation; gameplay must not walk editor nodes during runtime scene playback.
- Component-authored runtime levels create a canonical `LevelDefinition` before player spawn. Observatory and Solitude publish terrain, spawn, and system actors through `src/threlte/engine/componentLevelDefinition.ts`, then validate the result with the same build-report path as scene-authored levels.
- Star map level entries are validated before they become navigation stars. Scene-source entries must have cooked runtime scene manifests that contain a valid `LevelDefinition`; gameplay no longer falls back to packaged editor scene data.
- Runtime files should import narrow editor stores/selectors when editor-authored data is still required. Avoid importing the broad editor barrel from runtime systems because it pulls in persistence and authoring helpers that are not needed for gameplay.
- Runtime files must not import bake-only prefab geometry descriptors from `scripts/lib/runtimePrefabBakeSources` or legacy `runtimePrefab*Meshes` source paths; `audit:chunks` enforces this boundary.
- Terrain rendering, terrain collision, and terrain authoring must share one runtime boundary.
- Collision is authored intent, not a side effect of visible geometry.

## Contracts And Budgets

Every production level needs a `LevelRuntimeContract` that defines:

- required actors that must exist before gameplay can start
- required asset actors that must be visible and resolvable
- walkable actors required for player spawn and traversal
- maximum implicit default collision actors
- maximum trimesh collision actors
- maximum runtime asset count until a cooked bundle manifest exists

Contract failures are engine errors. They should block player spawn and playable state.

## Asset Rules

- Large source assets stay out of the initial route payload.
- Runtime assets are cooked into sized, compressed, referenced artifacts.
- Collision proxies are separate runtime assets or explicit primitive colliders.
- Required assets must be declared before runtime, not discovered through failed rendering.

## Collision Rules

- Render meshes do not automatically become solid.
- Collision must declare one authored intent: `none`, `walkable`, `blocker`, `trigger`, or `detailMesh`.
- Collision must declare one canonical channel: `worldStatic`, `worldDynamic`, `player`, `trigger`, or `detail`.
- Channel normalization and intent/channel validation are centralized in `src/threlte/engine/collisionChannels.ts`; trigger intents always use the `trigger` channel and detail mesh intents always use the `detail` channel.
- `detailMesh` and trimesh collision require explicit triangle budgets.
- Visual-only actors must be declared visual-only.

## Current Migration Priority

1. Make `Game.svelte` an app shell only.
2. Close the runtime asset content backlog: missing recommended variants, LOD target misses, and explicit collision proxies.
3. Keep editor-authored defaults as authoring data only; gameplay must require cooked runtime manifests.
