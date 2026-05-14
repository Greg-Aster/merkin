# Agent 08: Status HUD And Viewport Protection

## Mission

Reduce persistent chrome and protect the center viewport. The current toolbar and
docks are more organized than before, but the editor still uses the viewport as
a backdrop for large overlays.

## Current Evidence

At `1440x900`:

- Chrome coverage is about `0.458`.
- `EditorControlsOverlay` is `544x322`.
- The overlay still covers part of the viewport even after controls moved into
  `EditorMainToolbar`.

At `900x700`:

- `EditorControlsOverlay` is still `544x322`.
- It overlaps the usable editing area and competes with the tools/side panels.

## Primary Files

Own these files:

- `src/threlte/editor/EditorControlsOverlay.svelte`
- `src/threlte/editor/EditorMainToolbar.svelte`
- `src/threlte/editor/EditorPanel.svelte`
- optionally `src/threlte/editor/editorStore.ts` if a new visibility/collapse
  state is necessary

Coordinate with Agent 07 if changing responsive shell geometry.

## Required UX Outcome

The editor should have a protected central viewport region. Persistent overlays
should not occupy the center of the viewport by default.

The status HUD should become one of:

1. A compact bottom status bar.
2. A collapsible help drawer.
3. A context-sensitive tooltip/help panel only when requested.

The transform controls already live in `EditorMainToolbar`; the HUD should not
feel like a second tool panel.

## Implementation Guidance

1. Keep concise state visible:

   - current selection
   - mode/tool
   - collision overlay state
   - important modal-transform status

2. Move long shortcut help behind a toggle or into `Output`/help.

3. For `max-width: 900px`, default to compact mode:

   - no large shortcut legend
   - no wide `544px` overlay
   - no overlap with tools or side stack

4. If the HUD remains fixed, make it use the available viewport column and clamp
   its width to that column.

5. Consider whether `controlsOverlayOpen` should default false at small widths.
   If changing default behavior, preserve the Window menu toggle.

6. Avoid reintroducing transform buttons into the HUD. Those belong in
   `EditorMainToolbar`.

## Acceptance Criteria

- At `900x700`, the HUD does not overlap tools or side stack.
- At `900x700`, the HUD does not cover a large central viewport area.
- At `1440x900`, the HUD is visually subordinate to the viewport.
- Mode/selection status remains visible somewhere.
- Shortcut help remains accessible, but not always expanded.
- Window menu toggle for controls/status remains valid.

## Verification

Run:

```bash
pnpm --dir apps/game type-check
pnpm --dir apps/game smoke:editor-ux -- --no-server
```

Manual Playwright inspection:

- `1440x900`: viewport remains dominant.
- `1280x800`: HUD does not cover the gizmo/central object by default.
- `900x700`: HUD is compact or collapsed and does not fight panel layout.
