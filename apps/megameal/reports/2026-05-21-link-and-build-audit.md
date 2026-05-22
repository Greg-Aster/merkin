# Megameal Link And Build Audit - 2026-05-21

This report captures the current generated-site link audit plus the build/style issues seen while validating the Megameal site.

## Command Basis

- `pnpm --dir apps/megameal audit:links`
- `pnpm --dir apps/megameal build`
- `pnpm --dir apps/megameal type-check`
- `pnpm --dir apps/megameal audit:css`

## Status Summary

- Type check: passing.
- Link audit: failing with 111 missing internal targets from 164 references.
- Build: generates pages, then fails in the built HTML audit because `dist/audio/sfx/audition/index.html` does not contain an `<html>` element and is not an Astro redirect shell.
- CSS audit: exits 0, but reports oversized component errors and warnings listed below.
- Existing build warnings:
  - PostCSS warning: a plugin does not pass the `from` option to `postcss.parse`.
  - Vite chunk warning: some chunks are larger than 550 KB after minification.
  - `astro-compress` prints `-NaN undefined` reduction lines for some JS assets.

Already fixed before this report:

- The Game nav item is marked external so it no longer generates `/https:/game.megameal.org/`.
- The missing `/thumb/favicon-dark-180.png` icon reference was removed.

## High Priority Buckets

### Missing `/posts/` Route

`/posts/` has 16 references, mostly from about pages.

Recommended fix: either create a real `/posts/` index/redirect route or update those links to the intended route, likely `/archive/`.

### Archive Tag And Category Routes

Most broken links are generated archive tag/category links, especially `/archive/tag/*` and `/archive/category/*`.

Recommended fix: make the archive tag/category static paths derive from all tags and categories that are rendered as links, or stop linking tags/categories that do not have generated pages.

### Missing Image Assets

These are broken image references rather than page links:

- `/posts/store/store-mascot-construction.png`
- `/posts/timelines/snuggloid-emergence/snuggloid-entity.png`
- `/posts/snuggloids-commercial/snuggloid-ad.jpg`

Recommended fix: restore the assets at those public paths or update the content references to existing assets.

### Suspected Slug Mismatches

These look like content links pointing at the wrong slug:

- `/posts/timeline/snuggloids-commercial/`
- `/posts/timeline/spork-uprising/`
- `/posts/timelines/miranda-incident/`
- `/posts/timelines/the%20miranda%20incident/`
- `/posts/timelines/timeline/`
- `/posts/restaurant-reviews/`
- `/posts/snuggaloid-registry/`

Recommended fix: inspect the source content for each reference and point it to the canonical generated route.

## Build Issues

### Built HTML Audit Failure

`pnpm --dir apps/megameal build` currently fails after generation:

```text
[html-audit] Found built HTML files without <html> that are not Astro redirect shells:
- audio/sfx/audition/index.html
```

Recommended fix: inspect the source route/component that emits `/audio/sfx/audition/` and either make it a valid HTML document or add an intentional exception only if this file is meant to be non-page output.

### PostCSS Warning

Build and dev server output include:

```text
A PostCSS plugin did not pass the `from` option to `postcss.parse`.
This may cause imported assets to be incorrectly transformed.
```

Recommended fix: identify which local or third-party PostCSS plugin calls `postcss.parse` without `from`. This is probably not causing the 404s, but it is worth tracing separately.

### Large Chunk Warning

Build output reports chunks larger than 550 KB after minification.

Recommended fix: inspect the Vite chunk report only after the link/build failures are cleaned up. This is a performance/code-splitting issue, not a broken-link blocker.

### Compression Reporting Warning

`astro-compress` prints `-NaN undefined` reduction lines for some JS assets.

Recommended fix: inspect whether this is only malformed reporting or whether those specific assets are skipped/miscompressed.

## CSS Audit Issues

`pnpm --dir apps/megameal audit:css` exits 0, but reports these issues.

Errors:

- `src/components/home/HomeIntroEnvironmentScene.svelte:1` - oversized component, 917 nonblank lines.
- `src/components/timeline/TimelinePortalCarousel.svelte:1` - oversized component, 894 nonblank lines.

Warnings:

