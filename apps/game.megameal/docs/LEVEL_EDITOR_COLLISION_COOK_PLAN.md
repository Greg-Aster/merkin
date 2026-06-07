# Level Editor And Collision Cook Plan

Status: runtime kinematic character collision consumption, data/check collision
cook foundation, the dev-only editor shell, editable collision controls, a
top-down collision gizmo surface, temporary preview-patch serialization,
game-window preview/reload/clear, derived in-memory bake diagnostics, Miranda
current-floor collision draft validation, and the Observatory visual terrain
displacement/import foundation are implemented on 2026-06-06. The generalized
terrain import/cook contract and cooked terrain chunk foundation are also
implemented on 2026-06-06.

The former explicit Observatory runtime collision bake command was retired.
`src/game/generated/observatoryCollisionRuntime.ts` remains checked-in runtime
data until a generic manifest-driven cook owner replaces it; Observatory
runtime owner files import that module.
Arbitrary TypeScript owner objects must not be rewritten by the cook path. The
current runtime bake is implemented through this owned generated runtime module;
a generalized direct runtime owner-file rewrite writer remains planned for
future bake work and must avoid mutating unrelated hand-authored TypeScript
source. The generalized terrain import/cook contract is implemented in
`src/engine/data/terrainCook`, with focused synthetic contract validation and
Observatory visual terrain/import integration. Cooked terrain chunks are
implemented as a foundation through 16 deterministic Observatory
`observatory:walkable-mesh:chunk:x*-z*` collision chunks plus boundary
blockers. Production editor import UI, material/shader import, terrain
LOD/streaming, and multi-level terrain packages remain planned.

## Current Progress Snapshot

This plan is not fully complete as a AAA-style level editor, but the current
foundation packet is implemented and validated.

Implemented:

- Engine-wide kinematic character collision consumption through the physics
  adapter contract.
- Observatory explicit walkable mesh collision and boundary blockers consumed
  through generated runtime collision data.
- A dev-only `/editor/` route separate from the normal game HUD.
- Editable Observatory collision controls for stable ID selection,
  intent/channel, box transforms, box half-extents, mesh metadata, derived
  bounds, and a top-down collision gizmo surface.
- Validated dev-only preview, reload, and clear/restoration messages between
  the editor window and game window.
- Derived in-memory bake diagnostics and retained checked-in generated runtime
  collision module data for Observatory.
- Miranda current walkable-floor draft validation for main, upper, and Cargo
  Hold floor coverage, without generating a Miranda runtime collision module.
- Generalized engine-data terrain import/cook validation through
  `src/engine/data/terrainCook`.
- 16 deterministic Observatory walkable terrain chunks with required
  collision/walkable stable IDs and drift validation.

Still planned:

- Persisting edits from the editor controls back into authored/cook source
  data.
- Spatial drag handles and a true 3D editor viewport that renders the level
  scene while editing.
- Generalized multi-level collision authoring and bake tooling.
- A generalized direct runtime owner-file rewrite writer. The current completed
  runtime bake path is the owned generated runtime collision module, not
  arbitrary hand-authored TypeScript mutation.
- Richer reload lifecycle diagnostics and multi-window preview diagnostics.
- Production terrain editor import UI, material/shader import, and multi-level
  terrain import reports.
- Terrain LOD/streaming and multi-level cooked terrain packages beyond the
  Observatory chunk foundation.

## Purpose

The next logical editor step is a separate level editor interface that can run
beside the game window, author collision and other level data, bake durable
runtime products, and let the running game preview or reload those products.

This plan is for delegation to another agent. It must stay aligned with:

- `ARCHITECTURE.md`
- `GAME_ENGINE_DESIGN_DOCUMENT.md`
- `ENGINE_CONTRACT_REGISTER.md`
- `docs/GAME_ENGINE_MIGRATION_PLAN.md`
- `docs/Done/OBSERVATORY_COLLISION_SYSTEM_FINDINGS.md`
- `docs/Done/MIGRATION_AGENT_ALIGNMENT_2026-06-06.md`
- `docs/CLEANUP_REMINDER.md`
- `docs/Done/LEVEL_AUTHORING_IMPORT_VALIDATION_PLAN.md`

## Core Decision

Build a separate dev-only editor window/tooling surface. Do not embed a level
editor into the normal game HUD or runtime scene UI.

The editor may preview and patch development state, but checked-in runtime
behavior must still come from validated engine data:

```text
Level Editor Window
  -> edits authoring data and collision volumes
  -> sends dev-only preview patches to a running game window
  -> runs explicit cook/bake actions
  -> writes durable checked-in level/prefab/manifest data

Game Window
  -> loads RuntimeSceneManifest data
  -> applies temporary preview patches only in dev/editor mode
  -> reloads the scene after a successful bake when requested
```

