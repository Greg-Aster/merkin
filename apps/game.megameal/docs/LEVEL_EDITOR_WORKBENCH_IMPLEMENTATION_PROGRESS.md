# Level Editor Workbench Implementation Progress

Status: active implementation log

Goal: build the Megameal level editor into a complete, maintainable,
contract-aligned, AAA-tier professional level editor. This document is the
central progress tracker while implementation is underway. Do not mark the
editor complete here until the end-to-end workbench, viewport/direct
manipulation, persistent authoring, validation, save/publish, and cleanup
criteria are all met.

## Contract Anchors

- `LevelEditorWorkbenchContract` in `ENGINE_CONTRACT_REGISTER.md`
- `docs/LEVEL_EDITOR_AAA_RESEARCH_AND_GAP_ANALYSIS.md`
- `docs/LEVEL_EDITOR_WORKSPACE_ALIGNMENT.md`
- `docs/LEVEL_EDITOR_SAVE_PUBLISH_COMPLETION_PLAN.md`
- `docs/LEVEL_EDITOR_LEGACY_FEATURE_RECREATION_PLAN.md`
- `ARCHITECTURE.md`
- `GAME_ENGINE_DESIGN_DOCUMENT.md`
- `LevelEditorMaintainabilityContract` in `ENGINE_CONTRACT_REGISTER.md`

## Current Truth

- The current editor is a foundation, not a finished AAA-tier editor.
- The generic runtime/editor default is `starter_runtime`, a neutral starter
  scene for clean installs. `portal_arena_runtime` remains selectable Merkin
  game content and must not become the implicit editor fallback or engine
  starter identity.
- Current strengths: dev-only boundary, runtime catalog selection, stable-ID
  objects, grouped outliner data with manifest path and affordance metadata,
  outliner search/category/lock/pickability/visibility filters,
  browser-local editor workspace persistence for per-object hide/show,
  lock/unlock, isolate, and reset view state,
  editor-owned outliner multi-select foundation with a primary inspector object,
  synchronized projected viewport pin selection, projected viewport marquee
  selection, and a selection-set inspector,
  inspector transform/component fields, dev-preview bridge, editor-projected
  frame selected/selection/all camera commands,
  workflow/publishability labels, object-library placement readiness, Save
  Draft, and bounded generated-owner Save Level/Publish for transforms and
  object-library placements, level-instance prefab ID replacements,
  level-instance component overrides, and level-instance component removals,
  plus bounded level-instance removals and a guarded selected-instance duplicate/removal action pair
  in the workbench.
- Current major gaps: rendered-scene transform gizmos/direct manipulation,
  rendered-scene camera navigation/depth, checked-in/shared editor metadata
  owner for saved workbench view state, bulk owner-write operations for
  multi-selected objects, owner writes for component families that need
  non-level owners, and full
  professional editor ergonomics beyond the first workbench shell.
- Rendered-scene hit-test result foundation exists in this fork. The dev-preview
  protocol now validates and dispatches `rendered-scene-hit-test-request` and
  `rendered-scene-hit-test-result` messages with `LEVEL_EDITOR_DEV_PREVIEW_PROTOCOL`,
  `requestId`, `runtimeSceneId`, optional pickable `stableId` filters,
  stable-ID hit results, editor object view-state gating, and
  `writesRuntimeData: false`. The dev runtime now wires
  `ThreeRendererAdapter.hitTestRenderedScene` into the preview bridge, maps
  adapter-local entity hits back to runtime `StableId` components, and posts
  hit/miss/ignored result payloads without Svelte-side Three/canvas scraping.
  The workbench can now send those requests from Select-mode viewport clicks and
  consume runtime hit-test responses through
  `LEVEL_EDITOR_RENDERED_HIT_TEST_SELECTION_CONTRACT` as stable-ID editor
  selection when the hit object is still known and editor-pickable. Projected
  transform pins remain the editor fallback when the runtime rendered hit-test
  requester is unavailable. This is a renderer-backed stable-ID selection path,
  not proof of a complete direct-manipulation system.
- Rendered-scene box/marquee selection now uses the same dev-preview boundary.
  Select-mode marquee gestures can send `rendered-scene-box-select-request`
  messages with a CSS-pixel screen rectangle and pickable stable-ID filters;
  the dev runtime projects adapter-attached object root positions through
  `ThreeRendererAdapter.boxSelectRenderedScene`, maps entity hits back to
  stable IDs, and returns `rendered-scene-box-select-result` payloads with
  `runtime-rendered-scene-box-select` provenance and `writesRuntimeData:
  false`. The Three adapter uses projected render-object bounds from adapter
  `Box3` data rather than only the object root origin. The workbench consumes
  those results as editor selection state only. The existing projected marquee
  remains the fallback when the rendered requester is unavailable. This is
  bounds-aware stable-ID box selection, not occlusion-aware lasso selection and
  not transform manipulation.
- Known validation status: the latest recorded focused editor gate set,
  aggregate contract suite, type-check, lint, boundary audit, production bundle
  guard, build, legacy-reference audit, and diff check passed after adding
  editor-projected frame selected/selection/all camera commands and the first
  selected-object inspector Renderable mesh/material picker slice. Build still
  reports the existing Astro/Vite
  warnings for an empty editor chunk, large client chunks, and GET generation
  for POST-only editor authoring API routes.
- The editor must keep moving toward a workbench that reads as a professional editor instead of stacked diagnostic panels.
- UX consolidation lane active: the immediate failing point is not missing
  planned systems, but the current presentation of every status/debug/tooling
  surface as an equally important window. The consolidation pass must keep the
  same editor capabilities while prioritizing the central viewport/workbench,
  left outliner, right inspector, and bottom content drawer; validation,
  command plans, telemetry, terrain/collision status, and logs should become
  secondary dock/drawer surfaces unless the user is actively working in them.
- Maintainability ratchet: the editor is still intended to become a complete
  AAA-quality game and level editor, but new capability must not disappear into
  unbounded central files. `test:level-editor-maintainability-contract`
  enforces central file budgets as extraction triggers, not feature ceilings.
  Large systems are valid when they have focused owners, clear runtime/editor
  boundaries, durable validation, and documented contract ownership.
- Old `apps/game` editor code remains reference/provenance only. Do not import
  it, copy its runtime architecture, or load old scene JSON as target data.

## Active Agent Lanes

| Lane | Owner | Write scope | Status |
| --- | --- | --- | --- |
| Workbench shell model | Agent 1 | focused `src/app/editor` model helpers; no workspace/CSS integration | Integrated |
| Selection/workflow clarity | Agent 2 | workspace model clarity and focused tests | Integrated |
| Save/publish capability clarity | Agent 3 | authoring/save model/status and focused tests | Integrated |
| Viewport bridge seam | Agent 4 | focused editor viewport bridge model/panel seam | Integrated |
| Content browser/placement readiness | Agent 5 | object library/content-browser model and focused tests | Integrated |
| Contract/progress hygiene | Agent 6 | level-editor contract tests/docs | Integrated |
| Main integration | Codex main thread | progress doc, workbench integration, validation, final cleanup | In progress |

## Implementation Checkpoint

| Area | Current status | Remaining end-state gap |
| --- | --- | --- |
| Workbench shell | First professional shell integrated with a prioritized bottom dock for content, staged operations, validation, commands, output, and filterable outliner hierarchy | Needs runtime-backed viewport depth and final layout polish |
| Selection | Stable-ID selection drives searchable outliner filtering, manifest path/category affordances, inspector, projected viewport pins, projected viewport click picking, runtime-backed rendered viewport click picking when the preview bridge is live, projected viewport marquee selection, runtime-backed rendered bounds-aware box/marquee stable-ID selection when the preview bridge is live, object-library context, a selection-set inspector, browser-local editor workspace persistence for per-object hide/show, lock/unlock, isolate/reset state, and an editor-owned outliner/category-aid multi-select foundation. Multi-select keeps a primary inspector object, synchronizes selected projected viewport pins, and deliberately disables bulk owner-write operations. | Needs bulk operation contracts, occlusion-aware advanced rendered selection modes, and a checked-in/shared editor metadata owner for durable team-visible view state |
| Inspector | Editable fields stage authoring edits with workflow labels, component-grouped inspector sections, including level-instance transform position/rotation/scale fields, `set-component` save operations for supported component fields, and a first selected-object Renderable mesh/material picker slice backed by scene-scoped manifest assets with active level-instance scope, future-disabled prefab/asset scopes, and current/dirty/staged state | Needs broader component editors, richer rendered mesh thumbnails, enabled prefab/asset scopes after owner-write contracts exist, and owner-write families beyond bounded level-instance component records |
| Save/Publish | Save Draft plus bounded generated-owner Save Level/Publish for transforms, object-library placements, level-instance prefab ID replacements, level-instance component overrides/removals, bounded level-instance duplicate insertions, bounded level-instance removals, and bounded staged authoring undo/redo are guarded | Needs publishable coverage for collision, terrain, audio manifest, NPCs, environment/render-profile edits, asset-manifest edits, prefab-owned component edits, readiness-owner deletes/replacements, broad asset/component replacement, grouping, stable-ID management, and post-publish undo/redo semantics |
| Viewport bridge | Projected pins, projected frame-click picking, explicit Select/Place/Transform tool modes, transform position/rotation/scale nudges, snap controls, screen-space transform handles, projected X/Z translate dragging, editor-side camera/framing controls with frame selected/selection/all commands, placement target, hover-aware placement ghost, Place-mode click placement, and snap-aware normalized object-library drop placement exist; runtime-backed rendered-scene click selection and rendered-scene bounds-aware box/marquee stable-ID selection through the dev-preview request/result path also exist | Needs rendered-scene gizmos, arbitrary drag placement with editor-consumed hit-test results, rendered-scene camera navigation/depth, and advanced rendered selection modes beyond rectangular bounds overlap |
| Content browser | Search/filter, current-scene usage filtering/sorting, previews, publish-ready placement readiness, transform composer, staged review/removal, hover-aware viewport ghost handoff, Place-mode click placement, and draft-ready drag metadata exist | Needs asset import workflows, richer placement ergonomics, and full rendered viewport placement |
| Validation/contracts | Focused contract guards and central progress log are active | Needs final focused validation, build evidence, and legacy-reference audit before declaring the whole editor complete |
| Maintainability | Central workspace/model/viewport/object-library/CSS budgets are now guarded by `test:level-editor-maintainability-contract`; the budgets are extraction triggers, not feature ceilings | Needs continued extraction of outliner, selection-set, viewport, object-library, authoring queue, and CSS ownership as new AAA editor systems land |
| UX consolidation | Active pass demotes status/debug windows into secondary dock affordances while preserving current editor behavior | Needs follow-up with a true rendered-scene viewport and task-mode specific layouts once runtime-backed picking/direct manipulation land |

