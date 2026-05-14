# Agent 10: Editor Bake Button And Terrain Status

## Mission

Add a clear, user-facing terrain bake/cook/validate flow in the level editor.

Yes, the editor needs a visible bake control. Saving a scene only writes
authoring data. Baking/cooking creates runtime terrain products. Authors need a
button and status panel that make that distinction obvious.

## Read First

- `apps/game/AGENTS.md`
- `apps/game/docs/terrain-asset-pipeline-audit.md`
- `apps/game/docs/terrain-asset-pipeline-agents/AGENT_00_COORDINATION.md`
- `apps/game/docs/terrain-asset-pipeline-agents/AGENT_05_EDITOR_TERRAIN_UX_AND_PUBLISH.md`
- `apps/game/docs/level-editor-ux-refactor/AGENT_05_PIPELINES_STATUS_AND_OUTPUT.md`

## Ownership

Primary files:

- `apps/game/src/threlte/editor/EditorWorldTabHost.svelte`
- `apps/game/src/threlte/editor/EditorWorkflowPanel.svelte`
- `apps/game/src/threlte/editor/EditorPublishReadinessPanel.svelte`
- `apps/game/src/threlte/editor/EditorSavePanel.svelte`
- `apps/game/src/threlte/editor/editorTerrainPipeline.ts`
- `apps/game/src/threlte/editor/editorPublishBakePlan.ts`
- `apps/game/src/threlte/editor/editorPublishReadiness.ts`
- `apps/game/scripts/editor-tools/terrainRoutes.cjs`

Secondary files if needed:

- `apps/game/src/threlte/editor/EditorOutputTabHost.svelte`
- `apps/game/src/threlte/editor/editorCommandRegistry.ts`
- `apps/game/scripts/test-publish-pipeline.ts`

## Required UX

Create one coherent terrain pipeline surface with these commands:

- `Bake Terrain`
- `Validate Terrain`
- `Publish Level`

`Bake Terrain` should expand internally based on terrain mode:

```txt
scene-authored:
  validate scene ground actors and collision products

heightfield-terrain:
  generate heightmap if stale
  bake terrain collision
  cook heightfield chunks if enabled

glb-chunk-terrain:
  cook source GLB render chunks
  bake/source terrain collision
```

If splitting into separate buttons is clearer, use:

- `Generate Heightmap`
- `Cook Render Chunks`
- `Bake Collision`
- `Validate`
- `Publish`

But there must still be a single obvious "make runtime terrain current" action.

## Status Requirements

The UI must show:

- terrain mode
- authoritative visual source
- source asset URL and existence
- last bake/cook result
- dirty/stale state
- runtime manifest path
- collision product state
- fallback surface policy
- publish blockers

Button states must be explicit:

- disabled with reason when source data is missing
- running with command label
- succeeded with changed products
- failed with actionable error text

## Publish Behavior

Publishing must not silently skip stale terrain. If terrain products are dirty
or missing, publish should either:

- run the required bake/cook steps, or
- block with a clear message telling the author which bake action is needed.

## Non-Goals

- Do not redesign the entire editor.
- Do not hide bake results in a console-only log.
- Do not special-case observatory.
- Do not add duplicate terrain controls in multiple panels unless one is a
  command alias backed by the same command registry entry.

## Acceptance Criteria

- A non-engineer author can identify whether terrain is current.
- There is an obvious bake/cook action in the editor.
- The button calls the same backend routes used by publish planning.
- Failed bake/cook output is visible in the editor.
- Publish readiness and editor pipeline status agree.

## Verification

Run:

```bash
pnpm --dir apps/game type-check
pnpm --dir apps/game test:publish-pipeline
pnpm --dir apps/game editor-ux-smoke
```

If `editor-ux-smoke` is unstable, report the blocker and manually document the
editor path tested.

No Megameal CSS audit is required unless this task edits `apps/megameal`
styles.
