# Level Editor AAA Research And Gap Analysis

Status: active research and contract gap report

This document is the decision gate for turning the current Megameal editor from
a contract-aligned dev utility into a real level editor. It does not declare
the editor complete. It records the professional editor standard, the current
Megameal truth, and the gaps that must be closed before further UI work should
be treated as AAA-tier level-editor work.

## External Editor Research

Professional level editors converge on the same workbench shape:

- A central scene viewport owns spatial judgement, object picking, transform
  handles, view modes, snapping, and play/edit visibility.
- A scene hierarchy or outliner owns object organization, selection, visibility,
  lock/pickability, grouping, parentage, and stable object identity.
- A details/inspector panel owns selected-object and component properties,
  including numeric transform editing and component-specific fields.
- An asset/content browser owns source assets, prefabs, import settings,
  placement, replacement, preview, filtering, and drag/drop creation.
- Top/bottom chrome owns tool modes, save state, dirty state, play/live preview,
  build/cook/publish state, validation, logs, and output.

Official references:

- Unreal Editor Interface:
  https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-editor-interface
- Unreal Level Editor:
  https://dev.epicgames.com/documentation/en-us/unreal-engine/level-editor-in-unreal-engine
- Unreal Actor placement:
  https://dev.epicgames.com/documentation/en-us/unreal-engine/placing-actors-in-unreal-engine
- Unreal cooking:
  https://dev.epicgames.com/documentation/en-us/unreal-engine/cooking-content-in-unreal-engine
- Unity editor windows and views:
  https://docs.unity3d.com/Manual/editor-windows-views-reference.html
- Unity Scene view:
  https://docs.unity3d.com/Manual/UsingTheSceneView.html
- Unity Hierarchy:
  https://docs.unity3d.com/Manual/Hierarchy.html
- Godot editor first look:
  https://docs.godotengine.org/en/stable/getting_started/introduction/first_look_at_the_editor.html
- Godot scenes and nodes:
  https://docs.godotengine.org/en/stable/getting_started/introduction/key_concepts_overview.html
- O3DE Editor:
  https://www.docs.o3de.org/docs/user-guide/editor/

The practical standard is simple: the editor must always make it obvious what
is selected, where it is, whether the user is editing an instance or reusable
source asset, what changed, whether the change is undoable, whether the change
is only previewed, and whether it will ship after save/publish.

## Current Megameal Contract Truth

The current Megameal editor has useful foundations:

- `/editor/` is a dev-only tooling surface, separate from the normal game HUD.
- Runtime scene selection resolves through the checked-in runtime scene catalog.
- Object identity is stable-ID based and derived from manifest-owned level
  instances, prefab references, component overrides, assets, terrain packages,
  and readiness data.
- The workspace groups objects into Spawn, Terrain, Collision, Lights, Portals,
  Audio Emitters, Story, and Props.
- Inspector fields can stage transform edits and a first set of component edits
  for authored lights, portals, and sound emitters.
- Live preview uses dev-only preview messages and does not make preview state
  permanent runtime data.
- Save Draft writes generated authoring transaction modules with
  `writesRuntimeData: false`.
- Save Level and Publish Level currently persist the bounded generated-owner
  slices for level-instance transform overrides, object-library generated
  placements, level-instance prefab ID replacements, level-instance component
  set/removal records, and bounded level-instance removals. This is not the
  same as direct arbitrary `src/game/levels/*.ts` rewriting or full
  level-structure editing.
- Object Library replacement and AI Asset Lab foundations exist as separate
  editor systems. Object Library can stage selected-object renderable mesh,
  material, audio, and prefab replacement drafts from manifest-backed assets.
  The selected-object inspector now has a first Renderable picker slice for
  current mesh/material IDs, scene-scoped manifest-backed choices, active
  level-instance scope, future-disabled prefab/asset-manifest scopes, and
  current/dirty/staged state through the same replacement draft queue. The
  picker now includes selectable candidate cards with display-only source
  owner, preview contract, usage, and type metadata. Mesh and material
  selections compose against the effective queued `Renderable` state so a later
  staged material change preserves an already staged mesh change. Those selected
  level-instance Renderable edits now emit normal `set-component` operations,
  making the first bounded mesh/material reference override path Save
  Level/Publish-ready through the existing generated component override owner
  after asset-kind and selected-scene preload validation.
  AI Asset Lab can model Hunyuan/ComfyUI service status, queue/generated asset
  records, and apply-to-selection edit plans, but durable generated asset
  manifest writes, generated result import, and the full visual replacement
  workflow are not complete.

