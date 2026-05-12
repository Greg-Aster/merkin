# AAA Next 01: Authored PBR Material Pass

## Goal

Replace approved fallback material coverage with authored, inspectable PBR material assets so generated runtime GLBs stop looking like placeholder content and become production art assets.

## Coordination

Before starting, read `AAA_NEXT_AGENT_COORDINATION.md`. This agent owns material source quality and manifest material compliance. Do not modify rendering architecture, level streaming, or editor UI beyond the minimum data plumbing needed for material readiness.

## Agent Assignment

Take the first production-art vertical slice. Your job is not to solve every material in one pass; it is to prove the authored PBR path by reducing the fallback backlog for one visible asset family, preserving provenance in the cooked manifest, and leaving the backlog clearer than you found it.

Priority target: start with the largest/highest-visibility fallback group in `AAA_GRAPHICS_CONTENT_BACKLOG.md`, unless the integration lead assigns a specific level.

## Current Baseline

- Runtime asset audit passes.
- `lodTargetMisses=0`.
- `unapprovedRecommendedSlots=0`.
- `missingRecommendedSlots=355` remains the visible content-quality backlog.
- `AAA_GRAPHICS_CONTENT_BACKLOG.md` is the current source of material debt.

## Target Architecture

Runtime assets should have authored material intent:

- Albedo/base color texture where needed.
- Normal map for forms that need surface detail.
- Roughness map for non-flat highlights.
- Metallic map only where metal is actually authored.
- AO/cavity map for baked surface grounding.
- Emissive map for screens, runes, portals, and active tech.
- Texture dimensions and compression selected by platform profile.
- Explicit exceptions for intentionally flat, stylized, or vertex-colored assets.

The runtime manifest should distinguish real authored material compliance from approved placeholder fallback.

## Work Packages

1. Triage the material backlog.
   - Group `missingRecommendedSlots` by asset family and level.
   - Identify hero assets first: Solitude ground/plateau, Yggdrasil crown/tree, portal/console, sci-fi room set dressing.
   - Separate "needs authored maps" from "valid flat material exception."

2. Define material source conventions.
   - Source texture names should be predictable: `asset_baseColor`, `asset_normal`, `asset_roughness`, `asset_metallic`, `asset_ao`, `asset_emissive`.
   - Runtime variants should preserve provenance back to source material files.
   - Add a manifest field only if existing metadata cannot express the distinction.

3. Author or assign first material set.
   - Start with a narrow vertical slice, not all remaining fallback slots.
   - Pick one level and one asset family.
   - Re-cook, audit, and visually smoke before scaling.

4. Tighten validation.
   - Keep `unapprovedRecommendedSlots=0`.
   - Reduce approved fallback count over time.
   - Do not hide missing maps by removing recommendations unless the asset is intentionally exempt.

5. Update backlog output.
   - Regenerate `AAA_GRAPHICS_CONTENT_BACKLOG.md` after material manifest changes.
   - Add clear "remaining authored material work" groups.

## Key Files

- `apps/game/AAA_GRAPHICS_CONTENT_BACKLOG.md`
- `apps/game/scripts/cook-runtime-assets.mjs`
- `apps/game/scripts/lib/runtimeAssetManifestAudit.mjs`
- `apps/game/scripts/lib/runtimeAssetCookManifest.mjs`
- `apps/game/scripts/lib/runtimeAssetVariantCooker.mjs`
- `apps/game/scripts/report-aaa-graphics-content-backlog.mjs`
- `apps/megameal/public/generated/runtime-game-assets/manifest.json`
- `apps/megameal/public/generated/runtime-game-assets/models/`
- `apps/megameal/public/generated/runtime-game-assets/generated/`

## Validation

Run:

```bash
pnpm --dir apps/game cook:runtime-assets
pnpm --dir apps/game report:graphics-backlog:write
pnpm --dir apps/game audit:engine
pnpm --dir apps/game smoke:visual
pnpm --dir apps/game type-check
```

For any rendering-visible material pass, also run:

```bash
GAME_NO_SERVER=1 GAME_DEV_PORT=4322 pnpm --dir apps/game smoke:boot
```

## Do Not

- Do not silence material warnings by weakening the audit.
- Do not mark placeholder generated textures as authored source art.
- Do not raise texture budgets without a measured payload reason.
- Do not touch unrelated prefab, streaming, or editor architecture.

## Done Means

- The selected material slice has fewer approved fallback slots.
- Material provenance is represented in the cooked manifest.
- Visual smoke passes.
- The backlog clearly shows what remains and why.
