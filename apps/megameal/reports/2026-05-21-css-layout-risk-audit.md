# Megameal CSS Layout Risk Audit - 2026-05-21

## Commands

- `sed -n '1,220p' AGENTS.md`: passed; confirmed repo-wide audit/reporting rules.
- `sed -n '1,260p' apps/megameal/AGENTS.md`: passed; confirmed Megameal CSS ownership rules.
- `sed -n '1,240p' apps/megameal/reports/site-audit-agent-briefs/README.md`: passed; confirmed report handoff format.
- `sed -n '1,260p' apps/megameal/reports/site-audit-agent-briefs/06-css-layout-risk-audit.md`: passed; confirmed this audit scope.
- `git status --short`: passed; repo was already dirty with unrelated app/content/report work from other agents. This audit did not revert or modify those files.
- `sed -n '1,260p' apps/megameal/reports/2026-05-21-link-and-build-audit.md`: passed; reviewed prior link/build/CSS findings.
- `pnpm --dir apps/megameal audit:css`: passed with findings; reported 15 CSS architecture items, including 2 oversized-component errors.
- `pnpm --dir apps/megameal audit:css:changed`: passed; changed files passed the CSS architecture audit.
- `rg` and `nl -ba` inspections across `apps/megameal/src` and `packages/blog-core/src`: passed; used to trace exact selectors and config keys.

## Summary

- The intended source of truth for banner spacing is app-owned: `apps/megameal/src/config/banners/layout.ts` defines `bannerLayoutProfiles` with per-banner `stageTop`, `stageHeight`, `panelTop`, and `contentTop` values.
- The runtime application of those values is shared package-owned: `packages/blog-core/src/layouts/MainGridLayout.astro` maps resolved layout values into CSS variables for the grid/panel, and `packages/blog-core/src/components/banner-stage/BannerStage.astro` maps them into banner container variables.
- The highest layout risk is duplicated control: spacing values are centralized in the Megameal config, but mobile/desktop overrides and fullscreen behavior are also hard-coded in component styles across `packages/blog-core` and app-local CSS.
- The perceived mobile gap above post/about content is not a single value. It is the combined result of `panelTop`, `contentTop`, `#main-grid` margin, `.responsive-panel-wrapper` top, and the `.mobile-content-frame` wrapper/padding.
- No code fixes were made. No CSS was added or changed.

## Findings

### High: Banner Spacing Has A Config Source But Shared Runtime Ownership

- Source: `apps/megameal/src/config/banners/layout.ts`
- Evidence: `bannerLayoutProfiles` owns the app's spacing tokens:
  - `standard.stageTop.desktop: '3rem'`
  - `standard.stageTop.mobile: '2.75rem'`
  - `standard.panelTop.desktop: '-6rem'`
  - `standard.panelTop.mobile: '-4.5rem'`
  - `standard.contentTop.desktop/mobile: '1rem'`
  - `video.stageTop.desktop: '5.5rem'`
  - `video.stageTop.mobile: 'calc(3.375rem + 1.65rem)'`
  - `video.contentTop.desktop/mobile: '0'`
  - `none.stageTop.desktop: '-7.5rem'`
  - `none.panelTop.desktop: '12rem'`
  - `none.contentTop.mobile: '2rem'`
- Affects: mobile and desktop.
- Ownership: Megameal app owns the values; shared `packages/blog-core` owns the layout application.
- Impact: spacing changes belong in the app config, but visual regressions often appear inside shared layout components. This makes it easy to patch the wrong layer.
- Suggested owner/fix path: keep value changes in `apps/megameal/src/config/banners/layout.ts`; treat shared `MainGridLayout.astro` and `BannerStage.astro` as the adapter layer that should only consume resolved values.

### High: Main Content Position Is Split Between Panel Top And Grid Margin