Normal app build should validate cooked output. It should not silently rebake
or rewrite files.

This plan is a specialized collision-authoring consumer of
`LevelAuthoringImportValidationContract`. Collision cooking must not become a
parallel readiness system. The same content graph/import validation layer must
be able to derive or compare required assets, prefab IDs, collision stable IDs,
walkable stable IDs, light stable IDs, and portal transition IDs from authored
data before runtime playback.

## AAA-Style Rationale

Large game engines separate authoring from playback:

- Editor views own placement, gizmos, selection, property panels, overlays, and
  bake commands.
- Runtime views own simulation and presentation of validated data.
- Cook steps generate runtime-ready data from authored source.
- Live iteration is data-oriented first; structural code reload is secondary
  and must not be required for normal level editing.

For this engine, that means a browser/dev editor surface plus explicit cook
commands, not old `apps/game` editor code copied into the new runtime.

## Initial Scope

The first editor packet focused on Observatory collision. Current progress is:

1. Done: open a separate editor route/window for `observatory_runtime`.
2. Partial: display authored collision overlays and a top-down gizmo surface;
   the true 3D Observatory GLB editor viewport remains future.
3. Partial: select current entries and edit box position, scale, and
   half-extents; create, duplicate, delete, rotation handles, and persisted
   spatial drag handles remain future.
4. Done for current entries: author `Collider.intent` values through editor
   controls.
5. Done for current entries: author `Collider.channel` values through editor
   controls.
6. Done: preserve stable IDs for required surfaces in the editor view model and
   cook validation.
7. Done: preview changes in a running game window through a dev-only channel,
   including explicit preview clear/restoration.
8. Done for Observatory generated runtime collision module: current durable
   target-engine data is isolated in an owned generated module; future writes
   must come through generic manifest-driven cook tooling.
9. Done for current packets: focused validation exists for the editor view
   model, collision cook contract, preview protocol, drift gate, generated GLB
   import, visual terrain, and runtime scene data.

## Implemented Runtime Slice

The first runtime-side prerequisite is implemented so cooked collision can
actually affect traversal instead of only satisfying readiness metadata:

- `PhysicsAdapterPort.computeKinematicCharacterMovement` is an engine physics
  contract for swept/sliding character movement over authored static collision.
- The Rapier adapter fulfills that contract with Rapier's kinematic character
  controller, including slide, slope, snap-to-ground, and autostep settings.
- `CharacterController.kinematicCollision.obstacleChannels` lets content choose
  which authored collider channels block character sweeps; Observatory uses
  `["worldStatic"]`.
- `observatory:walkable-mesh:chunk:x*-z*` stable IDs carry the walkable
  readiness role, with explicit mesh-collider vertices and triangle indices
  instead of a flat box.
- The Observatory player opts into `CharacterController.kinematicCollision`;
  other levels keep their existing scalar `groundY` behavior until they
  intentionally opt in.
- `test:kinematic-character-contract` validates the engine character system's
  use of the physics movement query, collider-handle requirement, opt-out
  behavior, and fallback behavior.

This runtime prerequisite did not by itself implement editor UI, preview, or
bake writing. It gives the editor/cook packets a runtime contract to target.
The current Observatory mesh collision is checked-in runtime data imported from
the generated runtime collision module. Editor bake diagnostics are derived in
memory; the former checked-in editor bake JSON was retired with the
Observatory-only cook command.

## Implemented Cook Foundation Slice

The first non-UI cook foundation is implemented without changing runtime
gameplay ownership:

- `src/engine/data/collisionCook` defines and validates authored
  collision cook draft data, builds deterministic in-memory cook plans, and
  drift-checks those plans against checked-in `RuntimeSceneManifest` data.
- `src/game/editor/collisionDrafts/observatoryCollisionDraft.ts` is the
  checked-in Observatory collision draft source for the current walkable mesh
  and four boundary blockers.
- The former Observatory-only cook/drift command has been retired. Future cook
  and write paths must be generic, manifest-driven, and reusable across levels.
- Deterministic bake data is derived in memory for editor diagnostics. Future
  generated bake artifacts need a generic manifest-driven owner before they can
  be written.
- The deterministic checked-in runtime collision module remains at
  `src/game/generated/observatoryCollisionRuntime.ts` as current runtime data
  until a generic cook owner replaces it. Observatory prefab, level, and
  runtime-manifest owners import this generated module for shipped collision
  data.
