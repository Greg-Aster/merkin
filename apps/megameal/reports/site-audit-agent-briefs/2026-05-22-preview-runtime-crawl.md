# Preview Runtime Crawl - 2026-05-22

## Scope

This follow-up reconciles the stale build premise in `apps/megameal/reports/2026-05-21-browser-runtime-crawl.md` and validates the runtime findings against a clean built preview.

The original crawl was a dev-server crawl. The link/build report it referenced moved to `apps/megameal/reports/site-audit-agent-briefs/2026-05-21-link-and-build-audit.md`, and that moved report now records a passing build.

## Environment

- Preview URL: `http://127.0.0.1:4336/`
- Browser: Chrome 143.0.7499.169, fresh profile
- Fresh profiles:
  - `/tmp/megameal-preview-runtime-crawl-20260522-1634`
  - `/tmp/megameal-preview-runtime-crawl-20260522-1652`
  - `/tmp/megameal-runtime-followup-20260522-2`
- Crawl driver: `/tmp/megameal-preview-runtime-crawl.mjs`
- Crawl results:
  - Before fixes: `/tmp/megameal-preview-runtime-crawl-results.json`
  - After fixes: `/tmp/megameal-preview-runtime-crawl-after-fixes.json`
  - Final follow-up: `/tmp/megameal-runtime-followup-results-after-final.json`
- Screenshots:
  - `/tmp/megameal-preview-runtime-crawl-after-fixes-screenshots/home-desktop.png`
  - `/tmp/megameal-preview-runtime-crawl-after-fixes-screenshots/cookbook-desktop.png`
  - `/tmp/megameal-runtime-followup-screenshots-after-final/canvas-mobile.png`
  - `/tmp/megameal-runtime-followup-screenshots-after-final/canvas-desktop.png`
- Focused canvas probe: `/tmp/megameal-canvas-probe-results.json`

## Commands

- `pnpm --dir apps/megameal build`: first sandbox run failed with `listen EPERM` on the tsx IPC pipe; rerun with escalation passed.
- `pnpm --dir apps/megameal exec astro preview --host 127.0.0.1 --port 4336`: passed with escalation.
- `curl -I http://127.0.0.1:4336/`: passed, `200`.
- `curl -I http://127.0.0.1:4336/archive/`: passed, `200`.
- `google-chrome --headless=new --disable-gpu --no-sandbox --remote-debugging-port=9336 --user-data-dir=/tmp/megameal-preview-runtime-crawl-20260522-1634 --window-size=1366,900 about:blank`: passed with escalation.
- `node /tmp/megameal-preview-runtime-crawl.mjs`: first sandbox run failed with `connect EPERM 127.0.0.1:9336`; rerun with escalation passed.
- `pnpm --dir apps/megameal type-check`: passed.
- `pnpm --dir apps/megameal audit:css`: exited `0`; reported `15` oversized-component findings.
- `pnpm --dir apps/megameal audit:css:changed`: exited `0`; reported `5` changed-file oversized-component findings.
- `pnpm --dir apps/megameal build`: passed after fixes.
- Fresh preview/browser restart, then `node /tmp/megameal-preview-runtime-crawl.mjs`: passed with escalation.
- PNG screenshot pixel sample: passed; home screenshot was nonblank in full and canvas-adjacent sampled regions.
- `node /tmp/megameal-hydration-trace.mjs`: passed; no `hydration_mismatch` warnings on `/`, `/archive/`, `/posts/`, `/quiz/sample-quiz/`, `/store/megameal-cookbook/`, `/posts/cuppy-assistant-showcase/`, or `/posts/timeline/`.
- `node /tmp/megameal-preview-runtime-crawl.mjs http://127.0.0.1:4336 9336 /tmp/megameal-runtime-followup-results-after-final.json /tmp/megameal-runtime-followup-screenshots-after-final`: passed with escalation.
- `node /tmp/megameal-canvas-screenshot-probe.mjs`: passed; WebGL readback remained zero, but clipped canvas screenshots were nonblank on mobile and desktop.

## Crawl Routes

