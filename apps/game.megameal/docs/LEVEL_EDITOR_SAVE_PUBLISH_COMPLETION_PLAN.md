# Level Editor Save And Publish Completion Plan

Status: completed implementation plan; contract/documentation alignment slice
completed on 2026-06-17

This plan defines the remaining work needed for the Megameal level editor save
and publish workflow. It must stay aligned with `ARCHITECTURE.md`,
`GAME_ENGINE_DESIGN_DOCUMENT.md`, `ENGINE_CONTRACT_REGISTER.md`,
`docs/GAME_ENGINE_MIGRATION_PLAN.md`, `docs/LEVEL_EDITOR_WORKSPACE_ALIGNMENT.md`,
and `docs/LEVEL_EDITOR_LEGACY_FEATURE_RECREATION_PLAN.md`.

## Target Workflow

The intended editor workflow is:

```text
select runtime scene in level workspace
  -> edit supported scene, level, prefab, asset, environment, terrain, audio,
     render, collision, interaction, and gameplay-owned data
  -> preview edit live through the dev-only game window bridge
  -> optionally save draft/editor work-in-progress data
  -> publish validated owner changes
  -> checked-in runtime owner files change
  -> validation/build proves the runtime loads the updated data permanently
```

The editor must not become a runtime dependency. Runtime game behavior must
continue to load validated `RuntimeSceneManifest`, `LevelDefinition`,
`PrefabDefinition`, asset, render profile, audio, terrain package, collision,
and readiness data. Dev preview patches are temporary and must stay separate
from shipped runtime data until a save or publish action writes bounded,
validated owner data.

## Plan Integrity Rules

This plan is worked by multiple agents concurrently. Keep it true:

- The Implementation Status Snapshot below is the source of truth for what is
  built. Update it in the same change that lands a capability; never describe a
  path as done before a checked-in owner file changes and a contract test proves
  the runtime loads it.
- A status of "done" requires three things together: a contract test, a changed
  checked-in owner file, and a reload that loads the change through normal
  runtime data. Anything less remains explicitly incomplete.
- If code and plan disagree, the code wins and the plan is corrected. Re-audit
  the snapshot rather than aspirationally marking checklist boxes.
- Do not delete the cross-cutting requirements to make a milestone look closer to
  done. They are binding once the matching write path is enabled.

## Current Gap

The current live preview path is aligned with the contract: the editor can send
dev-only preview patches to the active game window.

The current permanent save path has a first bounded owner-write slice, but the
full save/publish path is incomplete:

- Save Draft writes a generated authoring transaction module with
  `writesRuntimeData: false` and does not mark runtime data permanent.
- Save Level writes the owned generated runtime override module for validated
  level-owned `set-transform` operations, generated object-library
  `insert-level-instance` placement operations, bounded level-instance
  `replace-prefab` operations, and level-instance `set-component`/
  `remove-component` operations through the `component-editing` family, plus
  bounded `remove-level-instance` operations.
- The owner registry still has broader level, prefab, asset, render-profile,
  terrain/collision, audio, and readiness owner targets that are not writable by
  the current Save Level slice.
- Publish Level is implemented for the current generated level override owner
  slice: it stages transform overrides, object-library placement insertions,
  prefab ID overrides, component set/removal records, and bounded instance
  removal records, runs configured local validation/build gates, rolls back on
  gate failure, and does not deploy.
- The current configured Publish Level gates are the first-slice gates:
  `test:level-editor-save-contract`, `test:runtime-scene-contract`,
  `test:production-editor-bundle-contract`, `type-check`, and `build`. Broader
  cook/drift, terrain, collision, audio, prefab, render-profile, asset, NPC, and
  environment gates must be added with the owner-write paths they validate.
- The UI must keep Save Draft, Save Level, and Publish Level separate so users
  do not infer a generated draft changed runtime owner data.
- The `Staged Operations` dock now classifies queued entries as Preview only,
  Save Draft only, mixed persistence, or Save Level/Publish ready. Those
  summaries are display-only; the authoring queue remains the execution input
  for Preview, Save Draft, Save Level, Publish, Reload, and Discard Staged.

The fix is not to let runtime consume editor state. The fix is to expand the
bounded owner-write path and complete the local publish action promised by the
contracts.

