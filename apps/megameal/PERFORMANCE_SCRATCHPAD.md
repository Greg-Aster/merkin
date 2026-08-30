# Megameal Performance Scratchpad

Current audit: 2026-08-29. This is an implementation backlog, not a claim that
the listed repairs are complete.

Goal: make the existing site usable on mobile without removing the 3D portal,
timeline, store, archive media, search, audio, profile, or navigation features.
Prefer fewer active owners and progressive loading over replacement components
or permanent low-quality fallbacks.

## Measured baseline

The browser measurements used the current production build served locally. The
mobile profile used a 390 x 844 viewport, 4x CPU slowdown, 150 ms latency, and
about 1.6 Mbps download throughput. Local hosting removes production DNS, CDN,
and server latency, so these numbers are useful for comparisons but are not a
substitute for a deployed PageSpeed/Lighthouse run.

| Route | Requests | Transfer | CSS requests | FCP | DOM content | Load | Main finding |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| `/` mobile | 103 | 2.12 MB | 54 | 2.02 s | 5.79 s | 9.96 s | Eager 3D runtime/model; 49 long tasks totaling 7.85 s |
| `/archive/` mobile | 104 | 6.70 MB | 54 | 2.04 s | 6.68 s | 33.75 s | 2.78 MB PNG still and 2.56 MB video both load |
| `/timeline/` mobile | 108 | 7.13 MB | 54 | 2.05 s | 9.58 s | 39.70 s | LCP 23.59 s; 497 long tasks totaling 33.55 s |
| `/store/` mobile | 102 | 5.15 MB | 54 | 2.09 s | 8.39 s | 26.21 s | Four initial images account for about 4.24 MB |
| `/posts/explainer/` mobile | 106 | 1.68 MB | 54 | 2.08 s | 7.62 s | 7.66 s | Static post still loads 3D bundles and the same profile video twice |

Additional evidence:

- The unthrottled desktop home transferred 4.43 MB. Its desktop sprite atlas was
  2.44 MB, compared with the 142 KB lean mobile atlas.
- Home logs a Svelte `hydration_mismatch` warning in the production browser.
- All five routes load the 181 KB transferred `three` core chunk and 49 KB 3D
  extras chunk, including routes with no canvas.
- All five routes load the same 54 external CSS files (about 187 KB) and expose
  roughly 79 to 83 stylesheets after inline styles are counted.
- Every route eagerly initializes Pagefind. The empty-search prewarm fetches the
  56 KB WASM plus index resources before the search UI is used.
- The current build passes, but takes 302.72 seconds for 366 pages. It warns
  about a 699 KB minified `three` chunk, a circular
  `feature-featured-product -> feature-store -> feature-featured-product`
  chunk, and a PostCSS plugin missing the `from` option.
- `pnpm --dir apps/megameal type-check` passes.
- `pnpm --dir apps/megameal audit:css` exits successfully while reporting four
  error-severity items, including expanded component debt and a 1,950-line
  reader CSS file. It also reports eight unreferenced home CSS files; four of
  those names are nevertheless linked by the built home page, so that source to
  output discrepancy must be resolved before deleting them.
- `public/` is 4.1 GB and the built `dist/` is 4.5 GB. This is mostly a build,
  deploy, and CDN problem rather than proof that one page downloads 4.1 GB.

## Implementation progress

### Batch 1 - route ownership, search intent, and chunk policy (2026-08-27)

Implemented:

- Added `src/layouts/TimelinePageLayout.astro` as the single composition owner
  for both timeline routes. The universal grid no longer imports the timeline
  manifest, configuration, carousel, or Three.js graph.
- Removed the obsolete timeline pathname helpers and the superseded inline
  timeline branch from `MainGridLayout.astro`.
- Moved Pagefind initialization into the existing `Search.svelte` owner. It now
  starts on panel/input intent, shares one promise, ignores stale searches, and
  shows a visible retryable failure state. The Navbar bootstrap, readiness
  event, and empty-query prewarm were deleted.
- Removed all app-feature manual chunks, including the over-broad store/home
  groups and stale loader rule. Only third-party vendor grouping remains. The
  blanket dynamic/static warning suppression and dev `force` flag were also
  removed.

Measured with the same throttled mobile profile as the baseline:

| Route | Requests | Transfer | Load | Long-task total | Change from baseline |
| --- | ---: | ---: | ---: | ---: | --- |
| `/` | 106 | 2.03 MB | 8.28 s | 2.91 s | Load -1.68 s; transfer -0.09 MB; hydration warning remains |
| `/archive/` | 104 | 6.35 MB | 32.27 s | 0.69 s | Load -1.48 s; transfer -0.35 MB |
| `/timeline/` | 111 | 7.02 MB | 38.98 s | 6.08 s | Load -0.72 s; long tasks -27.47 s; canvas preserved |
| `/store/` | 106 | 4.83 MB | 24.68 s | 0.18 s | Load -1.53 s; transfer -0.32 MB |
| `/posts/explainer/` | 106 | 1.34 MB | 5.83 s | 0.22 s | Load -1.83 s; transfer -0.34 MB |

Browser and build evidence:

- A normal post, archive, and store route now have no built import path or
  browser request for either Three.js vendor chunk. `/timeline/` and
  `/timeline/2d/` retain the carousel and both 3D chunks.
- Pagefind makes no request before search intent. A real query loads Pagefind
  and returns results; a blocked Pagefind request keeps the panel open and
  displays `Search is temporarily unavailable. Please try again.`
- Both timeline modes render one canvas with no console, hydration, network, or
  asset failure in the focused browser checks.
- The final production build completed all 366 pages in 329.68 seconds. The
  store/featured-product circular chunk warning and forced dependency
  re-optimization message are gone. The PostCSS `from` warning and 699 KB
  minified Three.js chunk remain.
- The global 54-request CSS fan-out, duplicate profile video, oversized route
  media, and home hydration mismatch are not fixed by this batch.

### Batch 2 - progressive home portal and stable client boundary (2026-08-28)

Implemented:

- `PortalHeroSlide.astro` now owns the immediate server-rendered home still.
  The new 3.30 KB `HomeIntroActivation.svelte` controller is client-only and
  dynamically imports the existing scene rather than server-rendering or
  eagerly hydrating the WebGL tree.
- Compact, Save-Data, 2G/3G, and low-memory contexts keep the scene in standby
  until pointer, touch, wheel, keyboard, or scroll-cue intent. Unconstrained
  desktop starts it after the first paint during idle with a bounded timeout.
- WebGL support is checked before the scene import. Unsupported WebGL and
  import/render failures keep the still and expose a user-visible and live-region
  failure state instead of throwing through the island.
- Added `richMediaCapabilities.ts` as the shared viewport/network/memory policy
  for the portal background video, 3D activation, and 3D quality selection.
  Duplicate capability checks were removed from both existing owners.
- `astro-compress` class-name sorting is disabled while HTML compression stays
  enabled. Sorting mutated server-rendered Svelte class values and produced a
  production hydration mismatch.
- The existing scene, post processing, screens, navigation links, interaction
  handlers, quality modes, and assets remain the active implementation.

Measured with the same throttled mobile profile as the baseline and Batch 1:

| Home result | Requests | Transfer | DOM content | Load | Long-task total |
| --- | ---: | ---: | ---: | ---: | ---: |
| Batch 1 | 106 | 2.03 MB | not recorded | 8.28 s | 2.91 s |
| Batch 2 | 101 | 0.48 MB | 3.39 s | 5.18 s | 0.07 s |

Browser and build evidence:

- Before mobile intent, the only portal-specific requests are the existing
  17.8 KB still, 6.05 KB scene stylesheet, and 3.30 KB activation controller.
  There is no scene module, Three/Threlte chunk, model, or sprite-atlas request.
- Wheel intent on a 390 x 844 viewport loads the unchanged lean scene and
  produces its canvas. Unconstrained desktop idle activation produces the full
  scene. Save-Data + 2G + 2 GB memory + reduced motion remains in standby, then
  keyboard intent loads the lean scene successfully.
- Forced WebGL absence retains the complete still, makes no 3D request, and
  exposes the explicit unavailable status. All four browser states have no
  hydration warning, console warning/error, exception, or failed request.
- The production build completed 366 pages in 242.02 seconds, including the
  built-HTML audit, compression, and Pagefind indexing. The known PostCSS
  `from` warning and deferred 699 KB Three.js chunk warning remain.
- This batch changed no public asset, production dependency, or CSS file. A
  deployed PageSpeed run and physical-device interaction remain unverified.

### Batch 3 - progressive archive atmosphere media (2026-08-28)

Implemented:

- Kept `ArchiveAtmosphere.svelte` as the single archive-background owner, but
  removed its eager video source, preload, autoplay attempt, and swallowed
  playback rejection. The video element and its 2.56 MB source now exist only
  after the media policy permits activation or the user explicitly requests it.
- Changed the archive island from `client:only` to `client:load` so the initial
  poster is server rendered. Compact viewports reuse the existing visually
  equivalent 47 KB `archive.webp`; wide viewports retain the original PNG until
  a visually reviewed high-resolution derivative can be added safely.
- Compact, Save-Data, 2G/3G, and low-memory contexts expose a keyboard-accessible
  Play control. Reduced-motion remains poster-only. Unconstrained desktop starts
  the existing atmosphere after paint during idle.
- Added visible pause/resume control after motion begins. Playback errors,
  source errors, and stalled startup retain the poster and expose a retryable
  failure message. Visibility changes pause and resume the owner, and all
  timers/listeners are removed on unmount.
