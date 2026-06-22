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
  `defaultRuntimeSceneManifest.id`. Loadable level content is not a generic editor default or fallback; every scene must resolve through catalog selection.
- A loaded level is the manifest projection of authored level instances,
  prefab references, component overrides, assets, terrain packages, and
  readiness IDs.
- The editor outliner groups manifest-owned objects by component role:
  Spawn, Terrain, Collision, Lights, Portals, Audio Emitters, Story, and Props.
- The current UI is a foundation, not the finished workbench. The target
  professional editor shape is tracked in
  `docs/LEVEL_EDITOR_AAA_RESEARCH_AND_GAP_ANALYSIS.md`: top toolbar, scene
  hierarchy, central viewport or live-game viewport bridge, inspector, content
  browser, output log, and publish/validation gates.
- The object-selection workflow is category-first and component-driven. The
  editor may provide visual aids such as a category rail, spatial pins, and
  selected-object summaries, but those controls must be derived from
  `workspace.objects`, `sceneTree`, stable IDs, and component fields. A category
  aid for portals, lights, audio emitters, or future object roles must select
  the same manifest-owned object that the outliner and inspector use; it must
  not introduce scene-specific portal lists, runtime repair data, or a parallel
  inspector.
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
  level-instance component set/removal records, and bounded
  `remove-level-instance` records. Unsupported staged operations must remain
  draft-only or blocked instead of leaking into runtime.
- `/editor/` owns the dev control workspace. `/` owns the live game runtime.
  Production builds must continue to exclude editor tooling from normal game
  execution.

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
