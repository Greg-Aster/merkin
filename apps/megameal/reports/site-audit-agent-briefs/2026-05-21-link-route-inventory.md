# Megameal Link Route Inventory - 2026-05-21

## Commands

- `sed -n '1,220p' AGENTS.md`: passed; read root instructions.
- `sed -n '1,260p' apps/megameal/AGENTS.md`: passed; read Megameal instructions.
- `sed -n '1,220p' apps/megameal/reports/site-audit-agent-briefs/README.md`: passed; read handoff format.
- `sed -n '1,260p' apps/megameal/reports/site-audit-agent-briefs/01-link-route-inventory.md`: passed; read assigned brief.
- `git status --short`: passed; workspace was dirty before this report, and other agents changed route/content files during this audit.
- `sed -n '1,260p' apps/megameal/reports/2026-05-21-link-and-build-audit.md`: passed; prior report showed 111 missing targets from 164 references.
- `sed -n '1,260p' apps/megameal/scripts/audit-links.mjs`: passed; inspected how internal targets are normalized.
- `pnpm --dir apps/megameal audit:links -- --verbose`: failed on the first populated `dist/` snapshot with 6 missing targets from 6 references.
- `pnpm --dir apps/megameal audit:links -- --verbose`: passed later, but checked 0 internal references across 0 HTML files because `apps/megameal/dist/` was empty by then; this is not a valid green link result.
- `find apps/megameal/dist -type f -name index.html`: passed on the first populated snapshot; later `find apps/megameal/dist -type f -name '*.html' | wc -l` returned `0`.
- `rg`/`nl -ba` source tracing commands: passed; traced stale built-output links back to current source files and likely owners.
- `pnpm --dir apps/megameal build`: not run; this assignment is read-only except this report, and build would rewrite `dist/` while other agents are working.
- `pnpm --dir apps/megameal type-check`: not run; no code fixes were made by this audit agent.
- `pnpm --dir apps/megameal audit:css`: not run; no CSS changes were made by this audit agent.

## Summary

- The prior report's high-volume archive/tag/category failures appear to have a route-generation fix path already present in the dirty worktree: archive tag/category static paths now derive from `packages/shared-data/generated/archive.json` through `apps/megameal/src/utils/archiveTaxonomy.ts`.
- The first valid link audit during this pass reduced the broken-link set to 6 targets. Five were content-body links in built output, and the current source already appears changed by another agent.
- The remaining `/404/` finding is an audit-script/path-shape issue: Astro emits `dist/404.html`, while the audit originally only accepted `dist/404/index.html` for `/404/`. The current dirty `audit-links.mjs` now checks both forms.
- The final audit pass is not meaningful because `apps/megameal/dist/` currently has 0 HTML files. A rebuild is needed after parallel work settles before treating the audit as clean.

## Findings

### High: Built Output Was Stale During Link Audit

- Source: `apps/megameal/dist/`
- Evidence: an initial populated `dist/` audit reported:

```text
[link-audit] Found 6 missing internal target(s) from 6 reference(s).
- /404/
- /posts/restaurant-reviews/
- /posts/snuggaloid-registry/
- /posts/timeline/snuggloids-commercial/
- /posts/timeline/spork-uprising/
- /posts/timelines/timeline/
```

- Evidence: later in the same audit pass, `find apps/megameal/dist -type f -name '*.html' | wc -l` returned `0`, and `audit:links` reported `Checked 0 internal reference(s) across 0 HTML file(s)`.
- Impact: the latest passing link audit cannot be trusted; it scanned no pages.
- Suggested owner/fix path: build/release validation. Re-run `pnpm --dir apps/megameal build` and then `pnpm --dir apps/megameal audit:links` after route/content agents finish.

### Medium: Content Body Links Fixed In Source But Still Present In Earlier Built Output

- Source: `apps/megameal/src/content/posts/timelines/corporate-empire.mdx`
- Evidence: first populated `dist/` audit found `posts/timelines/corporate-empire/index.html href="/posts/restaurant-reviews/"`.
- Current source evidence: line 160 now uses a disabled `<div aria-disabled="true">` instead of an anchor for the under-construction Restaurant Reviews card.
- Impact: stale built output linked users to a non-existent `/posts/restaurant-reviews/` route.
- Suggested owner/fix path: content body fix, apparently already made by another agent. Rebuild needed to verify.

### Medium: Snuggaloid Registry Link Fixed In Source But Still Present In Earlier Built Output

- Source: `apps/megameal/src/content/posts/snuggaloid-spec-sheet.mdx`
- Evidence: first populated `dist/` audit found `posts/snuggaloid-spec-sheet/index.html href="/posts/snuggaloid-registry/"`.
- Current source evidence: lines 174 and 193 now link to `/snuggaloids/`.
- Impact: stale built output linked users to a missing registry route.
- Suggested owner/fix path: content body fix, apparently already made by another agent. Rebuild needed to verify.

