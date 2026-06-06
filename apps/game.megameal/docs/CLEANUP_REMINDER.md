# Cleanup Reminder Prompt

Use this prompt when asking an AI agent to finish, review, or clean up work in `apps/game.megameal`.

## Copy-Paste Prompt

```text
You are working in /home/greggles/Merkin/apps/game.megameal.

Before you declare the task complete, audit your work for architecture violations, incomplete implementation, cruft, orphan code, stale scripts, and stale documentation. Do not stop at "it compiles." Verify that the implementation is correct, maintainable, and aligned with the engine architecture.

Required cleanup and verification:

1. Read the current architecture docs before judging the code:
   - ARCHITECTURE.md
   - GAME_ENGINE_DESIGN_DOCUMENT.md
   - ENGINE_CONTRACT_REGISTER.md
   - docs/GAME_ENGINE_MIGRATION_PLAN.md
   - docs/Done/SCENE_ENVIRONMENT_FEATURE_PLAN.md and docs/SKYBOX_FUTURE_FEATURES_IMPLEMENTATION_PLAN.md when touching scene environment, sky, atmosphere, video sky, or reflection probe work

2. Confirm the architecture boundaries still hold:
   - Astro/app code only hosts and mounts the browser client.
   - Svelte/UI code observes state and dispatches commands; it does not own runtime game state.
   - Game code owns gameplay meaning and rules, but does not import Astro, Svelte, Three, Threlte, Rapier, or browser APIs.
   - Engine core is plain TypeScript and does not import app, UI, game, renderer, physics, browser, or framework code.
   - Engine modules define framework-neutral contracts.
   - Adapters are the only place for Three, Rapier, browser APIs, Web Audio, and similar implementation details.
   - The root engine public API must not accidentally expose adapter implementation details.
   - The old /home/greggles/Merkin/apps/game project is reference-only. Do not import it or copy old runtime architecture.

3. Verify ownership and data flow:
   - The engine world is the canonical runtime state.
   - Three objects are render projections only.
   - Rapier objects are physics implementation details only.
   - Svelte stores and props mirror selected state only.
   - Player, camera, physics, input, and level state flow through components, resources, commands, events, systems, and adapters.
   - System registration belongs in the game/runtime composition layer, not scattered through UI or page shell code.

4. Remove cruft before handoff:
   - No temporary probes, one-off scripts, throwaway tests, scratch files, debug logs, commented-out code, placeholder TODOs, or unused exports.
   - No orphan files that are not referenced by package scripts, source imports, docs, or a clear future contract.
   - No duplicate docs or stale status claims.
   - No broad catch-all test/source files when a focused owner file is more maintainable.
   - No generated artifacts unless they are intentionally owned, reproducible, and documented.
   - No stale package scripts referencing deleted files.
   - No unused dependencies added to package.json.

5. Check docs against the implementation:
   - If behavior, architecture, validation, or migration status changed, update the relevant docs in the same task.
   - If a doc says something is implemented, verify it from code.
   - If a doc references a file or command, verify that file or command exists.
   - Mark partial/future work honestly; do not call the whole migration complete if only a foundation packet is complete.
   - For active feature packets, distinguish saved plan, partial scaffolding, runtime-supported behavior, and future work.

6. Run focused validation:
   - pnpm --dir apps/game.megameal audit:engine-boundaries
   - pnpm --dir apps/game.megameal type-check
   - pnpm --dir apps/game.megameal lint
   - pnpm --dir apps/game.megameal test:input-contract
   - pnpm --dir apps/game.megameal test:charged-action-contract
   - pnpm --dir apps/game.megameal test:story-note-contract
   - pnpm --dir apps/game.megameal test:scene-environment-contract
   - pnpm --dir apps/game.megameal test:runtime-scene-contract
   - pnpm --dir apps/game.megameal test:audio-contract
   - pnpm --dir apps/game.megameal test:audio-spatial-contract
   - pnpm --dir apps/game.megameal test:light-contract
   - pnpm --dir apps/game.megameal test:water-firefly-contract
   - pnpm --dir apps/game.megameal test:level-authoring-contract
   - pnpm --dir apps/game.megameal test:generated-glb-import-contract
   - pnpm --dir apps/game.megameal test:observatory-visual-terrain-contract
   - pnpm --dir apps/game.megameal test:kinematic-character-contract
   - pnpm --dir apps/game.megameal test:level-editor-collision-cook-contract
   - pnpm --dir apps/game.megameal ci:observatory-collision-drift
   - pnpm --dir apps/game.megameal cook:observatory-collision
   - pnpm --dir apps/game.megameal build
   - git diff --check -- apps/game.megameal pnpm-lock.yaml

7. Do not run a dev server, browser smoke check, or full app smoke harness unless explicitly asked.

8. In the final response, report:
   - What you changed.
   - What you removed as cruft.
   - What validation commands you ran and whether they passed.
   - Any commands you could not run and why.
   - Any remaining known gaps or future work.
   - Any new files, scripts, docs, tests, dependencies, or CSS surface area.

If validation fails, fix the cause or clearly report the failure. Do not hide failures behind "should work." If the task required cleanup, the cleanup is not optional.
```

