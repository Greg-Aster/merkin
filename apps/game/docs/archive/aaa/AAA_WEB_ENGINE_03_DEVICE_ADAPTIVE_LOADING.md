# AAA Web Engine 03 - Device Adaptive Loading

## Goal

Make runtime loading adapt predictably across desktop, mobile, and TV-style browser targets. The engine should choose appropriate runtime asset tiers, streaming behavior, render quality, and readiness gates based on explicit profiles.

This is not about pretending the browser can match native engines. It is about making device constraints explicit and enforceable.

## Current Concern

The engine has profile, LOD, streaming, and telemetry plumbing, but per-device certification is not fully enforced across levels. Adaptive loading exists as a skeleton, not a proven production pipeline.

## Primary Files To Inspect

- `apps/game/performance-baselines.json`
- `apps/game/src/threlte/features/performance/utils/runtimeVisualQualityPolicy.ts`
- `apps/game/src/threlte/stores/runtimeRenderProfileStore.ts`
- `apps/game/src/threlte/engine/runtimeAssetManifest.ts`
- `apps/game/src/threlte/engine/levelAssetPreloader.ts`
- `apps/game/src/threlte/engine/runtimeWorldPartition.ts`
- `apps/game/src/threlte/stores/runtimeStreamingTelemetry.ts`
- `apps/game/scripts/profile-level-resources.mjs`
- `apps/game/scripts/performance-baseline.mjs`
- `apps/game/scripts/lib/runtimeAssetManifestAudit.mjs`

## Work Steps

1. Read `apps/game/AGENTS.md`.
2. Inventory current profile fields and runtime tier selection.
3. Confirm how the runtime chooses low, medium, and high cooked assets.
4. Confirm whether mobile and TV profiles are defined, validated, and actually reachable.
5. Add missing profile contracts before adding behavior.
6. Make adaptive loading observable in resource/profile reports:

- selected platform profile
- selected asset tier
- render quality tier
- active streaming cells
- required asset count
- deferred optional asset count
- GLTF cache bytes

7. Add profile-specific validation if the current audits cannot prove the behavior.
8. Avoid hard-coding level-specific device behavior in Svelte components.

## Rules

- Device profiles must be data/config driven.
- Required assets must still load before player activation.
- Optional assets may stream later, but must be reported.
- Do not lower quality silently. Quality drops need telemetry and budget context.
- Do not make strict certification pass by weakening targets.

## Acceptance Criteria

- A resource profile run clearly reports selected device/runtime profile data.
- Miranda has at least desktop-high and mobile-low behavior that can be compared.
- Runtime chooses the intended cooked asset tier for the profile.
- Missing profile metadata is audited.
- The work creates a path to all-level device certification without blocking unrelated development.

## Validation

```bash
pnpm --dir apps/game lint
pnpm --dir apps/game type-check
pnpm --dir apps/game audit:runtime-assets
pnpm --dir apps/game audit:engine
GAME_DEV_PORT=4336 pnpm --dir apps/game profile:resources -- --levels=miranda
GAME_DEV_PORT=4338 pnpm --dir apps/game certify:performance -- --level=miranda --profile=desktop-high-chromium-1080p
```

If a mobile profile exists or is added, run its equivalent resource/performance command and report it.

## Handoff

Report:

- Profiles inspected or added.
- How asset tier selection works after the change.
- Telemetry fields added or improved.
- Any levels missing adaptive metadata.
- Commands run.
- Remaining device certification gaps.
