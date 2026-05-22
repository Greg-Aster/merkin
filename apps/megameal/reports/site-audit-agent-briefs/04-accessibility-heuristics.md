# Agent Brief: Accessibility Heuristics Audit

## Goal

Run a static accessibility pass over generated HTML and source components. This is not a full WCAG certification; it should identify obvious problems that can be fixed before deeper manual testing.

## Starting Points

- `apps/megameal/dist/`
- `apps/megameal/src/components/`
- `apps/megameal/src/layouts/`
- `packages/blog-core/src/components/`

## Suggested Commands

```bash
pnpm --dir apps/megameal build
find apps/megameal/dist -type f -name '*.html' | sort
rg '<img|<button|aria-|role=|<h[1-6]' apps/megameal/src packages/blog-core/src
```

If using a temporary parser script, keep it in `/tmp` unless the user asks to keep it.

## Audit Questions

- Are there images without `alt`, including generated post images and social/media thumbnails?
- Are decorative images marked in a way that assistive tech can skip?
- Are icon-only buttons and links accessible by name?
- Are there empty anchors or buttons?
- Does each page have a reasonable heading structure?
- Are there repeated `h1` elements where the layout should only expose one?
- Are form controls associated with labels?
- Are interactive elements built with semantic controls instead of clickable `div`s?
- Are `aria-hidden`, `role`, and `tabindex` used safely?

## Deliverable

Create `apps/megameal/reports/<date>-accessibility-heuristics.md`.

Separate source-level component issues from generated-content issues. For repeated component issues, list the component once and provide example routes affected.

