# AAA Completion Agent Coordination

## Purpose

This coordinates the final agents assigned to complete the current review
blockers after the latest audit.

The active completion files are:

- `AAA_COMPLETION_FIX_01_LINT_RELEASE_GATE.md`
- `AAA_COMPLETION_FIX_02_DESKTOP_HIGH_PERFORMANCE.md`
- `AAA_COMPLETION_FIX_03_ALL_LEVEL_ASSET_TIER_SEMANTICS.md`
- `AAA_COMPLETION_FIX_04_EDITOR_MONOLITH_AND_WARNINGS.md`
- `AAA_COMPLETION_FIX_05_WORKTREE_SPRAWL_CLOSEOUT.md`

Use these files as the current source of truth for completion work. The active
next-stage target docs are `AAA_TARGET_*.md`. Older `AAA_REVIEW_FIX_*`,
`AAA_AUDIT_FIX_*`, `AAA_NEXT_*`, `AAA_REMAINING_*`, `AAA_WEB_ENGINE_*`, and
`AAA_GAP_*` files have been archived under `docs/archive/aaa/` and are
historical context unless a live completion or target file explicitly references
them.

## Shared Rules

1. Read `apps/game/AGENTS.md` before editing.
2. Keep changes scoped to your assigned completion file.
3. Do not weaken certification budgets to make a gate pass.
4. Do not hand-edit generated runtime JSON as the primary fix.
5. Do not couple gameplay runtime to editor-only modules.
6. Do not delete or revert unrelated user work.
7. If generated runtime assets change, regenerate through the owning script and
   run drift checks.
8. Report commands run and any commands not run.

## Current Review State

Passing:

- `pnpm --dir apps/game type-check`
- `pnpm --dir apps/game check:generated-drift`
- `pnpm --dir apps/game audit:engine`
- `node apps/game/scripts/assert-runtime-asset-tier-selection.mjs`

Failing or incomplete:

- `pnpm --dir apps/game lint`
- `pnpm --dir apps/game release:gate:quick`
- `certify:performance:strict` for Miranda desktop-high
- all-level desktop-high asset-tier expectation for capped levels
- editor monolith reduction
- worktree sprawl closeout

## Handoff Format

Each agent must report:

- Completion file addressed.
- Files changed.
- Runtime payload, collision, and required-asset impact.
- CSS surface area, if any.
- Commands run.
- Remaining risks.
