# AAA Completion Fix 03 - All-Level Asset Tier Semantics

## Finding

All-level reporting now works, but it exposes an asset-tier expectation mismatch.

Example from the latest all-level run:

```txt
yggdrasil desktop-high quality=high assetTier=medium
budget: selectedAssetTier medium expected high
```

The profile expects `runtimeAssetTier: "high"`, while Yggdrasil declares a
level cap:

```json
"runtimeAssets": {
  "maxTier": "medium"
}
```

This is not necessarily wrong. A heavy level may intentionally cap asset tier.
The issue is that certification does not distinguish an intentional level cap
from a runtime failure to select the expected tier.

## Mission

Make performance certification understand effective expected asset tier:

```txt
effectiveExpectedAssetTier = min(profile.runtimeAssetTier, level.runtimeAssets.maxTier)
```

or define an equivalent explicit contract. The result must be visible in the
report.

## Primary Files

- `apps/game/performance-baselines.json`
- `apps/game/scripts/performance-baseline.mjs`
- `apps/game/scripts/profile-level-resources.mjs`
- `apps/game/src/threlte/levels/SceneDocumentLevel.svelte`
- `apps/game/src/threlte/engine/runtimeSceneManifest.ts`
- `apps/game/src/threlte/engine/sceneDocumentTypes.ts`
- `apps/game/src/threlte/editor/scenes/yggdrasil.scene.json`
- `apps/megameal/public/generated/runtime-game-assets/scenes/yggdrasil.runtime-scene.json`

## Work Steps

1. Read `apps/game/AGENTS.md` and
   `apps/game/AAA_COMPLETION_AGENT_COORDINATION.md`.
2. Reproduce the current warning:

```bash
GAME_DEV_PORT=4363 pnpm --dir apps/game certify:performance:all-levels -- --skip-build
```

3. Inspect how `performance-baseline.mjs` builds `summary.selectedAssetTier`
   and compares it to `profile.runtimeAssetTier`.
4. Add an explicit effective-tier calculation using level settings or runtime
   telemetry. Prefer passing the runtime level asset cap through diagnostics so
   reports can say why the tier is capped.
5. Keep `expectedRuntimeTier` separate from asset tier. Render quality can be
   `high` while a level intentionally caps loaded assets to `medium`.
6. Do not remove Yggdrasil's `maxTier: "medium"` unless you prove the level can
   meet budgets with high assets.
7. Update reports to include:

- profile requested asset tier
- level asset tier cap
- effective expected asset tier
- selected asset tier

## Acceptance Criteria

- Yggdrasil desktop-high no longer reports `selectedAssetTier medium expected
  high` if the medium tier is caused by an explicit level cap.
- A true unexpected asset-tier drop still fails/warns.
- All-level reporting remains reporting-only unless `--strict` is used.
- Reports explain capped tiers clearly.

## Validation

```bash
pnpm --dir apps/game lint
pnpm --dir apps/game type-check
pnpm --dir apps/game check:generated-drift
pnpm --dir apps/game audit:engine
GAME_DEV_PORT=4363 pnpm --dir apps/game certify:performance:all-levels -- --skip-build
```

If generated runtime scenes change:

```bash
pnpm --dir apps/game cook:runtime-assets
pnpm --dir apps/game check:generated-drift
```

## Handoff

Report:

- Effective tier semantics implemented.
- Whether Yggdrasil remains capped to medium.
- Any generated files changed.
- Commands run.
- Remaining all-level certification warnings.
