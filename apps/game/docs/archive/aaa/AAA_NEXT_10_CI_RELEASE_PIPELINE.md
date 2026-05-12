# AAA Next 10: CI And Release Pipeline

## Goal

Move the graphics/game-engine checks from manual discipline into repeatable CI and release gates, including generated artifact drift, runtime smoke, visual smoke, and rollback safety.

## Coordination

Before starting, read `AAA_NEXT_AGENT_COORDINATION.md`. This agent owns automation. Coordinate with every other next-stage agent before turning their checks into hard CI failures.

## Agent Assignment

Keep the release path honest. Your job is to make the local and CI gates catch real regressions without causing churn from unstable visual/performance thresholds.

Priority target: harden the existing release gate, artifact reporting, and generated-drift checks before adding new failure modes.

## Current Baseline

Local and CI-oriented release gates exist:

- `pnpm --dir apps/game release:gate`
- `pnpm --dir apps/game release:gate:quick`
- `pnpm --dir apps/game release:gate:ci`

The remaining work is to improve artifact reporting, baseline comparison, and CI enforcement policy without making flaky checks hard blockers too early.

## Target Architecture

CI should answer:

- Does code compile?
- Does lint pass?
- Do engine audits pass?
- Are generated runtime assets up to date?
- Do gameplay, editor, and deployed levels boot?
- Do representative levels render nonblank screenshots?
- Did payload, budget, or material backlog regress?
- Can generated manifests be rolled back if needed?

## Work Packages

1. Harden local gate script.
   - Keep one command that runs the correct local verification sequence.
   - Keep heavy browser tests optional or split by profile.
   - Ensure browser smoke always targets the same origin as the spawned or reused server.

2. Add generated drift checks.
   - Run bake/cook/report in check mode where possible.
   - Fail if generated manifests differ from source state.
   - Avoid unnecessary GLB churn in CI.

3. Add browser smoke in CI.
   - Use a known free port.
   - Ensure harness origin and server origin match.
   - Store logs and screenshots as artifacts on failure.

4. Add visual smoke artifact reporting.
   - Capture representative screenshots.
   - Report image metrics.
   - Store diffs once baselines are stable.

5. Add release manifest validation.
   - Content build id.
   - Git metadata.
   - Previous manifest availability.
   - Rollback file validation.

## Key Files

- `apps/game/package.json`
- `apps/game/scripts/release-gate.mjs`
- `apps/game/scripts/check-generated-drift.mjs`
- `apps/game/scripts/smoke-check.mjs`
- `apps/game/scripts/boot-check.mjs`
- `apps/game/scripts/visual-smoke.mjs`
- `apps/game/scripts/audit-engine-architecture.mjs`
- `apps/game/scripts/bake-runtime-prefabs.mjs`
- `apps/game/scripts/cook-runtime-assets.mjs`
- `.github/workflows/game-engine-ci.yml`
- `apps/megameal/public/generated/runtime-game-assets/manifest.json`
- `apps/megameal/public/generated/runtime-game-assets/manifest.previous.json`

## Validation

Run the full local release gate with:

```bash
pnpm --dir apps/game release:gate
```

The release gate owns its browser smoke server port. It defaults to `4330`
and can be overridden with `GAME_RELEASE_GATE_PORT`. It only reuses
`GAME_DEV_PORT` when run with `--use-game-dev-port` or
`GAME_RELEASE_GATE_USE_GAME_DEV_PORT=1`. Manual `smoke:boot` and
`smoke:visual` commands can still target an existing `GAME_DEV_PORT=4322`
server, but release gates should use an isolated port so the harness and server
cannot drift apart.

For code-only iteration before browser smoke:

```bash
pnpm --dir apps/game release:gate:quick
```

The CI workflow runs:

```bash
pnpm --dir apps/game release:gate:ci
```

The gate expands to:

```bash
pnpm --dir apps/game lint
pnpm --dir apps/game type-check
pnpm --dir apps/game check:generated-drift
pnpm --dir apps/game audit:runtime-assets
pnpm --dir apps/game audit:runtime-prefabs
pnpm --dir apps/game audit:engine
pnpm --dir apps/game smoke:engine
GAME_DEV_PORT=4330 pnpm --dir apps/game smoke:boot
GAME_DEV_PORT=4330 GAME_VISUAL_ARTIFACTS=1 pnpm --dir apps/game smoke:visual -- --write-artifacts
```

## Do Not

- Do not make flaky visual thresholds hard blockers before baselines settle.
- Do not let CI regenerate and commit artifacts automatically.
- Do not ignore generated drift.
- Do not run browser smoke against a mismatched port.

## Done Means

- There is a single documented local release gate.
- CI runs the same gate profile.
- Generated drift is detectable.
- Browser smoke cannot accidentally run against a mismatched port.
- Failure output tells an agent what to fix next.
