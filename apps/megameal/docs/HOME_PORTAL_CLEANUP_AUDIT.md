# Home Portal Cleanup Audit

Date: 2026-06-14
Repository: `Greg-Aster/merkin`
Scope: `apps/megameal` and `packages/blog-core` only where the active MEGA MEAL site imports shared layout/components.

This is a read-only production-behavior audit. No production code changes are proposed as part of this document. The active home portal at `megameal.org` should be treated as protected until every cleanup has direct source, route/build, asset, generated-output, and visual verification.

## Guardrails

- Keep the live home portal visually and functionally equivalent.
- Do not remove navigation links, search, hero media, portal destination rotation, demo video player, audio behavior, scroll behavior, accessibility copy, or public routes.
- Treat public assets under `apps/megameal/public` as route-visible even when source search finds no imports, because Astro copies them into `dist`.
- Treat `packages/blog-core` layout and banner-stage changes as cross-site changes, not Megameal-only changes.
- Separate mechanical cleanup from behavior refactors.

## Protected Surface Checklist

| File | Role in active home portal | Classification | Audit note |
| --- | --- | --- | --- |
| `apps/megameal/src/pages/[...page].astro` | Home route composition. Renders the portal slots and imports portal components. | Do not touch | It wires `PortalHeroSlide`, `PortalHeroBackgroundSlide`, `PortalDemoVideoPlayer`, `PortalSponsoredBloom`, and `MainGridLayout` for the first page. |
| `apps/megameal/src/components/home/PortalHeroSlide.astro` | Foreground portal hero, copy, intro environment loader, scroll cue, portal advance event. | Do not touch | Protected visual and accessibility surface. Refactor only after visual and event verification. |
| `apps/megameal/src/components/home/PortalHeroBackgroundSlide.astro` | Lazy portal background video/media loading. | Do not touch | Contains viewport/network/device-memory gating and portal-advance wiring. |
| `apps/megameal/src/components/home/PortalDemoVideoPlayer.astro` | Demo video player, clips, preview overlay, autoplay/audio coordination. | Do not touch | Protected demo video and audio behavior. Some manifest extraction is possible but needs manual verification. |
| `apps/megameal/src/components/home/PortalSponsoredBloom.astro` | Sponsored bloom overlay and interactive cards. | Do not touch | `audit:css:changed` marks it as new oversized debt, but behavior is protected. |
| `apps/megameal/src/components/home/homeIntroScreens.ts` | Portal destination/screen data. | Do not touch | Destination rotation is protected behavior. |
| `apps/megameal/src/components/home/portalScrollStages.ts` | Home portal scroll stage controller and global lifecycle hooks. | Do not touch | Scroll behavior is protected. It also owns several global window keys. |
| `apps/megameal/src/layouts/MainGridLayout.astro` | Megameal wrapper around blog-core layout and portal slots. | Do not touch | Slot bridge for `portal-demo-content`, `banner-slide-content`, and `banner-overlay-content`. |
| `packages/blog-core/src/layouts/MainGridLayout.astro` | Shared layout used by Megameal and other sites. | Do not touch | Cross-site shared layout. Any cleanup needs broader verification. |

## Validation Commands

| Command | Result | Notes |
| --- | --- | --- |
| `pnpm --filter @merkin/megameal type-check` | Pass | Ran `tsc --noEmit`. |
| `pnpm --filter @merkin/megameal lint` | Fail | Biome reported 74 errors. Shown diagnostics were formatting/import-order issues in existing files, including `src/utils/mainGridLayout.server.ts`, `src/layouts/MainGridLayout.astro`, store components, config files, and several shared components. |
| `pnpm --filter @merkin/megameal audit:contracts` | Pass | Verified 5 retired routes, public post filtering, and no stale retired-route links. |
| `pnpm --filter @merkin/megameal audit:css:changed` | Pass with debt findings | Reported 10 CSS architecture items: 5 baseline and 5 new/expanded. New/expanded items include `HomeIntroEnvironment.svelte`, `TimelinePortalCarousel.svelte`, `TimelinePortalCarouselScene.svelte`, `PortalSponsoredBloom.astro`, and unreferenced `home-intro-hero-slide.css`. |
| `pnpm --filter @merkin/megameal build` | Pass after sandbox escalation | First sandbox run failed on `listen EPERM` for a `tsx` pipe in `/tmp`. Escalated rerun passed, built 361 pages, verified redirect shells, and indexed Pagefind. Build regenerated shared-data JSON files, which were restored so this audit does not include generated production changes. |

