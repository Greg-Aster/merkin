# AAA Review Fix Agent Coordination

## Purpose

This file coordinates the agents assigned to the six current review findings:

- `AAA_REVIEW_FIX_01_RUNTIME_ASSET_TIER_SELECTION.md`
- `AAA_REVIEW_FIX_02_DESKTOP_HIGH_PERFORMANCE.md`
- `AAA_REVIEW_FIX_03_RUNTIME_ASSET_PATH_OWNERSHIP.md`
- `AAA_REVIEW_FIX_04_ALL_LEVEL_CERTIFICATION_COVERAGE.md`
- `AAA_REVIEW_FIX_05_EDITOR_MONOLITH_REDUCTION.md`
- `AAA_REVIEW_FIX_06_WORKTREE_SPRAWL_CLEANUP.md`

Each agent owns only its assigned file unless it explicitly coordinates with
another agent. The goal is a cleaner web game-engine pipeline, not a pile of
local fixes that pass one command accidentally.

## Shared Rules

1. Read `apps/game/AGENTS.md` before editing.
2. Do not weaken certification budgets to make a task look complete.
3. Do not bypass generated asset pipelines by hand-editing generated JSON.
4. Do not couple gameplay runtime to editor-only modules.
5. Do not delete or revert unrelated user work.
6. If generated runtime assets change, regenerate them through the script that
   owns them and run drift checks.
7. If a task exposes a larger system issue, document it in the handoff instead
   of hiding it behind a local special case.

## File Ownership

| Workstream | Primary Owner | Shared Surfaces |
| --- | --- | --- |
| Runtime asset tier selection | Fix 01 | `runtimeAssetManifest.ts`, runtime profile telemetry |
| Desktop-high performance | Fix 02 | `performance-baselines.json`, runtime quality policy, profiling scripts |
| Cooked asset path ownership | Fix 03 | runtime asset cook scripts and generated manifests |
| All-level certification | Fix 04 | certification profiles, release gate, reports |
| Editor monolith reduction | Fix 05 | editor components and editor-only controllers |
| Worktree sprawl cleanup | Fix 06 | docs, generated assets, ignore rules, stale files |

If two workstreams need the same file, coordinate by keeping the earlier task
small and reporting the conflict in the handoff.

## Required Handoff Format

Every agent must report:

- Finding addressed.
- Files changed.
- Whether runtime payload, collision, and required assets were considered.
- Commands run.
- Commands not run and why.
- Any new CSS surface.
- Remaining risks or next agent dependencies.

## Baseline Validation

Run the smallest relevant set for your task, then broaden only when your edits
touch shared runtime behavior:

```bash
pnpm --dir apps/game lint
pnpm --dir apps/game type-check
pnpm --dir apps/game check:generated-drift
pnpm --dir apps/game audit:engine
pnpm --dir apps/game release:gate:quick
```

Browser/profile work should also run the task-specific commands from its file.
