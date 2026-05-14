# Agent 06: Verification And UX Audit Harness

## Mission

Add or update verification so editor UX regressions are visible before handoff.
This agent should not own production layout changes unless they are small fixes
needed to make the tests meaningful.

## Problem To Solve

The audit required ad hoc Playwright scripts to measure layout. The repo has
boot and visual smoke scripts, but the level editor needs explicit checks for
workspace regions, reachability, and responsive behavior.

## Primary Files

Own test/script/docs files first:

- `scripts/boot-check-browser.mjs`
- `scripts/editor-ux-smoke.mjs`
- `scripts/editor-ux-smoke-browser.mjs`
- `scripts/visual-smoke.mjs`
- `scripts/visual-smoke-browser.mjs`
- `scripts/smoke-check.mjs`
- package scripts in `apps/game/package.json` if adding a new command
- this docs packet if acceptance criteria change

Avoid changing editor components unless coordinating with the owning agent.

## Desired Checks

Add an editor UX smoke check that loads:

```txt
/?editor=1
```

At minimum inspect these viewports:

- `1440x900`
- `1280x800`
- `900x700`

Check:

- `.editor-shell` is visible.
- main canvas is nonblank.
- header/menu is visible and inside viewport.
- outliner, details, tools/content/status regions are reachable when open.
- no editor region starts below the viewport without a visible drawer/handle.
- the initial editor surface does not expose a giant mixed workflow dashboard.
- there are no console errors.

## Suggested Metrics

Collect and print:

- region bounding boxes
- visible button count in initial surface
- active panel scroll height vs client height
- viewport coverage by editor chrome
- warnings/errors from console

Do not make the test brittle on exact pixel values unless the shell has explicit
design tokens. Prefer threshold checks:

- viewport should retain a meaningful central area
- no open region should be entirely outside the viewport
- scrollable panels should have internal scrolling

## Acceptance Criteria

- A single command can run the editor UX smoke check locally.
- The command reports actionable region metrics.
- Failures identify which viewport and region failed.
- The check can run in CI or local headless Playwright.
- Existing boot/visual smoke behavior remains intact.

## Editor UX Smoke Command

```bash
pnpm --dir apps/game smoke:editor-ux
```

The command starts the game dev server unless `GAME_NO_SERVER=1` or
`--no-server` is set, then runs a headless Playwright check against
`/?editor=1`. It reports per-viewport region boxes, visible editor button count,
active panel scroll metrics, editor chrome coverage, canvas visual metrics, and
console warnings. Console errors, unreachable editor regions, blank canvas
captures, or over-dense initial editor chrome fail the command.

## Verification

Run:

```bash
pnpm --dir apps/game type-check
pnpm --dir apps/game smoke:boot
pnpm --dir apps/game smoke:editor-ux
pnpm --dir apps/game smoke:visual
```

If a new script is added, document the command in `apps/game/package.json` and in
this packet.
