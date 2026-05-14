# Agent 11: Generated Terrain Cruft Cleanup

## Mission

Remove or quarantine stale generated terrain artifacts after confirming each
level's authoritative terrain mode.

The current audits warn that some scene-authored levels still have generated
heightmap chunk artifacts. Those files may be harmless, but they create
confusion and increase the chance that runtime or editor code loads the wrong
terrain path.

## Read First

- `apps/game/AGENTS.md`
- `apps/game/docs/terrain-asset-pipeline-audit.md`
- `apps/game/docs/terrain-asset-pipeline-agents/AGENT_00_COORDINATION.md`
- `apps/game/docs/terrain-asset-pipeline-agents/AGENT_06_LEVEL_MIGRATION_AND_RELEASE_GATES.md`

## Ownership

Primary files:

- `apps/game/src/threlte/editor/scenes/*.scene.json`
- `apps/megameal/public/terrain/*.manifest.json`
- `apps/megameal/public/terrain/levels/**`
- `apps/megameal/public/terrain/heightmaps/**`
- `apps/megameal/public/terrain/collision/**`
- `apps/game/scripts/lib/terrainContractAudit.mjs`

Secondary files if needed:

- `apps/game/docs/terrain-asset-pipeline-audit.md`
- `apps/game/ENGINE_MIGRATION_CHECKLIST.md`

## Requirements

1. Build an inventory table for each level:

   - source scene file
   - terrain runtime mode
   - authoritative visual source
   - terrain manifest path
   - generated heightmap products
   - generated visual chunk products
   - collision products
   - whether each product is used, stale, transitional, or removable

2. Do not delete generated files until their owner is clear.

3. For removable files:

   - confirm no scene settings, manifest, runtime scene, or registry entry
     references them
   - remove the files or move them to an explicitly named archive if the repo
     has an established archive convention
   - update audits so the same stale artifact pattern is detected later

4. For retained transitional files:

   - mark why they remain
   - add a target removal condition
   - avoid letting them act as fallback runtime visuals

## Non-Goals

- Do not delete collision products for scene-authored levels if they are still
  used for gameplay.
- Do not delete observatory generated heightmap chunks until the replacement
  source GLB chunk path is verified.
- Do not use cleanup to hide a missing source asset problem.

## Acceptance Criteria

- Stale terrain products are either removed or explicitly documented.
- Audits no longer produce ambiguous "generated chunks present" warnings
  without a documented migration status.
- No runtime terrain path depends on files that were removed.

## Verification

Run:

```bash
pnpm --dir apps/game type-check
pnpm --dir apps/game audit:engine
pnpm --dir apps/game check:generated-drift
```

If files are deleted, also run a targeted visual smoke or explain why the
deleted files were unreachable.