- Moved the duplicated double-animation-frame/idle scheduling into
  `scheduleRichMediaActivation()` beside the existing shared media capability
  policy and reused it for both the home portal and archive atmosphere.
- Disabled whitespace collapsing in the existing HTML minifier. That transform
  removed a text node inside hydrated Svelte markup and caused a production-only
  hydration mismatch; the other HTML compression steps remain enabled.

Measured with the same throttled mobile profile as the earlier batches. Two
final cold runs are shown as ranges where load-event timing varied:

| Archive result | Requests | Transfer | FCP | DOM content | Load | Long-task total |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Immediately before Batch 3 | 106 | 6.35 MB | not recorded | 3.29 s | 32.27 s | 0.69 s |
| Batch 3 | 104-105 | 1.06 MB | 2.02-2.14 s | 3.58-3.61 s | 3.61-6.49 s | 0.62-0.66 s |

Browser and build evidence:

- Before mobile intent, the archive requests the 47 KB poster and atmosphere
  controller but creates no video element or media request. Transfer fell by
  about 5.29 MB and the slowest final load event improved by about 25.78 seconds.
- Keyboard activation starts the unchanged video at its existing playback rate;
  the same focused control pauses and resumes it without a second media request.
  Archive text filtering remained functional before and during activation.
- Reduced-motion stays poster-only. Simulated Save-Data + 2G + 2 GB memory keeps
  motion manual. A deliberately blocked video produces the visible Retry motion
  state with the poster intact and no console error or unhandled rejection.
- Unconstrained desktop still starts the existing video automatically after
  idle. Desktop currently downloads the 2.78 MB PNG poster even under Save-Data;
  generating a high-resolution responsive derivative remains open asset work.
- The production build completed all 366 pages in 226.47 seconds and Pagefind
  indexed 84 pages. Type-check, strict changed-file CSS audit, contract audits,
  and focused browser checks passed. The full CSS audit still reports the
  existing shared fan-out and architecture debt described below.
- No public asset, production dependency, or CSS file was added or changed.
  Deployed PageSpeed and physical-device media interaction remain unverified.

### Batch 4 - canonical store cards and progressive product media (2026-08-28)

Implemented:

- `MarketplaceListingCard.astro` now renders one responsive product link and
  media tree. The second mobile-only link, image, title, price, and call-to-action
  tree and its complete CSS selector family were removed.
- The card now uses the existing `contracts/products.ts` owner for product URLs
  and primary visuals instead of maintaining another slug, asset URL, and media
  fallback implementation.
- The existing `storefrontController.ts` now owns product-media activation in
  addition to filtering and sorting. Featured, spotlight, and listing images
  expose sources as data until they approach the viewport; one observer attaches
  them, reports load/error state, and disconnects on Astro navigation.
- The store controller is guarded by the product grid, initializes on direct
  load and `astro:page-load`, and cannot bind a second listener/observer family
  to the same route. Product text and links remain server rendered, including
  the existing no-script image fallback.
- Loading and `Asset unavailable` presentation lives in the existing storefront
  feature CSS owner. Responsive rules adapt the canonical desktop card instead
  of swapping to a duplicate component tree.

A fresh pre-edit measurement was required because the earlier 4.83 MB Batch 1
store result no longer described the current page. The same 390 x 844 throttled
profile immediately before this batch transferred only 594,749 bytes: native
lazy loading happened to leave the large lower-card images pending. A simple
markup consolidation exposed that fragility and briefly regressed to 4.83 MB
and a 24.7 second load; that intermediate result was rejected. Progressive
source attachment restored the critical path before handoff.

| Store result | Requests | Transfer | Image elements | DOM nodes | FCP | Load | Long-task total |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Fresh pre-edit baseline | 104 | 594,749 B | 20 | 860 | 2.05 s | 3.24 s | 0.28 s |
| Batch 4 | 99 | 584,271 B | 13 | 825 | 2.42 s | 3.67 s | 0.26 s |

The request, transfer, and timing changes are small enough that this batch does
not claim a general speed-score improvement. Its proven result is removal of a
duplicate responsive DOM/runtime path and a stable progressive-media boundary:
seven product links replace fourteen, seven product image elements replace
fourteen, and the multi-megabyte eager-load regression is no longer present.

Browser and build evidence:

- Mobile and desktop render seven card shells, seven product links, seven unique
  listing sources, and no retired mobile-card tree. The inspected layouts retain
  the existing two-column mobile and detailed desktop presentations.
- Mobile search for `snuggaloid` returns one product; the companions filter
  returns one; price ascending begins Sad Snax, Puppy Rescue Rations, and The
  Dip. Navigation reaches `/store/crateclip-xl/` with the expected heading.
- A deliberately blocked card image keeps the listing usable and visibly shows
  `Asset unavailable`. Normal mobile/desktop runs have no console warning/error,
  exception, failed request, duplicate product source element, or repeated URL.
- The final cold mobile critical path contains none of the large product PNGs.
  Those source files can still be requested as a user approaches their cards;
  visually reviewed responsive WebP/AVIF derivatives remain open work.
- The exact production build completed 367 pages in 240.44 seconds and Pagefind
  indexed 84 pages. Type-check, Biome, contract audits, diff check, and strict
  changed-file CSS audit passed. The full CSS audit still reports the broader
  current-worktree debt; the changed/strict audit reports zero new items.
- No public asset, production dependency, component, or stylesheet was added.
  Existing feature CSS was consolidated. The existing controller grew by about
  0.35 KB gzip to provide progressive activation and recoverable failure state.
- Cart, checkout, customizer, deployed PageSpeed, and physical-device behavior
  were not changed by this batch and were not re-verified.

### Batch 5 - intent-loaded site audio and one unlock owner (2026-08-29)

Implemented:

- Added `src/utils/site-audio-loader.ts` as the single admission boundary for
  the existing ambience and SFX managers. It keeps module promises and loaded
  manager references, initializes each implementation once, and resets plus
  reports failed loads without creating another playback controller.
- `SiteAudioRuntime.svelte` remains the global route/activation owner, but no
  longer imports Howler or the ambience manager at startup. With sound disabled
  by default it leaves normal browsing alone; with a stored enabled preference,
  the first eligible user activation loads, route-syncs, and unlocks the existing
  manager.
- `SiteSfxBridge.svelte` retains the one global interaction-to-effect mapping,
  but no longer initializes a second audio-unlock path. It loads the existing
  SFX manager only after enabled pointer/keyboard or explicit SFX intent, queues
  the first effect until the shared audio-unlocked event, and does no hover,
  focus, or wheel work before that manager exists.
- `SiteAudioControl.svelte` renders the stored enabled/volume state without the
  manager. Hover, focus, pointer-down, toggle, or slider intent loads and
  subscribes to the existing owner. A failed module request disables the mix
  sliders and presents a keyboard-accessible reload action; reloading retries
  from a clean module graph.
- Corrected the control's mobile portal teardown. Closing the mixer now removes
  its marker without restoring an already-detached panel, preventing orphaned
  duplicate panel DOM while preserving the existing mobile toggle behavior.

Measured on the same cold 390 x 844, 4x CPU, throttled network profile using the
ordinary `/posts/explainer/` route:

| Result | Requests | Transfer | Script transfer | FCP | DOM content | Load | Long-task total |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Immediately before Batch 5 | 101 | 1,322,422 B | 140,213 B | 1.884 s | 3.195 s | 5.666 s | 0.256 s |
| Batch 5 | 102 | 1,310,749 B | 126,432 B | 1.884 s | 3.639 s | 5.566 s | 0.234 s |

Request and DOM-content timing varied by one stylesheet/fetch request between
runs, so this batch does not claim a general page-speed score improvement. The
stable payload result is that the 10,050-byte transferred `vendor-audio` chunk,
the 15.62 KB minified ambience manager, the SFX manager, and audio media are no
longer requested on the cold route. Script transfer fell by 13,781 bytes and
total transfer fell by 11,673 bytes in the compared runs.

Browser and build evidence:

- The exact production preview requests only the lightweight audio profile,
  loader, and activation chunks before intent. A real mobile touch then loads
  the unchanged ambience manager, Howler vendor, and selected ambience file;
  subsequent enabled pointer intent loads the existing SFX manager and effect
  file.
- Keyboard Enter on the desktop post control enables sound, opens the mixer,
  updates persisted state, and requests its selected ambience. Mobile and
  desktop each render one audio control; a closed mobile mixer leaves zero
  orphan panels.
- Blocking the production ambience-manager chunk keeps sound off, exposes
  `Sound controls are temporarily unavailable` plus `Reload to try again`, and
  produces no unhandled rejection or console error. Unblocking and using that
  reload action restores the control; the next touch enables ambience normally.
- Normal touch, keyboard, SFX, and failure/recovery runs have no console warning
  or error, runtime exception, repeated audio-media request, or unexpected
  eager manager request. The one deliberately blocked request is the expected
  failure-path evidence.
- The exact production build completed 367 pages in 228.05 seconds and Pagefind
  indexed 84 pages. Type-check, Biome, full CSS audit, changed-file CSS audit,
  and strict CSS audit exited successfully. The changed/strict audits report
  only the existing `HomeIntroEnvironment.svelte` baseline item; this batch adds
  no CSS.
- No public asset, stylesheet, production dependency, component, hydration
  directive, or shared package was added or changed. The one new app-local
  utility is the lazy admission boundary. Deployed PageSpeed and physical-device
  audio output remain unverified.

### Batch 6 - event-driven timeline scene and intent-loaded motion (2026-08-29)

