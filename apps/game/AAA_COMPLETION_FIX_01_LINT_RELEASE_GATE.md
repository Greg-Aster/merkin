# AAA Completion Fix 01 - Lint And Quick Release Gate

## Finding

The current work is not releasable because lint fails, and
`release:gate:quick` fails immediately at its lint step.

Observed lint failures:

- `apps/game/src/threlte/editor/EditorHeightmapSourceOverlay.svelte`
  import order.
- `apps/game/src/threlte/editor/EditorSceneToolsPanel.svelte`
  type-import formatting.
- `apps/game/src/threlte/editor/EditorSceneTabHost.svelte`
  type-import formatting.

## Mission

Make the quick release gate pass again without changing behavior.

## Primary Files

- `apps/game/src/threlte/editor/EditorHeightmapSourceOverlay.svelte`
- `apps/game/src/threlte/editor/EditorSceneToolsPanel.svelte`
- `apps/game/src/threlte/editor/EditorSceneTabHost.svelte`
- `apps/game/package.json`
- `apps/game/scripts/release-gate.mjs`

## Work Steps

1. Read `apps/game/AGENTS.md` and
   `apps/game/AAA_COMPLETION_AGENT_COORDINATION.md`.
2. Reproduce:

```bash
pnpm --dir apps/game lint
pnpm --dir apps/game release:gate:quick
```

3. Fix only the formatting/import-order issues reported by Biome.
4. Do not refactor editor behavior in this task.
5. Re-run lint and the quick release gate.

## Acceptance Criteria

- `pnpm --dir apps/game lint` passes.
- `pnpm --dir apps/game release:gate:quick` passes.
- No behavior changes outside formatting/import order.
- No new CSS surface.

## Validation

```bash
pnpm --dir apps/game lint
pnpm --dir apps/game type-check
pnpm --dir apps/game release:gate:quick
```

## Handoff

Report:

- Files formatted.
- Whether quick gate passed.
- Commands run.
- Any unexpected warnings left by build tooling.