## Implementation Packets

### Packet 1: Workbench Foundation

Intent: stop treating the editor as a loose stack of boxes and introduce the
first professional workbench structure.

Required outcomes:

- Top toolbar communicates scene, dirty state, command state, and live-preview
  status.
- Left hierarchy/outliner is the primary scene selection surface.
- Center work area reserves the future viewport/live-game bridge as a first-
  class region.
- Right inspector owns selected-object details and editable fields.
- Bottom dock owns content library, validation, output log, command plan, and
  specialist panels.
- Current Object Selection is either folded into selection summary or clearly
  labeled as a helper, not the final editor architecture.

Status: first integration slice implemented.

Progress:

- Added the first workbench shell to `LevelEditorWorkspace.svelte`: left
  outliner, central viewport bridge, central selection summary, engine map, and
  right inspector.
- Added viewport bridge styling and responsive workbench rules in
  `src/styles/editor.css`.
- The viewport bridge is currently an editor-side contract surface over the
  existing live-preview channel and telemetry. It does not claim direct
  viewport picking or transform gizmos yet.
- The scene hierarchy/outliner now has a stable-ID-aware search filter across
  object labels, categories, prefab IDs, owner provenance, components, assets,
  and workflow labels. Filtering changes the hierarchy view only; selection
  remains the same stable-ID workspace state shared by the inspector, viewport,
  preview, and object library.
- The outliner now also filters by manifest object category, authoring lock
  state, projected pickability, and visibility metadata. These are hierarchy
  filters over current editor metadata, not persisted visibility/lock toggles.
- Filtered outliner results can now drive selection-set actions: select shown,
  add shown, and clear selection. These actions reuse the editor stable-ID
  selection model and do not stage bulk owner writes.
- Outliner rows now expose manifest-derived object paths and read-only
  visibility, authoring lock, and pickability affordance labels. These labels
  clarify what the current editor can do without adding fake toggles or a new
  persistence contract for visibility/isolation/lock state.
- `EditorObjectViewState` is now implemented as a browser-local editor
  workspace persistence model and workbench control slice for per-object
  hide/show, lock/unlock, isolate, reset, filtered outliner membership, and
  projected viewport pickability. It is keyed by stable ID, scoped by runtime
  scene, reports unknown state for cleanup, and explicitly does not write
  runtime data, owner files, or checked-in/shared editor metadata.
- The projected viewport bridge now receives the editor view-state projection:
  hidden objects are omitted from projected pins, editor-locked objects remain
  visible but non-pickable, and marquee/click selection only returns pickable
  projected transform pins.
- Future checked-in/shared scene/editor metadata must get an explicit
  non-runtime owner before saved view presets, team-visible visibility sets,
  isolation sets, lock overrides, panel layout, editor notes, or per-scene
  workbench preferences are treated as durable shared data.
- Replaced the lower equal-weight diagnostics grid with a prioritized bottom
  dock. The content browser now owns the primary dock lane, while staged
  operations, validation, command gates, and output log have named dock areas;
  runtime telemetry and specialist tools remain available as secondary dock
  panels instead of competing with publish-readiness surfaces.

### Packet 2: Selection And Inspector Coherence

Intent: one stable selected-object model drives outliner, future viewport,
inspector, preview, object library, and staged operations.

Status: first draft-staging slice implemented; not complete.

Progress:

- `LevelEditorWorkspaceModel` now exposes a `selection` summary and
  object/field workflow metadata for selection state, editability, preview mode,
  storage policy, publishability, owner feature families, and reason text.
- Selection metadata is generic and derives from stable IDs, object categories,
  field paths, and the feature coverage registry. It is not hard-coded to the
  portal arena scene.
- Workspace model contract coverage now verifies selected, missing, and empty
  selection states.
- The viewport overlay, selection summary, inspector summary, and inspector
  fields now show selected-object and field workflow labels/reasons from the
  workspace model.
- The workbench now has an editor-owned multi-select foundation for the
  outliner and category-aid surfaces. Ctrl/Cmd selection toggles stable-ID
  objects, visual selection state is shared by the outliner, spatial map, and
  focus list, and the selected ID list is passed to the AI asset lab context.
- Multi-select keeps the first selected stable ID as the primary inspector,
  viewport transform, preview, duplicate/remove, and object-library replacement
  subject. The contract is explicit that bulk owner-write operations remain future:
  bulk transform, duplicate, removal, and Save Level/Publish mutation for
  multi-selected objects require explicit owner-write contracts and validation
  paths.
- The viewport bridge now consumes the same selected stable-ID list as the
  outliner/category aids. Projected pins show secondary selections while
  transform controls, placement target anchoring, camera framing, and preview
  behavior remain bound to the primary selected stable ID.
- The viewport bridge now supports projected marquee selection in Select mode.
  Dragging across the projected viewport selects transform-positioned stable IDs
  inside the rectangle, replacing selection by default or extending it with
  Ctrl/Cmd. This is still editor-projected selection, not rendered-scene
  hit testing, and it does not enable bulk owner-write operations.
- Multi-selection now exposes a selection-set inspector inside the selection
  summary. It shows selected category counts, common component names, and
  selected object rows with primary-selection and remove-from-selection
  controls. These controls reorder or trim the editor selection only; they do
  not stage bulk runtime owner writes.
- Added focused contract coverage in
  `test:level-editor-selection-model-contract` for selection normalization,
  additive toggling, primary-object behavior, and the disabled bulk-operation
  contract.

### Planned blockout-to-reimagined asset workflow

Status: first inspector mesh/material picker slice implemented; not complete for
the full blockout-to-reimagined visual replacement workflow.

Target: designers block out levels with simple primitives/prefabs, then select
objects in the level editor and replace their visual mesh/material with either
an existing manifest-backed asset or a new Hunyuan/ComfyUI generated asset.

Current foundation:

- Stable-ID selection, outliner selection, viewport selection aids, and primary
  inspector selection already provide the selected-object context.
- The inspector shows the selected object's prefab/source owner, components,
  preview data, workflow labels, and supported editable fields.
- Object Library builds a manifest-backed asset/prefab catalog and can stage
  selected-object replacement drafts for renderable mesh/material references,
  audio references, and prefab replacement.
- The selected-object inspector now exposes a compact Renderable picker for
  current `Renderable.meshId` and `Renderable.materialId`, scene-scoped
  manifest-backed mesh/material choices, explicit level-instance scope,
  future-disabled prefab/asset-manifest scopes, current/dirty/staged state
  labels, and preview/stage actions. These picker edits preserve stable IDs and
  existing renderable state by default, and they reuse the Object Library
  replacement draft/queue path instead of adding a separate persistence model.
- AI Asset Lab receives the selected stable-ID list and has Hunyuan/ComfyUI
  backend contracts, generated asset records, and apply-to-selection edit plans.

Missing before the workflow can be called complete:

- The inspector Renderable picker still needs richer rendered mesh thumbnails
  and eventually enabled prefab-definition and asset-manifest scopes after their
  owner-write contracts exist. Save Level/Publish coverage is unchanged in this
  slice; picker-staged renderable asset-reference edits remain on the existing
  generated authoring transaction path until a bounded owner-write path for this
  operation family is implemented and validated.
- AI Asset Lab still needs real generation dispatch/result harvesting and
  generated asset import into a manifest-backed library.
- Save/Publish still needs durable generated asset manifest writers and
  renderable asset-reference owner writes for this operation family.
- Generated visual replacement must preserve stable IDs and gameplay components
  by default; collision, portal behavior, audio, scripts, and physics are not
  inferred from the generated mesh unless the user explicitly edits those
  owners.

### Packet 3: Save/Preview/Publish Clarity

Intent: every staged operation clearly says whether it is preview-only,
draft-only, save-level capable, or publishable.

Status: first staged-operation clarity slice implemented; not complete.

Progress:

- Save/publish metadata now comes through registry-backed workflow labels:
  publishable, draft-only, cook/bake publish, preview-only, read-only, blocked,
  and mixed publishability.
- Publish rejects mixed transactions that include unsupported operations instead
  of silently publishing only supported transform edits.
- Save Level/Publish now cover the bounded generated-owner families for
  level-instance transform overrides, object-library `insert-level-instance`
  placements, level-instance `replace-prefab` overrides, level-instance
  `set-component`/`remove-component` overrides, and bounded
  `remove-level-instance` operations.
- Inspector fields now expose their publishability and storage policy beside
  editable values, so draft-only, cook-only, preview-only, read-only, and mixed
  fields are visible before staging work.
- Inspector fields are now grouped by their component owner, so `Transform`,
  `Portal`, `Light`, `SoundEmitter`, and read-only component rows expose a
  group-level editability/publishability summary before the individual field
  controls. This remains a presentation/model clarity layer over the existing
  staged authoring queue; field input still stages through the same
  `stageLevelEditorFieldEdit` path.
