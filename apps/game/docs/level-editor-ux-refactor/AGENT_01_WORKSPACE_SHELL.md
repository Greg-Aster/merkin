# Agent 01: Workspace Shell And Docking

## Mission

Replace the current collection of fixed overlays with a stable editor workspace
shell. This is the highest-priority UX refactor because all other improvements
depend on a predictable region model.

## Problem To Solve

The current shell makes separate fixed elements compete over the canvas:

- `EditorPanelHeader.svelte` is fixed across the top.
- `EditorPanelToolsDock.svelte` is fixed on the right at desktop and becomes
  static below `1280px`.
- `EditorSideStackHost.svelte` is fixed above the tools dock.
- `EditorPropertiesDock.svelte` is fixed separately to the left of the tools dock.
- `EditorControlsOverlay.svelte` is a large bottom-left overlay.

At `1280x800` and `900x700`, panels stack below the visible canvas. The viewport
is not treated as the main region.

## Primary Files

Own these files:

- `src/threlte/editor/EditorPanel.svelte`
- `src/threlte/editor/EditorPanelHeader.svelte`
- `src/threlte/editor/EditorPanelToolsDock.svelte`
- `src/threlte/editor/EditorSideStackHost.svelte`
- `src/threlte/editor/EditorOutlinerDock.svelte`
- `src/threlte/editor/EditorPropertiesDock.svelte`

Avoid changing tab internals except where required to fit the new shell.

## Desired UX

Implement a single workspace frame with stable regions:

- Top menu/header.
- Left or top toolbar/tool settings.
- Center viewport remains visible and dominant.
- Right side outliner/details stack on desktop.
- Bottom content/status area may be collapsed.
- Laptop/tablet widths use drawers or tabbed side panels that remain reachable
  inside the viewport height.

The shell should feel closer to Unity/Unreal/Blender:

- The viewport is the main editing area.
- Outliner and inspector are supporting docks.
- Panels are not scattered floating cards.
- Collapsible regions keep handles visible when hidden.

## Implementation Guidance

1. Introduce a shell component if useful, such as `EditorWorkspaceShell.svelte`.
2. Move region placement into that shell instead of each dock owning unrelated
   fixed positioning.
3. Keep panel open/closed state in `editorStore.ts`; do not create duplicate
   state just for layout.
4. Use CSS grid/flex with explicit region sizing.
5. Prefer viewport-relative max heights and internal scroll regions.
6. Avoid page scroll for editor chrome; scroll only inside dock contents.
7. Preserve existing component props and behavior while relocating components.

## Acceptance Criteria

- At `1440x900`, viewport is visually dominant and not covered by multiple large
  overlapping panels.
- At `1280x800`, every open region is reachable without falling below the visible
  viewport.
- At `900x700`, collapsed or drawer behavior keeps editor controls accessible.
- Outliner and inspector no longer independently fixed over the viewport in a way
  that fights the tools panel.
- Header/menu remains usable at all tested widths.
- No generated scene/runtime asset files change.

## Verification

Run:

```bash
pnpm --dir apps/game type-check
```

Run the editor and capture Playwright screenshots:

```bash
pnpm --dir apps/game dev
```

Viewports:

- `1440x900`
- `1280x800`
- `900x700`

Inspect:

- no off-screen outliner/details panels
- no duplicated vertical scroll traps
- no text overlap in header controls
- viewport still interactive
