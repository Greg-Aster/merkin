# Level Editor And Collision Cook Plan

Status: runtime kinematic character collision consumption, data/check collision
cook foundation, the dev-only editor shell, editable collision controls, a
top-down collision gizmo surface, temporary preview-patch serialization,
game-window preview/reload/clear, the deterministic generated bake artifact,
the generated runtime collision module writer, Miranda current-floor collision
draft drift validation, and the Observatory visual terrain displacement/import
foundation are implemented on 2026-06-06.

The explicit runtime collision bake writes
`src/game/generated/observatoryCollisionRuntime.ts` with
`--write-runtime-collision`; Observatory runtime owner files import that module.
Arbitrary TypeScript owner objects must not be rewritten by the cook path. The
current runtime bake is implemented through this owned generated runtime module;
a generalized direct runtime owner-file rewrite writer remains planned for
future bake work and must avoid mutating unrelated hand-authored TypeScript
source. A generalized multi-level visual terrain import/editor pipeline remains
planned.

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
- Deterministic generated bake artifact and explicit generated runtime
  collision module writer for Observatory.
- Miranda current walkable-floor draft validation for main, upper, and Cargo
  Hold floor coverage, without generating a Miranda runtime collision module.
- Observatory generated visual field terrain GLB plus provenance and manifest
  integration.

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
- The full generalized visual terrain import/editor pipeline.

## Purpose

The next logical editor step is a separate level editor interface that can run
beside the game window, author collision and other level data, bake durable
runtime products, and let the running game preview or reload those products.

This plan is for delegation to another agent. It must stay aligned with:

- `ARCHITECTURE.md`
- `GAME_ENGINE_DESIGN_DOCUMENT.md`
- `ENGINE_CONTRACT_REGISTER.md`
- `docs/GAME_ENGINE_MIGRATION_PLAN.md`
- `docs/OBSERVATORY_COLLISION_SYSTEM_FINDINGS.md`
- `docs/MIGRATION_AGENT_ALIGNMENT_2026-06-06.md`
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
8. Done for Observatory generated runtime collision module: bake changes to
   durable target-engine data through `--write-runtime-collision`; generalized
   direct owner-file rewrite tooling remains future.
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
- `observatory:walkable-mesh` keeps its stable ID and readiness role, but its
  collider shape is now an explicit mesh collider with authored vertices and
  triangle indices instead of a flat box.
- The Observatory player opts into `CharacterController.kinematicCollision`;
  other levels keep their existing scalar `groundY` behavior until they
  intentionally opt in.
- `test:kinematic-character-contract` validates the engine character system's
  use of the physics movement query, collider-handle requirement, opt-out
  behavior, and fallback behavior.

This runtime prerequisite did not by itself implement editor UI, preview, or
bake writing. It gives the editor/cook packets a runtime contract to target.
The current Observatory mesh collision is checked-in runtime data imported from
the generated runtime collision module. The editor-owned generated bake
artifact records deterministic editor/cook provenance and drift state.

## Implemented Cook Foundation Slice

The first non-UI cook foundation is implemented without changing runtime
gameplay ownership:

- `src/engine/data/collisionCook/index.ts` defines and validates authored
  collision cook draft data, builds deterministic in-memory cook plans, and
  drift-checks those plans against checked-in `RuntimeSceneManifest` data.
- `src/game/editor/collisionDrafts/observatoryCollisionDraft.ts` is the
  checked-in Observatory collision draft source for the current walkable mesh
  and four boundary blockers.
- `scripts/cook-observatory-collision.ts` is the explicit cook/check command.
  It validates the draft against the current Observatory runtime manifest and
  writes no files by default.
- `--print-preview-patch` prints a deterministic temporary dev-only preview
  payload for the current Observatory collision draft.
- `--write-generated-bake` writes the deterministic editor-owned generated
  bake artifact to
  `src/game/editor/collisionDrafts/generated/observatoryCollisionBake.json`.
  The artifact records the dry-run target payloads and preview patch, but it
  does not make runtime playback depend on editor state.
