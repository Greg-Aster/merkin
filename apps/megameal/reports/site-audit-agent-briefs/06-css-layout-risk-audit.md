# Agent Brief: CSS And Layout Risk Audit

## Goal

Audit layout and CSS architecture risks without making visual fixes. This should identify where page spacing, banner behavior, mobile overflow, and oversized components are controlled.

## Starting Points

- `apps/megameal/AGENTS.md`
- `apps/megameal/src/styles/site.ts`
- `apps/megameal/src/styles/foundation/`
- `apps/megameal/src/styles/layouts/`
- `apps/megameal/src/styles/features/`
- `apps/megameal/src/config/banner.config.ts`
- `packages/blog-core/src/components/banner-stage/`
- `packages/blog-core/src/styles/`

## Suggested Commands

```bash
pnpm --dir apps/megameal audit:css
pnpm --dir apps/megameal audit:css:changed
rg 'banner|overlap|navbar|header|main|margin|padding|gap' apps/megameal/src packages/blog-core/src
```

## Audit Questions

- Which files own banner spacing and overlap?
- Which files own navbar-to-content spacing?
- Which files affect mobile-only versus desktop-only layout?
- Are spacing values duplicated between app CSS and `packages/blog-core`?
- Are overrides fighting the banner config system?
- Which oversized components are most likely to hide layout bugs?
- Are there component-scoped styles that should be shared feature/foundation CSS?

## Deliverable

Create `apps/megameal/reports/<date>-css-layout-risk-audit.md`.

For each finding, include:

- Owning file.
- Exact selector/config key.
- Whether it affects mobile, desktop, or both.
- Whether it lives in Megameal app code or shared blog-core code.
- Suggested consolidation path, without implementing it.

