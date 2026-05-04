# Active Theory Effects Audit

Focused comparison between the Megameal portal intro and public techniques visible in the Active Theory site bundle/config.

## Ranked Borrow List

| Rank | Technique | Visual Impact | Performance Cost | Megameal Status |
| ---: | --- | --- | --- | --- |
| 1 | Quality tiers and capability detection | Medium | Low | Started: portal scene now supports high/balanced/lean tiers |
| 2 | GPU compressed textures, especially KTX2 | Medium | Low or positive | Recommended next asset-pipeline task |
| 3 | Shader or instanced particle field | High | Low after refactor | Started: intro particles now render as one shader-driven `Points` field |
| 4 | Optimized/baked logo GLB and material pass | High | Low or positive | Started: homepage logo now uses an optimized GLB |
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

## Recommended Next Steps

1. Convert carousel stills to generated smaller WebGL-friendly variants.
2. Build a KTX2 texture pipeline for WebGL-only scene textures.
3. Build a visual fallback path for very low-memory devices.
4. Do a dedicated material pass for the logo after the optimized mesh is approved visually.
