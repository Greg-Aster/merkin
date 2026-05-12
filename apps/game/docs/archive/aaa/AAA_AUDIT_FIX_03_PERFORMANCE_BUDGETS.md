# AAA Audit Fix 03 - Strict Performance Budgets Are Not Meaningful

## Finding

Strict certification currently passes with values that are not production quality. The current desktop-high budget allows:

- `minAverageFps: 2`
- `minLowestFps: 1`
- `maxAverageFrameTimeMs: 750`

A test run passed with roughly `avgFps=3`, `avgFrame=416.4ms`, and runtime quality dropped to `low`. That is telemetry, not AAA-grade certification.

## Mission

Replace placeholder performance thresholds with honest certification behavior. If the engine cannot meet production thresholds yet, strict certification should fail or remain reporting-only. Do not certify a 3 FPS desktop-high run.

## Primary Files

- `apps/game/performance-baselines.json`
- `apps/game/scripts/performance-baseline.mjs`
- `apps/game/scripts/profile-level-resources.mjs`
- `apps/game/AAA_GRAPHICS_REFACTOR_TRACKER.md`
- `.github/workflows/game-engine-ci.yml`

## Work Steps

1. Establish realistic target classes.

Suggested minimum certification targets:

- Desktop-high: at least 30 FPS average, lowest FPS at least 18, average frame time no more than 34 ms.
- Mobile-low: at least 24 FPS average, lowest FPS at least 15, average frame time no more than 44 ms.
- TV-medium: at least 24 FPS average, lowest FPS at least 15, average frame time no more than 44 ms.

If those targets are not reachable, mark the slice as not certified and leave it reporting-only.

2. Replace placeholder budgets.

Do not leave `minAverageFps` at `2` or `maxAverageFrameTimeMs` at `750` in any certified profile.

3. Run repeated captures for the chosen slice.

Use preview/static runtime, not only dev server. Capture at least two runs before declaring a strict gate stable.

4. Decide gate policy.

- If the slice meets real budgets, keep `certify:performance:strict` as a gate.
- If it does not, move the job to report-only and document the blockers.

5. Keep the report useful.

The report should show measured FPS, frame time, quality tier, loaded GLTF bytes, active streaming cells, and time-to-playable.

## Acceptance Criteria

- No certified desktop-high profile uses placeholder thresholds like `2 FPS`.
- Strict certification fails for a 3 FPS desktop-high run.
- If certification is not ready, CI does not pretend it is ready.
- Tracker language distinguishes telemetry/reporting from certification.

## Validation

```bash
GAME_DEV_PORT=4332 pnpm --dir apps/game certify:performance -- --skip-build --level=miranda --profile=desktop-high-chromium-1080p
GAME_DEV_PORT=4332 pnpm --dir apps/game certify:performance:strict -- --skip-build --level=miranda --profile=desktop-high-chromium-1080p
pnpm --dir apps/game profile:resources -- --levels=miranda
```

Use a different `GAME_DEV_PORT` if the default is occupied.

## Handoff

Report:

- Final budgets.
- Measured performance results.
- Whether strict certification is enabled or deferred.
- Main performance blockers if deferred.
- Any CI changes coordinated with `AAA_AUDIT_FIX_02_CI_PERFORMANCE_LEVEL_MISMATCH.md`.
