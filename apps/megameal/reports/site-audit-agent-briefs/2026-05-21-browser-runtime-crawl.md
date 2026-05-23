# Browser Runtime Crawl - 2026-05-21

## 2026-05-22 Reconciliation

- The link/build report referenced by this crawl has since been moved to `apps/megameal/reports/site-audit-agent-briefs/2026-05-21-link-and-build-audit.md`.
- The original runtime crawl was a dev-server crawl. Its build-blocker premise is stale: the current moved link/build report says `pnpm --dir apps/megameal build` is passing and `dist/audio/sfx/audition/index.html` no longer fails the built HTML audit.
- A clean preview crawl should be used to validate which runtime findings still reproduce outside the Vite dev optimizer/module-graph state captured below.
- Follow-up preview evidence is recorded in `apps/megameal/reports/2026-05-22-preview-runtime-crawl.md`.

## Commands

- `sed -n '1,220p' AGENTS.md`: passed.
- `sed -n '1,260p' apps/megameal/AGENTS.md`: passed.
- `git status --short`: passed. The tree already had unrelated dirty files and parallel-agent report/content changes; this audit did not revert or edit them.
- `sed -n '1,220p' apps/megameal/reports/site-audit-agent-briefs/README.md`: passed.
- `sed -n '1,260p' apps/megameal/reports/site-audit-agent-briefs/05-browser-runtime-crawl.md`: passed.
- `sed -n '1,240p' apps/megameal/reports/2026-05-21-link-and-build-audit.md`: passed during the original crawl. That report has since moved under `apps/megameal/reports/site-audit-agent-briefs/`.
- `pnpm --dir apps/megameal build`: not run during the original crawl because a previous link/build report documented the then-known `dist/audio/sfx/audition/index.html` built HTML audit failure, and rerunning build would write generated output while other agents were working. This premise is stale as of the moved link/build report, which records a passing build after remediation.
- `SITE_DEV_PORT=4335 pnpm --dir apps/megameal dev`: failed in sandbox with `listen EPERM`, then passed with escalation. Server URL was `http://127.0.0.1:4335/`.
- `pnpm exec playwright --version`: failed, `Command "playwright" not found`.
- `pnpm --dir apps/megameal exec node -e "import('playwright')..."`: failed, Playwright is not available from the Megameal package context.
- `google-chrome --headless=new --disable-gpu --no-sandbox --remote-debugging-port=9335 --user-data-dir=/tmp/megameal-browser-runtime-crawl-profile --window-size=1366,900 about:blank`: passed with escalation.
- `curl -I http://127.0.0.1:4335/`: passed, returned `200 OK` after initial dev-server compile latency.
- `curl -I http://127.0.0.1:4335/archive/`: passed, returned `200 OK`.
- Browser crawl driver using local Node CDP against Chrome DevTools: first sandbox run failed with `connect EPERM 127.0.0.1:9335`, then passed with escalation.
- Full browser crawl pass: passed.
- Warm follow-up browser crawl pass: passed.
- Compact aggregation browser crawl pass: passed.
- `pgrep -af "astro|dev-app|google-chrome.*9335|remote-debugging-port=9335"`: passed. No crawl-owned `4335` dev server or `9335` Chrome process remained after shutdown; unrelated user/agent dev servers on other ports were left alone.

## Summary

- Every sampled real route loaded, but every sampled route also emitted Astro/Svelte island hydration errors.
- The dominant runtime error class was Svelte `lifecycle_outside_component`, seen 348 times in the compact aggregation pass.
- Several global/shared islands repeatedly remained unhydrated, including admin nav, cart, audio/display settings, profile/layout effects, and page animation components.
- Cold and warm dev-server passes also showed Vite optimized-dependency failures. Earlier passes hit `504 Outdated Optimize Dep` for `@iconify/svelte`, `howler`, and `marked`; the compact pass still caught `504 Outdated Optimize Dep` for `three` and `GLTFLoader` on the cookbook product page.
- No document-level horizontal overflow was detected, but multiple individual controls/rows were positioned beyond the viewport and hidden by overflow containers.
- No canvas-heavy component could be validated as nonblank because the sampled pages had no `<canvas>` elements after hydration failures; home 3D/home intro islands did not hydrate.
- The intentionally missing route returned the expected `404 Not Found` document.

## Crawl Basis

- Server: `http://127.0.0.1:4335/`
- Browser: `Chrome/143.0.7499.169`
- User agent: `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/143.0.0.0 Safari/537.36`
- Viewports:
  - Mobile: `390x844`, device scale factor `2`
  - Desktop: `1366x900`, device scale factor `1`
- Screenshots: not captured. The issues were sufficiently documented through console, network, and DOM diagnostics.

## Crawled URLs