- `scripts/test-level-editor-collision-cook-contract.ts` proves invalid draft
  data, invalid preview patches, deterministic in-memory bake output, stale
  generated runtime module output, unsafe write requests, and stale cooked runtime data
  fail before runtime playback.

The draft is editor/cook source data only. Runtime level and prefab modules do
not import it. Future collision authoring UI and game-window preview
application/reload packets must extend this contract instead of introducing a
second collision-readiness system.

## Implemented Editor Boundary Skeleton

The first editor window boundary is implemented without changing normal runtime
ownership:

- `src/pages/editor.astro` is the separate `/editor/` route/window surface.
- The route loads `src/app/editor/levelEditorSession.ts` only when
  `import.meta.env.DEV` is true.
- The editor shell lists the current `observatory_runtime` session,
  `observatory_collision_draft_v1`, Observatory collision draft entry count,
  preview patch metadata, and derived bake hash.
- The normal game route and runtime systems do not import `src/app/editor` or
  `src/game/editor`.
- `test:level-editor-collision-cook-contract` validates the editor session
  summary, preview patch metadata, and derived bake hash against the Observatory
  collision draft.
- `audit:engine-boundaries` validates that normal runtime owner paths do not
  import editor modules.

This boundary now hosts the first editable Observatory collision-control
surface. It still does not implement an interactive visual GLB viewport or a
generalized visual terrain import pipeline.

## Non-Goals For The First Packet

- Do not port the old `apps/game` editor.
- Do not make Svelte/UI own runtime game state.
- Do not make the normal game HUD an editor.
- Do not silently generate files during `build`.
- Do not use render GLBs as implicit collision.
- Do not add heightfields unless a true heightmap terrain contract is added.
- Do not add a full material, lighting, audio, terrain, water, or prefab editor
  before collision authoring works.
- Do not create a broad catch-all validation script without a focused owner.

## Data Ownership

The editor should edit source authoring data and/or a narrow editor draft layer.
The bake step should emit checked-in runtime data that already fits the current
contracts:

- `PrefabDefinition`
- `LevelDefinition`
- `RuntimeSceneManifest`
- `CollisionPolicy`
- `WalkableCollisionContract`
- `KinematicCharacterCollisionContract`
- `LevelReadinessContract`
- `ObservatoryCollisionContract`
- `LevelAuthoringImportValidationContract`
- `TerrainVisualImportPipelineContract`
- `CookedTerrainChunkContract`

Runtime data remains checked-in authored or explicitly cooked data, not live
editor state.

## Collision Cook Rules

The cook pipeline should prefer the cheapest accurate-enough collision:

1. Cuboid and other primitive colliders for most floors, walls, blockers, and
   simple props.
2. Compound primitive sets for architecture, steps, railings, portal approach
   blockers, and irregular but low-detail shapes.
3. Cooked trimesh chunks only for static irregular geometry that needs
   precision.
4. Heightfield only for future true heightmap terrain, not arbitrary GLB
   architecture.

Every cooked collision output must include:

- stable ID
- prefab ID
- transform
- collider shape
- collider intent
- collider channel
- readiness requirement when it is critical to playability

The current Observatory collision product is 16 deterministic walkable mesh
chunks derived from the authored 17x17 height grid, plus four primitive
blockers. Chunk stable IDs use
`observatory:walkable-mesh:chunk:x*-z*`; source-art scale is baked into
collider vertices, chunk ordering is deterministic, and readiness links the
required collision/walkable stable IDs through runtime manifest validation.
`test:terrain-cook-contract` and `test:terrain-import-pipeline-contract` guard
the generalized terrain import/cook and chunk foundation.

Render terrain and collision terrain are separate products. Generated visual
terrain must not be used as collision, and collision mesh/collider data must
not be treated as the rendered displacement surface. Any future terrain import
pipeline must link them through provenance and validation rather than by
runtime inference.

## Live Preview Rules

Live preview should be dev-only and reversible:

- The editor sends a patch to the game window.
- The game applies it as temporary scene data, clearly separated from baked
  committed data.
- Preview patches must not bypass schema validation.
- The user can reload the current runtime scene after a bake.
- A preview patch must never be treated as shipped/runtime source of truth.

## Proposed Implementation Packets

### Packet 1: Editor Boundary

Status: implemented boundary and first authoring-control shell; full spatial
authoring UI remains future.

- Add a dev-only editor route/window entry point.
- Keep it separate from the normal game HUD.
- Add a small editor session model for selected runtime scene ID and selected
  level instance.
- Add docs and validation proving no editor code leaks into engine core or
  normal gameplay systems.

Acceptance:

- The editor window can open without changing the default game runtime scene.
- No game system imports Svelte, Astro, browser globals, or editor modules.
- `audit:engine-boundaries`, `type-check`, `lint`, and docs hygiene pass.