- The command bar now exposes `Discard Staged` as a distinct action from Save
  Draft, Save Level, Publish, Preview, and Reload. It uses the existing staged
  edit discard path and preview-clear request path rather than a new persistence
  mechanism.
- Added a `Staged Operations` dock panel that lists queued authoring-operation
  entries, edit/save operation counts, and targeted removal for one queued entry
  without clearing unrelated field edits or unrelated queued entries.
- The `Staged Operations` dock now also lists staged field edits with
  before/after values and a targeted `Revert` action for one field edit without
  clearing queued object-library, viewport, AI, NPC, environment, or camera
  operation entries.
- Core object preview patch construction now reads the staged field display
  values used by the inspector and viewport controls instead of scraping
  inspector DOM inputs. This keeps preview, inspector, viewport nudges, and
  staged operations on one authoring-state path.
- Targeted staged-field `Revert` now reconciles live core-object preview state
  for objects previewed by the editor: remaining staged edits refresh the
  temporary preview from the post-revert queue, while reverting the final staged
  edit clears that object's preview.
- The command bar and `Staged Operations` panel now expose staged owner-write
  readiness before Save Level/Publish runs. The editor distinguishes
  publish-ready transform edits from draft-only or mixed queued operations and
  blocks first-slice owner-write commands with explicit reasons when the queue
  contains unsupported operation families.
- The staged owner-write readiness classifier now lives in the focused editor
  UI helper instead of only inside the Svelte workbench component. Focused
  contract coverage now proves clean, publish-ready, draft-only, and mixed
  staged-operation states without expanding the supported publish family list.
- The `Staged Operations` dock now renders a per-queued-entry permanence
  summary from the focused editor UI helper. Each queued entry is labeled as
  Preview only, Save Draft only, mixed persistence, or Save Level/Publish ready,
  with user-facing detail about whether the entry has no durable operation,
  generated draft persistence, a bounded generated owner write, or unsupported
  operation families that must be split or removed before publishing. This is
  display-only; Save Draft, Save Level, Publish, Preview, Reload, and Discard
  still use the existing queue and owner-write paths.
- The staged authoring queue now exposes bounded undo/redo history for field
  edits and queued operation entries. The command bar and staged operations
  panel show undo/redo depth and the queue history limit, while focused queue
  contract coverage proves field-edit undo/redo, queued-save-operation
  undo/redo, divergent edit redo clearing, and bounded retained history. This
  is pre-save authoring history only; post-publish rollback and cross-session
  undo remain future owner-write work.
- Next-slice safeguard: renderable mesh/material replacement drafts currently
  stage full `Renderable` component updates. Before enabling final saved
  renderable-reference publish semantics, the picker must preserve staged mesh
  and material changes together rather than allowing later full-component
  drafts to overwrite earlier staged `Renderable` fields.

### Packet 4: Viewport Bridge And Direct Manipulation

Intent: add the central editor viewport/live-game viewport bridge, selection
overlays, view modes, and later transform gizmos.

Status: integrated first interactive bridge slice; not complete.

Progress:

- Added `levelEditorViewportBridgeModel.ts` as an editor-only model for the
  live-game route, dev-preview transport, selected stable-ID object, view modes,
  overlays, scene mismatch status, and future gizmo readiness.
- Added a passive `LevelEditorViewportBridgePanel.svelte` surface for future
  integration.
- Integrated the bridge model into `LevelEditorWorkspace.svelte`, so the central
  viewport region now reads from the same selected stable ID, runtime telemetry,
  editor view mode, and overlay state used by the workbench.
- Added editor-side projected object pins to the viewport bridge. The pins are
  normalized from manifest-owned `Transform.position.x/z` fields, use stable IDs
  for selection, and call the same workspace selection flow as the outliner.
- Added the first viewport transform-control slice: selected objects expose
  Position/Scale nudge controls from manifest-owned `Transform` fields, and the
  controls stage the same authoring field edits used by the inspector.
- Extended transform authoring to expose `Transform.rotation` quaternion fields
  in the inspector, owner-write transaction construction, and dev-preview
  transform patches. Viewport Rotate mode now presents a yaw-degree control that
  stages coherent quaternion field edits through the same authoring queue rather
  than exposing raw quaternion component handles as a viewport gizmo.
- Added explicit transform mode and snap-step controls to the viewport bridge:
  the model now carries the active transform mode, available transform modes,
  per-mode snap options, and active snap step; the panel filters nudge controls
  by active mode and sends snap-sized deltas through the existing staged field
  edit path.
- Viewport projected pins now consume staged `Transform.position` field
  overrides, so nudge controls, pin placement, and viewport-targeted placement
  use the same staged authoring values.
- Added screen-space transform handles anchored to the selected projected
  object. The handles are visual/clickable editor controls for the active
  transform mode and stage the same authoring field edits as the nudge grid;
  they still do not claim real rendered-scene picking or runtime mutation.
- Added a projected X/Z translate drag handle for the selected object. Dragging
  maps pointer movement through the same snap-aware normalized viewport surface
  used by placement, preserves the selected object's authored Y, and stages
  `Transform.position.x/z` field edits through the existing authoring queue.
  This is editor-projected direct manipulation, not a rendered-scene raycast
  gizmo.
- The viewport bridge projection now carries all editor-selected stable IDs and
  marks one primary selected object. Projected viewport pin clicks support the
  same Ctrl/Cmd additive selection flow as the outliner, but transform handles
  still target only the primary selected object until explicit bulk transform
  contracts exist.
- Select mode now supports a projected viewport marquee rectangle. The marquee
  calls the same workspace stable-ID selection path as pins and the outliner,
  using `viewportSelectProjectedObjectsInRect` over normalized transform X/Z
  pins. It remains a projected editor affordance and does not claim rendered
  scene raycast or surface selection.
- Rendered-scene picking must be a future dev-preview request/response
  protocol slice, not Svelte or Three scraping. The editor-side request should
  carry pointer coordinates, requested pick mode, active `runtimeSceneId`, and a
  `requestId`; the runtime/adapter response should carry a matching request ID,
  scene ID, stable ID or explicit no-hit/rejection reason, optional world-space
  hit data, and stale-response semantics. Until those message types, runtime
  handlers, adapter queries, and focused protocol/model tests exist in code,
  this tracker must continue to call rendered-scene picking future work.
- The viewport frame now accepts draft-ready object-library drag payloads as a
  bounded placement surface. Dropping a prefab maps the normalized viewport
  pointer point into manifest-derived X/Z transform bounds, then stages the same
  `insert-instance` plus generated `insert-level-instance` operation used by
  the explicit placement target and placement ghost controls; it does not write
  runtime data or claim rendered-scene hit testing.
- Viewport object-library drops now use the active translate snap step before
  staging authored X/Z placement coordinates. The snap source is explicit on
  the viewport placement surface and remains editor-only authoring state, not
  runtime-owned scene data.
- Added editor-side viewport camera/framing controls for orbit, top, front,
  side, and iso modes plus bounded zoom. These controls frame the selected
  stable-ID object or scene bounds inside the editor bridge model and explicitly
  do not stage authoring edits or mutate runtime camera data.
- Added explicit editor viewport camera framing commands for Frame Selected,
  Frame Selection, and Frame All. The commands derive target stable IDs,
  projected focus points, and suggested zoom from the viewport bridge model,
  run only through editor navigation state, and do not stage authoring edits or
  mutate runtime camera data.
- Added an explicit viewport interaction tool contract for Select, Place, and
  Transform modes. The model exposes tool readiness, sources, blocked reasons,
  and a hard `renderedScenePickingEnabled: false` boundary; the panel gates
  projected pins, placement drops, placement target staging, transform handles,
  and nudge controls through the active tool instead of letting every
  affordance be active at once.
- Place mode is now additionally gated by an active draft-ready placement
  target in the workbench UI. A ready normalized placement surface alone is not
  enough to enter Place mode; the editor must also have an object-library entry
  that can actually stage a placement operation.
- Added projected viewport frame-click picking for Select mode. The shared
  bridge resolver picks the nearest projected stable-ID transform pin inside a
  bounded radius and returns `renderedScenePicking: false`, so this improves
  viewport selection flow without claiming rendered-scene raycast hit testing.
- Added Place-mode viewport click placement for the active draft-ready object
  library entry. Clicking the viewport while Place is active maps the click to
  the same snap-aware normalized X/Z placement surface as drops, stages the
  existing generated `insert-level-instance` save operation, and records the
  source as `viewport-click` instead of collapsing it into drag/drop behavior.
- Added a hover-aware Place-mode placement ghost. While Place is active and an
  object-library entry is draft-ready, the viewport ghost follows the cursor on
  the normalized placement surface and stages through the same `viewport-click`
  authoring path when activated; the old selected-object target remains the
  fallback when there is no hover point.
- View mode and overlay toggles are editor-side controls only. They do not
  mutate runtime data, do not bypass owner manifests, and do not claim real
  rendered-scene drag-handle transform manipulation yet.
- Registered `test:level-editor-viewport-bridge-model-contract`.
- Rendered-scene direct manipulation remains disabled and explicitly modeled as
  future work.

### Packet 5: Content Browser And Placement

Intent: make the asset/object browser a real content browser with search,
preview, placement readiness, replacement state, and publishability labels.

Status: not complete.

Progress:

- Object-library entries now expose placement readiness metadata.
- Prefab entries are draft-ready placement candidates; asset entries remain
  replacement-only.
- Placement metadata now marks prefab entries as publish-ready through the
  generated level insertion owner while asset entries remain replacement-only.
- The object-library panel now shows draft placement counts, publish placement
  counts, placement status, readiness reasons, and file-write status.
- Prefab entries can now stage draft placement operations into the authoring
  queue as `insert-instance` plus generated `insert-level-instance` save
  operations.