| Route | Mobile Result | Desktop Result | Notes |
| --- | --- | --- | --- |
| `/` | Loaded | Loaded | Hydration failures; home image diagnostic reported broken `http://127.0.0.1:4335/`; home 3D island did not hydrate. |
| `/archive/` | Loaded | Loaded | Hydration failures; desktop back-to-top control sits beyond viewport edge. |
| `/posts/` | Loaded as archive | Loaded as archive | This route now loads the archive page during the crawl. |
| `/posts/timeline/` | Loaded | Loaded | Hydration failures; mobile metadata/breadcrumb row had elements beyond viewport bounds. |
| `/posts/cuppy-assistant-showcase/` | Loaded | Loaded | Hydration failures; mobile metadata row had elements beyond viewport bounds. |
| `/posts/timelines/spork-uprising/` | Loaded | Loaded | Hydration failures; mobile metadata row had elements beyond viewport bounds. |
| `/videos/qarnivor-snuggloid-emergence/` | Loaded | Loaded | Hydration failures; no media element runtime error detected in compact pass. |
| `/quiz/sample-quiz/` | Loaded | Loaded | `Quiz.svelte` remained unhydrated in sampled route state. |
| `/store/` | Loaded | Loaded | Store cart/runtime islands remained unhydrated. |
| `/store/megameal-cookbook/` | Loaded | Loaded | Product/store islands remained unhydrated; `three` optimized-dep 504s observed. |
| `/runtime-crawl-missing-page/` | Expected 404 | Expected 404 | Custom 404 page loaded; network reported expected `404 Not Found` document. |

## Findings

### Critical: Site-Wide Astro/Svelte Island Hydration Failures

- Source: all sampled routes at both viewports.
- Evidence: compact aggregation recorded repeated island hydration failures and unhydrated islands on every sampled route. Representative counts:
  - `/`: mobile `10` console errors, `4` exceptions, `6` unhydrated islands.
  - `/archive/`: mobile `7` console errors, `6` exceptions, `12` unhydrated islands; desktop `14` console errors, `12` exceptions, `12` unhydrated islands.
  - `/quiz/sample-quiz/`: mobile `7` console errors, `6` exceptions, `12` unhydrated islands; `Quiz.svelte` appeared in the unhydrated island sample.
  - `/store/`: mobile `6` console errors, `2` exceptions, `7` unhydrated islands.
- Evidence: top repeated affected components from the compact pass:
  - `/src/components/svelte/admin/AdminNavbar.svelte`
  - `/src/components/client/SiteAudioControl.svelte`
  - `/src/components/store/StoreCartButton.svelte`
  - `/src/components/widget/DisplaySettings.svelte`
  - `/src/components/Search.svelte`
  - `/src/components/client/SiteSfxBridge.svelte`
  - `/@fs/home/greggles/Merkin/packages/blog-core/src/components/client/PageAnimations.svelte`
  - `/@fs/home/greggles/Merkin/packages/blog-core/src/components/client/Profile.svelte`
  - `/@fs/home/greggles/Merkin/packages/blog-core/src/components/client/SidenavPanels.svelte`
  - `/@fs/home/greggles/Merkin/packages/blog-core/src/components/client/ScrollEffects.svelte`
  - `/@fs/home/greggles/Merkin/packages/blog-core/src/components/client/SpecialPageFeatures.svelte`
  - `/@fs/home/greggles/Merkin/packages/blog-core/src/components/client/MobileProfileOverlay.svelte`
- Evidence: dominant exception kind was `Svelte lifecycle_outside_component`, counted `348` times in the compact pass. Dynamic import fetch failures were also present in earlier and compact output.
- Impact: search, admin nav, cart, audio/display controls, page animation/profile side panels, quiz, archive atmosphere, store cart runtime, and home intro behavior may fail or remain noninteractive.
- Suggested owner/fix path: start with the Astro/Svelte client island boot path and dev module graph, not a single route. Verify whether `renderer-url`/module hashes are stale, inspect `client:*` island boundaries, and separate the Vite optimized-dep failures from true component lifecycle misuse.

### High: Vite Optimized Dependency 504s Break Client Module Loading

- Source: dev-server runtime network.
- Evidence: first and warm crawl passes reported `504 Outdated Optimize Dep` script responses for:
  - `/node_modules/.vite/deps/@iconify_svelte_dist_Icon__svelte.js`
  - `/node_modules/.vite/deps/howler.js`
  - `/node_modules/.vite/deps/marked.js`
- Evidence: compact pass still reported optimized-dependency 504s on `/store/megameal-cookbook/`:
  - `/node_modules/.vite/deps/three.js?v=<hash>` count `2`
  - `/node_modules/.vite/deps/three_examples_jsm_loaders_GLTFLoader__js.js?v=<hash>` count `2`
