# Agent 09: Editor UX Smoke Overlap Assertions

## Mission

Strengthen `smoke:editor-ux` so it fails on the kind of visual overlap found in
the latest Playwright audit. The current smoke check passes even when the tablet
layout is visibly broken.

## Current Problem

The smoke check verifies region existence, viewport intersection, rough chrome
coverage, and canvas nonblank status. It does not detect:

- a child overflowing far outside its parent
- editor regions overlapping each other incoherently
- a tab rail taller than its tools panel
- status HUD overlapping interactive docks

## Primary Files

Own these files:

- `scripts/editor-ux-smoke-browser.mjs`
- `scripts/editor-ux-smoke.mjs` only if command args need adjustment
- `package.json` only if adding a new script variant

Do not change editor component layout unless coordinating with Agents 07/08.

## Required Assertions

Add layout checks for these cases.

### 1. Child Containment

For `tabRail` and `tabContent`:

- they should be contained by `tools` within a small tolerance, or
- if the intended design permits overflow, the overflow must be scroll-contained
  and not intersect another dock.

Suggested tolerance: `4px`.

### 2. Region Overlap

At all tested viewports, interactive docks should not incoherently overlap:

- tools vs sideStack
- tabRail vs outliner
- tabRail vs details
- controls overlay vs tools
- controls overlay vs sideStack

Some overlay may be acceptable only if it is intentionally non-interactive and
does not hide essential content. The smoke test should encode the actual intended
layout after Agents 07/08 finish.

### 3. Internal Overflow

Detect obvious uncontained overflow:

- `tabRail.scrollHeight > tabRail.clientHeight + 24` while `overflow-y` is
  `visible`.
- a region's children extend outside parent bounds and overlap sibling regions.

### 4. Chrome Coverage Budget

Keep the existing coverage check, but consider a stricter warning threshold:

- warn above `0.45`
- fail above `0.60`

Use warnings first if the team wants gradual adoption.

## Implementation Guidance

Add helper functions:

- `rectContains(parent, child, tolerance)`
- `rectOverlapArea(a, b)`
- `rectOverlapRatio(a, b)`
- `readStyle(selector)` for overflow/display/visibility

Print metrics for failures so follow-up agents can act quickly.

Do not make exact pixel dimensions brittle. Assert relationships:

- child within parent
- sibling docks do not overlap
- scrollable content has a scroll container
- essential controls remain visible

## Acceptance Criteria

- The current known `900x700` tab rail overflow would fail if Agent 07 has not
  fixed it.
- After Agent 07/08 fixes, smoke passes.
- Failure output names viewport, offending regions, and their rects.
- Existing canvas nonblank and console checks remain.

## Verification

Run:

```bash
pnpm --dir apps/game smoke:editor-ux -- --no-server
```

If the current layout is still unfixed when this agent runs, it is acceptable for
the smoke check to fail with the known overlap. In that case, document that the
test is correctly catching the defect and hand off to Agent 07/08.