The crawl sampled each route at mobile `390x844` DPR 2 and desktop `1366x900` DPR 1.

- `/`
- `/archive/`
- `/posts/`
- `/posts/timeline/`
- `/posts/cuppy-assistant-showcase/`
- `/posts/timelines/spork-uprising/`
- `/videos/qarnivor-snuggloid-emergence/`
- `/quiz/sample-quiz/`
- `/store/`
- `/store/megameal-cookbook/`
- `/runtime-crawl-missing-page/`

## Live Module Check

The crawl explicitly captured Astro island `component-url`, `renderer-url`, page scripts, and modulepreload URLs, then compared those `_astro` assets against `apps/megameal/dist` and observed browser response status.

- Module/renderer references checked in the final follow-up crawl: `358`
- Missing from `dist`: `0`
- JS responses with status >= `400`: `0`
- Island renderer URLs observed: `/_astro/client.svelte.fHD4rAZB.js`
- Module asset statuses: `232` loaded `200`; `126` loaded `304`; no missing or bad module records.
- Client-only island components observed in the final crawl included `AdminNavbar.C94ta_oa.js`, `ArchiveAtmosphere.5L-996b8.js`, `DisplaySettings.CtJ23u2Y.js`, `FeaturedProductBanner.DMh6HFru.js`, `MobileProfileOverlay.CdHeFNx0.js`, `Profile.C-RjtJiR.js`, `Quiz.D_jdhti4.js`, and `SiteAudioControl.CYZ5yQhP.js`.

The stale dev-server module hash / Vite optimizer failure from the 2026-05-21 crawl did not reproduce in built preview.

## Before Fixes

- Route/viewport samples: `22`
- Exceptions: `0`
- Console errors: `6`
- Failed requests: `2`
- Non-OK responses: `2`, both expected `404` responses for `/runtime-crawl-missing-page/`
- Unhydrated islands: `6`
- Broken images: `0`
- Empty image sources: `2`
- Missing `_astro` assets: `0`
- JS non-OK responses: `0`
- Canvas checks: `2`

Confirmed issues:

- `LayoutToggle` hydrated with runtime errors on post routes.
- The home facts widget emitted empty image `src` markup for the initial no-media fact.
- Mobile post metadata tags could wrap poorly or overflow as one forced line.

Not reproduced:

- Product button bounds on `/store/megameal-cookbook/`.
- Stale `_astro` renderer-url/module hashes.
- Dev-server `lifecycle_outside_component` / Vite 504 chain.

## Fixes

- `apps/megameal/src/components/client/LayoutToggle.svelte`: changed exported Svelte props from `export const` to `export let` so hydrated props are writable component props.
- `apps/megameal/src/components/widget/FactsWidget.astro`: stopped rendering empty media `src` attributes for no-media facts and create media elements only when a rotating fact needs them.
- `packages/blog-core/src/components/post/PostMeta.astro`: allowed tag metadata to wrap with Tailwind utilities instead of forcing all tags into one nowrap row.
- `apps/megameal/src/components/Navbar.astro`: made `AdminNavbar`, `SiteAudioControl`, and `DisplaySettings` client-only Svelte islands to avoid SSR/client DOM mismatches for browser-state UI.
- `packages/blog-core/src/layouts/MainGridLayout.astro`: made `Profile` and `MobileProfileOverlay` client-only Svelte islands for the same hydration-mismatch class.
- `apps/megameal/src/pages/archive/index.astro`, `apps/megameal/src/pages/quiz/[slug].astro`, and `apps/megameal/src/pages/store/[slug].astro`: made the remaining warning-producing Svelte islands client-only after tracing the built chunk stacks.
- `apps/megameal/src/stores/friendStore.ts`: gated verbose friend-content `console.log` output behind dev mode or `localStorage.friendContentDebug === 'true'`.
- `packages/blog-core/src/components/misc/License.astro`: allowed license footer title, URL, author, and license rows to wrap on mobile.
- `apps/megameal/reports/site-audit-agent-briefs/05-browser-runtime-crawl.md`: added explicit off-viewport classification and canvas screenshot-sampling requirements so future crawls do not fail on decorative overscan or direct WebGL readback alone.