### Medium: Singular Timeline Links Fixed In Source But Still Present In Earlier Built Output

- Source: `apps/megameal/src/content/about/dr-elara-voss.md`
- Evidence: first populated `dist/` audit found `about/dr-elara-voss/index.html href="/posts/timeline/spork-uprising/"`.
- Current source evidence: line 84 now links to `/posts/timelines/spork-uprising/`, and that canonical route was present in the populated `dist/` snapshot.
- Source: `apps/megameal/src/content/about/snuggloid-owner.md`
- Evidence: first populated `dist/` audit found `about/snuggloid-owner/index.html href="/posts/timeline/snuggloids-commercial/"`.
- Current source evidence: line 77 now links to `/posts/timelines/snuggloids-commercial/`, and that canonical route was present in the populated `dist/` snapshot.
- Impact: stale built output linked users to singular `/posts/timeline/...` article URLs instead of generated plural `/posts/timelines/...` routes.
- Suggested owner/fix path: content body fix, apparently already made by another agent. Rebuild needed to verify.

### Medium: Timeline Index Link Fixed In Source But Still Present In Earlier Built Output

- Source: `apps/megameal/src/content/posts/timelines/The-Forgotten-Masses.mdx`
- Evidence: first populated `dist/` audit found `posts/timelines/the-forgotten-masses/index.html href="/posts/timelines/timeline/"`.
- Current source evidence: line 87 now links to `/timeline/`.
- Impact: stale built output linked users to a non-existent nested timeline route.
- Suggested owner/fix path: content body fix, apparently already made by another agent. Rebuild needed to verify.

### Medium: Archive Taxonomy Route Generation Appears Consolidated

- Source: `apps/megameal/src/pages/archive/tag/[tag].astro`
- Evidence: lines 6 and 8-13 call `getArchiveTags()` for static paths.
- Source: `apps/megameal/src/pages/archive/category/[category].astro`
- Evidence: lines 6 and 8-15 call `getArchiveCategories()` for static paths.
- Source: `apps/megameal/src/utils/archiveTaxonomy.ts`
- Evidence: lines 19-42 collect tags and categories from `packages/shared-data/generated/archive.json`.
- Impact: this appears to address the prior report's large group of missing `/archive/tag/*` and `/archive/category/*` routes by making route generation follow the same archive manifest that feeds rendered archive links.
- Suggested owner/fix path: route generation/shared generated-data fix. Rebuild and rerun `audit:links` to verify every manifest taxonomy value emits a matching page.

### Medium: `/posts/` Route Appears Added As Redirect

- Source: `apps/megameal/src/pages/posts/index.astro`
- Evidence: line 2 returns `Astro.redirect('/archive/', 301)`.
- Impact: this appears to address the prior report's 16 `/posts/` references without changing every about page link.
- Suggested owner/fix path: route generation fix. Rebuild and confirm `/posts/` exists in generated output.

### Low: `/404/` Is An Audit Path-Shape False Positive

- Source: `apps/megameal/dist/404.html` from the first populated snapshot.
- Evidence: generated 404 HTML used canonical/social URLs of `https://megameal.org/404/`.
- Source: `packages/blog-core/src/layouts/Layout.astro`
- Evidence: lines 53 and 123 set the canonical URL from `Astro.url.href`.
- Source: `apps/megameal/scripts/audit-links.mjs`
- Evidence: current dirty script lines 113-117 check both `dist/<path>/index.html` and `dist/<path>.html` when a URL ends in `/`.
- Impact: the old audit treated `/404/` as missing even though Astro's special 404 artifact is `404.html`.
- Suggested owner/fix path: audit-script false positive, apparently already addressed by another agent. Rebuild is not required for this script-only classification, but the link audit still needs real HTML to scan.

### Low: Prior Asset Failures Are Not Current Source Findings

- Source: prior report listed `/posts/store/store-mascot-construction.png`, `/posts/timelines/snuggloid-emergence/snuggloid-entity.png`, and `/posts/snuggloids-commercial/snuggloid-ad.jpg`.
- Evidence: current source search did not find old broken href/src values for the five stale content links, and the populated `dist/` snapshot showed `/posts/timeline/snuggloid-entity.png` existed.
- Impact: asset issues from the prior report may already have been resolved or converted into content-link changes by other agents.
- Suggested owner/fix path: public asset restore only if a rebuilt `dist/` link audit reintroduces these as missing `src`/`poster` targets.

## Deferred

- Did not rebuild `apps/megameal/dist/` because this agent was instructed to stay read-only except for this report.
- Did not verify browser/runtime hydration issues; this brief was static link and route inventory only.
- Did not run type-check or CSS audit because this report made no code or style fixes.
- Final pass needs a fresh build after parallel route/content edits settle, then a fresh `pnpm --dir apps/megameal audit:links` result.
