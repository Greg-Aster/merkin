# Swup Removal and Svelte Navigation Migration

## Goal

Remove Swup from the workspace while preserving the same shared-layout navigation behavior with Svelte-owned code.

## Changes

- Removed `@swup/astro` from `apps/travel`, `Temporal-Flow`, and `DNDIY.github.io`.
- Removed Swup integration setup from `Temporal-Flow/astro.config.mjs` and `DNDIY.github.io/astro.config.mjs`.
- Added `packages/blog-core/src/components/client/PageNavigation.svelte`.
- Mounted that component from `packages/blog-core/src/layouts/Layout.astro`.
- Replaced old Swup page-replacement hooks with `astro:page-load` listeners.
- Removed stale Swup transition selectors from the site transition stylesheets.
- Removed stale nested lockfiles for `Temporal-Flow` and `DNDIY.github.io`; the root workspace lockfile is now the authoritative lockfile.

## Replacement Behavior

`PageNavigation.svelte` handles same-origin link clicks when both the current page and the next page expose the shared `#banner-container` and `#main-grid` regions. It fetches the next document, swaps those regions, updates title/meta/link head entries, updates browser history, restores scroll, and dispatches `astro:page-load` so existing Svelte and client scripts reinitialize.

If a page does not match that shared layout contract, the component falls back to normal browser navigation.

## Verification Checklist

- `rg swup apps/travel Temporal-Flow DNDIY.github.io packages/blog-core pnpm-lock.yaml` returns no matches.
- `@swup/astro` is absent from all workspace package manifests and from the root lockfile.
- Shared-layout page navigation still updates `#banner-container`, `#main-grid`, document title, canonical/meta tags, history, and scroll.
- Existing timeline, archive, banner, PhotoSwipe, and audio listeners continue to reinitialize from `astro:page-load`.

## Verification Results

- `pnpm exec biome check packages/blog-core/src/components/client/PageNavigation.svelte`: passed.
- `pnpm --filter @merkin/blog-core type-check`: passed.
- `pnpm --filter @merkin/megameal type-check`: passed.
- `pnpm --dir apps/megameal build`: passed outside the Codex sandbox. The sandboxed run fails because esbuild probes parent directories while resolving pnpm virtual-store paths and the sandbox blocks those reads.
- `rg -n "swup|@swup/astro|window\.swup|transition-swup|swup:" . --glob "!**/node_modules/**" --glob "!**/public/**" --glob "!**/dist/**" --glob "!apps/megameal/reports/swup-removal-svelte-navigation.md"`: no active source matches.

## Dependency Recovery Note

The Astro `@astrojs/tailwind/base.css` and missing `tsx` errors were caused by an incomplete `node_modules` tree after the interrupted/offline install attempt. Running `pnpm install` from the workspace root restored the pnpm virtual store and fixed the missing Tailwind and `tsx` paths.