## Command Output Highlights

- Contract audit: `[site-contracts] Verified 5 retired route(s), public post filtering, and no stale retired-route links.`
- CSS audit:
  - `ERROR oversized-component src/components/home/HomeIntroEnvironment.svelte 810 nonblank lines, expanded beyond baseline max 800`
  - `WARN oversized-component src/components/home/PortalSponsoredBloom.astro 559 nonblank lines [new debt]`
  - `WARN unreferenced-style-file src/styles/features/home/home-intro-hero-slide.css [new debt]`
  - Timeline carousel files also expanded beyond baseline and should be reviewed separately from home portal work.
- Build:
  - Static build completed for 361 pages.
  - Pagefind indexed 81 pages.
  - Vite warned about a circular chunk between `feature-featured-product` and `feature-store`.
  - Vite warned that `vendor-3d-core` is a large chunk.

## Safe Cleanup Candidates

These items look safe to clean up in a separate cleanup commit because the evidence points to mechanical or unused surface area. They still need a focused pre/post validation run before deletion.

| File | Finding | Classification | Recommended action |
| --- | --- | --- | --- |
| `apps/megameal/src/styles/features/home/home-intro-hero-slide.css` | Unreferenced CSS file. `audit:css:changed` also reports it as an unreferenced style file. | Safe cleanup | Delete after one final source search and build. Current portal uses `portal-hero-slide.css` and `portal-hero-scroll-cue.css`, not this file. |
| Existing Biome formatting/import-order findings | `lint` fails on formatting/import-order in existing files. | Safe cleanup | Run a mechanical Biome format/import cleanup as a separate commit. Do not mix with behavioral portal changes. |
| `apps/megameal/src/pages/about/[...slug].astro` | Server/build-time `console.log` noise appears during build output. | Safe cleanup | Remove log-only diagnostics after confirming no debug output is intentionally consumed. |
| Runtime debug comments/logs in non-protected utility files | Several files contain stale `RESTORED`, `SIMPLIFIED`, `TEMPORARY`, or runtime console diagnostics. | Safe cleanup when log/comment-only | Clean only comments/logs that do not affect active behavior. Avoid protected banner, layout, audio, and portal files without manual verification. |

## Delete Candidates With Proof

Deletion candidates are split by confidence. Only the first item is currently a strong safe deletion candidate. Public assets require manual verification because they are copied to generated output even when no source references exist.

| Candidate | Classification | Source search result | Route/build impact | Asset reference check | Generated output check |
| --- | --- | --- | --- | --- | --- |
| `apps/megameal/src/styles/features/home/home-intro-hero-slide.css` | Safe cleanup | `rg "home-intro-hero|HomeIntroHero|megameal-home-intro__hero|home-intro-hero-slide" apps/megameal/src packages/blog-core/src apps/megameal/dist` returned no matches. | Full build passed with file present. Deletion still needs a final build. | Not an asset. | `find apps/megameal/dist -name '*home-intro-hero-slide*'` returned no files. |
| `apps/megameal/public/assets/portal-demo/dreams1.webm` | Needs manual verification | `rg "dreams1" apps/megameal/src apps/megameal/public packages/blog-core/src apps/megameal/dist` returned no text matches. | Full build passed with asset present. Deletion not tested. | `PortalDemoVideoPlayer.astro` references other demo clips, not `dreams1`. | Present in `apps/megameal/dist/assets/portal-demo/` because public assets are copied wholesale. |
| `apps/megameal/public/assets/portal-demo/dreams1.webp` | Needs manual verification | Same as above. | Same as above. | No source reference found. | Present in `dist` via public copy. |
| `apps/megameal/public/assets/portal-demo/portal-overlay.webp0001.webp` | Needs manual verification | `rg "portal-overlay\.webp0001" ...` returned no matches. | Full build passed with asset present. Deletion not tested. | `PortalDemoVideoPlayer.astro` references `portal-overlay.webp`, not this numbered variant. | Present in `dist` via public copy. |
| `apps/megameal/public/assets/portal-demo/portal-overlayb.webp` | Needs manual verification | `rg "portal-overlayb" ...` returned no matches. | Full build passed with asset present. Deletion not tested. | No source reference found. | Present in `dist` via public copy. |
| `apps/megameal/public/assets/3D/Hy3D_textured_00005_.glb` | Needs manual verification | Source references found for `Hy3D_textured_00005_optimized.glb`, not this file. | Full build passed with asset present. Deletion not tested. | Could be source/backup model. Do not delete until runtime and authoring use are checked. | Public asset copied to `dist` if present. |
| `apps/megameal/public/assets/3D/Hy3D_textured_00005_quality.glb` | Needs manual verification | Source references found for optimized GLB, not quality GLB. | Full build passed with asset present. Deletion not tested. | Could be source/quality model. Prefer moving out of public after verification. | Public asset copied to `dist` if present. |
| `apps/megameal/public/assets/3D/tentacle.glb` | Needs manual verification | No source reference found in scoped search. | Full build passed with asset present. Deletion not tested. | Unknown model asset. Verify authoring/runtime use before removal. | Public asset copied to `dist` if present. |
| `apps/megameal/public/assets/3D/screen.blend` | Needs manual verification | Source references found for `screen.glb`, not `.blend`. | Full build passed with asset present. Deletion not tested. | Blender source file should not be public unless intentionally downloadable. Move/archive after verification. | Public asset copied to `dist` if present. |
| `apps/megameal/public/assets/3D/screen.blend1` | Needs manual verification | Same as above. | Same as above. | Backup Blender file should not be public unless intentionally downloadable. Move/archive after verification. | Public asset copied to `dist` if present. |
| `apps/megameal/public/assets/hdri/*` except `skywip4crop1920.webp` | Needs manual verification | Scoped source search found `skywip4crop1920.webp` as the active HDRI reference. Other HDRI variants did not show source references in the inspected paths. | Full build passed with assets present. Deletion not tested. | Likely source/export variants. Because home 3D lighting is protected, do not delete before runtime visual verification. | Public assets are copied to `dist` when present. |
| `apps/megameal/public/assets/skyboxes/nx.webp`, `ny.webp`, `nz.webp`, `px.webp`, `py.webp`, `pz.webp` | Needs manual verification | No scoped source references found. | Full build passed with assets present. Deletion not tested. | Could be unused cubemap exports. Verify no runtime fallback or editor preview depends on them. | Public assets are copied to `dist` when present. |

