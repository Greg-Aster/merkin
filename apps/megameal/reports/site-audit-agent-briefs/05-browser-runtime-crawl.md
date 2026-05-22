# Agent Brief: Browser Runtime Crawl

## Goal

Load representative pages in a real browser context and capture user-facing runtime problems that static `dist/` inspection cannot catch: console errors, failed network requests, hydration failures, blank canvases, client-only component failures, and obvious layout overflow.

## Important Scope

This is the only brief that should run a dev server, preview server, or headless browser crawl. Do not use this brief unless the user explicitly assigns browser/runtime crawling.

## Starting Points

- `apps/megameal/package.json`
- `apps/megameal/src/components/`
- `packages/blog-core/src/components/`
- `apps/megameal/reports/2026-05-21-link-and-build-audit.md`

## Suggested Commands

```bash
pnpm --dir apps/megameal build
pnpm --dir apps/megameal preview
```

If the build cannot complete because of the known built HTML audit failure, document that and use `pnpm --dir apps/megameal dev` only if the assigned task still requires browser crawling.

## Route Sampling

Cover at least:

- `/`
- `/archive/`
- `/posts/timeline/`
- A normal post page.
- A timeline post page.
- A video page.
- A quiz page, for example `/quiz/sample-quiz/`.
- A store page.
- A known 404 page.

Use both mobile and desktop viewport widths.

## Audit Questions

- Are there console errors or warnings tied to app code?
- Are there failed network requests, especially `.js`, image, audio, video, and font assets?
- Do Astro islands hydrate without errors?
- Are Three.js/canvas-heavy components visibly nonblank?
- Does content overlap the navbar, banner, or footer?
- Is there horizontal overflow on mobile?
- Are click/tap interactions blocked by overlays?
- Are audio/video components blocked, muted unexpectedly, or throwing autoplay errors?

## Deliverable

Create `apps/megameal/reports/<date>-browser-runtime-crawl.md`.

Include:

- Command used to start the server.
- Crawled URL list.
- Browser and viewport sizes.
- Console errors.
- Failed network requests.
- Screenshots only if they materially document a layout/runtime issue.

