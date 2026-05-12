# AAA Target 06 - Browser Chunk Budget Reduction

## Goal

Reduce browser bundle and chunk size risk so the static Astro/Threlte game loads more like a production web game: small initial route, lazy editor/heavy systems, intentional vendor chunks, and audited ownership boundaries.

## Current Evidence

- Release builds still report Vite large chunk advisory warnings.
- `audit:chunks` exists and is part of `audit:engine`.
- `scripts/lib/chunkOwnership.mjs` owns manual chunk boundaries.
- The likely problem areas are Three vendor weight, editor document/panel code, conversation UI, and runtime/editor import boundaries.

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

## Work Steps

1. Read `apps/game/AGENTS.md`, `ENGINE_ARCHITECTURE.md`, and `scripts/lib/chunkOwnership.mjs`.
2. Capture current build/chunk output:

```bash
pnpm --dir apps/game audit:chunks
pnpm --dir apps/game release:gate:quick
```

3. Identify which chunk warnings remain and which imports pull heavy code into the initial runtime.
4. Move editor-only, conversation UI, debug tooling, and other non-playable systems behind existing lazy boundaries.
5. Tighten broad barrel imports that drag extra modules into runtime chunks.
6. Update chunk ownership audit rules if a new boundary is intentional.
7. Do not split chunks blindly; every split should reduce initial playable cost or enforce a real ownership boundary.

## Guardrails

- Do not lazy-load required gameplay systems after the playable gate unless the readiness lifecycle knows about it.
- Do not hide chunk warnings by raising limits without reducing cost.
- Do not move editor code into runtime chunks.
- Do not create circular dynamic imports.
- Do not break static Astro deployment.

## Acceptance Criteria

- Initial gameplay route pulls less non-gameplay code.
- Large chunk warnings are reduced or explained with measured output.
- `audit:chunks` still passes.
- Editor mode still boots.
- Gameplay still reaches the readiness gate.

## Validation

```bash
pnpm --dir apps/game lint
pnpm --dir apps/game type-check
pnpm --dir apps/game audit:chunks
pnpm --dir apps/game audit:engine
pnpm --dir apps/game release:gate:quick
```

If a runtime boundary changes:

```bash
pnpm --dir apps/game smoke:engine
```

## Handoff

Report:

- Before/after chunk warnings or chunk sizes.
- Heavy imports removed from initial runtime.
- Lazy boundaries added or changed.
- Readiness/playable impact.
- Commands run.
- Remaining large chunks and why they remain.
