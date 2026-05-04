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

## Verified

- `pnpm --dir apps/megameal type-check`
- `pnpm --dir apps/megameal audit:css:changed`
- `pnpm --dir apps/megameal audit:css`
- `git diff --check`
- Playwright Chrome smoke test:
  - homepage loaded
  - one WebGL canvas present
  - optimized GLB requested successfully
  - no shader compile errors caught
  - no logo-load errors caught

## Deferred

- KTX2/GPU-compressed texture pipeline.
- Dedicated logo material pass after visual review of the optimized mesh.
- Very low-memory visual fallback mode.
- Further carousel image optimization for WebGL panel textures.
- Bloom and heavy postprocessing remain deferred because the earlier test harmed transparency/performance tradeoffs.

## Notes

- No new CSS was added in the effects implementation pass.
- Existing CSS audit warnings are oversized-component warnings already present in the Megameal codebase.
- `apps/megameal/CLAUDE.md` is local/untracked and was not included in the effects commit.
