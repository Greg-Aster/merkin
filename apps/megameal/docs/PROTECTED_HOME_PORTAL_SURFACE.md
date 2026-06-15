# Protected Home Portal Surface

This document exists to prevent cleanup work from accidentally deleting or weakening live MEGA MEAL home portal behavior. It is a guardrail for future AI and human cleanup passes, not a redesign plan.

Scope: `apps/megameal`, plus shared package surfaces that already directly support `apps/megameal`.

## Non-Removal Rule

Do not remove, rename, or replace any route, component, CSS file, media asset, nav item, event name, data attribute, localStorage key, or slot involved in the protected home portal unless the change has explicit approval and the cleanup checklist below is completed.

Cleanup work may still improve internals, but it must preserve the live user-facing behavior and the integration contracts listed here.

## Protected Systems

### Home Route Composition

Owner: `src/pages/[...page].astro`

The first paginated home page is the protected portal composition. It sets:

- `homeLayout="portal"`
- `contentMode="banner-only"`
- `banner-overlay-content` slot with `PortalHeroSlide`
- `banner-slide-content` slot with `PortalHeroBackgroundSlide`
- `portal-demo-content` slot with `PortalDemoVideoPlayer`
- `overlay` slot with `PortalSponsoredBloom`
- `initPortalScrollController()` from `src/components/home/portalScrollStages`

Do not remove the first-page portal branch, slot names, slot contents, or scroll controller initialization.

### PortalHeroSlide

Owner: `src/components/home/PortalHeroSlide.astro`

Protected responsibilities:

- Foreground home portal copy and accessibility text.
- Portal destination advancement.
- Dispatch of the `merkin:portal-advance` custom event.
- Integration with `HomeIntroEnvironmentLoader`.
- Scroll cue and related portal hero CSS imports.

Do not remove visible copy, screen-reader copy, controls, destination rotation, or event dispatch behavior.

### PortalHeroBackgroundSlide

Owner: `src/components/home/PortalHeroBackgroundSlide.astro`

Protected responsibilities:

- Home portal background media.
- Lazy loading tied to portal interaction and page readiness.
- Listener for `merkin:portal-advance`.
- Viewport, network, and device-memory safeguards around background media loading.

Do not remove the media path, data attributes, lazy-load behavior, or event listener without a verified equivalent.

### PortalDemoVideoPlayer

Owner: `src/components/home/PortalDemoVideoPlayer.astro`

Protected responsibilities:

- Portal demo video player markup, controls, posters, and clip selection.
- Demo handoff behavior from the banner scene.
- LocalStorage key `megameal-portal-demo-last-index`.
- Dispatch of `megameal:audio-suspend` and `megameal:audio-resume`.
- Listener for `merkin:banner-select-scene`.
- Coordination with site audio activation and SFX.

Do not remove clips, posters, controls, audio coordination, randomization persistence, or player data attributes. If the component is refactored, keep the event strings, storage key, payload shape, and playback activation behavior stable.

### PortalSponsoredBloom

Owner: `src/components/home/PortalSponsoredBloom.astro`

Protected responsibilities:

- Sponsored bloom overlay content.
- Portal-card motion and dismissal behavior.
- Listener for `merkin:portal-advance`.
- Overlay slot participation in the home page.

Do not remove the overlay, card list, movement behavior, close behavior, or event listener without explicit approval.

### homeIntroScreens

Owner: `src/components/home/homeIntroScreens.ts`

Protected responsibilities:

- Portal destination data.
- Screen text, scene metadata, and destination rotation inputs.
- Any fields consumed by hero, environment, or screen-panel components.

Do not delete screens, rename fields, or change destination ordering unless the visual and interaction behavior is intentionally updated.

### portalScrollStages

Owner: `src/components/home/portalScrollStages.ts`

Protected responsibilities:

- Home portal scroll-stage behavior.
- Lifecycle wiring for Astro page loads and page-show style restores.
- Window cleanup/init/reset/bound keys used to keep the controller idempotent.
- Reduced-motion and mobile-sensitive scroll handling.

Do not remove scroll stages, lifecycle events, global window keys, or cleanup behavior without an equivalent controller and manual scroll verification.

### MainGridLayout Handoff

Megameal owner: `src/layouts/MainGridLayout.astro`
Shared owner: `packages/blog-core/src/layouts/MainGridLayout.astro`

Protected responsibilities:

- Megameal forwards portal slots into `SharedMainGridLayout`.
- Shared layout renders navbar/search and banner-stage surfaces.
- The `portal-demo-content`, `banner-slide-content`, `banner-overlay-content`, and `overlay` slots are part of the home portal contract.
- `SiteAudioRuntime` and `SiteSfxBridge` are mounted through the Megameal layout overlay slot.

Do not remove slot forwarding, slot names, shared-layout imports, navbar rendering, search rendering, or audio/SFX runtime mounting.

