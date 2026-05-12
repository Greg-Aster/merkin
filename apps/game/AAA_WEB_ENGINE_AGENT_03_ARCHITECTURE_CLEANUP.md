# AAA Web Engine Agent 03 - Architecture Cleanup And Module Shrinking

## Goal

Keep reducing cruft and large modules while preserving the source-to-runtime
pipeline. The engine should have clear boundaries between editor, runtime,
assets, levels, physics, streaming, diagnostics, and presentation.

## Current Concern

Architecture is much cleaner than before, but there are still known cross-chunk
edges and large modules. The goal is not abstract purity. The goal is fewer
surprising imports, smaller ownership surfaces, and easier future refactors.

## Primary Files

- `apps/game/src/threlte/Game.svelte`
- `apps/game/src/threlte/GameCanvasStage.svelte`
- `apps/game/src/threlte/levels/SceneDocumentLevel.svelte`
- `apps/game/src/threlte/levels/RuntimeGameplayRenderer.svelte`
- `apps/game/src/threlte/editor/EditorPanel.svelte`
- `apps/game/src/threlte/editor/editorPanelPropBuilders.ts`
- `apps/game/src/threlte/editor/editorDocumentStore.ts`
- `apps/game/src/threlte/engine/**`
- `apps/game/src/threlte/utils/**`
- `apps/game/scripts/lib/chunkOwnership.mjs`

## Read First

- `apps/game/AGENTS.md`
- `apps/game/ENGINE_ARCHITECTURE.md`
- `apps/game/AAA_TARGET_02_RUNTIME_MODULE_CLEANUP.md`
- `apps/game/AAA_WEB_ENGINE_AGENT_COORDINATION.md`

## Work Steps

1. Run the architecture and chunk audits:

```bash
pnpm --dir apps/game audit:engine
pnpm --dir apps/game audit:chunks
```

2. Pick one bounded cleanup target:
   - one large file
   - one repeated helper pattern
   - one cross-chunk import class
   - one editor/runtime ownership leak
3. Extract or move only cohesive logic. Do not create a generic abstraction
   just to reduce line count.
4. Keep runtime contracts in typed adapters/services, not display components.
5. Remove dead code only after proving no live import, manifest, route, or
   editor action references it.
6. Replace hardcoded level-id branches in generic systems with scene settings,
   level registry metadata, runtime manifest capabilities, or node metadata.
7. Update tests/audits if the boundary changes.
8. Record what got simpler and what remains intentionally large.

## Guardrails

- Do not rewrite `Game.svelte`, `EditorPanel.svelte`, or
  `SceneDocumentLevel.svelte` wholesale.
- Do not merge editor-only and runtime-only helpers.
- Do not introduce a new service layer unless it owns a real contract.
- Do not delete files based only on filename suspicion.
- Do not break chunk ownership to make imports shorter.
- Do not fix engine behavior with `if (levelId === 'some-level')` branches.

## Acceptance Criteria

- One concrete ownership boundary is cleaner than before.
- Cross-chunk edges do not increase.
- Large modules are reduced or have clearer delegated helpers.
- Runtime/editor separation is preserved or improved.
- No generated drift is introduced.

## Validation

```bash
pnpm --dir apps/game lint
pnpm --dir apps/game type-check
pnpm --dir apps/game audit:chunks
pnpm --dir apps/game audit:engine
pnpm --dir apps/game check:generated-drift
```

If runtime boot behavior changes:

```bash
pnpm --dir apps/game release:gate:quick
```

## Handoff

Report:

- cleanup target chosen
- files changed
- boundary improved
- cross-chunk edge impact
- deleted code, if any, and proof it was unused
- commands run
- remaining architecture risks
