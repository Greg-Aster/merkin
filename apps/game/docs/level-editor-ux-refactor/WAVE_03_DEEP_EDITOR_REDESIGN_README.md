# Wave 03: Deep Level Editor Redesign

This wave is a reset of the refactor direction. The first fixes mostly rearranged
windows. That is not enough. The level editor needs a deeper information
architecture pass so a user can answer:

- What can I do here?
- What is selected?
- What is working, experimental, blocked, or offline?
- Where do I go to add content, edit objects, author collision, bake/publish, or
  debug failures?
- Which controls are scene editing tools versus pipeline tools versus AI tooling?

## Latest Audit State

Fresh Playwright audit against `http://127.0.0.1:4334/?editor=1` showed the
active UI still rendering the old workflow-first layout:

- No `.editor-main-toolbar` region was present.
- Default active tab was still `Workflow`.
- `Workflow` mixed AI, selection, save/load, asset, job, and visibility commands.
- At `1280x800`, tools panel extended to `y=1124`; outliner/details started below
  the visible viewport.
- At `900x700`, tools panel extended to `y=1202`; outliner/details started at
  `y=1202` and `y=1411`.
- The controls overlay remained a large `544x428` panel.
- Visible button count was 73 on initial load.

This means agents should not assume layout-only changes have solved the problem.
The next work must redesign the editor model, then fit layout to that model.

## Core Product Decision

The editor should become a task-based game-authoring workbench with these primary
workspaces:

1. **Scene**: select, transform, organize, inspect objects.
2. **Create**: add primitives, prefabs, imported assets, generated assets.
3. **World**: environment, player spawn, terrain, gameplay helpers.
4. **Collision**: collision authoring, review, bake readiness, debug overlays.
5. **Build**: save, validate, bake/cook, publish, runtime diagnostics.
6. **AI Lab**: experimental generation/retexture workflows, jobs, service status.

The old `Workflow` tab should not survive as the default surface. Its contents
must be redistributed or retired.

## Wave 03 Briefs

Use these after reading the earlier wave docs:

1. `AGENT_11_EDITOR_INFORMATION_ARCHITECTURE.md`
2. `AGENT_12_COMMAND_REGISTRY_AND_DISCOVERABILITY.md`
3. `AGENT_13_FEATURE_READINESS_AND_CAPABILITY_AUDIT.md`
4. `AGENT_14_TASK_BASED_WORKFLOWS.md`
5. `AGENT_15_DEFAULT_SCREEN_AND_SELECTION_MODEL.md`
6. `AGENT_16_RETIRE_WORKFLOW_TAB_AND_DEDUPLICATE_CONTROLS.md`

Recommended order:

1. Agent 13 inventories what exists and what works.
2. Agent 11 defines the target navigation/workspace model.
3. Agent 12 creates command ownership and search/discovery.
4. Agent 16 removes the old `Workflow` dump surface.
5. Agent 15 rebuilds the default screen around selection and details.
6. Agent 14 turns the main jobs into guided task flows.

Some of these can proceed in parallel after Agent 13 publishes the inventory, but
do not allow multiple agents to rewrite `EditorPanel.svelte` at the same time.

## Non-Negotiable Outcomes

- Initial editor load must not show AI workflow controls.
- Initial editor load must not expose more than 35 visible buttons.
- The user must be able to identify the active workspace, active tool, selected
  object, and save/publish health within five seconds.
- Every command must have one owner workspace.
- Experimental/offline features must be labeled and separated from core editing.
- Long pipeline actions must show readiness and last result state.
- `smoke:editor-ux` must fail if the UI regresses to off-screen docks.

## Verification

Run at minimum:

```bash
pnpm --dir apps/game type-check
pnpm --dir apps/game smoke:editor-ux -- --no-server
```

For any agent that changes command routing, also manually verify:

- select object from viewport or outliner
- transform object
- add a primitive
- add/import an asset if available
- inspect collision status
- save level
- view diagnostics/output
