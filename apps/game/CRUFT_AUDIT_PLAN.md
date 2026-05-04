# Game Cruft Audit Plan

This is the working plan for systematically reviewing `apps/game` file by file.
The goal is to remove cruft without making targeted level fixes that hide
architecture problems.

## Scope

Audit all files under `apps/game` except generated install/build output:

```bash
find apps/game \
  -path 'apps/game/node_modules' -prune -o \
  -path 'apps/game/dist' -prune -o \
  -path 'apps/game/.astro' -prune -o \
  -type f -print | sort
```

Current snapshot:

| Area | Files |
| --- | ---: |
| Root/config/docs | 12 |
| `authoring` | 54 |
| `public` | 16 |
| `scripts` | 34 |
| `src` | 276 |
| Total | 392 |

The canonical file inventory lives in `CRUFT_FILE_INVENTORY.md`. The explicit
working checklist lives in `CRUFT_TODO.md`.

## Review Outcomes

Every file should end in one of these states:

| State | Meaning |
| --- | --- |
| Keep | File is actively used and belongs where it is. |
| Refactor | File is needed, but responsibilities are mixed or too broad. |
| Move | File is needed, but belongs in another boundary. |
| Merge | File is redundant with another local helper/component. |
| Delete | File is unused, obsolete, generated in the wrong place, or unsafe to keep. |
| Externalize | Runtime code should consume a manifest/cooked artifact instead. |
| Defer | Needs a separate design decision before changing. |

## Rules

- Do not fix one level at a time unless the level data is the actual contract being audited.
- Prefer global engine/editor/runtime boundaries over local patches.
- Do not delete raw or generated assets until ownership, source, and replacement runtime path are clear.
- Do not move files across runtime/editor boundaries without checking imports and bundle impact.
- After each batch, run the smallest checks that cover the changed surface.

## Cruft Questions Per File

For every file, answer:

1. Is it imported or loaded at runtime, editor-only, build-only, or dead?
2. Does it duplicate another file, helper, schema, asset, or store?
3. Is it in the right boundary: runtime, editor, build script, public asset, or authoring source?
4. Does it hard-code level-specific behavior that should be manifest-driven?
5. Does it make browser runtime payload heavier than necessary?
6. Does it bypass readiness, collision, asset, spawn, or validation contracts?
7. Does it need a test, smoke check, audit rule, or build gate?

## Code-Level Review

The inventory is only the ledger. A file marked `keep` is not automatically
clean; it means the file still has a valid role. Each reviewed file also needs
an internal code pass covering:

- imports and dependency direction
- exported API surface and dead exports
- side effects at module load
- duplicated logic already present in nearby helpers
- hard-coded levels, assets, ports, selectors, budgets, or actor IDs
- writes to runtime public paths, generated paths, or source-controlled data
- browser/runtime payload impact
- editor/runtime boundary leaks
- validation gaps hidden behind manual checks
- stale comments, unused branches, and one-off compatibility paths

When a file is `refactor`, the file is still needed but the code inside has
debt that should be paid down before the system grows.

## Waves

### Wave 0: Baseline

Goal: make future deletions measurable.

- Run `pnpm --dir apps/game type-check`.
- Run `pnpm --dir apps/game smoke:engine`.
- Run `pnpm --dir apps/game audit:engine`.
- Capture bundle warnings and current largest chunks.
- Capture public/runtime asset sizes.

Baseline captured on 2026-04-30:

Checks:

- `pnpm --dir apps/game type-check`: passed.
- `pnpm --dir apps/game smoke:engine`: passed.
- `pnpm --dir apps/game audit:engine`: passed.

Initial inventory before the first Wave 1 asset move:

- 359 files under `apps/game`, excluding `node_modules`, `dist`, and `.astro`.
- Root/config/docs: 11 files.
- `public`: 76 files.
- `scripts`: 13 files.
- `src`: 259 files.

Runtime asset audit:

| Level | Scene | Nodes | Geometry | Asset Files | Asset Size | Spawn |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| `miranda` | 57KB | 70 | 53 | 0 | 0MB | `[0, 4.25, -13.8]` |
| `observatory` | 2KB | 1 | 0 | 0 | 0MB | `[-137.2, 1.8, -49.5]` |
| `sci-fi-room` | 34KB | 45 | 41 | 7 | 14.1MB | `[0, 3.31, 0]` |
| `solitude` | 32KB | 33 | 16 | 16 | 67.6MB | `[0, 1.5, -24]` |
| `yggdrasil` | 160KB | 166 | 115 | 13 | 39MB | `[0, 3.7, -118]` |
| Total | - | 315 | 225 | 36 | 120.7MB | - |

Collision/readiness audit:

- Explicit collision nodes: 197.
- Missing collision intent/channel/default collision: 0.
- Disabled collision nodes: 5.
- Explicit trimesh collision: 0.
- BOM scene files: 0.
- Baked terrain manifests are present for `observatory`, `solitude`, `sci-fi-room`, and `yggdrasil`.
- Baked terrain manifests report `physics=baked-terrain-mesh`, `collision=baked-terrain-mesh`, `vertices=16641`, `triangles=32768`, and `legacyTrimesh=no`.

Build bundle baseline from `smoke:engine`:

| Chunk | Minified | Gzip | Notes |
| --- | ---: | ---: | --- |
| `three-vendor` | 756.57KB | 201.88KB | Only current build warning: over 500KB. |
| `editor-panel` | 371.22KB | 87.45KB | Editor-only weight target. |
| `editor-document` | 294.48KB | 57.30KB | Editor document contract target. |
| `physics-vendor` | 194.96KB | 35.02KB | Runtime dependency target. |
| `editor-core` | 132.36KB | 40.48KB | No circular chunk warning after latest split. |
| `SceneDocumentLevel` | 101.46KB | 34.92KB | Runtime/editor scene contract target. |