Implemented:

- Both timeline routes now explicitly suppress the shared golden-era parallax
  scene. `TimelinePageLayout.astro` remains the route composition owner, and the
  timeline no longer downloads or runs a second route-inappropriate background
  video behind its universe scene.
- Added `TimelineBackgroundMedia.svelte` inside the existing timeline island as
  the single universe poster/video owner. Compact, Save-Data, constrained, and
  reduced-motion contexts do not create the video source on first load. Touch,
  wheel, keyboard, or the existing Play control starts it explicitly; capable
  desktop starts after paint during idle. Playback failure keeps the poster and
  exposes a visible Retry action.
- The carousel scene now caches deterministic particles, generated textures,
  star targets, and star presentation data. Its Threlte task remains registered
  but dormant and runs one frame only when timeline position, camera, view mode,
  selection, or viewport state changes. It no longer continuously recalculates
  and projects every star while settled.
- Scroll and autoplay updates are capped to useful mobile/desktop frame rates.
  Mobile no longer starts autoplay before intent; the existing Play, pause,
  direction, wheel momentum, selected-record, map, and camera controls remain
  the active implementation.
- Visibility and intersection state now pause autoplay, adaptive DPR work, and
  background playback when the timeline is hidden or offscreen, resuming only
  state that was active beforehand.
- Removed continuous SVG SMIL line animation, full-wrapper glow animation,
  tap-hint pulsing, and width/left transitions on the continuously updated
  slider. The constellation, glow, hint, progress, and thumb visuals remain.
- Extracted pure presentation/camera calculations, deterministic particle
  generation, and cached texture generation from the two oversized components
  into real single-purpose owners. The strict architecture audit reports zero
  new debt; the carousel and scene remain below their recorded baseline sizes.

A fresh pre-edit timeline measurement was taken because the original audit had
drifted slightly. Both rows use the same local production, 390 x 844, 4x CPU,
150 ms latency, and about 1.6 Mbps profile:

| Timeline result | Requests | Transfer | FCP | DOM content | Load | LCP | Long tasks | Long-task total |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Fresh pre-edit | 106 | 6,995,129 B | 1.892 s | 3.436 s | 38.795 s | 22.516 s | 231 | 14.167 s |
| Batch 6 | 102 | 5,708,816 B | 1.908 s | 3.118 s | 3.122 s | 20.924 s | 5 | 0.946 s |

The load event improved by 35.67 seconds, transfer fell by 1,286,313 bytes,
and long-task time fell by 93.3%. CDP task time fell from 38.613 to 4.904
seconds, script time from 6.204 to 1.354 seconds, layout from 0.976 to 0.105
seconds, and style recalculation from 9.105 to 0.225 seconds. The timeline
became interactive with 30 visible star controls at 9.33 seconds and stayed on
the poster with no video request until intent.

The remaining 20.924-second LCP is not owned by the timeline avatars as the old
backlog entry implied. The cold trace proves that the six 0.48 to 1.41 MB PNGs
come from the closed shared `MobileProfileOverlay`/`Profile.svelte` path and
still consume about 4.94 MB before the 44 KB timeline poster finishes. Repairing
that shared owner requires explicit `packages/blog-core` cross-consumer scope;
an app-local duplicate profile or layout workaround was not added.

Browser and build evidence:

- Fresh mobile load renders the poster, one canvas, 30 visible star controls,
  no video, and no CSS/SMIL animation. A five-second settled sample fell from
  4.854 to 0.085 seconds of task time, 0.799 to 0.0037 seconds of style
  recalculation, and 4,027 to 61 recalculation events.
- Two-finger touch moved the position from 22.5 to 25.01. ArrowRight moved it
  to 23.37. Wheel input, explicit autoplay, star selection, and the selected
  record card worked; only the universe WebM was requested after intent.
- `/timeline/2d/` rendered map mode with its zoom, pan, orbit, reset, and star
  controls. Reduced motion remained poster-only. A deliberately blocked WebM
  retained the poster and exposed the Retry background motion status without an
  unhandled exception. Desktop retained idle video and autoplay behavior.
- The home portal still deferred on mobile, produced its canvas after intent,
  and retained the explicit WebGL-unavailable fallback after the shared
  particle task stopped forcing its own frame invalidation.
- The final exact production build completed 367 pages in 303.20 seconds, passed its
  built-HTML audit, and indexed 84 pages. Type-check, contract audits, changed
  CSS audit, strict CSS audit, and diff check passed. The full CSS inventory
  still reports seven baseline and ten unrelated current-worktree findings.
- The existing link audit still fails on nine references to five missing
  Miranda subroutes; this batch did not add or change those links. The PostCSS
  `from` warning and 699 KB minified Three.js core warning also remain.
- The exact preview verified `/timeline/` touch, media, and selected-record
  behavior before the sandbox later removed the ignored `dist/` tree. A fresh
  production `/timeline/2d/` recheck therefore remained unavailable; its dev
  route and the exact production build were verified. Deployed PageSpeed and
  physical-device behavior remain unverified.
- No public asset, production dependency, stylesheet, hydration directive, or
  shared package was added or changed. One app-local media component and three
  app-local timeline calculation/texture modules were added inside the existing
  owners; superseded inline calculations and animation paths were removed.

### Batch 7 - retire the uncalled app-local profile fork (2026-08-29)

Implemented:

- A repository-wide caller inventory confirmed that the active profile and
  mobile overlay are imported only from `packages/blog-core`. The app-local
  `src/components/client/Profile.svelte` was reachable only from the app-local
  `MobileProfileOverlay.svelte`, and that overlay had no renderer or external
  import.
- Deleted both app-local components and their exclusively imported
  `src/styles/features/profile.css`: 712 lines of superseded component/style
  ownership. No replacement, compatibility export, or parallel profile path was
  added.
- Removed the retired local profile component's CSS-architecture baseline
  allowance. Historical audit reports were retained as dated evidence rather
  than rewritten to conceal their former finding.

Browser and build evidence:

- The final production build completed 367 pages in 233.36 seconds, passed the
  built-HTML audit, and indexed 84 pages. Its only emitted profile owners were
  the shared `Profile` (10.38 KB) and `MobileProfileOverlay` (2.25 KB) chunks;
  deleting the orphan therefore correctly produces no client-payload claim.
- Type-check and contract audits passed. Changed-file and strict CSS audits
  report zero existing and zero new findings. The complete CSS inventory still
  exits zero while printing six baseline and ten pre-existing current-worktree
  findings; its unreliable error exit remains a separate guardrail repair.
- On `/posts/first-contact-manual-style-guide/` at 390 x 844, the only direct
  profile island resolves to
  `packages/blog-core/src/components/client/Profile.svelte`. The closed shared
  overlay has no visible profile card or pointer events; its existing
  `profile:toggle` event exposes one profile card and one avatar. No console
  error, failed request, hydration warning, or local `profile.css` request was
  observed.
- That same probe also confirms the remaining shared defect rather than hiding
  it: the page still instantiates two shared profile trees with twelve avatar
  elements, while no maintained `#sidenav-profile-btn` trigger is rendered.
  The desktop `/archive/` probe did not expose a visible sidebar profile, so
  desktop visual profile behavior remains unverified. Both behaviors are owned
  by the shared grid/profile/controller path and were not routed around here.
- The sandbox purged ignored `dist` contents after the successful build, so the
  focused interaction probe used the source dev server. Exact production
  profile interaction, deployed PageSpeed, and physical-device behavior remain
  unverified.
- No public asset, production dependency, component, stylesheet, hydration
  directive, route, or shared package was added. The only non-deletion change
  is the downward CSS-baseline correction.

### Batch 8 - enforce CSS debt failures and split the reader owner (2026-08-29)

Implemented:

- `scripts/audit-css-architecture.mjs` now returns a nonzero exit code when the
  complete audit finds error-severity debt that is new or expanded relative to
  the baseline. With no baseline it blocks every error-severity finding; the
  JSON report now exposes the same decision as `blockingIssues`. Strict mode
  retains its broader contract of blocking every new baseline issue.
- Before editing the reader styles, the repaired audit correctly exited 1 on
  the unbaselined 1,950-nonblank-line
  `src/styles/reader/first-contact-manual.css` owner. The baseline was not
  raised or otherwise changed to hide that failure.
- Kept `src/styles/reader/first-contact-manual.css` as the canonical import and
  made it a thin ordered entrypoint for five responsibility-based partials:
  foundation/tokens (247 nonblank lines), shared primitives (452), extended
  reference/routing (441), chapter/protocol visuals (313), and legacy chapter
  compatibility (497). These boundaries follow the stylesheet's existing
  section ownership rather than introducing another reader style system.
- The concatenated partials have the same SHA-256 as the former stylesheet,
  `1af1b9e086c2eb247752b3d72e60f481f14c23ee7e42fc7c388d8c68830f84fe`.
  Selectors, declarations, and cascade order are therefore byte-for-byte
  unchanged. No MDX or reader component needed a new import.

Browser, audit, and build evidence:

- The complete CSS audit now exits zero with no blocking issue. The former
  oversized-reader error is gone; six baseline items and nine unrelated
  warning-only findings remain. Changed-file and strict audits both report zero
  existing and zero new findings, and the all-files JSON audit reports an empty
  `blockingIssues` list.
- Type-check and the diff whitespace check pass. The final production build
  completed 367 pages in 387.07 seconds, passed the built-HTML redirect audit,
  compressed 368 HTML and 1,293 JSON files, and indexed 84 pages with Pagefind.