- The viewport bridge can now stage the active object-library placement draft at
  the selected transform-positioned viewport object. This uses the same
  `insert-instance` plus generated `insert-level-instance` draft operation shape
  as the object-library panel, with a separate queued authoring entry so panel
  placement drafts are not overwritten.
- The object-library panel now has content-browser controls for search, entry
  kind, and workflow readiness. The filtered list keeps grouped ownership,
  selection still uses the same stable entry IDs, and the empty state makes
  search/filter misses explicit without inventing runtime data.
- The object-library panel now receives current-scene prefab/asset usage from
  the workspace projection. It exposes used/unused counts, a usage filter, and
  name/most-used/unused-first sort modes so the content browser can distinguish
  already-used scene content from available catalog entries without adding asset
  import, thumbnail cooking, or new owner-write behavior.
- The object-library panel now exposes a placement-transform composer for
  draft-ready prefab entries. Position, yaw, and scale values feed the existing
  `insert-instance` plus generated `insert-level-instance` draft operation
  path, so staged placements can be authored before entering the queue without
  making placement publishable or runtime-owned.
- Staged object-library placements now show their authored transform summaries
  and can be removed from the panel. Removing the final placement routes
  through the workspace's existing queued-operation removal path so the local
  content-browser list and central staged operations queue stay synchronized.
- The viewport bridge now draws an editor-only placement ghost at the selected
  projected object when the active object-library entry has a draft placement.
  The ghost stages through the same viewport placement command as the placement
  target panel, keeping central viewport placement visible without enabling
  runtime mutation or claiming true drag/drop.
- Draft-ready prefab entries now expose native drag metadata. The central
  viewport frame consumes that payload as a contract-guarded drop target and
  routes the drop through the same viewport placement queue entry used by the
  placement ghost.
- Shared prefab entries now normalize their placement draft stable-ID pattern
  to the currently selected runtime scene's level ID in the object-library panel
  model. This preserves the manifest-backed generated-owner insertion workflow
  while preventing de-duplicated catalog entries from staging placements with a
  different scene's level prefix.
- Save Level/Publish now accepts object-library `insert-level-instance`
  operations through the same bounded generated runtime owner path as transform
  and component overrides. Generated insertions are serialized into
  `src/game/generated/publishedLevelTransforms.ts` and loaded by normal runtime
  level override composition.
- Placement is publishable only for generated object-library insertion
  operations. The current drop target is a bounded, snap-aware normalized
  top-down placement surface derived from authored transforms; rendered-scene
  drop projection, arbitrary surface hit testing, and authored transform
  picking remain future work.

### Packet 6: Persistent Owner Writes Beyond Transform Overrides

Intent: expand persistence one owner family at a time through generated,
validated, rollback-safe owner modules. Start with level-instance component
overrides only after the workbench UI can explain publishability.

Status: first bounded level-instance component set/removal slice implemented; not
complete.

Progress:

- `component-editing` is now registered as a bounded generated-owner publish
  family with `runtime-owner-publish` storage for level-instance
  `set-component` and `remove-component` operations.
- Save Level/Publish now accept level-owned `set-component` and
  `remove-component` operations with `target: "level-instance"` and record them
  as generated `PublishedLevelInstanceComponentOverride` or
  `PublishedLevelInstanceComponentRemoval` entries in
  `src/game/generated/publishedLevelTransforms.ts`.
- Runtime level override composition applies generated component overrides and
  removals alongside generated insertions and transform overrides before normal
  scene loading consumes the level data.
- Component removals clear stale generated component overrides for the same
  runtime scene, level ID, stable ID, and component name so later removal
  publishes win deterministically over earlier set publishes.
- Broader component families that require asset, render-profile, audio
  manifest, prefab, terrain, collision, NPC/AI, or environment owners remain
  unsupported for publish unless they can be expressed as a level-instance
  `set-component` or `remove-component` operation through the current bounded
  generated owner.
- Level-instance transforms, object-library placements, level-instance prefab ID
  replacements, level-instance component set/removal records, and bounded
  level-instance removals are the current generated owner-write families.
  Unsupported/draft-only publish capability reasons remain explicit for
  broad asset/component replacement, collision, terrain, audio, NPC,
  environment, prefab-owned component edits, readiness-required replacement,
  and other feature families outside the current generated level override owner.

### Packet 7: Level Instance Delete Owner Writes

Intent: add professional editor deletion semantics without overclaiming broad
level-structure editing. Deletion must flow through the existing authoring
operation/save transaction/generated owner pipeline and remain blocked for
readiness-critical IDs until manifest/readiness owner writes exist.

Status: bounded slice implemented; not complete.

Progress:

- `level-instance-removal` is registered as a bounded generated-owner publish
  family for `remove-instance` authoring operations and persisted
  `remove-level-instance` save operations.
- Save Level/Publish now accept level-owned `remove-level-instance` operations
  that contain a `remove-instance` payload for the same stable ID.
- Checked-in non-readiness-critical instance removals serialize as generated
  `PublishedLevelInstanceRemoval` records in
  `src/game/generated/publishedLevelTransforms.ts`.
- Generated insertion removals cancel the generated insertion and clear stale
  generated transform/component records without writing a tombstone for data
  that only existed in the generated owner.
- Runtime level override composition applies whole-instance removals last so
  deletion wins over insertion, component set/removal, and transform records
  before normal runtime scene manifest loading consumes the materialized level.
- Writer-side preflight rejects readiness-required checked-in instance removal
  until a matching manifest/readiness owner writer exists.
- The workbench now exposes a selected-object `Stage Removal` action in the
  selection summary and inspector. It stages a normal `remove-instance`
  queued operation through the existing authoring queue and disables the action
  when the selected stable ID is required for runtime scene readiness.
- Replacement, grouping, stable-ID management, readiness-aware delete with
  manifest/readiness updates, multi-object operations, and undo/redo publish
  semantics remain open.

### Packet 8: Level Instance Duplicate Owner Writes

Intent: add a bounded professional duplicate action without overclaiming broad
level-structure editing. Duplication must flow through the existing authoring
operation/save transaction/generated owner pipeline and remain separate from
replacement, grouping, and stable-ID management.

Status: bounded slice implemented; not complete.

Progress:

- `level-instance-duplication` is registered as a bounded generated-owner
  publish family for `insert-instance` authoring operations and persisted
  `insert-level-instance` save operations.
- The workbench exposes a selected-object `Duplicate` action in the selection
  summary and inspector. It copies the selected manifest-backed level instance,
  generates a unique duplicate stable ID, applies a small position offset when
  the source object has a transform position, and stages the result as a normal
  `insert-instance` queued operation.
- Save Level/Publish continues to route the staged duplicate through the
  existing generated level insertion owner path. The duplicate action does not
  directly mutate runtime state or rewrite checked-in level files.
- Replacement, grouping, stable-ID management beyond the generated duplicate
  ID, multi-object duplication, viewport-projected placement picking, and
  readiness-owner updates remain open.

### Packet 9: Level Instance Prefab Replacement Owner Writes

Intent: make object-library replacement durable for the narrow case that can be
owned safely today: swapping a level instance's `prefabId` through the generated
runtime level override module. This is not a broad asset, component-schema, or
prefab-definition rewrite.

Status: bounded slice implemented; not complete for broad replacement.

Progress:

- `level-instance-prefab-replacement` is registered as a bounded generated-owner
  publish family for `replace-prefab` authoring operations and persisted
  `replace-level-instance` save operations with a `replace-prefab` payload.
- Save Level/Publish stages generated `PublishedLevelInstancePrefabOverride`
  records in `src/game/generated/publishedLevelTransforms.ts`.
- Runtime level composition applies generated prefab ID overrides after
  generated insertions and before component, transform, and whole-instance
  removal overrides.
- The writer validates runtime scene ownership, stable ID existence, same-scene
  replacement prefab IDs, stale base hashes, and generated insertion targets.
- Readiness-required checked-in stable IDs remain blocked for prefab
  replacement until a matching manifest/readiness owner writer exists.
- Broader object-library replacement for mesh/material/audio asset references,
  prefab-owned component schemas, grouping, stable-ID management, and readiness
  owner updates remains draft-only.

## Validation Log

- `pnpm --dir apps/game.megameal test:level-editor-viewport-bridge-model-contract`
  passed after the viewport bridge workspace integration.
- `pnpm --dir apps/game.megameal test:level-editor-aaa-plan-contract` passed
  after extending the workbench guard to cover the integrated bridge panel.
- `pnpm --dir apps/game.megameal test:level-editor-workspace-model-contract`
  passed after the viewport bridge workspace integration.
- `pnpm --dir apps/game.megameal type-check` passed after the viewport bridge
  workspace integration.
- `pnpm --dir apps/game.megameal lint` passed after the viewport bridge
  workspace integration.
- `pnpm --dir apps/game.megameal audit:engine-boundaries` passed after the
  viewport bridge workspace integration.
- `pnpm --dir apps/game.megameal test:contracts` passed after the viewport
  bridge workspace integration.
- `git diff --check -- apps/game.megameal package.json pnpm-lock.yaml` passed
  after the viewport bridge workspace integration.
- `pnpm --dir apps/game.megameal test:level-editor-viewport-bridge-model-contract`
  passed after adding projected object pins.
- `pnpm --dir apps/game.megameal test:level-editor-aaa-plan-contract` passed
  after adding projected object pins.
- `pnpm --dir apps/game.megameal type-check`, `lint`,
  `audit:engine-boundaries`, and `test:contracts` passed after adding projected
  object pins.
- `pnpm --dir apps/game.megameal test:level-editor-viewport-bridge-model-contract`
  passed after adding viewport transform nudge controls.
- `pnpm --dir apps/game.megameal test:level-editor-aaa-plan-contract` passed
  after adding viewport transform nudge controls.