Important current limitation: if "save to level owner data" means directly
rewriting `src/game/levels/*.ts` level owner modules, that is not the current
implementation. The persistent runtime path is the generated published
level override owner consumed by runtime scene manifests. That is a valid first
owner-write slice for transforms, generated placements, prefab replacement
records, component overrides/removals, and bounded removals, but it is not the
full level editor.

## Blockout-To-Reimagined Asset Workflow

The final editor must support a blockout-first level-building workflow:

1. A designer loads a runtime scene in the level editor.
2. The designer selects a stable-ID object in the viewport or outliner.
3. The inspector shows the selected object, its prefab/source owner, component
   data, current `Renderable.meshId`, material reference, gameplay components,
   collision ownership, and publishability.
4. The current mesh reference is editable through a manifest-backed mesh picker
   that is scoped to the selected runtime scene and object-library/catalog data.
5. If the library already has a suitable mesh, selecting it stages a
   selected-level-instance renderable replacement while preserving stable ID and
   gameplay components.
6. If the library does not have a suitable mesh, the same selected-object
   context can launch AI Asset Lab generation using Hunyuan/ComfyUI, prompt and
   reference data, source asset/stable ID, and fit-to-selection bounds.
7. Generated output enters the editor as a generated asset/library record with
   provenance, metadata, fingerprint/hash, source object context, and owner
   manifest status.
8. Applying the generated asset stages two explicit owner operations: an asset
   manifest/generated-asset record and a level-instance `Renderable` reference
   update. AI never mutates runtime entities directly.
9. Collision, rigid bodies, portals, audio emitters, scripts, and other gameplay
   components remain authored data unless the user explicitly edits those
   owners. A visual reimagining must not silently create collision or gameplay
   behavior.

This workflow is planned, but not complete. The current editor has the stable
selection model, inspector foundation, object-library replacement foundation,
first bounded level-instance Renderable mesh/material reference Save
Level/Publish path with asset-kind and selected-scene preload validation, and AI
Asset Lab contract foundation. Missing work is real generation dispatch/result
harvesting, durable generated asset manifest writers, generated asset import,
enabled prefab/asset owner scopes, and clear UI that distinguishes replacing one
selected instance from changing a reusable prefab definition.

## UX Gap Matrix

