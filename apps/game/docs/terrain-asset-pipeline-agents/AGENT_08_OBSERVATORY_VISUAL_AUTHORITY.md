# Agent 08: Observatory Visual Authority

## Mission

Fix the observatory terrain conflict by making the level declare exactly one
authoritative terrain visual path.

This is not a one-off visual patch. Observatory is the first proving ground for
the terrain contract, but the solution must be data-driven and reusable for all
levels.

## Read First

- `apps/game/AGENTS.md`
- `apps/game/docs/terrain-asset-pipeline-audit.md`
- `apps/game/docs/terrain-asset-pipeline-agents/AGENT_00_COORDINATION.md`
- `apps/game/docs/terrain-asset-pipeline-agents/AGENT_02_RUNTIME_VISUAL_AUTHORITY.md`

## Current Problem

The latest review found observatory still had conflicting settings:

- scene terrain settings allowed a fallback heightmap surface as primary visual
  terrain
- the terrain manifest declared the fallback surface disabled
- runtime contract resolution could prefer scene settings over the manifest
- `TerrainRuntime.svelte` still renders `HeightmapSurface` when the active
  policy is `always`

That can produce two visual layers: generated terrain chunks plus a procedural
heightmap surface.

## Ownership

Primary files:

- `apps/game/src/threlte/editor/scenes/observatory.scene.json`
- `apps/megameal/public/terrain/observatory-environment.manifest.json`
- `apps/game/src/threlte/features/terrain/terrainManifest.ts`
- `apps/game/src/threlte/features/terrain/TerrainRuntime.svelte`
- `apps/game/src/threlte/levels/SceneDocumentLevel.svelte`

Secondary files if needed:

- `apps/game/src/threlte/engine/groundContractCore.mjs`
- `apps/game/src/threlte/engine/sceneDocumentTypes.ts`
- `apps/game/src/threlte/editor/editorPublishReadiness.ts`

## Requirements

1. Make the data model explicit:

   ```txt
   one terrain runtime mode
   one authoritative visual source
   one fallback surface policy
   ```

2. For observatory, keep the level honest:

   - If the real source GLB chunk pipeline is not complete, mark observatory as
     transitional.
   - Do not claim `source-glb-chunks` unless the source GLB chunk cook actually
     produced UV/material-preserving chunks.
   - Disable the procedural fallback surface when chunks are the authoritative
     visible terrain.

3. Make runtime visual fallback rules generic:

   - `heightfield-terrain + heightmap-surface` may render `HeightmapSurface`.
   - chunk-based visual sources may render chunks.
   - fallback surfaces are allowed only by explicit policy, preferably
     `debug-only` or `until-required-chunks-ready`.
   - `always` must not be used to mask missing or stale chunk products in
     production runtime.

4. Ensure editor/playtest diagnostics report when a fallback surface is visible.

## Non-Goals

- Do not create new terrain art.
- Do not delete existing heightmap assets in this task.
- Do not special-case observatory in generic runtime code.

## Acceptance Criteria

- Observatory no longer renders two competing terrain surfaces.
- Scene settings and terrain manifest agree on fallback policy.
- Runtime logs/diagnostics can identify the active terrain visual source.
- The solution applies to any level that declares the same terrain contract.

## Verification

Run:

```bash
pnpm --dir apps/game type-check
pnpm --dir apps/game test:publish-pipeline
pnpm --dir apps/game audit:engine
pnpm --dir apps/game check:generated-drift
```

When feasible, run a visual smoke for observatory:

```bash
GAME_DEV_MANUAL_REFRESH=1 pnpm --dir apps/game smoke:visual -- --level=observatory --skip-baselines --write-artifacts
```