- `pnpm --dir apps/game.megameal type-check`, `lint`,
  `audit:engine-boundaries`, `test:contracts`, and
  `git diff --check -- apps/game.megameal package.json pnpm-lock.yaml` passed
  after adding viewport transform nudge controls.
- `pnpm --dir apps/game.megameal test:level-editor-aaa-plan-contract`,
  `type-check`, `lint`, `audit:engine-boundaries`, `test:contracts`, and
  `git diff --check -- apps/game.megameal package.json pnpm-lock.yaml` passed
  after surfacing `Discard Staged` in the command bar.
- `pnpm --dir apps/game.megameal test:level-editor-aaa-plan-contract`,
  `test:level-editor-feature-catalog-contract`, `type-check`, `lint`,
  `audit:engine-boundaries`, `test:contracts`, and
  `git diff --check -- apps/game.megameal package.json pnpm-lock.yaml` passed
  after adding viewport-targeted object-library placement staging.
- `pnpm --dir apps/game.megameal test:level-editor-aaa-plan-contract`,
  `type-check`, `lint`, `audit:engine-boundaries`, `test:contracts`, and
  `git diff --check -- apps/game.megameal package.json pnpm-lock.yaml` passed
  after adding the staged-operation management panel.
- `pnpm --dir apps/game.megameal test:level-editor-aaa-plan-contract`,
  `type-check`, `lint`, `audit:engine-boundaries`, `test:contracts`, and
  `git diff --check -- apps/game.megameal package.json pnpm-lock.yaml` passed
  after adding targeted staged field-edit review and revert.
- `pnpm --dir apps/game.megameal test:level-editor-workspace-model-contract`
  passed.
- `pnpm --dir apps/game.megameal test:level-editor-feature-catalog-contract`
  passed.
- `pnpm --dir apps/game.megameal test:level-editor-workbench-model-contract`
  passed.
- `pnpm --dir apps/game.megameal test:level-editor-viewport-bridge-model-contract`
  passed.
- `pnpm --dir apps/game.megameal test:level-editor-workspace-model-contract`,
  `pnpm --dir apps/game.megameal test:level-editor-save-contract`,
  `pnpm --dir apps/game.megameal type-check`,
  `pnpm --dir apps/game.megameal audit:engine-boundaries`, and focused
  `pnpm --dir apps/game.megameal exec biome check src/app/editor/LevelEditorWorkspace.svelte src/app/editor/levelEditorWorkspaceUi.ts`
  passed after extracting staged publish-readiness semantics into the focused
  editor UI helper. Full `pnpm --dir apps/game.megameal lint` remains blocked
  by existing formatting drift in adjacent dirty level-editor files outside
  this Worker 3 slice.
- `pnpm --dir apps/game.megameal test:level-editor-aaa-plan-contract` passed.
- `pnpm --dir apps/game.megameal test:level-editor-save-contract` passed.
- `pnpm --dir apps/game.megameal test:level-editor-aaa-plan-contract` was
  extended to guard the workflow/publishability UI anchors.
- `pnpm --dir apps/game.megameal test:contracts` passed.
- `pnpm --dir apps/game.megameal audit:engine-boundaries` passed.
- `pnpm --dir apps/game.megameal type-check` passed.
- `pnpm --dir apps/game.megameal lint` passed.
- `pnpm --dir apps/game.megameal test:level-editor-viewport-bridge-model-contract`,
  `test:level-editor-aaa-plan-contract`, `type-check`, `lint`,
  `audit:engine-boundaries`, `test:contracts`, and
  `git diff --check -- apps/game.megameal package.json pnpm-lock.yaml` passed
  after adding viewport transform mode/snap-step controls and staged projection
  coherence.
- `pnpm --dir apps/game.megameal test:level-editor-aaa-plan-contract`,
  `type-check`, `lint`, `audit:engine-boundaries`, and `test:contracts`
  passed after moving core object preview patch construction off DOM-scraped
  inspector values and onto staged field display values.
- `pnpm --dir apps/game.megameal test:level-editor-aaa-plan-contract`,
  `type-check`, `lint`, `audit:engine-boundaries`, `test:contracts`, and
  `git diff --check -- apps/game.megameal package.json pnpm-lock.yaml` passed
  after adding targeted staged-field revert reconciliation for live core-object
  previews.
- `pnpm --dir apps/game.megameal test:level-editor-aaa-plan-contract`,
  `type-check`, `lint`, `audit:engine-boundaries`, `test:contracts`, and
  `git diff --check -- apps/game.megameal package.json pnpm-lock.yaml` passed
  after adding staged owner-write readiness summaries and preflight blocking
  for draft-only or mixed Save Level/Publish queues.
- `pnpm --dir apps/game.megameal test:level-editor-aaa-plan-contract`,
  `test:level-editor-feature-catalog-contract`, `type-check`, `lint`,
  `audit:engine-boundaries`, `test:contracts`, and
  `git diff --check -- apps/game.megameal package.json pnpm-lock.yaml` passed
  after adding object-library content-browser search and workflow filters.
- `pnpm --dir apps/game.megameal test:level-editor-aaa-plan-contract`,
  `type-check`, `lint`, `audit:engine-boundaries`, `test:contracts`, and
  `git diff --check -- apps/game.megameal package.json pnpm-lock.yaml` passed
  after adding the object-library placement-transform composer.
- `pnpm --dir apps/game.megameal test:level-editor-aaa-plan-contract`,
  `type-check`, `lint`, `audit:engine-boundaries`, `test:contracts`, and
  `git diff --check -- apps/game.megameal package.json pnpm-lock.yaml` passed
  after adding object-library staged-placement review and removal.
- `pnpm --dir apps/game.megameal test:level-editor-aaa-plan-contract`,
  `type-check`, `lint`, `audit:engine-boundaries`, `test:contracts`, and
  `git diff --check -- apps/game.megameal package.json pnpm-lock.yaml` passed
  after adding the viewport placement ghost.
- `pnpm --dir apps/game.megameal test:level-editor-save-contract`,
  `test:level-editor-feature-catalog-contract`,
  `test:level-editor-workspace-model-contract`,
  `test:level-editor-aaa-plan-contract`, `type-check`, `lint`,
  `audit:engine-boundaries`, `test:contracts`, and
  `git diff --check -- apps/game.megameal package.json pnpm-lock.yaml` passed
  after enabling generated owner writes for object-library
  `insert-level-instance` placement operations.
- `pnpm --dir apps/game.megameal test:level-editor-save-contract`,
  `test:level-editor-workspace-model-contract`,
  `test:level-editor-feature-catalog-contract`,
  `test:level-editor-aaa-plan-contract`,
  `test:level-editor-workbench-model-contract`,
  `test:level-editor-viewport-bridge-model-contract`, `type-check`, `lint`,
  `audit:engine-boundaries`, `test:contracts`, `build`, and
  `git diff --check -- apps/game.megameal package.json pnpm-lock.yaml` passed
  after enabling generated owner writes for level-instance `set-component`
  overrides, including overrides targeting already generated
  `insert-level-instance` placements. Build still reports the existing
  Astro/Vite warnings for an empty editor chunk, large client chunks, and GET
  generation for POST-only editor authoring API routes.
- `pnpm --dir apps/game.megameal test:level-editor-save-contract`,
  `test:level-editor-workspace-model-contract`,
  `test:level-editor-feature-catalog-contract`,
  `test:level-editor-aaa-plan-contract`, `type-check`, `lint`,
  `audit:engine-boundaries`, `test:contracts`, `build`, and
  `git diff --check -- apps/game.megameal package.json pnpm-lock.yaml` passed
  after enabling generated owner writes for level-instance `remove-component`
  records. Build still reports the existing Astro/Vite warnings for an empty
  editor chunk, large client chunks, and GET generation for POST-only editor
  authoring API routes.
- `pnpm --dir apps/game.megameal test:level-editor-save-contract`,
  `test:level-editor-feature-catalog-contract`,
  `test:level-editor-workspace-model-contract`,
  `test:level-editor-aaa-plan-contract`, `test:runtime-scene-contract`,
  `test:production-editor-bundle-contract`, `type-check`, `lint`,
  `audit:engine-boundaries`, `test:contracts`, `build`, and
  `git diff --check -- apps/game.megameal package.json pnpm-lock.yaml` passed
  after enabling bounded generated owner writes for `remove-level-instance`
  records. Build still reports the existing Astro/Vite warnings for an empty
  editor chunk, large client chunks, and GET generation for POST-only editor
  authoring API routes.
- `pnpm --dir apps/game.megameal test:level-editor-aaa-plan-contract`,
  `test:level-editor-viewport-bridge-model-contract`, `type-check`, `lint`,
  `audit:engine-boundaries`, `test:contracts`, `build`, and
  `git diff --check -- apps/game.megameal package.json pnpm-lock.yaml` passed
  after adding the bounded object-library-to-viewport placement drop target.
  Build still reports the existing Astro/Vite warnings for an empty editor
  chunk, large client chunks, and GET generation for POST-only editor authoring
  API routes.
- `pnpm --dir apps/game.megameal test:level-editor-aaa-plan-contract`,
  `test:level-editor-workspace-model-contract`,
  `test:level-editor-feature-catalog-contract`,
  `test:level-editor-save-contract`, `type-check`, `lint`,
  `audit:engine-boundaries`, `test:contracts`, and `build` passed after adding
  the guarded selected-instance `Stage Removal` workbench action. Build still
  reports the existing Astro/Vite warnings for an empty editor chunk, large
  client chunks, and GET generation for POST-only editor authoring API routes.
