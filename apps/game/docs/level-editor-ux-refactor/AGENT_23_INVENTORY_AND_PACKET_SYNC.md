# Agent 23: Inventory And Packet Sync

## Goal

Bring the docs back into alignment after Agents 21, 22, and 24 land. The feature
inventory currently contains stale pre-Agent-17 language and old workspace
density counts.

## Current Stale Areas

`EDITOR_FEATURE_INVENTORY.md` still says:

- command palette is pre-Agent-17 blocked
- package smoke is pre-Agent-18 blocked
- workspace counts are the older Wave 04 numbers:
  - Create `79`
  - World `93`
  - Build `61`

The latest verified state before Wave 05:

- Command palette works through focused Playwright.
- Direct smoke passes.
- Package-script smoke still fails.
- Current counts:
  - Initial Scene `41`
  - Create `46`
  - World `42`
  - Collision `53`
  - Build `61`
  - AI Lab `39`

Relevant docs:

- `apps/game/docs/level-editor-ux-refactor/README.md`
- `apps/game/docs/level-editor-ux-refactor/EDITOR_FEATURE_INVENTORY.md`
- `apps/game/docs/level-editor-ux-refactor/WAVE_04_VERIFICATION_REPAIR_README.md`
- `apps/game/docs/level-editor-ux-refactor/WAVE_05_COMPLETION_README.md`

## Required Work

1. Update `EDITOR_FEATURE_INVENTORY.md` after the code fixes land.
   It should state:
   - whether command palette is fixed
   - whether package smoke is fixed
   - final workspace counts
   - remaining UX backlog, if any

2. Update the packet README.
   It should point current agents at Wave 05 for completion work, not Wave 04.

3. Do not rewrite historical audit sections as if they never happened.
   Preserve history, but label old facts as old. Add a current-state section
   near the top.

4. Remove stale blocker text.
   If Agent 21 passes, do not leave package smoke listed as blocked.
   If Agent 22 passes, do not leave old density counts as current.

5. Keep docs actionable.
   Future agents should be able to answer:
   - Which command should I run?
   - Which editor areas are still risky?
   - Which workspace owns which job?
   - What counts were last verified?

## Acceptance Criteria

- README points to Wave 05 as the current completion packet.
- Inventory has no stale pre-Agent-17 command-palette blocker language.
- Inventory has no stale workspace-count table.
- Inventory identifies any remaining failures from the final verification gate.
- Docs distinguish historical evidence from current state.

## Verification Commands

Docs-only changes do not need a build, but run:

```bash
git diff --check -- apps/game/docs/level-editor-ux-refactor
```

If code changed in the same PR, also run:

```bash
pnpm --dir apps/game type-check
```

## Handoff Notes

Report:

- Docs changed.
- Current command palette status.
- Current package smoke status.
- Final workspace count table.
- Any remaining known docs drift.
