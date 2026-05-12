# AAA Audit Fix 05 - Tracker Docs Are Stale

Status: resolved in the current tracker baseline.

## Finding

Original finding: status docs disagreed with validated results. Examples:

- `AAA_GRAPHICS_REFACTOR_TRACKER.md` said `release:gate` was passing, while `release:gate:ci` failed on generated drift.
- The tracker and `CRUFT_TODO.md` mentioned `missingRecommendedSlots=355`, while current audit/backlog output reports `325`.

Stale docs make the agent handoff unsafe because later agents will plan from incorrect state.

## Mission

Update the tracker and TODO documents to match the current audited state after the blocking fixes land. Do not mark work complete until the commands actually pass.

## Primary Files

- `apps/game/AAA_GRAPHICS_REFACTOR_TRACKER.md`
- `apps/game/CRUFT_TODO.md`
- `apps/game/ENGINE_MIGRATION_CHECKLIST.md`
- `apps/game/AAA_GRAPHICS_CONTENT_BACKLOG.md`
- Any relevant `AAA_AUDIT_FIX_*.md` handoff notes.

## Work Steps

1. Wait for or coordinate with:

- `AAA_AUDIT_FIX_01_GENERATED_DRIFT.md`
- `AAA_AUDIT_FIX_02_CI_PERFORMANCE_LEVEL_MISMATCH.md`
- `AAA_AUDIT_FIX_03_PERFORMANCE_BUDGETS.md`
- `AAA_AUDIT_FIX_04_EXPECTED_RUNTIME_TIER.md`

2. Run the relevant commands and record their actual results.

3. Update the tracker baseline.

Use precise language:

- Passing.
- Failing.
- Reporting-only.
- Not strict-certified.
- Strict-certified for a named level/profile only.

4. Update backlog counts only from generated output.

Do not manually invent material counts. Use:

```bash
pnpm --dir apps/game report:graphics-backlog
```

and, if needed:

```bash
pnpm --dir apps/game report:graphics-backlog:write
```

5. Update `CRUFT_TODO.md` only where file disposition or counts actually changed.

## Acceptance Criteria

- Tracker verification baseline matches commands that were actually run.
- Material backlog count matches `AAA_GRAPHICS_CONTENT_BACKLOG.md`.
- Performance status distinguishes strict certification from warning/reporting mode.
- Release gate status is not listed as passing unless it passes after generated drift is fixed.

## Validation

```bash
pnpm --dir apps/game report:graphics-backlog
pnpm --dir apps/game check:generated-drift
pnpm --dir apps/game audit:engine
pnpm --dir apps/game release:gate:ci
```

If performance docs are updated:

```bash
GAME_DEV_PORT=4332 pnpm --dir apps/game certify:performance -- --skip-build --level=miranda --profile=desktop-high-chromium-1080p
```

## Handoff

Report:

- Commands whose results were written into docs.
- Counts updated.
- Statuses changed.
- Any intentionally stale historical log entries left unchanged because they are historical.

## Resolution Notes

- Updated `AAA_GRAPHICS_REFACTOR_TRACKER.md` current verification baseline from commands run in this audit pass.
- Updated `AAA_GRAPHICS_REFACTOR_TRACKER.md` and `CRUFT_TODO.md` from the generated backlog count: `lodTargetMisses=0`, `missingRecommendedSlots=325`, `unapprovedRecommendedSlots=0`.
- Updated release gate status to `pnpm --dir apps/game release:gate:ci`: passing. This includes generated drift, so the older generated-drift blocker is no longer current.
- Updated performance language to reporting-only/not strict-certified. Non-strict desktop-high Miranda certification warns; strict desktop-high Miranda certification fails production thresholds.
- Left older dated refactor-log entries with historical `443` and `355` counts intact except for the current status lines, because those entries describe prior snapshots.

Commands recorded:

- `pnpm --dir apps/game report:graphics-backlog`: passed; reported `missingRecommendedSlots=325`.
- `pnpm --dir apps/game check:generated-drift`: passed.
- `pnpm --dir apps/game audit:engine`: passed; reported `missingRecommendedSlots=325`, `unapprovedRecommendedSlots=0`.
- `pnpm --dir apps/game release:gate:ci`: passed.
- `GAME_DEV_PORT=4332 pnpm --dir apps/game certify:performance -- --skip-build --level=miranda --profile=desktop-high-chromium-1080p`: reporting-only; warned with `avgFps=4`, `avgFrame=424.7ms`, final quality `ultra_low`.
- `GAME_DEV_PORT=4333 pnpm --dir apps/game certify:performance:strict -- --skip-build --level=miranda --profile=desktop-high-chromium-1080p`: failed as expected against strict thresholds with `avgFps=3`, `avgFrame=653.1ms`, final quality `ultra_low`; command exited non-zero.
