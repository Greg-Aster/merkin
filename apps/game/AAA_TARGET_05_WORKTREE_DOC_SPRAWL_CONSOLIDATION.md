# AAA Target 05 - Worktree And Document Sprawl Consolidation

## Goal

Reduce confusion from stale instruction docs, coordination files, generated leftovers, and unrelated dirty work while preserving active engine work and reproducible runtime assets.

## Current Evidence

- The worktree has hundreds of dirty entries.
- `CRUFT_TODO.md` says historical `AAA_*` docs still need consolidation after active workstreams land.
- Several older docs contain stale counts like `missingRecommendedSlots=325` or `355`, while the current backlog reports `289`.
- Runtime generated assets are valid outputs, but local report snapshots and stale coordination docs can create confusion.

## Primary Files

- `apps/game/CRUFT_TODO.md`
- `apps/game/CRUFT_FILE_INVENTORY.md`
- `apps/game/AAA_GRAPHICS_REFACTOR_TRACKER.md`
- `apps/game/AAA_*`
- `apps/game/reports/**`
- `apps/game/tmp/**`
- `apps/megameal/public/generated/runtime-game-assets/**`
- `.gitignore`

## Work Steps

1. Read root `AGENTS.md`, `apps/game/AGENTS.md`, `CRUFT_TODO.md`, and `AAA_GRAPHICS_REFACTOR_TRACKER.md`.
2. Capture the starting dirty count and grouped status:

```bash
git status --short | wc -l
git status --short
```

3. Classify entries into:
   - active engine source
   - generated runtime assets
   - source authoring assets
   - current instruction docs
   - stale instruction docs
   - ignored local reports
   - unrelated Megameal content
4. Do not delete generated runtime assets that are reproducible and currently referenced.
5. Consolidate stale docs only when their information is superseded by current tracker/docs.
6. Prefer marking stale docs as archived/superseded or moving them to a clear archive path over deleting uncertain context.
7. Update `CRUFT_TODO.md` with what was actually consolidated.

## Guardrails

- Do not revert user or agent work.
- Do not delete unknown source assets.
- Do not delete `manifest.previous.json`; it is rollback metadata.
- Do not edit unrelated Megameal content.
- Do not hand-edit generated runtime manifests to reduce status count.

## Acceptance Criteria

- Stale docs are clearly consolidated, archived, or marked superseded.
- Current docs point to one source of truth.
- Dirty worktree categories are clearer than before.
- Any deletion is proven safe with references/search results.

## Validation

```bash
pnpm --dir apps/game check:generated-drift
pnpm --dir apps/game audit:engine
git status --short | wc -l
```

For doc-only consolidation, lint/type-check are optional unless source files change.

## Handoff

Report:

- Starting and ending dirty counts.
- Files archived, deleted, or marked superseded.
- Proof for any deletion.
- Generated asset impact.
- Unrelated work intentionally left alone.
- Commands run.
