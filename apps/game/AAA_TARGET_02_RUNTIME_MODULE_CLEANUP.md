# AAA Target 02 - Runtime Module Cleanup

## Goal

Reduce cruft and mixed responsibilities in `Game.svelte`, editor modules, player modules, ocean rendering, and conversation systems so the game code is maintainable as an engine instead of a pile of feature components.

## Current Evidence

- `CRUFT_TODO.md` still lists active refactor items for `Game.svelte`, editor modules, player modules, ocean, audio, interaction, star map, and conversation.
- `AAA_GRAPHICS_REFACTOR_TRACKER.md` says `Game.svelte` cleanup and runtime/editor cruft cleanup are still in progress.
- Runtime fallback scene loading has largely been removed, but mixed module ownership remains.

## Primary Files

- `apps/game/src/threlte/Game.svelte`
- `apps/game/src/threlte/GameCanvasStage.svelte`
- `apps/game/src/threlte/core/*`
- `apps/game/src/threlte/editor/Editor*.svelte`
- `apps/game/src/threlte/editor/editor*.ts`
- `apps/game/src/threlte/features/player/*`
- `apps/game/src/threlte/features/ocean/components/OceanComponent.svelte`
- `apps/game/src/threlte/features/conversation/*`
- `apps/game/src/threlte/systems/*`
- `apps/game/CRUFT_TODO.md`

## Work Steps

1. Read `apps/game/AGENTS.md`, `ENGINE_ARCHITECTURE.md`, and the `CRUFT_TODO.md` refactor queue.
2. Pick one bounded cleanup target. Do not attempt the whole queue in one pass.
3. Identify the current responsibilities in that target file.
4. Move engine contracts into narrow stores/services/adapters where the surrounding code already has that pattern.
5. Keep UI components as rendering or interaction surfaces, not engine ownership hubs.
6. Remove dead imports, stale comments, and broad barrels only when proven safe.
7. Update `CRUFT_TODO.md` only for the files actually completed, or provide proposed text for an integration lead.

## Preferred First Targets

- Finish making `Game.svelte` an app shell only.
- Split `EditorPanel.svelte` responsibilities where panel orchestration, command execution, and publish/cook workflows are still mixed.
- Remove legacy-language and hidden assumptions from `OceanComponent.svelte`.
- Narrow conversation feature exports so runtime imports do not pull authoring or heavy feature code.
- Keep player input, spawn, movement, and visual/avatar concerns separated.

## Guardrails

- Do not change behavior while refactoring unless the bug is documented.
- Do not introduce duplicate controller/store layers.
- Do not move code into generic utilities without a clear contract.
- Do not edit generated runtime assets for a pure cleanup task.
- Do not delete files unless `rg` proves they are unused and the deletion is reflected in validation.

## Acceptance Criteria

- The chosen module has fewer mixed responsibilities.
- Runtime/editor boundaries are clearer.
- No broad runtime import pulls editor persistence, bake-only code, or authoring helpers.
- `CRUFT_TODO.md` reflects completed file dispositions when applicable.

## Validation

```bash
pnpm --dir apps/game lint
pnpm --dir apps/game type-check
pnpm --dir apps/game audit:chunks
pnpm --dir apps/game audit:engine
```

For runtime behavior changes:

```bash
pnpm --dir apps/game smoke:engine
```

For editor changes:

```bash
GAME_NO_SERVER=1 GAME_DEV_PORT=4343 pnpm --dir apps/game smoke:boot
```

## Handoff

Report:

- Module cleaned up and responsibilities moved.
- Files changed.
- Any deleted code and how it was proven unused.
- Runtime/editor boundary impact.
- Commands run.
- CSS surface area, if any.
- Remaining cleanup targets.