- Mobile 390 x 844 checks covered the reader index, foreword, chapters 1 and 5,
  and afterword; chapter 1 was also checked at 1440 x 900. The existing reader
  tokens, window/index panels, hero, protocol and imperative treatments,
  afterword, next link, and legacy compatibility selectors all retained their
  computed styling. No horizontal overflow, console error, hydration warning,
  failed request, or missing reader asset was observed.
- The build still prints Tailwind's known missing-`from` PostCSS warning. Its
  active local config contains only `postcss-nesting`; the warning traces to
  `postcss.parse` calls inside Tailwind 3.4.19's rule generation and preflight
  code. Repair would require a maintained dependency patch or Tailwind
  migration, so it was not hidden with a local workaround or dependency change
  without Project Owner approval.
- The site contract audit passed. At this batch's validation point, the combined
  command had one unrelated home-portal failure because a concurrent edit
  changed `PortalHeroBackgroundSlide.astro` away from its then-contracted URL.
  The concurrent owner subsequently reconciled the protected contract; the
  final Batch 10 combined contract run verifies all nine portal surfaces.
- No public asset, production dependency, hydration directive, component,
  route, or CSS baseline allowance was added. The only new files are the five
  reader partials behind the existing canonical stylesheet entrypoint.

### Batch 9 - retire the orphan home-route stylesheet family (2026-08-29)

Implemented:

- Traced every CSS audit warning through direct imports, CSS `@import` edges,
  selector consumers, generated assets, and built HTML. None of the eight
  reported home styles had a current Astro, Svelte, MDX, TypeScript, or CSS
  caller, and none of their selector families had current rendered markup.
- Four files were absent from the generated site as expected. Four others were
  still emitted and linked by nearly every route despite having no source
  caller: `portal-route-core.css`, `portal-route-effects.css`,
  `portal-route-store-community.css`, and `portal-timeline-route.css`. A forced
  Astro content-cache rebuild proved that this was a retained obsolete module
  graph rather than an undiscovered owner.
- Deleted all eight superseded files together: the four stale-output files plus
  `home-intro-hero-slide.css`, `portal-destinations.css`,
  `portal-route-archive.css`, and `portal-route-observatory.css`. This retires
  1,656 source lines without adding a replacement style system. The current
  home owners remain `portal-hero-slide.css`, `portal-hero-scroll-cue.css`,
  `portal-sponsored-bloom.css`, and the styles imported by the active 3D scene.

Browser, audit, and build evidence:

- The complete CSS audit dropped from 15 findings to 7: six baseline findings
  plus the unrelated warning-only `PortalSponsoredBloom.astro` size finding.
  All eight unreferenced-style warnings are gone. Complete, changed-file, and
  strict audits exit zero; type-check and the diff whitespace check pass.
- `astro build --force` explicitly cleared the content data store and completed
  367 pages in 380.03 seconds. The built-HTML redirect audit passed and Pagefind
  indexed 84 pages. No retired filename or selector appears in generated HTML,
  JavaScript, or CSS, and no corresponding asset remains under `dist/_astro`.
- The four formerly retained CSS files totaled 25,410 uncompressed generated
  bytes. Mobile home, desktop home, and a mobile regular post now expose 50
  external stylesheets rather than the measured 54-route baseline: four fewer
  requestable styles on every route.
- In exact production preview checks at 390 x 844 and 1440 x 900, home retained
  its visible banner and portal hero, the scroll cue remained visible and
  keyboard-focusable, and the regular post loaded normally. All three checks
  had no retired style URL, retired selector element, horizontal overflow,
  console error, hydration warning, or failed network request.
- The dependency-level PostCSS warning and 699 KB Three.js chunk warning remain.
  The concurrent home-video contract mismatch observed during Batch 8 was
  subsequently reconciled by its owner. This batch added no component,
  stylesheet, script, dependency, hydration boundary, route, baseline
  allowance, or public asset.

### Batch 10 - retire the uncalled SideNavbar and panel fork (2026-08-29)

Implemented:

- A repository-wide caller inventory confirmed that no route, layout,
  component, content file, or game source renders the app-local
  `SideNavbar.astro` or imports the app-local `SidenavPanels.svelte`. The active
  island is rendered by `packages/blog-core/src/layouts/MainGridLayout.astro`
  and resolves to the shared `SidenavPanels.svelte` owner.
- Deleted the 313-line app-local SideNavbar, the 390-line app-local panel fork,
  and its exclusively imported 9-line `side-navbar.css`: 712 lines retired with
  no replacement, compatibility export, listener family, or style owner added.
- The scratchpad's neighboring Bleepy item was stale by the time of this batch.
  Current repository commit `2849a042` had already deleted the complete
  2,715-line Bleepy family, including both competing controllers, banners,
  widgets, managers, data, docs, and exclusive styles. No Bleepy path was
  recreated or redundantly deleted here.

Browser and build evidence:

- The exact `pnpm build` completed 367 pages in 340.36 seconds, passed the
  built-HTML redirect audit, and indexed 84 pages. Its sole emitted
  `SidenavPanels` client chunk is the shared package owner at 12.26 KB; no
  app-local SideNavbar asset or exclusive stylesheet is emitted.
- Type-check, the complete CSS audit, changed-file CSS audit, strict CSS audit,
  site contract audit, and diff whitespace check pass. The complete CSS audit
  remains at the seven findings documented in Batch 9.
- Exact production preview checks covered mobile and desktop home plus a mobile
  regular post. The home banner-only composition correctly has no panel island;
  the post has one shared panel island, no `#unified-sidenav`, and no
  `side-navbar` stylesheet. Dispatching the maintained `profile:toggle` event
  opens the shared mobile profile overlay. No console error, hydration warning,
  failed request, or horizontal overflow was observed.
- At this batch boundary, the remaining shared panel still probed for deleted
  SideNavbar IDs and the mobile overlay still targeted its deleted profile
  button. The authorized cross-package follow-up in Batch 11 deleted both
  adapters and established the maintained responsive profile trigger.
- No public asset, production dependency, component, stylesheet, script,
  hydration directive, route, or baseline allowance was added.

### Batch 11 - consolidate shared profile, timeline, theme, and layout ownership (2026-08-29)

Implemented:

- Audited every live `@merkin/blog-core` layout consumer before changing the
  package. Megameal, Ainekio, and Travel all import the shared grid/layout;
  `apps/game` declares the package but has no current source import.
- Replaced the desktop profile plus independently hydrated mobile-overlay
  profile with one responsive `Profile.svelte` island. Deleted the superseded
  shared `MobileProfileOverlay.svelte` and dormant `SidenavPanels.svelte`
  adapter, and removed their grid mounts. Closed mobile, CSS-hidden desktop,
  and single-column desktop states now contain no image/video element or media
  source. Opening activates one asset; close, Escape, or returning to one
  column releases it.
- Preserved the live layout feature after its original server-only assumption
  was exposed in browser testing. `SpecialPageFeatures.svelte` is the layout
  state owner and now communicates through direct events; `LayoutToggle.svelte`
  no longer waits for window globals with retry/backoff or polls them every
  100 ms. The one profile island follows those state events, so switching to
  two columns shows the author and switching back removes hidden media.
- Removed the global timeline-view and timeline-banner startup from the base
  layout. Their existing component scripts now initialize only when their
  timeline markup renders. A normal post makes no request for either client.
- Restored explicit timeline article banners. The banner policy had classified
  `bannerType: timeline` on posts as unsupported, and two adapter layers always
  forwarded a statically registered but empty named slot. The maintained
  timeline type is now admitted and explicit slot-presence data reaches the
  banner stage, allowing a normal timeline post to use its existing default
  renderer while `/timeline/` keeps its custom 3D carousel.
- Removed duplicate theme-click ownership from the shared and Megameal navbars.
  `LightDarkSwitch.svelte` is the sole scheme control and uses static inline
  SVGs instead of dynamic Iconify components that produced an Ainekio hydration
  mismatch. One click now produces one stored/document theme transition.
- Aligned Ainekio's HTML compression with the already proven class/whitespace
  settings, removed its stale always-pass compression hook, and repaired the
  Megameal/Ainekio image-banner resolvers to honor a post's canonical image.
  Ainekio's Current Status route now loads its declared
  `/posts/ainekio-2026/current-status.webp` rather than the placeholder path.

Measured and browser evidence:

- The three former shared profile chunks totaled 24.85 KB minified
  (`Profile` 10.38 KB, mobile overlay 2.25 KB, panels 12.22 KB). The final
  Megameal build emits one 9.61 KB profile chunk, a 15.24 KB/61% reduction, and
  has exactly one profile owner on tested routes.
- On `/posts/timeline/`, production preview renders one initialized shared
  timeline shell and banner. Zoom changes the stage from scale 1 to 1.2. The
  layout toggle changes `hidden -> visible -> hidden`; the author card is
  264 x 354 px in two-column mode, media count changes `0 -> 1 -> 0`, and the
  name/bio remain `The Universe` / `...and everything in it`.
- A normal mobile post requests no shared timeline client. Its closed profile
  has no media; opening requests one asset and focuses Close; the forced media
  error shows a retry control; retry restores media; Escape closes, releases
  media, and returns focus to Open. There is no overflow, bad response, or
  failed request.
- The dedicated `/timeline/` route still renders its custom hydrated carousel,
  one WebGL canvas, and no default shared-timeline wrapper. Headless Chrome
  reports only its software-WebGL/driver performance warnings.
