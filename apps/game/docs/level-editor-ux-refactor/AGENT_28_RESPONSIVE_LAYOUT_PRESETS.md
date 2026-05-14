# Agent 28: Responsive Layout Presets

## Goal

Add intentional layout presets and responsive behavior so the editor adapts to
different jobs and viewport sizes instead of always showing fixed tools,
outliner, and details columns.

## Current Evidence

At `900x700`, the editor stacks tools, outliner, and details in a right column:

- tools panel: `416px` wide, `266px` tall
- side stack: `416px` wide, `266px` tall
- outliner: `130px` tall
- details: `130px` tall
- combined side chrome ratio: `92.4%`

This leaves the viewport as leftover space and makes each dock cramped.

Relevant files:

- `apps/game/src/threlte/editor/EditorPanel.svelte`
- `apps/game/src/threlte/editor/EditorPanelHeader.svelte`
- `apps/game/src/threlte/editor/EditorSideStackHost.svelte`
- `apps/game/src/threlte/editor/EditorPanelToolsDock.svelte`
- `apps/game/src/threlte/editor/editorStore.ts`
- `apps/game/src/threlte/editor/editorCommandRegistry.ts`

## Required Work

1. Add layout presets.
   Minimum presets:
   - `Default`: balanced tools + side dock
   - `Create`: larger tools/content area, compact details
   - `Collision`: viewport + collision tools, optional side dock
   - `Build`: build/output focused, side dock minimized
   - `Minimal Viewport`: hides nonessential docks

2. Expose presets in the UI.
   Acceptable routes:
   - Window menu
   - compact top-chrome layout menu
   - command palette

   Prefer both a visible menu and command palette entries.

3. Define responsive behavior.
   At tablet-ish widths (`<= 1024px` or similar):
   - do not show tools, outliner, and details all as fixed visible regions by
     default
   - allow one primary dock group open at a time unless user pins/splits layout
   - keep viewport area protected

4. Preserve user agency.
   Users should be able to reopen/pin tools, outliner, and details. Responsive
   defaults should not permanently hide functionality.

5. Integrate with resizable docks from Agent 27.
   Presets should set dock widths and open/closed state. User resize after
   choosing a preset should persist until reset or another preset selection.

6. Keep presets separate from level data.
   Layout presets are editor user preferences, not scene metadata.

## Suggested Implementation Direction

- Add `editorLayoutPreset` to editor layout state.
- Add commands:
  - `layout-default`
  - `layout-create`
  - `layout-collision`
  - `layout-build`
  - `layout-minimal-viewport`
  - `layout-reset`
- Wire Window menu to these commands.
- Consider small visible labels in top chrome: current layout preset and active
  workspace.

## Acceptance Criteria

- Presets are selectable from UI.
- Presets are discoverable in command palette.
- `Minimal Viewport` hides or minimizes both side docks and gives the viewport
  clear dominance.
- `Create` opens Create workspace and prioritizes the tools/content dock.
- `Collision` opens Collision workspace and keeps viewport/collision overlay
  work central.
- At `900x700`, default layout shows no more than one right-side dock group.
- Direct editor smoke passes.

## Verification Commands

Run:

```bash
pnpm --dir apps/game type-check
pnpm --dir apps/game exec node ./scripts/editor-ux-smoke.mjs --no-server
```

Use Playwright to verify each preset:

| Preset | Active workspace | Tools visible | Side visible | Body/viewport usable | Pass |
| --- | --- | --- | --- | --- | --- |
| Default |  |  |  |  |  |
| Create | Create |  |  |  |  |
| Collision | Collision |  |  |  |  |
| Build | Build |  |  |  |  |
| Minimal Viewport |  |  |  |  |  |

## Handoff Notes

Report:

- Presets added.
- Commands added.
- Default behavior at `1440`, `1280`, `1024`, and `900`.
- Persistence/reset behavior.
- Any new CSS surface area.