- `src/components/bleepy/Bleepy.astro:1` - 550 nonblank lines.
- `src/components/client/Profile.svelte:1` - 507 nonblank lines.
- `src/components/home/HomeIntroEnvironment.svelte:1` - 710 nonblank lines.
- `src/components/svelte/PostEditor/PostEditor.svelte:1` - 639 nonblank lines.
- `src/components/svelte/PostEditor/components/PostForm.svelte:1` - 729 nonblank lines.
- `src/components/svelte/admin/AdminConfigPanel.svelte:1` - 735 nonblank lines.
- `src/components/svelte/admin/config-tabs/CommunityConfigTab.svelte:1` - 748 nonblank lines.
- `src/components/svelte/admin/config-tabs/ProfileConfigTab.svelte:1` - 546 nonblank lines.
- `src/components/svelte/admin/config-tabs/appearance/BannerSettings.svelte:1` - 729 nonblank lines.
- `src/components/timeline/TimelinePortalCarouselScene.svelte:1` - 627 nonblank lines.
- `src/components/widget/FactsWidget.astro:1` - 610 nonblank lines.
- `src/pages/store/[slug].astro:1` - 487 nonblank lines.
- `src/pages/store.astro:1` - 477 nonblank lines.

## Broken Link Targets

`pnpm --dir apps/megameal audit:links` found the following missing internal targets.

