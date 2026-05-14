# Agent 27: Resizable Dock Layout

## Goal

Replace fixed left/right editor dock widths with user-resizable, persisted dock
sizes. The editor currently uses hard-coded grid column ranges, so docks consume
too much space on laptop/tablet widths and cannot be adjusted by the user.

## Current Evidence

Default dock width ratios:

| Viewport | Left dock | Right dock | Combined side chrome |
| --- | ---: | ---: | ---: |
| `1920x1080` | `17.5%` | `17.5%` | `35.0%` |
| `1440x900` | `23.3%` | `23.3%` | `46.7%` |
| `1280x800` | `23.8%` | `23.8%` | `47.5%` |
| `1024x768` | `29.7%` | `29.7%` | `59.4%` |
| `900x700` | `46.2%` | `46.2%` | `92.4%` |

Relevant source:

- `apps/game/src/threlte/editor/EditorPanel.svelte`
- `apps/game/src/threlte/editor/EditorPanelToolsDock.svelte`
- `apps/game/src/threlte/editor/EditorSideStackHost.svelte`
- `apps/game/src/threlte/editor/editorStore.ts`
- `apps/game/src/threlte/editor/editorSessionStore.ts`

## Required Work

1. Introduce explicit dock sizing state.
   Store at least:
   - left/tools dock width
   - right/side dock width
   - whether the user has customized the layout

2. Add resize handles.
   Users must be able to drag:
   - the edge between tools dock and viewport
   - the edge between viewport and right dock

   Handles must be visible enough to discover but not visually heavy.

3. Clamp sizes responsibly.
   Suggested defaults:
   - desktop left dock default: `320px`
   - desktop right dock default: `320px`
   - min dock width: `240px`
   - max dock width: `min(420px, 32vw)`
   - preserve a minimum viewport width, preferably `>= 45vw` on desktop/laptop

4. Persist user sizing.
   Use the existing editor/session storage pattern if available. Persisting in
   local storage is acceptable if it follows existing naming conventions and is
   isolated to editor layout preferences.

5. Add reset behavior.
   Provide a way to reset layout sizing, either through:
   - Window menu
   - layout preset menu
   - command palette command

6. Preserve collapsed panel behavior.
   If Tools or Details are hidden, grid columns should release space to the
   viewport. Reopening should restore the last user size.

## Suggested Implementation Direction

- Add layout state to `editorStore.ts` or a small dedicated editor layout store.
- Keep persistence separate from scene data. Dock widths are user/editor prefs,
  not level metadata.
- Use CSS variables on `.editor-shell` or `.editor-body`, e.g.
  `--editor-tools-width` and `--editor-side-width`.
- Keep pointer handling robust; dragging resize handles must not accidentally
  manipulate the Three.js viewport.

## Acceptance Criteria

- Left and right docks can be resized with pointer drag.
- Dock sizes persist after reload.
- Reset returns to sane defaults.
- At `1024x768`, combined side chrome is `<= 45%` by default.
- At `1440x900`, combined side chrome is `<= 42%` by default.
- The viewport remains usable with both docks open.
- Direct editor smoke passes.

## Verification Commands

Run:

```bash
pnpm --dir apps/game type-check
pnpm --dir apps/game exec node ./scripts/editor-ux-smoke.mjs --no-server
```

Use Playwright to verify:

1. Load editor.
2. Measure dock widths.
3. Drag left resize handle.
4. Drag right resize handle.
5. Reload page.
6. Confirm widths persisted within tolerance.
7. Reset layout.
8. Confirm defaults restored.

## Handoff Notes

Report:

- State/persistence keys added.
- Files changed.
- Default/min/max dock width decisions.
- Playwright measurements before/after drag/reload/reset.
- Any new CSS surface area.
