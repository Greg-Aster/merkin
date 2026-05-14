# Agent 07: Tablet Docks And Tab Rail Containment

## Mission

Fix the current `900x700` layout failure where the tab rail overflows through the
tools panel and overlaps the side stack. This is the highest-priority next edit
because the smoke check passes while the UI is visibly broken.

## Current Evidence

At `900x700`:

- `.editor-tools-panel`: `x=476 y=192 w=416 h=247`
- `.editor-tab-rail`: `x=477 y=193 w=59 h=667`
- `.editor-tab-content`: `x=536 y=193 w=355 h=382`
- `.editor-side-stack`: `x=476 y=445 w=416 h=247`

The tools panel is only 247px high, but the tab rail is 667px high. It escapes
the tools panel and visually collides with outliner/details.

## Primary Files

Own these files:

- `src/threlte/editor/EditorPanel.svelte`
- `src/threlte/editor/EditorPanelToolsDock.svelte`
- `src/threlte/editor/EditorPanelTabRail.svelte`
- only if needed: `src/threlte/editor/editorPanelTabs.ts`

Coordinate with Agent 08 if it is changing the status HUD or viewport shell.

## Required UX Outcome

Below `900px`, the tab rail must not be a tall left rail inside a short panel.
Choose one of these approaches:

1. Horizontal tabs across the top of the tools panel.
2. Icon-only horizontal scroll strip.
3. Collapsed section switcher/dropdown with the active panel below.

The chosen approach must keep all tabs reachable without spilling outside the
tools panel.

## Implementation Guidance

1. Give `.editor-tools-panel` a responsive layout that changes from:

   ```txt
   desktop: vertical rail + content
   tablet: horizontal rail + content
   ```

2. In tablet mode, ensure:

   - `.editor-tab-rail` has `overflow-x: auto` if needed.
   - `.editor-tab-rail` does not exceed the panel height.
   - `.editor-tab-content` gets the remaining panel height.
   - panel children cannot visually overlap side-stack children.

3. If using a horizontal rail, labels may be shortened but `aria-label` and
   `title` should preserve full names.

4. Keep the desktop layout intact unless it is necessary to simplify shared CSS.

5. Avoid adding JS layout measurements. This should be solvable with CSS grid,
   flex, min-height, and overflow.

## Acceptance Criteria

- At `900x700`, `.editor-tab-rail` is fully contained within `.editor-tools-panel`.
- At `900x700`, the tools panel does not overlap `.editor-side-stack`.
- At `900x700`, every tab is reachable.
- At `1280x800` and `1440x900`, the editor remains at least as usable as before.
- No runtime scene JSON, collision data, or generated assets change.

## Verification

Run:

```bash
pnpm --dir apps/game type-check
pnpm --dir apps/game smoke:editor-ux -- --no-server
```

Manual Playwright inspection:

- capture `900x700`
- verify tab rail bounds are inside tools panel bounds
- verify side stack starts below or beside the tools panel without overlap
- verify the active tab content scrolls internally

## Suggested Smoke Assertion For Agent 09

After this fix, Agent 09 should be able to assert:

```txt
tabRail.top >= tools.top
tabRail.bottom <= tools.bottom + tolerance
tabRail.left >= tools.left
tabRail.right <= tools.right + tolerance
```
