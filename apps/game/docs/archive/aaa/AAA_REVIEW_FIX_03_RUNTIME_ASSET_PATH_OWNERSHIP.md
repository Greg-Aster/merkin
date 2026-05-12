# AAA Review Fix 03 - Runtime Asset Path Ownership

## Finding

Runtime asset cooking is producing nested generated URLs like:

```txt
/generated/runtime-game-assets/generated/runtime-game-assets/prefabs/anomaly-cluster/anomaly-cluster-cyan.high.glb
```

The immediate cause is `getCookedPublicUrl()` in
`apps/game/scripts/lib/runtimeAssetCookManifest.mjs`, which prepends
`/generated/runtime-game-assets/` even when the source URL already starts inside
that generated runtime root.

This works mechanically, but it confuses source/runtime ownership and creates
generated asset sprawl.

## Mission

Make cooked runtime asset URLs stable, non-nested, and clearly owned by the
runtime asset pipeline.

## Primary Files

- `apps/game/scripts/lib/runtimeAssetCookManifest.mjs`
- `apps/game/scripts/cook-runtime-assets.mjs`
- `apps/game/scripts/lib/runtimeAssetVariantCooker.mjs`
- `apps/game/scripts/lib/runtimeAssetManifestAudit.mjs`
- `apps/megameal/public/generated/runtime-game-assets/manifest.json`
- `apps/megameal/public/generated/runtime-game-assets/generated/runtime-game-assets/`
- `apps/game/CRUFT_FILE_INVENTORY.md`
- `apps/game/CRUFT_TODO.md`

## Work Steps

1. Read `apps/game/AGENTS.md` and
   `apps/game/AAA_REVIEW_FIX_AGENT_COORDINATION.md`.
2. Confirm all current nested generated paths:

```bash
rg -n "generated/runtime-game-assets/generated/runtime-game-assets" apps/game apps/megameal/public/generated/runtime-game-assets
find apps/megameal/public/generated/runtime-game-assets/generated/runtime-game-assets -type f -print
```

3. Decide the intended convention:

- Source authoring assets should not live under the cooked runtime output root
  unless explicitly marked as already-cooked runtime inputs.
- Cooked variants should live under one runtime root, not a nested copy of that
  root.

4. Fix URL generation so already-runtime-rooted source URLs are normalized to a
   single runtime-root output path.
5. Regenerate runtime assets through the pipeline.
6. Remove nested generated files only after confirming no manifest references
   them.
7. Update cleanup docs with the final ownership rule.

## Rules

- Do not hand-edit `manifest.json` as the primary fix.
- Do not delete generated files until the regenerated manifest no longer
  references them.
- Do not break existing public URLs for authored source assets unless all
  manifests and scene references are migrated together.

## Acceptance Criteria

- No manifest URLs contain
  `generated/runtime-game-assets/generated/runtime-game-assets`.
- The nested generated directory is removed or documented as obsolete after
  references are gone.
- `check:generated-drift` passes.
- `audit:runtime-assets` passes.
- Cleanup docs explain source asset ownership versus cooked runtime output.

## Validation

```bash
pnpm --dir apps/game cook:runtime-assets
pnpm --dir apps/game check:generated-drift
pnpm --dir apps/game audit:runtime-assets
pnpm --dir apps/game audit:engine
rg -n "generated/runtime-game-assets/generated/runtime-game-assets" apps/game apps/megameal/public/generated/runtime-game-assets
```

## Handoff

Report:

- URL convention chosen.
- Pipeline files changed.
- Generated files regenerated.
- Nested files removed or retained with reason.
- Commands run.
