# Agent Brief: Asset And Media Inventory

## Goal

Find missing, oversized, mismatched, or suspicious asset references in generated HTML and source content. Include images, posters, audio, video, favicons, OpenGraph images, and `srcset` candidates.

## Starting Points

- `apps/megameal/public/`
- `apps/megameal/dist/`
- `apps/megameal/src/content/`
- `apps/megameal/src/constants/icon.ts`
- `apps/megameal/src/components/`

## Suggested Commands

```bash
pnpm --dir apps/megameal build
pnpm --dir apps/megameal audit:links
find apps/megameal/public -type f | sort
find apps/megameal/dist -type f | sort
```

For file sizes:

```bash
find apps/megameal/public -type f -printf '%s %p\n' | sort -nr | head -100
```

## Audit Questions

- Which missing link-audit targets are assets?
- Are image paths in content aligned with files under `public/`?
- Are `poster`, `src`, and `srcset` targets all present?
- Are any huge images served where smaller generated variants exist?
- Are favicon/icon references complete and present?
- Are OpenGraph/Twitter images present and appropriately sized?
- Are video/audio files referenced with matching MIME-friendly extensions?
- Are there unused large public assets that look obsolete?

## Deliverable

Create `apps/megameal/reports/<date>-asset-media-inventory.md`.

Group findings by:

- Missing assets.
- Oversized assets.
- Suspicious duplicate/obsolete assets.
- Metadata/social image assets.
- Media player poster/source issues.

Do not delete assets during the audit.

