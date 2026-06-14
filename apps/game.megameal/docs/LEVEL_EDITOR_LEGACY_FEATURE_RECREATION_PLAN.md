# Level Editor Legacy Feature Recreation Plan

Status: planning and implementation handoff

Scope: recreate the useful level-editor functions from the reference-only
`apps/game` project inside `apps/game.megameal` without importing old code,
without loading old scene JSON as runtime data, and without making runtime
engine systems depend on editor state.

This document is the coding brief for the six implementation agents assigned
after it was written. It is intentionally concrete: each feature below names
the old reference surface, the current Megameal contract owner, and the new
target shape.

## Source Rules

- `apps/game` is evidence only. Do not import files from it, mount its editor,
  copy its runtime ownership model, revive quarantine routes, or load old
  `*.scene.json`/generated runtime JSON as Megameal runtime data.
- The Megameal runtime remains contract-first: `RuntimeSceneManifest`,
  `LevelDefinition`, `PrefabDefinition`, `AssetManifest`, `RenderProfile`,
  terrain packages, collision cook products, and readiness validation are the
  shipped data owners.
- The level editor is a dev-only authoring surface. It may inspect current
  manifests, stage edits, send temporary preview patches, write through
  explicit save/build/publish commands, and request live runtime reloads. It
  must not become the normal game HUD or a hidden runtime repair path.
- Every new editor feature must resolve the selected scene through the checked-
  in runtime scene catalog. Generic editor code must not branch on
  `observatory_runtime`, `portal_arena_runtime`, or any other single level.
- Save/build/publish must be explicit. Normal production builds must not
  silently cook, rewrite, or repair authored source files.

## Engine-Quality Reference Model

These are the external engine patterns this plan follows:

- Unreal levels are separate world containers that hold environment actors,
  characters, lights, sound, and related level features:
  https://dev.epicgames.com/documentation/en-us/unreal-engine/levels-in-unreal-engine
- Unreal actors are placeable objects; component data supplies transform,
  rendering, collision, audio, and behavior. Megameal should map this to stable
  level instances plus component records, not Svelte-owned objects:
  https://dev.epicgames.com/documentation/en-us/unreal-engine/actors-in-unreal-engine
- Unreal modules separate runtime, editor, libraries, and tools into
  dependency-controlled units. Megameal should keep editor authoring modules
  outside engine core/runtime ownership:
  https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-engine-modules
- Unreal cooking converts internal authored content into platform/runtime-ready
  products and can run validation. Megameal publish should likewise save,
  validate, cook, drift-check, and then build:
  https://dev.epicgames.com/documentation/en-us/unreal-engine/cooking-content-in-unreal-engine
- Unity scenes are assets used as whole games or per-level containers, and
  Unity GameObjects are component containers for characters, props, scenery,
  lights, cameras, and audio:
  https://docs.unity3d.com/Manual/CreatingScenes.html
  https://docs.unity3d.com/Manual/GameObjects.html
- Unity reserves `Editor` folders for authoring-time scripts that are not
  available in Player builds. Megameal must keep editor code dev-only and
  production-excluded:
  https://docs.unity3d.com/Manual/SpecialFolders.html
- Godot organizes games as scene trees of nodes, with the editor acting as a
  scene editor and inspector. Megameal should provide a scene tree/outliner,
  inspector, asset/resource browser, and saveable data resources:
  https://docs.godotengine.org/en/stable/getting_started/step_by_step/nodes_and_scenes.html
  https://docs.godotengine.org/en/stable/tutorials/scripting/resources.html

## Megameal Architecture Anchors

Current checked-in anchors that the new editor must preserve:

- `ARCHITECTURE.md`: Astro hosts pages, Svelte owns presentation, runtime owns
  the game loop, engine core owns canonical state, and adapters project to
  Three/Rapier/Web Audio.
- `GAME_ENGINE_DESIGN_DOCUMENT.md`: UI/editor presentation may observe and
  command the engine but does not own runtime state. The level editor is
  dev-only and must write through explicit authored/cooked data contracts.
- `ENGINE_CONTRACT_REGISTER.md`: runtime scene selection is catalog-based;
  level authoring/import validation is content-graph based; broader old editor
  migration is allowed only after new editor/cook contracts prove
  runtime/editor separation.
