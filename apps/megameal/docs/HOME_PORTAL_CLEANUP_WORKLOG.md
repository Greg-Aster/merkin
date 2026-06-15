# Home Portal Cleanup Worklog

Date: 2026-06-14

Scope: preservation-focused cleanup for the MEGA MEAL home portal. This pass does not redesign the page, remove portal systems, rename DOM classes, rename data attributes, remove routes, remove assets, or change CTA hrefs/media paths.

## Files Inspected

- `apps/megameal/AGENTS.md`
- `apps/megameal/docs/frontend-architecture-guardrails.md`
- `apps/megameal/docs/HOME_PORTAL_CLEANUP_AUDIT.md`
- `apps/megameal/docs/PROTECTED_HOME_PORTAL_SURFACE.md`
- `apps/megameal/package.json`
- `apps/megameal/src/pages/[...page].astro`
- `apps/megameal/src/components/home/PortalHeroSlide.astro`
- `apps/megameal/src/components/home/PortalHeroBackgroundSlide.astro`
- `apps/megameal/src/components/home/PortalDemoVideoPlayer.astro`
- `apps/megameal/src/components/home/PortalSponsoredBloom.astro`
- `apps/megameal/src/components/home/HomeIntroEnvironment.svelte`
- `apps/megameal/src/components/home/HomeIntroEnvironmentLoader.svelte`
- `apps/megameal/src/components/home/HomeIntroEnvironmentScene.svelte`
- `apps/megameal/src/components/home/homeIntroScreens.ts`
- `apps/megameal/src/components/home/portalScrollStages.ts`
- `apps/megameal/src/layouts/MainGridLayout.astro`
- `packages/blog-core/src/layouts/MainGridLayout.astro`
- `apps/megameal/src/styles/features/home/`

## Protected Behavior Checklist

- Home portal hero remains mounted through `PortalHeroSlide` on the first paginated home route.
- Background slide remains mounted through `PortalHeroBackgroundSlide`.
- Demo video player remains mounted through the `portal-demo-content` slot.
- `PortalSponsoredBloom` remains mounted in the home route overlay slot.
- Joystick/scroll cue markup, data attributes, pointer handlers, click handler, and keyboard handlers remain in `PortalHeroSlide`.
- Screen-reader copy remains in `PortalHeroSlide`.
- Home portal custom event strings are preserved in `src/contracts/homePortal.ts`.
- Astro lifecycle cleanup remains present for portal scroll stages, demo player, and sponsored bloom.
- Nav/search ownership in `packages/blog-core/src/layouts/MainGridLayout.astro` was inspected and not changed.
- CTA hrefs and media paths in `homeIntroScreens.ts`, demo player clips, background video, and CSS were not changed.

## Cleanup Opportunities Found

1. Custom event names were duplicated across portal dispatchers/listeners.
2. Portal scroll window keys were local magic strings in `portalScrollStages.ts`.
3. Portal demo window keys were local magic strings in `PortalDemoVideoPlayer.astro`.
4. Portal sponsored bloom cleanup key was a local magic string in inline script.
5. Portal demo localStorage key was a local magic string.
6. Portal demo active class and audio suspension reason were local magic strings.
7. Audio control event names were duplicated between portal demo and site audio.
8. `PortalDemoVideoPlayer.astro` read banner-select event detail as an untyped `CustomEvent`.
9. `HomeIntroEnvironmentScene.svelte` dispatched intro-ready and banner-select events without named detail types.
10. Protected portal strings had no narrow audit guard, so future cleanup could remove slot/event/storage/lifecycle strings without a focused failure.
11. `home-intro-hero-slide.css` is reported as unreferenced by the existing cleanup audit, but it was not deleted in this pass because the requested cleanup options emphasize contract-preserving internal cleanup.
12. Large protected components such as `PortalDemoVideoPlayer.astro` and `PortalSponsoredBloom.astro` remain decomposition candidates, but splitting them would need manual visual/interaction verification.

## Cleanup Actions Completed

1. Added `src/contracts/homePortal.ts` as the centralized owner for protected home portal custom events, portal window keys, portal demo storage keys, demo active class, demo audio suspension reason, and narrow `CustomEvent` detail types.
2. Replaced duplicated portal custom event strings in the home portal dispatchers/listeners with `homePortalEvents`.
3. Replaced portal scroll, portal demo, and sponsored bloom window-key magic strings with `homePortalWindowKeys`.
4. Replaced the portal demo last-index localStorage magic string with `portalDemoStorageKeys.lastIndex`.
5. Added narrow event detail types for portal advance, banner scene selection, intro-ready, and portal demo audio suspension events.
6. Added `scripts/audit-home-portal-contracts.mjs` and wired it into `audit:contracts` so the requested contract validation also checks protected home portal strings and source surfaces.

## Items Intentionally Not Changed

- No DOM classes or data attributes were renamed.
- No CSS selectors were removed or renamed.
- No route files were removed.
- No media assets were removed.
- No CTA hrefs or media paths were changed.
- `packages/blog-core/src/layouts/MainGridLayout.astro` was inspected but not edited because it owns shared nav/search/layout behavior across sites.
- `apps/megameal/src/styles/features/home/home-intro-hero-slide.css` was not deleted in this pass, despite the prior audit identifying it as likely unreferenced, because deletion was outside the chosen safe cleanup lane and would require its own final source/build proof.
- Existing unrelated dirty `apps/megameal/src/styles/pages/community.css` was not changed by this pass.

## Commands Run

Validation commands are recorded here after execution.

## Remaining Work

- Run and record the requested validation commands.
- If validation shows only pre-existing lint debt, record that separately from this cleanup pass.
- Consider a later focused deletion pass for `src/styles/features/home/home-intro-hero-slide.css` with final source search and build proof.
- Consider a later manually verified decomposition of `PortalDemoVideoPlayer.astro` and `PortalSponsoredBloom.astro`.
- Consider moving additional broad portal event constants from shared banner-stage code into an appropriate cross-package contract only if the shared package has a stable owner for that contract.
