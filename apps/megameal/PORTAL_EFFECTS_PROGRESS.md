# Megameal Portal Effects Progress

Last updated: 2026-05-04

This file tracks the current state of the Megameal homepage portal effects work, separate from the ranked effects audit.

## Current Checkpoint

- Branch: `dev`
- Latest effects commit before this note: `a933fd4 Optimize Megameal portal effects`
- Scope: homepage portal intro scene, 3D logo, ring glow, particles, and screen-panel detail.

## Implemented

- Added scene quality tiers: `high`, `balanced`, and `lean`.
- The portal shell now chooses quality from viewport size, device memory, reduced-data settings, and DPR.
- Replaced many individual particle components with one shader-driven `Points` particle field.
- Kept slow hue cycling on the rings and particle field.
- Added an optimized homepage logo GLB:
  - original: `11.82 MB`
  - optimized: `6.54 MB`
  - texture reduced from `2048px` to `1024px`
- Removed unused generated alpha textures for screen panel media.
- Skips decorative screen-panel frost, caustic, sheen, and reflection layers on `lean`.
- Added stronger cleanup for WebGL resources when the scene unmounts.
- Added generated WebGL-friendly carousel still variants:
  - source stills ranged from `15.4 KiB` to `9,924.7 KiB`
  - generated panel stills now range from `0.9 KiB` to `48.2 KiB`
  - seven panel stills are `768x432`
  - the small story-mode still is `400x224` to avoid upscaling and keep KTX2 dimensions block-friendly
- The 3D portal scene now prefers `webglStillSrc` for panel textures while retaining the original `stillSrc` values.
- Added an ETC1S KTX2 path for portal panel stills:
  - generated KTX2 panel stills range from `3.2 KiB` to `79.7 KiB`
  - non-lean scene quality tries KTX2 first, then falls back to WebP
  - lean scene quality keeps WebP first to minimize transfer size
  - Basis transcoder assets are generated under `public/assets/vendor/basis`
- Added a runtime material pass for the optimized logo GLB:
  - explicit sRGB/filtering/anisotropy settings for the baked logo texture
  - modest emissive, roughness, metalness, and environment-intensity tuning
  - shadows remain disabled on the logo mesh

## Verified

- `pnpm --dir apps/megameal generate:home-intro-stills`
- `pnpm --dir apps/megameal exec ktx2check` against generated panel KTX2 files
- `pnpm --dir apps/megameal type-check`
- `pnpm --dir apps/megameal audit:css:changed`
- `pnpm --dir apps/megameal audit:css`
- `git diff --check`
- Playwright Chrome smoke test:
  - homepage loaded
  - one WebGL canvas present
  - scrolling the portal requested seven `.ktx2` panel textures
  - Basis transcoder JS/WASM requested successfully
  - optimized GLB requested successfully
  - no shader compile errors caught
  - no KTX2 request failures caught
  - no logo-load errors caught
  - canvas screenshot was nonblank after the logo/material pass

## Deferred

- Broader KTX2 coverage for future WebGL-only textures after the scene stabilizes.
- Very low-memory visual fallback mode.
  - Intentionally skipped while the target floor remains 4 GB+ devices.
- Per-quality variants for WebGL panel textures.
- Bloom and heavy postprocessing remain deferred because the earlier test harmed transparency/performance tradeoffs.

## Notes

- No new CSS was added in the effects implementation pass.
- Existing CSS audit warnings are oversized-component warnings already present in the Megameal codebase.
- `apps/megameal/CLAUDE.md` is local/untracked and was not included in the effects commit.