### Implementation Status Snapshot

This table must be re-audited and kept honest on every change to the save/publish
path. It is the single source of truth for "what is actually built." Do not
describe a capability as done here unless a checked-in owner file changes and a
contract test proves the runtime loads it. (Last audited: 2026-06-17.)

| Path | Owner | Status | Notes |
| --- | --- | --- | --- |
| Preview | `src/app/devPreview/**`, live-preview protocol | Implemented | Dev-only, temporary, schema-validated, scene-scoped, clearable. |
| Staged operations clarity | `LevelEditorWorkspace.svelte`, `levelEditorWorkspaceUi.ts`, authoring queue | First clarity slice implemented | The dock distinguishes Preview only, Save Draft only, mixed persistence, and Save Level/Publish ready queued entries, with targeted staged-field revert, targeted queued-entry removal, `Discard Staged`, and staged owner-write readiness. It does not change save/publish execution semantics. |
| Save Draft | `handleLevelEditorAuthoringPersistenceRequest`, `save.json`/`dry-run.json`, `authoring-save` generated modules | Implemented | Writes generated authoring modules with `writesRuntimeData: false`. Runtime must not import them. |
| Runtime published-override plumbing | `src/game/generated/publishedLevelTransforms.ts`, `src/game/levels/publishedLevelOverrides.ts`, `runtimeSceneManifests.ts` applier | Implemented for level-instance transforms, generated level-instance insertions, level-instance prefab ID overrides, level-instance component overrides/removals, and bounded level-instance removals | The generated override module and the `applyPublishedLevelInstanceTransformOverrides` consumer are wired into every runtime scene. The checked-in override, insertion, prefab override, component override, component removal, and instance removal arrays may be empty, but `save-level` can write deterministic transform overrides for selected-scene stable level instances, generated object-library placement insertions for known scene prefabs, level-instance `replace-prefab` records, level-instance `set-component` overrides, level-instance `remove-component` records, and bounded `remove-level-instance` records for publishable instance deletion. |
| Save Level / bounded owner write | `handleLevelEditorLevelOwnerWriteRequest` (`save-level.json`) | Implemented for `set-transform` level-instance edits, object-library `insert-level-instance` placements, bounded `replace-prefab` operations, component-editing `set-component`/`remove-component` operations, and bounded `remove-level-instance` operations | The endpoint writes the owned generated published-transform/placement/prefab-override/component set/removal/instance removal module for validated level-owned operations after base-hash validation. It reports hashes and changed stable IDs, detects byte-identical no-op writes, records a reversible changeset, supports valid stable level instances in the selected runtime scene, refuses generated placement insertions that duplicate existing stable IDs or reference unknown prefabs, refuses prefab replacement records that target unknown replacement prefabs or readiness-required checked-in stable IDs, records component overrides by runtime scene, stable ID, and component name, records component removals that clear stale generated component overrides for the same key, writes checked-in instance removal records for non-readiness-critical stable IDs, and cancels generated insertions without leaving generated-only tombstones. Readiness-required deletes/replacements, broad asset/component replacement, grouping, stable-ID management, and non-level-owner component families remain Milestone 2+ work. |
| Publish | `handleLevelEditorLocalPublishRequest` (`publish-local.json`), `src/game/editor/buildPublish/**` | Implemented for generated transform, object-library placement, prefab ID override, component override/removal, and bounded instance-removal owner slice | Applies validated `set-transform`, generated placement insertion, `replace-prefab`, component override, component removal, and bounded `remove-level-instance` operations to the generated runtime owner, runs configured local validation/build gates, reports changed artifacts, and rolls back the generated owner write when a gate fails. It does not deploy and does not yet cover broader Milestone 2 feature families. |
| In-editor validation report | `src/app/editor/levelEditorWorkspaceModel.ts`, `LevelEditorWorkspace.svelte` | Implemented | `LevelEditorValidationReport` derives from runtime-scene schema validation, content-graph validation, audio content validation, authoring owner provenance, and workspace capability warnings. Errors block Publish Level; warnings are shown in the report/output log without blocking. |

