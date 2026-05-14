# Agent 14: GLB Bake Button Runtime Fix

## Mission

Fix the `Bake Terrain` editor path for `glb-chunk-terrain`. The current code
can crash before it cooks GLB chunks because it pushes into `steps` before
`steps` is declared.

## Read First

- `apps/game/AGENTS.md`
- `apps/game/docs/terrain-asset-pipeline-agents/AGENT_00_COORDINATION.md`
- `apps/game/docs/terrain-asset-pipeline-agents/AGENT_10_EDITOR_BAKE_BUTTON_AND_TERRAIN_STATUS.md`

## Known Failure

Review finding:

- `apps/game/src/threlte/editor/EditorPanel.svelte`
- In `bakeTerrainPipeline()`, the `glb-chunk-terrain` branch calls
  `steps.push('source-glb-chunks')` before `const steps: string[] = []` is
  declared.

This is a runtime temporal-dead-zone bug. TypeScript may pass, but clicking
`Bake Terrain` for a GLB terrain level can crash.

## Ownership

Primary files:

- `apps/game/src/threlte/editor/EditorPanel.svelte`
- `apps/game/src/threlte/editor/editorTerrainPipeline.ts`
- `apps/game/scripts/test-publish-pipeline.ts`

Secondary files if needed:

- `apps/game/src/threlte/editor/EditorWorkflowPanel.svelte`
- `apps/game/src/threlte/editor/editorPublishBakePlan.ts`

## Requirements

1. Move shared bake-step state initialization before all terrain-mode branches.
2. Keep the `scene-authored`, `heightfield-terrain`, and `glb-chunk-terrain`
   paths readable and explicit.
3. Add or update a focused test that would catch the GLB terrain bake path
   regression. Prefer extracting small planner logic over browser-only tests if
   that keeps the test deterministic.
4. Do not introduce another bake pipeline. The button, command palette, publish
   plan, and backend route must still use the same conceptual pipeline.

## Non-Goals

- Do not migrate observatory.
- Do not change terrain manifest semantics.
- Do not add level-specific branches.

## Acceptance Criteria

- `Bake Terrain` no longer has a `steps` declaration-order crash.
- GLB chunk terrain runs: cook GLB chunks, validate terrain contract, report
  final status.
- Heightfield terrain still runs: generate heightmap when needed, bake
  collision, cook chunks when needed, validate.
- Scene-authored terrain still validates without attempting terrain chunk work.

## Verification

Run:

```bash
pnpm --dir apps/game type-check
pnpm --dir apps/game test:publish-pipeline
```

If you manually test in the editor, report the level/mode used and the visible
button result.
