# Level Authoring Import Validation Plan

Status: implemented foundation; future cook/import generation remains planned.

## Purpose

The engine is ready for more levels only if authored content can be validated
without hand-maintained readiness arrays becoming the source of truth. This
plan defines the AAA-aligned content graph/import validation layer that sits
between authoring data and runtime scene manifests.

External reference model:

- Unreal Engine Data Validation validates assets through editor and command
  line/CI rules: <https://dev.epicgames.com/documentation/unreal-engine/data-validation-in-unreal-engine>
- Unreal Engine Asset Manager organizes loadable content through primary asset
  identifiers and managed dependencies: <https://dev.epicgames.com/documentation/unreal-engine/asset-management?application_version=4.27>
- Unity Asset Database tracks import dependencies and invalidates imported
  cache products when source or settings change: <https://docs.unity.cn/Manual/AssetDatabase.html>
- Unity Addressables Analyze checks asset layout and dependency issues before
  shipping bundles: <https://docs.unity.cn/Packages/com.unity.addressables%401.22/manual/AnalyzeTool.html>

The browser engine should follow the same pattern at its scale: authored
source data, explicit import/cook tools, runtime-ready manifests, and repeatable
validation that can run outside the game window.

## Contract

Owner row: `LevelAuthoringImportValidationContract` in
`ENGINE_CONTRACT_REGISTER.md`.

The runtime keeps consuming `RuntimeSceneManifest`. The current validator in
`src/engine/data/contentGraph/index.ts` derives or drift-checks the manifest's
readiness fields from checked-in source content:

- `src/game/assets`
- `src/game/prefabs`
- `src/game/levels`
- `src/game/levels/runtimeSceneManifests.ts`
- render profiles, audio manifests, and transition data referenced by those
  scene manifests

## Validation Graph

The content graph should collect:

- Runtime scene IDs and transition targets.
- Level IDs, level instance stable IDs, and duplicate stable ID reports.
- Asset IDs referenced by renderables, materials, environment profiles, audio
  manifests, shared portal/water/sky assets, and scene preload/readiness data.
- Prefab IDs referenced by level instances and runtime scene manifest preload
  data.
- Collision stable IDs from level instances whose prefab or override owns a
  `Collider`.
- Walkable stable IDs from `Collider.intent: "walkable"`.
- Light stable IDs from authored `Light` components required for the first
  playable state.

The graph should fail:

- Missing asset definitions.
- Missing prefab definitions.
- Missing runtime scene transition targets.
- Duplicate level instance stable IDs.
- Orphaned preload or readiness entries that are not reachable from authored
  source data.
- Readiness omissions for required collision, walkable, light, player, and
  transition data.
- Render meshes used as implicit collision sources.

## Implementation Packets

### Packet 1: Read-Only Graph Builder

Status: implemented in `src/engine/data/contentGraph/index.ts`.

- Added a narrow graph builder under `src/engine/data` with no Three, Rapier,
  Svelte, Astro, browser, app, UI, or game imports.
- Reads checked-in runtime manifest data passed by the focused contract script.
- Produces an in-memory report only.

Acceptance:

- Current runtime scenes can be traversed.
- Duplicate stable IDs and missing scene IDs are detectable.
- No runtime behavior changes.

### Packet 2: Drift Checks Against RuntimeSceneManifest

Status: implemented foundation in `scripts/test-level-authoring-contract.ts`.

- Compares derived assets, prefabs, collision stable IDs, walkable stable IDs,
  light stable IDs, audio asset references, and portal targets against existing
  manifests.
- Keeps transitional manual arrays valid until a future cook command owns
  output generation.

Acceptance:

- Portal arena, prototype arena, Miranda deck, and Observatory pass.
- Focused negative cases prove missing asset, prefab, collision, walkable,
  light, and portal target failures.

### Packet 3: Package Script And CI-Ready Gate

Status: implemented as `test:level-authoring-contract`.

- Added focused package script `test:level-authoring-contract`.
- Documented it in the contract register and migration plan.

Acceptance:

- The command is narrow enough for regular agent use.
- `audit:engine-boundaries`, `type-check`, `lint`,
  `test:runtime-scene-contract`, and the new command can run together without
  temporary files or broad catch-all tests.

### Packet 4: Future Cook Ownership

- After validation is trustworthy, add explicit cook/import commands for
  durable generated outputs.
- The normal build may check drift, but it must not silently rewrite source or
  cooked files.

Acceptance:

- Generated outputs have one owner command.
- Generated files are reproducible.
- Runtime never repairs missing content.

## Non-Goals

- Do not port old `apps/game` editor/runtime code.
- Do not make the normal game HUD an editor.
- Do not add level-id special cases to generic engine code.
- Do not add a broad test harness or scratch script.
- Do not use render GLBs as implicit collision.
- Do not silently generate files during normal build.
