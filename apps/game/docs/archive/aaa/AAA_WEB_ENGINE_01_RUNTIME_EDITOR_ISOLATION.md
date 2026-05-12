# AAA Web Engine 01 - Runtime Editor Isolation

## Goal

Normal gameplay must not load editor-only code, editor-only data, or editor-only CSS. The runtime should boot from cooked scene manifests, runtime asset manifests, runtime systems, and gameplay UI only.

This is about clean architecture and payload discipline. Browser constraints are accepted, but the runtime must not pay for tooling it is not using.

## Current Concern

Recent resource profiling still reported editor chunk loads during a Miranda gameplay capture:

```txt
editorChunks=2
```

That means the runtime/editor boundary is not fully isolated yet.

## Primary Files To Inspect

- `apps/game/src/threlte/Game.svelte`
- `apps/game/src/threlte/core/gameRuntimeFeatureLoader.ts`
- `apps/game/src/threlte/core/GameWorld.svelte`
- `apps/game/src/threlte/GameCanvasStage.svelte`
- `apps/game/src/threlte/editor/*`
- `apps/game/src/threlte/levels/*`
- `apps/game/scripts/profile-level-resources.mjs`
- `apps/game/scripts/audit-chunk-ownership.mjs`
- `apps/game/scripts/lib/chunkOwnership.mjs`

## Work Steps

1. Read `apps/game/AGENTS.md`.
2. Reproduce the current runtime payload issue:

```bash
GAME_DEV_PORT=4336 pnpm --dir apps/game profile:resources -- --levels=miranda
```

3. Identify exactly which editor chunks load during non-editor gameplay and why.
4. Trace imports from runtime files into `src/threlte/editor`.
5. Separate runtime-safe data/contracts from editor-only stores/components.
6. Keep editor feature loading behind explicit editor activation only.
7. Do not move editor code into a generic runtime file just to hide the chunk name. The dependency must actually be runtime-safe.
8. Add or tighten an audit if the current chunk audit cannot catch the leak.

## Rules

- Runtime code may import shared typed contracts only if those contracts have no Svelte/editor/store side effects.
- Editor session stores, editor panels, editor scene layers, editor overlays, and editor-only CSS must not load in normal gameplay.
- Do not weaken `profile:resources` or chunk ownership checks.
- Do not remove editor capability; preserve `/?editor=1` and `/?editor=1/`.

## Acceptance Criteria

- Gameplay resource profile for Miranda reports `editorChunks=0`.
- `/?editor=1` and `/?editor=1/` still load the editor.
- No runtime module imports editor-only Svelte components or editor session stores unless behind explicit editor activation.
- Any shared editor/runtime contract has a clear neutral home.

## Validation

```bash
pnpm --dir apps/game lint
pnpm --dir apps/game type-check
pnpm --dir apps/game audit:chunks
GAME_DEV_PORT=4336 pnpm --dir apps/game profile:resources -- --levels=miranda
GAME_DEV_PORT=4337 pnpm --dir apps/game smoke:boot
```

## Handoff

Report:

- Which editor chunks were loading and why.
- Files moved or split.
- Whether `editorChunks=0` was achieved.
- Browser smoke result for gameplay and editor.
- Runtime payload impact.
- CSS surface area changed, if any.
- Remaining runtime/editor boundary risks.
