# Agent 02: Runtime Visual Authority

## Mission

Make runtime terrain rendering obey one authoritative terrain visual source.
Remove the confusion where procedural heightmap visuals and terrain chunk GLBs
can both appear as primary terrain.

## Context

Current runtime flow:

- `SceneDocumentLevel.svelte` loads a terrain manifest.
- `terrainManifest.ts` builds `TerrainRuntimeComponentData`.
- `TerrainRuntime.svelte` can render `HeightmapSurface` and `TerrainChunk`
  instances in the same runtime.

This is useful as a fallback but confusing as a primary production path.

## Ownership

Primary files:

- `apps/game/src/threlte/levels/SceneDocumentLevel.svelte`
- `apps/game/src/threlte/features/terrain/TerrainRuntime.svelte`
- `apps/game/src/threlte/features/terrain/terrainManifest.ts`
- `apps/game/src/threlte/features/terrain/components/HeightmapSurface.svelte`
- `apps/game/src/threlte/features/terrain/components/TerrainChunk.svelte`

Secondary files if needed:

- `apps/game/src/threlte/engine/groundContractCore.mjs`
- `apps/game/src/threlte/stores/runtimeDiagnosticsStore.ts`
- `apps/game/scripts/visual-smoke-browser.mjs`

## Requirements

Runtime must decide terrain visual rendering from explicit manifest/scene
contract fields, not indirect assumptions.

Implement behavior equivalent to:

```txt
scene-authored:
  render scene actors
  do not render TerrainRuntime visual chunks
  do not render HeightmapSurface unless debug-only

heightfield-terrain:
  render heightmap surface or generated heightmap chunks according to manifest
  render baked heightfield collision

glb-chunk-terrain:
  render source GLB chunks
  do not render HeightmapSurface as a primary visual
  use fallback surface only when policy explicitly allows it
```

## Runtime Diagnostics

Add clear diagnostics for:

- authoritative visual source
- fallback visual source active
- missing required chunk
- terrain collision ready
- terrain visual ready

If fallback surface is shown because chunks are missing, the player/editor
should be able to see that this is a fallback state.

## Non-Goals

- Do not build the GLB chunk cooker.
- Do not change terrain collision generation.
- Do not change level content except for minimal fixture/manifest metadata
  needed to exercise the runtime contract.
- Do not add level ID branches.

## Acceptance Criteria

- Runtime cannot render both primary heightmap surface and primary chunk GLBs
  unless the manifest explicitly says fallback is allowed.
- Observatory no longer gets two competing primary terrain visual layers once
  its manifest declares chunk visuals as authoritative.
- Existing scene-authored levels continue to render their scene actors.
- Existing heightfield levels continue to render through the heightfield mode.

## Verification

Run:

```bash
pnpm --dir apps/game type-check
pnpm --dir apps/game test:publish-pipeline
GAME_DEV_MANUAL_REFRESH=1 pnpm --dir apps/game smoke:visual -- --level=observatory --skip-baselines --write-artifacts
```

Also test at least one scene-authored level if feasible:

```bash
GAME_DEV_MANUAL_REFRESH=1 pnpm --dir apps/game smoke:visual -- --level=yggdrasil --skip-baselines --write-artifacts
```