## Refactor Candidates

These are not deletion candidates. They are cleanup candidates only after manual verification because they touch protected or broad behavior.

| File | Finding | Classification | Recommended action |
| --- | --- | --- | --- |
| `apps/megameal/src/components/home/HomeIntroEnvironment.svelte` | Oversized component and expanded beyond CSS audit baseline. | Needs manual verification | Split scene/input/state orchestration only after visual and interaction regression coverage exists. |
| `apps/megameal/src/components/home/HomeIntroEnvironmentScene.svelte` | Oversized baseline component. | Needs manual verification | Extract narrow helpers for scene setup and readiness dispatches. Keep rendering equivalent. |
| `apps/megameal/src/components/home/PortalDemoVideoPlayer.astro` | Large protected component with inline clip manifest, player lifecycle, and audio coordination. | Needs manual verification | Extract clip manifest and event constants first. Do not change autoplay, audio, or player controls without manual testing. |
| `apps/megameal/src/components/home/PortalSponsoredBloom.astro` | New oversized CSS audit debt. | Needs manual verification | Split data selection, card creation, and dismissal/motion controller into local helpers. |
| `apps/megameal/src/components/home/portalScrollStages.ts` | Multiple global window keys and lifecycle hooks. | Needs manual verification | Centralize window key strings and event names. Do not change scroll stages without home portal visual/scroll checks. |
| `apps/megameal/src/utils/site-audio.ts` | Large audio utility with scattered custom events across the site. | Needs manual verification | Centralize event names with `site-audio-activation.ts` and add targeted unit coverage. Audio behavior is protected. |
| `apps/megameal/src/components/timeline/TimelinePortalCarousel.svelte` | Oversized and expanded beyond CSS audit baseline. | Needs manual verification | Treat as a separate timeline cleanup, not home portal cleanup. |
| `apps/megameal/src/components/timeline/TimelinePortalCarouselScene.svelte` | Oversized and expanded beyond CSS audit baseline. | Needs manual verification | Treat as a separate timeline cleanup. |
| `packages/blog-core/src/layouts/MainGridLayout.astro` | Very large shared layout with many global selectors and historical comments. | Do not touch | Cross-site shared surface. Requires broader app verification. |
| `packages/blog-core/src/components/banner-stage/BannerStage.astro` | Very large shared banner component and portal demo slot owner. | Do not touch | Cross-site shared surface and protected home portal dependency. |

## Naming, Globals, And Events

Scoped search found several global window keys and custom event strings. These are cleanup candidates only if centralized without changing behavior.

