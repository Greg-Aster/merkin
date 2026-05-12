# AAA Gap 03: Yggdrasil LOD And Retopology

## Goal

Fix the remaining real LOD target misses by replacing weak generated decimation results with source retopology, manual LODs, or replacement meshes.

## Parallel Coordination

Before starting or handing off work, read `AAA_PARALLEL_AGENT_COORDINATION.md`. Follow its file ownership map, merge order, and handoff requirements. Do not edit `AAA_GRAPHICS_REFACTOR_TRACKER.md`, `CRUFT_TODO.md`, or generated manifests unless your assigned task explicitly requires it; otherwise, include proposed tracker/TODO text in your handoff for the integration lead.

## Current State

The generated backlog reports `lodTargetMisses=3`. All current misses are for the Yggdrasil world tree asset:

- Source tris: `50000`
- High target ratio: `0.82`, actual `0.8988`
- Medium target ratio: `0.52`, actual `0.5433`
- Low target ratio: `0.28`, actual `0.3586`

The current decimator is close for medium, but low is still too heavy and high does not hit target.

## Target Architecture

Large hero assets should not rely on blind automated decimation alone. The runtime should use:

- A source-authored high mesh.
- A manually controlled medium LOD that preserves silhouette.
- A low LOD that removes internal/hidden detail aggressively.
- Impostor coverage for distant cells.
- Stable bounds and pivot across all LOD tiers.
- Runtime manifest validation proving high >= medium >= low triangle counts and target compliance.

## Key Files

- `apps/game/AAA_GRAPHICS_CONTENT_BACKLOG.md`
- `apps/game/scripts/lib/runtimeAssetVariantCooker.mjs`
- `apps/game/scripts/lib/runtimeAssetManifestAudit.mjs`
- `apps/megameal/public/generated/runtime-game-assets/manifest.json`
- Yggdrasil source/cooked assets under `apps/megameal/public/generated/hunyuan3d/yggdrasil-world-tree-merged-*`

## Implementation Options

### Option A: Manual LOD Authoring

Create explicit high/medium/low GLBs for the Yggdrasil world tree.

Best when:

- The asset is visually important.
- Automated decimation damages the silhouette.
- You need predictable production quality.

### Option B: Improve Decimation Rules

Tune decimation for this asset family.

Best when:

- The current mesh topology is clean enough.
- The miss is close to target.
- You can preserve UVs/materials safely.

### Option C: Replace Source Mesh

Create or source a cleaner model with better topology.

Best when:

- The generated mesh is too dense or messy.
- Material/UV quality is also poor.
- The asset needs a full AAA art pass anyway.

## Implementation Steps

1. Inspect the Yggdrasil asset and decide whether manual LODs or replacement is the honest fix.
2. Produce high/medium/low GLBs with stable transforms and bounds.
3. Register or adapt the cooker to use authored variants for this asset.
4. Re-run:

```bash
pnpm --dir apps/game cook:runtime-assets
pnpm --dir apps/game report:graphics-backlog:write
```

5. Confirm `lodTargetMisses=0`.

## Validation

Run:

```bash
pnpm --dir apps/game audit:engine
pnpm --dir apps/game smoke:visual
GAME_DEV_PORT=4324 pnpm --dir apps/game smoke:boot
```

Passing conditions:

- `lodTargetMisses=0`
- LOD triangle order is monotonic.
- Yggdrasil stays under payload, file, triangle, draw-call, and material budgets.
- Visual smoke does not show popping, broken bounds, missing tree geometry, or bad placement.

## Do Not

- Do not loosen LOD target ratios to make the report green.
- Do not accept low LODs that preserve hidden/internal triangles.
- Do not change level placement to compensate for bad pivots unless that is explicitly part of the asset replacement.
- Do not remove the asset from runtime manifests to avoid the budget.

## Done Means

`AAA_GRAPHICS_CONTENT_BACKLOG.md` reports `lodTargetMisses=0`, and Yggdrasil boots with stable high/medium/low runtime variants.