The runtime-read half (override module + applier), the write half
(`save-level` endpoint + deterministic owner writer), and the local Publish
route now meet for the first level-instance `set-transform` slice, the
object-library placement insertion slice, and the component-editing
`replace-prefab` slice, `set-component`/`remove-component` slice, plus the bounded
`remove-level-instance` slice for non-readiness-critical checked-in instances
and generated insertion cancellation. Publish Level remains scoped to this
generated level override owner until broader Milestone 2 feature families have
the same bounded owner-write coverage.

## Permanent Terms

These terms are binding for docs, UI labels, tests, and implementation:

- Preview: a temporary dev-only runtime patch sent to the active game window.
  Preview may update the running dev runtime for inspection, but it never
  changes checked-in source, generated runtime modules, or shipped runtime
  data. Preview state must be clearable and must not survive reload as runtime
  source.
- Save Draft: durable editor authoring persistence that writes generated
  `LevelEditorAuthoringPersistenceContract` modules with
  `writesRuntimeData: false`. Save Draft may preserve typed operations and
  owner-registry evidence for later publish, but runtime must not import or fall
  back to these modules.
- Save Level: bounded owner persistence for supported edit types. The current
  implementation supports level-owned `set-transform` operations and generated
  object-library `insert-level-instance` placement operations, bounded
  level-instance `replace-prefab` operations from the
  `level-instance-prefab-replacement` family, level-instance
  `set-component`/`remove-component` operations from the `component-editing`
  family, and bounded `remove-level-instance` operations from the
  `level-instance-removal` family, through the generated published level
  override owner module. Save Level may clear dirty state only after approved
  owner targets pass base-hash validation and the write succeeds.
- Publish: an explicit local repo mutation action that applies validated staged
  operations to checked-in runtime owner data, runs required validation/build
  gates, reports changed owner/generated files, and then permits a reload. The
  current implementation supports generated transform overrides, generated
  object-library placement insertions, generated component overrides,
  generated component removals, and generated instance removals.
  Publish is not deployment, not normal-build rewriting, and not runtime
  mutation.

Permanent runtime data means checked-in owner data loaded through normal
runtime scene paths: `RuntimeSceneManifest`, `LevelDefinition`,
`PrefabDefinition`, asset manifests, render profiles, audio manifests, terrain
packages, collision/runtime generated modules, and readiness data. Editor
drafts, generated authoring save modules, queues, preview patches, and local
build/publish plans are not runtime data.

## Contract Requirements

Any implementation must preserve these rules:

- The level editor is a separate dev-only tooling surface, not the normal game
  HUD.
- UI/editor code may observe state and dispatch commands, but it must not own
  runtime game state.
- Preview patches are dev-only, temporary, schema-validated, and scoped to the
  active runtime scene.
- Save and publish must be explicit. Normal builds must not silently bake,
  rewrite, or publish level files.
- Runtime must not import editor drafts, editor save modules, or generated bake
  artifacts as fallback data.
- Runtime must load validated checked-in game data: manifests, levels, prefabs,
  assets, render profiles, terrain packages, collision products, audio
  manifests, and readiness data.
- Owner writes must target known owner exports or owned generated modules after
  base-hash verification.
- Broad TypeScript rewrites of arbitrary owner files are not acceptable.
  Prefer structured owner modules or generated owner modules where direct AST
  updates would be brittle.
- Publish is local repo mutation only. It does not deploy unless a future deploy
  contract explicitly adds that behavior.

## Contract Alignment Status

- [x] Add `LevelEditorSavePublishContract` to
  `ENGINE_CONTRACT_REGISTER.md`.
- [x] Define permanent Preview, Save Draft, Save Level, and Publish terms.
- [x] Record current implementation honestly: Preview is temporary/dev-only,
  Save Draft writes generated authoring transaction modules with
  `writesRuntimeData: false`, Save Level writes the generated runtime level
  override owner slice for transforms, placements, component overrides, and
  component removals, and Publish Level runs the first local gated owner-write
  publish slice.
- [x] Record owner, validation, forbidden shortcuts, and removal conditions for
  the permanent save/publish path.
- [x] Complete bounded owner writes for the first supported edit type.
- [x] Convert UI labels/status so current generated transaction persistence is
  called Save Draft unless Save Level is implemented.
