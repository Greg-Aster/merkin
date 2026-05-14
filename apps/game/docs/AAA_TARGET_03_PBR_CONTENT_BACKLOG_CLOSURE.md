# AAA Target 03 - PBR Content Backlog Closure

## Goal

Reduce approved fallback material slots by converting high-value runtime assets to authored, validated PBR content. The engine can already track material debt; this task reduces the actual content debt.

## Current Evidence

The current generated backlog report shows:

```txt
lodTargetMisses=0
missingRecommendedSlots=289
unapprovedRecommendedSlots=0
```

That means LOD validation is clean, and missing PBR slots are known approved fallbacks. It does not mean the art content is production complete.

## Primary Files

- `apps/game/AAA_GRAPHICS_CONTENT_BACKLOG.md`
- `apps/game/scripts/report-aaa-graphics-content-backlog.mjs`
- `apps/game/scripts/lib/authoredPbrGlb.mjs`
- `apps/game/scripts/lib/runtimeAssetVariantCooker.mjs`
- `apps/game/scripts/lib/runtimeAssetManifestAudit.mjs`
- `apps/game/scripts/author-*.mjs`
- `apps/game/authoring/assets/`
- `apps/megameal/public/generated/runtime-game-assets/manifest.json`
- `apps/megameal/public/generated/runtime-game-assets/**`

## Work Steps

1. Read `apps/game/AGENTS.md` and run the backlog report.
2. Choose one visible asset family from the top of the backlog. Good candidates include Yggdrasil ribbon, biomechanical growth planters, courtyard fountain, command console, growth planter, bench growth, portal apparatus, or Solitude plateau.
3. Add or improve authored PBR source maps for that family:
   - base color
   - roughness
   - metallic when relevant
   - normal when relevant
   - emissive when relevant
4. Add a narrow authoring script only if an existing authoring script cannot support the asset family.
5. Regenerate runtime variants through the cooker.
6. Regenerate the graphics backlog from the manifest.
7. Keep `unapprovedRecommendedSlots=0` and `lodTargetMisses=0`.

## Guardrails

- Do not hand-edit generated manifest counts.
- Do not mark placeholder factor colors as authored PBR.
- Do not ship raw source assets as optimized runtime payloads.
- Do not increase runtime payload materially without explaining why.
- Keep source art and cooked runtime output in their correct roots.

## Acceptance Criteria

- `missingRecommendedSlots` decreases from `289`.
- `unapprovedRecommendedSlots` remains `0`.
- `lodTargetMisses` remains `0`.
- Changed assets have clear authoring provenance.
- Runtime asset audits pass.

## Validation

```bash
pnpm --dir apps/game report:graphics-backlog
pnpm --dir apps/game cook:runtime-assets
pnpm --dir apps/game report:graphics-backlog:write
pnpm --dir apps/game audit:runtime-assets
pnpm --dir apps/game audit:engine
pnpm --dir apps/game check:generated-drift
```

If the asset is visible in gameplay:

```bash
GAME_NO_SERVER=1 GAME_DEV_PORT=4344 pnpm --dir apps/game smoke:visual
```

## Handoff

Report:

- Asset family improved.
- Before/after `missingRecommendedSlots`.
- Runtime payload delta.
- Source authoring files changed.
- Generated files changed.
- Commands run.
- Remaining largest fallback families.