- `docs/LEVEL_EDITOR_WORKSPACE_ALIGNMENT.md`: current `/editor/` is already
  catalog-driven and preview-only. This plan upgrades that surface from
  preview-only to authored edit/save/build/publish without weakening its
  duplicate/conflict rules.

## Legacy Feature Inventory

The following `apps/game` files are reference surfaces only. They document
capabilities to recreate, not code to copy.

### Workspace Shell And Layout

Reference:

- `apps/game/src/threlte/editor/EditorPanel.svelte`
- `apps/game/src/threlte/editor/EditorPanelTabRail.svelte`
- `apps/game/src/threlte/editor/EditorMainToolbar.svelte`
- `apps/game/src/threlte/editor/EditorCommandPalette.svelte`
- `apps/game/src/threlte/editor/editorPanelTabs.ts`
- `apps/game/docs/level-editor-ux-refactor/EDITOR_FEATURE_INVENTORY.md`

Features found:

- Workspaces: Scene, Create, World, NPC, Performance, Bake/Style, Collision,
  Build, and AI Lab.
- Persistent top chrome, command palette, workspace rail, resizable docks,
  layout presets, output/status panels, and responsive layout behavior.
- Prior issue: workspace density and duplicated controls were major debt.

Megameal target:

- Keep `/editor/` as one dev workspace with stable regions: level browser,
  scene tree/outliner, viewport/live-preview controls, inspector, asset/object
  library, feature panels, output log, and publish gate.
- Avoid old workspace sprawl. Use task panels and progressive disclosure so
  the default screen stays understandable.
- Store editor preferences separately from level data.

### Level Browser, Scene Document, And Persistence

Reference:

- `apps/game/src/threlte/editor/editorStore.ts`
- `apps/game/src/threlte/editor/editorDocumentStore.ts`
- `apps/game/src/threlte/editor/editorPersistence.ts`
- `apps/game/src/threlte/editor/EditorSaveTabHost.svelte`
- `apps/game/src/threlte/editor/EditorSavePanel.svelte`
- `apps/game/src/threlte/editor/editorPublishReadiness*.ts`

Features found:

- Level selection, new level creation, templates, save local, overwrite,
  import/export JSON, backup/original snapshots, metadata, publish readiness,
  pipeline status, and local storage drafts.

Megameal target:

- Use `RuntimeSceneManifest` catalog for level loading and browsing.
- Add an editor authoring document that projects the selected manifest into
  stable editable records. The document must preserve owner provenance:
  level file/export, prefab file/export, asset manifest file/export, render
  profile file/export, and generated output module where applicable.
- Replace preview-only persistence with a bounded save transaction:
  validate edit operations -> build write plan -> verify base hash -> update
  only known owner exports/generated modules -> reload live game on success.
- Support Save, Save As New Level, Discard, Revert From Disk, Build, and
  Publish. Publish is local only unless a future deploy contract says
  otherwise.

### Outliner, Selection, Inspector, And Direct Manipulation

Reference:

- `apps/game/src/threlte/editor/EditorOutliner.svelte`
- `apps/game/src/threlte/editor/EditorHierarchyPanel.svelte`
- `apps/game/src/threlte/editor/EditorPropertiesShelf.svelte`
- `apps/game/src/threlte/editor/EditorInspectorForm.svelte`
- `apps/game/src/threlte/editor/EditorNodeGizmos.svelte`
- `apps/game/src/threlte/editor/EditorSelectionOutlineOverlay.svelte`
- `apps/game/src/threlte/editor/EditorViewportControls.svelte`

Features found:

- Scene hierarchy, outliner display modes, single/multi-select, duplicate,
  delete, group/ungroup, reparent, visibility, isolation, transform modes,
  local/world space, axis selection, snapping, surface snapping, undo/redo,
  viewport edit/playtest modes, and transform/property inspector controls.

Megameal target:

- Outliner rows map to stable level instance IDs and component categories.
- Inspector edits component fields through typed edit operations, not DOM-local
  state.
- Direct manipulation sends dev-preview patches to the live runtime and marks
  the authoring document dirty. Runtime preview is temporary until Save.
- Undo/redo lives in the editor authoring transaction log and never mutates
  engine core state directly.

### Object Library, Asset Browser, And 3D Preview

Reference:

- `apps/game/src/threlte/editor/EditorCreateTabHost.svelte`
- `apps/game/src/threlte/editor/EditorCreatePanel.svelte`
- `apps/game/src/threlte/editor/editorCreateCatalog.ts`
- `apps/game/src/threlte/editor/editorAssetController.ts`
- `apps/game/src/threlte/editor/EditorAssetPreview.svelte`
- `apps/game/src/threlte/editor/editorPrefabFactory.ts`

Features found:

- Curated prefab groups, quick-create actions, add curated/imported/generated
  assets, asset browser roots, library filtering, selection replacement,
  merge selection to asset, and spinning 3D/image previews for selected assets.

Megameal target:

- Build a manifest-backed object library from current `AssetManifest` and
  `PrefabDefinition` data, grouped by type/tags/components.
- Add object insertion/removal for all selected levels, not a single hardcoded
  scene.
- Provide a selected-object preview panel that uses existing GLB/texture assets
  and generated asset metadata. The preview component must be editor-only.
- Object replacement writes level instance `prefabId`/component overrides and
  preserves stable ID unless the user explicitly creates a new instance.

### AI Asset Lab: Hunyuan 3D And ComfyUI

Reference:

- `apps/game/src/threlte/editor/EditorAIMeshStudio.svelte`
- `apps/game/src/threlte/editor/editorHunyuanApi.ts`
- `apps/game/src/threlte/editor/editorHunyuanJobPolling.ts`
- `apps/game/src/threlte/editor/editorGeneratedAssetApplication.ts`
- `apps/game/quarantine/scripts/editor-tools/aiRoutes.cjs`
- `apps/game/quarantine/scripts/editor-tools/aiRuntimeContext.cjs`

Features found:

- ComfyUI and Hunyuan status checks, optional service start/refresh, low-VRAM
  mode, workflow-template browsing/editing, job queue/status/cancel/recent jobs,
  prompt/reference-image driven generation, texture wrap, replacement mesh
  generation, generated asset metadata, generated asset preview, generated
  asset insertion, and fitting generated assets to selected source bounds.

Megameal target:

- Recreate behavior as new Megameal dev-only API and editor modules. Do not
  port the old CommonJS quarantine routes.
- Define an `EditorAiAssetJob` contract with source asset, source stable ID,
  prompt/reference, mode, backend, status, generated asset URL, metadata URL,
  fingerprints, fit report, and owner manifest/write-plan status.
- Keep all AI side effects in generated asset/library outputs plus explicit
  level edit operations. AI never mutates runtime entities directly.
- Service detection should be optional and safe: missing ComfyUI/Hunyuan reports
  unavailable status, not runtime failure.

### NPC And Interactive Content

Reference:

- `apps/game/src/threlte/editor/EditorNpcTabHost.svelte`
- `apps/game/src/threlte/editor/EditorNpcSection.svelte`
- `apps/game/src/threlte/editor/editorNpcControls.ts`

Features found:

- The old NPC tooling is mainly firefly NPC authoring: add firefly, attach to
  selection, remove NPC component, duplicate selected NPC, identity/archetype,
  click interaction, read-only/profile conversation, static or hover-wander
  behavior, presentation color/size/twinkle/light boost, and firefly field
  controls.

Megameal target:

- Introduce a Megameal `NpcAuthoringContract` as editor/game data first. Do
  not claim a full runtime NPC AI stack until systems exist.
- Recreate the current feature as authored interactive character/firefly data
  using stable component records, `FireflyPopulationContract`,
  `InteractionRegistry`, and StoryNote/conversation owner data where available.
- Add/insert/remove NPC instances through the same level authoring transaction
  path as normal objects.

### Environment, Lighting, Audio, Cameras, And View Modes

Reference:

- `apps/game/src/threlte/editor/EditorWorldTabHost.svelte`
- `apps/game/src/threlte/editor/EditorEnvironmentTabHost.svelte`
- `apps/game/src/threlte/editor/EditorEnvironmentPanel.svelte`
- `apps/game/src/threlte/editor/EditorAtmospherePresetPicker.svelte`
- `apps/game/src/threlte/editor/EditorAmbientAudioPresetControls.svelte`
- `apps/game/src/threlte/editor/editorLightPlacement.ts`
- `apps/game/src/threlte/editor/EditorWorkbenchLighting.svelte`
- `apps/game/src/threlte/editor/EditorViewportShadingOverlay.svelte`

