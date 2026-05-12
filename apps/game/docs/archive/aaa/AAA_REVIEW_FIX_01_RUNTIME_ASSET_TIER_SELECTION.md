# AAA Review Fix 01 - Runtime Asset Tier Selection

## Finding

Adaptive asset tier selection is wrong outside the test harness.

In `apps/game/src/threlte/engine/runtimeAssetManifest.ts`,
`getRuntimeProfileAssetTier()` normalizes a missing
`window.__gameRuntimeProfile.expectedRuntimeTier` to `medium`. That means normal
runtime execution gets a profile tier even when no profile was supplied. Then
`selectRuntimeAssetLodTier()` exits early and skips device constraints.

Result: production browser runtime can be pinned to `medium` assets instead of
choosing high, medium, or low based on actual runtime quality and device
constraints.

## Mission

Make runtime asset tier selection deterministic, profile-aware, and safe when no
test harness profile is injected.

## Primary Files

- `apps/game/src/threlte/engine/runtimeAssetManifest.ts`
- `apps/game/scripts/lib/browserHarness.mjs`
- `apps/game/scripts/profile-level-resources.mjs`
- `apps/game/scripts/performance-baseline.mjs`
- `apps/game/performance-baselines.json`

## Work Steps

1. Read `apps/game/AGENTS.md` and
   `apps/game/AAA_REVIEW_FIX_AGENT_COORDINATION.md`.
2. Reproduce the current logic by reading:

```txt
getRuntimeProfileAssetTier()
selectRuntimeAssetLodTier()
normalizeTier()
normalizeLodTier()
```

3. Fix `getRuntimeProfileAssetTier()` so absent profile fields return `null`,
   not `medium`.
4. Only derive a tier from `expectedRuntimeTier` when that field is explicitly
   present and valid.
5. Preserve explicit harness/profile behavior:

- `runtimeAssetTier: "high"` must select high.
- `runtimeAssetTier: "low"` must select low.
- `platformProfile: "mobile"` should still imply low when no explicit asset
  tier exists.

6. Add a small validation path. Prefer a unit-like script or focused assertion
   if the repo has a nearby pattern. If not, add profiling evidence showing:

- desktop-high profile selects high.
- mobile-low profile selects low.
- no injected profile follows quality/device policy instead of defaulting
  through `expectedRuntimeTier`.

## Rules

- Do not hard-code level-specific tier behavior.
- Do not weaken profile budgets.
- Do not make the harness the only way adaptive loading works.
- Do not silently lower quality without telemetry.

## Acceptance Criteria

- Missing `window.__gameRuntimeProfile` no longer forces `medium`.
- Explicit profile tiers still override device heuristics.
- Device constraints still cap assets on low-memory or slow-connection devices.
- Resource/performance reports still show selected `assetTier`.
- No runtime import of editor-only code is introduced.

## Validation

```bash
pnpm --dir apps/game lint
pnpm --dir apps/game type-check
pnpm --dir apps/game audit:runtime-assets
GAME_DEV_PORT=4351 pnpm --dir apps/game profile:resources -- --skip-build --levels=miranda --profile=desktop-high-chromium-1080p
GAME_DEV_PORT=4352 pnpm --dir apps/game profile:resources -- --skip-build --levels=miranda --profile=mobile-low-chromium-390
```

If you add a focused script or test, run it and include the result.

## Handoff

Report:

- Root cause fixed.
- Tier-selection behavior before and after.
- Commands run.
- Any remaining gaps in no-profile runtime telemetry.
