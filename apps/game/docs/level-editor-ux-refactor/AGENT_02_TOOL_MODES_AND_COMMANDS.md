# Agent 02: Tool Modes And Command Ownership

## Mission

Separate persistent editing tools from task workflows. The editor should open in
an object-editing mode with a clear toolbar, not in a mixed `Workflow` dashboard.

## Problem To Solve

The current default tab includes workflow template selection, selection actions,
AI actions, generated asset actions, save/load actions, and jobs. Transform,
lighting, terrain, collision, and viewport controls are duplicated across:

- header shading controls
- `EditorControlsOverlay.svelte`
- `EditorSceneTabHost.svelte`
- `EditorCollisionTabHost.svelte`
- tab rail categories

This makes the editor feel like a stack of feature panels instead of a level
authoring tool.

## Primary Files

Own these files:

- `src/threlte/editor/EditorPanelHeader.svelte`
- `src/threlte/editor/EditorControlsOverlay.svelte`
- `src/threlte/editor/EditorPanelTabRail.svelte`
- `src/threlte/editor/editorPanelTabs.ts`
- `src/threlte/editor/EditorWorkflowTabHost.svelte`
- `src/threlte/editor/EditorSceneTabHost.svelte`
- `src/threlte/editor/EditorCollisionTabHost.svelte`
- `src/threlte/editor/editorPanelPropBuilders.ts`

Coordinate with Agent 01 if shell layout is in progress.

## Desired UX

Persistent tool controls should include:

- Select/move/rotate/scale.
- World/local transform space.
- Axis constraints.
- Snapping controls.
- View/render mode.
- Collision overlay toggle.
- Terrain sculpt mode and brush settings only when terrain mode is active.

Task workflows should move out of the primary editing tab:

- AI generate/retexture.
- Save/load/publish.
- Bake/cook.
- Job refresh.
- Asset library import.

## Suggested Refactor

1. Introduce `EditorMainToolbar.svelte` or equivalent.
2. Make tool mode state explicit in one place:
   - object edit
   - terrain sculpt
   - collision authoring/debug
   - play/spawn preview if applicable
3. Keep menu access for commands but give each command one primary region.
4. Retire `Workflow` as the default tab. It may become `Automation`, `Jobs`, or
   be split across Agent 03 and Agent 05 work.
5. Reduce `EditorControlsOverlay.svelte` to a compact status/help strip or move
   its controls into the toolbar.
6. Align labels:
   - avoid having both `Render/Solid/Wire` and `Rendered/Workbench` if they
     control related concepts.
   - distinguish viewport shading from lighting mode if both remain.

## Command Ownership Matrix

Use this as the intended final home:

- Save, Save As, Load, Publish: menu + Save/Publish workflow surface.
- Undo/Redo/Select All/Duplicate/Delete: menu + keyboard + optional toolbar.
- Transform modes and snapping: main toolbar/tool settings.
- View/shading/collision overlay: viewport toolbar/tool settings.
- Outliner visibility/selectability/isolation: outliner.
- AI generation and jobs: AI/workflow surface.
- Asset import/add: content browser/create surface.
- Terrain bake/cook: pipeline/status or collision/terrain workflow surface.

## Acceptance Criteria

- The default editor surface is object/scene editing, not a mixed workflow list.
- Transform and viewport controls have one clear primary home.
- `Workflow` no longer contains unrelated commands that belong to save, assets,
  AI, or pipeline status.
- Keyboard shortcuts still work.
- Existing tab hosts may remain, but their responsibilities are narrower.

## Verification

Run:

```bash
pnpm --dir apps/game type-check
```

Use Playwright to inspect visible buttons on first editor load. The initial
surface should not expose dozens of unrelated workflow buttons.