- [x] Implement real local Publish for the first generated owner-data mutation
  slice with write reports and validation/build gating.
- [x] Expand the plan and completion definition from the player-position proof
  slice to the full AAA-tier, all-feature level editor contract.
- [x] Remove the experimental arbitrary TypeScript level-owner rewrite path;
  owner persistence must use bounded owner plans or explicitly owned generated
  runtime modules.
- [x] Record the AAA editor cross-cutting requirements (atomicity/rollback,
  concurrency/merge, in-editor validation, reference integrity, determinism,
  versioning/migration, recovery, undo, preview/reload handoff, and the editor
  viewport decision).
- [x] Connect the `save-level` endpoint and a deterministic owner writer to the
  generated published-override runtime owner.
- [x] Make first-slice Publish atomic with a reversible changeset (requirement
  A); broader multi-file Publish support must use the same changeset rule.
- [x] Add the in-editor `LevelEditorValidationReport` surface (requirement C).

## Implementation Plan

### 1. Contract Alignment

- Done for the documentation slice. `ENGINE_CONTRACT_REGISTER.md` now records
  `LevelEditorSavePublishContract`.
- Preview, Save Draft, Save Level, and Publish are defined in this plan's
  permanent terms.
- Save Level and Publish Level now perform real bounded owner writes for the
  level-instance `set-transform` slice, generated object-library placement
  insertions, and component-editing `set-component`/`remove-component`
  operations (generated published level override owner module, base-hash gated,
  atomic changeset with rollback). Generated authoring Save Draft modules remain explicitly
  non-runtime (`writesRuntimeData: false`) and must not be consumed at runtime.
  Removal condition: as each later feature family gains the same bounded
  owner-write coverage, any compatibility Save Draft staging for that family must
  become explicit draft history or be removed from the Save Level path.

### 2. Current Behavior Audit

Audit the current editor commands and classify each path:

- preview
- clear/discard
- save
- build
- publish
- reload
- authoring transaction generation
- owner registry lookup
- generated authoring save modules
- build/publish plan model

For each path, mark it as:

- contract-aligned
- incomplete
- misleading UI
- architecture violation
- removable cruft

Do this before broad implementation work so cleanup is driven by the contract,
not by incidental code shape.

### 3. Save Semantics

The current Save behavior must stop being ambiguous.

Choose one contract-aligned shape:

1. Convert Save into real bounded owner persistence for supported edit types.
2. Rename the current generated transaction behavior to Save Draft, then add a
   distinct Save Level command that writes bounded owner data.

The preferred path is:

```text
staged typed edit operations
  -> validate selected runtime scene and owner registry
  -> build authoring transaction
  -> build owner write plan
  -> verify base hashes
  -> write only approved owner targets
  -> clear dirty queue only after successful writes
  -> request live reload
```

The player spawn/player transform path is only the first proof milestone. It is
not the definition of completion for the level editor. The permanent
implementation must scale to every editable feature through typed operations,
owner registries, feature catalogs, validation contracts, and deterministic
owner writers rather than special-case player-position code.

### 4. Bounded Owner Write Path

Implement a reusable owner writer with these properties:

- Input is a validated `LevelEditorAuthoringTransaction`.
- It resolves the selected runtime scene through the runtime scene catalog.
- It resolves owner targets through the owner registry.
- It supports base-hash verification before writing.
- It writes only known owner targets.
- It refuses unknown stable IDs, unknown component fields, stale base hashes,
  missing owner targets, and unsupported operation kinds.
- It emits a deterministic write report for UI and validation.

Current generated-owner supported writes:

- `set-transform` for level instances.
- Player spawn transform, represented as the `player` stable level instance.
- `insert-level-instance` for generated object-library placements that target
  known scene prefabs and deterministic generated stable IDs.
- `replace-prefab` for bounded level-instance prefab ID replacement through the
  `level-instance-prefab-replacement` feature family. Checked-in
  readiness-required instance replacement is blocked until a matching
  manifest/readiness owner writer exists.
- `set-component` and `remove-component` for level-instance component
  set/removal records through the `component-editing` feature family.
- `remove-level-instance` for bounded level-instance removal through the
  `level-instance-removal` feature family. Checked-in readiness-required
  instance removal is blocked until a matching manifest/readiness owner writer
  exists; generated insertion removal cancels the generated insertion without
  leaving a generated-only tombstone.

