# AAA Graphics Runtime Refactor Tracker

This is the front-door progress tracker for the game graphics/runtime refactor. Keep this file current when changing the engine pipeline, level runtime, level editor, runtime assets, or cleanup state.

Last updated: 2026-05-11

## Current State

The gameplay runtime now loads cooked runtime scene manifests only. Runtime level loading no longer falls back to packaged editor scene data.

Current verification baseline from the latest audit pass:

- `pnpm --dir apps/game report:graphics-backlog`: passing; reports `lodTargetMisses=0`, `missingRecommendedSlots=289`, `unapprovedRecommendedSlots=0`.
- `pnpm --dir apps/game check:generated-drift`: passing.
- `pnpm --dir apps/game audit:engine`: passing.
- `pnpm --dir apps/game release:gate:ci`: passing; includes lint, type-check, generated drift, runtime purity, runtime asset audit, runtime prefab audit, engine audit, and build smoke.
- `GAME_DEV_PORT=4341 pnpm --dir apps/game certify:performance -- --skip-build --level=miranda --profile=desktop-high-chromium-1080p`: Miranda desktop-high vertical-slice reporting capture; passing production thresholds.
- `GAME_DEV_PORT=4342 pnpm --dir apps/game certify:performance:strict -- --level=miranda --profile=desktop-high-chromium-1080p`: Miranda desktop-high strict gate; passing production thresholds for the current vertical slice.
- `pnpm --dir apps/game certify:performance:all-levels`: reporting-only certification coverage for `miranda`, `observatory`, `sci-fi-room`, `solitude`, and `yggdrasil` across the configured mobile-low and desktop-high certification profiles.

Current generated content backlog:

- `lodTargetMisses=0`
- `missingRecommendedSlots=289`
- `unapprovedRecommendedSlots=0`

## Source Of Truth Files

- `ENGINE_ARCHITECTURE.md`: target architecture and current migration priorities.
- `ENGINE_MIGRATION_CHECKLIST.md`: phase-level engine migration checklist.
- `CRUFT_TODO.md`: file-level disposition and refactor queue.
- `AAA_TARGET_*.md`: active next-stage work targets.
- `AAA_GRAPHICS_CONTENT_BACKLOG.md`: generated source-art backlog from the cooked runtime asset manifest.
- `docs/archive/aaa/`: historical coordination docs only; do not treat archived docs as current instructions unless a live target explicitly references them.
- `apps/megameal/public/generated/runtime-game-assets/manifest.json`: cooked runtime asset manifest.
- `apps/megameal/public/generated/runtime-game-assets/prefabs/manifest.json`: baked runtime prefab manifest.
- `apps/megameal/public/generated/runtime-game-assets/scenes/*.runtime-scene.json`: cooked runtime level manifests consumed by gameplay.

## Active Target Docs

- `AAA_TARGET_01_STRICT_PERFORMANCE_CERTIFICATION.md`
- `AAA_TARGET_02_RUNTIME_MODULE_CLEANUP.md`
- `AAA_TARGET_03_PBR_CONTENT_BACKLOG_CLOSURE.md`
- `AAA_TARGET_04_EDITOR_PRODUCTION_UX.md`
- `AAA_TARGET_05_WORKTREE_DOC_SPRAWL_CONSOLIDATION.md`
- `AAA_TARGET_06_BROWSER_CHUNK_BUDGET_REDUCTION.md`

## Progress Board