### Packet 2: Collision Authoring Model

Status: implemented data/check foundation for Observatory V1 collision draft
and Miranda current walkable-floor draft coverage.

- Define a narrow collision authoring draft format.
- Map draft entries to existing `Collider` and `Transform` data.
- Support cuboid creation and editing first.
- Keep stable IDs explicit.
- Target cooked walkable meshes at the implemented
  `CharacterController.kinematicCollision` runtime consumption path when
  terrain needs non-flat traversal.
- Keep Miranda in a draft/check-only mode until it has an explicit generated
  runtime output owner.

Acceptance:

- Draft data can round-trip without losing stable IDs or intent/channel values.
- Invalid intent/channel/shape data fails validation.
- No old `apps/game` editor structures are imported.

### Packet 3: Observatory Collision Editor UI

Status: implemented first editable gizmo/control surface. The current editor
has a top-down collision gizmo board, selectable stable IDs, intent/channel
controls, box position/scale controls, box half-extent controls, mesh metadata,
and derived bounds. A true 3D editor viewport that renders the Observatory GLB
remains future.

- Render collision overlays/gizmos.
- Provide selection and transform controls.
- Provide intent/channel controls.
- Keep UI as authoring presentation only.
- Render Observatory visual GLB in a future editor viewport.

Acceptance:

- Editing a cuboid changes dev preview data until an explicit bake runs.
- The game window remains independently playable.
- No editor UI is visible in normal runtime mode.

### Packet 4: Cook/Bake Command

Status: implemented derived bake-data foundation and retained checked-in
generated runtime collision module. Arbitrary TypeScript owner-object rewrite is
intentionally not used; the generated runtime module is the safer structured
runtime owner until a generic cook owner replaces it.

- Future generated write paths must use a generic manifest-driven cook command.
- Generate or update durable editor-owned bake artifacts only after that generic
  owner exists.
- Avoid silent generation during build.
- Add a drift check that fails when cooked data is stale.
- Keep generated walkable collision as explicit `Collider.shape.type: "mesh"`
  vertices and indices, or as cheaper primitives when precision is not needed.

Acceptance:

- Future generic cook commands update only their declared generated runtime
  module targets.
- Running validation after cook passes.
- Running build without cooking fails only if a drift check detects stale
  output; it does not rewrite files.

### Packet 5: Dev Preview And Reload

Status: implemented first dev-only game-window preview, reload, and clear slice.
Preview patches are validated, sent over the app-layer browser channel, applied
as temporary runtime `Transform`/`Collider` component updates for matching
stable IDs, can be explicitly cleared/restored, and same-scene reload requests
route through `RuntimeSceneTransitionPort.reloadRuntimeScene`.

- Add a dev-only preview channel between editor and game windows.
- Allow temporary preview patches and explicit scene reload after bake.
- Allow explicit preview clear/restoration without making preview state source
  data.
- Keep the runtime scene manifest as the shipped source of truth.
- Validate preview-patch messages through the collision cook preview patch
  validator before editor send and game-window application.
- Keep the game-window side as an app-layer handler/port that mutates runtime
  components through stable IDs and invokes reload through the existing runtime
  transition resource.

Acceptance:

- Preview protocol messages can be tested without committing them.
- Baked changes can request a game-window runtime scene reload.
- Invalid preview patches are rejected before application callbacks run.
- Valid preview patches can temporarily update matching runtime `Transform`
  and `Collider` components in the dev game window.
- Preview clear restores original component data for previously patched
  entities.
- Preview-only data is never included in production runtime manifests.

### Packet 6: Visual Terrain Import Pipeline

Status: implemented generalized terrain import/cook contract foundation.
Current Observatory traversal uses explicit collision data. The original
`mesh_observatory_environment` GLB remains visual-only, and the collision chunks
do not change the rendered GLB surface. Production editor import UI,
material/shader import, and multi-level terrain import reports remain future.

- `src/engine/data/terrainCook` defines the reusable terrain import/cook
  manifest, source metadata, provenance, visual output, readiness, dry-run
  write plan, generated runtime module, and runtime drift validation contract.
- `test:terrain-import-pipeline-contract` exercises the integration path across
  runtime manifest readiness, cooked chunks, editor terrain status, and no
  render-GLB collision inference.
- Render terrain and collision terrain stay linked by authored provenance,
  source scale, asset ID, stable ID, and validation metadata.

Acceptance:

- Visual terrain import/generation must be owned by a future generic command
  before any generated/imported runtime asset is checked in.
- The runtime manifest references the resolved visual asset through normal
  asset/prefab data.
