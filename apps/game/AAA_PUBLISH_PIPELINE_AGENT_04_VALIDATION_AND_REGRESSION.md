# AAA Publish Pipeline Agent 04 - Validation And Regression

## Goal

Add validation coverage so the dependency-aware Publish pipeline cannot regress
into partial builds, empty scenes, stale generated assets, or deployed registry
state after failed bakes.

## Current Concern

The repo has strong audits, but Publish-specific behavior needs targeted
coverage. The key risk is a button that appears to publish while skipping a
required derived artifact or deploying after a failed step.

## Primary Files

- `apps/game/scripts/release-gate.mjs`
- `apps/game/scripts/check-generated-drift.mjs`
- `apps/game/scripts/audit-engine-architecture.mjs`
- `apps/game/scripts/editor-tools/sceneRoutes.cjs`
- `apps/game/scripts/editor-tools/terrainRoutes.cjs`
- Existing smoke/performance scripts if appropriate:
  - `apps/game/scripts/smoke-check.mjs`
  - `apps/game/scripts/boot-check.mjs`
  - `apps/game/scripts/visual-smoke.mjs`

## Read First

- `apps/game/AGENTS.md`
- `apps/game/AAA_PUBLISH_PIPELINE_AGENT_COORDINATION.md`
- `apps/game/AAA_PUBLISH_PIPELINE_AGENT_01_BAKE_PLAN_CONTRACT.md`
- `apps/game/AAA_PUBLISH_PIPELINE_AGENT_02_BACKEND_ORCHESTRATION.md`
- `apps/game/AAA_PUBLISH_PIPELINE_AGENT_03_EDITOR_UX_AND_FEEDBACK.md`

## Work Steps

1. Add a publish-plan validation test or script fixture that verifies:
   - settings-only scenes are not publishable
   - populated scenes are publishable
   - terrain dirty state includes terrain bake/chunk work
   - world partition capability includes partition cook work
   - runtime asset cook is always included
2. Add endpoint-level regression coverage where practical:
   - failed required step does not return `success: true`
   - registry deployment is not updated before build success
3. Add generated-drift or audit coverage if Publish writes generated artifacts.
4. Add a browser/editor smoke check if feasible:
   - open `?editor=1&level=yggdrasil`
   - confirm editor loads non-empty scene
   - confirm Publish plan is visible
5. Keep tests deterministic. Avoid relying on external AI services or long
   asset generation.
6. Prefer lightweight fixtures over modifying real production scenes unless the
   check must prove real-scene behavior.

## Guardrails

- Do not weaken existing release gates.
- Do not make tests depend on network services outside the local dev server.
- Do not add brittle level-id behavior to runtime/editor code. Test fixtures may
  name levels explicitly.
- Do not mask generated drift.
- Do not require a full forced GLB recook for routine quick gates unless the
  task explicitly adds a separate slow/certification profile.

## Acceptance Criteria

- Publish-plan logic has direct coverage.
- Empty/skeleton scene publish regression is covered.
- Failed required bake step cannot deploy a level.
- Quick release gate still passes.
- Any slow validation is documented separately from quick gates.

## Validation

```bash
pnpm --dir apps/game lint
pnpm --dir apps/game type-check
pnpm --dir apps/game check:generated-drift
pnpm --dir apps/game audit:engine
pnpm --dir apps/game release:gate:quick
```

If browser smoke coverage is changed:

```bash
pnpm --dir apps/game smoke:boot
```

## Handoff

Report:

- validation added
- fixtures added
- commands run
- what failure modes are now covered
- what remains manual or slow-path only
