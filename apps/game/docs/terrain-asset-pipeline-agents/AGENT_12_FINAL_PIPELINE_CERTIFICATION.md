# Agent 12: Final Pipeline Certification

## Mission

Perform the final integration review after Agents 07-11 finish. Verify that the
terrain asset pipeline is coherent enough to use as the engine standard going
forward.

## Read First

- `apps/game/AGENTS.md`
- `apps/game/docs/terrain-asset-pipeline-audit.md`
- `apps/game/docs/terrain-asset-pipeline-agents/AGENT_00_COORDINATION.md`

## Scope

This is a review and certification task. Make small fixes only when they are
clearly integration-level and low risk. Otherwise document findings for a
follow-up agent.

## Certification Checklist

For every level:

- terrain mode is explicit
- authoritative visual source is explicit
- fallback surface policy is explicit
- runtime scene output matches authoring scene settings
- required terrain assets exist
- required collision assets exist or the level intentionally uses scene
  colliders
- publish readiness reports stale/missing terrain products
- editor shows how to bake/cook terrain products
- no generic runtime code has level-specific terrain branches

For the editor:

- there is an obvious bake/cook terrain action
- bake/cook status is visible
- failed bake/cook output is actionable
- publish does not silently skip stale terrain products

For runtime:

- `TerrainRuntime` renders only the declared authoritative visual owner
- fallback surfaces are not active in production unless explicitly declared
- missing required chunks/collision products surface diagnostics

## Required Verification

Run:

```bash
pnpm --dir apps/game type-check
pnpm --dir apps/game test:publish-pipeline
pnpm --dir apps/game audit:engine
pnpm --dir apps/game check:generated-drift
```

Run chunk audit if terrain/runtime chunking changed:

```bash
pnpm --dir apps/game audit:chunks
```

Run visual smoke when feasible:

```bash
GAME_DEV_MANUAL_REFRESH=1 pnpm --dir apps/game smoke:visual -- --level=observatory --skip-baselines --write-artifacts
```

## Final Report Format

Report:

- pass/fail for each required command
- remaining terrain pipeline blockers
- remaining editor UX blockers
- generated assets changed
- whether any fallback surface remains active
- whether observatory is still transitional or fully migrated
- whether the pipeline is ready to be used as the standard for new levels
