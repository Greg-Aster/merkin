# Agent 22: Remaining Workspace Density

## Goal

Finish the workspace-density reduction started in Wave 04. The new information
architecture is visible and much better, but several workspaces still exceed the
first-entry control budget.

## Current Counts

Latest focused Playwright audit:

| Workspace | Visible controls | Visible buttons | Target |
| --- | ---: | ---: | ---: |
| Initial `Scene` | 41 | 21 | 35 controls |
| `Create` | 46 | 28 | 45 controls |
| `World` | 42 | 24 | 45 controls |
| `Collision` | 53 | 33 | 45 controls |
| `Build` | 61 | 33 | 45 controls |
| `AI Lab` | 39 | 21 | 45 controls |

World and AI Lab are now within target. Do not regress them.

Relevant files:

- `apps/game/src/threlte/editor/EditorPanel.svelte`
- `apps/game/src/threlte/editor/EditorSceneTabHost.svelte`
- `apps/game/src/threlte/editor/EditorSceneToolsPanel.svelte`
- `apps/game/src/threlte/editor/EditorCreateTabHost.svelte`
- `apps/game/src/threlte/editor/EditorCreatePanel.svelte`
- `apps/game/src/threlte/editor/EditorCollisionTabHost.svelte`
- `apps/game/src/threlte/editor/EditorSaveTabHost.svelte`
- `apps/game/src/threlte/editor/EditorSavePanel.svelte`
- `apps/game/src/threlte/editor/EditorOutputTabHost.svelte`
- `apps/game/src/threlte/editor/EditorSideStackHost.svelte`
- `apps/game/src/threlte/editor/EditorOutlinerDock.svelte`
- `apps/game/src/threlte/editor/EditorPropertiesShelf.svelte`

## Required Work

1. Reduce Initial `Scene` from 41 controls to 35 or fewer.
   Likely sources of count:
   - duplicated outliner row actions
   - always-visible Group/Ungroup
   - side stack controls that are not needed on first entry

   Prefer a compact row action menu, selection-context visibility, or a
   collapsible advanced section. Do not remove core scene authoring capability.

2. Reduce `Create` from 46 controls to 45 or fewer.
   This is a small miss. Remove or demote one first-entry control without
   harming the main add-object path.

3. Reduce `Collision` from 53 controls to 45 or fewer.
   Collision should expose:
   - current collision mode/policy summary
   - overlay/review affordance
   - selected-node collision authoring entry point
   - bake readiness entry point

   It should not show every terrain, basket, bake, cook, and legacy policy
   action at once. Move advanced terrain/bake actions behind a clear subflow or
   closed details section.

4. Reduce `Build` from 61 controls to 45 or fewer.
   Build should expose:
   - save primary action
   - publish/readiness primary action
   - last result/status
   - diagnostics entry point

   Advanced recovery, snapshots, import JSON, registry/deployment toggles, and
   AI job output should be grouped behind explicit advanced sections that are
   closed by default.

5. Keep command palette as the discoverability surface.
   If a secondary command leaves first-entry UI, ensure it still has a command
   palette entry or clear route from a relevant menu.

6. Preserve the direct smoke pass.
   Layout, canvas, command palette, and viewport coverage must not regress while
   reducing density.

## Non-Goals

- Do not redesign the visual theme.
- Do not hide controls by making text smaller.
- Do not remove functional capabilities from the editor without a replacement
  route.
- Do not touch runtime level data or generated assets for this task.

## Acceptance Criteria

- Initial `Scene` <= 35 visible controls.
- `Create` <= 45 visible controls.
- `World` remains <= 45 visible controls.
- `Collision` <= 45 visible controls.
- `Build` <= 45 visible controls.
- `AI Lab` remains <= 45 visible controls.
- Direct editor UX smoke passes.
- Command palette still opens and runs `Open Asset Library`.

## Verification Commands

Run:

```bash
pnpm --dir apps/game type-check
pnpm --dir apps/game exec node ./scripts/editor-ux-smoke.mjs --no-server
```

Also run the package smoke if Agent 21 has landed:

```bash
pnpm --dir apps/game smoke:editor-ux --no-server
```

Use Playwright to collect updated visible control/button counts for every
workspace and include the table in the handoff.

## Handoff Notes

Report:

- Workspace counts before and after.
- Components changed.
- Which controls were demoted, grouped, or moved.
- How a user now reaches each demoted command.
- Any new CSS surface area.
