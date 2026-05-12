# AAA Publish Pipeline Agent Coordination

## Purpose

Use this batch to turn the level editor Publish action into a dependency-aware
build pipeline. The target is a one-button publish flow that saves the scene,
runs only the required bake/cook steps, validates the resulting runtime
artifacts, and then marks the level deployed.

The current Publish path saves the scene, runs `cook:runtime-assets`, and
updates the level registry. That handles many scene edits, but it does not
automatically decide whether terrain collision, terrain chunks, world partition,
or full asset optimization need to run.

## Active Agent Files

Assign one agent to each file:

- `AAA_PUBLISH_PIPELINE_AGENT_01_BAKE_PLAN_CONTRACT.md`
- `AAA_PUBLISH_PIPELINE_AGENT_02_BACKEND_ORCHESTRATION.md`
- `AAA_PUBLISH_PIPELINE_AGENT_03_EDITOR_UX_AND_FEEDBACK.md`
- `AAA_PUBLISH_PIPELINE_AGENT_04_VALIDATION_AND_REGRESSION.md`

## Shared Rules

1. Read `apps/game/AGENTS.md` before editing game code, scene data, generated
   runtime assets, or game-facing assets under `apps/megameal/public`.
2. Do not add level-id branches to generic publish, bake, editor, or runtime
   code. Level-specific requirements must come from scene settings, registry
   metadata, terrain manifests, runtime manifests, or explicit capability flags.
3. Do not hand-edit generated runtime JSON as the primary fix. Change source
   data or scripts, then regenerate with the owning command.
4. Do not weaken audits, budgets, or readiness gates to make Publish pass.
5. Publish must fail loudly when required artifacts cannot be produced.
6. Keep editor-only APIs out of player runtime chunks.
7. Do not revert unrelated dirty work.

## Desired Publish Flow

```txt
editor scene
  -> validate non-empty scene and required settings
  -> compute bake plan from scene/manifest/dirty state
  -> save authored scene to disk
  -> run required terrain/partition/asset/runtime cooks
  -> run publish validation gates
  -> update level registry active/deployed state
  -> show clear editor status and artifact summary
```

## Coordination Boundaries

- Agent 01 owns the bake-plan contract and dirty-state model.
- Agent 02 owns backend endpoints/scripts that execute the plan.
- Agent 03 owns editor UI and status feedback.
- Agent 04 owns validation, regression tests, and release gate coverage.

Coordinate before editing these shared files:

- `apps/game/src/threlte/editor/editorLevelController.ts`
- `apps/game/src/threlte/editor/EditorPanel.svelte`
- `apps/game/src/threlte/editor/EditorPublishReadinessPanel.svelte`
- `apps/game/scripts/editor-tools/sceneRoutes.cjs`
- `apps/game/scripts/editor-tools/terrainRoutes.cjs`
- `apps/game/scripts/cook-runtime-assets.mjs`
- `apps/game/scripts/cook-world-partition.mjs`
- `apps/game/scripts/bake-terrain-collision.mjs`
- `apps/game/scripts/cook-terrain-chunks.mjs`

## Validation Baseline

Every agent should run at least:

```bash
pnpm --dir apps/game lint
pnpm --dir apps/game type-check
pnpm --dir apps/game check:generated-drift
```

If scripts, generated assets, manifests, terrain, collision, or publish behavior
change, also run:

```bash
pnpm --dir apps/game audit:engine
pnpm --dir apps/game release:gate:quick
```

## Handoff Format

Each agent must report:

- assigned file addressed
- files changed
- source-of-truth data changed
- generated files changed and command used
- publish flow impact
- runtime payload, collision, and required-asset impact
- CSS surface area, if any
- commands run
- remaining risks or follow-up dependencies