Public payload baseline:

| Path | Size | Notes |
| --- | ---: | --- |
| `public` | 229MB | Total static payload in the game app. |
| `public/style-engine-ref` | 160MB | Likely authoring/reference-only; first cleanup target. |
| `public/audio` | 44MB | Mostly ambient tracks; classify runtime use before deletion. |
| `public/audio/ambient` | 44MB | Large runtime payload if globally served. |
| `public/vendor` | 26MB | ML/runtime vendor assets; classify lazy/editor-only needs. |
| `public/vendor/onnxruntime` | 24MB | Largest vendor blob is one 25,014,754 byte WASM file. |
| `public/vendor/tfjs` | 1.2MB | Vendor WASM payload. |
| `public/ref-image` | 508KB | Likely authoring/reference-only. |
| `public/audio/sfx` | 236KB | Small enough to keep if actively used. |

Largest public files:

| Size | File |
| ---: | --- |
| 25,014,754 bytes | `public/vendor/onnxruntime/ort-wasm-simd-threaded.jsep.wasm` |
| 7,723,670 bytes | `public/style-engine-ref/Screenshot from 2025-01-16 11-08-22.png` |
| 6,350,920 bytes | `public/style-engine-ref/Screenshot from 2023-09-28 20-05-35.png` |
| 5,927,675 bytes | `public/style-engine-ref/Screenshot from 2024-05-09 16-12-22.png` |
| 5,812,243 bytes | `public/style-engine-ref/Screenshot from 2025-01-03 10-56-10.png` |
| 5,785,236 bytes | `public/audio/ambient/piano synth.mp3` |
| 5,782,818 bytes | `public/audio/ambient/meta_3.mp3` |
| 5,774,581 bytes | `public/audio/ambient/Faster.mp3` |
| 5,773,521 bytes | `public/audio/ambient/Whistling Dreams.mp3` |
| 5,507,560 bytes | `public/style-engine-ref/Screenshot from 2024-08-28 13-56-44.png` |

Wave 0 conclusion:

- The current engine checks are green.
- The immediate build issue is bundle size, especially `three-vendor`.
- The immediate static cruft issue is public payload, especially reference screenshots and ML vendor blobs.
- The safest first cleanup batch is classification, then relocation or manifesting, of `public/style-engine-ref`, `public/ref-image`, and `public/vendor/onnxruntime`.

### Wave 1 Progress: Public Asset Split

Applied on 2026-04-30:

- Moved `public/style-engine-ref` to `authoring/reference/style-engine-ref`.
- Moved `public/ref-image` to `authoring/workflows/ref-image`.
- Moved `public/vendor` to `authoring/vendor/runtime-ml`.
- Updated the editor Comfy workflow browser defaults to use `apps/game/authoring/workflows/ref-image`.

Current payload split:

| Path | Size | Notes |
| --- | ---: | --- |
| `public` | 44MB | Runtime-served game public payload after removing authoring/reference assets. |
| `public/audio` | 44MB | Still needs runtime/editor use classification. |
| `authoring` | 161MB | Preserved outside browser runtime public paths. |
| `authoring/reference/style-engine-ref` | 160MB | Reference screenshots/images; no source references found outside docs/inventory. |
| `authoring/workflows/ref-image` | 508KB | Editor workflow browser path; still used by Comfy workflow defaults. |

Deleted after follow-up review:

- Removed `authoring/vendor/runtime-ml`.
- Removed 3 ONNX Runtime files and 3 TFJS WASM files.
- No `apps/game` package dependency or source reference required those files.

Follow-up:

- Decide whether `authoring/reference/style-engine-ref` belongs in repo, external storage, or a smaller curated reference set.
- Classify `public/audio/ambient` by scene/editor usage and move unused tracks out of runtime public paths.

Public audio classification on 2026-04-30:

- Kept `public/CNAME` for the `game.megameal.org` deployment target.
- Kept all 10 `public/audio/ambient` tracks. They are referenced by runtime ambience, scene audio regions, editor level presets, or the editor ambient audio picker.
- Kept all 5 `public/audio/sfx` tracks. `packages/shared-audio/src/game-audio-profile.ts` maps game UI events to these files, and `src/threlte/systems/Audio.svelte` consumes that profile.
- No public audio files were deleted in this pass.

### Wave 1: Generated, Raw, And Static Assets

Focus:

- `public/audio/**`
- `authoring/reference/**`
- `authoring/vendor/**`
- `authoring/workflows/**`
- `performance-baselines.json`

Questions:

- Should this live under `apps/game/public` at all?
- Is it runtime-required, editor-reference-only, or authoring-only?
- Is it duplicated in `apps/megameal/public`?
- Does it need a manifest entry or a cooked output path?

Expected outputs:

- Public asset ownership map.
- Delete/move candidates.
- Runtime asset budget report.

### Wave 2: Scripts And Tooling

Focus:

- `scripts/*.mjs`
- `scripts/lib/*.mjs`
- `package.json`
- `astro.config.mjs`

Questions:

- Does each script still serve a real workflow?
- Are smoke/audit/performance scripts overlapping?
- Can cruft checks become build gates?
- Are scripts writing generated assets into the right location?

Expected outputs:

- Consolidated command map.
- Dead script list.
- Missing audit gates.

Code-level pass on 2026-04-30:

| Script | Status | Finding |
| --- | --- | --- |
| `scripts/dev-app.mjs` | Keep | Active dev bootstrap. It owns game server startup and stale Vite cache cleanup; editor APIs are now same-origin dev middleware. |
| `scripts/smoke-check.mjs` | Keep | Active build/path smoke used by `smoke:engine`; intentionally lightweight. |
| `scripts/boot-check.mjs` | Keep | Active CI wrapper for browser boot checks; delegates browser specifics to `boot-check-browser.mjs`. |
| `scripts/lib/authoringSceneSource.mjs` | Keep | Explicit authoring scene source adapter for deployed registry scene documents; validates authoring records before runtime cook/manifest consumers use them. |
| `scripts/lib/dependencyGraph.mjs` | Keep | Shared TypeScript-AST dependency graph scanner for TS/JS/Svelte script imports, re-exports, dynamic imports, and type-only imports. |
| `scripts/lib/levelRegistry.mjs` | Keep | Shared script helper now owns deployed scene level discovery from `level-registry.json`. |
| `scripts/lib/browserHarness.mjs` | Keep | Shared harness now owns deployed level discovery, playable readiness waits, render-actor assertions, and common console/request filters. |
| `scripts/lib/engineAuditSourceGuards.mjs` | Keep | Source-level architecture guard for retired APIs, duplicate legacy files, and default-camera ownership. |
| `scripts/lib/runtimeSceneAudit.mjs` | Keep | Cooked runtime scene manifest audit used by `audit-engine-architecture.mjs`. |
| `scripts/lib/runtimeAssetCookManifest.mjs` | Keep | Builds runtime asset and scene cook manifests from explicit authoring scene source records instead of reaching into editor scene files directly. |
| `scripts/lib/runtimeAssetVariantCooker.mjs` | Keep | Owns the `gltf-transform optimize` invocation for runtime quality-tier GLB variants. |
| `scripts/lib/terrainCollisionAudit.mjs` | Keep | Baked terrain collision, terrain chunk manifest, and legacy trimesh audit used by `audit-engine-architecture.mjs`. |
| `scripts/lib/terrainManifestDiscovery.mjs` | Keep | Shared terrain discovery helper maps deployed registry levels to terrain manifests without per-level script tables. |
| `scripts/lib/worldPartitionAudit.mjs` | Keep | Runtime world-partition manifest validation used by `audit-engine-architecture.mjs`. |
| `scripts/lib/sceneArchitectureAudit.mjs` | Keep | Authoring scene architecture validation for spawn, collision policy, runtime asset payload budgets, and visual actor budgets used by `audit-engine-architecture.mjs`. |
| `scripts/boot-check-browser.mjs` | Keep | Active CI check now derives deployed levels from `level-registry.json` and uses shared readiness/filter helpers. |
| `scripts/performance-baseline.mjs` | Keep | Active baseline runner now uses shared playable readiness and console filtering; level selection remains explicit in `performance-baselines.json`. |
| `scripts/profile-level-resources.mjs` | Keep | Useful profiler now defaults to deployed registry levels and uses shared playable readiness. |
| `scripts/profile-three-runtime.mjs` | Keep | Runtime/editor dependency profiler now uses the shared AST dependency graph scanner and distinguishes dynamic editor references from suspicious static boundary leaks. |
| `scripts/audit-engine-architecture.mjs` | Keep | Important gate now orchestrates focused audit modules and prints their reports; source/API guards, scene architecture, cooked runtime scene checks, terrain collision checks, and world-partition checks live in script library modules. |
| `scripts/cook-runtime-assets.mjs` | Keep | Runtime cook CLI now orchestrates option parsing, manifest summary, optional GLB variant cooking, output writes, and failure reporting. |
| `scripts/cook-terrain-chunks.mjs` | Keep | Active terrain visual chunk cooker. It discovers terrain manifests from registry levels and now supports `--dry-run` validation before rewriting chunk GLBs or terrain manifests. |
| `scripts/cook-world-partition.mjs` | Keep | Active runtime world-partition cooker. It resolves scene levels from the registry, emits explicit runtime partition manifests, lists valid levels on invalid input, and now supports `--dry-run`. |
| `scripts/bake-terrain-collision.mjs` | Keep | Important terrain collider baker now discovers deployed terrain manifests instead of carrying a per-level table. |
| `scripts/generate-terrain-heightmap.mjs` | Keep | Useful authoring tool now resolves levels through terrain manifest discovery instead of a two-level allowlist. |
| `scripts/editor-tools/aiRoutes.cjs` | Keep | Owns Hunyuan3D and ComfyUI editor API routes for local AI backend status, job queueing, workflow templates, and generation. |
| `scripts/editor-tools/aiRuntimeContext.cjs` | Keep | Owns editor AI backend state, Hunyuan/ComfyUI health and launch detection, job queueing, reference-image generation, and workflow construction. |
| `scripts/editor-tools/browseRoutes.cjs` | Keep | Owns the active editor file browser endpoint with repo/public/src path boundaries. |
| `scripts/editor-tools/sceneRoutes.cjs` | Keep | Owns scene load/save, level registry, editor log, and world-partition cook editor API routes. |
| `scripts/editor-tools/styleRoutes.cjs` | Keep | Owns style inspection, simplification, Blender handoff/reimport, style workspace, and source mesh staging editor API routes. |
| `scripts/editor-tools/styleRuntimeContext.cjs` | Keep | Owns style/Blender/glTF helper operations shared by style and AI editor routes. |
| `scripts/editor-tools/terrainRoutes.cjs` | Keep | Owns terrain heightmap, collision bake, and terrain chunk cook editor API routes. |
| `scripts/editor-tools/server.cjs` | Keep | Active same-origin editor API dispatcher. Retired endpoint reporting, route context assembly, JSON dispatch for queued jobs, CORS/options handling, and route-module wiring remain here. |

