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
  placements, level-instance component set/removal records, and bounded
  level-instance removals. This is not the same as direct arbitrary
  `src/game/levels/*.ts` rewriting or full level-structure editing.

Important current limitation: if "save to level owner data" means directly
rewriting `src/game/levels/*.ts` level owner modules, that is not the current
implementation. The persistent runtime path is the generated published
transform owner consumed by runtime scene manifests. That is a valid first
owner-write slice, but it is not the full level editor.

## UX Gap Matrix

| Professional editor surface | Current Megameal state | Gap |
| --- | --- | --- |
| Central 3D scene viewport | Missing as an editor-owned workbench surface | Add visual scene viewport or tightly integrated live-game viewport bridge with direct selection, highlights, tool modes, and overlays. |
| Viewport object picking | Missing | Selection is list/card driven; user cannot select scene objects in authored space. |
| Transform gizmos | Missing | Add move/rotate/scale handles, local/world space, axis constraints, pivot, grid/snap, and numeric transform sync. |
| Hierarchy/outliner | Partial | Current outliner lists grouped objects, but lacks search, filtering, visibility, lock/pickability, multi-select, group/reparent, and hierarchy path clarity. |
| Inspector | Partial | Inspector can stage some fields, but editability and publishability are not obvious enough and preview currently depends on DOM reads in some paths. |
| Asset/content browser | Partial | Object Library exists, but placement/replacement is not a complete persistent asset/prefab workflow. |
| Dirty/save state | Partial and confusing | Save Draft, Save Level, and Publish are separated in code, but the UI does not make draft-only versus runtime-owner writes obvious enough. |
| Output/validation/build | Partial | Validation and command plans exist, but publish gates are first-slice gates and must not be read as full-feature publish coverage. |
| Collision/terrain authoring | Foundation only | Collision preview and terrain cook foundations exist; persistent multi-level collision authoring, 3D viewport editing, import UI, and material/shader tooling remain open. |
| Play/live preview boundary | Partial | Dev preview is contract-aligned, but edit mode versus live preview permanence needs stronger visual state and language. |

## Architecture Gap Matrix

| Area | Implemented | Partial | Missing / future |
| --- | --- | --- | --- |
| Dev-only editor boundary | `/editor/` dev route and production-disabled authoring API behavior | Production exclusion tests focus on client bundles and disabled API behavior, not a finished editor security model | Broader production route/output assertions as the editor grows |
| Catalog scene loading | Runtime scene catalog selection | Per-feature panels still vary in capability and clarity | Full scene metadata/new-level/save-as workflow |
| Selection model | Stable object IDs and category groups | Multiple visible selection/detail surfaces can feel parallel | One workbench selection model with viewport/outliner/inspector synchronization |
| Authoring queue | Staged field edits and queued operations | Some preview paths still read current DOM inputs | Typed staged state as the only preview/save input |
| Preview | Dev-only runtime patch protocol | Clear/reload lifecycle diagnostics remain limited | Editor-mode/live-mode visual contract and richer preview diagnostics |
| Persistence | Generated authoring drafts and generated transform owner writes | Component/object operations can stage drafts but are not broadly publishable | Generated owner writes for level-instance component overrides, object insertion/removal, prefab replacement, and later asset/render/audio owners |
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
  editable fields, publishability labels, and operation previews.
- Bottom dock: content browser/object library, output log, validation report,
  command plan, and publish gates.

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
