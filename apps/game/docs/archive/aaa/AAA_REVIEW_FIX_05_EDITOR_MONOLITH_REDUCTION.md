# AAA Review Fix 05 - Editor Monolith Reduction

## Finding

The editor works, but the core ownership surfaces are still too large for a
maintainable production editor:

- `apps/game/src/threlte/editor/EditorPanel.svelte` is about 3,128 lines.
- `apps/game/src/threlte/editor/editorPublishReadiness.ts` is about 980 lines.
- `apps/game/src/threlte/Game.svelte` is about 931 lines.

This is not just a style issue. Large editor files make it hard to review
changes, isolate editor-only behavior, and prevent runtime/editor coupling.

## Mission

Extract one meaningful editor workflow slice into focused modules or components
without changing behavior. Prove the pattern for continuing editor cleanup.

## Primary Files

- `apps/game/src/threlte/editor/EditorPanel.svelte`
- `apps/game/src/threlte/editor/editorPublishReadiness.ts`
- `apps/game/src/threlte/editor/EditorPublishReadinessPanel.svelte`
- `apps/game/src/threlte/editor/editorPublishReadinessController.ts`
- `apps/game/src/threlte/editor/editorPublishReadinessDataSource.ts`
- `apps/game/src/threlte/Game.svelte`
- `apps/game/src/threlte/editor/gameEditorFeatureLoader.ts`

## Recommended Slice

Prefer publish-readiness ownership if it is still mixed across files:

- `editorPublishReadiness.ts`: pure contracts, rules, and result shaping.
- `editorPublishReadinessController.ts`: orchestration and command state.
- `EditorPublishReadinessPanel.svelte`: display and actions.
- `EditorPanel.svelte`: wiring only.

If publish-readiness is already clean, extract another coherent slice such as:

- level registry controls
- asset failure/readiness diagnostics
- scene tools panel orchestration
- editor session lifecycle wiring

## Work Steps

1. Read `apps/game/AGENTS.md` and
   `apps/game/AAA_REVIEW_FIX_AGENT_COORDINATION.md`.
2. Record starting line counts:

```bash
wc -l apps/game/src/threlte/editor/EditorPanel.svelte apps/game/src/threlte/editor/editorPublishReadiness.ts apps/game/src/threlte/Game.svelte
```

3. Pick one workflow slice and write down the target ownership in the handoff.
4. Move logic with minimal behavior change.
5. Keep runtime/editor boundaries clean:

- runtime code must not import editor-only modules.
- editor modules may import validated runtime contracts when needed.

6. Avoid creating a new giant catch-all file.
7. Record ending line counts and validate.

## Rules

- Do not rewrite the editor wholesale.
- Do not move code only to make line counts smaller if ownership becomes worse.
- Do not add broad CSS blocks.
- Do not touch Megameal frontend styles unless the task truly requires it.

## Acceptance Criteria

- At least one real workflow leaves `EditorPanel.svelte` or
  `editorPublishReadiness.ts`.
- New module names describe ownership clearly.
- Runtime/editor import isolation remains intact.
- Lint and type-check pass.
- Browser boot still confirms editor and migrated levels load.

## Validation

```bash
pnpm --dir apps/game lint
pnpm --dir apps/game type-check
GAME_DEV_PORT=4358 pnpm --dir apps/game smoke:boot
pnpm --dir apps/game audit:chunks
```

If CSS or Megameal frontend style files are touched:

```bash
pnpm --dir apps/megameal audit:css
```

## Handoff

Report:

- Workflow slice extracted.
- Before/after line counts.
- Files changed.
- Runtime/editor boundary check.
- CSS surface area.
- Commands run.
- Remaining editor monolith risks.