Script conclusions:

- No reviewed active script is currently dead; `scripts/dev-tools.mjs` was removed after editor APIs moved to same-origin game dev middleware.
- Deployed-level discovery has been centralized in `levelRegistry.mjs`; browser readiness logic and filters remain in `browserHarness.mjs`.
- Terrain discovery has been centralized in `terrainManifestDiscovery.mjs`; the remaining runtime asset script is registry-bound but still needs to move away from direct editor scene asset scanning.
- The architecture audit should be split into smaller checks so future gates can fail on one contract without growing a single monolithic script forever.

Editor terrain bake path hardened on 2026-04-30:

- The level editor already had terrain controls, but the editor API still resolved terrain manifests through a stale hard-coded map.
- The editor API now discovers existing terrain manifests by registry/manifest aliases and creates a starter terrain manifest when `Generate Heightmap From Selection` is used on a level without one.
- Terrain sculpt height overrides now save through shared `settings.level.terrainSculpt` instead of the old observatory-specific settings key.
- The editor terrain tools are available for baked-heightmap workflows and for selected mesh assets that can seed a new generated heightmap.

Editor tools cruft review started on 2026-04-30:

- Removed the separate port `3001` editor bridge from normal game dev. Editor APIs are served from the game dev server through same-origin `/api/*` middleware.
- Removed the `tools/legacy-megameal-tools/app.cjs` compatibility wrapper.
- Removed `scripts/dev-tools.mjs` and the `dev:tools` package script.
- Current editor callers use `/api/browse`, `/api/editor-scene/*`, `/api/editor-terrain/*`, `/api/level-registry`, `/api/editor/log`, `/api/hunyuan3d/*`, `/api/comfyui/*`, and `/api/style/*`.
- Retired routes now return `410`: `/api/project-file`, `/api/generate-heightmap`, `/api/analyze-glb`, `/api/process-level`, `/api/generate-level`, `/api/unified-pipeline`, `/api/levels/scan`, `/api/pure-level-stars`, `/api/starmap/data`, `/api/starmap/save`, `/api/save-level-config`, `/api/update-manifest`, `/api/convert-cubemap`, and `/api/get-level-manifests`.
- Removed the unreachable route implementations for those retired endpoints; only the active editor bridge routes and explicit retirement responses remain.
- `audit:engine` now fails if current `src/threlte` code references those retired tools endpoints.
- `pnpm dev` now starts through `dev:app`; `dev-app.mjs` no longer starts a separate tools process by default.
- `astro.config.mjs` installs the game-owned editor API middleware in dev, and `src/config/editorApi.ts` defaults to same-origin requests.
- Updated runtime diagnostics and editor error messages from "tools bridge" to "editor API".
- Split scene/registry/log/world-partition and terrain bake/chunk/heightmap routes out of the main editor API handler.
- Split AI runtime/backend context, style/Blender/glTF runtime helpers, and file browsing out of the main editor API handler.
- Editor tools domain split is complete for the active same-origin API handler.

Runtime/editor boundary scan started on 2026-04-30:

- Added `src/threlte/engine/sceneDocumentTypes.ts` as the neutral scene document contract for runtime and editor.
- `editor/editorTypes.ts` now re-exports scene document data contracts and keeps editor UI/session state local.
- Runtime and runtime-adjacent files now import scene document/material/collision body types from `engine/sceneDocumentTypes` instead of `editor/editorTypes`.
- `runtimeLevelSettings.ts` now treats `terrainSculpt` as shared level settings, matching the editor terrain sculpt save path.
- Added `src/threlte/engine/packagedSceneDocuments.ts` as the single packaged scene discovery contract. Runtime loading and registry validation no longer duplicate direct `editor/scenes` glob ownership.
- Removed the runtime-only `runtimeSceneDocumentUpgrade.ts` shim. Its current `sci-fi-room` planter transform was baked into the source scene document so runtime loading no longer patches one level at activation time.
- Added neutral `SceneDocument`, `SceneSettings`, `SceneNode`, and related shared scene contract aliases. Runtime modules now use the neutral names; editor aliases remain for editor-specific code until the editor architecture wave.
- Added `src/threlte/engine/runtimeSceneManifest.ts` and `scripts/lib/runtimeSceneManifest.mjs` for cooked runtime scene manifests. `cook:runtime-assets` now writes `apps/megameal/public/generated/runtime-game-assets/scenes/*.runtime-scene.json`, runtime loading prefers those manifests, and `audit:engine` fails deployed levels without cooked runtime scenes.
- Remaining boundary work: remove the packaged editor-scene fallback after cooked manifests are fully required in all dev/deploy paths, then eventually rename the underlying shared schema declarations away from `Editor*` names.

Universal collision workflow pass on 2026-04-30:

- Added shared `collision.workflow` settings for actor collision policy, collider budget, terrain sculpting, terrain auto-bake, and terrain visual chunk mode.
- Runtime collision workflow resolution now reads scene settings first and uses the legacy per-level table only as fallback.
- Default runtime actor collision is `lightweight-auto`, which produces cheap primitive colliders for visible geometry without authored collision; editor settings can switch this to `authored-only` or `none`.
- Collision policy keeps mobile GPUs as the default budget path by using primitive cuboid/cylinder defaults instead of automatic trimesh collision.
- The level editor scene tools now expose collision default mode and collision budget controls next to the existing terrain bake/chunk controls.

Editor asset/editor bake batch on 2026-05-01:

- Added `CRUFT_TODO.md` as the explicit checklist generated from the file inventory; current tracked total is 392 files.
- `EditorAssetPreview.svelte` is active editor UI used by the inspector, properties shelf, create panel, and AI mesh studio. It remains `keep`; the shared preview path now previews image `assetUrl` values directly and disposes stale async GLB preview clones.
- `EditorAtmospherePresetPicker.svelte` remains `keep`; it is a small reusable editor select component used by the environment panel with no runtime dependency.
- `editorAssetController.ts` remains `refactor`; it is active but still owns too many responsibilities: asset browsing, generated variant browsing, Hunyuan inspection, scene-node source staging, conversion, and merge-to-asset.
- `editorBakeSource.ts` remains `refactor`; it is active but mixes prefab source geometry definitions, material construction, asset loading, scene subtree assembly, and GLB export. The next cleanup should split prefab source construction from export orchestration.
- `EditorCircleSelectOverlay.svelte`, `EditorCollisionOverlay.svelte`, and `editorCommands.ts` remain `keep`; they are focused editor-only surfaces with clear store/command boundaries.
- `EditorControlsOverlay.svelte` remains `keep`; removed an observatory-specific terrain sculpting label from shared editor UI so level editing language is not tied to one level.
- `editorCreateController.ts`, `EditorCreatePanel.svelte`, and `EditorCreateTabHost.svelte` remain `keep`; they are active editor create surfaces. Hard-coded firefly defaults remain acceptable as prefab defaults, not level-specific runtime behavior.
- `editorDocumentStore.ts` remains `keep`; removed dead `updateObservatorySceneSettings` and `updateSolitudeSceneSettings` helpers now that shared `settings.level` is the active editor settings path.
- `EditorEnvironmentPanel.svelte` is now `refactor`; it is active, but level-specific branches for observatory, solitude, sci-fi-room, and miranda should become schema/manifest-driven environment sections instead of hard-coded editor UI.
- `editorGeneration.ts` is now `refactor`; it is active, but many Yggdrasil-specific node-id descriptor rules should move into scene-authored generation metadata or a level authoring manifest.
- `EditorEnvironmentTabHost.svelte` and `EditorHierarchyPanel.svelte` remain `keep`; they are focused pass-through/editor UI surfaces.
- `EditorHierarchyTabHost.svelte` and `editorHistory.ts` remain `keep`; the first is a focused pass-through host and the second is a generic document history helper.
- `EditorInspectorForm.svelte` and `editorInspectorController.ts` are now `refactor`; they are active, but asset browser roots and workspace path candidates should be injected from the editor asset/workspace configuration instead of hard-coded in inspector UI/controller code.
- `EditorMarqueeOverlay.svelte` remains `keep`; added the missing store unsubscribe on destroy.
- `editorLevelController.ts` remains `keep`; it owns level registry persistence, save-as, new-level creation, and scene JSON import/export through the active same-origin editor API.
- `EditorInspectTabHost.svelte` is now `refactor`; it mirrors inspector typing debt with broad `any` callback field types.
- `editorLevelPresets.ts` is now `refactor`; active atmosphere/audio presets should eventually be authored data or manifest-backed presets instead of level-specific TypeScript constants.
- `editorNodeCommands.ts` remains `keep`; removed duplicate descendant traversal and now uses the shared hierarchy helper.
- `EditorNodeGizmos.svelte` and `EditorNodePhysicsBody.svelte` remain `keep`; they are focused editor node overlays/collision wrappers.
- `EditorNodeRenderContent.svelte` is now `refactor`; it is active, but Solitude-specific material overrides by node id should move into scene-authored material metadata or an authored level style manifest.
- `EditorOutliner.svelte`, `EditorOutlinerDock.svelte`, `editorOutliner.ts`, `editorOutlinerController.ts`, and `editorOutlinerTypes.ts` remain `keep`; the cluster is large but cohesive and editor-only, with active wiring from the main editor panel and side stack.
- `EditorPanelHeader.svelte`, `EditorPanelTabRail.svelte`, `editorPanelTabs.ts`, and `EditorPanelToolsDock.svelte` remain `keep`; removed a dead `display:flex` declaration from the tools dock style where the same rule already uses grid layout.
- `editorPersistence.ts`, `EditorPlayerPanel.svelte`, `EditorPlayerTabHost.svelte`, and `editorPrefabFactory.ts` remain `keep`; the player editor is shared level settings, persistence validates scene documents, and the prefab factory is active.
- Removed Solitude-specific default dialogue text from the firefly prefab factory so new levels get neutral authoring placeholders.
- `EditorPropertiesDock.svelte` and `EditorPropertiesShelf.svelte` are now `refactor`; they are active, but overlap heavily with the inspector form and should share typed field/editor-section definitions instead of maintaining parallel edit surfaces.
- `editorRegistry.ts`, `EditorSavePanel.svelte`, and `EditorSaveTabHost.svelte` remain `keep`; they are focused editor object registration and scene persistence UI.
- `EditorSceneBranch.svelte`, `EditorSceneLayer.svelte`, and `editorSceneCommands.ts` remain `keep`; they are focused recursive scene rendering/loading and scene-settings command helpers.
- `EditorSceneNode.svelte` is now `refactor`; it has Yggdrasil-specific persistent runtime culling exceptions that should move into scene metadata or runtime budget policy.
- `EditorSideStackHost.svelte` is now `refactor`; it mirrors the properties shelf's broad edit-surface props and should share typed section definitions with inspector/properties.
- `editorSelectors.ts` is now `refactor`; observatory/solitude-specific derived settings should eventually collapse behind level-generic selectors as environment editing becomes schema-driven.
- `editorSessionStore.ts` and `editorStore.ts` remain `keep`; they own editor UI/session state and the editor public barrel.
- `EditorStyleStudio.svelte` and `EditorStyleTabHost.svelte` are now `refactor`; the style tab is active but still has broad `any` contracts and inline UI styling that should move into typed editor contracts/shared CSS.
- Fixed the Style Studio loading text mojibake.
- `EditorViewportControls.svelte` is now `refactor`; it is active but monolithic and should split modal transform, marquee/circle select, hotkeys, and surface snap into smaller controllers.
- `EditorWorkbenchLighting.svelte` remains `keep`; it is a focused editor-only workbench lighting overlay.