Required editor feature families:

- Runtime scene selection, scene readiness editing, scene-level metadata,
  runtime-scene manifest references, and future scene registration.
- Level object hierarchy editing, stable ID management, multi-select,
  grouping, duplication, deletion, transform gizmos, snap/grid controls,
  alignment tools, and undo/redo history.
- Level instance transforms, component edits, spawn points, gameplay markers,
  interaction triggers, story notes, quest/event hooks, portal targets, and
  authored navigation/camera markers.
- Prefab placement, prefab variant editing, object-library replacement,
  reusable authored kits, and asset reference validation.
- Renderable, material, light, reflection, water, sky, environment, and render
  profile authoring through the existing rendering contracts.
- Collider, rigid body, character controller, terrain collision, streamed
  terrain package, and cook/drift products through their existing terrain and
  collision contracts.
- Audio emitter, listener marker, music/ambience, and audio manifest authoring
  through owned audio data.
- NPC/firefly/gameplay actor authoring through game-owned typed contracts, not
  editor-owned runtime state.
- Future features registered through editor feature catalogs and owner
  contracts without adding level-specific branches or runtime fallback imports.

If direct edits to existing TypeScript owner modules are too brittle, introduce
structured generated owner modules that are imported by the checked-in level
owners. The generated module must be explicitly owned, deterministic, validated,
and reviewed like other generated runtime data.

### 5. Real Publish Command

Publish Level is now an action for the generated level override owner slice, not
only a plan display. The implemented slice covers level-instance transforms,
generated object-library placements, and component-editing overrides. Additional
feature families must meet the same rules before their Publish support is
enabled.

Publish should:

- require a selected runtime scene.
- require no invalid staged edits.
- either apply current staged edits or require an explicit saved authoring
  state, depending on the final Save/Save Draft decision.
- apply validated operations to checked-in owner data.
- run the configured first-slice gates for the supported operation set:
  `test:level-editor-save-contract`, `test:runtime-scene-contract`,
  `test:production-editor-bundle-contract`, `type-check`, and `build`.
- add source validation, content graph validation, cook/drift checks, editor
  authoring contract tests, and production exclusion checks as each later owner
  family becomes publishable.

Publish must not imply full-feature save/publish coverage until the matching
checked-in owner write, rollback behavior, and focused contract test exist for
that feature family.
- run type-check and build.
- request live reload only after successful writes and required validation.
- report changed owner files and generated files.

Publish must not:

- deploy to production.
- silently cook during normal build.
- mutate runtime state directly.
- treat editor drafts as shipped runtime source.
- hide failed validation behind a successful UI state.

### 6. Cleanup Requirements

Cleanup is part of this work, not a follow-up.

Remove or revise:

- UI labels or status messages that imply permanent Save/Publish when only a
  generated authoring transaction was written.
- dead authoring/persistence helpers that bypass the owner registry.
- duplicate paths for transform editing that do not produce typed operations.
- stale docs that claim Save/Publish is complete.
- generated authoring files that are not referenced by a clear draft/save/publish
  contract.
- temporary probes, one-off scripts, scratch files, debug logs, commented-out
  code, placeholder TODOs, unused exports, or stale package scripts.

Keep:

- the dev-only live preview bridge, as long as it remains temporary and
  validated.
- generated authoring transaction modules only if they are explicitly defined
  as draft history, Save Draft output, or publish input.
- local build/publish plan modeling only if it feeds the real publish action or
  remains clearly labeled as a plan.

### 7. Delivery Milestones

Complete delivery through staged milestones. Each milestone must leave the code
contract-aligned and must not claim the whole editor is complete.

#### Milestone 1: Player Transform Publish Proof

Complete the end-to-end player transform flow first as a proof that the save and
publish architecture is real:

```text
select portal_arena_runtime or another runtime scene
  -> move player in editor
  -> live preview updates game window
  -> save edit
  -> publish level
  -> checked-in owner data changes for the player stable ID
  -> validation/build passes
  -> reload/restart game
  -> player starts at the published position
```

Acceptance criteria:

- The editor dirty state is not cleared until the durable write succeeds.
- A stale base hash blocks the write.
- The changed repo file is a known level owner or owned generated runtime module.
- Runtime does not import editor save/draft data.
- Production build loads the updated player position through normal runtime
  scene loading.
- Publish reports every changed file.

#### Milestone 2: General Level Instance Editing

Expand the same architecture from player transform to all level-instance
editing:

Current implemented slice: `set-transform` is no longer only a player proof.
The authoring operation/model path and generated published-transform writer now
accept valid non-player stable level instances in the selected runtime scene,
refuse unknown stable IDs, publish generated object-library insertions, and
publish bounded `replace-prefab` operations as generated prefab ID override
entries, and publish component-editing `set-component`/`remove-component`
operations as generated component set/removal entries. It also publishes
bounded `remove-level-instance` records for non-readiness-critical checked-in
instances and cancels generated insertions while clearing stale generated child
records.
Full Milestone 2 remains incomplete until create, duplicate, readiness-aware
delete/replacement with manifest/readiness updates, broad asset/component
replacement, grouping, multi-object operations, and undo/redo publish semantics have the same
owner-write coverage.

- create, duplicate, delete, move, rotate, scale, and group level instances.
- edit typed components through schema-backed panels.
- preserve stable IDs and refuse ambiguous ownership.
- support multi-object operations and undo/redo.
- report exact owner files, generated runtime files, and validation gates before
  publish.

#### Milestone 3: Asset, Prefab, And Feature Catalog Editing

Add catalog-backed editing for prefabs, assets, gameplay actors, portals,
interactions, render features, terrain/collision products, and audio features:

- every editable feature has a `LevelEditorFeatureCatalogContract` entry.
- every persistent operation resolves to a bounded owner target.
- every owner writer has validation, stale-hash refusal, and deterministic
  output.
- unsupported fields are disabled or reported as unsupported, never silently
  stored in editor-only data.

#### Milestone 4: Future-Level And Future-Feature Readiness

Make the editor a reusable level workspace rather than a collection of
hard-coded scene panels:

- new runtime scenes appear through manifests/catalog data.
- new editable feature families appear through typed feature/owner
  registrations.
- publish reports all changed files and required validation commands.
- the editor can open, preview, save draft, publish, discard, and reload all
  current levels without per-level code changes.
- future levels require data/contract registration, not editor source forks.

### 8. Validation

Add focused tests rather than broad catch-all tests.

Required new or updated test coverage:

- staged player transform edit produces a publishable owner write.
- owner write refuses stale base hash.
- owner write refuses unknown stable ID.
- publish refuses invalid dirty state.
- published player transform is visible through runtime scene data after rebuild.
- general level instance edits produce typed owner-write plans.
- catalog-backed feature panels reject unsupported or ownerless fields.
- prefab, asset, render, audio, terrain, and collision edit families each have
  focused save/publish contract coverage before they are enabled.
- newly registered runtime scenes appear in the editor without hard-coded UI
  branches.
- production editor bundle exclusion still passes.
- runtime does not import editor drafts or authoring transaction modules.
- publish stages all writes and rolls back the full changeset when a post-write
  gate fails (atomicity, requirement A).
- a no-op publish produces an empty `git diff`, and writing the same transaction
  twice produces identical bytes (determinism, requirement E).
- a stale base hash returns the recoverable-conflict path, not a silent
  overwrite (requirement B).
- publish refuses a dangling asset/prefab/portal-target reference (requirement
  D).
- an older `schemaVersion` draft is migrated or rejected, never silently misread
  (requirement F).

Validation commands for implementation work:

```bash
pnpm --dir apps/game.megameal test:level-editor-workspace-model-contract
pnpm --dir apps/game.megameal test:level-editor-save-contract
pnpm --dir apps/game.megameal test:level-authoring-contract
pnpm --dir apps/game.megameal test:runtime-scene-contract
pnpm --dir apps/game.megameal test:production-editor-bundle-contract
pnpm --dir apps/game.megameal audit:engine-boundaries
pnpm --dir apps/game.megameal type-check
pnpm --dir apps/game.megameal lint
pnpm --dir apps/game.megameal build
git diff --check -- apps/game.megameal pnpm-lock.yaml
```