| Surface | Examples | Classification | Recommendation |
| --- | --- | --- | --- |
| Home portal globals | `__megamealPortalScrollCleanup`, `__megamealPortalScrollInit`, `__megamealPortalScrollReset`, `__megamealPortalScrollBound` | Needs manual verification | Centralize constants in the scroll controller module. |
| Demo player globals | `__megamealPortalDemoPlayerCleanup`, `__megamealPortalDemoPlayerBound` | Needs manual verification | Centralize near demo player manifest/lifecycle helpers. |
| Route/store globals | `__megamealRouteTransitionsInitialized`, `__megamealStoreLayoutParallaxCleanup` | Safe cleanup only with focused tests | Centralize constants in owning modules. |
| Portal and audio events | `merkin:portal-advance`, `merkin:banner-select-scene`, `merkin:banner-control`, `merkin:banner-state`, `megameal:portal-intro-ready`, `megameal:audio-config-change`, `megameal:audio-suspend`, `megameal:audio-resume`, `megameal:audio-unlocked`, `megameal:sfx` | Needs manual verification | Create typed or named constants in owner modules. Do not rename event strings in place. |

## CSS Selector Risk

The following selector families are broad enough to warrant caution. They are not deletion candidates.

| File | Selector risk | Classification | Recommendation |
| --- | --- | --- | --- |
| `apps/megameal/src/styles/pages/dynamic-page.css` | Global `html.megameal-home-stage-ready` and `#banner-container.portal-snap-stage` selectors drive protected portal behavior. | Do not touch | Leave unchanged unless visual portal regression coverage exists. |
| `apps/megameal/src/styles/features/home/portal-hero-slide.css` | Global portal phase classes and banner-container selectors. | Do not touch | Protected visual behavior. |
| `apps/megameal/src/styles/pages/videos-index.css` | Page-scoped `body:has([data-videos-archive]) #banner-container` and `#main-panel-wrapper`. | Needs manual verification | Candidate for route-local tightening, but verify route visuals. |
| `apps/megameal/src/styles/pages/mobile-content-frame.css` | `body:has(.mobile-content-frame) main#main`. | Needs manual verification | Candidate for route-local tightening. |
| `packages/blog-core/src/layouts/MainGridLayout.astro` | Many `:global(...)` layout/sidebar selectors. | Do not touch | Shared layout surface. Requires cross-site verification. |
| `packages/blog-core/src/styles/main.css` and `apps/megameal/src/styles/foundation/components-core.css` | Broad typography selectors over headings, anchors, and strong text. | Needs manual verification | Leave until component/page ownership is clear. |

## Route Reference Findings

- `audit:contracts` passed and verified retired routes plus stale retired-route links.
- Retired routes such as `/friends/` and `/store-placeholder/` are intentionally represented by redirect shells/contracts and should not be deleted as cleanup.
- `apps/megameal/src/pages/posts/index.astro`, `apps/megameal/src/pages/reader/index.astro`, and `apps/megameal/src/pages/game.astro` are redirect/public route surfaces, not dead pages by default.
- `packages/blog-core/src/components/svelte/admin/NavigationConfigTab.svelte` and `packages/blog-core/src/components/svelte/admin/AdminNavbar.svelte` still mention `/friends/`, but those are shared/admin tooling surfaces outside the active public Megameal website. Classify as needs manual verification, not active-site deletion.

## Recommended Cleanup Order

1. Create a small safe cleanup commit for the unreferenced CSS file only:
   - Delete `apps/megameal/src/styles/features/home/home-intro-hero-slide.css`.
   - Run `type-check`, `lint`, `audit:contracts`, `audit:css:changed`, and `build`.
2. Create a separate mechanical formatting/import-order commit:
   - Run the repo's Biome formatter on the existing lint failures.
   - Do not mix this with portal behavior changes.
3. Create an asset-publication review:
   - Verify each public asset candidate against runtime screenshots, network logs, and any authoring/export workflows.
   - Prefer moving source/backup assets out of `public` over deleting them outright.
4. Create protected refactor tickets only after visual/manual coverage exists:
   - Portal demo player manifest extraction.
   - Sponsored bloom decomposition.
   - Portal scroll/event constant centralization.
   - Shared layout/banner-stage cleanup as a cross-site effort.

## Current Status

- Production code was not intentionally modified for this audit.
- The build generated shared-data JSON changes during validation; those generated changes were restored.
- This report is the only intended tracked addition from the audit.
- No new CSS surface area was added.
