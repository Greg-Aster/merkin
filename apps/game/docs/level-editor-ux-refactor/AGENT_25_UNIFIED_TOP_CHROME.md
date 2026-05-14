# Agent 25: Unified Top Chrome

## Goal

Replace the current stacked header + wrapped toolbar with a compact, unified top
chrome that keeps menu commands, command palette, panel toggles, and transform
tool settings accessible without consuming `140px+` of vertical space on common
viewports.

## Current Evidence

Default `Scene` layout:

- `1920x1080`: top chrome stack `95px`; body starts at `115px`.
- `1440x900`: top chrome stack `144px`; body starts at `164px`.
- `1280x800`: top chrome stack `144px`; body starts at `162px`.
- `1024x768`: top chrome stack `144px`; body starts at `162px`.
- `900x700`: top chrome stack `139px`; body starts at `153px`.

Problem source:

- `EditorPanel.svelte` uses `grid-template-rows: auto auto minmax(0, 1fr)`.
- `EditorPanelHeader.svelte` renders File/Edit/Window and header toggles as
  separate floating blocks.
- `EditorMainToolbar.svelte` wraps all tool settings into one full-width row
  below the header.

Relevant files:

- `apps/game/src/threlte/editor/EditorPanel.svelte`
- `apps/game/src/threlte/editor/EditorPanelHeader.svelte`
- `apps/game/src/threlte/editor/EditorMainToolbar.svelte`
- `apps/game/src/threlte/editor/editorCommandRegistry.ts`

## Required Work

1. Create a single top-chrome region.
   Merge the header row and main toolbar into one cohesive top bar or one
   primary row plus an optional compact tool-settings overflow. Avoid two
   full-width stacked strips by default.

2. Preserve existing command routes.
   File/Edit/Window menus, command palette, Details/Tools toggles, mode,
   interaction target, transform tool, space, axis, snapping, shading, lighting,
   and collision overlay must remain reachable.

3. Prioritize tool controls.
   The default visible top bar should show:
   - File/Edit/Window or equivalent menu entry
   - command palette
   - active mode/edit-playtest
   - active object tool
   - transform space/axis
   - snapping state
   - view/shading state
   - dock visibility controls

   Less-used numeric snap values can move behind a compact popover or secondary
   settings menu as long as they remain obvious and reachable.

4. Prevent toolbar wrapping from increasing shell height.
   If controls do not fit, use:
   - overflow menu
   - segmented compact groups
   - horizontally scrollable tool strip
   - responsive collapse into icon/short labels

   Do not allow uncontrolled wrapping that pushes the editor body down.

5. Keep menu popovers above the viewport and docks.
   Verify File/Edit/Window popovers still open and are not clipped by the
   unified top chrome.

## Suggested Implementation Direction

- Introduce an `EditorTopChrome.svelte` wrapper or refactor
  `EditorPanelHeader.svelte` to own top chrome composition.
- Let `EditorMainToolbar.svelte` expose smaller tool groups or accept a compact
  mode prop.
- Change `EditorPanel.svelte` shell rows from `auto auto minmax(0, 1fr)` to a
  single top-chrome row plus body.
- Keep CSS local to existing editor components; avoid broad global CSS.

## Acceptance Criteria

- At `1440x900`, body top is `<= 120px`.
- At `1280x800`, body top is `<= 120px`.
- At `1024x768`, body top is `<= 128px`.
- Top chrome does not wrap into an uncontrolled second row.
- File/Edit/Window menus still open and contain their existing actions.
- Command palette still opens with `Ctrl+K`.
- Transform/shading/snapping controls remain reachable.
- Direct editor smoke passes.

## Verification Commands

Run:

```bash
pnpm --dir apps/game type-check
pnpm --dir apps/game exec node ./scripts/editor-ux-smoke.mjs --no-server
```

Use Playwright to report:

| Viewport | Top chrome stack | Body top | Pass |
| --- | ---: | ---: | --- |
| `1440x900` |  |  |  |
| `1280x800` |  |  |  |
| `1024x768` |  |  |  |
| `900x700` |  |  |  |

## Handoff Notes

Report:

- Files changed.
- Which controls moved into overflow/popovers.
- New CSS surface area.
- Whether menu popovers and command palette were manually/Playwright verified.
