# Static HTML And Metadata Audit - 2026-05-21

## Commands

- `sed -n '1,220p' AGENTS.md`: passed; read root repo instructions.
- `sed -n '1,260p' apps/megameal/AGENTS.md`: passed; read Megameal instructions.
- `sed -n '1,240p' apps/megameal/reports/site-audit-agent-briefs/README.md`: passed; read handoff format and shared audit rules.
- `sed -n '1,260p' apps/megameal/reports/site-audit-agent-briefs/02-static-html-metadata.md`: passed; read this audit assignment.
- `git status --short`: passed; worktree was already dirty from unrelated/parallel work and was not reverted.
- `pnpm --dir apps/megameal build`: failed in sandbox with `listen EPERM: operation not permitted /tmp/tsx-1000/26.pipe` from `tsx`.
- `pnpm --dir apps/megameal build`: passed when rerun outside the sandbox so `tsx` could create its IPC pipe. Build generated 341 HTML files, ran `scripts/audit-built-html.mjs`, and completed Pagefind indexing.
- `node apps/megameal/scripts/audit-built-html.mjs --dist apps/megameal/dist`: passed; verified 17 Astro redirect shells without `<html>`.
- `find apps/megameal/dist -type f -name '*.html' | wc -l`: passed; found 341 generated HTML files.
- Inline Node metadata scan over `apps/megameal/dist`: passed; checked document shells, title/meta description counts, canonicals, social images, duplicate IDs, main landmarks, and sitemap route existence.

## Summary

- The generated document shells are structurally sound: 341 HTML files, 324 full document pages, 17 verified Astro redirect shells, 0 malformed non-redirect shells, and 0 duplicate ID pages.
- The largest site-wide metadata issue is archive taxonomy metadata. 237 pages have weak meta descriptions, mostly archive tag/category pages using the generic `Archive` description. The same archive route family also creates 214 duplicate `Archive - MEGA MEAL SAGA` titles.
- 13 pages have canonical issues: 12 standalone/export pages have no canonical link, and `404.html` canonicalizes to `/404/` while the generated file is `/404.html`.
- 2 content pages emit missing local OpenGraph/Twitter image references, producing 4 broken social image tags.
- The sitemap is mostly healthy: 339 sitemap entries, 0 sitemap URLs missing generated HTML, and 1 generated HTML route omitted from the sitemap (`/audio/sfx/audition/`).
- Build warnings were captured: PostCSS `from` option warning, Vite chunk-size warning, and `astro-compress` reporting `-NaN undefined` reductions for two JavaScript files.

## Findings

### High: Archive Taxonomy Pages Share Generic Titles And Descriptions

- Source: `apps/megameal/src/pages/archive/tag/[tag].astro`
- Source: `apps/megameal/src/pages/archive/category/[category].astro`
- Evidence: 237 generated pages failed the description heuristic. The dominant duplicate descriptions were:
  - `Archive`: 212 pages
  - `Archive - MEGA MEAL SAGA`: 1 page
- Evidence: duplicate title scan found:
  - `Archive - MEGA MEAL SAGA`: 214 pages
- Evidence: both archive taxonomy routes currently pass `title={i18n(I18nKey.archive)}` and `description={i18n(I18nKey.archive)}` into `MainGridLayout`.
- Impact: Search results, link previews, browser tabs, and sitemap consumers cannot distinguish archive tag/category pages. This is collection-wide, not a one-off content problem.
- Suggested owner/fix path: `apps/megameal/src/pages/archive/tag/[tag].astro`, `apps/megameal/src/pages/archive/category/[category].astro`, and the archive taxonomy helpers in `apps/megameal/src/utils/archiveTaxonomy.ts`. Generate route-specific titles/descriptions such as `Tag: <tag> - MEGA MEAL SAGA` and a short description describing the filtered archive set.

### Medium: Standalone Export And Redirect Pages Are Outside The Normal Canonical Metadata System

- Source: `apps/megameal/src/pages/game.astro`
- Source: `apps/megameal/src/pages/host.astro`
- Source: `apps/megameal/src/pages/pdf/cookbook/[...slug].astro`
- Source: `apps/megameal/public/audio/sfx/audition/index.html`
- Evidence: canonical scan found 12 pages with no canonical link:
  - `/audio/sfx/audition/`
  - `/game/`
  - `/host/`
  - `/pdf/cookbook/meat-cake/`
  - `/pdf/cookbook/meat-cake/original/`
  - `/pdf/cookbook/meat-cake/terrestrial/`
  - `/pdf/cookbook/perfect-miranda-bloody-mary/`
  - `/pdf/cookbook/perfect-miranda-bloody-mary/original/`
  - `/pdf/cookbook/perfect-miranda-bloody-mary/terrestrial/`
  - `/pdf/cookbook/zelephant-truffle-roast/`
  - `/pdf/cookbook/zelephant-truffle-roast/original/`
  - `/pdf/cookbook/zelephant-truffle-roast/terrestrial/`
- Impact: These pages do not receive the same metadata guarantees as normal layout-owned pages. For redirect pages this may be intentional, but the current behavior is inconsistent and should be explicitly owned.
- Suggested owner/fix path: Decide per page type. Redirect pages may prefer `noindex` plus canonical to the external target. PDF export pages may need canonical/noindex policy in `apps/megameal/src/pages/pdf/cookbook/[...slug].astro`. Public static audition HTML should either be intentionally excluded/noindexed or moved behind an Astro route that can own metadata.