### Wave 3: Runtime Engine Contracts

Focus:

- `src/threlte/engine/**`
- `src/threlte/levels/**`
- `src/threlte/core/**`
- `src/threlte/collision/**`

Questions:

- Are runtime contracts independent from editor implementation?
- Are manifests validated before player activation?
- Are spawn, collision, required assets, and readiness explicit?
- Are runtime actors free of editor-only imports?

Expected outputs:

- Runtime/editor import boundary report.
- Manifest validation gaps.
- Level readiness contract TODOs.

Runtime engine source batch on 2026-05-01:

- Reviewed `src/threlte/engine/**` runtime contracts and classified the remaining engine files.
- `actorHierarchy.ts` now delegates actor world-matrix resolution to the shared hierarchy transform resolver instead of carrying duplicate matrix/cache logic.
- `levelAssetPreloader.ts` no longer imports the performance feature store directly; timing is injected by `SceneDocumentLevel.svelte`, keeping the engine layer neutral.
- `runtimeWorldPartition.ts` now validates fetched partition manifests for schema version, level id, cell sizing, actor arrays, cell shape, and resident/streamable overlap before runtime streaming uses them.
- Import scan found no engine dependency on editor modules except `packagedSceneDocuments.ts`, which remains the deliberate packaged-scene fallback adapter until cooked runtime scene manifests fully replace that path.

Runtime levels source batch on 2026-05-01:

- Reviewed `src/threlte/levels/**` at code level and classified the remaining level runtime files.
- `RuntimeGameplayRenderer.svelte` no longer owns firefly tuning and legacy per-level presentation exceptions directly. Firefly presentation resolution now lives in `runtimeGameplayPresentation.ts`, so the renderer is focused on rendering, interaction dispatch, and animation state.
- `RuntimePrefabNode.svelte` remains marked `refactor`: it is an active runtime/editor preview component, but it embeds a procedural prefab catalog in Svelte markup. The next cleanup should move prefab definitions toward data-driven prefab manifests or reusable prefab primitives so new levels do not require adding more branches to this component.
- `RuntimeActorBranch.svelte`, `runtimeActorCollision.ts`, `RuntimeActorNode.svelte`, `RuntimeActorRenderContent.svelte`, `SceneLighting.svelte`, and `level-registry.json` are active runtime files and remain in the correct boundary after this pass.

Runtime core and collision source batch on 2026-05-01:

- Reviewed `src/threlte/core/**` and `src/threlte/collision/**` at code level and classified the files.
- `SystemRegistry` now owns component ticking through `updateComponents(deltaTime)` instead of forcing `LevelManager.svelte` to reach into its private component map.
- `SystemRegistry.dispose()` now cancels the queued message `requestAnimationFrame`, preventing disposed level registries from keeping a stale browser loop alive after level teardown.
- Critical registry messages are processed immediately without remaining queued for a second delivery on the next frame.
- Duplicate component registration now unregisters the previous component for that id before adding the replacement, keeping `componentsByType` from accumulating stale entries.
- `ECSIntegration.ts` no longer keeps an unused `SystemRegistry` reference or the disabled light-cycling system block.
- `AssetTrimeshCollider.svelte` remains marked `refactor`: it is active as a compatibility path, but runtime collision should continue moving toward baked collision assets/manifests instead of deriving trimesh colliders from visible render assets in the browser.

Editor architecture source batch on 2026-05-01:

- Started Wave 4 with the editor scene document and bake boundary files.
- Moved primitive geometry construction into `src/threlte/engine/primitiveGeometry.ts`. Collision helpers and editor bake export now use the same engine-level geometry helper instead of maintaining separate switch statements.
- Removed `src/threlte/collision/primitiveGeometry.ts`; primitive geometry is not collision-owned anymore.
- `editorBakeSource.ts` remains marked `refactor`: it is active, but it still combines scene traversal, material construction, prefab asset lookup, GLTF loading/export, and bake source assembly in one large module.
- `editorDocumentStore.ts`, `editorHierarchyUtils.ts`, `editorSceneDocumentLoader.ts`, and `editorSceneDocumentValidation.ts` are active editor architecture files and remain in the correct boundary after this pass.

Editor controller source batch on 2026-05-01:

- Started the controller split pass with `editorAssetController.ts`.
- Added `editorWorkspaceBrowser.ts` for editor API workspace browsing, directory-first sorting, public URL resolution, and common workspace entry filters.
- `editorAssetController.ts` now delegates generic browse/public-path behavior to `editorWorkspaceBrowser.ts`, reducing controller responsibility to asset-selection workflows, generated variants, source-asset staging, and scene mutations.
- `editorAssetController.ts` remains marked `refactor`: it is active, but it still owns generated variant state, Hunyuan inspection, source-asset staging, convert-to-mesh, and merge-to-asset workflows in one module.

Editor AI API batch on 2026-05-01:

- Added `editorHunyuanApi.ts` for Hunyuan/ComfyUI status, recent job listing, job queueing, job status, and cancel endpoints.
- `editorAiController.ts` now delegates Hunyuan and ComfyUI transport calls to the API helper while retaining workflow state, diagnostics, and scene mutation behavior.
- `editorStyleController.ts` now uses the shared cancel helper for pause/cancel batch workflows instead of duplicating the cancel POST.
- `editorAiController.ts` and `editorStyleController.ts` remain marked `refactor`: both are active, but they still mix UI workflow state, long-running job orchestration, and scene mutation. The next split should isolate reusable job polling/status transitions from controller-specific status messages.

Editor AI job polling batch on 2026-05-01:

- Added `editorHunyuanJobPolling.ts` for reusable queued/running/succeeded/failed polling behavior and common Hunyuan status messages.
- `editorAiController.ts` now keeps editor diagnostics and backend state updates, while the polling loop and terminal job result validation live in the helper.
- This moves the AI controller closer to workflow orchestration only; the remaining refactor target is separating scene mutation/application logic from generation job orchestration.

Generated asset application batch on 2026-05-01:

- Added `editorGeneratedAssetApplication.ts` for generated asset node creation, replacement fit-plan capture, replacement patch assembly, scene saving, and transform-preservation logging.
- Renamed the helper away from AI-specific ownership because style batches and AI replacement both apply generated runtime assets to the editor scene document.
- `editorAiController.ts` now delegates scene document mutations for AI-generated assets to the helper and keeps Hunyuan orchestration/status handling in the controller.
- `editorStyleController.ts` now uses the same generated-asset application path for style batch entries instead of duplicating node patch, scale-fit, generation metadata, and transform logging logic.
- `editorAiController.ts` remains marked `refactor`: it is still active and smaller, but it still combines service readiness, workflow template opening, job history, and the three Hunyuan entrypoints.

Editor style batch session batch on 2026-05-01:

- Added `editorStyleBatchSession.ts` for creating, persisting, updating, clearing, and resume-normalizing style batch sessions.
- `editorStyleController.ts` now delegates persisted batch-session mechanics to the helper while retaining active batch execution, workspace packaging, fitting, and scene application.
- `editorStyleController.ts` remains marked `refactor`: it is active and still owns the long-running batch loop plus workspace packaging, which should be split next.

Editor style API batch on 2026-05-01:

- Added `editorStyleApi.ts` for style inspect, latest workspace lookup, workspace packaging, simplification, Blender export, and Blender reimport transport calls.
- `editorStyleController.ts` now keeps style workflow state and orchestration while endpoint construction and JSON request wiring live in the API helper.
- Moved generated-asset fit math into `editorGeneratedAssetApplication.ts`; `editorStyleController.ts` still owns style-specific visual-bounds inspection, but generated asset application now owns scale fit and fallback reporting.
- Consolidated repeated style batch entry/status persistence into local controller helpers and isolated per-entry job queueing inside `queueStyleBatchEntryJob`.
- Consolidated style batch completion, checkpointed pause/cancel status, and active-job failure marking into named local outcomes.
- The remaining `editorStyleController.ts` cruft is mostly local visual-bounds inspection helpers and mixed single-selection style workflow commands.

Editor default scene cleanup on 2026-05-01:

- Removed the obsolete hand-authored fallback level builders from `defaultScenes.ts`.
- `createDefaultSceneForLevel` now uses packaged scene JSON as the level-content source of truth and returns an empty scene only for unknown/new level ids.
- Kept the existing legacy sci-fi planter normalization and missing-node repair path for old saved editor documents.

Editor AI UI audit on 2026-05-01:

- Classified `editor-ui.css` as shared editor style surface; no CSS changes were made.
- Classified `EditorAIMeshStudio.svelte`, `EditorAiTabHost.svelte`, and `EditorAmbientAudioPresetControls.svelte` as active UI components.
- Fixed a text encoding artifact in the AI mesh lazy-loading fallback.

### Wave 4: Editor Architecture

Focus:

- `src/threlte/editor/**`

Questions:

- Which files are actual editor UI vs state/controllers/schema?
- Which controllers are too broad?
- Which scene backups are source control noise vs needed recovery data?
- Are editor defaults, packaged scenes, and runtime scene contracts separated?

Expected outputs:

- Editor module map.
- Controller split plan.
- Scene backup retention decision.

### Wave 5: Gameplay Features

Focus:

- `src/threlte/features/**`
- `src/threlte/components/**`
- `src/threlte/systems/**`

Questions:

- Is the feature runtime-ready and manifest-driven?
- Does it duplicate another system/component?
- Does it import editor types or editor helpers?
- Does it load heavy assets or Three examples unnecessarily?

Expected outputs:

- Feature ownership map.
- Runtime bundle reduction targets.
- Feature-specific deletion/refactor candidates.

### Wave 6: UI, Stores, Services, Config

Focus:

- `src/threlte/ui/**`
- `src/threlte/stores/**`
- `src/services/**`
- `src/config/**`
- `src/utils/**`

Questions:

- Is this game UI, Megameal carryover, or dead timeline/site code?
- Are stores scoped correctly?
- Are services still used by the current game path?

Expected outputs:

- Dead site/timeline carryover list.
- Store ownership map.
- UI duplication list.

## Batch Size

Use small batches:

- 5-15 related source files, or
- one feature directory, or
- one public asset class.

Each batch should end with:

- changed files
- deleted/moved files
- checks run
- payload/collision/required-assets impact
- remaining risks

## Starting Point

Start with non-runtime-risk inventory work:

