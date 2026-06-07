# Game Engine Whole-System Audit - 2026-06-06

Status: Wave 1 read-only findings report

Mode: moving-tree audit while other agents were actively editing

Coordinator: watchdog

Scope: `apps/game.megameal` engine, game content, adapters, editor, tests, scripts, architecture docs, design document, and contract register

This report implements the first pass of the whole-system cleanup plan. It is
not a claim that the engine is finished. It records the current validation
state, the highest-risk drift found by the coordinator and six read-only
subagents, and the recommended order for follow-up implementation.

The repo was not frozen during the audit. Some failures observed mid-review
were fixed or moved by other agents before the final validation snapshot. Those
items remain listed because they expose handoff and ownership risks that can
recur unless the source owner, generated artifact policy, and contract tests are
tightened.

## Subagent Coverage

- Confucius `019e9f0e-0cee-7dc0-a550-b974193bd6d7`: architecture, design document, contract register, stale docs.
- Beauvoir `019e9f0e-0e6a-7b33-88d9-38131ff08c3f`: engine data contracts, schemas, cooks, manifests.
- Banach `019e9f0e-1014-7662-8854-6ea899cceadd`: engine runtime, modules, adapters, lifecycle risks.
- Jason `019e9f0e-11fc-7611-b6dc-a905854340e5`: app shell, Svelte UI, editor surface, adapter boundaries.
- Tesla `019e9f0e-13fc-7561-9aa8-92e744fec3bc`: game content, runtime scenes, assets, prefabs.
- Avicenna `019e9f0e-1649-7133-a9fa-9c9954be6e86`: tests, scripts, cruft, generated output hygiene.

## Current Snapshot

The latest local validation snapshot is green for the main focused gates that
were run:

- `pnpm --dir apps/game.megameal audit:engine-boundaries`
- `pnpm --dir apps/game.megameal type-check`
- `pnpm --dir apps/game.megameal lint`
- `pnpm --dir apps/game.megameal test:runtime-scene-contract`
- `pnpm --dir apps/game.megameal test:level-authoring-contract`
- `pnpm --dir apps/game.megameal test:scene-environment-contract`
- `pnpm --dir apps/game.megameal test:terrain-cook-contract`
- `pnpm --dir apps/game.megameal test:generated-glb-import-contract`
- `pnpm --dir apps/game.megameal test:input-contract`
- `pnpm --dir apps/game.megameal test:charged-action-contract`
- `pnpm --dir apps/game.megameal test:story-note-contract`
- `pnpm --dir apps/game.megameal test:audio-contract`
- `pnpm --dir apps/game.megameal test:audio-spatial-contract`
- `pnpm --dir apps/game.megameal test:light-contract`
- `pnpm --dir apps/game.megameal test:water-firefly-contract`
- `pnpm --dir apps/game.megameal test:kinematic-character-contract`
- `pnpm --dir apps/game.megameal test:terrain-import-pipeline-contract`
- `pnpm --dir apps/game.megameal test:collision-overlay-view-model`
- `pnpm --dir apps/game.megameal test:level-editor-aaa-plan-contract`
- `pnpm --dir apps/game.megameal test:level-editor-collision-cook-contract`
- `pnpm --dir apps/game.megameal test:live-preview-protocol-contract`
- `pnpm --dir apps/game.megameal build`
- `git diff --check -- apps/game.megameal pnpm-lock.yaml`

Build still reports the known Vite large-chunk warning for Three/Rapier. That
warning does not fail the build.

The tree is still dirty and contains other agents' work. At the time of this
report, notable active changes include architecture/design/contract docs,
Solitude runtime/content files, runtime-scene contract scripts, moved Done docs,
and untracked portal-arena environment assets. This report does not revert or
normalize those changes.

## Blocking / Handoff Risks

### 1. Moving-tree generated-owner risk was observed during the audit

During the audit, runtime scene content imported generated Miranda terrain
runtime data while the generated owner files and related scripts were not yet
tracked in the snapshot the subagents saw. The final snapshot no longer shows
the same loose Miranda generated files, and the final Miranda/runtime tests pass,
but this is a serious handoff risk.

AAA-tier standard: generated runtime artifacts must be reproducible, tracked
when they are runtime inputs, and listed in the owning contract. Package scripts
must not point at missing files, and source manifests must not import untracked
runtime modules.

Required follow-up:

- Before a migration packet is called done, run `git status --short -- apps/game.megameal` and account for every generated/runtime file.
- If a generated runtime module is required by checked-in source, either track
  it with provenance and drift validation or remove the import until the owner
  packet is ready.
- Make cook/drift commands part of the packet's contract entry before relying
  on generated runtime data.

### 2. Miranda collision ownership drift was observed, then resolved in the latest snapshot

Mid-audit, Miranda readiness and collision ownership were split between
prefab-level floors, terrain readiness, and draft expectations. The latest
generic contract rerun passed, but the failure pattern matters:
walkable collision cannot be inferred from render meshes, and content readiness
must point at the actual runtime collision owner.

Required follow-up:

- Keep Miranda collision ownership explicit in one contract owner.
- Keep negative validation for missing walkable/collision IDs in the runtime
  scene and Miranda collision tests.
- Do not call Miranda migrated until floor, terrain, and readiness ownership are
  aligned in source, docs, and generated artifact policy.

## High Findings

### 1. Production build currently includes dev-only editor code

Evidence:

- `src/pages/editor.astro:2` statically imports
  `../app/editor/LevelEditorPreviewControls.svelte`.
- `src/pages/editor.astro:7` gates rendering with `import.meta.env.DEV`, but the
  static import is still bundled.
- The production build emitted
  `dist/_astro/LevelEditorPreviewControls.DK-YTJ2_.js`.

This conflicts with the architecture rule that editor tooling stays diagnostic
and dev-owned, not shipped as production runtime surface.

Required fix:

- Split the editor route so production builds do not statically import editor
  controls, or move the controls behind a dev-only dynamic boundary that Astro
  excludes from production.
- Add a focused production-build artifact check that fails if
  `LevelEditorPreviewControls*.js` is emitted.

### 2. Solitude admission docs were stale

Evidence:

- `src/game/levels/runtimeSceneManifests.ts:378` defines `solitude_runtime`.
- `src/game/levels/portalArenaLevel.ts:30` to `:31` targets
  `solitude_runtime`.
- `docs/SOLITUDE_MIGRATION_PROGRESS.md`,
  `ENGINE_CONTRACT_REGISTER.md`, `ARCHITECTURE.md`,
  `GAME_ENGINE_DESIGN_DOCUMENT.md`, and
  `docs/GAME_ENGINE_MIGRATION_PLAN.md` now describe Solitude as an admitted
  playable foundation, not full parity.

The code and validation say the Solitude foundation is admitted. Current docs
distinguish "playable foundation admitted" from "full old-scene parity
deferred."

Remaining rule:

- Keep future parity items explicit: generated GLB art parity, cooked collision
  parity, large firefly/particle population, reflections/post-processing, light
  tuning, and streaming remain future contracts.

### 3. Terrain readiness artifacts do not yet encode package-level readiness

Evidence:

- `src/engine/data/terrainCook/index.ts:204` to `:211` defines
  `TerrainCookReadinessArtifactData` with required assets, collision IDs, and
  walkable IDs only.
- `src/engine/data/terrainCook/index.ts:448` to `:455` writes only those same
  readiness fields.
- Current source search found no `requiredTerrainPackageIds`,
  `availableTerrainPackageIds`, or `terrainPackagesReady` owner in
  `apps/game.megameal`.

This is not wrong for the current narrow cook, but it means any documentation or
handoff language that implies package-level terrain readiness is implemented is
overstated.

Required fix:

- Either keep readiness limited to assets/collision/walkable IDs and document it
  honestly, or add a real terrain package contract with source schema,
  generated artifact, runtime scene readiness, and negative validation.
- Do not represent terrain package activation as complete until the runtime load
  report can prove the package was activated, not merely present in manifests.

### 4. Scene cleanup can stop at the first thrown cleanup

Status update: addressed by the engine lifecycle packet. `BasicSceneScope`
cleanup now attempts every registered cleanup before throwing an aggregate
cleanup failure, with focused validation in `test:scene-lifecycle-contract`.

Evidence:

- `src/engine/modules/scene/index.ts:79` to `:84` iterates cleanup callbacks and
  awaits each one without catching and aggregating failures.

If one cleanup throws, later cleanup callbacks are skipped. That can leak render,
physics, or audio resources after a scene transition failure.

Required fix:

- Run every registered cleanup even if earlier cleanup fails.
- Aggregate cleanup failures and report them after all cleanup callbacks have
  been attempted.
- Add a focused scene lifecycle test for cleanup continuation and aggregate
  failure reporting.