### Nav And Search Visibility

Shared owner: `packages/blog-core/src/components/Navbar.astro`

Protected responsibilities:

- Desktop nav links.
- Mobile nav menu.
- Search component.
- Admin-mode visibility handling that must not hide standard nav/search for normal visitors.

Cleanup must verify that search is still present and every public nav link remains available on desktop and mobile.

## Protected Custom Events

These event names are integration contracts. Do not rename them, remove them, change their payload shape, or replace them with unrelated private signals during cleanup.

| Event | Current protected role |
| --- | --- |
| `merkin:portal-advance` | Dispatched by `PortalHeroSlide`; consumed by home portal background, intro environment, loader, and sponsored bloom behavior. |
| `merkin:banner-select-scene` | Dispatched by the home intro scene; consumed by `PortalDemoVideoPlayer` for banner handoff and demo preparation. |
| `megameal:audio-suspend` | Dispatched by the portal demo player with reason `portal-demo` so site ambience can pause while demo audio is active. |
| `megameal:audio-resume` | Dispatched by the portal demo player with reason `portal-demo` so site ambience can resume after demo audio. |

## Protected localStorage Keys

Do not rename or delete these keys without a migration and manual verification in restricted-browser modes where localStorage access may throw.

| Key | Owner | Current role |
| --- | --- | --- |
| `megameal-portal-demo-last-index` | `PortalDemoVideoPlayer.astro` | Avoids immediately repeating the same random demo clip. |
| `megameal-site-audio-enabled` | `siteAudioConfig.storageKey` from `src/config/audio.ts` | Persists whether site audio is enabled. |
| `megameal-site-audio-volume` | `siteAudioConfig.legacyVolumeStorageKey` from `src/config/audio.ts` | Legacy volume key still read for compatibility. |
| `megameal-site-audio-master-volume` | `siteAudioConfig.masterVolumeStorageKey` from `src/config/audio.ts` | Persists master site audio volume. |
| `megameal-site-audio-ambience-volume` | `siteAudioConfig.ambienceVolumeStorageKey` from `src/config/audio.ts` | Persists ambience volume. |
| `megameal-site-audio-sfx-volume` | `siteAudioConfig.sfxVolumeStorageKey` from `src/config/audio.ts` | Persists SFX volume. |

The site audio keys are re-exported by `src/config/audio.ts` from `@merkin/shared-audio/site-audio-profile`.

## Cleanup Checklist

Complete this checklist before merging any cleanup that touches the protected home portal surface.

- [ ] Visual parity checked for the home portal.
- [ ] Keyboard behavior checked for nav, search, portal controls, and demo player controls.
- [ ] Reduced-motion behavior checked.
- [ ] Mobile behavior checked.
- [ ] Search is still present.
- [ ] All nav links are still present.
- [ ] `pnpm --filter @merkin/megameal lint` passes.
- [ ] `pnpm --filter @merkin/megameal build` passes.
- [ ] `pnpm --filter @merkin/megameal audit:contracts` passes.
- [ ] `pnpm --filter @merkin/megameal audit:css:changed` does not introduce new findings for the touched files.
- [ ] `pnpm --filter @merkin/megameal audit:css:strict` does not introduce new strict failures.

## Existing Package Scripts

These scripts are defined in `apps/megameal/package.json` and should be used for cleanup validation.

| Script | Command | Use |
| --- | --- | --- |
| `lint` | `biome check ./src` | Required baseline check for source cleanliness. |
| `type-check` | `tsc --noEmit` | TypeScript check for code changes. |
| `build` | `pnpm --filter @merkin/shared-data build && astro build && node scripts/audit-built-html.mjs --dist dist && pagefind --site dist --root-selector "[data-pagefind-body]"` | Full static build and generated output validation. |
| `audit:contracts` | `node scripts/audit-site-contracts.mjs` | Route, retired-route, and public filtering contract audit. |
| `audit:css:changed` | `node scripts/audit-css-architecture.mjs --changed` | Changed-file CSS architecture audit. |
| `audit:css:strict` | `node scripts/audit-css-architecture.mjs --changed --strict` | Strict changed-file CSS gate. |
| `audit:links` | `node scripts/audit-links.mjs --dist dist` | Built-link audit after a build when route/link changes are involved. |

## Cleanup Triage

Use these classifications when reviewing future cleanup proposals:

- Safe cleanup: comment-only or formatting-only changes that do not touch protected behavior and still pass validation.
- Needs manual verification: any change touching portal components, media, CSS, custom events, localStorage keys, slots, nav/search, audio, scroll, mobile behavior, or reduced-motion behavior.
- Do not touch: deletions or renames of protected route composition, protected slot names, protected event names, protected localStorage keys, nav/search visibility, public routes, or portal media without explicit approval.
