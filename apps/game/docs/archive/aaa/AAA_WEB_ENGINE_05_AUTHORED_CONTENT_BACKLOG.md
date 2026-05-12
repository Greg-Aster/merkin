# AAA Web Engine 05 - Authored Content Backlog

## Goal

Reduce dependency on generated or fallback material content by converting the highest-value runtime assets to explicit authored PBR content and validated runtime variants.

The aim is an industry-style content pipeline: source assets are authored, cooked assets are optimized, and runtime manifests describe exactly what ships.

## Current Concern

The current graphics backlog still reports:

```txt
missingRecommendedSlots=325
unapprovedRecommendedSlots=0
lodTargetMisses=0
```

This means the fallback use is known and approved, but still large. The engine pipeline exists; content quality and authoring completeness need to catch up.

## Primary Files To Inspect

- `apps/game/AAA_GRAPHICS_CONTENT_BACKLOG.md`
- `apps/game/scripts/report-aaa-graphics-content-backlog.mjs`
- `apps/game/scripts/author-weathered-monolith-pbr.mjs`
- `apps/game/scripts/author-yggdrasil-crown-pbr.mjs`
- `apps/game/scripts/lib/authoredPbrGlb.mjs`
- `apps/game/scripts/lib/runtimeAssetVariantCooker.mjs`
- `apps/game/scripts/lib/runtimeAssetManifestAudit.mjs`
- `apps/game/authoring/assets/`
- `apps/megameal/public/generated/runtime-game-assets/manifest.json`
- `apps/megameal/public/generated/runtime-game-assets/generated/`

## Work Steps

1. Read `apps/game/AGENTS.md`.
2. Generate the current backlog report:

```bash
pnpm --dir apps/game report:graphics-backlog
```

3. Pick a small, visible, high-impact asset group from the backlog.
4. Add or improve authored PBR maps for that group:

- base color
- roughness
- metallic when relevant
- normal when relevant
- emissive when relevant
- clear naming and provenance

5. Cook runtime variants through existing scripts or add a narrow authoring script if needed.
6. Regenerate runtime assets and backlog data through the pipeline.
7. Do not hand-edit generated manifest counts.

## Rules

- Source assets belong in authoring paths; optimized variants belong in runtime generated paths.
- Do not ship oversized source GLBs/textures as runtime payloads.
- Maintain low, medium, and high runtime variants when applicable.
- Keep generated fallback exceptions approved and counted.
- Do not expand the backlog while reducing one asset group.

## Acceptance Criteria

- `missingRecommendedSlots` is materially reduced.
- `unapprovedRecommendedSlots` remains `0`.
- `lodTargetMisses` remains `0`.
- Runtime manifest audits pass.
- The changed asset group has clear authored material provenance.

## Validation

```bash
pnpm --dir apps/game report:graphics-backlog
pnpm --dir apps/game cook:runtime-assets
pnpm --dir apps/game report:graphics-backlog:write
pnpm --dir apps/game audit:runtime-assets
pnpm --dir apps/game audit:engine
pnpm --dir apps/game check:generated-drift
```

If visual output changes:

```bash
GAME_DEV_PORT=4337 pnpm --dir apps/game smoke:visual
```

## Handoff

Report:

- Asset group improved.
- Before/after `missingRecommendedSlots`.
- Generated files changed.
- Source authoring files changed.
- Runtime payload impact.
- Commands run.
- Remaining largest backlog groups.
