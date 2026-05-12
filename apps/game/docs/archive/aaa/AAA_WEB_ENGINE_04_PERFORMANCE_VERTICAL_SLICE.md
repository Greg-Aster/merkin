# AAA Web Engine 04 - Performance Vertical Slice

## Goal

Make one browser-playable vertical slice honestly performant under the current architecture. The target is not native-engine parity; it is a clean, measured browser target that can be certified without fake budgets.

Miranda is the preferred slice unless current code clearly identifies a better first target.

## Current Concern

Strict desktop-high Miranda certification currently fails by a large margin:

```txt
avgFps=3
lowFps=1
avgFrame=587ms
quality=ultra_low
```

The good news is that strict certification now fails honestly. The next task is to make a narrow slice pass by fixing runtime cost, loading cost, and quality selection.

## Primary Files To Inspect

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

1. Read `apps/game/AGENTS.md`.
2. Capture current performance and resource data for Miranda:

```bash
GAME_DEV_PORT=4338 pnpm --dir apps/game certify:performance -- --level=miranda --profile=desktop-high-chromium-1080p
GAME_DEV_PORT=4336 pnpm --dir apps/game profile:resources -- --levels=miranda
```

3. Identify the largest cost categories:

- long tasks
- time to playable
- GLTF load time
- cache bytes
- draw calls
- lights
- post-processing
- runtime chunks
- reactive/Svelte update cost

4. Fix the largest bottleneck first.
5. Keep budgets honest. Do not change the desktop-high target just to pass.
6. If strict pass is not reachable in one pass, reduce measured cost materially and document the next bottleneck.
7. Preserve visual correctness and level readiness gates.

## Rules

- Do not disable required gameplay systems to pass performance.
- Do not make the engine silently activate before required assets/collision are ready.
- Do not weaken `expectedRuntimeTier`.
- Prefer data-driven render/profile decisions over one-off level hacks.
- If changing cooked assets, regenerate through the pipeline.

## Acceptance Criteria

Preferred:

- `certify:performance:strict` passes for one named level/profile without weakening production thresholds.

Acceptable first pass:

- Measured FPS/frame time improves materially.
- A clear bottleneck is removed.
- Remaining blocker is documented with evidence.
- Strict certification still fails honestly if the target is not met.

## Validation

```bash
pnpm --dir apps/game lint
pnpm --dir apps/game type-check
pnpm --dir apps/game audit:engine
GAME_DEV_PORT=4336 pnpm --dir apps/game profile:resources -- --levels=miranda
GAME_DEV_PORT=4338 pnpm --dir apps/game certify:performance -- --level=miranda --profile=desktop-high-chromium-1080p
GAME_DEV_PORT=4339 pnpm --dir apps/game certify:performance:strict -- --level=miranda --profile=desktop-high-chromium-1080p
```

## Handoff

Report:

- Before/after performance numbers.
- Biggest bottleneck found.
- Bottleneck fixed.
- Whether strict certification passes.
- Any budget or profile changes.
- Runtime payload impact.
- Visual or gameplay risk.
