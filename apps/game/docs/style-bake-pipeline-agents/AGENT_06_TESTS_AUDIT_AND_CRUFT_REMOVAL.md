# Agent 06: Tests, Audit, And Cruft Removal

## Mission

Validate the completed style bake pipeline and remove obsolete paths that would
make the system confusing or brittle.

This agent should work after Agents 01-05 have landed enough of the contract to
test. It may also audit earlier changes and send focused fixes back to the
owning agent.

## Ownership

Primary files:

- `apps/game/scripts/test-publish-pipeline.ts`
- `apps/game/scripts/lib/sceneArchitectureAudit.mjs`
- `apps/game/scripts/lib/runtimeAssetManifestAudit.mjs`
- `apps/game/scripts/audit-engine-architecture.mjs`
- `apps/game/scripts/check-generated-drift.mjs`
- `apps/game/docs/style-bake-pipeline-agents/AGENT_00_COORDINATION.md`

Secondary files if needed:

- `apps/game/src/threlte/editor/editorStyleController.ts`
- `apps/game/src/threlte/editor/editorStyleApi.ts`
- `apps/game/scripts/editor-tools/styleRoutes.cjs`
- `apps/game/scripts/bake-style-asset.mjs`
- `apps/game/src/threlte/editor/EditorStyleStudio.svelte`

## Required Test Coverage

Add or update tests for:

- selected-object procedural style bake product metadata
- Blender backend unavailable error
- source asset fingerprint stale state
- settings fingerprint stale state
- missing generated GLB blocks publish when required
- missing metadata blocks publish when required
- clean generated product passes publish readiness
- oversized style-baked texture warning or blocker by tier
- batch bake reuses clean cache product
- AI texture source remains optional and does not masquerade as deterministic
  style bake

## Audit Requirements

Search for:

- direct `/api/style/bake-procedural` call sites that bypass the manager
- style bake state stored only in transient component variables
- generated GLB paths that lack metadata
- publish readiness messages that ignore style bake state
- old wording that implies runtime post-processing is the style solution
- dead helpers left behind by earlier experiments

Use `rg` first. Do not delete broad generated directories unless the owning
source and regeneration command are documented.

## Cruft Removal Rules

Delete obsolete code only after proving:

- no live import references it
- no scene JSON references its output shape
- no tests rely on it
- no generated manifest still points to its products

If a temporary compatibility path must remain, document:

- owner
- removal condition
- validation that prevents it from becoming the default

## Non-Goals

- Do not create a new pipeline.
- Do not add new editor features.
- Do not rewrite unrelated collision, terrain, or performance systems.
- Do not delete generated products without a regeneration plan.

## Acceptance Criteria

- Style bake pipeline has focused tests.
- Architecture audit flags unmanaged style bake products.
- Runtime asset audit understands style-baked outputs.
- Dead/duplicate style bake paths are removed or documented.
- Final report lists residual risks and missing validation gates.

## Verification

Run:

```bash
pnpm --dir apps/game type-check
pnpm --dir apps/game test:publish-pipeline
pnpm --dir apps/game audit:runtime-assets
pnpm --dir apps/game audit:engine
```

If `audit:engine` fails due to unrelated dirty work, report the exact unrelated
failure and the style-bake-specific result separately.
