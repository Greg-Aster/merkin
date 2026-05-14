# Wave 06: Editor Layout System Pass

This wave follows the Playwright layout audit of the current level editor after
the previous UX work. The editor has real visual improvements and a better
information architecture, but the shell layout still behaves like fixed overlay
panels instead of a mature game-editor workbench.

The goal of Wave 06 is to make the editor layout itself feel like a serious
authoring tool: compact top chrome, visible workspace navigation, resizable
docks, layout presets, and objective Playwright checks.

## Latest Playwright Evidence

Audited URL: `http://127.0.0.1:4322/?editor=1`

Screenshots captured during audit:

- `/tmp/merkin-editor-layout-1440x900.png`
- `/tmp/merkin-editor-layout-900x700.png`

Measured default `Scene` layout:

| Viewport | Top chrome stack | Body starts | Left dock | Right dock | Combined side chrome | Section select |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| `1920x1080` | `95px` | `115px` | `17.5%` | `17.5%` | `35.0%` | clipped |
| `1440x900` | `144px` | `164px` | `23.3%` | `23.3%` | `46.7%` | clipped |
| `1280x800` | `144px` | `162px` | `23.8%` | `23.8%` | `47.5%` | clipped |
| `1024x768` | `144px` | `162px` | `29.7%` | `29.7%` | `59.4%` | clipped |
| `900x700` | `139px` | `153px` | `46.2%` | `46.2%` | `92.4%` | visible but cramped |

Main source areas:

- `apps/game/src/threlte/editor/EditorPanel.svelte`
- `apps/game/src/threlte/editor/EditorPanelHeader.svelte`
- `apps/game/src/threlte/editor/EditorMainToolbar.svelte`
- `apps/game/src/threlte/editor/EditorPanelToolsDock.svelte`
- `apps/game/src/threlte/editor/EditorPanelTabRail.svelte`
- `apps/game/src/threlte/editor/EditorSideStackHost.svelte`
- `apps/game/src/threlte/editor/editorStore.ts`
- `apps/game/scripts/editor-ux-smoke-browser.mjs`

## Problems To Solve

1. **Top chrome is stacked and inefficient.**
   File/Edit/Window live in one floating block, header toggles live in another,
   and tool controls wrap into a full second row. At common laptop widths the
   editor loses about `144px` before the body even starts.

2. **Docks are fixed and cannot be resized or moved.**
   The shell grid hard-codes left and right columns. At `1024x768`, side chrome
   consumes almost `60%` of the viewport. At `900x700`, the dock column consumes
   almost the entire right half of the screen.

3. **Section navigation is nearly invisible.**
   The most important editor navigation is a tiny select squeezed into a
   `48px` column on desktop/laptop. It clips from `1920` through `1024`.

4. **The viewport is still secondary.**
   The canvas is full-screen, but the usable editing viewport is the leftover
   space between fixed chrome rather than a protected primary region.

5. **Responsive behavior stacks docks instead of adapting intent.**
   At tablet-ish widths, tools/outliner/details stack in a narrow right column.
   The user cannot choose which dock matters, resize it, or switch layouts.

## Wave 06 Briefs

1. `AGENT_25_UNIFIED_TOP_CHROME.md`
2. `AGENT_26_VISIBLE_WORKSPACE_NAVIGATION.md`
3. `AGENT_27_RESIZABLE_DOCK_LAYOUT.md`
4. `AGENT_28_RESPONSIVE_LAYOUT_PRESETS.md`
5. `AGENT_29_LAYOUT_VERIFICATION_GATE.md`
6. `AGENT_30_LAYOUT_DOC_SYNC.md`

Recommended order:

1. Agent 25 compacts the top chrome.
2. Agent 26 makes workspace navigation visible and usable.
3. Agent 27 introduces resizable dock sizing and persistence.
4. Agent 28 adds layout presets and responsive rules.
5. Agent 29 adds objective Playwright checks.
6. Agent 30 updates the docs/inventory after implementation lands.

Agents 25 and 26 may work in parallel if they coordinate shared top-shell CSS.
Agents 27 and 28 should not both rewrite `EditorPanel.svelte` at the same time.
Agent 29 should wait until the target layout has mostly stabilized.

## Non-Negotiable Outcomes

- At `1440x900`, the editor body should start at or above `120px`.
- At `1280x800`, the editor body should start at or above `120px`.
- Section/workspace navigation must be readable at `1440`, `1280`, and `1024`
  widths.
- Docks must be resizable by the user on desktop/laptop.
- Dock sizing must persist across reloads.
- At `1024x768`, combined side chrome should not exceed `45%` by default.
- At `900x700`, only one right-side dock group should be open by default unless
  the user explicitly selects a split/pinned layout.
- The viewport must remain usable even when tools, outliner, and details are all
  enabled.

## Verification

Run at minimum after code changes:

```bash
pnpm --dir apps/game type-check
pnpm --dir apps/game exec node ./scripts/editor-ux-smoke.mjs --no-server
```

Agent 29 should also make the package smoke path reliable if it owns related
checks:

```bash
pnpm --dir apps/game smoke:editor-ux --no-server
```

Every implementation handoff must include:

- screenshots or Playwright metrics for `1440x900`, `1280x800`, `1024x768`, and
  `900x700`
- top chrome stack height
- body top
- left/right dock width percentages
- whether the section nav is clipped
- whether dock sizes persisted after reload
