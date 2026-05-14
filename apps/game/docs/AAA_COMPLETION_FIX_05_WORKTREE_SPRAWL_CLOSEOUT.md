# AAA Completion Fix 05 - Worktree Sprawl Closeout

## Finding

The cleanup pass improved classification, but the worktree is still very large.
Latest review count:

```txt
git status --short | wc -l = 383
```

The cleanup docs also say the count increased from the prior pass, so the repo
is still hard for agents to reason about.

## Mission

Close out the current worktree sprawl enough that the remaining dirty state is
intentional, grouped, and easy to commit or delegate.

This is not a request to delete broadly. It is a request to remove ambiguity.

## Primary Files

- `apps/game/CRUFT_FILE_INVENTORY.md`
- `apps/game/CRUFT_TODO.md`
- `apps/game/AAA_GRAPHICS_REFACTOR_TRACKER.md`
- `.gitignore`
- `apps/game/reports/`
- `apps/game/tmp/`
- `apps/megameal/public/generated/runtime-game-assets/`
- `apps/megameal/public/generated/hunyuan3d/`
- `apps/megameal/public/assets/banner/`

## Work Steps

1. Read `apps/game/AGENTS.md` and
   `apps/game/AAA_COMPLETION_AGENT_COORDINATION.md`.
2. Capture current state:

```bash
git status --short
git status --short | wc -l
```

3. Group files into:

- completion-fix docs
- active game source
- generated runtime assets
- generated local reports
- source authoring assets
- unrelated Megameal content
- stale/historical coordination docs
- safe deletion candidates

4. For every safe deletion candidate, prove it is unreferenced:

```bash
rg -n "candidate-name" apps/game apps/megameal .github .gitignore
```

5. Remove only files proven to be local generated output or obsolete docs.
6. If older instruction docs are stale, either:

- consolidate them into a single current tracker, or
- mark them clearly as historical in `CRUFT_TODO.md`.

7. Do not delete generated runtime assets referenced by manifests.
8. Do not touch unrelated Megameal banner/content files except to classify them.

## Acceptance Criteria

- Starting and ending worktree counts are reported.
- `CRUFT_FILE_INVENTORY.md` reflects the current ownership state.
- `CRUFT_TODO.md` lists remaining cleanup tasks with owners.
- Safe deletions, if any, are justified by reference checks.
- Generated drift and engine audits still pass.
- Remaining dirty files are grouped into intentional workstreams.

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

- Starting and ending status count.
- Files removed, if any.
- Files intentionally left dirty.
- Ignore rule changes.
- Commands run.
- Remaining ambiguous files.