- `pnpm --dir apps/game.megameal test:level-editor-aaa-plan-contract`,
  `test:level-editor-feature-catalog-contract`,
  `test:level-editor-save-contract`,
  `test:level-editor-workspace-model-contract`, `type-check`, `lint`,
  `audit:engine-boundaries`, `test:contracts`, `build`, and
  `git diff --check -- apps/game.megameal package.json pnpm-lock.yaml` passed
  after adding the bounded selected-instance `Duplicate` workbench action and
  registering `level-instance-duplication` as a generated-owner publish family.
  Build still reports the existing Astro/Vite warnings for an empty editor
  chunk, large client chunks, and GET generation for POST-only editor authoring
  API routes.
- `pnpm --dir apps/game.megameal test:level-editor-save-contract`,
  `test:level-editor-feature-catalog-contract`,
  `test:level-editor-workspace-model-contract`,
  `test:level-editor-aaa-plan-contract`, `type-check`, `lint`,
  `audit:engine-boundaries`, `test:contracts`, `build`, and
  `git diff --check -- apps/game.megameal package.json pnpm-lock.yaml` passed
  after enabling bounded generated owner writes for level-instance
  `replace-prefab` records. Build still reports the existing Astro/Vite
  warnings for an empty editor chunk, large client chunks, and GET generation
  for POST-only editor authoring API routes.
- `pnpm --dir apps/game.megameal test:level-editor-viewport-bridge-model-contract`,
  `test:level-editor-aaa-plan-contract`, `type-check`, `lint`,
  `audit:engine-boundaries`, `test:contracts`, `build`, and
  `git diff --check -- apps/game.megameal package.json pnpm-lock.yaml` passed
  after adding screen-space transform handles to the viewport bridge. Build
  still reports the existing Astro/Vite warnings for an empty editor chunk,
  large client chunks, and GET generation for POST-only editor authoring API
  routes.
- `pnpm --dir apps/game.megameal test:level-editor-viewport-bridge-model-contract`,
  `test:level-editor-aaa-plan-contract`,
  `test:level-editor-workspace-model-contract`, `type-check`, `lint`,
  `audit:engine-boundaries`, `test:contracts`, `build`, and
  `git diff --check -- apps/game.megameal package.json pnpm-lock.yaml` passed
  after mapping viewport object-library drops into normalized top-down X/Z
  placement positions. Build still reports the existing Astro/Vite warnings for
  an empty editor chunk, large client chunks, and GET generation for POST-only
  editor authoring API routes.
- `pnpm --dir apps/game.megameal test:level-editor-viewport-bridge-model-contract`,
  `test:level-editor-aaa-plan-contract`,
  `test:level-editor-workspace-model-contract`, `type-check`, `lint`,
  `audit:engine-boundaries`, `test:contracts`, `build`, and
  `git diff --check -- apps/game.megameal package.json pnpm-lock.yaml` passed
  after making viewport object-library drops snap to the active translate snap
  step before staging authored X/Z placement coordinates. Build still reports
  the existing Astro/Vite warnings for an empty editor chunk, large client
  chunks, and GET generation for POST-only editor authoring API routes.
- `pnpm --dir apps/game.megameal test:level-editor-viewport-bridge-model-contract`,
  `test:level-editor-aaa-plan-contract`,
  `test:level-editor-workspace-model-contract`, `type-check`, `lint`,
  `audit:engine-boundaries`, `test:contracts`, `build`, and
  `git diff --check -- apps/game.megameal package.json pnpm-lock.yaml` passed
  after adding editor-side viewport camera/framing mode and bounded zoom
  controls. Build still reports the existing Astro/Vite warnings for an empty
  editor chunk, large client chunks, and GET generation for POST-only editor
  authoring API routes.
- `pnpm --dir apps/game.megameal test:level-editor-viewport-bridge-model-contract`,
  `test:level-editor-aaa-plan-contract`,
  `test:level-editor-workspace-model-contract`, `type-check`, `lint`,
  `audit:engine-boundaries`, `test:contracts`, `build`, and
  `git diff --check -- apps/game.megameal package.json pnpm-lock.yaml` passed
  after adding explicit Select/Place/Transform viewport interaction tool modes
  and gating projected pins, placement drops, placement target staging,
  transform handles, and nudge controls through the active tool. Build still
  reports the existing Astro/Vite warnings for an empty editor chunk, large
  client chunks, and GET generation for POST-only editor authoring API routes.
- `pnpm --dir apps/game.megameal test:level-editor-viewport-bridge-model-contract`,
  `test:level-editor-aaa-plan-contract`,
  `test:level-editor-workspace-model-contract`, `type-check`, `lint`,
  `audit:engine-boundaries`, `test:contracts`, `build`, and
  `git diff --check -- apps/game.megameal package.json pnpm-lock.yaml` passed
  after adding projected viewport frame-click picking for Select mode. Build
  still reports the existing Astro/Vite warnings for an empty editor chunk,
  large client chunks, and GET generation for POST-only editor authoring API
  routes.
- `pnpm --dir apps/game.megameal test:level-editor-viewport-bridge-model-contract`,
  `test:level-editor-aaa-plan-contract`, `type-check`, `lint`,
  `test:level-editor-workspace-model-contract`, `audit:engine-boundaries`,
  `test:contracts`, `build`, and
  `git diff --check -- apps/game.megameal package.json pnpm-lock.yaml` passed
  after adding Place-mode viewport click placement for the active draft-ready
  object-library entry. Build still reports the existing Astro/Vite warnings
  for an empty editor chunk, large client chunks, and GET generation for
  POST-only editor authoring API routes.
- `pnpm --dir apps/game.megameal test:level-editor-aaa-plan-contract`,
  `test:level-editor-viewport-bridge-model-contract`, `type-check`, `lint`,
  `test:level-editor-workspace-model-contract`, `audit:engine-boundaries`,
  `test:contracts`, `build`, and
  `git diff --check -- apps/game.megameal package.json pnpm-lock.yaml` passed
  after adding the hover-aware Place-mode placement ghost. Build still reports
  the existing Astro/Vite warnings for an empty editor chunk, large client
  chunks, and GET generation for POST-only editor authoring API routes.
- `pnpm --dir apps/game.megameal test:level-editor-viewport-bridge-model-contract`,
  `test:level-editor-aaa-plan-contract`, `type-check`, `lint`,
  `test:level-editor-workspace-model-contract`, `audit:engine-boundaries`,
  `test:contracts`, `build`, and
  `git diff --check -- apps/game.megameal package.json pnpm-lock.yaml` passed
  after adding `Transform.rotation` quaternion fields to inspector/workspace
  authoring, dev-preview transform patches, generated owner-write transaction
  construction, and viewport Rotate controls. Build still reports the existing
  Astro/Vite warnings for an empty editor chunk, large client chunks, and GET
  generation for POST-only editor authoring API routes.
- `pnpm --dir apps/game.megameal test:level-editor-viewport-bridge-model-contract`,
  `test:level-editor-aaa-plan-contract`, `type-check`, `lint`,
  `test:level-editor-workspace-model-contract`, `audit:engine-boundaries`,
  `test:contracts`, `build`, and
  `git diff --check -- apps/game.megameal package.json pnpm-lock.yaml` passed
  after replacing raw viewport quaternion handles with the yaw-degree Rotate
  control that stages coherent `Transform.rotation` quaternion field edits.
  Build still reports the existing Astro/Vite warnings for an empty editor
  chunk, large client chunks, and GET generation for POST-only editor authoring
  API routes.
- `pnpm --dir apps/game.megameal test:level-editor-feature-catalog-contract`,
  `test:level-editor-aaa-plan-contract`, `test:level-editor-workbench-model-contract`,
  `test:level-editor-viewport-bridge-model-contract`,
  `test:level-editor-workspace-model-contract`,
  `test:production-editor-bundle-contract`, `type-check`, `lint`,
  `audit:engine-boundaries`, `test:contracts`, `build`, and
  `git diff --check -- apps/game.megameal package.json pnpm-lock.yaml` passed
  after adding stable-ID outliner search, current-scene object-library usage
  filtering/sorting, and Place-mode gating that requires an active draft-ready
  placement target. Build still reports the existing Astro/Vite warnings for an
  empty editor chunk, large client chunks, and GET generation for POST-only
  editor authoring API routes.
- `pnpm --dir apps/game.megameal test:level-editor-aaa-plan-contract`,
  `test:level-editor-workbench-model-contract`,
  `test:level-editor-workspace-model-contract`,
  `test:production-editor-bundle-contract`, `type-check`, `lint`,
  `audit:engine-boundaries`, `test:contracts`, `build`, and
  `git diff --check -- apps/game.megameal package.json pnpm-lock.yaml` passed
  after replacing the lower equal-weight diagnostics grid with the prioritized
  bottom dock layout. Build still reports the existing Astro/Vite warnings for
  an empty editor chunk, large client chunks, and GET generation for POST-only
  editor authoring API routes.
- `pnpm --dir apps/game.megameal test:level-editor-viewport-bridge-model-contract`,
  `test:level-editor-aaa-plan-contract`, `test:level-editor-workbench-model-contract`,
  `test:level-editor-workspace-model-contract`,
  `test:production-editor-bundle-contract`, `type-check`, `lint`,
  `audit:engine-boundaries`, `test:contracts`, `build`, and
  `git diff --check -- apps/game.megameal package.json pnpm-lock.yaml` passed
  after adding the projected X/Z translate drag handle for selected objects and
  tightening projected X/Z translate drag contract/progress hygiene. The
  documented feature remains editor-projected X/Z staging only; rendered-scene
  raycast gizmos and rendered-scene direct manipulation remain future work.
  Build still reports the existing Astro/Vite warnings for an empty editor
  chunk, large client chunks, and GET generation for POST-only editor authoring
  API routes.