- Source: `packages/blog-core/src/layouts/MainGridLayout.astro`
- Evidence:
  - Layout values are destructured from the resolved banner configuration at `mainPanelTop`, `mainPanelTopMobile`, `navbarSpacing`, `navbarSpacingMobile`, `mainContentOffset`, and `mainContentOffsetMobile`.
  - CSS variables are defined as `--main-content-offset`, `--main-panel-top`, `--mobile-main-panel-top`, `--navbar-spacing`, `--mobile-navbar-spacing`, and `--main-content-offset-mobile`.
  - Selector `#main-grid` uses `margin-top: var(--main-content-offset)`.
  - Mobile selector `@media (max-width: 767px) #main-grid` uses `margin-top: var(--main-content-offset-mobile, var(--main-content-offset))`.
  - Selector `.responsive-panel-wrapper` uses `top: var(--main-panel-top)`.
  - Mobile selector `.responsive-panel-wrapper` uses `top: var(--mobile-main-panel-top)`.
- Affects: mobile and desktop.
- Ownership: shared `packages/blog-core`.
- Impact: "banner-to-content gap" and "navbar-to-content gap" cannot be adjusted safely by changing only one CSS value. The apparent gap is produced by a negative/positive panel offset plus grid margin.
- Suggested owner/fix path: document `stageTop`, `panelTop`, and `contentTop` as the three-part spacing contract. Avoid local page overrides for these gaps.

### High: Banner Container Spacing Is Applied Separately From Main Content Spacing

- Source: `packages/blog-core/src/components/banner-stage/BannerStage.astro`
- Evidence:
  - Props include `navbarSpacing`, `mobileNavbarSpacing`, `bannerHeight`, `bannerHeightMobile`, `bannerAspectRatio`, and `bannerAspectRatioMobile`.
  - CSS variables are defined as `--navbar-spacing`, `--mobile-navbar-spacing`, `--banner-height`, `--banner-height-mobile`, `--banner-aspect-ratio`, and `--banner-aspect-ratio-mobile`.
  - Selector `#banner-container` uses `margin-top: var(--navbar-spacing)`.
  - Mobile selector `@media (max-width: 767px) #banner-container` uses `margin-top: var(--mobile-navbar-spacing)`.
  - Selector `#banner-container .banner-aspect-container` uses `height: var(--banner-height)`.
  - Mobile selector uses `height: var(--banner-height-mobile, var(--banner-height))`.
- Affects: mobile and desktop.
- Ownership: shared `packages/blog-core`.
- Impact: navbar-to-banner spacing and banner-to-content overlap are intentionally separate. A fix to one can make the other appear wrong if the profile values are not adjusted together.
- Suggested owner/fix path: consolidate layout debugging around the resolved `bannerLayoutProfiles` tuple for each banner type: `stageTop`, `stageHeight`, `panelTop`, `contentTop`.

### Medium: Legacy Banner Spacing Fields Still Mirror The New Profile System

- Source: `apps/megameal/src/config/banner.config.ts`
- Evidence:
  - `layoutProfiles: bannerLayoutProfiles` is the active profile system.
  - Legacy fields still exist: `layout.mainContentOffset`, `layout.mainContentOffsetMobile`, `navbar.spacing`, `navbar.mobileBannerGap`, `navbar.mobilePortraitSpacing`, and `panel.top`.
  - `determineBannerConfiguration()` resolves layout through `resolveBannerLayout()` and returns `mainPanelTop`, `mainPanelTopMobile`, `navbarSpacing`, `navbarSpacingMobile`, `bannerHeight`, `bannerHeightMobile`, `mainContentOffset`, and `mainContentOffsetMobile`.
- Source: `apps/megameal/src/components/svelte/admin/config-tabs/appearance/bannerLayoutAdmin.ts`
- Evidence:
  - `syncLegacyLayoutFields()` copies profile values back into `layout.mainContentOffset`, `navbar.spacing`, `navbar.mobileBannerGap`, `navbar.mobilePortraitSpacing`, and `panel.top`.
