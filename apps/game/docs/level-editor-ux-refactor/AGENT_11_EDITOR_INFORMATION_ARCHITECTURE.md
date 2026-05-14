# Agent 11: Editor Information Architecture

## Mission

Define and implement the editor's top-level navigation model. This is not a CSS
task. The goal is to replace a feature-history tab list with a task-based editor
structure.

## Problem

The current tabs expose implementation history:

- Workflow
- Scene
- Collision
- Environment
- Player
- Create
- Inspect
- Style
- AI Mesh
- Save

This makes users hunt through features instead of following editor jobs. The
`Workflow` tab is especially harmful because it mixes unrelated command families.

## Target Workspaces

Create a stable top-level model:

- `Scene`: hierarchy, selection, transform, object details.
- `Create`: primitives, prefabs, content browser, asset preview/add.
- `World`: environment, player spawn, terrain, gameplay helpers.
- `Collision`: collision policy, authoring, review, debug overlay, bake entry.
- `Build`: save, validation, bake/cook, publish, diagnostics summary.
- `AI Lab`: Comfy/Hunyuan jobs, prompts, generated outputs, experimental tools.

Exact names can vary, but the mental model must remain task-based.

## Primary Files

Likely ownership:

- `src/threlte/editor/editorPanelTabs.ts`
- `src/threlte/editor/EditorPanel.svelte`
- `src/threlte/editor/EditorPanelTabRail.svelte`
- `src/threlte/editor/EditorPanelToolsDock.svelte`
- `src/threlte/editor/editorPanelPropBuilders.ts`
- tab host components as needed

Coordinate with Agent 16 because both agents touch tab ownership.

## Implementation Requirements

1. Replace `Workflow` as the default workspace.
2. Make `Scene` the default, or create a focused `Scene`/`Edit` workspace.
3. Move environment/player/terrain under `World`, not separate peer tabs unless
   there is a strong reason.
4. Move save/publish/bake/output under `Build`.
5. Move all AI/Comfy/Hunyuan controls under `AI Lab`.
6. Keep old tab hosts temporarily if needed, but present them under the new
   workspace model.
7. Add clear workspace headings and empty states.
8. Do not remove commands unless Agent 13 marks them unused/broken and the
   integration lead approves.

## Acceptance Criteria

- The tab rail/workspace switcher has no `Workflow` tab.
- Initial load starts in a scene/object editing context.
- A user can tell where to go for object editing, adding assets, collision,
  build/publish, and AI.
- Environment and player settings are grouped as world-authoring controls.
- Save/publish and diagnostics are grouped as build controls.
- AI is not present on the default screen.

## Verification

Run:

```bash
pnpm --dir apps/game type-check
pnpm --dir apps/game smoke:editor-ux -- --no-server
```

Include before/after screenshots at `1440x900` and `900x700`.
