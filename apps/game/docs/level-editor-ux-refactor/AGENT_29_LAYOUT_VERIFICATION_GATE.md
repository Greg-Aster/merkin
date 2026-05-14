# Agent 29: Layout Verification Gate

## Goal

Add objective Playwright checks that prevent regressions in the editor layout
system. The current smoke catches broad layout/canvas problems, but it does not
yet enforce the second-pass layout goals: compact top chrome, visible workspace
navigation, bounded dock ratios, resizable persistence, and responsive behavior.

## Required Work

1. Add or extend an automated layout audit.
   Acceptable options:
   - extend `apps/game/scripts/editor-ux-smoke-browser.mjs`
   - add `apps/game/scripts/editor-layout-smoke-browser.mjs`
   - add a package script such as `smoke:editor-layout`

   Prefer extending the existing editor UX smoke if it can stay readable.

2. Measure these metrics per viewport:
   - top chrome stack height
   - editor body top
   - left dock width percentage
   - right dock width percentage
   - combined side chrome percentage
   - section/workspace nav clipping
   - viewport/canvas nonblank state
   - whether all expected workspace labels are reachable

3. Test at minimum:
   - `1440x900`
   - `1280x800`
   - `1024x768`
   - `900x700`

4. Add pass/fail thresholds.
   Suggested thresholds after Agents 25-28:
   - `1440x900`: body top `<= 120px`
   - `1280x800`: body top `<= 120px`
   - `1024x768`: combined side chrome `<= 45%`
   - `900x700`: default layout does not show tools + outliner + details all as
     full fixed regions simultaneously
   - section nav not clipped at `1440`, `1280`, and `1024`

5. Add resize persistence test if Agent 27 has landed.
   Test flow:
   - measure default dock width
   - drag resize handle
   - reload
   - confirm width persisted
   - reset layout
   - confirm default restored

6. Add preset test if Agent 28 has landed.
   Confirm each preset changes workspace/dock state as expected.

## Acceptance Criteria

- Layout audit fails on the current pre-Wave-06 problem shape.
- Layout audit passes after Agents 25-28 land.
- Failure messages include viewport and exact metric.
- Screenshots are optionally written for debugging without making CI noisy.
- Existing direct editor UX smoke still passes.

## Verification Commands

Run:

```bash
pnpm --dir apps/game type-check
pnpm --dir apps/game exec node ./scripts/editor-ux-smoke.mjs --no-server
```

If adding a new script, run it explicitly and add it to this packet:

```bash
pnpm --dir apps/game smoke:editor-layout --no-server
```

If modifying package scripts, also verify the package command path:

```bash
pnpm --dir apps/game smoke:editor-ux --no-server
```

## Handoff Notes

Report:

- Script added/modified.
- Metrics collected.
- Thresholds enforced.
- Output from passing run.
- Any thresholds deferred and why.