- Ainekio Current Status at 390 x 844 renders the intended image, one profile
  owner, and one theme switch; a single light-to-dark click updates both
  storage and the document. Ainekio home verifies the shared profile on a real
  two-column desktop route. Travel's archived page remains responsive and
  unchanged. None of those consumer checks has an app console, hydration,
  network, asset, or overflow failure.
- Megameal's production post still logs one Svelte hydration mismatch. A clean
  controlled probe removes it only when the concurrently modified
  `DocsEditorBridge` island is blocked; all other islands, including Profile,
  LayoutToggle, and SpecialPageFeatures, hydrate without that warning. The
  bridge is outside this performance batch and remains a separate defect.

Validation and remaining work:

- Blog-core, Megameal, Ainekio, and Travel type-checks pass. Final production
  builds pass for 367, 73, and 1 page respectively; Megameal's build completed
  in 292.53 seconds, passed its 21-shell HTML audit, and indexed 84 pages.
  Ainekio completed in 49.96 seconds and indexed 14 pages; Travel completed in
  2.34 seconds.
- Complete, changed-file, and strict CSS audits exit zero. The complete audit
  still lists six baselines and the unrelated warning-only
  `PortalSponsoredBloom.astro` size item; strict reports only the existing
  `TimelinePortalCarousel.svelte` baseline. Site, home-portal, timeline, and
  diff-whitespace checks pass.
- A regular post currently exposes 51 external stylesheets, so the fewer-than-
  15 target remains open. The known Tailwind PostCSS warning, deferred 699 KB
  Three.js chunk warning, five missing Miranda link targets, deployed
  PageSpeed, and physical-device checks also remain open.
- This batch added no route, component, stylesheet, dependency, hydration
  boundary, public asset, test, script, or baseline allowance. It modified
  existing scoped/shared CSS and client owners and deleted the two superseded
  shared components.

### Batch 12 - route CSS ownership and timeline regression repair (2026-08-30)

Implemented:

- Replaced the universal Vite source-graph CSS fan-out with named route bundles
  compiled from the existing canonical CSS sources. Static route endpoints under
  `src/pages/styles/routes/` now serve those bundles with real `.css` URLs, and
  each layout/page links only its site, feature, and route owners.
- Narrowed the app and shared image discovery globs from every `/src` file to
  supported raster image extensions. The broad glob had registered unrelated
  components and route styles as browser modules. The app-local image wrapper
  is now a thin adapter over the shared implementation rather than a duplicate
  130-line resolver.
- Kept timeline runtime conditional: ordinary posts have no timeline wrapper or
  timeline client request, while `bannerType: timeline` posts dynamically load
  the existing shared timeline renderer. Timeline CSS is emitted only with that
  renderer instead of as two global stylesheet requests.
- Restored the intended `/posts/timeline/` presentation after the CSS cleanup
  exposed an accidental dependency on cross-route leakage. `MainGridLayout` now
  links the canonical site foundation explicitly; without it, the initialized
  timeline wrapper had zero height and the responsive author presentation did
  not have its required global layout rules.
- Extended the built-HTML audit to reject route-only style leakage on a
  representative post and to require the built timeline post, its populated
  event markup, and its custom author/avatar.

Measured and browser evidence:

- The production representative post now has 9 blocking stylesheets instead of
  the 51 recorded after Batch 11. A clean mobile preview load made 54 total
  requests, rendered no timeline markup, and requested no route-only archive,
  reader, store, timeline, video, quiz, home, or product CSS.
- On the exact development URL `http://localhost:4321/posts/timeline/` and in a
  production preview, the timeline occupies 1440 x 810 px, renders 54 events,
  and zoom changes scale 1.3 to 1.5. The layout toggle changes one-column to
  two-column and back; the two-column profile is 264 x 354 px and loads the
  Universe avatar, name, and bio. The development route has no console or
  network failure.
- The regular mobile profile still has one owner, loads no hidden media, exposes
  a retryable media failure, and releases the asset on Escape. The dedicated
  `/timeline/` route still renders its custom hydrated carousel and one canvas.
- Ainekio's current-status/profile/theme interaction and Travel's archived page
  remain intact in production previews. Travel still requests a missing
  `/favicon.ico`; that unrelated existing asset defect was not changed here.

Validation and remaining work:

- Megameal and blog-core type-checks pass. Megameal's uncontended production
  build passed all 367 pages in 118.29 seconds, verified 21 redirect shells,
  found 54 built timeline events with the custom author, and indexed 84 pages.
  Ainekio and Travel type-check and production builds pass (73 and 1 page).
- Complete, changed-file, and strict CSS audits exit zero; the complete audit
  retains its six baselines and warning-only `PortalSponsoredBloom.astro` item.
  Site, home-portal, timeline, and whitespace contract checks pass.
- PhotoSwipe and OverlayScrollbars CSS were still linked by a normal mobile
  post at the end of this batch; Batch 14 completed their conditional
  admission. The known
  DocsEditorBridge production hydration warning, desktop timeline horizontal
  overflow, Tailwind PostCSS warning, deferred Three.js chunk, deployed
  PageSpeed, and physical-device checks also remain open.
- This batch added one route-style manifest/compiler pair, explicit static CSS
  endpoints, one direct dev dependency already present transitively, and a
  built-route contract. It added no new component, hydration boundary, public
  asset, production dependency, or CSS baseline allowance.

### Batch 13 - restore progressive home portal ownership (2026-08-30)

Implemented:

- Restored `HomeIntroActivation.svelte` as the single admission boundary for
  the existing `HomeIntroEnvironment.svelte` scene. The home now server-renders
  the existing 17.8 KB still and a 3.14 KB activation chunk; Three.js, Threlte,
  the scene, models, and sprite atlas remain behind the dynamic import.
- Restored viewport, connection, memory, reduced-motion, WebGL, and stable-paint
  policies through the existing `richMediaCapabilities.ts` owner. Compact,
  Save-Data, 2G/3G, low-memory, and reduced-motion contexts remain on the still
  until explicit input, while an unconstrained desktop can upgrade during idle.
- Made `PortalHeroBackgroundSlide.astro` the canonical source/playback owner for
  the 10,256,563-byte tunnel video. It now starts at `preload="none"`, admits
  its source on portal intent or eligible desktop idle, and reports playback or
  loading failure while preserving the still and interactive portal.
- Removed a duplicate runtime ownership path without modifying shared
  blog-core: the shared banner stage treats `data-src` as its own active-slide
  loader contract, so the portal background now uses the component-specific
  `data-portal-background-src` attribute. The home contract audit rejects both
  an eager `src` and the generic attribute that previously bypassed admission.
- Updated the protected home-portal contract and documentation to preserve the
  immediate still, unchanged portal scene and destinations, joystick/keyboard
  activation, reduced-motion behavior, and explicit fallback states.

Measured production-preview evidence at 390 x 844:

| State | Requests | Counted transfer | Startup canvas | Tunnel request | Startup long tasks |
| --- | ---: | ---: | ---: | ---: | ---: |
| Reopened eager source | 60 | 1,894,024 B | 1 | yes | 9 / 1,335 ms |
| Batch 13 idle | 51 | 363,845 B | 0 | no | 0 / 0 ms |

- The counted startup transfer fell by 1,530,179 bytes (80.8%) and nine
  requests. The baseline did not count the long-lived media response body, so
  the avoided 10.26 MB tunnel request is additional to that transfer delta.
- Mobile and Save-Data + 2G + 2 GB memory idle loads request only the still and
  activation chunk from the portal owner. Neither case requests the environment
  module, Three.js chunks, sprite atlas, or tunnel video.
- Keyboard portal intent loads the unchanged lean scene, creates one canvas,
  admits the tunnel, and keeps the immediate still underneath as recovery.
  Reduced-motion intent loads the interactive scene but keeps background motion
  unrequested. Unconstrained desktop idle retains the full scene.
- Forced WebGL absence keeps the still, creates no canvas, makes no 3D request,
  and exposes the explicit unavailable state. A deliberately blocked tunnel
  request keeps the video hidden, leaves the scene usable, and exposes
  `Portal background motion is unavailable` without a console error or
  unhandled rejection.
- Production mobile screenshots visually confirm both the intact static city
  first paint and the original logo/particle portal after activation. All
  normal matrix cases have no console warning/error, hydration warning, failed
  request, or horizontal overflow; the one blocked request is deliberate
  failure-path evidence.

Validation and remaining work:

- `pnpm type-check`, the site/home/timeline contract audits, complete CSS audit,
  changed-file CSS audit, strict CSS audit, focused Biome check, and whitespace
  check pass. The complete CSS audit still reports its six baseline findings
  and the warning-only `PortalSponsoredBloom.astro` item.
- The exact production build completed all 367 pages in 114.30 seconds,
  verified 21 redirect shells, found 54 timeline events with the custom author,
  and indexed 84 pages. The known Tailwind PostCSS and deferred 699 KB Three.js
  chunk warnings remain.
- The repository-wide Biome command still reports 91 pre-existing formatting
  and import-order diagnostics across unrelated source files; the three changed
  home components and the changed contract script pass a focused check.
- This batch restores one previously deleted client component and one
  client-only activation boundary. It adds no CSS, public asset, dependency,
  route, parallel controller, shared-package change, or baseline allowance.
  The restored component owns and cleans up the portal activation listeners.
  Because no shared public asset or blog-core file changed, game and other site
  consumer builds are not implicated by this batch. Deployed PageSpeed and
  physical-device measurements remain open.

### Batch 14 - conditional image-viewer and scrollbar admission (2026-08-30)

Implemented:

- Repaired the canonical shared owner in
  `packages/blog-core/src/layouts/Layout.astro`. Astro/Vite was extracting the
  PhotoSwipe and OverlayScrollbars CSS imports from that universal layout into
  blocking stylesheet links on every route, even though their JavaScript was
  dynamically imported. The layout now carries emitted stylesheet asset URLs
  as body metadata and one shared loader admits each link only with its
  corresponding runtime.
- PhotoSwipe retains the existing `.custom-md img, #post-cover img`
  eligibility and image-viewer behavior. Routes without an eligible image make
  no PhotoSwipe CSS or JavaScript request.
- OverlayScrollbars no longer owns the document body. Native page scrolling is
  the default, and the existing custom treatment is admitted only for `pre` or
  `.katex-display` targets on a fine-pointer desktop. The existing generation,
  timer, instance destruction, and page-navigation cleanup remain canonical.
- Consolidated the two adjacent layout scripts so stylesheet admission is not
  duplicated. Existing page navigation removes the feature link and controller
  when leaving an eligible route and re-admits it on browser Back.
- Kept Megameal's existing `optimizeDeps` entries with an explicit comment:
  shared-package lazy imports otherwise make the development server restart on
  first intent. This is development pre-bundling, not production browser
  admission.

Measured production result:

- The representative post now has 7 blocking stylesheets instead of 9. The two
  removed global links total 18,473 bytes raw and 4,104 bytes gzip before
  request overhead.
- Built home, archive, store, ordinary post, image post, code post, and timeline
  HTML link neither feature stylesheet. Both CSS assets remain emitted and are
  available for conditional runtime use.
- Fresh home and store loads request no PhotoSwipe or OverlayScrollbars CSS or
  JavaScript. The image post requests only PhotoSwipe, opens its lightbox on the
  selected image, exposes its close control, and closes cleanly. The code post
  requests only OverlayScrollbars, enhances its code block, leaves the body
  native, and has no page overflow in the focused production probe.
- Client navigation from home to an image post admits the lightbox, navigation
  to store removes the lightbox and feature stylesheet, and browser Back
  re-admits the stylesheet. Every case had zero console warnings/errors,
  unhandled exceptions, failed requests, or HTTP error responses.
- The exact development timeline route still initializes one 1,440 x 810 px
  timeline with 54 events. Its layout toggle reveals one 264 x 354 px Universe
  author panel and loaded avatar in two-column mode, then intentionally hides
  the sidebar again in one-column mode. No timeline feature was removed.

Validation and cross-consumer boundary:

- Megameal and blog-core type-checks pass. Megameal's production build completed
  all 367 pages in 176.97 seconds, verified 21 redirect shells, found 54 built
  timeline events with the custom author, retained the 7-stylesheet budget, and
  indexed 84 pages. Site, home-portal, timeline, and whitespace contract checks
  pass.
- Because the canonical owner is shared blog-core, Ainekio and Travel were
  treated as affected consumers. Their type-checks and production builds pass
  (73 and 1 page). Ainekio emits the conditional feature assets without global
  links; its current-status/profile and home profile interactions have no
  console or network failure, and mobile avatar admission still occurs only
  when opened. Travel's archived page has no client islands, console messages,
  or failed responses.
- Complete and changed-file CSS audits pass. The complete audit retains the
  warning-only `PortalSponsoredBloom.astro` item, and the strict audit remains
  blocked only by the concurrent untracked `SiteArrivalStatus.astro` 126-line
  style block. Batch 14 adds no CSS source and does not update the baseline.
- In Vite development, the two `?url` modules are fetched as script metadata by
  HMR even on an ineligible route, but neither stylesheet is applied and no
  vendor runtime is requested. The production/PageSpeed graph is clean.
- This batch adds no component, hydration boundary, CSS source file, public
  asset, dependency, route, or parallel controller. It changes the shared
  layout owner and documents the existing Megameal pre-bundling boundary.

### Batch 15 - conditional mathematical-notation styling (2026-08-30)

Implemented:

- Removed the remaining route-inappropriate stylesheet import from the
  canonical shared owner, `packages/blog-core/src/layouts/Layout.astro`.
  Importing `katex/dist/katex.css` from that universal layout made Astro emit a
  blocking KaTeX link on every page even when the rendered document contained
  no mathematical notation.
- The layout now carries the emitted KaTeX asset URL as body metadata and uses
  the existing shared feature-stylesheet loader to admit it only when `.katex`
  markup exists. A missing or failed stylesheet remains an explicit console
  error rather than silently presenting unstyled notation.
- Kept client navigation ownership in `PageNavigation.svelte`: leaving a math
  document removes its dynamic feature link with the rest of the stale style
  graph, and the layout's existing `astro:page-load` hook admits it again if
  the next document contains math.
- Extended the existing built-HTML regression audit to reject KaTeX,
  PhotoSwipe, or OverlayScrollbars as blocking stylesheet links on the
  representative ordinary post. No parallel loader, component, or route was
  introduced.

Measured production and browser evidence:

- The representative post now has 6 blocking stylesheets instead of 7. This
  removes one request and the previously measured 8,287 transferred bytes of
  KaTeX CSS from every route without math; the emitted 29,203-byte asset remains
  available for eligible content. Current built Megameal and Ainekio pages do
  not contain rendered `.katex` markup, so they no longer request it.
- A production mobile probe begins on home with no math and no KaTeX feature
  link or request. Injecting actual output from KaTeX admits the emitted
  stylesheet and required fonts, produces the expected `KaTeX_Main` computed
  typography, and remains readable. Canonical client navigation to `/store/`
  removes the fixture and feature stylesheet. The full sequence has no console
  error, failed request, HTTP error, or horizontal overflow.
- The exact production `/posts/timeline/` route still renders one visible
  1,440 x 810 px initialized timeline with 54 events, and zoom changes scale
  1.3 to 1.5. Switching to two columns reveals the 264 x 354 px Universe
  profile with its loaded avatar, name, and bio; switching back removes the
  hidden media. No timeline or author feature changed in this batch.

Validation and cross-consumer boundary:

- Blog-core and Megameal type-checks pass. The exact Megameal package build
  completed all 367 pages in 107.65 seconds, verified 21 redirect shells,
  enforced the 6-stylesheet budget, found 54 timeline events with the custom
  author, and indexed 84 pages / 9,712 words. The known Tailwind PostCSS and
  deferred 699 KB Three.js chunk warnings remain.
- Ainekio and Travel type-checks and production builds pass (73 and 1 page).
  Ainekio's mobile and desktop current-status/home profile interactions remain
  functional, make no KaTeX request, and have no console, network, asset, or
  overflow failure. Travel's static archived page remains unchanged and still
  requests its previously documented missing `/favicon.ico`.
- Complete and changed-file CSS audits pass. Strict CSS audit remains blocked
  by the existing unbaselined `PortalSponsoredBloom.astro` size warning; this
  batch adds no CSS source and does not change the baseline. The production
  timeline continues to report the separately documented DocsEditorBridge
  hydration mismatch and desktop horizontal overflow; an attributed probe
  confirms the bridge island is the warning owner, not the layout, profile, or
  timeline runtime changed here.
- This batch adds no component, stylesheet source, hydration boundary,
  dependency, public asset, route, or baseline allowance. It modifies the
  shared layout owner and the existing built-output regression script.

### Batch 16 - production hydration-boundary preservation (2026-08-30)

Implemented:

- Traced the production-only `DocsEditorBridge` hydration warning to the
  Megameal HTML-output owner, not to different document data. The server and
  client each rendered the same 103 meaningful timeline document nodes, but
  `astro-compress` removed Svelte's empty `{@html}` boundary comments. Without
  those markers, Svelte could not reclaim the already-correct server DOM and
  rebuilt the island while reporting `hydration_mismatch`.
- Extended the existing `astro-compress` comment allowlist in
  `astro.config.mjs` with only the empty-comment pattern while retaining every
  default framework-comment exception and the rest of HTML compression. The
  shared Docs Editor Bridge, its content parser, and its hydration boundary
  remain unchanged; no alternate renderer or client-only fallback was added.
- Extended the existing built-HTML audit to require raw-HTML hydration
  boundaries in the timeline's Docs Editor Bridge. The regression check fails
  against the prior build, where the timeline contained zero empty boundaries.

Measured production and browser evidence:

- The repaired timeline output contains 50 required `<!---->` markers. Its
  compressed HTML increases from 356,468 to 356,818 bytes: exactly 350 bytes,
  or about 0.10%. Ordinary removable comments remain removable.
- On `/posts/timeline/`, the bridge has 291 DOM records immediately before and
  after hydration and 103 identical meaningful nodes. On `/posts/explainer/`,
  it has 199 records before and after and 88 identical meaningful nodes. Both
  production routes now hydrate with no console warning/error, exception,
  failed request, or HTTP error.
- The exact desktop timeline still renders one visible 1,440 x 810 px canvas
  with 54 events and zooms from scale 1.3 to 1.5. Switching to two columns
  reveals the loaded Universe avatar, author name, and bio; switching back
  removes the hidden profile media. The separately documented desktop
  horizontal overflow remains open.

Validation and scope boundary:

- Megameal type-check and the exact package build pass. The build completed all
  367 pages in 119.81 seconds, verified 21 redirect shells and the new
  hydration-boundary contract, and indexed 84 pages / 9,712 words. The known
  Tailwind PostCSS and deferred 699 KB Three.js chunk warnings remain.
- The complete CSS audit passes with its six baselined findings and the
  warning-only unbaselined `PortalSponsoredBloom.astro` size finding. This
  batch adds no CSS, component, hydration directive, dependency, public asset,
  route, or baseline allowance.