- `pnpm --dir apps/game.megameal test:level-editor-workspace-model-contract`,
  `test:level-editor-workbench-model-contract`,
  `test:level-editor-aaa-plan-contract`, focused `biome check` for the
  outliner-lane files, `type-check`, `lint`, `audit:engine-boundaries`,
  `test:contracts`, `build`, and
  `git diff --check -- apps/game.megameal pnpm-lock.yaml` passed after adding
  manifest object paths plus visibility, authoring-lock, and pickability
  affordance labels to the outliner model and UI. These are explanatory
  outliner affordances only; persisted visibility/isolation/lock toggles and
  multi-select hierarchy operations remain future work. Build still reports the
  existing Astro/Vite warnings for an empty editor chunk, large client chunks,
  and GET generation for POST-only editor authoring API routes.
- `pnpm --dir apps/game.megameal test:level-editor-feature-catalog-contract`,
  `test:level-editor-aaa-plan-contract`,
  `test:level-editor-viewport-bridge-model-contract`,
  `test:level-editor-workspace-model-contract`,
  `test:level-editor-workbench-model-contract`,
  `test:production-editor-bundle-contract`, `type-check`, `lint`,
  `audit:engine-boundaries`, `test:contracts`, `build`, and
  `git diff --check -- apps/game.megameal package.json pnpm-lock.yaml` passed
  after normalizing shared object-library prefab placement drafts to the
  selected runtime scene's level ID and reconciling the in-progress
  workbench/model contract drift. Build still reports the existing Astro/Vite
  warnings for an empty editor chunk, large client chunks, and GET generation
  for POST-only editor authoring API routes.
- `pnpm --dir apps/game.megameal test:level-editor-workspace-model-contract`,
  `test:level-editor-aaa-plan-contract`,
  `test:production-editor-bundle-contract`, `type-check`, `lint`,
  `audit:engine-boundaries`, `test:contracts`, `build`, and
  `git diff --check -- apps/game.megameal pnpm-lock.yaml` passed after adding
  selected-object inspector component groups with group-level editability,
  storage, and publishability summaries. This also resolves the previously
  recorded missing `inspectorFieldGroupsForFields` helper blocker for the
  workspace model path. Build still reports the existing Astro/Vite warnings
  for an empty editor chunk, large client chunks, and GET generation for
  POST-only editor authoring API routes.
- `pnpm --dir apps/game.megameal test:level-editor-feature-catalog-contract`,
  `test:level-editor-aaa-plan-contract`,
  `test:level-editor-viewport-bridge-model-contract`,
  `test:level-editor-workspace-model-contract`,
  `test:level-editor-workbench-model-contract`,
  `test:level-editor-save-contract`, `test:production-editor-bundle-contract`,
  `type-check`, `lint`, `audit:engine-boundaries`, `test:contracts`,
  `build`, and
  `git diff --check -- apps/game.megameal package.json pnpm-lock.yaml` passed
  for the combined integration of outliner affordance metadata, inspector
  component groups, staged publish-readiness helper extraction, projected X/Z
  drag affordance metadata, and scene-scoped shared prefab placement IDs. A
  parallel build attempt briefly failed with an Astro `dist/renderers.mjs`
  import race while `test:contracts` was also running; rerunning `build` by
  itself passed. Build still reports the existing Astro/Vite warnings for an
  empty editor chunk, large client chunks, and GET generation for POST-only
  editor authoring API routes.
- `pnpm --dir apps/game.megameal test:level-editor-authoring-queue-contract`,
  `test:level-editor-workspace-model-contract`,
  `test:level-editor-save-contract`, `test:level-editor-aaa-plan-contract`,
  `type-check`, `lint`, `audit:engine-boundaries`, `test:contracts`,
  `build`, `pnpm audit:legacy-game-references`, and
  `git diff --check -- apps/game.megameal package.json pnpm-lock.yaml` passed
  after adding bounded staged authoring undo/redo history depth to the
  authoring queue, surfacing undo/redo depth in the command bar and staged
  operations panel, registering the focused authoring-queue contract test, and
  updating the Save/Publish contract register. Build still reports the existing
  Astro/Vite warnings for an empty editor chunk, large client chunks, and GET
  generation for POST-only editor authoring API routes.
- `pnpm --dir apps/game.megameal test:level-editor-selection-model-contract`,
  `test:level-editor-workspace-model-contract`,
  `test:level-editor-aaa-plan-contract`,
  `test:level-editor-workbench-model-contract`,
  `test:level-editor-viewport-bridge-model-contract`,
  `test:level-editor-feature-catalog-contract`, `type-check`, `lint`,
  `audit:engine-boundaries`, `test:contracts`, `build`, and
  `git diff --check -- apps/game.megameal pnpm-lock.yaml` passed after adding
  the editor-owned outliner/category-aid multi-select foundation, primary
  inspector-object contract, disabled bulk-owner-write selection model, focused
  selection-model contract test, Save Level command copy update, and contract
  docs. Build still reports the existing Astro/Vite warnings for an empty
  editor chunk, large client chunks, and GET generation for POST-only editor
  authoring API routes.
- `pnpm --dir apps/game.megameal test:level-editor-viewport-bridge-model-contract`,
  `test:level-editor-selection-model-contract`,
  `test:level-editor-workspace-model-contract`,
  `test:level-editor-aaa-plan-contract`, `type-check`, `lint`,
  `audit:engine-boundaries`, `test:contracts`, `build`, and
  `git diff --check -- apps/game.megameal pnpm-lock.yaml` passed after
  synchronizing editor multi-select with projected viewport pins while keeping
  viewport transform controls, placement anchor, camera framing, and preview
  behavior bound to the primary selected object. Build still reports the
  existing Astro/Vite warnings for an empty editor chunk, large client chunks,
  and GET generation for POST-only editor authoring API routes.
- `pnpm --dir apps/game.megameal test:level-editor-selection-model-contract`,
  `test:level-editor-viewport-bridge-model-contract`,
  `test:level-editor-aaa-plan-contract`, `type-check`, `lint`, and
  `audit:engine-boundaries`, `test:contracts`, `build`, and
  `git diff --check -- apps/game.megameal pnpm-lock.yaml` passed after adding
  projected viewport marquee selection. The marquee selects stable-ID transform
  pins from the editor projection only, supports Ctrl/Cmd additive selection,
  and keeps bulk owner writes disabled. Build still reports the existing
  Astro/Vite warnings for an empty editor chunk, large client chunks, and GET
  generation for POST-only editor authoring API routes.
- `pnpm --dir apps/game.megameal test:level-editor-selection-model-contract`,
  `test:level-editor-aaa-plan-contract`, `type-check`, `lint`,
  `audit:engine-boundaries`, `test:contracts`, `build`, and
  `git diff --check -- apps/game.megameal pnpm-lock.yaml` passed after adding
  the selection-set inspector. The inspector summarizes selected
  categories/common components and lets the user choose the primary selected
  object or remove selected IDs without staging runtime owner writes. Build
  still reports the existing Astro/Vite warnings for an empty editor chunk,
  large client chunks, and GET generation for POST-only editor authoring API
  routes.
- `pnpm --dir apps/game.megameal test:level-editor-aaa-plan-contract`,
  `type-check`, `lint`, `audit:engine-boundaries`, `test:contracts`,
  `build`, and `git diff --check -- apps/game.megameal pnpm-lock.yaml` passed
  after adding category, authoring-lock, projected-pickability, and visibility
  filters to the scene outliner. The filters narrow editor hierarchy view state
  only and do not persist visibility, lock, isolation, or pickability changes.
  Filtered outliner results can now replace the current selection, add to the
  current selection, or clear the selection set; these are editor selection
  operations only.
  Build still reports the existing Astro/Vite warnings for an empty editor
  chunk, large client chunks, and GET generation for POST-only editor authoring
  API routes.
- `pnpm --dir apps/game.megameal test:level-editor-selection-model-contract`,
  `test:level-editor-aaa-plan-contract`, `type-check`, `lint`,
  `audit:engine-boundaries`, `test:contracts`, `build`, and
  `git diff --check -- apps/game.megameal pnpm-lock.yaml` passed after adding
  outliner `Select Shown`, `Add Shown`, and `Clear Selection` actions. These
  actions operate on filtered stable-ID editor selection state only and do not
  stage bulk edits or owner writes. Build still reports the existing Astro/Vite
  warnings for an empty editor chunk, large client chunks, and GET generation
  for POST-only editor authoring API routes.
- `pnpm --dir apps/game.megameal test:level-editor-object-view-state-model-contract`,
  `test:level-editor-viewport-bridge-model-contract`,
  `test:level-editor-aaa-plan-contract`, `type-check`, `lint`,
  `test:contracts`, `audit:engine-boundaries`,
  `test:production-editor-bundle-contract`, `build`,
  `git diff --check -- apps/game.megameal pnpm-lock.yaml`, and
  `pnpm audit:legacy-game-references` passed after implementing editor-only
  object view state. The workbench can now hide/show, lock/unlock, isolate,
  clear, and reset stable-ID objects through browser-local editor workspace
  persistence; projected viewport picking and marquee selection now ignore
  hidden or editor-locked pins without staging owner writes. Build still reports
  the existing Astro/Vite warnings for an empty editor chunk, large client
  chunks, and GET generation for POST-only editor authoring API routes.
- `pnpm --dir apps/game.megameal test:live-preview-protocol-contract`,
  `test:level-editor-viewport-bridge-model-contract`,
  `test:level-editor-aaa-plan-contract`, `type-check`, `lint`,
  `audit:engine-boundaries`, `test:production-editor-bundle-contract`,
  `test:contracts`, `build`,
  `git diff --check -- apps/game.megameal pnpm-lock.yaml`, and
  `pnpm audit:legacy-game-references` passed after adding the rendered-scene
  hit-test protocol seam. The seam validates and dispatches request/result
  messages only; renderer-backed raycast selection, rendered-scene direct
  manipulation, and runtime-backed marquee selection remain future work. Build
  still reports the existing Astro/Vite warnings for an empty editor chunk,
  large client chunks, and GET generation for POST-only editor authoring API
  routes.