- Collision still comes from explicit collider data and readiness checks.
- Visual terrain validation must fail if any future generated/imported asset,
  provenance, or collision linkage is stale.
- Production editor import UI cannot be marked complete until it has durable
  persisted import controls, material/shader import, multi-level import reports,
  and validation beyond the current contract/editor-status foundation.

Implemented foundation artifacts:

- `src/engine/data/terrainCook`
- `test:terrain-import-pipeline-contract`

### Packet 7: Richer Cooked Terrain Chunks

Status: implemented foundation. Cooked terrain chunks are implemented as a
reusable engine-data contract plus the current Observatory chunked terrain
collision product. The runtime collision bake writes 16 deterministic
Observatory walkable mesh chunks and four boundary blockers into the generated
runtime collision module. Chunk LODs, streaming partitions, and multi-level
cooked terrain packages remain future.

- `src/engine/data/terrainCook` defines the cooked terrain chunk schema,
  source-art scale bake policy, readiness derivation, runtime drift validation,
  and deterministic write-plan serialization.
- `src/game/editor/collisionDrafts/observatoryCollisionDraft.ts` derives 16
  `observatory:walkable-mesh:chunk:x*-z*` chunks from the authored 17x17
  height grid.
- Keep chunks static-collision products, not renderer GLB products.
- Record chunk stable ID namespace, source level ID, source-art scale, spatial
  bounds, vertex/index or heightfield data, channel/intent policy, readiness
  linkage, chunk hash, and deterministic ordering.
- Keep chunk generation explicit and non-writing by default; write paths need
  named generated output owners and drift checks.
- Validate chunks through the same `CollisionPolicy`,
  `WalkableCollisionContract`, `KinematicCharacterCollisionContract`, and
  `LevelReadinessContract` path.

Acceptance:

- `test:terrain-cook-contract` fails on missing chunk provenance,
  non-deterministic ordering, stale runtime readiness, render-GLB collision
  inference, or hidden runtime scale multiplication.
- A future generic cook/drift gate must prove runtime chunk data matches
  authored terrain source before any write path is reintroduced.
- Runtime consumers load chunk data through explicit collider data and never
  through render mesh inspection.
- Future LOD/streaming and multi-level chunk packages must add focused
  validation before they can be marked complete.

## Remaining AAA-Plan Validation Matrix

| Remaining item | Current status | Current/future validation command |
| --- | --- | --- |
| Editable collision gizmo UI | first control slice implemented; `/editor` exposes selectable stable IDs, intent/channel controls, editable box position/scale fields, read-only walkable mesh metadata, derived bounds, and a top-down collision gizmo surface; persistence and spatial drag handles remain future | Current: `pnpm --dir apps/game.megameal test:collision-overlay-view-model` and `pnpm --dir apps/game.megameal test:level-editor-collision-cook-contract`; future completion must add persisted edit and spatial gizmo validation |
| Live game-window preview application/reload | implemented protocol/callback slice with temporary runtime component application and reload request path; preview reversal and richer reload lifecycle remain future | Current: `pnpm --dir apps/game.megameal test:live-preview-protocol-contract` and `pnpm --dir apps/game.megameal test:level-editor-collision-cook-contract`; future `test:level-editor-preview-reload-contract` must validate reversal, reload lifecycle, and multi-window diagnostics |
| Generated runtime collision bake | implemented as an explicit generated runtime module; arbitrary TS owner-object rewrite is intentionally avoided; the former Observatory-only cook/drift commands are retired | Current: `pnpm --dir apps/game.megameal test:level-editor-collision-cook-contract`; future broader bake tooling must be generic, manifest-driven, and must not rewrite unrelated owner files |
| Miranda collision cook migration | implemented draft/check-only coverage for current main, upper, and Cargo Hold walkable floors; no Miranda generated runtime module exists yet | Current: generic runtime-scene, level-authoring, and terrain/collision contract tests; future generic bake tooling must add an explicit generated output owner before any write path exists |
| Direct runtime owner-file rewrite bake | planned; current implementation deliberately stops at the owned generated runtime collision module and does not rewrite arbitrary TypeScript owner files | Current: `pnpm --dir apps/game.megameal test:level-editor-collision-cook-contract`; future `test:level-editor-runtime-bake-writer-contract` must validate exact target files, no unrelated rewrites, generated artifact validation, and post-bake runtime validation |
| True terrain visual displacement/import pipeline | implemented generalized terrain import/cook contract; render terrain and collision terrain are separate products; production editor import UI, material/shader import, and multi-level import reports remain future | Current: `pnpm --dir apps/game.megameal test:generated-glb-import-contract`, `pnpm --dir apps/game.megameal test:terrain-import-pipeline-contract`, and `pnpm --dir apps/game.megameal test:runtime-scene-contract`; future production editor import UI validation must cover persisted import controls, material/shader import, multi-level import reports, and explicit collision linkage without treating render GLBs as collision |
| Richer cooked terrain chunks | implemented foundation with 16 deterministic Observatory walkable terrain chunks; LOD/streaming and multi-level terrain packages remain future | Current: `pnpm --dir apps/game.megameal test:terrain-cook-contract`, `pnpm --dir apps/game.megameal test:terrain-import-pipeline-contract`, `pnpm --dir apps/game.megameal test:level-editor-collision-cook-contract`, and `pnpm --dir apps/game.megameal test:kinematic-character-contract`; future LOD/streaming validation must cover chunk LODs, streaming partitions, multi-level packages, and no render-terrain collision inference |

