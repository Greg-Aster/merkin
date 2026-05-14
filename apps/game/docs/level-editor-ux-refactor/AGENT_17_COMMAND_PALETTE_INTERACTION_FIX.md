# Agent 17: Command Palette Interaction Fix

## Goal

Make the command palette a real, reliable editor command surface. It currently
opens and filters, but pointer interaction is broken because the palette is
mounted inside an editor shell with `pointer-events: none`.

## Evidence

Focused Playwright audit against `http://127.0.0.1:4322/?editor=1` found:

- `Ctrl+K` opens the command palette.
- Searching `asset library` filters to one command: `Open Asset Library`.
- The command button is visible and enabled.
- `document.elementFromPoint()` at the command center returns the Three.js
  canvas, not the button.
- The dialog and command button both compute to `pointer-events: none`.
- Playwright click times out because the canvas intercepts the pointer event.

Relevant source:

- `apps/game/src/threlte/editor/EditorPanel.svelte`
- `apps/game/src/threlte/editor/EditorCommandPalette.svelte`
- `apps/game/src/threlte/editor/editorCommandRegistry.ts`

## Required Fix

1. Restore pointer events for the command palette surface.
   The backdrop, dialog, search input, close button, command list, and command
   buttons must be pointer-interactive even though `.editor-shell` is
   pointer-transparent.

2. Preserve viewport interaction outside the palette.
   Do not make the entire editor shell pointer-active. Only the palette and
   normal dock regions should receive pointer events.

3. Make keyboard execution work.
   At minimum:
   - `Escape` closes the palette.
   - `Ctrl+K` opens the palette.
   - Searching filters commands.
   - Pressing `Enter` on a focused enabled command should run it, or the focused
     button should be naturally keyboard-activatable.

4. Verify a real command route.
   `Open Asset Library` must switch the active workspace to `Create`.

5. Keep the fix narrow.
   Do not redesign the palette or command registry in this brief. This is an
   interaction correctness task.

## Suggested Implementation

- Set `pointer-events: auto` on `.command-palette-backdrop` and
  `.command-palette`.
- Confirm child elements no longer inherit `pointer-events: none`.
- If needed, add an explicit wrapper outside the shell pointer-transparent
  region, but prefer the smallest CSS fix first.
- Consider focusing the search field on open and the first enabled command after
  arrow navigation only if it can be done without broad scope.

## Acceptance Criteria

- Playwright can click `Open Asset Library` from the command palette without
  `force: true`.
- The active editor section becomes `create` after that click.
- The command palette closes after running the command.
- The canvas is not the hit-test target for visible palette controls.
- No new global CSS file is required for this fix.

## Verification Commands

Run:

```bash
pnpm --dir apps/game type-check
pnpm --dir apps/game exec node ./scripts/editor-ux-smoke.mjs --no-server
```

Also run or add a focused Playwright check equivalent to:

```txt
open /?editor=1
press Ctrl+K
fill Search commands with "asset library"
click Open Asset Library
assert .editor-tab-picker select value is "create"
```

## Handoff Notes

Report:

- Files changed.
- Whether any CSS surface area was added or modified.
- Exact Playwright or smoke command used.
- Whether pointer hit-testing now returns a palette element instead of `canvas`.
