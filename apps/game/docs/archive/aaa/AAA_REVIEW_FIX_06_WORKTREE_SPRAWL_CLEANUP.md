# AAA Review Fix 06 - Worktree And Asset Sprawl Cleanup

## Finding

`CRUFT_FILE_INVENTORY.md` classifies the current dirty/untracked worktree, but
the repo still has a very large number of changed and untracked entries. The
latest review saw hundreds of entries across game source, docs, generated
runtime assets, Megameal public assets, and unrelated content.

The issue is not that every changed file is wrong. The issue is that unclear
ownership makes it easy for agents to build on stale generated output, duplicate
systems, or accidentally commit unrelated work.

## Mission

Turn the current sprawl into an actionable cleanup state: source, generated,
active, stale, unrelated, and safe-to-remove candidates must be clearly
separated. Remove only files proven safe.

## Primary Files

- `apps/game/CRUFT_FILE_INVENTORY.md`
- `apps/game/CRUFT_TODO.md`
- `apps/game/CRUFT_AUDIT_PLAN.md`
- `apps/game/AAA_GRAPHICS_REFACTOR_TRACKER.md`
- `.gitignore`
- `apps/game/scripts/check-generated-drift.mjs`
- `apps/megameal/public/generated/runtime-game-assets/`
- `apps/megameal/public/runtime-world-partitions/`
- `apps/megameal/public/terrain/`

## Work Steps

1. Read `apps/game/AGENTS.md` and
   `apps/game/AAA_REVIEW_FIX_AGENT_COORDINATION.md`.
2. Capture current status:

```bash
git status --short
git status --short | wc -l
```

3. Classify changed/untracked files into:

- active game source
- active game docs/trackers
- generated runtime assets required by static deployment
- generated reports/local artifacts that should be ignored
- source authoring assets
- unrelated Megameal content
- stale docs superseded by newer docs
- safe deletion candidates

4. Prove references before deleting anything:

```bash
rg -n "candidate-file-or-directory-name" apps/game apps/megameal
```

5. Add ignore rules only for local/generated reports that are not deployed
   runtime assets.
6. Remove only files that are both unreferenced and reproducible or explicitly
   obsolete.
7. Update cleanup docs so the next agent can understand what remains.

## Rules

- Do not use `git reset --hard`.
- Do not revert user work.
- Do not delete runtime assets referenced by manifests.
- Do not ignore generated assets that must ship with the static site.
- Do not hand-edit generated assets to make status cleaner.

## Acceptance Criteria

- `CRUFT_FILE_INVENTORY.md` reflects current ownership and dispositions.
- `CRUFT_TODO.md` lists remaining cleanup tasks with clear owners.
- Safe deletions, if any, are small and justified.
- Required generated runtime assets still pass drift and engine audits.
- The number of ambiguous/unclassified files is reduced.

## Validation

```bash
git status --short
pnpm --dir apps/game check:generated-drift
pnpm --dir apps/game audit:engine
pnpm --dir apps/game release:gate:quick
```

If generated runtime assets are changed:

```bash
pnpm --dir apps/game cook:runtime-assets
pnpm --dir apps/game check:generated-drift
```

## Handoff

Report:

- Starting and ending `git status --short | wc -l`.
- Files classified.
- Files removed, if any, with proof.
- `.gitignore` changes.
- Generated files regenerated.
- Remaining ambiguous files.
