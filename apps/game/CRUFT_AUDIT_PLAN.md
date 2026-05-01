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
| Root/config/docs | 11 |
| `authoring` | 54 |
| `public` | 16 |
| `scripts` | 15 |
| `src` | 265 |
| Total | 361 |

The file checklist lives in `CRUFT_FILE_INVENTORY.md`.

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
| `scripts/dev-app.mjs` | Keep | Active dev bootstrap. It owns game server startup, tools bridge startup, and stale Vite cache cleanup. |
| `scripts/dev-tools.mjs` | Keep | Active tools bridge bootstrap. It correctly reuses a healthy existing bridge. |
| `scripts/smoke-check.mjs` | Keep | Active build/path smoke used by `smoke:engine`; intentionally lightweight. |
| `scripts/boot-check.mjs` | Keep | Active CI wrapper for browser boot checks; delegates browser specifics to `boot-check-browser.mjs`. |
| `scripts/lib/levelRegistry.mjs` | Keep | Shared script helper now owns deployed scene level discovery from `level-registry.json`. |
| `scripts/lib/browserHarness.mjs` | Keep | Shared harness now owns deployed level discovery, playable readiness waits, render-actor assertions, and common console/request filters. |
| `scripts/lib/terrainManifestDiscovery.mjs` | Keep | Shared terrain discovery helper maps deployed registry levels to terrain manifests without per-level script tables. |
| `scripts/boot-check-browser.mjs` | Keep | Active CI check now derives deployed levels from `level-registry.json` and uses shared readiness/filter helpers. |
| `scripts/performance-baseline.mjs` | Keep | Active baseline runner now uses shared playable readiness and console filtering; level selection remains explicit in `performance-baselines.json`. |
| `scripts/profile-level-resources.mjs` | Keep | Useful profiler now defaults to deployed registry levels and uses shared playable readiness. |
| `scripts/profile-three-runtime.mjs` | Refactor | Useful boundary scanner, but import parsing is regex/static-import-only and should become a proper dependency audit. |
| `scripts/audit-engine-architecture.mjs` | Refactor | Important gate, but it is a large monolith with hard-coded visual-only actor exceptions, terrain manifest names, and source checks. |
| `scripts/cook-runtime-assets.mjs` | Refactor | Important cook/manifest script now starts from deployed registry levels instead of all scene files, but still reads scene JSON for asset discovery and writes runtime cooked outputs into `apps/megameal/public`. |
| `scripts/bake-terrain-collision.mjs` | Keep | Important terrain collider baker now discovers deployed terrain manifests instead of carrying a per-level table. |
| `scripts/generate-terrain-heightmap.mjs` | Keep | Useful authoring tool now resolves levels through terrain manifest discovery instead of a two-level allowlist. |

Script conclusions:

- No script is currently dead.
- Deployed-level discovery has been centralized in `levelRegistry.mjs`; browser readiness logic and filters remain in `browserHarness.mjs`.
- Terrain discovery has been centralized in `terrainManifestDiscovery.mjs`; the remaining runtime asset script is registry-bound but still needs to move away from direct editor scene asset scanning.
- The architecture audit should be split into smaller checks so future gates can fail on one contract without growing a single monolithic script forever.

Editor terrain bake path hardened on 2026-04-30:

- The level editor already had terrain controls, but the tools bridge still resolved terrain manifests through a stale hard-coded map.
- The tools bridge now discovers existing terrain manifests by registry/manifest aliases and creates a starter terrain manifest when `Generate Heightmap From Selection` is used on a level without one.
- Terrain sculpt height overrides now save through shared `settings.level.terrainSculpt` instead of the old observatory-specific settings key.
- The editor terrain tools are available for baked-heightmap workflows and for selected mesh assets that can seed a new generated heightmap.

Runtime/editor boundary scan started on 2026-04-30:

- Added `src/threlte/engine/sceneDocumentTypes.ts` as the neutral scene document contract for runtime and editor.
- `editor/editorTypes.ts` now re-exports scene document data contracts and keeps editor UI/session state local.
- Runtime and runtime-adjacent files now import scene document/material/collision body types from `engine/sceneDocumentTypes` instead of `editor/editorTypes`.
- `runtimeLevelSettings.ts` now treats `terrainSculpt` as shared level settings, matching the editor terrain sculpt save path.
- Remaining boundary work: retire the remaining editor-scene JSON import assumptions in runtime loaders.

Universal collision workflow pass on 2026-04-30:

- Added shared `collision.workflow` settings for actor collision policy, collider budget, terrain sculpting, terrain auto-bake, and terrain visual chunk mode.
- Runtime collision workflow resolution now reads scene settings first and uses the legacy per-level table only as fallback.
- Default runtime actor collision is `lightweight-auto`, which produces cheap primitive colliders for visible geometry without authored collision; editor settings can switch this to `authored-only` or `none`.
- Collision policy keeps mobile GPUs as the default budget path by using primitive cuboid/cylinder defaults instead of automatic trimesh collision.
- The level editor scene tools now expose collision default mode and collision budget controls next to the existing terrain bake/chunk controls.

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
6. Next: runtime/editor boundary scan; remove imports from runtime files into editor modules where possible.
