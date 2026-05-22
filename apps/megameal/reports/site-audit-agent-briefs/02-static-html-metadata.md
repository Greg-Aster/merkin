# Agent Brief: Static HTML And Metadata Audit

## Goal

Inspect generated HTML for structural and metadata problems that do not require a browser runtime. This should catch broken document shells, missing metadata, duplicate metadata, bad canonicals, and pages that are present but malformed.

## Starting Points

- `apps/megameal/scripts/audit-built-html.mjs`
- `apps/megameal/dist/`
- `apps/megameal/src/layouts/`
- `packages/blog-core/src/components/`
- `packages/blog-core/src/styles/main.css`

## Suggested Commands

```bash
pnpm --dir apps/megameal build
node apps/megameal/scripts/audit-built-html.mjs --dist apps/megameal/dist
find apps/megameal/dist -type f -name '*.html' | sort
```

If writing temporary analysis code, put it under `/tmp` or keep it uncommitted unless the user asks for a reusable audit script.

## Audit Questions

- Does every non-redirect HTML file include `<html>`, `<head>`, and `<body>`?
- Does every indexable page have one `<title>` and one reasonable meta description?
- Are canonical URLs absolute, normalized, and matching generated routes?
- Do OpenGraph/Twitter image references point to existing assets?
- Are there duplicate IDs within a page?
- Are there pages with no meaningful main content?
- Are redirect shells intentional and consistently shaped?
- Does sitemap output include routes that do not exist or omit important routes?

## Deliverable

Create `apps/megameal/reports/<date>-static-html-metadata-audit.md`.

Prioritize findings that affect every page, all posts, all videos, or all archive pages before single-page content issues.

