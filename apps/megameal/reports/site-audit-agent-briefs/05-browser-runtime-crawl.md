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

## Layout And Canvas Classification

When collecting off-viewport elements, classify results before reporting them as
failures. Do not treat intentional decorative or hidden-state placement as a
layout defect just because it crosses the viewport edge.

Classify separately:

- `actionable`: visible controls, links, form elements, text, images, or media
  whose usable/readable box escapes the viewport.
- `allowed-overscan`: full-bleed banner, hero, background, portal, canvas,
  decorative, or `aria-hidden` elements that intentionally extend past the
  viewport.
- `hidden-state`: controls intentionally parked off-screen until active, such as
  a dormant back-to-top affordance.

Only `actionable` items should be counted as layout failures. Include the
selector or identifying class names for every actionable item.

Canvas checks must not rely on WebGL `readPixels()` alone. Some WebGL surfaces
can return an empty drawing-buffer read while the composited page screenshot is
visibly nonblank. For every canvas-heavy page:

- record direct canvas readback if available;
- capture a screenshot;
- sample the screenshot region covered by each visible canvas; and
- report a canvas failure only when both the direct readback and the
  screenshot-region sample are blank or effectively uniform.

## Deliverable

Create `apps/megameal/reports/<date>-browser-runtime-crawl.md`.

Include:

- Command used to start the server.
- Crawled URL list.
- Browser and viewport sizes.
- Console errors.
- Failed network requests.
- Screenshots only if they materially document a layout/runtime issue.
