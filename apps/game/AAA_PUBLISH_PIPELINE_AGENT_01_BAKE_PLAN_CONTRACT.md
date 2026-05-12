# AAA Publish Pipeline Agent 01 - Bake Plan Contract

## Goal

Create the data contract that lets Publish decide which derived artifacts must
be rebuilt for a level. The result should be a small, typed bake plan generated
from scene data, manifest data, and dirty-state markers. It must not hardcode
particular level ids.

## Current Concern

Publish currently runs `cook:runtime-assets` for every level. It does not know
whether the edit affected terrain collision, terrain chunks, world partition,
full GLB optimization, or only runtime manifests.

## Primary Files

- `apps/game/src/threlte/editor/editorLevelController.ts`
- `apps/game/src/threlte/editor/editorSceneDocumentValidation.ts`
- `apps/game/src/threlte/engine/sceneDocumentTypes.ts`
- `apps/game/src/threlte/editor/editorTypes.ts`
- `apps/game/src/threlte/editor/editorDocumentStore.ts`
- New narrow helper module if useful, for example:
  `apps/game/src/threlte/editor/editorPublishBakePlan.ts`

## Read First

- `apps/game/AGENTS.md`
- `apps/game/AAA_PUBLISH_PIPELINE_AGENT_COORDINATION.md`
- `apps/game/src/threlte/editor/editorLevelController.ts`
- `apps/game/src/threlte/editor/editorGroundTerrainRuntimePublisher.ts`
- `apps/game/src/threlte/engine/sceneDocumentTypes.ts`

## Work Steps

1. Define a publish bake plan type.

Suggested shape:

```ts
export type EditorPublishBakeStep =
  | 'save-scene'
  | 'bake-terrain-collision'
  | 'cook-terrain-chunks'
  | 'cook-world-partition'
  | 'cook-runtime-assets'
  | 'audit-engine'

export interface EditorPublishBakePlan {
  levelId: string
  steps: EditorPublishBakeStep[]
  reasons: Record<EditorPublishBakeStep, string[]>
  warnings: string[]
}
```

2. Add a pure helper that computes the plan from the current scene and available
   metadata. The helper should be unit-testable and should not call `fetch`.
3. Use generic dirty/capability inputs, not level ids. Examples:
   - `settings.level.collision.terrain.dirty`
   - `settings.level.terrainSculpt.enabled`
   - `settings.level.worldPartition.partitionUrl`
   - actor transform changes when world partition is enabled
   - new or changed asset URLs
   - missing runtime scene manifest
4. Treat `cook-runtime-assets` as required for Publish.
5. Treat `audit-engine` as required for deployed Publish unless another agent
   explicitly adds a lighter validated gate with equivalent coverage.
6. Preserve current behavior for basic scene edits: Publish should still save,
   cook runtime manifests, and deploy.
7. Add validation so settings-only or empty scenes cannot be published as real
   levels.

## Guardrails

- Do not add `if (levelId === 'yggdrasil')` or similar branches.
- Do not put backend command execution in the plan helper.
- Do not weaken scene validation.
- Do not assume every terrain-enabled level uses the same terrain workflow;
  read workflow/capability data.
- Do not make a dirty flag the only source of truth if required artifacts are
  missing.

## Acceptance Criteria

- Publish can ask for a bake plan before execution.
- The plan explains why each step is included.
- Empty scenes are rejected.
- Terrain, world partition, asset, and runtime-manifest work can be represented
  without level-specific code.
- The contract is narrow enough for backend and UI agents to consume.

## Validation

```bash
pnpm --dir apps/game lint
pnpm --dir apps/game type-check
pnpm --dir apps/game check:generated-drift
```

If behavior is wired into Publish during this task:

```bash
pnpm --dir apps/game audit:engine
pnpm --dir apps/game release:gate:quick
```

## Handoff

Report:

- bake plan type/module added
- plan inputs and decision rules
- files changed
- validation added
- any plan decisions that still need backend implementation