| Area | Status | Notes |
| --- | --- | --- |
| Runtime scene loading | Done | Gameplay requires cooked runtime scene manifests and `LevelDefinition` data. |
| Editor/runtime scene fallback removal | Done | Removed packaged runtime fallback; editor scene JSON remains authoring/default data only. |
| Terrain runtime boundary | Done | Terrain routes through `TerrainRuntime` and baked terrain manifests. |
| Collision authoring | In progress | Explicit collision intent/channel exists; asset trimesh collision now supports authored `colliderUrl`. |
| Runtime asset cooking | In progress | LOD, impostor, prefab bake, streaming, platform profile, and provenance plumbing exists. Remaining misses are content backlog. |
| Runtime/editor cruft cleanup | In progress | See `CRUFT_TODO.md` refactor queue. |
| `Game.svelte` app shell cleanup | In progress | Runtime diagnostics, dynamic feature loading, URL/mobile bootstrap decisions, selected-star/level-return UI adapters, and shell overlay rendering moved out of `Game.svelte`. |
| Runtime chunk boundaries | Done | Manual chunk ownership now lives in `scripts/lib/chunkOwnership.mjs`; `audit:engine` includes `audit:chunks` to catch static chunk cycles and critical ownership drift. |
| Prefab/data manifest split | Done | Public resolver/type contract, procedural family modules, editor/runtime shared resolver, static/variant prefab GLB baking, audited animation contracts, and VFX descriptors are in place. Runtime prefab audit reports zero procedural contracts. |
| AAA authored material pass | In progress | Authored PBR slices reduced approved fallback slots from `443` to `289`; generated assets still rely on approved fallback material slots. |
| Performance certification | Strict slice passing, all-level reporting-only | Miranda desktop-high is the hard strict target exposed through `certify:performance:strict` and currently passes production thresholds. All five migrated levels remain visible through `certify:performance:all-levels` and `profile:resources:all-levels` as reporting-only coverage until repeated preview captures meet production thresholds. |
| Worktree sprawl closeout | Classified, not clean | Current dirty state is grouped in `CRUFT_FILE_INVENTORY.md` and `CRUFT_TODO.md`. No status-count-reducing deletion set was proven safe; generated runtime/source assets and unrelated Megameal content remain intentionally dirty until their owning workstreams commit or delegate them. |
| Worktree doc sprawl | Archived | Superseded top-level `AAA_AUDIT_FIX_*`, `AAA_REVIEW_FIX_*`, `AAA_NEXT_*`, `AAA_REMAINING_*`, `AAA_WEB_ENGINE_*`, `AAA_GAP_*`, integration, and parallel coordination docs were moved to `docs/archive/aaa/`. Active work now starts from `AAA_TARGET_*.md`, this tracker, and the generated content backlog. |

## Active Refactor Queue

1. Make `src/threlte/Game.svelte` an app shell only.
2. Continue editor cleanup from `CRUFT_TODO.md`: inspector/properties overlap, environment hard-coded level branches, and style studio typing.
3. Continue the authored PBR material pass for generated assets with the largest missing-slot counts.

## Refactor Log

### 2026-05-10