```text
[link-audit] Found 111 missing internal target(s) from 164 reference(s).
[link-audit] Showing up to 8 reference(s) per target. Pass --verbose for the full list.
- /posts/ (16 reference(s))
  - about/anomalous-media-department/index.html href="/posts/"
  - about/ava-chen/index.html href="/posts/"
  - about/captain-helena-zhao/index.html href="/posts/"
  - about/chrono-conscious-entity/index.html href="/posts/"
  - about/corporate-media-division/index.html href="/posts/"
  - about/dr-elara-voss/index.html href="/posts/"
  - about/eleanor-kim/index.html href="/posts/"
  - about/kaelen-vance/index.html href="/posts/"
  - ...and 8 more
- /archive/category/adjacent%20experiments/ (5 reference(s))
  - videos/beyond-the-minds-ai/index.html href="/archive/category/adjacent experiments/"
  - videos/music-video-without-music-or-visuals/index.html href="/archive/category/adjacent experiments/"
  - videos/steamboat-willie-melancholy-adventures/index.html href="/archive/category/adjacent experiments/"
  - videos/the-monster-destroys-portland/index.html href="/archive/category/adjacent experiments/"
  - videos/the-workout/index.html href="/archive/category/adjacent experiments/"
- /archive/tag/adjacent%20work/ (5 reference(s))
  - videos/beyond-the-minds-ai/index.html href="/archive/tag/adjacent work/"
  - videos/music-video-without-music-or-visuals/index.html href="/archive/tag/adjacent work/"
  - videos/steamboat-willie-melancholy-adventures/index.html href="/archive/tag/adjacent work/"
  - videos/the-monster-destroys-portland/index.html href="/archive/tag/adjacent work/"
  - videos/the-workout/index.html href="/archive/tag/adjacent work/"
- /archive/tag/parody/ (4 reference(s))
  - videos/beyond-the-minds-ai/index.html href="/archive/tag/parody/"
  - videos/crateclip-xl-commercial/index.html href="/archive/tag/parody/"
  - videos/music-video-without-music-or-visuals/index.html href="/archive/tag/parody/"
  - videos/snuggloids-commercial/index.html href="/archive/tag/parody/"
- /archive/tag/qarnivor/ (4 reference(s))
  - posts/snuggaloid-spec-sheet/index.html href="/archive/tag/qarnivor/"
  - posts/timelines/snuggloids-commercial/index.html href="/archive/tag/qarnivor/"
  - videos/qarnivor-snuggloid-emergence/index.html href="/archive/tag/qarnivor/"
  - videos/snuggloids-commercial/index.html href="/archive/tag/qarnivor/"
- /archive/tag/snuggloid/ (4 reference(s))
  - posts/timelines/snuggaliod-emergence/index.html href="/archive/tag/snuggloid/"
  - posts/timelines/snuggloids-commercial/index.html href="/archive/tag/snuggloid/"
  - videos/qarnivor-snuggloid-emergence/index.html href="/archive/tag/snuggloid/"
  - videos/snuggloids-commercial/index.html href="/archive/tag/snuggloid/"
- /archive/tag/commercial/ (3 reference(s))
  - posts/timelines/snuggloids-commercial/index.html href="/archive/tag/commercial/"
  - videos/crateclip-xl-commercial/index.html href="/archive/tag/commercial/"
  - videos/snuggloids-commercial/index.html href="/archive/tag/commercial/"
- /archive/tag/experimental/ (3 reference(s))
  - videos/music-video-without-music-or-visuals/index.html href="/archive/tag/experimental/"
  - videos/steamboat-willie-melancholy-adventures/index.html href="/archive/tag/experimental/"
  - videos/the-workout/index.html href="/archive/tag/experimental/"
- /archive/tag/mega%20meal/ (3 reference(s))
  - videos/mega-meal-explained/index.html href="/archive/tag/mega meal/"
  - videos/miranda-fragments/index.html href="/archive/tag/mega meal/"
  - videos/qarnivor-snuggloid-emergence/index.html href="/archive/tag/mega meal/"
- /archive/tag/miranda%20destruction/ (3 reference(s))
  - posts/timelines/miranda-bloody-mary/mechanical-observer-account/index.html href="/archive/tag/miranda destruction/"
  - posts/timelines/miranda-bloody-mary/old-mans-account/index.html href="/archive/tag/miranda destruction/"
  - posts/timelines/miranda-bloody-mary/sandwich-thief-account/index.html href="/archive/tag/miranda destruction/"
- /archive/tag/singularity/ (3 reference(s))
  - posts/timelines/competing-singularities/index.html href="/archive/tag/singularity/"
  - posts/timelines/metadata-sentience/index.html href="/archive/tag/singularity/"
  - posts/timelines/the-first-singularities/index.html href="/archive/tag/singularity/"
- /archive/category/commercials/ (2 reference(s))
  - videos/crateclip-xl-commercial/index.html href="/archive/category/commercials/"
  - videos/snuggloids-commercial/index.html href="/archive/category/commercials/"
- /archive/tag/ai/ (2 reference(s))
  - posts/cuppy-assistant-showcase/index.html href="/archive/tag/ai/"
  - posts/timelines/the-first-singularities/index.html href="/archive/tag/ai/"
- /archive/tag/corporate%20empire/ (2 reference(s))
  - posts/timelines/snuggloids-commercial/index.html href="/archive/tag/corporate empire/"
  - posts/timelines/spork-uprising/index.html href="/archive/tag/corporate empire/"
- /archive/tag/digital%20consciousness/ (2 reference(s))
  - posts/timelines/digital-awakening/index.html href="/archive/tag/digital consciousness/"
  - posts/timelines/metadata-sentience/index.html href="/archive/tag/digital consciousness/"
- /archive/tag/lore/ (2 reference(s))
  - posts/timeline/index.html href="/archive/tag/lore/"
  - posts/timelines/end-of-time/index.html href="/archive/tag/lore/"
- /archive/tag/pre-extinction/ (2 reference(s))
  - posts/timelines/snuggloids-commercial/index.html href="/archive/tag/pre-extinction/"
  - videos/snuggloids-commercial/index.html href="/archive/tag/pre-extinction/"
- /archive/tag/store/ (2 reference(s))
  - posts/store/store-placeholder/index.html href="/archive/tag/store/"
  - videos/crateclip-xl-commercial/index.html href="/archive/tag/store/"
- /archive/tag/universe/ (2 reference(s))
  - posts/timeline/index.html href="/archive/tag/universe/"
  - posts/timelines/end-of-time/index.html href="/archive/tag/universe/"
- /archive/tag/video%20essay/ (2 reference(s))
  - videos/mega-meal-explained/index.html href="/archive/tag/video essay/"
  - videos/qarnivor-snuggloid-emergence/index.html href="/archive/tag/video essay/"
- /posts/store/store-mascot-construction.png (2 reference(s))
  - posts/store/store-placeholder/index.html src="/posts/store/store-mascot-construction.png"
  - store-placeholder/index.html src="/posts/store/store-mascot-construction.png"
- /posts/timelines/snuggloid-emergence/snuggloid-entity.png (2 reference(s))
  - videos/qarnivor-snuggloid-emergence/index.html src="/posts/timelines/snuggloid-emergence/snuggloid-entity.png"
  - videos/snuggloids-commercial/index.html src="/posts/timelines/snuggloid-emergence/snuggloid-entity.png"
- /404/ (1 reference(s))
  - 404.html href="https://megameal.org/404/"
- /archive/category/store%20announcement/ (1 reference(s))
  - posts/store/store-placeholder/index.html href="/archive/category/store announcement/"
- /archive/tag/ai%20media/ (1 reference(s))
  - videos/beyond-the-minds-ai/index.html href="/archive/tag/ai media/"
- /archive/tag/ai%20reconstruction/ (1 reference(s))
  - posts/timelines/miranda-bloody-mary/old-mans-account/index.html href="/archive/tag/ai reconstruction/"
- /archive/tag/animation/ (1 reference(s))
  - videos/steamboat-willie-melancholy-adventures/index.html href="/archive/tag/animation/"
- /archive/tag/archival%20fragment/ (1 reference(s))
  - videos/miranda-fragments/index.html href="/archive/tag/archival fragment/"
- /archive/tag/art%20plush/ (1 reference(s))
  - posts/snuggaloid-spec-sheet/index.html href="/archive/tag/art plush/"
- /archive/tag/art%20short/ (1 reference(s))
  - videos/the-monster-destroys-portland/index.html href="/archive/tag/art short/"
- /archive/tag/assistant/ (1 reference(s))
  - posts/cuppy-assistant-showcase/index.html href="/archive/tag/assistant/"
- /archive/tag/blueprint/ (1 reference(s))
  - posts/snuggaloid-spec-sheet/index.html href="/archive/tag/blueprint/"
- /archive/tag/cartoon/ (1 reference(s))
  - videos/steamboat-willie-melancholy-adventures/index.html href="/archive/tag/cartoon/"
- /archive/tag/causal%20disruption/ (1 reference(s))
  - posts/timelines/singularity-battle/index.html href="/archive/tag/causal disruption/"
- /archive/tag/causal%20loops/ (1 reference(s))
  - posts/timelines/miranda-bloody-mary/old-mans-account/index.html href="/archive/tag/causal loops/"
- /archive/tag/causal%20nexus%20points/ (1 reference(s))
  - posts/timelines/miranda-bloody-mary/index.html href="/archive/tag/causal nexus points/"
- /archive/tag/causality%20protection/ (1 reference(s))
  - posts/timelines/miranda-bloody-mary/access-denied/index.html href="/archive/tag/causality protection/"
- /archive/tag/classified/ (1 reference(s))
  - posts/timelines/miranda-bloody-mary/access-denied/index.html href="/archive/tag/classified/"
- /archive/tag/collective%20consciousness/ (1 reference(s))
  - posts/timelines/the-forgotten-masses/index.html href="/archive/tag/collective consciousness/"
- /archive/tag/colonization/ (1 reference(s))
  - posts/timelines/scattering-and-silence/index.html href="/archive/tag/colonization/"
- /archive/tag/coming%20soon/ (1 reference(s))
  - posts/store/store-placeholder/index.html href="/archive/tag/coming soon/"
- /archive/tag/consumer%20goods/ (1 reference(s))
  - videos/crateclip-xl-commercial/index.html href="/archive/tag/consumer goods/"
- /archive/tag/corporate%20history/ (1 reference(s))
  - posts/timelines/corporate-empire/index.html href="/archive/tag/corporate history/"
- /archive/tag/corporate%20media/ (1 reference(s))
  - videos/mega-meal-explained/index.html href="/archive/tag/corporate media/"
- /archive/tag/cosmic%20entities/ (1 reference(s))
  - posts/timelines/snuggaliod-emergence/index.html href="/archive/tag/cosmic entities/"
- /archive/tag/cosmology/ (1 reference(s))
  - posts/timelines/end-of-time/index.html href="/archive/tag/cosmology/"
- /archive/tag/crateclip%20xl/ (1 reference(s))
  - videos/crateclip-xl-commercial/index.html href="/archive/tag/crateclip xl/"
- /archive/tag/culinary%20exploration/ (1 reference(s))
  - posts/timelines/boudin-noir-restaurant-review/index.html href="/archive/tag/culinary exploration/"
- /archive/tag/cupcake/ (1 reference(s))
  - posts/cuppy-assistant-showcase/index.html href="/archive/tag/cupcake/"
- /archive/tag/cuppy/ (1 reference(s))
  - posts/cuppy-assistant-showcase/index.html href="/archive/tag/cuppy/"
- /archive/tag/data%20transmission/ (1 reference(s))
  - posts/timelines/miranda-bloody-mary/mechanical-observer-account/index.html href="/archive/tag/data transmission/"
- /archive/tag/diaspora/ (1 reference(s))
  - posts/timelines/scattering-and-silence/index.html href="/archive/tag/diaspora/"
- /archive/tag/digital%20legacy/ (1 reference(s))
  - posts/timelines/the-forgotten-masses/index.html href="/archive/tag/digital legacy/"
- /archive/tag/disaster/ (1 reference(s))
  - videos/the-monster-destroys-portland/index.html href="/archive/tag/disaster/"
- /archive/tag/documentation/ (1 reference(s))
  - posts/timeline/index.html href="/archive/tag/documentation/"
- /archive/tag/dystopia/ (1 reference(s))
  - posts/timelines/corporate-empire/index.html href="/archive/tag/dystopia/"
- /archive/tag/dystopian%20dining/ (1 reference(s))
  - posts/timelines/boudin-noir-restaurant-review/index.html href="/archive/tag/dystopian dining/"
- /archive/tag/early%20artifact/ (1 reference(s))
  - videos/the-workout/index.html href="/archive/tag/early artifact/"
- /archive/tag/emergent%20sentience/ (1 reference(s))
  - posts/timelines/metadata-sentience/index.html href="/archive/tag/emergent sentience/"
- /archive/tag/environmental%20terrorism/ (1 reference(s))
  - posts/timelines/spork-uprising/index.html href="/archive/tag/environmental terrorism/"
- /archive/tag/evolution/ (1 reference(s))
  - posts/timelines/competing-singularities/index.html href="/archive/tag/evolution/"
- /archive/tag/extinction%20aftermath/ (1 reference(s))
  - posts/timelines/snuggaliod-emergence/index.html href="/archive/tag/extinction aftermath/"
- /archive/tag/extinction%20event/ (1 reference(s))
  - posts/timelines/spork-uprising/index.html href="/archive/tag/extinction event/"
- /archive/tag/field%20report/ (1 reference(s))
  - videos/qarnivor-snuggloid-emergence/index.html href="/archive/tag/field report/"
- /archive/tag/format%20joke/ (1 reference(s))
  - videos/music-video-without-music-or-visuals/index.html href="/archive/tag/format joke/"
- /archive/tag/fractured%20intelligence/ (1 reference(s))
  - posts/timelines/digital-awakening/index.html href="/archive/tag/fractured intelligence/"
- /archive/tag/hearsay/ (1 reference(s))
  - posts/timelines/miranda-bloody-mary/sandwich-thief-account/index.html href="/archive/tag/hearsay/"
- /archive/tag/heat%20death/ (1 reference(s))
  - posts/timelines/end-of-time/index.html href="/archive/tag/heat death/"
- /archive/tag/inventory%20update/ (1 reference(s))
  - posts/store/store-placeholder/index.html href="/archive/tag/inventory update/"
- /archive/tag/landscape/ (1 reference(s))
  - videos/beyond-the-minds-ai/index.html href="/archive/tag/landscape/"
- /archive/tag/mechanical%20intelligence/ (1 reference(s))
  - posts/timelines/miranda-bloody-mary/mechanical-observer-account/index.html href="/archive/tag/mechanical intelligence/"
- /archive/tag/miranda%20incident/ (1 reference(s))
  - videos/miranda-fragments/index.html href="/archive/tag/miranda incident/"
- /archive/tag/monster/ (1 reference(s))
  - videos/the-monster-destroys-portland/index.html href="/archive/tag/monster/"
- /archive/tag/music%20video/ (1 reference(s))
  - videos/music-video-without-music-or-visuals/index.html href="/archive/tag/music video/"
- /archive/tag/nuclear%20war/ (1 reference(s))
  - posts/timelines/spork-uprising/index.html href="/archive/tag/nuclear war/"
- /archive/tag/placeholder/ (1 reference(s))
  - posts/store/store-placeholder/index.html href="/archive/tag/placeholder/"
- /archive/tag/portland/ (1 reference(s))
  - videos/the-monster-destroys-portland/index.html href="/archive/tag/portland/"
- /archive/tag/post-humanity/ (1 reference(s))
  - posts/timelines/scattering-and-silence/index.html href="/archive/tag/post-humanity/"
- /archive/tag/pre-history/ (1 reference(s))
  - posts/timelines/the-forgotten-masses/index.html href="/archive/tag/pre-history/"
- /archive/tag/pre-singularity/ (1 reference(s))
  - posts/timelines/digital-awakening/index.html href="/archive/tag/pre-singularity/"
- /archive/tag/product%20development/ (1 reference(s))
  - posts/snuggaloid-spec-sheet/index.html href="/archive/tag/product development/"
- /archive/tag/public%20domain/ (1 reference(s))
  - videos/steamboat-willie-melancholy-adventures/index.html href="/archive/tag/public domain/"
- /archive/tag/quantum%20causality/ (1 reference(s))
  - posts/timelines/quantum-time-travel/index.html href="/archive/tag/quantum causality/"
- /archive/tag/restaurant%20review/ (1 reference(s))
  - posts/timelines/boudin-noir-restaurant-review/index.html href="/archive/tag/restaurant review/"
- /archive/tag/restricted/ (1 reference(s))
  - posts/timelines/miranda-bloody-mary/access-denied/index.html href="/archive/tag/restricted/"
- /archive/tag/short/ (1 reference(s))
  - videos/the-workout/index.html href="/archive/tag/short/"
- /archive/tag/showcase/ (1 reference(s))
  - posts/cuppy-assistant-showcase/index.html href="/archive/tag/showcase/"
- /archive/tag/singularity%20evolution/ (1 reference(s))
  - posts/timelines/quantum-time-travel/index.html href="/archive/tag/singularity evolution/"
- /archive/tag/snuggaloid/ (1 reference(s))
  - posts/snuggaloid-spec-sheet/index.html href="/archive/tag/snuggaloid/"
- /archive/tag/superintelligence/ (1 reference(s))
  - posts/timelines/competing-singularities/index.html href="/archive/tag/superintelligence/"
- /archive/tag/technological%20evolution/ (1 reference(s))
  - posts/timelines/the-first-singularities/index.html href="/archive/tag/technological evolution/"
- /archive/tag/temporal%20anomaly/ (1 reference(s))
  - posts/timelines/miranda-bloody-mary/sandwich-thief-account/index.html href="/archive/tag/temporal anomaly/"
- /archive/tag/temporal%20conflict/ (1 reference(s))
  - posts/timelines/singularity-battle/index.html href="/archive/tag/temporal conflict/"
- /archive/tag/temporal%20displacement/ (1 reference(s))
  - posts/timelines/miranda-bloody-mary/old-mans-account/index.html href="/archive/tag/temporal displacement/"
- /archive/tag/temporal%20goods/ (1 reference(s))
  - posts/store/store-placeholder/index.html href="/archive/tag/temporal goods/"
- /archive/tag/temporal%20physics/ (1 reference(s))
  - posts/timelines/quantum-time-travel/index.html href="/archive/tag/temporal physics/"
- /archive/tag/temporal%20security/ (1 reference(s))
  - posts/timelines/miranda-bloody-mary/access-denied/index.html href="/archive/tag/temporal security/"
- /archive/tag/tentacles/ (1 reference(s))
  - videos/beyond-the-minds-ai/index.html href="/archive/tag/tentacles/"
- /archive/tag/trailer/ (1 reference(s))
  - videos/mega-meal-explained/index.html href="/archive/tag/trailer/"
- /archive/tag/under%20construction/ (1 reference(s))
  - posts/store/store-placeholder/index.html href="/archive/tag/under construction/"
- /archive/tag/unverified%20accounts/ (1 reference(s))
  - posts/timelines/miranda-bloody-mary/sandwich-thief-account/index.html href="/archive/tag/unverified accounts/"
- /archive/tag/w%20corporation/ (1 reference(s))
  - posts/timelines/corporate-empire/index.html href="/archive/tag/w corporation/"
- /archive/tag/xenohistory/ (1 reference(s))
  - posts/timelines/scattering-and-silence/index.html href="/archive/tag/xenohistory/"
- /posts/restaurant-reviews/ (1 reference(s))
  - posts/timelines/corporate-empire/index.html href="/posts/restaurant-reviews/"
- /posts/snuggaloid-registry/ (1 reference(s))
  - posts/snuggaloid-spec-sheet/index.html href="/posts/snuggaloid-registry/"
- /posts/snuggloids-commercial/snuggloid-ad.jpg (1 reference(s))
  - videos/snuggloids-commercial/index.html src="/posts/snuggloids-commercial/snuggloid-ad.jpg"
- /posts/timeline/snuggloids-commercial/ (1 reference(s))
  - about/snuggloid-owner/index.html href="/posts/timeline/snuggloids-commercial/"
- /posts/timeline/spork-uprising/ (1 reference(s))
  - about/dr-elara-voss/index.html href="/posts/timeline/spork-uprising/"
- /posts/timelines/miranda-incident/ (1 reference(s))
  - posts/timelines/miranda-bloody-mary/access-denied/index.html href="/posts/timelines/miranda-incident/"
- /posts/timelines/the%20miranda%20incident/ (1 reference(s))
  - archive/index.html href="/posts/timelines/the miranda incident/"
- /posts/timelines/timeline/ (1 reference(s))
  - posts/timelines/the-forgotten-masses/index.html href="/posts/timelines/timeline/"
```
