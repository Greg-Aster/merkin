# Megameal CSS Cleanup Plan

This is the active staged plan for cleaning up Megameal CSS and frontend structure.

## Stage 1: Store Style Surface

Goal: store pages/components should not own large page-level or component-level style blocks.

Status: complete.

- Move store layout CSS to `src/styles/layouts/`.
- Move storefront, marketplace card, product card, pagination, and responsive store CSS to `src/styles/features/`.
- Keep `StoreLayout.astro` as the single importer for store feature CSS.

## Stage 2: Product Components

Goal: reduce `ProductCard.astro` from a large mixed-responsibility component into smaller markup components plus focused client behavior.

Targets:

- Thumbnail/media summary.
- Collapsed summary/rating.
- Expanded details shell.
- Action row.
- Client tab/review behavior moved into a dedicated client component.

Status: complete.

## Stage 3: Home And Portal CSS

Goal: extract the largest homepage/portal `<style>` blocks into feature CSS.

Targets:

- `PortalSyntheticRoute.astro`
- `FeaturedProductBanner.svelte`
- `UniverseHeroSlide.astro`
- `PortalTimelineRoute.astro`

Status: complete.

## Stage 4: Shared Visual System

Goal: stop redefining cards, panels, badges, buttons, and section shells.

Targets:

- Promote repeated card/panel/badge/button styling into shared classes or components.
- Prefer Tailwind utilities for one-off layout/spacing.
- Keep CSS classes for repeated visual systems.

Status: foundation split complete; larger component decomposition remains as follow-up debt.

## Stage 5: Global CSS Split

Goal: split oversized global files into purpose-based files.

Targets:

- `megameal-interactions.css`
- `timeline-styles.css`
- `main.css`

Status: complete. Legacy unused CSS was removed, banner/interactions CSS was split, and `main.css` now delegates to `src/styles/foundation/`.

## Stage 6: Audit Tightening

Goal: move from reporting CSS debt to preventing regressions.

Targets:

- Keep `audit:css` as a baseline report.
- Make `audit:css:strict` usable in normal agent handoffs once the existing baseline is reduced.
- Require agents to explain any new CSS surface area.

Status: active. `audit:css` and `audit:css:changed` run; changed-file mode falls back to the full audit when the sandbox blocks Git child-process access. Remaining audit items are component-size debt and Bleepy component-local sidecar CSS, not large style blocks or oversized CSS files.
