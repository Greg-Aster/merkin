# Site Audio Navigation Persistence Migration

## Goal

Keep Megameal ambience and SFX alive during same-session navigation while preserving browser autoplay rules, stored sound preferences, page-specific ambience tracks, media suspension, and the existing navbar mixer UX.

## Architecture

- `packages/blog-core/src/layouts/Layout.astro` mounts `PageNavigation.svelte`, a small Svelte navigation enhancer that swaps the shared `#banner-container` and `#main-grid` regions for same-origin page links.
- `SiteAudioRuntime.svelte` owns global audio lifecycle concerns:
  - initialize `siteAudioManager`
  - keep the browser gesture unlock listener alive
  - sync ambience on the initial page
  - rescore ambience when `astro:page-load` reports a route change
- `SiteAudioControl.svelte` is now only the visible control surface. It subscribes to audio state and dispatches user controls, but it does not own page lifecycle listeners.
- `SiteAudioManager.syncForPath()` accepts `forceRescore` for route changes. It crossfades to a newly selected route track when possible and keeps the current track only when the new route resolves to the same single valid track.
- `SiteSfxBridge.svelte` remains the delegated SFX event surface, using the same Howler unlock state supplied by the runtime.

## Verification Checklist

- Direct page load with sound off by default leaves ambience silent.
- Returning user preference still shows the stored enabled state, but playback waits for a browser gesture.
- Clicking the navbar sound button unlocks audio and starts the current route ambience.
- Internal navigation between shared-layout pages keeps the same JavaScript session alive instead of destroying the audio manager.
- Route changes call `syncForPath(..., { forceRescore: true })` and crossfade between available ambience tracks.
- Embedded audible media still suspends ambience and resumes it when playback stops.
- Navbar mixer hover, click-to-pin, click-away, and mobile body portal behavior are unchanged.
- SFX clicks, hovers, focus, keyboard, and wheel play only after the shared unlock path is available.
- Pages that do not expose both `#banner-container` and `#main-grid` fall back to normal browser navigation.

## Cleanup Notes

- Removed page-load syncing and activation listener ownership from `SiteAudioControl.svelte`.
- Added the audio runtime to both Megameal app layout entry points because store pages and main-grid pages do not share the same app-level wrapper.
- Kept audio runtime code in the existing `feature-audio` build chunk.
- Guarded the shared timeline initializer so `astro:page-load` events do not get mistaken for DOM roots after Svelte-managed navigation.
- No legacy files were left behind; the old behavior moved rather than being duplicated.
- Astro `ClientRouter` and `transition:persist` were removed after testing showed document swaps could desynchronize root theme classes and page background state.

## Verification Results

- `pnpm --dir apps/megameal exec biome check src/components/client/SiteAudioRuntime.svelte src/components/client/SiteAudioControl.svelte src/utils/site-audio.ts src/utils/site-sfx.ts`: passed.
- `pnpm --dir apps/megameal type-check`: passed.
- `pnpm --dir apps/megameal astro check`: reached Astro diagnostics; no errors were reported in the migration files, but the command remains blocked by an existing unrelated `src/pages/quiz/index.astro` `bannerType` type error.
- Headless browser probe against the existing `http://127.0.0.1:4321/` server:
  - root route mounted `SiteAudioRuntime`, `SiteSfxBridge`, and the navbar sound button
  - Svelte-managed navigation between compatible shared-layout pages preserves the same JS session
  - exactly one `astro:page-load` fired for the route change
  - runtime and SFX islands remained mounted after navigation
  - no page errors or Vite stale dependency errors were observed after the final pass