Features found:

- Environment presets, ambient audio presets, level spawn/player setup,
  viewport lighting modes, viewport shading modes, authored light placement,
  workbench lighting, and rendered/solid/wireframe-style view controls.

Megameal target:

- Environment editing writes render profile/environment/audio manifest data
  through `SkyboxEnvironmentContract`, `AudioManifestAndEvents`, and
  `AuthoredLightContract`.
- Camera mode controls must be editor presentation state unless a future
  `CameraContract` authoring row is added. Live View follows the game runtime;
  Edit View lets the editor inspect and manipulate without hijacking gameplay.
- Lighting controls must validate render-profile budgets before save/publish.

### Terrain, Collision, Bake, And Publish

Reference:

- `apps/game/src/threlte/editor/EditorCollisionTabHost.svelte`
- `apps/game/src/threlte/editor/editorCollisionDefaults.ts`
- `apps/game/src/threlte/editor/editorCollisionLifecycle.ts`
- `apps/game/src/threlte/editor/editorTerrainPipeline.ts`
- `apps/game/src/threlte/editor/editorTerrainPipelineRunner.ts`
- `apps/game/docs/aaa-collision-authoring-workflow/README.md`
- `apps/game/docs/aaa-mesh-derived-collision-manager/README.md`

Features found:

- Collision policy/intent/channel/shape/quality/LOD controls, mesh collider
  bake/regenerate, collision overlay, terrain source import, terrain collision
  bake, GLB chunk cook, world partition cook, publish readiness, and validation
  gates.

Megameal target:

- Keep terrain package authoring under the current generic `cook:terrain` and
  `ci:terrain-drift` contracts. No level-specific terrain scripts.
- Collision authoring must use `LevelEditorCollisionCookContract` and the
  collision draft registry. Runtime collision products are generated/cooked
  data, not independent ad hoc scene objects.
- Publish must run: source validation, content graph drift check, relevant
  cook/drift commands, editor authoring contract tests, production editor
  exclusion test, type-check/build where appropriate, then live reload.

## Target System Shape

The new level editor should be organized as these layers:

```text
src/pages/editor.astro
  -> src/app/editor/*
     UI shell, workspace panels, outliner, inspector, library, output log

src/pages/api/editor/*
  -> dev-only authoring, AI, save, build, publish endpoints

src/game/editor/*
  -> game/editor authoring catalogs, object library, NPC authoring, AI job
     descriptions, collision/light draft registries, owner mapping

src/engine/data/*
  -> schema-level authoring contracts, validation, preview protocol,
     write-plan serialization, content graph checks

src/game/assets, src/game/prefabs, src/game/levels, src/game/generated
  -> checked-in authored source data and generated runtime products

runtime game window
  -> consumes RuntimeSceneManifest only
  -> receives dev preview patches only in dev mode
```

The editor may operate beside the live game route, but the live game remains
independent. The game can run without the editor. The editor can reconnect to
the game through a dev-only channel. Production output must not ship the editor.

## Implementation Packet

The six coding agents must work from this split. Agents are not alone in the
codebase; each agent must preserve unrelated dirty work, avoid reverts, and
stay within its ownership boundary.

### Agent 1: Authoring Contracts And Validation

Owns:

- `src/engine/data/levelAuthoring/**`
- `scripts/test-level-editor-authoring-contract.ts`
- package script only if needed for that focused test

Deliver:

- Typed `LevelEditorAuthoringDocument`, edit operation, transaction, validation,
  and write-plan contracts.
- Manifest projection from `RuntimeSceneManifestData`.
- Validation that rejects missing owner provenance, duplicate stable IDs,
  unknown target runtime scene IDs, invalid component edits, and preview-only
  operations marked as saved.

### Agent 2: Owner Registry And Bounded Persistence

Owns:

- `src/game/editor/authoring/**`
- `src/pages/api/editor/authoring/**`
- focused persistence test scripts under `scripts/test-level-editor-save*.ts`

Deliver:

- Catalog-driven owner registry for level, prefab, asset, render profile, and
  generated module ownership.
- Save endpoint or command that accepts validated authoring transactions and
  writes only known owner targets after base-hash verification.