## Validation Gate

For each implementation packet, run the focused gate for touched behavior:

```bash
pnpm --dir apps/game.megameal audit:engine-boundaries
pnpm --dir apps/game.megameal type-check
pnpm --dir apps/game.megameal lint
pnpm --dir apps/game.megameal test:runtime-scene-contract
pnpm --dir apps/game.megameal test:collision-overlay-view-model
pnpm --dir apps/game.megameal test:generated-glb-import-contract
pnpm --dir apps/game.megameal test:terrain-import-pipeline-contract
pnpm --dir apps/game.megameal test:terrain-cook-contract
pnpm --dir apps/game.megameal test:level-editor-aaa-plan-contract
pnpm --dir apps/game.megameal test:level-editor-collision-cook-contract
pnpm --dir apps/game.megameal test:live-preview-protocol-contract
git diff --check -- apps/game.megameal pnpm-lock.yaml
```

Add a focused editor/cook contract test only when the implementation has a
real owner. Do not expand `test-runtime-scene-contract.ts` with unrelated editor
behavior unless the assertion is specifically about runtime-scene data.

The implemented runtime prerequisite also requires:

```bash
pnpm --dir apps/game.megameal test:kinematic-character-contract
```

Do not run a dev server, browser smoke check, or full app smoke harness unless
the user explicitly asks.

## Progress Log

### 2026-06-06 Terrain Import And Chunk Foundation

Implemented the generalized terrain import/cook and cooked terrain chunk
foundation:

- Added `src/engine/data/terrainCook` as the engine-data owner for terrain
  source metadata, provenance, visual outputs, collision chunks, readiness
  derivation, dry-run write plans, runtime module serialization, and runtime
  drift validation.
- Added `test:terrain-cook-contract` and
  `test:terrain-import-pipeline-contract` for reusable terrain/chunk
  validation, including source-art scale bake policy, deterministic ordering,
  readiness linkage, write safety, GLB provenance, editor terrain status, and
  no render-terrain collision inference.
- Updated Observatory collision cook data to generate 16 deterministic
  `observatory:walkable-mesh:chunk:x*-z*` walkable/worldStatic mesh chunks from
  the authored 17x17 height grid, with four boundary blockers still owning
  movement bounds.
- Updated the generated Observatory collision bake and generated runtime
  collision module so runtime traversal consumes the chunked collision product.

Remaining production terrain work is editor import persistence, material/shader
import, multi-level import reports, terrain LOD/streaming, and multi-level
cooked terrain packages.

### 2026-06-06 Dev-Only Editor Boundary Skeleton

Implemented Packet 1 as a narrow editor route/window boundary:

- Added `/editor/` through `src/pages/editor.astro`.
- Added `src/app/editor/levelEditorSession.ts` as the dev editor session
  summary owner for `observatory_runtime`.
- Kept the route separate from the normal game HUD and default runtime scene.
- Extended `test:level-editor-collision-cook-contract` with editor session
  summary assertions.
- Extended `audit:engine-boundaries` with a normal-runtime import leak check
  for `src/app/editor` and `src/game/editor`.

Remaining generalized editor work is the 3D Observatory GLB viewport,
multi-level collision authoring, multi-level runtime bake support, production
terrain editor import UI, material/shader import, and multi-level import
reports.

### 2026-06-06 Editable Collision Controls

Implemented the first editable collision-control slice inside the dev-only
`/editor` route:

- `src/app/editor/levelEditorSession.ts` now projects Observatory collision
  entries into editor controls while preserving stable IDs from
  `collisionOverlayViewModel`.
- `src/pages/editor.astro` exposes selectable stable IDs, intent/channel
  controls, a top-down collision gizmo board, editable position/scale fields for
  box colliders, editable box half-extents, read-only mesh metadata for
  `observatory:walkable-mesh`, and derived bounds.
