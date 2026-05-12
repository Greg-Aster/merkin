# AAA Review Fix 04 - All Level Certification Coverage

## Finding

Current performance certification is narrowed to Miranda only:

```json
"levels": ["miranda"]
```

The certification metadata also marks all-level browser performance as
reporting-only until repeated preview captures meet production thresholds. That
is honest, but it means the engine is not yet certified across the actual game
levels.

## Mission

Create a practical all-level certification path without pretending every level
already meets production budgets.

## Primary Files

- `apps/game/performance-baselines.json`
- `apps/game/scripts/performance-baseline.mjs`
- `apps/game/scripts/profile-level-resources.mjs`
- `apps/game/scripts/release-gate.mjs`
- `apps/game/scripts/lib/runtimeAssetManifestAudit.mjs`
- `apps/game/AAA_GRAPHICS_REFACTOR_TRACKER.md`
- `apps/game/ENGINE_MIGRATION_CHECKLIST.md`

## Work Steps

1. Read `apps/game/AGENTS.md` and
   `apps/game/AAA_REVIEW_FIX_AGENT_COORDINATION.md`.
2. Inventory all levels that should be certified:

- `miranda`
- `observatory`
- `sci-fi-room`
- `solitude`
- `yggdrasil`

3. Decide separate levels of enforcement:

- hard strict gate: known certified vertical slice
- reporting gate: all migrated levels
- warning gate: levels not yet ready for strict certification

4. Add or improve script support so all-level reporting can run without
   weakening the strict Miranda gate.
5. Ensure reports clearly identify:

- profile
- level
- selected asset tier
- selected runtime quality
- time to playable
- FPS/frame-time result
- pass/fail/reporting-only status

6. Update tracker docs with the per-level certification status.

## Rules

- Do not make strict gates pass by removing levels from visibility.
- Do not lower budgets to hide expensive levels.
- Reporting-only status is acceptable only when it is explicit and documented.
- Do not block unrelated development on all-level strict certification if the
  current task is to create the path.

## Acceptance Criteria

- Miranda remains the strict vertical-slice target.
- All migrated levels have a reporting path for at least one browser profile.
- Reports identify non-certified levels clearly.
- Release gate behavior is explicit: what is hard-gated, what is reported, and
  what remains advisory.
- Tracker docs reflect the actual state.

## Validation

```bash
pnpm --dir apps/game lint
pnpm --dir apps/game type-check
pnpm --dir apps/game audit:engine
GAME_DEV_PORT=4356 pnpm --dir apps/game profile:resources -- --levels=miranda,observatory,sci-fi-room,solitude,yggdrasil --profile=mobile-low-chromium-390
GAME_DEV_PORT=4357 pnpm --dir apps/game profile:resources -- --levels=miranda,observatory,sci-fi-room,solitude,yggdrasil --profile=desktop-high-chromium-1080p
pnpm --dir apps/game release:gate:quick
```

If script support changes, run the new all-level command and include output.

## Handoff

Report:

- Levels covered.
- Which profiles are strict versus reporting-only.
- Any levels that fail to boot/profile.
- Tracker docs updated.
- Commands run.