| Professional editor surface | Current Megameal state | Gap |
| --- | --- | --- |
| Central 3D scene viewport | Missing as an editor-owned workbench surface | Add visual scene viewport or tightly integrated live-game viewport bridge with direct selection, highlights, tool modes, and overlays. |
| Viewport object picking | Partial | Projected viewport pins and projected marquee selection can select stable-ID objects and show secondary multi-selection. Rendered-scene hit-test and box-select paths now exist through `LEVEL_EDITOR_DEV_PREVIEW_PROTOCOL` with `rendered-scene-hit-test-request`, `rendered-scene-hit-test-result`, `rendered-scene-box-select-request`, and `rendered-scene-box-select-result` messages, `requestId`, `runtimeSceneId`, pickable stable-ID filters, stable-ID results, `runtime-rendered-scene-box-select` provenance for box selection, and `writesRuntimeData: false`. Editor object view-state still gates rendered selection through visible-and-pickable stable IDs. The live dev runtime can map adapter-local `ThreeRendererAdapter.hitTestRenderedScene` raycast hits and `ThreeRendererAdapter.boxSelectRenderedScene` projected render-object bounds from renderer entities to manifest stable IDs and post hit/miss/ignored result payloads. The workbench can send Select-mode viewport click and marquee requests and consume runtime results through `LEVEL_EDITOR_RENDERED_HIT_TEST_SELECTION_CONTRACT` for known, editor-pickable stable-ID selection. Projected transform pins and projected marquee remain editor fallbacks when the runtime rendered requester is unavailable. This is a renderer-backed stable-ID selection path, not proof of a complete direct-manipulation system or occlusion-aware lasso selection system. |
| Transform gizmos | Missing | Add move/rotate/scale handles, local/world space, axis constraints, pivot, grid/snap, and numeric transform sync. |
| Hierarchy/outliner | Partial | Current outliner lists grouped objects with search, category/lock/pickability/visibility filters, category/path affordances, filtered-result selection actions, editor-only hide/show, lock/unlock, isolate/reset controls, browser-local runtime-scene-scoped object view-state restore, and an editor-owned Ctrl/Cmd multi-select foundation shared with projected viewport pins/marquee selection plus runtime-backed rendered box/marquee stable-ID selection. Shared or checked-in visibility/lock/isolation metadata, group/reparent, and deeper hierarchy path tooling remain future. |
| Inspector | Partial | Inspector can stage supported fields and multi-selection now has a selection-set summary, but mixed-object editing and bulk operation contracts remain future work. |
| Inspector renderable mesh picker | Partial | First selected-object Renderable picker slice exposes current `Renderable.meshId`/`Renderable.materialId`, scene-scoped manifest-backed mesh/material choices, active level-instance scope, future-disabled prefab/asset-manifest scopes, current/dirty/staged labels, selectable candidate cards with display-only source owner/preview contract/usage/type metadata, preview staging, queued authoring operations, composed mesh/material staging from the effective queued `Renderable` state, and Save Level/Publish-ready level-instance Renderable `set-component` overrides after asset-kind and selected-scene preload validation. Rich rendered thumbnails, generated asset import, durable manifest writers, and enabled prefab/asset scopes remain future. |
| Asset/content browser | Partial | Object Library exists and can stage mesh/material/audio/prefab replacement drafts, but placement/replacement is not a complete persistent asset/prefab workflow. |
| AI visual reimagining | Partial foundation | AI Asset Lab has service/job/generated-record/apply-plan contracts for Hunyuan/ComfyUI, but final generation dispatch, result import, generated asset manifest persistence, and inspector/object-library integration remain future work. |
| Dirty/save state | First clarity slice implemented; still partial | Save Draft, Save Level, Publish, Discard Staged, and Preview are separated in code and the staged operations dock now classifies queued entries as preview-only, draft-only, mixed, or Save Level/Publish ready. Broader operation coverage, post-publish rollback, and full professional save/publish semantics remain future. |
| Output/validation/build | Partial | Validation and command plans exist, but publish gates are first-slice gates and must not be read as full-feature publish coverage. |
| Collision/terrain authoring | Foundation only | Collision preview and terrain cook foundations exist; persistent multi-level collision authoring, 3D viewport editing, import UI, and material/shader tooling remain open. |
| Play/live preview boundary | Partial | Dev preview is contract-aligned, but edit mode versus live preview permanence needs stronger visual state and language. |

## Architecture Gap Matrix