- `test:collision-overlay-view-model` validates the session/view-model editor
  fields and stable-ID preservation.

This is still a dev-only authoring surface. It does not persist edits by
itself; persistence still requires the explicit cook/bake command. Preview and
reload are handled by the separate Packet 5 app-layer channel.

### 2026-06-06 Runtime Freeze Fix

Fixed the Observatory-entry freeze caused by detaching
`computeKinematicCharacterMovement` from the Rapier adapter instance. The
movement system now calls the physics port method as an object method so the
adapter keeps its private state. `test:kinematic-character-contract` includes a
regression case that requires the physics port method's `this` binding to be
preserved.

### 2026-06-06 Retired Level-Specific Cook/Drift Commands

The earlier Observatory-only cook, drift, and terrain-generation package
commands were removed because the engine contract does not allow one-off
per-level cook scripts as durable ownership. The retained code is the reusable
engine-data validation surface plus checked-in generated runtime/provenance data
that is already consumed by current runtime content. Future bake/write paths
must be generic, manifest-driven, non-writing by default, and validated by
focused contract tests.

### 2026-06-06 Generated Runtime Collision Module Bake

Implemented the direct runtime bake slice as a generated runtime data module
instead of arbitrary TypeScript object rewrites:

- `src/game/generated/observatoryCollisionRuntime.ts` is the checked-in runtime
  collision module retained from the retired cook command.
- `src/game/prefabs/observatoryPrefabs.ts`,
  `src/game/levels/observatoryLevel.ts`, and
  `src/game/levels/runtimeSceneManifests.ts` import the generated module for
  Observatory collider, collision instance, and collision-readiness data.
- There is currently no package-exposed runtime collision write path. Future
  writes must go through a generic manifest-driven cook owner, not a
  level-specific command.
- The cook write plan includes the generated TypeScript module as an explicit
  `runtime-collision-module` artifact, while retaining JSON dry-run payloads for
  prefab colliders, level instances, and readiness.
- Write-safety validation rejects unexpected target files, dirty unexpected
  targets supplied by callers, invalid runtime drift supplied by callers, and
  overwriting an existing generated module that does not carry the
  `collisionCook.runtimeModule.v1` marker.

This keeps editor draft/provenance artifacts separate from shipped runtime data
while avoiding ad hoc string replacement across hand-authored TypeScript owner
files.

### 2026-06-06 Preview Patch And Generated Bake Artifact

Implemented as a dev-only editor/cook foundation:

- Added deterministic `CollisionCookPreviewPatch` and
  `CollisionCookBakeFileData` serialization in the
  `src/engine/data/collisionCook` package.
- Kept `test:level-editor-collision-cook-contract` as the focused validation
  owner for derived bake/runtime data consistency.
- Kept normal runtime data independent from editor draft and derived bake state.

### 2026-06-06 Packet 5 Protocol Progress

Implemented the live preview/reload/clear protocol slice without moving editor
state into normal runtime systems:

- Added protocol message validation to `src/engine/data/collisionCook`
  for `collision-preview-patch`, `clear-collision-preview`, and
  `reload-runtime-scene` messages.
- Added `src/app/devPreview` as the app-layer game-window preview port and
  browser `BroadcastChannel` transport owner.
- Added `src/app/editor/levelEditorPreviewSender.ts` and
  `LevelEditorPreviewControls.svelte` so the `/editor/` route can send
  validated preview and reload messages. The editor control builds preview
  patches from current form values before sending.
- Added game-window application in `src/app/browserGameClient.ts` through the
  `src/app/devPreview` port. It applies temporary preview patches to runtime
  entities by stable ID, restores original component data on explicit clear,
  and reloads through `RuntimeSceneTransitionPort`.
- Added `RuntimeSceneTransitionPort.reloadRuntimeScene` as the explicit
  same-scene reload path without changing normal portal travel behavior.
- Added `test:live-preview-protocol-contract` for valid protocol messages,
  invalid patch rejection, clear request shape, reload request shape, callback
  routing, runtime component application/restoration, missing-stable-ID
  reporting, and editor-module leak prevention.

### 2026-06-06 Miranda Collision Draft Coverage

Implemented a draft/check-only migration slice for Miranda's current walkable
floor footprint:

- Added `src/game/editor/collisionDrafts/mirandaCollisionDraft.ts` for the
  current readiness-required Miranda main, upper, and Cargo Hold walkable floor
  coverage.
- Miranda-specific package validation was retired with the other one-off
  commands. Current coverage belongs in generic runtime-scene,
  level-authoring, and terrain/collision contract tests.
- Kept Miranda without a generated runtime collision module until a future
  generic output owner exists.

