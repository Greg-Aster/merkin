# Level Editor Workspace Alignment

Status: active implementation packet. The editor workspace is a dev-only control
surface for loading runtime scene manifests, inspecting authored level objects,
previewing component edits in the live game route, and keeping save/bake work on
explicit contract tooling.

## Engine References

- Unreal Engine levels are authored world containers saved as separate `.umap`
  assets and contain environment actors, characters, lights, and sounds:
  https://dev.epicgames.com/documentation/en-us/unreal-engine/levels-in-unreal-engine
- Unreal Engine actors are placeable level objects, and components provide
  movement, rendering, physics/collision, and audio behavior:
  https://dev.epicgames.com/documentation/en-us/unreal-engine/actors-in-unreal-engine
- Unreal Engine modules separate runtime and editor/tooling code:
  https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-engine-modules
- Unreal Engine cooking converts authored content into platform/runtime-ready
  data:
  https://dev.epicgames.com/documentation/en-us/unreal-engine/cooking-content-in-unreal-engine
- Unreal's editor interface uses a workbench made of a viewport, outliner,
  details panel, content browser/drawer, toolbar, output log, play controls, and
  save/build status:
  https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-editor-interface
- Unity scenes are project assets that hold all or part of a game, commonly one
  scene per level:
  https://docs.unity3d.com/Manual/CreatingScenes.html
- Unity GameObjects are scene objects whose functionality is defined by attached
  components:
  https://docs.unity3d.com/Manual/GameObjects.html
- Unity `Editor` folders contain authoring scripts that are not available in
  player builds:
  https://docs.unity3d.com/Manual/SpecialFolders.html
- Godot organizes games as scenes made of node trees; its editor is essentially
  a scene editor with inspector-based property editing:
  https://docs.godotengine.org/en/stable/getting_started/step_by_step/nodes_and_scenes.html
- Godot scenes saved to disk are `PackedScene` resources that can be instanced
  at runtime:
  https://docs.godotengine.org/en/stable/tutorials/scripting/resources.html

## Megameal Mapping

- The editor loads `RuntimeSceneManifestData` from
  `src/game/levels/runtimeSceneManifests.ts`; this is the level browser source
  of truth.
- With no requested `scene` parameter, the editor opens on
  `defaultRuntimeSceneManifest.id`, currently `starter_runtime`. Loadable level
  content is not a generic editor default or fallback and must not assume Portal
  Arena; every scene must resolve through catalog selection.
- A loaded level is the manifest projection of authored level instances,
  prefab references, component overrides, assets, terrain packages, and
  readiness IDs.
- The editor outliner groups manifest-owned objects by component role:
  Spawn, Terrain, Collision, Lights, Portals, Audio Emitters, Story, and Props.
- Outliner filters may narrow the hierarchy by search text, object category,
  current lock metadata, projected pickability, and visibility metadata. These
  filters are editor view state only. Browser-local editor workspace persistence
  may remember them as per-scene workbench state, but that is still not runtime
  scene data; they must not be implemented as shipped object visibility, lock,
  isolation, or pickability toggles, or as owner-file writes, without a matching
  owner-write contract.
- `EditorObjectViewState` is the editor-owned slice for per-object workbench
  presentation state. It is keyed by runtime scene and stable ID, may come from
  editor memory or browser-local editor workspace persistence, and may track
  outliner visibility filters, lock/isolation presentation, pickability display,
  expanded/collapsed hierarchy state, search/filter membership, and primary or
  secondary selection presentation. It is not runtime scene data.
- Until an explicit owner-write contract exists, visibility, lock, and isolation
  changes in `EditorObjectViewState` may only affect the editor view: hiding or
  isolating rows, projected pins, selection aids, or editor gestures. They must
  not mutate `RuntimeSceneManifest`, level instance components,
  `Renderable.visible`, readiness data, prefab data, physics state, generated
  published owner modules, or live runtime state.
- The current workbench UI keeps this state in editor memory, while the model
  contract already defines browser-local editor workspace serialization that
  preserves `writesRuntimeData: false`, `writesOwnerFiles: false`, and
  `persistsOwnerWrites: false`. The UI supports per-object hide/show,
  lock/unlock, isolate, clear, and reset actions, uses those states to filter
  the outliner and projected viewport pins, and disables projected picking for
  editor-locked objects without staging or publishing any owner-write operation.
- Outliner selection actions may select all currently shown filtered objects,
  add shown objects to the current selection, or clear the current selection.
  They are stable-ID selection operations only and must not be treated as bulk
  edit, duplicate, removal, or save/publish operations.