Run broader `test:contracts` before handoff if the implementation touches shared
authoring, runtime scene, terrain, collision, asset, prefab, or render-profile
contracts.

## AAA Editor Cross-Cutting Requirements

The milestones above describe *which* edits become permanent. The requirements
below describe *how* permanence must behave so the editor reaches AAA-tier
robustness (Unreal, Unity, Godot). These apply to every owner-write path, not to
a single feature. They are binding once the corresponding write path is enabled.

First-slice status (re-audited 2026-06-17, generated level override owner path):

- A. Atomicity/rollback — implemented and tested (changeset + rollback).
- B. Concurrency/merge — partial: stale base hash refused with HTTP 409 and the
  override module is per-stable-ID; the reload/diff/re-stage recovery flow is
  still open.
- C. In-editor validation report — implemented (`LevelEditorValidationReport`).
- D. Reference integrity — partial: a `reference-integrity` validation category
  exists; rename/delete fixup policy is still open.
- E. Determinism/drift — implemented and tested (byte-identical no-op publish).
- F. Versioning/migration — `schemaVersion: 1` is stamped; the migrate-or-reject
  policy is not implemented.
- G. Recovery/autosave — open.
- H. Undo/redo ↔ save — open (scheduled with Milestone 2 instance editing).
- I. Preview/reload handoff — partial; confirm clear-before-reload as later
  feature families add preview.
- J. Editor viewport decision — documented choice; no in-editor gizmo viewport.

Keep this list honest as each requirement lands for later feature families.

### A. Publish Atomicity And Rollback

Publish is a multi-file mutation (a level owner plus one or more generated owner
modules, and possibly readiness data). A partially applied publish is the one
failure that can corrupt checked-in runtime data.

- Stage every owner write in memory first; validate the full write set; then
  commit all files or none. No file is written until the whole set is approved.
- Record a reversible publish changeset: every target file, its prior base hash,
  and its new content hash. A single command must be able to revert a publish to
  the recorded prior hashes.
- On any post-write gate failure (type-check, build, contract test), restore the
  prior file contents from the changeset and report the failure. Never leave the
  tree half-published.
- Publish must be idempotent: re-publishing identical staged operations produces
  no diff.

Current generated-owner foundation: the published level override writer stages
the full generated module contents in a reversible changeset before writing,
including transform overrides, placement insertions, component overrides, and
component removals. It records the prior hash and the staged current hash,
skips byte-identical writes, and exposes a rollback helper. Later owner files
must reuse that changeset shape and run post-write gates through the same
rollback path.

### B. Concurrency And Merge Model

Base-hash verification detects a stale write; it does not by itself define
recovery, and the editor may run beside `git pull`, a second editor tab, or a
co-author.

- Choose owner-write granularity that minimizes merge conflicts. Generated owner
  modules must serialize one entry per stable ID with stable key ordering (the
  `publishedLevelTransforms` override-list shape is the reference pattern). This
  is the project's equivalent of per-actor files and is the preferred target for
  high-churn data.
- On a stale base hash, the editor must offer an explicit recovery flow: reload
  owner data, show the on-disk vs staged diff, and let the user re-stage. It must
  never silently overwrite newer on-disk data.
- Two editors editing different stable IDs in the same generated module must
  merge cleanly at the text level; document this as a design constraint of the
  serialization.

### C. In-Editor Validation Surface (Map Check)

CLI contract tests are the publish gate, but an AAA editor surfaces validation
interactively before publish.

- Add a `LevelEditorValidationReport` distinct from the test scripts. It runs in
  the workspace and lists errors and warnings: duplicate stable IDs, missing
  owner provenance, unresolved asset/prefab references, render-profile light or
  budget overruns, missing readiness coverage, and unsupported staged fields.
- Errors block Publish. Warnings are surfaced in the output log but do not block.
- The report must be derived from the same validation contracts the CLI gates
  use, so the editor and CI cannot disagree.

### D. Asset And Reference Integrity

Edits reference stable IDs (prefab IDs, asset IDs, portal target manifest IDs).
Nothing may publish a dangling reference.

- Publish validation must prove every referenced stable ID resolves in the
  current catalog/manifest data.
