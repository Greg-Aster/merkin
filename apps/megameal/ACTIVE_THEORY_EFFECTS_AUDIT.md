# Active Theory Effects Audit

Focused comparison between the Megameal portal intro and public techniques visible in the Active Theory site bundle/config.

Progress notes live in `PORTAL_EFFECTS_PROGRESS.md`.

## Ranked Borrow List

| Rank | Technique | Visual Impact | Performance Cost | Megameal Status |
| ---: | --- | --- | --- | --- |
| 1 | Quality tiers and capability detection | Medium | Low | Started: portal scene now supports high/balanced/lean tiers |
| 2 | GPU compressed textures, especially KTX2 | Medium | Low or positive | Started: portal panel stills now have ETC1S KTX2 variants |
| 3 | Shader or instanced particle field | High | Low after refactor | Started: intro particles now render as one shader-driven `Points` field |
| 4 | Optimized/baked logo GLB and material pass | High | Low or positive | Started: optimized GLB now has runtime material tuning |
| 5 | Material-level shader effects | Medium-high | Low-medium | Tested and disabled; keep as optional future direction |
| 6 | Matcaps, lightmaps, and environment maps | High | Low | Good candidate for logo/panel polish |
| 7 | Data-driven scene tuning | Medium | Low | Useful after scene stabilizes |
| 8 | Selective bloom or volumetric lighting | High | Medium-high | Defer; previous bloom experiment was not worth the tradeoff |
| 9 | Mouse/fluid/curl interactions | High | High | Later, after base scene is leaner |
| 10 | Worker/OffscreenCanvas architecture | Medium | High complexity | Not recommended yet |

## First Implementation Pass

- Added a portal scene quality tier: `high`, `balanced`, and `lean`.
- The parent portal shell chooses the tier from viewport size, device memory, data-saver, and DPR.
- The 3D scene reduces particle count by quality tier.
- The screen panels skip decorative frost/caustic/sheen/reflection texture layers on `lean`.
- Replaced the individual sprite particle components with a single shader-driven particle field.
- Added an optimized homepage logo GLB: 11.82 MB to 6.54 MB, with the WebGL texture reduced from 2048px to 1024px.
- Added generated WebGL carousel still variants for the portal screen panels.
  - Large source stills now route to 768x432 WebP panel textures.
  - The small story-mode source routes to a 400x224 WebP panel texture without upscaling.
- Added ETC1S KTX2 versions of the portal screen panel textures.
  - Non-lean scene quality uses KTX2 panel textures with WebP fallback.
  - Lean scene quality keeps the smaller WebP panel textures to avoid extra network cost on constrained devices.
  - Basis transcoder assets are copied into `public/assets/vendor/basis`.
- Added a runtime material pass for the optimized logo GLB.
  - The baked base-color texture gets explicit sRGB color space, filtering, and anisotropy settings.
  - The mesh material gets modest emissive, roughness, metalness, and environment-intensity tuning.
  - Shadows remain disabled for the logo mesh.

## Recommended Next Steps

1. Consider additional quality-tier texture sizes if visual review shows the 768px panel stills are more detail than needed.
2. Extend KTX2 coverage to future WebGL-only textures as they stabilize.
3. Revisit material-level shader effects only if a specific visual problem remains.
4. Keep bloom, heavy postprocessing, and worker architecture deferred unless performance budgets change.