- This is a Megameal build-output repair. It changes neither `packages/blog-core`
  nor `apps/docs-editor-bridge`, so the other sites in the repository are not
  modified by this batch.

## Active owner map

- App route composition: `src/pages/[...page].astro` and the route files under
  `src/pages/`.
- Megameal layout adapter: `src/layouts/MainGridLayout.astro`.
- Production HTML integrity and its built-route regression contract:
  `astro.config.mjs` and `scripts/audit-built-html.mjs`.
- Shared route shell and client-controller composition:
  `packages/blog-core/src/layouts/MainGridLayout.astro` (1,686 lines).
- Shared image-viewer, mathematical-notation styling, and code/math scrollbar
  admission:
  `packages/blog-core/src/layouts/Layout.astro`; its feature stylesheet loader,
  eligible-target checks, controller creation, and navigation cleanup are the
  single owner for KaTeX, PhotoSwipe, and OverlayScrollbars runtime attachment.
- Shared banner renderer:
  `packages/blog-core/src/components/banner-stage/BannerStage.astro` (2,389
  lines).
- Home 3D portal: `PortalHeroSlide.astro` owns the immediate still and navigation
  cue; `HomeIntroActivation.svelte` owns deferred admission and dynamically
  imports `HomeIntroEnvironment.svelte`; that component and its
  scene/post-processing children retain the interactive scene. The adjacent
  `PortalHeroBackgroundSlide.astro` is the sole tunnel source/playback owner.
- Timeline route composition: `src/layouts/TimelinePageLayout.astro`; timeline
  interaction/runtime: `src/components/timeline/TimelinePortalCarousel.svelte`;
  universe poster/video: `TimelineBackgroundMedia.svelte`; 3D scene:
  `TimelinePortalCarouselScene.svelte`; pure presentation, particle, and
  generated-texture work: the adjacent `timelinePortalPresentation.ts`,
  `timelineParticles.ts`, and `timelineStarTextures.ts` owners.
- Search UI and Pagefind bootstrap: `src/components/Search.svelte`.
- Global audio activation and route sync:
  `src/components/client/SiteAudioRuntime.svelte`; intent admission and manager
  caching: `src/utils/site-audio-loader.ts`; ambience playback:
  `src/utils/site-audio.ts`; global interaction-to-SFX mapping:
  `src/components/client/SiteSfxBridge.svelte`; SFX playback:
  `src/utils/site-sfx.ts`; visible controls:
  `src/components/client/SiteAudioControl.svelte`.
- Archive background poster, media policy, playback, and recovery:
  `src/components/archive/ArchiveAtmosphere.svelte`, mounted only by
  `src/pages/archive/index.astro`.
- Store route/content composition: `src/pages/store.astro`; canonical product
  URLs and primary visuals: `src/contracts/products.ts`; responsive listing
  markup: `src/components/store/MarketplaceListingCard.astro`; filtering,
  sorting, and progressive product media: `storefrontController.ts`.
- Active profile implementation:
  `packages/blog-core/src/components/client/Profile.svelte`, mounted once by
  the shared grid and admitted by viewport plus live sidebar state.
- Shared layout state: `SpecialPageFeatures.svelte`; Megameal's visible
  `LayoutToggle.svelte` requests changes and consumes state through the direct
  `blog-core:layout-*` event contract.
- Shared public assets: `public/`; `apps/game` also consumes this tree, so it is
  not safe to prune based on Megameal callers alone.

## P0 - Remove route-inappropriate critical work

### 1. Stop the universal layout from importing every feature

Status: partially repaired in Batches 1, 12, 14, and 15. Timeline data,
configuration, carousel, Three.js, and route CSS are route-owned; KaTeX,
PhotoSwipe, and OverlayScrollbars now use eligible-target admission; and the
first stylesheet budget is met. The shared grid still statically imports other
feature owners.

Root cause: both grid layers use static imports for route-only implementations.
The Megameal adapter imports the timeline carousel, archive banner, default
universe hero, and home-related owners. The shared grid imports the universal
banner stage, both rail systems, timeline CSS, and six client controllers. A
static import is enough for Astro/Vite to link its CSS and shared JavaScript even
when the server-rendered conditional does not render that branch.

Repair:

- Keep the shared grid responsible for the semantic shell only.
- Let the route provide its banner/timeline/home implementation through a slot
  or route-specific server composition. Move the existing import to the route
  that renders it; do not create parallel implementations.
- Remove each corresponding conditional/import from the universal shell in the
  same change.
- Make timeline CSS and the 3D runtime timeline-only. A no-canvas post must not
  request either 3D vendor chunk.
- Make reader, quiz, review, store/customizer, Bleepy-banner, and home-route CSS
  appear only on routes that render those systems.

Proof:

- Compare the built resource list for `/`, `/archive/`, `/timeline/`, `/store/`,
  and a regular post.
- Completed in Batch 12: fewer than 15 blocking stylesheet requests on a
  regular post, with no route-only CSS or 3D bundle in its request list.
- Confirm navigation between all route families still selects the intended
  banner and preserves back/forward behavior.

### 2. Progressively start the home 3D portal

Status: restored and browser-verified in Batch 13 after the eager regression.
Physical-device and deployed PageSpeed evidence remain pending.

Root cause: `PortalHeroSlide.astro` had regressed to hydrating
`HomeIntroEnvironment.svelte` with `client:only`, so mobile downloaded and
executed the 3D runtime before the page settled. The tunnel video also used the
shared banner stage's generic `data-src` contract, which promoted it to an eager
`src` before the component's own media policy could run.

Repair:

- Keep the existing generated still as the immediate visual and accessible
  server-rendered copy as the initial experience.
- Start the existing 3D owner after the first stable paint using the least eager
  hydration that still makes the above-the-fold interaction timely. User
  pointer/keyboard/scroll intent should be able to start it immediately.
- Preserve the current 3D scene and interaction; the still is a loading state,
  not a permanent mobile replacement.
- Ensure the scroll cue retains a non-3D navigation fallback while loading.
- Optimize the shared GLB/texture path only after visual comparison; do not
  silently lower required quality.
- Remove the stale manual-chunk condition for the nonexistent
  `HomeIntroEnvironmentLoader.svelte` after the active path is established.

Proof:

- No hydration warning, console error, rejected playback promise, or missing
  asset.
- Home content and navigation are usable before the 3D model completes.
- Test touch drag, wheel, keyboard, route activation, reduced motion, Save-Data,
  low-memory mode, and the explicit media failure state.
- Re-measure startup long tasks and interaction latency on a real mobile device.

### 3. Load Pagefind only when search is requested

Status: completed and browser-verified in Batch 1.

Root cause: `Navbar.astro` calls `loadPagefind()` and then `pagefind.search('')`
on every production page. This downloads and initializes search before the user
opens or focuses the search UI.

Repair:

- Give the search control one promise-backed loader owned by `Search.svelte` (or
  one adjacent search owner).
- Start it on search-panel open, search-input focus, or the first real query.
- Remove the global empty-query prewarm and the duplicate readiness event path.

Proof: no Pagefind WASM/index request before search intent; the first query,
empty result, keyboard focus, close action, and subsequent cached query work.

### 4. Prevent hidden responsive profile media from loading twice

Status: completed and browser-verified in Batch 11, including the live
one-column/two-column transition and media failure/retry path.

Root cause: the shared grid renders a desktop profile and a separate mobile
profile overlay. Both use the same active profile component, whose video branch
uses autoplay and `preload="auto"`. On the mobile post probe,
`/about/video/merkin.webm` was transferred twice (about 424 KB each).

Repair:

- Prefer one responsive profile media owner that is positioned for desktop and
  mobile rather than two independently hydrated media elements.
- If one markup owner cannot be shared, the hidden desktop instance and closed
  overlay must use no eager media source/preload; attach the source only when
  that instance becomes visible.
- Keep playback controls, mute state, author content, and keyboard behavior.

Proof: one request for one visible profile asset; no video request for a closed
overlay or CSS-hidden desktop rail on mobile.

### 5. Undo over-broad manual chunks

Status: the app-feature manual groups and warning suppression were removed in
Batch 1. The store circular chunk warning is gone and route-transition code is
independent. Remaining import-edge warnings must be repaired at their owners.

Root cause: `astro.config.mjs` forces every module under
`src/components/store/` into `feature-store`. The globally hydrated cart button
therefore pulls store feature code onto unrelated routes. The featured-product
rules overlap that ownership and produce the current circular-chunk warning.

Repair:

- Let route entrypoints and natural dynamic imports define most feature chunks.
- Keep the cart count/store only in a small canonical cart module; do not group
  all store components with it.
- Remove stale chunk rules and the blanket suppression of static/dynamic import
  warnings. Fix each remaining warning at its real import edge.
- Derive dev dependency optimization from Vite command/mode rather than the
  current `NODE_ENV` test, which forced dependency re-optimization during this
  production build.

Proof: no circular chunk warning; home and regular posts do not load store
detail/featured-product code; store and cart behavior still work across
navigation and reload.

## P1 - Fix route-specific media and main-thread costs

### Timeline

Status: the app-local frame storm, duplicate background scene, and eager mobile
timeline video are repaired in Batch 6. Batch 11 completes the shared profile
admission and restores/route-localizes timeline article banners. Deployed
PageSpeed and physical-device LCP evidence remain open.

- Owner: `TimelinePortalCarousel.svelte`, `TimelineBackgroundMedia.svelte`,
  `TimelinePortalCarouselScene.svelte`, and their adjacent pure calculation and
  texture modules.
