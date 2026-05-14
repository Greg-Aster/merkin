# AAA Completion Fix 02 - Desktop High Performance Certification

## Finding

Miranda desktop-high strict certification still fails.

Latest observed result:

```txt
avgFps=6
lowFps=6
avgFrame=166.4ms
calls=38
tris=10100
textures=28
quality=high
assetTier=high
```

Budget requires:

```txt
avgFps >= 30
lowestFps >= 18
avgFrame <= 34ms
triangles <= 8000
```

## Mission

Reduce the largest real runtime bottleneck for Miranda desktop-high without
weakening the certification budget or dropping below high runtime quality.

## Primary Files

- `apps/game/performance-baselines.json`
- `apps/game/scripts/performance-baseline.mjs`
- `apps/game/scripts/profile-level-resources.mjs`
- `apps/game/src/threlte/features/performance/systems/Performance.svelte`
- `apps/game/src/threlte/features/performance/utils/runtimeVisualQualityPolicy.ts`
- `apps/game/src/threlte/levels/RuntimeGameplayRenderer.svelte`
- `apps/game/src/threlte/levels/RuntimeActorNode.svelte`
- `apps/game/src/threlte/levels/SceneDocumentLevel.svelte`
- `apps/game/src/threlte/systems/SimplePostProcessing.svelte`
- `apps/game/src/threlte/editor/scenes/miranda.scene.json`

## Work Steps

1. Read `apps/game/AGENTS.md` and
   `apps/game/AAA_COMPLETION_AGENT_COORDINATION.md`.
2. Capture a fresh baseline:

```bash
GAME_DEV_PORT=4361 pnpm --dir apps/game certify:performance:strict -- --level=miranda --profile=desktop-high-chromium-1080p
GAME_DEV_PORT=4362 pnpm --dir apps/game profile:resources -- --levels=miranda --profile=desktop-high-chromium-1080p
```

3. Identify the biggest cost using evidence:

- frame time
- triangles over budget
- long tasks
- post-processing
- required asset preload
- reactive/Svelte update cost
- runtime diagnostics overhead
- unnecessary render work in the desktop-high profile

4. Fix the largest bottleneck first.
5. Keep readiness gates, collision, and required assets intact.
6. Do not change desktop-high budget thresholds to pass.
7. Re-run the same commands and report before/after numbers.

## Acceptance Criteria

Preferred:

- `certify:performance:strict` passes for Miranda desktop-high.

Acceptable if the target remains too large for one pass:

- The bottleneck is measurably reduced.
- Strict certification still fails honestly.
- The next bottleneck is documented with numbers.

## Validation

```bash
pnpm --dir apps/game lint
pnpm --dir apps/game type-check
pnpm --dir apps/game audit:engine
GAME_DEV_PORT=4361 pnpm --dir apps/game certify:performance:strict -- --level=miranda --profile=desktop-high-chromium-1080p
GAME_DEV_PORT=4362 pnpm --dir apps/game profile:resources -- --levels=miranda --profile=desktop-high-chromium-1080p
```

## Handoff

Report:

- Before/after performance numbers.
- Bottleneck fixed.
- Whether strict desktop-high passes.
- Visual/gameplay tradeoffs.
- Runtime payload impact.
- Remaining performance blockers.
