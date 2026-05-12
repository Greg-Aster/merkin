# AAA Next 05: Performance Certification

## Goal

Turn the current audits into platform certification gates for browser gameplay on mobile, desktop, and TV targets.

## Coordination

Before starting, read `AAA_NEXT_AGENT_COORDINATION.md`. This agent owns performance budgets, telemetry, and certification thresholds. Coordinate with rendering, streaming, asset import, and CI agents before adding hard failure thresholds.

## Agent Assignment

Convert runtime telemetry into certification evidence. Your job is to create a repeatable performance capture and baseline for at least one level/profile pair, then document which regressions should become hard failures later.

Priority target: certify one vertical slice first; do not chase every chunk warning before the capture loop is stable.

## Current Baseline

- Runtime asset manifest has mobile/desktop/TV platform profiles.
- Runtime telemetry captures frame time, draw calls, triangles, active streaming state, and cache bytes.
- Build still reports large chunks, especially `three-vendor`, `editor-document`, and `editor-panel`.
- Browser smoke validates boot, not sustained performance.

## Target Architecture

Every level should have measurable certification for:

- Cold boot time.
- Time to playable state.
- Initial payload.
- Runtime memory ceiling.
- FPS and frame time.
- Draw calls and triangles.
- Texture memory.
- Loaded GLB cache bytes.
- Active streaming cell count.
- Quality-tier fallback behavior.

## Work Packages

1. Define target classes.
   - Mobile low.
   - Desktop high.
   - TV medium.
   - Optional developer unlimited profile.

2. Add performance capture commands.
   - Use scripted camera paths or stable bookmarks.
   - Record telemetry windows after level-ready.
   - Output JSON summaries for CI comparison.

3. Add trend reports.
   - Keep current values visible without making every fluctuation a failure.
   - Fail only on clear regressions or exceeded budgets.

4. Reduce large runtime bundles.
   - Separate editor-only code from gameplay route.
   - Confirm manual chunks match ownership rules.
   - Consider lazy loading heavy systems after readiness.

5. Certify a vertical slice.
   - Start with Solitude and Sci-Fi Room.
   - Establish budgets, then enforce them.

## Key Files

- `apps/game/performance-baselines.json`
- `apps/game/scripts/performance-baseline.mjs`
- `apps/game/scripts/profile-level-resources.mjs`
- `apps/game/scripts/profile-three-runtime.mjs`
- `apps/game/scripts/lib/chunkOwnership.mjs`
- `apps/game/src/threlte/stores/runtimeProductionTelemetry.ts`
- `apps/game/src/threlte/features/performance/systems/Performance.svelte`
- `apps/game/src/threlte/features/performance/utils/runtimeVisualQualityPolicy.ts`

## Validation

Run:

```bash
pnpm --dir apps/game baseline:performance
pnpm --dir apps/game profile:resources
pnpm --dir apps/game audit:engine
pnpm --dir apps/game smoke:engine
pnpm --dir apps/game type-check
```

For strict gates once baselines are approved:

```bash
pnpm --dir apps/game baseline:performance:strict
pnpm --dir apps/game profile:resources:strict
```

## Do Not

- Do not lower quality globally to pass a single device class.
- Do not hide bundle-size warnings without replacing them with measured gates.
- Do not set budgets after seeing one lucky run.
- Do not mix editor and gameplay certification targets.

## Done Means

- At least one level has approved performance baselines by platform profile.
- Performance commands produce stable summaries.
- Budget failures are actionable.
- Large bundle risks are tracked with owners.
