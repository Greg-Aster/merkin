# AAA Completion Fix 04 - Editor Monolith And Warnings

## Finding

The editor works, but the main ownership surfaces are still too large:

- `EditorPanel.svelte`: about 3123 lines.
- `editorPublishReadiness.ts`: about 980 lines.
- `Game.svelte`: about 931 lines.

Build output also warns:

```txt
EditorSceneToolsPanel.svelte: Component has unused export property
'selectedTerrainSourceName'
```

## Mission

Remove the new editor warning and extract one meaningful editor workflow slice
from the largest remaining files. The goal is better ownership, not cosmetic
line-count games.

## Primary Files

- `apps/game/src/threlte/editor/EditorPanel.svelte`
- `apps/game/src/threlte/editor/EditorSceneToolsPanel.svelte`
- `apps/game/src/threlte/editor/EditorSceneTabHost.svelte`
- `apps/game/src/threlte/editor/EditorCollisionTabHost.svelte`
- `apps/game/src/threlte/editor/EditorPublishReadinessPanel.svelte`
- `apps/game/src/threlte/editor/editorPublishReadiness.ts`
- `apps/game/src/threlte/editor/editorPublishReadinessController.ts`
- `apps/game/src/threlte/editor/editorPublishReadinessDataSource.ts`
- `apps/game/src/threlte/Game.svelte`

## Work Steps

1. Read `apps/game/AGENTS.md` and
   `apps/game/AAA_COMPLETION_AGENT_COORDINATION.md`.
2. Record current line counts:

```bash
wc -l apps/game/src/threlte/editor/EditorPanel.svelte apps/game/src/threlte/editor/editorPublishReadiness.ts apps/game/src/threlte/Game.svelte
```

3. Fix the unused `selectedTerrainSourceName` export:

- If `EditorSceneToolsPanel.svelte` needs the value, render/use it.
- If not, remove the prop from `EditorSceneToolsPanel.svelte` and stop passing
  it through that path.
- Preserve `EditorCollisionTabHost.svelte` behavior if it still uses the value.

4. Extract one coherent editor slice. Good candidates:

- scene tools terrain publishing controls
- collision/source preview wiring
- publish-readiness action state
- editor scene tab orchestration

5. Do not create another catch-all file.
6. Keep runtime/editor boundaries intact.
7. Record ending line counts.

## Acceptance Criteria

- The unused export warning is gone.
- `EditorPanel.svelte` or `editorPublishReadiness.ts` loses a meaningful
  workflow slice.
- New files have clear ownership names.
- Runtime code does not import editor-only modules.
- Lint and type-check pass.

## Validation

```bash
pnpm --dir apps/game lint
pnpm --dir apps/game type-check
pnpm --dir apps/game audit:chunks
GAME_DEV_PORT=4364 pnpm --dir apps/game smoke:boot
```

If CSS or Megameal frontend styles are touched:

```bash
pnpm --dir apps/megameal audit:css
```

## Handoff

Report:

- Warning fixed.
- Workflow slice extracted.
- Before/after line counts.
- Files changed.
- CSS surface area.
- Commands run.
- Remaining editor ownership risks.