- `--write-runtime-collision` writes the deterministic checked-in runtime
  collision module to `src/game/generated/observatoryCollisionRuntime.ts`.
  Observatory prefab, level, and runtime-manifest owners import this generated
  module for shipped collision data.
- `ci:observatory-collision-drift` is the CI-facing drift gate for the same
  Observatory draft/runtime comparison. It reuses the collision cook validation
  path, verifies the generated bake artifact and generated runtime collision
  module, and writes no files.
- `scripts/test-level-editor-collision-cook-contract.ts` proves invalid draft
  data, invalid preview patches, stale generated bake output, stale generated
  runtime module output, unsafe write requests, and stale cooked runtime data
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
  preview patch metadata, and generated bake artifact hash.
- The normal game route and runtime systems do not import `src/app/editor` or
  `src/game/editor`.
- `test:level-editor-collision-cook-contract` validates the editor session
  summary, preview patch metadata, and generated bake artifact hash against the
  Observatory collision draft.
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

Status: implemented generated-artifact writer foundation and explicit generated
runtime collision module writer. Arbitrary TypeScript owner-object rewrite is
intentionally not used; the generated runtime module is the safer structured
runtime owner.

- Add an explicit cook command for Observatory collision.
- Generate or update durable editor-owned bake artifacts and the checked-in
  generated runtime collision module.
- Avoid silent generation during build.
- Add a drift check that fails when cooked data is stale.
- Keep generated walkable collision as explicit `Collider.shape.type: "mesh"`
  vertices and indices, or as cheaper primitives when precision is not needed.

Acceptance:

- Running the cook command with `--write-runtime-collision` updates the expected
  generated runtime module only.
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

### Packet 6: Visual Terrain Displacement/Import Pipeline

Status: implemented foundation for Observatory generated visual terrain; full
visual terrain import pipeline remains planned. Current Observatory traversal
uses explicit collision data. The original `mesh_observatory_environment` GLB
remains visual-only, and the collision mesh does not change the rendered GLB
surface.

- Define the generalized durable import/generation owner for displaced terrain
  visuals beyond Observatory.
- Produce or import rendered terrain assets with visible displacement rather
  than relying on collider data to affect rendering.
- Keep render terrain and collision terrain linked by authored provenance,
  source scale, asset ID, stable ID, generated metadata, and validation
  metadata.
- Ensure visual terrain import does not make render GLBs implicit collision.

Acceptance:

- The visual terrain source and generated/imported runtime asset are checked in
  or generated by an explicit owner command.
- The runtime manifest references the resolved visual asset through normal
  asset/prefab data.
- Collision still comes from explicit collider data and readiness checks.
- Visual terrain validation fails if the generated/imported asset, provenance,
  or collision linkage is stale.

Implemented Observatory foundation artifacts:

- `scripts/generate-observatory-field-terrain.ts`
- `public/assets/generated/game/observatory/terrain/observatory-field-micro-displacement.glb`
- `public/assets/generated/game/observatory/terrain/observatory-field-micro-displacement.json`
- `mesh_observatory_field_micro_displacement`
- `observatory_field_visual_terrain`
- `observatory:terrain:visual-field`
- `test:observatory-visual-terrain-contract`

## Remaining AAA-Plan Validation Matrix