### Medium: 404 Canonical Does Not Match The Generated Route

- Source: `apps/megameal/src/pages/404.astro`
- Evidence: generated file is `apps/megameal/dist/404.html`, but the canonical tag is `https://megameal.org/404/`.
- Impact: The canonical points to a pretty route that is not the generated static file path. That may be acceptable if deployed infrastructure maps `/404/`, but the built artifact itself does not contain `dist/404/index.html`.
- Suggested owner/fix path: Confirm deploy behavior. Either generate `/404/index.html`, change canonical policy for 404 pages, or add a specific audit exception if `/404/` is intentionally served by hosting rules.

### Medium: Missing Local Social Preview Images

- Source: `apps/megameal/src/content/posts/timelines/end-of-time.mdx:13`
- Evidence: `/posts/timelines/end-of-time/` emits both `og:image` and `twitter:image` as `https://megameal.org/posts/generic/contruction.png`, but `dist/posts/generic/contruction.png` does not exist.
- Source: `apps/megameal/src/content/posts/timelines/Snuggaliod-Emergence.mdx:15`
- Evidence: `/posts/timelines/snuggaliod-emergence/` emits both `og:image` and `twitter:image` as `https://megameal.org/posts/generic/imagenotfoupng`, but `dist/posts/generic/imagenotfoupng` does not exist.
- Impact: Link previews for these two posts will request missing local assets. This also creates crawler-visible 404s outside normal page navigation.
- Suggested owner/fix path: Fix the image frontmatter on the two content entries or add the intended assets under `apps/megameal/public/posts/generic/`.

### Medium: Some Generated Pages Have No `<main>` Landmark Or Empty Main Text

- Source: generated `apps/megameal/dist`
- Evidence: 12 generated pages had no `<main>` element:
  - `/audio/sfx/audition/`
  - `/game/`
  - `/host/`
  - all 9 `/pdf/cookbook/.../` export pages
- Evidence: 4 generated pages had a `<main>` element but no static text inside it:
  - `/`
  - `/test-portal/`
  - `/timeline/`
  - `/timeline/2d/`
- Impact: This is not necessarily a visual empty-page bug, because some pages render meaningful content outside `<main>` or through client islands. It is still a static accessibility/search risk, and it helps explain why Pagefind indexed only 67 pages out of 341 HTML files.
- Suggested owner/fix path: For standalone pages, add a semantic `<main>` or intentional `noindex`/audit exception. For home/timeline pages, inspect the layout slots and island boundaries to ensure core content is inside the pagefind/main content area when intended.

### Low: Sitemap Has No Broken Locs, But Omits The Static SFX Audition Page

- Source: `apps/megameal/dist/sitemap-0.xml`
- Evidence: sitemap scan found 339 entries and 0 entries pointing at missing generated HTML.
- Evidence: `/audio/sfx/audition/` exists as generated HTML but is not in the sitemap.
- Impact: This is only a problem if the SFX audition page is intended to be public/indexable. If it is a utility page, omission may be correct.
- Suggested owner/fix path: Decide whether `apps/megameal/public/audio/sfx/audition/index.html` is public content. If not, add a `noindex` marker or document it as intentionally excluded.

### Low: Redirect Shells Are Intentional But Should Stay Audited

- Source: generated `apps/megameal/dist`
- Evidence: `scripts/audit-built-html.mjs` verified 17 Astro redirect shells without `<html>`:
  - `/cookbook/cookbook-index/`
  - `/posts/`
  - `/posts/introducing-story-mode/`
  - `/reader/`
  - 13 legacy cookbook/first-contact/timeline redirect routes
- Impact: Current redirect shells are accepted by the existing audit. They should remain visible in reports because they are intentionally outside the full document shell contract.
- Suggested owner/fix path: Keep the redirect-shell exception in `apps/megameal/scripts/audit-built-html.mjs`; add route-specific tests only if accidental redirect shells become a recurring problem.

### Low: Build Emits Non-Blocking Tooling Warnings

- Source: `pnpm --dir apps/megameal build`
- Evidence: Vite/PostCSS warning: `A PostCSS plugin did not pass the from option to postcss.parse.`
- Evidence: Vite chunk warning: `Some chunks are larger than 550 kB after minification.`
- Evidence: `astro-compress` emitted `-NaN undefined` reduction lines for:
  - `dist/_astro/shared-chat-manager.DvjNe-6l.js`
  - `dist/_astro/vendor-3d-core.BzzaM8-u.js`
- Impact: These did not fail the build, but they point at build pipeline hygiene and performance observability issues.
- Suggested owner/fix path: Track separately under build tooling/performance. Do not mix these with content metadata fixes unless a specific plugin or bundle owner is identified.

## Deferred

- External social image URLs were identified but not fetched because network checks were out of scope for this static local audit. The unchecked external URLs were 16 YouTube thumbnail references across video pages.
- Browser runtime issues, hydration errors, console errors, and failed network requests were not checked; those belong to the browser-runtime crawl brief.
- Internal 404 link crawling was not repeated here; this report focuses on static HTML structure and metadata.
- CSS architecture was not audited here; no CSS files were changed.
- No code, content, route, asset, generated-data, or CSS fixes were made as part of this audit.
