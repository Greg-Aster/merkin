# AAA Web Engine Agent 04 - Broad Performance Certification

## Goal

Move beyond quick release-gate confidence toward broader device and level
certification. Performance should be measured across levels and profiles, not
assumed because the build passes.

## Current Concern

The quick gate passes, but strict broad performance certification is not yet the
bar for every level/device profile. Browser constraints are real, so the work
must establish honest budgets, clear reports, and actionable failures.

## Primary Files

- `apps/game/scripts/performance-baseline.mjs`
- `apps/game/scripts/release-gate.mjs`
- `apps/game/scripts/profile-level-resources.mjs`
- `apps/game/reports/**`
- `apps/game/src/threlte/engine/runtimeSceneManifest.ts`
- `apps/game/src/threlte/engine/levelValidation.ts`
- `apps/game/src/threlte/levels/SceneDocumentLevel.svelte`
- `apps/megameal/public/generated/runtime-game-assets/manifest.json`

## Read First

- `apps/game/AGENTS.md`
- `apps/game/ENGINE_ARCHITECTURE.md`
- `apps/game/AAA_TARGET_01_STRICT_PERFORMANCE_CERTIFICATION.md`
- `apps/game/AAA_WEB_ENGINE_AGENT_COORDINATION.md`

## Work Steps

1. Capture the current baseline:

```bash
pnpm --dir apps/game baseline:performance
pnpm --dir apps/game certify:performance:all-levels
pnpm --dir apps/game profile:resources:all-levels
```

2. Identify whether failures are caused by:
   - runtime asset payload
   - chunk loading
   - triangle count
   - draw calls
   - collision readiness
   - spawn/readiness delay
   - device-tier selection
3. Do not weaken budgets. If a budget is unrealistic, document why and propose
   a staged budget with evidence.
4. Make one certification improvement:
   - add missing level/profile coverage
   - improve report clarity
   - enforce a real budget that was only reported
   - fix one measured performance failure
5. Keep all-level reporting useful even where strict certification remains
   intentionally limited.

## Guardrails

- Do not make certification pass by skipping levels silently.
- Do not remove slow metrics because they are inconvenient.
- Do not change adaptive loading semantics without coordinating with bundle or
  runtime architecture owners.
- Do not commit noisy report churn unless it is the intended artifact.

## Acceptance Criteria

- Performance reporting covers more of the real game surface or is clearer and
  more actionable.
- At least one previously weak certification path is stricter, better measured,
  or fixed.
- Remaining non-strict coverage is documented honestly.
- Release gate remains green.

## Validation

```bash
pnpm --dir apps/game lint
pnpm --dir apps/game type-check
pnpm --dir apps/game profile:resources:all-levels
pnpm --dir apps/game certify:performance:all-levels
pnpm --dir apps/game release:gate:quick
```

If strict certification is changed:

```bash
pnpm --dir apps/game certify:performance:strict
```

## Handoff

Report:

- baseline captured
- level/profile coverage changed
- budgets changed, if any, with rationale
- failures fixed
- remaining certification gaps
- commands run