- The current UI is a foundation, not the finished workbench. The target
  professional editor shape is tracked in
  `docs/LEVEL_EDITOR_AAA_RESEARCH_AND_GAP_ANALYSIS.md`: top toolbar, scene
  hierarchy, central viewport or live-game viewport bridge, inspector, content
  browser, output log, and publish/validation gates.
- Workbench usability has a priority order. The central viewport or live-game
  viewport bridge, left scene hierarchy, right inspector, and tabbed bottom
  content browser are primary authoring surfaces. Staged operations, validation
  reports, command plans, publish gates, runtime telemetry, terrain/collision
  diagnostics, and output logs are secondary dock/drawer surfaces unless a task
  mode explicitly promotes one of them. Do not present every internal
  contract/status surface as an equally important window in the default editor
  layout.
- The bottom dock must behave as an accessible tabbed authoring surface, not a
  loose list of hidden cards. Staged Operations reflects the live authoring
  queue count, Publish Gates promotes the publish command plan, Commands
  promotes the build command plan, and live-runtime/collision/terrain tools
  remain secondary diagnostics unless a future task mode explicitly promotes
  them.
- The object-selection workflow is category-first and component-driven. The
  editor may provide visual aids such as a category rail, spatial pins, and
  selected-object summaries, but those controls must be derived from
  `workspace.objects`, `sceneTree`, stable IDs, and component fields. A category
  aid for portals, lights, audio emitters, or future object roles must select
  the same manifest-owned object that the outliner and inspector use; it must
  not introduce scene-specific portal lists, runtime repair data, or a parallel
  inspector.
- The editor-owned multi-select foundation is stable-ID context, not runtime
  selection state. The selected stable-ID list must normalize against
  `workspace.objects`; the first selected object remains the primary inspector,
  viewport transform, preview, duplicate/remove, and replacement subject until
  explicit bulk-operation owner-write contracts exist. Multi-select must not
  introduce parallel object lists, parallel inspectors, or implicit bulk
  mutations.
- Selection-set controls may summarize selected categories/common components,
  choose a different primary selected object, or remove objects from the editor
  selection list. Those controls are selection-state operations only; they must
  not stage transforms, duplicate/remove operations, component edits, or owner
  writes without explicit bulk-operation contracts.
- The viewport bridge may mirror the selected stable-ID list onto projected
  transform pins and projected marquee selection. Runtime-backed rendered click
  selection and rendered box/marquee stable-ID selection synchronize through
  the same editor selection model, while the projected surface remains the
  fallback when the runtime rendered requester is unavailable.
- Rendered-scene selection now has a bounded protocol seam in
  `LEVEL_EDITOR_DEV_PREVIEW_PROTOCOL`: `rendered-scene-hit-test-request`,
  `rendered-scene-hit-test-result`, `rendered-scene-box-select-request`, and
  `rendered-scene-box-select-result` messages carry `requestId`,
  `runtimeSceneId`, optional pickable `stableId` filters or screen rectangles,
  stable-ID results, and `writesRuntimeData: false`. The request is gated by
  editor object view state (`visible-and-pickable-only`), so editor-hidden or
  editor-locked objects do not become selectable through the runtime rendered
  selection path.
- The live dev runtime now has the first runtime/adapter-backed result path.
  `ThreeRendererAdapter.hitTestRenderedScene` performs the raycast inside the
  Three adapter and returns plain entity/world-hit data; the dev-preview bridge
  maps the entity through runtime `StableId` components and posts stable-ID
  hit/miss/ignored result payloads. `ThreeRendererAdapter.boxSelectRenderedScene`
  projects adapter-owned render-object bounds through the runtime camera for
  CSS-pixel marquee rectangles and posts `runtime-rendered-scene-box-select`
  hit/miss/ignored payloads. The editor now sends Select-mode viewport click
  and marquee requests and normalizes returned stable IDs through
  `LEVEL_EDITOR_RENDERED_HIT_TEST_SELECTION_CONTRACT` against
  `workspace.objects` and the current editor pickable stable-ID set before
  selection changes.
- The editor must not scrape Three objects, canvas internals, DOM nodes,
  Svelte component state, or `Object3D.userData` to infer selection. Runtime
  results must keep `requestId` and `runtimeSceneId` stale-response handling,
  stable-ID normalization against `workspace.objects`, explicit ignored/no-hit
  outcomes, and focused contract tests. This is a renderer-backed stable-ID
  selection path, not proof of a complete direct-manipulation system or
  occlusion-aware lasso selection system.
- Direct manipulation is component-based. V1 previewable objects are player
  spawn transform, authored lights, portal components, and sound emitters.
- Collision continues through `LevelEditorCollisionCookContract`; terrain
  package data remains bake-only and inspected through terrain package/cook
  contracts.