- Affects: mobile and desktop.
- Ownership: Megameal app.
- Impact: there are two representations of the same spacing data. If an editor/export path updates only legacy fields or only `layoutProfiles`, spacing can drift.
- Suggested owner/fix path: keep `layoutProfiles` as the canonical source and treat legacy fields as generated/export compatibility only. Long term, remove read paths that prefer legacy values over profiles.

### Medium: Mobile Content Frame Adds A Separate Page-Level Spacing Layer

- Source: `apps/megameal/src/styles/pages/mobile-content-frame.css`
- Evidence:
  - `body:has(.mobile-content-frame) main#main { overflow: visible; }`
  - `.mobile-content-frame-shell { width: calc(100vw - 0.75rem); margin-inline: calc(50% - 50vw + 0.375rem); }`
  - `.mobile-content-frame { padding-inline: 1rem; padding-top: 1.25rem; }`
- Source routes:
  - `apps/megameal/src/pages/posts/[...slug].astro` wraps posts in `.mobile-content-frame-shell` and `.mobile-content-frame`.
  - `apps/megameal/src/pages/about/[...slug].astro` wraps about pages in the same frame classes.
  - `apps/megameal/src/pages/videos/[...slug].astro` also uses the same frame classes and adds `mt-4`.
- Affects: mobile.
- Ownership: Megameal app.
- Impact: on regular posts/about pages, the visible content gap includes banner profile spacing plus this page-level mobile frame padding. Debugging only banner config will not explain all perceived spacing.
- Suggested owner/fix path: if mobile content framing stays, document it as a post/about/video shell concern and keep it visually downstream of banner layout. Do not use it to correct banner overlap.

### Medium: Mobile/Fullscreen Overrides Are Spread Across Several Shared And App Files

- Source: `packages/blog-core/src/layouts/MainGridLayout.astro`
- Evidence:
  - Mobile landscape override for `#main-grid` sets `grid-template-columns`, `gap`, and padding with `!important`.
  - Mobile portrait override for `#main-grid` sets `grid-template-columns`, `gap`, padding, sidebar order, and sidebar/card styles with many `!important` rules.
  - `#main-grid[data-sidebar='hidden']` and its child selectors hide sidebar/right rail and force one-column layout.
- Source: `packages/blog-core/src/components/client/SpecialPageFeatures.svelte`
- Evidence:
  - Body classes/data attributes: `data-layout-mode`, `one-column-mode`, `fullscreen-mode`.
  - Inline component style hides `#banner-container`, `.layout-sidebar`, and `.layout-right-rail` in fullscreen mode.
- Source: `packages/blog-core/src/styles/main.css` and `packages/blog-core/src/styles/timeline-styles.css`
- Evidence:
  - `.force-mobile-view #banner-container`, `#main-panel-wrapper`, `#main-content-wrapper`, `#navbar-wrapper`, `#top-row`, and `#toc-wrapper` use `!important`.
  - `body.force-mobile-view #main-grid` sets `margin-top: 5.5rem !important` in desktop fullscreen mode.
- Affects: mobile, desktop fullscreen, and layout toggle behavior.
- Ownership: mostly shared `packages/blog-core`, with app-specific triggers in Megameal.
- Impact: multiple override systems can fight the banner profile contract and make layout changes hard to predict.
- Suggested owner/fix path: consolidate fullscreen and one-column layout rules into one shared layout state layer. Keep route-specific Megameal CSS out of shared banner spacing unless the state is passed as an explicit prop/data attribute.

### Medium: App And Shared SpecialPageFeatures Implement Similar Layout State

- Source: `packages/blog-core/src/components/client/SpecialPageFeatures.svelte`
- Evidence:
  - This is the component mounted by shared `MainGridLayout.astro`.
  - It applies `data-sidebar`, `body.one-column-mode`, and `body.fullscreen-mode`.
- Source: `apps/megameal/src/components/client/SpecialPageFeatures.svelte`
- Evidence:
  - A Megameal-local component with similar logic imports `apps/megameal/src/styles/features/special-page-features.css`.
  - Current search did not find this app-local component mounted by the Megameal layout.
