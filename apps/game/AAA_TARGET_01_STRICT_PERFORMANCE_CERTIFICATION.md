# AAA Target 01 - Strict Performance Certification

## Goal

Make performance certification honest and useful across the browser game engine. The first hard target is still one certified vertical slice, but the work should move toward repeatable certification for all migrated levels and device profiles.

## Current Evidence

- `performance-baselines.json` defines production desktop-high and mobile-low budgets.
- `certify:performance:all-levels` exists, but all-level coverage is reporting-only.
- `certify:performance:strict` is the hard gate path, but the tracker says Miranda desktop-high is not broadly certified yet.
- Do not weaken budgets to manufacture a pass.

## Primary Files

- `apps/game/performance-baselines.json`
- `apps/game/scripts/performance-baseline.mjs`
- `apps/game/scripts/profile-level-resources.mjs`
- `apps/game/src/threlte/features/performance/systems/Performance.svelte`
- `apps/game/src/threlte/features/performance/stores/performanceStore.ts`
- `apps/game/src/threlte/features/performance/utils/runtimeVisualQualityPolicy.ts`
- `apps/game/src/threlte/levels/RuntimeGameplayRenderer.svelte`
- `apps/game/src/threlte/levels/RuntimeActorNode.svelte`
- `apps/game/src/threlte/utils/gltfAssetCache.ts`
- `apps/game/src/threlte/systems/SimplePostProcessing.svelte`

## Work Steps

1. Read `apps/game/AGENTS.md`, `AAA_GRAPHICS_REFACTOR_TRACKER.md`, and `performance-baselines.json`.
2. Capture a current baseline for Miranda desktop-high and all-level reporting.
3. Use `profile:resources` output to identify the largest bottleneck first: draw calls, triangles, GLTF cache bytes, shader/post-processing cost, streaming cell count, long tasks, or time to playable.
4. Fix the largest measured cost without bypassing required assets, collision readiness, spawn validation, or visual correctness.
5. If one strict slice can pass without weakening budgets, make it pass.
6. If strict certification still fails, leave it failing honestly and document the next bottleneck with before/after numbers.
7. Update only performance-related docs or proposed tracker text. Do not edit unrelated coordination docs.

## Guardrails

- Do not lower `minAverageFps`, `minLowestFps`, or raise frame-time limits just to pass.
- Do not silently drop required render/collision assets.
- Do not disable gameplay systems or post-processing globally unless that is a named quality-tier policy.
- Prefer data-driven profile/quality changes over level-specific hacks.
- If cooked assets change, regenerate them through the existing cooker.

## Acceptance Criteria

Preferred:

- `certify:performance:strict` passes for at least one named level/profile using production budgets.

Acceptable first pass:

- A measurable bottleneck is reduced materially.
- Strict certification remains honest if it still fails.
- The next bottleneck is identified with command output evidence.

## Validation

Run as much of this set as applies to the changed surface:

```bash
pnpm --dir apps/game lint
pnpm --dir apps/game type-check
pnpm --dir apps/game audit:engine
GAME_DEV_PORT=4340 pnpm --dir apps/game profile:resources -- --levels=miranda
GAME_DEV_PORT=4341 pnpm --dir apps/game certify:performance -- --level=miranda --profile=desktop-high-chromium-1080p
GAME_DEV_PORT=4342 pnpm --dir apps/game certify:performance:strict -- --level=miranda --profile=desktop-high-chromium-1080p
pnpm --dir apps/game certify:performance:all-levels
```

## Handoff

Report:

- Before/after FPS, frame time, time-to-playable, draw calls, triangles, cache bytes, and quality tier.
- Whether strict certification passes.
- Any budget or profile changes.
- Runtime payload impact.
- Visual/gameplay risks.
- Commands run and commands skipped.