- `pnpm --dir apps/game.megameal test:rendered-scene-hit-test-contract`,
  `test:live-preview-protocol-contract`, `test:level-editor-aaa-plan-contract`,
  `type-check`, `lint`, `audit:engine-boundaries`,
  `test:production-editor-bundle-contract`, `test:contracts`, `build`,
  `git diff --check -- apps/game.megameal pnpm-lock.yaml`, and
  `pnpm audit:legacy-game-references` passed after adding the adapter-backed
  rendered-scene hit-test result path. The dev runtime can now resolve
  adapter-local rendered object hits to stable-ID protocol results; the
  following slice wires editor-side request/result consumption for single-click
  selection while leaving rendered-scene marquee selection and direct
  manipulation future. Build still reports the
  existing Astro/Vite warnings for an empty editor chunk, large client chunks,
  and GET generation for POST-only editor authoring API routes.
- `pnpm --dir apps/game.megameal test:level-editor-rendered-hit-test-selection-contract`
  and `test:level-editor-viewport-bridge-model-contract` passed after adding
  editor-side runtime hit-test request construction and result consumption for
  single-click stable-ID selection. `test:live-preview-protocol-contract`,
  `test:rendered-scene-hit-test-contract`,
  `test:level-editor-aaa-plan-contract`, `type-check`, `lint`,
  `audit:engine-boundaries`, `test:level-editor-maintainability-contract`,
  `test:contracts`, `test:production-editor-bundle-contract`, `build`,
  `git diff --check -- apps/game.megameal pnpm-lock.yaml`, and
  `pnpm audit:legacy-game-references` also passed for this slice. Rendered-scene
  direct manipulation, gizmos, and rendered-scene marquee selection remain
  future work. Build still reports the existing Astro/Vite warnings for an empty
  editor chunk, large client chunks, and GET generation for POST-only editor
  authoring API routes.
- `pnpm --dir apps/game.megameal test:rendered-scene-hit-test-contract`,
  `test:level-editor-rendered-hit-test-selection-contract`,
  `test:live-preview-protocol-contract`,
  `test:level-editor-viewport-bridge-model-contract`,
  `test:level-editor-aaa-plan-contract`,
  `test:level-editor-maintainability-contract`,
  `test:level-editor-collision-cook-contract`, `type-check`, `lint`,
  `audit:engine-boundaries`, `test:production-editor-bundle-contract`,
  `test:contracts`, `build`,
  `git diff --check -- apps/game.megameal pnpm-lock.yaml`, and
  `pnpm audit:legacy-game-references` passed after adding rendered-scene
  box/marquee stable-ID selection through the dev-preview protocol. The
  workbench now sends rendered box-select requests from Select-mode marquee
  gestures, consumes stable-ID result sets as editor selection state only, and
  keeps the existing projected marquee as fallback. This first implementation
  used root-origin rendered selection; the following bounds-aware slice
  supersedes that limitation. Rendered-scene direct manipulation and gizmos
  remain future work. Build still reports the existing
  Astro/Vite warnings for an empty editor chunk, large client chunks, and GET
  generation for POST-only editor authoring API routes. The collision cook
  contract now follows `defaultRuntimeSceneManifest.id` for the generic editor
  catalog default instead of hardcoding Portal Arena.
- `pnpm --dir apps/game.megameal test:rendered-scene-hit-test-contract`,
  `test:level-editor-aaa-plan-contract`, `type-check`, `lint`,
  `audit:engine-boundaries`, `test:production-editor-bundle-contract`,
  `test:contracts`, `build`,
  `git diff --check -- apps/game.megameal pnpm-lock.yaml`, and
  `pnpm audit:legacy-game-references` passed after upgrading rendered
  box/marquee selection from root-origin projection to adapter-owned projected
  render-object bounds. `ThreeRendererAdapter.boxSelectRenderedScene` now uses
  adapter-local `Box3` data and camera projection to detect rectangle overlap
  while the editor and dev-preview protocol still exchange stable-ID selection
  payloads only. Rendered-scene direct manipulation, transform gizmos,
  occlusion-aware lasso selection, checked-in/shared visibility/lock/isolation
  metadata ownership, and bulk owner-write operations remain future work. Build
  still reports the existing Astro/Vite warnings for an empty editor chunk,
  large client chunks, and GET generation for POST-only editor authoring API
  routes.
- `git diff --check -- apps/game.megameal/docs/LEVEL_EDITOR_WORKBENCH_IMPLEMENTATION_PROGRESS.md`
  passed and
  `rg -n "[ \t]+$" apps/game.megameal/docs/LEVEL_EDITOR_WORKBENCH_IMPLEMENTATION_PROGRESS.md`
  returned no matches after updating this tracker to record browser-local
  editor workspace persistence for hide/show, lock/unlock, isolate/reset object
  view state while keeping checked-in/shared editor metadata ownership and bulk
  operations future.
- `pnpm --dir apps/game.megameal test:level-editor-object-view-state-model-contract`,
  `test:level-editor-maintainability-contract`,
  `test:level-editor-aaa-plan-contract`,
  `test:level-editor-viewport-bridge-model-contract`,
  `test:level-editor-rendered-hit-test-selection-contract`,
  `test:rendered-scene-hit-test-contract`,
  `test:level-editor-selection-model-contract`,
  `test:level-editor-workspace-model-contract`, `type-check`, `lint`,
  `audit:engine-boundaries`, `test:production-editor-bundle-contract`,
  `test:contracts`, `build`,
  `git diff --check -- apps/game.megameal pnpm-lock.yaml`, and
  `pnpm audit:legacy-game-references` passed after wiring browser-local editor
  workspace persistence into the workbench. Object hide/show, lock/unlock,
  isolate/reset state now restores per runtime scene and stable ID from
  browser-local editor storage, while the model and docs preserve
  `writesRuntimeData: false`, `writesOwnerFiles: false`, and checked-in/shared
  visibility/lock/isolation metadata ownership as future work. Build still
  reports the existing Astro/Vite warnings for an empty editor chunk, large
  client chunks, and GET generation for POST-only editor authoring API routes.
- `pnpm --dir apps/game.megameal test:level-editor-viewport-bridge-model-contract`,
  `test:level-editor-maintainability-contract`,
  `test:level-editor-aaa-plan-contract`, `type-check`, `lint`,
  `audit:engine-boundaries`, `test:production-editor-bundle-contract`,
  `test:contracts`, `build`, `git diff --check -- apps/game.megameal pnpm-lock.yaml`,
  and `pnpm audit:legacy-game-references` passed after adding editor-projected
  Frame Selected, Frame Selection, and Frame All camera commands. Camera
  framing state now derives target stable IDs, projected focus points, and
  suggested zoom from `levelEditorViewportCameraModel.ts`; the workspace applies
  those commands as editor navigation state only and does not stage authoring
  edits, write runtime camera data, or write owner files. The focused extraction
  keeps `levelEditorViewportBridgeModel.ts` under the maintainability budget.
  Build still reports the existing Astro/Vite warnings for an empty editor
  chunk, large client chunks, and GET generation for POST-only editor authoring
  API routes.
- `pnpm --dir apps/game.megameal test:level-editor-selected-object-renderable-picker-contract`,
  `test:level-editor-maintainability-contract`,
  `test:level-editor-viewport-bridge-model-contract`,
  `test:level-editor-aaa-plan-contract`, `type-check`, `lint`,
  `audit:engine-boundaries`, `test:production-editor-bundle-contract`,
  `test:contracts`, `build`, `git diff --check -- apps/game.megameal pnpm-lock.yaml`,
  and `pnpm audit:legacy-game-references` passed after adding the first
  selected-object inspector Renderable mesh/material picker slice. The picker
  reads current `Renderable.meshId`/`Renderable.materialId` from the selected
  level instance, offers scene-scoped manifest-backed mesh/material candidates,
  previews through the existing Object Library replacement draft path, and
  stages queued authoring operations without direct runtime mutation or a new
  persistence model. Build still reports the existing Astro/Vite warnings for
  an empty editor chunk, large client chunks, and GET generation for POST-only
  editor authoring API routes.
- `pnpm --dir apps/game.megameal test:level-editor-selected-object-renderable-picker-contract`,
  `test:level-editor-aaa-plan-contract`, `type-check`, `lint`,
  `audit:engine-boundaries`, `test:level-editor-maintainability-contract`,
  `test:production-editor-bundle-contract`, `test:contracts`, `build`,
  `git diff --check -- apps/game.megameal pnpm-lock.yaml`, and
  `pnpm audit:legacy-game-references` passed after refining the selected-object
  Renderable picker with an explicit active level-instance scope, disabled
  future prefab-definition and asset-manifest scopes, and queue-derived
  current/dirty/staged labels for the selected mesh/material candidates. This
  keeps the picker honest about the current authoring path while preserving
  generated asset import, prefab-owner edits, and asset-manifest writes as
  future work. Build still reports the existing Astro/Vite warnings for an
  empty editor chunk, large client chunks, and GET generation for POST-only
  editor authoring API routes.

## Do Not Declare Done Until

- The workbench shell exists and is usable as the first editor screen.
- Selection is synchronized across hierarchy, viewport/bridge, inspector, and
  content browser.
- The viewport or live-game bridge is central and supports professional
  selection/direct-manipulation workflows.
- Save Draft, Save Level, Publish, Preview, Reload, and Discard are visibly and
  semantically distinct.
- Persistent owner writes exist for the feature families advertised as
  publishable.
- Contract tests, boundary audit, type-check, lint, build, and legacy-reference
  audit pass.
- No temporary probes, stale docs, orphan tests, unused helpers, or legacy
  editor code have been left behind.
