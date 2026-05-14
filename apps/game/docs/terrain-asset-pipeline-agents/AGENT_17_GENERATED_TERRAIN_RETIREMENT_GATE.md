# Agent 17: Generated Terrain Retirement Gate

## Mission

Retire generated heightmap visual cruft after each level's authoritative terrain
owner is proven.

The latest audit allows retained generated heightmap chunks for scene-authored
levels, but this is still transitional debt. Your job is to make cleanup safe
and enforceable.

## Read First

- `apps/game/AGENTS.md`
- `apps/game/docs/terrain-asset-pipeline-audit.md`
- `apps/game/docs/terrain-asset-pipeline-agents/AGENT_00_COORDINATION.md`
- `apps/game/docs/terrain-asset-pipeline-agents/AGENT_11_GENERATED_TERRAIN_CRUFT_CLEANUP.md`

## Ownership

Primary files:

- `apps/game/src/threlte/editor/scenes/*.scene.json`
- `apps/megameal/public/terrain/*.manifest.json`
- `apps/megameal/public/terrain/levels/**`
- `apps/game/scripts/lib/terrainContractAudit.mjs`
- `apps/game/scripts/check-generated-drift.mjs`

Secondary files if needed:

- `apps/game/docs/terrain-asset-pipeline-audit.md`
- `apps/megameal/public/generated/runtime-game-assets/scenes/*.runtime-scene.json`

## Requirements

1. For each scene-authored level, prove whether generated heightmap visual
   chunks are referenced by:

   - source scene settings
   - terrain manifest runtime visual source
   - cooked runtime scene manifest
   - runtime terrain loader
   - editor publish/readiness checks

2. If chunks are unreferenced and collision does not depend on their visual GLB
   files, remove or quarantine them.

3. If chunks must remain because the terrain manifest still couples collision
   and visual chunk metadata, split that contract first or document the exact
   blocker.

4. Update audits so retained unreferenced chunks become blockers after their
   target removal condition is met.

5. Do not delete observatory heightfield products until observatory is migrated
   to verified source GLB chunks or explicitly remains transitional.

## Non-Goals

- Do not delete collision products that are still used by gameplay.
- Do not hand-edit runtime scene JSON as the primary cleanup.
- Do not remove generated assets without a reproducible verification path.

## Acceptance Criteria

- Scene-authored levels no longer carry ambiguous generated visual terrain
  chunks, or each retained product has a precise blocker and removal condition.
- Audits distinguish between required collision products and stale visual
  products.
- Runtime manifests do not point at deleted assets.
- Generated drift remains clean.

## Verification

Run:

```bash
pnpm --dir apps/game cook:runtime-assets
pnpm --dir apps/game type-check
pnpm --dir apps/game audit:engine
pnpm --dir apps/game check:generated-drift
```

If deleting terrain assets, also run targeted visual/playtest verification or
explain why the deleted assets were unreachable.
