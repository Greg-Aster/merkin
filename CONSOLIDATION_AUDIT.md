# Consolidation Audit Snapshot

**Date:** 2026-02-21  
**Goal:** Clarify current state and identify what to keep vs defer.

## Monorepo Reality

- Workspace root is `/home/greggles/Merkin`.
- `Temporal-Flow` and `DNDIY.github.io` are in `pnpm-workspace.yaml`.
- Shared package exists at `packages/blog-core`.
- `MEGAMEAL` is in the same parent folder but intentionally excluded from workspace and built standalone.
- Monorepo deploy workflow exists at `.github/workflows/deploy-sites.yml` with setup doc at `.github/workflows/DEPLOYMENT_SETUP.md`.

## Build Verification (Completed)

- `pnpm --filter temporal-flow build` ✅
- `pnpm --filter dndiy build` ✅
- `pnpm build` in `MEGAMEAL/` ✅
- `pnpm build:all` ✅ (Temporal-Flow 18.45s / 32 pages, DNDIY 28.53s / 52 pages, MEGAMEAL 132.71s / 117 pages)

Notes:
- Temporal and DNDIY still emit known Astro prerender header warnings.
- Temporal build logs a non-fatal PostCSS warning related to plugin `from` metadata.
- DNDIY build logs non-fatal missing image warnings from timeline-heavy content paths.
- `src/constants/constants.ts` stale `node:constants` import warning was removed in Temporal and DNDIY.
- MEGAMEAL `verbatimModuleSyntax` warning is resolved by setting `"verbatimModuleSyntax": true` in both `MEGAMEAL/tsconfig.json` and `packages/blog-core/tsconfig.json`.
- `pnpm type-check:all` is currently failing due existing Temporal-Flow/DNDIY strict typing drift; `packages/blog-core` type-check issue (`window.THREE`) has been fixed.

## Keep These Changes

### Temporal-Flow
- `package.json` workspace alignment + `@merkin/blog-core` dependency
- Wrapper components importing from `@merkin/blog-core`:
  - `src/components/ArchivePanel.astro`
  - `src/components/CollapsibleScript.astro`
  - `src/components/Footer.astro`
  - `src/components/PostMeta.astro`
  - `src/components/control/BackToTop.astro`
  - `src/components/control/ButtonLink.astro`
  - `src/components/control/ButtonTag.astro`
  - `src/components/control/Pagination.astro`
  - `src/components/misc/License.astro`
  - `src/components/misc/Markdown.astro`
  - `src/components/widget/NavMenuPanel.astro`
  - `src/components/widget/TOC.astro`
  - `src/components/widget/WidgetLayout.astro`
  - `src/components/widget/Categories.astro`
  - `src/components/widget/Tags.astro`
  - `src/components/widget/DisplaySettings.svelte`
  - `src/components/ConfigCarrier.astro`
  - `src/components/Navbar.astro`
  - `src/components/svelte/admin/AdminNavbar.svelte`
  - `src/components/svelte/admin/LoginForm.svelte`
  - `src/components/svelte/friends/FriendManager.svelte`
  - `src/components/svelte/friends/FriendContentIntegrator.svelte`
  - `src/components/svelte/admin/config-tabs/NavigationConfigTab.svelte`
  - `src/components/timeline/TimelineBanner.astro`
  - `src/components/timeline/TimelineCard.astro`
  - `src/components/timeline/StarNode.astro`
  - `src/components/timeline/TimelineViewModes/ListView.astro`
  - `src/components/timeline/TimelineViewModes/MapView.astro`
  - `src/components/timeline/TimelineViewModes/TreeView.astro`
  - `src/components/timeline/TimelineViewModes/TimelineView.astro`
  - `src/layouts/Layout.astro`
  - `src/layouts/MainGridLayout.astro`
- Primitive wrappers:
  - `src/constants/constants.ts` (shared constants + local `PAGE_WIDTH = 75`)
  - `src/constants/link-presets.ts` (includes `LinkPreset.Projects` mapping for mapped-type completeness)
  - `src/services/TimelineConfig.ts`
  - `src/types/config.ts`
  - `src/utils/date-utils.ts`
  - `src/utils/setting-utils.ts`
  - `src/utils/url-utils.ts`

### DNDIY.github.io
- `package.json` workspace alignment + `@merkin/blog-core` dependency
- Same wrapper component set as Temporal-Flow
- Same primitive wrapper set as Temporal-Flow
- Same layout wrapper set as Temporal-Flow (`src/layouts/Layout.astro`, `src/layouts/MainGridLayout.astro`)

### MEGAMEAL
- Shared primitive wrappers/imports:
  - `src/constants/constants.ts`
  - `src/types/config.ts`
  - `src/services/TimelineConfig.ts`
  - `src/content/config.ts`
  - `src/utils/date-utils.ts`
  - `src/utils/setting-utils.ts`
  - `src/utils/url-utils.ts`