| Remaining item | Current status | Current/future validation command |
| --- | --- | --- |
| Editable collision gizmo UI | first control slice implemented; `/editor` exposes selectable stable IDs, intent/channel controls, editable box position/scale fields, read-only walkable mesh metadata, derived bounds, and a top-down collision gizmo surface; persistence and spatial drag handles remain future | Current: `pnpm --dir apps/game.megameal test:collision-overlay-view-model` and `pnpm --dir apps/game.megameal test:level-editor-collision-cook-contract`; future completion must add persisted edit and spatial gizmo validation |
| Live game-window preview application/reload | implemented protocol/callback slice with temporary runtime component application and reload request path; preview reversal and richer reload lifecycle remain future | Current: `pnpm --dir apps/game.megameal test:live-preview-protocol-contract` and `pnpm --dir apps/game.megameal test:level-editor-collision-cook-contract`; future `test:level-editor-preview-reload-contract` must validate reversal, reload lifecycle, and multi-window diagnostics |
| Generated runtime collision bake | implemented as an explicit generated runtime module; arbitrary TS owner-object rewrite is intentionally avoided | Current: `pnpm --dir apps/game.megameal cook:observatory-collision`, `pnpm --dir apps/game.megameal cook:observatory-collision -- --write-runtime-collision`, `pnpm --dir apps/game.megameal cook:observatory-collision -- --write-generated-bake`, `pnpm --dir apps/game.megameal ci:observatory-collision-drift`, and `pnpm --dir apps/game.megameal test:level-editor-collision-cook-contract`; future broader bake tooling must generalize beyond Observatory and must not rewrite unrelated owner files |
| Miranda collision cook migration | implemented draft/check-only coverage for current main, upper, and Cargo Hold walkable floors; no Miranda generated runtime module exists yet | Current: `pnpm --dir apps/game.megameal test:miranda-collision-draft-contract`; future Miranda bake tooling must add an explicit generated output owner before any write path exists |
| Direct runtime owner-file rewrite bake | planned; current implementation deliberately stops at the owned generated runtime collision module and does not rewrite arbitrary TypeScript owner files | Current: `pnpm --dir apps/game.megameal cook:observatory-collision`, `pnpm --dir apps/game.megameal cook:observatory-collision -- --write-runtime-collision`, `pnpm --dir apps/game.megameal ci:observatory-collision-drift`, and `pnpm --dir apps/game.megameal test:level-editor-collision-cook-contract`; future `test:level-editor-runtime-bake-writer-contract` must validate exact target files, no unrelated rewrites, generated artifact validation, and post-bake runtime validation |
| True terrain visual displacement/import pipeline | implemented foundation for Observatory generated visual terrain; full visual terrain import pipeline remains planned | Current: `pnpm --dir apps/game.megameal generate:observatory-field-terrain`, `pnpm --dir apps/game.megameal test:observatory-visual-terrain-contract`, `pnpm --dir apps/game.megameal test:generated-glb-import-contract`, and `pnpm --dir apps/game.megameal test:runtime-scene-contract`; future `test:terrain-visual-import-pipeline-contract` must validate generalized visual asset provenance, generated/imported asset readiness, and collision linkage |

## Validation Gate

For each implementation packet, run the focused gate for touched behavior:

```bash
pnpm --dir apps/game.megameal audit:engine-boundaries
pnpm --dir apps/game.megameal type-check
pnpm --dir apps/game.megameal lint
pnpm --dir apps/game.megameal test:runtime-scene-contract
pnpm --dir apps/game.megameal test:collision-overlay-view-model
pnpm --dir apps/game.megameal test:generated-glb-import-contract
pnpm --dir apps/game.megameal test:observatory-visual-terrain-contract
pnpm --dir apps/game.megameal test:level-editor-aaa-plan-contract
pnpm --dir apps/game.megameal test:level-editor-collision-cook-contract
pnpm --dir apps/game.megameal test:live-preview-protocol-contract
pnpm --dir apps/game.megameal test:miranda-collision-draft-contract
pnpm --dir apps/game.megameal ci:observatory-collision-drift
pnpm --dir apps/game.megameal cook:observatory-collision
pnpm --dir apps/game.megameal generate:observatory-field-terrain
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
multi-level collision authoring, multi-level runtime bake support, and a
generalized visual terrain import/editor pipeline.

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

### 2026-06-06 CI Drift Gate Plumbing

Added `ci:observatory-collision-drift` as an explicit non-writing validation
gate for CI and pre-merge checks. The gate builds the current Observatory
collision cook plan from `observatory_collision_draft_v1` and compares it with
the checked-in `observatory_runtime` manifest through the shared collision cook
validator. It fails on drift in level instances, prefab colliders, transforms,
readiness requirements, or stale generated bake artifacts, and it does not bake
or rewrite files.

### 2026-06-06 Generated Runtime Collision Module Bake

Implemented the direct runtime bake slice as a generated runtime data module
instead of arbitrary TypeScript object rewrites:

- `src/game/generated/observatoryCollisionRuntime.ts` is the checked-in runtime
  collision module produced by the explicit cook command.
- `src/game/prefabs/observatoryPrefabs.ts`,
  `src/game/levels/observatoryLevel.ts`, and
  `src/game/levels/runtimeSceneManifests.ts` import the generated module for
  Observatory collider, collision instance, and collision-readiness data.
- `pnpm --dir apps/game.megameal cook:observatory-collision -- --write-runtime-collision`
  is the only runtime collision write path. The default cook command, drift
  gate, normal build, and tests write no files.
- The cook write plan includes the generated TypeScript module as an explicit
  `runtime-collision-module` artifact, while retaining JSON dry-run payloads for
  prefab colliders, level instances, and readiness.
- Write-safety validation rejects unexpected target files, dirty unexpected
  targets supplied by callers, invalid runtime drift supplied by callers, and
  overwriting an existing generated module that does not carry the
  `collisionCook.runtimeModule.v1` marker.
- `ci:observatory-collision-drift` now verifies both
  `src/game/editor/collisionDrafts/generated/observatoryCollisionBake.json` and
  `src/game/generated/observatoryCollisionRuntime.ts`.

This keeps editor draft/provenance artifacts separate from shipped runtime data
while avoiding ad hoc string replacement across hand-authored TypeScript owner
files.

### 2026-06-06 Preview Patch And Generated Bake Artifact

Implemented as a dev-only editor/cook foundation:

- Added deterministic `CollisionCookPreviewPatch` and
  `CollisionCookBakeFileData` serialization in
  `src/engine/data/collisionCook/index.ts`.
- Extended `cook:observatory-collision` with `--print-preview-patch`,
  `--print-bake-file`, and `--write-generated-bake`.
- Added the editor-owned generated bake artifact at
  `src/game/editor/collisionDrafts/generated/observatoryCollisionBake.json`.
- Extended `ci:observatory-collision-drift` and
  `test:level-editor-collision-cook-contract` to fail when the generated bake
  artifact no longer matches the current draft/runtime data.
- Kept normal runtime data independent from editor draft and generated bake
  state.

### 2026-06-06 Packet 5 Protocol Progress

Implemented the live preview/reload/clear protocol slice without moving editor
state into normal runtime systems:

- Added protocol message validation to `src/engine/data/collisionCook/index.ts`
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
- Added `test:miranda-collision-draft-contract` to validate the draft against
  `miranda_deck_runtime`, required walkable stable IDs, authored character
  bounds, runtime transforms, and dry-run write-plan targets.
- Kept Miranda without a generated runtime collision module until a future
  Miranda-specific output owner exists.

### 2026-06-06 Collision Cook Data/Check Foundation

Implemented as a non-runtime editor/cook foundation:

- Added the engine-owned collision cook draft contract and deterministic
  in-memory cook plan helper in `src/engine/data/collisionCook/index.ts`.
- Added `observatory_collision_draft_v1` as checked-in editor/cook source data
  for the current Observatory walkable mesh and four boundary blockers.
- Added `cook:observatory-collision` as an explicit check-only cook command.
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
  `observatory:walkable-mesh` deterministic 17x17 mesh collision data and kept
  the stable ID/readiness role tied to that authored mesh collider.
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

- keep `observatory:walkable-mesh` terminology instead of old proxy wording
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
- The generalized visual terrain import/editor pipeline must be implemented
  and validated.