### 5. AssetManager does not coalesce in-flight loads

Status update: addressed by the engine lifecycle packet. `AssetManager.load()`
now coalesces concurrent loads by asset ID and clears failed in-flight loads so
later callers can retry, with focused validation in
`test:asset-manager-contract`.

Evidence:

- `src/engine/modules/assets/index.ts:137` to `:153` stores `record.asset` only
  after `await loader(record.entry)`.
- Parallel calls to `load(id)` before the first load resolves can call the
  loader more than once.

AAA-tier asset managers should avoid duplicate GPU/audio/resource creation for
the same asset ID.

Required fix:

- Track in-flight load promises per asset ID.
- Ensure parallel callers share the same promise and resolved asset.
- Clear failed in-flight promises so retries are possible.
- Add a focused asset-manager contract test for concurrent loads.

### 6. Active docs reference moved Done docs through old active paths

Evidence:

- `ENGINE_CONTRACT_REGISTER.md:56` references
  `docs/OBSERVATORY_COLLISION_SYSTEM_FINDINGS.md`, while the file has been moved
  under `docs/Done`.
- `ENGINE_CONTRACT_REGISTER.md:61` references
  `docs/PORTAL_FIELD_TERRAIN_INTENT.md`, which should be checked against the
  active/Done location.
- `ENGINE_CONTRACT_REGISTER.md:64` references
  `docs/OBSERVATORY_PLAYABLE_FOUNDATION_PLAN.md` while the tree currently shows
  a moved/deleted Done copy and an untracked active copy.
- `docs/LEVEL_EDITOR_COLLISION_COOK_PLAN.md:84` to `:85` references old active
  paths for Observatory collision findings and migration alignment.
- `docs/MIGRATION_HANDOFF_2026-06-06.md:135` to `:138` references old active
  paths for migration alignment, Observatory collision findings, and
  Observatory playable foundation.

Required fix:

- Do a dedicated docs path cleanup pass.
- Use `docs/Done/...` for completed plans and keep active docs only for active
  work.
- Avoid moving or deleting docs while another agent owns the same packet unless
  the handoff file is updated in the same change.

### 7. Runtime and editor contract tests are becoming broad catch-all owners

Evidence:

- `scripts/test-runtime-scene-contract.ts` is 2,293 lines and owns scene-specific
  portal arena, Observatory, Solitude, Miranda, runtime lifecycle, audio manager,
  asset refcount, load/unload, and negative validation behavior.
- `scripts/test-level-editor-collision-cook-contract.ts` is 1,132 lines and owns
  multiple editor/collision/data concerns.
- Common helpers such as `assertEqual`, `assertRecord`, and
  `componentsForStableId` are duplicated across many test scripts.

This conflicts with the repo standard that new tests should have focused owners
and clear failure reasons.

Required fix:

- Split runtime-scene tests by durable contract owner, for example portal arena,
  Observatory, Miranda, Solitude, runtime lifecycle, and audio lifecycle.
- Split level-editor collision tests into bake/cook protocol, overlay view
  model, production-bundle exclusion, and live-preview protocol owners.
- Move shared low-level assertions into a small test helper only when it reduces
  duplication without hiding failure messages.

### 8. Level editor session mixes unrelated level draft systems

Evidence:

- `src/app/editor/levelEditorSession.ts:18` imports Observatory collision draft
  data.
- `src/app/editor/levelEditorSession.ts:19` imports Miranda light draft data.
- `src/app/editor/levelEditorSession.ts:310` to `:316` returns both in one
  session payload.

This may be acceptable as a temporary diagnostic surface, but it is not a clean
long-term editor architecture. A level editor should select a target scene and
load the relevant draft systems through typed registries, not hardcode unrelated
level packets into one session.

Required fix:

- Introduce an explicit editor target-scene selection model or draft registry.
- Keep Observatory collision, Miranda lighting, and future level tools as
  separate editor modules with typed session payloads.
- Ensure production builds exclude the editor module before adding more editor
  capabilities.

### 9. Preview patch editing scrapes DOM fields instead of owning typed state

Evidence:

- `src/app/editor/LevelEditorPreviewControls.svelte:126` to `:139` rebuilds the
  preview patch from serialized JSON and `document.querySelectorAll`.

This works as a prototype, but it is fragile for a production-grade editor.
Typed editor state should own the draft values, and the DOM should render that
state.

Required fix:

- Move collision preview edits into typed Svelte state or a view model.
- Keep serialization at the boundary where the live-preview protocol sends the
  patch, not as the primary state source.

## Medium Findings

### 1. `build` is not a complete content-contract gate

`package.json` currently defines `build` as `type-check` and `astro build`.
Earlier in the audit, build could pass while content-specific tests failed. The
current final snapshot is green because the focused tests were run manually.

Required fix:

- Add a separate aggregate script such as `test:contracts` for all durable
  content and engine contract tests.
- Keep `build` reasonably fast, but do not treat it as proof that migration
  packets are contract-complete.

### 2. Audio event timing deserves a focused lifecycle review

Subagent review flagged a possible ordering risk around fixed-stage event
draining and the audio stage peeking at events. The current audio contract tests
pass, but the engine should have one explicit test that proves an event emitted
after the audio stage is not dropped before audio can observe it on the next
frame.

Required fix:

- Add a focused runtime/audio event ordering test if current architecture
  expects next-frame audio delivery.
- Document the event timing rule in the design document if it is intentional.

### 3. Physics adapter should not silently normalize invalid transform data

Subagent review flagged transform normalization in the physics adapter as a
runtime-repair risk. The boundary contract says runtime data should be valid
before adapter projection.

Required fix:

- Ensure invalid transform data fails schema/content validation before it reaches
  physics sync.
- Keep any adapter fallback narrow, documented, and observable.

### 4. Large files should be split after active migration churn settles

Current large owner files include:

- `scripts/test-runtime-scene-contract.ts`: 2,293 lines.
- `scripts/test-level-editor-collision-cook-contract.ts`: 1,132 lines.
- `src/engine/data/schemas/index.ts`: 3,134 lines.
- `src/engine/data/terrainCook/index.ts`: 1,546 lines.
- `src/engine/adapters/three/index.ts`: 2,738 lines.

Large files are not automatically wrong, but these now mix enough concerns that
review and future delegation will be slower and riskier.

Required fix:

- Split by contract boundary, not by arbitrary file size.
- Preserve public exports and schema compatibility during the split.

## Low Findings

### 1. Scene environment base type remains loosely open

`src/engine/modules/rendering/index.ts` defines `BaseSceneEnvironment` with an
open index signature. That weakens the environment contract by allowing unknown
fields to pass through module-level types. Schema validation may still catch
some cases, but the TypeScript contract is looser than ideal.

Required fix:

- Replace the open extension pattern with explicit discriminated environment
  types where practical.
- Keep future atmosphere/video-sky extensions as named variants, not arbitrary
  passthrough fields.

### 2. Terrain cook chunk grouping depends on stable ID structure

Subagent review flagged terrain cook grouping that derives meaning from stable
ID segments. Stable IDs are useful, but parsing ownership semantics from string
positions becomes brittle as more levels and chunk types are added.

Required fix:

- Prefer explicit group/region fields in terrain cook data if chunk grouping
  must become a runtime or editor behavior.

## Recommended Fix Order

1. Freeze or snapshot the active handoff state before the next cleanup wave.
   Account for every dirty, deleted, and untracked file in
   `apps/game.megameal`.
2. Fix production editor bundling so dev-only editor code is not emitted in
   production builds.
3. Update Solitude docs and contract language to match current runtime
   admission, while preserving future parity exclusions.
4. Run a docs path cleanup pass for moved `docs/Done` files and active handoff
   references.
5. Decide and document whether terrain package readiness exists now. If it does,
   implement it end to end; if not, remove or soften any language implying it is
   complete.
6. Harden engine lifecycle basics: scene cleanup continuation and asset load
   coalescing.
7. Split broad test files by contract owner after active content agents finish
   their current packets.
8. Refactor the level editor toward typed per-scene draft ownership, after the
   production-bundle leak is fixed.

## Definition Of Done For The Next Wave

The next cleanup wave should not be considered complete until:

- `git status --short -- apps/game.megameal pnpm-lock.yaml` has been reviewed
  and every changed/untracked/deleted path has an owner.
- `audit:engine-boundaries`, `type-check`, `lint`, `build`, and the relevant
  focused contract tests pass in the same snapshot.
- Production build output no longer contains editor-only chunks.
- Architecture docs, design document, and contract register agree with runtime
  manifest admission state.
- Active plans stay active, completed plans live in `docs/Done`, and references
  use the correct paths.
- No audio assets are modified as part of cleanup unless the user explicitly
  requests audio asset work.
