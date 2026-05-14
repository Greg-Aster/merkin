# Agent 30: Layout Doc Sync

## Goal

Update the level editor UX docs and feature inventory after the Wave 06 layout
system work lands. The docs should reflect the current layout behavior, not the
pre-Wave-06 audit problems.

## Required Work

1. Update `EDITOR_FEATURE_INVENTORY.md`.
   Add a current layout state section with:
   - top chrome height/body top metrics
   - dock sizing model
   - workspace navigation pattern
   - layout preset list
   - verification command status

2. Update `README.md`.
   Keep Wave 06 as current until all Wave 06 work is complete. If all work is
   complete, mark the packet as complete and point future agents to the final
   verification gate.

3. Preserve historical evidence.
   Do not delete Wave 04/Wave 05/Wave 06 audit facts. Label old facts as old so
   future agents can understand why the current layout exists.

4. Document user-facing behavior.
   Explain:
   - how to resize docks
   - how dock sizing persists
   - how to reset layout
   - how to switch layout presets
   - how workspace navigation behaves on desktop vs tablet

5. Update verification instructions.
   Include the exact final commands:

```bash
pnpm --dir apps/game type-check
pnpm --dir apps/game exec node ./scripts/editor-ux-smoke.mjs --no-server
```

   Add any new layout smoke command created by Agent 29.

## Acceptance Criteria

- No doc claims the tiny clipped Section select is current if it has been fixed.
- No doc claims docks are fixed if Agent 27 has landed.
- Current screenshots/metrics are represented in the inventory.
- README points to the right active/final wave.
- Docs distinguish current state from historical audit findings.

## Verification Commands

Docs-only changes:

```bash
git diff --check -- apps/game/docs/level-editor-ux-refactor
```

If code is included in the same PR:

```bash
pnpm --dir apps/game type-check
```

## Handoff Notes

Report:

- Docs changed.
- Final layout metrics copied into docs.
- Final verification commands copied into docs.
- Any known doc drift still remaining.
