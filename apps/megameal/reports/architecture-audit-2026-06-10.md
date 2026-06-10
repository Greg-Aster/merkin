# Megameal Architecture Audit

Date: 2026-06-10

Scope: `apps/megameal` authored source, local app contracts, shared package boundaries, content routing, component ownership, style ownership, and current cleanup targets. This is a source-level audit only. It does not include a browser smoke check.

## Executive Summary

Megameal is currently an Astro static site with Svelte islands for interactive behavior. The core site shell is split between app-owned wrappers in `apps/megameal/src/layouts` and shared layout/component code from `packages/blog-core`. The current architecture is healthier after the retired-route and friend-content cleanup: old admin/friend routes are redirect shells, post publication filtering has a small contract, and a site contract audit now guards against reintroducing some retired behavior.

The next architectural risk is not one single broken subsystem. It is uneven ownership. Some domains are well grouped by feature folder, while several high-traffic behaviors still live as large page scripts, large config files, or repeated inline `getCollection(... data.draft !== true ...)` policies. Those are the best next cleanup targets because they reduce technical debt without changing user-facing behavior.

## Current System Map

### App Boundary

- `apps/megameal` owns the Astro site, content collections, app-specific components, app-specific layout wrappers, store/cart runtime, home portal, timeline experience, reader pages, and Megameal style system.
- `packages/blog-core` owns shared layouts, shared widgets, base schemas, common utilities, and several wrapper components used by Megameal.
- `packages/shared-data` provides generated manifests used by Megameal routes and layout experiences, especially timeline/archive style data.
- `packages/shared-audio` provides shared audio profile and audio id definitions used by Megameal's audio runtime.

Important boundary: edits to `packages/blog-core` are not Megameal-only. They can affect other sites and need broader verification than app-local changes.

### Build And Tooling

Primary scripts in `apps/megameal/package.json`:

- `build`: builds shared data, runs Astro build, audits generated HTML, then indexes with Pagefind.
- `type-check`: TypeScript no-emit check.
- `audit:contracts`: validates retired route shells, public post route filtering, and absence of stale friend-content tooling in active source/config.
- `audit:css`, `audit:css:changed`, `audit:css:strict`: CSS architecture guardrails.

The build has explicit chunking in `astro.config.mjs` for major client bundles: store, banner stage, home portal, audio, 3D, markdown, photoswipe, chart, realtime, and other vendor buckets.

### Routing

Astro routes live under `src/pages`.

Current route groups:

- Home and paginated posts: `src/pages/[...page].astro`
- Post detail and PDF post routes: `src/pages/posts/[...slug].astro`, `src/pages/pdf/posts/[...slug].astro`
- Store: `src/pages/store.astro`, `src/pages/store/[slug].astro`, `src/pages/store/page/[page].astro`, `src/pages/store/checkout.astro`
- Reader: `src/pages/reader/*`
- Cookbook: `src/pages/cookbook/*`, `src/pages/pdf/cookbook/*`
- Archive, timeline, videos, about, merkin gallery, quizzes, snuggaloids, feeds, robots, sitemap, labs
- Retired route shells: `configs.astro`, `friends.astro`, `login.astro`, `store-placeholder.astro`, `test-portal.astro`

The retired route contract is centralized in `src/contracts/routes.ts`. Each retired page imports that contract and calls `Astro.redirect(...)`.

### Content Model

`src/content.config.ts` defines the content collections. The current authored content counts are:

- posts: 207
- merkin: 21
- about: 19
- snuggaloids: 14
- videos: 10
- products: 10
- reader: 9
- reviews: 6
- cookbook: 4
- quizzes: 3
- spec: 2
- team: 1

The app imports base schemas from `@merkin/blog-core/schemas`, then extends them for Megameal-specific needs. Product content has the broadest schema surface: commerce fields, media, stock registry, ambient audio, reviews, panels, related products, scene placement fields, and legacy fallbacks.

### Contracts

Current app-local contracts:

- `src/contracts/routes.ts`
  - owns retired public route redirect targets.
  - exposes route normalization and target lookup.

- `src/contracts/content.ts`
  - owns basic draft filtering with `publicCollectionFilter`.
  - owns `comparePublishedDesc`.

- `scripts/audit-site-contracts.mjs`
  - enforces retired route shells.
  - enforces public post route filtering for post detail and PDF post routes.
  - rejects stale friend-content references in active source/config.

This is the right direction. The contracts are small and focused. The main gap is that content publication policy is only partly adopted.

### Layout And Shell

Megameal has two major layout wrappers:

- `src/layouts/Layout.astro`
  - wraps `@merkin/blog-core/layouts/Layout.astro`.
  - imports app global styles through `src/styles/site.ts`.
  - mounts app-wide audio and SFX runtimes.

- `src/layouts/MainGridLayout.astro`
  - wraps `@merkin/blog-core/layouts/MainGridLayout.astro`.
  - provides Megameal-specific banner content, Bleepy mascot, timeline banner, route transitions, audio runtime, and timeline manifest wiring.
  - currently contains server-side filesystem reads to inspect post frontmatter and infer sidebar behavior.

Store pages use `src/layouts/store/StoreLayout.astro`, which owns store CSS imports, cart runtime, store chrome, cart drawer, and parallax behavior.

### Component Organization

Authored component file counts by primary folder:

- home: 46
- store: 13
- widget: 11
- bleepy: 11
- timeline: 10
- reader: 10
- client: 9
- banner-stage: 9
- review-modes: 5
- archive/control/misc: 4 each
- cookbook/merkin: 2 each
- quiz/snuggaloids: 1 each

This means the app is now mostly feature-organized, not just a flat component pile. The biggest current feature owners are home portal, store, timeline, reader, banner-stage, and Bleepy.

### Styles

The documented style entrypoint is `src/styles/site.ts`, which imports:

- `variables.styl`
- `main.css`
- foundation CSS
- mobile content frame CSS

Feature/page/layout styles live under `src/styles/features`, `src/styles/pages`, and `src/styles/layouts`.

Current authored source shape outside content/assets:

- 116 Astro files
- 99 TypeScript files
- 84 CSS files
- 54 Svelte files
- 6 MDX files
- 5 Markdown files
- 3 MJS scripts
- 2 JS files
- 1 Stylus file

There are still a few global style islands outside the style tree:

- `src/components/cookbook/CookbookBanner.astro`
- `src/components/cookbook/CookbookReaderPage.astro`
- `src/pages/pdf/cookbook/[...slug].astro`
- `src/pages/videos/index.astro`

Those should be treated as cleanup targets, not as new patterns.

## Findings

### 1. Publication Filtering Is Duplicated Outside The New Contract

Posts now use `publicCollectionFilter` in key route generation, but other collections still inline draft filters:

- videos
- merkin
- products
- cookbook
- snuggaloids
- store pagination/detail routes
- several home components

Risk: future fixes to public/draft policy can drift by collection or route. This is exactly the kind of policy that belongs in a contract.

Recommended cleanup:

1. Expand `src/contracts/content.ts` with named collection helpers for draftable entries.
2. Replace repeated `({ data }) => data.draft !== true` where the behavior is public publication filtering.
3. Update `audit-site-contracts.mjs` to enforce public filters on the highest-risk public route groups.

### 2. Page-Level Client Scripts Still Own Too Much Interaction

Several Astro pages/components contain substantial inline browser behavior:

- `src/pages/[...page].astro`: portal scroll stage state.
- `src/pages/store.astro`: storefront filtering/sorting.
- `src/pages/store/[slug].astro`: product page browser behavior.
- `src/pages/store/page/[page].astro`: paginated store browser behavior.
- `src/pages/videos/index.astro`: video page controls.
- `src/layouts/store/StoreLayout.astro`: store parallax/chrome behavior.
- `src/components/home/PortalSponsoredBloom.astro`: large portal overlay behavior.

Risk: page scripts are harder to test, reuse, and contract-check. They also hide state ownership inside markup files.

Recommended cleanup:

1. Extract store filter/sort behavior into `src/components/store/storefrontController.ts` or a narrow Svelte island.
2. Extract portal scroll-stage behavior from the home route into a home-owned module.
3. Keep Astro pages focused on data loading and composition.

### 3. MainGridLayout Is A Critical Choke Point

`src/layouts/MainGridLayout.astro` is the app shell adapter for the shared blog-core grid. It currently owns:

- shared layout prop normalization
- route detection
- timeline banner injection
- Bleepy slotting
- home portal banner slot defaults
- audio runtime slotting
- route transition script
- post frontmatter filesystem inspection

Risk: this file is becoming a policy hub. It mixes shell composition, route-specific behavior, timeline wiring, and post metadata inference.

Recommended cleanup:

1. Move post layout/frontmatter resolution into a small utility or content contract.
2. Move route classification into a route helper.
3. Keep this layout as a thin adapter around the shared blog-core layout.

### 4. Product Schema And Store Presentation Need A Stronger Contract

The product schema is powerful but broad. It supports live store listings, draft lab prototypes, scene data, legacy image fields, media arrays, stock registry, featured commerce, reviews, and custom panels.