- Source: `apps/megameal/src/styles/features/special-page-features.css`
- Evidence:
  - Duplicates `#main-grid[data-sidebar='hidden']`, `body.fullscreen-mode`, and mobile one-column rules.
- Affects: layout toggle and mobile/sidebar visibility.
- Ownership: shared code is active; app-local copy appears stale or alternate.
- Impact: future agents may edit the app-local copy and see no effect, or mount it later and double-apply layout state.
- Suggested owner/fix path: designate the shared `packages/blog-core` component as the active layout state owner, then remove or document the app-local copy in a separate cleanup task.

### Low: Navbar Height Is Hard-Coded In Markup And Not Fully Coupled To Banner Config

- Source: `packages/blog-core/src/components/Navbar.astro`
- Evidence:
  - Navbar card uses Tailwind class `h-[4.5rem]`.
- Source: `apps/megameal/src/config/banner.config.ts`
- Evidence:
  - `bannerConfig.navbar.height` is set to `'5rem'`.
- Source: `apps/megameal/src/styles/pages/post-detail.css` and `apps/megameal/src/styles/pages/about-detail.css`
- Evidence:
  - `#post-container` and `#about-container` use `scroll-margin-top: calc(var(--navbar-height) + 2rem)`.
- Affects: hash navigation and perceived top spacing.
- Ownership: shared navbar markup, app config, and app page CSS.
- Impact: navbar height, scroll margins, and banner stage offsets can drift because they are not the same token.
- Suggested owner/fix path: expose one navbar-height token from shared layout or site config, then consume it in scroll margins and banner profile calculations.

### Low: Banner Presentation CSS Is App-Owned But Loaded Through The App Layout Wrapper

- Source: `apps/megameal/src/layouts/MainGridLayout.astro`
- Evidence:
  - Imports app-owned CSS: `banner-base.css`, `banner-billboards.css`, `banner-title-display.css`, `banner-responsive.css`, `banner-site-overlays.css`, and `interactions.css`.
- Source: `packages/blog-core/src/components/banner-stage/BannerStage.astro`
- Evidence:
  - Emits the shared selectors consumed by app CSS: `#banner-container`, `.banner-aspect-container`, `.banner-content-wrapper`, `#standard-banner-container`, `.banner-slide`, `.banner-billboard`, `.banner-title-display`.
- Affects: banner visuals, overlays, and responsive text layout.
- Ownership: shared markup, Megameal presentation CSS.
- Impact: selector contracts are implicit. Changes to shared markup can break Megameal banner CSS without type errors.
- Suggested owner/fix path: document the banner-stage selector API, or move stable presentation hooks into a shared banner-stage contract.

### Low: Oversized Components Increase Layout Regression Risk

- Source: `pnpm --dir apps/megameal audit:css`
- Evidence:
  - Error: `src/components/home/HomeIntroEnvironmentScene.svelte:1` has 917 nonblank lines.
  - Error: `src/components/timeline/TimelinePortalCarousel.svelte:1` has 894 nonblank lines.
  - Warnings include `HomeIntroEnvironment.svelte`, `TimelinePortalCarouselScene.svelte`, `BannerSettings.svelte`, `FactsWidget.astro`, `store.astro`, and several admin/editor components.
- Affects: primarily homepage portal, timeline banner/route, admin banner settings, widgets, and store pages.
- Ownership: Megameal app.
- Impact: large components make it harder to find layout ownership and can hide viewport-specific fixes inside behavior-heavy files.
- Suggested owner/fix path: prioritize extraction only when touching these areas for functional work. For banner/layout work, avoid adding more logic to the oversized components.

## Deferred

- Browser viewport verification was not run because this assignment was a read-only source audit, not the browser-runtime crawl.
- No build was run for this report. The existing link/build audit already records the current build audit blocker.
- No visual fixes, CSS changes, route changes, content changes, asset changes, or generated-data changes were made.