- No broad TypeScript rewrite of arbitrary files. Prefer structured generated
  modules for generated/cooked data.

### Agent 3: Editor Workspace UI

Owns:

- `src/app/editor/LevelEditorWorkspace.svelte`
- `src/app/editor/levelEditorWorkspaceModel.ts`
- `src/app/editor/*` new UI-only helper modules
- `src/styles/editor.css`

Deliver:

- Level browser, outliner, inspector, object library, selected-object preview,
  dirty state, undo/redo affordance, Save/Discard/Build/Publish controls, and
  output log.
- Dark-mode editor styling preserved.
- No hardcoded runtime scene IDs.

### Agent 4: Live Preview And Direct Manipulation

Owns:

- `src/app/devPreview/**`
- `src/app/browserGameClient.ts`
- preview protocol owner modules under `src/engine/data/**` only when needed
- focused live-preview contract tests

Deliver:

- General object edit preview messages for transform, component patch,
  insert/remove preview, camera mode/live edit mode, and reload acknowledgments.
- Active-runtime-scene gating and snapshot restoration.
- Dev-only behavior; production editor bundle test must remain green.

### Agent 5: AI Asset Lab

Owns:

- `src/game/editor/ai/**`
- `src/pages/api/editor/ai/**`
- `src/app/editor/*Ai*` new editor-only modules
- focused AI contract tests

Deliver:

- Megameal-native Hunyuan/ComfyUI service status model, job queue/status/cancel
  contracts, generated asset metadata, generated asset library records, and
  apply-to-selection edit operations.
- No import from old `apps/game` AI routes.
- Graceful unavailable/offline state when local services are missing.

### Agent 6: Feature Catalogs, NPC, Environment, Collision, Build/Publish

Owns:

- `src/game/editor/objectLibrary/**`
- `src/game/editor/npcAuthoring/**`
- `src/game/editor/environmentAuthoring/**`
- `src/game/editor/buildPublish/**`
- focused feature contract tests

Deliver:

- Object/prefab/asset library grouping.
- NPC/firefly authoring contracts and defaults.
- Environment/lighting/audio edit surfaces mapped to existing Megameal
  contracts.
- Build/publish plan model that composes validation, cook/drift, and build
  commands without running hidden work in production builds.

## Acceptance Gates

Minimum focused gates for the packet:

```bash
pnpm --dir apps/game.megameal test:level-editor-workspace-model-contract
pnpm --dir apps/game.megameal test:live-preview-protocol-contract
pnpm --dir apps/game.megameal test:level-authoring-contract
pnpm --dir apps/game.megameal test:runtime-scene-contract
pnpm --dir apps/game.megameal test:production-editor-bundle-contract
pnpm --dir apps/game.megameal audit:engine-boundaries
pnpm --dir apps/game.megameal type-check
pnpm --dir apps/game.megameal build
git diff --check -- apps/game.megameal pnpm-lock.yaml
```

Additional focused tests should be added beside new contract owners. Do not add
one giant catch-all test if a narrower owner file is clearer.

## Risks To Avoid

- Recreating the old editor as a dense pile of workspaces instead of a clear
  manifest/authoring tool.
- Saving editor-local state without owner provenance.
- Letting live preview become shipped runtime data.
- Creating a new single-level default around Observatory or any other one
  scene.
- Importing old `apps/game` code, quarantine routes, old scene JSON, or old
  generated runtime JSON.
- Writing arbitrary TypeScript object literals with broad string replacement.
- Reporting full NPC, AI, collision, terrain, or environment parity before
  contracts and runtime consumers actually exist.

## Definition Of Done

The packet is done when a developer can:

1. Open `/editor/`.
2. Select any runtime scene from the catalog.
3. Select an object from the outliner.
4. Preview and directly manipulate supported component edits in the live game
   route without changing shipped data.
5. Insert, remove, duplicate, and replace objects from a manifest-backed
   library.
6. Preview a selected GLB/image asset.
7. Author NPC/firefly, lighting, environment/audio, camera/view-mode, collision,
   and terrain-relevant settings through contract-owned panels.
8. Queue or inspect AI generated-asset jobs when local services are available,
   and see clear unavailable state when they are not.
9. Save the level through bounded owner writes.
10. Run Build/Publish gates that validate, cook/drift-check, build, and reload
    without hidden runtime repair.