Current normalizers exist in `src/utils/store-scene-content.ts`, but route pages still own a lot of display-specific product derivation.

Risk: product behavior can diverge between store pages, featured product surfaces, lab scene data, and home portal destinations.

Recommended cleanup:

1. Add a `src/contracts/products.ts` or `src/utils/products.ts` owner for product hrefs, primary visual, availability labels, public product filters, and category display.
2. Use it from store index/detail/pagination and home product surfaces.
3. Keep lab-only draft prototype logic explicit and separate from live-store public filters.

### 5. Style Architecture Is Documented, But Legacy Global Islands Remain

The style tree has a clear contract and audit tooling. The remaining issue is not a lack of structure; it is old style islands and large feature CSS owners.

Risk: new edits can copy local page styles instead of using the established CSS hierarchy.

Recommended cleanup:

1. Extract the remaining global style islands into `src/styles/pages` or feature CSS.
2. Do not add new component `<style is:global>` blocks.
3. Prefer changed-file CSS audits for scoped work and strict CSS audits when adding new frontend ownership surface.

### 6. Banner Configuration Still Contains Legacy Compatibility Layers

The banner system has a newer modular folder under `src/config/banners`, but `src/config/banner.config.ts` still contains legacy compatibility helpers, old comments, deprecated exports, and debug scaffolding.

Risk: banner maintenance requires understanding both the modular banner config and the legacy compatibility layer.

Recommended cleanup:

1. Identify which exports from `banner.config.ts` are still imported.
2. Move live config helpers into the modular `src/config/banners` contract.
3. Remove deprecated helpers only after import checks and type-check pass.

### 7. Runtime Audio Is Centralized But Large

`src/utils/site-audio.ts` is the largest utility owner at more than 1100 lines. It centralizes playlist routing, audio state, user activation, YouTube coordination, storage, and route lifecycle behavior.

Risk: centralized ownership is good, but this file is now too large for easy change isolation.

Recommended cleanup:

1. Split pure audio config/storage helpers from route lifecycle and media-frame coordination.
2. Keep the public runtime API stable.
3. Add focused contract tests only after the split creates stable pure functions worth testing.

### 8. Shared Package Wrappers Are A Strength

Many simple app components wrap shared blog-core components:

- footer
- config carrier
- controls
- widgets
- markdown/license
- timeline banner
- light/dark switch

This is good architecture. It makes Megameal-specific behavior explicit where it differs and avoids copying shared code.

Risk: cleanup work in these wrappers should not move app-specific concerns back into `packages/blog-core` unless multiple sites need the same behavior.

Recommended cleanup:

1. Keep simple wrappers if they express app ownership.
2. Only promote behavior to blog-core when at least two apps need it.
3. Treat blog-core changes as cross-site work.

## Suggested Cleanup Order

### Pass 1: Content And Product Contracts

Low user-facing risk. High architecture payoff.

- Expand content contracts for all public draft filtering.
- Add product helper/contract for hrefs, primary visuals, availability labels, category counts, and public/lab product filters.
- Update store pages and product-facing home components to use those helpers.
- Extend `audit:contracts` to guard key routes.

### Pass 2: Store Interaction Ownership

Medium risk because it touches storefront interaction, but still locally bounded.

- Move store filtering/sorting script out of `store.astro`.
- Deduplicate store index and paginated store control logic.
- Keep DOM contract stable or move to a focused Svelte island.

### Pass 3: Layout Adapter Thinning

Medium risk because `MainGridLayout` is central.

- Move route classification into a route utility.
- Move post one-column/frontmatter logic into a content/layout helper.
- Keep `MainGridLayout.astro` focused on shared-layout slot composition.

### Pass 4: Remaining Style Islands

Low to medium risk depending on page.

- Extract the four remaining global style islands.
- Run CSS changed audit and strict audit for each extraction.
- Do not update the CSS baseline unless explicitly approved.

### Pass 5: Banner And Audio Decomposition

Higher risk because these systems are broad and visual/audio-heavy.

- First audit actual imports and exported API.
- Split pure helpers before behavior.
- Avoid changing user-facing banner/audio behavior during architecture-only cleanup.

## Validation Guidance

For contract/content/product cleanup:

```bash
pnpm --dir apps/megameal audit:contracts
pnpm --dir apps/megameal type-check
```

For CSS extraction:

```bash
pnpm --dir apps/megameal audit:css:changed
pnpm --dir apps/megameal audit:css:strict
pnpm --dir apps/megameal type-check
```

For broad route/content changes:

```bash
pnpm --dir apps/megameal build
```

Browser smoke checks are intentionally not part of this audit because the repo instructions say not to run them by default.