1. Done: moved `public/style-engine-ref`, `public/ref-image`, and `public/vendor` out of runtime public paths.
2. Done: classified remaining `public` assets; current runtime public payload is intentional audio plus `CNAME`.
3. Done: classified all current scripts at file level and recorded code-level script refactor targets.
4. Done: merged duplicate smoke/profile/playable browser logic into shared script helpers.
5. Done: made terrain scripts manifest-discovered and made runtime asset cooking start from deployed registry levels.
6. Done: completed the first runtime/editor boundary scan and moved shared scene document contracts into runtime-neutral engine modules.
7. Done: split the engine architecture audit into focused source guard, scene architecture, runtime scene, terrain collision, and world-partition modules.
8. Done: reduced `scripts/editor-tools/server.cjs` to same-origin editor API dispatch, retired endpoint reporting, route context assembly, JSON job dispatch, and route-module wiring.
9. Done: classified `scripts/cook-terrain-chunks.mjs` and `scripts/cook-world-partition.mjs`; both now support dry-run validation for editor/build workflows.
10. Done: completed the first runtime engine source batch and hardened hierarchy, asset-preload timing, and world-partition validation contracts.
11. Done: completed the runtime levels source batch and isolated gameplay presentation tuning from the renderer.
12. Done: completed the runtime core/collision batch, including registry lifecycle cleanup and collision file classification.
13. Done: started Wave 4 editor architecture and moved primitive geometry construction into the neutral engine layer.
14. Done: continued Wave 4 with the asset controller split and extracted shared editor workspace browsing.
15. Done: extracted shared Hunyuan/ComfyUI editor API transport helpers.
16. Done: extracted reusable Hunyuan job polling/status transitions.
17. Done: extracted generated asset scene application helpers out of `editorAiController.ts` and reused them from style batch application.
18. Done: split `editorStyleController.ts` persisted batch-session state into a helper.
19. Done: isolated style API transport calls out of `editorStyleController.ts`.
20. Done: moved shared generated-asset fit math into the generated asset application contract.
21. Done: reduced repeated style batch node-status/session-entry mutation and isolated per-entry job queueing.
22. Done: reduced style batch stop/error handling into explicit local completion, pause, cancel, and failure paths.
23. Done: removed obsolete hand-authored fallback level builders from `defaultScenes.ts`; packaged scene JSON is now the editor default source of truth.
24. Done: classified the shared editor CSS and first AI UI component batch.
25. Done: continued the editor component audit through workflow UI, scene sources, and scene backups. Workflow UI now uses the existing Hunyuan job contract instead of opaque `any`; production `editor/scenes/*.scene.json` stays as active level source; historical `scene-backups/yggdrasil/*.json` is classified `move` because it is recovery data, not runtime/editor source.
26. Done: reviewed top-level game config/docs and the first config/service batch. Removed unused game-local timeline service carryover (`src/services/TimelineConfig.ts`, `src/services/TimelineService.ts`, `src/services/TimelineService.client.ts`, and `src/threlte/services/TimelineDataService.ts`) because current gameplay feeds star data from the generated shared manifest instead.
27. Done: reviewed the runtime shell and first component batch. Removed orphaned component cruft: `HybridFireflyComponent.svelte`, `NaturePackVegetation.svelte` (a Blender Python script with a Svelte extension), `StaticEnvironment.svelte`, and `VegetationSystem.svelte`; updated stale comments to point at the current scene-authored firefly path.
28. Done: reviewed the active conversation feature. Kept the feature because runtime firefly dialogue lazy-loads it, but replaced the hardcoded character registry list with `import.meta.glob` discovery so new character definition files become build-visible automatically. Conversation UI/manager/store surfaces remain in the refactor queue due size, compatibility wrappers, and local AI endpoint assumptions.
29. Done: reviewed lighting and multiplayer. Removed the orphan `FireflyLightingSystem`/`SpatialGrid` path left behind by the retired ECS firefly component. Multiplayer remains active, but internal imports now use direct modules instead of the feature barrel to avoid self-cycles.
30. Done: reviewed ocean, performance, player, and terrain. Removed the unused legacy `Terrain.svelte` wrapper so terrain runtime enters through `TerrainRuntime.svelte` and manifest data. Large active components (`OceanComponent.svelte`, `Player.svelte`, mobile controls, performance panel/manager) remain in the refactor queue due size and mixed responsibilities.
31. Done: completed the remaining file-level source audit through stores, systems, UI, and utils. Removed unused `src/utils/content-utils.ts`, `src/threlte/tests/validate-performance.ts`, and `src/threlte/utils/proceduralTextures.ts`; cleaned legacy CDN/DOM card helpers out of `starUtils.ts`. The inventory now has explicit dispositions for every tracked file.
32. Done: externalized Yggdrasil scene backup snapshots from `src/threlte/editor/scene-backups` into `authoring/scene-backups/yggdrasil` and updated the editor scene load route to read snapshots from the authoring backup root while production scenes remain constrained to `src/threlte/editor/scenes`.
33. Done: closed the remaining move queue by confirming authoring reference images already live outside runtime paths, regenerating the full cruft todo, and reducing the refactor queue with timeline, style, settings, multiplayer, and performance cleanup. The host room UI now has an in-app `/host` route on the same game app, the multiplayer service has typed event/message contracts, stale render-style localStorage state is removed, `StylePalettes.ts` is reduced to its active preset type, and the performance quality settings contract no longer exposes unused component overrides.
34. Next: continue the remaining refactor queue, prioritizing high-risk runtime files (`Game.svelte`, `Player.svelte`, `Audio.svelte`, `EventBus.svelte`, `InteractionSystem.svelte`, `StarMap.svelte`) before returning to large editor and conversation surfaces.
