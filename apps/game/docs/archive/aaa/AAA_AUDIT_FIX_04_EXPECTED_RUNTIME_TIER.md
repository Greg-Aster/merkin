# AAA Audit Fix 04 - Expected Runtime Tier Is Not Enforced

## Finding

`performance-baselines.json` records `expectedRuntimeTier`, but `performance-baseline.mjs` only writes that value to the report. It does not fail when the runtime quality tier drops below the expected tier.

Example problem: a profile can declare `expectedRuntimeTier: "high"` and still pass while the runtime reports `quality=low`.

## Mission

Make performance certification enforce runtime quality tier expectations. A desktop-high certification cannot pass if adaptive quality drops to low unless the profile explicitly allows that fallback.

## Primary Files

- `apps/game/scripts/performance-baseline.mjs`
- `apps/game/performance-baselines.json`
- Runtime performance telemetry that provides `summary.finalQuality`

## Work Steps

1. Define tier comparison semantics.

Suggested tier order:

```txt
ultra_low < low < medium < high
```

Use the actual tier names emitted by the runtime. If other tier names exist, include them deliberately.

2. Add profile config.

Support either:

- `expectedRuntimeTier`: minimum required tier.
- Optional `allowedRuntimeTiers`: explicit allowed set for special reporting profiles.

3. Extend `compareAgainstBudgets`.

Fail strict and non-strict budget comparison when:

- `expectedRuntimeTier` is set.
- `summary.finalQuality` is lower than expected.
- The final quality is not in `allowedRuntimeTiers`, if provided.

4. Improve report output.

Print a clear budget failure like:

```txt
finalQuality >= high expected, actual low
```

5. Add a minimal test path if the repo has script-level tests. If not, validate with a deliberately too-high expected tier and confirm the command fails.

## Acceptance Criteria

- A desktop-high profile with `expectedRuntimeTier: "high"` fails if final quality is `low`.
- The performance report includes expected and actual runtime tier.
- Reporting-only developer profiles can intentionally omit tier enforcement.
- The behavior is documented in `performance-baselines.json` comments are not possible in JSON, so use nearby docs/tracker handoff text.

## Validation

```bash
GAME_DEV_PORT=4332 pnpm --dir apps/game certify:performance:strict -- --skip-build --level=miranda --profile=desktop-high-chromium-1080p
```

If the current runtime still drops to low, this command should fail after the fix unless the profile is changed to a lower honest expected tier.

Also run:

```bash
pnpm --dir apps/game type-check
```

## Handoff

Report:

- Tier order implemented.
- Profile fields added or changed.
- Before/after behavior for a profile that drops below expected tier.
- Any profiles intentionally left without tier enforcement.
