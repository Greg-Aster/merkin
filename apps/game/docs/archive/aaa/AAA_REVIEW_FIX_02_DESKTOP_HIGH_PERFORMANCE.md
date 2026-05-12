# AAA Review Fix 02 - Desktop High Performance Certification

## Finding

Miranda mobile-low strict performance passes, but desktop-high strict
certification does not. The observed desktop-high result was approximately:

```txt
avgFps=2
lowFps=2
avgFrame=479.1ms
quality=high
platform=desktop
assetTier=high
```

The desktop-high profile in `apps/game/performance-baselines.json` requires:

```txt
minAverageFps=30
minLowestFps=18
maxAverageFrameTimeMs=34
```

## Mission

Find and reduce the largest real runtime cost blocking the Miranda desktop-high
vertical slice. Do not fake success by weakening budgets, disabling required
gameplay systems, or silently dropping below the expected runtime tier.

## Primary Files

- `apps/game/performance-baselines.json`
- `apps/game/scripts/performance-baseline.mjs`
- `apps/game/scripts/profile-level-resources.mjs`
- `apps/game/src/threlte/features/performance/systems/Performance.svelte`
- `apps/game/src/threlte/features/performance/utils/runtimeVisualQualityPolicy.ts`
- `apps/game/src/threlte/levels/RuntimeGameplayRenderer.svelte`
- `apps/game/src/threlte/levels/RuntimeActorNode.svelte`
- `apps/game/src/threlte/utils/gltfAssetCache.ts`
- `apps/game/src/threlte/systems/SimplePostProcessing.svelte`

## Work Steps

1. Read `apps/game/AGENTS.md` and
   `apps/game/AAA_REVIEW_FIX_AGENT_COORDINATION.md`.
2. Capture a fresh baseline:

```bash
GAME_DEV_PORT=4353 pnpm --dir apps/game profile:resources -- --levels=miranda --profile=desktop-high-chromium-1080p
GAME_DEV_PORT=4354 pnpm --dir apps/game certify:performance -- --level=miranda --profile=desktop-high-chromium-1080p
GAME_DEV_PORT=4355 pnpm --dir apps/game certify:performance:strict -- --level=miranda --profile=desktop-high-chromium-1080p
```

3. Identify the largest cost category from evidence:

- long tasks
- time to playable
- GLTF load time
- GLTF cache bytes
- draw calls
- triangles
- texture count
- post-processing
- reactive/Svelte update cost
- unnecessary runtime chunks

4. Fix the largest bottleneck first. Keep the change scoped and measurable.
5. Re-run the same commands and record before/after numbers.
6. If strict desktop-high still fails, leave the failure honest and document the
   next bottleneck.

## Rules

- Do not reduce the desktop-high budget just to pass.
- Do not lower `expectedRuntimeTier` for desktop-high.
- Do not disable collision, player activation gates, or required assets.
- Do not solve this with a one-off Miranda-only component hack unless it is
  clearly moving bad data into a manifest or profile contract.

## Acceptance Criteria

Preferred:

- `certify:performance:strict` passes for Miranda desktop-high without weakening
  budgets.

Acceptable first pass:

- Average FPS, lowest FPS, average frame time, or time-to-playable improves
  materially.
- The largest remaining bottleneck is documented with command output.
- Strict certification still fails if the target is not honestly met.

## Validation

```bash
pnpm --dir apps/game lint
pnpm --dir apps/game type-check
pnpm --dir apps/game audit:engine
GAME_DEV_PORT=4353 pnpm --dir apps/game profile:resources -- --levels=miranda --profile=desktop-high-chromium-1080p
GAME_DEV_PORT=4354 pnpm --dir apps/game certify:performance -- --level=miranda --profile=desktop-high-chromium-1080p
GAME_DEV_PORT=4355 pnpm --dir apps/game certify:performance:strict -- --level=miranda --profile=desktop-high-chromium-1080p
```

## Handoff

Report:

- Before/after performance numbers.
- Bottleneck fixed.
- Whether strict desktop-high passes.
- Runtime payload impact.
- Any visual or gameplay tradeoff.
- Next bottleneck if still failing.
