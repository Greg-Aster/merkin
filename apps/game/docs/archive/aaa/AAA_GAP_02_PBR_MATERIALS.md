# AAA Gap 02: Authored PBR Material Pass

## Goal

Replace approved generated material fallbacks with authored PBR material maps so the runtime content moves beyond engine-grade plumbing into production-grade visual quality.

## Parallel Coordination

Before starting or handing off work, read `AAA_PARALLEL_AGENT_COORDINATION.md`. Follow its file ownership map, merge order, and handoff requirements. Do not edit `AAA_GRAPHICS_REFACTOR_TRACKER.md`, `CRUFT_TODO.md`, or generated manifests unless your assigned task explicitly requires it; otherwise, include proposed tracker/TODO text in your handoff for the integration lead.

## Current State

The material audit is strict enough to catch unapproved issues, but many generated assets still use approved fallback material slots:

- `missingRecommendedSlots=503`
- `unapprovedRecommendedSlots=0`
- Highest backlog entries are listed in `AAA_GRAPHICS_CONTENT_BACKLOG.md`.
- The largest current offenders are Yggdrasil crown/ascent and ribbon assets, followed by generated prefab and Hunyuan assets.

These fallbacks are acceptable for current runtime correctness, but they are not AAA-quality content.

## Target Architecture

Runtime assets should have authored material data for production-relevant surfaces:

- Base color texture or intentional factor.
- Metallic/roughness texture or intentional authored factor.
- Normal map for major surfaces.
- Occlusion where it materially improves form readability.
- Emissive maps for signs, portals, growth, screens, and magical/VFX objects.
- Texture dimensions capped by quality tier.
- Material validation exceptions reserved for tiny, simple, or deliberately flat-shaded assets.

## Key Files

- `apps/game/AAA_GRAPHICS_CONTENT_BACKLOG.md`
- `apps/megameal/public/generated/runtime-game-assets/manifest.json`
- `apps/game/scripts/lib/runtimeAssetManifestAudit.mjs`
- `apps/game/scripts/lib/runtimeAssetCookManifest.mjs`
- `apps/game/scripts/lib/runtimeAssetVariantCooker.mjs`
- Runtime assets under `apps/megameal/public/generated`

## Implementation Steps

1. Pick assets by backlog impact, not by convenience.
   - Start with `/generated/hunyuan3d/yggdrasil-crown-ascent/...`
   - Then `/generated/hunyuan3d/yggdrasil-bifrost-ribbon/...`
   - Then high-use prefabs and repeated scene assets.

2. For each asset, create or source authored material maps.
   - Prefer source-authoring workflow outputs over hand-edited runtime files.
   - Runtime GLBs are deployable outputs, not the long-term source of truth.

3. Re-export or wrap the asset into cooked runtime variants.
   - Preserve the same source URL when possible.
   - Keep high/medium/low variants valid.
   - Keep bounds stable unless level placement is intentionally updated.

4. Regenerate runtime asset manifests:

```bash
pnpm --dir apps/game cook:runtime-assets
pnpm --dir apps/game report:graphics-backlog:write
```

5. Confirm the backlog count decreases.

## Validation

Run:

```bash
pnpm --dir apps/game audit:engine
pnpm --dir apps/game smoke:engine
GAME_DEV_PORT=4324 pnpm --dir apps/game smoke:boot
```

Passing conditions:

- `unapprovedRecommendedSlots=0`
- `missingRecommendedSlots` decreases or remains unchanged for a justified reason.
- No oversized texture failures.
- No unsupported shader extension failures.
- Runtime asset budgets remain under profile limits.

## Do Not

- Do not hide material failures by broadening approval rules.
- Do not add 4K textures by default.
- Do not bake visual quality into code-only shader hacks when an authored map is the right source asset.
- Do not overwrite source assets without documenting provenance and rollback.

## Done Means

The backlog no longer has major scene assets relying on fallback material slots, and any remaining fallbacks are deliberate, small, and documented as style choices rather than missing production work.
