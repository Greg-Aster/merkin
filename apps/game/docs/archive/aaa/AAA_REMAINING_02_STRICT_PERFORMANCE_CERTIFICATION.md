# AAA Remaining 02 - Strict Performance Certification

## Mission

Turn existing performance capture into trustworthy certification for browser gameplay. A non-strict warning pass is useful telemetry, but it is not a production certification gate.

## Baseline Evidence

The repo has `baseline:performance`, `baseline:performance:strict`, `certify:performance`, `certify:performance:strict`, `profile:resources`, and `profile:resources:strict`. Current tracker status says performance passes with warnings and is not strict-certified.

## Ownership

Primary ownership:

- `apps/game/performance-baselines.json`
- `apps/game/scripts/performance-baseline.mjs`
- `apps/game/scripts/profile-level-resources.mjs`
- Runtime telemetry stores and diagnostics.

Coordinate with:

- Rendering agent before raising postFX cost.
- Streaming agent before setting active cell/cache budgets.
- Material agent before texture budget gates.
- CI agent before hard-failing strict checks in release.

## Work Packages

1. Choose the first certification vertical slice.
   - Use one or two levels with stable visual content.
   - Keep mobile, desktop, and TV profiles separate.
   - Do not certify editor mode as gameplay.

2. Make capture production-like.
   - Prefer static build/preview or release-gate equivalent runtime over dev-server-only measurement.
   - Record time-to-playable, average FPS, lowest FPS, frame time, draw calls, triangles, texture count, long tasks, GLTF cache bytes, and active streaming cells.

3. Fix current warnings before hard gates.
   - Identify whether warnings come from dev server, render cost, asset payload, streaming, or test harness overhead.
   - Optimize the source system rather than raising budgets by default.

4. Create approved baselines.
   - Add stable budgets based on repeated local runs.
   - Keep budgets as thresholds with headroom, not one lucky run.

5. Promote strict certification gradually.
   - Start with `certify:performance:strict` for the approved vertical slice.
   - Keep broad all-level performance as reporting until it is stable.

## Acceptance Criteria

- At least one gameplay level/profile pair is strict-certified.
- Certification report is written and useful for review.
- Budget failures throw in strict mode.
- Current non-strict warnings are either fixed or documented as non-certified profiles.
- No performance gate depends on editor mode.

## Avoid

- Do not hide warnings by deleting metrics.
- Do not raise budgets without measured justification.
- Do not make all levels strict before the vertical slice is stable.
- Do not use dev-only helper state as performance evidence.

## Validation

```bash
pnpm --dir apps/game profile:resources
pnpm --dir apps/game baseline:performance
pnpm --dir apps/game certify:performance
pnpm --dir apps/game certify:performance:strict
```

When stable:

```bash
pnpm --dir apps/game profile:resources:strict
pnpm --dir apps/game baseline:performance:strict
```

## Handoff

Report:

- Levels and profiles certified.
- Metrics before and after.
- Warnings fixed or still open.
- Budget changes and evidence.
- Whether checks were run against dev server, preview, or release gate.