- Completed in Batch 11: the responsive profile has one island and attaches one
  asset only while the mobile overlay or desktop sidebar is visible. No
  timeline-local profile or duplicate responsive image path was added.
- Completed: autoplay, scroll, adaptive DPR, scene projection, generated
  textures, constellation motion, slider transitions, visibility, and media
  admission were profiled and consolidated around event-driven work.
- Use the existing reduced-motion and adaptive-quality behavior to reduce work,
  not an additional fallback controller.
- Acceptance: mobile LCP and controls no longer wait tens of seconds; no
  continuous long-task storm; touch, wheel, keyboard, autoplay, map/travel mode,
  selected record, and audio/video remain functional.

### Archive

Status: completed and browser-verified in Batch 3 for progressive playback and
the compact responsive poster. Physical-device/deployed PageSpeed evidence and
a visually reviewed high-resolution desktop poster derivative remain pending.

- Owner: `src/components/archive/ArchiveAtmosphere.svelte`, mounted by the
  archive route.
- Replace the 2.78 MB `archive_still.png` with a visually equivalent responsive
  WebP/AVIF output and keep the original as the source asset outside the served
  critical path if needed. Compact viewports now reuse the existing 47 KB WebP;
  the original remains the wide-screen source pending that asset review.
- Do not make the 2.56 MB autoplay video and full-resolution poster both block
  page load. Completed: the poster renders first, the video source is attached
  only after automatic or explicit activation, and playback failure is visible
  and retryable.
- Acceptance: story map/filter interaction is usable before background media;
  video, poster, keyboard pause/resume, reduced motion, Save-Data, and failure
  behavior are browser-verified.

### Store

Status: duplicate card ownership and progressive product-media attachment are
completed and browser-verified in Batch 4. Responsive derivatives for the large
source images and the shared CSS/controller fan-out remain pending.

- Owner: `src/pages/store.astro`, `src/contracts/products.ts`,
  `MarketplaceListingCard.astro`, and `storefrontController.ts`.
- The initial probe loaded four PNGs totaling about 4.24 MB. Generate responsive
  WebP/AVIF derivatives, provide dimensions/srcset, and lazy-load cards below the
  first viewport while preserving the primary featured product. Progressive
  attachment is complete; derivative generation remains open.
- Completed: product metadata, URL, and primary visual resolution now use the
  current product contract rather than a component-local media map.
- Acceptance: first product is visible promptly; filters, product links, cart,
  checkout placeholder, customizer, and image failure states work on mobile.

## P1 - Consolidate client-controller ownership

Status: the app-local audio admission/unlock path is completed in Batch 5. The
global timeline startup and layout-toggle polling handshake were repaired and
cross-consumer validated in Batch 11. OverlayScrollbars/PhotoSwipe admission is
completed and cross-consumer validated in Batch 14; remaining panel
compatibility probes are still open.

- Completed in Batch 11: timeline view/banner startup lives with the rendering
  components; a normal post requests neither client and timeline routes keep
  their intended shared or custom renderer.
- Completed in Batch 14: PhotoSwipe loads only for an eligible gallery;
  OverlayScrollbars loads only for fine-pointer code/math targets; native page
  scrolling remains the default; route navigation removes and re-admits the
  feature owner without duplicate controllers.
- Completed in Batch 5: `SiteAudioRuntime` is the global activation/unlock owner;
  the audio and SFX managers plus Howler load only on enabled audio intent. The
  small runtime and SFX mapping islands still hydrate at page load so they can
  capture the first eligible gesture without adding a second listener family.
- `Navbar.astro` mounts search, cart, audio, theme, and display controls and also
  contains a 500 ms "bandaid" that boots then hides Bleepy. Make mascot
  visibility a render/config decision and delete the delayed hide path.
- Completed in Batch 11: the uncalled shared `SidenavPanels.svelte`
  compatibility adapter and its retired SideNavbar button probes were deleted.

## P2 - Remove confirmed duplicate and orphan code

These items primarily improve maintainability/build work. They should follow
the critical-path repairs so line-count cleanup is not confused with runtime
proof.

- Completed in Batch 7: the active profile owner remains in
  `packages/blog-core`; the uncalled app-local `Profile.svelte` and
  `MobileProfileOverlay.svelte` family, its exclusive stylesheet, and its
  baseline allowance were removed together.
- Already completed by current repository commit `2849a042`: the complete
  2,715-line Bleepy component/controller/manager family was retired together;
  Batch 10 verified that no Bleepy source or runtime caller remains.
- Completed app-locally in Batch 10: the uncalled SideNavbar renderer, app-local
  `SidenavPanels.svelte` fork, and exclusive stylesheet were retired together.
  Batch 11 then removed the obsolete uncalled shared adapter after
  cross-consumer validation.
- Completed in Batch 11 for layout ownership: `SpecialPageFeatures.svelte` is
  the event-driven state owner; delayed global discovery, retry/backoff, and
  100 ms polling are removed. Its unrelated cookbook compatibility block still
  creates two uncalled hidden gallery/list triggers and should be retired only
  with focused cookbook validation.
- After a caller inventory, remove retired compatibility/default matrices from
  the 1,770-line shared grid and 2,389-line banner stage. Do not split them just
  to improve line-count metrics: each extraction must become the single owner
  of a real banner/layout responsibility and delete the old branch.
- Audit package dependencies after the import graph is corrected. Build-only
  tools/types belong in dev dependencies, and packages with no workspace caller
  should be removed. Dependency shuffling alone is not a mobile performance fix.

## P2 - Separate deployable assets from authoring/archive assets

- `public/generated/` is about 3.0 GB. The current build copies it into the site
  and `astro-compress` scans/minifies 1,293 JSON files. Create an explicit
  deploy manifest or separate game-asset deployment boundary rather than
  copying every experiment into the website output.
- There are about 204 MB of `.blend`, `.blend1`, `.py`, `.pyc`, and `.avi` files
  under `public/`. Move confirmed authoring-only files outside the served tree.
  Do not delete a file until both Megameal and `apps/game` callers and dynamic
  manifests have been checked.
- Two observatory GLBs are byte-identical at about 31.5 MB each, but the dated
  path is referenced by the game scene and the undated path appears in a
  quarantined publish test. Choose one canonical URL only after updating and
  validating the game contract; do not break the alias speculatively.
- There are 172 exact duplicate hashes across `src/content` and
  `src/assets/site`; the content-side copies total about 233.11 MB. Select one
  content-media pipeline, update all MDX/Astro consumers, then delete the
  duplicate tree in the same change.
- Profile whether `astro-compress` provides useful deployed transfer savings
  beyond host/CDN Brotli/gzip. Limit it to intentional web outputs if it remains;
  do not spend build time rewriting game authoring artifacts.

## Guardrail repairs

- Completed in Batch 8: `audit:css` returns a nonzero exit code for
  error-severity new or expanded debt, and the former oversized reader owner
  was split without raising the baseline or changing its cascade.
- Completed in Batch 9: the eight reported home styles had no live caller. Four
  were retained only by an obsolete content/build-cache module graph; all eight
  were deleted and a forced build removed four global CSS requests per route.
- Traced in Batch 8: the PostCSS `from` warning originates in Tailwind 3.4.19's
  internal parser calls, not the local one-plugin PostCSS config. Resolve it
  through an approved maintained dependency patch or Tailwind migration.
- Completed in Batch 12: the built-route audit fails when a representative
  regular post exceeds the stylesheet budget or links timeline, reader, store,
  or home-only styles, and it protects the populated timeline/custom-author
  contract.
- Completed in Batch 16: production HTML compression preserves Svelte's empty
  raw-HTML hydration boundaries, and the built timeline contract fails if they
  are stripped again.
- Keep browser validation authoritative: build success does not prove the route
  is usable.

## Suggested execution order

1. Add resource-list/browser baselines, then repair universal layout imports and
   manual chunks.
2. Defer Pagefind and hidden profile media; verify regular posts first.
3. Progressively start the home 3D scene and resolve the hydration mismatch.
4. Repair timeline main-thread work, then archive and store media payloads.
5. Consolidate controller/orphan code after the active runtime path is proven.
6. Split deployable game/site assets from authoring/archive assets with
   cross-application validation.

## Completion gate for each implementation batch

- Production type-check and build pass with no new warning suppression.
- CSS audit passes and its error exit behavior is trustworthy.
- Affected route loads and interactions pass in desktop and mobile browsers.
- No console errors, hydration warnings, unhandled rejections, failed assets,
  repeated media requests, or unexpected eager requests.
- Keyboard, focus, reduced motion, Save-Data, responsive, and media failure
  behavior are checked where applicable.
- Before/after request count, transfer size, main-thread work, and built chunk
  list are recorded.
- Superseded imports, components, styles, listeners, timers, globals, assets,
  tests, configuration, and compatibility branches are removed in the same
  batch.
- `apps/game` is validated for any shared `public/` change, and other
  `packages/blog-core` consumers are validated for shared-layout changes.

## Do not use these shortcuts

- Do not permanently replace the intended 3D/media experiences with static
  content just to improve a score.
- Do not create `V2`, `New`, `Legacy`, or parallel fallback component families.
- Do not combine all route CSS into one larger global bundle; make ownership
  route-specific.
- Do not swallow media failures, disable accessibility controls, or remove user
  audio control.
- Do not delete the 4.1 GB public tree based only on Megameal source searches;
  the game consumes it too.
- Do not claim PageSpeed/Core Web Vitals success until the deployed URL is
  measured after implementation.