- Collision drafts resolve through
  `src/game/editor/collisionDrafts/collisionDraftRegistry.ts`. Per-level
  drafts are content packets and load only when their registered runtime scene
  is selected.
- Browser-side preview edits are preview-only. Runtime changes are sent through
  `LEVEL_EDITOR_DEV_PREVIEW_PROTOCOL` and restored through clear/reload
  snapshots. The Svelte workspace does not directly write source files.
  Explicit dev-only authoring API routes may write bounded owner files only for
  supported Save Draft, Save Level, and Publish operations, currently including
  generated level-instance transforms, object-library placements,
  level-instance prefab ID replacement records,
  level-instance component set/removal records including selected-object
  Renderable mesh/material reference overrides after asset-kind and
  selected-scene preload validation, and bounded `remove-level-instance`
  records. Unsupported staged operations must remain draft-only or blocked
  instead of leaking into runtime.
- `/editor/` owns the dev control workspace. `/` owns the live game runtime.
  Production builds must continue to exclude editor tooling from normal game
  execution.

## Maintainability Budget

`LevelEditorWorkspace.svelte` is an integration shell. It may compose panels,
route editor state, and connect focused model helpers, but it must not become
the owner for every new editor feature. New level-editor behavior must either
stay inside a focused owner file or reduce central complexity before adding to
the workspace shell, workspace model, viewport bridge model, object-library
panel, or shared editor CSS.

The central file budgets are enforced by
`test:level-editor-maintainability-contract`. These budgets are extraction
triggers, not capability ceilings. The final target is still a complete,
AAA-quality game editor and engine; large systems are acceptable when their
logic lives in focused owner modules with clear contracts, tests, and
runtime/editor boundaries. If a feature needs to exceed a central budget, the
same packet must extract a focused component, model helper, style owner, or
contract test that keeps the workbench understandable. Budget changes are
allowed only with an explicit contract-register update that explains why the
growth is necessary, what owns the behavior, why the central growth is
temporary or acceptable, and which follow-up will remove or lower the extra
budget when appropriate.

Preferred extraction owners:

- Outliner filters, selection-set controls, and object view-state controls
  belong in focused outliner/selection components or model helpers.
- Viewport projection, marquee selection, transform handles, placement ghosts,
  and camera controls belong in viewport bridge models/components.
- Save/Publish command planning, authoring queue review, and publish gate
  status belong in authoring/save owner modules and panels.
- Object-library search, filtering, transform composition, staged placement,
  and replacement review belong in object-library owner modules/components.
- Shared editor CSS should grow only for cross-panel primitives. Feature-sized
  styling belongs near the feature owner or in a clearly named editor style
  section.

## Future Editor Metadata Owner

Durable shipped scene/editor metadata remains future work. Browser-local editor
workspace state may remember view presets, object visibility sets, isolation
sets, lock overrides, collapsed outliner groups, panel layout, editor notes, or
per-scene workbench preferences only as editor-owned state with schema
versioning, migrate-or-reject behavior, deterministic serialization, and
focused validation. It must stay separate from shipped runtime manifests and
owner files unless a future contract explicitly promotes a field into
runtime-authored scene data.

## Duplicate/Conflict Rules

- Do not import or copy old `apps/game/src/threlte/editor/**` code.
- Do not load old `apps/game/src/threlte/editor/scenes/*.scene.json` as target
  runtime data.
- Do not revive quarantined old editor tooling.
- Old `apps/game/docs/level-editor-ux-refactor/**` and archive AAA docs are
  reference material only.
- New level-editor behavior must route through current `apps/game.megameal`
  manifests, schemas, preview protocol, and cook/bake contracts.
- Generic `src/app` editor modules must not directly import per-level collision
  draft modules or hardcode `*_runtime` scene IDs; the static
  `audit:engine-boundaries` guardrail enforces the registry/catalog boundary.

## Validation

- `pnpm --dir apps/game.megameal test:level-editor-workspace-model-contract`
  proves that the editor model opens on the runtime catalog default, keeps
  registered collision-draft scenes loadable from the catalog, exposes
  non-terrain outliner groups, previewable core object classes, graph nodes,
  category-first object selection data, and explicit dev authoring persistence.
- `pnpm --dir apps/game.megameal test:live-preview-protocol-contract` proves
  preview messages are validated, scene mismatches remain runtime-gated, and
  temporary runtime mutations can be cleared.
- `pnpm --dir apps/game.megameal test:production-editor-bundle-contract` proves
  production output does not ship the dev editor surface.
- `pnpm --dir apps/game.megameal test:level-editor-maintainability-contract`
  proves central file budgets, maintainability docs, package-script wiring, and
  runtime/editor import separation remain guarded.