## Quick Local Checklist

Use this checklist before handing work back:

- [ ] No framework imports leaked into `src/engine/core`, `src/engine/modules`, `src/engine/data`, or `src/game`.
- [ ] No browser globals outside `src/app`, `src/ui`, `.astro`/`.svelte`, or `src/engine/adapters/browser`.
- [ ] No direct imports from sibling `apps/game`.
- [ ] No new broad catch-all files without a clear owner.
- [ ] No package scripts point at deleted files.
- [ ] No dead exports, unused helpers, temporary scripts, debug logs, placeholder TODOs, or commented-out code.
- [ ] Docs reflect the current code and current validation commands.
- [ ] `audit:engine-boundaries`, `type-check`, `lint`, `test:input-contract`, `test:charged-action-contract`, `test:story-note-contract`, `test:scene-environment-contract`, `test:runtime-scene-contract`, `test:audio-contract`, `test:audio-spatial-contract`, `test:light-contract`, `test:water-firefly-contract`, `test:level-authoring-contract`, `test:generated-glb-import-contract`, `test:observatory-visual-terrain-contract`, `test:kinematic-character-contract`, `test:level-editor-collision-cook-contract`, `ci:observatory-collision-drift`, `cook:observatory-collision`, `build`, and `git diff --check` pass.

## Architecture Red Flags

Treat these as blockers unless there is an explicit architecture decision recorded in docs:

- A Svelte component creates entities, owns player position, owns physics state, or runs scene lifecycle.
- Game systems import Three, Rapier, Svelte, Astro, `window`, `document`, or `localStorage`.
- Engine core imports anything outside core/math/plain TypeScript support.
- App mount code registers gameplay systems directly instead of delegating to the game runtime factory.
- Renderer or physics objects become the source of truth for gameplay.
- A runtime path repairs missing authored content silently.
- A migration copies old engine code instead of extracting a new contract.
- A validation script exists only as a one-off harness with no durable owner.
- A plan-only scene environment mode is described as runtime-supported before schema, assets, adapter projection, and focused validation exist.

## Expected Validation Commands

```bash
pnpm --dir apps/game.megameal audit:engine-boundaries
pnpm --dir apps/game.megameal type-check
pnpm --dir apps/game.megameal lint
pnpm --dir apps/game.megameal test:input-contract
pnpm --dir apps/game.megameal test:charged-action-contract
pnpm --dir apps/game.megameal test:story-note-contract
pnpm --dir apps/game.megameal test:scene-environment-contract
pnpm --dir apps/game.megameal test:runtime-scene-contract
pnpm --dir apps/game.megameal test:audio-contract
pnpm --dir apps/game.megameal test:audio-spatial-contract
pnpm --dir apps/game.megameal test:light-contract
pnpm --dir apps/game.megameal test:water-firefly-contract
pnpm --dir apps/game.megameal test:level-authoring-contract
pnpm --dir apps/game.megameal test:generated-glb-import-contract
pnpm --dir apps/game.megameal test:observatory-visual-terrain-contract
pnpm --dir apps/game.megameal test:kinematic-character-contract
pnpm --dir apps/game.megameal test:level-editor-collision-cook-contract
pnpm --dir apps/game.megameal ci:observatory-collision-drift
pnpm --dir apps/game.megameal cook:observatory-collision
pnpm --dir apps/game.megameal build
git diff --check -- apps/game.megameal pnpm-lock.yaml
```
