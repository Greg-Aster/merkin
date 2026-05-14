# Agent 19: Feature Inventory Refresh

## Goal

Refresh the editor feature inventory so future agents work from current facts.
The current inventory still describes pre-Wave-04 blockers and claims the
`smoke:editor-ux` package script is missing, even though it now exists.

## Evidence

Stale note:

```txt
The brief recommends pnpm --dir apps/game smoke:editor-ux -- --no-server,
but smoke:editor-ux is not present in the current apps/game/package.json.
```

Current reality:

- `apps/game/package.json` has `smoke:editor-ux`.
- Direct node smoke passes.
- Package-script smoke invocation still needs Agent 18.
- The visible editor tabs are now `Scene`, `Create`, `World`, `Collision`,
  `Build`, and `AI Lab`.
- The old visible `Workflow` tab is gone.
- The command palette exists but needs Agent 17 to fix pointer interaction.

Relevant docs:

- `apps/game/docs/level-editor-ux-refactor/EDITOR_FEATURE_INVENTORY.md`
- `apps/game/docs/level-editor-ux-refactor/README.md`
- `apps/game/docs/level-editor-ux-refactor/WAVE_03_DEEP_EDITOR_REDESIGN_README.md`
- `apps/game/docs/level-editor-ux-refactor/WAVE_04_VERIFICATION_REPAIR_README.md`

## Required Work

1. Update `EDITOR_FEATURE_INVENTORY.md`.
   It should clearly distinguish:
   - old Wave 03 audit facts
   - current Wave 04 verified state
   - remaining blockers

2. Correct smoke script status.
   The inventory must not say `smoke:editor-ux` is absent. It should say the
   package script exists but was unreliable until Agent 18 fixes or verifies it.

3. Update current locations.
   Replace obsolete references to visible `Workflow` locations where the
   feature has moved into `Build`, `Create`, `AI Lab`, command palette, header,
   or diagnostics.

4. Preserve useful capability data.
   Do not delete the inventory table just because it is stale. Update statuses
   and current-location labels so the document remains useful for future agents.

5. Add a short verification snapshot.
   Include the latest measured workspace control counts and explain that those
   counts are a UX-density backlog, not a smoke failure.

## Acceptance Criteria

- No line in the inventory claims `smoke:editor-ux` is missing.
- The inventory mentions the command palette click blocker until Agent 17 lands.
- The inventory mentions package-script smoke reliability until Agent 18 lands.
- Visible current workspace names match the implementation.
- The document tells agents what still needs product/UX reduction work.

## Verification Commands

Docs-only changes do not need a full build, but run at least:

```bash
pnpm --dir apps/game type-check
```

If Agent 18 has landed, also run:

```bash
pnpm --dir apps/game smoke:editor-ux --no-server
```

## Handoff Notes

Report:

- Docs changed.
- Whether the inventory is pre-Agent-17, post-Agent-17, pre-Agent-18, or
  post-Agent-18.
- Any inventory rows that still need deeper manual verification.