- Started the prefab/data manifest split by moving runtime prefab type definitions, asset URL lookup, variant color rules, and procedural mesh descriptor construction out of `RuntimePrefabNode.svelte` and into `src/threlte/engine/runtimePrefabCatalog.ts`, backed by `runtimePrefabCatalog.json`.
- Added an `audit:engine` gate that fails if authored scene prefab nodes reference unregistered runtime prefab types.
- Replaced the duplicated procedural prefab builder in `editorBakeSource.ts` with a catalog-backed bake builder so runtime rendering and editor export use the same prefab descriptors.
- Split runtime prefab contracts into `runtimePrefabTypes.ts`, kept asset/type lookup in the small public `runtimePrefabCatalog.ts`, and isolated generated procedural mesh descriptors in `runtimePrefabProceduralMeshes.ts`.
- Split procedural prefab mesh descriptors into family modules (`runtimePrefabAnomalyMeshes.ts`, `runtimePrefabTechMeshes.ts`, `runtimePrefabCourtyardMeshes.ts`, `runtimePrefabGrowthMeshes.ts`, and `runtimePrefabWastelandMeshes.ts`) with a shared mesh descriptor factory.
- Removed `RuntimeGameplayRenderer.svelte`'s dynamic import of the broad conversation feature barrel and corrected the manual chunk contract so shared conversation state is bundled with the world runtime while the dialog UI stays lazy-loaded.
- Extracted Rollup manual chunk ownership from `astro.config.mjs` into `scripts/lib/chunkOwnership.mjs`, added `audit:chunks`, and wired that audit into `audit:engine` so static chunk cycles and critical runtime/editor ownership drift fail intentionally.
- Extracted room-join, error, and debug overlay rendering out of `Game.svelte` and into `src/threlte/ui/RoomJoinOverlay.svelte`, `src/threlte/ui/GameErrorOverlay.svelte`, and `src/threlte/ui/GameDebugPanel.svelte`.
- Extracted level note and level-return modal rendering out of `Game.svelte` and into `src/threlte/ui/LevelNoteOverlay.svelte` and `src/threlte/ui/LevelReturnDialog.svelte`, removing the local overlay style block from the app shell.
- Moved selected-star extraction, timeline-card event adaptation, and level-return dialog defaults out of `Game.svelte` and into `src/threlte/core/gameShellUiState.ts`.
- Added `bake-runtime-prefabs.mjs`, which bakes static and variant procedural-prefab descriptors into generated GLB assets under `apps/megameal/public/generated/runtime-game-assets/prefabs`.
- Added a runtime prefab bake manifest, registered the baked prefab URLs in `runtimePrefabCatalog.json`, and wired `audit:engine` to fail if the baked prefab manifest/catalog/files drift.
- Updated runtime scene and asset cooking so prefab asset URLs are included in `runtimeAssetUrls`, asset budgets, impostor metadata, and readiness manifests instead of being hidden behind runtime procedural rendering.
- Batched the first baked prefab pass by material bucket (`43` source descriptor meshes -> `13` runtime GLB meshes, `93.3KB` total payload) and recalibrated the sci-fi-room material budget to the measured cooked manifest result.
- Added explicit procedural runtime contracts for animated prefab types, including migration targets, animation channels, and source-mesh/triangle budgets.
- Extended the runtime prefab audit so every registered prefab must have either a baked asset URL, a valid asset animation descriptor, or a valid procedural runtime contract.
- Migrated `story-marker` from live procedural runtime meshes to five baked color-variant GLBs plus a typed root animation descriptor; runtime prefab audits now report `prefabs=13`, `proceduralContracts=6`, `assetAnimations=1`, and `payload=502.5KB`.
- Updated scene asset cooking and editor source/export paths to resolve prefab variant asset URLs, then recalibrated Miranda, sci-fi-room, and Yggdrasil material/triangle budgets to the now-visible baked prefab accounting.
- Added animation-ready prefab baking for named source mesh parts and migrated `anomaly-cluster` to four baked variant GLBs plus a typed node animation descriptor; runtime prefab audits now report `prefabs=17`, `proceduralContracts=5`, `assetAnimations=2`, and `payload=623.1KB`.
- Recalibrated sci-fi-room draw-call/material budgets to account for anomaly-cluster assets now being included in runtime asset accounting.
- Migrated `bench-growth` from live procedural runtime meshes to a partially merged animation-ready GLB plus a typed node animation descriptor; runtime prefab audits now report `prefabs=18`, `proceduralContracts=4`, `assetAnimations=3`, and `payload=654.4KB`.
- Extended prefab bake auditing so node animation descriptors must target named source mesh parts present in the baked prefab manifest.
- Recalibrated Yggdrasil material budget to measured post-migration `99` after reducing the bench-growth bake from `11` to `6` mesh primitives; the remaining optimization target is an authored/skinned growth asset rather than a hidden runtime procedural path.
- Migrated `growth-planter` from live procedural runtime meshes to a generated animation-ready GLB with rim and spoke source meshes preserved plus an animated merged leaf-layer bucket; runtime prefab audits now report `prefabs=19`, `proceduralContracts=3`, `assetAnimations=4`, and `payload=694KB`.
- Batched `growth-planter` leaf layers into one animated merged mesh, migrated `courtyard-fountain` to a baked asset plus runtime VFX descriptor, and recalibrated sci-fi-room/Yggdrasil draw-call and material budgets to the cooked measurements; runtime prefab audits now report `prefabs=20`, `proceduralContracts=2`, `assetAnimations=4`, `assetVfx=1`, and `payload=785.6KB`.
- Migrated `command-console` and `portal-apparatus` from live procedural runtime meshes to generated animation-ready GLBs with typed VFX descriptors for screen, ring, and core loops; runtime prefab audits now report `prefabs=22`, `proceduralContracts=0`, `assetAnimations=4`, `assetVfx=3`, and `payload=1042.4KB`.
- Regenerated cooked runtime assets, scene manifests, prefab assets, impostor atlas data, and the AAA graphics content backlog; `audit:engine` reports `lodTargetMisses=0`, `missingRecommendedSlots=443`, and `unapprovedRecommendedSlots=0`.
- Recalibrated Miranda, sci-fi-room, and Yggdrasil draw-call/material/triangle budgets to the measured cooked prefab accounting after reducing console and portal mesh preservation.
- Added the first authored PBR material slice for weathered monolith pillars and Yggdrasil crown ascent assets, regenerated cooked runtime assets/content backlog, and reduced approved fallback material slots to `missingRecommendedSlots=355` with `unapprovedRecommendedSlots=0`.
- Verified the CI integrated gate with `pnpm --dir apps/game release:gate:ci`.
- Added performance/resource capture commands. Current performance certification is reporting-only: non-strict capture reports warnings, and strict desktop-high Miranda certification fails production thresholds, so performance certification remains in progress rather than complete.
- Replaced placeholder performance certification thresholds with production desktop-high budgets, added a guard against certified placeholder budgets, and moved scheduled CI to reporting-only Miranda telemetry until repeated preview captures meet strict certification. Latest preview captures do not certify Miranda (`avgFps=4`, `lowFps=1`, `avgFrame=596-788ms`, runtime quality `ultra_low`).
- Added explicit all-level certification coverage: Miranda remains the strict desktop-high vertical-slice target, while `miranda`, `observatory`, `sci-fi-room`, `solitude`, and `yggdrasil` are covered by reporting-only mobile-low and desktop-high browser profiles. Release-gate reports now document that strict performance certification is explicit but advisory until repeated captures meet the gate.
- Closed out the worktree-sprawl cleanup pass by classifying the current dirty state into active completion docs, historical coordination docs, active game source, generated runtime assets, source/generated authoring assets, ignored local reports, and unrelated Megameal content. No files were deleted because no status-count-reducing candidate was both clearly obsolete and safe across runtime/source-asset ownership.

