# Agent 15: Source Asset Existence Gate

## Mission

Make missing terrain source assets block editor bake/cook commands before the
backend cook fails.

The editor currently says the backend will verify source existence, but command
enablement mostly checks whether a source URL is recorded. That is not a
production-grade authoring UX.

## Read First

- `apps/game/AGENTS.md`
- `apps/game/docs/terrain-asset-pipeline-agents/AGENT_00_COORDINATION.md`
- `apps/game/docs/terrain-asset-pipeline-agents/AGENT_09_SOURCE_GLB_ASSET_AND_COOK_PATH.md`
- `apps/game/docs/terrain-asset-pipeline-agents/AGENT_10_EDITOR_BAKE_BUTTON_AND_TERRAIN_STATUS.md`

## Ownership

Primary files:

- `apps/game/src/threlte/editor/editorTerrainPipeline.ts`
- `apps/game/src/threlte/editor/EditorWorkflowPanel.svelte`
- `apps/game/src/threlte/editor/EditorWorldTabHost.svelte`
- `apps/game/src/threlte/editor/EditorPublishReadinessPanel.svelte`
- `apps/game/scripts/editor-tools/terrainRoutes.cjs`

Secondary files if needed:

- `apps/game/src/threlte/editor/EditorPanel.svelte`
- `apps/game/src/threlte/editor/editorPublishReadiness.ts`
- `apps/game/scripts/test-publish-pipeline.ts`

## Requirements

1. Use `/api/editor-terrain/status` or equivalent backend status data to know
   whether recorded source assets exist.
2. Feed source existence into the terrain pipeline view model, not only into
   display text.
3. Disable `Bake Terrain` and `Cook GLB Chunks` when required source GLB/GLTF
   assets are missing.
4. Show an actionable message:

   ```txt
   Source asset missing: /models/levels/example.glb
   Place the exported source under apps/megameal/public or update the terrain
   source URL.
   ```

5. Publish readiness must also identify missing source assets as blockers for
   `glb-chunk-terrain`.
6. Keep primitive/scene-node heightfield sources valid. Do not require external
   GLB files for scene-authored terrain or primitive heightfield sources.

## Non-Goals

- Do not create placeholder GLBs.
- Do not silently switch a GLB level back to heightfield terrain.
- Do not special-case observatory.

## Acceptance Criteria

- Missing required source GLB disables the editor cook/bake command.
- The disabled reason is visible near the button.
- Backend cook still fails loudly if called directly with a missing source.
- Publish plan blocks GLB terrain publish when source assets are missing.

## Verification

Run:

```bash
pnpm --dir apps/game type-check
pnpm --dir apps/game test:publish-pipeline
pnpm --dir apps/game audit:engine
```

Also run a dry-run against a level with a missing source and report the result:

```bash
pnpm --dir apps/game cook:terrain-glb-chunks -- --level=<level> --dry-run
```