### 2026-06-06 Collision Cook Data/Check Foundation

Implemented as a non-runtime editor/cook foundation:

- Added the engine-owned collision cook draft contract and deterministic
  in-memory cook plan helper in `src/engine/data/collisionCook`.
- Added `observatory_collision_draft_v1` as checked-in editor/cook source data
  for the current Observatory walkable terrain chunks and four boundary
  blockers.
- Added `test:level-editor-collision-cook-contract` for invalid draft data and
  stale runtime-output drift cases.
- Kept runtime level/prefab modules independent from editor draft data.

### 2026-06-06 Runtime Collision Consumption

Implemented as an engine-wide prerequisite for the editor/cook pipeline:

- Added `KinematicCharacterCollisionContract` to the engine contract register.
- Added `PhysicsAdapterPort.computeKinematicCharacterMovement` as the
  framework-neutral character traversal query.
- Updated the Rapier adapter to fulfill the query with Rapier's kinematic
  character controller, keeping raw Rapier controller/collider objects behind
  the adapter boundary.
- Updated kinematic body sync to use Rapier's next-kinematic transform path
  when available.
- Updated `CharacterController` authored data with `kinematicCollision`
  settings for slide, slope, snap-to-ground, autostep, and `worldStatic`
  obstacle filtering.
- Replaced Observatory's old flat walkable collision box with explicit
  `observatory:walkable-mesh:chunk:x*-z*` deterministic mesh collision chunks
  derived from the authored 17x17 height grid and kept readiness tied to those
  authored chunk stable IDs.
- Added/used focused validation through `test:kinematic-character-contract`
  and updated runtime-scene assertions for Observatory mesh collision.

Not implemented in this slice:

- Generalized multi-level runtime bake writer beyond the Observatory generated
  collision module.

### 2026-06-06 Parallel Agent Assistance

Six sub-agents were spawned to review independent slices without editing files:

- Engine physics contract review: `src/engine/modules/physics/index.ts`,
  `src/game/systems/movement.ts`, and contract-register alignment.
- Rapier adapter review: controller lifecycle, filtering, kinematic sync, and
  cleanup in `src/engine/adapters/rapier/index.ts`.
- Observatory content review: mesh collider data, stable IDs,
  `kinematicCollision`, and readiness data.
- Validation review: `test:kinematic-character-contract`,
  `test:runtime-scene-contract`, package scripts, and missing assertions.
- Documentation consistency review across architecture, design, register, cook
  plan, migration plan, and Observatory findings.
- Architecture/cruft review for boundary leaks, old `apps/game` imports,
  orphan scripts/docs, and cleanup risks.

Returned findings were folded into this plan and implementation:

- keep `observatory:walkable-mesh:chunk:x*-z*` terminology instead of old proxy
  wording
- document the runtime slice as deterministic mesh collision, not a cooked
  terrain visual product
- add explicit catalog/readiness/assertion coverage for the traversal path
- fix the Rapier ray-hit compatibility issue while keeping raycast as a query
  utility, not the final player movement owner
- add channel-aware character obstacle filtering
- document that collision cook output must bake source-art scale into collider
  dimensions or mesh vertices

## Completion Criteria

Current judgment: the foundation slice is complete; the full AAA-style level
editor/collision cook plan is not complete yet.

Foundation criteria currently met:

- The editor opens separately from the game window.
- Current Observatory collision entries can be inspected and edited through
  dev-only controls, then previewed in the game window.
- The game window can reload the current runtime scene and clear preview state
  through explicit dev-only messages.
- Observatory baked output is durable, checked-in, reproducible, and drift
  checked through the generated runtime collision module.
- Runtime scene readiness requires the baked critical collision.
- The normal game runtime does not depend on editor state.
- Build validation detects stale Observatory cooked output without silently
  rewriting it.
- The generalized terrain import/cook contract and cooked terrain chunk
  foundation are implemented and validated.
- Observatory runtime traversal consumes 16 deterministic walkable terrain
  chunks rather than a flat proxy or render mesh.

Full-plan criteria still open:

- The editor must persist edits back into source/cook data instead of only
  producing preview patches.
- The editor must support spatial drag handles and a true 3D level viewport.
- Collision authoring must generalize beyond Observatory.
- Broader runtime bake tooling must support explicit generated output owners
  for additional levels such as Miranda before write paths are added.
- Cooked collider dimensions and mesh vertices must continue to include
  source-art scale; runtime `Transform.scale` must not become hidden physics
  scale.
- Production terrain editor import UI, material/shader import, and multi-level
  import reports remain open.
- Terrain LOD/streaming and multi-level cooked terrain packages remain open.
