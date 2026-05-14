# AAA Web Engine Agent 01 - Bundle Size And Chunk Budgets

## Goal

Reduce browser bundle and large chunk risk without hiding the warnings. The
player route should load only what is needed to reach the playable readiness
gate; editor, debug, AI, and optional systems should stay behind intentional
lazy boundaries.

## Current Concern

The build still warns about large chunks, especially:

- `three-vendor`
- `editor-document`
- `editor-panel`

This is expected for a browser game, but it must be measured, bounded, and
actively managed.

## Primary Files

- `apps/game/astro.config.mjs`
- `apps/game/scripts/lib/chunkOwnership.mjs`
- `apps/game/scripts/audit-chunk-ownership.mjs`
- `apps/game/src/threlte/Game.svelte`
- `apps/game/src/threlte/GameCanvasStage.svelte`
- `apps/game/src/threlte/levels/RuntimeGameplayRenderer.svelte`
- `apps/game/src/threlte/editor/**`
- `apps/game/src/threlte/features/conversation/**`
- `apps/game/src/threlte/systems/SimplePostProcessing.svelte`

## Read First

- `apps/game/AGENTS.md`
- `apps/game/ENGINE_ARCHITECTURE.md`
- `apps/game/AAA_TARGET_06_BROWSER_CHUNK_BUDGET_REDUCTION.md`
- `apps/game/AAA_WEB_ENGINE_AGENT_COORDINATION.md`

## Work Steps

1. Capture current chunk evidence:

```bash
pnpm --dir apps/game audit:chunks
pnpm --dir apps/game release:gate:quick
```

2. Identify imports that pull editor, debug, conversation, AI, or optional
   tooling into the initial player runtime.
3. Move optional/editor-only systems behind existing lazy boundaries or add a
   narrow dynamic import where the lifecycle is clear.
4. Split broad imports only when the split has a measurable benefit or enforces
   a real ownership boundary.
5. Update `scripts/lib/chunkOwnership.mjs` only when a boundary is intentional
   and documented.
6. Keep required gameplay readiness deterministic. Do not defer required
   gameplay systems unless the readiness gate waits for them.
7. Run a before/after chunk comparison and record the result.

## Guardrails

- Do not raise chunk warning limits as the fix.
- Do not lazy-load required collision, required render assets, or player input
  after activation without updating readiness.
- Do not move editor code into runtime chunks.
- Do not create circular dynamic imports.
- Do not break static Astro deployment.

## Acceptance Criteria

- Large chunk warnings are reduced, or each remaining warning is explained with
  measured output and ownership.
- Initial player route pulls less editor/debug/tooling code.
- `audit:chunks` passes.
- Editor mode still boots.
- Player runtime still reaches readiness.

## Validation

```bash
pnpm --dir apps/game lint
pnpm --dir apps/game type-check
pnpm --dir apps/game audit:chunks
pnpm --dir apps/game audit:engine
pnpm --dir apps/game release:gate:quick
```

## Handoff

Report:

- before/after chunk sizes or warnings
- imports moved or boundaries added
- files changed
- readiness impact
- remaining large chunks and why they remain