- Evidence: console output also included dynamic import failures such as `Failed to fetch dynamically imported module: /src/components/Search.svelte`.
- Impact: dependency optimizer failures can cascade into false component-level hydration errors and noninteractive islands.
- Suggested owner/fix path: inspect `astro.config.mjs` / Vite `optimizeDeps` behavior, dev-server forced re-optimization, and Astro icon/local icon reload behavior. After this is stable, rerun the browser crawl to identify remaining true component errors.

### High: Canvas And 3D Runtime Could Not Be Verified

- Source: `/` and product routes.
- Evidence: no sampled route had a `<canvas>` element in the DOM diagnostics after load/scroll. The home route reported unhydrated `/src/components/home/HomeIntroEnvironmentLoader.svelte`.
- Evidence: Chrome stderr reported headless GPU/WebGL fallback warnings during the crawl, but those are environment-level headless browser warnings and not enough by themselves to prove a user-facing site bug.
- Impact: the crawl could not confirm whether the home 3D/canvas-heavy experience is nonblank or interactive, because the relevant island did not hydrate.
- Suggested owner/fix path: fix island hydration and optimized-dep stability first, then rerun a focused home 3D crawl with screenshot or canvas-pixel checks.

### Medium: Off-Viewport Controls And Metadata Rows

- Source: DOM geometry checks at `390x844` and `1366x900`.
- Evidence: `documentElement.scrollWidth` did not exceed viewport width, so this is not normal page-level horizontal scrolling. Individual elements still measured beyond the viewport:
  - `/posts/timeline/` mobile: metadata/breadcrumb link right edge around `468px` in a `390px` viewport.
  - `/posts/cuppy-assistant-showcase/` mobile: metadata row right edge around `612px` in a `390px` viewport.
  - `/posts/timelines/spork-uprising/` mobile: metadata row right edge around `550px` in a `390px` viewport.
  - `/store/megameal-cookbook/` mobile: button right edge around `429px` in a `390px` viewport.
  - Most desktop content routes: `back-to-top-btn` / `btn-card` right edge around `1446px` in a `1366px` viewport.
- Impact: controls or links may be clipped, visually hidden, or hard to tap even though the page does not expose horizontal scrolling.
- Suggested owner/fix path: inspect the layout owner for metadata/breadcrumb rows and floating back-to-top/store controls. Decide whether the off-viewport placement is intentional hidden-state positioning; if intentional, exclude it from future audits with a selector-specific rule.

### Medium: Home Page Broken Image Diagnostic

- Source: `/` at both mobile and desktop.
- Evidence: DOM image check reported a broken image with resolved URL `http://127.0.0.1:4335/`.
- Impact: an empty or incorrect image `src` can trigger unnecessary page fetches and broken image behavior.
- Suggested owner/fix path: inspect home/banner/media image bindings for empty `src`, missing fallback assets, or conditional image props resolving to `/`.

### Low: Media Elements Mostly Loaded, But Empty Video Sources Need Review

- Source: `/` and `/runtime-crawl-missing-page/` verbose crawl diagnostics.
- Evidence: banner videos with real sources reached `readyState: 4` and were muted/autoplaying. Earlier verbose pass also saw multiple video elements with empty `src`, and one `MEDIA_ELEMENT_ERROR: Empty src attribute`.
- Impact: this may be benign lazy media markup, but it can produce noisy runtime media diagnostics or browser fetch behavior if not intentional.
- Suggested owner/fix path: inspect banner/video carousel components for empty `<video>` tags and ensure empty media elements are intentionally inert.

### Low: Expected 404 Route Behavior

- Source: `/runtime-crawl-missing-page/`.
- Evidence: browser network recorded `404 Not Found Document http://127.0.0.1:4335/runtime-crawl-missing-page/`, and the page title was `404: Page Not Found - MEGA MEAL SAGA`.
- Impact: expected for the intentionally missing crawl route.
- Suggested owner/fix path: none for this sampled route. Keep as a canary for future browser crawl reports.

## Environment Notes

- The dev server initially printed the existing PostCSS warning about a plugin not passing `from` to `postcss.parse`.
- Other agents were actively writing files during the crawl. The dev server watched content changes and logged Astro content-store filesystem errors while renaming `.astro/*.tmp` files. This is likely a parallel-dev-server/concurrent-write artifact, not a confirmed site runtime bug:
  - `.astro/content-modules.mjs.tmp -> .astro/content-modules.mjs`
  - `.astro/data-store.json.tmp -> .astro/data-store.json`
- Unrelated dev servers already running on other ports were detected and left alone.

## Deferred

- Production preview crawl was not run during the original audit because the normal build was believed to fail at the built HTML audit. That premise is stale as of the moved link/build report, which records a passing build after remediation.
- External link checks were not in scope.
- Screenshots and canvas-pixel checks were deferred until hydration is stable enough for canvas-heavy islands to mount.
- No code, content, route, asset, generated-data, or CSS fixes were made.
