# Agent 26: Visible Workspace Navigation

## Goal

Make workspace/section navigation obvious, readable, and first-class. The current
Section select contains most editor workspaces but is squeezed into a tiny
`48px` rail on desktop/laptop, so the most important navigation is effectively
hidden.

## Current Evidence

Latest Playwright audit:

| Viewport | Tab rail width | Select width | Select scroll width | Clipped |
| --- | ---: | ---: | ---: | --- |
| `1920x1080` | `68px` | `48px` | `64px` | yes |
| `1440x900` | `68px` | `48px` | `64px` | yes |
| `1280x800` | `62px` | `48px` | `64px` | yes |
| `1024x768` | `62px` | `48px` | `64px` | yes |
| `900x700` | `414px` | `344px` | `342px` | no |

Relevant files:

- `apps/game/src/threlte/editor/EditorPanelTabRail.svelte`
- `apps/game/src/threlte/editor/EditorPanelToolsDock.svelte`
- `apps/game/src/threlte/editor/editorPanelTabs.ts`
- `apps/game/src/threlte/editor/EditorPanel.svelte`

## Required Work

1. Replace the tiny desktop select with visible workspace navigation.
   Acceptable patterns:
   - horizontal tabs across the top of the tool dock
   - a wider left rail with icon + label
   - a compact toolbar-level workspace switcher with visible active label

   Do not keep the active workspace hidden in a `48px` select.

2. Keep all six workspaces readable:
   - `Scene`
   - `Create`
   - `World`
   - `Collision`
   - `Build`
   - `AI Lab`

3. Preserve keyboard/screen-reader accessibility.
   Use real buttons, tabs, or select semantics. If using custom tabs, include
   appropriate `aria-current`, `aria-selected`, `role=tablist`/`role=tab`, or a
   similarly accessible pattern.

4. Keep the active workspace unmistakable.
   The user should be able to identify the active workspace in under one
   second, without reading a clipped select.

5. Avoid using emoji as the only durable signal.
   Icons are acceptable, but labels must be visible at desktop/laptop widths.

6. Preserve mobile/tablet behavior.
   At narrow widths, a select is acceptable if it is full-width and readable.

## Suggested Implementation Direction

- Refactor `EditorPanelTabRail.svelte` into adaptive navigation:
  - desktop/laptop: visible tab buttons with labels
  - narrow/tablet: full-width select or horizontally scrollable segmented tabs
- Consider placing the workspace nav above `.editor-tab-content` rather than in
  a `4rem` side rail.
- Remove the current hard dependency on
  `grid-template-columns: 4.25rem minmax(0, 1fr)` in
  `EditorPanelToolsDock.svelte` if it forces the navigation to be unreadable.

## Acceptance Criteria

- At `1440x900`, no workspace label is clipped.
- At `1280x800`, no workspace label is clipped.
- At `1024x768`, the active workspace label is readable.
- The active workspace is visually distinct.
- Switching workspace remains functional.
- Direct editor smoke passes.
- Workspace density counts do not increase meaningfully from the current state.

## Verification Commands

Run:

```bash
pnpm --dir apps/game type-check
pnpm --dir apps/game exec node ./scripts/editor-ux-smoke.mjs --no-server
```

Use Playwright to verify:

- all workspace labels are visible or the active workspace label is visible
- no clipped section select at `1440`, `1280`, and `1024`
- click each workspace and confirm the matching workspace section appears

## Handoff Notes

Report:

- Chosen navigation pattern.
- Files changed.
- Accessibility semantics used.
- Metrics for nav clipping/visibility at `1440`, `1280`, `1024`, and `900`.
- Any new CSS surface area.