- Shared UI wrappers:
  - `src/components/ArchivePanel.astro`
  - `src/components/CollapsibleScript.astro`
  - `src/components/Footer.astro`
  - `src/components/PostMeta.astro`
  - `src/components/control/BackToTop.astro`
  - `src/components/control/ButtonLink.astro`
  - `src/components/control/ButtonTag.astro`
  - `src/components/control/Pagination.astro`
  - `src/components/misc/License.astro`
  - `src/components/misc/Markdown.astro`
  - `src/components/widget/NavMenuPanel.astro`
  - `src/components/widget/TOC.astro`
  - `src/components/widget/WidgetLayout.astro`
  - `src/components/widget/Categories.astro`
  - `src/components/widget/Tags.astro`
  - `src/components/widget/DisplaySettings.svelte`
  - `src/components/ConfigCarrier.astro`
  - `src/components/svelte/friends/FriendManager.svelte`
  - `src/components/svelte/friends/FriendContentIntegrator.svelte`
  - `src/components/timeline/TimelineBanner.astro`
  - `src/components/timeline/TimelineCard.astro`
  - `src/components/timeline/StarNode.astro`
  - `src/components/timeline/TimelineViewModes/ListView.astro`
  - `src/components/timeline/TimelineViewModes/MapView.astro`
  - `src/components/timeline/TimelineViewModes/TreeView.astro`
  - `src/components/timeline/TimelineViewModes/TimelineView.astro`
- Site-specific layout retained intentionally:
  - `src/layouts/Layout.astro`
  - `src/layouts/MainGridLayout.astro`
- `package.json` updates for blog-core dependency + pinned Threlte/Svelte versions
- `tsconfig.json` includes `"verbatimModuleSyntax": true`

### Shared Package
- `packages/blog-core/package.json` dependency additions:
  - `astro-icon`
  - `@fontsource-variable/jetbrains-mono`
  - `@iconify/svelte`
  - `@fontsource/roboto`
  - `@fontsource/sriracha`
  - `katex`
  - `overlayscrollbars`
  - `photoswipe`
- Shared friends components extracted:
  - `packages/blog-core/src/components/svelte/friends/FriendManager.svelte`
  - `packages/blog-core/src/components/svelte/friends/FriendContentIntegrator.svelte`
- Shared timeline components extracted:
  - `packages/blog-core/src/components/timeline/TimelineBanner.astro`
  - `packages/blog-core/src/components/timeline/TimelineCard.astro`
  - `packages/blog-core/src/components/timeline/StarNode.astro`
  - `packages/blog-core/src/components/timeline/TimelineViewModes/ListView.astro`
  - `packages/blog-core/src/components/timeline/TimelineViewModes/MapView.astro`
  - `packages/blog-core/src/components/timeline/TimelineViewModes/TreeView.astro`
  - `packages/blog-core/src/components/timeline/TimelineViewModes/TimelineView.astro`
  - `packages/blog-core/src/styles/timeline-styles.css`
  - `packages/blog-core/src/utils/starUtils.ts`
- Shared navigation composition extracted (split-safe for Temporal/DNDIY):
  - `packages/blog-core/src/components/Navbar.astro`
  - `packages/blog-core/src/components/svelte/admin/AdminNavbar.svelte`
  - `packages/blog-core/src/components/svelte/admin/LoginForm.svelte`
  - `packages/blog-core/src/components/svelte/admin/config-tabs/NavigationConfigTab.svelte`
- Shared layout components extracted (Temporal/DNDIY split strategy):
  - `packages/blog-core/src/layouts/Layout.astro`
  - `packages/blog-core/src/layouts/MainGridLayout.astro`
- Shared `LightDarkSwitch` compatibility fix:
  - `packages/blog-core/src/components/LightDarkSwitch.svelte`
- Shared type-check fix:
  - `packages/blog-core/src/utils/starUtils.ts` (`Window.THREE` global typing)

## Defer / Decide Explicitly

- `MEGAMEAL/pnpm-lock.yaml` now has a focused delta (down from large drift), but should still be treated as intentional and reviewed before commit.
- `src/styles/markdown.css` in Temporal and DNDIY is modified from pre-existing work and is not part of the wrapper extraction itself.
- Optional follow-up: evaluate extracting MEGAMEAL-specific navigation/layout internals only if parity can be preserved.

## Recommended Next Safe Move

1. Treat current source-level extraction as a checkpoint.
2. Continue Phase 2 with optional MEGAMEAL-only decomposition work (navigation/layout internals), one batch at a time with per-site build checks.
3. Keep lockfile updates constrained and re-verify MEGAMEAL build after each dependency-touching change.
4. After any `packages/blog-core` file change, run `pnpm install --ignore-workspace` in `MEGAMEAL/` before standalone build/dev.
