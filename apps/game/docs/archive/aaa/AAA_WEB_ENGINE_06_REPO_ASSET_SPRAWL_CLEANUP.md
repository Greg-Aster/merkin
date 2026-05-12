# AAA Web Engine 06 - Repo And Asset Sprawl Cleanup

## Goal

Reduce confusion from cruft, orphan code, stale generated files, and unclear asset ownership. The repo should make it obvious what is source, what is generated, what is runtime, and what is obsolete.

This is a cleanup task, not a feature task.

## Current Concern

The worktree has many changed and untracked files across engine docs, game code, generated runtime assets, Megameal public assets, and content. Without careful cleanup, agents can accidentally build on stale output or duplicate systems.

## Primary Files To Inspect

- `apps/game/CRUFT_TODO.md`
- `apps/game/CRUFT_FILE_INVENTORY.md`
- `apps/game/CRUFT_AUDIT_PLAN.md`
- `apps/game/AAA_GRAPHICS_REFACTOR_TRACKER.md`
- `apps/game/ENGINE_MIGRATION_CHECKLIST.md`
- `apps/game/ENGINE_ARCHITECTURE.md`
- `.gitignore`
- `apps/game/scripts/check-generated-drift.mjs`
- `apps/game/scripts/cook-runtime-assets.mjs`
- `apps/megameal/public/generated/runtime-game-assets/`
- `apps/megameal/public/generated/runtime-game-assets/manifest.previous.json`

## Work Steps

1. Read `apps/game/AGENTS.md`.
2. Inventory changed and untracked files:

```bash
git status --short
```

3. Classify files into:

- source code
- source authoring assets
- generated runtime assets
- generated reports/backlogs
- docs/trackers
- unrelated Megameal content
- obsolete or orphan candidates

4. Do not delete or revert user work without explicit instruction.
5. For game-facing generated output, verify whether it can be reproduced.
6. Add missing ignore rules only for truly generated local artifacts, not required runtime assets.
7. Update cleanup docs with disposition decisions.
8. If deletion is appropriate, make the smallest safe deletion set and explain why each file is obsolete.

## Rules

- Never use `git reset --hard` or broad checkout commands.
- Do not remove runtime assets that are referenced by manifests.
- Do not remove authoring assets needed to regenerate runtime content.
- Do not hand-edit generated outputs to make status look clean.
- Generated files that ship with the static site may need to stay tracked; classify before changing ignore rules.

## Acceptance Criteria

- `CRUFT_TODO.md` or `CRUFT_FILE_INVENTORY.md` reflects current file ownership/disposition.
- Obvious obsolete files are removed only when proven unreferenced and reproducible.
- Generated runtime assets still pass drift and engine audits.
- The next agent can understand what files are source vs generated.

## Validation

```bash
git status --short
pnpm --dir apps/game check:generated-drift
pnpm --dir apps/game audit:engine
pnpm --dir apps/game release:gate:quick
```

If generated runtime assets are touched:

```bash
pnpm --dir apps/game cook:runtime-assets
pnpm --dir apps/game check:generated-drift
```

## Handoff

Report:

- Files classified.
- Files removed, if any, and proof they were obsolete.
- `.gitignore` changes, if any.
- Generated files regenerated, if any.
- Commands run.
- Remaining questionable files.
- Any user-owned or unrelated changes intentionally left untouched.