- Define delete/rename policy for referenced assets and prefabs: a rename must
  either fix up referencing owner data in the same changeset or be refused; a
  delete of a referenced target must be refused with the referencing list.

### E. Determinism And Drift

Generated owner modules must be byte-deterministic or drift checks and diffs
become unreliable.

- All generated writers must emit stable formatting and stable key/array
  ordering (`serializeStableValue` is the reference helper).
- Add a determinism test: writing the same transaction twice yields identical
  bytes; a no-op publish yields an empty `git diff`.

### F. Data Versioning And Migration

Authoring drafts and generated owner modules carry `schemaVersion`. The plan must
state what happens when a format changes.

- Bump `schemaVersion` on any format change.
- Define a migrate-or-invalidate policy for older Save Draft modules and older
  generated owner modules so stale drafts cannot be silently misread as current.

### G. Recovery, Autosave, And Backup

- Extend Save Draft into autosave plus recovery-on-reopen so an editor crash or
  reload does not lose staged work. Recovery state is draft data and must never
  be runtime-readable.
- Publish backups are covered by the changeset in requirement A; recovery covers
  unsaved staged edits.

### H. Undo/Redo And Save Relationship

The feature list names undo/redo, but its relationship to persistence must be
explicit.

- Staged typed operations are the single source of truth. Preview is a
  projection of staged operations; the inspector edits the same operations; undo/
  redo manipulates the same operation log. None of these mutate engine core state
  directly.
- Define what happens to the undo history across a Publish: base hashes move on
  publish, so post-publish undo must either be invalidated or rebased against the
  new base. State the chosen behavior; do not leave it implicit.

### I. Preview And Reload Handoff

- When a preview patch is live and the user saves or publishes, the saved value
  is the staged operation, and preview is only its visual projection.
- A post-publish reload must clear active preview patches before re-importing
  runtime data, so a freshly published value is not double-applied over a stale
  preview.

### J. Editor Viewport And Manipulation (Architecture Decision)

Unreal, Unity, and Godot each provide a dedicated editor viewport with
manipulator gizmos (translate/rotate/scale, grid/vertex/surface snapping,
pivot/space toggles). This editor currently edits through numeric inspectors plus
preview patches sent to the running game window; it has no in-editor 3D viewport
with gizmos.

- This is a deliberate architecture choice, not an omission: the live game window
  is the viewport, and the editor stays a dev-only control surface that does not
  own runtime presentation.
- Record the intended ceiling: either commit persisted spatial drag-handle gizmos
  in the game-window preview as a named future packet, or document the
  numeric-inspector-plus-preview model as the intended interaction model. Either
  way, a reader comparing to AAA editors must not assume the missing viewport is
  accidental.

## Non-Goals

- Do not build deployment into editor Publish.
- Do not make runtime consume editor drafts.
- Do not add hidden production build writes.
- Do not copy old `apps/game` runtime/editor architecture.
- Do not add a generic arbitrary TypeScript rewriting layer.
- Do not treat the player transform proof milestone as completion of the level
  editor.
- Do not add feature-specific bypasses that cannot scale to future levels and
  future feature contracts.
- Do not store permanent feature data only in editor draft modules when the
  runtime requires owned level, prefab, asset, render, audio, terrain,
  collision, or readiness data.

## Completion Definition

This section is complete only when the level editor is an end-to-end,
AAA-tier level editing utility for all current levels and for future levels
registered through the architecture's catalogs, manifests, and owner contracts.

A user must be able to open any current runtime scene, inspect and edit every
supported level feature family, preview applicable edits live in the dev game
window, save draft work without implying runtime permanence, publish validated
owner changes, see checked-in runtime owner data change, run required
validation/build gates successfully, reload the game, and observe the published
state loaded through normal runtime scene data.

Every enabled editable feature must have:

- typed editor operations and schema-backed UI.
- temporary dev preview behavior where runtime preview is meaningful.
- bounded Save Draft and Publish semantics.
- explicit owner-target resolution and stale-base refusal.
- deterministic writes to known checked-in owner files or owned generated
  runtime modules.
- focused contract tests and validation gates.
- no runtime import of editor drafts, authoring queues, or preview state.

The player-spawn/player-transform workflow is the first acceptance milestone
for proving the architecture. It is not the completion definition for the level
editor.