## After Fixes

- Route/viewport samples: `22`
- Exceptions: `0`
- Console errors: `0`
- Failed requests: `3`, all `net::ERR_ABORTED` crawl/navigation artifacts with no asset `4xx` or `5xx`
- Non-OK responses: `2`, both expected `404` responses for `/runtime-crawl-missing-page/`
- Unhydrated islands: `0`
- Broken images: `0`
- Empty image sources: `0`
- Missing `_astro` assets: `0`
- JS non-OK responses: `0`
- Canvas checks: `2`

The `LayoutToggle` hydration failure, empty image source, and post metadata wrapping issue are resolved in the clean preview crawl.

## Final Follow-Up Crawl

- Route/viewport samples: `22`
- Exceptions: `0`
- Console warnings: `0`
- Console errors: `2`, both expected `404` resource logs for `/runtime-crawl-missing-page/`
- Friend status logs: `0`
- Failed requests: `1`, a `net::ERR_ABORTED` navigation/crawl artifact on desktop `/videos/qarnivor-snuggloid-emergence/`
- Non-OK responses: `2`, both expected `404` responses for `/runtime-crawl-missing-page/`
- Unhydrated islands: `0`
- Broken images: `0`
- Empty image sources: `0`
- Missing `_astro` assets: `0`
- JS responses with status >= `400`: `0`
- Broad off-viewport aggregate: `1035`, still noisy because the ad hoc collector includes intentional full-bleed/decorative/hidden-state elements.

The targeted hydration trace found no remaining `hydration_mismatch` warnings on the previously noisy routes. The mobile `/posts/cuppy-assistant-showcase/` license footer no longer creates horizontal overflow: viewport width, document scroll width, and body scroll width were all `390`, and the license footer candidates were within `left: 40` / `right: 350`.

## Canvas Check

Direct canvas pixel reads on the home page returned `0 / 4096` nonzero sampled pixels for both mobile and desktop. The corresponding screenshot-level pixel checks were nonblank:

- Home desktop full screenshot: `0.999` nonblack sample ratio, average luminance `75.5`.
- Home desktop upper-left canvas-adjacent region: `1.0` nonblack sample ratio, average luminance `127.3`.
- Home desktop right canvas-adjacent region: `1.0` nonblack sample ratio, average luminance `102.6`.

The rendered screenshot is not blank. The direct canvas readback remains ambiguous and is likely affected by WebGL readback / drawing-buffer behavior rather than an obviously blank visible canvas.

The final focused canvas probe confirmed the same conclusion against clipped canvas screenshots:

- Mobile canvas screenshot: `287659 / 329160` nonblack pixels, `3319` sampled unique colors.
- Desktop canvas screenshot: `1119552 / 1229400` nonblack pixels, `3763` sampled unique colors.
- Direct WebGL `readPixels()` still returned `0 / 4096` on both viewports.

Canvas status: visible render is nonblank; direct readback is a probe limitation unless a screenshot-region sample is also blank or effectively uniform.

## Remaining Follow-Up

- No true runtime issue from the lower-severity follow-up list remains reproduced in the final preview crawl.
- The ad hoc off-viewport aggregate is still too broad for pass/fail use. The checked-in browser-crawl brief now requires `actionable`, `allowed-overscan`, and `hidden-state` classification before reporting layout failures.
- Direct canvas readback still returns zero for the home WebGL canvas, but screenshot-region sampling proves the visible canvas is nonblank. Future crawls should fail canvas pages only when both direct readback and screenshot-region sampling are blank or effectively uniform.

## CSS Surface Area

- No new CSS files.
- No new page-level or component `<style>` blocks.
- `packages/blog-core/src/components/post/PostMeta.astro` changed Tailwind utility classes only.
- `packages/blog-core/src/components/misc/License.astro` changed Tailwind utility classes only.
- `apps/megameal/src/components/widget/FactsWidget.astro` did not add CSS, but the changed-file CSS audit now warns that the component is oversized after the markup/script fix.