| Area | Implemented | Partial | Missing / future |
| --- | --- | --- | --- |
| Dev-only editor boundary | `/editor/` dev route and production-disabled authoring API behavior | Production exclusion tests focus on client bundles and disabled API behavior, not a finished editor security model | Broader production route/output assertions as the editor grows |
| Catalog scene loading | Runtime scene catalog selection and neutral `starter_runtime` default | Per-feature panels still vary in capability and clarity | Full scene metadata/new-level/save-as workflow |
| Selection model | Stable object IDs, category groups, editor-owned multi-select context with one primary inspector object, synchronized projected viewport pins, projected marquee selection, runtime-backed rendered click and bounds-aware box/marquee stable-ID selection, browser-local editor-only object view state that restores per runtime scene without runtime data or owner-file writes, and a selection-set inspector | Bulk mutations, occlusion-aware advanced rendered selection modes, mixed-object editing, and shared or checked-in visibility/isolation/lock metadata remain future | One workbench selection model with viewport/outliner/inspector synchronization |
| Authoring queue | Staged field edits and queued operations | Some preview paths still read current DOM inputs | Typed staged state as the only preview/save input |
| Preview | Dev-only runtime patch protocol | Clear/reload lifecycle diagnostics remain limited | Editor-mode/live-mode visual contract and richer preview diagnostics |
| Persistence | Generated authoring drafts plus bounded generated owner writes for level-instance transform overrides, object-library insertions, prefab replacement records, component set/removal records including level-instance Renderable mesh/material reference overrides, and bounded level-instance removals | Broader readiness-owner mutations, prefab-owned edits, asset-manifest edits, and generated asset records remain blocked | Generated asset manifest records, enabled prefab/asset scopes, and later asset/render/audio owners |
| AI-generated visual assets | AI Asset Lab contract models and generated asset records | Service probing and apply-plan staging exist without full generation/import/publish path | Dev-only Hunyuan/ComfyUI dispatch, generated output harvesting, provenance/hash validation, manifest-backed asset records, object-library availability, and renderable-reference publish gates |
| Contracts | Existing workspace/save/collision plans and register rows | Some docs are scattered or stale in wording | Dedicated workbench contract, gap analysis, and milestone gates |

## Required Workbench Contract

The next editor architecture must be a workbench, not more unrelated boxes. The
target regions are:

- Top toolbar: selected scene, active tool mode, save/dirty state, preview/play
  controls, build/publish controls, and validation summary.
- Left dock: searchable scene hierarchy/outliner with visibility, lock,
  category filters, and stable-ID path information.
- Center: scene viewport/live-preview surface with selection, overlays, view
  modes, gizmos, grid/snap, and edit/play state.
- Right dock: selected-object inspector with source owner, component groups,
  editable fields, current renderable mesh/material references, manifest-backed
  asset pickers, publishability labels, and operation previews.
- Bottom dock: tabbed content browser/object library, AI Asset Lab/generated
  asset library, staged operations, output log, validation report, command
  plan, publish gates, and secondary live-runtime/collision/terrain
  diagnostics.

Existing panels may survive as task panels, but they should not remain as a
flat stack of equal boxes. A user should be able to answer the core editor
questions from the first screen: what object is selected, where it is, what can
be edited, what is dirty, what is preview-only, and what will be saved.

## No-Victory Criteria

Do not call the level editor AAA-tier complete until all of these are true:

- A real viewport or integrated live-game viewport bridge exists for spatial
  selection and direct manipulation.
- Outliner, viewport, inspector, object library, and preview all share one
  stable selected-object model.
- Transform editing supports professional concepts: local/world space, snapping,
  pivot/axis constraints, numeric fields, undo/redo, and visible dirty state.
- Component editing has persistent owner-write coverage, not only draft save
  coverage, for the feature family being advertised.
- Asset placement/replacement has manifest-backed source ownership,
  publishability labels, and validation.
- The blockout-to-reimagined workflow is complete: selecting an object exposes
  its current renderable mesh, existing mesh choices, AI generation when no
  suitable library asset exists, generated asset provenance, and saved
  level-instance renderable updates without mutating gameplay components.
- Save Draft, Save Level, Publish, Preview, Reload, and Discard are visually and
  semantically distinct.
- Publish gates reflect the exact current supported operation set and do not
  overclaim broader component, prefab, asset, render, terrain, collision, audio,
  NPC, or environment support.
- Documentation, contract register rows, and focused tests match the actual
  implementation state.

## First Implementation Gate

Before UI expansion resumes:

1. Keep this gap analysis current.
2. Update workspace/save/publish docs so they distinguish browser preview from
   explicit dev API writes.
3. Add or update the engine contract register row for the workbench target.
4. Require this document from the level-editor AAA plan contract test.
5. Treat the current Object Selection panel as a foundation and not as the final
   editor selection architecture.