### 2026-05-09

- Moved URL parsing, mobile detection, initial-level selection, and room-join message helpers out of `Game.svelte` and into `src/threlte/core/gameShellBootstrap.ts`.
- Moved dynamic runtime feature import/cache ownership out of `Game.svelte` and into `src/threlte/core/gameRuntimeFeatureLoader.ts`.
- Started `Game.svelte` app-shell cleanup by extracting runtime lifecycle diagnostics into `src/threlte/core/GameRuntimeDiagnostics.svelte`.
- Removed gameplay fallback to packaged editor scene data.
- Deleted runtime fallback/orphan modules:
  - `src/threlte/engine/packagedSceneDocuments.ts`
  - `src/threlte/engine/runtimeLevelSettings.ts`
- Updated `SceneDocumentLevel.svelte` to consume cooked `LevelDefinition` settings from runtime scene manifests.
- Updated architecture docs and migration checklist to mark runtime level loading through `LevelDefinition` complete.
- Verified gameplay, editor, and migrated levels through browser boot smoke on `GAME_DEV_PORT=4324`.

### Earlier 2026-05-09 Passes

- Added runtime asset manifest validation for cooked LOD variants, impostors, streaming policy, platform profiles, and content-build provenance.
- Added runtime production telemetry for FPS/frame time, renderer draw calls/triangles, Three memory, active streaming state, and GLTF cache byte counts.
- Added generated AAA graphics content backlog reporting from the cooked runtime asset manifest.
- Added `collision.colliderUrl` so authored asset-trimesh collision can use a collider asset instead of assuming render mesh ownership.

## Update Rules

When a refactor pass changes the game runtime, editor runtime pipeline, cooked assets, or cleanup state:

1. Update this tracker with the changed status and a dated log entry.
2. Update `CRUFT_TODO.md` when a file-level disposition changes.
3. Update `ENGINE_MIGRATION_CHECKLIST.md` when a phase item is completed.
4. Regenerate `AAA_GRAPHICS_CONTENT_BACKLOG.md` with `pnpm --dir apps/game report:graphics-backlog:write` after changing cooked runtime asset manifests.
5. Record verification commands in the final handoff.

## Definition Of Done For This Refactor

- Gameplay levels load only cooked runtime manifests.
- All deployed levels boot through one lifecycle and pass browser smoke.
- Runtime bundles do not carry unused legacy scene loading paths.
- Level editor saves the same actor/component contract that gameplay consumes after cooking.
- Ground, terrain, collision, streaming, and required assets are validated before playable state.
- Remaining "AAA quality" gaps are tracked as content backlog, not hidden as engine ambiguity.
