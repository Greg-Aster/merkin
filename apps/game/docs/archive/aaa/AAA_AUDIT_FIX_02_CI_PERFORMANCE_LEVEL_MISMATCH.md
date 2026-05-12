# AAA Audit Fix 02 - CI Performance Level Mismatch

## Finding

The GitHub Actions performance job runs strict certification for `solitude`, but `apps/game/performance-baselines.json` currently certifies only `miranda`.

Current mismatch:

- CI command: `pnpm --dir apps/game certify:performance:strict -- --level=solitude --profile=desktop-high-chromium-1080p`
- Certified levels: `["miranda"]`

The local equivalent fails with `No performance levels matched "solitude"`.

## Mission

Make CI performance certification consistent with the approved certification baseline. The fix must not hide the deeper performance-certification problem from `AAA_AUDIT_FIX_03_PERFORMANCE_BUDGETS.md`.

## Primary Files

- `.github/workflows/game-engine-ci.yml`
- `apps/game/performance-baselines.json`
- `apps/game/scripts/performance-baseline.mjs`
- `apps/game/package.json`

## Work Steps

1. Reproduce the mismatch locally:

```bash
GAME_DEV_PORT=4333 pnpm --dir apps/game certify:performance:strict -- --skip-build --level=solitude --profile=desktop-high-chromium-1080p
```

2. Decide the correct certification target.

Preferred options:

- If `miranda` is the only approved certification slice, change CI to run the `miranda` slice.
- If `solitude` is intended to be certified, add `solitude` to `performance-baselines.json` with real budgets and prove the strict command passes.
- If no slice is truly certified yet, make the scheduled CI job reporting-only until `AAA_AUDIT_FIX_03_PERFORMANCE_BUDGETS.md` is complete.

3. Keep broad all-level performance out of required PR gates until stable.

4. Run the exact command CI will run.

## Acceptance Criteria

- The CI performance command matches a level/profile present in `performance-baselines.json`.
- The local equivalent does not fail with `No performance levels matched`.
- The workflow does not claim strict certification for a level outside the certification config.
- Any reporting-only decision is explicit in the workflow and tracker handoff.

## Validation

Run whichever command CI will run after the fix. Example:

```bash
GAME_DEV_PORT=4333 pnpm --dir apps/game certify:performance:strict -- --skip-build --level=miranda --profile=desktop-high-chromium-1080p
```

Also run:

```bash
pnpm --dir apps/game type-check
```

## Handoff

Report:

- Final certified level/profile target.
- Whether CI is strict or reporting-only.
- Local command used to mirror CI.
- Remaining dependency on performance budget cleanup.
