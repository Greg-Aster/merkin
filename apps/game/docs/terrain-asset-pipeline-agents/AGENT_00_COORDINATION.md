# Agent 00: Terrain Asset Pipeline Coordination

## Read First

Read this file before starting any terrain asset pipeline task.

Also read:

- `apps/game/AGENTS.md`
- `apps/game/docs/terrain-asset-pipeline-audit.md`

## Goal

Unify the terrain asset pipeline around an explicit AAA-style contract:

```txt
Blender source GLB/GLTF
  -> editor import metadata
  -> render chunk bake/cook
  -> collision bake/cook
  -> terrain manifest
  -> runtime streaming and validation
```

The system must support terrain authored in Blender or a similar 3D program,
exported as GLB/GLTF, then baked/chunked/published through the level editor.

## Core Problem

The current engine has multiple terrain visual owners:

- scene-authored ground actors
- heightmap-derived generated chunks
- procedural heightmap visual surface
- source environment GLB references

These paths can coexist without a single manifest field declaring which one is
authoritative. That causes confusing visuals, stale runtime output, and unclear
editor behavior.

## Target Contract

Every terrain level must declare one primary terrain mode:

```ts
type TerrainRuntimeMode =
  | 'scene-authored'
  | 'heightfield-terrain'
  | 'glb-chunk-terrain'
```

Each mode must make visual ownership explicit:

```ts
type TerrainVisualSource =
  | 'scene-actors'
  | 'heightmap-surface'
  | 'generated-heightmap-chunks'
  | 'source-glb-chunks'
  | 'none'
```

Runtime must not render two primary terrain visual owners at the same time.

## Agent Boundaries

### Agent 01: Manifest Schema And Validation

Owns terrain manifest type/schema additions and validation/audit rules.

### Agent 02: Runtime Visual Authority

Owns `SceneDocumentLevel`, `TerrainRuntime`, and runtime visual fallback rules.

### Agent 03: GLB Chunk Cooker

Owns a new or upgraded terrain chunk cooker that preserves source GLB
UVs/materials for `glb-chunk-terrain`.

### Agent 04: Collision Source Contract

Owns collision metadata alignment with terrain source assets and render chunks.

### Agent 05: Editor Terrain UX

Owns editor controls, diagnostics, and publish-state presentation.

### Agent 06: Level Migration And Release Gates

Owns migration of existing levels and release/audit enforcement.

## Completion Follow-Up Agents

The first terrain pipeline pass left a few integration issues open. Use these
follow-up briefs to finish the pipeline without creating one-off level fixes:

- `AGENT_07_RELEASE_GATE_AND_DRIFT_FIX.md`: make `audit:engine` and
  `check:generated-drift` pass for the terrain contract.
- `AGENT_08_OBSERVATORY_VISUAL_AUTHORITY.md`: remove competing observatory
  terrain visual owners through explicit contract alignment.
- `AGENT_09_SOURCE_GLB_ASSET_AND_COOK_PATH.md`: make the source GLB chunk cook
  path real and fail loudly when source assets are missing.
- `AGENT_10_EDITOR_BAKE_BUTTON_AND_TERRAIN_STATUS.md`: add a clear editor
  terrain bake/cook/validate/publish control surface.
- `AGENT_11_GENERATED_TERRAIN_CRUFT_CLEANUP.md`: identify and remove stale
  generated terrain artifacts only after their authoritative source is clear.
- `AGENT_12_FINAL_PIPELINE_CERTIFICATION.md`: run the final checks and document
  the remaining browser/runtime risks.
- `AGENT_13_CODE_AUDITOR_AND_REFINER.md`: review other agents' changes,
  remove accidental cruft, and enforce the terrain pipeline architecture.
- `AGENT_14_GLB_BAKE_BUTTON_RUNTIME_FIX.md`: fix the editor `Bake Terrain`
  runtime crash for `glb-chunk-terrain`.
- `AGENT_15_SOURCE_ASSET_EXISTENCE_GATE.md`: make missing terrain source assets
  disable editor cook/bake commands before backend failure.
- `AGENT_16_OBSERVATORY_SOURCE_GLB_MIGRATION.md`: complete observatory's real
  migration from heightfield chunks to source-preserving GLB chunks.
- `AGENT_17_GENERATED_TERRAIN_RETIREMENT_GATE.md`: remove or quarantine
  retained generated heightmap chunks once ownership is proven.

## Coordination Rules

- Do not hard-code level IDs in generic engine/runtime/editor code.
- Do not patch observatory as a one-off fix.
- Do not weaken validation to make existing mixed terrain pass.
- Do not mark a level as `glb-chunk-terrain` unless source GLB chunk products
  really preserve source UV/material intent or the migration status clearly
  states the level is transitional.
- Do not delete generated assets unless your brief owns regeneration and you
  document what command produced the replacement.
- Keep heightfield terrain supported, but only behind an explicit
  `heightfield-terrain` contract.
- Keep scene-authored ground supported for levels that intentionally use scene
  actors.
- Add new manifest fields in a backward-compatible way first, then tighten
  validation after migration.
- The editor must expose terrain bake/cook state directly. Saving a scene is
  not the same as baking terrain products.

## Shared Files To Watch

High-conflict files:

- `apps/game/src/threlte/engine/sceneDocumentTypes.ts`
- `apps/game/src/threlte/engine/groundContractCore.mjs`
- `apps/game/src/threlte/features/terrain/terrainManifest.ts`
- `apps/game/src/threlte/features/terrain/TerrainRuntime.svelte`
- `apps/game/src/threlte/levels/SceneDocumentLevel.svelte`
- `apps/game/src/threlte/editor/editorPublishBakePlan.ts`
- `apps/game/src/threlte/editor/editorPublishReadiness.ts`
- `apps/game/scripts/cook-terrain-chunks.mjs`
- `apps/game/scripts/bake-terrain-collision.mjs`
- `apps/game/scripts/editor-tools/terrainRoutes.cjs`
- `apps/game/src/threlte/editor/scenes/*.scene.json`
- `apps/megameal/public/terrain/*.manifest.json`

Agents should announce changes to these files in their final report.

## Required Verification

Every code-changing agent should run:

```bash
pnpm --dir apps/game type-check
```

Agents touching publish planning or terrain routes should also run:

```bash
pnpm --dir apps/game test:publish-pipeline
```

Agents touching generated terrain products should run the relevant command:

```bash
pnpm --dir apps/game generate:terrain-heightmap -- --level=<level>
pnpm --dir apps/game bake:terrain-collision -- --level=<level>
pnpm --dir apps/game cook:terrain-chunks -- --level=<level>
```

Agents touching runtime rendering should run a visual smoke test when feasible:

```bash
GAME_DEV_MANUAL_REFRESH=1 pnpm --dir apps/game smoke:visual -- --level=<level> --skip-baselines --write-artifacts
```

If a command cannot be run, explain why and identify the residual risk.

## Final Report Format

Each agent must report:

- files changed
- terrain mode/path affected
- generated assets changed, if any
- commands run
- validation gaps left open
- whether any runtime fallback path remains active
