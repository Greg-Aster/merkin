# AAA Publish Pipeline Agent 02 - Backend Orchestration

## Goal

Implement the editor-tools backend endpoint that executes a publish bake plan in
order. The endpoint should save or consume the already-saved scene, run required
bake/cook scripts, collect output, fail loudly on errors, and return a structured
summary to the editor.

## Current Concern

The editor has separate endpoints for runtime asset cooking, terrain collision,
world partition cooking, and terrain contract publishing. Publish currently only
calls the runtime asset cook endpoint.

## Primary Files

- `apps/game/scripts/editor-tools/sceneRoutes.cjs`
- `apps/game/scripts/editor-tools/terrainRoutes.cjs`
- `apps/game/scripts/editor-tools/server.cjs`
- `apps/game/src/threlte/editor/editorLevelController.ts`
- `apps/game/scripts/cook-runtime-assets.mjs`
- `apps/game/scripts/bake-terrain-collision.mjs`
- `apps/game/scripts/cook-terrain-chunks.mjs`
- `apps/game/scripts/cook-world-partition.mjs`

## Read First

- `apps/game/AGENTS.md`
- `apps/game/AAA_PUBLISH_PIPELINE_AGENT_COORDINATION.md`
- `apps/game/AAA_PUBLISH_PIPELINE_AGENT_01_BAKE_PLAN_CONTRACT.md`
- Existing endpoints:
  - `/api/editor-scene/cook-runtime-assets`
  - `/api/editor-scene/cook-world-partition`
  - `/api/editor-terrain/bake-collision`
  - `/api/editor-terrain/publish-contracts`

## Work Steps

1. Add a single orchestration endpoint, for example:

```txt
POST /api/editor-scene/publish-build
```

Input should include:

```json
{
  "levelId": "example",
  "plan": {
    "steps": ["bake-terrain-collision", "cook-runtime-assets", "audit-engine"]
  }
}
```

2. Execute steps sequentially. Do not run dependent steps in parallel.
3. Use existing scripts and route helpers where possible.
4. Return structured step results:

```json
{
  "success": true,
  "levelId": "example",
  "steps": [
    {
      "id": "cook-runtime-assets",
      "success": true,
      "stdout": "...",
      "stderr": ""
    }
  ]
}
```

5. Stop on first required-step failure.
6. Include enough stdout/stderr for the editor to show actionable failure
   messages.
7. Ensure scripts run from repo root and use existing `pnpm --dir apps/game`
   conventions.
8. Do not update the level registry inside the orchestration endpoint unless
   the editor controller owns that ordering explicitly. Registry deployment
   should happen only after required bake/cook/audit steps pass.

## Guardrails

- Do not swallow errors.
- Do not mark a level deployed when a required step fails.
- Do not hardcode level-specific bake steps.
- Do not hand-edit generated manifests in the endpoint.
- Do not add shell string concatenation with untrusted input. Pass arguments as
  arrays and validate level ids.
- Do not weaken existing endpoint guards that prevent empty scene saves.

## Acceptance Criteria

- A publish build endpoint can execute a plan and return per-step results.
- Existing standalone endpoints still work.
- Failure output clearly identifies the failed step.
- Publish controller can call this endpoint before registry deployment.
- Generated files come only from existing scripts.

## Validation

```bash
pnpm --dir apps/game lint
pnpm --dir apps/game type-check
pnpm --dir apps/game check:generated-drift
pnpm --dir apps/game audit:engine
pnpm --dir apps/game release:gate:quick
```

Also test at least one endpoint call manually against the dev server, for
example with `curl`, and report the response shape.

## Handoff

Report:

- endpoint added or changed
- supported plan steps
- command execution order
- failure handling behavior
- generated files changed and commands responsible
- commands run
