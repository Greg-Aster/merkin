# AAA Remaining 08 - CI And Release Enforcement

## Mission

Turn stable local validation into reliable CI and release gates. CI should prevent regression in runtime purity, generated drift, engine audits, visual smoke, performance certification, and release artifacts without hard-failing known-flaky or non-certified checks prematurely.

## Baseline Evidence

The repo has `release:gate`, `release:gate:ci`, engine audits, generated drift checks, visual smoke, resource profiling, and performance scripts. CI currently runs the game release gate. Strict performance certification exists as a script but is not yet the main release truth.

## Ownership

Primary ownership:

- `apps/game/package.json`
- `apps/game/scripts/release-gate.mjs`
- `.github/workflows/game-engine-ci.yml`
- Release artifact/report scripts.
- Any new audit scripts created by this pass.

Coordinate with:

- Runtime boundary agent before adding runtime purity gates.
- Performance agent before strict performance gates.
- Rendering agent before strict visual baseline gates.
- Streaming/material agents before budget gates.

## Work Packages

1. Inventory current gates.
   - List what release gate runs locally and in CI.
   - Identify warning-only checks.
   - Identify strict checks that are stable enough to promote.

2. Add runtime purity gate after the runtime boundary agent lands.
   - Fail on editor metadata in runtime payloads.
   - Fail on runtime imports from editor-only modules.

3. Add generated artifact guarantees.
   - Keep `check:generated-drift` required.
   - Upload useful artifacts on failure.
   - Require regeneration after source manifest changes.

4. Stage strict performance.
   - Do not make broad strict performance required until certified baselines are stable.
   - Start with one vertical-slice strict certification job.

5. Make reports reviewable.
   - Write JSON or markdown reports for performance, resources, visual smoke, and engine audits.
   - CI should upload artifacts on failure and, where useful, on scheduled runs.

6. Keep fast and full gates separate.
   - Fast PR gate for lint, type-check, engine audit, generated drift, smoke.
   - Nightly or manual gate for broad performance/resource certification if it is too slow for every PR.

## Acceptance Criteria

- CI fails on stable runtime purity and generated drift regressions.
- Release gate includes the stable subset of engine audits and smoke checks.
- Strict performance is enforced for at least one approved certified vertical slice, or explicitly left as reporting until the performance agent certifies it.
- Failure artifacts are useful.
- No flaky non-certified all-level warning pass is treated as a production gate.

## Avoid

- Do not hard-fail known unstable broad performance checks.
- Do not remove checks because they are noisy; fix them or keep them reporting with owner and reason.
- Do not make CI depend on a manually running local dev server.
- Do not commit generated drift as a workaround.

## Validation

```bash
pnpm --dir apps/game release:gate
pnpm --dir apps/game check:generated-drift
pnpm --dir apps/game audit:engine
pnpm --dir apps/game smoke:engine
```

When promoted:

```bash
pnpm --dir apps/game certify:performance:strict
pnpm --dir apps/game profile:resources:strict
```

## Handoff

Report:

- Gates added, removed, or changed.
- CI workflow changes.
- Artifact/report behavior.
- Checks run locally.
- Checks intentionally left reporting-only and why.
