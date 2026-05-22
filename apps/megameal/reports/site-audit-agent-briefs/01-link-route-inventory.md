# Agent Brief: Link And Route Inventory

## Goal

Expand the broken-link audit into an actionable route/content map. The output should help decide whether each broken target needs a new route, a content link correction, an asset restore, or an audit-script exception.

## Starting Points

- `apps/megameal/scripts/audit-links.mjs`
- `apps/megameal/reports/2026-05-21-link-and-build-audit.md`
- `apps/megameal/src/pages/`
- `apps/megameal/src/content/`
- `packages/shared-data/generated/`

## Suggested Commands

```bash
pnpm --dir apps/megameal build
pnpm --dir apps/megameal audit:links
pnpm --dir apps/megameal audit:links -- --verbose
find apps/megameal/dist -type f -name index.html | sort
```

If `pnpm --dir apps/megameal audit:links -- --verbose` does not pass arguments through pnpm as expected, run the script directly from the app root:

```bash
cd apps/megameal
node scripts/audit-links.mjs --dist dist --verbose
```

## Audit Questions

- Which missing targets are true missing pages?
- Which are content typos or old slugs?
- Which are generated archive tag/category pages that should exist but do not?
- Which are image/video/audio assets rather than pages?
- Which links come from generated shared data rather than source content?
- Does the link audit incorrectly classify any intentionally external URL as internal?

## Deliverable

Create `apps/megameal/reports/<date>-link-route-inventory.md`.

Group findings by owner:

- Content frontmatter/body fix.
- Route generation fix.
- Shared generated-data fix.
- Public asset restore.
- Audit-script false positive.

For each item, include the missing target, at least one source file or built output file, and the likely canonical route if known.

